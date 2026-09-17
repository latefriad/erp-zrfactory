import React, { useState, useEffect } from 'react';
import { fetchApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate } from '../lib/formatters';
import { Supplier } from '@zr-erp/shared';
import {
  Truck,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  X,
  AlertCircle,
  Building2,
  FileText,
  Boxes
} from 'lucide-react';

export const SuppliersPage: React.FC = () => {
  const { user } = useAuth();
  const { language } = useApp();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected Supplier Drawer
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier & { recentExpenses: any[] } | null>(null);

  // New Supplier Modal
  const [isNewSupplierModalOpen, setIsNewSupplierModalOpen] = useState<boolean>(false);
  const [newSupplier, setNewSupplier] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const canManage = user?.role === 'ADMIN' || user?.role === 'PARTNER' || user?.role === 'EMPLOYEE';

  const loadSuppliers = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);

      const res = await fetchApi<{ suppliers: Supplier[] }>(`/suppliers?${params.toString()}`);
      setSuppliers(res.suppliers);
    } catch (err: any) {
      console.error('Failed to load suppliers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadSuppliers();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const viewSupplierProfile = async (id: string) => {
    try {
      const res = await fetchApi<{ supplier: Supplier & { recentExpenses: any[] } }>(`/suppliers/${id}`);
      setSelectedSupplier(res.supplier);
    } catch (err: any) {
      alert(err.message || 'Impossible de charger la fiche fournisseur');
    }
  };

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!newSupplier.name.trim()) {
      setFormError('Le nom du fournisseur est obligatoire.');
      return;
    }
    if (!newSupplier.phone.trim()) {
      setFormError('Le numéro de téléphone est obligatoire.');
      return;
    }

    try {
      setIsSubmitting(true);
      await fetchApi('/suppliers', {
        method: 'POST',
        body: JSON.stringify(newSupplier),
      });

      setIsNewSupplierModalOpen(false);
      setNewSupplier({
        name: '',
        phone: '',
        email: '',
        address: '',
        notes: '',
      });
      loadSuppliers();
    } catch (err: any) {
      setFormError(err.message || 'Erreur lors de la création du fournisseur');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalPurchasesVolume = suppliers.reduce((sum, s) => sum + s.totalPurchased, 0);
  const totalOrdersCount = suppliers.reduce((sum, s) => sum + s.purchasesCount, 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center border border-cyan-100">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Fournisseurs & Approvisionnement</h1>
            <p className="text-xs text-slate-500">
              Répertoire des fournisseurs textiles, consommables DTF et packaging
            </p>
          </div>
        </div>

        {canManage && (
          <button
            onClick={() => setIsNewSupplierModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-sm font-semibold transition-all shadow-sm shadow-cyan-600/20 active:scale-[0.99]"
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau Fournisseur</span>
          </button>
        )}
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Fournisseurs</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{suppliers.length}</span>
            <span className="text-xs text-slate-400">partenaires</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Achats Cumulés</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700">{formatCurrency(totalPurchasesVolume, language)}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Factures Traitées</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{totalOrdersCount}</span>
            <span className="text-xs text-slate-400">commandes reçues</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par nom d'entreprise, téléphone, adresse..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:bg-white transition"
          />
        </div>
      </div>

      {/* Suppliers Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-xs text-slate-500">Chargement des fournisseurs...</p>
          </div>
        ) : suppliers.length === 0 ? (
          <div className="py-16 text-center">
            <Truck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800">Aucun fournisseur trouvé</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Ajoutez vos fournisseurs de textile, films et encres pour assurer le réapprovisionnement.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Fournisseur</th>
                  <th className="px-5 py-3.5">Contact</th>
                  <th className="px-5 py-3.5">Localisation</th>
                  <th className="px-5 py-3.5 text-center">Achats</th>
                  <th className="px-5 py-3.5 text-right">Volume Cumulé</th>
                  <th className="px-5 py-3.5 text-center">Détails</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {suppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-4 font-medium text-slate-900">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-cyan-100 text-cyan-700 font-bold flex items-center justify-center text-xs">
                          {s.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{s.name}</div>
                          {s.notes && (
                            <div className="text-xs text-slate-400 max-w-xs truncate">{s.notes}</div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 text-slate-700 font-mono text-xs">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{s.phone}</span>
                      </div>
                      {s.email && (
                        <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3" /> {s.email}
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1 text-xs text-slate-700">
                        <MapPin className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                        <span>{s.address || 'Algérie'}</span>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {s.purchasesCount} commande(s)
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right font-black text-slate-900 text-sm">
                      {formatCurrency(s.totalPurchased, language)}
                    </td>

                    <td className="px-5 py-4 text-center">
                      <button
                        onClick={() => viewSupplierProfile(s.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-cyan-700 bg-cyan-50 hover:bg-cyan-100 rounded-lg transition border border-cyan-200"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Fiche</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Supplier Profile Drawer */}
      {selectedSupplier && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-xs z-10">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-cyan-100 text-cyan-700 font-bold flex items-center justify-center text-sm">
                  {selectedSupplier.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{selectedSupplier.name}</h3>
                  <p className="text-xs text-slate-500">
                    Enregistré le {formatDate(selectedSupplier.createdAt, language)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSupplier(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 font-semibold block mb-1">Téléphone</span>
                  <div className="font-bold text-slate-900 font-mono flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-cyan-600" />
                    {selectedSupplier.phone}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 font-semibold block mb-1">Email</span>
                  <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-cyan-600" />
                    {selectedSupplier.email || 'Non renseigné'}
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <span className="text-slate-400 font-semibold block mb-1">Adresse & Entrepôt</span>
                  <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-cyan-600" />
                    {selectedSupplier.address || 'Non renseignée'}
                  </div>
                </div>

                {selectedSupplier.notes && (
                  <div className="sm:col-span-2 bg-cyan-50/50 p-2.5 rounded-lg border border-cyan-100 text-cyan-900">
                    <span className="font-semibold block mb-0.5">Marchandises fournies :</span>
                    {selectedSupplier.notes}
                  </div>
                )}
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
                  <span className="text-xs font-semibold text-emerald-600 uppercase block">Total Approvisionné</span>
                  <span className="text-xl font-black text-emerald-900 mt-1 block">
                    {formatCurrency(selectedSupplier.totalPurchased, language)}
                  </span>
                </div>

                <div className="p-3.5 bg-cyan-50 rounded-xl border border-cyan-100 text-center">
                  <span className="text-xs font-semibold text-cyan-600 uppercase block">Commandes Effectuées</span>
                  <span className="text-xl font-black text-cyan-900 mt-1 block">
                    {selectedSupplier.purchasesCount}
                  </span>
                </div>
              </div>

              {/* Recent Expenses / Invoices */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                  Historique des Règlements & Factures ({selectedSupplier.recentExpenses?.length || 0})
                </h4>

                {(!selectedSupplier.recentExpenses || selectedSupplier.recentExpenses.length === 0) ? (
                  <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-400">
                    Aucune facture enregistrée pour ce fournisseur.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {selectedSupplier.recentExpenses.map((exp: any) => (
                      <div
                        key={exp.id}
                        className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs hover:border-cyan-300 transition"
                      >
                        <div>
                          <span className="font-bold text-slate-900 block">{exp.description}</span>
                          <span className="text-slate-400 text-[11px] mt-0.5 inline-block">
                            {formatDate(exp.date, language)} • Catégorie : {exp.categoryName}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="font-black text-rose-700 block text-sm">
                            -{formatCurrency(exp.amount, language)}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-400">
                            {exp.paymentMethod}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedSupplier(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold transition"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Supplier Modal */}
      {isNewSupplierModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-cyan-600" />
                <h3 className="text-base font-bold text-slate-900">Ajouter un Fournisseur</h3>
              </div>
              <button
                onClick={() => setIsNewSupplierModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSupplier} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nom de l'entreprise ou contact <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newSupplier.name}
                  onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                  placeholder="Ex: Comptoir Textile Blida"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Téléphone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={newSupplier.phone}
                    onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                    placeholder="Ex: 025412233"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={newSupplier.email}
                    onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })}
                    placeholder="contact@fournisseur.dz"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Adresse ou Zone Industrielle</label>
                <input
                  type="text"
                  value={newSupplier.address}
                  onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })}
                  placeholder="Ex: Zone Industrielle Ben Boulaid, Blida"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Types de fournitures / Notes</label>
                <textarea
                  rows={2}
                  value={newSupplier.notes}
                  onChange={(e) => setNewSupplier({ ...newSupplier, notes: e.target.value })}
                  placeholder="Ex: T-shirts vierges 240g, bobines de film DTF, encre..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewSupplierModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Enregistrement...' : 'Enregistrer le Fournisseur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
