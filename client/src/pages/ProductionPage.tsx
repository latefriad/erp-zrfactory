import React, { useState, useEffect, useMemo } from 'react';
import { fetchApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { ProductionItem, ProductionStatus, ProductionMetrics, UserRole } from '@zr-erp/shared';
import { formatDateTime } from '../lib/formatters';
import {
  Printer,
  Flame,
  CheckCircle2,
  Package,
  Truck,
  AlertTriangle,
  RefreshCw,
  Search,
  ArrowRight,
  Clock,
  User,
  MapPin,
  Layers,
  X,
  AlertCircle
} from 'lucide-react';

interface StageConfig {
  id: ProductionStatus;
  labelFr: string;
  labelAr: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
  icon: React.ComponentType<{ className?: string }>;
  nextStage?: ProductionStatus;
  nextActionLabel: string;
}

const STAGES: StageConfig[] = [
  {
    id: ProductionStatus.PENDING_DESIGN,
    labelFr: '1. Attente Fichier',
    labelAr: '1. بانتظار التصميم',
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-700',
    borderColor: 'border-slate-300',
    icon: Layers,
    nextStage: ProductionStatus.READY_FOR_PRINT,
    nextActionLabel: 'Prêt pour DTF',
  },
  {
    id: ProductionStatus.READY_FOR_PRINT,
    labelFr: '2. File d\'Attente DTF',
    labelAr: '2. جاهز للطباعة',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-700',
    borderColor: 'border-blue-300',
    icon: Printer,
    nextStage: ProductionStatus.PRINTING_DTF,
    nextActionLabel: 'Lancer Impression',
  },
  {
    id: ProductionStatus.PRINTING_DTF,
    labelFr: '3. Impression Film DTF',
    labelAr: '3. طباعة الفيلم DTF',
    badgeBg: 'bg-indigo-50',
    badgeText: 'text-indigo-700',
    borderColor: 'border-indigo-300',
    icon: Printer,
    nextStage: ProductionStatus.HEAT_PRESS,
    nextActionLabel: 'Passer en Presse',
  },
  {
    id: ProductionStatus.HEAT_PRESS,
    labelFr: '4. Presse à Chaud 160°C',
    labelAr: '4. الكبس الحراري',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-700',
    borderColor: 'border-amber-300',
    icon: Flame,
    nextStage: ProductionStatus.QUALITY_CHECK,
    nextActionLabel: 'Contrôler Qualité',
  },
  {
    id: ProductionStatus.QUALITY_CHECK,
    labelFr: '5. Contrôle Qualité',
    labelAr: '5. مراقبة الجودة',
    badgeBg: 'bg-purple-50',
    badgeText: 'text-purple-700',
    borderColor: 'border-purple-300',
    icon: CheckCircle2,
    nextStage: ProductionStatus.PACKED,
    nextActionLabel: 'Valider & Emballer',
  },
  {
    id: ProductionStatus.PACKED,
    labelFr: '6. Plié & Emballé',
    labelAr: '6. تم التغليف',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700',
    borderColor: 'border-emerald-300',
    icon: Package,
    nextStage: ProductionStatus.READY_FOR_SHIPPING,
    nextActionLabel: 'Prêt Expédition',
  },
  {
    id: ProductionStatus.READY_FOR_SHIPPING,
    labelFr: '7. Prêt Expédition',
    labelAr: '7. جاهز للشحن',
    badgeBg: 'bg-teal-50',
    badgeText: 'text-teal-700',
    borderColor: 'border-teal-300',
    icon: Truck,
    nextActionLabel: 'Expédié',
  },
];

export const ProductionPage: React.FC = () => {
  const { user } = useAuth();
  const { language } = useApp();

  const [items, setItems] = useState<ProductionItem[]>([]);
  const [metrics, setMetrics] = useState<ProductionMetrics | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [stageFilter, setStageFilter] = useState<string>('ALL');

  // Defect Modal State
  const [defectModalItem, setDefectModalItem] = useState<ProductionItem | null>(null);
  const [defectReason, setDefectReason] = useState<string>('');
  const [requiresReprint, setRequiresReprint] = useState<boolean>(true);
  const [isSubmittingDefect, setIsSubmittingDefect] = useState<boolean>(false);

  // Status update in progress
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);

  const canOperate = user?.role === UserRole.ADMIN || user?.role === UserRole.PARTNER || user?.role === UserRole.EMPLOYEE;

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [itemsRes, metricsRes] = await Promise.all([
        fetchApi<{ items: ProductionItem[] }>('/production'),
        fetchApi<{ metrics: ProductionMetrics }>('/production/metrics'),
      ]);

      setItems(itemsRes.items || []);
      setMetrics(metricsRes.metrics || null);
    } catch (err: any) {
      console.error('Failed to load production data:', err);
      setError(err.message || 'Erreur lors du chargement des données d\'atelier.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAdvanceStatus = async (item: ProductionItem, targetStage?: ProductionStatus) => {
    if (!canOperate || !targetStage) return;

    setUpdatingItemId(item.id);
    try {
      const res = await fetchApi<{ item: ProductionItem }>(`/production/${item.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: targetStage }),
      });

      // Update local state
      setItems((prev) => prev.map((it) => (it.id === item.id ? res.item : it)));
      // Refresh metrics
      fetchApi<{ metrics: ProductionMetrics }>('/production/metrics').then((m) => setMetrics(m.metrics));
    } catch (err: any) {
      alert(`Erreur: ${err.message}`);
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleOpenDefectModal = (item: ProductionItem) => {
    setDefectModalItem(item);
    setDefectReason('');
    setRequiresReprint(true);
  };

  const handleSubmitDefect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!defectModalItem || !defectReason.trim()) return;

    setIsSubmittingDefect(true);
    try {
      const res = await fetchApi<{ item: ProductionItem }>(`/production/${defectModalItem.id}/defect`, {
        method: 'POST',
        body: JSON.stringify({
          defectReason: defectReason.trim(),
          requiresReprint,
        }),
      });

      setItems((prev) => prev.map((it) => (it.id === defectModalItem.id ? res.item : it)));
      setDefectModalItem(null);
      // Refresh metrics
      fetchApi<{ metrics: ProductionMetrics }>('/production/metrics').then((m) => setMetrics(m.metrics));
    } catch (err: any) {
      alert(`Erreur: ${err.message}`);
    } finally {
      setIsSubmittingDefect(false);
    }
  };

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        !searchTerm.trim() ||
        (item.orderNumber && item.orderNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.customerName && item.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.wilayaName && item.wilayaName.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStage = stageFilter === 'ALL' || item.status === stageFilter;

      return matchesSearch && matchesStage;
    });
  }, [items, searchTerm, stageFilter]);

  // Group items by stage
  const itemsByStage = useMemo(() => {
    const grouped: Record<ProductionStatus, ProductionItem[]> = {
      [ProductionStatus.PENDING_DESIGN]: [],
      [ProductionStatus.READY_FOR_PRINT]: [],
      [ProductionStatus.PRINTING_DTF]: [],
      [ProductionStatus.HEAT_PRESS]: [],
      [ProductionStatus.QUALITY_CHECK]: [],
      [ProductionStatus.PACKED]: [],
      [ProductionStatus.READY_FOR_SHIPPING]: [],
    };

    for (const item of filteredItems) {
      if (grouped[item.status]) {
        grouped[item.status].push(item);
      }
    }

    return grouped;
  }, [filteredItems]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center border border-amber-200 shadow-sm">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {language === 'ar' ? 'ورشة الإنتاج والطباعة (Kanban)' : 'Atelier de Production & Impression DTF'}
            </h1>
            <p className="text-sm text-slate-500">
              {language === 'ar'
                ? 'متابعة مراحل تصنيع وطباعة الملابس، الكبس الحراري ومراقبة الجودة'
                : 'Pilotage visuel du flux atelier : Impression DTF, presse à chaud, finition et emballage'}
            </p>
          </div>
        </div>

        <button
          onClick={loadData}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 shadow-sm transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>{language === 'ar' ? 'تحديث اللوحة' : 'Actualiser le Kanban'}</span>
        </button>
      </div>

      {/* Top Atelier KPIs Bar */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Active Total */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              {language === 'ar' ? 'إجمالي قيد الإنجاز' : 'En Atelier'}
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-slate-900">{metrics.totalActive}</span>
              <span className="text-xs text-slate-400 font-medium">articles</span>
            </div>
          </div>

          {/* In DTF Print */}
          <div className="bg-white p-4 rounded-xl border border-blue-100 bg-blue-50/20 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
                {language === 'ar' ? 'في الطباعة DTF' : 'Impression DTF'}
              </span>
              <Printer className="w-4 h-4 text-blue-500" />
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-blue-700">{metrics.inPrint}</span>
              <span className="text-xs text-blue-500 font-medium">films</span>
            </div>
          </div>

          {/* In Heat Press */}
          <div className="bg-white p-4 rounded-xl border border-amber-100 bg-amber-50/20 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">
                {language === 'ar' ? 'في الكبس الحراري' : 'Presse à Chaud'}
              </span>
              <Flame className="w-4 h-4 text-amber-500" />
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-amber-700">{metrics.inPress}</span>
              <span className="text-xs text-amber-500 font-medium">pièces</span>
            </div>
          </div>

          {/* In Quality Check */}
          <div className="bg-white p-4 rounded-xl border border-purple-100 bg-purple-50/20 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-purple-600 uppercase tracking-wider">
                {language === 'ar' ? 'مراقبة الجودة' : 'Contrôle Qualité'}
              </span>
              <CheckCircle2 className="w-4 h-4 text-purple-500" />
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-purple-700">{metrics.inQualityCheck}</span>
              <span className="text-xs text-purple-500 font-medium">en test</span>
            </div>
          </div>

          {/* Finished Today */}
          <div className="bg-white p-4 rounded-xl border border-emerald-100 bg-emerald-50/20 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">
                {language === 'ar' ? 'تم تجهيزه اليوم' : 'Sortis Aujourd\'hui'}
              </span>
              <Package className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-emerald-700">{metrics.completedToday}</span>
              <span className="text-xs text-emerald-500 font-medium">prêts</span>
            </div>
          </div>

          {/* Defect Rate */}
          <div className="bg-white p-4 rounded-xl border border-rose-100 bg-rose-50/20 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">
                {language === 'ar' ? 'نسبة العيوب' : 'Taux Anomalies'}
              </span>
              <AlertTriangle className="w-4 h-4 text-rose-500" />
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-rose-700">{metrics.defectRate}%</span>
              <span className="text-xs text-rose-500 font-mono">({metrics.totalDefects} ops)</span>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar & Search */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute start-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={
              language === 'ar'
                ? 'بحث برقم الطلب، اسم الزبون، الولاية، أو نوع القطعة...'
                : 'Recherche par commande ZR, client, wilaya ou vêtement...'
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full ps-10 pe-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="w-full sm:w-auto px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="ALL">{language === 'ar' ? 'عرض جميع المراحل (7)' : 'Toutes les étapes (7)'}</option>
            {STAGES.map((s) => (
              <option key={s.id} value={s.id}>
                {language === 'ar' ? s.labelAr : s.labelFr}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* Kanban Board Container */}
      <div className="overflow-x-auto pb-6">
        <div className="inline-flex gap-4 min-w-full items-start">
          {STAGES.filter((s) => stageFilter === 'ALL' || stageFilter === s.id).map((stage) => {
            const stageItems = itemsByStage[stage.id] || [];
            const StageIcon = stage.icon;

            return (
              <div
                key={stage.id}
                className="w-80 shrink-0 bg-slate-100/70 rounded-2xl border border-slate-200 p-3 flex flex-col max-h-[78vh]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-lg ${stage.badgeBg} ${stage.badgeText} flex items-center justify-center`}>
                      <StageIcon className="w-3.5 h-3.5" />
                    </div>
                    <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                      {language === 'ar' ? stage.labelAr : stage.labelFr}
                    </h3>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-white text-slate-700 border border-slate-200 shadow-2xs">
                    {stageItems.length}
                  </span>
                </div>

                {/* Column Items Scroll Area */}
                <div className="space-y-3 overflow-y-auto pr-0.5 flex-1">
                  {stageItems.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl bg-white/40">
                      <span>{language === 'ar' ? 'لا توجد قطع' : 'Aucune pièce'}</span>
                    </div>
                  ) : (
                    stageItems.map((item) => (
                      <div
                        key={item.id}
                        className="bg-white rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow p-3.5 space-y-2.5"
                      >
                        {/* Card Header: Order # & Wilaya */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="font-mono text-xs font-black text-blue-600">
                              {item.orderNumber || 'ZR-COMMANDE'}
                            </span>
                            {item.customerName && (
                              <p className="text-xs font-semibold text-slate-800 truncate max-w-[140px]">
                                {item.customerName}
                              </p>
                            )}
                          </div>

                          <div className="flex flex-col items-end gap-1">
                            {item.wilayaName && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                <MapPin className="w-2.5 h-2.5" />
                                <span>{item.wilayaName}</span>
                              </span>
                            )}
                            <span className="text-xs font-black text-slate-900 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                              x{item.quantity}
                            </span>
                          </div>
                        </div>

                        {/* Garment Details & DTF Format */}
                        <div className="p-2 bg-slate-50 rounded-lg border border-slate-100 text-xs space-y-1">
                          <div className="font-bold text-slate-900 truncate">{item.productName}</div>

                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                            {item.size && (
                              <span className="px-1.5 py-0.5 bg-slate-200/80 text-slate-800 rounded font-mono font-bold text-[10px]">
                                {item.size}
                              </span>
                            )}
                            {item.garmentColor && (
                              <span className="px-1.5 py-0.5 bg-slate-200/80 text-slate-800 rounded text-[10px]">
                                {item.garmentColor}
                              </span>
                            )}
                            {item.dtfFormat && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded font-bold text-[10px]">
                                <Printer className="w-2.5 h-2.5" />
                                <span>{item.dtfFormat}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Defect Alert Notice */}
                        {item.defectCount > 0 && (
                          <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-[11px] space-y-0.5">
                            <div className="flex items-center gap-1 font-bold text-rose-700">
                              <AlertTriangle className="w-3 h-3 text-rose-600" />
                              <span>{language === 'ar' ? 'تنبيه عيب مصنعي' : 'Défaut Signalé :'}</span>
                            </div>
                            <p className="text-[10px] text-rose-600 italic truncate">
                              {item.defectReason || 'Défaut qualité'}
                            </p>
                          </div>
                        )}

                        {/* Operator Notes */}
                        {item.operatorNotes && !item.defectReason && (
                          <p className="text-[11px] text-slate-500 italic bg-amber-50/50 p-1.5 rounded border border-amber-100">
                            💬 {item.operatorNotes}
                          </p>
                        )}

                        {/* Timestamp & Operator */}
                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{formatDateTime(item.createdAt)}</span>
                          </span>
                          {item.assignedOperatorName && (
                            <span className="inline-flex items-center gap-1 font-medium text-slate-500">
                              <User className="w-3 h-3" />
                              <span className="truncate max-w-[80px]">{item.assignedOperatorName}</span>
                            </span>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenDefectModal(item)}
                            title={language === 'ar' ? 'إبلاغ عن عيب' : 'Signaler un défaut'}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-200"
                          >
                            <AlertTriangle className="w-4 h-4" />
                          </button>

                          {stage.nextStage && canOperate && (
                            <button
                              type="button"
                              disabled={updatingItemId === item.id}
                              onClick={() => handleAdvanceStatus(item, stage.nextStage)}
                              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
                            >
                              {updatingItemId === item.id ? (
                                <RefreshCw className="w-3 h-3 animate-spin" />
                              ) : (
                                <>
                                  <span>{stage.nextActionLabel}</span>
                                  <ArrowRight className="w-3 h-3" />
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Defect Reporting Modal */}
      {defectModalItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-rose-50/60">
              <div className="flex items-center gap-2 text-rose-700">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <h3 className="font-bold text-base text-slate-900">
                  {language === 'ar' ? 'إبلاغ عن عيب بالقطعة' : 'Signaler une Anomalie Atelier'}
                </h3>
              </div>
              <button
                onClick={() => setDefectModalItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitDefect} className="p-6 space-y-4">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                <span className="font-mono text-blue-600 font-bold">{defectModalItem.orderNumber}</span>
                <p className="font-bold text-slate-900">{defectModalItem.productName}</p>
                <p className="text-slate-500">
                  {defectModalItem.variantName || 'Taille Standard'} • Étape actuelle : {defectModalItem.status}
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  {language === 'ar' ? 'سبب أو نوع العيب' : 'Motif de l\'anomalie / défaut'}
                </label>
                <textarea
                  rows={3}
                  required
                  value={defectReason}
                  onChange={(e) => setDefectReason(e.target.value)}
                  placeholder={
                    language === 'ar'
                      ? 'مثال: خطأ في ألوان DTF، احتراق بالقماش، مشكلة في التثبيت...'
                      : 'Ex: Décalage film DTF, buse bouchée, pelage arraché, tissu brûlé à la presse...'
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-slate-800"
                />
              </div>

              <div className="flex items-center gap-2 p-3 bg-rose-50/50 border border-rose-100 rounded-xl">
                <input
                  type="checkbox"
                  id="reprintCheckbox"
                  checked={requiresReprint}
                  onChange={(e) => setRequiresReprint(e.target.checked)}
                  className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500"
                />
                <label htmlFor="reprintCheckbox" className="text-xs font-semibold text-slate-800 cursor-pointer">
                  {language === 'ar'
                    ? 'إعادة الطباعة مطلوبة (إرجاع القطعة لمرحلة DTF)'
                    : 'Réimpression DTF requise (renvoyer en file d\'attente DTF)'}
                </label>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDefectModalItem(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  {language === 'ar' ? 'إلغاء' : 'Annuler'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDefect || !defectReason.trim()}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors disabled:opacity-50"
                >
                  {isSubmittingDefect ? 'Enregistrement...' : language === 'ar' ? 'تأكيد العيب' : 'Enregistrer le Défaut'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
