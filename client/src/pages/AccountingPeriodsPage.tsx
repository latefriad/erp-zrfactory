import React, { useState, useEffect } from 'react';
import { fetchApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate } from '../lib/formatters';
import { AccountingPeriod, ProfitDistribution, UserRole } from '@zr-erp/shared';
import {
  Calendar,
  Lock,
  Unlock,
  Coins,
  Plus,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  X,
  FileSpreadsheet,
  PieChart,
  ShieldAlert,
} from 'lucide-react';

export const AccountingPeriodsPage: React.FC = () => {
  const { user } = useAuth();
  const { language } = useApp();

  const [periods, setPeriods] = useState<AccountingPeriod[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<(AccountingPeriod & { distributions?: ProfitDistribution[] }) | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isNewPeriodModalOpen, setIsNewPeriodModalOpen] = useState<boolean>(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState<boolean>(false);
  const [isDistributeModalOpen, setIsDistributeModalOpen] = useState<boolean>(false);
  const [periodToOperate, setPeriodToOperate] = useState<AccountingPeriod | null>(null);

  // Form State
  const [newPeriodName, setNewPeriodName] = useState<string>('');
  const [newPeriodStart, setNewPeriodStart] = useState<string>('');
  const [newPeriodEnd, setNewPeriodEnd] = useState<string>('');

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const canAccessFinance = user?.role === UserRole.ADMIN || user?.role === UserRole.PARTNER;
  const isAdmin = user?.role === UserRole.ADMIN;

  const loadPeriods = async () => {
    if (!canAccessFinance) return;
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetchApi<{ periods: AccountingPeriod[] }>('/accounting-periods');
      setPeriods(res.periods || []);
      if (res.periods?.length > 0 && !selectedPeriod) {
        // Load details of the first period
        loadPeriodDetails(res.periods[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load accounting periods:', err);
      setError(err.message || 'Erreur lors du chargement des périodes comptables.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadPeriodDetails = async (id: string) => {
    try {
      const res = await fetchApi<{ period: AccountingPeriod & { distributions: ProfitDistribution[] } }>(`/accounting-periods/${id}`);
      setSelectedPeriod(res.period);
    } catch (err: any) {
      console.error('Failed to load period details:', err);
    }
  };

  useEffect(() => {
    loadPeriods();
  }, [user]);

  // Handle Create Period
  const handleCreatePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!newPeriodName.trim() || !newPeriodStart || !newPeriodEnd) {
      setFormError('Tous les champs sont obligatoires');
      return;
    }
    if (newPeriodStart > newPeriodEnd) {
      setFormError('La date de début ne peut pas être postérieure à la date de fin');
      return;
    }

    setIsSubmitting(true);
    try {
      await fetchApi('/accounting-periods', {
        method: 'POST',
        body: JSON.stringify({
          name: newPeriodName.trim(),
          startDate: newPeriodStart,
          endDate: newPeriodEnd,
        }),
      });

      setIsNewPeriodModalOpen(false);
      setNewPeriodName('');
      setNewPeriodStart('');
      setNewPeriodEnd('');
      await loadPeriods();
    } catch (err: any) {
      setFormError(err.message || 'Erreur lors de la création de la période');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Close Period
  const handleClosePeriod = async () => {
    if (!periodToOperate) return;
    setIsSubmitting(true);
    setFormError(null);

    try {
      await fetchApi(`/accounting-periods/${periodToOperate.id}/close`, {
        method: 'POST',
      });

      setIsCloseModalOpen(false);
      setPeriodToOperate(null);
      await loadPeriods();
      if (selectedPeriod?.id === periodToOperate.id) {
        await loadPeriodDetails(periodToOperate.id);
      }
    } catch (err: any) {
      setFormError(err.message || 'Erreur lors de la clôture de la période');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Reopen Period
  const handleReopenPeriod = async (p: AccountingPeriod) => {
    if (!window.confirm(`Confirmer la réouverture de la période "${p.name}" ?`)) return;

    try {
      await fetchApi(`/accounting-periods/${p.id}/reopen`, {
        method: 'POST',
      });
      await loadPeriods();
      if (selectedPeriod?.id === p.id) {
        await loadPeriodDetails(p.id);
      }
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la réouverture de la période');
    }
  };

  // Handle Distribute Profits
  const handleDistributeProfits = async () => {
    if (!periodToOperate) return;
    setIsSubmitting(true);
    setFormError(null);

    try {
      await fetchApi(`/accounting-periods/${periodToOperate.id}/distribute`, {
        method: 'POST',
      });

      setIsDistributeModalOpen(false);
      setPeriodToOperate(null);
      await loadPeriods();
      if (selectedPeriod?.id === periodToOperate.id) {
        await loadPeriodDetails(periodToOperate.id);
      }
    } catch (err: any) {
      setFormError(err.message || 'Erreur lors de la distribution des bénéfices');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!canAccessFinance) {
    return (
      <div className="bg-white rounded-2xl border border-red-200 p-12 text-center max-w-lg mx-auto my-16 shadow-sm">
        <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-100">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Accès Restreint</h2>
        <p className="text-sm text-slate-500 mb-6">
          La gestion des périodes comptables, des clôtures et de la répartition des bénéfices est réservée aux Administrateurs et Associés.
        </p>
      </div>
    );
  }

  const openPeriod = periods.find(p => !p.isClosed);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Périodes Comptables & Répartition</h1>
            <p className="text-xs text-slate-500">
              Clôtures d'exercices, calcul P&L automatique et répartition des dividendes (30% Riad / 70% Brother)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={() => {
                setFormError(null);
                setIsNewPeriodModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nouvelle Période
            </button>
          )}
          <button
            onClick={loadPeriods}
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

      {/* CURRENT OPEN PERIOD LIVE P&L BANNER */}
      {openPeriod && (
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Exercice En Cours (Ouvert)
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Du {formatDate(openPeriod.startDate, language)} au {formatDate(openPeriod.endDate, language)}
                </span>
              </div>
              <h2 className="text-2xl font-black tracking-tight mb-1">{openPeriod.name}</h2>
              <p className="text-xs text-slate-300 max-w-xl">
                Agrégation en temps réel des commandes livrées, du coût de revient (blanks + DTF + packaging) et des dépenses d'atelier.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {isAdmin && (
                <button
                  onClick={() => {
                    setPeriodToOperate(openPeriod);
                    setFormError(null);
                    setIsCloseModalOpen(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all hover:scale-[1.02]"
                >
                  <Lock className="w-4 h-4" />
                  Clôturer l'Exercice
                </button>
              )}
            </div>
          </div>

          {/* Live P&L Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-6 pt-6 border-t border-slate-700/60">
            <div className="bg-white/5 rounded-xl p-3 border border-white/10">
              <span className="text-[11px] text-slate-400 block font-medium">Chiffre d'Affaires</span>
              <span className="text-base font-bold text-white font-mono">
                {formatCurrency(openPeriod.revenue, language)}
              </span>
            </div>

            <div className="bg-white/5 rounded-xl p-3 border border-white/10">
              <span className="text-[11px] text-slate-400 block font-medium">Coût de Revient (COGS)</span>
              <span className="text-base font-bold text-amber-300 font-mono">
                -{formatCurrency(openPeriod.cogs, language)}
              </span>
            </div>

            <div className="bg-white/5 rounded-xl p-3 border border-white/10">
              <span className="text-[11px] text-slate-400 block font-medium">Marge Brute Atelier</span>
              <span className="text-base font-bold text-blue-300 font-mono">
                {formatCurrency(openPeriod.grossProfit, language)}
              </span>
            </div>

            <div className="bg-white/5 rounded-xl p-3 border border-white/10">
              <span className="text-[11px] text-slate-400 block font-medium">Dépenses Opérationnelles</span>
              <span className="text-base font-bold text-rose-300 font-mono">
                -{formatCurrency(openPeriod.operatingExpenses, language)}
              </span>
            </div>

            <div className="bg-emerald-500/10 rounded-xl p-3 border border-emerald-500/30 col-span-2 sm:col-span-1">
              <span className="text-[11px] text-emerald-300 block font-semibold">Bénéfice Net Prévisionnel</span>
              <span className="text-lg font-black text-emerald-400 font-mono">
                {formatCurrency(openPeriod.netProfit, language)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ALL PERIODS TABLE & DETAILS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Periods List */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-slate-500" />
              <h3 className="font-bold text-slate-900 text-sm">Historique des Exercices & P&L</h3>
            </div>
            <span className="text-xs text-slate-400">{periods.length} période(s)</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Période</th>
                  <th className="py-3 px-4">Statut</th>
                  <th className="py-3 px-4 text-right">CA (DA)</th>
                  <th className="py-3 px-4 text-right">Dépenses (DA)</th>
                  <th className="py-3 px-4 text-right">Bénéfice Net</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {periods.map(p => {
                  const isSelected = selectedPeriod?.id === p.id;
                  const getStatusBadge = () => {
                    if (p.isDistributed) {
                      return (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <Coins className="w-3 h-3" />
                          Distribuée
                        </span>
                      );
                    }
                    if (p.isClosed) {
                      return (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          <Lock className="w-3 h-3" />
                          Clôturée
                        </span>
                      );
                    }
                    return (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        <Unlock className="w-3 h-3" />
                        Ouverte
                      </span>
                    );
                  };

                  return (
                    <tr
                      key={p.id}
                      onClick={() => loadPeriodDetails(p.id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-indigo-50/70 font-medium' : 'hover:bg-slate-50/70'
                      }`}
                    >
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-bold text-slate-900 block">{p.name}</span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {formatDate(p.startDate, language)} - {formatDate(p.endDate, language)}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getStatusBadge()}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-800 whitespace-nowrap">
                        {formatCurrency(p.revenue, language)}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono text-rose-600 whitespace-nowrap">
                        {formatCurrency(p.operatingExpenses, language)}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold whitespace-nowrap">
                        <span className={p.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                          {formatCurrency(p.netProfit, language)}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5" onClick={e => e.stopPropagation()}>
                          {!p.isClosed && isAdmin && (
                            <button
                              onClick={() => {
                                setPeriodToOperate(p);
                                setFormError(null);
                                setIsCloseModalOpen(true);
                              }}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-semibold transition-colors"
                            >
                              Clôturer
                            </button>
                          )}

                          {p.isClosed && !p.isDistributed && isAdmin && (
                            <>
                              <button
                                onClick={() => {
                                  setPeriodToOperate(p);
                                  setFormError(null);
                                  setIsDistributeModalOpen(true);
                                }}
                                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1"
                              >
                                <Coins className="w-3 h-3" />
                                Distribuer
                              </button>
                              <button
                                onClick={() => handleReopenPeriod(p)}
                                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                                title="Rouvrir la période"
                              >
                                <Unlock className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          {p.isDistributed && (
                            <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                              <CheckCircle className="w-3.5 h-3.5" />
                              Partagée
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Selected Period Details Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between">
          {selectedPeriod ? (
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{selectedPeriod.name}</h3>
                  <span className="text-xs text-slate-400 font-mono">
                    Du {formatDate(selectedPeriod.startDate, language)} au {formatDate(selectedPeriod.endDate, language)}
                  </span>
                </div>
                {selectedPeriod.isClosed ? (
                  <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-full text-[10px] font-bold">
                    Clôturée
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-[10px] font-bold">
                    Ouverte
                  </span>
                )}
              </div>

              {/* P&L Statement */}
              <div className="space-y-2.5 mb-6 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Chiffre d'Affaires (Ventes)</span>
                  <span className="font-bold font-mono text-slate-900">
                    {formatCurrency(selectedPeriod.revenue, language)}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Coût d'Achat & Production (COGS)</span>
                  <span className="font-bold font-mono text-rose-600">
                    -{formatCurrency(selectedPeriod.cogs, language)}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100 bg-slate-50 px-2 rounded-lg font-semibold">
                  <span className="text-slate-800">Marge Brute</span>
                  <span className="font-mono text-blue-700">
                    {formatCurrency(selectedPeriod.grossProfit, language)}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Dépenses Opérationnelles (Charges)</span>
                  <span className="font-bold font-mono text-rose-600">
                    -{formatCurrency(selectedPeriod.operatingExpenses, language)}
                  </span>
                </div>
                <div className="flex justify-between py-2 bg-emerald-50 px-2 rounded-lg border border-emerald-100 font-bold">
                  <span className="text-emerald-900">Résultat Net (Bénéfice)</span>
                  <span className="font-mono text-emerald-700 text-sm">
                    {formatCurrency(selectedPeriod.netProfit, language)}
                  </span>
                </div>
              </div>

              {/* Profit Distribution Breakdown */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                  <PieChart className="w-3.5 h-3.5 text-indigo-500" />
                  Répartition Statutaire (30% / 70%)
                </h4>

                {selectedPeriod.distributions && selectedPeriod.distributions.length > 0 ? (
                  <div className="space-y-2">
                    {selectedPeriod.distributions.map(dist => (
                      <div
                        key={dist.id}
                        className="bg-slate-50 rounded-xl p-3 border border-slate-200/60 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-slate-900 block">{dist.partnerName || dist.partnerId}</span>
                          <span className="text-[11px] text-slate-500">Quote-part : {dist.ownershipPercentage}%</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold font-mono text-emerald-600 text-sm block">
                            +{formatCurrency(dist.profitShare, language)}
                          </span>
                          <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-100 px-1.5 py-0.2 rounded">
                            Crédité au capital
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 text-center text-xs text-slate-400">
                    {selectedPeriod.isClosed ? (
                      <div>
                        <p className="mb-2">Les bénéfices n'ont pas encore été distribués aux associés.</p>
                        {isAdmin && selectedPeriod.netProfit > 0 && (
                          <button
                            onClick={() => {
                              setPeriodToOperate(selectedPeriod);
                              setFormError(null);
                              setIsDistributeModalOpen(true);
                            }}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-xs transition-colors"
                          >
                            Distribuer Maintenant
                          </button>
                        )}
                      </div>
                    ) : (
                      'La période doit être clôturée avant de distribuer les bénéfices.'
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-slate-400 text-xs">
              Sélectionnez une période pour afficher le détail P&L.
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: CRÉER UNE NOUVELLE PÉRIODE */}
      {isNewPeriodModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-900 text-base">Nouvelle Période Comptable</h3>
              <button onClick={() => setIsNewPeriodModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 bg-rose-50 border border-rose-200 p-3 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreatePeriod} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nom de la Période *</label>
                <input
                  type="text"
                  placeholder="ex: Octobre 2026 ou T4 2026"
                  value={newPeriodName}
                  onChange={e => setNewPeriodName(e.target.value)}
                  required
                  className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date Début *</label>
                  <input
                    type="date"
                    value={newPeriodStart}
                    onChange={e => setNewPeriodStart(e.target.value)}
                    required
                    className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date Fin *</label>
                  <input
                    type="date"
                    value={newPeriodEnd}
                    onChange={e => setNewPeriodEnd(e.target.value)}
                    required
                    className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewPeriodModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm disabled:opacity-50"
                >
                  Créer la Période
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CLÔTURER LA PÉRIODE */}
      {isCloseModalOpen && periodToOperate && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2 text-emerald-600">
                <Lock className="w-5 h-5" />
                <h3 className="font-bold text-slate-900 text-base">Clôturer {periodToOperate.name}</h3>
              </div>
              <button onClick={() => setIsCloseModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 bg-rose-50 border border-rose-200 p-3 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              La clôture de l'exercice fige définitivement les chiffres du compte de résultat (Chiffre d'affaires, COGS, Charges) pour cette période.
            </p>

            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/60 mb-5 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Chiffre d'Affaires :</span>
                <strong className="text-slate-900 font-mono">{formatCurrency(periodToOperate.revenue, language)}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Coût de Revient (COGS) :</span>
                <strong className="text-rose-600 font-mono">-{formatCurrency(periodToOperate.cogs, language)}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Dépenses Opérationnelles :</span>
                <strong className="text-rose-600 font-mono">-{formatCurrency(periodToOperate.operatingExpenses, language)}</strong>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-sm">
                <span className="text-emerald-900">Bénéfice Net Définitif :</span>
                <strong className="text-emerald-600 font-mono">{formatCurrency(periodToOperate.netProfit, language)}</strong>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCloseModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleClosePeriod}
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm disabled:opacity-50"
              >
                {isSubmitting ? 'Clôture en cours...' : 'Confirmer la Clôture'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: DISTRIBUER LES BÉNÉFICES (30% RIAD / 70% BROTHER) */}
      {isDistributeModalOpen && periodToOperate && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2 text-indigo-600">
                <Coins className="w-5 h-5" />
                <h3 className="font-bold text-slate-900 text-base">Distribution des Bénéfices - {periodToOperate.name}</h3>
              </div>
              <button onClick={() => setIsDistributeModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 bg-rose-50 border border-rose-200 p-3 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-4 text-xs">
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-indigo-950 font-semibold">Bénéfice Net à Répartir :</span>
                <span className="text-lg font-black text-indigo-700 font-mono">
                  {formatCurrency(periodToOperate.netProfit, language)}
                </span>
              </div>
              <p className="text-[11px] text-indigo-800">
                La répartition est effectuée selon les quotes-parts statutaires inscrites dans les statuts de la société :
              </p>
            </div>

            {/* Split Preview */}
            <div className="space-y-3 mb-6">
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 text-sm block">Riad</span>
                  <span className="text-xs text-slate-500 font-medium">Quote-part statutaire : 30.0%</span>
                </div>
                <div className="text-right">
                  <span className="text-base font-black text-emerald-600 font-mono block">
                    +{formatCurrency(Math.round(periodToOperate.netProfit * 0.3), language)}
                  </span>
                  <span className="text-[10px] text-slate-400">Crédité au capital associé</span>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 text-sm block">Brother</span>
                  <span className="text-xs text-slate-500 font-medium">Quote-part statutaire : 70.0%</span>
                </div>
                <div className="text-right">
                  <span className="text-base font-black text-emerald-600 font-mono block">
                    +{formatCurrency(Math.round(periodToOperate.netProfit * 0.7), language)}
                  </span>
                  <span className="text-[10px] text-slate-400">Crédité au capital associé</span>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-800 flex gap-2 items-start mb-6">
              <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <span>
                Cette opération est irréversible. Les montants ci-dessus seront ajoutés au solde de capital disponible de chaque associé dans le grand livre.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsDistributeModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDistributeProfits}
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm disabled:opacity-50 flex items-center gap-1.5"
              >
                <Coins className="w-3.5 h-3.5" />
                {isSubmitting ? 'Distribution en cours...' : 'Exécuter la Distribution'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountingPeriodsPage;
