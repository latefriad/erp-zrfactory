const fs = require('fs');
const https = require('https');
const path = require('path');
const Database = require('better-sqlite3');

const resetSql = `
  DELETE FROM order_items;
  DELETE FROM production_items;
  DELETE FROM payments;
  DELETE FROM orders;
  DELETE FROM shipping_manifests;
  DELETE FROM expenses;
  DELETE FROM cash_transactions;
  DELETE FROM partner_transactions;
  DELETE FROM profit_distributions;
  DELETE FROM accounting_periods;
  DELETE FROM audit_logs;
  UPDATE cash_accounts SET balance = 0;
  UPDATE partners SET initial_capital = 0;
`;

// 1. Reset Local SQLite
const localDbPath = path.resolve(__dirname, '../server/data/zr_factory.sqlite');
if (fs.existsSync(localDbPath)) {
  console.log('Resetting local SQLite database:', localDbPath);
  const db = new Database(localDbPath);
  db.exec(resetSql);
  db.close();
  console.log('✅ Local SQLite reset successfully: all orders, expenses, cash, and CA set to 0!');
} else {
  console.log('Local SQLite not found at', localDbPath);
}

// 2. Reset Supabase PostgreSQL
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'osvsnqsdcbjbhfgntyrs';
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

console.log('Resetting Supabase PostgreSQL database...');
const data = JSON.stringify({ query: resetSql + `
  SELECT 
    (SELECT COUNT(*) FROM orders) as orders,
    (SELECT COALESCE(SUM(total), 0) FROM orders) as revenue,
    (SELECT COUNT(*) FROM expenses) as expenses,
    (SELECT COALESCE(SUM(amount), 0) FROM expenses) as total_expenses,
    (SELECT COALESCE(SUM(balance), 0) FROM cash_accounts) as liquid_cash,
    (SELECT COALESCE(SUM(initial_capital), 0) FROM partners) as capital;
` });

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
      console.log('✅ Supabase PostgreSQL reset successfully: all metrics are 0:');
      console.log(body);
    } else {
      console.error('Supabase reset error:', res.statusCode, body);
    }
  });
});

req.on('error', err => console.error('Request error:', err));
req.write(data);
req.end();
