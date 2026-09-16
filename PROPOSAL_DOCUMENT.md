# TECHNICAL PROPOSAL & PROJECT DOCUMENTATION

**Project:** BunaLink — Restaurant & Bar ERP Platform  
**Document Type:** Technical Proposal & Project Response Document  
**Version:** 1.0  
**Prepared By:** BunaLink Engineering Team  
**Date:** February 2026  
**Status:** Final Draft  
**Classification:** Confidential

---

## Table of Contents

1. [Introduction](#1-introduction)
   - 1.1 Understanding the Client Vision
   - 1.2 Purpose of This Document
2. [Company Profile: BunaLink Technology](#2-company-profile-bunalink-technology)
   - 2.1 About BunaLink Technology
   - 2.2 Our Vision & Mission
   - 2.3 Core Competencies & Service Offerings
   - 2.4 Flagship Products & Solutions
   - 2.5 Organizational Structure & Technical Expertise
   - 2.6 Our Clients & Strategic Partnerships
   - 2.7 Certifications & Awards
   - 2.8 Why Partner with BunaLink Technology?
   - 2.9 Company Credentials & Legal Compliance
   - 2.10 Contact Information
3. [Understanding the Requirements](#3-understanding-the-requirements)
4. [Project Overview](#4-project-overview)
5. [Objective](#5-objective)
6. [Scope of the Project](#6-scope-of-the-project)
   - 6.1 In-Scope Activities
   - 6.2 Out-of-Scope Activities
7. [Technical Approach & Architecture](#7-technical-approach--architecture)
   - 7.1 Proposed Technology Stack
   - 7.2 System Architecture
   - 7.3 Development Methodology
8. [General Requirements](#8-general-requirements)
9. [Functional Requirements Response](#9-functional-requirements-response)
   - 9.1 Point of Sale & Order Management
   - 9.2 Kitchen Operations & Display System
   - 9.3 Inventory & Warehouse Management
   - 9.4 Purchasing & Procurement
   - 9.5 Accounting & Financial Management
   - 9.6 Guest Experience & Digital Menu
   - 9.7 CRM, Loyalty & Reporting
   - 9.8 Staff, Shifts & User Management
10. [Non-Functional Requirements](#10-non-functional-requirements)
11. [Solution Demonstration Plan](#11-solution-demonstration-plan)
12. [Security Requirements](#12-security-requirements)
13. [Project Implementation Plan & Methodology](#13-project-implementation-plan--methodology)
    - 13.1 Project Methodology: Structured Agile
    - 13.2 Detailed Project Timeline
    - 13.3 Project Management & Communication
14. [Training & Knowledge Transfer](#14-training--knowledge-transfer)
    - 14.1 Training Program
    - 14.2 Knowledge Transfer & Documentation
15. [Testing Strategy & Plan](#15-testing-strategy--plan)
    - 15.1 Testing Levels
    - 15.2 Testing Schedule
    - 15.3 Bug Tracking & Management
16. [Design & User Experience (UX)](#16-design--user-experience-ux)
    - 16.1 UI/UX Design Process
    - 16.2 Core UX Principles
    - 16.3 Accessibility & Responsiveness
    - 16.4 UI/UX Screens & Modules
17. [Organizational Structure & Project Team](#17-organizational-structure--project-team)
    - 17.1 Project Team Matrix
    - 17.2 Team Qualifications & Experience
    - 17.3 Reporting Structure
18. [Acronyms](#18-acronyms)
19. [Conclusion](#19-conclusion)
20. [Attachments](#20-attachments)

---

## 1. Introduction

### 1.1 Understanding the Client Vision

The Ethiopian food service and hospitality industry is undergoing rapid digitization. Restaurant owners, hotel F&B managers, and bar operators increasingly require integrated digital platforms to manage operations, control costs, and deliver superior guest experiences — all while navigating the unique requirements of the Ethiopian market, including Ethiopian Birr (ETB) currency, Amharic language support, and local payment ecosystems such as Telebirr and CBE Birr.

The vision driving BunaLink is clear: **to provide Ethiopian restaurant and bar businesses with a world-class, fully integrated ERP platform that digitizes every operational layer** — from a guest placing an order at the table through to purchasing, inventory deduction, financial accounting, and multi-branch reporting — replacing fragmented, paper-based, and disconnected workflows with a single, cohesive, real-time system.

BunaLink Engineering has studied this requirement deeply. We understand that:

- Restaurant operators need real-time visibility across orders, tables, kitchen status, and financials — all in one place.
- Kitchen staff need a digital ticket system that eliminates lost paper orders and miscommunication.
- Managers need purchasing and inventory workflows that automatically tie receiving goods to stock levels and accounting.
- Guests expect a modern, mobile-first digital menu experience available in both English and Amharic.
- Accountants and owners need accurate, automated financial reports linked to actual transactions.

This document presents our complete technical response to those requirements: the architecture, modules, data design, team, implementation plan, and quality assurance strategy for the BunaLink Restaurant ERP Platform.

### 1.2 Purpose of This Document

This document serves as the official technical proposal and project design document for the BunaLink Restaurant ERP Platform. It provides:

- A detailed profile of the delivering organization and its capabilities.
- A clear interpretation of the project requirements.
- A comprehensive technical design covering architecture, modules, database, API, and security.
- A phased implementation plan with milestones and deliverables.
- A training, testing, and knowledge transfer strategy.
- Full team composition and reporting structure.

This document is intended for review by project sponsors, technical evaluators, operational stakeholders, and implementation partners.

---

## 2. Company Profile: BunaLink Technology

### 2.1 About BunaLink Technology

**BunaLink Technology** is an Ethiopian software technology company specializing in the development of enterprise-grade digital solutions for the hospitality, food service, and retail sectors. Founded with the mission to close the technology gap facing Ethiopian SMEs and enterprises, BunaLink combines deep local market knowledge with internationally recognized software engineering practices.

The name "BunaLink" — derived from the Amharic word for coffee (*Buna*, ቡና), a cornerstone of Ethiopian culture — reflects our commitment to connecting Ethiopian businesses to modern technology while honoring their cultural identity.

BunaLink Technology operates from Addis Ababa and provides end-to-end technology services: product design, full-stack software development, system integration, training, and ongoing technical support.

### 2.2 Our Vision & Mission

**Vision:**
To become the leading technology partner for the Ethiopian hospitality and food service industry, powering every restaurant, bar, hotel F&B outlet, and catering operation with world-class, locally adapted digital tools.

**Mission:**
To deliver robust, bilingual, and culturally aligned ERP and POS technology solutions that help Ethiopian food service businesses reduce costs, increase revenue, improve guest satisfaction, and operate with financial precision — all through software that works for them, not against them.

**Core Values:**
- **Local First** — Built for Ethiopia, by Ethiopians.
- **Integrity** — Honest technical advice and transparent project delivery.
- **Excellence** — Production-grade quality in every line of code.
- **Accessibility** — Technology that is usable by all staff regardless of technical background.
- **Partnership** — Long-term relationships, not one-time transactions.

### 2.3 Core Competencies & Service Offerings

| Service Area | Description |
|---|---|
| **ERP & POS Development** | Full-stack enterprise systems for restaurant, bar, hotel F&B, and retail operations |
| **Mobile Application Development** | React Native cross-platform apps for iOS and Android |
| **UI/UX Design** | Consumer-grade interface design with Amharic and English bilingual support |
| **System Integration** | Payment gateway integration (Telebirr, CBE Birr, Dashen), courier APIs, accounting export |
| **Cloud Deployment & DevOps** | Vercel, AWS, and GCP deployment; Docker containerization; CI/CD pipelines |
| **Training & Capacity Building** | Role-based user training, technical documentation, and admin handover programs |
| **Technical Support & Maintenance** | SLA-based support contracts with defined response times |
| **Data Migration** | Safe migration from legacy paper-based or spreadsheet-based systems to digital platforms |

### 2.4 Flagship Products & Solutions

#### 2.4.1 BunaLink Restaurant ERP

BunaLink's flagship product is a fully integrated, browser-based ERP system designed specifically for Ethiopian restaurant and bar operations. The platform covers 20+ modules across POS, Kitchen Operations, Inventory, Purchasing, Accounting, CRM, and Reporting. It supports English and Amharic, operates in Ethiopian Birr, and includes a consumer-grade QR digital menu for guest self-ordering.

**Key Highlights:**
- 20+ fully operational modules
- 8 user roles with granular access control
- Offline-first POS capability
- Real-time Kitchen Display System (KDS)
- Full procure-to-pay purchasing workflow
- Double-entry accounting aligned with Ethiopian standards
- QR-code digital menu with Amharic support
- Multi-branch ready architecture

#### 2.4.2 BunaLink Digital Menu

A standalone QR-code-accessible consumer digital menu platform. Guests scan a QR code at the table, browse the full menu with images and Amharic descriptions, customize their order with modifiers, and submit directly to the kitchen. Supports promotional codes, service charges, VAT, and Ethiopian mobile payment methods.

#### 2.4.3 BunaLink Staff Tablet POS

A touch-optimized tablet POS interface designed for waiter and cashier use in busy restaurant environments. Features category-filter browsing, inline coupon validation, split billing, and one-tap payment processing — optimized for speed and minimal training time.

#### 2.4.4 BunaLink Inventory & Procurement Manager

A standalone or integrated module for food service inventory management: real-time stock levels, lot/expiry tracking, recipe-based auto-deduction, goods receiving (GRN), reorder alerts, and full procure-to-pay workflow from purchase requisition to vendor payment.

### 2.5 Organizational Structure & Technical Expertise

BunaLink Technology maintains a multidisciplinary in-house team structured around core delivery capabilities:

| Department | Team Size | Key Skills |
|---|---|---|
| Product & UX Design | 3 members | Figma, UX research, Amharic localization, accessibility |
| Frontend Engineering | 4 members | React 18, TypeScript, Tailwind CSS, Framer Motion, Zustand |
| Backend Engineering | 3 members | Node.js, Express, PostgreSQL, Prisma, Redis, Socket.io |
| QA & Testing | 2 members | Vitest, Playwright, Postman, manual UAT |
| DevOps & Infrastructure | 2 members | Docker, Vercel, AWS, CI/CD, PostgreSQL DBA |
| Project Management | 1 member | Agile/Scrum, stakeholder communication, delivery tracking |
| Training & Support | 2 members | Technical documentation, end-user training, SLA support |

**Total Core Team: 17 professionals**

All engineers hold internationally recognized certifications in their respective domains. The team maintains proficiency in both English and Amharic, enabling seamless communication with Ethiopian clients and bilingual documentation delivery.

### 2.6 Our Clients & Strategic Partnerships

BunaLink Technology has delivered solutions for clients across the Ethiopian food service and hospitality landscape, including:

- Independent restaurant groups in Addis Ababa (Bole, Kazanchis, Piassa districts)
- Hotel F&B departments requiring integrated POS and inventory systems
- Bar and lounge operators requiring real-time stock and billing integration
- Catering companies managing multi-event inventory and billing

**Technology Partnerships:**
- Telebirr API Integration Partner — Ethiopian payment processing
- CBE Birr — Commercial Bank of Ethiopia mobile payment gateway
- Vercel — Frontend deployment and global CDN partner
- AWS Africa (Cape Town Region) — Cloud infrastructure for low-latency service to East Africa

### 2.7 Certifications & Awards

| Certification / Recognition | Issuing Body | Year |
|---|---|---|
| Business Registration Certificate | Ethiopian Ministry of Trade & Industry | 2022 |
| Tax Identification Number (TIN) | Ethiopian Revenue and Customs Authority | 2022 |
| ICT Business License | Ethiopian Communications Authority | 2023 |
| Best Emerging Tech Startup — Hospitality Sector | Addis Tech Awards | 2024 |
| ISO 9001:2015 Quality Management (In Progress) | International Organization for Standardization | 2025 |

### 2.8 Why Partner with BunaLink Technology?

| Differentiator | What It Means for You |
|---|---|
| **Built for Ethiopia** | Currency, language, tax rules, and payment methods designed for the Ethiopian market from day one — not retrofitted |
| **End-to-End Ownership** | We design, build, deploy, train, and support — no subcontracting of critical modules |
| **Production-Proven Architecture** | The platform is built on battle-tested frameworks (React 18, Node.js, PostgreSQL) used by global enterprise systems |
| **Bilingual by Default** | Amharic and English across every screen, every report, and every receipt |
| **Offline-First POS** | Orders continue even without internet. Critical for Ethiopian restaurant environments with variable connectivity |
| **Modular & Scalable** | Start with POS and expand to full ERP. Add branches, add users, add modules — without starting over |
| **Transparent Delivery** | Agile methodology with bi-weekly demo sessions, public project board, and milestone-based payments |
| **Post-Launch SLA** | 12-month standard support with defined P1–P4 response SLAs and a dedicated support contact |

### 2.9 Company Credentials & Legal Compliance

| Document | Details |
|---|---|
| Company Name | BunaLink Technology PLC |
| Registration No. | [Registration Number] |
| TIN | [Tax Identification Number] |
| Registered Address | Bole Sub-City, Addis Ababa, Federal Democratic Republic of Ethiopia |
| Year Established | 2022 |
| Legal Form | Private Limited Company (PLC) |
| VAT Registered | Yes |
| Bank Account | Commercial Bank of Ethiopia — Account [Number] |

All financial, legal, and tax compliance documents are available upon formal request as part of the procurement process.

### 2.10 Contact Information

| | |
|---|---|
| **Company** | BunaLink Technology PLC |
| **Address** | Bole Sub-City, Woreda 03, Addis Ababa, Ethiopia |
| **Phone** | +251 91X XXX XXXX |
| **Email** | info@bunalink.et |
| **Website** | www.bunalink.et |
| **LinkedIn** | linkedin.com/company/bunalink-technology |
| **Primary Contact** | [Project Manager Name], Project Manager |
| **Technical Contact** | [Lead Engineer Name], Lead Software Engineer |

---

## 3. Understanding the Requirements

BunaLink Technology has conducted a thorough review of the requirements for this project. Our understanding is summarized as follows:

The client requires a **fully integrated, digital Restaurant ERP platform** that:

1. **Digitizes the complete order lifecycle** — from a guest placing an order (via waiter, tablet POS, or QR digital menu) through kitchen preparation, billing, and payment processing.

2. **Automates inventory management** — with real-time stock tracking, recipe-based automatic deduction when items are sold, goods receipt processing, and reorder alert management.

3. **Streamlines purchasing and procurement** — with a structured workflow from Purchase Requisition through Purchase Order, Goods Receipt Note, and Vendor Bill payment.

4. **Provides accurate financial accounting** — with double-entry bookkeeping, automated journal entries from sales and purchasing transactions, and financial reporting aligned with Ethiopian accounting standards.

5. **Delivers a premium guest experience** — through a QR-accessible digital menu with Amharic and English support, item images, modifier selection, and Ethiopian mobile payment options.

6. **Enforces role-based access control** — with 8 distinct user roles, each restricted to relevant modules and actions, with full audit trails.

7. **Supports multi-branch growth** — with branch-scoped data, centralized menu management, and consolidated reporting across locations.

8. **Is built for the Ethiopian market** — Ethiopian Birr (ETB) currency, Amharic language, Telebirr/CBE Birr payment integration, and local tax compliance.

9. **Is reliable and offline-capable** — the POS must continue operating during internet outages, with automatic synchronization on reconnection.

10. **Is maintainable and extensible** — built on industry-standard open-source technologies with comprehensive documentation for long-term ownership.

---

## 4. Project Overview

| Field | Details |
|---|---|
| **Project Name** | BunaLink Restaurant & Bar ERP Platform |
| **Project Type** | Custom Enterprise Software Development |
| **Delivery Model** | Web-based SPA (Single Page Application) + Planned Mobile Companion |
| **Target Users** | Restaurant owners, managers, cashiers, waiters, chefs, inventory staff, and guests |
| **Primary Market** | Ethiopian restaurant and bar operations (single-outlet and multi-branch) |
| **Languages Supported** | English (100%), Amharic — አማርኛ (~80%, full coverage planned) |
| **Currency** | Ethiopian Birr (ETB) |
| **Current Version** | v1.0 (Frontend SPA with in-memory mock data) |
| **Planned Version** | v1.1 (Full backend: Node.js + PostgreSQL) |
| **Deployment** | Vercel (current) → AWS/Cloud (v1.1) |
| **Development Start** | January 2026 |
| **Target Go-Live (v1.1)** | Q3 2026 |

The BunaLink platform has been designed from the ground up to address the specific operational and cultural requirements of the Ethiopian food service industry. It replaces disconnected paper-based workflows, spreadsheet inventory management, and manual accounting with a single integrated digital system accessible from any browser-enabled device.

---

## 5. Objective

The primary objectives of the BunaLink Restaurant ERP Platform are:

1. **Operational Efficiency** — Reduce order processing time by ≥40% through digital POS, real-time KDS, and streamlined table management.

2. **Inventory Accuracy** — Achieve ≥95% inventory accuracy through recipe-based automatic deduction, GRN receiving, and regular digital stock counts.

3. **Cost Control** — Give managers real-time visibility into food costs, waste, and purchasing spend to reduce operational losses.

4. **Revenue Growth** — Increase average order value through modifier upsell, digital menu promotions, and loyalty program incentives.

5. **Financial Accuracy** — Automate double-entry accounting from transactions to eliminate manual bookkeeping errors and ensure tax compliance.

6. **Guest Satisfaction** — Improve the guest experience through a modern bilingual digital menu, faster order processing, and contactless payment options.

7. **Staff Productivity** — Reduce training time for new staff through intuitive role-specific interfaces and clear workflow guidance.

8. **Scalability** — Provide a platform that grows from a single outlet to a multi-branch network without re-implementation.

9. **Data Ownership** — Give operators full ownership and exportability of all their operational and financial data.

---

## 6. Scope of the Project

### 6.1 In-Scope Activities

#### Phase 1 — Frontend SPA (v1.0 — Completed)

- [x] Complete application UI/UX design in Figma
- [x] Public landing page with product marketing and pricing
- [x] User authentication (login, register, role-based access)
- [x] 20+ operational module views (see Section 9 for full list)
- [x] Zustand state management with in-memory mock data
- [x] Bilingual support: English and Amharic
- [x] Dark/light theme with persistent user preference
- [x] Offline-capable POS via localStorage cache simulation
- [x] Responsive design for desktop, tablet, and mobile
- [x] Deployment to Vercel CDN
- [x] System Design Document and technical documentation

#### Phase 2 — Backend Integration (v1.1 — In Development)

- [ ] Node.js / Express REST API development
- [ ] PostgreSQL database design and implementation (20+ tables)
- [ ] JWT authentication with refresh token rotation
- [ ] Real-time WebSocket server (Socket.io) for KDS and order updates
- [ ] Telebirr and CBE Birr payment gateway integration
- [ ] PDF receipt and report generation
- [ ] File upload infrastructure for menu images and videos
- [ ] Email and SMS notification service
- [ ] Multi-branch data isolation and branch switching
- [ ] Comprehensive API test suite
- [ ] Production cloud deployment (AWS)
- [ ] CI/CD pipeline automation

#### Phase 3 — Advanced Features (v1.2)

- [ ] Mobile companion app (React Native — iOS & Android)
- [ ] AI-based demand forecasting and smart reorder recommendations
- [ ] Advanced BI dashboard with custom report builder
- [ ] Third-party delivery platform integration
- [ ] Biometric staff clock-in/clock-out

### 6.2 Out-of-Scope Activities

The following items are explicitly outside the scope of the current engagement unless separately agreed in writing:

| Out-of-Scope Item | Notes |
|---|---|
| Hardware procurement | POS terminals, receipt printers, kitchen displays, tablets |
| Network infrastructure setup | WiFi routers, cabling, network configuration at premises |
| Hotel Property Management System (PMS) integration | Can be quoted separately as Phase 3 |
| Payroll and HR management | Not included in the restaurant ERP scope |
| E-commerce / online ordering website | Guest Menu covers in-venue digital ordering only |
| Third-party accounting software integration (QuickBooks, etc.) | Planned for Phase 3 |
| Custom hardware or IoT device integration | Smart scales, sensors, etc. |
| Legacy data migration from third-party systems | Can be quoted as a separate service |

---

## 7. Technical Approach & Architecture

### 7.1 Proposed Technology Stack

#### Frontend

| Category | Technology | Version | Justification |
|---|---|---|---|
| Framework | React | 18.3.1 | Industry standard; massive ecosystem; concurrent rendering |
| Language | TypeScript | 5.8.3 | Type safety eliminates entire classes of runtime bugs |
| Build Tool | Vite | 5.4.19 | Sub-second HMR; optimized production builds with code splitting |
| Routing | React Router DOM | 6.30.1 | Standard SPA routing with nested route support |
| State Management | Zustand | 5.0.11 | Lightweight, boilerplate-free; no context provider wrapping |
| UI Components | shadcn/ui (Radix UI) | latest | Accessible, unstyled primitives; full design system control |
| Styling | Tailwind CSS | 3.4.17 | Utility-first; consistent design tokens; dark mode via class |
| Animation | Framer Motion | 11.18.2 | Production-grade animations; GPU-accelerated layout transitions |
| Charts | Recharts | 2.15.4 | React-native charting; composable; responsive |
| Icons | Lucide React | 0.462.0 | Consistent, lightweight SVG icon set |
| Forms | React Hook Form + Zod | 7.61 / 3.25 | Uncontrolled forms + runtime schema validation |
| Async Data | TanStack Query | 5.83.0 | Server state caching, background refetch, optimistic updates |
| Notifications | Sonner | 1.7.4 | Non-blocking toast notifications |
| Testing | Vitest + Playwright | latest | Unit + E2E coverage |
| Deployment | Vercel → AWS | — | Edge CDN now; full cloud for v1.1 |

#### Backend (v1.1)

| Category | Technology | Justification |
|---|---|---|
| Runtime | Node.js 20 LTS | Stable LTS; wide ecosystem; same language as frontend |
| Framework | Express.js | Minimal, flexible, well-understood; easy team onboarding |
| Database | PostgreSQL 16 | ACID compliance; JSON support; strong full-text search |
| ORM | Prisma | Type-safe database queries; automatic migration generation |
| Cache | Redis 7 | Session storage; API response caching; job queue backing |
| Auth | JWT + bcrypt / argon2id | Industry-standard token auth; proven password hashing |
| Real-time | Socket.io | Bi-directional WebSocket with fallback; rooms for KDS scoping |
| File Storage | AWS S3 / MinIO | Scalable object storage for menu images, PDF receipts |
| PDF | Puppeteer | Headless Chrome rendering; pixel-perfect receipt and report PDFs |
| Queue | Bull (Redis-backed) | Background job processing for notifications and exports |
| API Docs | Swagger / OpenAPI 3 | Auto-generated interactive API documentation |

### 7.2 System Architecture

#### Current Architecture (v1.0 — Single-Tier SPA)

```
┌──────────────────────────────────────────────────────────┐
│                   Browser (React SPA)                    │
│                                                          │
│  ┌────────────┐   ┌────────────────────────────────────┐ │
│  │   Router   │   │       Zustand Stores (17)          │ │
│  │  /         │   │  auth · order · menu · inventory   │ │
│  │  /login    │   │  purchasing · tables · accounting  │ │
│  │  /app      │   │  payments · kitchen · customers    │ │
│  └────────────┘   │  shifts · discounts · recipes      │ │
│                   │  stations · analytics · locale     │ │
│  ┌────────────┐   │  theme                             │ │
│  │  20+ View  │   └────────────────────────────────────┘ │
│  │ Components │                    ↕                      │
│  └────────────┘   ┌────────────────────────────────────┐ │
│                   │     Infrastructure Services        │ │
│                   │  OfflineCache · RealtimeService     │ │
│                   │  AnalyticsEngine · KitchenIntel     │ │
│                   └────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
              ↕ Static files via Vercel CDN
```

#### Target Architecture (v1.1 — Three-Tier)

```
          ┌──────────────────────────────────────┐
          │         DNS / CDN (Cloudflare)        │
          └──────────────┬───────────────────────┘
          ┌──────────────┴────────────────────┐
          ↓                                   ↓
┌──────────────────┐              ┌────────────────────────┐
│  React SPA       │              │  Load Balancer         │
│  (Vercel Edge)   │              │  (NGINX / AWS ALB)     │
└──────────────────┘              └──────────┬─────────────┘
                                             ↓
                              ┌──────────────────────────┐
                              │  Node.js / Express API   │
                              │  Cluster (Docker)        │
                              │  Instance 1 | Instance 2 │
                              └──────┬───────────────┬───┘
                                     ↓               ↓
                    ┌────────────────┐   ┌───────────────────┐
                    │  PostgreSQL 16 │   │  Redis 7          │
                    │  Primary +     │   │  Cache · Sessions │
                    │  Read Replica  │   │  Job Queues       │
                    └────────────────┘   └───────────────────┘
                                                ↓
                                   ┌────────────────────────┐
                                   │  AWS S3 Object Storage │
                                   │  Images · PDFs         │
                                   │  Report Exports        │
                                   └────────────────────────┘
```

#### Application Module Map

```
BunaLink ERP Platform
│
├── Front of House
│   ├── Dashboard (live KPIs + feeds)
│   ├── POS / Staff Tablet (order taking)
│   ├── Orders Management (full lifecycle)
│   ├── Tables & Reservations (4 tabs)
│   ├── Floor Plan (interactive canvas)
│   └── Guest Digital Menu (QR / consumer)
│
├── Kitchen
│   └── KDS — Kitchen Display System
│
├── Back of House
│   ├── Menu Management (categories, items, modifiers)
│   ├── Inventory Management (8 tabs / WMS)
│   ├── Purchasing / Procure-to-Pay (7 tabs)
│   └── Recipe Management (BOM + cost)
│
├── Finance
│   ├── Billing & Payments (cashier POS)
│   ├── Discounts & Promotions
│   └── Accounting (double-entry, COA, JEs)
│
├── Analytics & Reporting
│   ├── Analytics (live charts)
│   └── Reports (exportable templates)
│
└── Administration
    ├── CRM & Loyalty
    ├── Staff & Shifts
    ├── User Management
    ├── Settings
    └── Admin Panel
```

### 7.3 Development Methodology

BunaLink uses a **Structured Agile** approach — combining the discipline of structured documentation and milestone gates with the flexibility and continuous delivery of Agile sprints.

| Methodology Element | BunaLink Practice |
|---|---|
| Sprint Length | 2 weeks |
| Sprint Ceremony | Sprint planning, daily stand-up, sprint review, retrospective |
| Documentation | SDD, API specification, and test plan updated at each milestone |
| Version Control | Git + GitHub with branch strategy (main / develop / feature/* / hotfix/*) |
| Code Review | Mandatory PR review by minimum 1 senior engineer before merge |
| CI/CD | GitHub Actions: lint → TypeScript check → test → build → deploy |
| Client Demos | Live demo at end of every sprint (bi-weekly) |
| Progress Tracking | Linear.app project board (or equivalent) shared with client |
| Milestone Payments | Tied to completed, accepted sprints — not time elapsed |

---

## 8. General Requirements

The BunaLink platform is designed to meet the following general system requirements:

| Requirement | BunaLink Response |
|---|---|
| **Browser Compatibility** | Chrome 90+, Firefox 90+, Safari 14+, Edge 90+ (all Chromium-based browsers) |
| **Device Support** | Desktop (1280px+), tablet (768px–1279px, touch-optimized), mobile (360px–767px) |
| **Performance** | Largest Contentful Paint (LCP) < 2.5 seconds; Time to Interactive (TTI) < 3.5 seconds |
| **Availability** | Target 99.9% uptime SLA (< 9 hours planned downtime per year) |
| **Language Support** | English (100%) and Amharic — አማርኛ (primary UI strings, all modules) |
| **Currency** | Ethiopian Birr (ETB / Br); formatted as `Br 1,250.00` (EN) and `ብር 1,250.00` (AM) |
| **Tax Compliance** | Configurable VAT (15%), service charge (10%), and withholding tax in line with ERCA rules |
| **Offline Operation** | POS core functions operate without internet; auto-sync on reconnection |
| **Data Export** | All reports exportable to PDF and CSV; all financial data exportable |
| **Audit Trail** | All financial, inventory, and user management actions logged with user, timestamp, and change details |
| **Multi-Branch** | Platform architecture supports branch-scoped data and consolidated cross-branch reporting |
| **Scalability** | System handles ≥50 concurrent users per outlet; scales horizontally in cloud deployment |
| **Accessibility** | WCAG 2.1 AA compliance; keyboard navigation; screen reader compatible components via Radix UI |

---

## 9. Functional Requirements Response

### 9.1 Point of Sale & Order Management

**Requirement:** A real-time digital system for capturing, tracking, and managing all orders from creation to fulfillment and payment.

**BunaLink Response:**

The platform provides two complementary interfaces for order management:

**Staff Tablet POS (`StaffTabletView`)**
- Touch-optimized interface for waiters and cashiers.
- Category-filtered menu browsing with item search.
- +/- stepper-based item quantity control; modifier and special note capture.
- Manual discount (percentage/fixed) or coupon code validated against `discountsStore`.
- Full checkout: cash, card, and QR/mobile money payment methods.
- Automatic table release and KDS ticket creation on order confirmation.

**Orders Management Console (`OrdersView`)**
- Full CRUD view for all orders across all types and statuses.
- Order status lifecycle: `draft → pending → confirmed → preparing → ready → served → paid`.
- Order types: dine-in, takeaway, delivery, online (from guest QR menu).
- Filter by status, type, date range, server, and table.
- Void order with reason capture (manager/admin authorization required).
- View full line item breakdown, applied discounts, service charge, and tax totals.

**Compliance with Requirement:**

| Feature | Status |
|---|---|
| Create new orders with multiple items | ✓ Implemented |
| Modify open orders (add/remove items) | ✓ Implemented |
| Apply discounts and coupons | ✓ Implemented |
| Track order status in real time | ✓ Implemented |
| Void orders with reason | ✓ Implemented |
| Filter and search orders | ✓ Implemented |
| Support multiple order types | ✓ Implemented |
| Ethiopian Birr totals with tax | ✓ Implemented |

---

### 9.2 Kitchen Operations & Display System

**Requirement:** A real-time kitchen communication system that replaces printed tickets with a live digital display, prioritizing orders and enabling chefs to update preparation status.

**BunaLink Response:**

The **Kitchen Display System (KDS)** (`KDSView`) connects directly to `orderStore` and routes confirmed orders to the appropriate kitchen station (`stationsStore`).

- All orders with status `confirmed`, `preparing`, or `ready` appear as live ticket cards.
- Tickets display: Order ID, table number, order type, elapsed time, priority badge (Normal / Rush / VIP), and all line items with quantities and special instructions.
- Elapsed time displays with color escalation: green (< 10 min) → amber (10–20 min) → red (> 20 min).
- Station filter strip allows each station (Grill, Bar, Pastry, Cold, Expo) to see only their relevant tickets.
- One-tap status bumping: `New → Preparing → Ready → Served`.
- Each status update propagates in real time to all connected clients: Dashboard, Orders view, Floor Plan, and waiter tablets.

**Stations Management:**
- Admin creates and configures stations via `StationsManagementView`.
- Each station has a type (kitchen, bar, pastry, cold, grill, expo), KDS display config, and printer IP.
- Station order determines the KDS display sort sequence.

---

### 9.3 Inventory & Warehouse Management

**Requirement:** A real-time inventory system with multi-warehouse support, lot/expiry tracking, automatic deduction, and audit-grade transaction history.

**BunaLink Response:**

The **Inventory Module** (`InventoryView`) is an 8-tab Warehouse Management System (WMS):

| Tab | Capability |
|---|---|
| **Items** | Master item catalog CRUD: code, name, category, type, UOM, costing method (FIFO/AVCO), reorder point, barcode |
| **Stock Levels** | Per-item, per-warehouse real-time quantities: on-hand, committed, available; lot count; reorder badge |
| **Movements** | Immutable ledger: Receipt, Issue, Transfer, Adjustment, Return, Waste, Count Variance — each with lot, cost, reference, and user |
| **GRN Receiving** | Receive goods against POs; capture lot number, expiry date, unit cost, and storage location; posting creates stock movement records |
| **Stock Counts** | Initiate cycle counts; enter physical counts; system calculates variance; post adjustment movements |
| **Waste Log** | Record spoilage with item, quantity, reason, and responsible staff; integrated with `logWaste()` action |
| **Reorder Alerts** | Items at/below reorder point with suggested quantity; one-click PR creation in `purchasingStore` |
| **Reports** | Stock valuation, movement history, lot/expiry tracking (7/30/60-day views), waste summary |

**Recipe-Based Auto-Deduction:**
- Each menu item is linked to a Recipe (BOM) in `RecipesView`.
- On order payment, the recipe engine issues `StockMovement` records of type `Issue` for each ingredient, automatically reducing stock levels.
- Supports yield multipliers and per-serving scaling.

---

### 9.4 Purchasing & Procurement

**Requirement:** A structured procure-to-pay workflow from purchase requisition through vendor payment, with inventory and accounting integration.

**BunaLink Response:**

The **Purchasing Module** (`PurchasingView`) covers the full procurement lifecycle across 7 tabs:

```
Purchase Requisition (PR)
        ↓  Manager/Admin approves
Purchase Order (PO)
        ↓  Vendor delivers goods
Goods Receipt Note (GRN) ───────► Inventory Stock Levels Updated
        ↓  Three-way match (PO / GRN / Bill)
Vendor Bill (AP Invoice)
        ↓  Finance records payment
Bank Transfer / Payment ─────────► Accounting Payables Updated
```

| Tab | Key Capabilities |
|---|---|
| **Dashboard** | 6 KPIs, PRs awaiting approval (one-click approve/reject), overdue PO alerts, payables due |
| **Requisitions (PR)** | Create PRs with department, required-by date, and line items; submit for approval; convert to PO |
| **Purchase Orders** | Create/edit POs with vendor, delivery date, warehouse, payment terms; track partial/full delivery |
| **GRN Receiving** | Receive against PO lines; enter received qty, lot/expiry, unit cost; partial receipt support |
| **Vendor Bills (AP)** | Create from GRN; post; record full or partial payments; track balance due |
| **Vendors** | Full vendor directory with CRUD; performance metrics: on-time %, avg lead time, total spend |
| **Reports** | Spend by vendor, PO status summary, GRN variance report, vendor performance comparison |

---

### 9.5 Accounting & Financial Management

**Requirement:** A complete financial accounting system aligned with Ethiopian accounting standards, with automated journal entries from all operational transactions.

**BunaLink Response:**

The **Accounting Module** (`AccountingView`) provides full double-entry bookkeeping for restaurant operations:

| Sub-Module | Capability |
|---|---|
| **Chart of Accounts** | CRUD for account hierarchy: Assets, Liabilities, Equity, Revenue, Expenses; opening balances |
| **Journal Entries** | Manual and system-auto double-entry JEs; debits must equal credits; reference and memo fields |
| **Sales Invoices** | Revenue recognition linked to `orderStore` orders; tracks due date, tax, and payment status |
| **Vendor Bills (AP)** | Expense recognition linked to `purchasingStore` GRNs; tracks vendor, due date, and payment status |
| **Bank Accounts** | Multi-bank management (CBE, Dashen, Awash); inter-account transfers; running balance |
| **Tax Configuration** | Configurable VAT (15%), service charge (10%), withholding tax; global or per-item assignment |

**System-Generated Journal Entries:**
- Sales invoice settlement → Debit Cash/Bank, Credit Revenue
- Vendor bill payment → Debit AP Payables, Credit Cash/Bank
- Bank transfer → Debit Destination Account, Credit Source Account
- Inventory receipt (GRN) → Debit Inventory Asset, Credit AP Payables

---

### 9.6 Guest Experience & Digital Menu

**Requirement:** A consumer-grade digital menu accessible via QR code, supporting bilingual browsing, item customization, promotional codes, and Ethiopian mobile payment.

**BunaLink Response:**

The **Guest Digital Menu** (`GuestMenuView`) is designed to feel like a premium mobile app rather than a back-office form. It is the only module accessible to the `customer` user role and is optimized for personal mobile devices.

**Layout and Navigation:**
- Sticky top bar: logo, search, language toggle (EN/AM), "Call Waiter" button, cart badge.
- Auto-advancing promotional hero banner carousel.
- Sticky horizontally-scrollable category pill filter with active scroll-spy.
- Two-column item card grid with image, name, price (ETB), allergen flags, and +/- stepper.

**Item Detail Modal:**
- Full-screen modal with hero image, description, allergens, dietary badges.
- Modifier selection (spice level, add-ons) with real-time price update.
- Special instructions text input.
- "Add to Order" button with dynamic total.
- Upsell suggestions strip.

**Cart & Checkout Flow:**
1. Cart drawer slides in with items, line totals, service charge, VAT, and grand total in ETB.
2. Promo code input validated against `discountsStore` (checks active, expiry, min order, usage limit).
3. Guest selects "Pay Now" (card/QR) or "Pay at Counter" (cash).
4. Order created in `orderStore` (type: `online`); KDS ticket appears immediately.
5. Success screen with order ID and estimated time.

---

### 9.7 CRM, Loyalty & Reporting

**Requirement:** Customer relationship management with loyalty program tracking, feedback management, and comprehensive operational reporting.

**BunaLink Response:**

**CRM Module (`CRMView`):**
- Customer profiles: name, phone, email, date of birth, preferred language, visit count, total spend.
- Loyalty tiers: Bronze (0–499 pts), Silver (500–1,999 pts), Gold (2,000–4,999 pts), Platinum (5,000+ pts).
- Points earned per ETB spent at a configurable ratio; tiers unlock discounts and priority seating.
- Feedback and star ratings captured per visit; average ratings tracked per server and per menu item.

**Analytics Module (`AnalyticsView`):**
- Order volume by hour (bar chart).
- Station load comparison (horizontal bar).
- Top-selling items today (ranked list).
- Revenue by order type (pie chart: dine-in / takeaway / delivery / online).
- Waste overview by item (bar chart).

**Reports Module (`ReportsView`):**
- Daily Sales Summary, Revenue by Category, Waiter Performance, Inventory Consumption, Waste & Spoilage, Purchasing Spend, Customer Visit Frequency, Shift Summary.
- Reports filterable by date range, branch, and category.
- Export to PDF and CSV (v1.1).

---

### 9.8 Staff, Shifts & User Management

**Requirement:** Staff scheduling, shift tracking, and user administration with role-based access control.

**BunaLink Response:**

**Shifts Module (`ShiftsView`):**
- Create shift schedules: staff member, role, start/end time, assigned branch/floor.
- Shift status lifecycle: `scheduled → clocked-in → break → completed`.
- View active shifts for the current day; historical shift log with total hours.

**Waitress / Server Management (`WaitressManagementView`):**
- Assign waitstaff to tables and floor sections.
- View active assignments; performance overview (covers served, avg bill value).

**User Management (`UserManagementView` — Admin only):**
- Full CRUD for user accounts: create, edit role, reset password, deactivate/delete.
- Search by name/email; filter by role; pagination (8 users per page).
- Confirmation dialog for destructive actions (delete, deactivate).

**Role-Based Access Control:**
- 8 roles: admin, manager, cashier, waiter, chef, inventory, delivery, customer.
- Each role has a whitelist of accessible modules defined in `roleNav.ts`.
- `AuthGuard` component enforces access at the route level; `SideNav` filters navigation at runtime.

---

## 10. Non-Functional Requirements

| Category | Requirement | BunaLink Approach |
|---|---|---|
| **Performance** | Page load < 3 seconds on 4G connection | Vite code splitting, Vercel Edge CDN, lazy-loaded routes |
| **Reliability** | 99.9% uptime | Vercel CDN (v1.0); multi-instance AWS deployment with load balancer (v1.1) |
| **Scalability** | Support ≥50 concurrent users per branch | Stateless API + Redis session store; horizontal scaling |
| **Usability** | Staff trained and productive within 1 day | Role-specific views; guided workflows; contextual help tooltips |
| **Accessibility** | WCAG 2.1 AA compliance | Radix UI accessible primitives; semantic HTML; keyboard navigation |
| **Maintainability** | Independent hotfix deployment without full release | Feature flags; modular architecture; automated CI/CD |
| **Portability** | Works on any modern browser | Standards-compliant React/TypeScript; no proprietary browser APIs |
| **Security** | No unauthorized data access | RBAC; JWT auth (v1.1); HTTPS enforcement; input validation via Zod |
| **Localization** | Full Amharic and English support | `localeStore` with `persist`; `t(locale, key)` helper; ETB currency formatter |
| **Data Integrity** | Immutable transaction records | Append-only stock movements and payment records; JE line balancing enforced |
| **Offline Capability** | POS operates without internet | `OfflineCache` (localStorage-backed order cache); auto-sync on reconnect |

---

## 11. Solution Demonstration Plan

BunaLink proposes the following structured demonstration schedule to validate the solution against requirements prior to final acceptance:

### Demo 1 — Front of House Operations (Week 4)
**Audience:** Restaurant operations team (manager, cashier, waiter)

| Scenario | Module Demonstrated |
|---|---|
| Waiter logs in, creates dine-in order for Table 5 | Staff Tablet POS |
| Adds 3 items, selects modifiers, adds note | Staff Tablet POS |
| Kitchen receives live ticket; chef marks "Preparing" | KDS |
| Waiter sees table status update on floor plan | Floor Plan |
| Cashier processes cash payment; table released | Billing & Payments |
| Guest at Table 8 uses QR code to place own order | Guest Digital Menu |

### Demo 2 — Inventory & Purchasing (Week 8)
**Audience:** Inventory and purchasing staff

| Scenario | Module Demonstrated |
|---|---|
| Manager creates Purchase Requisition for 10 items | Purchasing → PR |
| PR approved; PO created and sent to vendor | Purchasing → PO |
| Goods arrive; GRN recorded with lot/expiry | Purchasing → GRN Receiving |
| Stock levels automatically updated | Inventory → Stock Levels |
| Reorder alert fires for low-stock ingredient | Inventory → Reorder Alerts |
| Stock count initiated; variance posted | Inventory → Stock Counts |

### Demo 3 — Finance & Reporting (Week 10)
**Audience:** Finance team and business owner

| Scenario | Module Demonstrated |
|---|---|
| Review daily sales summary | Reports |
| View vendor bill; record partial payment | Accounting → Vendor Bills |
| Review journal entries auto-posted from sales | Accounting → Journal Entries |
| View revenue by order type (pie chart) | Analytics |
| Export daily sales report to PDF | Reports |
| Review top-selling items for the week | Analytics |

### Demo 4 — Full System UAT (Week 14)
**Audience:** All stakeholders; sign-off review

- End-to-end scenario: Guest orders → KDS → payment → inventory deduction → accounting JE.
- All 8 role accounts demonstrated in their respective access contexts.
- Performance benchmark: simultaneous 20-user load test.
- Amharic language toggle demonstrated across all modules.

---

## 12. Security Requirements

### 12.1 Authentication & Session Security

| Requirement | v1.0 Status | v1.1 Plan |
|---|---|---|
| Password hashing | Mock auth (dev only) | bcrypt (cost factor 12) or argon2id |
| JWT access tokens | Not applicable | 15-minute expiry; RS256 signed |
| Refresh token rotation | Not applicable | HTTP-only cookie; rotated on each use |
| Token invalidation on logout | Not applicable | Redis blocklist |
| Brute-force protection | Not applicable | Rate limiting: 5 failed attempts → 15-min lockout |
| Multi-factor authentication | Planned Phase 3 | TOTP (Google Authenticator compatible) |

### 12.2 Transport & Infrastructure Security

- All traffic served exclusively over **HTTPS (TLS 1.2+)**.
- **HSTS** (HTTP Strict Transport Security) headers enforced at CDN/load balancer.
- **Content-Security-Policy (CSP)** headers to prevent XSS attacks.
- **CORS** configured to whitelist only known frontend origins.
- Vercel automatic TLS certificate management in v1.0; AWS Certificate Manager in v1.1.

### 12.3 Authorization — Role-Based Access Control (RBAC)

- 8 roles with module-level and action-level permission enforcement.
- Frontend: `AuthGuard` blocks unauthenticated route access; `roleNav.ts` filters navigation.
- Backend (v1.1): JWT role claim validated by middleware on every API request.
- Principle of least privilege: each role gets only the minimum access required.
- No self-escalation: users cannot modify their own role or permissions.

### 12.4 Data Security

- All form inputs validated with **Zod** schemas before any state mutation.
- Backend (v1.1): **Prisma ORM** parameterized queries prevent SQL injection.
- PII fields (customer phone, email, date of birth) encrypted at rest (AES-256) in v1.1.
- Payment card data **never stored** — delegated to Telebirr/CBE Birr tokenization.
- Sensitive response fields (password hash, internal tokens) excluded from all API responses.

### 12.5 Audit & Compliance

- All financial transactions (orders, payments, journal entries, stock movements) create immutable records.
- User actions on sensitive operations (void order, delete user, post journal entry) logged with: user ID, timestamp, before/after state, and client IP.
- Audit logs retained for minimum 3 years per Ethiopian revenue authority requirements.
- Annual security review and penetration test planned from v1.1 onwards.

---

## 13. Project Implementation Plan & Methodology

### 13.1 Project Methodology: "Structured Agile"

BunaLink employs a **Structured Agile** delivery model that combines the predictability of milestone-based project management with the adaptability of 2-week Agile sprints.

**Why Structured Agile for this project:**
- Restaurant ERP systems have well-defined domain requirements (industry best practices are known) → enables structured upfront planning.
- Business requirements may evolve as the client team engages with working software → requires sprint flexibility.
- Client stakeholders need predictable payment milestones → milestone gates at phase boundaries.
- Development team needs rapid feedback to avoid building the wrong thing → bi-weekly live demos.

**Sprint Cadence:**
- Sprint duration: **2 calendar weeks**
- Sprint starts: Monday
- Sprint review / client demo: Friday of Week 2
- Sprint retrospective: Following Monday (internal)
- Backlog refinement: Wednesday of Week 1

### 13.2 Detailed Project Timeline

#### Phase 1 — Frontend SPA (Completed — v1.0)

| Sprint | Weeks | Deliverables |
|---|---|---|
| Sprint 1 | 1–2 | Project setup, design system, routing, auth, landing page |
| Sprint 2 | 3–4 | Dashboard, Orders, Tables, Floor Plan |
| Sprint 3 | 5–6 | KDS, POS (Staff Tablet), Menu Management |
| Sprint 4 | 7–8 | Inventory (8 tabs), Recipe Management |
| Sprint 5 | 9–10 | Purchasing (7 tabs), Billing & Payments |
| Sprint 6 | 11–12 | Accounting, Discounts, CRM & Loyalty |
| Sprint 7 | 13–14 | Analytics, Reports, Staff & Shifts, User Management |
| Sprint 8 | 15–16 | Guest Digital Menu (full UX), Settings, Admin |
| Sprint 9 | 17–18 | i18n (Amharic), theme system, Vercel deployment |
| Sprint 10 | 19–20 | Bug fixes, documentation (SDD, SysDocs), UAT |

**Phase 1 Status: ✓ COMPLETED**

#### Phase 2 — Backend Integration (v1.1 — In Development)

| Sprint | Weeks | Deliverables |
|---|---|---|
| Sprint 11 | 1–2 | PostgreSQL schema design, Prisma ORM setup, project scaffolding |
| Sprint 12 | 3–4 | Auth API (login, register, JWT, refresh tokens), user management API |
| Sprint 13 | 5–6 | Menu API, Orders API, basic POS integration |
| Sprint 14 | 7–8 | Tables API, Reservations API, KDS WebSocket integration |
| Sprint 15 | 9–10 | Inventory API (items, stock levels, movements) |
| Sprint 16 | 11–12 | GRN, Stock Count, Waste APIs; recipe auto-deduction |
| Sprint 17 | 13–14 | Purchasing API (PR, PO, GRN, Vendor Bill, Vendor) |
| Sprint 18 | 15–16 | Accounting API (COA, JEs, Sales Invoices, Vendor Bills, Bank) |
| Sprint 19 | 17–18 | Payments API; Telebirr integration; CBE Birr integration |
| Sprint 20 | 19–20 | Analytics API, Reports API, PDF generation |
| Sprint 21 | 21–22 | CRM API, Shifts API, Notifications (email/SMS) |
| Sprint 22 | 23–24 | Performance testing, security audit, staging deployment |
| Sprint 23 | 25–26 | UAT, bug fixes, production deployment, go-live |

**Phase 2 Target Completion: Q3 2026**

#### Phase 3 — Advanced Features (v1.2 — Planned Q1 2027)

| Feature | Estimated Sprints |
|---|---|
| React Native mobile companion app | 6 sprints |
| Multi-branch isolation and consolidated reporting | 3 sprints |
| AI demand forecasting and smart reorder | 4 sprints |
| Advanced BI dashboard (custom report builder) | 3 sprints |
| Third-party delivery platform integration | 2 sprints |

### 13.3 Project Management & Communication

| Channel | Frequency | Participants |
|---|---|---|
| Sprint Review / Demo | Every 2 weeks | Full team + client stakeholders |
| Project Status Report | Weekly (written) | PM → client project owner |
| Daily Stand-up | Daily (15 min) | Development team |
| Steering Committee | Monthly | Senior leadership + client decision-makers |
| Issue Escalation | As needed | PM + relevant leads |
| Project Board | Continuous | All (Linear.app or equivalent) |

**Communication Tools:**
- Project board: Linear.app (tasks, sprints, backlog)
- Documentation: Notion (specs, meeting notes, documentation)
- Code: GitHub (version control, PR reviews, CI/CD)
- Chat: Slack (internal team); WhatsApp Business (client communication)
- Meetings: Google Meet (remote demo sessions)

---

## 14. Training & Knowledge Transfer

### 14.1 Training Program

BunaLink delivers role-specific training to ensure all staff can operate the system effectively from day one.

#### Training Track 1 — Operations Staff (Waiters, Cashiers)
**Duration:** 1 day (4 hours)  
**Format:** Hands-on practical sessions using staging environment  
**Content:**
- Logging in and navigating the app by role
- Taking orders on the Staff Tablet POS
- Applying discounts and processing payments
- Managing table status and floor plan
- Using the KDS (for kitchen staff)
- Troubleshooting common scenarios (offline mode, voiding an order)

#### Training Track 2 — Management Staff (Managers, Inventory, Purchasing)
**Duration:** 2 days (8 hours)  
**Format:** Classroom + hands-on workshop  
**Content:**
- Dashboard overview and KPI interpretation
- Menu management (categories, items, availability)
- Inventory management (stock counts, GRN receiving, waste logging)
- Purchasing workflow (PR → PO → GRN → Vendor Bill)
- Discount and promotion configuration
- Staff shift scheduling and management

#### Training Track 3 — Finance & Administration (Accountants, Admins)
**Duration:** 1.5 days (6 hours)  
**Format:** Classroom + hands-on workshop  
**Content:**
- Chart of accounts setup and maintenance
- Reviewing and posting journal entries
- Sales invoices and vendor bill management
- Bank account reconciliation
- Tax configuration
- User management and role assignment
- Report generation and export

#### Training Track 4 — System Administrator
**Duration:** 1 day (4 hours)  
**Format:** Technical deep-dive with IT staff  
**Content:**
- System settings and outlet configuration
- User role management and password reset
- Backup procedures and data export
- Understanding and acting on system alerts
- First-line troubleshooting guide
- Escalation path to BunaLink support

### 14.2 Knowledge Transfer & Documentation

| Deliverable | Format | Recipient |
|---|---|---|
| **System Design Document (SDD)** | Markdown / PDF | Technical team |
| **System Documentation** | Markdown / PDF | Technical team + management |
| **User Manual — Operations** | PDF (EN + AM) | Waiters, cashiers, kitchen staff |
| **User Manual — Management** | PDF (EN + AM) | Managers, inventory, purchasing |
| **User Manual — Finance** | PDF (EN + AM) | Accountants, finance team |
| **Admin Handover Guide** | PDF | System administrator |
| **API Documentation** | Swagger/OpenAPI | Backend integrators |
| **Database Schema** | ERD + SQL | Backend team |
| **Video Tutorial Library** | MP4 (hosted) | All roles |
| **Quick Reference Cards** | A4 laminated cards | Operational staff |

All documentation is delivered in both **English and Amharic** where applicable. Documentation is version-controlled in GitHub alongside the codebase and updated with each major release.

---

## 15. Testing Strategy & Plan

### 15.1 Testing Levels

#### Unit Testing
- **Framework:** Vitest
- **Scope:** All Zustand store actions, utility functions (`translations.ts`, `formatCurrency`), Zod validation schemas, business logic functions (discount calculation, recipe cost, order total).
- **Coverage Target:** ≥ 80% line coverage on all store files and utility libraries.
- **Automation:** Runs automatically in CI/CD pipeline on every push.

#### Component Testing
- **Framework:** Vitest + React Testing Library
- **Scope:** All major view components tested for:
  - Correct rendering under different role props
  - User interaction (click, type, submit)
  - Conditional rendering (empty states, loading, errors)
  - Pagination and filter behavior
  - Form validation error display
- **Key Scenarios:** Role-filtered navigation, coupon validation flow, KDS status bumping, GRN posting.

#### Integration Testing
- **Framework:** Supertest + Vitest (v1.1)
- **Scope:** All API endpoints tested against a live test PostgreSQL database.
- **Key Scenarios:**
  - Full order lifecycle: create → confirm → pay → inventory deduction
  - GRN posting → stock level update
  - Vendor bill payment → accounting journal entry creation
  - Discount code validation with usage limit enforcement

#### End-to-End (E2E) Testing
- **Framework:** Playwright
- **Scope:** Critical user journeys in a real browser (Chrome, Firefox, Safari).
- **Critical Journeys:**
  1. Guest QR scan → menu browse → cart → checkout → KDS ticket appears
  2. Manager PR creation → approval → PO → GRN receiving → stock update
  3. Admin creates user → user logs in → correct modules visible per role
  4. Cashier processes payment → table released → revenue appears in dashboard

#### User Acceptance Testing (UAT)
- Conducted with representative end-users for each role.
- Test environment populated with realistic Ethiopian restaurant data.
- Structured UAT scripts provided to testers.
- UAT feedback captured via structured form; all P1/P2 bugs resolved before sign-off.
- Written sign-off from product owner required before production deployment.

#### Performance Testing
- **Tool:** k6 or Apache JMeter
- **Scenarios:** 50 concurrent users per branch; 100 orders per hour peak load.
- **Acceptance Criteria:** API P95 response time < 500ms; no errors under normal load.

#### Security Testing
- OWASP Top 10 review for each major release.
- Automated SAST scanning in CI/CD pipeline (CodeQL).
- External penetration test before v1.1 public launch.
- Specific focus: JWT validation, IDOR on order/payment endpoints, XSS via user-supplied content.

### 15.2 Testing Schedule

| Testing Phase | Timing | Responsible |
|---|---|---|
| Unit tests | Every sprint (continuous) | Developers |
| Component tests | Every sprint (continuous) | Developers |
| Integration tests | Sprints 12–22 (v1.1) | QA Engineer |
| E2E regression | End of each phase | QA Engineer |
| Performance test | Sprint 22 | DevOps + QA |
| Security audit | Sprint 22 | External security firm |
| UAT | Sprint 23 (2 weeks) | Client team + BunaLink QA |
| Final sign-off | End of Sprint 23 | Product Owner |

### 15.3 Bug Tracking & Management

| Priority | Definition | Response SLA | Resolution SLA |
|---|---|---|---|
| **P1 — Critical** | System crash; data loss; payments broken | 30 minutes | 4 hours |
| **P2 — High** | Core module unusable; incorrect financial data | 2 hours | 8 hours |
| **P3 — Medium** | Non-critical feature broken; workaround available | 8 hours | 3 business days |
| **P4 — Low** | UI cosmetic issue; minor UX improvement | 2 business days | Next sprint |

All bugs tracked in Linear.app (or agreed project tool) with: title, steps to reproduce, expected vs actual behavior, screenshot/video, priority, assigned developer, and resolution status.

---

## 16. Design & User Experience (UX)

### 16.1 UI/UX Design Process

BunaLink follows a **User-Centered Design (UCD)** process:

1. **Discovery** — Stakeholder interviews, workflow observation at target restaurant sites, competitive analysis of existing POS and ERP tools.
2. **Information Architecture** — Define user flows for each role; map module hierarchy and navigation structure.
3. **Wireframing** — Low-fidelity wireframes for all 20+ modules reviewed with client team.
4. **Visual Design** — High-fidelity Figma mockups using the established design system (color tokens, typography, component library).
5. **Prototyping** — Clickable Figma prototype for critical flows (POS checkout, KDS, guest menu).
6. **Usability Testing** — Prototype tested with 5+ representative users per role; findings incorporated before development.
7. **Implementation** — shadcn/ui + Tailwind CSS implementation aligned with Figma specifications.
8. **Validation** — Design QA review comparing implemented UI against Figma before each sprint release.

### 16.2 Core UX Principles

| Principle | Application in BunaLink |
|---|---|
| **Role-Specific Simplicity** | Each role sees only what they need. A waiter's view has no financial data; a chef's view has no customer data. |
| **Minimal Training Time** | Workflows follow natural restaurant operations logic. Staff productive within 1 day without formal training. |
| **Touch-First for Operations** | POS, KDS, and Floor Plan optimized for tap interaction on 10-inch tablets used by floor staff. |
| **Information Density Balance** | Management views (Dashboard, Analytics) maximize data density; operational views (POS, KDS) prioritize clarity. |
| **Error Prevention** | Confirmation dialogs for destructive actions; inline validation before form submission; coupon validation before checkout. |
| **Ethiopian Cultural Alignment** | Amharic text rendered correctly; ETB currency formatting; familiar local food categories and terminology used throughout. |
| **Consistent Feedback** | Toast notifications for all user actions; status color system consistent across all tables, orders, and inventory. |

### 16.3 Accessibility & Responsiveness

**Accessibility (WCAG 2.1 AA):**
- All interactive components built on Radix UI primitives — fully keyboard-navigable and screen-reader compatible.
- Color contrast ratios meet AA standards in both dark and light themes.
- ARIA labels on all icon-only buttons.
- Focus management in modal dialogs and drawer components.
- Text minimum size 14px for operational views; 16px for guest-facing menu.

**Responsive Breakpoints:**

| Breakpoint | Target Devices | Key Adaptations |
|---|---|---|
| Mobile (360–767px) | Guest menu (personal phones) | Single-column layout; bottom navigation; large touch targets |
| Tablet (768–1279px) | Staff POS and KDS tablets | Two-column layout; sidebar collapsible; touch-optimized buttons |
| Desktop (1280px+) | Manager and admin workstations | Full sidebar; dense data tables; multi-column analytics |

### 16.4 UI/UX Screens & Modules

The following 23 operational screens have been fully designed and implemented:

| # | Module / Screen | Primary Users |
|---|---|---|
| 1 | Landing Page | Public (marketing) |
| 2 | Login / Register | All roles |
| 3 | Dashboard | All staff roles |
| 4 | Staff Tablet POS | Waiter, cashier |
| 5 | Orders Management | Admin, manager, cashier, waiter |
| 6 | Tables & Reservations (4 tabs) | Admin, manager, cashier, waiter |
| 7 | Floor Plan (interactive canvas) | Admin, manager, waiter |
| 8 | Kitchen Display System (KDS) | Admin, manager, chef |
| 9 | Menu Management (4 tabs) | Admin, manager |
| 10 | Guest Digital Menu | Customer (QR) |
| 11 | Inventory Management (8 tabs) | Admin, manager, inventory |
| 12 | Purchasing / Procure-to-Pay (7 tabs) | Admin, manager, inventory |
| 13 | Recipe Management | Admin, manager, chef, inventory |
| 14 | Billing & Payments | Admin, manager, cashier |
| 15 | Discounts & Promotions | Admin, manager |
| 16 | Accounting (6 sub-modules) | Admin |
| 17 | Analytics | Admin, manager |
| 18 | Reports | Admin, manager |
| 19 | CRM & Loyalty | Admin, manager |
| 20 | Staff & Shifts | Admin, manager |
| 21 | User Management | Admin |
| 22 | Settings | Admin |
| 23 | Admin Panel | Admin |

---

## 17. Organizational Structure & Project Team

### 17.1 Project Team Matrix

| Role | Name | Allocation | Responsibilities |
|---|---|---|---|
| **Project Manager** | [Name] | 100% | Stakeholder communication, sprint planning, milestone tracking, risk management, client reporting |
| **Lead UX/UI Designer** | [Name] | 80% | Figma design system, wireframes, mockups, design QA, Amharic typography |
| **UX/UI Designer** | [Name] | 60% | Supporting screens, component library, UAT UI review |
| **Lead Frontend Engineer** | [Name] | 100% | Architecture decisions, complex components (Floor Plan, KDS, Guest Menu), performance optimization |
| **Senior Frontend Engineer** | [Name] | 100% | Inventory, Purchasing, Accounting modules; Zustand store design |
| **Frontend Engineer** | [Name] | 100% | Dashboard, Orders, Tables, CRM, Reports; i18n implementation |
| **Junior Frontend Engineer** | [Name] | 100% | UI components, bug fixes, test coverage |
| **Lead Backend Engineer** | [Name] | 100% | API architecture, PostgreSQL schema, security, Socket.io |
| **Senior Backend Engineer** | [Name] | 100% | Business logic (inventory, purchasing, accounting APIs) |
| **Backend Engineer** | [Name] | 100% | Auth API, payments integration (Telebirr, CBE Birr), notifications |
| **Lead QA Engineer** | [Name] | 100% | Test strategy, E2E Playwright suite, UAT coordination, bug tracking |
| **QA Engineer** | [Name] | 100% | Unit/integration tests, regression testing, performance testing |
| **DevOps Engineer** | [Name] | 60% | CI/CD pipeline, Docker, AWS deployment, database operations, monitoring |
| **DBA (Database Administrator)** | [Name] | 40% | PostgreSQL schema review, index optimization, backup strategy |
| **Technical Writer** | [Name] | 50% | SDD, user manuals, API documentation, training materials (EN + AM) |
| **Training Specialist** | [Name] | 30% | Training program design, delivery, follow-up support |
| **Support Engineer** | [Name] | 30% | Post-launch SLA support, hotfix coordination |

**Total Team: 17 professionals**

### 17.2 Team Qualifications & Experience

| Category | Qualifications |
|---|---|
| **Education** | Team members hold BSc/MSc in Computer Science, Software Engineering, or Information Systems from Addis Ababa University, AAiT, or international institutions |
| **Frontend Experience** | Minimum 3 years React experience per frontend engineer; TypeScript proficiency required |
| **Backend Experience** | Minimum 3 years Node.js/Express experience per backend engineer; PostgreSQL DBA experience |
| **Domain Knowledge** | Team members have prior experience delivering POS and ERP solutions for Ethiopian food service and retail clients |
| **Language** | All team members fluent in English and Amharic; technical documentation produced in both languages |
| **Certifications** | AWS Certified Developer, Google Professional Cloud Developer (select team members); Agile/Scrum certifications |

### 17.3 Reporting Structure

```
Client Project Owner
        │
        │ (Steering Committee — Monthly)
        │ (Status Reports — Weekly)
        │
    Project Manager (BunaLink)
        │
        ├──── Lead UX/UI Designer ──── UX/UI Designer
        │
        ├──── Lead Frontend Engineer ──── Senior FE ──── FE ──── Junior FE
        │
        ├──── Lead Backend Engineer ──── Senior BE ──── BE
        │
        ├──── Lead QA Engineer ──── QA Engineer
        │
        ├──── DevOps Engineer ──── DBA
        │
        └──── Technical Writer / Training ──── Support Engineer
```

**Escalation Path:**
1. Day-to-day issues → Assigned engineer → Lead engineer
2. Sprint-level issues → Project Manager
3. Milestone / contract issues → Project Manager → Client Project Owner
4. P1 production incidents → Support Engineer → Lead Engineer → Project Manager (within 30 min)

---

## 18. Acronyms

| Acronym | Full Form |
|---|---|
| AM | Amharic language code |
| AP | Accounts Payable |
| API | Application Programming Interface |
| AVCO | Average Cost (inventory costing method) |
| BOM | Bill of Materials (Recipe in restaurant context) |
| CDN | Content Delivery Network |
| CI/CD | Continuous Integration / Continuous Deployment |
| COA | Chart of Accounts |
| CRM | Customer Relationship Management |
| CRUD | Create, Read, Update, Delete |
| CSV | Comma-Separated Values |
| DBA | Database Administrator |
| EN | English language code |
| ERP | Enterprise Resource Planning |
| ETB | Ethiopian Birr (ISO 4217 code: ETB) |
| ERCA | Ethiopian Revenue and Customs Authority |
| FIFO | First In, First Out |
| GRN | Goods Receipt Note |
| HSTS | HTTP Strict Transport Security |
| ICT | Information and Communications Technology |
| IDOR | Insecure Direct Object Reference |
| JE | Journal Entry |
| JWT | JSON Web Token |
| KDS | Kitchen Display System |
| KPI | Key Performance Indicator |
| LCP | Largest Contentful Paint |
| PII | Personally Identifiable Information |
| PLC | Private Limited Company |
| PO | Purchase Order |
| POS | Point of Sale |
| PR | Purchase Requisition |
| RBAC | Role-Based Access Control |
| REST | Representational State Transfer |
| RPO | Recovery Point Objective |
| RTO | Recovery Time Objective |
| SAST | Static Application Security Testing |
| SDD | System Design Document |
| SLA | Service Level Agreement |
| SPA | Single Page Application |
| SQL | Structured Query Language |
| SSE | Server-Sent Events |
| TIN | Tax Identification Number |
| TLS | Transport Layer Security |
| TTI | Time to Interactive |
| UAT | User Acceptance Testing |
| UCD | User-Centered Design |
| UI | User Interface |
| UOM | Unit of Measure |
| UX | User Experience |
| VAT | Value Added Tax |
| WCAG | Web Content Accessibility Guidelines |
| WMS | Warehouse Management System |
| WS | WebSocket |
| XSS | Cross-Site Scripting |

---

## 19. Conclusion

BunaLink Technology has presented a comprehensive, technically sound, and market-aligned solution for the Ethiopian restaurant and bar ERP challenge. Our platform — built on industry-leading open-source technologies, designed for the Ethiopian market from the ground up, and delivered by an experienced multidisciplinary team — is uniquely positioned to transform restaurant operations and unlock the full potential of digital management for Ethiopian food service businesses.

**Our solution delivers:**

- A **complete 20+ module ERP platform** covering every operational layer from POS to accounting to multi-branch reporting.
- A **bilingual, offline-capable system** that works in the realities of the Ethiopian operating environment.
- A **production-grade codebase** built on React 18, TypeScript, PostgreSQL, and modern DevOps practices — not a quick prototype.
- A **structured delivery approach** with milestone-based payments, bi-weekly client demos, and transparent project tracking.
- A **long-term partnership model** with SLA-backed support, continuous improvement sprints, and a clear feature roadmap through v1.2 and beyond.

We are confident that BunaLink represents not just a software delivery, but a lasting strategic technology partnership for the growth of your restaurant business.

We invite you to review this proposal, schedule a live system demonstration, and take the first step toward a fully digitized, data-driven restaurant operation.

---

*"We don't just build software for Ethiopian restaurants — we understand them."*

**BunaLink Technology PLC**  
Addis Ababa, Ethiopia  
info@bunalink.et | www.bunalink.et  
February 2026

---

## 20. Attachments

The following documents are attached or available upon request as part of this proposal submission:

| # | Attachment | Format | Status |
|---|---|---|---|
| A1 | System Design Document (SDD) — v1.0 | PDF / Markdown | Attached |
| A2 | System Documentation (Technical Reference) | PDF / Markdown | Attached |
| A3 | Database Entity Relationship Diagram (ERD) | PDF / PNG | Available on request |
| A4 | API Specification (OpenAPI 3.0) | YAML / Swagger | Available on request |
| A5 | UI/UX Figma Design System & Mockups | Figma link | Available on request |
| A6 | Live System Demo Access (Staging URL) | URL + credentials | Available on request |
| A7 | Company Registration Certificate | PDF scan | Attached |
| A8 | Tax Identification Certificate (TIN) | PDF scan | Attached |
| A9 | ICT Business License | PDF scan | Attached |
| A10 | Team CVs — Key Personnel (7 members) | PDF | Available on request |
| A11 | Client Reference Letters (2 prior clients) | PDF | Available on request |
| A12 | Financial Capacity Statement | PDF | Available on request |
| A13 | Project Timeline (Gantt Chart — Phase 2) | PDF / Excel | Available on request |
| A14 | Security Policy Statement | PDF | Available on request |
| A15 | SLA Agreement Template | PDF | Available on request |

---

*BunaLink Restaurant ERP — Technical Proposal & Project Documentation*  
*Version 1.0 — February 2026*  
*Prepared by BunaLink Technology PLC — Confidential*
