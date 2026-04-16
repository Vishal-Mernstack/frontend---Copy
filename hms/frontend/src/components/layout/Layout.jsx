import React, { useCallback, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

function Breadcrumbs({ pathname = "/" }) {
  const segments = pathname.split("/").filter(Boolean);
  const crumbs = [
    { label: "Dashboard", path: "/" },
    ...segments.map((segment, index) => ({
      label: segment.replace(/-/g, " "),
      path: `/${segments.slice(0, index + 1).join("/")}`,
    })),
  ];

  return (
    <nav className="mb-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
      {crumbs.map((crumb, index) => (
        <span key={crumb.path} className="flex items-center gap-2">
          <Link className="capitalize hover:text-slate-700" to={crumb.path}>
            {crumb.label}
          </Link>
          {index < crumbs.length - 1 && <span>/</span>}
        </span>
      ))}
    </nav>
  );
}

Breadcrumbs.propTypes = {
  pathname: PropTypes.string,
};

/**
 * App shell with sidebar and navbar.
 */
function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const openSidebar = useCallback(() => setSidebarOpen(true), []);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === "Escape") {
        setSidebarOpen(false);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get("redirect");
    if (redirect) {
      navigate(redirect, { replace: true });
    }
  }, [navigate]);

  const contentKey = useMemo(() => location.pathname, [location.pathname]);
  const homePath = "/admin";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex h-screen overflow-hidden">
        <Sidebar open={sidebarOpen} onClose={closeSidebar} />
        <div className="flex min-h-screen flex-1 flex-col">
          <Navbar onOpenSidebar={openSidebar} />
          <main className="flex-1 overflow-y-auto p-6">
            <Breadcrumbs pathname={location.pathname} />
            <div key={contentKey} className="animate-in fade-in">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default React.memo(Layout);
