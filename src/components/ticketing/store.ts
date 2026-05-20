import { create } from "zustand";

export type ViewType =
  | "dashboard"
  | "tickets"
  | "ticket-detail"
  | "admin"
  | "knowledge-base"
  | "notifications";

export type AdminTab =
  | "categories"
  | "departments"
  | "users"
  | "sla"
  | "approvals"
  | "audit-logs";

interface AppState {
  // Navigation
  currentView: ViewType;
  selectedTicketId: string | null;
  adminTab: AdminTab;

  // Auth
  isAuthenticated: boolean;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    departmentId: string | null;
    departmentName: string | null;
  } | null;

  // UI State
  isCreateTicketOpen: boolean;
  isMobileSidebarOpen: boolean;
  searchQuery: string;

  // Actions
  setCurrentView: (view: ViewType) => void;
  setSelectedTicketId: (id: string | null) => void;
  setAdminTab: (tab: AdminTab) => void;
  setUser: (user: AppState["user"]) => void;
  setIsAuthenticated: (val: boolean) => void;
  setIsCreateTicketOpen: (val: boolean) => void;
  setIsMobileSidebarOpen: (val: boolean) => void;
  setSearchQuery: (query: string) => void;
  logout: () => void;
  navigateToTicket: (ticketId: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentView: "dashboard",
  selectedTicketId: null,
  adminTab: "categories",
  isAuthenticated: false,
  user: null,
  isCreateTicketOpen: false,
  isMobileSidebarOpen: false,
  searchQuery: "",

  setCurrentView: (view) => set({ currentView: view, selectedTicketId: view !== "ticket-detail" ? null : undefined }),
  setSelectedTicketId: (id) => set({ selectedTicketId: id }),
  setAdminTab: (tab) => set({ adminTab: tab }),
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setIsAuthenticated: (val) => set({ isAuthenticated: val }),
  setIsCreateTicketOpen: (val) => set({ isCreateTicketOpen: val }),
  setIsMobileSidebarOpen: (val) => set({ isMobileSidebarOpen: val }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  logout: () => set({ user: null, isAuthenticated: false, currentView: "dashboard", selectedTicketId: null }),
  navigateToTicket: (ticketId) => set({ selectedTicketId: ticketId, currentView: "ticket-detail" }),
}));
