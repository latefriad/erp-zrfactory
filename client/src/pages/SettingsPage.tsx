import React, { useState, useEffect } from 'react';
import { fetchApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { UserManager } from '../components/users/UserManager';
import { formatDateTime } from '../lib/formatters';
import {
  Settings,
  Database,
  Users,
  HardDrive,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Download,
  Save,
  Sliders,
  FileCheck,
  Info,
  Clock
} from 'lucide-react';

interface SystemSetting {
  key: string;
  value: string;
  description?: string | null;
  updatedAt: string;
}

interface BackupFileInfo {
  filename: string;
  filepath: string;
  sizeBytes: number;
  sizeFormatted: string;
  createdAt: string;
}

export const SettingsPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const { language } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'general' | 'backups' | 'users'>('general');

  // General settings state
  const [settingsMap, setSettingsMap] = useState<Record<string, string>>({});
  const [savingSettings, setSavingSettings] = useState<boolean>(false);
  const [settingsNotice, setSettingsNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Backup & Integrity state
  const [backups, setBackups] = useState<BackupFileInfo[]>([]);
  const [loadingBackups, setLoadingBackups] = useState<boolean>(false);
  const [creatingBackup, setCreatingBackup] = useState<boolean>(false);
  const [checkingIntegrity, setCheckingIntegrity] = useState<boolean>(false);
  const [integrityStatus, setIntegrityStatus] = useState<{ status: 'ok' | 'error'; result: string } | null>(null);
  const [backupNotice, setBackupNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Load Settings
  const loadSettings = async () => {
    try {
      const res = await fetchApi<{ settings: SystemSetting[]; map: Record<string, string> }>('/system/settings');
      setSettingsMap(res.map || {});
    } catch (err: any) {
      console.error('Failed to load settings:', err);
      setSettingsNotice({ type: 'error', message: err.message || 'Erreur lors du chargement des paramètres.' });
    }
  };

  // Load Backups
  const loadBackups = async () => {
    if (!isAdmin) return;
    setLoadingBackups(true);
    try {
      const res = await fetchApi<{ backups: BackupFileInfo[] }>('/system/backups');
      setBackups(res.backups || []);
    } catch (err: any) {
      console.error('Failed to load backups:', err);
    } finally {
      setLoadingBackups(false);
    }
  };

  // Check Integrity
  const checkIntegrity = async () => {
    if (!isAdmin) return;
    setCheckingIntegrity(true);
    try {
      const res = await fetchApi<{ status: 'ok' | 'error'; result: string }>('/system/integrity');
      setIntegrityStatus(res);
      setBackupNotice({
        type: res.status === 'ok' ? 'success' : 'error',
        message: res.status === 'ok' ? 'Diagnostic d\'intégrité réussi : la base SQLite est saine.' : `Anomalie détectée: ${res.result}`
      });
    } catch (err: any) {
      setIntegrityStatus({ status: 'error', result: err.message });
      setBackupNotice({ type: 'error', message: err.message || 'Échec du contrôle d\'intégrité.' });
    } finally {
      setCheckingIntegrity(false);
    }
  };

  // Create Backup
  const handleCreateBackup = async () => {
    if (!isAdmin) return;
    setCreatingBackup(true);
    setBackupNotice(null);
    try {
      const res = await fetchApi<{ backup: BackupFileInfo }>('/system/backup', { method: 'POST' });
      setBackupNotice({
        type: 'success',
        message: `Sauvegarde créée avec succès : ${res.backup.filename} (${res.backup.sizeFormatted})`
      });
      loadBackups();
    } catch (err: any) {
      setBackupNotice({ type: 'error', message: err.message || 'Erreur lors de la sauvegarde.' });
    } finally {
      setCreatingBackup(false);
    }
  };

  // Save All General Settings
  const handleSaveAllGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setSavingSettings(true);
    setSettingsNotice(null);

    try {
      const keysToSave = ['company_name', 'currency', 'default_delivery_fee', 'partner_split_riad', 'partner_split_brother'];
      const riadSplit = parseFloat(settingsMap['partner_split_riad'] || '30');
      const brotherSplit = parseFloat(settingsMap['partner_split_brother'] || '70');

      if (isNaN(riadSplit) || isNaN(brotherSplit) || riadSplit < 0 || brotherSplit < 0) {
        setSettingsNotice({
          type: 'error',
          message: 'Les quotes-parts des associés doivent être des nombres positifs.',
        });
        setSavingSettings(false);
        return;
      }

      if (Math.round((riadSplit + brotherSplit) * 100) / 100 !== 100) {
        setSettingsNotice({
          type: 'error',
          message: `La somme des quotes-parts doit être exactement égale à 100% (Actuellement : ${riadSplit + brotherSplit}%).`,
        });
        setSavingSettings(false);
        return;
      }

      for (const k of keysToSave) {
        if (settingsMap[k] !== undefined) {
          await fetchApi(`/system/settings/${k}`, {
            method: 'PUT',
            body: JSON.stringify({ value: settingsMap[k] }),
          });
        }
      }
      setSettingsNotice({ type: 'success', message: 'Tous les paramètres ont été enregistrés avec succès !' });
      loadSettings();
    } catch (err: any) {
      setSettingsNotice({ type: 'error', message: err.message || 'Erreur lors de la sauvegarde.' });
    } finally {
      setSavingSettings(false);
    }
  };

  useEffect(() => {
    loadSettings();
    if (isAdmin) {
      loadBackups();
      checkIntegrity();
    }
  }, [isAdmin]);

  const riadPct = parseFloat(settingsMap['partner_split_riad'] || '30') || 0;
  const brotherPct = parseFloat(settingsMap['partner_split_brother'] || '70') || 0;
  const totalSplit = Math.round((riadPct + brotherPct) * 100) / 100;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center border border-blue-200 shadow-sm">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {language === 'ar' ? 'إعدادات وصيانة النظام' : 'Paramètres & Maintenance'}
            </h1>
            <p className="text-sm text-slate-500">
              {language === 'ar'
                ? 'إدارة المعلمات العامة، النسخ الاحتياطي لقاعدة البيانات SQLite وإدارة المستخدمين'
                : 'Configuration globale, sauvegarde de la base SQLite et gestion des accès'}
            </p>
          </div>
        </div>

        {/* Sub-tab Switcher */}
        <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveSubTab('general')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'general'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{language === 'ar' ? 'عام' : 'Général'}</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => setActiveSubTab('backups')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                activeSubTab === 'backups'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'النسخ الاحتياطي' : 'Sauvegardes & Base'}</span>
            </button>
          )}

          {isAdmin && (
            <button
              onClick={() => setActiveSubTab('users')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                activeSubTab === 'users'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'المستخدمين' : 'Utilisateurs'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub-Tab 1: General Settings */}
      {activeSubTab === 'general' && (
        <div className="space-y-6">
          {settingsNotice && (
            <div
              className={`p-4 rounded-xl flex items-center gap-3 border ${
                settingsNotice.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              {settingsNotice.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              )}
              <span className="text-sm font-medium">{settingsNotice.message}</span>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-blue-600" />
                <h2 className="font-bold text-slate-800 text-base">
                  {language === 'ar' ? 'معلمات التشغيل العامة' : 'Paramètres d\'Exploitation ZR Factory'}
                </h2>
              </div>
              {!isAdmin && (
                <span className="text-xs text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                  {language === 'ar' ? 'للقراءة فقط (يتطلب صلاحيات المشرف)' : 'Lecture seule (droits Admin requis)'}
                </span>
              )}
            </div>

            <form onSubmit={handleSaveAllGeneral} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Company Name */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    {language === 'ar' ? 'اسم المؤسسة / العلامة' : 'Nom de l\'Atelier / Marque'}
                  </label>
                  <input
                    type="text"
                    disabled={!isAdmin || savingSettings}
                    value={settingsMap['company_name'] || ''}
                    onChange={(e) => setSettingsMap({ ...settingsMap, company_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-60"
                  />
                  <p className="text-xs text-slate-400">Nom apparaissant sur les rapports financiers et bons de livraison.</p>
                </div>

                {/* Currency */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    {language === 'ar' ? 'العملة الأساسية' : 'Devise Principale'}
                  </label>
                  <input
                    type="text"
                    disabled={!isAdmin || savingSettings}
                    value={settingsMap['currency'] || 'DZD'}
                    onChange={(e) => setSettingsMap({ ...settingsMap, currency: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-60"
                  />
                  <p className="text-xs text-slate-400">Devise officielle du grand livre (DZD / DA / د.ج).</p>
                </div>

                {/* Default Delivery Fee */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    {language === 'ar' ? 'سعر التوصيل الافتراضي (د.ج)' : 'Frais de Livraison par Défaut (DA)'}
                  </label>
                  <input
                    type="number"
                    disabled={!isAdmin || savingSettings}
                    value={settingsMap['default_delivery_fee'] || '600'}
                    onChange={(e) => setSettingsMap({ ...settingsMap, default_delivery_fee: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-60"
                  />
                  <p className="text-xs text-slate-400">Montant pré-rempli lors de la création d'une nouvelle commande client.</p>
                </div>

                {/* Equity Splits Notice & Editable Inputs */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      {language === 'ar' ? 'توزيع الأرباح القانوني (Riad / Frère)' : 'Répartition Statutaire des Bénéfices'}
                    </label>
                    <div className="flex items-center gap-2">
                      {totalSplit === 100 ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Total : 100%
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                          Total : {totalSplit}% (doit être égal à 100%)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Riad Input Card */}
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 hover:border-slate-300 transition-colors">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700">Riad</span>
                        <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                          {settingsMap['partner_split_riad'] || '30'} %
                        </span>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="1"
                          disabled={!isAdmin || savingSettings}
                          value={settingsMap['partner_split_riad'] ?? '30'}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSettingsMap(prev => ({
                              ...prev,
                              partner_split_riad: val,
                            }));
                          }}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-60"
                          placeholder="30"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                          %
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">Quote-part statutaire sur les dividendes</p>
                    </div>

                    {/* Frère Input Card */}
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 hover:border-slate-300 transition-colors">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700">Frère / Associé 2</span>
                        <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                          {settingsMap['partner_split_brother'] || '70'} %
                        </span>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="1"
                          disabled={!isAdmin || savingSettings}
                          value={settingsMap['partner_split_brother'] ?? '70'}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSettingsMap(prev => ({
                              ...prev,
                              partner_split_brother: val,
                            }));
                          }}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-60"
                          placeholder="70"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                          %
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">Quote-part statutaire sur les dividendes</p>
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="flex items-center justify-between text-xs pt-1">
                      <p className="text-slate-400">
                        {language === 'ar' ? 'تعديل النسبة ينعكس تلقائياً على حسابات الشركاء وتوزيع الأرباح.' : 'Modifiable par l\'administrateur. S\'applique aux clôtures d\'exercices comptables et aux parts sociales.'}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          const r = parseFloat(settingsMap['partner_split_riad'] || '30') || 0;
                          const b = Math.max(0, 100 - r);
                          setSettingsMap(prev => ({ ...prev, partner_split_brother: String(b) }));
                        }}
                        className="text-blue-600 hover:text-blue-700 font-medium hover:underline text-[11px] whitespace-nowrap ml-2"
                      >
                        {language === 'ar' ? 'موازنة الشريك الثاني إلى 100%' : 'Équilibrer Frère à 100%'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {isAdmin && (
                <div className="pt-4 border-t border-slate-200 flex justify-end">
                  <button
                    type="submit"
                    disabled={savingSettings}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
                  >
                    <Save className={`w-4 h-4 ${savingSettings ? 'animate-spin' : ''}`} />
                    <span>{language === 'ar' ? 'حفظ التعديلات' : 'Enregistrer les Modifications'}</span>
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Sub-Tab 2: Backups & SQLite Integrity */}
      {activeSubTab === 'backups' && isAdmin && (
        <div className="space-y-6">
          {backupNotice && (
            <div
              className={`p-4 rounded-xl flex items-center gap-3 border ${
                backupNotice.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              {backupNotice.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              )}
              <span className="text-sm font-medium">{backupNotice.message}</span>
            </div>
          )}

          {/* Action Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Integrity Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">
                      {language === 'ar' ? 'فحص سلامة قاعدة البيانات' : 'Contrôle d\'Intégrité SQLite'}
                    </h3>
                    <p className="text-xs text-slate-400">PRAGMA integrity_check</p>
                  </div>
                </div>
                <p className="text-sm text-slate-600 mb-4">
                  Exécute une vérification structurelle complète de la base SQLite et des index B-Tree pour garantir l'absence de corruption.
                </p>

                {integrityStatus && (
                  <div className={`p-3 rounded-xl border text-xs font-mono mb-4 ${
                    integrityStatus.status === 'ok'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}>
                    <span className="font-bold">Statut: </span>{integrityStatus.result}
                  </div>
                )}
              </div>

              <button
                onClick={checkIntegrity}
                disabled={checkingIntegrity}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${checkingIntegrity ? 'animate-spin' : ''}`} />
                <span>{language === 'ar' ? 'فحص السلامة الآن' : 'Exécuter le Diagnostic'}</span>
              </button>
            </div>

            {/* Instant Backup Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
                    <HardDrive className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">
                      {language === 'ar' ? 'نسخ احتياطي فوري للبيانات' : 'Sauvegarde Complète Immédiate'}
                    </h3>
                    <p className="text-xs text-slate-400">Copie atomique SQLite WAL</p>
                  </div>
                </div>
                <p className="text-sm text-slate-600 mb-4">
                  Génère un instantané autonome de la base de données sans interrompre les sessions d'ateliers ni verrouiller les écritures.
                </p>

                <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 text-xs text-blue-800 flex items-start gap-2 mb-4">
                  <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <span>Les sauvegardes sont stockées en local dans le répertoire sécurisé <code>server/data/backups/</code>.</span>
                </div>
              </div>

              <button
                onClick={handleCreateBackup}
                disabled={creatingBackup}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-blue-600/20 transition-all disabled:opacity-50"
              >
                <Download className={`w-4 h-4 ${creatingBackup ? 'animate-spin' : ''}`} />
                <span>{language === 'ar' ? 'إنشاء نسخة احتياطية الآن (.sqlite)' : 'Créer une Sauvegarde (.sqlite)'}</span>
              </button>
            </div>
          </div>

          {/* Backup History Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-slate-700" />
                <h3 className="font-bold text-slate-800 text-base">
                  {language === 'ar' ? 'سجل النسخ الاحتياطية المتوفرة' : 'Historique des Fichiers de Sauvegarde'}
                </h3>
              </div>
              <button
                onClick={loadBackups}
                disabled={loadingBackups}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                title="Actualiser"
              >
                <RefreshCw className={`w-4 h-4 ${loadingBackups ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-start text-sm">
                <thead className="bg-slate-50 text-slate-600 font-semibold text-xs uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3.5 text-start">{language === 'ar' ? 'اسم الملف' : 'Nom du Fichier'}</th>
                    <th className="px-6 py-3.5 text-start">{language === 'ar' ? 'الحجم' : 'Taille'}</th>
                    <th className="px-6 py-3.5 text-start">{language === 'ar' ? 'تاريخ الإنشاء' : 'Créé le'}</th>
                    <th className="px-6 py-3.5 text-end">{language === 'ar' ? 'النوع' : 'Format'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingBackups ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400">
                        <div className="inline-flex items-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                          <span>Chargement des archives...</span>
                        </div>
                      </td>
                    </tr>
                  ) : backups.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400">
                        <Database className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="font-medium text-slate-600">Aucune sauvegarde trouvée.</p>
                      </td>
                    </tr>
                  ) : (
                    backups.map((b) => (
                      <tr key={b.filename} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-6 py-3.5 font-mono text-xs font-semibold text-slate-800">
                          {b.filename}
                        </td>
                        <td className="px-6 py-3.5 text-xs text-slate-600 font-mono">
                          {b.sizeFormatted}
                        </td>
                        <td className="px-6 py-3.5 text-xs text-slate-600">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>{formatDateTime(b.createdAt, language)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-3.5 text-end">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            SQLite 3
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab 3: User Management */}
      {activeSubTab === 'users' && isAdmin && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <UserManager />
        </div>
      )}
    </div>
  );
};
