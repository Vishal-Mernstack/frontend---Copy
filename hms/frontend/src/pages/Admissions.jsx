import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { UserCheck, Plus } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Textarea } from "../components/ui/textarea";
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
import Pagination from "../components/shared/Pagination";
import useHospital from "../hooks/useHospital";
import usePatients from "../hooks/usePatients";
import useDoctors from "../hooks/useDoctors";
import { format } from "date-fns";

const admissionSchema = z.object({
  patient_id: z.coerce.number().min(1, "Patient required"),
  bed_id: z.coerce.number().optional(),
  doctor_id: z.coerce.number().optional(),
  reason: z.string().optional(),
  diagnosis: z.string().optional(),
  treatment_plan: z.string().optional(),
  status: z.string().optional(),
});

export default function Admissions() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const { useAdmissions, createAdmission, updateAdmission, isCreatingAdmission, isUpdatingAdmission, useBeds } = useHospital();
  const { data, isLoading, error } = useAdmissions({ status: statusFilter === "all" ? "" : statusFilter, search, page, limit: 20 });
  const { data: patientData } = usePatients({ limit: 200 });
  const { data: doctorData } = useDoctors({ limit: 200 });
  const { data: bedData } = useBeds({ status: "Available", limit: 100 });

  const admissions = data?.items || [];
  const patients = patientData?.items || [];
  const doctors = doctorData?.items || [];
  const availableBeds = bedData?.items || [];

  const form = useForm({
    resolver: zodResolver(admissionSchema),
    defaultValues: {
      patient_id: "",
      bed_id: "",
      doctor_id: "",
      reason: "",
      diagnosis: "",
      treatment_plan: "",
    },
  });

  const handleOpenChange = useCallback((value) => {
    setOpen(value);
    if (!value) {
      setEditing(null);
      form.reset();
    }
  }, [form]);

  const handleEdit = useCallback((admission) => {
    setEditing(admission);
    form.reset({
      patient_id: admission.patient_id || "",
      bed_id: admission.bed_id || "",
      doctor_id: admission.doctor_id || "",
      reason: admission.reason || "",
      diagnosis: admission.diagnosis || "",
      treatment_plan: admission.treatment_plan || "",
      status: admission.status || "",
    });
    setOpen(true);
  }, [form]);

  const handleSubmit = async (values) => {
    if (editing) {
      await updateAdmission({ id: editing.id, payload: values });
    } else {
      await createAdmission(values);
    }
    setOpen(false);
    setEditing(null);
    form.reset();
  };

  const getStatusBadge = (status) => {
    const colors = {
      Admitted: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
      Discharged: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400",
      Transferring: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    };
    return colors[status] || colors.Admitted;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Admissions</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Manage patient admissions and discharges.</p>
        </div>
        <Button className="bg-sky-600 hover:bg-sky-700" onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Admit Patient
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Input
          placeholder="Search by patient name or code..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="dark:bg-slate-800 dark:border-slate-700 dark:text-white"
        />
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Admitted">Admitted</SelectItem>
            <SelectItem value="Discharged">Discharged</SelectItem>
            <SelectItem value="Transferring">Transferring</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <LoadingSkeleton rows={6} />
      ) : error ? (
        <EmptyState title="Admissions unavailable" description={error.message || "Unable to load admissions."} />
      ) : admissions.length === 0 ? (
        <EmptyState title="No admissions" description="Admit patients to get started." />
      ) : (
        <div className="rounded-lg border bg-white dark:bg-slate-900 dark:border-slate-700">
          <Table>
            <TableHeader>
              <TableRow className="dark:border-slate-700">
                <TableHead className="dark:text-slate-300">Admission Code</TableHead>
                <TableHead className="dark:text-slate-300">Patient</TableHead>
                <TableHead className="dark:text-slate-300">Bed/Ward</TableHead>
                <TableHead className="dark:text-slate-300">Doctor</TableHead>
                <TableHead className="dark:text-slate-300">Admitted</TableHead>
                <TableHead className="dark:text-slate-300">Discharged</TableHead>
                <TableHead className="dark:text-slate-300">Status</TableHead>
                <TableHead className="dark:text-slate-300">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="dark:border-slate-700">
              {admissions.map((adm) => (
                <TableRow key={adm.id} className="dark:border-slate-700">
                  <TableCell className="font-medium dark:text-white">{adm.admission_code}</TableCell>
                  <TableCell className="dark:text-slate-300">
                    <div>
                      <p className="font-medium">{adm.patient_name}</p>
                      <p className="text-xs text-slate-500">{adm.patient_code}</p>
                    </div>
                  </TableCell>
                  <TableCell className="dark:text-slate-300">
                    {adm.bed_number ? `${adm.bed_number} (${adm.ward_type})` : "-"}
                  </TableCell>
                  <TableCell className="dark:text-slate-300">{adm.doctor_name || "-"}</TableCell>
                  <TableCell className="dark:text-slate-300">
                    {format(new Date(adm.admission_date), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="dark:text-slate-300">
                    {adm.discharge_date ? format(new Date(adm.discharge_date), "MMM d, yyyy") : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusBadge(adm.status)}>{adm.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => handleEdit(adm)}>Update</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {data?.pagination && (
        <Pagination page={page} totalPages={data.pagination.totalPages} onPageChange={setPage} />
      )}

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Update Admission" : "Admit Patient"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <label className="text-sm font-medium dark:text-slate-200">Patient</label>
              <Select value={String(form.watch("patient_id") || "")} onValueChange={(v) => form.setValue("patient_id", Number(v))}>
                <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700">
                  <SelectValue placeholder="Select patient" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name} ({p.patient_code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium dark:text-slate-200">Bed (Optional)</label>
                <Select value={form.watch("bed_id") ? String(form.watch("bed_id")) : "none"} onValueChange={(v) => form.setValue("bed_id", v === "none" ? null : Number(v))}>
                  <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700">
                    <SelectValue placeholder="Select bed" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Bed</SelectItem>
                    {availableBeds.map((bed) => (
                      <SelectItem key={bed.id} value={String(bed.id)}>{bed.bed_number} - {bed.ward_type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium dark:text-slate-200">Doctor</label>
                <Select value={form.watch("doctor_id") ? String(form.watch("doctor_id")) : "none"} onValueChange={(v) => form.setValue("doctor_id", v === "none" ? null : Number(v))}>
                  <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700">
                    <SelectValue placeholder="Select doctor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Doctor</SelectItem>
                    {doctors.map((d) => (
                      <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium dark:text-slate-200">Reason for Admission</label>
              <Textarea {...form.register("reason")} placeholder="Reason" className="dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium dark:text-slate-200">Diagnosis</label>
                <Textarea {...form.register("diagnosis")} placeholder="Initial diagnosis" className="dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
              </div>
              <div>
                <label className="text-sm font-medium dark:text-slate-200">Treatment Plan</label>
                <Textarea {...form.register("treatment_plan")} placeholder="Treatment plan" className="dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
              </div>
            </div>
            {editing && (
              <div>
                <label className="text-sm font-medium dark:text-slate-200">Update Status</label>
                <Select value={form.watch("status") || editing.status} onValueChange={(v) => form.setValue("status", v)}>
                  <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Admitted">Admitted</SelectItem>
                    <SelectItem value="Discharged">Discharge</SelectItem>
                    <SelectItem value="Transferring">Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
            <Button className="bg-sky-600 hover:bg-sky-700" onClick={form.handleSubmit(handleSubmit)} disabled={isCreatingAdmission || isUpdatingAdmission}>
              {isCreatingAdmission || isUpdatingAdmission ? "Saving..." : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
