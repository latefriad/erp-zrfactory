import { Search, Globe, CheckCircle2, Shield, LogOut, RefreshCw } from 'lucide-react';
import { useApp, Language } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';

interface TopBarProps {
  isHealthy?: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({ isHealthy = true }) => {
  const { t, language, setLanguage, isSidebarCollapsed } = useApp();
  const { user, logout, login } = useAuth();

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLanguage(e.target.value as Language);
  };

  const handleQuickSwitch = async (email: string, pass: string) => {
    try {
      await login(email, pass);
    } catch (err) {
      console.error('Quick switch failed:', err);
    }
  };

  return (
    <header
      className={`fixed top-0 end-0 z-30 h-16 bg-white border-b border-slate-200 transition-all duration-300 flex items-center justify-between px-6 ${
        isSidebarCollapsed ? 'start-20' : 'start-64'
      }`}
    >
      {/* Left: Global Search */}
      <div className="flex items-center gap-4 flex-1 max-w-lg">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={t.searchPlaceholder}
            className="w-full ps-9 pe-4 py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-lg text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </div>

      {/* Right: Status, Quick Switch, Currency, Language, User, Logout */}
      <div className="flex items-center gap-3">
        {/* System Health Status Indicator */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-xs font-medium text-emerald-700">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>{isHealthy ? 'Connecté' : 'Hors ligne'}</span>
        </div>

        {/* Quick Role Switcher for Fast Dev Testing */}
        <div className="hidden xl:flex items-center gap-1.5 px-2 py-1 bg-slate-100 rounded-lg border border-slate-200 text-xs">
          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-[11px] font-semibold text-slate-500">Rôle:</span>
          <select
            value={user?.email || ''}
            onChange={(e) => {
              const selectedEmail = e.target.value;
              const passMap: Record<string, string> = {
                'admin@zrfactory.dz': 'admin123456',
                'riad@zrfactory.dz': 'riad123456',
                'brother@zrfactory.dz': 'brother123456',
                'employee@zrfactory.dz': 'employee123456',
                'viewer@zrfactory.dz': 'viewer123456',
              };
              if (passMap[selectedEmail]) {
                handleQuickSwitch(selectedEmail, passMap[selectedEmail]);
              }
            }}
            className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs font-semibold text-slate-700 cursor-pointer focus:outline-none"
          >
            <option value="admin@zrfactory.dz">Admin (Full)</option>
            <option value="riad@zrfactory.dz">Riad (30%)</option>
            <option value="brother@zrfactory.dz">Brother (70%)</option>
            <option value="employee@zrfactory.dz">Employé</option>
            <option value="viewer@zrfactory.dz">Lecteur</option>
          </select>
        </div>

        {/* Currency badge */}
        <div className="hidden md:flex items-center px-2.5 py-1 bg-slate-100 rounded-md text-xs font-bold text-slate-700">
          <span>DZD (DA)</span>
        </div>

        {/* Language selector */}
        <div className="relative flex items-center">
          <Globe className="w-4 h-4 text-slate-500 absolute start-2.5 pointer-events-none" />
          <select
            value={language}
            onChange={handleLanguageChange}
            className="ps-8 pe-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-200 cursor-pointer"
          >
            <option value="fr">Français (FR)</option>
            <option value="ar">العربية (AR)</option>
            <option value="en">English (EN)</option>
          </select>
        </div>

        {/* Current User Badge */}
        {user && (
          <div className="flex items-center gap-3 ps-3 border-s border-slate-200">
            <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-sm">
              {user.name.substring(0, 2).toUpperCase()}
            </div>
            <div className="hidden sm:flex flex-col text-start">
              <span className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[110px]">
                {user.name}
              </span>
              <span className="text-[10px] text-blue-600 font-semibold flex items-center gap-1">
                <Shield className="w-3 h-3 text-blue-600" /> {user.role}
              </span>
            </div>

            {/* Logout button */}
            <button
              onClick={logout}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ms-1"
              title="Déconnexion"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
