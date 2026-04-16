import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Stethoscope } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { useAuth } from "../context/AuthContext";
import { HOME_BY_ROLE } from "../utils/roles";

const schema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function Login() {
  const navigate = useNavigate();
  const { isAuthenticated, user, login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState("");

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  if (isAuthenticated) {
    return <Navigate to={HOME_BY_ROLE[user?.role] || "/"} replace />;
  }

  const onSubmit = async (values) => {
    setApiError("");
    const result = await login(values);
    if (result?.success) {
      navigate(HOME_BY_ROLE[result.user?.role] || "/");
    } else {
      setApiError(result?.message || "Login failed");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-gradient-to-br from-sky-600 to-blue-700 p-10 text-white lg:flex">
        <div className="flex items-center gap-3 text-2xl font-semibold">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-sky-600">
            <Stethoscope className="h-6 w-6" />
          </div>
          Medicare HMS
        </div>
        <div>
          <h2 className="text-3xl font-semibold">Hospital Management System</h2>
          <p className="mt-2 text-sm text-white/80">
            Manage patients, doctors, appointments, and billing in one place.
          </p>
          <ul className="mt-6 space-y-2 text-sm">
            <li>? Patient Management</li>
            <li>? Doctor Scheduling</li>
            <li>? Appointment Booking</li>
            <li>? Billing & Invoicing</li>
          </ul>
        </div>
        <p className="text-xs text-white/70">Secure & reliable for daily operations.</p>
      </div>

      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-slate-900">Welcome Back</h1>
            <p className="text-sm text-slate-500">Sign in to your account</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Email</label>
              <Input
                type="email"
                placeholder="you@example.com"
                {...form.register("email")}
              />
              {form.formState.errors.email ? (
                <p className="mt-1 text-xs text-rose-500">
                  {form.formState.errors.email.message}
                </p>
              ) : null}
            </div>

            <div>
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
                <p className="mt-1 text-xs text-rose-500">
                  {form.formState.errors.password.message}
                </p>
              ) : null}
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-slate-600">
                <input type="checkbox" className="rounded border-slate-300" />
                Remember me
              </label>
              <Link to="/register" className="text-sky-600 hover:underline">
                Forgot password?
              </Link>
            </div>

            {apiError ? (
              <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
                {apiError}
              </div>
            ) : null}

            <Button
              type="button"
              className="w-full bg-sky-600 hover:bg-sky-700"
              onClick={form.handleSubmit(onSubmit)}
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? "Signing in..." : "Sign In"}
            </Button>

            <Button asChild type="button" variant="outline" className="w-full">
              <Link to="/role-based-login">Role Based Login</Link>
            </Button>

            <div className="rounded-lg bg-sky-50 p-3 text-sm text-slate-600">
              <p className="font-medium text-slate-700">Demo Credentials</p>
              <p>Email: admin@medicare.com</p>
              <p>Password: Admin@123</p>
            </div>

            <p className="text-center text-sm text-slate-600">
              Don&apos;t have an account?{" "}
              <Link to="/register" className="text-sky-600 hover:underline">
                Create one here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
