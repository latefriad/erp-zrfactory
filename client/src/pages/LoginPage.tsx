import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { Printer, Lock, Mail, ShieldAlert, ArrowRight, CheckCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const { language, setLanguage } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const demoAccounts = [
    {
      role: 'ADMIN',
      name: 'Admin ZR',
      desc: 'Accès total & configuration',
      email: 'admin@zrfactory.dz',
      pass: 'admin123456',
      color: 'bg-slate-900 text-white hover:bg-slate-800',
    },
    {
      role: 'PARTNER (30%)',
      name: 'Riad',
      desc: 'Finance, commandes & solde 30%',
      email: 'riad@zrfactory.dz',
      pass: 'riad123456',
      color: 'bg-blue-600 text-white hover:bg-blue-700',
    },
    {
      role: 'PARTNER (70%)',
      name: 'Brother',
      desc: 'Finance, commandes & solde 70%',
      email: 'brother@zrfactory.dz',
      pass: 'brother123456',
      color: 'bg-indigo-600 text-white hover:bg-indigo-700',
    },
    {
      role: 'EMPLOYEE',
      name: 'Employé',
      desc: 'Commandes, produits (sans finance)',
      email: 'employee@zrfactory.dz',
      pass: 'employee123456',
      color: 'bg-amber-600 text-white hover:bg-amber-700',
    },
    {
      role: 'VIEWER',
      name: 'Lecteur',
      desc: 'Consultation seule',
      email: 'viewer@zrfactory.dz',
      pass: 'viewer123456',
      color: 'bg-emerald-600 text-white hover:bg-emerald-700',
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Échec de connexion.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = async (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
    setIsSubmitting(true);

    try {
      await login(demoEmail, demoPass);
    } catch (err: any) {
      setError(err.message || 'Échec de connexion.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Language switcher in header */}
      <div className="absolute top-6 end-6">
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as any)}
          className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none shadow-sm cursor-pointer"
        >
          <option value="fr">Français (FR)</option>
          <option value="ar">العربية (AR)</option>
          <option value="en">English (EN)</option>
        </select>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-sky-400 text-white flex items-center justify-center font-black mx-auto shadow-xl shadow-blue-500/20 mb-4">
          <Printer className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">ZR FACTORY ERP</h2>
        <p className="mt-2 text-sm text-slate-600">
          Système de Gestion Print-on-Demand & Comptabilité Associés
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl px-4">
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl border border-slate-200 sm:px-10">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-rose-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Demo Switcher */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Accès Rapide Démo (Phase 2)
              </span>
              <span className="text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-semibold border border-blue-100">
                1 Clic
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => handleQuickLogin(acc.email, acc.pass)}
                  disabled={isSubmitting}
                  className="flex flex-col text-start p-3 rounded-xl border border-slate-200 hover:border-blue-400 bg-slate-50 hover:bg-blue-50/50 transition-all group disabled:opacity-50"
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-bold text-slate-900 text-xs">{acc.name}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600 group-hover:border-blue-300">
                      {acc.role}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 truncate">{acc.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-slate-400 font-medium">Ou saisie manuelle</span>
            </div>
          </div>

          {/* Standard Login Form */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Adresse Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@zrfactory.dz"
                  className="w-full ps-9 pe-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full ps-9 pe-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Connexion Sécurisée</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-500">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>Chiffrement bcrypt & jetons JWT conformes</span>
          </div>
        </div>
      </div>
    </div>
  );
};
