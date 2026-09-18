import React, { useState, useEffect, useMemo } from 'react';
import { fetchApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import {
  CarrierName,
  DeliveryType,
  ManifestStatus,
  ShippingManifest,
  ShippingOrderSummary,
  ShippingRateZone,
  ShippingMetrics,
  CashAccount,
  OrderStatus,
  CourierConfiguration,
  DzshipTrackingResult,
  DzshipDispatchResult
} from '@zr-erp/shared';
import { formatCurrency, formatDateTime } from '../lib/formatters';
import {
  Truck,
  Package,
  FileText,
  Printer,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Search,
  MapPin,
  X,
  Coins,
  Percent,
  Barcode,
  Check,
  Key,
  Eye,
  EyeOff,
  Globe,
  ExternalLink,
  Zap,
  ShieldCheck
} from 'lucide-react';

const ALGERIA_WILAYAS = [
  { code: 1, name: '01 - Adrar' },
  { code: 2, name: '02 - Chlef' },
  { code: 3, name: '03 - Laghouat' },
  { code: 4, name: '04 - Oum El Bouaghi' },
  { code: 5, name: '05 - Batna' },
  { code: 6, name: '06 - Béjaïa' },
  { code: 7, name: '07 - Biskra' },
  { code: 8, name: '08 - Béchar' },
  { code: 9, name: '09 - Blida' },
  { code: 10, name: '10 - Bouira' },
  { code: 11, name: '11 - Tamanrasset' },
  { code: 12, name: '12 - Tébessa' },
  { code: 13, name: '13 - Tlemcen' },
  { code: 14, name: '14 - Tiaret' },
  { code: 15, name: '15 - Tizi Ouzou' },
  { code: 16, name: '16 - Alger' },
  { code: 17, name: '17 - Djelfa' },
  { code: 18, name: '18 - Jijel' },
  { code: 19, name: '19 - Sétif' },
  { code: 20, name: '20 - Saïda' },
  { code: 21, name: '21 - Skikda' },
  { code: 22, name: '22 - Sidi Bel Abbès' },
  { code: 23, name: '23 - Annaba' },
  { code: 24, name: '24 - Guelma' },
  { code: 25, name: '25 - Constantine' },
  { code: 26, name: '26 - Médéa' },
  { code: 27, name: '27 - Mostaganem' },
  { code: 28, name: '28 - M\'Sila' },
  { code: 29, name: '29 - Mascara' },
  { code: 30, name: '30 - Ouargla' },
  { code: 31, name: '31 - Oran' },
  { code: 32, name: '32 - El Bayadh' },
  { code: 33, name: '33 - Illizi' },
  { code: 34, name: '34 - Bordj Bou Arreridj' },
  { code: 35, name: '35 - Boumerdès' },
  { code: 36, name: '36 - El Tarf' },
  { code: 37, name: '37 - Tindouf' },
  { code: 38, name: '38 - Tissemsilt' },
  { code: 39, name: '39 - El Oued' },
  { code: 40, name: '40 - Khenchela' },
  { code: 41, name: '41 - Souk Ahras' },
  { code: 42, name: '42 - Tipaza' },
  { code: 43, name: '43 - Mila' },
  { code: 44, name: '44 - Aïn Defla' },
  { code: 45, name: '45 - Naâma' },
  { code: 46, name: '46 - Aïn Témouchent' },
  { code: 47, name: '47 - Ghardaïa' },
  { code: 48, name: '48 - Relizane' },
  { code: 49, name: '49 - Timimoun' },
  { code: 50, name: '50 - Bordj Badji Mokhtar' },
  { code: 51, name: '51 - Ouled Djellal' },
  { code: 52, name: '52 - Béni Abbès' },
  { code: 53, name: '53 - In Salah' },
  { code: 54, name: '54 - In Guezzam' },
  { code: 55, name: '55 - Touggourt' },
  { code: 56, name: '56 - Djanet' },
  { code: 57, name: '57 - El M\'Ghair' },
  { code: 58, name: '58 - El Meniaa' },
];

export const ShippingPage: React.FC = () => {
  const { language } = useApp();
  const { isAdmin, canAccessFinance } = useAuth();

  // Active sub-tab: 'queue' | 'manifests' | 'tracking' | 'rates' | 'couriers'
  const [activeSubTab, setActiveSubTab] = useState<'queue' | 'manifests' | 'tracking' | 'rates' | 'couriers'>('queue');

  // Dzship & Couriers State
  const [couriers, setCouriers] = useState<CourierConfiguration[]>([]);
  const [courierFormCreds, setCourierFormCreds] = useState<Record<string, Record<string, string>>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [testingCourierKey, setTestingCourierKey] = useState<string | null>(null);
  const [courierTestResults, setCourierTestResults] = useState<Record<string, { success: boolean; message: string; ratesCount?: number } | null>>({});
  const [savingCourierKey, setSavingCourierKey] = useState<string | null>(null);

  // 1-Click & Batch Dispatch State
  const [dispatchingOrderId, setDispatchingOrderId] = useState<string | null>(null);
  const [selectedDispatchCourier, setSelectedDispatchCourier] = useState<string>('elogistia');
  const [isBatchDispatching, setIsBatchDispatching] = useState<boolean>(false);

  // Live Tracking Modal State
  const [trackingModalData, setTrackingModalData] = useState<{ trackingNumber: string; courier?: string; orderNumber?: string } | null>(null);
  const [trackingLoading, setTrackingLoading] = useState<boolean>(false);
  const [trackingResult, setTrackingResult] = useState<DzshipTrackingResult | null>(null);
  const [trackingError, setTrackingError] = useState<string | null>(null);

  // State
  const [metrics, setMetrics] = useState<ShippingMetrics | null>(null);
  const [queueOrders, setQueueOrders] = useState<ShippingOrderSummary[]>([]);
  const [manifests, setManifests] = useState<ShippingManifest[]>([]);
  const [inTransitOrders, setInTransitOrders] = useState<ShippingOrderSummary[]>([]);
  const [rates, setRates] = useState<ShippingRateZone[]>([]);
  const [cashAccounts, setCashAccounts] = useState<CashAccount[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [wilayaFilter, setWilayaFilter] = useState<string>('');
  const [carrierFilter, setCarrierFilter] = useState<string>('');

  // Queue Selection for Manifest Creation
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [manifestCarrier, setManifestCarrier] = useState<string>(CarrierName.YALIDINE);
  const [manifestDriverName, setManifestDriverName] = useState<string>('');
  const [manifestDriverPhone, setManifestDriverPhone] = useState<string>('');
  const [manifestPlate, setManifestPlate] = useState<string>('');
  const [manifestNotes, setManifestNotes] = useState<string>('');
  const [isCreatingManifest, setIsCreatingManifest] = useState<boolean>(false);

  // Modals
  const [printManifestModal, setPrintManifestModal] = useState<ShippingManifest | null>(null);
  const [printLabelModal, setPrintLabelModal] = useState<ShippingOrderSummary | null>(null);
  const [returnOrderModal, setReturnOrderModal] = useState<ShippingOrderSummary | null>(null);
  const [returnReason, setReturnReason] = useState<string>('');
  const [returnRestock, setReturnRestock] = useState<boolean>(true);
  const [isSubmittingReturn, setIsSubmittingReturn] = useState<boolean>(false);

  // COD Remittance Modal
  const [remitManifest, setRemitManifest] = useState<ShippingManifest | null>(null);
  const [remitCashAccountId, setRemitCashAccountId] = useState<string>('');
  const [isSubmittingRemit, setIsSubmittingRemit] = useState<boolean>(false);

  // Rates edit modal
  const [editRate, setEditRate] = useState<ShippingRateZone | null>(null);
  const [editDomFee, setEditDomFee] = useState<number>(600);
  const [editDeskFee, setEditDeskFee] = useState<number>(400);

  // Load All Data
  const loadData = async () => {
    try {
      setIsLoading(true);
      setActionError(null);

      const [metricsRes, queueRes, manifestsRes, ordersRes, ratesRes, couriersRes] = await Promise.all([
        fetchApi<{ metrics: ShippingMetrics }>('/shipping/metrics'),
        fetchApi<{ orders: ShippingOrderSummary[] }>('/shipping/queue'),
        fetchApi<{ manifests: ShippingManifest[] }>('/shipping/manifests'),
        fetchApi<{ orders: any[] }>('/orders'),
        fetchApi<{ rates: ShippingRateZone[] }>('/shipping/rates'),
        fetchApi<{ couriers: CourierConfiguration[] }>('/shipping/couriers').catch(() => ({ couriers: [] })),
      ]);

      setMetrics(metricsRes.metrics);
      setQueueOrders(queueRes.orders || []);
      setManifests(manifestsRes.manifests || []);
      setCouriers(couriersRes.couriers || []);

      if (couriersRes.couriers && couriersRes.couriers.length > 0) {
        const defaultC = couriersRes.couriers.find(c => c.isDefault && c.isActive) || couriersRes.couriers.find(c => c.isActive) || couriersRes.couriers[0];
        if (defaultC) {
          setSelectedDispatchCourier(defaultC.courierKey);
        }
      }

      // Shipped or recently delivered/returned orders for tracking view
      const trackingList: ShippingOrderSummary[] = (ordersRes.orders || [])
        .filter((o: any) => o.status === 'SHIPPED' || o.status === 'DELIVERED' || o.status === 'RETURNED')
        .map((o: any) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          customerName: o.customer?.name || o.customerName || 'Client',
          customerPhone: o.customer?.phone || o.customerPhone || '',
          shippingWilaya: o.shippingWilaya || '',
          shippingCommune: o.shippingCommune || '',
          shippingAddress: o.shippingAddress || null,
          deliveryType: o.deliveryType || DeliveryType.DOMICILE,
          trackingNumber: o.trackingNumber || null,
          deliveryCompany: o.deliveryCompany || null,
          total: Number(o.total || 0),
          status: o.status,
          paymentStatus: o.paymentStatus,
          dispatchedAt: o.dispatchedAt || null,
          deliveredAt: o.deliveredAt || null,
          returnedAt: o.returnedAt || null,
          returnReason: o.returnReason || null,
          codRemittedAt: o.codRemittedAt || null,
          createdAt: o.createdAt,
        }));
      setInTransitOrders(trackingList);

      setRates(ratesRes.rates || []);

      // If user can access finance, fetch cash accounts for COD remittance
      if (canAccessFinance) {
        try {
          const cashRes = await fetchApi<{ accounts: CashAccount[] }>('/cash/accounts');
          setCashAccounts(cashRes.accounts || []);
          if (cashRes.accounts?.length > 0 && !remitCashAccountId) {
            const defAcc = cashRes.accounts.find((a) => a.isDefault) || cashRes.accounts[0];
            setRemitCashAccountId(defAcc.id);
          }
        } catch {
          // ignore
        }
      }
    } catch (err: any) {
      setActionError(err.message || 'Erreur de chargement des données logistiques.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered Queue
  const filteredQueue = useMemo(() => {
    return queueOrders.filter((ord) => {
      const matchSearch =
        !searchQuery ||
        ord.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ord.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ord.customerPhone.includes(searchQuery);
      const matchWilaya = !wilayaFilter || ord.shippingWilaya.toLowerCase().includes(wilayaFilter.toLowerCase());
      const matchCarrier = !carrierFilter || (ord.deliveryCompany && ord.deliveryCompany.includes(carrierFilter));
      return matchSearch && matchWilaya && matchCarrier;
    });
  }, [queueOrders, searchQuery, wilayaFilter, carrierFilter]);

  // Filtered Tracking Orders
  const filteredTracking = useMemo(() => {
    return inTransitOrders.filter((ord) => {
      const matchSearch =
        !searchQuery ||
        ord.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ord.trackingNumber && ord.trackingNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
        ord.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ord.customerPhone.includes(searchQuery);
      const matchWilaya = !wilayaFilter || ord.shippingWilaya.toLowerCase().includes(wilayaFilter.toLowerCase());
      const matchCarrier = !carrierFilter || (ord.deliveryCompany && ord.deliveryCompany.includes(carrierFilter));
      return matchSearch && matchWilaya && matchCarrier;
    });
  }, [inTransitOrders, searchQuery, wilayaFilter, carrierFilter]);

  // Checkbox toggle for queue selection
  const handleToggleSelectOrder = (id: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllQueue = () => {
    if (selectedOrderIds.length === filteredQueue.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(filteredQueue.map((o) => o.id));
    }
  };

  // 1. Create Manifest
  const handleCreateManifest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedOrderIds.length === 0) return;

    try {
      setIsCreatingManifest(true);
      setActionError(null);

      const res = await fetchApi<{ manifest: ShippingManifest }>('/shipping/manifests', {
        method: 'POST',
        body: JSON.stringify({
          carrier: manifestCarrier,
          driverName: manifestDriverName || undefined,
          driverPhone: manifestDriverPhone || undefined,
          vehiclePlate: manifestPlate || undefined,
          notes: manifestNotes || undefined,
          orderIds: selectedOrderIds,
        }),
      });

      setActionSuccess(
        language === 'ar'
          ? `تم إنشاء كشف الإرسال ${res.manifest.manifestNumber} بنجاح (${res.manifest.totalParcels} طرد)`
          : `Bordereau ${res.manifest.manifestNumber} créé avec succès (${res.manifest.totalParcels} colis)`
      );

      setSelectedOrderIds([]);
      setManifestDriverName('');
      setManifestDriverPhone('');
      setManifestPlate('');
      setManifestNotes('');

      await loadData();
      setActiveSubTab('manifests');
    } catch (err: any) {
      setActionError(err.message || 'Erreur lors de la création du bordereau.');
    } finally {
      setIsCreatingManifest(false);
    }
  };

  // 2. Mark Delivered
  const handleMarkDelivered = async (order: ShippingOrderSummary) => {
    try {
      setActionError(null);
      await fetchApi(`/shipping/orders/${order.id}/deliver`, {
        method: 'POST',
        body: JSON.stringify({ notes: 'Livraison confirmée par le transporteur' }),
      });

      setActionSuccess(
        language === 'ar'
          ? `تم تأكيد تسليم الطلب ${order.orderNumber}`
          : `Commande ${order.orderNumber} marquée comme livrée.`
      );

      await loadData();
    } catch (err: any) {
      setActionError(err.message || 'Erreur lors de la mise à jour du statut.');
    }
  };

  // 3. Mark Returned
  const handleSubmitReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnOrderModal) return;

    try {
      setIsSubmittingReturn(true);
      setActionError(null);

      await fetchApi(`/shipping/orders/${returnOrderModal.id}/return`, {
        method: 'POST',
        body: JSON.stringify({
          returnReason: returnReason.trim(),
          restoreInventory: returnRestock,
        }),
      });

      setActionSuccess(
        language === 'ar'
          ? `تم تسجيل إرجاع الطلب ${returnOrderModal.orderNumber}`
          : `Retour enregistré pour la commande ${returnOrderModal.orderNumber}.`
      );

      setReturnOrderModal(null);
      setReturnReason('');
      await loadData();
    } catch (err: any) {
      setActionError(err.message || 'Erreur lors de l\'enregistrement du retour.');
    } finally {
      setIsSubmittingReturn(false);
    }
  };

  // 4. Remit Manifest COD
  const handleSubmitRemitCOD = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!remitManifest || !remitCashAccountId) return;

    try {
      setIsSubmittingRemit(true);
      setActionError(null);

      const res = await fetchApi<{ totalRemitted: number; ordersCount: number }>(
        `/shipping/manifests/${remitManifest.id}/remit-cod`,
        {
          method: 'POST',
          body: JSON.stringify({ cashAccountId: remitCashAccountId }),
        }
      );

      setActionSuccess(
        language === 'ar'
          ? `تم إيداع مبلغ الدفع عند الاستلام بنجاح: ${formatCurrency(res.totalRemitted, 'ar')} (${res.ordersCount} طلب)`
          : `Versement COD encaissé avec succès: ${formatCurrency(res.totalRemitted, 'fr')} (${res.ordersCount} colis versés)`
      );

      setRemitManifest(null);
      await loadData();
    } catch (err: any) {
      setActionError(err.message || 'Erreur lors de l\'encaissement du versement COD.');
    } finally {
      setIsSubmittingRemit(false);
    }
  };

  // 5. Update Shipping Rate
  const handleSaveRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRate) return;

    try {
      setActionError(null);
      await fetchApi(`/shipping/rates/${editRate.wilayaCode}`, {
        method: 'PUT',
        body: JSON.stringify({
          feeDomicile: editDomFee,
          feeStopDesk: editDeskFee,
        }),
      });

      setActionSuccess(
        language === 'ar'
          ? `تم تحديث تعريفة ولاية ${editRate.wilayaName} بنجاح`
          : `Tarifs pour ${editRate.wilayaName} (${editRate.wilayaCode}) mis à jour.`
      );

      setEditRate(null);
      await loadData();
    } catch (err: any) {
      setActionError(err.message || 'Erreur lors de la mise à jour de la grille tarifaire.');
    }
  };

  // 6. Dzship: Update credential input in local form state
  const handleCredentialChange = (courierKey: string, field: string, value: string) => {
    setCourierFormCreds((prev) => ({
      ...prev,
      [courierKey]: {
        ...(prev[courierKey] || {}),
        [field]: value,
      },
    }));
  };

  // 7. Dzship: Test Courier Connection
  const handleTestCourier = async (courierKey: string) => {
    try {
      setTestingCourierKey(courierKey);
      setCourierTestResults((prev) => ({ ...prev, [courierKey]: null }));

      const res = await fetchApi<{ success: boolean; message: string; ratesCount?: number }>(
        `/shipping/couriers/${courierKey}/test`,
        { method: 'POST' }
      );

      setCourierTestResults((prev) => ({
        ...prev,
        [courierKey]: res,
      }));

      setActionSuccess(
        language === 'ar'
          ? `نجح الاتصال بـ ${courierKey}! ${res.ratesCount ? `(تم تفعيل ${res.ratesCount} ولاية)` : ''}`
          : `Connexion dzship réussie pour ${courierKey} ! ${res.ratesCount ? `(${res.ratesCount} wilayas disponibles)` : ''}`
      );
    } catch (err: any) {
      const errMsg = err.message || 'Échec du test de connexion';
      setCourierTestResults((prev) => ({
        ...prev,
        [courierKey]: { success: false, message: errMsg },
      }));
      setActionError(errMsg);
    } finally {
      setTestingCourierKey(null);
    }
  };

  // 8. Dzship: Save Courier Settings & Credentials
  const handleSaveCourier = async (
    courier: CourierConfiguration,
    overrides?: Partial<CourierConfiguration>
  ) => {
    try {
      setSavingCourierKey(courier.courierKey);
      setActionError(null);

      const localCreds = courierFormCreds[courier.courierKey] || {};
      const credentialsToSave: Record<string, string> = { ...(courier.credentials || {}) };
      for (const [k, v] of Object.entries(localCreds)) {
        if (v && v.trim() !== '') {
          credentialsToSave[k] = v.trim();
        }
      }

      const payload = {
        courierKey: courier.courierKey,
        name: overrides?.name ?? courier.name,
        isActive: overrides?.isActive !== undefined ? overrides.isActive : courier.isActive,
        isDefault: overrides?.isDefault !== undefined ? overrides.isDefault : courier.isDefault,
        fromWilaya: overrides?.fromWilaya ?? courier.fromWilaya ?? 16,
        defaultDeliveryType: overrides?.defaultDeliveryType ?? courier.defaultDeliveryType ?? 'home',
        credentials: credentialsToSave,
        notes: overrides?.notes !== undefined ? overrides.notes : courier.notes,
      };

      await fetchApi('/shipping/couriers', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setActionSuccess(
        language === 'ar'
          ? `تم حفظ إعدادات ${courier.name} بنجاح`
          : `Configuration pour ${courier.name} enregistrée avec succès.`
      );

      // Reset edited form state for this courier
      setCourierFormCreds((prev) => {
        const next = { ...prev };
        delete next[courier.courierKey];
        return next;
      });

      await loadData();
    } catch (err: any) {
      setActionError(err.message || 'Erreur lors de la sauvegarde des paramètres du transporteur.');
    } finally {
      setSavingCourierKey(null);
    }
  };

  // 9. Dzship: 1-Click Dispatch Single Order
  const handleDispatchSingleOrder = async (orderId: string, courierKey?: string) => {
    try {
      setDispatchingOrderId(orderId);
      setActionError(null);

      const courierToUse = courierKey || selectedDispatchCourier || 'elogistia';
      const res = await fetchApi<{ success: boolean; trackingNumber: string; courier: string; labelUrl?: string }>(
        '/shipping/dispatch-order',
        {
          method: 'POST',
          body: JSON.stringify({ orderId, courierKey: courierToUse }),
        }
      );

      setActionSuccess(
        language === 'ar'
          ? `تم إرسال الطلب بنجاح عبر ${res.courier}! رقم التتبع: ${res.trackingNumber}`
          : `Commande expédiée avec succès via ${res.courier} ! N° Suivi : ${res.trackingNumber}`
      );

      await loadData();
    } catch (err: any) {
      setActionError(err.message || "Erreur lors de l'expédition de la commande via dzship.");
    } finally {
      setDispatchingOrderId(null);
    }
  };

  // 10. Dzship: Batch Dispatch
  const handleDispatchBatchSubmit = async () => {
    if (selectedOrderIds.length === 0) return;
    try {
      setIsBatchDispatching(true);
      setActionError(null);

      const res = await fetchApi<{
        results: DzshipDispatchResult[];
        totalDispatched: number;
        failedCount: number;
      }>('/shipping/dispatch-batch', {
        method: 'POST',
        body: JSON.stringify({
          orderIds: selectedOrderIds,
          courierKey: selectedDispatchCourier,
        }),
      });

      setActionSuccess(
        language === 'ar'
          ? `تم شحن ${res.totalDispatched} طرد بنجاح via dzship (${res.failedCount} أخطاء)`
          : `${res.totalDispatched} colis expédiés avec succès via dzship (${res.failedCount} échecs)`
      );

      setSelectedOrderIds([]);
      await loadData();
    } catch (err: any) {
      setActionError(err.message || "Erreur lors de l'expédition groupée dzship.");
    } finally {
      setIsBatchDispatching(false);
    }
  };

  // 11. Dzship: Live Tracking Modal
  const handleOpenLiveTracking = async (trackingNumber: string, courier?: string, orderNumber?: string) => {
    setTrackingModalData({ trackingNumber, courier, orderNumber });
    setTrackingLoading(true);
    setTrackingResult(null);
    setTrackingError(null);

    try {
      const res = await fetchApi<DzshipTrackingResult>('/shipping/track-order', {
        method: 'POST',
        body: JSON.stringify({
          trackingNumber,
          courierKey: courier || undefined,
        }),
      });
      setTrackingResult(res);
    } catch (err: any) {
      setTrackingError(err.message || 'Impossible de récupérer le suivi en direct.');
    } finally {
      setTrackingLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center font-bold">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {language === 'ar' ? 'إدارة الشحن والتوصيل (Yalidine & ZR Dispatch)' : 'Expéditions & Logistique Transporteurs'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                {language === 'ar'
                  ? 'تتبع الشحنات عبر 58 ولاية، كشوف الإرسال، بطاقات الطرود وإيداع مبالغ الدفع عند الاستلام (COD)'
                  : 'Suivi colis 58 Wilayas, bordereaux de livraison, étiquettes thermiques et encaissement COD'}
              </p>
            </div>
          </div>
        </div>

        {/* Global Action: Refresh */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-xs transition-colors disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{language === 'ar' ? 'تحديث' : 'Actualiser'}</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {actionError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between gap-3 text-rose-800 text-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {actionSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3 text-emerald-800 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Metrics Summary Bar */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold uppercase tracking-wider">
                {language === 'ar' ? 'طرود قيد الشحن' : 'Colis en Transit'}
              </span>
              <Truck className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-black text-slate-900">{metrics.inTransitCount}</div>
            <p className="text-[11px] text-slate-400">
              {language === 'ar' ? 'عبر شركات التوصيل' : 'En cours de distribution'}
            </p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold uppercase tracking-wider">
                {language === 'ar' ? 'مبالغ الدفع المعلقة (COD)' : 'COD en Attente'}
              </span>
              <Coins className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-black text-amber-600">
              {formatCurrency(metrics.pendingCodAmount, language)}
            </div>
            <p className="text-[11px] text-slate-400">
              {language === 'ar' ? 'بانتظار الإيداع والتحصيل' : 'À recouvrer des livreurs'}
            </p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold uppercase tracking-wider">
                {language === 'ar' ? 'نسبة التسليم الناجح' : 'Taux de Livraison'}
              </span>
              <Percent className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-600">{metrics.deliverySuccessRate}%</div>
            <p className="text-[11px] text-slate-400">
              {metrics.deliveredCount} {language === 'ar' ? 'طرد مستلم' : 'colis livrés'}
            </p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold uppercase tracking-wider">
                {language === 'ar' ? 'نسبة المرتجعات' : 'Taux de Retour'}
              </span>
              <RotateCcw className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-2xl font-black text-rose-600">{metrics.returnRate}%</div>
            <p className="text-[11px] text-slate-400">
              {metrics.returnedCount} {language === 'ar' ? 'طرد مرتجع' : 'colis retournés'}
            </p>
          </div>
        </div>
      )}

      {/* Main Logistics Sub-Tabs */}
      <div className="border-b border-slate-200 flex items-center justify-between gap-4 overflow-x-auto">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab('queue')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors inline-flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'queue'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>{language === 'ar' ? '1. جاهز للشحن' : '1. File d\'Expédition'}</span>
            {queueOrders.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
                {queueOrders.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('manifests')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors inline-flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'manifests'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>{language === 'ar' ? '2. كشوف الإرسال (Bordereaux)' : '2. Bordereaux d\'Expédition'}</span>
            <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
              {manifests.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('tracking')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors inline-flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'tracking'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>{language === 'ar' ? '3. تتبع الشحنات' : '3. Suivi des Colis'}</span>
            <span className="px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold">
              {inTransitOrders.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('rates')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors inline-flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'rates'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>{language === 'ar' ? '4. تعريفة 58 ولاية' : '4. Grille 58 Wilayas'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('couriers')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors inline-flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'couriers'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Key className="w-4 h-4 text-amber-500" />
            <span>{language === 'ar' ? '5. شركات التوصيل وربط API (dzship)' : '5. Sociétés & Clés API (dzship)'}</span>
            {couriers.filter((c) => c.isActive).length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                {couriers.filter((c) => c.isActive).length} active(s)
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Tab 1: Ready to Ship Queue */}
      {activeSubTab === 'queue' && (
        <div className="space-y-6">
          {/* Manifest Creation Panel (Visible when orders exist or are selected) */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-lg border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-sm sm:text-base">
                  {language === 'ar' ? 'إنشاء كشف إرسال جديد (Bordereau)' : 'Créer un Bordereau de Transfert & Expédition'}
                </h3>
              </div>
              <div className="text-xs text-slate-400">
                {selectedOrderIds.length} {language === 'ar' ? 'طرد محدد' : 'colis sélectionné(s)'}
              </div>
            </div>

            <form onSubmit={handleCreateManifest} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                  {language === 'ar' ? 'شركة التوصيل' : 'Transporteur'}
                </label>
                <select
                  value={manifestCarrier}
                  onChange={(e) => setManifestCarrier(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value={CarrierName.YALIDINE}>Yalidine Express</option>
                  <option value={CarrierName.ZR_DISPATCH}>ZR Dispatch (Interne)</option>
                  <option value={CarrierName.MAYSTRO}>Maystro Delivery</option>
                  <option value={CarrierName.KAZITOUR}>Kazitour Express</option>
                  <option value={CarrierName.OTHER}>Autre Transporteur</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                  {language === 'ar' ? 'اسم السائق' : 'Chauffeur / Agent'}
                </label>
                <input
                  type="text"
                  value={manifestDriverName}
                  onChange={(e) => setManifestDriverName(e.target.value)}
                  placeholder="Ex: Amine Yalidine"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                  {language === 'ar' ? 'هاتف السائق' : 'Tél Chauffeur'}
                </label>
                <input
                  type="text"
                  value={manifestDriverPhone}
                  onChange={(e) => setManifestDriverPhone(e.target.value)}
                  placeholder="0550..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                  {language === 'ar' ? 'رقم المركبة' : 'Matricule Véhicule'}
                </label>
                <input
                  type="text"
                  value={manifestPlate}
                  onChange={(e) => setManifestPlate(e.target.value)}
                  placeholder="Ex: 00456-116-16"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={isCreatingManifest || selectedOrderIds.length === 0}
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  <span>
                    {isCreatingManifest
                      ? 'Génération...'
                      : language === 'ar'
                      ? `إنشاء الكشف (${selectedOrderIds.length})`
                      : `Générer le Bordereau (${selectedOrderIds.length})`}
                  </span>
                </button>
              </div>
            </form>
          </div>

          {/* Dzship Fast Batch Dispatch Banner */}
          {selectedOrderIds.length > 0 && (
            <div className="bg-linear-to-r from-blue-900 to-indigo-950 text-white p-4 rounded-2xl border border-blue-700/50 shadow-md flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center shrink-0">
                  <Zap className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <div className="font-bold text-sm">
                    {language === 'ar'
                      ? `إرسال جماعي فوري عبر dzship (${selectedOrderIds.length} طرد محدد)`
                      : `Expédition Groupée Immédiate via dzship (${selectedOrderIds.length} colis)`}
                  </div>
                  <div className="text-xs text-blue-200">
                    {language === 'ar'
                      ? 'إنشاء الطرود مباشرة لدى شركة التوصيل المختارة وتوليد أرقام التتبع'
                      : 'Création directe des colis auprès du transporteur sélectionné avec attribution du code de suivi'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={selectedDispatchCourier}
                  onChange={(e) => setSelectedDispatchCourier(e.target.value)}
                  className="px-3 py-2 bg-blue-950 border border-blue-600 rounded-xl text-xs text-white focus:outline-none"
                >
                  {couriers.map((c) => (
                    <option key={c.id} value={c.courierKey}>
                      {c.name} {c.isActive ? '✓' : '(Inactif)'}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={isBatchDispatching}
                  onClick={handleDispatchBatchSubmit}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-black shadow-md transition-colors inline-flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50 cursor-pointer"
                >
                  {isBatchDispatching ? (
                    <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Zap className="w-3.5 h-3.5 fill-current" />
                  )}
                  <span>{language === 'ar' ? 'تأكيد الإرسال الجماعي' : 'Expédier la sélection'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Queue Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-3.5 rounded-2xl border border-slate-200">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={language === 'ar' ? 'بحث برقم الطلب، اسم العميل، الهاتف...' : 'Rechercher par N° commande, client, téléphone...'}
                className="w-full ps-9 pe-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800"
              />
            </div>

            <div className="w-full sm:w-48">
              <input
                type="text"
                value={wilayaFilter}
                onChange={(e) => setWilayaFilter(e.target.value)}
                placeholder={language === 'ar' ? 'تصفية حسب الولاية...' : 'Filtrer par Wilaya...'}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none text-slate-800"
              />
            </div>

            <div className="w-full sm:w-48">
              <select
                value={carrierFilter}
                onChange={(e) => setCarrierFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none text-slate-800"
              >
                <option value="">{language === 'ar' ? 'جميع الشركات' : 'Tous transporteurs'}</option>
                <option value="Yalidine">Yalidine Express</option>
                <option value="ZR">ZR Dispatch</option>
                <option value="Maystro">Maystro Delivery</option>
                <option value="Kazitour">Kazitour</option>
              </select>
            </div>
          </div>

          {/* Queue Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                    <th className="p-3 text-center w-10">
                      <input
                        type="checkbox"
                        checked={filteredQueue.length > 0 && selectedOrderIds.length === filteredQueue.length}
                        onChange={handleSelectAllQueue}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </th>
                    <th className="p-3">N° Commande</th>
                    <th className="p-3">Client & Contact</th>
                    <th className="p-3">Destination (Wilaya / Commune)</th>
                    <th className="p-3">Type Livraison</th>
                    <th className="p-3 text-center">Articles</th>
                    <th className="p-3 text-right">Montant COD (DA)</th>
                    <th className="p-3">Statut Atelier</th>
                    <th className="p-3 text-right">Expédition dzship</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredQueue.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        {language === 'ar' ? 'لا توجد طلبات بانتظار الشحن حالياً' : 'Aucune commande prête pour expédition pour le moment.'}
                      </td>
                    </tr>
                  ) : (
                    filteredQueue.map((ord) => (
                      <tr
                        key={ord.id}
                        className={`hover:bg-blue-50/40 transition-colors cursor-pointer ${
                          selectedOrderIds.includes(ord.id) ? 'bg-blue-50/70' : ''
                        }`}
                        onClick={() => handleToggleSelectOrder(ord.id)}
                      >
                        <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedOrderIds.includes(ord.id)}
                            onChange={() => handleToggleSelectOrder(ord.id)}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        </td>
                        <td className="p-3 font-mono font-bold text-blue-600">
                          {ord.orderNumber}
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-slate-800">{ord.customerName}</div>
                          <div className="text-[11px] text-slate-400">{ord.customerPhone}</div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1 font-semibold text-slate-800">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span>{ord.shippingWilaya}</span>
                          </div>
                          <div className="text-[11px] text-slate-400">{ord.shippingCommune}</div>
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              ord.deliveryType === DeliveryType.STOP_DESK
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {ord.deliveryType === DeliveryType.STOP_DESK ? 'Stop Desk' : 'Domicile'}
                          </span>
                        </td>
                        <td className="p-3 text-center font-bold text-slate-700">
                          {ord.itemsCount ?? 1}
                        </td>
                        <td className="p-3 text-right font-black text-slate-900">
                          {formatCurrency(ord.total, language)}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold text-[10px]">
                            {ord.status}
                          </span>
                        </td>
                        <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            disabled={dispatchingOrderId === ord.id}
                            onClick={() => handleDispatchSingleOrder(ord.id)}
                            className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[11px] font-bold shadow-xs transition-colors inline-flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                            title="Créer l'expédition auprès du transporteur via dzship"
                          >
                            {dispatchingOrderId === ord.id ? (
                              <RotateCcw className="w-3 h-3 animate-spin" />
                            ) : (
                              <Zap className="w-3 h-3 text-amber-300 fill-amber-300" />
                            )}
                            <span>{language === 'ar' ? 'إرسال' : 'Expédier'}</span>
                          </button>
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

      {/* Tab 2: Manifests & Batches */}
      {activeSubTab === 'manifests' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <th className="p-3">N° Bordereau</th>
                  <th className="p-3">Transporteur</th>
                  <th className="p-3 text-center">Nombre de Colis</th>
                  <th className="p-3 text-right">Valeur COD Totale</th>
                  <th className="p-3">Chauffeur / Véhicule</th>
                  <th className="p-3">Statut</th>
                  <th className="p-3">Date d'Expédition</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {manifests.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      {language === 'ar' ? 'لا توجد كشوف إرسال حالياً' : 'Aucun bordereau d\'expédition enregistré.'}
                    </td>
                  </tr>
                ) : (
                  manifests.map((man) => (
                    <tr key={man.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-3 font-mono font-bold text-blue-600">
                        {man.manifestNumber}
                      </td>
                      <td className="p-3 font-semibold text-slate-800">
                        {man.carrier}
                      </td>
                      <td className="p-3 text-center font-bold text-slate-900">
                        {man.totalParcels}
                      </td>
                      <td className="p-3 text-right font-black text-emerald-600">
                        {formatCurrency(man.totalCodAmount, language)}
                      </td>
                      <td className="p-3 text-slate-600">
                        <div>{man.driverName || 'Non spécifié'}</div>
                        <div className="text-[10px] text-slate-400">{man.driverPhone || man.vehiclePlate || '-'}</div>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            man.status === ManifestStatus.COMPLETED
                              ? 'bg-emerald-100 text-emerald-800'
                              : man.status === ManifestStatus.DISPATCHED
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          {man.status}
                        </span>
                      </td>
                      <td className="p-3 text-slate-500">
                        {formatDateTime(man.dispatchedAt || man.createdAt, language)}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setPrintManifestModal(man)}
                            title="Voir les colis"
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Package className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setPrintManifestModal(man)}
                            title="Imprimer Bordereau A4"
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {canAccessFinance && man.status !== ManifestStatus.COMPLETED && (
                            <button
                              type="button"
                              onClick={() => setRemitManifest(man)}
                              title="Encaisser Versement COD"
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition-colors inline-flex items-center gap-1 shadow-xs"
                            >
                              <Coins className="w-3.5 h-3.5" />
                              <span>{language === 'ar' ? 'إيداع COD' : 'Encaisser COD'}</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Parcel In-Transit Tracker */}
      {activeSubTab === 'tracking' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-3.5 rounded-2xl border border-slate-200">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={language === 'ar' ? 'بحث برقم التتبع أو رقم الطلب أو الهاتف...' : 'Recherche par N° de suivi (Tracking), commande, téléphone...'}
                className="w-full ps-9 pe-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none text-slate-800"
              />
            </div>

            <div className="w-full sm:w-48">
              <input
                type="text"
                value={wilayaFilter}
                onChange={(e) => setWilayaFilter(e.target.value)}
                placeholder={language === 'ar' ? 'تصفية حسب الولاية...' : 'Filtrer par Wilaya...'}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none text-slate-800"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                    <th className="p-3">N° Suivi (Tracking)</th>
                    <th className="p-3">N° Commande</th>
                    <th className="p-3">Client & Tél</th>
                    <th className="p-3">Wilaya / Commune</th>
                    <th className="p-3">Transporteur</th>
                    <th className="p-3 text-right">Montant COD</th>
                    <th className="p-3">Statut Livraison</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTracking.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        {language === 'ar' ? 'لا توجد شحنات مطابقة' : 'Aucun colis en transit trouvé.'}
                      </td>
                    </tr>
                  ) : (
                    filteredTracking.map((ord) => (
                      <tr key={ord.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-3 font-mono font-bold text-slate-900">
                          {ord.trackingNumber ? (
                            <button
                              type="button"
                              onClick={() => handleOpenLiveTracking(ord.trackingNumber!, ord.deliveryCompany || undefined, ord.orderNumber)}
                              className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 hover:text-blue-900 rounded font-mono text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer group"
                              title="Suivre en direct auprès du transporteur via dzship"
                            >
                              <span>{ord.trackingNumber}</span>
                              <ExternalLink className="w-3 h-3 text-blue-500 group-hover:scale-110 transition-transform" />
                            </button>
                          ) : (
                            <span className="text-slate-400 italic">En attente</span>
                          )}
                        </td>
                        <td className="p-3 font-mono font-bold text-blue-600">{ord.orderNumber}</td>
                        <td className="p-3">
                          <div className="font-semibold text-slate-800">{ord.customerName}</div>
                          <div className="text-[11px] text-slate-400">{ord.customerPhone}</div>
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-slate-800">{ord.shippingWilaya}</div>
                          <div className="text-[11px] text-slate-400">{ord.shippingCommune}</div>
                        </td>
                        <td className="p-3 font-semibold text-slate-700">{ord.deliveryCompany || 'Standard'}</td>
                        <td className="p-3 text-right font-black text-slate-900">
                          {formatCurrency(ord.total, language)}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              ord.status === OrderStatus.DELIVERED
                                ? 'bg-emerald-100 text-emerald-800'
                                : ord.status === OrderStatus.RETURNED
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {ord.status}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {ord.trackingNumber && (
                              <button
                                type="button"
                                onClick={() => handleOpenLiveTracking(ord.trackingNumber!, ord.deliveryCompany || undefined, ord.orderNumber)}
                                title="Suivi en direct dzship"
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <Globe className="w-4 h-4" />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => setPrintLabelModal(ord)}
                              title="Étiquette Thermique 10x15cm"
                              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                              <Barcode className="w-4 h-4" />
                            </button>

                            {ord.status === 'SHIPPED' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleMarkDelivered(ord)}
                                  title="Marquer comme Livré"
                                  className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReturnOrderModal(ord);
                                    setReturnReason('');
                                  }}
                                  title="Signaler Retour"
                                  className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
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

      {/* Tab 4: 58 Wilayas Matrix */}
      {activeSubTab === 'rates' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                {language === 'ar' ? 'الجدول الوطني لتعريفات الشحن (58 ولاية)' : 'Grille Tarifaire Nationale de Livraison (58 Wilayas)'}
              </h3>
              <p className="text-xs text-slate-500">
                {language === 'ar' ? 'تسعيرة التوصيل إلى غاية المنزل والتوصيل في مكتب الاستلام' : 'Frais de livraison à Domicile et en Point Relais / Stop-Desk'}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
                <tr className="text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <th className="p-3">Code</th>
                  <th className="p-3">Wilaya (Français)</th>
                  <th className="p-3">الولاية (العربية)</th>
                  <th className="p-3 text-center">Zone</th>
                  <th className="p-3 text-right">Tarif Domicile</th>
                  <th className="p-3 text-right">Tarif Stop Desk</th>
                  {isAdmin && <th className="p-3 text-center">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rates.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50">
                    <td className="p-3 font-mono font-bold text-blue-600">{r.wilayaCode.toString().padStart(2, '0')}</td>
                    <td className="p-3 font-semibold text-slate-900">{r.wilayaName}</td>
                    <td className="p-3 text-slate-600">{r.wilayaName}</td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px]">
                        Zone {r.zoneNumber}
                      </span>
                    </td>
                    <td className="p-3 text-right font-black text-slate-900">{formatCurrency(r.feeDomicile, language)}</td>
                    <td className="p-3 text-right font-black text-slate-600">{formatCurrency(r.feeStopDesk, language)}</td>
                    {isAdmin && (
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setEditRate(r);
                            setEditDomFee(r.feeDomicile);
                            setEditDeskFee(r.feeStopDesk);
                          }}
                          className="px-2.5 py-1 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors"
                        >
                          Modifier
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 5: dzship Couriers & API Keys Management */}
      {activeSubTab === 'couriers' && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="bg-linear-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-800 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0">
                  <Key className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black tracking-tight text-white">
                      {language === 'ar'
                        ? 'ربط وتكامل شركات التوصيل الجزائرية (dzship API)'
                        : 'Intégration des Sociétés de Livraison Algériennes (dzship API)'}
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                      dzship v1
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                    {language === 'ar'
                      ? 'قم بربط حساباتك المباشرة لدى شركات التوصيل (Elogistia, ZR Express, Ecom Delivery, Yalidine) لتوليد أرقام التتبع، بطاقات الطرود الحرارية والتتبع اللحظي عبر 58 ولاية بدون وسيط.'
                      : 'Connectez directement vos comptes professionnels (Elogistia, ZR Express, Ecom Delivery, Yalidine) pour la génération d\'étiquettes, le suivi en direct et le calcul des tarifs 58 wilayas sans intermédiaire.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <a
                  href="https://github.com/DZBuild-com/dzship"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-colors inline-flex items-center gap-1.5"
                >
                  <Globe className="w-3.5 h-3.5 text-blue-400" />
                  <span>Documentation dzship</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
              </div>
            </div>

            {/* Quick Status Bar */}
            <div className="pt-4 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-700/50">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">
                  {language === 'ar' ? 'الشركات المفعلة' : 'Transporteurs Actifs'}
                </span>
                <span className="text-sm font-black text-emerald-400">
                  {couriers.filter((c) => c.isActive).length} / {couriers.length}
                </span>
              </div>

              <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-700/50">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">
                  {language === 'ar' ? 'الشركة الافتراضية' : 'Transporteur par Défaut'}
                </span>
                <span className="text-sm font-black text-amber-400">
                  {couriers.find((c) => c.isDefault)?.name || 'Aucun'}
                </span>
              </div>

              <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-700/50">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">
                  {language === 'ar' ? 'حماية المفاتيح' : 'Chiffrement Clés'}
                </span>
                <span className="text-sm font-black text-blue-400 inline-flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                  <span>SQLite Local</span>
                </span>
              </div>

              <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-700/50">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">
                  {language === 'ar' ? 'البوابة الوطنية' : 'Passerelle'}
                </span>
                <span className="text-sm font-black text-purple-400">
                  freeship.dzbuild.com
                </span>
              </div>
            </div>
          </div>

          {/* Couriers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {couriers.map((courier) => {
              const testRes = courierTestResults[courier.courierKey];
              const isTesting = testingCourierKey === courier.courierKey;
              const isSaving = savingCourierKey === courier.courierKey;
              const localCreds = courierFormCreds[courier.courierKey] || {};

              // Determine fields needed based on courierKey
              const credentialFields: { key: string; label: string; placeholder: string; helper?: string }[] = [];
              if (courier.courierKey === 'elogistia') {
                credentialFields.push({
                  key: 'apiKey',
                  label: language === 'ar' ? 'مفتاح API الخاص بـ Elogistia (API Key)' : 'Clé API Privée Elogistia (apiKey)',
                  placeholder: 'Ex: elog_live_xxxxxxxxxxxxxxxxxxxxxxxx',
                  helper: language === 'ar' ? 'تجد هذا المفتاح في لوحة تحكم elogistia.dz (Paramètres API).' : 'Générée depuis votre espace entreprise sur elogistia.dz.',
                });
              } else if (courier.courierKey === 'zrexpress') {
                credentialFields.push(
                  {
                    key: 'token',
                    label: language === 'ar' ? 'رمز التوثيق Procolis (Token)' : 'Token d\'Authentification Procolis (token)',
                    placeholder: 'Ex: eyJhbGciOiJIUzI1NiIsInR5cCI6...',
                    helper: language === 'ar' ? 'رمز Token الحساب الخاص بك في منصة Procolis ZR Express.' : 'Token JWT fourni dans l\'interface Procolis ZR Express.',
                  },
                  {
                    key: 'key',
                    label: language === 'ar' ? 'المفتاح السري Procolis (Key)' : 'Clé Secrète Procolis (key)',
                    placeholder: 'Ex: zr_sec_xxxxxxxxxxxxxxxx',
                    helper: language === 'ar' ? 'المفتاح السري المرفق بحساب Procolis.' : 'Clé secrète associée au compte Procolis.',
                  }
                );
              } else if (courier.courierKey === 'zrexpressnew') {
                credentialFields.push(
                  {
                    key: 'apiKey',
                    label: language === 'ar' ? 'مفتاح API المنصة الجديدة (API Key)' : 'Clé API Plateforme Nouvelle (apiKey)',
                    placeholder: 'Ex: zr_live_xxxxxxxxxxxxxxxx',
                    helper: language === 'ar' ? 'مفتاح API الممنوح على المنصة الجديدة لـ ZR Express.' : 'Clé API de la nouvelle plateforme ZR Express.',
                  },
                  {
                    key: 'tenantId',
                    label: language === 'ar' ? 'معرف الشركة (Tenant ID)' : 'Identifiant Entreprise (tenantId)',
                    placeholder: 'Ex: 10045 ou uuid-entreprise',
                    helper: language === 'ar' ? 'معرف حساب شركتك على النظام الجديد.' : 'ID unique attribué à votre entreprise.',
                  }
                );
              } else if (courier.courierKey === 'ecomdelivery') {
                credentialFields.push(
                  {
                    key: 'apiKey',
                    label: language === 'ar' ? 'مفتاح API لـ Ecom Delivery (API Key)' : 'Clé API Ecom Delivery (apiKey)',
                    placeholder: 'Ex: ecom_live_xxxxxxxxxxxxxxxx',
                    helper: language === 'ar' ? 'مفتاح حسابك على ecomdelivery.net.' : 'Clé API de votre compte marchand ecomdelivery.net.',
                  },
                  {
                    key: 'apiToken',
                    label: language === 'ar' ? 'رمز الجلسة (API Token)' : 'Token d\'Accès Ecom Delivery (apiToken)',
                    placeholder: 'Ex: tok_xxxxxxxxxxxxxxxx',
                    helper: language === 'ar' ? 'رمز التوثيق الإضافي apiToken.' : 'Token d\'accès supplémentaire pour requêtes sécurisées.',
                  }
                );
              } else if (courier.courierKey === 'yalidine') {
                credentialFields.push(
                  {
                    key: 'apiId',
                    label: language === 'ar' ? 'معرف API لـ Yalidine (API ID)' : 'Identifiant API Yalidine (apiId)',
                    placeholder: 'Ex: 485930219485',
                    helper: language === 'ar' ? 'معرف الحساب من بوابة المطورين Yalidine.' : 'ID API généré depuis le portail développeur Yalidine.',
                  },
                  {
                    key: 'apiToken',
                    label: language === 'ar' ? 'رمز API لـ Yalidine (API Token)' : 'Token API Yalidine (apiToken)',
                    placeholder: 'Ex: yali_tok_xxxxxxxxxxxxxxxx',
                    helper: language === 'ar' ? 'رمز Token السري للربط البرمجي.' : 'Jeton API secret délivré par Yalidine.',
                  }
                );
              }

              return (
                <div
                  key={courier.id}
                  className={`bg-white rounded-2xl border transition-all p-5 flex flex-col justify-between space-y-4 shadow-xs ${
                    courier.isActive
                      ? 'border-slate-300 ring-1 ring-slate-200'
                      : 'border-slate-200 opacity-90'
                  }`}
                >
                  <div className="space-y-4">
                    {/* Card Header */}
                    <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                            courier.courierKey === 'elogistia'
                              ? 'bg-amber-100 text-amber-800'
                              : courier.courierKey === 'zrexpress' || courier.courierKey === 'zrexpressnew'
                              ? 'bg-blue-100 text-blue-800'
                              : courier.courierKey === 'ecomdelivery'
                              ? 'bg-emerald-100 text-emerald-800'
                              : courier.courierKey === 'yalidine'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          <Truck className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-black text-slate-900 text-sm">{courier.name}</h3>
                            {courier.isDefault && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 inline-flex items-center gap-1">
                                <span>⭐</span>
                                <span>{language === 'ar' ? 'افتراضي' : 'Défaut'}</span>
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono">
                            code: {courier.courierKey}
                          </span>
                        </div>
                      </div>

                      {/* Active Toggle & Default Button */}
                      <div className="flex items-center gap-2">
                        {!courier.isDefault && courier.isActive && (
                          <button
                            type="button"
                            onClick={() => handleSaveCourier(courier, { isDefault: true })}
                            className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold underline cursor-pointer"
                          >
                            {language === 'ar' ? 'جعله افتراضياً' : 'Par défaut'}
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleSaveCourier(courier, { isActive: !courier.isActive })}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer ${
                            courier.isActive
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${courier.isActive ? 'bg-emerald-600' : 'bg-slate-400'}`} />
                          <span>{courier.isActive ? (language === 'ar' ? 'مفعل' : 'Actif') : (language === 'ar' ? 'معطل' : 'Inactif')}</span>
                        </button>
                      </div>
                    </div>

                    {/* Form Fields: Credentials */}
                    {credentialFields.length === 0 ? (
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
                        <span className="font-bold block text-slate-800">Mode Sandbox officiel</span>
                        Ce profil de test permet de simuler la création de colis et le calcul des tarifs sans nécessiter de clés API réelles.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {credentialFields.map((field) => {
                          const showKeyId = `${courier.courierKey}_${field.key}`;
                          const isShowing = !!showKeys[showKeyId];
                          const hasSavedCred = !!courier.credentials?.[field.key];
                          const currentValue =
                            localCreds[field.key] !== undefined
                              ? localCreds[field.key]
                              : (hasSavedCred ? '••••••••••••••••' : '');

                          return (
                            <div key={field.key} className="space-y-1">
                              <div className="flex items-center justify-between">
                                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                                  {field.label}
                                </label>
                                {hasSavedCred && localCreds[field.key] === undefined && (
                                  <span className="text-[10px] text-emerald-600 font-semibold inline-flex items-center gap-1">
                                    <Check className="w-3 h-3" />
                                    <span>{language === 'ar' ? 'تم الحفظ' : 'Configuré'}</span>
                                  </span>
                                )}
                              </div>

                              <div className="relative">
                                <input
                                  type={isShowing ? 'text' : 'password'}
                                  value={currentValue}
                                  onChange={(e) => handleCredentialChange(courier.courierKey, field.key, e.target.value)}
                                  onFocus={(e) => {
                                    if (e.target.value.includes('••••')) {
                                      handleCredentialChange(courier.courierKey, field.key, '');
                                    }
                                  }}
                                  placeholder={field.placeholder}
                                  className="w-full ps-3 pe-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowKeys((prev) => ({ ...prev, [showKeyId]: !isShowing }))}
                                  className="absolute end-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                                >
                                  {isShowing ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                              </div>
                              {field.helper && (
                                <p className="text-[10px] text-slate-400">{field.helper}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Common Parameters: From Wilaya & Default Delivery Type */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                          {language === 'ar' ? 'ولاية الانطلاق (Expéditeur)' : 'Wilaya Source Expéditeur'}
                        </label>
                        <select
                          value={courier.fromWilaya || 16}
                          onChange={(e) => handleSaveCourier(courier, { fromWilaya: parseInt(e.target.value, 10) })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none"
                        >
                          {ALGERIA_WILAYAS.map((w) => (
                            <option key={w.code} value={w.code}>
                              {w.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                          {language === 'ar' ? 'نوع التوصيل الافتراضي' : 'Livraison par Défaut'}
                        </label>
                        <select
                          value={courier.defaultDeliveryType || 'home'}
                          onChange={(e) => handleSaveCourier(courier, { defaultDeliveryType: e.target.value as 'home' | 'stopdesk' })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none"
                        >
                          <option value="home">À Domicile (المنزل)</option>
                          <option value="stopdesk">Stop-Desk / Point Relais (المكتب)</option>
                        </select>
                      </div>
                    </div>

                    {/* Test Results Message Banner */}
                    {testRes && (
                      <div
                        className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                          testRes.success
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            : 'bg-rose-50 border-rose-200 text-rose-800'
                        }`}
                      >
                        {testRes.success ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <div className="font-bold">{testRes.message}</div>
                          {testRes.ratesCount !== undefined && testRes.ratesCount > 0 && (
                            <div className="text-[11px] text-emerald-700 mt-0.5">
                              {testRes.ratesCount} wilayas connectées et prêtes pour expédition.
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions: Test Connection & Save */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      disabled={isTesting}
                      onClick={() => handleTestCourier(courier.courierKey)}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      title="Vérifier la validité des clés auprès du serveur dzship"
                    >
                      {isTesting ? (
                        <RotateCcw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                      ) : (
                        <Zap className="w-3.5 h-3.5 text-amber-500" />
                      )}
                      <span>{language === 'ar' ? 'اختبار الاتصال' : 'Tester la connexion'}</span>
                    </button>

                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => handleSaveCourier(courier)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isSaving ? (
                        <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      <span>{language === 'ar' ? 'حفظ الإعدادات' : 'Sauvegarder'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL: Printable Manifest A4 */}
      {printManifestModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-sm text-slate-900">
                  {language === 'ar' ? 'معاينة وطباعة كشف الإرسال' : 'Bordereau de Transfert & Expédition A4'}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimer</span>
                </button>
                <button onClick={() => setPrintManifestModal(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 text-slate-900">
              {/* Printable Header */}
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
                <div>
                  <h1 className="text-xl font-black tracking-tight">ZR FACTORY PRINT-ON-DEMAND</h1>
                  <p className="text-xs text-slate-600">Atelier de Sérigraphie & Impression DTF - Alger</p>
                  <p className="text-xs text-slate-600">Contact: 0550 00 00 00 • info@zrfactory.dz</p>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Bordereau d'Expédition</div>
                  <div className="text-lg font-black text-blue-600 font-mono">{printManifestModal.manifestNumber}</div>
                  <div className="text-xs text-slate-600">{formatDateTime(printManifestModal.createdAt, 'fr')}</div>
                </div>
              </div>

              {/* Manifest Info Blocks */}
              <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 font-bold block uppercase text-[10px]">Transporteur</span>
                  <span className="font-bold text-slate-900 text-sm">{printManifestModal.carrier}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold block uppercase text-[10px]">Chauffeur / Véhicule</span>
                  <span className="font-bold text-slate-900">
                    {printManifestModal.driverName || '-'} ({printManifestModal.driverPhone || printManifestModal.vehiclePlate || '-'})
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 font-bold block uppercase text-[10px]">Total COD à Recouvrer</span>
                  <span className="font-black text-emerald-600 text-base">
                    {formatCurrency(printManifestModal.totalCodAmount, 'fr')}
                  </span>
                </div>
              </div>

              {/* Manifest Items Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <th className="p-2.5">N°</th>
                      <th className="p-2.5">Code Suivi</th>
                      <th className="p-2.5">N° Commande</th>
                      <th className="p-2.5">Destinataire</th>
                      <th className="p-2.5">Wilaya / Commune</th>
                      <th className="p-2.5">Type</th>
                      <th className="p-2.5 text-right">Montant COD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {(printManifestModal.orders || []).map((ord, idx) => (
                      <tr key={ord.id}>
                        <td className="p-2 font-bold text-slate-500">{idx + 1}</td>
                        <td className="p-2 font-mono font-bold text-slate-800">{ord.trackingNumber || '-'}</td>
                        <td className="p-2 font-mono text-blue-600">{ord.orderNumber}</td>
                        <td className="p-2">
                          <div className="font-bold">{ord.customerName}</div>
                          <div className="text-[10px] text-slate-500">{ord.customerPhone}</div>
                        </td>
                        <td className="p-2">{ord.shippingWilaya} - {ord.shippingCommune}</td>
                        <td className="p-2 text-[10px] font-bold">{ord.deliveryType}</td>
                        <td className="p-2 text-right font-black text-slate-900">{formatCurrency(ord.total, 'fr')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-200 text-xs">
                <div className="space-y-12">
                  <span className="font-bold uppercase tracking-wider text-slate-600">Cachet & Signature ZR Factory :</span>
                  <div className="border-b border-dashed border-slate-400 h-8" />
                </div>
                <div className="space-y-12 text-right">
                  <span className="font-bold uppercase tracking-wider text-slate-600">Signature Réception Chauffeur :</span>
                  <div className="border-b border-dashed border-slate-400 h-8" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Thermal Shipping Parcel Sticker (10x15cm) */}
      {printLabelModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <span className="text-xs font-bold text-slate-700">Étiquette Thermique 10x15cm</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1 shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimer</span>
                </button>
                <button onClick={() => setPrintLabelModal(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* The 10x15cm Label Representation */}
            <div className="p-4 bg-white text-slate-900 space-y-3 font-sans border-2 border-slate-900 m-4 rounded-lg">
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2">
                <div>
                  <span className="font-black text-sm tracking-tight block">ZR FACTORY</span>
                  <span className="text-[10px] text-slate-600 block">Atelier DTF Alger • 0550 00 00 00</span>
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 bg-slate-900 text-white text-[10px] font-black uppercase rounded">
                    {printLabelModal.deliveryCompany || 'Yalidine'}
                  </span>
                </div>
              </div>

              {/* Barcode representation */}
              <div className="text-center py-2 bg-slate-50 border border-slate-200 rounded">
                <div className="font-mono text-xl font-black tracking-widest text-slate-900">
                  ||| | |||| | ||| || |||
                </div>
                <div className="font-mono text-xs font-bold text-slate-700 pt-1">
                  {printLabelModal.trackingNumber || printLabelModal.orderNumber}
                </div>
              </div>

              {/* Recipient Details */}
              <div className="space-y-1 text-xs border-b border-slate-300 pb-2">
                <div className="text-[10px] font-bold text-slate-400 uppercase">DESTINATAIRE / العميل :</div>
                <div className="font-black text-sm text-slate-900">{printLabelModal.customerName}</div>
                <div className="font-bold text-slate-800 text-xs">📞 {printLabelModal.customerPhone}</div>
                <div className="pt-1">
                  <span className="px-1.5 py-0.5 bg-slate-200 text-slate-900 font-black rounded text-xs inline-block">
                    {printLabelModal.shippingWilaya}
                  </span>
                  <span className="font-bold text-slate-700 ms-1.5">{printLabelModal.shippingCommune}</span>
                </div>
                {printLabelModal.shippingAddress && (
                  <p className="text-[11px] text-slate-600 italic pt-0.5">{printLabelModal.shippingAddress}</p>
                )}
              </div>

              {/* Big COD Amount Box */}
              <div className="p-2.5 bg-amber-50 border-2 border-amber-400 rounded-lg text-center">
                <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                  MONTANT À ENCAISSER / الدفع عند الاستلام
                </div>
                <div className="text-xl font-black text-amber-700 pt-0.5">
                  {formatCurrency(printLabelModal.total, 'fr')}
                </div>
              </div>

              <div className="flex justify-between text-[10px] text-slate-400 pt-1">
                <span>Réf: {printLabelModal.orderNumber}</span>
                <span>Type: {printLabelModal.deliveryType}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: COD Remittance to Cash Account */}
      {remitManifest && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-emerald-50">
              <div className="flex items-center gap-2 text-emerald-800">
                <Coins className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-base">
                  {language === 'ar' ? 'إيداع مبالغ الدفع عند الاستلام (COD)' : 'Encaisser le Versement COD'}
                </h3>
              </div>
              <button onClick={() => setRemitManifest(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitRemitCOD} className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="font-bold text-slate-900">Bordereau : {remitManifest.manifestNumber}</div>
                <div className="text-slate-600">Transporteur : {remitManifest.carrier}</div>
                <div className="font-black text-emerald-600 text-sm pt-1">
                  Valeur COD estimée : {formatCurrency(remitManifest.totalCodAmount, language)}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold uppercase tracking-wider text-slate-700">
                  {language === 'ar' ? 'حساب الخزينة المستقبل' : 'Compte de Trésorerie de Réception'}
                </label>
                <select
                  required
                  value={remitCashAccountId}
                  onChange={(e) => setRemitCashAccountId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  {cashAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({formatCurrency(acc.balance, language)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRemitManifest(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRemit || !remitCashAccountId}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSubmittingRemit ? 'En cours...' : 'Confirmer l\'Encaissement'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Return Order & Restock */}
      {returnOrderModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-rose-50">
              <div className="flex items-center gap-2 text-rose-800">
                <RotateCcw className="w-5 h-5 text-rose-600" />
                <h3 className="font-bold text-base">
                  {language === 'ar' ? 'تسجيل طرد مرتجع (Retour Colis)' : 'Enregistrer le Retour du Colis'}
                </h3>
              </div>
              <button onClick={() => setReturnOrderModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitReturn} className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="font-bold text-blue-600 font-mono">{returnOrderModal.orderNumber}</div>
                <div className="text-slate-800 font-semibold">{returnOrderModal.customerName} • {returnOrderModal.shippingWilaya}</div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold uppercase tracking-wider text-slate-700">
                  {language === 'ar' ? 'سبب الإرجاع' : 'Motif du Retour'}
                </label>
                <textarea
                  rows={3}
                  required
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="Ex: Client injoignable après 3 appels, adresse erronée, refus du colis..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <input
                  type="checkbox"
                  id="restockCheck"
                  checked={returnRestock}
                  onChange={(e) => setReturnRestock(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="restockCheck" className="font-semibold text-slate-800 cursor-pointer">
                  {language === 'ar' ? 'إعادة القطع لمخزون المنتجات التامة' : 'Réintégrer automatiquement les articles en stock'}
                </label>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReturnOrderModal(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReturn || !returnReason.trim()}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50"
                >
                  {isSubmittingReturn ? 'Enregistrement...' : 'Confirmer le Retour'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Edit Shipping Rate */}
      {editRate && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-sm text-slate-900">
                Modifier Tarifs - {editRate.wilayaName} ({editRate.wilayaCode})
              </h3>
              <button onClick={() => setEditRate(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRate} className="p-6 space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold uppercase tracking-wider text-slate-700">Tarif Domicile (DA)</label>
                <input
                  type="number"
                  required
                  min={0}
                  step={50}
                  value={editDomFee}
                  onChange={(e) => setEditDomFee(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold uppercase tracking-wider text-slate-700">Tarif Stop Desk (DA)</label>
                <input
                  type="number"
                  required
                  min={0}
                  step={50}
                  value={editDeskFee}
                  onChange={(e) => setEditDeskFee(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditRate(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition-colors"
                >
                  Sauvegarder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: dzship Live Parcel Tracking */}
      {trackingModalData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    {language === 'ar' ? 'تتبع الشحنة المباشر (dzship Live)' : 'Suivi du Colis en Temps Réel'}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    N° {trackingModalData.trackingNumber} {trackingModalData.orderNumber ? `• Commande ${trackingModalData.orderNumber}` : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenLiveTracking(trackingModalData.trackingNumber, trackingModalData.courier, trackingModalData.orderNumber)}
                  disabled={trackingLoading}
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 transition-colors"
                  title="Rafraîchir le suivi"
                >
                  <RotateCcw className={`w-4 h-4 ${trackingLoading ? 'animate-spin' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={() => setTrackingModalData(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              {trackingLoading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-500">
                  <RotateCcw className="w-8 h-8 animate-spin text-blue-600" />
                  <span className="text-xs font-semibold">
                    {language === 'ar' ? 'جاري الاستعلام من خادم شركة التوصيل عبر dzship...' : 'Interrogation de l\'API du transporteur via dzship...'}
                  </span>
                </div>
              ) : trackingError ? (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2 text-rose-800 text-xs">
                  <div className="flex items-center gap-2 font-bold">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>{language === 'ar' ? 'تعذر جلب بيانات التتبع' : 'Erreur de Suivi Transporteur'}</span>
                  </div>
                  <p>{trackingError}</p>
                  <p className="text-[11px] text-rose-600">
                    {language === 'ar'
                      ? 'تأكد من صحة رقم التتبع وتفعيل مفاتيح API الخاصة بالشركة في قسم "شركات التوصيل".'
                      : 'Vérifiez la validité du code de suivi ou la configuration des clés API dans l\'onglet "Sociétés & Clés API".'}
                  </p>
                </div>
              ) : trackingResult ? (
                <div className="space-y-4">
                  {/* Status Banner */}
                  <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-blue-600 uppercase font-bold block">
                        Statut Actuel
                      </span>
                      <span className="text-sm font-black text-blue-900">
                        {trackingResult.status}
                      </span>
                    </div>
                    {trackingResult.courier && (
                      <span className="px-2.5 py-1 bg-white border border-blue-200 rounded-lg text-xs font-bold text-slate-800">
                        {trackingResult.courier}
                      </span>
                    )}
                  </div>

                  {/* Tracking Timeline */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      {language === 'ar' ? 'سجل الأحداث والمحطات' : 'Historique des Événements'}
                    </h4>

                    {(!trackingResult.events || trackingResult.events.length === 0) ? (
                      <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-400">
                        {language === 'ar' ? 'لا توجد محطات مسجلة بعد' : 'Aucun événement détaillé disponible pour ce colis.'}
                      </div>
                    ) : (
                      <div className="relative ps-6 space-y-4 before:absolute before:start-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                        {trackingResult.events.map((evt, idx) => (
                          <div key={idx} className="relative space-y-0.5">
                            <div className="absolute -start-6 top-1 w-3.5 h-3.5 rounded-full bg-blue-600 border-2 border-white shadow-xs" />
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-slate-900">{evt.status}</span>
                              {evt.timestamp && (
                                <span className="text-[10px] text-slate-400">{evt.timestamp}</span>
                              )}
                            </div>
                            {evt.rawStatus && evt.rawStatus !== evt.status && (
                              <p className="text-[11px] text-slate-600">{evt.rawStatus}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShippingPage;
