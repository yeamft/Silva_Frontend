# SYSTEM DESIGN DOCUMENT (SDD)

**Project:** BunaLink — Restaurant & Bar ERP Platform  
**Version:** 1.0  
**Prepared By:** BunaLink Engineering Team  
**Date:** February 2026  
**Classification:** Internal Technical Reference  
**Status:** Draft

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [System Overview](#2-system-overview)
3. [Architecture Design](#3-architecture-design)
4. [Detailed Component Design](#4-detailed-component-design)
5. [Database Design](#5-database-design)
6. [API Design](#6-api-design)
7. [Security Design](#7-security-design)
8. [Performance & Scalability](#8-performance--scalability)
9. [Deployment Architecture](#9-deployment-architecture)
10. [Logging & Monitoring](#10-logging--monitoring)
11. [Testing Strategy](#11-testing-strategy)
12. [Maintenance & Support](#12-maintenance--support)
13. [Future Enhancements](#13-future-enhancements)

---

## 1. Introduction

### 1.1 Purpose

This System Design Document (SDD) describes the technical architecture, component design, data model, API contracts, security mechanisms, and deployment strategy of the **BunaLink Restaurant ERP Platform**. It is intended to serve as the authoritative technical reference for developers, architects, QA engineers, and project stakeholders throughout the development and maintenance lifecycle of the system.

### 1.2 Scope

This document covers:

- Full application architecture (frontend SPA and planned backend services)
- Database schema and entity relationships
- REST API endpoint design
- State management strategy (Zustand stores)
- Role-based access control model
- Security implementation
- Infrastructure and deployment model
- Offline and real-time data strategies
- Internationalization and localization
- Testing and quality assurance strategy
- Known limitations and the v1.1 backend roadmap

### 1.3 Intended Audience

| Audience | Usage |
|---|---|
| Frontend Engineers | Component design, store contracts, routing, i18n |
| Backend Engineers | API design, database schema, integration points |
| QA Engineers | Testing strategy, module scope, data flows |
| System Architects | Architecture decisions, scalability, deployment |
| Project Managers / Stakeholders | System scope, module inventory, roadmap |

### 1.4 Definitions & Abbreviations

| Term | Definition |
|---|---|
| ERP | Enterprise Resource Planning |
| POS | Point of Sale |
| KDS | Kitchen Display System |
| GRN | Goods Receipt Note |
| PR | Purchase Requisition |
| PO | Purchase Order |
| AP | Accounts Payable |
| ETB | Ethiopian Birr (currency) |
| RBAC | Role-Based Access Control |
| SPA | Single Page Application |
| JWT | JSON Web Token |
| WMS | Warehouse Management System |
| BOM | Bill of Materials (Recipe) |
| FIFO | First In, First Out (inventory costing) |
| AVCO | Average Cost (inventory costing) |

### 1.5 References

- React Documentation — https://react.dev
- Zustand State Management — https://zustand-demo.pmnd.rs
- shadcn/ui Component Library — https://ui.shadcn.com
- Tailwind CSS — https://tailwindcss.com
- Vercel Deployment — https://vercel.com

---

## 2. System Overview

**BunaLink** is a full-featured, browser-based Restaurant Enterprise Resource Planning (ERP) system purpose-built for Ethiopian restaurant and bar operations, with built-in support for multi-branch growth. It digitizes and connects every operational layer of a modern restaurant — from a guest scanning a QR code and placing a digital menu order, through kitchen preparation and POS billing, to inventory deduction, procurement, double-entry accounting, and management reporting.

### 2.1 Core Business Problems Addressed

| Business Problem | BunaLink Solution |
|---|---|
| Disconnected paper-based ordering | Real-time digital POS with live KDS integration |
| Manual and error-prone inventory tracking | Automated stock deduction via recipe BOM + GRN receiving |
| No structured purchasing workflow | Full procure-to-pay: PR → PO → GRN → Vendor Bill |
| Fragmented financial records | Double-entry accounting linked to all sales and purchase transactions |
| Poor guest ordering experience | QR-accessible digital menu with cart, modifiers, and Amharic support |
| No multi-role staff access control | 8 configurable user roles with module-level permission gates |
| Lack of Ethiopian market support | Ethiopian Birr (ETB), Amharic language, local Ethiopian dish catalog |

### 2.2 System Boundaries

The current v1.0 release is a **client-side SPA** with in-memory state (Zustand). It operates as a fully functional frontend prototype with:

- All business logic implemented in the browser.
- Mock/seed data pre-loaded into stores on application startup.
- No external API calls or persistent server-side storage.
- Offline POS capability via `localStorage` cache.

The v1.1 release will introduce a full backend (Node.js/Express + PostgreSQL) and replace in-memory stores with real API-backed state.

### 2.3 Key Design Principles

- **Offline-first**: Core POS operations continue without network connectivity via `OfflineCache`.
- **Role-isolated views**: Each user role sees only the modules relevant to their workflow.
- **Bilingual**: Full English and Amharic (አማርኛ) translation across all UI screens.
- **Production-grade UX**: Framer Motion animations, responsive layouts, and touch-optimized controls for tablet staff.
- **ERP-grade data integrity**: Immutable transaction logs for all inventory movements, payments, and journal entries.
- **Ethiopian market alignment**: Currency (ETB), language (Amharic), local payment methods (Telebirr, CBE Birr).

---

## 3. Architecture Design

### 3.1 Architectural Style

The current v1.0 system follows a **Single-Tier Client Architecture** (pure SPA), with all presentation, business logic, and state residing in the browser. The planned v1.1 architecture transitions to a **Three-Tier Architecture**:

| Tier | v1.0 (Current) | v1.1 (Planned) |
|---|---|---|
| **Presentation Layer** | React SPA (browser) | React SPA (browser) |
| **Application Layer** | Zustand stores (in-browser) | Node.js / Express REST API |
| **Data Layer** | In-memory / localStorage | PostgreSQL + Redis |

### 3.2 High-Level Architecture Components

```
┌────────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                          │
│                  React 18 SPA (Vite Build)                     │
│                                                                │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────────┐ │
│  │  Public     │  │  Auth Pages  │  │   App Shell (/app)    │ │
│  │  Landing    │  │  /login      │  │   SideNav + TopBar    │ │
│  │  Page (/)   │  │  /register   │  │   + Active View       │ │
│  └─────────────┘  └──────────────┘  └───────────────────────┘ │
│                                              ↕                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Zustand State Layer (17 Stores)            │   │
│  │  authStore · orderStore · menuStore · inventoryStore    │   │
│  │  purchasingStore · tablesStore · accountingStore        │   │
│  │  paymentStore · kitchenStore · customersStore           │   │
│  │  shiftsStore · discountsStore · recipesStore            │   │
│  │  stationsStore · analyticsStore · localeStore           │   │
│  │  themeStore                                             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              ↕                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Infrastructure Services                    │   │
│  │  OfflineCache (localStorage)  RealtimeService (WS/SSE)  │   │
│  │  AnalyticsEngine              KitchenIntelligence        │   │
│  └─────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────┘
                              ↕  (v1.1)
┌────────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER (v1.1)                    │
│              Node.js / Express REST API + Socket.io            │
│   Orders API · Menu API · Inventory API · Purchasing API       │
│   Payments API · Auth API · Reports API · Analytics API        │
└────────────────────────────────────────────────────────────────┘
                              ↕  (v1.1)
┌────────────────────────────────────────────────────────────────┐
│                       DATA LAYER (v1.1)                        │
│         PostgreSQL (primary)  +  Redis (cache/sessions)        │
│         S3-compatible storage (images, receipts, exports)      │
└────────────────────────────────────────────────────────────────┘
```

### 3.3 Application Shell

The authenticated application shell lives in `src/pages/Index.tsx` and renders three regions:

- **`SideNav`** — collapsible sidebar. Navigation items are filtered at runtime based on the current user's role using `roleNav.ts`.
- **`TopBar`** — page title, user info, notification bell, language toggle, and theme toggle.
- **Active View** — a single view component swapped in based on `activeView` state. Maps to one of 23 module components.

Customer-role users bypass the full shell entirely and are served only `GuestMenuView` with a simplified header.

### 3.4 Technology Stack

#### Frontend (Current — v1.0)

| Category | Technology | Version |
|---|---|---|
| Framework | React | 18.3.1 |
| Language | TypeScript | 5.8.3 |
| Build Tool | Vite | 5.4.19 |
| Routing | React Router DOM | 6.30.1 |
| State Management | Zustand | 5.0.11 |
| UI Components | shadcn/ui (Radix UI primitives) | various |
| Styling | Tailwind CSS | 3.4.17 |
| Animation | Framer Motion | 11.18.2 |
| Charts | Recharts | 2.15.4 |
| Icons | Lucide React | 0.462.0 |
| Form Handling | React Hook Form + Zod | 7.61.1 / 3.25.76 |
| Async Data | TanStack Query | 5.83.0 |
| Date Utilities | date-fns | 3.6.0 |
| Notifications | Sonner | 1.7.4 |
| Testing | Vitest | 3.2.4 |
| Deployment | Vercel | — |

#### Backend (Planned — v1.1)

| Category | Technology |
|---|---|
| Runtime | Node.js (v20 LTS) |
| Framework | Express.js |
| Database | PostgreSQL 16 |
| ORM | Prisma |
| Cache | Redis |
| Auth | JWT + bcrypt |
| Real-time | Socket.io |
| File Storage | AWS S3 / MinIO |
| PDF Generation | Puppeteer |
| Queue | Bull (Redis-backed) |

---

## 4. Detailed Component Design

### 4.1 Order Management Module

**Component:** `src/components/OrdersView.tsx` and `src/components/StaffTabletView.tsx`  
**Store:** `src/store/orderStore.ts`  
**Access Roles:** admin, manager, cashier, waiter

Handles the complete order lifecycle from creation through payment. Implements a state machine for order status transitions.

#### Order State Machine

```
draft ──► pending ──► confirmed ──► preparing ──► ready ──► served ──► paid
                                                                 │
                                                                 ├──► refunded
                                                                 └──► cancelled
                                             void ◄───────────────────────────
```

#### Order Types
| Type | Description |
|---|---|
| `dine-in` | Linked to a physical table; assigned to a server |
| `takeaway` | Counter pickup; no table assignment |
| `delivery` | Assigned to a delivery staff member |
| `online` | Originating from the Guest Menu QR code flow |

#### Key Store Actions
| Action | Description |
|---|---|
| `addOrder(order)` | Creates a new order; broadcasts via `RealtimeService` |
| `updateOrderStatus(id, status)` | Advances or reverts order status |
| `updateOrderItems(id, items)` | Modifies line items on an open order |
| `voidOrder(id, reason)` | Marks order as void with audit reason |
| `init()` | Bootstraps the store: connects WebSocket, loads `OfflineCache` |

#### Staff Tablet POS Workflow
1. Select or create an order (link to a table or mark as takeaway/delivery).
2. Browse menu with category pill-strip filter and search bar.
3. Add items with +/- steppers; tap to open modifier and note dialog.
4. Apply discount: manual percentage/fixed amount, or validate coupon code against `discountsStore`.
5. Checkout: select payment method → `paymentStore.addPayment()` → order status → `paid`.

---

### 4.2 Inventory Management Module

**Component:** `src/components/InventoryView.tsx`  
**Store:** `src/store/inventoryStore.ts`  
**Access Roles:** admin, manager, inventory

A full 8-tab Warehouse Management System (WMS).

| Tab | Function |
|---|---|
| Items | Master item catalog CRUD (raw materials, beverages, consumables, packaging) |
| Stock Levels | Real-time per-item, per-warehouse quantity view with reorder status |
| Movements | Immutable ledger of all stock transactions (Receipt, Issue, Transfer, Adjustment, Waste, Count Variance) |
| GRN Receiving | Receive goods against Purchase Orders; capture lot/expiry/cost/location |
| Stock Counts | Initiate cycle counts; enter physical counts; post variance adjustments |
| Waste Log | Record spoilage with item, quantity, reason, and responsible staff |
| Reorder Alerts | Dynamic list of items at or below reorder point with "Create PR" shortcut |
| Reports | Stock valuation, movement history, lot/expiry, and waste summary reports |

#### Inventory Costing Methods
| Method | Description |
|---|---|
| FIFO | First In, First Out — oldest cost layers consumed first |
| AVCO | Average Cost — weighted average of all stock layers |

#### Stock Movement Types
`Receipt` · `Issue` · `Transfer` · `Adjustment` · `Return` · `Waste` · `Count Variance`

---

### 4.3 Payment Module

**Component:** `src/components/BillingPaymentsView.tsx`  
**Store:** `src/store/paymentStore.ts`  
**Access Roles:** admin, manager, cashier

Handles payment authorization, capture, and refunds for all order types.

#### Supported Payment Methods
| Method | Description |
|---|---|
| Cash | Manual cash entry with change calculation |
| Card | POS terminal integration (tap/chip/swipe) |
| QR / Mobile Money | Telebirr, CBE Birr, and other Ethiopian mobile payment platforms |

#### Payment Workflow
1. Select an open order (filtered to `bill_requested` or unpaid status).
2. Review order summary: line items, discounts, service charge (10%), VAT (15%), grand total in ETB.
3. Select payment method and confirm.
4. `paymentStore.addPayment()` creates a `Payment` record.
5. `orderStore.updateOrderStatus(id, "paid")` propagates to tables and dashboard.

#### Refund Handling
- **Full refund** — reverses entire payment; order status → `refunded`.
- **Partial refund** — refunds specified amount; original payment record updated.

---

### 4.4 Kitchen Display System (KDS)

**Component:** `src/components/KDSView.tsx`  
**Store:** `src/store/kitchenStore.ts` + `src/store/orderStore.ts`  
**Access Roles:** admin, manager, chef

Replaces printed kitchen tickets with a live digital display grouped by station.

#### Ticket Lifecycle
- Orders with status `confirmed`, `preparing`, or `ready` render as KDS tickets.
- Elapsed time is displayed with color escalation: green (< 10 min) → yellow (10–20 min) → red (> 20 min).
- Priority badges are auto-assigned: **Normal / Rush / VIP** based on order age and customer flags.
- Station filter strip (from `stationsStore`) allows each station to see only their relevant tickets.

#### Status Bumping (Directly from KDS)
```
New ──► Preparing ──► Ready ──► Served
```
Each bump calls `orderStore.updateOrderStatus()`, updating all connected views in real time.

---

### 4.5 Purchasing & Procurement Module

**Component:** `src/components/PurchasingView.tsx`  
**Store:** `src/store/purchasingStore.ts`  
**Access Roles:** admin, manager, inventory

Full 7-tab procure-to-pay workflow.

#### Procurement Lifecycle
```
Purchase Requisition (PR)
        ↓  approve
Purchase Order (PO)
        ↓  receive goods
Goods Receipt Note (GRN) ──────────────► Inventory Stock Updated
        ↓  three-way match
Vendor Bill (AP Invoice)
        ↓  pay
Bank Transfer / Payment ─────────────► Accounting Payables Updated
```

| Tab | Function |
|---|---|
| Dashboard | KPI cards, Quick Actions, PRs pending approval, overdue alerts |
| Requisitions (PR) | Create/approve/reject PRs; convert approved PR to PO |
| Purchase Orders | Create/approve POs; track partial/full delivery status |
| GRN Receiving | Receive goods against PO lines; capture lot/expiry/location |
| Vendor Bills (AP) | Create bills from GRN; post and record payments |
| Vendors | Vendor directory with performance metrics (on-time %, lead time, spend) |
| Reports | Spend by vendor, PO status summary, GRN variance, vendor performance |

---

### 4.6 Accounting Module

**Component:** `src/components/AccountingView.tsx`  
**Store:** `src/store/accountingStore.ts`  
**Access Roles:** admin only

Double-entry bookkeeping aligned with Ethiopian accounting standards.

| Sub-module | Function |
|---|---|
| Chart of Accounts | Account CRUD (Assets, Liabilities, Equity, Revenue, Expenses) |
| Journal Entries | Manual and system-auto double-entry JEs; debits must equal credits |
| Sales Invoices | Revenue recognition; linked to `orderStore` orders |
| Vendor Bills | Expense recognition; linked to `purchasingStore` GRNs |
| Bank Accounts | Multi-bank account management (CBE, Dashen, Awash, etc.); transfers |
| Tax Configuration | VAT, service charge, and withholding tax rate configuration |

System automatically posts journal entries from: sales invoice settlements, vendor bill payments, and bank transfers.

---

### 4.7 Guest Menu Module (Digital Menu)

**Component:** `src/components/GuestMenuView.tsx`  
**Access Roles:** customer (primary), all roles (preview)

Consumer-facing digital menu accessed via QR code at the table.

#### Guest Checkout Flow
```
Scan QR Code
      ↓
Browse Menu (category filter + search)
      ↓
Open Item Detail (modifiers + special note)
      ↓
Add to Cart
      ↓
Open Cart Drawer (subtotal + service charge + VAT)
      ↓
Enter Promo Code (optional — validated vs. discountsStore)
      ↓
Select Payment: [Pay Now (card/QR)] or [Pay at Counter (cash)]
      ↓
Order Confirmed → orderStore.addOrder(type: "online")
      ↓
Success Screen (Order ID + estimated time)
```

#### Localization
- Full English / Amharic language toggle.
- All prices displayed in Ethiopian Birr (ETB).
- Amharic menu item names and descriptions supported.

---

### 4.8 CRM & Loyalty Module

**Component:** `src/components/CRMView.tsx`  
**Store:** `src/store/customersStore.ts`  
**Access Roles:** admin, manager

#### Loyalty Tiers
| Tier | Points Range | Benefits |
|---|---|---|
| Bronze | 0 – 499 | Basic discount eligibility |
| Silver | 500 – 1,999 | Priority seating |
| Gold | 2,000 – 4,999 | Exclusive promotions |
| Platinum | 5,000+ | VIP status; dedicated server |

Points are earned per ETB spent at a configurable ratio. Feedback and star ratings are captured per visit and tracked per server and per menu item.

---

### 4.9 Reporting Module

**Component:** `src/components/ReportsView.tsx` + `src/components/AnalyticsView.tsx`  
**Access Roles:** admin, manager

#### Available Reports
- Daily Sales Summary
- Revenue by Menu Category
- Waiter / Staff Performance
- Inventory Consumption
- Waste & Spoilage Report
- Purchasing Spend Analysis
- Customer Visit Frequency
- Shift Summary Report

#### Analytics Visualizations
| Panel | Chart Type | Data Source |
|---|---|---|
| Order Volume by Hour | Bar chart | `orderStore` |
| Station Load | Horizontal bar | `stationsStore` + `kitchenStore` |
| Top-Selling Items | Ranked list | `orderStore` |
| Revenue by Order Type | Pie / donut | `paymentStore` |
| Waste Overview | Bar chart | `inventoryStore` |

---

## 5. Database Design

> **Note:** The following schema describes the target relational database design for the v1.1 backend. In v1.0, all data is held in-memory within Zustand stores using equivalent TypeScript interfaces.

### 5.1 Core Tables

#### Users & Access
```sql
Users (
  user_id       UUID PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('admin','manager','cashier','waiter','chef','inventory','delivery','customer'),
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP
)
```

#### Customers
```sql
Customers (
  customer_id     UUID PRIMARY KEY,
  name            VARCHAR(100) NOT NULL,
  phone           VARCHAR(20),
  email           VARCHAR(150),
  date_of_birth   DATE,
  loyalty_points  INTEGER DEFAULT 0,
  loyalty_tier    ENUM('bronze','silver','gold','platinum') DEFAULT 'bronze',
  total_spend     DECIMAL(12,2) DEFAULT 0,
  visit_count     INTEGER DEFAULT 0,
  preferred_lang  ENUM('en','am') DEFAULT 'en',
  created_at      TIMESTAMP DEFAULT NOW()
)
```

#### Menu
```sql
MenuCategories (
  category_id  UUID PRIMARY KEY,
  name         VARCHAR(100) NOT NULL,
  name_am      VARCHAR(100),
  icon         VARCHAR(50),
  color        VARCHAR(20),
  sort_order   INTEGER DEFAULT 0,
  is_active    BOOLEAN DEFAULT TRUE
)

MenuItems (
  item_id        UUID PRIMARY KEY,
  category_id    UUID REFERENCES MenuCategories(category_id),
  name           VARCHAR(100) NOT NULL,
  name_am        VARCHAR(100),
  description    TEXT,
  description_am TEXT,
  price          DECIMAL(10,2) NOT NULL,
  cost_price     DECIMAL(10,2),
  image_url      VARCHAR(500),
  video_url      VARCHAR(500),
  allergens      TEXT[],
  is_vegetarian  BOOLEAN DEFAULT FALSE,
  is_vegan       BOOLEAN DEFAULT FALSE,
  is_halal       BOOLEAN DEFAULT TRUE,
  is_gluten_free BOOLEAN DEFAULT FALSE,
  prep_time_min  INTEGER,
  is_available   BOOLEAN DEFAULT TRUE,
  is_archived    BOOLEAN DEFAULT FALSE,
  created_at     TIMESTAMP DEFAULT NOW()
)

MenuModifiers (
  modifier_id  UUID PRIMARY KEY,
  item_id      UUID REFERENCES MenuItems(item_id),
  group_name   VARCHAR(100) NOT NULL,
  option_name  VARCHAR(100) NOT NULL,
  price_delta  DECIMAL(8,2) DEFAULT 0,
  is_required  BOOLEAN DEFAULT FALSE
)
```

#### Tables & Reservations
```sql
Sections (
  section_id   UUID PRIMARY KEY,
  name         VARCHAR(100) NOT NULL,
  capacity     INTEGER,
  floor_level  INTEGER DEFAULT 1
)

Tables (
  table_id    UUID PRIMARY KEY,
  section_id  UUID REFERENCES Sections(section_id),
  name        VARCHAR(50),
  seats       INTEGER NOT NULL,
  shape       ENUM('round','square','rectangle','bar') DEFAULT 'square',
  table_type  ENUM('standard','vip','bar','outdoor') DEFAULT 'standard',
  status      ENUM('available','occupied','reserved','cleaning','serving','bill_requested') DEFAULT 'available',
  pos_x       INTEGER DEFAULT 0,
  pos_y       INTEGER DEFAULT 0,
  is_active   BOOLEAN DEFAULT TRUE
)

Reservations (
  reservation_id  UUID PRIMARY KEY,
  table_id        UUID REFERENCES Tables(table_id),
  customer_id     UUID REFERENCES Customers(customer_id),
  guest_name      VARCHAR(100) NOT NULL,
  guest_phone     VARCHAR(20),
  party_size      INTEGER NOT NULL,
  reserved_at     TIMESTAMP NOT NULL,
  status          ENUM('pending','confirmed','seated','completed','no_show') DEFAULT 'pending',
  notes           TEXT,
  created_at      TIMESTAMP DEFAULT NOW()
)
```

#### Orders
```sql
Orders (
  order_id      UUID PRIMARY KEY,
  table_id      UUID REFERENCES Tables(table_id),
  customer_id   UUID REFERENCES Customers(customer_id),
  server_id     UUID REFERENCES Users(user_id),
  order_type    ENUM('dine-in','takeaway','delivery','online') NOT NULL,
  status        ENUM('draft','pending','confirmed','preparing','ready','served','paid','refunded','cancelled','void') DEFAULT 'draft',
  subtotal      DECIMAL(10,2) DEFAULT 0,
  discount_amt  DECIMAL(10,2) DEFAULT 0,
  service_charge DECIMAL(10,2) DEFAULT 0,
  tax_amount    DECIMAL(10,2) DEFAULT 0,
  total_amount  DECIMAL(10,2) DEFAULT 0,
  notes         TEXT,
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP
)

OrderItems (
  order_item_id  UUID PRIMARY KEY,
  order_id       UUID REFERENCES Orders(order_id) ON DELETE CASCADE,
  item_id        UUID REFERENCES MenuItems(item_id),
  item_name      VARCHAR(100) NOT NULL,
  quantity       INTEGER NOT NULL,
  unit_price     DECIMAL(10,2) NOT NULL,
  line_total     DECIMAL(10,2) NOT NULL,
  modifiers      JSONB,
  special_note   TEXT
)
```

#### Payments
```sql
Payments (
  payment_id     UUID PRIMARY KEY,
  order_id       UUID REFERENCES Orders(order_id),
  method         ENUM('cash','card','qr','mobile_money') NOT NULL,
  status         ENUM('pending','completed','refunded','partial_refund','failed') DEFAULT 'pending',
  amount         DECIMAL(10,2) NOT NULL,
  refunded_amt   DECIMAL(10,2) DEFAULT 0,
  transaction_ref VARCHAR(200),
  processed_by   UUID REFERENCES Users(user_id),
  processed_at   TIMESTAMP DEFAULT NOW()
)
```

#### Inventory
```sql
InventoryItems (
  item_id         UUID PRIMARY KEY,
  code            VARCHAR(50) UNIQUE,
  name            VARCHAR(150) NOT NULL,
  category        VARCHAR(100),
  item_type       ENUM('raw_material','beverage','consumable','packaging','semi_finished'),
  unit            VARCHAR(30) NOT NULL,
  costing_method  ENUM('fifo','avco') DEFAULT 'avco',
  reorder_point   DECIMAL(10,3),
  reorder_qty     DECIMAL(10,3),
  min_stock       DECIMAL(10,3),
  barcode         VARCHAR(100),
  is_active       BOOLEAN DEFAULT TRUE
)

Warehouses (
  warehouse_id  UUID PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  location      VARCHAR(200),
  is_active     BOOLEAN DEFAULT TRUE
)

StockLevels (
  level_id      UUID PRIMARY KEY,
  item_id       UUID REFERENCES InventoryItems(item_id),
  warehouse_id  UUID REFERENCES Warehouses(warehouse_id),
  qty_on_hand   DECIMAL(10,3) DEFAULT 0,
  qty_committed DECIMAL(10,3) DEFAULT 0,
  unit_cost     DECIMAL(10,4) DEFAULT 0,
  UNIQUE (item_id, warehouse_id)
)

StockMovements (
  movement_id   UUID PRIMARY KEY,
  item_id       UUID REFERENCES InventoryItems(item_id),
  warehouse_id  UUID REFERENCES Warehouses(warehouse_id),
  movement_type ENUM('receipt','issue','transfer','adjustment','return','waste','count_variance'),
  qty           DECIMAL(10,3) NOT NULL,
  unit_cost     DECIMAL(10,4),
  reference_id  UUID,
  reference_type VARCHAR(50),
  lot_number    VARCHAR(100),
  expiry_date   DATE,
  notes         TEXT,
  created_by    UUID REFERENCES Users(user_id),
  created_at    TIMESTAMP DEFAULT NOW()
)
```

#### Purchasing
```sql
Vendors (
  vendor_id      UUID PRIMARY KEY,
  name           VARCHAR(150) NOT NULL,
  contact_person VARCHAR(100),
  phone          VARCHAR(20),
  email          VARCHAR(150),
  address        TEXT,
  tax_id         VARCHAR(50),
  payment_terms  VARCHAR(100),
  lead_time_days INTEGER DEFAULT 3,
  is_active      BOOLEAN DEFAULT TRUE
)

PurchaseRequisitions (
  pr_id         UUID PRIMARY KEY,
  pr_number     VARCHAR(50) UNIQUE,
  requester_id  UUID REFERENCES Users(user_id),
  department    VARCHAR(100),
  required_by   DATE,
  status        ENUM('draft','submitted','approved','rejected','converted') DEFAULT 'draft',
  priority      ENUM('low','normal','high','urgent') DEFAULT 'normal',
  notes         TEXT,
  created_at    TIMESTAMP DEFAULT NOW()
)

PurchaseOrders (
  po_id          UUID PRIMARY KEY,
  po_number      VARCHAR(50) UNIQUE,
  vendor_id      UUID REFERENCES Vendors(vendor_id),
  warehouse_id   UUID REFERENCES Warehouses(warehouse_id),
  status         ENUM('draft','approved','partially_received','fully_received','cancelled') DEFAULT 'draft',
  subtotal       DECIMAL(12,2),
  tax_amount     DECIMAL(12,2),
  total_amount   DECIMAL(12,2),
  payment_terms  VARCHAR(100),
  expected_date  DATE,
  approved_by    UUID REFERENCES Users(user_id),
  created_at     TIMESTAMP DEFAULT NOW()
)

GoodsReceiptNotes (
  grn_id         UUID PRIMARY KEY,
  grn_number     VARCHAR(50) UNIQUE,
  po_id          UUID REFERENCES PurchaseOrders(po_id),
  warehouse_id   UUID REFERENCES Warehouses(warehouse_id),
  status         ENUM('draft','posted') DEFAULT 'draft',
  received_by    UUID REFERENCES Users(user_id),
  received_at    TIMESTAMP DEFAULT NOW()
)

VendorBills (
  bill_id        UUID PRIMARY KEY,
  bill_number    VARCHAR(50) UNIQUE,
  vendor_id      UUID REFERENCES Vendors(vendor_id),
  po_id          UUID REFERENCES PurchaseOrders(po_id),
  status         ENUM('draft','posted','partially_paid','paid','overdue') DEFAULT 'draft',
  total_amount   DECIMAL(12,2),
  paid_amount    DECIMAL(12,2) DEFAULT 0,
  due_date       DATE,
  created_at     TIMESTAMP DEFAULT NOW()
)
```

#### Accounting
```sql
Accounts (
  account_id    UUID PRIMARY KEY,
  code          VARCHAR(20) UNIQUE,
  name          VARCHAR(150) NOT NULL,
  account_type  ENUM('asset','liability','equity','revenue','expense'),
  currency      VARCHAR(10) DEFAULT 'ETB',
  opening_balance DECIMAL(14,2) DEFAULT 0,
  is_active     BOOLEAN DEFAULT TRUE
)

JournalEntries (
  je_id         UUID PRIMARY KEY,
  je_number     VARCHAR(50) UNIQUE,
  entry_date    DATE NOT NULL,
  reference     VARCHAR(100),
  memo          TEXT,
  posted_by     UUID REFERENCES Users(user_id),
  created_at    TIMESTAMP DEFAULT NOW()
)

JournalLines (
  line_id     UUID PRIMARY KEY,
  je_id       UUID REFERENCES JournalEntries(je_id) ON DELETE CASCADE,
  account_id  UUID REFERENCES Accounts(account_id),
  description VARCHAR(200),
  debit       DECIMAL(14,2) DEFAULT 0,
  credit      DECIMAL(14,2) DEFAULT 0
)
```

#### Discounts
```sql
Discounts (
  discount_id    UUID PRIMARY KEY,
  code           VARCHAR(50) UNIQUE,
  name           VARCHAR(150) NOT NULL,
  discount_type  ENUM('percent','fixed','bogo') NOT NULL,
  value          DECIMAL(10,2) NOT NULL,
  scope          ENUM('order','item','category') DEFAULT 'order',
  min_order_value DECIMAL(10,2) DEFAULT 0,
  usage_limit    INTEGER,
  usage_count    INTEGER DEFAULT 0,
  valid_from     TIMESTAMP,
  valid_until    TIMESTAMP,
  is_active      BOOLEAN DEFAULT TRUE,
  created_at     TIMESTAMP DEFAULT NOW()
)
```

### 5.2 Key Relationships

```
Users ──────────────────────► Orders (server_id)
Customers ──────────────────► Orders (customer_id)  [1 customer → many orders]
Orders ──────────────────────► OrderItems            [1 order → many items]
Orders ──────────────────────► Payments              [1 order → 1 payment]
Tables ──────────────────────► Orders                [1 table → many orders over time]
Sections ────────────────────► Tables                [1 section → many tables]
Tables ──────────────────────► Reservations
MenuItems ───────────────────► OrderItems
MenuItems ───────────────────► MenuModifiers
MenuCategories ──────────────► MenuItems
PurchaseRequisitions ────────► PurchaseOrders        [1 PR → 1 PO]
PurchaseOrders ──────────────► GoodsReceiptNotes     [1 PO → many GRNs (partial)]
GoodsReceiptNotes ───────────► VendorBills
GoodsReceiptNotes ───────────► StockMovements
Vendors ─────────────────────► PurchaseOrders
JournalEntries ──────────────► JournalLines          [1 JE → many lines (balanced)]
Accounts ────────────────────► JournalLines
```

---

## 6. API Design

> **Note:** These endpoints define the v1.1 REST API contract. In v1.0, the equivalent logic is handled directly by Zustand store actions in the browser.

### 6.1 Authentication Endpoints

```
POST   /api/auth/login          — Authenticate user, return JWT access + refresh tokens
POST   /api/auth/logout         — Invalidate refresh token
POST   /api/auth/refresh        — Refresh access token using refresh token
GET    /api/auth/me             — Get current authenticated user profile
```

### 6.2 Order Endpoints

```
GET    /api/orders              — List orders (filter: status, type, date, table)
POST   /api/orders              — Create new order
GET    /api/orders/:id          — Get order details with line items
PUT    /api/orders/:id          — Update order (items, status, discount)
DELETE /api/orders/:id          — Void order (soft delete with reason)
POST   /api/orders/:id/status   — Advance order status
```

### 6.3 Menu Endpoints

```
GET    /api/menu/categories     — List all active menu categories
POST   /api/menu/categories     — Create category
PUT    /api/menu/categories/:id — Update category
DELETE /api/menu/categories/:id — Delete/deactivate category

GET    /api/menu/items          — List menu items (filter: category, available, archived)
POST   /api/menu/items          — Create menu item
GET    /api/menu/items/:id      — Get item details with modifiers
PUT    /api/menu/items/:id      — Update menu item
DELETE /api/menu/items/:id      — Archive menu item
```

### 6.4 Inventory Endpoints

```
GET    /api/inventory/items           — List inventory items
POST   /api/inventory/items           — Create item
PUT    /api/inventory/items/:id       — Update item
GET    /api/inventory/stock-levels    — Get stock levels (filter: warehouse, item, below-reorder)
POST   /api/inventory/movements       — Record stock movement
GET    /api/inventory/movements       — List movements (filter: type, item, date)
POST   /api/inventory/grn             — Create GRN
POST   /api/inventory/grn/:id/post    — Post GRN (updates stock levels)
GET    /api/inventory/stock-counts    — List stock counts
POST   /api/inventory/stock-counts    — Initiate stock count
POST   /api/inventory/stock-counts/:id/post — Post count (creates adjustments)
```

### 6.5 Purchasing Endpoints

```
GET    /api/purchasing/vendors         — List vendors
POST   /api/purchasing/vendors         — Create vendor
PUT    /api/purchasing/vendors/:id     — Update vendor

GET    /api/purchasing/pr              — List purchase requisitions
POST   /api/purchasing/pr              — Create PR
PUT    /api/purchasing/pr/:id/approve  — Approve PR
PUT    /api/purchasing/pr/:id/reject   — Reject PR

GET    /api/purchasing/po              — List purchase orders
POST   /api/purchasing/po              — Create PO
PUT    /api/purchasing/po/:id/approve  — Approve PO
PUT    /api/purchasing/po/:id/cancel   — Cancel PO

GET    /api/purchasing/bills           — List vendor bills
POST   /api/purchasing/bills           — Create vendor bill
POST   /api/purchasing/bills/:id/post  — Post bill
POST   /api/purchasing/bills/:id/pay   — Record payment
```

### 6.6 Payment Endpoints

```
POST   /api/payments            — Process payment for an order
GET    /api/payments/:id        — Get payment details
POST   /api/payments/:id/refund — Process full or partial refund
```

### 6.7 Authentication

All API endpoints (except `/api/auth/login`) require a valid JWT Bearer token in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

Role-based access is enforced at the API gateway level via middleware that validates the token's `role` claim against a permission map — mirroring the frontend `roleNav.ts` matrix.

```
GET /api/orders         → allowed: admin, manager, cashier, waiter
GET /api/accounting/*   → allowed: admin only
GET /api/inventory/*    → allowed: admin, manager, inventory
```

---

## 7. Security Design

### 7.1 Transport Security
- All traffic served over **HTTPS (TLS 1.2+)** enforced at the CDN/load balancer level.
- HSTS headers enabled to prevent protocol downgrade attacks.
- Vercel CDN provides automatic certificate management in v1.0 deployment.

### 7.2 Authentication & Session Management
- **v1.0 (current)**: Local in-memory authentication via `authStore`. No password hashing; for development use only.
- **v1.1 (planned)**:
  - Password hashing with **bcrypt** (cost factor 12) or **argon2id**.
  - JWT access tokens (15-minute expiry) + HTTP-only cookie refresh tokens (7-day expiry).
  - Refresh token rotation on every use.
  - Token invalidation on logout via Redis blocklist.

### 7.3 Authorization — Role-Based Access Control (RBAC)
- 8 roles with module-level and action-level permissions.
- Frontend: `roleNav.ts` filters navigation items; `AuthGuard` blocks direct URL access.
- Backend (v1.1): Middleware validates role claim from JWT on every request.
- No privilege escalation — users cannot modify their own role.

### 7.4 Input Validation & Injection Prevention
- All form inputs validated with **Zod** schemas before state mutations.
- **v1.1**: Parameterized queries via Prisma ORM eliminate SQL injection risk.
- Request body size limits enforced at the API gateway.
- XSS prevention: React's JSX escaping + Content-Security-Policy headers.

### 7.5 Data Protection
- Sensitive fields (passwords, payment references) never returned in API list responses.
- **v1.1**: PII fields (customer phone, email) encrypted at rest using AES-256.
- Payment card data never stored; delegated entirely to payment gateway tokenization (Telebirr, CBE Birr).

### 7.6 Audit Logging
- **v1.0**: Order void reasons captured in store state.
- **v1.1**: Immutable audit log table recording all create/update/delete operations with user ID, timestamp, changed fields (before/after), and IP address.

---

## 8. Performance & Scalability

### 8.1 Frontend Performance
- **Code splitting**: Vite's dynamic `import()` splits each major view into a separate chunk, loaded on demand.
- **Zustand selector optimization**: Components subscribe to minimal state slices. Derived arrays are computed in `useMemo` to prevent re-render loops (critical for Zustand with Object.is comparison).
- **Framer Motion**: `layout` animations use GPU-accelerated CSS transforms. `AnimatePresence` ensures exiting elements are cleanly unmounted.
- **Pagination**: All list views paginate at 8–12 records per page to prevent DOM overload on large datasets.
- **Recharts**: Chart data is memoized to avoid unnecessary re-renders on unrelated state changes.

### 8.2 Backend Scalability (v1.1)
- **Horizontal scaling**: Stateless Express API instances behind a load balancer (NGINX or AWS ALB). Session state held in Redis, not in-process.
- **Database indexing**: Indexes on all foreign keys, status columns, and frequently filtered fields (`order.status`, `order.created_at`, `stock_movements.item_id`, `stock_movements.created_at`).
- **Redis caching**: Menu items, stock levels, and analytics aggregates cached in Redis with configurable TTL. Cache invalidated on write.
- **Asynchronous processing**: Email notifications, receipt PDF generation, and report exports processed via Bull job queues (Redis-backed) to avoid blocking API responses.
- **Connection pooling**: Prisma's built-in connection pool manages PostgreSQL connections efficiently under concurrent load.

### 8.3 Real-time Performance
- **v1.0**: `RealtimeService` is a mock that fires local in-process events. Zero latency.
- **v1.1**: Socket.io with Redis adapter for multi-instance pub/sub. Rooms scoped by branch and station to minimize unnecessary broadcasts.

---

## 9. Deployment Architecture

### 9.1 v1.0 — Current Deployment (Vercel)

```
GitHub Repository
      ↓  push to main
Vercel CI/CD Pipeline
      ↓  npm run build (Vite)
Vercel Edge Network (CDN)
      ↓  HTTPS
End User Browser (React SPA)
```

- `vercel.json` configures SPA rewrites (all routes → `index.html`).
- Static assets (JS chunks, CSS, fonts) served from Vercel's global CDN with automatic cache headers.
- No server; entirely static.

### 9.2 v1.1 — Planned Production Deployment (Cloud)

```
                   ┌──────────────┐
                   │  DNS / CDN   │
                   │  (Cloudflare)│
                   └──────┬───────┘
              ┌───────────┴────────────┐
              ↓                        ↓
  ┌─────────────────┐       ┌─────────────────────┐
  │  Static Frontend│       │   Load Balancer      │
  │  (Vercel / S3)  │       │   (NGINX / AWS ALB)  │
  └─────────────────┘       └──────────┬──────────┘
                                        ↓
                         ┌──────────────────────────┐
                         │  API Server Cluster       │
                         │  Node.js + Express        │
                         │  (Docker containers)      │
                         │  Instance 1 │ Instance 2  │
                         └──────┬───────────────┬───┘
                                ↓               ↓
               ┌────────────────┐    ┌──────────────────────┐
               │  PostgreSQL    │    │  Redis               │
               │  (Primary +    │    │  (Cache + Sessions   │
               │   Read Replica)│    │   + Job Queues)      │
               └────────────────┘    └──────────────────────┘
                                              ↓
                                   ┌──────────────────────┐
                                   │  S3 / Object Storage │
                                   │  (Images, PDFs,      │
                                   │   Report Exports)    │
                                   └──────────────────────┘
```

### 9.3 Containerization
- All backend services containerized with **Docker**.
- `docker-compose.yml` for local development (API + PostgreSQL + Redis).
- Production: Kubernetes (EKS / GKE) or Docker Swarm for orchestration.

### 9.4 CI/CD Pipeline
- GitHub Actions triggers on push to `main`.
- Pipeline stages: Install → Lint → TypeScript check → Unit tests → Build → Deploy.
- Environment variables managed via GitHub Secrets / Vercel project settings.

### 9.5 Backup & Disaster Recovery
- PostgreSQL: daily full backup + continuous WAL archiving to S3.
- Point-in-time recovery (PITR) to any minute within the last 7 days.
- Redis: RDB snapshots every 15 minutes to persistent volume.
- Recovery Time Objective (RTO): < 30 minutes.
- Recovery Point Objective (RPO): < 15 minutes.

---

## 10. Logging & Monitoring

### 10.1 Application Logging (v1.1)
- **Structured JSON logging** via Winston or Pino.
- Log levels: `error`, `warn`, `info`, `debug`.
- Every API request logs: timestamp, method, path, status code, response time, user ID, IP address.
- All errors include stack trace, request context, and correlation ID.

### 10.2 Centralized Log Aggregation
- Logs shipped to **ELK Stack** (Elasticsearch + Logstash + Kibana) or **Grafana Loki**.
- Kibana dashboards for: error rates, slow queries, authentication failures, and API throughput.
- Log retention: 30 days hot storage, 1 year cold storage.

### 10.3 Performance Monitoring
- **APM**: Datadog or New Relic agent on API servers tracks response times, throughput, and error rates per endpoint.
- **Frontend**: Vercel Analytics + Web Vitals (LCP, FID, CLS) monitored per page.
- **Database**: pg_stat_statements for slow query identification; automated EXPLAIN ANALYZE on queries > 500ms.

### 10.4 Alerting
- PagerDuty / OpsGenie alerts triggered by:
  - API error rate > 1% over 5 minutes.
  - P95 response time > 2 seconds.
  - Database connection pool exhaustion.
  - Disk usage > 80%.
  - Failed authentication spike (potential brute-force).

### 10.5 Uptime Monitoring
- External uptime checks every 60 seconds from 3 global locations.
- Public status page for operational transparency.
- Target SLA: **99.9% uptime** (< 9 hours downtime per year).

---

## 11. Testing Strategy

### 11.1 Unit Testing
- **Framework**: Vitest (configured in `vite.config.ts`).
- **Scope**: Zustand store actions and reducers, utility functions (`translations.ts`, `formatCurrency`), Zod validation schemas.
- **Coverage target**: ≥ 80% for all store files and utility libraries.
- **Example**: Test that `orderStore.voidOrder()` sets status to `void`, captures the reason, and does not modify other orders.

### 11.2 Component Testing
- **Framework**: Vitest + React Testing Library.
- **Scope**: All major view components tested for render correctness, user interaction, and conditional rendering based on role props.
- **Key scenarios**: Role-based navigation filtering, form validation error display, pagination behavior, discount coupon validation.

### 11.3 Integration Testing
- **Scope (v1.1)**: API endpoints tested end-to-end with a live test PostgreSQL database.
- **Framework**: Supertest + Vitest.
- **Key scenarios**: Full order lifecycle (create → confirm → pay → inventory deduction), GRN posting → stock level update, vendor bill → accounting JE creation.

### 11.4 System / End-to-End Testing
- **Framework**: Playwright.
- **Scope**: Critical user journeys tested in a real browser:
  - Guest scans QR code → places order → order appears on KDS → chef marks ready → cashier processes payment.
  - Manager creates PR → approves → creates PO → receives GRN → stock level increases.
  - Admin creates user → user logs in → correct modules visible per role.

### 11.5 User Acceptance Testing (UAT)
- Conducted with representative users from each role (manager, cashier, waiter, chef).
- Test environment populated with realistic Ethiopian restaurant data.
- Feedback captured via structured UAT scripts and bug report forms.
- Sign-off required from product owner before production deployment.

### 11.6 Security & Penetration Testing
- OWASP Top 10 review for each major release.
- Automated SAST scanning in CI/CD pipeline (CodeQL or Semgrep).
- Manual penetration testing by external security firm before v1.1 public release.
- Specific focus: JWT validation, SQL injection via Prisma, XSS via user-supplied content, IDOR on order/payment endpoints.

---

## 12. Maintenance & Support

### 12.1 Regular Maintenance Schedule

| Frequency | Activity |
|---|---|
| Daily | Automated backup verification; error log review; uptime check |
| Weekly | Dependency vulnerability scan (`npm audit`); performance metrics review |
| Monthly | Database index analysis and optimization; storage usage review; log archival |
| Quarterly | Full security review; load testing; documentation updates |
| Per release | TypeScript strict check (`tsc --noEmit`); full test suite run; changelog update |

### 12.2 Database Optimization
- Regular `VACUUM ANALYZE` on PostgreSQL to reclaim space and update query planner statistics.
- Index bloat monitoring and rebuild schedule.
- Slow query log reviewed weekly; indexes added proactively for new filter patterns.

### 12.3 Dependency Management
- `npm outdated` reviewed monthly.
- Minor and patch updates applied on a rolling basis.
- Major version upgrades (React, Zustand, Tailwind) evaluated in a separate branch with full regression testing.
- Security-related patches applied within 48 hours of disclosure.

### 12.4 Continuous Monitoring
- Automated uptime and synthetic transaction monitoring in production at all times.
- On-call rotation for P1 incidents (system down, payment processing failure, data corruption).

### 12.5 SLA-Based Technical Support

| Priority | Definition | Response Time | Resolution Target |
|---|---|---|---|
| P1 — Critical | System down; payments failing; data loss | 30 minutes | 4 hours |
| P2 — High | Core module unavailable; significant data issue | 2 hours | 8 hours |
| P3 — Medium | Non-critical feature broken; workaround available | 8 hours | 3 business days |
| P4 — Low | UI issue; enhancement request | 2 business days | Next sprint |

---

## 13. Future Enhancements

### 13.1 Backend Integration (v1.1 — Immediate Priority)

- [ ] Node.js / Express REST API with PostgreSQL replacing in-memory Zustand stores
- [ ] JWT-based authentication with refresh token rotation and session revocation
- [ ] Real-time WebSocket server (Socket.io) for live KDS updates and order broadcasts
- [ ] File upload infrastructure (S3/MinIO) for menu item images and videos
- [ ] PDF receipt and report generation (Puppeteer)
- [ ] Telebirr and CBE Birr payment gateway integration
- [ ] Push notifications (Firebase FCM) for low-stock alerts and order-ready notifications

### 13.2 Multi-Branch Support (v1.2)

- [ ] Branch entity with branch-scoped data isolation
- [ ] Branch-level user role assignments
- [ ] Cross-branch reporting and consolidated P&L
- [ ] Centralized menu management with branch-level price overrides
- [ ] Inter-branch stock transfer workflows

### 13.3 Microservices Architecture Migration (v2.0)

- [ ] Decompose monolithic Express API into domain-specific services:
  - Order Service · Menu Service · Inventory Service · Purchasing Service · Accounting Service · Notification Service
- [ ] API Gateway (Kong or AWS API Gateway) for routing, auth, and rate limiting
- [ ] Event-driven communication via message broker (RabbitMQ or Kafka)
- [ ] Service mesh (Istio) for inter-service communication and observability

### 13.4 AI & Intelligence Features (v2.1)

- [ ] AI-based demand forecasting: predict daily item sales from historical patterns to optimize prep quantities and reduce waste
- [ ] Smart reorder recommendations: auto-suggest PO quantities based on consumption trends and lead times
- [ ] Dynamic pricing: suggest menu price adjustments based on ingredient cost fluctuations
- [ ] Customer behavior analytics: identify VIP customers, predict churn, personalize promotions
- [ ] Image-based menu item recognition for faster ordering

### 13.5 Business Intelligence & Advanced Reporting (v2.1)

- [ ] Embedded BI dashboard (Apache Superset or Metabase) for custom report building
- [ ] Real-time P&L statement automatically derived from accounting JEs
- [ ] Food cost % analysis per menu item linked to live ingredient costs
- [ ] Staff productivity KPIs: covers per hour, revenue per waiter, avg table turn time

### 13.6 Additional Integrations (v2.x)

- [ ] Accounting software export (QuickBooks, Sage, or local Ethiopian ERP systems)
- [ ] Third-party delivery platform integration (Ethiopian Food Delivery apps)
- [ ] Loyalty program mobile app for guests
- [ ] Biometric or RFID staff clock-in/clock-out integration
- [ ] Multi-currency support for hotel restaurant operations (ETB / USD / EUR)
- [ ] Advanced internationalization: add more Ethiopian regional languages (Oromiffa, Tigrinya, Somali)

---

*BunaLink Restaurant ERP — System Design Document*  
*Version 1.0 — February 2026*  
*Confidential — For Internal Use Only*
