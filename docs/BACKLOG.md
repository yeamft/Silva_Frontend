# Coffee Field OS — Backlog

## Done (this slice)

- [x] Scope docs + end-to-end workflow reference
- [x] Tenant desks: Silva / SPX / Vendor roles + firewalls in UI
- [x] Instrument chain demo store: AFP → AFE → WO → Field Ticket → Payment Request → Settlement
- [x] Schedule 3 band computation; Schedule 4 insurance gate on WO issue
- [x] Budget vs Actual, Vendor register, SPX revenue ledger (principal-only)
- [x] Role dashboards + demo logins

## P0 — Operating gaps

1. [ ] Persist chain to Postgres (Prisma) instead of local Zustand
2. [ ] Maker–checker enforcement across org boundaries (API)
3. [ ] Released-report path (SPX narrative → Silva read-only)
4. [ ] Program membership invites + switch-program
5. [ ] Audit trail on every status transition

## P1 — Field / forms layer

6. [ ] IFS operational forms subset at `/execution/forms`
7. [ ] Seasonal work calendars / harvest timelines
8. [ ] Mobile-first vendor field UX (FAB + deep-links)
9. [ ] Notification center (Band B alerts, bulk ack)

## P2 — Hardening

10. [ ] Postgres RLS
11. [ ] Billing / Stripe / seats
12. [ ] Offline Field Tickets
13. [ ] Document generation (PDF/DOCX)
14. [ ] Silva accounting system integration

## Counsel blockers (external)

- Final B-Agro fee % / fee structure
- Ethiopian tax opinion (agent vs principal)
- Ethiopian legal opinion (liability caps, EOR)
- Final hectare lock
- Acquisition close / FMA execution
- Schedule 3/4 amount changes from broker/counsel
