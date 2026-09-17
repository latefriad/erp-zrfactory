import React, { useState, useEffect } from 'react';
import { fetchApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { formatDateTime } from '../lib/formatters';
import {
  ShieldCheck,
  Search,
  RefreshCw,
  Eye,
  AlertCircle,
  FileText,
  User,
  Clock,
  X,
  ChevronLeft,
  ChevronRight,
  Activity,
  Calendar
} from 'lucide-react';

interface AuditLogEntry {
  id: string;
  userId?: string | null;
  userName?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  oldValue?: any | null;
  newValue?: any | null;
  timestamp: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

interface AuditStats {
  totalLogs: number;
  byAction: Record<string, number>;
  byEntity: Record<string, number>;
  recentActors: { userName: string; count: number }[];
}

export const AuditLogsPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const { language } = useApp();

  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 20;

  // Diff Modal
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [isDiffModalOpen, setIsDiffModalOpen] = useState<boolean>(false);

  const loadData = async () => {
    if (!isAdmin) return;
    setIsLoading(true);
    setError(null);

    try {
      // Build query params
      const params = new URLSearchParams();
      params.append('limit', pageSize.toString());
      params.append('offset', ((currentPage - 1) * pageSize).toString());

      if (searchTerm.trim()) params.append('search', searchTerm.trim());
      if (actionFilter !== 'ALL') params.append('action', actionFilter);
      if (entityTypeFilter !== 'ALL') params.append('entityType', entityTypeFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const [logsRes, statsRes] = await Promise.all([
        fetchApi<{ logs: AuditLogEntry[]; total: number }>(`/audit?${params.toString()}`),
        fetchApi<{ stats: AuditStats }>('/audit/stats'),
      ]);

      setLogs(logsRes.logs || []);
      setTotalCount(logsRes.total || 0);
      setStats(statsRes.stats || null);
    } catch (err: any) {
      console.error('Failed to load audit logs:', err);
      setError(err.message || "Erreur lors de la récupération du journal d'audit.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentPage, actionFilter, entityTypeFilter, startDate, endDate]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    loadData();
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setActionFilter('ALL');
    setEntityTypeFilter('ALL');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  const openDiffModal = (log: AuditLogEntry) => {
    setSelectedLog(log);
    setIsDiffModalOpen(true);
  };

  const getActionBadgeColor = (action: string) => {
    if (action.includes('CREATE') || action.includes('INIT') || action.includes('ADD')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (action.includes('UPDATE') || action.includes('SETTING') || action.includes('EDIT')) {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    if (action.includes('DELETE') || action.includes('CANCEL') || action.includes('WITHDRAW')) {
      return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    if (action.includes('LOGIN') || action.includes('AUTH')) {
      return 'bg-purple-50 text-purple-700 border-purple-200';
    }
    return 'bg-slate-50 text-slate-700 border-slate-200';
  };

  const getEntityBadgeColor = (entity: string) => {
    switch (entity) {
      case 'ORDER':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'PRODUCT':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'EXPENSE':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'PARTNER':
      case 'PARTNER_CAPITAL':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      case 'USER':
        return 'bg-violet-50 text-violet-700 border-violet-200';
      case 'SETTING':
      case 'DATABASE':
        return 'bg-slate-100 text-slate-800 border-slate-300';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center border border-indigo-200 shadow-sm">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {language === 'ar' ? 'سجل التدقيق والأمان' : "Journal d'Audit & Traçabilité"}
            </h1>
            <p className="text-sm text-slate-500">
              {language === 'ar'
                ? 'تتبع شامل لجميع العمليات والأنشطة الإدارية في ZR Factory'
                : 'Traçabilité immuable de toutes les actions et modifications système'}
            </p>
          </div>
        </div>

        <button
          onClick={loadData}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 shadow-sm transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>{language === 'ar' ? 'تحديث' : 'Actualiser'}</span>
        </button>
      </div>

      {/* KPI Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {language === 'ar' ? 'إجمالي الأحداث' : 'Total Événements'}
              </p>
              <h3 className="text-2xl font-black text-slate-900">{stats.totalLogs.toLocaleString()}</h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {language === 'ar' ? 'الكيانات المراقبة' : 'Types d\'Entités'}
              </p>
              <h3 className="text-2xl font-black text-emerald-600">{Object.keys(stats.byEntity || {}).length}</h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <FileText className="w-6 h-6" />
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {language === 'ar' ? 'أهم الإجراءات' : 'Action Fréquente'}
              </p>
              {(() => {
                const topAction = Object.entries(stats.byAction || {}).sort((a, b) => b[1] - a[1])[0];
                return (
                  <>
                    <h3 className="text-base font-bold text-slate-900 truncate">
                      {topAction ? topAction[0] : 'N/A'}
                    </h3>
                    <p className="text-xs text-slate-400 font-mono">
                      {topAction ? `${topAction[1]} ops` : ''}
                    </p>
                  </>
                );
              })()}
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <User className="w-6 h-6" />
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {language === 'ar' ? 'المستخدم الأكثر نشاطا' : 'Acteur Principal'}
              </p>
              <h3 className="text-base font-bold text-slate-900 truncate">
                {stats.recentActors?.[0]?.userName || 'Système'}
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                {stats.recentActors?.[0]?.count ? `${stats.recentActors[0].count} logs` : ''}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filters Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute start-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={language === 'ar' ? 'بحث بالإجراء، الكيان، المعرف أو المستخدم...' : 'Recherche par action, entité, ID ou utilisateur...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full ps-10 pe-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="ALL">{language === 'ar' ? 'جميع الإجراءات' : 'Toutes les actions'}</option>
              <option value="LOGIN">LOGIN</option>
              <option value="CREATE_ORDER">CREATE_ORDER</option>
              <option value="UPDATE_ORDER">UPDATE_ORDER</option>
              <option value="DELETE_ORDER">DELETE_ORDER</option>
              <option value="CREATE_EXPENSE">CREATE_EXPENSE</option>
              <option value="DELETE_EXPENSE">DELETE_EXPENSE</option>
              <option value="PARTNER_DEPOSIT">PARTNER_DEPOSIT</option>
              <option value="PARTNER_WITHDRAWAL">PARTNER_WITHDRAWAL</option>
              <option value="CLOSE_PERIOD">CLOSE_PERIOD</option>
              <option value="DISTRIBUTE_PERIOD">DISTRIBUTE_PERIOD</option>
              <option value="UPDATE_SETTING">UPDATE_SETTING</option>
              <option value="CREATE_BACKUP">CREATE_BACKUP</option>
            </select>

            <select
              value={entityTypeFilter}
              onChange={(e) => {
                setEntityTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="ALL">{language === 'ar' ? 'جميع الكيانات' : 'Toutes les entités'}</option>
              <option value="ORDER">COMMANDES (ORDER)</option>
              <option value="PRODUCT">PRODUITS (PRODUCT)</option>
              <option value="EXPENSE">DÉPENSES (EXPENSE)</option>
              <option value="PARTNER_CAPITAL">CAPITAL (PARTNER_CAPITAL)</option>
              <option value="ACCOUNTING_PERIOD">PÉRIODES (ACCOUNTING_PERIOD)</option>
              <option value="USER">UTILISATEURS (USER)</option>
              <option value="SETTING">PARAMÈTRES (SETTING)</option>
              <option value="DATABASE">BASE DE DONNÉES (DATABASE)</option>
            </select>

            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700"
              title="Date Début"
            />

            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700"
              title="Date Fin"
            />

            {(searchTerm || actionFilter !== 'ALL' || entityTypeFilter !== 'ALL' || startDate || endDate) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
              >
                {language === 'ar' ? 'إلغاء الفلاتر' : 'Réinitialiser'}
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* Audit Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-sm">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5 text-start">{language === 'ar' ? 'التاريخ والوقت' : 'Date & Heure'}</th>
                <th className="px-5 py-3.5 text-start">{language === 'ar' ? 'المستخدم' : 'Utilisateur'}</th>
                <th className="px-5 py-3.5 text-start">{language === 'ar' ? 'الإجراء' : 'Action'}</th>
                <th className="px-5 py-3.5 text-start">{language === 'ar' ? 'النوع' : 'Entité'}</th>
                <th className="px-5 py-3.5 text-start">{language === 'ar' ? 'المعرف المستهدف' : 'ID Cible'}</th>
                <th className="px-5 py-3.5 text-end">{language === 'ar' ? 'التفاصيل' : 'Détails / Diff'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="inline-flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
                      <span>{language === 'ar' ? 'جاري تحميل السجلات...' : 'Chargement des événements...'}</span>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-medium text-slate-600">
                      {language === 'ar' ? 'لا توجد سجلات مطابقة للفلاتر الحالية' : 'Aucun événement correspondant aux critères'}
                    </p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Timestamp */}
                    <td className="px-5 py-3.5 whitespace-nowrap text-xs text-slate-600">
                      <div className="flex items-center gap-1.5 font-mono">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formatDateTime(log.timestamp, language)}</span>
                      </div>
                    </td>

                    {/* User / Actor */}
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs border border-slate-200">
                          {log.userName ? log.userName[0].toUpperCase() : 'S'}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-slate-900">
                            {log.userName || 'Système Automatique'}
                          </span>
                          {log.ipAddress && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              {log.ipAddress}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Action */}
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${getActionBadgeColor(
                          log.action
                        )}`}
                      >
                        {log.action}
                      </span>
                    </td>

                    {/* Entity Type */}
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border font-mono ${getEntityBadgeColor(
                          log.entityType
                        )}`}
                      >
                        {log.entityType}
                      </span>
                    </td>

                    {/* Target Entity ID */}
                    <td className="px-5 py-3.5 whitespace-nowrap text-xs font-mono text-slate-700">
                      {log.entityId}
                    </td>

                    {/* Diff Modal Button */}
                    <td className="px-5 py-3.5 whitespace-nowrap text-end">
                      <button
                        onClick={() => openDiffModal(log)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{language === 'ar' ? 'فحص' : 'Inspecter'}</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            {language === 'ar'
              ? `عرض ${logs.length} من أصل ${totalCount} سجل`
              : `Affichage de ${logs.length} sur ${totalCount} événements`}
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1 || isLoading}
              className="p-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-white disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-medium text-slate-700">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages || isLoading}
              className="p-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-white disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* JSON Diff & Details Modal */}
      {isDiffModalOpen && selectedLog && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full overflow-hidden my-8">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {language === 'ar' ? 'تفاصيل الحدث والبيانات' : "Inspection de l'Événement"}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">ID: {selectedLog.id}</p>
                </div>
              </div>
              <button
                onClick={() => setIsDiffModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* Event Attributes Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 font-medium block">{language === 'ar' ? 'الإجراء' : 'Action'}</span>
                  <span className="font-bold text-slate-800">{selectedLog.action}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">{language === 'ar' ? 'الكيان' : 'Entité'}</span>
                  <span className="font-bold text-slate-800">{selectedLog.entityType} ({selectedLog.entityId})</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">{language === 'ar' ? 'المستخدم' : 'Acteur'}</span>
                  <span className="font-bold text-slate-800">{selectedLog.userName || 'Système'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">{language === 'ar' ? 'التوقيت' : 'Horodatage'}</span>
                  <span className="font-bold text-slate-800">{formatDateTime(selectedLog.timestamp, language)}</span>
                </div>
              </div>

              {/* Old Value vs New Value Diff */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Old Value */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-100 px-3.5 py-2 border-b border-slate-200 text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    <span>{language === 'ar' ? 'القيمة السابقة (Before)' : 'État Antérieur (Before)'}</span>
                  </div>
                  <pre className="p-3 bg-slate-900 text-amber-300 text-xs font-mono overflow-x-auto max-h-60 rounded-b-xl">
                    {selectedLog.oldValue !== undefined && selectedLog.oldValue !== null
                      ? typeof selectedLog.oldValue === 'string'
                        ? selectedLog.oldValue
                        : JSON.stringify(selectedLog.oldValue, null, 2)
                      : '// Aucun état antérieur (Création)'}
                  </pre>
                </div>

                {/* New Value */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-100 px-3.5 py-2 border-b border-slate-200 text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>{language === 'ar' ? 'القيمة الجديدة (After)' : 'Nouvel État (After)'}</span>
                  </div>
                  <pre className="p-3 bg-slate-900 text-emerald-300 text-xs font-mono overflow-x-auto max-h-60 rounded-b-xl">
                    {selectedLog.newValue !== undefined && selectedLog.newValue !== null
                      ? typeof selectedLog.newValue === 'string'
                        ? selectedLog.newValue
                        : JSON.stringify(selectedLog.newValue, null, 2)
                      : '// Aucun nouvel état (Suppression)'}
                  </pre>
                </div>
              </div>

              {/* Technical Footprint */}
              {(selectedLog.ipAddress || selectedLog.userAgent) && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                  <p className="text-slate-400 font-semibold">{language === 'ar' ? 'البصمة التقنية' : 'Empreinte Technique :'}</p>
                  {selectedLog.ipAddress && (
                    <p className="text-slate-600 font-mono">IP: {selectedLog.ipAddress}</p>
                  )}
                  {selectedLog.userAgent && (
                    <p className="text-slate-500 font-mono text-[11px] truncate">User-Agent: {selectedLog.userAgent}</p>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setIsDiffModalOpen(false)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors"
              >
                {language === 'ar' ? 'إغلاق' : 'Fermer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
