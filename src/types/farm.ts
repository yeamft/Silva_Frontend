/** Legacy farm-block domain types (kept for older stores). Field OS desks live in fieldOs.ts */

export type { FieldUserRole as FarmUserRole } from "@/types/fieldOs";

export type ActivityStatus = "planned" | "in_progress" | "completed" | "rolled_over" | "cancelled";
export type ChangeStatus = "pending" | "approved" | "rejected";
export type ApprovalThreshold = { maxCostDeltaPct: number; maxDurationDeltaDays: number };

export interface FarmBlock {
  id: string;
  code: string;
  name: string;
  hectares: number;
  location: string;
  cropVariety: string;
  supervisorId?: string;
  supervisorName?: string;
  active: boolean;
}

export interface LaborRole {
  id: string;
  name: string;
  dailyRate: number;
  currency: "ETB";
  active: boolean;
}

export interface Material {
  id: string;
  sku: string;
  name: string;
  unit: string;
  unitCost: number;
  stockQty: number;
  currency: "ETB";
  active: boolean;
}

export interface ActivityTemplate {
  id: string;
  code: string;
  name: string;
  category: string;
  baseDurationDays: number;
  laborRoleIds: string[];
  laborDaysPerHa: number;
  materialNeeds: { materialId: string; qtyPerHa: number }[];
  description?: string;
  active: boolean;
}

export interface ActivityAssignment {
  id: string;
  blockId: string;
  templateId: string;
  name: string;
  sequence: number;
  plannedStart: string;
  plannedEnd: string;
  plannedLaborDays: number;
  plannedMaterialCost: number;
  plannedLaborCost: number;
  status: ActivityStatus;
  actualStart?: string;
  actualEnd?: string;
  progressPct: number;
  actualLaborDays: number;
  actualMaterialCost: number;
  actualLaborCost: number;
  notes?: string;
  updatedAt: number;
}

export interface ProgressEntry {
  id: string;
  assignmentId: string;
  blockId: string;
  date: string;
  progressPct: number;
  laborHours: number;
  materialCost: number;
  notes?: string;
  enteredBy: string;
  createdAt: number;
}

export interface PlanChange {
  id: string;
  assignmentId: string;
  blockId: string;
  field: string;
  fromValue: string;
  toValue: string;
  reason: string;
  costDelta: number;
  durationDeltaDays: number;
  status: ChangeStatus;
  requestedBy: string;
  requestedAt: number;
  reviewedBy?: string;
  reviewedAt?: number;
}

export interface FarmSettings {
  costApprovalThresholdPct: number;
  durationApprovalThresholdDays: number;
  farmName: string;
  seasonLabel: string;
}
