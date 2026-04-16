import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Download, Printer } from "lucide-react";
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
import LoadingSkeleton from "../components/shared/LoadingSkeleton";
import EmptyState from "../components/shared/EmptyState";
import ConfirmDialog from "../components/shared/ConfirmDialog";
import Pagination from "../components/shared/Pagination";
import useDebounce from "../hooks/useDebounce";
import useBilling from "../hooks/useBilling";
import usePatients from "../hooks/usePatients";
import useDoctors from "../hooks/useDoctors";
import useAppointments from "../hooks/useAppointments";
import { useAuth } from "../context/AuthContext";
import { BADGE_VARIANTS } from "../utils/constants";
import { downloadCSV, formatCurrency, formatDate } from "../utils/helpers";

const schema = z.object({
  patient_id: z.coerce.number().min(1, "Patient required"),
  doctor_id: z.coerce.number().min(1, "Doctor required"),
  appointment_id: z.coerce.number().optional(),
  amount: z.coerce.number().min(0, "Amount required"),
  discount: z.coerce.number().min(0).default(0),
  tax: z.coerce.number().min(0).default(0),
  status: z.string().min(1, "Status required"),
  payment_method: z.string().optional(),
  due_date: z.string().optional(),
  notes: z.string().optional(),
});

const paymentMethods = ["Cash", "Card", "UPI", "Insurance", "Bank Transfer"];

export default function Billing() {
  const { user } = useAuth();
  const isStaff = user?.role === "staff";
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [paymentModal, setPaymentModal] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("Cash");

  const debouncedSearch = useDebounce(search, 300);
  const {
    data,
    isLoading,
    error,
    createBilling,
    updateBilling,
    deleteBilling,
    creating,
    updating,
  } = useBilling({ page: 1, limit: 200, search: debouncedSearch });

  const patientsData = usePatients({ page: 1, limit: 200 })?.data?.items;
  const patients = useMemo(() => patientsData || [], [patientsData]);
  const doctorsData = useDoctors({ page: 1, limit: 200 })?.data?.items;
  const doctors = useMemo(() => doctorsData || [], [doctorsData]);
  const appointmentsData = useAppointments({ page: 1, limit: 200 })?.data?.items;
  const appointments = useMemo(() => appointmentsData || [], [appointmentsData]);

  const records = useMemo(() => data?.items || [], [data?.items]);

  const filteredRecords = useMemo(() => {
    let items = [...records];
    if (statusFilter !== "all") {
      items = items.filter((record) => record?.status === statusFilter);
    }
    if (dateFrom) {
      items = items.filter((record) =>
        record?.invoice_date ? record.invoice_date >= dateFrom : false
      );
    }
    if (dateTo) {
      items = items.filter((record) =>
        record?.invoice_date ? record.invoice_date <= dateTo : false
      );
    }
    if (sortBy === "amount") {
      items.sort((a, b) => (b?.amount || 0) - (a?.amount || 0));
    }
    if (sortBy === "status") {
      items.sort((a, b) => (a?.status || "").localeCompare(b?.status || ""));
    }
    if (sortBy === "date") {
      items.sort((a, b) =>
        new Date(b?.invoice_date || 0) - new Date(a?.invoice_date || 0)
      );
    }
    if (sortOrder === "asc") {
      items.reverse();
    }
    return items;
  }, [records, statusFilter, dateFrom, dateTo, sortBy, sortOrder]);

  const totalRevenue = filteredRecords.reduce(
    (sum, record) => sum + Number(record?.amount || 0),
    0
  );
  const totalPaid = filteredRecords
    .filter((record) => record?.status === "Paid")
    .reduce((sum, record) => sum + Number(record?.amount || 0), 0);
  const totalPending = filteredRecords
    .filter((record) => record?.status === "Pending")
    .reduce((sum, record) => sum + Number(record?.amount || 0), 0);
  const totalOverdue = filteredRecords
    .filter((record) => record?.status === "Overdue")
    .reduce((sum, record) => sum + Number(record?.amount || 0), 0);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / 10));
  const pagedRecords = filteredRecords.slice((page - 1) * 10, page * 10);

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      patient_id: "",
      doctor_id: "",
      appointment_id: "",
      amount: 0,
      discount: 0,
      tax: 0,
      status: "Pending",
      payment_method: "",
      due_date: "",
      notes: "",
    },
  });

  const watchAmount = form.watch("amount") || 0;
  const watchDiscount = form.watch("discount") || 0;
  const watchTax = form.watch("tax") || 0;
  const liveTotal = Number(watchAmount) - Number(watchDiscount) + Number(watchTax);

  const handleSubmit = async (values) => {
    if (editing) {
      await updateBilling({ id: editing?.id, payload: values });
    } else {
      await createBilling(values);
    }
    setOpen(false);
    setEditing(null);
    form.reset();
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    await deleteBilling(confirmDelete?.id);
    setConfirmDelete(null);
  };

  const handleExport = () => {
    const rows = filteredRecords.map((record) => ({
      Invoice: record?.invoice_id || record?.id,
      Patient: record?.patient_name || record?.patient,
      Doctor: record?.doctor_name || record?.doctor,
      Date: formatDate(record?.invoice_date),
      Amount: formatCurrency(record?.amount || 0),
      Status: record?.status,
    }));
    downloadCSV(rows, "billing.csv");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Billing & Invoices</h1>
          <p className="text-sm text-slate-500">Track revenue and invoice status.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button className="bg-sky-600 hover:bg-sky-700" onClick={() => setOpen(true)}>
            Generate Invoice
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-slate-500">Total Revenue</p>
          <p className="mt-2 text-2xl font-semibold text-sky-600">
            {formatCurrency(totalRevenue)}
          </p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-slate-500">Paid</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-600">
            {formatCurrency(totalPaid)}
          </p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-slate-500">Pending</p>
          <p className="mt-2 text-2xl font-semibold text-amber-600">
            {formatCurrency(totalPending)}
          </p>
        </div>
        <div
          className={`rounded-lg border p-4 ${
            totalOverdue > 0 ? "bg-rose-50" : "bg-white"
          }`}
        >
          <p className="text-sm text-slate-500">Overdue</p>
          <p className="mt-2 text-2xl font-semibold text-rose-600">
            {formatCurrency(totalOverdue)}
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        <Input
          placeholder="Search invoices..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Select
          value={statusFilter}
          onValueChange={(value) => {
            setStatusFilter(value);
            setPage(1);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="Paid">Paid</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
        <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
        <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
        <div className="flex gap-2">
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger>
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="amount">Amount</SelectItem>
              <SelectItem value="status">Status</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
          >
            {sortOrder === "asc" ? "Asc" : "Desc"}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <LoadingSkeleton rows={6} />
      ) : error ? (
        <EmptyState
          title="Billing unavailable"
          description={error.message || "Unable to load billing records."}
        />
      ) : filteredRecords.length === 0 ? (
        <EmptyState title="No invoices" description="No billing records found." />
      ) : (
        <div className="rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice ID</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Doctor</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedRecords.map((record) => (
                <TableRow
                  key={record?.id}
                  className={
                    record?.status === "Overdue"
                      ? "border-l-4 border-rose-500 bg-rose-50/30"
                      : ""
                  }
                >
                  <TableCell className="font-medium">
                    {record?.invoice_id || record?.id}
                  </TableCell>
                  <TableCell>{record?.patient_name || record?.patient}</TableCell>
                  <TableCell>{record?.doctor_name || record?.doctor}</TableCell>
                  <TableCell>{formatDate(record?.invoice_date)}</TableCell>
                  <TableCell>{formatCurrency(record?.amount || 0)}</TableCell>
                  <TableCell>
                    <Badge variant={BADGE_VARIANTS[record?.status] || "secondary"}>
                      {record?.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      {!isStaff && record?.status !== "Paid" ? (
                        <Button variant="outline" onClick={() => setPaymentModal(record)}>
                          Mark Paid
                        </Button>
                      ) : null}
                      <Button variant="outline" onClick={() => window.print()}>
                        Print
                      </Button>
                      {!isStaff ? (
                        <Button variant="destructive" onClick={() => setConfirmDelete(record)}>
                          Delete
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Invoice" : "Generate Invoice"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-700">Patient</label>
              <Select
                value={String(form.watch("patient_id") || "")}
                onValueChange={(value) => form.setValue("patient_id", Number(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select patient" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((patient) => (
                    <SelectItem key={patient?.id} value={String(patient?.id)}>
                      {patient?.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.patient_id ? (
                <p className="mt-1 text-xs text-rose-500">
                  {form.formState.errors.patient_id.message}
                </p>
              ) : null}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Doctor</label>
              <Select
                value={String(form.watch("doctor_id") || "")}
                onValueChange={(value) => form.setValue("doctor_id", Number(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select doctor" />
                </SelectTrigger>
                <SelectContent>
                  {doctors.map((doctor) => (
                    <SelectItem key={doctor?.id} value={String(doctor?.id)}>
                      {doctor?.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.doctor_id ? (
                <p className="mt-1 text-xs text-rose-500">
                  {form.formState.errors.doctor_id.message}
                </p>
              ) : null}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Appointment</label>
              <Select
                value={String(form.watch("appointment_id") || "")}
                onValueChange={(value) => form.setValue("appointment_id", Number(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select appointment" />
                </SelectTrigger>
                <SelectContent>
                  {appointments.map((appt) => (
                    <SelectItem key={appt?.id} value={String(appt?.id)}>
                      {appt?.patient_name || appt?.patient} · {formatDate(appt?.appointment_date)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Amount</label>
              <Input type="number" {...form.register("amount")} />
              {form.formState.errors.amount ? (
                <p className="mt-1 text-xs text-rose-500">
                  {form.formState.errors.amount.message}
                </p>
              ) : null}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Discount</label>
              <Input type="number" {...form.register("discount")} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Tax</label>
              <Input type="number" {...form.register("tax")} />
            </div>
            <div className="md:col-span-2">
              <div className="rounded-md bg-sky-50 p-3 text-sm text-slate-600">
                Total: <span className="font-semibold">{formatCurrency(liveTotal)}</span>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Status</label>
              <Select
                value={form.watch("status")}
                onValueChange={(value) => form.setValue("status", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Payment Method</label>
              <Select
                value={form.watch("payment_method") || ""}
                onValueChange={(value) => form.setValue("payment_method", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method} value={method}>
                      {method}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Due Date</label>
              <Input type="date" {...form.register("due_date")} />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-slate-700">Notes</label>
              <Input placeholder="Notes" {...form.register("notes")} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-sky-600 hover:bg-sky-700"
              onClick={form.handleSubmit(handleSubmit)}
              disabled={creating || updating}
            >
              {creating || updating ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!isStaff && Boolean(paymentModal)}
        onOpenChange={(value) => !value && setPaymentModal(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Mark Invoice as Paid</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm text-slate-600">
            <p>
              Invoice {paymentModal?.invoice_id || paymentModal?.id} - {paymentModal?.patient_name}
            </p>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue placeholder="Payment method" />
              </SelectTrigger>
              <SelectContent>
                {paymentMethods.map((method) => (
                  <SelectItem key={method} value={method}>
                    {method}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentModal(null)}>
              Cancel
            </Button>
            <Button
              className="bg-sky-600 hover:bg-sky-700"
              onClick={async () => {
                if (!paymentModal) return;
                await updateBilling({
                  id: paymentModal?.id,
                  payload: {
                    status: "Paid",
                    paid_at: new Date().toISOString(),
                    payment_method: paymentMethod,
                  },
                });
                setPaymentModal(null);
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {!isStaff ? (
        <ConfirmDialog
          open={Boolean(confirmDelete)}
          onOpenChange={(value) => !value && setConfirmDelete(null)}
          title="Delete invoice?"
          description="This will remove the invoice record."
          confirmText="Delete"
          onConfirm={handleDelete}
        />
      ) : null}
    </div>
  );
}

