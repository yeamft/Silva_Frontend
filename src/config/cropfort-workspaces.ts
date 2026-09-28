/**
 * CropFort enterprise navigation — workspace architecture.
 * Sidebar = where am I?  Workspace nav = what function?  Context bar = which estate/programme?
 */

import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Briefcase,
  Building2,
  CalendarRange,
  ClipboardCheck,
  ClipboardList,
  FileStack,
  FolderKanban,
  Gauge,
  LayoutDashboard,
  Library,
  LineChart,
  ListChecks,
  Map,
  Network,
  Settings,
  Shield,
  Users,
  WalletCards,
  Wrench,
} from "lucide-react";
import type { CropfortRole } from "@/types/cropfort";
import { CROPFORT_ROUTES } from "@/config/navigation-routes";

export type WorkspaceId =
  | "overview"
  | "planning"
  | "execution"
  | "control"
  | "performance"
  | "standards"
  | "administration";

export type WorkspaceModule = {
  id: string;
  label: string;
  href: string;
  roles?: CropfortRole[] | "all";
  description?: string;
};

export type CropfortWorkspace = {
  id: WorkspaceId;
  label: string;
  icon: LucideIcon;
  href: string;
  roles: CropfortRole[] | "all";
  /** Hide horizontal module nav (Overview). */
  hideModuleNav?: boolean;
  modules: WorkspaceModule[];
};

const ALL_PLAN: CropfortRole[] = ["spx_validator", "farm_owner", "spx_platform_admin"];
const SPX: CropfortRole[] = ["spx_validator", "spx_platform_admin"];
const ADMIN: CropfortRole[] = ["spx_platform_admin"];
const FIELD: CropfortRole[] = [
  "field_supervisor",
  "bagro_office",
  "spx_validator",
  "spx_platform_admin",
  "farm_owner",
];
/** Execution / control without vendor-only desk. */
const FIELD_NO_VENDOR: CropfortRole[] = [
  "field_supervisor",
  "spx_validator",
  "spx_platform_admin",
  "farm_owner",
];
const EXEC_ROLES: CropfortRole[] = [...FIELD];


export const CROPFORT_WORKSPACES: CropfortWorkspace[] = [
  {
    id: "overview",
    label: "Overview",
    icon: LayoutDashboard,
    href: CROPFORT_ROUTES.dashboard,
    roles: "all",
    hideModuleNav: true,
    modules: [],
  },
  {
    id: "planning",
    label: "Planning",
    icon: Briefcase,
    href: CROPFORT_ROUTES.coreOperations,
    roles: ALL_PLAN,
    modules: [
      {
        id: "programme",
        label: "Programme",
        href: CROPFORT_ROUTES.programmePlans,
        description: "Programme plans register — multiple plans per workspace",
      },
      {
        id: "projects",
        label: "Projects",
        href: CROPFORT_ROUTES.projects,
        description: "Tier 2 project scopes and commercial agreements",
      },
      {
        id: "activities",
        label: "Activities",
        href: CROPFORT_ROUTES.blocksActivities,
        description: "Planned activities by area and block",
      },
      {
        id: "timeline",
        label: "Timeline",
        href: "/cropfort/planning/timeline",
        description: "Programme schedule",
      },
      {
        id: "resources",
        label: "Resources & Capacity",
        href: CROPFORT_ROUTES.laborWorkforce,
        description: "Labour / materials / services demand from the active programme plan",
      },
      {
        id: "budget",
        label: "Cost Management",
        href: CROPFORT_ROUTES.budget,
        description: "Budget vs actual, commitments, forecast",
      },
      {
        id: "scenarios",
        label: "Scenarios",
        href: "/cropfort/planning/scenarios",
        description: "Planning alternatives",
      },
    ],
  },
  {
    id: "execution",
    label: "Execution",
    icon: Wrench,
    href: CROPFORT_ROUTES.fieldTickets,
    roles: EXEC_ROLES,
    modules: [
      {
        id: "work-orders",
        label: "Work Orders",
        href: CROPFORT_ROUTES.workOrders,
        roles: ALL_PLAN,
        description: "Issued work including monthly views",
      },
      {
        id: "weekly-plans",
        label: "Weekly Plans",
        href: CROPFORT_ROUTES.weeklySubmissions,
        roles: FIELD_NO_VENDOR,
        description: "Weekly implementation plans",
      },
      {
        id: "field-execution",
        label: "Field Execution",
        href: CROPFORT_ROUTES.fieldTickets,
        roles: FIELD,
        description: "What is happening on the farm now",
      },
      {
        id: "daily-records",
        label: "Daily Field Records",
        href: CROPFORT_ROUTES.dailyFieldRecords,
        roles: FIELD_NO_VENDOR,
        description: "Block-level daily actuals",
      },
      {
        id: "communications",
        label: "Communications",
        href: CROPFORT_ROUTES.communications,
        roles: FIELD,
        description: "SPX-mediated messages",
      },
    ],
  },
  {
    id: "control",
    label: "Control",
    icon: ClipboardCheck,
    href: CROPFORT_ROUTES.approvals,
    roles: FIELD_NO_VENDOR,
    modules: [
      {
        id: "approvals",
        label: "Approvals",
        href: CROPFORT_ROUTES.approvals,
        roles: ALL_PLAN,
        description: "Plans, AFEs, and monthly WO decisions",
      },
      {
        id: "afe",
        label: "AFE",
        href: CROPFORT_ROUTES.afe,
        roles: ALL_PLAN,
        description: "Authority for Expenditure register",
      },
      {
        id: "validation",
        label: "Validation",
        href: CROPFORT_ROUTES.validationQueue,
        roles: FIELD_NO_VENDOR,
        description: "Daily field record validation",
      },
      {
        id: "payment-requests",
        label: "Payment Requests",
        href: CROPFORT_ROUTES.paymentRequests,
        roles: ["bagro_office", "field_supervisor", "spx_validator", "spx_platform_admin"],
        description: "Bill from validated field tickets",
      },
      {
        id: "settlements",
        label: "Settlements",
        href: CROPFORT_ROUTES.settlements,
        roles: ALL_PLAN,
        description: "Owner settlements after SPX verification",
      },
      {
        id: "exceptions",
        label: "Exceptions & Decisions",
        href: "/cropfort/control/exceptions",
        roles: ALL_PLAN,
        description: "Deviations, escalations, blocked work",
      },
      {
        id: "interventions",
        label: "Interventions",
        href: CROPFORT_ROUTES.interventions,
        roles: ALL_PLAN,
        description: "Tier 3 interventions",
      },
    ],
  },
  {
    id: "performance",
    label: "Performance",
    icon: BarChart3,
    href: CROPFORT_ROUTES.progress,
    roles: ALL_PLAN,
    modules: [
      {
        id: "progress",
        label: "Progress",
        href: CROPFORT_ROUTES.progress,
        description: "Operational progress",
      },
      {
        id: "programme-performance",
        label: "Programme Performance",
        href: "/cropfort/performance/programme",
        description: "Management performance overview",
      },
      {
        id: "variance",
        label: "Variance Analysis",
        href: "/cropfort/performance/variance",
        description: "Baseline vs plan vs actual vs forecast",
      },
      {
        id: "cost-management",
        label: "Cost Management",
        href: CROPFORT_ROUTES.budget,
        description: "Budget vs actual",
      },
      {
        id: "kpis",
        label: "KPIs",
        href: "/cropfort/performance/kpis",
        description: "Process and programme indicators",
      },
      {
        id: "reports",
        label: "Reports",
        href: CROPFORT_ROUTES.reports,
        description: "Monthly, six-month and annual reports",
      },
    ],
  },
  {
    id: "standards",
    label: "Standards & Rates",
    icon: WalletCards,
    href: CROPFORT_ROUTES.activityTaxonomy,
    roles: ALL_PLAN,
    modules: [
      {
        id: "taxonomy",
        label: "Activity Taxonomy",
        href: CROPFORT_ROUTES.activityTaxonomy,
        description: "Tier 1–3 activities and units",
      },
      {
        id: "benchmarks",
        label: "Benchmark Surveys",
        href: CROPFORT_ROUTES.benchmarkSurveys,
        roles: SPX,
        description: "Neighbor evidence for rates",
      },
      {
        id: "rate-cards",
        label: "Rate Cards",
        href: CROPFORT_ROUTES.rateCardProposals,
        description: "Approved unit rates",
      },
    ],
  },
  {
    id: "administration",
    label: "Administration",
    icon: Settings,
    href: CROPFORT_ROUTES.systemSettings,
    roles: ADMIN,
    modules: [
      {
        id: "farm-map",
        label: "Farm Map",
        href: CROPFORT_ROUTES.farmMap,
        description: "Estate map overview",
      },
      {
        id: "farm-areas",
        label: "Farm Areas",
        href: CROPFORT_ROUTES.farmAreas,
        description: "Farm areas register",
      },
      {
        id: "blocks",
        label: "Blocks",
        href: CROPFORT_ROUTES.blocks,
        description: "Block register",
      },
      {
        id: "organizations",
        label: "Organizations",
        href: CROPFORT_ROUTES.organizations,
        description: "Org map, asset owners, vendors",
      },
      {
        id: "programme-setup",
        label: "Programs",
        href: CROPFORT_ROUTES.programs,
        description: "Programme register",
      },
      {
        id: "spend-bands",
        label: "Spend Bands",
        href: CROPFORT_ROUTES.spendBands,
        description: "Schedule 3 plan / AFE spend bands",
      },
      {
        id: "access",
        label: "Access & Security",
        href: CROPFORT_ROUTES.users,
        description: "Users, roles, and Platform access desks (RB09)",
      },
      {
        id: "governance",
        label: "Governance",
        href: CROPFORT_ROUTES.auditTrail,
        description: "Audit history and archive",
      },
    ],
  },
];

/** Admin section groupings for Administration workspace landing content. */
export const ADMIN_SECTION_GROUPS = [
  {
    id: "farm-structure",
    label: "Farm Structure",
    items: [
      { label: "Farm Map", href: CROPFORT_ROUTES.farmMap, icon: Map },
      { label: "Farm Areas", href: CROPFORT_ROUTES.farmAreas, icon: Network },
      { label: "Blocks", href: CROPFORT_ROUTES.blocks, icon: FolderKanban },
    ],
  },
  {
    id: "organizations",
    label: "Organizations",
    items: [
      { label: "Organizations", href: CROPFORT_ROUTES.organizations, icon: Building2 },
      { label: "Asset Owners", href: CROPFORT_ROUTES.assetOwners, icon: Shield },
      { label: "Vendors", href: CROPFORT_ROUTES.vendors, icon: Library },
    ],
  },
  {
    id: "programme-setup",
    label: "Programs",
    items: [
      { label: "Programs", href: CROPFORT_ROUTES.programs, icon: Briefcase },
      { label: "Spend Bands", href: CROPFORT_ROUTES.spendBands, icon: Gauge },
      { label: "System configuration", href: CROPFORT_ROUTES.systemSettings, icon: Settings },
    ],
  },
  {
    id: "access",
    label: "Access & Security",
    items: [
      { label: "Users", href: CROPFORT_ROUTES.users, icon: Users },
      { label: "Roles", href: CROPFORT_ROUTES.userRoles, icon: Shield },
    ],
  },
  {
    id: "governance",
    label: "Governance",
    items: [
      { label: "Audit History", href: CROPFORT_ROUTES.auditTrail, icon: FileStack },
      { label: "Archive", href: CROPFORT_ROUTES.rateCardArchive, icon: Library },
      { label: "Platform Guide", href: CROPFORT_ROUTES.agreementLifecycle, icon: ListChecks },
    ],
  },
] as const;

function roleAllowed(
  roles: CropfortRole[] | "all" | undefined,
  role: CropfortRole,
): boolean {
  if (!roles || roles === "all") return true;
  return roles.includes(role);
}

export function getWorkspacesForRole(role: CropfortRole): CropfortWorkspace[] {
  return CROPFORT_WORKSPACES.filter((w) => roleAllowed(w.roles, role)).map((w) => {
    const modules = w.modules.filter((m) => roleAllowed(m.roles, role));
    return {
      ...w,
      modules,
      href: modules[0]?.href ?? w.href,
    };
  });
}

export function pathMatches(pathname: string, href: string, exact = false): boolean {
  if (pathname === href) return true;
  if (!exact && href !== "/" && pathname.startsWith(`${href}/`)) return true;
  return false;
}

/** Longest-prefix match so nested routes resolve to the right workspace/module. */
export function resolveWorkspaceFromPath(
  pathname: string,
  role: CropfortRole,
): { workspace: CropfortWorkspace | null; module: WorkspaceModule | null } {
  const workspaces = getWorkspacesForRole(role);
  let best: { workspace: CropfortWorkspace; module: WorkspaceModule | null; len: number } | null =
    null;

  for (const ws of workspaces) {
    if (pathMatches(pathname, ws.href, ws.id === "overview")) {
      const len = ws.href.length;
      if (!best || len > best.len) best = { workspace: ws, module: null, len };
    }
    for (const mod of ws.modules) {
      if (pathMatches(pathname, mod.href)) {
        const len = mod.href.length;
        if (!best || len > best.len) best = { workspace: ws, module: mod, len };
      }
    }
  }

  // Fallback aliases for legacy routes still in use
  const aliases: { prefix: string; workspaceId: WorkspaceId; moduleId?: string }[] = [
    { prefix: "/cropfort/planning/programmes", workspaceId: "planning", moduleId: "programme" },
    { prefix: "/cropfort/afp", workspaceId: "planning", moduleId: "programme" },
    { prefix: "/cropfort/afp-register", workspaceId: "control", moduleId: "approvals" },
    { prefix: "/cropfort/afe", workspaceId: "control", moduleId: "afe" },
    { prefix: "/cropfort/projects", workspaceId: "planning", moduleId: "projects" },
    { prefix: "/cropfort/farm-structure", workspaceId: "administration", moduleId: "farm-map" },
    { prefix: "/cropfort/admin/farm-map", workspaceId: "administration", moduleId: "farm-map" },
    { prefix: "/cropfort/admin/farm-areas", workspaceId: "administration", moduleId: "farm-areas" },
    { prefix: "/cropfort/admin/blocks", workspaceId: "administration", moduleId: "blocks" },
    { prefix: "/cropfort/admin/spend-bands", workspaceId: "administration", moduleId: "spend-bands" },
    { prefix: "/cropfort/admin/programs", workspaceId: "administration", moduleId: "programme-setup" },
    { prefix: "/cropfort/admin", workspaceId: "administration" },
    { prefix: "/cropfort/monthly-work-orders", workspaceId: "execution", moduleId: "work-orders" },
    { prefix: "/cropfort/equipment-machinery", workspaceId: "planning", moduleId: "resources" },
    { prefix: "/cropfort/materials-inventory", workspaceId: "planning", moduleId: "resources" },
    { prefix: "/cropfort/communications", workspaceId: "execution", moduleId: "communications" },
    { prefix: "/cropfort/programs", workspaceId: "administration", moduleId: "programme-setup" },
  ];

  for (const a of aliases) {
    if (pathMatches(pathname, a.prefix)) {
      const ws = workspaces.find((w) => w.id === a.workspaceId);
      if (!ws) continue;
      const mod = a.moduleId ? ws.modules.find((m) => m.id === a.moduleId) ?? null : null;
      const len = a.prefix.length;
      if (!best || len >= best.len) best = { workspace: ws, module: mod, len };
    }
  }

  return best
    ? { workspace: best.workspace, module: best.module }
    : { workspace: null, module: null };
}

export const WORKSPACE_MOBILE_ORDER: WorkspaceId[] = [
  "overview",
  "planning",
  "execution",
  "control",
  "performance",
];

/** Icons used by command palette / admin cards (kept for tree-shaking clarity). */
export const NAV_EXTRA_ICONS = {
  Activity,
  AlertTriangle,
  CalendarRange,
  ClipboardList,
  LineChart,
};
