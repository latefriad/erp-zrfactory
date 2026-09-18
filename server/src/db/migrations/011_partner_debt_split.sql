-- Migration 011: Add partner_split_debt setting and partner-debt entity for profit distribution
INSERT OR IGNORE INTO settings (key, value, description, updated_at)
VALUES ('partner_split_debt', '0', 'Pourcentage de répartition des bénéfices pour Crédit / Dette (%)', DATETIME('now'));

INSERT OR IGNORE INTO partners (id, name, ownership_percentage, initial_capital, notes, created_at, updated_at)
VALUES ('partner-debt', 'Crédit / Dette', 0, 0, 'Compte statutaire dédié à la couverture du crédit et à l''apurement des dettes', DATETIME('now'), DATETIME('now'));
