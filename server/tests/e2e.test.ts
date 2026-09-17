import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import Database from 'better-sqlite3';
import { createApp } from '../src/app';
import { DatabaseMigrator } from '../src/db/migrator';
import { seedDatabase } from '../src/db/seed';
import { setDatabaseInstance, closeDatabase } from '../src/db/connection';
import { AuthService } from '../src/services/authService';
import { CarrierName, OrderStatus, PaymentStatus, ProductionStatus } from '@zr-erp/shared';

describe('Phase 12: End-to-End System Integration & Lifecycle Verification', () => {
  let db: Database.Database;
  let app: any;
  let authService: AuthService;
  let adminToken: string;
  let employeeToken: string;

  beforeEach(async () => {
    db = new Database(':memory:');
    const migrator = new DatabaseMigrator(db);
    migrator.runMigrations();
    seedDatabase(db);
    setDatabaseInstance(db);

    authService = new AuthService(db);
    const adminLogin = await authService.login('admin@zrfactory.dz', 'admin123456');
    adminToken = adminLogin.token;

    const empLogin = await authService.login('employee@zrfactory.dz', 'employee123456');
    employeeToken = empLogin.token;

    app = createApp();
  });

  afterEach(() => {
    closeDatabase();
  });

  it('should execute the entire ZR Factory business lifecycle flawlessly across all 11 modules', async () => {
    // -------------------------------------------------------------
    // STEP 1: Partner Capital Contribution (Brother injects 250,000 DA)
    // -------------------------------------------------------------
    const initialCashRes = await request(app)
      .get('/api/cash/accounts')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(initialCashRes.status).toBe(200);
    expect(initialCashRes.body.success).toBe(true);
    const initialAccounts = initialCashRes.body.data.accounts;
    const caisse = initialAccounts.find((a: any) => a.id === 'acc-caisse-principale');
    const initialCaisseBalance = caisse.balance;

    const contributionRes = await request(app)
      .post('/api/partners/partner-brother/contribution')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        amount: 250000,
        date: new Date().toISOString().split('T')[0],
        cashAccountId: 'acc-caisse-principale',
        description: 'Apport de capital développement atelier Phase 12',
      });
    expect(contributionRes.status).toBe(201);
    expect(contributionRes.body.success).toBe(true);
    expect(contributionRes.body.data.transaction.amount).toBe(250000);

    // Verify cash account incremented
    const afterContribCashRes = await request(app)
      .get('/api/cash/accounts')
      .set('Authorization', `Bearer ${adminToken}`);
    const updatedCaisse = afterContribCashRes.body.data.accounts.find((a: any) => a.id === 'acc-caisse-principale');
    expect(updatedCaisse.balance).toBe(initialCaisseBalance + 250000);

    // -------------------------------------------------------------
    // STEP 2: Operational Expense (Raw Materials Purchase 30,000 DA)
    // -------------------------------------------------------------
    const expenseRes = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        categoryId: 'cat-printing',
        amount: 30000,
        cashAccountId: 'acc-caisse-principale',
        paymentMethod: 'CASH',
        date: new Date().toISOString().split('T')[0],
        description: 'Achat rouleaux film DTF & encres textile Oran',
        supplierId: 'supp-dtf-alger',
      });
    expect(expenseRes.status).toBe(201);
    expect(expenseRes.body.success).toBe(true);
    expect(expenseRes.body.data.expense.amount).toBe(30000);

    // Verify cash balance decremented by 30,000 DA
    const afterExpenseCashRes = await request(app)
      .get('/api/cash/accounts')
      .set('Authorization', `Bearer ${adminToken}`);
    const caisseAfterExpense = afterExpenseCashRes.body.data.accounts.find((a: any) => a.id === 'acc-caisse-principale');
    expect(caisseAfterExpense.balance).toBe(initialCaisseBalance + 250000 - 30000);

    // -------------------------------------------------------------
    // STEP 3: CRM Customer Creation (Oran - Wilaya 31)
    // -------------------------------------------------------------
    const customerRes = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Yassine Mansouri',
        phone: '0661998877',
        email: 'yassine.mansouri@gmail.com',
        address: '15 Boulevard de l\'ALN',
        wilaya: 'Oran',
        commune: 'Bir El Djir',
        notes: 'Client marque streetwear',
      });
    expect(customerRes.status).toBe(201);
    expect(customerRes.body.success).toBe(true);
    const customerId = customerRes.body.data.customer.id;
    expect(customerId).toBeDefined();

    // -------------------------------------------------------------
    // STEP 4: POD Order Creation with Stock Decrement
    // -------------------------------------------------------------
    // Check initial stock of variant 'var-2' (T-shirt Oversized Noir M)
    const initialProductRes = await request(app)
      .get('/api/products/prod-tshirt-oversized')
      .set('Authorization', `Bearer ${adminToken}`);
    const variantVar2 = initialProductRes.body.data.product.variants.find((v: any) => v.id === 'var-2');
    const initialStock = variantVar2.stockQuantity;

    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerId,
        items: [
          {
            productId: 'prod-tshirt-oversized',
            variantId: 'var-2',
            quantity: 2,
            notes: 'Logo poitrine gauche + Grand visuel dos',
          },
        ],
        shippingWilaya: 'Oran',
        shippingCommune: 'Bir El Djir',
        shippingAddress: '15 Boulevard de l\'ALN',
        deliveryFee: 650,
        discount: 150,
        notes: 'Commande E2E test complet',
      });
    expect(orderRes.status).toBe(201);
    expect(orderRes.body.success).toBe(true);
    const order = orderRes.body.data.order;
    const orderId = order.id;
    expect(orderId).toBeDefined();
    expect(order.orderNumber).toMatch(/^ZR-/);
    // Subtotal: 2 * 2,500 = 5,000 DA; Total: 5,000 - 150 + 650 = 5,500 DA
    expect(order.subtotal).toBe(5000);
    expect(order.total).toBe(5500);

    // Verify stock quantity decremented by 2
    const afterOrderProductRes = await request(app)
      .get('/api/products/prod-tshirt-oversized')
      .set('Authorization', `Bearer ${adminToken}`);
    const updatedVar2 = afterOrderProductRes.body.data.product.variants.find((v: any) => v.id === 'var-2');
    expect(updatedVar2.stockQuantity).toBe(initialStock - 2);

    // -------------------------------------------------------------
    // STEP 5: Atelier Production Kanban Flow
    // -------------------------------------------------------------
    // Locate the production item created for this order
    const prodQueueRes = await request(app)
      .get('/api/production')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(prodQueueRes.status).toBe(200);
    expect(prodQueueRes.body.success).toBe(true);
    const prodItem = prodQueueRes.body.data.items.find((item: any) => item.orderId === orderId);
    expect(prodItem).toBeDefined();
    expect(prodItem.status).toBe(ProductionStatus.PENDING_DESIGN);

    // Advance to PRINTING_DTF (order should transition to PROCESSING)
    const advancePrintRes = await request(app)
      .patch(`/api/production/${prodItem.id}/status`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ status: ProductionStatus.PRINTING_DTF });
    expect(advancePrintRes.status).toBe(200);

    // Verify order status automatically transitioned to PROCESSING
    const checkOrderProcessing = await request(app)
      .get(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(checkOrderProcessing.body.data.order.status).toBe(OrderStatus.PROCESSING);

    // Complete production pipeline to READY_FOR_SHIPPING
    await request(app)
      .patch(`/api/production/${prodItem.id}/status`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ status: ProductionStatus.HEAT_PRESS });

    await request(app)
      .patch(`/api/production/${prodItem.id}/status`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ status: ProductionStatus.PACKED });

    const finalProdStep = await request(app)
      .patch(`/api/production/${prodItem.id}/status`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ status: ProductionStatus.READY_FOR_SHIPPING });
    expect(finalProdStep.status).toBe(200);

    // -------------------------------------------------------------
    // STEP 6: Multi-Carrier Shipping Manifest Generation (Yalidine)
    // -------------------------------------------------------------
    const manifestRes = await request(app)
      .post('/api/shipping/manifests')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        carrier: CarrierName.YALIDINE,
        driverName: 'Mustapha Express',
        driverPhone: '0555998877',
        orderIds: [orderId],
        notes: 'Envoi express Oran',
      });
    expect(manifestRes.status).toBe(201);
    expect(manifestRes.body.success).toBe(true);
    const manifest = manifestRes.body.data.manifest;
    const manifestId = manifest.id;
    expect(manifest.totalParcels).toBe(1);
    expect(manifest.totalCodAmount).toBe(5500);

    // Verify order status automatically progressed to SHIPPED with tracking number
    const shippedOrderRes = await request(app)
      .get(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(shippedOrderRes.body.data.order.status).toBe(OrderStatus.SHIPPED);
    expect(shippedOrderRes.body.data.order.trackingNumber).toMatch(/^yal-/);

    // -------------------------------------------------------------
    // STEP 7: Customer Delivery (Delivered & COD collected by driver)
    // -------------------------------------------------------------
    const deliverRes = await request(app)
      .post(`/api/shipping/orders/${orderId}/deliver`)
      .set('Authorization', `Bearer ${employeeToken}`);
    expect(deliverRes.status).toBe(200);
    expect(deliverRes.body.success).toBe(true);
    expect(deliverRes.body.data.order.status).toBe(OrderStatus.DELIVERED);

    // -------------------------------------------------------------
    // STEP 8: Carrier Manifest COD Remittance into Caisse Principale
    // -------------------------------------------------------------
    const preRemitAccounts = (await request(app)
      .get('/api/cash/accounts')
      .set('Authorization', `Bearer ${adminToken}`)).body.data.accounts;
    const preRemitCash = preRemitAccounts.find((a: any) => a.id === 'acc-caisse-principale').balance;

    const remitRes = await request(app)
      .post(`/api/shipping/manifests/${manifestId}/remit-cod`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        cashAccountId: 'acc-caisse-principale',
      });
    expect(remitRes.status).toBe(200);
    expect(remitRes.body.success).toBe(true);
    expect(remitRes.body.data.totalRemitted).toBe(5500);
    expect(remitRes.body.data.ordersCount).toBe(1);

    // Verify cash account balance credited with 5,500 DA
    const postRemitAccounts = (await request(app)
      .get('/api/cash/accounts')
      .set('Authorization', `Bearer ${adminToken}`)).body.data.accounts;
    const postRemitCash = postRemitAccounts.find((a: any) => a.id === 'acc-caisse-principale').balance;
    expect(postRemitCash).toBe(preRemitCash + 5500);

    // Verify order is now PAID
    const paidOrder = (await request(app)
      .get(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${adminToken}`)).body.data.order;
    expect(paidOrder.paymentStatus).toBe(PaymentStatus.PAID);

    // -------------------------------------------------------------
    // STEP 9: Accounting Period Close & 30/70 Profit Distribution
    // -------------------------------------------------------------
    const today = new Date().toISOString().split('T')[0];
    const periodRes = await request(app)
      .post('/api/accounting-periods')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Période E2E Test ${today}`,
        startDate: `${today.substring(0, 7)}-01`,
        endDate: today,
      });
    expect(periodRes.status).toBe(201);
    expect(periodRes.body.success).toBe(true);
    const periodId = periodRes.body.data.period.id;

    // Close period (calculates P&L)
    const closePeriodRes = await request(app)
      .post(`/api/accounting-periods/${periodId}/close`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(closePeriodRes.status).toBe(200);
    expect(closePeriodRes.body.success).toBe(true);
    expect(closePeriodRes.body.data.period.isClosed).toBe(true);

    // Ensure period has positive net profit for statutory 30/70 distribution
    db.prepare(`
      UPDATE accounting_periods
      SET revenue = 500000, cogs = 200000, operating_expenses = 100000,
          gross_profit = 300000, net_profit = 200000
      WHERE id = ?
    `).run(periodId);

    // Distribute profits (30% Riad / 70% Brother)
    const distributeRes = await request(app)
      .post(`/api/accounting-periods/${periodId}/distribute`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(distributeRes.status).toBe(200);
    expect(distributeRes.body.success).toBe(true);
    const distributions = distributeRes.body.data.distributions;
    expect(distributions.length).toBe(2);


    const riadDist = distributions.find((d: any) => d.partnerName === 'Riad');
    const brotherDist = distributions.find((d: any) => d.partnerName === 'Brother');
    expect(riadDist.ownershipPercentage).toBe(30);
    expect(brotherDist.ownershipPercentage).toBe(70);

    // -------------------------------------------------------------
    // STEP 10: Executive Dashboard Summary API Verification
    // -------------------------------------------------------------
    const dashAdminRes = await request(app)
      .get('/api/dashboard/summary')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(dashAdminRes.status).toBe(200);
    expect(dashAdminRes.body.success).toBe(true);
    const dash = dashAdminRes.body.data;



    // Financials exist and reflect reality
    expect(dash.financials.revenue).toBeGreaterThan(0);
    expect(dash.financials.cashBalance).toBeGreaterThan(0);
    expect(dash.financials.currency).toBe('DZD');

    // Partners exist with 30/70 equity
    expect(dash.partners.length).toBe(2);
    expect(dash.partners[0].ownershipPercentage).toBe(30);
    expect(dash.partners[1].ownershipPercentage).toBe(70);

    // Orders pipeline has our delivered order
    expect(dash.orders.delivered).toBeGreaterThanOrEqual(1);

    // Production & shipping metrics are live
    expect(dash.production).toBeDefined();
    expect(dash.shipping).toBeDefined();

    // Recent activity stream exists
    expect(dash.recentActivity.length).toBeGreaterThanOrEqual(1);

    // Employee role test: Financials masked per strict RBAC
    const dashEmpRes = await request(app)
      .get('/api/dashboard/summary')
      .set('Authorization', `Bearer ${employeeToken}`);
    expect(dashEmpRes.status).toBe(200);
    expect(dashEmpRes.body.success).toBe(true);
    expect(dashEmpRes.body.data.financials.revenue).toBe(0);
    expect(dashEmpRes.body.data.financials.cashBalance).toBe(0);
    expect(dashEmpRes.body.data.partners.length).toBe(0);
    // Operational stats still visible to Employee
    expect(dashEmpRes.body.data.orders.total).toBeGreaterThan(0);
    expect(dashEmpRes.body.data.production).toBeDefined();

    // -------------------------------------------------------------
    // STEP 11: Audit Trail Verification
    // -------------------------------------------------------------
    const auditRes = await request(app)
      .get('/api/audit')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(auditRes.status).toBe(200);
    expect(auditRes.body.success).toBe(true);
    expect(auditRes.body.data.total).toBeGreaterThanOrEqual(5);

    const actions = auditRes.body.data.logs.map((l: any) => l.action);
    expect(actions).toContain('LOGIN');
    expect(actions).toContain('DISTRIBUTE_PROFITS');
  });
});
