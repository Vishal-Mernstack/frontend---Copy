import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Clock, Download, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import LoadingSkeleton from "../components/shared/LoadingSkeleton";
import EmptyState from "../components/shared/EmptyState";
import usePatients from "../hooks/usePatients";
import useDoctors from "../hooks/useDoctors";
import useAppointments from "../hooks/useAppointments";
import useBilling from "../hooks/useBilling";
import { BADGE_VARIANTS } from "../utils/constants";
import {
  downloadCSV,
  formatCurrency,
  formatDateTime,
} from "../utils/helpers";

export default function Dashboard() {
  // Fetch more data for meaningful statistics
  const patients = usePatients({ page: 1, limit: 200 });
  const doctors = useDoctors({ page: 1, limit: 1 });
  const appointments = useAppointments({ page: 1, limit: 100 });
  const billing = useBilling({ page: 1, limit: 200 });

  const [now, setNow] = useState(new Date());
  const [range, setRange] = useState("6m");

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Calculate monthly patient growth from live API data
  const monthlyData = useMemo(() => {
    const items = patients.data?.items || [];
    const monthCounts = {};
    
    // Initialize last 12 months with 0
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthKey = d.toLocaleDateString('en-US', { month: 'short' });
      monthCounts[monthKey] = 0;
    }
    
    // Count patients by creation month
    items.forEach((item) => {
      if (item?.created_at) {
        const date = new Date(item.created_at);
        const monthKey = date.toLocaleDateString('en-US', { month: 'short' });
        if (monthCounts.hasOwnProperty(monthKey)) {
          monthCounts[monthKey]++;
        }
      }
    });
    
    // Convert to array format for chart
    const data = Object.entries(monthCounts).map(([month, value]) => ({
      month,
      value
    }));
    
    // Return based on selected range
    if (range === "3m") return data.slice(-3);
    if (range === "12m") return data.slice(-12);
    return data.slice(-6);
  }, [patients.data?.items, range]);

  // Calculate weekly appointments from live API data
  const weeklyAppointmentsData = useMemo(() => {
    const items = appointments.data?.items || [];
    const dayCounts = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
    
    items.forEach((item) => {
      if (item?.appointment_date) {
        const date = new Date(item.appointment_date);
        const day = date.toLocaleDateString('en-US', { weekday: 'short' });
        if (dayCounts.hasOwnProperty(day)) {
          dayCounts[day]++;
        }
      }
    });
    
    return [
      { day: "Mon", value: dayCounts.Mon },
      { day: "Tue", value: dayCounts.Tue },
      { day: "Wed", value: dayCounts.Wed },
      { day: "Thu", value: dayCounts.Thu },
      { day: "Fri", value: dayCounts.Fri },
      { day: "Sat", value: dayCounts.Sat },
      { day: "Sun", value: dayCounts.Sun },
    ];
  }, [appointments.data?.items]);

  const totalPatients = patients.data?.pagination?.total ?? 0;
  const totalDoctors = doctors.data?.pagination?.total ?? 0;
  const totalAppointments = appointments.data?.pagination?.total ?? 0;
  const totalRevenue =
    billing.data?.items?.reduce(
      (sum, record) => sum + Number(record?.amount || 0),
      0
    ) ?? 0;

  const handleExportCsv = useCallback(() => {
    const rows = (appointments.data?.items || []).map((item) => ({
      Patient: item?.patient_name || item?.patient || "-",
      Doctor: item?.doctor_name || item?.doctor || "-",
      Date: formatDateTime(item?.appointment_date),
      Type: item?.type || "-",
      Status: item?.status || "-",
    }));
    downloadCSV(rows, "recent-appointments.csv");
  }, [appointments.data?.items]);

  const handleExportPdf = useCallback(() => {
    window.print();
  }, []);

  return (
    <div className="space-y-6">
      {patients.error || doctors.error || appointments.error || billing.error ? (
        <EmptyState
          title="Dashboard data unavailable"
          description={
            patients.error?.message ||
            doctors.error?.message ||
            appointments.error?.message ||
            billing.error?.message ||
            "Unable to load dashboard data."
          }
        />
      ) : null}

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">
            Overview of hospital performance and activity.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild className="bg-sky-600 hover:bg-sky-700">
            <Link to="/patients">Add Patient</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/appointments">Book Appointment</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/billing">Generate Invoice</Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border bg-white p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Clock className="h-4 w-4 text-sky-600" />
          <span>{now.toLocaleString()}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleExportCsv}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={handleExportPdf}>
            <FileText className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Total Patients",
            value: totalPatients,
          },
          {
            label: "Total Doctors",
            value: totalDoctors,
          },
          {
            label: "Appointments",
            value: totalAppointments,
          },
          {
            label: "Revenue",
            value: formatCurrency(totalRevenue),
          },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardHeader>
              <CardTitle className="text-sm text-slate-500">
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(patients.isLoading ||
                doctors.isLoading ||
                appointments.isLoading ||
                billing.isLoading) &&
              stat.label !== "Revenue" ? (
                <LoadingSkeleton rows={1} />
              ) : (
                <div className="text-2xl font-semibold text-slate-900">
                  {stat.value}
                </div>
              )}
              {stat.label === "Revenue" && billing.isLoading ? (
                <LoadingSkeleton rows={1} />
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <CardTitle>Monthly Patient Growth</CardTitle>
            <select
              className="rounded-md border px-2 py-1 text-sm"
              value={range}
              onChange={(event) => setRange(event.target.value)}
            >
              <option value="3m">Last 3 months</option>
              <option value="6m">Last 6 months</option>
              <option value="12m">Last 12 months</option>
            </select>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#0284c7"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Appointments per Week</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyAppointmentsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#0ea5e9" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Appointments</CardTitle>
        </CardHeader>
        <CardContent>
          {appointments.isLoading ? (
            <LoadingSkeleton rows={6} />
          ) : (appointments.data?.items || []).length === 0 ? (
            <EmptyState title="No appointments" description="No recent appointments found." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(appointments.data?.items || []).map((item) => (
                  <TableRow key={item?.id || item?.appointment_id}>
                    <TableCell className="font-medium">
                      {item?.patient_name || item?.patient || "-"}
                    </TableCell>
                    <TableCell>{item?.doctor_name || item?.doctor || "-"}</TableCell>
                    <TableCell>{formatDateTime(item?.appointment_date)}</TableCell>
                    <TableCell>{item?.type || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={BADGE_VARIANTS[item?.status] || "secondary"}>
                        {item?.status || "Scheduled"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

