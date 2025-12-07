import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useEffect, useRef } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { VendorSidebar } from "@/components/VendorSidebar";
import { Button } from "@/components/ui/button";
import { Moon, Sun, LogOut } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

interface VendorDashboardProps {
  children: React.ReactNode;
}

export function VendorDashboard({ children }: VendorDashboardProps) {
  const { user, isVendor, isLoading, logout, isLoggingOut } = useAuth();
  const [, setLocation] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = rootRef.current;
    let tooltipEl: HTMLDivElement | null = null;
    let showTimer: number | null = null;
    let currentTarget: HTMLElement | null = null;
    const createTooltip = () => {
      if (tooltipEl) return tooltipEl;
      tooltipEl = document.createElement("div");
      tooltipEl.className = "vendor-tooltip";
      tooltipEl.setAttribute("role", "tooltip");
      tooltipEl.id = "vendor-tooltip";
      tooltipEl.setAttribute("data-visible", "false");
      document.body.appendChild(tooltipEl);
      return tooltipEl;
    };
    const getText = (el: HTMLElement) => {
      const s = el.getAttribute("data-tooltip") || el.getAttribute("aria-label") || el.getAttribute("title") || "";
      return s.trim();
    };
    const positionTooltip = (el: HTMLElement) => {
      if (!tooltipEl) return;
      const rect = el.getBoundingClientRect();
      const tw = Math.min(tooltipEl.offsetWidth || 280, 280);
      const th = tooltipEl.offsetHeight || 32;
      const margin = 8;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let top = rect.top - th - margin;
      let left = rect.left + rect.width / 2 - tw / 2;
      if (top < 8) top = rect.bottom + margin;
      if (left < 8) left = 8;
      if (left + tw > vw - 8) left = vw - tw - 8;
      if (top + th > vh - 8) top = Math.max(8, vh - th - 8);
      tooltipEl.style.top = `${Math.round(top)}px`;
      tooltipEl.style.left = `${Math.round(left)}px`;
    };
    const clearTimer = () => {
      if (showTimer) { window.clearTimeout(showTimer); showTimer = null; }
    };
    const hideTooltip = () => {
      clearTimer();
      if (!tooltipEl) return;
      tooltipEl.setAttribute("data-visible", "false");
      if (currentTarget) currentTarget.removeAttribute("aria-describedby");
      currentTarget = null;
    };
    const showTooltip = (el: HTMLElement) => {
      const text = getText(el);
      if (!text) return;
      const tip = createTooltip();
      tip.textContent = text;
      positionTooltip(el);
      tip.setAttribute("data-visible", "true");
      el.setAttribute("aria-describedby", tip.id);
      currentTarget = el;
    };
    const onEnter = (e: Event) => {
      const el = e.target as HTMLElement;
      const actionable = el?.closest("a, button, [role='button']") as HTMLElement | null;
      if (!actionable || !getText(actionable)) return;
      clearTimer();
      showTimer = window.setTimeout(() => showTooltip(actionable), 300);
    };
    const onLeave = () => hideTooltip();
    const onScrollOrResize = () => { if (currentTarget) positionTooltip(currentTarget); };
    const onTouchStart = (e: TouchEvent) => {
      const el = (e.target as HTMLElement)?.closest("a, button, [role='button']") as HTMLElement | null;
      if (!el || !getText(el)) return;
      clearTimer();
      showTimer = window.setTimeout(() => showTooltip(el), 300);
    };
    const onTouchEnd = () => { window.setTimeout(hideTooltip, 1200); };

    if (container) {
      container.addEventListener("mouseover", onEnter as any);
      container.addEventListener("focusin", onEnter as any);
      container.addEventListener("mouseout", onLeave as any);
      container.addEventListener("focusout", onLeave as any);
      container.addEventListener("touchstart", onTouchStart, { passive: true });
      container.addEventListener("touchend", onTouchEnd, { passive: true });
    }
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      if (container) {
        container.removeEventListener("mouseover", onEnter as any);
        container.removeEventListener("focusin", onEnter as any);
        container.removeEventListener("mouseout", onLeave as any);
        container.removeEventListener("focusout", onLeave as any);
        container.removeEventListener("touchstart", onTouchStart);
        container.removeEventListener("touchend", onTouchEnd);
      }
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
      if (tooltipEl && tooltipEl.parentNode) tooltipEl.parentNode.removeChild(tooltipEl);
      tooltipEl = null;
    };
  }, []);

  useEffect(() => {
    if (!isLoading && !isVendor) {
      setLocation("/");
    }
  }, [isVendor, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isVendor) {
    return null;
  }

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full" ref={rootRef}>
        <VendorSidebar />
        <div className="flex flex-col flex-1">
          <header className="flex items-center justify-between p-4 border-b bg-background">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                data-testid="button-theme-toggle"
                aria-label="Toggle theme"
                data-tooltip="Toggle between light and dark mode"
              >
                {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </Button>
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
