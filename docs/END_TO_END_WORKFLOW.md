# Coffee Field OS — End-to-End Workflow

## Three desks, one program

| Layer | Actor | Role |
|-------|-------|------|
| **Govern** | Silva | Approve AFP / Band C–D AFEs; settlements; released reports |
| **Manage** | SPX | Author instruments; validate work; narrative reports; platform admin |
| **Execute** | Vendors | Work orders, field tickets, IFS forms, payment requests |

All communication flows through SPX. Vendors do not reach Silva directly.

## Core chain

```text
Work plan → AFP → AFE → Work Order → Field Ticket → Payment Request → Owner Settlement
```

Parallel: season calendar, budget vs actual, reports, vendor register, SPX revenue (firewall).

## Quick phases

1. **Access** — Register → SPX review → activate → join program → pick farm area
2. **Plan** — Work plan (vendor) → AFP (SPX/Silva) → season calendar (SPX issues)
3. **Authorize** — AFE with Schedule 3 bands (A/B/C/D)
4. **Issue** — Work order (Schedule 4 insurance gate)
5. **Execute** — IFS forms + field tickets (vendor → SPX validate)
6. **Pay** — Payment request → settlement
7. **Report** — SPX narrative → release → Silva reads

## Firewalls

- No vendor → Silva raw channel
- Revenue ledger = SPX principal only
- Maker–checker on money steps
- Restricted GL export path

## Demo logins

Password: `Password123!`  
`principal@spx.example` · `owner@silva.example` · `lead@bagro.example`

## Status flows (demo)

| Instrument | Typical path |
| --- | --- |
| AFP | draft → submitted → approved (Silva) |
| AFE | draft → recommended → issued (Band A/B SPX) or pending_owner → approved → issued (Band C/D) |
| Work Order | draft → issued (insurance OK) → in_progress → completed |
| Field Ticket | submitted (vendor) → validated (SPX) |
| Payment Request | submitted (vendor) → approved (SPX) → settled |
| Settlement | draft → released (Silva visible) |
