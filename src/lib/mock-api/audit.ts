import type { AuditEvent } from "@/types/cropfort-modules";
import { isoNow, newId } from "./delay";

let events: AuditEvent[] = [];

/** In-memory audit trail. Replace with POST /audit when the API exists. */
export function recordAudit(entry: Omit<AuditEvent, "id" | "at"> & { at?: string }): AuditEvent {
  const event: AuditEvent = {
    id: newId("aud"),
    at: entry.at ?? isoNow(),
    actorId: entry.actorId,
    actorName: entry.actorName,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    before: entry.before,
    after: entry.after,
  };
  events = [event, ...events];
  return event;
}

export function listAudit(entityType?: string, entityId?: string): AuditEvent[] {
  return events.filter((e) => {
    if (entityType && e.entityType !== entityType) return false;
    if (entityId && e.entityId !== entityId) return false;
    return true;
  });
}

export function resetAudit(): void {
  events = [];
}
