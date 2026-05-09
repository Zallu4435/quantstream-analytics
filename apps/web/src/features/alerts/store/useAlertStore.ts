import { create } from "zustand";
import type { AlertWithMeta } from "@/shared/types";

interface AlertStore {
  alerts: AlertWithMeta[];
  unreadCount: number;

  addAlert: (alert: AlertWithMeta) => void;
  markAsRead: (id: string) => void;
  markAllRead: () => void;
  clearAlerts: () => void;
}

const MAX_ALERTS = 100;

export const useAlertStore = create<AlertStore>((set) => ({
  alerts: [],
  unreadCount: 0,

  addAlert: (alert) =>
    set((state) => {
      const updated = [alert, ...state.alerts].slice(0, MAX_ALERTS);
      return {
        alerts: updated,
        unreadCount: updated.filter((a) => !a.read).length,
      };
    }),

  markAsRead: (id) =>
    set((state) => {
      const updated = state.alerts.map((a) =>
        a.id === id ? { ...a, read: true } : a
      );
      return {
        alerts: updated,
        unreadCount: updated.filter((a) => !a.read).length,
      };
    }),

  markAllRead: () =>
    set((state) => ({
      alerts: state.alerts.map((a) => ({ ...a, read: true })),
      unreadCount: 0,
    })),

  clearAlerts: () =>
    set({ alerts: [], unreadCount: 0 }),
}));
