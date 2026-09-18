import React, { useState, useEffect } from 'react';
import { fetchApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate } from '../lib/formatters';
import { Order, OrderStatus, PaymentStatus, ALGERIA_WILAYAS, CourierConfiguration } from '@zr-erp/shared';
import {
  ShoppingBag,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Printer,
  Truck,
  PackageCheck,
  XCircle,
  RotateCcw,
  Eye,
  X,
  AlertCircle,
  MapPin,
  Phone,
  Trash2,
  TrendingUp,
  CreditCard,
  Zap,
  Loader2
} from 'lucide-react';

interface OrderStats {
  totalOrders: number;
  pendingCount: number;
  printingCount: number;
  readyCount: number;
  shippedCount: number;
  deliveredCount: number;
  cancelledCount: number;
  totalRevenue: number;
  totalCost: number;
  totalGrossProfit: number;
  averageOrderValue: number;
}

interface ProductItem {
  id: string;
  name: string;
  sku: string;
  sellingPrice: number;
  totalCost: number;
  variants: Array<{
    id: string;
    name: string;
    sku: string;
    stockQuantity: number;
  }>;
}

interface CustomerItem {
  id: string;
  name: string;
  phone: string;
  wilaya: string;
  commune: string;
  address?: string | null;
}

export const OrdersPage: React.FC = () => {
  const { user } = useAuth();
  const { language } = useApp();

  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected Order for Detail Modal
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);

  // Transfer to Courier State
  const [couriers, setCouriers] = useState<CourierConfiguration[]>([]);
  const [transferModalOrder, setTransferModalOrder] = useState<Order | null>(null);
  const [transferCourierKey, setTransferCourierKey] = useState<string>('elogistia');
  const [isTransferring, setIsTransferring] = useState<boolean>(false);
  const [transferFeedback, setTransferFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // New Order Modal State
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState<boolean>(false);
  const [availableProducts, setAvailableProducts] = useState<ProductItem[]>([]);
  const [availableCustomers, setAvailableCustomers] = useState<CustomerItem[]>([]);
  
  const [newOrderCustomer, setNewOrderCustomer] = useState<string>('');
  const [newOrderWilaya, setNewOrderWilaya] = useState<string>('Alger');
  const [newOrderCommune, setNewOrderCommune] = useState<string>('');
  const [newOrderAddress, setNewOrderAddress] = useState<string>('');
  const [newOrderDeliveryCompany, setNewOrderDeliveryCompany] = useState<string>('Yalidine Express');
  const [newOrderDeliveryFee, setNewOrderDeliveryFee] = useState<number>(600);
  const [newOrderDiscount, setNewOrderDiscount] = useState<number>(0);
  const [newOrderNotes, setNewOrderNotes] = useState<string>('');

  const [newOrderItems, setNewOrderItems] = useState<Array<{
    productId: string;
    variantId: string;
    quantity: number;
    sellingPrice: number;
    unitCost: number;
    notes: string;
  }>>([]);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [orderFormError, setOrderFormError] = useState<string | null>(null);

  const canManage = user?.role === 'ADMIN' || user?.role === 'PARTNER' || user?.role === 'EMPLOYEE';
  const canDelete = user?.role === 'ADMIN' || user?.role === 'PARTNER';

  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const handleDeleteOrder = async () => {
    if (!orderToDelete) return;
    try {
      setIsDeleting(true);
      await fetchApi(`/orders/${orderToDelete.id}`, { method: 'DELETE' });
      setOrderToDelete(null);
      if (activeOrder?.id === orderToDelete.id) {
        setActiveOrder(null);
      }
      loadData();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la suppression de la commande');
    } finally {
      setIsDeleting(false);
    }
  };

  const loadData = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (selectedStatus !== 'ALL') params.append('status', selectedStatus);
      if (selectedPaymentStatus !== 'ALL') params.append('paymentStatus', selectedPaymentStatus);
      if (searchQuery) params.append('search', searchQuery);

      const [ordersRes, statsRes, couriersRes] = await Promise.all([
        fetchApi<{ orders: Order[] }>(`/orders?${params.toString()}`),
        fetchApi<{ stats: OrderStats }>('/orders/stats'),
        fetchApi<{ couriers: CourierConfiguration[] }>('/shipping/couriers').catch(() => ({ couriers: [] })),
      ]);

      setOrders(ordersRes.orders);
      setStats(statsRes.stats);
      if (couriersRes.couriers && couriersRes.couriers.length > 0) {
        setCouriers(couriersRes.couriers);
        const def = couriersRes.couriers.find(c => c.isDefault && c.isActive) || couriersRes.couriers.find(c => c.isActive) || couriersRes.couriers[0];
        if (def) {
          setTransferCourierKey(def.courierKey);
        }
      }
    } catch (err: any) {
      console.error('Failed to load orders data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenTransferModal = (order: Order) => {
    setTransferModalOrder(order);
    setTransferFeedback(null);

    const isConfigured = (c: CourierConfiguration) =>
      c.courierKey === 'sandbox' ||
      (c.credentials && Object.values(c.credentials).some(v => v && v.trim() !== ''));

    if (order.deliveryCompany) {
      const match = couriers.find(
        c =>
          (order.deliveryCompany?.toLowerCase().includes(c.courierKey.toLowerCase()) ||
            c.name.toLowerCase().includes(order.deliveryCompany?.toLowerCase() || '')) &&
          isConfigured(c)
      );
      if (match) {
        setTransferCourierKey(match.courierKey);
        return;
      }
    }
    const def =
      couriers.find(c => c.isDefault && c.isActive && isConfigured(c)) ||
      couriers.find(c => c.isActive && isConfigured(c)) ||
      couriers.find(c => isConfigured(c)) ||
      couriers[0];
    if (def) {
      setTransferCourierKey(def.courierKey);
    }
  };

  const handleConfirmTransfer = async () => {
    if (!transferModalOrder) return;
    try {
      setIsTransferring(true);
      setTransferFeedback(null);

      const res = await fetchApi<{
        success: boolean;
        trackingNumber: string;
        courier: string;
        labelUrl?: string;
      }>('/shipping/dispatch-order', {
        method: 'POST',
        body: JSON.stringify({
          orderId: transferModalOrder.id,
          courierKey: transferCourierKey,
        }),
      });

      setTransferFeedback({
        type: 'success',
        message: language === 'ar'
          ? `تم تحويل الطلب ${transferModalOrder.orderNumber} بنجاح إلى شركة ${res.courier}! رقم التتبع: ${res.trackingNumber}`
          : `Commande ${transferModalOrder.orderNumber} transférée avec succès vers ${res.courier} ! N° Suivi : ${res.trackingNumber}`
      });

      await loadData();
      if (activeOrder && activeOrder.id === transferModalOrder.id) {
        openOrderDetail(transferModalOrder.id);
      }

      setTimeout(() => {
        setTransferModalOrder(null);
        setTransferFeedback(null);
      }, 2000);
    } catch (err: any) {
      setTransferFeedback({
        type: 'error',
        message: err.message || 'Erreur lors du transfert de la commande vers la société de livraison.'
      });
    } finally {
      setIsTransferring(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 300);
    return () => clearTimeout(timer);
  }, [selectedStatus, selectedPaymentStatus, searchQuery]);

  // Load products and customers when opening New Order Modal
  const openNewOrderModal = async () => {
    try {
      const [prodsRes, custsRes] = await Promise.all([
        fetchApi<{ products: ProductItem[] }>('/products'),
        fetchApi<{ customers: CustomerItem[] }>('/customers'),
      ]);

      setAvailableProducts(prodsRes.products);
      setAvailableCustomers(custsRes.customers);

      // Reset form
      if (custsRes.customers.length > 0) {
        const firstCust = custsRes.customers[0];
        setNewOrderCustomer(firstCust.id);
        setNewOrderWilaya(firstCust.wilaya);
        setNewOrderCommune(firstCust.commune);
        setNewOrderAddress(firstCust.address || '');
      }

      if (prodsRes.products.length > 0) {
        const firstProd = prodsRes.products[0];
        setNewOrderItems([
          {
            productId: firstProd.id,
            variantId: firstProd.variants[0]?.id || '',
            quantity: 1,
            sellingPrice: firstProd.sellingPrice,
            unitCost: firstProd.totalCost,
            notes: '',
          },
        ]);
      } else {
        setNewOrderItems([]);
      }

      setIsNewOrderModalOpen(true);
    } catch (err: any) {
      alert(err.message || 'Erreur lors du chargement des options');
    }
  };

  const handleCustomerChange = (customerId: string) => {
    setNewOrderCustomer(customerId);
    const found = availableCustomers.find((c) => c.id === customerId);
    if (found) {
      setNewOrderWilaya(found.wilaya);
      setNewOrderCommune(found.commune);
      setNewOrderAddress(found.address || '');
    }
  };

  const addItemRow = () => {
    if (availableProducts.length === 0) return;
    const firstProd = availableProducts[0];
    setNewOrderItems([
      ...newOrderItems,
      {
        productId: firstProd.id,
        variantId: firstProd.variants[0]?.id || '',
        quantity: 1,
        sellingPrice: firstProd.sellingPrice,
        unitCost: firstProd.totalCost,
        notes: '',
      },
    ]);
  };

  const removeItemRow = (index: number) => {
    setNewOrderItems(newOrderItems.filter((_, i) => i !== index));
  };

  const updateItemRow = (index: number, field: string, value: any) => {
    const updated = [...newOrderItems];
    const current = { ...updated[index], [field]: value };

    if (field === 'productId') {
      const prod = availableProducts.find((p) => p.id === value);
      if (prod) {
        current.sellingPrice = prod.sellingPrice;
        current.unitCost = prod.totalCost;
        current.variantId = prod.variants[0]?.id || '';
      }
    }

    updated[index] = current;
    setNewOrderItems(updated);
  };

  // Calculations for new order modal
  const calculatedSubtotal = newOrderItems.reduce((sum, itm) => sum + itm.quantity * itm.sellingPrice, 0);
  const calculatedCost = newOrderItems.reduce((sum, itm) => sum + itm.quantity * itm.unitCost, 0);
  const calculatedTotal = Math.max(0, calculatedSubtotal - newOrderDiscount + newOrderDeliveryFee);
  const calculatedProfit = (calculatedSubtotal - newOrderDiscount) - calculatedCost;
  const calculatedMargin = calculatedSubtotal > 0 ? Math.round((calculatedProfit / calculatedSubtotal) * 100) : 0;

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrderFormError(null);

    if (!newOrderCustomer) {
      setOrderFormError('Veuillez sélectionner un client.');
      return;
    }
    if (newOrderItems.length === 0) {
      setOrderFormError('Veuillez ajouter au moins un article.');
      return;
    }

    try {
      setIsSubmitting(true);
      await fetchApi('/orders', {
        method: 'POST',
        body: JSON.stringify({
          customerId: newOrderCustomer,
          items: newOrderItems.map((itm) => ({
            productId: itm.productId,
            variantId: itm.variantId || null,
            quantity: Number(itm.quantity),
            sellingPrice: Number(itm.sellingPrice),
            notes: itm.notes,
          })),
          shippingWilaya: newOrderWilaya,
          shippingCommune: newOrderCommune,
          shippingAddress: newOrderAddress,
          deliveryCompany: newOrderDeliveryCompany,
          deliveryFee: Number(newOrderDeliveryFee),
          discount: Number(newOrderDiscount),
          notes: newOrderNotes,
        }),
      });

      setIsNewOrderModalOpen(false);
      loadData();
    } catch (err: any) {
      setOrderFormError(err.message || 'Erreur lors de la création de la commande');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openOrderDetail = async (orderId: string) => {
    try {
      const res = await fetchApi<{ order: Order }>(`/orders/${orderId}`);
      setActiveOrder(res.order);
    } catch (err: any) {
      alert(err.message || 'Impossible d\'ouvrir les détails');
    }
  };

  const handleStatusAdvance = async (orderId: string, nextStatus: OrderStatus) => {
    try {
      await fetchApi(`/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      loadData();
      if (activeOrder?.id === orderId) {
        openOrderDetail(orderId);
      }
    } catch (err: any) {
      alert(err.message || 'Impossible de mettre à jour le statut');
    }
  };

  const handlePaymentStatusChange = async (orderId: string, paymentStatus: PaymentStatus) => {
    try {
      await fetchApi(`/orders/${orderId}/payment`, {
        method: 'PATCH',
        body: JSON.stringify({ paymentStatus }),
      });
      loadData();
      if (activeOrder?.id === orderId) {
        openOrderDetail(orderId);
      }
    } catch (err: any) {
      alert(err.message || 'Impossible de mettre à jour le statut de paiement');
    }
  };

  // Helper for 1-click status advancement button
  const getNextStatusAction = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING:
        return { label: 'Confirmer', next: OrderStatus.CONFIRMED, color: 'bg-blue-600 hover:bg-blue-700' };
      case OrderStatus.CONFIRMED:
        return { label: 'Imprimer DTF', next: OrderStatus.PRINTING, color: 'bg-indigo-600 hover:bg-indigo-700' };
      case OrderStatus.PRINTING:
        return { label: 'Marquer Prête', next: OrderStatus.READY, color: 'bg-amber-600 hover:bg-amber-700' };
      case OrderStatus.READY:
        return { label: 'Expédier', next: OrderStatus.SHIPPED, color: 'bg-purple-600 hover:bg-purple-700' };
      case OrderStatus.SHIPPED:
        return { label: 'Marquer Livrée', next: OrderStatus.DELIVERED, color: 'bg-emerald-600 hover:bg-emerald-700' };
      default:
        return null;
    }
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200"><Clock className="w-3 h-3" /> En attente</span>;
      case OrderStatus.CONFIRMED:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200"><CheckCircle2 className="w-3 h-3" /> Confirmée</span>;
      case OrderStatus.PROCESSING:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200"><Clock className="w-3 h-3" /> En cours</span>;
      case OrderStatus.PRINTING:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-200"><Printer className="w-3 h-3" /> DTF en cours</span>;
      case OrderStatus.READY:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-50 text-cyan-700 border border-cyan-200"><PackageCheck className="w-3 h-3" /> Prête</span>;
      case OrderStatus.SHIPPED:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200"><Truck className="w-3 h-3" /> Expédiée</span>;
      case OrderStatus.DELIVERED:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle2 className="w-3 h-3" /> Livrée</span>;
      case OrderStatus.CANCELLED:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200"><XCircle className="w-3 h-3" /> Annulée</span>;
      case OrderStatus.RETURNED:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300"><RotateCcw className="w-3 h-3" /> Retour</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  const getPaymentBadge = (status: PaymentStatus) => {
    switch (status) {
      case PaymentStatus.PAID:
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800">Payé</span>;
      case PaymentStatus.PARTIAL:
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800">Partiel</span>;
      case PaymentStatus.UNPAID:
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-red-100 text-red-800">Non payé</span>;
      case PaymentStatus.REFUNDED:
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-200 text-slate-800">Remboursé</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Commandes & Production</h1>
            <p className="text-xs text-slate-500">
              Pipeline d'impression à la demande, expédition et rentabilité nette
            </p>
          </div>
        </div>

        {canManage && (
          <button
            onClick={openNewOrderModal}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all shadow-sm shadow-blue-600/20 active:scale-[0.99]"
          >
            <Plus className="w-4 h-4" />
            <span>Nouvelle Commande</span>
          </button>
        )}
      </div>

      {/* KPI Cards Row */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Commandes Totales</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <ShoppingBag className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">{stats.totalOrders}</span>
              <span className="text-xs text-slate-400">({stats.deliveredCount} livrées)</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">En Production DTF</span>
              <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
                <Printer className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-violet-700">{stats.printingCount + stats.readyCount}</span>
              <span className="text-xs text-violet-600 font-medium">({stats.printingCount} impression, {stats.readyCount} prêtes)</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Chiffre d'Affaires</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-700">{formatCurrency(stats.totalRevenue, language)}</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Bénéfice Brut Total</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-indigo-700">{formatCurrency(stats.totalGrossProfit, language)}</span>
              <span className="text-xs text-slate-400">
                ({stats.totalRevenue > 0 ? Math.round((stats.totalGrossProfit / stats.totalRevenue) * 100) : 0}%)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Pipeline Status Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
        {[
          { key: 'ALL', label: 'Toutes' },
          { key: OrderStatus.PENDING, label: 'En attente' },
          { key: OrderStatus.CONFIRMED, label: 'Confirmées' },
          { key: OrderStatus.PRINTING, label: 'Impression DTF' },
          { key: OrderStatus.READY, label: 'Prêtes' },
          { key: OrderStatus.SHIPPED, label: 'Expédiées' },
          { key: OrderStatus.DELIVERED, label: 'Livrées' },
          { key: OrderStatus.CANCELLED, label: 'Annulées' },
          { key: OrderStatus.RETURNED, label: 'Retours' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSelectedStatus(tab.key)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedStatus === tab.key
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par N° commande, client, téléphone, n° suivi..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
          />
        </div>

        <div className="w-full md:w-56">
          <select
            value={selectedPaymentStatus}
            onChange={(e) => setSelectedPaymentStatus(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          >
            <option value="ALL">Tous les paiements</option>
            <option value={PaymentStatus.UNPAID}>Non payé</option>
            <option value={PaymentStatus.PARTIAL}>Partiel</option>
            <option value={PaymentStatus.PAID}>Payé</option>
            <option value={PaymentStatus.REFUNDED}>Remboursé</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-xs text-slate-500">Chargement des commandes...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="py-16 text-center">
            <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800">Aucune commande trouvée</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {searchQuery || selectedStatus !== 'ALL'
                ? 'Aucune commande ne correspond aux filtres actuels.'
                : 'Créez votre première commande pour lancer le flux d\'impression.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">N° Commande</th>
                  <th className="px-5 py-3.5">Client & Destination</th>
                  <th className="px-5 py-3.5">Articles</th>
                  <th className="px-5 py-3.5 text-right">Total Client</th>
                  <th className="px-5 py-3.5 text-right">Coût POD</th>
                  <th className="px-5 py-3.5 text-right">Bénéfice Brut</th>
                  <th className="px-5 py-3.5 text-center">Paiement</th>
                  <th className="px-5 py-3.5 text-center">Statut</th>
                  <th className="px-5 py-3.5 text-center">Action Suivante</th>
                  <th className="px-5 py-3.5 text-center">Détails</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((ord) => {
                  const nextAction = canManage ? getNextStatusAction(ord.status) : null;
                  const profitMargin = ord.subtotal > 0 ? Math.round((ord.profit / ord.subtotal) * 100) : 0;

                  return (
                    <tr key={ord.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-4 font-mono font-bold text-slate-900">
                        <div>{ord.orderNumber}</div>
                        <div className="text-[11px] font-normal text-slate-400">
                          {formatDate(ord.createdAt, language)}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-900">{ord.customerName}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{ord.shippingWilaya || ord.shippingCommune || 'Algérie'}</span>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
                          {ord.itemsCount || 1} article(s)
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right font-black text-slate-900">
                        {formatCurrency(ord.total, language)}
                      </td>

                      <td className="px-5 py-4 text-right text-xs text-slate-500 font-mono">
                        {formatCurrency(ord.cost, language)}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="font-bold text-emerald-700">
                          {formatCurrency(ord.profit, language)}
                        </div>
                        <div className="text-[10px] font-semibold text-emerald-600">
                          {profitMargin}% marge
                        </div>
                      </td>

                      <td className="px-5 py-4 text-center">
                        {getPaymentBadge(ord.paymentStatus)}
                      </td>

                      <td className="px-5 py-4 text-center">
                        {getStatusBadge(ord.status)}
                      </td>

                      <td className="px-5 py-4 text-center">
                        <div className="flex flex-col items-center gap-1.5">
                          {ord.trackingNumber ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 inline-flex items-center gap-1 font-mono">
                              <Truck className="w-3 h-3 text-blue-600" />
                              <span>{ord.trackingNumber}</span>
                            </span>
                          ) : (
                            canManage && ord.status !== OrderStatus.CANCELLED && ord.status !== OrderStatus.DELIVERED && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenTransferModal(ord);
                                }}
                                className="px-2.5 py-1.5 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                                title="Transférer la commande à la société de livraison via dzship"
                              >
                                <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                                <span>{language === 'ar' ? 'تحويل للتوصيل' : 'Transférer'}</span>
                              </button>
                            )
                          )}

                          {nextAction && (
                            <button
                              onClick={() => handleStatusAdvance(ord.id, nextAction.next)}
                              className={`px-2.5 py-1 text-[11px] font-semibold text-white rounded-lg transition shadow-xs ${nextAction.color}`}
                            >
                              {nextAction.label}
                            </button>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {!ord.trackingNumber && canManage && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenTransferModal(ord);
                              }}
                              className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                              title={language === 'ar' ? 'تحويل إلى شركة التوصيل' : 'Transférer à la société de livraison'}
                            >
                              <Zap className="w-4 h-4 fill-amber-500 text-amber-500" />
                            </button>
                          )}
                          <button
                            onClick={() => openOrderDetail(ord.id)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Voir la commande"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {canDelete && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOrderToDelete(ord);
                              }}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Supprimer la commande"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      {activeOrder && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-xs z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm font-mono">
                  ZR
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <span>{activeOrder.orderNumber}</span>
                    {getStatusBadge(activeOrder.status)}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Créée le {formatDate(activeOrder.createdAt, language)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveOrder(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Customer & Delivery Summary Card */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 font-semibold uppercase block mb-1">Destinataire Client</span>
                  <div className="font-bold text-slate-900 text-sm">{activeOrder.customer?.name}</div>
                  <div className="text-slate-600 mt-1 font-mono flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    {activeOrder.customer?.phone}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 font-semibold uppercase block mb-1">Livraison & Colis</span>
                  <div className="font-semibold text-slate-900 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-blue-500" />
                    {activeOrder.shippingWilaya} {activeOrder.shippingCommune ? `(${activeOrder.shippingCommune})` : ''}
                  </div>
                  <div className="text-slate-600 mt-1">
                    {activeOrder.shippingAddress || 'Adresse standard'}
                  </div>
                  {activeOrder.trackingNumber ? (
                    <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 font-mono text-xs">
                      <Truck className="w-3.5 h-3.5 text-blue-600" />
                      <span>{activeOrder.trackingNumber}</span>
                      {activeOrder.deliveryCompany && <span className="text-blue-500 font-sans text-[11px]">({activeOrder.deliveryCompany})</span>}
                    </div>
                  ) : (
                    canManage && activeOrder.status !== OrderStatus.CANCELLED && (
                      <button
                        type="button"
                        onClick={() => handleOpenTransferModal(activeOrder)}
                        className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-lg text-xs shadow-xs transition cursor-pointer"
                      >
                        <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                        <span>{language === 'ar' ? 'تحويل للتوصيل (dzship)' : 'Transférer au livreur (dzship)'}</span>
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Order Items Detailed Table */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                  Articles Commandés ({activeOrder.items?.length || 0})
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                      <tr>
                        <th className="px-4 py-2.5">Produit & Déclinaison</th>
                        <th className="px-4 py-2.5 text-center">Qté</th>
                        <th className="px-4 py-2.5 text-right">Prix Unitaire</th>
                        <th className="px-4 py-2.5 text-right">Coût POD</th>
                        <th className="px-4 py-2.5 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeOrder.items?.map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-900">{item.productName}</div>
                            {item.variantName && (
                              <div className="text-slate-500 text-[11px]">Option : {item.variantName}</div>
                            )}
                            {item.notes && (
                              <div className="text-indigo-600 text-[11px] mt-0.5 font-mono">Note : {item.notes}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center font-bold text-slate-900">
                            {item.quantity}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {formatCurrency(item.sellingPrice, language)}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-500 font-mono">
                            {formatCurrency(item.unitCost, language)}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-slate-900">
                            {formatCurrency(item.totalPrice, language)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Calculation Summary Breakdown */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Sous-total articles :</span>
                  <span className="font-mono">{formatCurrency(activeOrder.subtotal, language)}</span>
                </div>
                {activeOrder.discount > 0 && (
                  <div className="flex justify-between text-amber-700">
                    <span>Remise appliquée :</span>
                    <span className="font-mono">-{formatCurrency(activeOrder.discount, language)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>Frais de livraison ({activeOrder.deliveryCompany || 'Transport'}) :</span>
                  <span className="font-mono">+{formatCurrency(activeOrder.deliveryFee, language)}</span>
                </div>
                <div className="border-t border-slate-200 pt-2 flex justify-between font-black text-slate-900 text-sm">
                  <span>Total à payer Client :</span>
                  <span>{formatCurrency(activeOrder.total, language)}</span>
                </div>
                <div className="border-t border-slate-200 pt-2 flex justify-between text-slate-500">
                  <span>Coût total de production (Blank + DTF + Packaging) :</span>
                  <span className="font-mono">{formatCurrency(activeOrder.cost, language)}</span>
                </div>
                <div className="flex justify-between font-bold text-emerald-700 text-sm">
                  <span>Bénéfice Net sur Commande :</span>
                  <span>{formatCurrency(activeOrder.profit, language)}</span>
                </div>
              </div>

              {/* Lifecycle Actions */}
              {canManage && (
                <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Gérer le Cycle de Vie & Statuts
                  </span>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">Statut de la commande :</span>
                      <select
                        value={activeOrder.status}
                        onChange={(e) => handleStatusAdvance(activeOrder.id, e.target.value as OrderStatus)}
                        className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value={OrderStatus.PENDING}>En attente</option>
                        <option value={OrderStatus.CONFIRMED}>Confirmée</option>
                        <option value={OrderStatus.PRINTING}>Impression DTF</option>
                        <option value={OrderStatus.READY}>Prête</option>
                        <option value={OrderStatus.SHIPPED}>Expédiée</option>
                        <option value={OrderStatus.DELIVERED}>Livrée</option>
                        <option value={OrderStatus.CANCELLED}>Annulée (Restituer stock)</option>
                        <option value={OrderStatus.RETURNED}>Retournée (Restituer stock)</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">Paiement :</span>
                      <select
                        value={activeOrder.paymentStatus}
                        onChange={(e) => handlePaymentStatusChange(activeOrder.id, e.target.value as PaymentStatus)}
                        className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value={PaymentStatus.UNPAID}>Non payé</option>
                        <option value={PaymentStatus.PARTIAL}>Partiel</option>
                        <option value={PaymentStatus.PAID}>Payé</option>
                        <option value={PaymentStatus.REFUNDED}>Remboursé</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              {canDelete ? (
                <button
                  onClick={() => setOrderToDelete(activeOrder)}
                  className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Supprimer la commande</span>
                </button>
              ) : <div />}
              <button
                onClick={() => setActiveOrder(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold transition"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Order Modal */}
      {isNewOrderModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-xs z-10">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">Créer une Nouvelle Commande POD</h3>
              </div>
              <button
                onClick={() => setIsNewOrderModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="p-6 space-y-6">
              {orderFormError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{orderFormError}</span>
                </div>
              )}

              {/* Customer Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Client <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newOrderCustomer}
                    onChange={(e) => handleCustomerChange(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {availableCustomers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.phone} - {c.wilaya})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Wilaya de Livraison (1-58)
                  </label>
                  <select
                    value={newOrderWilaya}
                    onChange={(e) => setNewOrderWilaya(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {ALGERIA_WILAYAS.map((w) => (
                      <option key={w.code} value={w.name}>
                        {w.code} - {w.name} ({w.arName})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Delivery Logistics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Société de livraison</label>
                  <input
                    type="text"
                    value={newOrderDeliveryCompany}
                    onChange={(e) => setNewOrderDeliveryCompany(e.target.value)}
                    placeholder="Ex: Yalidine, ZR Express"
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Frais de livraison (DA)</label>
                  <input
                    type="number"
                    min="0"
                    value={newOrderDeliveryFee}
                    onChange={(e) => setNewOrderDeliveryFee(Number(e.target.value))}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Remise client (DA)</label>
                  <input
                    type="number"
                    min="0"
                    value={newOrderDiscount}
                    onChange={(e) => setNewOrderDiscount(Number(e.target.value))}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Order Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes & Consignes d'Impression</label>
                <textarea
                  rows={2}
                  value={newOrderNotes}
                  onChange={(e) => setNewOrderNotes(e.target.value)}
                  placeholder="Ex: Emballage soigné, livraison l'après-midi, instructions DTF spécifiques..."
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Items Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Articles de la Commande
                  </label>
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
                  >
                    <Plus className="w-3.5 h-3.5" /> Ajouter un article
                  </button>
                </div>

                <div className="space-y-3">
                  {newOrderItems.map((item, idx) => {
                    const selectedProd = availableProducts.find((p) => p.id === item.productId);
                    const variants = selectedProd?.variants || [];

                    return (
                      <div
                        key={idx}
                        className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs space-y-2"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                          <div className="sm:col-span-2">
                            <label className="block text-[11px] font-medium text-slate-500">Produit</label>
                            <select
                              value={item.productId}
                              onChange={(e) => updateItemRow(idx, 'productId', e.target.value)}
                              className="w-full px-2 py-1.5 border border-slate-200 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              {availableProducts.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} ({p.sellingPrice} DA)
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-slate-500">Variante</label>
                            <select
                              value={item.variantId}
                              onChange={(e) => updateItemRow(idx, 'variantId', e.target.value)}
                              className="w-full px-2 py-1.5 border border-slate-200 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Aucune</option>
                              {variants.map((v) => (
                                <option key={v.id} value={v.id}>
                                  {v.name} (Stock: {v.stockQuantity})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="w-16">
                              <label className="block text-[11px] font-medium text-slate-500">Qté</label>
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => updateItemRow(idx, 'quantity', Number(e.target.value))}
                                className="w-full px-2 py-1.5 border border-slate-200 rounded-md text-xs font-bold text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() => removeItemRow(idx)}
                              disabled={newOrderItems.length === 1}
                              className="mt-4 p-1.5 text-slate-400 hover:text-red-600 rounded-md transition disabled:opacity-30"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-slate-100 text-[11px]">
                          <div>
                            <span className="text-slate-400">Coût unitaire POD : </span>
                            <span className="font-mono font-semibold text-slate-700">{item.unitCost} DA</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Prix unitaire : </span>
                            <span className="font-mono font-semibold text-slate-900">{item.sellingPrice} DA</span>
                          </div>
                          <div className="text-right">
                            <span className="text-slate-400">Total : </span>
                            <span className="font-mono font-bold text-slate-900">
                              {item.quantity * item.sellingPrice} DA
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Live Real-Time Financial Estimation Card */}
              <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-200 text-xs space-y-1.5">
                <span className="font-bold text-blue-900 block mb-1">Aperçu Financier de la Commande :</span>
                <div className="flex justify-between text-slate-700">
                  <span>Sous-total articles :</span>
                  <span className="font-mono font-bold">{formatCurrency(calculatedSubtotal, language)}</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Frais de livraison :</span>
                  <span className="font-mono">+{formatCurrency(newOrderDeliveryFee, language)}</span>
                </div>
                {newOrderDiscount > 0 && (
                  <div className="flex justify-between text-amber-700">
                    <span>Remise :</span>
                    <span className="font-mono">-{formatCurrency(newOrderDiscount, language)}</span>
                  </div>
                )}
                <div className="border-t border-blue-200 pt-1 flex justify-between font-black text-slate-900 text-sm">
                  <span>Total Facturé au Client :</span>
                  <span>{formatCurrency(calculatedTotal, language)}</span>
                </div>
                <div className="flex justify-between text-slate-500 pt-1">
                  <span>Coût Total POD (Blank + DTF + Packaging) :</span>
                  <span className="font-mono">{formatCurrency(calculatedCost, language)}</span>
                </div>
                <div className="flex justify-between font-bold text-emerald-700 text-sm">
                  <span>Bénéfice Net Réalisé :</span>
                  <span>{formatCurrency(calculatedProfit, language)} ({calculatedMargin}% marge)</span>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewOrderModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Création en cours...' : 'Valider la Commande'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {orderToDelete && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-900">
                Supprimer la commande {orderToDelete.orderNumber} ?
              </h3>
              <p className="text-sm text-slate-500 mt-2">
                Montant total : <strong className="text-slate-700">{formatCurrency(orderToDelete.total, language)}</strong>
                <br />
                Client : <strong className="text-slate-700">{orderToDelete.customer?.name}</strong>
              </p>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 text-left mt-4">
                <strong>Attention :</strong> Cette action supprimera définitivement la commande et restituera les stocks des articles réservés.
              </div>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setOrderToDelete(null)}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDeleteOrder}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2"
              >
                {isDeleting ? 'Suppression...' : 'Supprimer définitivement'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer to Courier (dzship) Modal */}
      {transferModalOrder && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <Zap className="w-5 h-5 fill-amber-500 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {language === 'ar' ? 'تحويل الطلب إلى شركة التوصيل' : 'Transférer au Livreur (dzship)'}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Commande #{transferModalOrder.orderNumber}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!isTransferring) {
                    setTransferModalOrder(null);
                    setTransferFeedback(null);
                  }
                }}
                disabled={isTransferring}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-xs">
              {/* Recipient / Order Recap */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                <div className="flex justify-between items-center text-slate-600">
                  <span className="font-semibold">{language === 'ar' ? 'العميل :' : 'Destinataire :'}</span>
                  <span className="font-bold text-slate-900">{transferModalOrder.customer?.name}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span className="font-semibold">{language === 'ar' ? 'الهاتف :' : 'Téléphone :'}</span>
                  <span className="font-mono text-slate-900">{transferModalOrder.customer?.phone}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span className="font-semibold">{language === 'ar' ? 'الوجهة :' : 'Destination :'}</span>
                  <span className="text-slate-900">
                    {transferModalOrder.shippingWilaya} {transferModalOrder.shippingCommune ? `(${transferModalOrder.shippingCommune})` : ''}
                  </span>
                </div>
                <div className="border-t border-slate-200 pt-2 flex justify-between items-center">
                  <span className="font-bold text-slate-700">{language === 'ar' ? 'المبلغ المستحق (COD) :' : 'Montant COD à encaisser :'}</span>
                  <span className="font-black text-blue-600 text-sm font-mono">
                    {formatCurrency(transferModalOrder.total, language)}
                  </span>
                </div>
              </div>

              {/* Courier Selector */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">
                  {language === 'ar' ? 'اختر شركة التوصيل (Couriers dzship)' : 'Société de Livraison dzship'}
                </label>
                <select
                  value={transferCourierKey}
                  onChange={(e) => setTransferCourierKey(e.target.value)}
                  disabled={isTransferring}
                  className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {couriers.map((c) => {
                    const isConfigured = c.courierKey === 'sandbox' || (c.credentials && Object.values(c.credentials).some(v => v && v.trim() !== ''));
                    return (
                      <option key={c.courierKey} value={c.courierKey}>
                        {c.name} {isConfigured ? '✓' : '⚠️ (Clé non configurée)'} {c.isDefault ? '★ [Par Défaut]' : ''}
                      </option>
                    );
                  })}
                  {couriers.length === 0 && (
                    <>
                      <option value="sandbox">Sandbox Test Mode ✓</option>
                      <option value="elogistia">Elogistia</option>
                      <option value="zrexpress">ZR Express</option>
                      <option value="zrexpressnew">ZR Express (New)</option>
                      <option value="ecomdelivery">Ecom Delivery</option>
                      <option value="yalidine">Yalidine Express</option>
                    </>
                  )}
                </select>
                <p className="text-[11px] text-slate-500">
                  {language === 'ar'
                    ? 'سيتم تسجيل الطرد مباشرة في لوحة تحكم شركة التوصيل وتوليد رقم التتبع الرسمي.'
                    : 'Le colis sera créé directement via l\'API dzship chez le transporteur sélectionné avec bordereau & tracking.'}
                </p>
              </div>

              {/* Warning if selected courier has no credentials */}
              {(() => {
                const selected = couriers.find(c => c.courierKey === transferCourierKey);
                const isConfigured = selected ? (selected.courierKey === 'sandbox' || (selected.credentials && Object.values(selected.credentials).some(v => v && v.trim() !== ''))) : true;
                if (!isConfigured && selected) {
                  return (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold">
                          {language === 'ar' ? `مفتاح API لشركة ${selected.name} غير مسجل بعد` : `Clé API pour ${selected.name} non enregistrée`}
                        </div>
                        <p className="text-[11px] text-amber-700 mt-0.5">
                          {language === 'ar'
                            ? 'يرجى إدخال المفتاح في قسم "الشحن > 5. الشركات ومفاتيح API" وحفظه، أو اختر وضع Sandbox للتجربة.'
                            : 'Veuillez enregistrer votre clé dans Expéditions > 5. Sociétés & Clés API (dzship), ou choisir le mode Sandbox pour tester.'}
                        </p>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Transfer Feedback */}
              {transferFeedback && (
                <div
                  className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs ${
                    transferFeedback.type === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}
                >
                  {transferFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  )}
                  <span className="font-medium">{transferFeedback.message}</span>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setTransferModalOrder(null);
                  setTransferFeedback(null);
                }}
                disabled={isTransferring}
                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                {language === 'ar' ? 'إلغاء' : 'Annuler'}
              </button>
              <button
                type="button"
                onClick={handleConfirmTransfer}
                disabled={
                  isTransferring ||
                  Boolean(
                    couriers.length > 0 &&
                    couriers.some(
                      c =>
                        c.courierKey === transferCourierKey &&
                        c.courierKey !== 'sandbox' &&
                        (!c.credentials || !Object.values(c.credentials).some(v => v && v.trim() !== ''))
                    )
                  )
                }
                className="px-5 py-2 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isTransferring ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{language === 'ar' ? 'جاري التحويل...' : 'Transfert en cours...'}</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                    <span>{language === 'ar' ? 'تأكيد الإرسال للشركة' : 'Confirmer le Transfert'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
