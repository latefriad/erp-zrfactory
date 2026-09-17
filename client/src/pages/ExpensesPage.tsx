import React, { useState, useEffect } from 'react';
import { fetchApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate } from '../lib/formatters';
import { Expense, PaymentMethod, Supplier } from '@zr-erp/shared';
import {
  Receipt,
  Plus,
  Search,
  Trash2,
  X,
  AlertCircle,
  TrendingDown,
  Building2,
  Lock,
  Wallet
} from 'lucide-react';

interface ExpenseCategory {
  id: string;
  name: string;
  description: string | null;
}

interface ExpenseCategoryBreakdown {
  id: string;
  name: string;
  description: string | null;
  count: number;
  totalAmount: number;
  percentage: number;
}

interface ExpenseStats {
  totalAmount: number;
  totalCount: number;
  categories: ExpenseCategoryBreakdown[];
  byPaymentMethod: Record<string, number>;
}

export const ExpensesPage: React.FC = () => {
  const { user } = useAuth();
  const { language } = useApp();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [stats, setStats] = useState<ExpenseStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // New Expense Modal State
  const [isNewExpenseModalOpen, setIsNewExpenseModalOpen] = useState<boolean>(false);
  const [newExpense, setNewExpense] = useState({
    categoryId: '',
    supplierId: '',
    amount: '',
    paymentMethod: PaymentMethod.CASH,
    date: new Date().toISOString().split('T')[0],
    description: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const canAccessFinance = user?.role === 'ADMIN' || user?.role === 'PARTNER';

  const loadExpensesData = async () => {
    if (!canAccessFinance) return;

    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (selectedCategory !== 'ALL') params.append('categoryId', selectedCategory);
      if (selectedPaymentMethod !== 'ALL') params.append('paymentMethod', selectedPaymentMethod);
      if (searchQuery) params.append('search', searchQuery);

      const [expensesRes, statsRes, catsRes, suppsRes] = await Promise.all([
        fetchApi<{ expenses: Expense[] }>(`/expenses?${params.toString()}`),
        fetchApi<{ stats: ExpenseStats }>('/expenses/stats'),
        fetchApi<{ categories: ExpenseCategory[] }>('/expenses/categories'),
        fetchApi<{ suppliers: Supplier[] }>('/suppliers'),
      ]);

      setExpenses(expensesRes.expenses);
      setStats(statsRes.stats);
      setCategories(catsRes.categories);
      setSuppliers(suppsRes.suppliers);

      if (catsRes.categories.length > 0 && !newExpense.categoryId) {
        setNewExpense((prev) => ({ ...prev, categoryId: catsRes.categories[0].id }));
      }
    } catch (err: any) {
      console.error('Failed to load expenses:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadExpensesData();
  }, [selectedCategory, selectedPaymentMethod, searchQuery, canAccessFinance]);

  // Handle access restriction for employee/viewer
  if (!canAccessFinance) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-xl mx-auto my-12 shadow-sm">
        <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-100">
          <Lock className="w-8 h-8" />
        </div>
        <span className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
          Accès Financier Restreint
        </span>
        <h2 className="text-2xl font-bold text-slate-900 mt-4 mb-2">Gestion des Dépenses</h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto mb-4">
          Conformément aux règles de gouvernance du ZR Factory ERP, les données financières et les dépenses sont réservées aux Administrateurs et aux Associés.
        </p>
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-slate-600 font-mono">
          Votre profil actuel : <span className="font-bold text-slate-900">{user?.role}</span>
        </div>
      </div>
    );
  }

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const amountNum = parseFloat(newExpense.amount);
    if (!amountNum || amountNum <= 0) {
      setFormError('Le montant doit être supérieur à 0.');
      return;
    }
    if (!newExpense.description.trim()) {
      setFormError('La description est requise.');
      return;
    }

    try {
      setIsSubmitting(true);
      await fetchApi('/expenses', {
        method: 'POST',
        body: JSON.stringify({
          categoryId: newExpense.categoryId,
          supplierId: newExpense.supplierId || null,
          amount: amountNum,
          paymentMethod: newExpense.paymentMethod,
          date: newExpense.date,
          description: newExpense.description.trim(),
        }),
      });

      setIsNewExpenseModalOpen(false);
      setNewExpense({
        categoryId: categories[0]?.id || '',
        supplierId: '',
        amount: '',
        paymentMethod: PaymentMethod.CASH,
        date: new Date().toISOString().split('T')[0],
        description: '',
      });
      loadExpensesData();
    } catch (err: any) {
      setFormError(err.message || 'Erreur lors de la création de la dépense');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette dépense ? Le solde de la trésorerie sera automatiquement recrédité.')) {
      return;
    }

    try {
      await fetchApi(`/expenses/${id}`, { method: 'DELETE' });
      loadExpensesData();
    } catch (err: any) {
      alert(err.message || 'Impossible de supprimer la dépense');
    }
  };

  const getPaymentMethodBadge = (method: PaymentMethod) => {
    switch (method) {
      case PaymentMethod.CASH:
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800">Espèces (Cash)</span>;
      case PaymentMethod.BARIDIMOB:
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800">BaridiMob</span>;
      case PaymentMethod.CCP:
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-100 text-blue-800">CCP Poste</span>;
      case PaymentMethod.BANK_TRANSFER:
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-100 text-purple-800">Virement Bancaire</span>;
      case PaymentMethod.CHEQUE:
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-200 text-slate-800">Chèque</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700">{method}</span>;
    }
  };

  const topCategory = stats?.categories?.[0];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Gestion des Dépenses</h1>
            <p className="text-xs text-slate-500">
              Imputation des coûts d'exploitation, matières premières et sorties de trésorerie
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsNewExpenseModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold transition-all shadow-sm shadow-rose-600/20 active:scale-[0.99]"
        >
          <Plus className="w-4 h-4" />
          <span>Nouvelle Dépense</span>
        </button>
      </div>

      {/* KPI Cards Row */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total des Dépenses</span>
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-rose-700">{formatCurrency(stats.totalAmount, language)}</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Factures Saisies</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">{stats.totalCount}</span>
              <span className="text-xs text-slate-400">transactions</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Poste Principal</span>
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-base font-bold text-slate-900 block truncate">
                {topCategory ? topCategory.name.replace(/_/g, ' ') : 'Aucun'}
              </span>
              <span className="text-xs text-purple-700 font-semibold">
                {topCategory ? `${formatCurrency(topCategory.totalAmount, language)} (${topCategory.percentage}%)` : '-'}
              </span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Caisse Principale</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-xs text-slate-400 block">Mode double-entrée</span>
              <span className="text-sm font-bold text-emerald-700">Débit immédiat</span>
            </div>
          </div>
        </div>
      )}

      {/* Visual Category Distribution Bar */}
      {stats && stats.categories.length > 0 && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Répartition par Catégorie de Coûts
            </span>
            <span className="text-xs text-slate-400">
              Total imputé : {formatCurrency(stats.totalAmount, language)}
            </span>
          </div>

          <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
            {stats.categories.slice(0, 6).map((cat, idx) => {
              const colors = [
                'bg-rose-500',
                'bg-blue-500',
                'bg-indigo-500',
                'bg-purple-500',
                'bg-amber-500',
                'bg-emerald-500',
              ];
              const color = colors[idx % colors.length];
              return (
                <div
                  key={cat.id}
                  style={{ width: `${cat.percentage}%` }}
                  className={`${color} transition-all`}
                  title={`${cat.name}: ${cat.percentage}% (${formatCurrency(cat.totalAmount, language)})`}
                />
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs pt-1">
            {stats.categories.slice(0, 6).map((cat, idx) => {
              const dots = [
                'bg-rose-500',
                'bg-blue-500',
                'bg-indigo-500',
                'bg-purple-500',
                'bg-amber-500',
                'bg-emerald-500',
              ];
              return (
                <div key={cat.id} className="flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${dots[idx % dots.length]}`} />
                  <span className="text-slate-600 font-medium">{cat.name.replace(/_/g, ' ')} :</span>
                  <span className="font-bold text-slate-900">{cat.percentage}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par description, fournisseur, catégorie..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white transition"
          />
        </div>

        <div className="w-full md:w-56">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 transition"
          >
            <option value="ALL">Toutes les catégories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>

        <div className="w-full md:w-48">
          <select
            value={selectedPaymentMethod}
            onChange={(e) => setSelectedPaymentMethod(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 transition"
          >
            <option value="ALL">Tous les paiements</option>
            <option value={PaymentMethod.CASH}>Espèces (Cash)</option>
            <option value={PaymentMethod.BARIDIMOB}>BaridiMob</option>
            <option value={PaymentMethod.CCP}>CCP Poste</option>
            <option value={PaymentMethod.BANK_TRANSFER}>Virement Bancaire</option>
          </select>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-xs text-slate-500">Chargement des dépenses...</p>
          </div>
        ) : expenses.length === 0 ? (
          <div className="py-16 text-center">
            <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800">Aucune dépense trouvée</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {searchQuery || selectedCategory !== 'ALL'
                ? 'Aucune dépense ne correspond à vos filtres.'
                : 'Enregistrez votre première dépense pour suivre vos sorties de trésorerie.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5">Catégorie</th>
                  <th className="px-5 py-3.5">Description</th>
                  <th className="px-5 py-3.5">Fournisseur</th>
                  <th className="px-5 py-3.5">Paiement</th>
                  <th className="px-5 py-3.5 text-right">Montant</th>
                  <th className="px-5 py-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-4 text-xs font-mono text-slate-500 whitespace-nowrap">
                      {formatDate(exp.date, language)}
                    </td>

                    <td className="px-5 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                        {exp.categoryName ? exp.categoryName.replace(/_/g, ' ') : 'Autre'}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900">{exp.description}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <span>Compte : {exp.cashAccountName || 'Caisse'}</span>
                        {exp.createdByName && <span>• Saisi par {exp.createdByName}</span>}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      {exp.supplierName ? (
                        <div className="text-xs font-medium text-slate-800 flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          <span>{exp.supplierName}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Frais généraux</span>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      {getPaymentMethodBadge(exp.paymentMethod)}
                    </td>

                    <td className="px-5 py-4 text-right font-black text-rose-700 text-sm whitespace-nowrap">
                      -{formatCurrency(exp.amount, language)}
                    </td>

                    <td className="px-5 py-4 text-center">
                      <button
                        onClick={() => handleDeleteExpense(exp.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition hover:bg-rose-50"
                        title="Supprimer la dépense et recréditer la caisse"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Expense Modal */}
      {isNewExpenseModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-rose-600" />
                <h3 className="text-base font-bold text-slate-900">Enregistrer une Nouvelle Dépense</h3>
              </div>
              <button
                onClick={() => setIsNewExpenseModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Catégorie de Dépense <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newExpense.categoryId}
                    onChange={(e) => setNewExpense({ ...newExpense, categoryId: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Fournisseur (optionnel)
                  </label>
                  <select
                    value={newExpense.supplierId}
                    onChange={(e) => setNewExpense({ ...newExpense, supplierId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="">Aucun (Frais général)</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Montant (DA) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                    placeholder="Ex: 15000"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold font-mono focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mode de Paiement <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newExpense.paymentMethod}
                    onChange={(e) => setNewExpense({ ...newExpense, paymentMethod: e.target.value as PaymentMethod })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    <option value={PaymentMethod.CASH}>Espèces (Caisse Principale)</option>
                    <option value={PaymentMethod.BARIDIMOB}>BaridiMob</option>
                    <option value={PaymentMethod.CCP}>CCP (Algérie Poste)</option>
                    <option value={PaymentMethod.BANK_TRANSFER}>Virement Bancaire</option>
                    <option value={PaymentMethod.CHEQUE}>Chèque</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Date de la dépense <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={newExpense.date}
                  onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description / Libellé <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newExpense.description}
                  onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                  placeholder="Ex: Achat rouleaux film DTF 60cm"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-xs">
                <span className="font-semibold block mb-0.5">Règle Comptable :</span>
                Le montant sera immédiatement déduit du compte de trésorerie associé et apparaîtra dans le journal d'audit.
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewExpenseModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Enregistrement...' : 'Valider la Dépense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
