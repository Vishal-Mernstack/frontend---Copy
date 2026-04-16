import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, Microscope, Pill, Receipt, ShieldCheck, Stethoscope, UserRound, Users, HeartPulse } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { useAuth } from "../context/AuthContext";
import { HOME_BY_ROLE, ROLE_LABELS } from "../utils/roles";

const schema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const roleCards = [
  {
    key: "admin",
    title: "Admin Login",
    description: "Full hospital oversight, configuration, billing, and records control.",
    icon: ShieldCheck,
    accent: "bg-rose-50 text-rose-700 border-rose-200",
  },
  {
    key: "staff",
    title: "Staff Login",
    description: "Front office, patient records, appointments, and billing workflow access.",
    icon: Users,
    accent: "bg-sky-50 text-sky-700 border-sky-200",
  },
  {
    key: "doctor",
    title: "Doctor Login",
    description: "Consultation, appointment, and doctor workspace access.",
    icon: Stethoscope,
    accent: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    key: "nurse",
    title: "Nurse Login",
    description: "Patient care coordination, vitals workflow, and lab coordination.",
    icon: HeartPulse,
    accent: "bg-pink-50 text-pink-700 border-pink-200",
  },
  {
    key: "receptionist",
    title: "Receptionist Login",
    description: "Front desk registration, appointments, and patient intake.",
    icon: Users,
    accent: "bg-cyan-50 text-cyan-700 border-cyan-200",
  },
  {
    key: "billing",
    title: "Billing Login",
    description: "Invoices, collections, dues, and payment processing.",
    icon: Receipt,
    accent: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    key: "lab_technician",
    title: "Lab Technician Login",
    description: "Lab order processing, results entry, and report management.",
    icon: Microscope,
    accent: "bg-violet-50 text-violet-700 border-violet-200",
  },
  {
    key: "pharmacist",
    title: "Pharmacist Login",
    description: "Medicine inventory, dispensing, and stock control.",
    icon: Pill,
    accent: "bg-lime-50 text-lime-700 border-lime-200",
  },
  {
    key: "patient",
    title: "Patient Login",
    description: "Appointments, doctor directory, billing visibility, and care summary.",
    icon: UserRound,
    accent: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
];

export default function RoleBasedLogin() {
  const navigate = useNavigate();
  const { isAuthenticated, user, login } = useAuth();
  const [selectedRole, setSelectedRole] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState("");

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const selectedRoleMeta = useMemo(
    () => roleCards.find((role) => role.key === selectedRole) || null,
    [selectedRole]
  );

  if (isAuthenticated) {
    return <Navigate to={HOME_BY_ROLE[user?.role] || "/"} replace />;
  }

  const handleSubmit = async (values) => {
    setApiError("");
    const result = await login({ ...values, expectedRole: selectedRole });
    if (result?.success) {
      navigate(HOME_BY_ROLE[selectedRole] || "/");
    } else {
      setApiError(result?.message || "Login failed");
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_35%),linear-gradient(135deg,#eff6ff,#f8fafc_45%,#e2e8f0)] px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-700">
              Medicare HMS
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">
              Role Based Login
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Choose your hospital role first, then sign in with the account assigned to that role.
            </p>
</div>
        </div>

        {!selectedRole ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {roleCards.map((role) => {
              const Icon = role.icon;
              return (
                <button
                  key={role.key}
                  type="button"
                  onClick={() => setSelectedRole(role.key)}
                  className={`rounded-2xl border p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${role.accent}`}
                >
                  <div className="flex items-center justify-between">
                    <Icon className="h-8 w-8" />
                    <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
                      {ROLE_LABELS[role.key]}
                    </span>
                  </div>
                  <h2 className="mt-6 text-xl font-semibold">{role.title}</h2>
                  <p className="mt-2 text-sm leading-6 opacity-90">{role.description}</p>
                  <div className="mt-6 text-sm font-semibold">Continue</div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.9fr]">
            <div className={`rounded-3xl border p-8 shadow-sm ${selectedRoleMeta?.accent || "bg-white text-slate-900 border-slate-200"}`}>
              <button
                type="button"
                className="inline-flex items-center gap-2 text-sm font-medium"
                onClick={() => {
                  setSelectedRole("");
                  setApiError("");
                  form.reset();
                }}
              >
                <ArrowLeft className="h-4 w-4" />
                Change role
              </button>
              <div className="mt-8">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] opacity-80">
                  Selected Role
                </p>
                <h2 className="mt-3 text-3xl font-semibold">
                  {selectedRoleMeta?.title}
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-6 opacity-90 text-current">
                  {selectedRoleMeta?.description}
                </p>
              </div>
              <div className="mt-10 rounded-2xl border border-white/40 bg-white/60 p-5 text-sm text-slate-700">
                <p className="font-semibold text-slate-900">How this works</p>
                <p className="mt-2">
                  The selected role must match the account role stored in the hospital system.
                </p>
                <p className="mt-2">
                  If you choose the wrong role for an account, login will be rejected.
                </p>
              </div>
            </div>

            <Card className="border-slate-200 bg-white/95 shadow-lg backdrop-blur">
              <CardHeader>
                <CardTitle>
                  {ROLE_LABELS[selectedRole]} Sign In
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form className="grid gap-4" onSubmit={form.handleSubmit(handleSubmit)}>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-slate-700">Email</label>
                    <Input type="email" placeholder="you@example.com" {...form.register("email")} />
                    {form.formState.errors.email ? (
                      <p className="text-xs text-rose-500">{form.formState.errors.email.message}</p>
                    ) : null}
                  </div>

                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-slate-700">Password</label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        {...form.register("password")}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                        onClick={() => setShowPassword((prev) => !prev)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {form.formState.errors.password ? (
                      <p className="text-xs text-rose-500">{form.formState.errors.password.message}</p>
                    ) : null}
                  </div>

                  {apiError ? (
                    <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
                      {apiError}
                    </div>
                  ) : null}

                  <Button
                    type="submit"
                    className="w-full bg-sky-600 hover:bg-sky-700"
                    disabled={form.formState.isSubmitting}
                  >
                    {form.formState.isSubmitting
                      ? "Signing in..."
                      : `Sign In as ${ROLE_LABELS[selectedRole]}`}
                  </Button>
                </form>

                <div className="mt-6 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                  <p className="font-medium text-slate-800">Available demo accounts</p>
                  <p className="mt-2">Admin: admin@medicare.com / Admin@123</p>
                  <p>Staff: staff@medicare.com / Admin@123</p>
                  <p>Doctor: doctor@medicare.com / Admin@123</p>
                  <p>Nurse: nurse@medicare.com / Admin@123</p>
                  <p>Receptionist: receptionist@medicare.com / Admin@123</p>
                  <p>Billing: billing@medicare.com / Admin@123</p>
                  <p>Lab Technician: labtech@medicare.com / Admin@123</p>
                  <p>Pharmacist: pharmacist@medicare.com / Admin@123</p>
                  <p>Patient: patient@medicare.com / Admin@123</p>
                </div>

                <p className="mt-6 text-center text-sm text-slate-600">
                  Need a new account?{" "}
                  <Link to="/register" className="text-sky-600 hover:underline">
                    Create one here
                  </Link>
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
