"use client";

import { useState, useEffect } from "react";
import SideNav from "@/components/SideNav";
import MobileBottomNav from "@/components/MobileBottomNav";
import { useLocaleStore } from "@/store/localeStore";
import { t } from "@/lib/translations";
import { useAuthStore } from "@/store/authStore";
import { getDefaultViewForRole, ROLE_NAV_ACCESS } from "@/lib/roleNav";
import TopBar from "@/components/TopBar";
import { useIsMobile } from "@/hooks/use-mobile";
import UserManagementView from "@/components/UserManagementView";
import { FieldDashboardView } from "@/components/FieldOsViews";
import type { OsModuleId } from "@/lib/osModules";

const SIDEBAR_COLLAPSED_KEY = "coffee-field-sidebar-collapsed-v2";

type ViewId = OsModuleId;

const Index = () => {
  const user = useAuthStore((s) => s.user);
  const locale = useLocaleStore((s) => s.locale);
  const isMobile = useIsMobile();
  const defaultView = user ? getDefaultViewForRole(user.role) : "dashboard";
  const [activeView, setActiveView] = useState<ViewId>(defaultView as ViewId);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (isMobile) {
      setSidebarCollapsed(true);
      return;
    }
    try {
      const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      setSidebarCollapsed(saved === "1");
    } catch {
      setSidebarCollapsed(false);
    }
  }, [isMobile]);

  const title = t(locale, `page_${activeView}_title`);

  useEffect(() => {
    if (user) {
      setActiveView(getDefaultViewForRole(user.role) as ViewId);
    }
  }, [user?.role]);

  useEffect(() => {
    if (isMobile) return;
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, sidebarCollapsed ? "1" : "0");
    } catch {
      // storage may be unavailable
    }
  }, [sidebarCollapsed, isMobile]);

  useEffect(() => {
    if (!user) return;
    const allowed = ROLE_NAV_ACCESS[user.role] ?? [];
    if (allowed.length > 0 && !allowed.includes(activeView)) {
      setActiveView(getDefaultViewForRole(user.role) as ViewId);
    }
  }, [user, activeView]);

  const mainOffset = isMobile ? "ml-0" : sidebarCollapsed ? "ml-[4.5rem]" : "ml-64";

  return (
    <div className="min-h-[100dvh] bg-background">
      <SideNav
        activeView={activeView}
        onViewChange={(v) => setActiveView(v as ViewId)}
        userRole={user?.role}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((v) => !v)}
        isMobile={isMobile}
      />
      <main
        className={`min-h-[100dvh] bg-muted/30 transition-[margin] duration-200 ease-out ${mainOffset} ${
          isMobile ? "pb-[calc(4rem+env(safe-area-inset-bottom))]" : ""
        }`}
      >
        <TopBar
          title={title}
          onNavigate={(v) => setActiveView(v as ViewId)}
          onOpenMenu={isMobile ? () => setSidebarCollapsed(false) : undefined}
        />
        <div className="min-w-0">
          {activeView === "dashboard" && <FieldDashboardView />}
          {activeView === "users" && <UserManagementView />}
        </div>
      </main>
      {isMobile && (
        <MobileBottomNav
          activeView={activeView}
          onViewChange={(v) => setActiveView(v as ViewId)}
          onOpenMenu={() => setSidebarCollapsed(false)}
          userRole={user?.role}
        />
      )}
    </div>
  );
};

export default Index;
