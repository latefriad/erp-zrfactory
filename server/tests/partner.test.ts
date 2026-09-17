import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import Database from 'better-sqlite3';
import { createApp } from '../src/app';
import { PartnerService } from '../src/services/partnerService';
import { CashService } from '../src/services/cashService';
import { AuthService } from '../src/services/authService';
import { DatabaseMigrator } from '../src/db/migrator';
import { seedDatabase } from '../src/db/seed';
import { setDatabaseInstance, closeDatabase } from '../src/db/connection';
import { PartnerTransactionType, CashTransactionType } from '@zr-erp/shared';

describe('Phase 6: Partner Capital, Balances & Cash Accounts Ledger', () => {
  let db: Database.Database;
  let partnerService: PartnerService;
  let cashService: CashService;
  let authService: AuthService;
  let app: any;

  beforeEach(() => {
    db = new Database(':memory:');
    const migrator = new DatabaseMigrator(db);
    migrator.runMigrations();
    seedDatabase(db);
    setDatabaseInstance(db);

    partnerService = new PartnerService(db);
    cashService = new CashService(db);
    authService = new AuthService(db);
    app = createApp();
  });

  afterEach(() => {
    closeDatabase();
  });

  describe('Partner Capital & Dynamic Balance Formula', () => {
    it('should compute initial capital and current balances correctly from ledger', () => {
      const partners = partnerService.listPartners();
      expect(partners).toHaveLength(2);

      const riad = partners.find(p => p.id === 'partner-riad')!;
      const brother = partners.find(p => p.id === 'partner-brother')!;

      // Initial Capital
      expect(riad.initialCapital).toBe(300000);
      expect(riad.ownershipPercentage).toBe(30.0);
      // Seeded: 50,000 DA contribution
      expect(riad.totalContributions).toBe(50000);
      expect(riad.totalWithdrawals).toBe(0);
      expect(riad.currentBalance).toBe(350000);

      // Brother: Initial 700,000 DA, 100,000 DA contribution, 30,000 DA withdrawal
      expect(brother.initialCapital).toBe(700000);
      expect(brother.ownershipPercentage).toBe(70.0);
      expect(brother.totalContributions).toBe(100000);
      expect(brother.totalWithdrawals).toBe(30000);
      expect(brother.currentBalance).toBe(770000);
    });

    it('should get detailed partner breakdown and transaction history', () => {
      const brother = partnerService.getPartnerById('partner-brother');
      expect(brother.id).toBe('partner-brother');
      expect(brother.recentTransactions.length).toBeGreaterThanOrEqual(2);
      
      const contribution = brother.recentTransactions.find(t => t.type === PartnerTransactionType.CONTRIBUTION);
      expect(contribution).toBeDefined();
      expect(contribution?.amount).toBe(100000);

      const withdrawal = brother.recentTransactions.find(t => t.type === PartnerTransactionType.WITHDRAWAL);
      expect(withdrawal).toBeDefined();
      expect(withdrawal?.amount).toBe(30000);
    });
  });

  describe('Double-Entry Capital Contribution & Cash Account Credit', () => {
    it('should record a capital contribution and increment cash account balance', () => {
      const initialCash = cashService.getAccountById('acc-caisse-principale');
      const initialPartner = partnerService.getPartnerById('partner-riad');

      const tx = partnerService.recordContribution(
        {
          partnerId: 'partner-riad',
          amount: 80000,
          cashAccountId: 'acc-caisse-principale',
          date: '2026-09-16',
          description: 'Achat nouvelle presse à casquettes',
          reference: 'DEP-20260916',
        },
        'usr-admin',
        'Administrateur ZR'
      );

      expect(tx.id).toBeDefined();
      expect(tx.amount).toBe(80000);
      expect(tx.type).toBe(PartnerTransactionType.CONTRIBUTION);

      // Verify partner balance increased
      const updatedPartner = partnerService.getPartnerById('partner-riad');
      expect(updatedPartner.currentBalance).toBe(initialPartner.currentBalance + 80000);
      expect(updatedPartner.totalContributions).toBe(initialPartner.totalContributions + 80000);

      // Verify cash account balance incremented
      const updatedCash = cashService.getAccountById('acc-caisse-principale');
      expect(updatedCash.balance).toBe(initialCash.balance + 80000);

      // Verify double-entry cash transaction was recorded
      const cashTx = updatedCash.recentTransactions.find(t => t.description.includes('Achat nouvelle presse'));
      expect(cashTx).toBeDefined();
      expect(cashTx?.type).toBe(CashTransactionType.PARTNER_CONTRIBUTION);
      expect(cashTx?.amount).toBe(80000);
      expect(cashTx?.balanceAfter).toBe(updatedCash.balance);
    });

    it('should reject non-positive contribution amounts', () => {
      expect(() => {
        partnerService.recordContribution({
          partnerId: 'partner-riad',
          amount: -5000,
          date: '2026-09-16',
          description: 'Montant négatif invalide',
        });
      }).toThrow();
    });
  });

  describe('Double-Entry Partner Withdrawal & Liquidity Safety Check', () => {
    it('should record partner withdrawal and decrement cash account balance', () => {
      const initialCash = cashService.getAccountById('acc-caisse-principale');
      const initialPartner = partnerService.getPartnerById('partner-brother');

      const tx = partnerService.recordWithdrawal(
        {
          partnerId: 'partner-brother',
          amount: 25000,
          cashAccountId: 'acc-caisse-principale',
          date: '2026-09-16',
          description: 'Retrait dividendes partiel',
          reference: 'RET-20260916-01',
        },
        'usr-brother',
        'Brother'
      );

      expect(tx.id).toBeDefined();
      expect(tx.amount).toBe(25000);
      expect(tx.type).toBe(PartnerTransactionType.WITHDRAWAL);

      // Verify partner balance decreased
      const updatedPartner = partnerService.getPartnerById('partner-brother');
      expect(updatedPartner.currentBalance).toBe(initialPartner.currentBalance - 25000);
      expect(updatedPartner.totalWithdrawals).toBe(initialPartner.totalWithdrawals + 25000);

      // Verify cash account balance decremented
      const updatedCash = cashService.getAccountById('acc-caisse-principale');
      expect(updatedCash.balance).toBe(initialCash.balance - 25000);

      // Verify double-entry cash transaction
      const cashTx = updatedCash.recentTransactions.find(t => t.description.includes('Retrait dividendes partiel'));
      expect(cashTx).toBeDefined();
      expect(cashTx?.type).toBe(CashTransactionType.PARTNER_WITHDRAWAL);
      expect(cashTx?.amount).toBe(25000);
      expect(cashTx?.balanceAfter).toBe(updatedCash.balance);
    });

    it('should prevent withdrawal if cash account has insufficient liquidity', () => {
      const cash = cashService.getAccountById('acc-caisse-principale');
      const excessAmount = cash.balance + 100000;

      expect(() => {
        partnerService.recordWithdrawal({
          partnerId: 'partner-riad',
          amount: excessAmount,
          cashAccountId: 'acc-caisse-principale',
          date: '2026-09-16',
          description: 'Tentative retrait avec solde insuffisant',
        });
      }).toThrow(/Fonds insuffisants/);
    });
  });

  describe('Multi-Account Cash Management & Inter-Account Transfers', () => {
    it('should list all available cash accounts', () => {
      const accounts = cashService.listAccounts();
      expect(accounts.length).toBeGreaterThanOrEqual(3);
      
      const defaultAccount = accounts.find(a => a.isDefault);
      expect(defaultAccount?.id).toBe('acc-caisse-principale');
      expect(defaultAccount?.type).toBe('CASH');

      const ccp = accounts.find(a => a.type === 'CCP');
      expect(ccp).toBeDefined();
      expect(ccp?.balance).toBe(80000);

      const baridimob = accounts.find(a => a.type === 'BARIDIMOB');
      expect(baridimob).toBeDefined();
      expect(baridimob?.balance).toBe(45000);
    });

    it('should execute an atomic inter-account transfer', () => {
      const sourceBefore = cashService.getAccountById('acc-caisse-principale');
      const destBefore = cashService.getAccountById('acc-baridimob');
      const transferAmount = 20000;

      const result = cashService.transferFunds(
        {
          fromAccountId: 'acc-caisse-principale',
          toAccountId: 'acc-baridimob',
          amount: transferAmount,
          date: '2026-09-16',
          description: 'Alimentation compte BaridiMob pour règlements fournisseurs',
        },
        'usr-admin',
        'Administrateur ZR'
      );

      expect(result.success).toBe(true);
      expect(result.fromBalance).toBe(sourceBefore.balance - transferAmount);
      expect(result.toBalance).toBe(destBefore.balance + transferAmount);

      // Verify updated source
      const sourceAfter = cashService.getAccountById('acc-caisse-principale');
      expect(sourceAfter.balance).toBe(sourceBefore.balance - transferAmount);
      const outTx = sourceAfter.recentTransactions.find(t => t.type === CashTransactionType.TRANSFER_OUT);
      expect(outTx).toBeDefined();
      expect(outTx?.amount).toBe(transferAmount);

      // Verify updated destination
      const destAfter = cashService.getAccountById('acc-baridimob');
      expect(destAfter.balance).toBe(destBefore.balance + transferAmount);
      const inTx = destAfter.recentTransactions.find(t => t.type === CashTransactionType.TRANSFER_IN);
      expect(inTx).toBeDefined();
      expect(inTx?.amount).toBe(transferAmount);
    });

    it('should reject inter-account transfer if source has insufficient balance', () => {
      const source = cashService.getAccountById('acc-baridimob');
      expect(() => {
        cashService.transferFunds({
          fromAccountId: 'acc-baridimob',
          toAccountId: 'acc-caisse-principale',
          amount: source.balance + 50000,
          date: '2026-09-16',
          description: 'Transfert excédant le solde',
        });
      }).toThrow(/Fonds insuffisants/);
    });

    it('should reject inter-account transfer between identical accounts', () => {
      expect(() => {
        cashService.transferFunds({
          fromAccountId: 'acc-caisse-principale',
          toAccountId: 'acc-caisse-principale',
          amount: 5000,
          date: '2026-09-16',
          description: 'Transfert même compte',
        });
      }).toThrow(/différents/);
    });
  });

  describe('API Endpoints & Strict RBAC Security', () => {
    let adminToken: string;
    let riadToken: string;
    let brotherToken: string;
    let employeeToken: string;
    let viewerToken: string;

    beforeEach(async () => {
      adminToken = (await authService.login('admin@zrfactory.dz', 'admin123456')).token;
      riadToken = (await authService.login('riad@zrfactory.dz', 'riad123456')).token;
      brotherToken = (await authService.login('brother@zrfactory.dz', 'brother123456')).token;
      employeeToken = (await authService.login('employee@zrfactory.dz', 'employee123456')).token;
      viewerToken = (await authService.login('viewer@zrfactory.dz', 'viewer123456')).token;
    });

    it('should allow Admin and Partners to list partners via GET /api/partners', async () => {
      const adminRes = await request(app)
        .get('/api/partners')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(adminRes.status).toBe(200);
      expect(adminRes.body.data.partners).toHaveLength(2);

      const partnerRes = await request(app)
        .get('/api/partners')
        .set('Authorization', `Bearer ${riadToken}`);
      expect(partnerRes.status).toBe(200);
      expect(partnerRes.body.data.partners).toHaveLength(2);
    });

    it('should block Employee from accessing partner endpoints (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/partners')
        .set('Authorization', `Bearer ${employeeToken}`);
      expect(res.status).toBe(403);
    });

    it('should allow Admin to record capital contribution via POST /api/partners/:id/contribution', async () => {
      const res = await request(app)
        .post('/api/partners/partner-riad/contribution')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          amount: 60000,
          cashAccountId: 'acc-caisse-principale',
          date: '2026-09-16',
          description: 'Investissement outillage atelier',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.transaction.amount).toBe(60000);
    });

    it('should enforce partner self-isolation: Partner cannot withdraw from another partner account', async () => {
      // Riad trying to withdraw from Brother account
      const res = await request(app)
        .post('/api/partners/partner-brother/withdrawal')
        .set('Authorization', `Bearer ${riadToken}`)
        .send({
          amount: 10000,
          cashAccountId: 'acc-caisse-principale',
          date: '2026-09-16',
          description: 'Tentative non autorisée',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.message).toMatch(/propre compte associé/);
    });

    it('should allow Partner to withdraw from their own account', async () => {
      const res = await request(app)
        .post('/api/partners/partner-riad/withdrawal')
        .set('Authorization', `Bearer ${riadToken}`)
        .send({
          amount: 15000,
          cashAccountId: 'acc-caisse-principale',
          date: '2026-09-16',
          description: 'Retrait personnel régulier',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.transaction.amount).toBe(15000);
    });

    it('should execute inter-account transfer via POST /api/cash/transfer', async () => {
      const res = await request(app)
        .post('/api/cash/transfer')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          fromAccountId: 'acc-caisse-principale',
          toAccountId: 'acc-ccp-algerie-poste',
          amount: 30000,
          date: '2026-09-16',
          description: 'Dépôt CCP banque',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.success).toBe(true);
    });

    it('should block Viewer from executing financial mutations (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/cash/transfer')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          fromAccountId: 'acc-caisse-principale',
          toAccountId: 'acc-ccp-algerie-poste',
          amount: 5000,
          date: '2026-09-16',
          description: 'Virement test',
        });

      expect(res.status).toBe(403);
    });
  });
});
