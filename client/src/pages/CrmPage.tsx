import React, { useState, useEffect } from 'react';
import { fetchApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate } from '../lib/formatters';
import { ALGERIA_WILAYAS, Customer, CustomerProfile } from '@zr-erp/shared';
import {
  Users,
  UserPlus,
  Search,
  Phone,
  Mail,
  MapPin,
  ShoppingBag,
  TrendingUp,
  X,
  AlertCircle,
  FileText
} from 'lucide-react';

interface CustomerListItem extends Customer {
  totalOrders: number;
  deliveredOrders: number;
  totalSpent: number;
  lastOrderDate?: string | null;
}

export const CrmPage: React.FC = () => {
  const { user } = useAuth();
  const { language } = useApp();
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedWilaya, setSelectedWilaya] = useState<string>('');
  
  // Profile Drawer State
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerProfile & { recentOrders: any[] } | null>(null);

  // New Customer Modal State
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState<boolean>(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    email: '',
    wilaya: 'Alger',
    commune: '',
    address: '',
    notes: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const canManage = user?.role === 'ADMIN' || user?.role === 'PARTNER' || user?.role === 'EMPLOYEE';

  const loadCustomers = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (selectedWilaya) params.append('wilaya', selectedWilaya);

      const res = await fetchApi<{ customers: CustomerListItem[] }>(`/customers?${params.toString()}`);
      setCustomers(res.customers);
    } catch (err: any) {
      console.error('Failed to load customers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadCustomers();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedWilaya]);

  const viewCustomerProfile = async (id: string) => {
    try {
      const res = await fetchApi<{ customer: CustomerProfile & { recentOrders: any[] } }>(`/customers/${id}`);
      setSelectedCustomer(res.customer);
    } catch (err: any) {
      alert(err.message || 'Impossible de charger la fiche client');
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!newCustomer.name.trim()) {
      setFormError('Le nom du client est obligatoire.');
      return;
    }
    if (!newCustomer.phone.trim()) {
      setFormError('Le numéro de téléphone est obligatoire.');
      return;
    }

    try {
      setIsSubmitting(true);
      await fetchApi('/customers', {
        method: 'POST',
        body: JSON.stringify(newCustomer),
      });

      setIsNewCustomerModalOpen(false);
      setNewCustomer({
        name: '',
        phone: '',
        email: '',
        wilaya: 'Alger',
        commune: '',
        address: '',
        notes: '',
      });
      loadCustomers();
    } catch (err: any) {
      setFormError(err.message || 'Erreur lors de l\'enregistrement du client');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Aggregated KPIs
  const totalCustomersCount = customers.length;
  const totalDeliveredRevenue = customers.reduce((sum, c) => sum + c.totalSpent, 0);
  const totalOrdersCount = customers.reduce((sum, c) => sum + c.totalOrders, 0);
  const averageClv = totalCustomersCount > 0 ? Math.round(totalDeliveredRevenue / totalCustomersCount) : 0;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Clients & CRM</h1>
              <p className="text-xs text-slate-500">
                Gestion du répertoire client, fidélité et valeur vie client (CLV)
              </p>
            </div>
          </div>
        </div>

        {canManage && (
          <button
            onClick={() => setIsNewCustomerModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-semibold transition-all shadow-sm shadow-purple-600/20 active:scale-[0.99]"
          >
            <UserPlus className="w-4 h-4" />
            <span>Nouveau Client</span>
          </button>
        )}
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Clients</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{totalCustomersCount}</span>
            <span className="text-xs text-slate-400">enregistrés</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Commandes Passées</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{totalOrdersCount}</span>
            <span className="text-xs text-emerald-600 font-medium">dans le CRM</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Chiffre Réalisé (Livrées)</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-purple-700">{formatCurrency(totalDeliveredRevenue, language)}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">CLV Moyenne / Client</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{formatCurrency(averageClv, language)}</span>
            <span className="text-xs text-slate-400">panier vie</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par nom, téléphone, commune..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition"
          />
        </div>

        <div className="w-full md:w-64">
          <select
            value={selectedWilaya}
            onChange={(e) => setSelectedWilaya(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
          >
            <option value="">Toutes les Wilayas (1-58)</option>
            {ALGERIA_WILAYAS.map((w) => (
              <option key={w.code} value={w.name}>
                {w.code} - {w.name} ({w.arName})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Customer Directory Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-xs text-slate-500">Chargement des clients...</p>
          </div>
        ) : customers.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800">Aucun client trouvé</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {searchQuery || selectedWilaya
                ? 'Essayez de modifier vos critères de recherche.'
                : 'Commencez par ajouter votre premier client pour alimenter le CRM.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Client</th>
                  <th className="px-5 py-3.5">Contact</th>
                  <th className="px-5 py-3.5">Localisation</th>
                  <th className="px-5 py-3.5 text-center">Commandes</th>
                  <th className="px-5 py-3.5 text-right">Valeur Vie (CLV)</th>
                  <th className="px-5 py-3.5 text-right">Dernière Cde</th>
                  <th className="px-5 py-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-4 font-medium text-slate-900">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-xs">
                          {c.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{c.name}</div>
                          {c.email && (
                            <div className="text-xs text-slate-400 flex items-center gap-1">
                              <Mail className="w-3 h-3" /> {c.email}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 text-slate-700 font-mono text-xs">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{c.phone}</span>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1 text-xs text-slate-700">
                        <MapPin className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                        <span className="font-medium text-slate-900">{c.wilaya}</span>
                        {c.commune && <span className="text-slate-400">({c.commune})</span>}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-center">
                      <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                        <span>{c.totalOrders}</span>
                        <span className="text-slate-400 text-[10px]">({c.deliveredOrders} livrées)</span>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="font-bold text-slate-900">
                        {formatCurrency(c.totalSpent, language)}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-right text-xs text-slate-500">
                      {formatDate(c.lastOrderDate || '', language)}
                    </td>

                    <td className="px-5 py-4 text-center">
                      <button
                        onClick={() => viewCustomerProfile(c.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition border border-purple-200"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Fiche Client</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Customer Profile Drawer / Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-xs z-10">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-sm">
                  {selectedCustomer.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{selectedCustomer.name}</h3>
                  <p className="text-xs text-slate-500 flex items-center gap-2">
                    <span>Inscrit le {formatDate(selectedCustomer.createdAt, language)}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Content */}
            <div className="p-6 space-y-6">
              {/* Contact & Location Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="space-y-1 text-xs">
                  <span className="text-slate-400 font-medium">Téléphone</span>
                  <div className="font-semibold text-slate-800 flex items-center gap-1.5 font-mono">
                    <Phone className="w-3.5 h-3.5 text-purple-600" />
                    {selectedCustomer.phone}
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  <span className="text-slate-400 font-medium">Adresse Email</span>
                  <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-purple-600" />
                    {selectedCustomer.email || 'Non renseigné'}
                  </div>
                </div>

                <div className="space-y-1 text-xs sm:col-span-2">
                  <span className="text-slate-400 font-medium">Localisation & Livraison</span>
                  <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-purple-600" />
                    {selectedCustomer.wilaya} {selectedCustomer.commune ? `- ${selectedCustomer.commune}` : ''}
                    {selectedCustomer.address ? ` (${selectedCustomer.address})` : ''}
                  </div>
                </div>

                {selectedCustomer.notes && (
                  <div className="space-y-1 text-xs sm:col-span-2 bg-amber-50 p-2.5 rounded-lg border border-amber-200 text-amber-800">
                    <span className="font-semibold block">Notes sur le client :</span>
                    {selectedCustomer.notes}
                  </div>
                )}
              </div>

              {/* CRM Key Metrics Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 text-center">
                  <span className="text-[11px] font-semibold text-purple-600 uppercase block">Valeur Vie (CLV)</span>
                  <span className="text-lg font-black text-purple-900 mt-1 block">
                    {formatCurrency(selectedCustomer.customerLifetimeValue, language)}
                  </span>
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
                  <span className="text-[11px] font-semibold text-emerald-600 uppercase block">Livrées</span>
                  <span className="text-lg font-black text-emerald-900 mt-1 block">
                    {selectedCustomer.deliveredOrders} / {selectedCustomer.totalOrders}
                  </span>
                </div>

                <div className="p-3 bg-red-50 rounded-xl border border-red-100 text-center">
                  <span className="text-[11px] font-semibold text-red-600 uppercase block">Annulées / Retours</span>
                  <span className="text-lg font-black text-red-900 mt-1 block">
                    {selectedCustomer.cancelledOrders + selectedCustomer.returnedOrders}
                  </span>
                </div>
              </div>

              {/* Order History Timeline */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                  Historique des Commandes ({selectedCustomer.recentOrders.length})
                </h4>

                {selectedCustomer.recentOrders.length === 0 ? (
                  <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-400">
                    Aucune commande enregistrée pour ce client.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {selectedCustomer.recentOrders.map((ord: any) => (
                      <div
                        key={ord.id}
                        className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs hover:border-purple-300 transition"
                      >
                        <div>
                          <span className="font-bold text-slate-900 font-mono">{ord.orderNumber}</span>
                          <span className="text-slate-400 ml-2">{formatDate(ord.createdAt, language)}</span>
                        </div>

                        <div className="flex items-center gap-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              ord.status === 'DELIVERED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : ord.status === 'CANCELLED'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {ord.status}
                          </span>
                          <span className="font-black text-slate-900">{formatCurrency(ord.total, language)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedCustomer(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold transition"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Customer Modal */}
      {isNewCustomerModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-purple-600" />
                <h3 className="text-base font-bold text-slate-900">Ajouter un Nouveau Client</h3>
              </div>
              <button
                onClick={() => setIsNewCustomerModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nom complet du client <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  placeholder="Ex: Omar Belkacemi"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Téléphone (Algérie) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                    placeholder="Ex: 0550123456"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email (optionnel)</label>
                  <input
                    type="email"
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                    placeholder="client@gmail.com"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Wilaya (1-58) <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newCustomer.wilaya}
                    onChange={(e) => setNewCustomer({ ...newCustomer, wilaya: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {ALGERIA_WILAYAS.map((w) => (
                      <option key={w.code} value={w.name}>
                        {w.code} - {w.name} ({w.arName})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Commune</label>
                  <input
                    type="text"
                    value={newCustomer.commune}
                    onChange={(e) => setNewCustomer({ ...newCustomer, commune: e.target.value })}
                    placeholder="Ex: Bab El Oued"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Adresse complète</label>
                <input
                  type="text"
                  value={newCustomer.address}
                  onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                  placeholder="Rue, numéro, quartier..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Remarques & Notes</label>
                <textarea
                  rows={2}
                  value={newCustomer.notes}
                  onChange={(e) => setNewCustomer({ ...newCustomer, notes: e.target.value })}
                  placeholder="Préférences de livraison, consignes spécifiques..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewCustomerModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Enregistrement...' : 'Enregistrer le Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
