import { useAppAuth } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  Calendar,
  Users,
  LogOut,
  Clock,
  Settings,
  PanelLeft,
  Shield,
  FileText,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useIsMobile } from "@/hooks/useMobile";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import logoImg from "@/assets/logo.png";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Calendar, label: "Calendário", path: "/calendario" },
  { icon: Clock, label: "Agendamentos", path: "/agendamentos" },
  { icon: FileText, label: "Contratos", path: "/contratos", requiresAutoContract: true },
];

const adminMenuItems = [
  { icon: Users, label: "Usuários", path: "/usuarios" },
];

const SIDEBAR_WIDTH_KEY = "wedding-sidebar-width";
const DEFAULT_WIDTH = 260;
const MIN_WIDTH = 200;
const MAX_WIDTH = 400;

export default function WeddingLayout({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { user, loading } = useAppAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) return <DashboardLayoutSkeleton />;

  if (!user) {
    navigate("/login");
    return null;
  }

  return (
    <SidebarProvider
      style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}
    >
      <WeddingLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </WeddingLayoutContent>
    </SidebarProvider>
  );
}

function WeddingLayoutContent({
  children,
  setSidebarWidth,
}: {
  children: React.ReactNode;
  setSidebarWidth: (w: number) => void;
}) {
  const { user } = useAppAuth();
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => { window.location.href = "/login"; },
  });
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const isAdmin = user?.role === "admin";

  const activeLabel = [...menuItems, ...adminMenuItems].find(i => i.path === location)?.label ?? "Menu";
  const canAccessContracts = Boolean(user?.gerarContratoAutomaticamente);

  useEffect(() => {
    if (isCollapsed) setIsResizing(false);
  }, [isCollapsed]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const left = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const w = e.clientX - left;
      if (w >= MIN_WIDTH && w <= MAX_WIDTH) setSidebarWidth(w);
    };
    const onUp = () => setIsResizing(false);
    if (isResizing) {
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  const initials = user?.name
    ? user.name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()
    : "WM";

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar collapsible="icon" className="border-r border-border/60" disableTransition={isResizing}>
          {/* Header */}
          <SidebarHeader className="h-20 border-b border-border/40 px-1">
            <div className="flex items-center w-full gap-2">
              <button
                onClick={toggleSidebar}
                className="h-10 w-10 flex items-center justify-center rounded-lg hover:bg-accent transition-colors shrink-0"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>

              {!isCollapsed && (
                <div className="flex items-center min-w-0">
                  <img
                    src={logoImg}
                    alt="SGA App Logo"
                    className="h-20 w-auto object-contain"
                  />
                </div>
              )}
            </div>
          </SidebarHeader>

          {/* Navigation */}
          <SidebarContent className="gap-0 py-3">
            <SidebarMenu className="px-2 space-y-0.5">
              {menuItems.map(item => {
                const isActive = location === item.path || location.startsWith(item.path + "/");
                const isDisabled = Boolean(item.requiresAutoContract) && !canAccessContracts;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => {
                        if (isDisabled) return;
                        setLocation(item.path);
                      }}
                      tooltip={isDisabled ? "Ative a emissão automática de contrato no perfil" : item.label}
                      className="h-10 transition-all"
                      disabled={isDisabled}
                    >
                      <item.icon className={`h-4 w-4 ${isActive ? "text-primary" : ""}`} />
                      <span className={isActive ? "font-medium" : ""}>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>

            {isAdmin && (
              <>
                {!isCollapsed && (
                  <div className="px-4 py-2 mt-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Administração
                    </p>
                  </div>
                )}
                <SidebarMenu className="px-2 space-y-0.5">
                  {adminMenuItems.map(item => {
                    const isActive = location === item.path;
                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton
                          isActive={isActive}
                          onClick={() => setLocation(item.path)}
                          tooltip={item.label}
                          className="h-10 transition-all"
                        >
                          <item.icon className={`h-4 w-4 ${isActive ? "text-primary" : ""}`} />
                          <span className={isActive ? "font-medium" : ""}>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </>
            )}
          </SidebarContent>

          {/* Footer */}
          <SidebarFooter className="p-3 border-t border-border/40">
            {!isCollapsed && (
              <nav
                aria-label="Links legais"
                className="mb-1 flex items-center justify-center gap-3 px-2 text-[11px] text-muted-foreground"
              >
                <button
                  type="button"
                  onClick={() => setLocation("/politica-de-privacidade")}
                  className="transition-colors hover:text-foreground hover:underline"
                >
                  Privacidade
                </button>
                <span aria-hidden="true">•</span>
                <button
                  type="button"
                  onClick={() => setLocation("/termos-de-servico")}
                  className="transition-colors hover:text-foreground hover:underline"
                >
                  Termos
                </button>
              </nav>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-accent/60 transition-colors w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-8 w-8 shrink-0 border border-primary/20">
                    {user?.profilePhoto && (
                      <img src={user.profilePhoto} alt={user.name || "Usuário"} className="w-full h-full object-cover" />
                    )}
                    <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  {!isCollapsed && (
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium truncate leading-none">{user?.name || "Usuário"}</p>
                        {isAdmin && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 border-primary/30 text-primary">
                            Admin
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-1">{user?.email || ""}</p>
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setLocation("/perfil")}>
                  <Settings className="mr-2 h-4 w-4" />
                  Meu Perfil
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => logoutMutation.mutate()}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>

        {/* Resize handle */}
        {!isCollapsed && (
          <div
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors"
            style={{ zIndex: 50 }}
            onMouseDown={() => setIsResizing(true)}
          />
        )}
      </div>

      <SidebarInset>
        {/* Mobile header */}
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-4 backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="h-9 w-9 rounded-lg" />
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">{activeLabel}</span>
              </div>
            </div>
          </div>
        )}
        <main className="flex-1 p-4 sm:p-6 page-enter">{children}</main>
      </SidebarInset>
    </>
  );
}
