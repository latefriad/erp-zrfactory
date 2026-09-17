import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fetchApi } from '../../lib/api';
import { UserRole } from '@zr-erp/shared';
import { Users, UserPlus, Shield, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  partnerId?: string | null;
  partnerName?: string | null;
  isActive: boolean;
  createdAt: string;
}

export const UserManager: React.FC = () => {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // New user form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: UserRole.EMPLOYEE,
    partnerId: '',
  });

  const loadUsers = async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const res = await fetchApi<{ users: UserItem[] }>('/users');
      setUsers(res.users);
    } catch (err: any) {
      setNotice(`Erreur: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [isAdmin]);

  const handleToggleStatus = async (user: UserItem) => {
    try {
      await fetchApi(`/users/${user.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      setNotice(`Statut de ${user.name} modifié.`);
      loadUsers();
    } catch (err: any) {
      setNotice(`Erreur: ${err.message}`);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchApi('/users', {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          partnerId: formData.role === UserRole.PARTNER ? formData.partnerId : null,
        }),
      });
      setNotice(`Utilisateur ${formData.name} créé avec succès.`);
      setShowCreateModal(false);
      setFormData({
        name: '',
        email: '',
        password: '',
        role: UserRole.EMPLOYEE,
        partnerId: '',
      });
      loadUsers();
    } catch (err: any) {
      setNotice(`Erreur: ${err.message}`);
    }
  };

  if (!isAdmin) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
        Seul un compte administrateur peut gérer les utilisateurs et les autorisations.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Gestion des Utilisateurs & Rôles (Phase 2)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Gérez les accès, rôles et restrictions des employés et associés.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadUsers}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
            title="Actualiser"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span>Nouvel Utilisateur</span>
          </button>
        </div>
      </div>

      {notice && (
        <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg text-xs flex justify-between items-center">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="font-bold">✕</button>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-4 py-3 text-start">Utilisateur</th>
                <th className="px-4 py-3 text-start">Rôle</th>
                <th className="px-4 py-3 text-start">Associé Lié</th>
                <th className="px-4 py-3 text-center">Statut</th>
                <th className="px-4 py-3 text-end">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-[10px]">
                        {u.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 block">{u.name}</span>
                        <span className="text-[11px] text-slate-400 font-mono">{u.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 font-mono font-bold px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-800 border border-slate-200">
                      <Shield className="w-3 h-3 text-blue-600" />
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {u.partnerName ? (
                      <span className="text-blue-700 font-semibold">{u.partnerName}</span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {u.isActive ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-semibold border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" /> Actif
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full font-semibold border border-rose-200">
                        <XCircle className="w-3 h-3" /> Désactivé
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-end">
                    <button
                      onClick={() => handleToggleStatus(u)}
                      className={`text-xs font-semibold px-2.5 py-1 rounded transition-colors ${
                        u.isActive
                          ? 'text-rose-600 hover:bg-rose-50'
                          : 'text-emerald-600 hover:bg-emerald-50'
                      }`}
                    >
                      {u.isActive ? 'Désactiver' : 'Activer'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Créer un Nouvel Utilisateur</h3>
            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nom Complet</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mot de Passe</label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Rôle</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                >
                  <option value={UserRole.EMPLOYEE}>EMPLOYEE (Commandes/Produits/CRM)</option>
                  <option value={UserRole.PARTNER}>PARTNER (Associé)</option>
                  <option value={UserRole.ADMIN}>ADMIN (Accès Total)</option>
                  <option value={UserRole.VIEWER}>VIEWER (Lecture Seule)</option>
                </select>
              </div>
              {formData.role === UserRole.PARTNER && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Compte Associé Lié</label>
                  <select
                    required
                    value={formData.partnerId}
                    onChange={(e) => setFormData({ ...formData, partnerId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="">Sélectionner un associé...</option>
                    <option value="partner-riad">Riad (30%)</option>
                    <option value="partner-brother">Brother (70%)</option>
                  </select>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
