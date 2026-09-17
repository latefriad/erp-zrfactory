import React from 'react';
import {
  LayoutDashboard,
  ShoppingBag,
  Layers,
  CreditCard,
  Users,
  Truck,
  Building2,
  Briefcase,
  BarChart3,
  ShieldCheck,
  Settings,
  ChevronLeft,
  ChevronRight,
  Printer,
  Flame
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, isSidebarCollapsed, toggleSidebar, t, language } = useApp();
  const { user, isAdmin, canAccessFinance, canAccessPartners } = useAuth();

  const allNavItems = [
    { id: 'dashboard', label: t.dashboard, icon: LayoutDashboard, visible: true },
    { id: 'orders', label: t.orders, icon: ShoppingBag, badge: 'Phase 4', visible: true },
    { id: 'production', label: t.production, icon: Flame, badge: 'Phase 10', visible: true },
    { id: 'shipping', label: t.shipping, icon: Truck, badge: 'Phase 11', visible: true },
    { id: 'products', label: t.products, icon: Layers, badge: 'Phase 3', visible: true },
    { id: 'expenses', label: t.expenses, icon: CreditCard, badge: 'Phase 5', visible: canAccessFinance },
    { id: 'crm', label: t.crm, icon: Users, badge: 'Phase 4', visible: true },
    { id: 'suppliers', label: t.suppliers, icon: Building2, badge: 'Phase 5', visible: canAccessFinance },
    { id: 'partners', label: t.partners, icon: Briefcase, badge: 'Phase 6', visible: canAccessPartners },
    { id: 'reports', label: t.reports, icon: BarChart3, badge: 'Phase 8', visible: canAccessFinance },
    { id: 'audit', label: t.audit, icon: ShieldCheck, badge: 'Phase 9', visible: isAdmin },
    { id: 'settings', label: t.settings, icon: Settings, visible: true },
  ];

  const navItems = allNavItems.filter((i) => i.visible);

  return (
    <aside
      className={`fixed inset-y-0 start-0 z-40 bg-slate-900 text-slate-300 flex flex-col border-e border-slate-800 transition-all duration-300 ${
        isSidebarCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-sky-400 text-white flex items-center justify-center font-black shadow-lg shadow-blue-500/20 flex-shrink-0">
            <Printer className="w-5 h-5" />
          </div>
          {!isSidebarCollapsed && (
            <div className="flex flex-col truncate">
              <span className="font-bold text-white text-base tracking-tight leading-tight">
                ZR FACTORY
              </span>
              <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                POD & Financial ERP
              </span>
            </div>
          )}
        </div>

        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isSidebarCollapsed ? (
            language === 'ar' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
          ) : (
            language === 'ar' ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
              title={isSidebarCollapsed ? item.label : undefined}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              {!isSidebarCollapsed && (
                <div className="flex-1 flex items-center justify-between truncate">
                  <span className="truncate">{item.label}</span>
                  {item.badge && !isActive && (
                    <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-800 space-y-2">
        {!isSidebarCollapsed ? (
          <>
            {user && (
              <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700/60">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white truncate max-w-[120px]">{user.name}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-semibold border border-blue-400/30">
                    {user.role}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 truncate mt-0.5">{user.email}</p>
              </div>
            )}
            <div className="bg-slate-800/40 rounded-lg p-2 border border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                Phase 2 Actif
              </span>
              <span className="font-mono text-[10px] text-slate-500">RBAC</span>
            </div>
          </>
        ) : (
          <div className="flex justify-center">
            <span className="relative flex h-2.5 w-2.5">
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>
        )}
      </div>
    </aside>
  );
};
