import { useCallback, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Calendar, DollarSign, Plus } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import useLocalStorage from "../hooks/useLocalStorage";
import { format } from "date-fns";

const leaveSchema = z.object({
  start_date: z.string().min(1, "Start date required"),
  end_date: z.string().min(1, "End date required"),
  reason: z.string().min(1, "Reason required"),
  status: z.string().default("Pending"),
});

const feeSchema = z.object({
  type: z.string().min(1, "Type required"),
  amount: z.coerce.number().min(0, "Amount must be positive"),
  description: z.string().optional(),
});

const mockLeaveRequests = [
  { id: 1, start_date: "2024-12-20", end_date: "2024-12-25", reason: "Annual vacation", status: "Approved", doctor_id: 1 },
  { id: 2, start_date: "2024-11-15", end_date: "2024-11-16", reason: "Personal emergency", status: "Approved", doctor_id: 1 },
  { id: 3, start_date: "2025-01-10", end_date: "2025-01-12", reason: "Conference attendance", status: "Pending", doctor_id: 1 },
];

const mockConsultationFees = [
  { id: 1, type: "General Consultation", amount: 500, description: "Regular checkup", doctor_id: 1 },
  { id: 2, type: "Specialist Consultation", amount: 1000, description: "Specialist visit", doctor_id: 1 },
  { id: 3, type: "Follow-up Visit", amount: 300, description: "Follow-up within 7 days", doctor_id: 1 },
  { id: 4, type: "Emergency Consultation", amount: 1500, description: "Emergency cases", doctor_id: 1 },
];

export default function DoctorSchedule() {
  const [activeTab, setActiveTab] = useState("leave");
  const [leaveRequests, setLeaveRequests] = useLocalStorage("doctor_leave", mockLeaveRequests);
  const [consultationFees, setConsultationFees] = useLocalStorage("doctor_fees", mockConsultationFees);
  
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [feeOpen, setFeeOpen] = useState(false);
  const [editingLeave, setEditingLeave] = useState(null);

  const leaveForm = useForm({
    resolver: zodResolver(leaveSchema),
    defaultValues: {
      start_date: "",
      end_date: "",
      reason: "",
      status: "Pending",
    },
  });

  const feeForm = useForm({
    resolver: zodResolver(feeSchema),
    defaultValues: {
      type: "",
      amount: 0,
      description: "",
    },
  });

  const handleLeaveSubmit = useCallback((values) => {
    if (editingLeave) {
      setLeaveRequests(prev => prev.map(l => l.id === editingLeave.id ? { ...l, ...values } : l));
    } else {
      setLeaveRequests(prev => [...prev, { id: Date.now(), ...values, doctor_id: 1 }]);
    }
    setLeaveOpen(false);
    setEditingLeave(null);
    leaveForm.reset();
  }, [editingLeave, leaveForm, setLeaveRequests]);

  const handleFeeSubmit = useCallback((values) => {
    setConsultationFees(prev => [...prev, { id: Date.now(), ...values, doctor_id: 1 }]);
    setFeeOpen(false);
    feeForm.reset();
  }, [feeForm, setConsultationFees]);

  const handleDeleteLeave = useCallback((id) => {
    setLeaveRequests(prev => prev.filter(l => l.id !== id));
  }, [setLeaveRequests]);

  const handleDeleteFee = useCallback((id) => {
    setConsultationFees(prev => prev.filter(f => f.id !== id));
  }, [setConsultationFees]);

  const getStatusBadge = (status) => {
    const colors = {
      Approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
      Pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
      Rejected: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
    };
    return colors[status] || "bg-slate-100 text-slate-700";
  };

  const totalFees = useMemo(() => 
    consultationFees.reduce((sum, f) => sum + f.amount, 0)
  , [consultationFees]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Doctor Schedule</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Manage leave requests and consultation fees.</p>
        </div>
      </div>

      <div className="flex gap-2 border-b dark:border-slate-700">
        <button
          onClick={() => setActiveTab("leave")}
          className={`px-4 py-2 text-sm font-medium transition ${
            activeTab === "leave"
              ? "border-b-2 border-sky-600 text-sky-600"
              : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
          }`}
        >
          <Calendar className="mr-2 inline h-4 w-4" />
          Leave Management
        </button>
        <button
          onClick={() => setActiveTab("fees")}
          className={`px-4 py-2 text-sm font-medium transition ${
            activeTab === "fees"
              ? "border-b-2 border-sky-600 text-sky-600"
              : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
          }`}
        >
          <DollarSign className="mr-2 inline h-4 w-4" />
          Consultation Fees
        </button>
      </div>

      {activeTab === "leave" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button className="bg-sky-600 hover:bg-sky-700" onClick={() => setLeaveOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Request Leave
            </Button>
          </div>

          <div className="rounded-lg border bg-white dark:bg-slate-900 dark:border-slate-700">
            <Table>
              <TableHeader>
                <TableRow className="dark:border-slate-700">
                  <TableHead className="dark:text-slate-300">Start Date</TableHead>
                  <TableHead className="dark:text-slate-300">End Date</TableHead>
                  <TableHead className="dark:text-slate-300">Reason</TableHead>
                  <TableHead className="dark:text-slate-300">Status</TableHead>
                  <TableHead className="dark:text-slate-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="dark:border-slate-700">
                {leaveRequests.length === 0 ? (
                  <TableRow className="dark:border-slate-700">
                    <TableCell colSpan={5} className="text-center py-8 text-slate-500 dark:text-slate-400">
                      No leave requests
                    </TableCell>
                  </TableRow>
                ) : (
                  leaveRequests.map((leave) => (
                    <TableRow key={leave.id} className="dark:border-slate-700">
                      <TableCell className="dark:text-white">{format(new Date(leave.start_date), "MMM d, yyyy")}</TableCell>
                      <TableCell className="dark:text-white">{format(new Date(leave.end_date), "MMM d, yyyy")}</TableCell>
                      <TableCell className="dark:text-slate-300">{leave.reason}</TableCell>
                      <TableCell>
                        <Badge className={getStatusBadge(leave.status)}>{leave.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="destructive" size="sm" onClick={() => handleDeleteLeave(leave.id)}>
                          Cancel
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {activeTab === "fees" && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border bg-white p-4 dark:bg-slate-900 dark:border-slate-700">
              <p className="text-sm text-slate-500 dark:text-slate-400">Total Fee Types</p>
              <p className="text-2xl font-semibold dark:text-white">{consultationFees.length}</p>
            </div>
            <div className="rounded-lg border bg-white p-4 dark:bg-slate-900 dark:border-slate-700">
              <p className="text-sm text-slate-500 dark:text-slate-400">Average Fee</p>
              <p className="text-2xl font-semibold dark:text-white">₹{Math.round(totalFees / consultationFees.length || 0)}</p>
            </div>
            <div className="rounded-lg border bg-white p-4 dark:bg-slate-900 dark:border-slate-700">
              <p className="text-sm text-slate-500 dark:text-slate-400">Min Fee</p>
              <p className="text-2xl font-semibold dark:text-white">₹{Math.min(...consultationFees.map(f => f.amount), 0)}</p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button className="bg-sky-600 hover:bg-sky-700" onClick={() => setFeeOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Fee
            </Button>
          </div>

          <div className="rounded-lg border bg-white dark:bg-slate-900 dark:border-slate-700">
            <Table>
              <TableHeader>
                <TableRow className="dark:border-slate-700">
                  <TableHead className="dark:text-slate-300">Type</TableHead>
                  <TableHead className="dark:text-slate-300">Amount (₹)</TableHead>
                  <TableHead className="dark:text-slate-300">Description</TableHead>
                  <TableHead className="dark:text-slate-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="dark:border-slate-700">
                {consultationFees.length === 0 ? (
                  <TableRow className="dark:border-slate-700">
                    <TableCell colSpan={4} className="text-center py-8 text-slate-500 dark:text-slate-400">
                      No consultation fees set
                    </TableCell>
                  </TableRow>
                ) : (
                  consultationFees.map((fee) => (
                    <TableRow key={fee.id} className="dark:border-slate-700">
                      <TableCell className="font-medium dark:text-white">{fee.type}</TableCell>
                      <TableCell className="dark:text-white">₹{fee.amount}</TableCell>
                      <TableCell className="dark:text-slate-300">{fee.description || "-"}</TableCell>
                      <TableCell>
                        <Button variant="destructive" size="sm" onClick={() => handleDeleteFee(fee.id)}>
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <Dialog open={leaveOpen} onOpenChange={(v) => { setLeaveOpen(v); if (!v) { setEditingLeave(null); leaveForm.reset(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Leave</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <label className="text-sm font-medium dark:text-slate-200">Start Date</label>
              <Input type="date" {...leaveForm.register("start_date")} className="dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
            </div>
            <div>
              <label className="text-sm font-medium dark:text-slate-200">End Date</label>
              <Input type="date" {...leaveForm.register("end_date")} className="dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
            </div>
            <div>
              <label className="text-sm font-medium dark:text-slate-200">Reason</label>
              <Input {...leaveForm.register("reason")} placeholder="Reason for leave" className="dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLeaveOpen(false)}>Cancel</Button>
            <Button className="bg-sky-600 hover:bg-sky-700" onClick={leaveForm.handleSubmit(handleLeaveSubmit)}>Submit Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={feeOpen} onOpenChange={(v) => { if (!v) feeForm.reset(); setFeeOpen(v); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Consultation Fee</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <label className="text-sm font-medium dark:text-slate-200">Type</label>
              <Select value={feeForm.watch("type")} onValueChange={(v) => feeForm.setValue("type", v)}>
                <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="General Consultation">General Consultation</SelectItem>
                  <SelectItem value="Specialist Consultation">Specialist Consultation</SelectItem>
                  <SelectItem value="Follow-up Visit">Follow-up Visit</SelectItem>
                  <SelectItem value="Emergency Consultation">Emergency Consultation</SelectItem>
                  <SelectItem value="Video Consultation">Video Consultation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium dark:text-slate-200">Amount (₹)</label>
              <Input type="number" {...feeForm.register("amount")} placeholder="0" className="dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
            </div>
            <div>
              <label className="text-sm font-medium dark:text-slate-200">Description</label>
              <Input {...feeForm.register("description")} placeholder="Optional description" className="dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFeeOpen(false)}>Cancel</Button>
            <Button className="bg-sky-600 hover:bg-sky-700" onClick={feeForm.handleSubmit(handleFeeSubmit)}>Add Fee</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}