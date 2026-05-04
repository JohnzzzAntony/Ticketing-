'use client';

import { useEffect, type ReactNode } from "react";
import { useAppStore, type ViewType } from "./store";
import { useTheme } from "next-themes";
import { NotificationBell } from "./notification-bell";
import { DashboardView } from "./dashboard-view";
import { TicketsView } from "./tickets-view";
import { TicketDetail } from "./ticket-detail";
import { AdminView } from "./admin-view";
import { KnowledgeBaseView } from "./knowledge-base-view";
import { NotificationsView } from "./notifications-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard,
  Ticket,
  BookOpen,
  Settings,
  Search,
  Menu,
  Moon,
  Sun,
  LogOut,
  User,
  Headphones,
} from "lucide-react";

interface SidebarItem {
  label: string;
  icon: ReactNode;
  view: ViewType;
  roles?: string[]; // If undefined, available to all roles
}

const sidebarItems: SidebarItem[] = [
  {
    label: "Dashboard",
    icon: <LayoutDashboard className="h-4 w-4" />,
    view: "dashboard",
  },
  {
    label: "Tickets",
    icon: <Ticket className="h-4 w-4" />,
    view: "tickets",
  },
  {
    label: "Knowledge Base",
    icon: <BookOpen className="h-4 w-4" />,
    view: "knowledge-base",
  },
  {
    label: "Admin",
    icon: <Settings className="h-4 w-4" />,
    view: "admin",
    roles: ["ADMIN", "AGENT"],
  },
];

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getRoleBadgeColor(role: string): string {
  switch (role) {
    case "ADMIN":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
    case "AGENT":
      return "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400";
    default:
      return "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400";
  }
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const currentView = useAppStore((s) => s.currentView);
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const user = useAppStore((s) => s.user);

  const handleNavigate = (view: ViewType) => {
    setCurrentView(view);
    onNavigate?.();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Company Branding */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-border/50">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-600 text-white shrink-0">
          <Headphones className="w-4 h-4" />
        </div>
        <span className="font-bold text-base tracking-tight text-foreground">HelpDesk</span>
      </div>

      {/* Navigation Items */}
      <ScrollArea className="flex-1 px-2 py-2">
        <nav className="flex flex-col gap-0.5">
          {sidebarItems.map((item) => {
            // Check role access
            if (item.roles && user && !item.roles.includes(user.role)) {
              return null;
            }

            const isActive = currentView === item.view;

            return (
              <button
                key={item.view}
                onClick={() => handleNavigate(item.view)}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors w-full text-left ${
                  isActive
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <span className={isActive ? "text-emerald-600 dark:text-emerald-400" : ""}>
                  {item.icon}
                </span>
                {item.label}
              </button>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Sidebar Footer - User Info */}
      {user && (
        <div className="border-t border-border/50 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-foreground">{user.name}</p>
              <Badge
                variant="secondary"
                className={`text-[10px] px-1.5 py-0 h-4 ${getRoleBadgeColor(user.role)}`}
              >
                {user.role}
              </Badge>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9 shrink-0"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}

function ViewRouter() {
  const currentView = useAppStore((s) => s.currentView);

  switch (currentView) {
    case "dashboard":
      return <DashboardView />;
    case "tickets":
      return <TicketsView />;
    case "ticket-detail":
      return <TicketDetail />;
    case "admin":
      return <AdminView />;
    case "knowledge-base":
      return <KnowledgeBaseView />;
    case "notifications":
      return <NotificationsView />;
    default:
      return <DashboardView />;
  }
}

export function AppLayout({ children }: { children?: ReactNode }) {
  const isMobileSidebarOpen = useAppStore((s) => s.isMobileSidebarOpen);
  const setIsMobileSidebarOpen = useAppStore((s) => s.setIsMobileSidebarOpen);
  const searchQuery = useAppStore((s) => s.searchQuery);
  const setSearchQuery = useAppStore((s) => s.setSearchQuery);
  const user = useAppStore((s) => s.user);
  const logout = useAppStore((s) => s.logout);
  const setCurrentView = useAppStore((s) => s.setCurrentView);

  // Close mobile sidebar on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileSidebarOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [setIsMobileSidebarOpen]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/signout", { method: "POST" });
    } catch {
      // Proceed with local logout even if API fails
    }
    logout();
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex flex-1">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex lg:w-60 lg:flex-col lg:border-r border-border/50 bg-card/50 backdrop-blur-sm shrink-0">
          <SidebarContent />
        </aside>

        {/* Mobile Sidebar (Sheet/Drawer) */}
        <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
          <SheetContent side="left" className="w-60 p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation</SheetTitle>
            </SheetHeader>
            <SidebarContent onNavigate={() => setIsMobileSidebarOpen(false)} />
          </SheetContent>
        </Sheet>

        {/* Main Content Area */}
        <div className="flex flex-1 flex-col min-w-0">
          {/* Header */}
          <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border/50 bg-background/80 backdrop-blur-md px-4">
            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-9 w-9 shrink-0"
              onClick={() => setIsMobileSidebarOpen(true)}
            >
              <Menu className="h-4 w-4" />
              <span className="sr-only">Toggle sidebar</span>
            </Button>

            {/* Search Bar */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search tickets, articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 bg-muted/50 border-transparent focus:border-border focus:bg-background"
              />
            </div>

            {/* Right side actions */}
            <div className="flex items-center gap-1 ml-auto shrink-0">
              <NotificationBell />
              <ThemeToggle />

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 h-9 px-2 ml-1">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        {user ? getInitials(user.name) : "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:inline text-sm font-medium max-w-[100px] truncate text-foreground">
                      {user?.name}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-medium">{user?.name}</p>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                      {user?.role && (
                        <Badge
                          variant="secondary"
                          className={`text-[10px] px-1.5 py-0 h-4 w-fit ${getRoleBadgeColor(user.role)}`}
                        >
                          {user.role}
                        </Badge>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setCurrentView("dashboard")}>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-auto">
            <ViewRouter />
          </main>

          {/* Footer */}
          <footer className="border-t border-border/50 bg-muted/30 px-4 py-3 mt-auto">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>HelpDesk Ticketing System</span>
              <span>&copy; {new Date().getFullYear()}</span>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
