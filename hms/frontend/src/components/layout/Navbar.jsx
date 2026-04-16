import React from "react";
import PropTypes from "prop-types";
import { Bell, Menu, Moon, Search, Sun } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Avatar, AvatarFallback } from "../ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "../ui/dropdown-menu";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { ROLE_LABELS } from "../../utils/roles";

/**
 * Top navigation bar with search and profile.
 */
function Navbar({ onOpenSidebar = () => {} }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const roleLabel = ROLE_LABELS[user?.role] || "User";
  const userName = user?.name || "User";
  const userInitials = user?.name ? user.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : "U";

  return (
    <div> 
    <header className="flex flex-col gap-4 border-b border-slate-200 bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between dark:bg-slate-900 dark:border-slate-700">
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="lg:hidden"
          onClick={onOpenSidebar}
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div>
          <p className="text-lg font-semibold text-slate-900 dark:text-white">Hospital Management</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">{roleLabel} workspace</p>
        </div>
      </div>

      <div className="flex flex-1 items-center gap-3 sm:justify-end">
        <div className="relative w-full max-w-md min-w-0">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="search"
            className="pl-9 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
            placeholder="Search patients, doctors, appointments"
            aria-label="Search patients, doctors, appointments"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="hidden sm:inline-flex"
          onClick={toggleTheme}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun className="h-5 w-5 text-slate-600 dark:text-slate-300" /> : <Moon className="h-5 w-5 text-slate-600" />}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="hidden sm:inline-flex"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5 text-slate-600 dark:text-slate-300" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 px-2 py-1 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300">{userInitials}</AvatarFallback>
              </Avatar>
              <div className="hidden text-left sm:block">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{userName}</p>
                <p className="text-[11px] text-slate-400">{roleLabel}</p>
              </div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={logout}>
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
    </div>
  );
}

Navbar.propTypes = {
  onOpenSidebar: PropTypes.func,
};

Navbar.propTypes = {
  onOpenSidebar: PropTypes.func,
};

export default React.memo(Navbar);
