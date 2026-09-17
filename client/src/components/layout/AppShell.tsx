import React from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { useApp } from '../../context/AppContext';

interface AppShellProps {
  children: React.ReactNode;
  isHealthy?: boolean;
}

export const AppShell: React.FC<AppShellProps> = ({ children, isHealthy = true }) => {
  const { isSidebarCollapsed } = useApp();

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Fixed Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${
          isSidebarCollapsed ? 'ms-20' : 'ms-64'
        }`}
      >
        {/* Fixed TopBar */}
        <TopBar isHealthy={isHealthy} />

        {/* Dynamic Page Content */}
        <main className="flex-1 mt-16 p-6 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
