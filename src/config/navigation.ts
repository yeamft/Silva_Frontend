import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Layers3,
  Network,
  Settings,
  Users,
  WalletCards,
} from "lucide-react";
import type { CropfortRole } from "@/types/cropfort";

export type NavItemId =
  | "dashboard"
  | "field-tickets"
  | "weekly-submissions"
  | "blocks-activities"
  | "rate-card"
  | "afp"
  | "validation-queue"
  | "afe"
  | "audit-trail"
  | "reports"
  | "users"
  | "farm-map"
  | "programs"
  | "tenant-config"
  | "activity-templates"
  | "system-settings";

export interface NavChild {
  id: string;
  label: string;
  href: string;
  /** If set, only these roles see the child link. */
  roles?: CropfortRole[] | "all";
}

export interface NavItem {
  id: NavItemId;
  label: string;
  href: string;
  icon: LucideIcon;
  /** Roles that can see this item. Empty = all authenticated. */
  roles: CropfortRole[] | "all";
  /** Nested links shown in a sidebar dropdown under this item. */
  children?: NavChild[];
}

/** Canonical route map for Cropfort shell. */
export const CROPFORT_ROUTES = {
  dashboard: "/cropfort/dashboard",
  profile: "/cropfort/profile",
  fieldTickets: "/cropfort/field-tickets",
  weeklySubmissions: "/cropfort/weekly-submissions",
  blocksActivities: "/cropfort/blocks-activities",
  rateCard: "/cropfort/rate-card",
  rateCardCategories: "/cropfort/rate-card/categories",
  rateCardArchive: "/cropfort/rate-card/archive",
  afp: "/cropfort/afp",
  validationQueue: "/cropfort/validation-queue",
  afe: "/cropfort/afe",
  auditTrail: "/cropfort/audit-trail",
  reports: "/cropfort/reports",
  users: "/cropfort/users",
  userRoles: "/cropfort/users/roles",
  farmMap: "/cropfort/admin/farm-map",
  organizations: "/cropfort/admin/organizations",
  farmAreas: "/cropfort/admin/farm-areas",
  blocks: "/cropfort/admin/blocks",
  vendors: "/cropfort/admin/vendors",
  assetOwners: "/cropfort/admin/asset-owners",
  programs: "/cropfort/admin/programs",
  tenantConfig: "/cropfort/tenant-config",
  activityTemplates: "/cropfort/activity-templates",
  systemSettings: "/cropfort/system-settings",
  sessions: "/cropfort/sessions",
} as const;

/**
 * Role → menu matrix.
 * Only shipped (non-placeholder) pages appear here for now.
 * Profile settings live in the account menu, not the sidebar.
 */
export const NAVIGATION_ITEMS: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: CROPFORT_ROUTES.dashboard,
    icon: LayoutDashboard,
    roles: "all",
  },
  {
    id: "rate-card",
    label: "Rate Card",
    href: CROPFORT_ROUTES.rateCard,
    icon: WalletCards,
    roles: ["spx_validator", "farm_owner", "spx_platform_admin"],
    children: [
      { id: "rate-card-rates", label: "Rates", href: CROPFORT_ROUTES.rateCard },
      {
        id: "rate-card-archive",
        label: "Archive",
        href: CROPFORT_ROUTES.rateCardArchive,
      },
      {
        id: "rate-card-categories",
        label: "Categories",
        href: CROPFORT_ROUTES.rateCardCategories,
        roles: ["spx_validator", "spx_platform_admin"],
      },
    ],
  },
  {
    id: "users",
    label: "User Management",
    href: CROPFORT_ROUTES.users,
    icon: Users,
    roles: ["spx_platform_admin"],
    children: [
      { id: "users-list", label: "Users", href: CROPFORT_ROUTES.users },
      { id: "users-roles", label: "Roles", href: CROPFORT_ROUTES.userRoles },
    ],
  },
  {
    id: "programs",
    label: "Programs",
    href: CROPFORT_ROUTES.programs,
    icon: Layers3,
    roles: ["spx_platform_admin"],
  },
  {
    id: "farm-map",
    label: "Farm Map",
    href: CROPFORT_ROUTES.farmMap,
    icon: Network,
    roles: ["spx_platform_admin", "spx_validator"],
    children: [
      { id: "farm-map-overview", label: "Overview", href: CROPFORT_ROUTES.farmMap },
      { id: "farm-map-orgs", label: "Organizations", href: CROPFORT_ROUTES.organizations },
      { id: "farm-map-areas", label: "Farm areas", href: CROPFORT_ROUTES.farmAreas },
      { id: "farm-map-blocks", label: "Blocks", href: CROPFORT_ROUTES.blocks },
      { id: "farm-map-vendors", label: "Vendors", href: CROPFORT_ROUTES.vendors },
      { id: "farm-map-owners", label: "Asset owners", href: CROPFORT_ROUTES.assetOwners },
    ],
  },
];

export function getNavItemsForRole(role: CropfortRole): NavItem[] {
  return NAVIGATION_ITEMS.filter(
    (item) => item.roles === "all" || item.roles.includes(role),
  ).map((item) => {
    if (!item.children?.length) return item;
    const children = item.children.filter(
      (child) => !child.roles || child.roles === "all" || child.roles.includes(role),
    );
    if (children.length <= 1 && (!children[0] || children[0].href === item.href)) {
      return { ...item, children: undefined };
    }
    return { ...item, children };
  });
}

/** Bottom bar shortcuts — only top-level shipped pages. */
export const MOBILE_PRIMARY_NAV: Record<CropfortRole, NavItemId[]> = {
  field_supervisor: ["dashboard"],
  bagro_office: ["dashboard"],
  spx_validator: ["dashboard", "rate-card", "farm-map"],
  farm_owner: ["dashboard", "rate-card"],
  spx_platform_admin: ["dashboard", "users", "programs", "farm-map", "rate-card"],
};

export function getMobileNavItemsForRole(role: CropfortRole): NavItem[] {
  const allowed = getNavItemsForRole(role);
  const byId = new Map(allowed.map((item) => [item.id, item]));
  return MOBILE_PRIMARY_NAV[role]
    .map((id) => byId.get(id))
    .filter((item): item is NavItem => Boolean(item));
}

/** Settings icon reserved for system settings / profile affinity. */
export const SETTINGS_ICON = Settings;
