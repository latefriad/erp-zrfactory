import React, { useState, useEffect } from 'react';
import { fetchApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate } from '../lib/formatters';
import { IncomeStatement, BalanceSheet, ProductMarginReport } from '@zr-erp/shared';
import {
  BarChart3,
  FileSpreadsheet,
  Wallet,
  Printer,
  Layers,
  CreditCard,
  Building,
  Boxes,
  Lock,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const { user } = useAuth();
  const { language } = useApp();

  const [activeTab, setActiveTab] = useState<'PNL' | 'BALANCE' | 'PRODUCTS'>('PNL');
  const [dateRangePreset, setDateRangePreset] = useState<'THIS_MONTH' | 'LAST_MONTH' | 'THIS_QUARTER' | 'THIS_YEAR' | 'CUSTOM'>('THIS_MONTH');

  // Dates state
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState<string>(`${today.substring(0, 7)}-01`);
  const [endDate, setEndDate] = useState<string>(today);

  // Data states
  const [incomeStatement, setIncomeStatement] = useState<IncomeStatement | null>(null);
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheet | null>(null);
  const [productMargins, setProductMargins] = useState<ProductMarginReport[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const canAccessFinance = user?.role === 'ADMIN' || user?.role === 'PARTNER';

  // Handle Preset Change
  const handlePresetChange = (preset: 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_QUARTER' | 'THIS_YEAR' | 'CUSTOM') => {
    setDateRangePreset(preset);
    const now = new Date();

    if (preset === 'THIS_MONTH') {
      setStartDate(`${today.substring(0, 7)}-01`);
      setEndDate(today);
    } else if (preset === 'LAST_MONTH') {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      setStartDate(lastMonth.toISOString().split('T')[0]);
      setEndDate(lastMonthEnd.toISOString().split('T')[0]);
    } else if (preset === 'THIS_QUARTER') {
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      const qStart = new Date(now.getFullYear(), qMonth, 1);
      setStartDate(qStart.toISOString().split('T')[0]);
      setEndDate(today);
    } else if (preset === 'THIS_YEAR') {
      setStartDate(`${now.getFullYear()}-01-01`);
      setEndDate(today);
    }
  };

  const loadReportsData = async () => {
    if (!canAccessFinance) return;
    setIsLoading(true);
    setError(null);

    try {
      const [pnlRes, balanceRes, marginsRes] = await Promise.all([
        fetchApi<{ incomeStatement: IncomeStatement }>(`/reports/income-statement?startDate=${startDate}&endDate=${endDate}`),
        fetchApi<{ balanceSheet: BalanceSheet }>(`/reports/balance-sheet?asOfDate=${endDate}`),
        fetchApi<{ productMargins: ProductMarginReport[] }>(`/reports/product-margins?startDate=${startDate}&endDate=${endDate}`),
      ]);

      setIncomeStatement(pnlRes.incomeStatement);
      setBalanceSheet(balanceRes.balanceSheet);
      setProductMargins(marginsRes.productMargins || []);
    } catch (err: any) {
      console.error('Failed to load financial reports:', err);
      setError(err.message || 'Erreur lors de la génération des rapports financiers.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReportsData();
  }, [startDate, endDate, user]);

  if (!canAccessFinance) {
    return (
      <div className="bg-white rounded-2xl border border-red-200 p-12 text-center max-w-lg mx-auto my-16 shadow-sm">
        <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-100">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Accès Financier Restreint</h2>
        <p className="text-sm text-slate-500 mb-6">
          Les comptes de résultat, bilans et analyses de marges sont strictement confidentiels et réservés aux associés et administrateurs.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Export Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-bold">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Rapports Financiers & États Comptables</h1>
            <p className="text-xs text-slate-500">
              Compte de résultat détaillé, valorisation du patrimoine (Bilan) et rentabilité par article POD
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Preset Buttons */}
          <div className="flex bg-slate-100 p-0.5 rounded-xl text-xs font-semibold">
            <button
              onClick={() => handlePresetChange('THIS_MONTH')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                dateRangePreset === 'THIS_MONTH' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ce Mois
            </button>
            <button
              onClick={() => handlePresetChange('LAST_MONTH')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                dateRangePreset === 'LAST_MONTH' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mois Dernier
            </button>
            <button
              onClick={() => handlePresetChange('THIS_QUARTER')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                dateRangePreset === 'THIS_QUARTER' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ce Trimestre
            </button>
            <button
              onClick={() => handlePresetChange('THIS_YEAR')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                dateRangePreset === 'THIS_YEAR' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Cette Année
            </button>
          </div>

          {/* Date Picker */}
          <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200 text-xs">
            <input
              type="date"
              value={startDate}
              onChange={e => {
                setDateRangePreset('CUSTOM');
                setStartDate(e.target.value);
              }}
              className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono"
            />
            <span className="text-slate-400">à</span>
            <input
              type="date"
              value={endDate}
              onChange={e => {
                setDateRangePreset('CUSTOM');
                setEndDate(e.target.value);
              }}
              className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono"
            />
          </div>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
          >
            <Printer className="w-4 h-4" />
            Imprimer / PDF
          </button>
          <button
            onClick={loadReportsData}
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

      {/* TOP 4 EXECUTIVE KPI CARDS */}
      {incomeStatement && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <span className="text-xs text-slate-500 font-semibold block mb-1">Chiffre d'Affaires</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                {formatCurrency(incomeStatement.revenue, language)}
              </span>
            </div>
            <span className="text-[11px] text-slate-400 mt-2 block font-medium">
              {incomeStatement.metrics.ordersCount} commande(s) livrée(s) / actives
            </span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <span className="text-xs text-slate-500 font-semibold block mb-1">Marge Brute Atelier</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-blue-600 font-mono tracking-tight">
                {formatCurrency(incomeStatement.grossProfit, language)}
              </span>
              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                {incomeStatement.grossMarginPercentage}%
              </span>
            </div>
            <span className="text-[11px] text-slate-400 mt-2 block font-medium">
              COGS : {formatCurrency(incomeStatement.cogs.total, language)}
            </span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <span className="text-xs text-slate-500 font-semibold block mb-1">Dépenses d'Exploitation</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-rose-600 font-mono tracking-tight">
                {formatCurrency(incomeStatement.operatingExpenses.total, language)}
              </span>
            </div>
            <span className="text-[11px] text-slate-400 mt-2 block font-medium">
              {incomeStatement.metrics.expensesCount} facture(s) opérationnelle(s)
            </span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <span className="text-xs text-slate-500 font-semibold block mb-1">Résultat Net (Bénéfice)</span>
            <div className="flex items-baseline justify-between">
              <span className={`text-2xl font-black font-mono tracking-tight ${
                incomeStatement.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}>
                {formatCurrency(incomeStatement.netProfit, language)}
              </span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                incomeStatement.netProfit >= 0
                  ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                  : 'text-rose-700 bg-rose-50 border-rose-200'
              }`}>
                {incomeStatement.netMarginPercentage}%
              </span>
            </div>
            <span className="text-[11px] text-slate-400 mt-2 block font-medium">
              Rentabilité nette de l'activité
            </span>
          </div>
        </div>
      )}

      {/* REPORT SUB-TABS */}
      <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 max-w-lg print:hidden">
        <button
          onClick={() => setActiveTab('PNL')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'PNL'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
          Compte de Résultat (P&L)
        </button>
        <button
          onClick={() => setActiveTab('BALANCE')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'BALANCE'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Wallet className="w-4 h-4 text-emerald-600" />
          Bilan Simplifié
        </button>
        <button
          onClick={() => setActiveTab('PRODUCTS')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'PRODUCTS'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers className="w-4 h-4 text-blue-600" />
          Marges par Produit
        </button>
      </div>

      {/* TAB 1: COMPTE DE RÉSULTAT (P&L) */}
      {activeTab === 'PNL' && incomeStatement && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Compte de Résultat Simplifié (P&L)</h2>
              <span className="text-xs text-slate-400 font-mono">
                Période du {formatDate(incomeStatement.period.startDate, language)} au {formatDate(incomeStatement.period.endDate, language)}
              </span>
            </div>
            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-200">
              Norme Algérienne / DZD
            </span>
          </div>

          <div className="space-y-4 text-xs">
            {/* 1. REVENUE */}
            <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/60">
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-bold text-slate-900 text-sm block">1. Chiffre d'Affaires Brut</span>
                  <span className="text-slate-500 text-[11px]">Ventes de produits personnalisés & impressions livrées</span>
                </div>
                <span className="text-base font-black font-mono text-slate-900">
                  {formatCurrency(incomeStatement.revenue, language)}
                </span>
              </div>
            </div>

            {/* 2. COGS (COST OF GOODS SOLD) */}
            <div className="p-4 rounded-xl border border-slate-200/60 space-y-2.5">
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-bold text-slate-900 text-sm block">2. Coût des Ventes & Matières (COGS)</span>
                  <span className="text-slate-500 text-[11px]">Coût d'achat des textiles vierges + consommables DTF + conditionnement</span>
                </div>
                <span className="text-base font-black font-mono text-rose-600">
                  -{formatCurrency(incomeStatement.cogs.total, language)}
                </span>
              </div>

              {/* COGS Itemization */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-[11px]">
                <div className="bg-slate-50 p-2.5 rounded-lg">
                  <span className="text-slate-500 block">Textiles & Vêtements Vierges</span>
                  <strong className="text-slate-800 font-mono text-xs block mt-0.5">
                    {formatCurrency(incomeStatement.cogs.baseGarments, language)}
                  </strong>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg">
                  <span className="text-slate-500 block">Impression DTF (Films, Encres, Poudre)</span>
                  <strong className="text-slate-800 font-mono text-xs block mt-0.5">
                    {formatCurrency(incomeStatement.cogs.printingDtf, language)}
                  </strong>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg">
                  <span className="text-slate-500 block">Packaging & Étiquetage ZR</span>
                  <strong className="text-slate-800 font-mono text-xs block mt-0.5">
                    {formatCurrency(incomeStatement.cogs.packaging, language)}
                  </strong>
                </div>
              </div>
            </div>

            {/* 3. GROSS MARGIN SUB-TOTAL */}
            <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-200/60 flex justify-between items-center">
              <div>
                <span className="font-bold text-blue-950 text-sm block">3. Marge Brute Atelier</span>
                <span className="text-blue-700 text-[11px]">Taux de marge brute : {incomeStatement.grossMarginPercentage}%</span>
              </div>
              <span className="text-lg font-black font-mono text-blue-700">
                {formatCurrency(incomeStatement.grossProfit, language)}
              </span>
            </div>

            {/* 4. OPERATING EXPENSES */}
            <div className="p-4 rounded-xl border border-slate-200/60 space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-bold text-slate-900 text-sm block">4. Charges d'Exploitation & Frais Généraux</span>
                  <span className="text-slate-500 text-[11px]">Loyer, Sonelgaz, publicité Meta, transport, fournitures</span>
                </div>
                <span className="text-base font-black font-mono text-rose-600">
                  -{formatCurrency(incomeStatement.operatingExpenses.total, language)}
                </span>
              </div>

              {/* Breakdown by category */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                {incomeStatement.operatingExpenses.byCategory.map(cat => (
                  <div key={cat.categoryId} className="flex items-center justify-between py-1 border-b border-slate-50 text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-400" />
                      <span className="text-slate-700 font-medium">{cat.categoryName}</span>
                      <span className="text-slate-400">({cat.percentage}%)</span>
                    </div>
                    <span className="font-mono font-semibold text-slate-800">
                      {formatCurrency(cat.amount, language)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 5. NET PROFIT */}
            <div className={`p-5 rounded-2xl border flex justify-between items-center ${
              incomeStatement.netProfit >= 0
                ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                : 'bg-rose-50 border-rose-200 text-rose-950'
            }`}>
              <div>
                <span className="font-black text-base block">5. Résultat Net d'Exploitation (Bénéfice)</span>
                <span className="text-xs font-semibold opacity-80">
                  Rentabilité nette finale : {incomeStatement.netMarginPercentage}% du C.A.
                </span>
              </div>
              <div className="text-right">
                <span className={`text-2xl font-black font-mono block ${
                  incomeStatement.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'
                }`}>
                  {formatCurrency(incomeStatement.netProfit, language)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BILAN SIMPLIFIÉ (ACTIF / PASSIF) */}
      {activeTab === 'BALANCE' && balanceSheet && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Bilan Patrimonial Simplifié</h2>
              <span className="text-xs text-slate-400 font-mono">
                Arrêté au {formatDate(balanceSheet.asOfDate, language)}
              </span>
            </div>
            <span className="text-xs font-mono text-slate-500 font-semibold">
              Principe d'équilibre comptable
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ACTIF (ASSETS) */}
            <div className="space-y-4">
              <div className="bg-slate-900 text-white p-3 rounded-xl flex justify-between items-center">
                <span className="font-bold text-xs uppercase tracking-wider">ACTIF (Emplois)</span>
                <span className="font-mono font-bold text-xs">{formatCurrency(balanceSheet.assets.totalAssets, language)}</span>
              </div>

              {/* Cash */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-emerald-600" />
                    <span className="font-bold text-slate-800">Trésorerie & Disponibilités</span>
                  </div>
                  <strong className="font-mono text-emerald-600">
                    {formatCurrency(balanceSheet.assets.totalCash, language)}
                  </strong>
                </div>

                <div className="space-y-1 pt-2 border-t border-slate-100 text-[11px]">
                  {balanceSheet.assets.cashAccounts.map(a => (
                    <div key={a.id} className="flex justify-between text-slate-600">
                      <span>{a.name} ({a.type})</span>
                      <span className="font-mono font-medium">{formatCurrency(a.balance, language)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stock */}
              <div className="border border-slate-200 rounded-xl p-4 flex justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-blue-600" />
                  <div>
                    <span className="font-bold text-slate-800 block">Stocks de Matières Premières</span>
                    <span className="text-[11px] text-slate-400">Films DTF, encres, poudre thermocollante, cartons</span>
                  </div>
                </div>
                <strong className="font-mono text-blue-600">
                  {formatCurrency(balanceSheet.assets.inventoryValuation, language)}
                </strong>
              </div>

              {/* Receivables */}
              <div className="border border-slate-200 rounded-xl p-4 flex justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-amber-600" />
                  <div>
                    <span className="font-bold text-slate-800 block">Créances Clients & Envois en Transit</span>
                    <span className="text-[11px] text-slate-400">Colis expédiés / livraisons en attente de règlement</span>
                  </div>
                </div>
                <strong className="font-mono text-slate-700">
                  {formatCurrency(balanceSheet.assets.customerReceivables, language)}
                </strong>
              </div>

              {/* Total Assets Summary */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex justify-between items-center font-bold text-sm">
                <span className="text-slate-900">TOTAL ACTIF NET</span>
                <span className="font-mono text-slate-900 text-base">
                  {formatCurrency(balanceSheet.assets.totalAssets, language)}
                </span>
              </div>
            </div>

            {/* PASSIF & CAPITAUX (LIABILITIES & EQUITY) */}
            <div className="space-y-4">
              <div className="bg-slate-900 text-white p-3 rounded-xl flex justify-between items-center">
                <span className="font-bold text-xs uppercase tracking-wider">PASSIF & CAPITAUX (Ressources)</span>
                <span className="font-mono font-bold text-xs">{formatCurrency(balanceSheet.liabilitiesAndEquity.totalLiabilitiesAndEquity, language)}</span>
              </div>

              {/* Partner Equity */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-indigo-600" />
                    <span className="font-bold text-slate-800">Capitaux Propres des Associés</span>
                  </div>
                  <strong className="font-mono text-indigo-600">
                    {formatCurrency(balanceSheet.liabilitiesAndEquity.totalPartnerEquity, language)}
                  </strong>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-100 text-[11px]">
                  {balanceSheet.liabilitiesAndEquity.partnerBalances.map(p => (
                    <div key={p.id} className="flex justify-between items-center text-slate-600">
                      <div>
                        <span className="font-semibold text-slate-800">{p.name}</span>
                        <span className="text-slate-400 ml-1">({p.ownershipPercentage}%)</span>
                      </div>
                      <span className="font-mono font-bold text-emerald-600">
                        {formatCurrency(p.balance, language)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Retained / Period Net Profit */}
              <div className="border border-slate-200 rounded-xl p-4 flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold text-slate-800 block">Résultat Net de la Période</span>
                  <span className="text-[11px] text-slate-400">Bénéfice net généré au cours de l'exercice</span>
                </div>
                <strong className={`font-mono ${
                  balanceSheet.liabilitiesAndEquity.currentPeriodNetProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  {formatCurrency(balanceSheet.liabilitiesAndEquity.currentPeriodNetProfit, language)}
                </strong>
              </div>

              {/* Supplier Payables */}
              <div className="border border-slate-200 rounded-xl p-4 flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold text-slate-800 block">Dettes Fournisseurs (Matières & Services)</span>
                  <span className="text-[11px] text-slate-400">Règlements comptant au comptoir (Comptabilité de caisse)</span>
                </div>
                <strong className="font-mono text-slate-500">
                  {formatCurrency(balanceSheet.liabilitiesAndEquity.supplierPayables, language)}
                </strong>
              </div>

              {/* Total Liabilities Summary */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex justify-between items-center font-bold text-sm">
                <span className="text-slate-900">TOTAL CAPITAUX PROPRES</span>
                <span className="font-mono text-slate-900 text-base">
                  {formatCurrency(balanceSheet.liabilitiesAndEquity.totalLiabilitiesAndEquity, language)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: RENTABILITÉ PAR PRODUIT POD */}
      {activeTab === 'PRODUCTS' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Rentabilité & Marges par Modèle Print-on-Demand</h3>
              <p className="text-xs text-slate-400">Ventilation du chiffre d'affaires et de la marge brute par produit personnalisé</p>
            </div>
            <span className="text-xs text-slate-400">{productMargins.length} produit(s) analysé(s)</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Article POD</th>
                  <th className="py-3 px-4">SKU</th>
                  <th className="py-3 px-4 text-center">Unités Vendues</th>
                  <th className="py-3 px-4 text-right">CA (DA)</th>
                  <th className="py-3 px-4 text-right">COGS (DA)</th>
                  <th className="py-3 px-4 text-right">Marge Brute</th>
                  <th className="py-3 px-4 text-center">Taux de Marge</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {productMargins.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      Aucune vente enregistrée sur cette période.
                    </td>
                  </tr>
                ) : (
                  productMargins.map(prod => (
                    <tr key={prod.productId} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                        {prod.productName}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-500 whitespace-nowrap">
                        {prod.sku}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-700 whitespace-nowrap">
                        {prod.unitsSold}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        {formatCurrency(prod.revenue, language)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-rose-600 whitespace-nowrap">
                        {formatCurrency(prod.cogs, language)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-blue-600 whitespace-nowrap">
                        {formatCurrency(prod.grossProfit, language)}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          {prod.marginPercentage}%
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
