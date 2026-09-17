import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'fr' | 'ar' | 'en';

export interface Translations {
  appName: string;
  tagline: string;
  searchPlaceholder: string;
  dashboard: string;
  orders: string;
  production: string;
  shipping: string;
  products: string;
  expenses: string;
  crm: string;
  suppliers: string;
  partners: string;
  reports: string;
  audit: string;
  settings: string;
  revenue: string;
  cogs: string;
  grossProfit: string;
  netProfit: string;
  cashBalance: string;
  pendingOrders: string;
  deliveredOrders: string;
  cancelledOrders: string;
  partnerBalances: string;
  availableBalance: string;
  addContribution: string;
  withdraw: string;
  viewTransactions: string;
  recentOrders: string;
  financialFlow: string;
  systemStatus: string;
  phase1Badge: string;
  atelierProduction: string;
  shippingLogistics: string;
  activePrints: string;
  activePress: string;
  packedReady: string;
  defectRate: string;
  readyToShip: string;
  inTransit: string;
  pendingCod: string;
  inventoryAlert: string;
  inventoryAlertDesc: string;
  recentActivity: string;
  goToOrders: string;
  goToAtelier: string;
  goToShipping: string;
  goToInventory: string;
  manageCapital: string;
}

const translationsMap: Record<Language, Translations> = {
  fr: {
    appName: 'ZR Factory ERP',
    tagline: 'Print-on-Demand & Gestion Financière',
    searchPlaceholder: 'Rechercher commande, client, référence...',
    dashboard: 'Tableau de bord',
    orders: 'Commandes',
    production: 'Production Atelier',
    shipping: 'Expéditions & Livraisons',
    products: 'Produits & Coûts',
    expenses: 'Dépenses',
    crm: 'Clients (CRM)',
    suppliers: 'Fournisseurs',
    partners: 'Associés & Capital',
    reports: 'Rapports Financiers',
    audit: 'Journal d\'audit',
    settings: 'Paramètres',
    revenue: 'Chiffre d\'affaires',
    cogs: 'Coût des Ventes (COGS)',
    grossProfit: 'Marge Brute',
    netProfit: 'Bénéfice Net',
    cashBalance: 'Trésorerie Actuelle',
    pendingOrders: 'En Attente',
    deliveredOrders: 'Livrées',
    cancelledOrders: 'Annulées',
    partnerBalances: 'Comptes des Associés',
    availableBalance: 'Solde Disponible',
    addContribution: 'Apport de capital',
    withdraw: 'Effectuer un retrait',
    viewTransactions: 'Voir transactions',
    recentOrders: 'Dernières Commandes',
    financialFlow: 'Moteur Financier & Répartition',
    systemStatus: 'Système Opérationnel',
    phase1Badge: 'ZR Factory Enterprise Edition',
    atelierProduction: 'Production Atelier (Kanban)',
    shippingLogistics: 'Expéditions & Livraisons',
    activePrints: 'Impression DTF',
    activePress: 'Presse à Chaud',
    packedReady: 'Emballés / Prêts',
    defectRate: 'Taux de Défauts',
    readyToShip: 'Prêts à Expédier',
    inTransit: 'En Acheminement',
    pendingCod: 'COD en Attente de Versement',
    inventoryAlert: 'Alerte Stocks Critiques',
    inventoryAlertDesc: 'Articles ou matières premières sous le seuil minimum de réapprovisionnement',
    recentActivity: 'Journal d\'Activité Opérationnelle',
    goToOrders: 'Toutes les Commandes',
    goToAtelier: 'Ouvrir l\'Atelier',
    goToShipping: 'Centre d\'Expédition',
    goToInventory: 'Inventaire & Coûts',
    manageCapital: 'Comptabilité Associés',
  },
  ar: {
    appName: 'ZR Factory ERP',
    tagline: 'الطباعة عند الطلب والإدارة المالية',
    searchPlaceholder: 'بحث عن طلب، عميل، مرجع...',
    dashboard: 'لوحة التحكم',
    orders: 'الطلبات',
    production: 'ورشة الإنتاج',
    shipping: 'الشحن والتوصيل',
    products: 'المنتجات والتكاليف',
    expenses: 'المصاريف',
    crm: 'الزبائن (CRM)',
    suppliers: 'الموردين',
    partners: 'الشركاء ورأس المال',
    reports: 'التقارير المالية',
    audit: 'سجل العمليات',
    settings: 'الإعدادات',
    revenue: 'إجمالي الإيرادات',
    cogs: 'تكلفة البضاعة (COGS)',
    grossProfit: 'الربح الإجمالي',
    netProfit: 'صافي الربح',
    cashBalance: 'الرصيد المالي الحالي',
    pendingOrders: 'قيد الانتظار',
    deliveredOrders: 'تم التسليم',
    cancelledOrders: 'ملغاة',
    partnerBalances: 'حسابات الشركاء',
    availableBalance: 'الرصيد المتاح',
    addContribution: 'إضافة مساهمة',
    withdraw: 'سحب أرباح',
    viewTransactions: 'عرض المعاملات',
    recentOrders: 'أحدث الطلبات',
    financialFlow: 'المحرك المالي وتوزيع الأرباح',
    systemStatus: 'النظام يعمل بشكل ممتاز',
    phase1Badge: 'ZR Factory النسخة المتكاملة',
    atelierProduction: 'ورشة الإنتاج (كانبان)',
    shippingLogistics: 'الشحن والتوصيل',
    activePrints: 'طباعة DTF',
    activePress: 'الكبس الحراري',
    packedReady: 'مغلفة وجاهزة',
    defectRate: 'نسبة العيوب',
    readyToShip: 'جاهز للشحن',
    inTransit: 'قيد التوصيل',
    pendingCod: 'مبالغ الدفع عند الاستلام بانتظار التوريد',
    inventoryAlert: 'تنبيه مخزون منخفض',
    inventoryAlertDesc: 'منتجات أو مواد أولية وصلت للحد الأدنى لإعادة الطلب',
    recentActivity: 'سجل النشاطات الأخيرة',
    goToOrders: 'جميع الطلبات',
    goToAtelier: 'فتح الورشة',
    goToShipping: 'مركز الشحن',
    goToInventory: 'المخزون والتكاليف',
    manageCapital: 'حسابات الشركاء',
  },
  en: {
    appName: 'ZR Factory ERP',
    tagline: 'Print-on-Demand & Financial ERP',
    searchPlaceholder: 'Search orders, customers, SKUs...',
    dashboard: 'Dashboard',
    orders: 'Orders',
    production: 'Production Floor',
    shipping: 'Shipping & Logistics',
    products: 'Products & Costing',
    expenses: 'Expenses',
    crm: 'CRM & Customers',
    suppliers: 'Suppliers',
    partners: 'Partners & Equity',
    reports: 'Financial Reports',
    audit: 'Audit Trail',
    settings: 'Settings',
    revenue: 'Revenue',
    cogs: 'COGS',
    grossProfit: 'Gross Profit',
    netProfit: 'Net Profit',
    cashBalance: 'Cash Balance',
    pendingOrders: 'Pending',
    deliveredOrders: 'Delivered',
    cancelledOrders: 'Cancelled',
    partnerBalances: 'Partner Accounts',
    availableBalance: 'Available Balance',
    addContribution: 'Add Contribution',
    withdraw: 'Withdraw',
    viewTransactions: 'View Ledger',
    recentOrders: 'Recent Orders',
    financialFlow: 'Financial Engine Flow',
    systemStatus: 'System Healthy',
    phase1Badge: 'ZR Factory Enterprise Edition',
    atelierProduction: 'Atelier Production (Kanban)',
    shippingLogistics: 'Shipping & Delivery',
    activePrints: 'DTF Printing',
    activePress: 'Heat Press',
    packedReady: 'Packed / Ready',
    defectRate: 'Defect Rate',
    readyToShip: 'Ready to Ship',
    inTransit: 'In Transit',
    pendingCod: 'Pending COD Remittance',
    inventoryAlert: 'Critical Stock Alert',
    inventoryAlertDesc: 'Products or raw materials below reorder threshold',
    recentActivity: 'Recent Operational Activity',
    goToOrders: 'All Orders',
    goToAtelier: 'Open Atelier',
    goToShipping: 'Shipping Center',
    goToInventory: 'Inventory & Costing',
    manageCapital: 'Partner Accounts',
  },
};


interface AppContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  t: Translations;
  currency: string;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('fr');
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const currency = 'DZD';

  useEffect(() => {
    const root = document.documentElement;
    if (language === 'ar') {
      root.setAttribute('dir', 'rtl');
      root.setAttribute('lang', 'ar');
    } else {
      root.setAttribute('dir', 'ltr');
      root.setAttribute('lang', language);
    }
  }, [language]);

  const toggleSidebar = () => setIsSidebarCollapsed(prev => !prev);
  const t = translationsMap[language];

  return (
    <AppContext.Provider
      value={{
        language,
        setLanguage,
        activeTab,
        setActiveTab,
        isSidebarCollapsed,
        setIsSidebarCollapsed,
        toggleSidebar,
        t,
        currency,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp(): AppContextType {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
