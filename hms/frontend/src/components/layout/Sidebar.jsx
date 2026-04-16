import React from "react";
import PropTypes from "prop-types";
import { NavLink } from "react-router-dom";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { useAuth } from "../../context/AuthContext";
import { ROLE_NAV_ITEMS } from "../../utils/roles";

/**
 * Sidebar navigation with mobile overlay.
 */
function Sidebar({ open = false, onClose = () => {} }) {
  const { user } = useAuth();
  const role = user?.role || "admin";
  const navItems = ROLE_NAV_ITEMS[role] || ROLE_NAV_ITEMS.admin;

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-slate-900/40 transition-opacity lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
      />
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-full w-64 border-r border-slate-200 bg-white p-5 transition-transform lg:static lg:translate-x-0 dark:bg-slate-900 dark:border-slate-700",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-600 text-white">
              M
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Medicare HMS</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Hospital Dashboard</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="mt-8 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                    isActive
                      ? "bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  )
                }
                end={item.to === "/"}
                onClick={onClose}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="mt-10 rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-400">
          <p className="font-semibold">System Status</p>
          <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-500">All services operational</p>
        </div>
      </aside>
    </>
  );
}

Sidebar.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
};

Sidebar.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
};

export default React.memo(Sidebar);
