import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { logger } from '../utils/logger';
import { ALGERIA_WILAYAS } from '@zr-erp/shared';

export function seedDatabase(db: Database.Database): void {
  logger.info('Starting database seeding...');
  const isClean = process.env.NODE_ENV === 'production' || process.env.CLEAN_SEED === 'true';

  const seedTx = db.transaction(() => {
    // 1. Roles
    const roles = [
      { id: 'role-admin', name: 'ADMIN', description: 'Full access to all system functions' },
      { id: 'role-partner', name: 'PARTNER', description: 'Access to orders, CRM, finance, reports, own balance' },
      { id: 'role-employee', name: 'EMPLOYEE', description: 'Access to orders, CRM, products' },
      { id: 'role-viewer', name: 'VIEWER', description: 'Read-only access across the ERP' },
    ];

    const insertRole = db.prepare(`
      INSERT OR IGNORE INTO roles (id, name, description)
      VALUES (@id, @name, @description)
    `);

    for (const role of roles) {
      insertRole.run(role);
    }

    // 2. Expense Categories
    const categories = [
      { id: 'cat-materials', name: 'MATERIALS', description: 'Raw materials for production' },
      { id: 'cat-tshirts', name: 'T_SHIRTS', description: 'Blank t-shirts, hoodies, and garments' },
      { id: 'cat-printing', name: 'PRINTING', description: 'DTF film, ink, powder, sublimation' },
      { id: 'cat-packaging', name: 'PACKAGING', description: 'Boxes, poly mailers, labels, stickers' },
      { id: 'cat-delivery', name: 'DELIVERY', description: 'Shipping & courier logistics fees' },
      { id: 'cat-advertising', name: 'ADVERTISING', description: 'Facebook, Instagram & TikTok ads' },
      { id: 'cat-software', name: 'SOFTWARE', description: 'ERP, hosting, domain, cloud subscriptions' },
      { id: 'cat-rent', name: 'RENT', description: 'Workshop & factory rent' },
      { id: 'cat-electricity', name: 'ELECTRICITY', description: 'Electricity & utilities' },
      { id: 'cat-phone', name: 'PHONE', description: 'Internet and telephone lines' },
      { id: 'cat-equipment', name: 'EQUIPMENT', description: 'Heat presses, printers, maintenance' },
      { id: 'cat-taxes', name: 'TAXES', description: 'Local taxes and regulatory fees' },
      { id: 'cat-other', name: 'OTHER', description: 'Miscellaneous expenses' },
    ];

    const insertCategory = db.prepare(`
      INSERT OR IGNORE INTO expense_categories (id, name, description)
      VALUES (@id, @name, @description)
    `);

    for (const cat of categories) {
      insertCategory.run(cat);
    }

    // 3. Default Partners (Riad 30%, Brother 70%)
    const partners = [
      {
        id: 'partner-riad',
        name: 'Riad',
        ownership_percentage: 30.0,
        initial_capital: isClean ? 0 : 300000,
        notes: 'Co-fondateur ZR Factory (30% Capital)'
      },
      {
        id: 'partner-brother',
        name: 'Brother',
        ownership_percentage: 70.0,
        initial_capital: isClean ? 0 : 700000,
        notes: 'Co-fondateur ZR Factory (70% Capital)'
      }
    ];

    const insertPartner = db.prepare(`
      INSERT INTO partners (id, name, ownership_percentage, initial_capital, notes)
      VALUES (@id, @name, @ownership_percentage, @initial_capital, @notes)
      ON CONFLICT(id) DO UPDATE SET
        ownership_percentage = excluded.ownership_percentage,
        initial_capital = excluded.initial_capital,
        notes = excluded.notes
    `);

    for (const partner of partners) {
      insertPartner.run(partner);
    }

    // 4. Default Cash Accounts (Multi-Account Setup)
    const cashAccounts = [
      {
        id: 'acc-caisse-principale',
        name: 'Caisse Principale (Cash)',
        type: 'CASH',
        balance: isClean ? 0 : 150000,
        currency: 'DZD',
        is_default: 1
      },
      {
        id: 'acc-ccp-algerie-poste',
        name: 'Compte CCP (Algérie Poste)',
        type: 'CCP',
        balance: isClean ? 0 : 80000,
        currency: 'DZD',
        is_default: 0
      },
      {
        id: 'acc-baridimob',
        name: 'Compte BaridiMob ZR',
        type: 'BARIDIMOB',
        balance: isClean ? 0 : 45000,
        currency: 'DZD',
        is_default: 0
      }
    ];

    const insertCashAccount = db.prepare(`
      INSERT INTO cash_accounts (id, name, type, balance, currency, is_default)
      VALUES (@id, @name, @type, @balance, @currency, @is_default)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        type = excluded.type,
        balance = excluded.balance,
        currency = excluded.currency,
        is_default = excluded.is_default
    `);

    for (const acc of cashAccounts) {
      insertCashAccount.run(acc);
    }

    // 5. Default Settings
    const settings = [
      { key: 'company_name', value: 'ZR FACTORY', description: 'Nom commercial de l\'entreprise' },
      { key: 'app_name', value: 'ZR Factory Print-on-Demand ERP', description: 'Application brand name' },
      { key: 'currency', value: 'DZD', description: 'Primary currency code' },
      { key: 'currency_symbol', value: 'DA', description: 'Displayed currency symbol' },
      { key: 'default_delivery_fee', value: '600', description: 'Frais de livraison standard en Algérie (DA)' },
      { key: 'delivery_default_fee', value: '600', description: 'Default shipping fee in DZD' },
      { key: 'partner_split_riad', value: '30', description: 'Pourcentage de répartition des bénéfices pour Riad (%)' },
      { key: 'partner_split_brother', value: '70', description: 'Pourcentage de répartition des bénéfices pour le frère (%)' },
    ];

    const insertSetting = db.prepare(`
      INSERT OR IGNORE INTO settings (key, value, description)
      VALUES (@key, @value, @description)
    `);

    for (const setting of settings) {
      insertSetting.run(setting);
    }

    // 6. Default Users & Role Assignments
    const defaultUsers = [
      {
        id: 'usr-admin',
        name: 'Administrateur ZR',
        email: 'admin@zrfactory.dz',
        password: 'admin123456',
        roleId: 'role-admin',
        partnerId: null,
      },
      {
        id: 'usr-riad',
        name: 'Riad (Associé 30%)',
        email: 'riad@zrfactory.dz',
        password: 'riad123456',
        roleId: 'role-partner',
        partnerId: 'partner-riad',
      },
      {
        id: 'usr-brother',
        name: 'Brother (Associé 70%)',
        email: 'brother@zrfactory.dz',
        password: 'brother123456',
        roleId: 'role-partner',
        partnerId: 'partner-brother',
      },
      {
        id: 'usr-employee',
        name: 'Employé Production',
        email: 'employee@zrfactory.dz',
        password: 'employee123456',
        roleId: 'role-employee',
        partnerId: null,
      },
      {
        id: 'usr-viewer',
        name: 'Auditeur / Lecteur',
        email: 'viewer@zrfactory.dz',
        password: 'viewer123456',
        roleId: 'role-viewer',
        partnerId: null,
      },
    ];

    const insertUser = db.prepare(`
      INSERT OR IGNORE INTO users (id, name, email, password_hash, is_active, partner_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, 1, ?, DATETIME('now'), DATETIME('now'))
    `);

    const insertUserRole = db.prepare(`
      INSERT OR IGNORE INTO user_roles (user_id, role_id)
      VALUES (?, ?)
    `);

    for (const user of defaultUsers) {
      const hash = bcrypt.hashSync(user.password, 10);
      insertUser.run(user.id, user.name, user.email, hash, user.partnerId);
      insertUserRole.run(user.id, user.roleId);
    }

    // 7. Seed Print-on-Demand Products
    const products = [
      {
        id: 'prod-tshirt-oversized',
        name: 'T-Shirt Oversized Premium',
        sku: 'TSHIRT-OVR-001',
        description: 'T-shirt 100% coton peigné 240g/m² avec impression DTF haute définition',
        sellingPrice: 2500,
        components: [
          { id: 'comp-1', name: 'T-Shirt Vierge Coton 240g', type: 'BASE_ITEM', cost: 700 },
          { id: 'comp-2', name: 'Impression DTF HD (Format A3)', type: 'PRINTING', cost: 400 },
          { id: 'comp-3', name: 'Packaging & Étiquette ZR', type: 'PACKAGING', cost: 50 },
        ],
        variants: [
          { id: 'var-1', name: 'Noir / S', sku: 'TSHIRT-OVR-001-BLK-S', stock: 25 },
          { id: 'var-2', name: 'Noir / M', sku: 'TSHIRT-OVR-001-BLK-M', stock: 50 },
          { id: 'var-3', name: 'Noir / L', sku: 'TSHIRT-OVR-001-BLK-L', stock: 40 },
          { id: 'var-4', name: 'Noir / XL', sku: 'TSHIRT-OVR-001-BLK-XL', stock: 15 },
        ],
      },
      {
        id: 'prod-hoodie-heavyweight',
        name: 'Hoodie Heavyweight 350g',
        sku: 'HOODIE-HVY-002',
        description: 'Sweat à capuche molletonné premium 350g/m²',
        sellingPrice: 5500,
        components: [
          { id: 'comp-4', name: 'Hoodie Vierge 350g Molleton', type: 'BASE_ITEM', cost: 2200 },
          { id: 'comp-5', name: 'Impression DTF Avant/Arrière', type: 'PRINTING', cost: 600 },
          { id: 'comp-6', name: 'Boîte Packaging Premium', type: 'PACKAGING', cost: 100 },
        ],
        variants: [
          { id: 'var-5', name: 'Gris Chiné / M', sku: 'HOODIE-HVY-002-GRY-M', stock: 20 },
          { id: 'var-6', name: 'Gris Chiné / L', sku: 'HOODIE-HVY-002-GRY-L', stock: 25 },
        ],
      },
      {
        id: 'prod-casquette-custom',
        name: 'Casquette Trucker ZR',
        sku: 'CAP-CUSTOM-003',
        description: 'Casquette trucker 5 panneaux avec visière courbée',
        sellingPrice: 1600,
        components: [
          { id: 'comp-7', name: 'Casquette Trucker Vierge', type: 'BASE_ITEM', cost: 450 },
          { id: 'comp-8', name: 'Impression DTF Écusson', type: 'PRINTING', cost: 250 },
          { id: 'comp-9', name: 'Sachet Protecteur', type: 'PACKAGING', cost: 30 },
        ],
        variants: [
          { id: 'var-7', name: 'Noir / Taille Unique', sku: 'CAP-CUSTOM-003-BLK-U', stock: 35 },
        ],
      },
      {
        id: 'prod-tshort-uniform',
        name: 'tshort uniform',
        sku: '140',
        description: 'T-Shirt uniform haute qualité 100% coton pour entreprises et équipes avec impression DTF personnalisée',
        sellingPrice: 1900,
        components: [
          { id: 'comp-10', name: 'T-Shirt Vierge', type: 'BASE_ITEM', cost: 700 },
          { id: 'comp-11', name: 'Impression DTF HD', type: 'PRINTING', cost: 400 },
          { id: 'comp-12', name: 'Packaging & Étiquette', type: 'PACKAGING', cost: 50 },
        ],
        variants: [
          { id: 'var-8', name: 'Noir / S', sku: '140-BLK-S', stock: 25 },
          { id: 'var-9', name: 'Noir / M', sku: '140-BLK-M', stock: 50 },
          { id: 'var-10', name: 'Noir / L', sku: '140-BLK-L', stock: 40 },
          { id: 'var-11', name: 'Noir / XL', sku: '140-BLK-XL', stock: 20 },
        ],
      },
    ];

    const insertProduct = db.prepare(`
      INSERT OR IGNORE INTO products (id, name, sku, description, base_cost, selling_price, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, 0, ?, 1, DATETIME('now'), DATETIME('now'))
    `);

    const insertCostComp = db.prepare(`
      INSERT OR IGNORE INTO product_cost_components (id, product_id, name, type, cost, is_configurable, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, DATETIME('now'), DATETIME('now'))
    `);

    const insertVariant = db.prepare(`
      INSERT OR IGNORE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
      VALUES (?, ?, ?, ?, 0, 0, ?, DATETIME('now'), DATETIME('now'))
    `);

    for (const prod of products) {
      insertProduct.run(prod.id, prod.name, prod.sku, prod.description, prod.sellingPrice);
      for (const comp of prod.components) {
        insertCostComp.run(comp.id, prod.id, comp.name, comp.type, comp.cost);
      }
      for (const v of prod.variants) {
        insertVariant.run(v.id, prod.id, v.name, v.sku, v.stock);
      }
    }

    // 8. Seed Raw Materials & Inventory
    const rawMaterials = [
      { id: 'mat-1', name: 'Rouleau Film DTF 60cm x 100m', unit: 'rouleau', unitCost: 18500, stock: 8, reorder: 2 },
      { id: 'mat-2', name: 'Encre DTF Blanche (1 Litre)', unit: 'litre', unitCost: 7500, stock: 3, reorder: 2 },
      { id: 'mat-3', name: 'Encre DTF CMYK Kit (4 Litres)', unit: 'kit', unitCost: 22000, stock: 4, reorder: 2 },
      { id: 'mat-4', name: 'Poudre Thermocollante DTF (1 kg)', unit: 'kg', unitCost: 3200, stock: 6, reorder: 3 },
      { id: 'mat-5', name: 'Pochettes Expédition Poly Mailers (x100)', unit: 'paquet', unitCost: 1800, stock: 12, reorder: 5 },
      { id: 'mat-6', name: 'Boîtes Kraft ZR Factory (x50)', unit: 'paquet', unitCost: 3500, stock: 2, reorder: 4 }, // Low stock example
    ];

    const insertMaterial = db.prepare(`
      INSERT OR IGNORE INTO materials (id, name, unit, unit_cost, stock_quantity, reorder_point, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, DATETIME('now'), DATETIME('now'))
    `);

    for (const mat of rawMaterials) {
      insertMaterial.run(mat.id, mat.name, mat.unit, mat.unitCost, mat.stock, mat.reorder);
    }

    // 9. Seed Algerian Customers
    const customers = [
      {
        id: 'cust-karim-alger',
        name: 'Karim Bouzid',
        phone: '0550123456',
        email: 'karim.bouzid@gmail.com',
        address: '14 Rue Didouche Mourad',
        wilaya: 'Alger',
        commune: 'Alger Centre',
        notes: 'Client régulier streetwear',
      },
      {
        id: 'cust-amine-oran',
        name: 'Amine Benali',
        phone: '0661987654',
        email: 'amine.oran@yahoo.com',
        address: '25 Boulevard de la Soummam',
        wilaya: 'Oran',
        commune: 'Oran',
        notes: 'Commande souvent des hoodies en lot',
      },
      {
        id: 'cust-sarah-constantine',
        name: 'Sarah Khelifi',
        phone: '0770334455',
        email: 'sarah.k@outlook.com',
        address: 'Cité Bellevue Bâtiment B',
        wilaya: 'Constantine',
        commune: 'Constantine',
        notes: 'Créatrice de marque locale',
      },
      {
        id: 'cust-yacine-setif',
        name: 'Yacine Mansouri',
        phone: '0540112233',
        email: 'yacine.m@gmail.com',
        address: 'Zone Commerciale El Hidhab',
        wilaya: 'Sétif',
        commune: 'Sétif',
        notes: 'Boutique revendeur',
      },
      {
        id: 'cust-nadir-blida',
        name: 'Nadir Cherif',
        phone: '0655443322',
        email: 'nadir.blida@gmail.com',
        address: 'Rue Bab Dzair',
        wilaya: 'Blida',
        commune: 'Blida',
        notes: null,
      },
    ];

    const insertCustomer = db.prepare(`
      INSERT OR IGNORE INTO customers (id, name, phone, email, address, wilaya, commune, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, DATETIME('now'), DATETIME('now'))
    `);

    for (const c of customers) {
      insertCustomer.run(c.id, c.name, c.phone, c.email, c.address, c.wilaya, c.commune, c.notes);
    }

    // 10. Seed Sample Print-on-Demand Orders
    const existingOrdersCount = (db.prepare('SELECT COUNT(*) as count FROM orders').get() as { count: number })?.count || 0;
    if (!isClean || existingOrdersCount === 0) {
      const sampleOrders = [
      {
        id: 'ord-seed-001',
        orderNumber: 'ZR-202609-0001',
        customerId: 'cust-karim-alger',
        status: 'DELIVERED',
        paymentStatus: 'PAID',
        subtotal: 5000,
        discount: 0,
        deliveryFee: 500,
        total: 5500,
        cost: 2300,
        profit: 2700,
        deliveryCompany: 'Yalidine Express',
        trackingNumber: 'YAL-ALG-883491',
        shippingWilaya: 'Alger',
        shippingCommune: 'Alger Centre',
        shippingAddress: '14 Rue Didouche Mourad',
        notes: 'Livraison express bureau',
        items: [
          {
            id: 'oi-seed-01',
            productId: 'prod-tshirt-oversized',
            variantId: 'var-2',
            quantity: 2,
            sellingPrice: 2500,
            unitCost: 1150,
            totalCost: 2300,
            totalPrice: 5000,
            notes: 'DTF dos logo ZR + poitrine',
          },
        ],
      },
      {
        id: 'ord-seed-002',
        orderNumber: 'ZR-202609-0002',
        customerId: 'cust-amine-oran',
        status: 'SHIPPED',
        paymentStatus: 'PARTIAL',
        subtotal: 11000,
        discount: 500,
        deliveryFee: 800,
        total: 11300,
        cost: 5800,
        profit: 4700,
        deliveryCompany: 'ZR Express / Procolis',
        trackingNumber: 'PRC-ORN-491023',
        shippingWilaya: 'Oran',
        shippingCommune: 'Oran',
        shippingAddress: '25 Boulevard de la Soummam',
        notes: 'Colis fragile avec emballage bulle',
        items: [
          {
            id: 'oi-seed-02',
            productId: 'prod-hoodie-heavyweight',
            variantId: 'var-5',
            quantity: 2,
            sellingPrice: 5500,
            unitCost: 2900,
            totalCost: 5800,
            totalPrice: 11000,
            notes: 'Hoodie broderie/DTF',
          },
        ],
      },
      {
        id: 'ord-seed-003',
        orderNumber: 'ZR-202609-0003',
        customerId: 'cust-sarah-constantine',
        status: 'PRINTING',
        paymentStatus: 'UNPAID',
        subtotal: 6600,
        discount: 0,
        deliveryFee: 800,
        total: 7400,
        cost: 3030,
        profit: 3570,
        deliveryCompany: 'Yalidine Express',
        trackingNumber: null,
        shippingWilaya: 'Constantine',
        shippingCommune: 'Constantine',
        shippingAddress: 'Cité Bellevue Bâtiment B',
        notes: 'Impression en cours atelier',
        items: [
          {
            id: 'oi-seed-03',
            productId: 'prod-tshirt-oversized',
            variantId: 'var-3',
            quantity: 2,
            sellingPrice: 2500,
            unitCost: 1150,
            totalCost: 2300,
            totalPrice: 5000,
            notes: 'DTF Format A3',
          },
          {
            id: 'oi-seed-04',
            productId: 'prod-casquette-custom',
            variantId: 'var-7',
            quantity: 1,
            sellingPrice: 1600,
            unitCost: 730,
            totalCost: 730,
            totalPrice: 1600,
            notes: 'Écusson casquette',
          },
        ],
      },
      {
        id: 'ord-seed-004',
        orderNumber: 'ZR-202609-0004',
        customerId: 'cust-yacine-setif',
        status: 'PENDING',
        paymentStatus: 'UNPAID',
        subtotal: 2500,
        discount: 0,
        deliveryFee: 700,
        total: 3200,
        cost: 1150,
        profit: 1350,
        deliveryCompany: 'Yalidine Express',
        trackingNumber: null,
        shippingWilaya: 'Sétif',
        shippingCommune: 'Sétif',
        shippingAddress: 'Zone Commerciale El Hidhab',
        notes: 'Attente confirmation téléphonique',
        items: [
          {
            id: 'oi-seed-05',
            productId: 'prod-tshirt-oversized',
            variantId: 'var-1',
            quantity: 1,
            sellingPrice: 2500,
            unitCost: 1150,
            totalCost: 1150,
            totalPrice: 2500,
            notes: 'Taille S Noir',
          },
        ],
      },
    ];

    const insertOrder = db.prepare(`
      INSERT OR IGNORE INTO orders (
        id, order_number, customer_id, status, payment_status,
        subtotal, discount, delivery_fee, total, cost, profit,
        delivery_company, tracking_number, shipping_wilaya, shipping_commune, shipping_address,
        notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, DATETIME('now'), DATETIME('now'))
    `);

    const insertOrderItem = db.prepare(`
      INSERT OR IGNORE INTO order_items (
        id, order_id, product_id, variant_id, quantity, selling_price, unit_cost, total_cost, total_price, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, DATETIME('now'))
    `);

    for (const ord of sampleOrders) {
      insertOrder.run(
        ord.id,
        ord.orderNumber,
        ord.customerId,
        ord.status,
        ord.paymentStatus,
        ord.subtotal,
        ord.discount,
        ord.deliveryFee,
        ord.total,
        ord.cost,
        ord.profit,
        ord.deliveryCompany,
        ord.trackingNumber,
        ord.shippingWilaya,
        ord.shippingCommune,
        ord.shippingAddress,
        ord.notes
      );

      for (const itm of ord.items) {
        insertOrderItem.run(
          itm.id,
          ord.id,
          itm.productId,
          itm.variantId,
          itm.quantity,
          itm.sellingPrice,
          itm.unitCost,
          itm.totalCost,
          itm.totalPrice,
          itm.notes
        );
      }
    }
  }

    // 11. Seed Algerian Suppliers
    const suppliers = [
      {
        id: 'supp-textile-blida',
        name: 'Société Textile & Confection Blida',
        phone: '025412233',
        email: 'contact@textileblida.dz',
        address: 'Zone Industrielle Ben Boulaid, Blida',
        notes: 'Fournisseur principal de t-shirts et hoodies vierges 100% coton',
      },
      {
        id: 'supp-dtf-alger',
        name: 'Comptoir DTF & Sérigraphie Alger',
        phone: '021678901',
        email: 'ventes@dtf-alger.dz',
        address: '18 Rue Hassiba Ben Bouali, Alger',
        notes: 'Importateur de films DTF, encres textiles CMYK+W et poudre thermocollante',
      },
      {
        id: 'supp-pack-oran',
        name: 'Emballage Plast & Kraft Oran',
        phone: '041334455',
        email: 'oran.pack@gmail.com',
        address: 'Zone des Entrepôts Es Senia, Oran',
        notes: 'Fournisseur de cartons kraft, pochettes poly mailers et ruban adhésif',
      },
    ];

    const insertSupplier = db.prepare(`
      INSERT OR IGNORE INTO suppliers (id, name, phone, email, address, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, DATETIME('now'), DATETIME('now'))
    `);

    for (const supp of suppliers) {
      insertSupplier.run(supp.id, supp.name, supp.phone, supp.email, supp.address, supp.notes);
    }

    // 12. Seed Sample Expenses (Operating & Production Costs)
    if (!isClean) {
      const expenses = [
      {
        id: 'exp-seed-001',
        categoryId: 'cat-tshirts',
        supplierId: 'supp-textile-blida',
        cashAccountId: 'acc-caisse-principale',
        amount: 140000,
        paymentMethod: 'BANK_TRANSFER',
        date: '2026-09-01',
        description: 'Achat de 200 t-shirts oversized vierges 240g',
        attachment: null,
        createdBy: 'usr-admin',
      },
      {
        id: 'exp-seed-002',
        categoryId: 'cat-printing',
        supplierId: 'supp-dtf-alger',
        cashAccountId: 'acc-caisse-principale',
        amount: 55000,
        paymentMethod: 'BARIDIMOB',
        date: '2026-09-05',
        description: '2 rouleaux film DTF 60cm + Kit 5L encres textiles CMYK+W',
        attachment: null,
        createdBy: 'usr-admin',
      },
      {
        id: 'exp-seed-003',
        categoryId: 'cat-rent',
        supplierId: null,
        cashAccountId: 'acc-caisse-principale',
        amount: 45000,
        paymentMethod: 'CASH',
        date: '2026-09-02',
        description: 'Loyer mensuel atelier de production (Septembre 2026)',
        attachment: null,
        createdBy: 'usr-riad',
      },
      {
        id: 'exp-seed-004',
        categoryId: 'cat-advertising',
        supplierId: null,
        cashAccountId: 'acc-caisse-principale',
        amount: 25000,
        paymentMethod: 'BARIDIMOB',
        date: '2026-09-08',
        description: 'Campagne sponsorisée Meta (Instagram & TikTok Ads)',
        attachment: null,
        createdBy: 'usr-brother',
      },
      {
        id: 'exp-seed-005',
        categoryId: 'cat-electricity',
        supplierId: null,
        cashAccountId: 'acc-caisse-principale',
        amount: 12000,
        paymentMethod: 'CCP',
        date: '2026-09-10',
        description: 'Facture Sonelgaz atelier (presses à chaud & sécheuse)',
        attachment: null,
        createdBy: 'usr-admin',
      },
      {
        id: 'exp-seed-006',
        categoryId: 'cat-packaging',
        supplierId: 'supp-pack-oran',
        cashAccountId: 'acc-caisse-principale',
        amount: 18000,
        paymentMethod: 'CASH',
        date: '2026-09-12',
        description: 'Lot de 500 pochettes inviolables poly mailers ZR Factory',
        attachment: null,
        createdBy: 'usr-admin',
      },
    ];

    const insertExpense = db.prepare(`
      INSERT OR IGNORE INTO expenses (
        id, category_id, supplier_id, cash_account_id, amount, payment_method,
        date, description, attachment, created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, DATETIME('now'))
    `);

    for (const exp of expenses) {
      insertExpense.run(
        exp.id,
        exp.categoryId,
        exp.supplierId,
        exp.cashAccountId,
        exp.amount,
        exp.paymentMethod,
        exp.date,
        exp.description,
        exp.attachment,
        exp.createdBy
      );
    }
  }

    // 13. Seed Partner Transactions (Contributions & Withdrawals)
    if (!isClean) {
      const partnerTransactions = [
        {
          id: 'ptx-seed-001',
          partnerId: 'partner-riad',
          type: 'CONTRIBUTION',
          amount: 50000,
          date: '2026-09-03',
          description: 'Apport de capital en numéraire pour stock encres DTF',
          reference: 'VIR-20260903-R',
          createdBy: 'usr-riad',
        },
        {
          id: 'ptx-seed-002',
          partnerId: 'partner-brother',
          type: 'CONTRIBUTION',
          amount: 100000,
          date: '2026-09-04',
          description: 'Apport en numéraire pour agrandissement parc d\'impression',
          reference: 'VIR-20260904-B',
          createdBy: 'usr-brother',
        },
        {
          id: 'ptx-seed-003',
          partnerId: 'partner-brother',
          type: 'WITHDRAWAL',
          amount: 30000,
          date: '2026-09-14',
          description: 'Retrait partiel sur capital / avance personnelle',
          reference: 'RET-20260914-B',
          createdBy: 'usr-brother',
        },
      ];

      const insertPartnerTx = db.prepare(`
        INSERT OR IGNORE INTO partner_transactions (
          id, partner_id, type, amount, date, description, reference, created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, DATETIME('now'))
      `);

      for (const ptx of partnerTransactions) {
        insertPartnerTx.run(
          ptx.id,
          ptx.partnerId,
          ptx.type,
          ptx.amount,
          ptx.date,
          ptx.description,
          ptx.reference,
          ptx.createdBy
        );
      }
    }

    // 14. Seed Initial Cash Transactions Ledger
    if (!isClean) {
      const initialCashTx = [
        {
          id: 'ctx-seed-001',
          cashAccountId: 'acc-caisse-principale',
          type: 'PARTNER_CONTRIBUTION',
          amount: 50000,
          balanceAfter: 50000,
          date: '2026-09-03',
          description: 'Apport de capital [Riad]: stock encres DTF',
          referenceId: 'ptx-seed-001',
        },
        {
          id: 'ctx-seed-002',
          cashAccountId: 'acc-caisse-principale',
          type: 'PARTNER_CONTRIBUTION',
          amount: 100000,
          balanceAfter: 150000,
          date: '2026-09-04',
          description: 'Apport de capital [Brother]: parc d\'impression',
          referenceId: 'ptx-seed-002',
        },
        {
          id: 'ctx-seed-003',
          cashAccountId: 'acc-ccp-algerie-poste',
          type: 'ADJUSTMENT',
          amount: 80000,
          balanceAfter: 80000,
          date: '2026-09-01',
          description: 'Solde initial ouverture CCP Algérie Poste',
          referenceId: null,
        },
        {
          id: 'ctx-seed-004',
          cashAccountId: 'acc-baridimob',
          type: 'ADJUSTMENT',
          amount: 45000,
          balanceAfter: 45000,
          date: '2026-09-01',
          description: 'Solde initial ouverture BaridiMob ZR',
          referenceId: null,
        },
      ];

      const insertCashTx = db.prepare(`
        INSERT OR IGNORE INTO cash_transactions (
          id, cash_account_id, type, amount, balance_after, date, description, reference_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, DATETIME('now'))
      `);

      for (const ctx of initialCashTx) {
        insertCashTx.run(
          ctx.id,
          ctx.cashAccountId,
          ctx.type,
          ctx.amount,
          ctx.balanceAfter,
          ctx.date,
          ctx.description,
          ctx.referenceId
        );
      }
    }

    // 15. Seed Accounting Periods & Historical Profit Distribution
    const periods = isClean
      ? [
          {
            id: 'period-2026-09',
            name: 'Septembre 2026',
            startDate: '2026-09-01',
            endDate: '2026-09-30',
            isClosed: 0,
            isDistributed: 0,
            revenue: 0,
            cogs: 0,
            operatingExpenses: 0,
            grossProfit: 0,
            netProfit: 0,
            closedAt: null,
            distributedAt: null,
          },
        ]
      : [
          {
            id: 'period-2026-08',
            name: 'Août 2026',
            startDate: '2026-08-01',
            endDate: '2026-08-31',
            isClosed: 1,
            isDistributed: 1,
            revenue: 450000,
            cogs: 180000,
            operatingExpenses: 120000,
            grossProfit: 270000,
            netProfit: 150000,
            closedAt: '2026-08-31T23:59:59Z',
            distributedAt: '2026-09-01T10:00:00Z',
          },
          {
            id: 'period-2026-09',
            name: 'Septembre 2026',
            startDate: '2026-09-01',
            endDate: '2026-09-30',
            isClosed: 0,
            isDistributed: 0,
            revenue: 0,
            cogs: 0,
            operatingExpenses: 0,
            grossProfit: 0,
            netProfit: 0,
            closedAt: null,
            distributedAt: null,
          },
        ];

    const insertPeriod = db.prepare(`
      INSERT OR IGNORE INTO accounting_periods (
        id, name, start_date, end_date, is_closed, is_distributed,
        revenue, cogs, operating_expenses, gross_profit, net_profit,
        closed_at, distributed_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, DATETIME('now'))
    `);

    for (const p of periods) {
      insertPeriod.run(
        p.id,
        p.name,
        p.startDate,
        p.endDate,
        p.isClosed,
        p.isDistributed,
        p.revenue,
        p.cogs,
        p.operatingExpenses,
        p.grossProfit,
        p.netProfit,
        p.closedAt,
        p.distributedAt
      );
    }

    if (!isClean) {
      // Seed August 2026 Profit Distributions (Riad 30% = 45k DA, Brother 70% = 105k DA)
      const distributions = [
        {
          id: 'pdist-2026-08-riad',
          periodId: 'period-2026-08',
          partnerId: 'partner-riad',
          percentage: 30.0,
          share: 45000,
        },
        {
          id: 'pdist-2026-08-brother',
          periodId: 'period-2026-08',
          partnerId: 'partner-brother',
          percentage: 70.0,
          share: 105000,
        },
      ];

      const insertDist = db.prepare(`
        INSERT OR IGNORE INTO profit_distributions (
          id, accounting_period_id, partner_id, ownership_percentage, profit_share, created_at
        ) VALUES (?, ?, ?, ?, ?, '2026-09-01 10:00:00')
      `);

      for (const d of distributions) {
        insertDist.run(d.id, d.periodId, d.partnerId, d.percentage, d.share);
      }
    }

    // 16. Initial Audit Trail
    const initialLogs = [
      {
        id: 'aud-seed-001',
        user_id: 'usr-admin',
        user_name: 'Administrateur Principal',
        action: 'SEED_INIT',
        entity_type: 'SYSTEM',
        entity_id: 'sys-init',
        old_value: null,
        newValue: JSON.stringify({ message: 'Base de données initialisée avec succès' }),
      },
      {
        id: 'aud-seed-002',
        user_id: 'usr-admin',
        user_name: 'Administrateur Principal',
        action: 'LOGIN',
        entity_type: 'USER',
        entity_id: 'usr-admin',
        old_value: null,
        newValue: JSON.stringify({ ip: '127.0.0.1', status: 'SUCCESS' }),
      },
    ];

    const insertAudit = db.prepare(`
      INSERT OR IGNORE INTO audit_logs (id, user_id, user_name, action, entity_type, entity_id, old_value, newValue, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, DATETIME('now'))
    `);

    for (const a of initialLogs) {
      insertAudit.run(a.id, a.user_id, a.user_name, a.action, a.entity_type, a.entity_id, a.old_value, a.newValue);
    }

    // 18. Seed Production Items (Atelier Floor Kanban)
    if (!isClean) {
      try {
        const sampleProdItems = [
          {
            id: 'pi-seed-01',
            order_id: 'ord-seed-004',
            order_item_id: 'oi-seed-05',
            status: 'PENDING_DESIGN',
            assigned_operator_id: 'usr-employee',
            operator_notes: 'En attente de validation maquette client',
            defect_count: 0,
            defect_reason: null,
            started_at: null,
            completed_at: null,
          },
          {
            id: 'pi-seed-02',
            order_id: 'ord-seed-003',
            order_item_id: 'oi-seed-03',
            status: 'READY_FOR_PRINT',
            assigned_operator_id: 'usr-employee',
            operator_notes: 'Planche DTF A3 calibrée, prête pour impression',
            defect_count: 0,
            defect_reason: null,
            started_at: null,
            completed_at: null,
          },
          {
            id: 'pi-seed-03',
            order_id: 'ord-seed-003',
            order_item_id: 'oi-seed-04',
            status: 'PRINTING_DTF',
            assigned_operator_id: 'usr-employee',
            operator_notes: 'Impression en cours sur imprimante DTF HD 60cm',
            defect_count: 0,
            defect_reason: null,
            started_at: '2026-09-17 10:00:00',
            completed_at: null,
          },
          {
            id: 'pi-seed-04',
            order_id: 'ord-seed-002',
            order_item_id: 'oi-seed-02',
            status: 'HEAT_PRESS',
            assigned_operator_id: 'usr-employee',
            operator_notes: 'Presse 160°C pendant 15s - Pelage à froid',
            defect_count: 0,
            defect_reason: null,
            started_at: '2026-09-17 09:30:00',
            completed_at: null,
          },
          {
            id: 'pi-seed-05',
            order_id: 'ord-seed-001',
            order_item_id: 'oi-seed-01',
            status: 'QUALITY_CHECK',
            assigned_operator_id: 'usr-admin',
            operator_notes: 'Contrôle adhérence et étirement OK',
            defect_count: 0,
            defect_reason: null,
            started_at: '2026-09-16 14:00:00',
            completed_at: null,
          },
        ];

        const insertProdItem = db.prepare(`
          INSERT OR IGNORE INTO production_items (
            id, order_id, order_item_id, status, assigned_operator_id, operator_notes,
            defect_count, defect_reason, started_at, completed_at, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, DATETIME('now'), DATETIME('now'))
        `);

        for (const p of sampleProdItems) {
          insertProdItem.run(
            p.id,
            p.order_id,
            p.order_item_id,
            p.status,
            p.assigned_operator_id,
            p.operator_notes,
            p.defect_count,
            p.defect_reason,
            p.started_at,
            p.completed_at
          );
        }
      } catch {
        // Table might not exist in old migration test setups
      }
    }

    // 20. Seed 58 Wilayas Shipping Rates & Pricing Matrix
    try {
      const getZoneForWilaya = (code: number) => {
        if ([16, 9, 35, 42].includes(code)) return { zone: 1, dom: 500, desk: 350 };
        if ([1, 11, 33, 37, 52, 56, 57, 58].includes(code)) return { zone: 5, dom: 1300, desk: 950 };
        if ([8, 32, 45, 53, 54].includes(code)) return { zone: 4, dom: 950, desk: 700 };
        if ([3, 7, 12, 14, 17, 20, 28, 30, 38, 39, 40, 47, 49, 50, 51, 55].includes(code)) return { zone: 3, dom: 800, desk: 550 };
        return { zone: 2, dom: 650, desk: 450 };
      };

      const insertRate = db.prepare(`
        INSERT OR IGNORE INTO shipping_rates (id, wilaya_code, wilaya_name, zone_number, fee_domicile, fee_stop_desk, is_active, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 1, DATETIME('now'))
      `);

      for (const w of ALGERIA_WILAYAS) {
        const { zone, dom, desk } = getZoneForWilaya(w.code);
        insertRate.run(`rate-w-${w.code}`, w.code, w.name, zone, dom, desk);
      }

      // 21. Seed Sample Shipping Manifest & Carrier Orders
      if (!isClean) {
        const insertManifest = db.prepare(`
          INSERT OR IGNORE INTO shipping_manifests (
            id, manifest_number, carrier, driver_name, driver_phone, vehicle_plate,
            total_parcels, total_cod_amount, status, notes, created_by, dispatched_at, completed_at, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, DATETIME('now'), DATETIME('now'))
        `);

        insertManifest.run(
          'man-seed-001',
          'MAN-2026-001',
          'YALIDINE',
          'Amine Benali (Yalidine Express)',
          '0550123456',
          '00456-116-16',
          1,
          11300,
          'DISPATCHED',
          'Ramassage agence Alger Centre - Bordereau 1 colis',
          'usr-employee',
          '2026-09-17 11:30:00',
          null
        );

        // Link sample order ord-seed-002 to manifest
        db.prepare(`
          UPDATE orders
          SET shipping_manifest_id = 'man-seed-001',
              delivery_company = 'Yalidine Express',
              delivery_type = 'STOP_DESK',
              tracking_number = 'yal-2609-00102',
              status = 'SHIPPED',
              dispatched_at = '2026-09-17 11:30:00'
          WHERE id = 'ord-seed-002'
        `).run();
      }
    } catch {
      // Table might not exist in old migration test setups
    }
  });

  seedTx();
  logger.info('Database seeding completed successfully.');
}
