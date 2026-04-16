import {
  Activity,
  Bed,
  Calendar,
  CalendarClock,
  ClipboardList,
  DollarSign,
  LayoutDashboard,
  Microscope,
  Pill,
  Stethoscope,
  Users,
  Receipt,
  HeartPulse,
  Building2,
  UserCheck,
} from "lucide-react";

export const normalizeRole = (role) => role || "staff";

export const ROLE_LABELS = {
  admin: "Admin",
  staff: "Staff",
  doctor: "Doctor",
  nurse: "Nurse",
  receptionist: "Receptionist",
  billing: "Billing",
  lab_technician: "Lab Technician",
  pharmacist: "Pharmacist",
  patient: "Patient",
};

export const HOME_BY_ROLE = {
  admin: "/admin",
  staff: "/staff",
  doctor: "/doctor",
  nurse: "/nurse",
  receptionist: "/receptionist",
  billing: "/billing-team",
  lab_technician: "/lab-technician",
  pharmacist: "/pharmacist",
  patient: "/patient",
};

export const ROLE_OPTIONS = [
  "admin",
  "doctor",
  "nurse",
  "receptionist",
  "billing",
  "lab_technician",
  "pharmacist",
  "patient",
  "staff",
];

export const ROLE_ROUTE_SEGMENTS = {
  admin: "admin",
  staff: "staff",
  doctor: "doctor",
  nurse: "nurse",
  receptionist: "receptionist",
  billing: "billing-team",
  lab_technician: "lab-technician",
  pharmacist: "pharmacist",
  patient: "patient",
};

export const MODULE_ACCESS = {
  dashboard: ["admin", "nurse", "receptionist"],
  patients: ["admin", "staff", "doctor", "nurse", "receptionist", "billing", "lab_technician", "pharmacist"],
  doctors: ["admin", "doctor", "nurse", "receptionist", "patient"],
  appointments: ["admin", "staff", "doctor", "nurse", "receptionist", "patient"],
  billing: ["admin", "staff", "billing", "patient"],
  lab: ["admin", "doctor", "nurse", "lab_technician"],
  pharmacy: ["admin", "pharmacist"],
};

export const ROLE_NAV_ITEMS = {
  admin: [
    { to: "/admin", label: "Workspace", icon: LayoutDashboard },
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/patients", label: "Patients", icon: Users },
    { to: "/appointments", label: "Appointments", icon: CalendarClock },
    { to: "/billing", label: "Billing", icon: Receipt },
    { to: "/doctors", label: "Doctors", icon: Stethoscope },
    { to: "/departments", label: "Departments", icon: Building2 },
    { to: "/staff-management", label: "Staff", icon: UserCheck },
    { to: "/beds", label: "Beds", icon: Bed },
    { to: "/admissions", label: "Admissions", icon: UserCheck },
    { to: "/lab", label: "Lab", icon: Microscope },
    { to: "/pharmacy", label: "Pharmacy", icon: Pill },
    { to: "/activity-logs", label: "Activity Logs", icon: Activity },
  ],
  doctor: [
    { to: "/doctor", label: "Workspace", icon: LayoutDashboard },
    { to: "/patients", label: "Patients", icon: Users },
    { to: "/appointments", label: "Appointments", icon: CalendarClock },
    { to: "/doctors", label: "Doctors", icon: Stethoscope },
    { to: "/doctor-schedule", label: "Schedule & Fees", icon: Calendar },
    { to: "/lab", label: "Lab", icon: Microscope },
  ],
  staff: [
    { to: "/staff", label: "Workspace", icon: LayoutDashboard },
    { to: "/patients", label: "Patients", icon: Users },
    { to: "/appointments", label: "Appointments", icon: CalendarClock },
    { to: "/billing", label: "Billing", icon: Receipt },
  ],
  nurse: [
    { to: "/nurse", label: "Workspace", icon: LayoutDashboard },
    { to: "/patients", label: "Patients", icon: Users },
    { to: "/appointments", label: "Appointments", icon: CalendarClock },
    { to: "/lab", label: "Lab", icon: Microscope },
    { to: "/doctors", label: "Doctors", icon: Stethoscope },
  ],
  receptionist: [
    { to: "/receptionist", label: "Workspace", icon: LayoutDashboard },
    { to: "/patients", label: "Patients", icon: Users },
    { to: "/appointments", label: "Appointments", icon: CalendarClock },
    { to: "/doctors", label: "Doctors", icon: Stethoscope },
  ],
  billing: [
    { to: "/billing-team", label: "Workspace", icon: LayoutDashboard },
    { to: "/patients", label: "Patients", icon: Users },
    { to: "/billing", label: "Billing", icon: Receipt },
  ],
  lab_technician: [
    { to: "/lab-technician", label: "Workspace", icon: LayoutDashboard },
    { to: "/patients", label: "Patients", icon: Users },
    { to: "/lab", label: "Lab", icon: Microscope },
  ],
  pharmacist: [
    { to: "/pharmacist", label: "Workspace", icon: LayoutDashboard },
    { to: "/patients", label: "Patients", icon: Users },
    { to: "/pharmacy", label: "Pharmacy", icon: Pill },
  ],
  patient: [
    { to: "/patient", label: "Workspace", icon: LayoutDashboard },
    { to: "/doctors", label: "Doctors", icon: Stethoscope },
    { to: "/appointments", label: "Appointments", icon: CalendarClock },
    { to: "/billing", label: "Billing", icon: Receipt },
    { to: "/patient", label: "Care Summary", icon: HeartPulse },
  ],
};

export const NAV_ITEMS_BY_ROLE = ROLE_NAV_ITEMS;
