# 🏭 ZR Factory — Print-on-Demand ERP & Financial Management System

> **Enterprise Edition v1.0.0** — Solution web intégrée de pilotage d'atelier Print-on-Demand (POD), gestion de la relation client (CRM), logistique 58 Wilayas et comptabilité financière avec répartition statutaire des bénéfices (30% Riad / 70% Associé).

---

## 📌 Vue d'Ensemble du Système

**ZR Factory ERP** est une application web desktop-first conçue spécifiquement pour l'écosystème commercial et industriel algérien :
- **Architecture Monorepo Modulaire** : Paquets partagés (`@zr-erp/shared`), API Express haute performance (`@zr-erp/server`), interface réactive React 18 / Tailwind CSS (`@zr-erp/client`).
- **Base de Données Transactionnelle** : SQLite en mode **WAL (Write-Ahead Logging)** avec sauvegardes à chaud sans interruption de service (`PRAGMA integrity_check`, API SQLite Backup native).
- **Localisation Algérienne Complète** :
  - Support multilingue natif : **Français**, **Arabe (RTL complet)**, **Anglais**.
  - Devise légale algérienne : **Dinar Algérien (`DA` / `د.ج`)**.
  - Matrice tarifaire des **58 Wilayas** pour livraisons à domicile (`DOMICILE`) et en agence relais (`STOP_DESK`).
  - Comptes financiers adaptés : Caisse Principale physique, Compte CCP (Algérie Poste), BaridiMob, et encaissement Cash-on-Delivery (COD).
- **Règle Statutaire de Répartition des Bénéfices** :
  - **Riad** : 30% des bénéfices nets distribuables.
  - **Associé (Brother)** : 70% des bénéfices nets distribuables.
  - Moteur comptable ledger-based avec traçabilité complète des apports, retraits et clôtures de périodes.
- **Sécurité & Contrôle d'Accès Strict (RBAC)** :
  - 4 profils distincts : `ADMIN`, `PARTNER`, `EMPLOYEE`, `VIEWER`.
  - Piste d'audit inviolable (`audit_logs`) avec comparaison visuelle des diffs JSON avant/après.

---

## 🚀 Résumé des 12 Phases de Développement

| Phase | Module | Statut | Fonctionnalités Majeures |
|---|---|---|---|
| **Phase 1** | Architecture & Shell | ✅ Terminé | Monorepo npm, SQLite WAL, AppShell bilingue, formatage DZD |
| **Phase 2** | Auth & RBAC Strict | ✅ Terminé | JWT, hachage bcrypt, 4 rôles (`ADMIN`, `PARTNER`, `EMPLOYEE`, `VIEWER`), audit |
| **Phase 3** | Coûts POD & Produits | ✅ Terminé | Décomposition unitaire (T-Shirt + DTF + Packaging), gestion des stocks matières |
| **Phase 4** | CRM & Commandes | ✅ Terminé | Cycle de vie des commandes (9 étapes), déduction de stock, CLV client |
| **Phase 5** | Dépenses & Fournisseurs | ✅ Terminé | 13 catégories de charges, liaison trésorerie, fiches fournisseurs algériens |
| **Phase 6** | Capital & Trésorerie | ✅ Terminé | Comptes physiques & virtuels (Caisse, CCP, BaridiMob), apports/retraits associés |
| **Phase 7** | Répartition des Bénéfices | ✅ Terminé | Clôture comptable périodique, P&L automatisé, règle statutaire 30% / 70% |
| **Phase 8** | Rapports Financiers | ✅ Terminé | Compte de résultat détaillé, bilan simplifié, rentabilité par article |
| **Phase 9** | Paramètres, Audit & Backup | ✅ Terminé | Explorateur d'audit diff JSON, sauvegardes hot-backup `.sqlite`, diagnostic PRAGMA |
| **Phase 10** | Atelier & Kanban POD | ✅ Terminé | Pipeline confection 7 étapes, gestion des défauts/réimpressions, métriques atelier |
| **Phase 11** | Logistique & Transporteurs | ✅ Terminé | Bordereaux Yalidine/ZR Dispatch, étiquettes 10x15cm, grille 58 wilayas, versement COD |
| **Phase 12** | Intégration & Déploiement | ✅ Terminé | Dashboard exécutif temps réel, suite E2E complète, hardening de production |

---

## 🛠️ Prérequis & Installation

### 1. Prérequis Système
- **Node.js** : version 18.x ou supérieure (testé sous Node.js v24)
- **npm** : version 9.x ou supérieure
- Système d'exploitation : Windows, macOS, Linux

### 2. Cloner et Installer les Dépendances
```bash
git clone <repository-url>
cd "crm zr factory"
npm install
```

### 3. Migrations et Données Initiales (Seed)
Exécuter les migrations transactionnelles pour initialiser le schéma de données et charger les 58 Wilayas, les comptes de trésorerie et les utilisateurs de démonstration :
```bash
npm run db:migrate
npm run db:seed
```

### 4. Lancement en Mode Développement
Pour lancer simultanément le backend Express (port 5000) et le frontend React/Vite (port 5173) :
```bash
npm run dev
```
Accéder à l'application web via le navigateur : `http://localhost:5173`.

---

## 🔐 Identifiants et Profils Pré-configurés

La base de données est initialisée avec 5 profils prédéfinis pour valider l'ensemble des scénarios RBAC :

| Email | Mot de Passe | Rôle | Privilèges & Accès |
|---|---|---|---|
| `admin@zrfactory.dz` | `admin123456` | `ADMIN` | Accès total : finance, associés, utilisateurs, paramètres, backup |
| `riad@zrfactory.dz` | `riad123456` | `PARTNER` (30%) | Gestion financière, validation des retraits, rapports P&L et bilan |
| `brother@zrfactory.dz` | `brother123456` | `PARTNER` (70%) | Associé majoritaire, gestion du capital et consultations financières |
| `employee@zrfactory.dz` | `employee123456` | `EMPLOYEE` | Atelier Kanban, création commandes, suivi colis (Finances masquées) |
| `viewer@zrfactory.dz` | `viewer123456` | `VIEWER` | Lecture seule stricte (Toute tentative de modification renvoie `403`) |

---

## 🧪 Tests Automatisés & Vérification

La suite de tests automatisés comprend **15 suites de tests** et **150 tests** exécutés avec **Vitest** et **Supertest** :

```bash
# Exécuter l'ensemble des 150 tests
npm test

# Exécuter uniquement le test End-to-End complet
npm run test -- tests/e2e.test.ts --workspace=server
```

Toutes les suites s'exécutent avec un taux de réussite de **100% (0 échec, 0 régression)**.

---

## 📦 Compilation & Déploiement en Production

### 1. Démarrage Standalone en 1 Commande (Production)
Après la compilation, le serveur Node.js sert à la fois les API REST et l'application web SPA sur le port 3000 :
```bash
# Compilation du monorepo
npm run build

# Démarrage de production (API + Frontend sur http://localhost:3000)
npm start
```

### 2. Déploiement Conteneurisé avec Docker & Docker Compose
Un environnement conteneurisé prêt pour la production est configuré :
```bash
# Lancement de l'ensemble de la stack ERP avec persistance SQLite
docker-compose up -d --build

# Suivi des journaux
docker-compose logs -f
```
Les données de production et sauvegardes SQLite sont persistées dans le volume Docker `zr_factory_data`.

### Procédure de Sauvegarde et Restauration
- **Sauvegarde à chaud instantanée** : Accessible depuis l'interface administrateur (*Paramètres > Sauvegardes*) ou via appel direct `POST /api/system/backup`.
- Les clichés `.sqlite` sont horodatés et stockés dans `server/data/backups/`.
- **Contrôle d'intégrité** : Diagnostic matériel PRAGMA SQLite disponible via `GET /api/system/integrity`.

---

## ⚖️ Droits et Propriété
Développé exclusivement pour **ZR Factory Algérie**. Tous droits réservés.

