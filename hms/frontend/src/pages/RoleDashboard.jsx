import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { useAuth } from "../context/AuthContext";
import { ROLE_LABELS, ROLE_NAV_ITEMS } from "../utils/roles";

const staffQuickActions = [
  {
    title: "Add Patient",
    description: "Create a new patient profile and capture intake details.",
    to: "/patients",
  },
  {
    title: "Book Appointment",
    description: "Schedule a visit and assign the patient to an available doctor.",
    to: "/appointments",
  },
  {
    title: "Generate Bill",
    description: "Create a billing record for consultation or follow-up charges.",
    to: "/billing",
  },
];

export default function RoleDashboard() {
  const { user } = useAuth();
  const role = user?.role || "admin";
  const roleLabel = ROLE_LABELS[role] || "User";
  const navItems = ROLE_NAV_ITEMS[role] || ROLE_NAV_ITEMS.admin;
  const homePath = navItems[0]?.to || "/admin";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            {roleLabel} Dashboard
          </h1>
          <p className="text-sm text-slate-500">
            Personalized workspace for {roleLabel.toLowerCase()}.
          </p>
        </div>
        <Button asChild className="bg-sky-600 hover:bg-sky-700">
          <Link to={homePath}>Refresh Workspace</Link>
        </Button>
      </div>

      {role === "staff" ? (
        <div className="grid gap-4 md:grid-cols-3">
          {staffQuickActions.map((item) => (
            <Card key={item.to}>
              <CardHeader>
                <CardTitle className="text-base">{item.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-slate-500">{item.description}</p>
                <Button asChild className="bg-sky-600 hover:bg-sky-700">
                  <Link to={item.to}>{item.title}</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.to}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Icon className="h-4 w-4 text-sky-600" />
                    {item.label}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-slate-500">
                    Open the {item.label.toLowerCase()} area available for your role.
                  </p>
                  <Button asChild variant="outline">
                    <Link to={item.to}>Open {item.label}</Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
