# Coffee Field OS — Project Scope (Coding Team)

Canonical product/operating scope for this repo. Distilled from the SPX–Silva–B-Agro design work (oilfield-services *internal* framing only — never client-facing).

## Engagement model (product truth)

| Layer | Actor | Role in the platform |
| --- | --- | --- |
| **Govern** | Silva (owner tenant) | Approve AFP; approve Band C/D AFEs; view dashboards, settlements, released reports. **No** raw Field Tickets / Payment Requests. **No** SPX revenue. |
| **Manage** | SPX (manager tenant) | Author/issue plans & instruments to Silva; validate B-Agro work; exceptions; narrative reports; revenue ledger (principal only). Visible value-add — **not** a pass-through stamp. |
| **Execute** | B-Agro / vendors (executor tenants) | Field entry against SPX-issued Work Orders; Field Tickets; Payment Requests. **No** direct Silva channel; **no** SPX fee/margin visibility. |

**Option 1 (locked):** One shared form/system set. B-Agro is a restricted user of Coffee Field OS; SPX validates/authorizes/narrates on the same instruments. Do not build a parallel B-Agro form system.

**Internal analogy (never in UI copy to Silva):** SPX ≈ oilfield services systems layer over field execution. Client-facing story remains three-year estate turnaround.

## Instrument chain (must stay end-to-end)

```
AFP → AFE → Work Order → Field Ticket → Payment Request → Owner Settlement
```

Plus: Budget vs Actual (per AFP line), Vendor Register + Scorecards, Schedule 3 bands, Schedule 4 insurance gates, Accountability Matrix (Execute / Validate / Decide / Author), Schedule 5 report cadence, GL export (restricted), Related Party disclosure, SPX Revenue Ledger (firewall).

## Structural firewalls (enforce in API + UI)

1. **Revenue firewall** — `spx_revenue_ledger` principal-only; no accidental joins into Silva/vendor views.
2. **No B-Agro → Silva channel (D-01)** — vendor data reaches Silva only after SPX validation / release.
3. **Maker–checker** — submitter cannot approve own money/workflow steps across org boundaries where required.
4. **IP / restricted export** — GL export via restricted credential path, not full system access for Silva accountants.

## Schedule 3 bands (encoded)

| Band | USD | SPX | Silva |
| --- | --- | --- | --- |
| A | ≤ 5,000 | Decide | Informed (monthly) |
| B | 5,001–20,000 | Issue; inform | May object (window) |
| C | 20,001–50,000 | Recommend | Approve before issue |
| D | > 50,000 | Recommend | Approve before issue |

Schedule 4: insurance on file / not expired before WO issue for assigned vendors.

## Multi-tenant SaaS (current platform slice)

- **Tenant = Organization** (`silva` | `spx` | `vendor`) with branding.
- **Program** = shared estate engagement (e.g. Shecha). Operational data is `programId`-scoped.
- Orgs collaborate by joining the same Program; isolation without Program membership.
- No Stripe/billing in this slice.
- Post-signup **onboarding walkthrough** starts the project (create Program → invite → branding). Not on admin dashboard.

## Stack in this repo

- Next.js App Router client (this package) with local demo store for the operating chain.
- Target backend: Express + Prisma + PostgreSQL (`server/` when added).
- Supabase remains optional sync for legacy tables.

## Demo

Seed password: `Password123!`  
Examples: `principal@spx.example`, `owner@silva.example`, `lead@bagro.example`
