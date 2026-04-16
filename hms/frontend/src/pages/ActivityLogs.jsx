import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import Pagination from "../components/shared/Pagination";
import { format } from "date-fns";

const mockLogs = [
  { id: 1, action: "Patient Created", user: "Admin User", role: "admin", details: "New patient John Doe added", timestamp: new Date().toISOString() },
  { id: 2, action: "Appointment Booked", user: "Receptionist", role: "receptionist", details: "Appointment with Dr. Smith for patient Jane", timestamp: new Date(Date.now() - 3600000).toISOString() },
  { id: 3, action: "Prescription Written", user: "Dr. Sarah", role: "doctor", details: "Prescription for patient ID 123", timestamp: new Date(Date.now() - 7200000).toISOString() },
  { id: 4, action: "Bill Generated", user: "Billing Staff", role: "billing", details: "Invoice #INV-001 created", timestamp: new Date(Date.now() - 10800000).toISOString() },
  { id: 5, action: "Lab Result Updated", user: "Lab Tech", role: "lab_technician", details: "Blood test results uploaded for patient", timestamp: new Date(Date.now() - 14400000).toISOString() },
  { id: 6, action: "Doctor Profile Updated", user: "Admin User", role: "admin", details: "Updated Dr. Chen's availability", timestamp: new Date(Date.now() - 18000000).toISOString() },
  { id: 7, action: "Patient Discharged", user: "Nurse", role: "nurse", details: "Patient ID 456 discharged", timestamp: new Date(Date.now() - 21600000).toISOString() },
  { id: 8, action: "Pharmacy Order", user: "Pharmacist", role: "pharmacist", details: "Medicine order processed", timestamp: new Date(Date.now() - 25200000).toISOString() },
];

const actionColors = {
  "Patient Created": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  "Appointment Booked": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "Prescription Written": "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  "Bill Generated": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  "Lab Result Updated": "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  "Doctor Profile Updated": "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  "Patient Discharged": "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
  "Pharmacy Order": "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
};

export default function ActivityLogs() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const filteredLogs = useMemo(() => {
    if (!search) return mockLogs;
    const s = search.toLowerCase();
    return mockLogs.filter(log => 
      log.action.toLowerCase().includes(s) ||
      log.user.toLowerCase().includes(s) ||
      log.details.toLowerCase().includes(s)
    );
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
  const pagedLogs = filteredLogs.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Activity Logs</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Track all system activities and user actions.</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search logs..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
          />
        </div>
      </div>

      <div className="rounded-lg border bg-white dark:bg-slate-900 dark:border-slate-700">
        <Table>
          <TableHeader>
            <TableRow className="dark:border-slate-700">
              <TableHead className="dark:text-slate-300">Action</TableHead>
              <TableHead className="dark:text-slate-300">User</TableHead>
              <TableHead className="dark:text-slate-300">Role</TableHead>
              <TableHead className="dark:text-slate-300">Details</TableHead>
              <TableHead className="dark:text-slate-300">Timestamp</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="dark:border-slate-700">
            {pagedLogs.map((log) => (
              <TableRow key={log.id} className="dark:border-slate-700">
                <TableCell>
                  <Badge className={actionColors[log.action] || "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"}>
                    {log.action}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium dark:text-white">{log.user}</TableCell>
                <TableCell className="dark:text-slate-300">{log.role}</TableCell>
                <TableCell className="dark:text-slate-300">{log.details}</TableCell>
                <TableCell className="dark:text-slate-300 text-sm">{format(new Date(log.timestamp), "MMM d, yyyy HH:mm")}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}