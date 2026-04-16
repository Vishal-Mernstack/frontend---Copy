import React, { Suspense } from "react";
import PropTypes from "prop-types";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "../components/layout/Layout";
import LoadingSkeleton from "../components/shared/LoadingSkeleton";
import ErrorBoundary from "../components/shared/ErrorBoundary";
import { useAuth } from "../context/AuthContext";
import ProtectedRoute from "./ProtectedRoute";
import { HOME_BY_ROLE } from "../utils/roles";

const Dashboard = React.lazy(() => import("../pages/Dashboard"));
const RoleDashboard = React.lazy(() => import("../pages/RoleDashboard"));
const Patients = React.lazy(() => import("../pages/Patients"));
const Doctors = React.lazy(() => import("../pages/Doctors"));
const Appointments = React.lazy(() => import("../pages/Appointments"));
const EnhancedAppointments = React.lazy(() => import("../pages/EnhancedAppointments"));
const Billing = React.lazy(() => import("../pages/Billing"));
const BillingManagement = React.lazy(() => import("../pages/BillingManagement"));
const Lab = React.lazy(() => import("../pages/Lab"));
const Pharmacy = React.lazy(() => import("../pages/Pharmacy"));
const PharmacyManagement = React.lazy(() => import("../pages/PharmacyManagement"));
const NotFound = React.lazy(() => import("../pages/NotFound"));
const PatientDetail = React.lazy(() => import("../pages/PatientDetail"));
const Departments = React.lazy(() => import("../pages/Departments"));
const ActivityLogs = React.lazy(() => import("../pages/ActivityLogs"));
const DoctorSchedule = React.lazy(() => import("../pages/DoctorSchedule"));
const Staff = React.lazy(() => import("../pages/Staff"));
const Beds = React.lazy(() => import("../pages/Beds"));
const BedManagement = React.lazy(() => import("../pages/BedManagement"));
const Admissions = React.lazy(() => import("../pages/Admissions"));
const AnalyticsDashboard = React.lazy(() => import("../pages/AnalyticsDashboard"));
const LabManagement = React.lazy(() => import("../pages/LabManagement"));
const PharmacyInventory = React.lazy(() => import("../pages/PharmacyInventory"));
const Register = React.lazy(() => import("../pages/Register"));
const RoleBasedLogin = React.lazy(() => import("../pages/RoleBasedLogin"));

function PageWrapper({ children }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingSkeleton rows={6} />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}

PageWrapper.propTypes = {
  children: PropTypes.node.isRequired,
};

function DefaultHomeRedirect() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <LoadingSkeleton rows={6} />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/role-based-login" replace />;
  }

  return <Navigate to={HOME_BY_ROLE[user?.role] || "/admin"} replace />;
}

export default function AppRouter() {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Routes>
        <Route
          path="/register"
          element={
            <PageWrapper>
              <Register />
            </PageWrapper>
          }
        />
        <Route
          path="/role-based-login"
          element={
            <PageWrapper>
              <RoleBasedLogin />
            </PageWrapper>
          }
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DefaultHomeRedirect />} />
          <Route
            path="admin"
            element={
              <PageWrapper>
                <RoleDashboard />
              </PageWrapper>
            }
          />
          <Route
            path="staff"
            element={
              <PageWrapper>
                <RoleDashboard />
              </PageWrapper>
            }
          />
          <Route
            path="doctor"
            element={
              <PageWrapper>
                <RoleDashboard />
              </PageWrapper>
            }
          />
          <Route path="nurse" element={<PageWrapper><RoleDashboard /></PageWrapper>} />
          <Route path="receptionist" element={<PageWrapper><RoleDashboard /></PageWrapper>} />
          <Route path="billing-team" element={<PageWrapper><RoleDashboard /></PageWrapper>} />
          <Route path="lab-technician" element={<PageWrapper><RoleDashboard /></PageWrapper>} />
          <Route path="pharmacist" element={<PageWrapper><RoleDashboard /></PageWrapper>} />
          <Route path="patient" element={<PageWrapper><RoleDashboard /></PageWrapper>} />
          <Route
            path="dashboard"
            element={
              <PageWrapper>
                <Dashboard />
              </PageWrapper>
            }
          />
          <Route
            path="departments"
            element={
              <PageWrapper>
                <Departments />
              </PageWrapper>
            }
          />
          <Route
            path="activity-logs"
            element={
              <PageWrapper>
                <ActivityLogs />
              </PageWrapper>
            }
          />
          <Route
            path="doctor-schedule"
            element={
              <PageWrapper>
                <DoctorSchedule />
              </PageWrapper>
            }
          />
          <Route
            path="staff-management"
            element={
              <PageWrapper>
                <Staff />
              </PageWrapper>
            }
          />
          <Route
            path="beds"
            element={
              <PageWrapper>
                <Beds />
              </PageWrapper>
            }
          />
          <Route
            path="admissions"
            element={
              <PageWrapper>
                <Admissions />
              </PageWrapper>
            }
          />
          <Route
            path="patients"
            element={
              <PageWrapper>
                <Patients />
              </PageWrapper>
            }
          />
          <Route
            path="patients/:id"
            element={
              <PageWrapper>
                <PatientDetail />
              </PageWrapper>
            }
          />
          <Route
            path="doctors"
            element={
              <PageWrapper>
                <Doctors />
              </PageWrapper>
            }
          />
          <Route
            path="appointments"
            element={
              <PageWrapper>
                <Appointments />
              </PageWrapper>
            }
          />
          <Route
            path="enhanced-appointments"
            element={
              <PageWrapper>
                <EnhancedAppointments />
              </PageWrapper>
            }
          />
          <Route
            path="billing"
            element={
              <PageWrapper>
                <Billing />
              </PageWrapper>
            }
          />
          <Route
            path="billing-management"
            element={
              <PageWrapper>
                <BillingManagement />
              </PageWrapper>
            }
          />
          <Route
            path="lab"
            element={
              <PageWrapper>
                <Lab />
              </PageWrapper>
            }
          />
          <Route
            path="pharmacy"
            element={
              <PageWrapper>
                <Pharmacy />
              </PageWrapper>
            }
          />
          <Route
            path="pharmacy-management"
            element={
              <PageWrapper>
                <PharmacyManagement />
              </PageWrapper>
            }
          />
          <Route
            path="analytics-dashboard"
            element={
              <PageWrapper>
                <AnalyticsDashboard />
              </PageWrapper>
            }
          />
          <Route
            path="bed-management"
            element={
              <PageWrapper>
                <BedManagement />
              </PageWrapper>
            }
          />
          <Route
            path="lab-management"
            element={
              <PageWrapper>
                <LabManagement />
              </PageWrapper>
            }
          />
          <Route
            path="pharmacy-inventory"
            element={
              <PageWrapper>
                <PharmacyInventory />
              </PageWrapper>
            }
          />
          <Route path="*" element={<Navigate to="/not-found" replace />} />
        </Route>
        <Route
          path="/not-found"
          element={
            <PageWrapper>
              <NotFound />
            </PageWrapper>
          }
        />
        <Route
          path="*"
          element={
            <PageWrapper>
              <NotFound />
            </PageWrapper>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
