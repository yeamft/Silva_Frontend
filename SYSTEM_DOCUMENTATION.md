# BunaLink Restaurant ERP — System Documentation

**Version:** 1.0.0-alpha  
**Platform:** Web (React SPA)  
**Last Updated:** February 2026  
**Classification:** Internal Technical Reference

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Technology Stack](#2-technology-stack)
3. [Architecture Overview](#3-architecture-overview)
4. [User Roles & Access Control](#4-user-roles--access-control)
5. [Module Reference](#5-module-reference)
   - 5.1 [Dashboard](#51-dashboard)
   - 5.2 [Point of Sale (POS)](#52-point-of-sale-pos)
   - 5.3 [Orders Management](#53-orders-management)
   - 5.4 [Tables & Reservations](#54-tables--reservations)
   - 5.5 [Floor Plan](#55-floor-plan)
   - 5.6 [Kitchen Display System (KDS)](#56-kitchen-display-system-kds)
   - 5.7 [Menu Management](#57-menu-management)
   - 5.8 [Guest Menu (Digital Menu)](#58-guest-menu-digital-menu)
   - 5.9 [Inventory Management](#59-inventory-management)
   - 5.10 [Purchasing (Procure-to-Pay)](#510-purchasing-procure-to-pay)
   - 5.11 [Recipe Management](#511-recipe-management)
   - 5.12 [Billing & Payments](#512-billing--payments)
   - 5.13 [Discounts & Promotions](#513-discounts--promotions)
   - 5.14 [Accounting](#514-accounting)
   - 5.15 [Analytics](#515-analytics)
   - 5.16 [Reports](#516-reports)
   - 5.17 [CRM & Loyalty](#517-crm--loyalty)
   - 5.18 [Staff & Shifts](#518-staff--shifts)
   - 5.19 [User Management](#519-user-management)
   - 5.20 [Settings & Administration](#520-settings--administration)
6. [State Management](#6-state-management)
7. [Data Flows](#7-data-flows)
8. [Routing & Navigation](#8-routing--navigation)
9. [Internationalization & Localization](#9-internationalization--localization)
10. [Theme System](#10-theme-system)
11. [Offline & Real-time Strategy](#11-offline--real-time-strategy)
12. [Known Limitations & Roadmap](#12-known-limitations--roadmap)

---

## 1. System Overview

**BunaLink** is a full-featured, browser-based Restaurant Enterprise Resource Planning (ERP) system purpose-built for Ethiopian restaurant operations with multi-branch growth in mind. It covers the entire restaurant lifecycle — from a guest placing an order at the table, through kitchen preparation, billing, inventory deduction, to financial reporting.

### Core Business Problems Solved

| Problem | BunaLink Solution |
|---|---|
| Disconnected paper-based ordering | Real-time digital POS with KDS integration |
| Manual inventory tracking | Automated stock deduction via recipes + GRN receiving |
| No purchasing workflow | Full procure-to-pay: PR → RFQ → PO → GRN → Vendor Bill |
| Fragmented accounting | Double-entry journal entries linked to sales and purchasing |
| Poor guest experience | QR-accessible digital menu with cart, modifiers, and Amharic support |
| No multi-role access | 8 configurable user roles with view-level permission gates |
| No Ethiopian market support | Ethiopian Birr (ETB) currency, Amharic language, local dish data |

### Key Design Principles

- **Offline-first**: Core POS operations work without a live server connection via `OfflineCache`.
- **Role-isolated views**: Each role only sees what is relevant to their workflow.
- **Bilingual**: Full English and Amharic translation across all UI screens.
- **Production-grade UI**: Framer Motion animations, responsive layouts, touch-friendly controls for tablet staff.
- **ERP-grade data integrity**: Immutable transaction logs for inventory movements, payments, and journal entries.

---

## 2. Technology Stack

### Frontend

| Category | Technology | Version |
|---|---|---|
| Framework | React | 18.3.1 |
| Language | TypeScript | 5.8.3 |
| Build Tool | Vite | 5.4.19 |
| Routing | React Router DOM | 6.30.1 |
| State Management | Zustand | 5.0.11 |
| UI Component Library | shadcn/ui (Radix UI primitives) | various |
| Styling | Tailwind CSS | 3.4.17 |
| Animation | Framer Motion | 11.18.2 |
| Charts | Recharts | 2.15.4 |
| Icons | Lucide React | 0.462.0 |
| Form Management | React Hook Form + Zod | 7.61.1 / 3.25.76 |
| Async Data Layer | TanStack Query | 5.83.0 |
| Date Utilities | date-fns | 3.6.0 |
| Toast Notifications | Sonner | 1.7.4 |
| Testing | Vitest | 3.2.4 |
| Deployment | Vercel | — |

### Backend (Planned)
> The current version runs entirely on in-memory Zustand stores. A Node.js/Express backend with a relational database (PostgreSQL recommended) is planned for v1.1. All store actions and interfaces are designed to map directly to REST API endpoints.

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Browser (React SPA)                     │
│                                                              │
│   ┌──────────┐   ┌──────────────────────────────────────┐   │
│   │  Router  │   │           Zustand Stores              │   │
│   │  (SPA)   │   │  authStore  orderStore  menuStore     │   │
│   │          │   │  tablesStore  inventoryStore          │   │
│   │  /       │   │  purchasingStore  accountingStore     │   │
│   │  /login  │   │  paymentStore  kitchenStore           │   │
│   │  /app    │   │  customersStore  shiftsStore          │   │
│   └──────────┘   │  discountsStore  recipesStore         │   │
│                  │  stationsStore  localeStore            │   │
│   ┌──────────┐   │  themeStore  analyticsStore           │   │
│   │  Pages   │   └──────────────────────────────────────┘   │
│   │          │                    ↕                          │
│   │ Landing  │   ┌──────────────────────────────────────┐   │
│   │ Login    │   │           View Components             │   │
│   │ Register │   │  DashboardView  OrdersView            │   │
│   │ Index    │   │  FloorPlanView  KDSView               │   │
│   │ (shell)  │   │  InventoryView  PurchasingView        │   │
│   └──────────┘   │  AccountingView  AnalyticsView        │   │
│                  │  ... 20+ views                        │   │
│                  └──────────────────────────────────────┘   │
│                                    ↕                          │
│   ┌───────────────────────────────────────────────────────┐  │
│   │            Infrastructure Services                    │  │
│   │   OfflineCache (localStorage)   RealtimeService (WS) │  │
│   │   AnalyticsEngine               KitchenIntelligence   │  │
│   └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Application Shell

The authenticated shell lives in `src/pages/Index.tsx`. It renders:
- `SideNav` — collapsible sidebar filtered by the current user's role.
- `TopBar` — page title, user info, language/theme toggles, notifications.
- **Active View** — swapped in/out based on `activeView` state, which maps to one of 23 module components.

Customer-role users bypass the full shell and are served only `GuestMenuView` with a simplified header.

---

## 4. User Roles & Access Control

BunaLink defines 8 distinct roles. Each role maps to a whitelist of navigation items (views) they can access.

### Role Definitions

| Role | Description |
|---|---|
| `admin` | Full system access. Manages users, accounting, settings, and all modules. |
| `manager` | Day-to-day operations oversight. Access to most modules except user management, accounting, and admin settings. |
| `cashier` | Handles billing, payments, orders, and table status. No back-office access. |
| `waiter` | Takes orders, manages tables, views floor plan, and serves guests. |
| `chef` | Views and updates KDS tickets and recipes. No financial or customer data access. |
| `inventory` | Full access to inventory and purchasing modules. |
| `delivery` | Views orders, tables, staff, and dashboard. |
| `customer` | Sees only the Guest Menu (digital menu) for self-ordering via QR code. |

### Role-to-Module Access Matrix

| Module | admin | manager | cashier | waiter | chef | inventory | delivery | customer |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | |
| Orders | ✓ | ✓ | ✓ | ✓ | | | | |
| Tables & Reservations | ✓ | ✓ | ✓ | ✓ | | | ✓ | |
| Floor Plan | ✓ | ✓ | | ✓ | | | | |
| KDS | ✓ | ✓ | | | ✓ | | | |
| Guest Menu | ✓ | ✓ | ✓ | ✓ | | | | ✓ |
| Billing & Payments | ✓ | ✓ | ✓ | | | | | |
| Discounts | ✓ | ✓ | | | | | | |
| Menu Management | ✓ | ✓ | | | | | | |
| Inventory | ✓ | ✓ | | | | ✓ | | |
| Purchasing | ✓ | ✓ | | | | ✓ | | |
| Recipes | ✓ | ✓ | | | ✓ | ✓ | | |
| Accounting | ✓ | | | | | | | |
| Analytics | ✓ | ✓ | | | | | | |
| Reports | ✓ | ✓ | | | | | | |
| CRM & Loyalty | ✓ | ✓ | | | | | | |
| Staff & Shifts | ✓ | ✓ | | | | | | |
| User Management | ✓ | | | | | | | |
| Settings | ✓ | | | | | | | |
| Admin Panel | ✓ | | | | | | | |

---

## 5. Module Reference

---

### 5.1 Dashboard

**File:** `src/components/DashboardView.tsx`  
**Access:** All roles except `customer`

The Dashboard is the first view all authenticated non-customer users see. It aggregates live data from multiple stores into a single operational overview.

#### KPI Cards
| Card | Data Source | Description |
|---|---|---|
| Active Orders | `orderStore` | Count of orders with status: pending, confirmed, preparing, ready |
| Today's Revenue | `paymentStore` | Sum of all payments created today |
| Occupied Tables | `tablesStore` | Count of tables with status: occupied, serving, bill_requested |
| Avg Service Time | `orderStore` | Mean elapsed time from order creation to `served` status |

#### Panels
- **Zone Breakdown** — Table status counts grouped by section/zone.
- **Recent Orders Feed** — Live scrolling list of the last 8 orders with status badges.
- **Low-Stock Alerts** — Items from `inventoryStore` where current stock is below reorder threshold.

---

### 5.2 Point of Sale (POS)

**File:** `src/components/StaffTabletView.tsx`  
**Access:** admin, manager, cashier, waiter

The staff-facing tablet POS is optimised for touch input at the table or counter. It provides a full order-taking workflow with item search, category filtering, modifiers, discounts, and checkout.

#### Workflow
1. **Select or create an order** — link to a table or mark as takeaway/delivery.
2. **Browse menu** — category pill-strip filter + search bar; items display price, description, and availability badge.
3. **Add items** — tap to add; tap again or use +/- stepper to adjust quantity; long-press to add modifiers or a note.
4. **Apply discount** — manual percentage/fixed discount or enter a coupon code validated against `discountsStore`.
5. **Checkout** — choose payment method (cash, card, QR/mobile money); system creates a `Payment` record in `paymentStore` and updates order status to `paid`.

#### Discount Logic
- Manual discount: entered as a percentage or fixed amount by cashier/manager.
- Coupon code: validated against active discounts in `discountsStore`; checks scope (order/item/category), expiry date, min order value, and usage limit. On success, `incrementUsage` is called on the discount record.

---

### 5.3 Orders Management

**File:** `src/components/OrdersView.tsx`  
**Access:** admin, manager, cashier, waiter

Full CRUD view for all orders in the system. Unlike the tablet POS (which is optimised for creating single orders), the Orders view is a management console for tracking, editing, and voiding orders.

#### Order Statuses (lifecycle)
```
draft → pending → confirmed → preparing → ready → served → paid → void
                                                          ↘ refunded
                                                          ↘ cancelled
```

#### Order Types
- `dine-in` — linked to a table
- `takeaway` — counter pickup
- `delivery` — assigned to delivery staff
- `online` — originating from Guest Menu QR flow

#### Features
- Filter by status, order type, date range, and search by order ID or customer name.
- Inline status progression buttons.
- View order line items, applied discounts, tax, and totals.
- Void order with reason capture (manager/admin only).

---

### 5.4 Tables & Reservations

**File:** `src/components/TablesReservationsView.tsx`  
**Access:** admin, manager, cashier, waiter, delivery

Four-tab module for managing the physical dining space.

#### Tab 1 — Floor & Tables
Live visual grid of all tables with:
- KPI summary row (Total / Available / Occupied / Reserved / Cleaning).
- Filter bar: section, status, and search.
- Table cards showing: status dot, table name, zone, seat count, elapsed time (highlights red if > 90 min), assigned server, and quick-action buttons.
- Pagination (12 tables per page).

#### Tab 2 — Sections / Floors
CRUD table for floor sections (zones). Columns: name, capacity, table count, and live occupied count. Supports create/edit/delete. Paginated (8 per page).

#### Tab 3 — Tables CRUD
Full admin table list with search, section filter, status filter. Columns: ID, name, zone, capacity, shape, type, status. Create/edit dialog exposes all fields including shape (round, square, rectangle, bar) and type (standard, VIP, bar, outdoor). Paginated (10 per page).

#### Tab 4 — Reservations
Upcoming and past reservations list. Create/edit reservation with guest name, phone, party size, date/time, and table assignment. Status transitions: pending → confirmed → seated → completed / no-show.

#### Waitlist
Separate panel for walk-in waitlist. Shows estimated wait time; "Seat Guest" action assigns the waitlist entry to an available table.

---

### 5.5 Floor Plan

**File:** `src/components/FloorPlanView.tsx`  
**Access:** admin, manager, waiter

Interactive visual representation of the dining area with live table status.

#### Table Status Color System
| Color | Status | Meaning |
|---|---|---|
| Green | Available | Table is clean and ready for guests |
| Red | Occupied | Guests are currently dining |
| Yellow | Reserved | Pre-booked, not yet seated |
| Purple | Serving | Food is being served |
| Blue | Bill Requested | Guest has asked for the check |
| Gray | Cleaning | Table is being cleared/cleaned |

#### Table Tile Information
Each tile displays: table number/name, seat capacity, elapsed time, assigned server name, status indicator, table type icon, and a bill icon when billing is requested.

#### Edit Layout Mode (Admin/Manager)
- Drag and drop tables to reposition on the canvas.
- Add new tables via dialog (name, seats, shape, type, zone, notes).
- Edit or archive existing tables.

#### Side Panel
- **Table selected**: Shows linked reservation, active orders, server, elapsed timer, bill total, quick status transition buttons (e.g. "Mark Cleaning", "Request Bill"), and "Transfer Guests" action.
- **No selection**: Shows floor overview — total, available, occupied, and reserved counts; a list of all currently occupied tables; and a shape legend.

#### Multi-Section Navigation
Tabs at the top allow switching between defined floor sections/zones. Each section shows only the tables belonging to it.

---

### 5.6 Kitchen Display System (KDS)

**File:** `src/components/KDSView.tsx`  
**Access:** admin, manager, chef

The KDS replaces printed kitchen tickets with a live digital display. It reads directly from `orderStore` and `stationsStore`.

#### Ticket Display
Each active order (status: confirmed, preparing, ready) renders as a ticket card showing:
- Order ID, table number, order type.
- Elapsed time with color escalation (green → yellow → red at thresholds).
- Priority badge: Normal / Rush / VIP (auto-assigned based on order age and flags).
- All line items with quantities and any special instructions.

#### Station Filtering
The station filter strip (generated from `stationsStore`) allows chefs to view only tickets relevant to their station (e.g. Grill, Bar, Pastry).

#### Status Bumping
Staff can advance order status directly from the KDS:
- **New → Preparing** — kitchen starts cooking.
- **Preparing → Ready** — food is plated and ready for pickup.
- **Ready → Served** — waiter confirms delivery to the table.

Each bump calls `updateOrderStatus` on `orderStore`, propagating the change to all connected views (Dashboard, Orders, Floor Plan) in real time.

---

### 5.7 Menu Management

**File:** `src/components/MenuManagementView.tsx`  
**Access:** admin, manager

Back-office editor for the full menu catalog.

#### Tabs
- **Categories** — Create/edit/delete categories. Each category has a name, display icon, color code, description, sort order, and active toggle.
- **Items** — Create/edit/archive/restore menu items. Fields include: name, description, category, price, cost price, image URL, video URL, allergens, dietary flags (vegetarian, vegan, gluten-free, halal), prep time, and available toggle.
- **Modifiers** — Define modifier groups (e.g. "Spice Level", "Extras") and their options with price deltas. Modifiers are linked to specific menu items.
- **Tax** — Configure tax categories (VAT, service charge) and assign them to items or the entire menu.

#### Key Behaviors
- Availability toggle marks an item as temporarily out-of-stock without deleting it.
- Archive removes the item from all menus but preserves history for recipe costing and analytics.
- Item images and short videos are supported via URL input (ready for CDN/storage integration).

---

### 5.8 Guest Menu (Digital Menu)

**File:** `src/components/GuestMenuView.tsx`  
**Access:** customer (primary), all roles (preview)

The consumer-facing digital menu. Accessed by guests via QR code at the table. Designed to feel like a premium mobile app, not a back-office form.

#### Layout Structure
- **Top Bar** — Logo, search, language toggle (EN/AM), "Call Waiter" button, cart button with item count badge.
- **Hero Section** — Auto-advancing promotional banner carousel + "Most Popular" horizontal scroll strip.
- **Category Pills** — Sticky horizontally-scrollable category filter bar with scroll-spy (active category highlights as user scrolls).
- **Item Grid** — Two-column card grid. Each card shows: image, item name, description excerpt, price badge (ETB), allergen flag, and inline +/- quantity stepper.

#### Item Detail Modal
Full-screen modal triggered by tapping any item card:
- Hero image (full-width).
- Item name, description, allergens, dietary badges.
- Modifier selection (e.g. spice level, add-ons) with price updates.
- Special instructions text input.
- Quantity stepper.
- "Add to Order" button with dynamic price calculation.
- Upsell suggestions strip.

#### Cart & Checkout Flow
1. **Cart Drawer** — Slides in from the right. Shows all items with thumbnails, steppers, and line totals. Displays subtotal, service charge (10%), VAT (15%), and grand total in ETB.
2. **Promo Code** — Input with live validation against `discountsStore`. Successful code displays discount line and reduced total.
3. **Confirm Order** — Guest selects "Pay Now" (card/QR) or "Pay at Counter" (cash). Order is created in `orderStore` with type `online`.
4. **Order Placed Screen** — Success animation with generated order ID. Auto-closes after 2.8 seconds.

---

### 5.9 Inventory Management

**File:** `src/components/InventoryView.tsx`  
**Access:** admin, manager, inventory

An 8-tab warehouse management module covering all inventory lifecycle stages.

#### Tab 1 — Items (Master Catalog)
Full CRUD for inventory items (raw materials, beverages, consumables, packaging). Fields: code, name, category, item type, unit of measure, costing method (FIFO/AVCO), reorder point, reorder quantity, minimum stock, barcode.

#### Tab 2 — Stock Levels
Real-time view of current stock quantities per item per warehouse/location. Shows quantity on-hand, quantity committed (on open orders), quantity available, lot count, last movement date, and reorder status badges.

#### Tab 3 — Movements (Ledger)
Immutable transaction log of all stock movements. Types: Receipt, Issue, Transfer, Adjustment, Return, Waste, Count Variance. Each movement records: item, warehouse, quantity (in/out), unit cost, reference (GRN/PO/recipe), lot/batch, and logged-by user.

#### Tab 4 — GRN Receiving
Create Goods Receipt Notes against Purchase Orders. For each line:
- Item, PO reference, expected quantity, received quantity.
- Unit cost, lot/batch number, expiry date, storage location.

Posting a GRN creates stock movement records and updates stock level quantities.

#### Tab 5 — Stock Counts
Initiate periodic cycle counts or full stocktakes. Workflow:
1. **Create Count** — select warehouse, items in scope.
2. **Enter Counts** — staff inputs physically counted quantities.
3. **Review Variance** — system shows expected vs. counted with variance and variance value.
4. **Post** — posts adjustment movements to reconcile the ledger.

#### Tab 6 — Waste Log
Record spoilage and waste with item, quantity, unit, reason, and responsible staff. Integrated with `inventoryStore.logWaste()` which creates a corresponding stock movement of type `Waste`.

#### Tab 7 — Reorder Alerts
Dynamic list of items where current stock ≤ reorder point. Shows current stock, reorder point, suggested order quantity, and preferred supplier. "Create PR" shortcut generates a Purchase Requisition in `purchasingStore`.

#### Tab 8 — Reports
- Stock Valuation Report (by item, by category, by warehouse).
- Movement History Report (filterable by date range, item, type).
- Lot/Expiry Report (items expiring within 7/30/60 days).
- Waste Summary (by reason, by period).

---

### 5.10 Purchasing (Procure-to-Pay)

**File:** `src/components/PurchasingView.tsx`  
**Access:** admin, manager, inventory

A 7-tab module covering the full purchasing lifecycle from requisition to payment.

#### Procurement Lifecycle
```
Purchase Requisition (PR)
       ↓  (approve)
Purchase Order (PO)
       ↓  (receive goods)
Goods Receipt Note (GRN)       → updates Inventory stock levels
       ↓  (match and bill)
Vendor Bill (AP Invoice)
       ↓  (pay)
Payment / Bank Transfer         → updates Accounting payables
```

#### Tab 1 — Dashboard
- 6 KPI cards: Open PRs, Pending POs, GRNs Today, Unpaid Bills Total, Overdue Bills, MTD Spend.
- Quick Actions panel: New PR, New PO, Receive Goods.
- PRs Awaiting Approval: one-click approve/reject inline.
- Alerts: overdue POs, deliveries due today, payables due this week.

#### Tab 2 — Requisitions (PR)
- List view with search (by PR number/requester/item) and status filter (Draft / Submitted / Approved / Rejected / Converted to PO).
- Create PR form: requester, department, required-by date, line items (item, quantity, estimated cost, notes).
- Approve / Reject actions (manager/admin only).
- "Create PO" button pre-populates a new PO with the PR's line items.

#### Tab 3 — Purchase Orders (PO)
- List view with search and status filter (Draft / Approved / Partially Received / Fully Received / Cancelled).
- Create/edit PO form: vendor, expected delivery date, delivery location (warehouse), payment terms, line items with quantity, unit cost, and tax rate.
- Auto-calculates subtotal, tax, and grand total.
- Actions: Approve, Receive (opens GRN sheet), Create Bill, Cancel.

#### Tab 4 — GRN (Receiving)
- Shows all POs ready to receive (status: Approved or Partially Received).
- Receiving sheet: for each PO line, enter received quantity, unit cost, lot/batch number, expiry date, and storage location.
- Partial receipt supported — PO remains open until fully received.
- GRN history table with expected vs. received variance display.

#### Tab 5 — Vendor Bills (AP)
- List view with search and status filter (Draft / Posted / Partially Paid / Paid / Overdue).
- Displays total amount, paid amount, and balance due.
- Create bill from PO/GRN reference.
- Post bill, record payment (full or partial with payment date and method).

#### Tab 6 — Vendors
- Vendor directory with search and pagination.
- Vendor card: company name, contact, payment terms, lead time, tax ID.
- Performance metrics: overall rating, on-time delivery %, average lead time days, total spend.
- Full CRUD dialog for creating and editing vendor profiles.

#### Tab 7 — Reports
- Spend by Vendor (bar chart + table).
- PO Status Summary (count and value by status).
- GRN Variance Report (ordered vs. received quantities and values).
- Vendor Performance Report (on-time %, lead time comparison).

---

### 5.11 Recipe Management

**File:** `src/components/RecipesView.tsx`  
**Access:** admin, manager, chef, inventory

Links menu items to their ingredient requirements, enabling automatic inventory deduction when items are sold.

#### Features
- Create/edit recipes with a list of ingredients (from `inventoryStore`), each with quantity and unit.
- Automatic cost calculation: sums ingredient costs based on current stock valuation.
- Profit margin display: compares recipe cost against menu item selling price.
- "Scale" function: adjusts all ingredient quantities by a yield multiplier.

#### Integration
When an order is finalised/paid, the recipe engine deducts ingredient quantities from inventory by creating `Issue` stock movements for each sold item that has an associated recipe.

---

### 5.12 Billing & Payments

**File:** `src/components/BillingPaymentsView.tsx`  
**Access:** admin, manager, cashier

The cashier-facing payment processing screen.

#### Payment Methods
| Method | Description |
|---|---|
| Cash | Manual cash entry with change calculation |
| Card | POS terminal (tap/chip/swipe) |
| QR / Mobile Money | Telebirr, CBE Birr, and other Ethiopian mobile payment platforms |

#### Workflow
1. Select open order from list (filtered to unpaid/bill-requested status).
2. Review order summary (items, applied discounts, service charge, VAT, total).
3. Select payment method and confirm.
4. System creates a `Payment` record in `paymentStore`, marks order as `paid`, and releases the table.

#### Refunds
- **Full refund**: reverses the entire payment amount; order status moves to `refunded`.
- **Partial refund**: refunds a specified amount; original payment updated with refunded flag.

---

### 5.13 Discounts & Promotions

**File:** `src/components/DiscountsView.tsx`  
**Access:** admin, manager

Central management of all promotional and discount configurations.

#### Discount Types
| Type | Description |
|---|---|
| `percent` | Percentage off (e.g. 10% off) |
| `fixed` | Fixed ETB amount off (e.g. Br 50 off) |
| `bogo` | Buy-one-get-one (configurable) |

#### Discount Scopes
| Scope | Applies To |
|---|---|
| `order` | Entire order total |
| `item` | Specific menu item(s) |
| `category` | All items in a menu category |

#### Configuration Fields
- Code (for coupon entry), display name, type, value, scope.
- Minimum order value threshold.
- Start date / end date (time-limited promos).
- Usage limit (total redemptions allowed).
- Current usage count (auto-incremented on redemption).
- Active toggle.

#### Usage
Discounts are validated in both `StaffTabletView` (cashier/waiter coupon entry) and `GuestMenuView` (self-service promo code). The `incrementUsage` action prevents over-redemption of limited codes.

---

### 5.14 Accounting

**File:** `src/components/AccountingView.tsx`  
**Access:** admin only

A double-entry bookkeeping module aligned with Ethiopian accounting standards.

#### Sub-modules

**Chart of Accounts**
Standard account hierarchy: Assets, Liabilities, Equity, Revenue, Expenses. Full CRUD. Each account has: code, name, type, currency, and opening balance.

**Journal Entries**
Manual and system-generated double-entry journal entries. Each JE has a date, reference, memo, and two or more lines (debit/credit account, amount, description). System auto-posts JEs from: sales invoices, vendor bill payments, and bank transfers.

**Sales Invoices**
Revenue recognition for dine-in, takeaway, and catering sales. Linked to orders from `orderStore`. Tracks invoice date, due date, customer, line items, tax, and payment status.

**Vendor Bills (AP)**
Expense recognition for purchasing. Linked to GRNs from `purchasingStore`. Tracks vendor, invoice date, due date, line items, tax, and payment status.

**Bank Accounts**
Manage multiple bank accounts (CBE, Dashen, Awash, etc.). Supports bank transfers between accounts. Balance tracking.

**Tax Configuration**
Define VAT rates, service charge rates, withholding tax rates. Assign to menu items or apply globally.

---

### 5.15 Analytics

**File:** `src/components/AnalyticsView.tsx`  
**Access:** admin, manager

Data aggregated in real time from `orderStore`, `paymentStore`, `inventoryStore`, and `stationsStore`.

#### Charts & Metrics
| Panel | Visualization | Data |
|---|---|---|
| Order Volume by Hour | Bar chart | Count of orders grouped by hour of day |
| Station Load | Horizontal bar | Order count per kitchen station |
| Top-Selling Items | Ranked list | Item count sorted by units sold today |
| Revenue by Order Type | Pie/donut | Revenue split: dine-in / takeaway / delivery / online |
| Waste Overview | Bar chart | Waste quantity by item for the current period |

---

### 5.16 Reports

**File:** `src/components/ReportsView.tsx`  
**Access:** admin, manager

Pre-built report templates filterable by date range, branch, and category.

#### Available Reports
- Daily Sales Summary
- Revenue by Menu Category
- Waiter/Staff Performance
- Inventory Consumption
- Waste & Spoilage Report
- Purchasing Spend Analysis
- Customer Visit Frequency
- Shift Summary Report

Reports support print and export (PDF/CSV) — export functionality is connected to backend integration in v1.1.

---

### 5.17 CRM & Loyalty

**File:** `src/components/CRMView.tsx`  
**Access:** admin, manager

Customer profile management and loyalty program tracking.

#### Customer Profile
Fields: name, phone, email, date of birth, preferred language, visit count, total spend, loyalty points balance, and tier.

#### Loyalty Tiers
| Tier | Points Threshold |
|---|---|
| Bronze | 0 – 499 points |
| Silver | 500 – 1,999 points |
| Gold | 2,000 – 4,999 points |
| Platinum | 5,000+ points |

Points are earned per ETB spent (configurable ratio). Tiers unlock discount eligibility and priority seating.

#### Feedback Management
Capture and review customer feedback and star ratings per visit. Track average rating per waiter and per menu item.

---

### 5.18 Staff & Shifts

**Files:** `src/components/ShiftsView.tsx`, `src/components/WaitressManagementView.tsx`  
**Access:** admin, manager

#### Shifts
- Create shift schedules: staff member, role, start time, end time, branch/floor.
- Status lifecycle: `scheduled` → `clocked-in` → `break` → `completed`.
- View active shifts for current day.
- Historical shift log with total hours worked.

#### Waitress / Server Management
- Assign waitstaff to tables and floor sections.
- View active assignments.
- Performance overview (covers served, avg bill value, tips).

---

### 5.19 User Management

**File:** `src/components/UserManagementView.tsx`  
**Access:** admin only

Full CRUD for system user accounts.

#### Features
- User list with search (by name or email), filter by role, and pagination (8 users per page).
- Create user: name, email, password, role assignment.
- Edit user: update name, email, role.
- Reset password: admin sets a new temporary password.
- Deactivate/delete user (with confirmation dialog).

#### Seeded Demo Users (Development)
| Email | Password | Role |
|---|---|---|
| admin@bunalink.et | admin123 | admin |
| manager@bunalink.et | manager123 | manager |
| cashier@bunalink.et | cashier123 | cashier |
| waiter@bunalink.et | waiter123 | waiter |
| chef@bunalink.et | chef123 | chef |
| inventory@bunalink.et | inventory123 | inventory |
| customer@bunalink.et | customer123 | customer |

---

### 5.20 Settings & Administration

**Files:** `src/components/SettingsView.tsx`, `src/components/AdminView.tsx`  
**Access:** admin only

#### Settings
- Outlet name, address, phone, logo URL.
- Default currency (ETB), tax rates, service charge rate.
- Printer configuration (receipt printer, KDS display IP).
- Locale default (English / Amharic).
- Theme default (dark / light).

#### Admin Panel
- System-level configuration and overrides.
- Feature flags (enable/disable modules).
- Audit log viewer (planned for v1.1).

---

## 6. State Management

BunaLink uses **Zustand** for all application state. There are 17 stores, each responsible for a specific domain.

### Store Summary

| Store | Persisted | Domain |
|---|---|---|
| `authStore` | No | User authentication, session, user CRUD |
| `orderStore` | No (WebSocket + OfflineCache) | Orders lifecycle, realtime sync |
| `menuStore` | No | Menu categories, items, modifiers, tax |
| `inventoryStore` | No | Items, stock levels, movements, GRN, waste, lots |
| `purchasingStore` | No | PR, PO, GRN, vendor bills, vendors |
| `tablesStore` | No | Tables, sections, reservations, waitlist |
| `accountingStore` | No | Accounts, JEs, invoices, bills, bank accounts, tax |
| `analyticsStore` | No | Aggregated analytics data |
| `kitchenStore` | No | KDS tickets |
| `paymentStore` | No | Payment records, refunds |
| `shiftsStore` | No | Staff shift schedules |
| `customersStore` | No | Customer profiles, feedback, loyalty |
| `discountsStore` | No | Discount/promo rules |
| `recipesStore` | No | Recipes, ingredient links, cost |
| `stationsStore` | No | Kitchen/bar stations config |
| `localeStore` | Yes (`bunalink-locale`) | Active language (en / am) |
| `themeStore` | Yes (`bunalink-theme`) | Dark / light mode preference |

### Selector Best Practices

To prevent `Maximum update depth exceeded` re-render loops, all Zustand selectors that derive arrays must use `useMemo` in the component rather than inline `.filter()` calls inside the selector function:

```typescript
// ✗ Wrong — creates a new array reference on every render
const activeStations = useStationsStore(s => s.stations.filter(st => st.active));

// ✓ Correct — stable reference, derive in component
const allStations = useStationsStore(s => s.stations);
const activeStations = useMemo(() => allStations.filter(st => st.active), [allStations]);
```

---

## 7. Data Flows

### Order Creation Flow
```
Waiter (StaffTabletView)
  → selects menu items
  → applies discount (manual % / coupon code)
  → calls orderStore.addOrder()
    → order status: "pending"
    → RealtimeService broadcasts update
    → kitchenStore subscribes → creates KDS ticket
    → DashboardView "Active Orders" counter increments
```

### Payment Flow
```
Cashier (BillingPaymentsView / StaffTabletView)
  → selects order
  → applies payment method
  → calls paymentStore.addPayment()
  → calls orderStore.updateOrderStatus(id, "paid")
    → tablesStore: table status → "available"
    → recipesStore: deducts ingredients from inventoryStore
    → analyticsStore: aggregates revenue
    → DashboardView "Today's Revenue" updates
```

### Purchasing → Inventory Flow
```
Manager (PurchasingView)
  → creates Purchase Requisition (PR)
  → approves PR
  → creates Purchase Order (PO)
  → receives goods (GRN)
    → purchasingStore.postGRN()
      → inventoryStore.addStockMovement(type: "Receipt")
      → inventoryStore updates StockLevel quantities
      → PO receivedQty updated → PO status → "Fully Received"
  → creates Vendor Bill from GRN
  → posts and pays bill
    → accountingStore creates JE: Debit Expense / Credit AP
```

### Guest Menu Ordering Flow
```
Guest (GuestMenuView, QR code)
  → browses menu (read from menuStore)
  → builds cart
  → applies promo code (validated via discountsStore)
  → confirms order
    → orderStore.addOrder(type: "online")
    → KDS ticket created
    → Waiter notified (DashboardView feed)
    → Order placed screen shown to guest
```

---

## 8. Routing & Navigation

### URL Structure

| Path | Component | Protection |
|---|---|---|
| `/` | `LandingPage` | Public |
| `/login` | `LoginPage` | Redirect to `/app` if authenticated |
| `/register` | `RegisterPage` | Redirect to `/app` if authenticated |
| `/app` | `Index` (shell) | `AuthGuard` required |
| `*` | `NotFound` | Public |

### In-App Navigation

All navigation within `/app` is state-based (not URL-based). The `Index` component maintains `activeView: string` and renders the corresponding view component. The `SideNav` filters navigation items based on `roleNav.ts` for the current user's role.

### Guards
- **`AuthGuard`** — wraps `/app`; redirects unauthenticated users to `/login` with `state.from` for post-login redirect.
- **`LoginRedirect`** — wraps `/login` and `/register`; redirects already-authenticated users to `/app`.
- **`ThemeApplier`** — mounted at the App root; keeps the `dark` class on `<html>` in sync with `themeStore`.

---

## 9. Internationalization & Localization

### Supported Languages
| Code | Language | Coverage |
|---|---|---|
| `en` | English | 100% |
| `am` | Amharic (አማርኛ) | ~80% (all primary UI strings) |

### Implementation
- Translation keys live in `src/lib/translations.ts` as a typed record `Record<Locale, Record<string, string>>`.
- All UI strings are accessed via the `t(locale, key)` helper function.
- The active locale is stored in `localeStore` with `zustand/persist` (key: `bunalink-locale`), surviving page reloads.
- `LanguageToggle` component (in TopBar) switches between `en` and `am` globally.
- Ethiopian Birr formatting: `formatCurrency(amount, locale)` from `localeStore` outputs amounts as `Br 1,250.00` (EN) or `ብር 1,250.00` (AM).

### Adding a New Language
1. Add the locale code to the `Locale` union type in `localeStore.ts`.
2. Add a new key block in `src/lib/translations.ts` with translated strings.
3. Update `LanguageToggle` to display the new language option.

---

## 10. Theme System

BunaLink supports **dark mode** and **light mode** with the preference persisted across all pages and page reloads.

### Architecture
| Layer | Responsibility |
|---|---|
| `themeStore.ts` | Single source of truth. Persists `dark: boolean` to `localStorage["bunalink-theme"]`. |
| `ThemeApplier` (in `App.tsx`) | Mounted at the React root. Watches `themeStore.dark` and toggles the `dark` CSS class on `<html>`. |
| Tailwind CSS | Uses `darkMode: "class"` — all dark-mode styles are activated by the presence of `class="dark"` on `<html>`. |
| `ThemeToggle.tsx` | Dashboard toggle button, reads/writes `themeStore`. |
| `LandingPage.tsx` | Landing page toggle buttons (desktop + mobile), read/write same `themeStore`. |

### Previous Issue (Fixed)
Before unification, the dashboard used `localStorage["theme"]` and the landing page used `localStorage["bunalink-theme"]` independently. Toggling on one page had no effect on the other. Resolved by centralising all theme logic in `themeStore`.

---

## 11. Offline & Real-time Strategy

### OfflineCache
`src/lib/offlineCache.ts` provides a `localStorage`-backed cache for order data. On `orderStore.init()`, the store:
1. Connects to the `RealtimeService` WebSocket.
2. Loads any cached orders from `OfflineCache` as initial state.
3. On every order update, writes the latest state to `OfflineCache`.

This ensures that basic POS order taking continues if the network or server is temporarily unavailable.

### RealtimeService
`src/lib/realtimeService.ts` simulates a WebSocket connection (in development, this is a mock that fires local events). When the real Express backend is integrated, this service will establish a genuine WebSocket (or Server-Sent Events) connection to push:
- New order notifications to KDS.
- Order status changes to all connected clients (tables, dashboard, KDS simultaneously).
- Stock alert triggers when inventory falls below reorder points.

### Analytics Engine
`src/lib/analyticsEngine.ts` is a client-side aggregation layer that subscribes to `orderStore` and computes:
- Average prep time per station/floor.
- Peak order hours by zone.
- VIP customer visit patterns.

---

## 12. Known Limitations & Roadmap

### Current Limitations (v1.0-alpha)

| Area | Limitation |
|---|---|
| Data Persistence | All data is in-memory (Zustand). A page refresh clears all non-persisted data except locale and theme. |
| Authentication | Auth is local/mock. No JWT, no session management, no password hashing. |
| File Uploads | Menu item images/videos reference URLs only. No actual file upload infrastructure. |
| Printing | Receipt and KDS printing are UI-only. No physical printer integration. |
| Multi-branch | UI supports multi-branch data shapes, but branch isolation and branch switching are not yet enforced. |
| Payments | Payment methods (card, QR) are UI-only. No payment gateway integration (Telebirr, CBE API). |
| Reports Export | Report print/export buttons are UI stubs. No actual PDF/CSV generation. |
| Real-time | WebSocket is simulated via a mock service in development. |

### Planned for v1.1 (Backend Integration)

- [ ] Express.js REST API with PostgreSQL database.
- [ ] JWT-based authentication with refresh tokens.
- [ ] Real WebSocket server (Socket.io) for live KDS and order updates.
- [ ] File upload service (S3 or local) for menu images and videos.
- [ ] Telebirr and CBE Birr payment gateway integration.
- [ ] PDF receipt and report generation (Puppeteer or PDFKit).
- [ ] Multi-branch data isolation with branch-level role scoping.
- [ ] Audit trail logging for all financial and inventory transactions.
- [ ] Automated backup and data export.
- [ ] Push notifications (FCM) for low-stock alerts and order ready notifications.

---

*BunaLink System Documentation — Confidential Internal Draft*  
*Generated from codebase audit — February 2026*
