import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppShell } from './components/layout/AppShell';
import { Dashboard } from './pages/Dashboard';
import { LoginPage } from './pages/LoginPage';
import { ProductsPage } from './pages/ProductsPage';
import { OrdersPage } from './pages/OrdersPage';
import { ProductionPage } from './pages/ProductionPage';
import { ShippingPage } from './pages/ShippingPage';
import { CrmPage } from './pages/CrmPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { SuppliersPage } from './pages/SuppliersPage';
import { PartnersPage } from './pages/PartnersPage';
import { ReportsPage } from './pages/ReportsPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { SettingsPage } from './pages/SettingsPage';
import { fetchApi } from './lib/api';

const MainContent: React.FC = () => {
  const { activeTab } = useApp();

  switch (activeTab) {
    case 'dashboard':
      return <Dashboard />;
    case 'orders':
      return <OrdersPage />;
    case 'production':
      return <ProductionPage />;
    case 'shipping':
      return <ShippingPage />;
    case 'products':
      return <ProductsPage />;
    case 'expenses':
      return <ExpensesPage />;
    case 'crm':
      return <CrmPage />;
    case 'suppliers':
      return <SuppliersPage />;
    case 'partners':
      return <PartnersPage />;
    case 'reports':
      return <ReportsPage />;
    case 'audit':
      return <AuditLogsPage />;
    case 'settings':
      return <SettingsPage />;
    default:
      return <Dashboard />;
  }
};

const AuthenticatedApp: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [isHealthy, setIsHealthy] = useState<boolean>(true);

  useEffect(() => {
    fetchApi<{ status: string }>('/health')
      .then(() => setIsHealthy(true))
      .catch(() => setIsHealthy(false));
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-mono text-slate-400">Initialisation de la session ERP...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <AppShell isHealthy={isHealthy}>
      <MainContent />
    </AppShell>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppProvider>
        <AuthenticatedApp />
      </AppProvider>
    </AuthProvider>
  );
};

export default App;
