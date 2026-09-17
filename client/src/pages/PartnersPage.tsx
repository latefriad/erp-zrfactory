import React, { useState, useEffect } from 'react';
import { fetchApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate } from '../lib/formatters';
import { Partner, PartnerTransaction, CashAccount, CashTransaction, PartnerTransactionType, CashTransactionType } from '@zr-erp/shared';
import {
  Users,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Plus,
  Minus,
  RefreshCw,
  Search,
  Lock,
  AlertCircle,
  X,
  CreditCard,
  Building,
  History,
  Calendar,
} from 'lucide-react';
import { AccountingPeriodsPage } from './AccountingPeriodsPage';

export const PartnersPage: React.FC = () => {
  const { user } = useAuth();
  const { language } = useApp();
  const [activeSection, setActiveSection] = useState<'CAPITAL' | 'PERIODS'>('CAPITAL');

  const [partners, setPartners] = useState<Partner[]>([]);
  const [cashAccounts, setCashAccounts] = useState<CashAccount[]>([]);
  const [partnerTransactions, setPartnerTransactions] = useState<PartnerTransaction[]>([]);
  const [cashTransactions, setCashTransactions] = useState<CashTransaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Active Ledger View: 'PARTNER' or 'CASH'
  const [ledgerView, setLedgerView] = useState<'PARTNER' | 'CASH'>('PARTNER');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [isContributionModalOpen, setIsContributionModalOpen] = useState<boolean>(false);
  const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState<boolean>(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState<boolean>(false);

  // Contribution Form State
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>('');
  const [selectedCashAccountId, setSelectedCashAccountId] = useState<string>('');
  const [contributionAmount, setContributionAmount] = useState<string>('');
  const [contributionDate, setContributionDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [contributionDesc, setContributionDesc] = useState<string>('');
  const [contributionRef, setContributionRef] = useState<string>('');

  // Withdrawal Form State
  const [withdrawalPartnerId, setWithdrawalPartnerId] = useState<string>('');
  const [withdrawalCashAccountId, setWithdrawalCashAccountId] = useState<string>('');
  const [withdrawalAmount, setWithdrawalAmount] = useState<string>('');
  const [withdrawalDate, setWithdrawalDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [withdrawalDesc, setWithdrawalDesc] = useState<string>('');
  const [withdrawalRef, setWithdrawalRef] = useState<string>('');

  // Transfer Form State
  const [transferFromId, setTransferFromId] = useState<string>('');
  const [transferToId, setTransferToId] = useState<string>('');
  const [transferAmount, setTransferAmount] = useState<string>('');
  const [transferDate, setTransferDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [transferDesc, setTransferDesc] = useState<string>('');

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const canAccessFinance = user?.role === 'ADMIN' || user?.role === 'PARTNER';
  const isAdmin = user?.role === 'ADMIN';

  const loadData = async () => {
    if (!canAccessFinance) return;
    setIsLoading(true);
    setError(null);

    try {
      const [partnersRes, cashRes, pTxRes, cTxRes] = await Promise.all([
        fetchApi<{ partners: Partner[] }>('/partners'),
        fetchApi<{ accounts: CashAccount[] }>('/cash/accounts'),
        fetchApi<{ transactions: PartnerTransaction[] }>('/partners/transactions?limit=50'),
        fetchApi<{ transactions: CashTransaction[] }>('/cash/transactions?limit=50'),
      ]);

      setPartners(partnersRes.partners || []);
      setCashAccounts(cashRes.accounts || []);
      setPartnerTransactions(pTxRes.transactions || []);
      setCashTransactions(cTxRes.transactions || []);

      // Default selection setup
      if (partnersRes.partners?.length > 0 && !selectedPartnerId) {
        // If partner user, default to their account
        const myPartner = partnersRes.partners.find(p => p.id === user?.partnerId);
        setSelectedPartnerId(myPartner ? myPartner.id : partnersRes.partners[0].id);
        setWithdrawalPartnerId(myPartner ? myPartner.id : partnersRes.partners[0].id);
      }
      if (cashRes.accounts?.length > 0 && !selectedCashAccountId) {
        const defAcc = cashRes.accounts.find(a => a.isDefault) || cashRes.accounts[0];
        setSelectedCashAccountId(defAcc.id);
        setWithdrawalCashAccountId(defAcc.id);
        setTransferFromId(defAcc.id);
        const secondAcc = cashRes.accounts.find(a => a.id !== defAcc.id);
        if (secondAcc) setTransferToId(secondAcc.id);
      }
    } catch (err: any) {
      console.error('Failed to load partner & cash data:', err);
      setError(err.message || 'Erreur lors du chargement des données financières.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // Handle Capital Contribution
  const handleRecordContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const amountNum = parseFloat(contributionAmount);
    if (!amountNum || amountNum <= 0) {
      setFormError('Veuillez saisir un montant supérieur à 0 DA');
      return;
    }
    if (!selectedPartnerId) {
      setFormError('Veuillez sélectionner un associé');
      return;
    }
    if (!contributionDesc.trim()) {
      setFormError('Veuillez préciser la description ou le motif de l\'apport');
      return;
    }

    setIsSubmitting(true);
    try {
      await fetchApi(`/partners/${selectedPartnerId}/contribution`, {
        method: 'POST',
        body: JSON.stringify({
          amount: amountNum,
          cashAccountId: selectedCashAccountId || null,
          date: contributionDate,
          description: contributionDesc.trim(),
          reference: contributionRef.trim() || null,
        }),
      });

      setIsContributionModalOpen(false);
      setContributionAmount('');
      setContributionDesc('');
      setContributionRef('');
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Erreur lors de l\'enregistrement de l\'apport');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Partner Withdrawal
  const handleRecordWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const amountNum = parseFloat(withdrawalAmount);
    if (!amountNum || amountNum <= 0) {
      setFormError('Veuillez saisir un montant supérieur à 0 DA');
      return;
    }
    if (!withdrawalPartnerId) {
      setFormError('Veuillez sélectionner un associé');
      return;
    }

    // Check account liquidity client-side for immediate UX feedback
    const targetAccount = cashAccounts.find(a => a.id === withdrawalCashAccountId);
    if (targetAccount && targetAccount.balance < amountNum) {
      setFormError(`Liquidité insuffisante sur ${targetAccount.name}. Solde disponible: ${formatCurrency(targetAccount.balance, language)}`);
      return;
    }

    if (!withdrawalDesc.trim()) {
      setFormError('Veuillez préciser le motif du retrait');
      return;
    }

    setIsSubmitting(true);
    try {
      await fetchApi(`/partners/${withdrawalPartnerId}/withdrawal`, {
        method: 'POST',
        body: JSON.stringify({
          amount: amountNum,
          cashAccountId: withdrawalCashAccountId || null,
          date: withdrawalDate,
          description: withdrawalDesc.trim(),
          reference: withdrawalRef.trim() || null,
        }),
      });

      setIsWithdrawalModalOpen(false);
      setWithdrawalAmount('');
      setWithdrawalDesc('');
      setWithdrawalRef('');
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Erreur lors de l\'enregistrement du retrait');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Inter-Account Transfer
  const handleTransferFunds = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const amountNum = parseFloat(transferAmount);
    if (!amountNum || amountNum <= 0) {
      setFormError('Veuillez saisir un montant supérieur à 0 DA');
      return;
    }
    if (!transferFromId || !transferToId) {
      setFormError('Les deux comptes sont obligatoires');
      return;
    }
    if (transferFromId === transferToId) {
      setFormError('Le compte source et le compte destination doivent être différents');
      return;
    }

    const sourceAcc = cashAccounts.find(a => a.id === transferFromId);
    if (sourceAcc && sourceAcc.balance < amountNum) {
      setFormError(`Liquidité insuffisante sur ${sourceAcc.name}. Solde: ${formatCurrency(sourceAcc.balance, language)}`);
      return;
    }

    if (!transferDesc.trim()) {
      setFormError('Veuillez indiquer le motif du transfert');
      return;
    }

    setIsSubmitting(true);
    try {
      await fetchApi('/cash/transfer', {
        method: 'POST',
        body: JSON.stringify({
          fromAccountId: transferFromId,
          toAccountId: transferToId,
          amount: amountNum,
          date: transferDate,
          description: transferDesc.trim(),
        }),
      });

      setIsTransferModalOpen(false);
      setTransferAmount('');
      setTransferDesc('');
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Erreur lors du virement inter-comptes');
    } finally {
      setIsSubmitting(false);
    }
  };

  // If user lacks finance access
  if (!canAccessFinance) {
    return (
      <div className="bg-white rounded-2xl border border-red-200 p-12 text-center max-w-lg mx-auto my-16 shadow-sm">
        <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-100">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Accès Restreint aux Finances</h2>
        <p className="text-sm text-slate-500 mb-6">
          La gestion du capital des associés, les retraits et les comptes de trésorerie sont réservés aux comptes Administrateur et Associés.
        </p>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 text-start flex gap-2 items-center">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
          <span>Pour consulter ces données, veuillez vous connecter avec un profil Associé ou Administrateur.</span>
        </div>
      </div>
    );
  }

  // Filtered transactions
  const filteredPartnerTx = partnerTransactions.filter(t => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (t.partnerName || '').toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      (t.reference && t.reference.toLowerCase().includes(q))
    );
  });

  const filteredCashTx = cashTransactions.filter(t => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.description.toLowerCase().includes(q) ||
      t.type.toLowerCase().includes(q)
    );
  });

  const totalCashBalance = cashAccounts.reduce((sum, a) => sum + a.balance, 0);

  return (
    <div className="space-y-6">
      {/* Top Module Switcher */}
      <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 max-w-md">
        <button
          onClick={() => setActiveSection('CAPITAL')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
            activeSection === 'CAPITAL'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4 text-indigo-600" />
          Capital & Trésorerie
        </button>
        <button
          onClick={() => setActiveSection('PERIODS')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
            activeSection === 'PERIODS'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Calendar className="w-4 h-4 text-blue-600" />
          Périodes & Bénéfices
        </button>
      </div>

      {activeSection === 'PERIODS' ? (
        <AccountingPeriodsPage />
      ) : (
        <>
          {/* Top Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Associés, Capital & Trésorerie</h1>
              <p className="text-xs text-slate-500">
                Suivi du capital propre (Riad 30% / Brother 70%), prélèvements, et comptes de caisse en double écriture
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setFormError(null);
              setIsContributionModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Apport de Capital
          </button>
          <button
            onClick={() => {
              setFormError(null);
              setIsWithdrawalModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
          >
            <Minus className="w-4 h-4" />
            Retrait Associé
          </button>
          <button
            onClick={() => {
              setFormError(null);
              setIsTransferModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
          >
            <ArrowLeftRight className="w-4 h-4" />
            Virement Interne
          </button>
          <button
            onClick={loadData}
            disabled={isLoading}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
            title="Actualiser"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl text-rose-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* PARTNERS CAPITAL CARDS (RIAD 30% / BROTHER 70%) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-500" />
            Parts Sociales & Soldes Associés
          </h2>
          <span className="text-xs text-slate-400 font-mono">
            Formule: Capital Initial + Apports + Bénéfices - Retraits
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {partners.map(partner => {
            const isMe = user?.partnerId === partner.id;
            const canWithdrawThis = isAdmin || isMe;

            return (
              <div
                key={partner.id}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm relative overflow-hidden transition-all hover:border-indigo-300"
              >
                {/* Accent line */}
                <div
                  className={`absolute top-0 left-0 right-0 h-1.5 ${
                    partner.ownershipPercentage >= 50 ? 'bg-indigo-600' : 'bg-blue-500'
                  }`}
                />

                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center font-bold text-slate-700 text-lg border border-slate-200">
                      {partner.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-slate-900">{partner.name}</h3>
                        {isMe && (
                          <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-200">
                            Votre Compte
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500 font-medium">
                        Quote-part : <strong className="text-slate-800">{partner.ownershipPercentage}%</strong>
                      </span>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg">
                    {partner.ownershipPercentage}% Capital
                  </span>
                </div>

                {/* Financial Summary */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 mb-5">
                  <span className="text-xs text-slate-500 font-medium block mb-1">Solde de Capital Disponible</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-emerald-600 tracking-tight">
                      {formatCurrency(partner.currentBalance, language)}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-200/60 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Capital Initial</span>
                      <span className="font-semibold text-slate-700">
                        {formatCurrency(partner.initialCapital, language)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Total Apports</span>
                      <span className="font-semibold text-emerald-600">
                        +{formatCurrency(partner.totalContributions, language)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Total Retraits</span>
                      <span className="font-semibold text-rose-600">
                        -{formatCurrency(partner.totalWithdrawals, language)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Quick Action Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSelectedPartnerId(partner.id);
                      setFormError(null);
                      setIsContributionModalOpen(true);
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Apport (+DA)
                  </button>

                  <button
                    disabled={!canWithdrawThis}
                    onClick={() => {
                      setWithdrawalPartnerId(partner.id);
                      setFormError(null);
                      setIsWithdrawalModalOpen(true);
                    }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-colors border ${
                      canWithdrawThis
                        ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                        : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                    }`}
                    title={!canWithdrawThis ? 'Vous ne pouvez effectuer de retrait que sur votre propre compte' : ''}
                  >
                    <Minus className="w-3.5 h-3.5" />
                    Retrait (-DA)
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CASH ACCOUNTS SECTION */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
              Comptes de Trésorerie & Caisses
            </h2>
          </div>
          <div className="text-xs text-slate-500">
            Liquidité Totale : <strong className="text-slate-900 font-mono">{formatCurrency(totalCashBalance, language)}</strong>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cashAccounts.map(account => {
            const getIcon = () => {
              if (account.type === 'CASH') return <Wallet className="w-5 h-5 text-emerald-600" />;
              if (account.type === 'CCP') return <Building className="w-5 h-5 text-amber-600" />;
              if (account.type === 'BARIDIMOB') return <CreditCard className="w-5 h-5 text-blue-600" />;
              return <Wallet className="w-5 h-5 text-slate-600" />;
            };

            const getBg = () => {
              if (account.type === 'CASH') return 'bg-emerald-50 border-emerald-100';
              if (account.type === 'CCP') return 'bg-amber-50 border-amber-100';
              if (account.type === 'BARIDIMOB') return 'bg-blue-50 border-blue-100';
              return 'bg-slate-50 border-slate-100';
            };

            return (
              <div
                key={account.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${getBg()}`}>
                      {getIcon()}
                    </div>
                    {account.isDefault && (
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                        Caisse Principale
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm">{account.name}</h3>
                  <span className="text-xs font-mono text-slate-400 block mb-3">Type: {account.type}</span>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-baseline justify-between">
                  <span className="text-xs text-slate-500 font-medium">Solde Actuel :</span>
                  <span className="text-lg font-bold text-slate-900 font-mono">
                    {formatCurrency(account.balance, language)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* DOUBLE-ENTRY FINANCIAL LEDGER */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Ledger Navigation & Search Header */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-500" />
            <h3 className="font-bold text-slate-900 text-sm">Livre Journal des Écritures</h3>
            <div className="flex bg-slate-200/70 p-0.5 rounded-lg text-xs font-medium ml-2">
              <button
                onClick={() => setLedgerView('PARTNER')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  ledgerView === 'PARTNER' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Journal Associés ({partnerTransactions.length})
              </button>
              <button
                onClick={() => setLedgerView('CASH')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  ledgerView === 'CASH' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Journal Trésorerie ({cashTransactions.length})
              </button>
            </div>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher écriture..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto">
          {ledgerView === 'PARTNER' ? (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Associé</th>
                  <th className="py-3 px-4">Description / Motif</th>
                  <th className="py-3 px-4">Référence</th>
                  <th className="py-3 px-4 text-right">Montant (DA)</th>
                  <th className="py-3 px-4 text-right">Enregistré par</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPartnerTx.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                      Aucune transaction d'associé enregistrée.
                    </td>
                  </tr>
                ) : (
                  filteredPartnerTx.map(tx => {
                    const isContribution = tx.type === PartnerTransactionType.CONTRIBUTION;
                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                          {formatDate(tx.date, language)}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {isContribution ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <ArrowDownLeft className="w-3 h-3" />
                              Apport
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <ArrowUpRight className="w-3 h-3" />
                              Retrait
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                          {tx.partnerName}
                        </td>
                        <td className="py-3 px-4 text-slate-700 max-w-xs truncate" title={tx.description}>
                          {tx.description}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                          {tx.reference || '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold whitespace-nowrap">
                          <span className={isContribution ? 'text-emerald-600' : 'text-rose-600'}>
                            {isContribution ? '+' : '-'}
                            {formatCurrency(tx.amount, language)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-slate-500 whitespace-nowrap">
                          {tx.createdByName || 'Système'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Compte Caisse</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-right">Montant (DA)</th>
                  <th className="py-3 px-4 text-right">Solde Résultant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCashTx.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                      Aucun mouvement de caisse enregistré.
                    </td>
                  </tr>
                ) : (
                  filteredCashTx.map(ctx => {
                    const isCredit = [
                      CashTransactionType.PARTNER_CONTRIBUTION,
                      CashTransactionType.TRANSFER_IN,
                      CashTransactionType.ORDER_PAYMENT,
                      CashTransactionType.ADJUSTMENT,
                    ].includes(ctx.type);

                    const getBadge = () => {
                      switch (ctx.type) {
                        case CashTransactionType.PARTNER_CONTRIBUTION:
                          return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Apport Associé</span>;
                        case CashTransactionType.PARTNER_WITHDRAWAL:
                          return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">Retrait Associé</span>;
                        case CashTransactionType.TRANSFER_IN:
                          return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">Virement Reçu</span>;
                        case CashTransactionType.TRANSFER_OUT:
                          return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Virement Émis</span>;
                        case CashTransactionType.EXPENSE:
                          return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">Dépense</span>;
                        default:
                          return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">{ctx.type}</span>;
                      }
                    };

                    return (
                      <tr key={ctx.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                          {formatDate(ctx.date, language)}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {getBadge()}
                        </td>
                        <td className="py-3 px-4 text-slate-700 font-medium whitespace-nowrap">
                          {cashAccounts.find(a => a.id === ctx.cashAccountId)?.name || ctx.cashAccountId}
                        </td>
                        <td className="py-3 px-4 text-slate-700 max-w-sm truncate" title={ctx.description}>
                          {ctx.description}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold whitespace-nowrap">
                          <span className={isCredit ? 'text-emerald-600' : 'text-rose-600'}>
                            {isCredit ? '+' : '-'}
                            {formatCurrency(ctx.amount, language)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-900 font-medium whitespace-nowrap">
                          {formatCurrency(ctx.balanceAfter, language)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* MODAL 1: APPORT DE CAPITAL */}
      {isContributionModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Enregistrer un Apport de Capital</h3>
                  <p className="text-xs text-slate-500">Incrémente le solde associé et le compte de trésorerie sélectionné</p>
                </div>
              </div>
              <button
                onClick={() => setIsContributionModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 bg-rose-50 border border-rose-200 p-3 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleRecordContribution} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Associé Bénéficiaire *</label>
                <select
                  value={selectedPartnerId}
                  onChange={e => setSelectedPartnerId(e.target.value)}
                  required
                  className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                >
                  {partners.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.ownershipPercentage}% du capital) - Solde actuel: {formatCurrency(p.currentBalance, language)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Compte Caisse Crédité *</label>
                  <select
                    value={selectedCashAccountId}
                    onChange={e => setSelectedCashAccountId(e.target.value)}
                    required
                    className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                  >
                    {cashAccounts.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({formatCurrency(a.balance, language)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date d'opération *</label>
                  <input
                    type="date"
                    value={contributionDate}
                    onChange={e => setContributionDate(e.target.value)}
                    required
                    className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Montant de l'Apport (DA) *</label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    step="any"
                    placeholder="ex: 50000"
                    value={contributionAmount}
                    onChange={e => setContributionAmount(e.target.value)}
                    required
                    className="w-full text-sm font-bold text-emerald-700 pl-3 pr-12 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    DA
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description / Destination des Fonds *</label>
                <input
                  type="text"
                  placeholder="ex: Apport en numéraire pour stock t-shirts vierges"
                  value={contributionDesc}
                  onChange={e => setContributionDesc(e.target.value)}
                  required
                  className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Référence Pièce / Justificatif (Optionnel)</label>
                <input
                  type="text"
                  placeholder="ex: VIR-20260916-01"
                  value={contributionRef}
                  onChange={e => setContributionRef(e.target.value)}
                  className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsContributionModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    'Confirmer l\'Apport'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: RETRAIT ASSOCIÉ */}
      {isWithdrawalModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center font-bold">
                  <Minus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Enregistrer un Retrait Associé</h3>
                  <p className="text-xs text-slate-500">Débite la trésorerie et diminue le capital disponible de l'associé</p>
                </div>
              </div>
              <button
                onClick={() => setIsWithdrawalModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 bg-rose-50 border border-rose-200 p-3 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleRecordWithdrawal} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Associé Préleveur *</label>
                <select
                  value={withdrawalPartnerId}
                  onChange={e => setWithdrawalPartnerId(e.target.value)}
                  disabled={!isAdmin}
                  required
                  className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-medium disabled:bg-slate-100 disabled:text-slate-500"
                >
                  {partners.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.ownershipPercentage}%) - Solde: {formatCurrency(p.currentBalance, language)}
                    </option>
                  ))}
                </select>
                {!isAdmin && (
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Verrouillé sur votre compte associé (règle d'isolation stricte).
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Compte Caisse Débité *</label>
                  <select
                    value={withdrawalCashAccountId}
                    onChange={e => setWithdrawalCashAccountId(e.target.value)}
                    required
                    className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-medium"
                  >
                    {cashAccounts.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.name} (Dispo: {formatCurrency(a.balance, language)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date d'opération *</label>
                  <input
                    type="date"
                    value={withdrawalDate}
                    onChange={e => setWithdrawalDate(e.target.value)}
                    required
                    className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Montant du Retrait (DA) *</label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    step="any"
                    placeholder="ex: 20000"
                    value={withdrawalAmount}
                    onChange={e => setWithdrawalAmount(e.target.value)}
                    required
                    className="w-full text-sm font-bold text-rose-700 pl-3 pr-12 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    DA
                  </span>
                </div>
                {/* Available liquidity indicator */}
                {withdrawalCashAccountId && (
                  <div className="mt-1 text-[11px] text-slate-500 flex items-center justify-between">
                    <span>Trésorerie disponible sur ce compte :</span>
                    <strong className="text-slate-800 font-mono">
                      {formatCurrency(
                        cashAccounts.find(a => a.id === withdrawalCashAccountId)?.balance || 0,
                        language
                      )}
                    </strong>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Motif du Retrait *</label>
                <input
                  type="text"
                  placeholder="ex: Retrait sur bénéfices / avance personnelle"
                  value={withdrawalDesc}
                  onChange={e => setWithdrawalDesc(e.target.value)}
                  required
                  className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Référence / Décharge (Optionnel)</label>
                <input
                  type="text"
                  placeholder="ex: RET-20260916"
                  value={withdrawalRef}
                  onChange={e => setWithdrawalRef(e.target.value)}
                  className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsWithdrawalModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Validation...
                    </>
                  ) : (
                    'Confirmer le Retrait'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: VIREMENT INTER-COMPTES */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-bold">
                  <ArrowLeftRight className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Virement Interne entre Comptes</h3>
                  <p className="text-xs text-slate-500">Transfert direct et atomique de liquidités sans impact sur le capital</p>
                </div>
              </div>
              <button
                onClick={() => setIsTransferModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 bg-rose-50 border border-rose-200 p-3 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleTransferFunds} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Compte Source (Débité) *</label>
                  <select
                    value={transferFromId}
                    onChange={e => setTransferFromId(e.target.value)}
                    required
                    className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                  >
                    {cashAccounts.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({formatCurrency(a.balance, language)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Compte Destination (Crédité) *</label>
                  <select
                    value={transferToId}
                    onChange={e => setTransferToId(e.target.value)}
                    required
                    className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                  >
                    {cashAccounts.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({formatCurrency(a.balance, language)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Montant à Transférer (DA) *</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      step="any"
                      placeholder="ex: 15000"
                      value={transferAmount}
                      onChange={e => setTransferAmount(e.target.value)}
                      required
                      className="w-full text-sm font-bold text-indigo-700 pl-3 pr-12 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      DA
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date d'opération *</label>
                  <input
                    type="date"
                    value={transferDate}
                    onChange={e => setTransferDate(e.target.value)}
                    required
                    className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Motif du Virement *</label>
                <input
                  type="text"
                  placeholder="ex: Alimentation CCP pour virement fournisseur matières premières"
                  value={transferDesc}
                  onChange={e => setTransferDesc(e.target.value)}
                  required
                  className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Transfert en cours...
                    </>
                  ) : (
                    'Exécuter le Transfert'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};

export default PartnersPage;
