import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  DollarSign,
  Package,
  Layers,
  ArrowDownRight,
  Sparkles,
  ArrowRight,
  Clock,
  Printer,
  Truck,
  AlertTriangle,
  Activity,
  CheckCircle2,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { StatCard } from '../components/ui/StatCard';
import { PartnerCard } from '../components/ui/PartnerCard';
import { formatCurrency, formatDateTime } from '../lib/formatters';
import { fetchApi } from '../lib/api';
import { DashboardSummary } from '@zr-erp/shared';

export const Dashboard: React.FC = () => {
  const { t, language, setActiveTab } = useApp();
  const { user, canAccessFinance, canAccessPartners } = useAuth();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const loadDashboard = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetchApi<DashboardSummary>('/dashboard/summary');
      setData(response);
    } catch (error) {
      console.warn('Dashboard summary fetch failed, using fallback data:', error);
      setData({
        financials: {
          revenue: 0,
          cogs: 0,
          grossProfit: 0,
          expenses: 0,
          netProfit: 0,
          cashBalance: 0,
          currency: 'DZD',
        },
        partners: [
          {
            id: 'partner-riad',
            name: 'Riad',
            ownershipPercentage: 30,
            initialCapital: 0,
            currentBalance: 0,
          },
          {
            id: 'partner-brother',
            name: 'Brother',
            ownershipPercentage: 70,
            initialCapital: 0,
            currentBalance: 0,
          },
        ],
        orders: {
          total: 0,
          pending: 0,
          confirmed: 0,
          processing: 0,
          printing: 0,
          ready: 0,
          shipped: 0,
          delivered: 0,
          cancelled: 0,
          returned: 0,
        },
        production: {
          activeItems: 0,
          printingCount: 0,
          pressCount: 0,
          packedCount: 0,
          defectRate: 0,
          totalThroughput: 0,
        },
        shipping: {
          readyToShip: 0,
          inTransit: 0,
          delivered: 0,
          returned: 0,
          returnRate: 0,
          pendingCodAmount: 0,
        },
        inventoryAlerts: {
          lowStockProductsCount: 0,
          lowStockMaterialsCount: 0,
          items: [],
        },
        recentActivity: [],
      });
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium text-slate-500">Chargement du tableau de bord exécutif...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Executive Command Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white p-6 rounded-2xl shadow-lg border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                {t.phase1Badge}
              </span>
              <span className="text-xs text-slate-400">
                Connecté : <strong className="text-white">{user?.name}</strong> ({user?.role})
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight">{t.dashboard}</h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">{t.tagline}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {canAccessFinance && (
              <div 
                onClick={() => setActiveTab('partners')}
                className="bg-white/10 hover:bg-white/15 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-end cursor-pointer transition-all"
                title="Cliquer pour gérer la trésorerie et les comptes"
              >
                <div className="flex items-center gap-1.5 justify-end">
                  <p className="text-xs text-slate-300 font-medium">{t.cashBalance}</p>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </div>
                <p className="text-xl font-black text-emerald-400">
                  {formatCurrency(data.financials.cashBalance, language)}
                </p>
              </div>
            )}

            <button
              onClick={loadDashboard}
              disabled={isRefreshing}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all flex items-center gap-1 text-xs font-semibold"
              title="Rafraîchir les données"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Quick-Action Bar */}
        <div className="mt-5 pt-4 border-t border-slate-700/60 flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setActiveTab('orders')}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
          >
            <Package className="w-3.5 h-3.5" />
            <span>{t.goToOrders}</span>
          </button>
          <button
            onClick={() => setActiveTab('production')}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{t.goToAtelier}</span>
          </button>
          <button
            onClick={() => setActiveTab('shipping')}
            className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
          >
            <Truck className="w-3.5 h-3.5" />
            <span>{t.goToShipping}</span>
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className="px-3.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{t.goToInventory}</span>
          </button>
          {canAccessPartners && (
            <button
              onClick={() => setActiveTab('partners')}
              className="px-3.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>{t.manageCapital}</span>
            </button>
          )}
        </div>
      </div>

      {/* Critical Inventory Warning Alert Banner */}
      {data.inventoryAlerts.items.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 shadow-sm transition-all flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg text-amber-700 flex-shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm">{t.inventoryAlert}</span>
                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-amber-200 text-amber-900">
                  {data.inventoryAlerts.items.length} critique(s)
                </span>
              </div>
              <p className="text-xs text-amber-700 mt-0.5">
                {t.inventoryAlertDesc} :{' '}
                {data.inventoryAlerts.items.map((it) => it.name).join(', ')}
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('products')}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold whitespace-nowrap transition-all shadow-sm"
          >
            {t.goToInventory} →
          </button>
        </div>
      )}

      {/* Financial KPI Stat Cards (Only for privileged roles) */}
      {canAccessFinance && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title={t.revenue}
            value={formatCurrency(data.financials.revenue, language)}
            subtitle="Chiffre d'affaires brut commandes"
            icon={TrendingUp}
            colorScheme="blue"
          />
          <StatCard
            title={t.cogs}
            value={formatCurrency(data.financials.cogs, language)}
            subtitle="T-shirts, DTF, emballages"
            icon={Layers}
            colorScheme="amber"
          />
          <StatCard
            title={t.grossProfit}
            value={formatCurrency(data.financials.grossProfit, language)}
            subtitle="Marge commerciale générée"
            icon={DollarSign}
            colorScheme="emerald"
          />
          <StatCard
            title={t.netProfit}
            value={formatCurrency(data.financials.netProfit, language)}
            subtitle="Après déduction des charges"
            icon={Sparkles}
            colorScheme="purple"
          />
        </div>
      )}

      {/* Partner Accounting Cards (Riad 30%, Brother 70%) */}
      {canAccessPartners && data.partners.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">{t.partnerBalances}</h2>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                {data.partners.map(p => `${p.name} ${p.ownershipPercentage}%`).join(' / ')}
              </span>
            </div>
            <button
              onClick={() => setActiveTab('partners')}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <span>{t.manageCapital}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {data.partners.map((partner) => (
              <PartnerCard
                key={partner.id}
                name={partner.name}
                percentage={partner.ownershipPercentage}
                balance={partner.currentBalance}
                initialCapital={partner.initialCapital}
                onAddContribution={() => setActiveTab('partners')}
                onWithdraw={() => setActiveTab('partners')}
                onViewTransactions={() => setActiveTab('partners')}
              />
            ))}
          </div>
        </div>
      )}

      {/* Orders Pipeline Status Grid */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-900 text-base">Pipeline des Commandes Print-on-Demand</h3>
          <button
            onClick={() => setActiveTab('orders')}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <span>{t.goToOrders} ({data.orders.total})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div 
            onClick={() => setActiveTab('orders')}
            className="p-3.5 rounded-xl bg-amber-50 hover:bg-amber-100/80 border border-amber-200 text-center cursor-pointer transition-all"
          >
            <Clock className="w-4 h-4 text-amber-600 mx-auto mb-1" />
            <span className="text-xs text-amber-800 font-medium">{t.pendingOrders}</span>
            <p className="text-xl font-black text-amber-900 mt-1">{data.orders.pending}</p>
          </div>
          <div 
            onClick={() => setActiveTab('production')}
            className="p-3.5 rounded-xl bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-200 text-center cursor-pointer transition-all"
          >
            <Printer className="w-4 h-4 text-indigo-600 mx-auto mb-1" />
            <span className="text-xs text-indigo-800 font-medium">Impression DTF</span>
            <p className="text-xl font-black text-indigo-900 mt-1">{data.orders.printing}</p>
          </div>
          <div 
            onClick={() => setActiveTab('orders')}
            className="p-3.5 rounded-xl bg-sky-50 hover:bg-sky-100/80 border border-sky-200 text-center cursor-pointer transition-all"
          >
            <Package className="w-4 h-4 text-sky-600 mx-auto mb-1" />
            <span className="text-xs text-sky-800 font-medium">Prête Atelier</span>
            <p className="text-xl font-black text-sky-900 mt-1">{data.orders.ready}</p>
          </div>
          <div 
            onClick={() => setActiveTab('shipping')}
            className="p-3.5 rounded-xl bg-blue-50 hover:bg-blue-100/80 border border-blue-200 text-center cursor-pointer transition-all"
          >
            <Truck className="w-4 h-4 text-blue-600 mx-auto mb-1" />
            <span className="text-xs text-blue-800 font-medium">Expédiée</span>
            <p className="text-xl font-black text-blue-900 mt-1">{data.orders.shipped}</p>
          </div>
          <div 
            onClick={() => setActiveTab('orders')}
            className="p-3.5 rounded-xl bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 text-center cursor-pointer transition-all"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
            <span className="text-xs text-emerald-800 font-medium">{t.deliveredOrders}</span>
            <p className="text-xl font-black text-emerald-900 mt-1">{data.orders.delivered}</p>
          </div>
          <div 
            onClick={() => setActiveTab('orders')}
            className="p-3.5 rounded-xl bg-rose-50 hover:bg-rose-100/80 border border-rose-200 text-center cursor-pointer transition-all"
          >
            <ArrowDownRight className="w-4 h-4 text-rose-600 mx-auto mb-1" />
            <span className="text-xs text-rose-800 font-medium">{t.cancelledOrders}</span>
            <p className="text-xl font-black text-rose-900 mt-1">{data.orders.cancelled}</p>
          </div>
        </div>
      </div>

      {/* Production Atelier & Shipping Logistics Twin Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Production Atelier Kanban Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{t.atelierProduction}</h3>
                  <p className="text-xs text-slate-500">Flux de confection et presses DTF</p>
                </div>
              </div>
              <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-indigo-100 text-indigo-800">
                {data.production.activeItems} article(s) actif(s)
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
                <span className="text-xs text-slate-500 font-medium">{t.activePrints}</span>
                <p className="text-lg font-black text-indigo-600 mt-1">{data.production.printingCount}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
                <span className="text-xs text-slate-500 font-medium">{t.activePress}</span>
                <p className="text-lg font-black text-amber-600 mt-1">{data.production.pressCount}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
                <span className="text-xs text-slate-500 font-medium">{t.packedReady}</span>
                <p className="text-lg font-black text-emerald-600 mt-1">{data.production.packedCount}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
                <span className="text-xs text-slate-500 font-medium">{t.defectRate}</span>
                <p className="text-lg font-black text-rose-600 mt-1">{data.production.defectRate}%</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => setActiveTab('production')}
            className="w-full mt-2 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border border-indigo-200 transition-all"
          >
            <span>{t.goToAtelier}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Shipping Logistics & COD Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-sky-50 text-sky-700 rounded-lg">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{t.shippingLogistics}</h3>
                  <p className="text-xs text-slate-500">Yalidine, ZR Dispatch, 58 Wilayas</p>
                </div>
              </div>
              <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-sky-100 text-sky-800">
                {data.shipping.inTransit} en transit
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
                <span className="text-xs text-slate-500 font-medium">{t.readyToShip}</span>
                <p className="text-lg font-black text-blue-600 mt-1">{data.shipping.readyToShip}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
                <span className="text-xs text-slate-500 font-medium">{t.deliveredOrders}</span>
                <p className="text-lg font-black text-emerald-600 mt-1">{data.shipping.delivered}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
                <span className="text-xs text-slate-500 font-medium">Retours</span>
                <p className="text-lg font-black text-rose-600 mt-1">{data.shipping.returned}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
                <span className="text-xs text-slate-500 font-medium">Taux Retours</span>
                <p className="text-lg font-black text-slate-700 mt-1">{data.shipping.returnRate}%</p>
              </div>
            </div>

            {canAccessFinance && data.shipping.pendingCodAmount > 0 && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between mb-2">
                <span className="text-xs text-emerald-800 font-medium">{t.pendingCod} :</span>
                <span className="text-sm font-black text-emerald-900">
                  {formatCurrency(data.shipping.pendingCodAmount, language)}
                </span>
              </div>
            )}
          </div>

          <button
            onClick={() => setActiveTab('shipping')}
            className="w-full mt-2 py-2.5 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border border-sky-200 transition-all"
          >
            <span>{t.goToShipping}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Recent Activity Feed */}
      {data.recentActivity && data.recentActivity.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-slate-700" />
              <h3 className="font-bold text-slate-900 text-base">{t.recentActivity}</h3>
            </div>
            <button
              onClick={() => setActiveTab('audit')}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <span>Journal complet</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {data.recentActivity.map((act) => (
              <div key={act.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded font-mono font-semibold text-[10px] bg-slate-100 text-slate-700">
                    {act.action}
                  </span>
                  <span className="text-slate-800 font-medium">{act.userName}</span>
                  <span className="text-slate-500 font-mono text-[11px] hidden sm:inline">
                    [{act.entityType}{act.targetId ? ` #${act.targetId.substring(0, 8)}` : ''}]
                  </span>
                </div>
                <span className="text-slate-400 font-mono text-[11px] whitespace-nowrap">
                  {formatDateTime(act.createdAt, language)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
