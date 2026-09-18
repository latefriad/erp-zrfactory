import Database from 'better-sqlite3';
import { getDatabase } from '../db/connection';
import { NotFoundError, ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';
import { 
  CourierConfiguration, 
  DzshipTrackingResult, 
  DzshipDispatchResult,
  OrderStatus 
} from '@zr-erp/shared';

const DZSHIP_BASE_URL = 'https://freeship.dzbuild.com';

export interface CourierCredentialsInput {
  apiKey?: string;
  apiToken?: string;
  apiId?: string;
  token?: string;
  key?: string;
  tenantId?: string;
  [k: string]: string | undefined;
}

export const SUPPORTED_COURIERS: Array<{
  key: string;
  name: string;
  description: string;
  requiredFields: Array<{ key: string; label: string; placeholder: string; type?: string }>;
}> = [
  {
    key: 'elogistia',
    name: 'Elogistia',
    description: 'Plateforme Elogistia Express avec suivi en direct et étiquettes thermiques.',
    requiredFields: [
      { key: 'apiKey', label: 'Clé API (apiKey)', placeholder: 'Collez votre clé API Elogistia ici', type: 'password' }
    ]
  },
  {
    key: 'zrexpress',
    name: 'ZR Express (Procolis)',
    description: 'Réseau ZR Express / Procolis classique (abexexpress, colilog, flashdelivery).',
    requiredFields: [
      { key: 'token', label: 'Token Client', placeholder: 'Token de votre compte ZR Express', type: 'password' },
      { key: 'key', label: 'Clé Secrète (Key)', placeholder: 'Clé secrète Procolis', type: 'password' }
    ]
  },
  {
    key: 'zrexpressnew',
    name: 'ZR Express (Nouvelle Plateforme)',
    description: 'Nouvelle infrastructure API api.zrexpress.app.',
    requiredFields: [
      { key: 'apiKey', label: 'Clé API (apiKey)', placeholder: 'Clé API ZR Express App', type: 'password' },
      { key: 'tenantId', label: 'ID Locataire (tenantId)', placeholder: 'Ex: 1045' }
    ]
  },
  {
    key: 'ecomdelivery',
    name: 'Ecom Delivery',
    description: 'Réseau de livraison Ecom-dz avec webhook et suivi unifié.',
    requiredFields: [
      { key: 'apiKey', label: 'Clé API (apiKey)', placeholder: 'Clé API Ecom Delivery', type: 'password' },
      { key: 'apiToken', label: 'Token API (apiToken)', placeholder: 'Token API Ecom Delivery', type: 'password' }
    ]
  },
  {
    key: 'yalidine',
    name: 'Yalidine Express',
    description: 'Le réseau national Yalidine (58 wilayas et réseau Stop-Desk).',
    requiredFields: [
      { key: 'apiId', label: 'API ID', placeholder: 'Ex: 294819481' },
      { key: 'apiToken', label: 'API Token', placeholder: 'Token secret Yalidine', type: 'password' }
    ]
  },
  {
    key: 'sandbox',
    name: 'Mode Test (Sandbox)',
    description: 'Environnement de simulation officiel dzship. Ne crée aucun vrai colis mais valide les formats.',
    requiredFields: []
  }
];

// 58 Algerian Wilayas lookup
export const WILAYAS_MAP: Record<number, string> = {
  1: 'Adrar', 2: 'Chlef', 3: 'Laghouat', 4: 'Oum El Bouaghi', 5: 'Batna',
  6: 'Béjaïa', 7: 'Biskra', 8: 'Béchar', 9: 'Blida', 10: 'Bouira',
  11: 'Tamanrasset', 12: 'Tébessa', 13: 'Tlemcen', 14: 'Tiaret', 15: 'Tizi Ouzou',
  16: 'Alger', 17: 'Djelfa', 18: 'Jijel', 19: 'Sétif', 20: 'Saïda',
  21: 'Skikda', 22: 'Sidi Bel Abbès', 23: 'Annaba', 24: 'Guelma', 25: 'Constantine',
  26: 'Médéa', 27: 'Mostaganem', 28: "M'Sila", 29: 'Mascara', 30: 'Ouargla',
  31: 'Oran', 32: 'El Bayadh', 33: 'Illizi', 34: 'Bordj Bou Arréridj', 35: 'Boumerdès',
  36: 'El Tarf', 37: 'Tindouf', 38: 'Tissemsilt', 39: 'El Oued', 40: 'Khenchela',
  41: 'Souk Ahras', 42: 'Tipaza', 43: 'Mila', 44: 'Aïn Defla', 45: 'Naâma',
  46: 'Aïn Témouchent', 47: 'Ghardaïa', 48: 'Relizane', 49: "El M'Ghair", 50: 'El Menia',
  51: 'Ouled Djellal', 52: 'Bordj Baji Mokhtar', 53: 'Béni Abbès', 54: 'Timimoun', 55: 'Touggourt',
  56: 'Djanet', 57: 'In Salah', 58: 'In Guezzam'
};

export class DzshipService {
  private customDb?: Database.Database;

  constructor(db?: Database.Database) {
    this.customDb = db;
  }

  private get db(): Database.Database {
    return this.customDb || getDatabase();
  }

  /**
   * Helper: Mask secret string values for security in frontend
   */
  private maskSecret(val?: string): string {
    if (!val || typeof val !== 'string') return '';
    const trimmed = val.trim();
    if (trimmed.length <= 6) return '••••••••';
    return `${trimmed.substring(0, 3)}••••••••${trimmed.substring(trimmed.length - 3)}`;
  }

  /**
   * List all courier configurations (with credentials optionally masked)
   */
  public listCouriers(mask = true): CourierConfiguration[] {
    const rows = this.db.prepare(`
      SELECT id, courier_key, name, is_active, is_default, credentials, from_wilaya, default_delivery_type, notes, created_at, updated_at
      FROM courier_configurations
      ORDER BY is_default DESC, is_active DESC, name ASC
    `).all() as any[];

    return rows.map(r => {
      let creds: Record<string, string> = {};
      try {
        creds = JSON.parse(r.credentials || '{}');
      } catch {
        creds = {};
      }

      const maskedCreds: Record<string, string> = {};
      for (const [k, v] of Object.entries(creds)) {
        maskedCreds[k] = mask ? this.maskSecret(v) : v;
      }

      return {
        id: r.id,
        courierKey: r.courier_key,
        name: r.name,
        isActive: r.is_active === 1,
        isDefault: r.is_default === 1,
        credentials: maskedCreds,
        fromWilaya: r.from_wilaya || 16,
        defaultDeliveryType: r.default_delivery_type || 'home',
        notes: r.notes,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      };
    });
  }

  /**
   * Get raw courier configuration with real unmasked credentials
   */
  public getRawCourier(courierKey: string): {
    id: string;
    courierKey: string;
    name: string;
    isActive: boolean;
    isDefault: boolean;
    credentials: Record<string, string>;
    fromWilaya: number;
    defaultDeliveryType: 'home' | 'stopdesk';
    notes?: string;
  } {
    const row = this.db.prepare(`
      SELECT id, courier_key, name, is_active, is_default, credentials, from_wilaya, default_delivery_type, notes
      FROM courier_configurations
      WHERE courier_key = ?
    `).get(courierKey) as any;

    if (!row) {
      throw new NotFoundError(`Transporteur "${courierKey}" introuvable.`);
    }

    let creds: Record<string, string> = {};
    try {
      creds = JSON.parse(row.credentials || '{}');
    } catch {
      creds = {};
    }

    return {
      id: row.id,
      courierKey: row.courier_key,
      name: row.name,
      isActive: row.is_active === 1,
      isDefault: row.is_default === 1,
      credentials: creds,
      fromWilaya: row.from_wilaya || 16,
      defaultDeliveryType: row.default_delivery_type || 'home',
      notes: row.notes,
    };
  }

  /**
   * Save or update courier settings & credentials
   */
  public saveCourier(data: {
    courierKey: string;
    name?: string;
    isActive?: boolean;
    isDefault?: boolean;
    credentials?: Record<string, string>;
    fromWilaya?: number;
    defaultDeliveryType?: 'home' | 'stopdesk';
    notes?: string;
  }): CourierConfiguration {
    const courierKey = data.courierKey.trim().toLowerCase();
    const existing = this.db.prepare(`
      SELECT id, courier_key, name, is_active, is_default, credentials, from_wilaya, default_delivery_type 
      FROM courier_configurations 
      WHERE courier_key = ?
    `).get(courierKey) as any;

    let mergedCredentials: Record<string, string> = {};
    if (existing) {
      try {
        mergedCredentials = JSON.parse(existing.credentials || '{}');
      } catch {
        mergedCredentials = {};
      }
    }

    if (data.credentials) {
      for (const [k, v] of Object.entries(data.credentials)) {
        if (v !== undefined && v !== null) {
          const str = String(v).trim();
          // If not masked value, update it. If masked (contains ••••••••), keep existing
          if (!str.includes('••••••••')) {
            if (str.length === 0) {
              delete mergedCredentials[k];
            } else {
              mergedCredentials[k] = str;
            }
          }
        }
      }
    }

    const id = existing ? existing.id : `cfg-${courierKey}`;
    const name = data.name || (existing ? existing.name : courierKey);
    const isActive = data.isActive !== undefined 
      ? (data.isActive ? 1 : 0) 
      : (existing && existing.is_active !== undefined ? existing.is_active : 1);
    const isDefault = data.isDefault !== undefined 
      ? (data.isDefault ? 1 : 0) 
      : (existing && existing.is_default !== undefined ? existing.is_default : 0);
    const fromWilaya = data.fromWilaya !== undefined 
      ? data.fromWilaya 
      : (existing && existing.from_wilaya !== undefined ? existing.from_wilaya : 16);
    const defaultDeliveryType = data.defaultDeliveryType || (existing ? existing.default_delivery_type : 'home') || 'home';
    const notes = data.notes !== undefined ? data.notes : (existing ? existing.notes : null);

    const tx = this.db.transaction(() => {
      // If setting as default, clear other defaults
      if (isDefault === 1) {
        this.db.prepare('UPDATE courier_configurations SET is_default = 0 WHERE id != ?').run(id);
      }

      if (existing) {
        this.db.prepare(`
          UPDATE courier_configurations
          SET name = ?, is_active = ?, is_default = ?, credentials = ?, from_wilaya = ?, default_delivery_type = ?, notes = ?, updated_at = DATETIME('now')
          WHERE id = ?
        `).run(name, isActive, isDefault, JSON.stringify(mergedCredentials), fromWilaya, defaultDeliveryType, notes, id);
      } else {
        this.db.prepare(`
          INSERT INTO courier_configurations (id, courier_key, name, is_active, is_default, credentials, from_wilaya, default_delivery_type, notes, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, DATETIME('now'), DATETIME('now'))
        `).run(id, courierKey, name, isActive, isDefault, JSON.stringify(mergedCredentials), fromWilaya, defaultDeliveryType, notes);
      }
    });

    tx();

    return this.listCouriers(true).find(c => c.courierKey === courierKey)!;
  }

  /**
   * Test connection to courier via dzship
   */
  public async testCourier(courierKey: string): Promise<{ success: boolean; message: string; details?: any }> {
    const courier = this.getRawCourier(courierKey);

    if (courierKey === 'sandbox') {
      return {
        success: true,
        message: 'Connexion Sandbox réussie ! L\'environnement de test dzship est prêt.',
        details: { courier: 'sandbox', status: 'ready' }
      };
    }

    // For real couriers, we test credentials by querying rates for route 16 -> 31
    try {
      const payload = {
        courier: courierKey,
        credentials: courier.credentials,
        query: {
          fromWilaya: courier.fromWilaya || 16,
          toWilaya: 31,
          deliveryType: 'home'
        }
      };

      const response = await fetch(`${DZSHIP_BASE_URL}/v1/rates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json() as any;

      if (!response.ok || data.error) {
        const errMsg = data.error?.message || data.error?.code || `Erreur HTTP ${response.status}`;
        return {
          success: false,
          message: `Échec d'authentification ${courier.name} : ${errMsg}`,
          details: data.error
        };
      }

      return {
        success: true,
        message: `Authentification réussie auprès de ${courier.name} ! La passerelle est opérationnelle.`,
        details: data
      };
    } catch (err: any) {
      logger.error(`Error testing courier ${courierKey}:`, err);
      return {
        success: false,
        message: `Erreur de connexion avec ${courier.name} : ${err.message}`,
      };
    }
  }

  /**
   * Helper: extract clean Algerian Wilaya code (1-58) from wilaya string
   */
  public extractWilayaCode(wilayaStr?: string | null): number {
    if (!wilayaStr) return 16; // default Alger
    const trimmed = String(wilayaStr).trim();

    // Check for leading digits e.g. "16 - Alger" or "16"
    const matchDigits = trimmed.match(/^(\d{1,2})/);
    if (matchDigits) {
      const code = parseInt(matchDigits[1], 10);
      if (code >= 1 && code <= 58) return code;
    }

    // Match name in WILAYAS_MAP
    const lower = trimmed.toLowerCase();
    for (const [codeStr, name] of Object.entries(WILAYAS_MAP)) {
      if (lower.includes(name.toLowerCase())) {
        return parseInt(codeStr, 10);
      }
    }

    return 16;
  }

  /**
   * Helper: format recipient phone to clean Algerian standard
   */
  public cleanPhone(phone?: string | null): string {
    if (!phone) return '0550000000';
    let digits = String(phone).replace(/\D/g, '');
    if (digits.startsWith('213')) {
      digits = '0' + digits.substring(3);
    }
    if (digits.length === 9) {
      digits = '0' + digits;
    }
    return digits;
  }

  /**
   * Dispatch single order to carrier using dzship
   */
  public async dispatchOrder(
    orderId: string, 
    courierKey?: string, 
    user?: { id?: string; name?: string }
  ): Promise<DzshipDispatchResult> {
    // 1. Fetch order from DB
    const order = this.db.prepare(`
      SELECT o.id, o.order_number, o.customer_id, o.status, o.total, o.shipping_wilaya, o.shipping_commune, 
             o.shipping_address, o.delivery_type, o.notes, o.tracking_number, o.delivery_company,
             c.name as customer_name, c.phone as customer_phone
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE o.id = ?
    `).get(orderId) as any;

    if (!order) {
      throw new NotFoundError(`Commande avec l'identifiant ${orderId} introuvable.`);
    }

    // 2. Fetch order items
    const items = this.db.prepare(`
      SELECT oi.quantity, p.name as product_name, pv.name as variant_name
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      LEFT JOIN product_variants pv ON oi.variant_id = pv.id
      WHERE oi.order_id = ?
    `).all(orderId) as any[];

    const productList = items.length > 0
      ? items.map(i => `${i.product_name}${i.variant_name ? ` (${i.variant_name})` : ''} x${i.quantity}`).join(', ')
      : 'Colis ZR Factory';

    // 3. Determine courier to use
    let targetCourierKey: string = courierKey || '';
    if (!targetCourierKey) {
      // Find default active courier
      const defRow = this.db.prepare(`
        SELECT courier_key FROM courier_configurations 
        WHERE is_active = 1 
        ORDER BY is_default DESC, updated_at DESC 
        LIMIT 1
      `).get() as any;
      targetCourierKey = defRow?.courier_key || 'sandbox';
    }

    const courier = this.getRawCourier(targetCourierKey);
    const wilayaCode = this.extractWilayaCode(order.shipping_wilaya);
    const communeName = (order.shipping_commune && order.shipping_commune.trim()) || WILAYAS_MAP[wilayaCode] || 'Alger';
    const recipientName = (order.customer_name && order.customer_name.trim()) || 'Client';
    const recipientPhone = this.cleanPhone(order.customer_phone);
    const deliveryType = (order.delivery_type === 'STOP_DESK' || order.delivery_type === 'stopdesk') ? 'stopdesk' : 'home';

    // 4. Build dzship payload
    const dzshipPayload = {
      courier: targetCourierKey,
      credentials: courier.credentials,
      options: {
        fromWilaya: courier.fromWilaya || 16,
      },
      order: {
        reference: order.order_number,
        recipient: {
          fullName: recipientName,
          phone: recipientPhone,
          wilayaCode,
          communeName,
          addressLine: (order.shipping_address && order.shipping_address.trim()) || undefined,
        },
        deliveryType,
        productList,
        codAmount: Math.round(Number(order.total) || 0),
      }
    };

    logger.info(`Dispatching order ${order.order_number} to ${courier.name} via dzship...`);

    // 5. Call dzship POST /v1/orders
    const response = await fetch(`${DZSHIP_BASE_URL}/v1/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dzshipPayload)
    });

    const data = await response.json() as any;

    if (!response.ok || data.error) {
      const errMsg = data.error?.message || data.error?.code || `Erreur d'expédition (${response.status})`;
      logger.error(`Failed to dispatch order to ${courier.name}:`, data.error || data);
      throw new ValidationError(`Erreur d'expédition avec ${courier.name} : ${errMsg}`);
    }

    const trackingNumber = data.trackingNumber || data.reference || `TRK-${Date.now()}`;
    const courierReference = data.courierReference || data.reference || null;

    // 6. Update order in database
    this.db.prepare(`
      UPDATE orders
      SET status = ?, 
          tracking_number = ?, 
          delivery_company = ?, 
          dispatched_at = DATETIME('now'), 
          updated_at = DATETIME('now')
      WHERE id = ?
    `).run(OrderStatus.SHIPPED, trackingNumber, courier.name, orderId);

    // 7. Add Audit Log
    try {
      this.db.prepare(`
        INSERT INTO audit_logs (id, entity_type, entity_id, action, performed_by, details, created_at)
        VALUES (?, 'ORDER', ?, 'DISPATCH_DZSHIP', ?, ?, DATETIME('now'))
      `).run(
        `aud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        orderId,
        user?.id || 'system',
        JSON.stringify({
          courierKey: targetCourierKey,
          courierName: courier.name,
          trackingNumber,
          courierReference,
          performerName: user?.name || 'System'
        })
      );
    } catch {
      // ignore audit log failure
    }

    logger.info(`Successfully dispatched order ${order.order_number} with tracking: ${trackingNumber}`);

    return {
      orderId,
      orderNumber: order.order_number,
      trackingNumber,
      courier: targetCourierKey,
      courierName: courier.name,
      status: 'SHIPPED',
      courierReference,
    };
  }

  /**
   * Batch dispatch multiple orders via dzship
   */
  public async dispatchBatch(
    orderIds: string[], 
    courierKey?: string, 
    user?: { id?: string; name?: string }
  ): Promise<{
    successful: DzshipDispatchResult[];
    failed: Array<{ orderId: string; error: string }>;
  }> {
    const successful: DzshipDispatchResult[] = [];
    const failed: Array<{ orderId: string; error: string }> = [];

    for (const id of orderIds) {
      try {
        const result = await this.dispatchOrder(id, courierKey, user);
        successful.push(result);
      } catch (err: any) {
        failed.push({
          orderId: id,
          error: err.message || 'Erreur inconnue',
        });
      }
    }

    return { successful, failed };
  }

  /**
   * Track parcel live status using dzship POST /v1/track
   */
  public async trackParcel(trackingNumber: string, courierKey?: string): Promise<DzshipTrackingResult> {
    const cleanTracking = trackingNumber.trim();

    // Determine courier key if not supplied
    let targetCourierKey: string = courierKey || '';
    if (!targetCourierKey) {
      // Look up order in database
      const order = this.db.prepare('SELECT delivery_company FROM orders WHERE tracking_number = ?').get(cleanTracking) as any;
      if (order && order.delivery_company) {
        const comp = order.delivery_company.toLowerCase();
        if (comp.includes('elogistia')) targetCourierKey = 'elogistia';
        else if (comp.includes('zr express') || comp.includes('procolis')) targetCourierKey = 'zrexpress';
        else if (comp.includes('ecom')) targetCourierKey = 'ecomdelivery';
        else if (comp.includes('yalidine')) targetCourierKey = 'yalidine';
      }
      if (!targetCourierKey) {
        const def = this.db.prepare('SELECT courier_key FROM courier_configurations WHERE is_active = 1 ORDER BY is_default DESC LIMIT 1').get() as any;
        targetCourierKey = def?.courier_key || 'sandbox';
      }
    }

    const courier = this.getRawCourier(targetCourierKey);

    const payload = {
      courier: targetCourierKey,
      credentials: courier.credentials,
      trackingNumber: cleanTracking
    };

    const response = await fetch(`${DZSHIP_BASE_URL}/v1/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json() as any;

    if (!response.ok || data.error) {
      throw new ValidationError(data.error?.message || `Erreur de suivi dzship (${response.status})`);
    }

    return {
      trackingNumber: cleanTracking,
      status: data.status || 'unknown',
      courier: targetCourierKey,
      events: data.events || [],
      raw: data.raw
    };
  }
}
