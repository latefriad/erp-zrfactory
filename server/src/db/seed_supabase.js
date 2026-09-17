// Seed script for Supabase PostgreSQL using Management Query API
const https = require('https');
const bcrypt = require('bcryptjs');

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'osvsnqsdcbjbhfgntyrs';
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN || '';

function runSql(sql) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query: sql });
    const req = https.request(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(body ? JSON.parse(body) : []);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function seed() {
  console.log('Seeding Supabase PostgreSQL database...');

  const passwordHashAdmin = bcrypt.hashSync('Admin123!', 10);
  const passwordHashPartner = bcrypt.hashSync('Partner123!', 10);
  const passwordHashEmployee = bcrypt.hashSync('Employee123!', 10);
  const passwordHashViewer = bcrypt.hashSync('Viewer123!', 10);

  const sql = `
    -- 1. Roles
    INSERT INTO roles (id, name, description) VALUES
      ('role-admin', 'ADMIN', 'Full access to all system functions'),
      ('role-partner', 'PARTNER', 'Access to orders, CRM, finance, reports, own balance'),
      ('role-employee', 'EMPLOYEE', 'Access to orders, CRM, products'),
      ('role-viewer', 'VIEWER', 'Read-only access across the ERP')
    ON CONFLICT (id) DO NOTHING;

    -- 2. Partners
    INSERT INTO partners (id, name, ownership_percentage, initial_capital, notes) VALUES
      ('partner-riad', 'Riad', 30.00, 300000.00, 'Co-fondateur ZR Factory (30% Capital)'),
      ('partner-brother', 'Brother', 70.00, 700000.00, 'Co-fondateur ZR Factory (70% Capital)')
    ON CONFLICT (id) DO UPDATE SET
      ownership_percentage = EXCLUDED.ownership_percentage,
      initial_capital = EXCLUDED.initial_capital;

    -- 3. Users
    INSERT INTO users (id, name, email, password_hash, partner_id, is_active) VALUES
      ('usr-admin-001', 'Directeur Général (Admin)', 'admin@zrfactory.dz', '${passwordHashAdmin}', NULL, true),
      ('usr-partner-riad', 'Riad (Partenaire 30%)', 'riad@zrfactory.dz', '${passwordHashPartner}', 'partner-riad', true),
      ('usr-partner-brother', 'Partenaire (70%)', 'partner@zrfactory.dz', '${passwordHashPartner}', 'partner-brother', true),
      ('usr-employee-001', 'Opérateur Atelier (Karim)', 'employee@zrfactory.dz', '${passwordHashEmployee}', NULL, true),
      ('usr-viewer-001', 'Auditeur / Lecteur (Samir)', 'viewer@zrfactory.dz', '${passwordHashViewer}', NULL, true)
    ON CONFLICT (id) DO NOTHING;

    -- 4. User Roles
    INSERT INTO user_roles (user_id, role_id) VALUES
      ('usr-admin-001', 'role-admin'),
      ('usr-partner-riad', 'role-partner'),
      ('usr-partner-brother', 'role-partner'),
      ('usr-employee-001', 'role-employee'),
      ('usr-viewer-001', 'role-viewer')
    ON CONFLICT (user_id, role_id) DO NOTHING;

    -- 5. Cash Accounts
    INSERT INTO cash_accounts (id, name, type, balance, currency, is_default) VALUES
      ('acc-caisse-principale', 'Caisse Principale (Cash)', 'CASH', 150000.00, 'DZD', true),
      ('acc-ccp-algerie-poste', 'Compte CCP (Algérie Poste)', 'CCP', 80000.00, 'DZD', false),
      ('acc-baridimob', 'BaridiMob (Algérie Poste)', 'BARIDIMOB', 50000.00, 'DZD', false),
      ('acc-banque-bna', 'Banque BNA (Compte Courant)', 'BANK', 120000.00, 'DZD', false)
    ON CONFLICT (id) DO UPDATE SET balance = EXCLUDED.balance;

    -- 6. Expense Categories
    INSERT INTO expense_categories (id, name, description) VALUES
      ('cat-materials', 'MATERIALS', 'Raw materials for production'),
      ('cat-tshirts', 'T_SHIRTS', 'Blank t-shirts, hoodies, and garments'),
      ('cat-printing', 'PRINTING', 'DTF film, ink, powder, sublimation'),
      ('cat-packaging', 'PACKAGING', 'Boxes, poly mailers, labels, stickers'),
      ('cat-delivery', 'DELIVERY', 'Shipping & courier logistics fees'),
      ('cat-advertising', 'ADVERTISING', 'Facebook, Instagram & TikTok ads'),
      ('cat-software', 'SOFTWARE', 'ERP, hosting, domain, cloud subscriptions'),
      ('cat-rent', 'RENT', 'Workshop & factory rent'),
      ('cat-electricity', 'ELECTRICITY', 'Electricity & utilities'),
      ('cat-phone', 'PHONE', 'Internet and telephone lines'),
      ('cat-equipment', 'EQUIPMENT', 'Heat presses, printers, maintenance'),
      ('cat-taxes', 'TAXES', 'Local taxes and regulatory fees'),
      ('cat-other', 'OTHER', 'Miscellaneous expenses')
    ON CONFLICT (id) DO NOTHING;

    -- 7. Settings
    INSERT INTO settings (key, value, description) VALUES
      ('company_name', 'ZR Factory', 'Nom de l''entreprise Print-on-Demand'),
      ('currency', 'DZD', 'Devise officielle (Dinar Algérien)'),
      ('default_delivery_fee', '600', 'Frais de livraison par défaut en DZD'),
      ('riad_percentage', '30', 'Part statutaire Riad (%)'),
      ('brother_percentage', '70', 'Part statutaire Associé (%)')
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
  `;

  await runSql(sql);
  console.log('✅ Base tables seeded successfully!');

  // Seed 58 Algerian Wilayas Shipping Rates
  console.log('Seeding 58 Algerian Wilayas shipping rates...');
  const wilayaValues = [];
  for (let code = 1; code <= 58; code++) {
    const padded = String(code).padStart(2, '0');
    const zone = code <= 16 ? 1 : code <= 35 ? 2 : code <= 47 ? 3 : 4;
    const feeHome = zone === 1 ? 500 : zone === 2 ? 650 : zone === 3 ? 800 : 1000;
    const feeDesk = zone === 1 ? 350 : zone === 2 ? 450 : zone === 3 ? 550 : 700;
    wilayaValues.push(`('rate-wilaya-${padded}', ${code}, 'Wilaya ${padded}', ${zone}, ${feeHome}, ${feeDesk}, true)`);
  }

  const wilayaSql = `
    INSERT INTO shipping_rates (id, wilaya_code, wilaya_name, zone_number, fee_domicile, fee_stop_desk, is_active)
    VALUES ${wilayaValues.join(',\n')}
    ON CONFLICT (wilaya_code) DO UPDATE SET
      fee_domicile = EXCLUDED.fee_domicile,
      fee_stop_desk = EXCLUDED.fee_stop_desk;
  `;

  await runSql(wilayaSql);
  console.log('✅ 58 Wilayas shipping rates seeded successfully on Supabase!');
}

seed().catch(err => {
  console.error('Seeding error:', err);
  process.exit(1);
});
