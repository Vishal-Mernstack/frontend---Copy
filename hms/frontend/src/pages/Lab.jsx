import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import EmptyState from "../components/shared/EmptyState";
import FileDropZone from "../components/shared/FileDropZone";
import LoadingSkeleton from "../components/shared/LoadingSkeleton";
import Pagination from "../components/shared/Pagination";
import useDebounce from "../hooks/useDebounce";
import useDoctors from "../hooks/useDoctors";
import useLab from "../hooks/useLab";
import usePatients from "../hooks/usePatients";
import { BADGE_VARIANTS, STATUS } from "../utils/constants";

const schema = z.object({
  patient_id: z.coerce.number().min(1, "Patient required"),
  doctor_id: z.coerce.number().min(1, "Doctor required"),
  test_name: z.string().min(2, "Test name required"),
  result: z.string().optional(),
  status: z.enum(STATUS.lab),
});

export default function Lab() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const debouncedSearch = useDebounce(search, 300);
  const { data, isLoading, error, createLabOrder, updateLabOrder, creating, updating } = useLab({
    page: 1,
    limit: 200,
    search: debouncedSearch,
  });
  const patientsData = usePatients({ page: 1, limit: 200 })?.data?.items;
  const patients = useMemo(() => patientsData || [], [patientsData]);
  const doctorsData = useDoctors({ page: 1, limit: 200 })?.data?.items;
  const doctors = useMemo(() => doctorsData || [], [doctorsData]);
  const items = useMemo(() => data?.items || [], [data?.items]);
  const totalPages = Math.max(1, Math.ceil(items.length / 10));
  const pagedItems = useMemo(() => items.slice((page - 1) * 10, page * 10), [items, page]);

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { patient_id: "", doctor_id: "", test_name: "", result: "", status: "Pending" },
  });

  const saveOrder = async (values) => {
    const payload = { ...values, files: uploadedFiles };
    if (editing) {
      await updateLabOrder({ id: editing.id, payload });
    } else {
      await createLabOrder(payload);
    }
    setOpen(false);
    setEditing(null);
    setUploadedFiles([]);
    form.reset({ patient_id: "", doctor_id: "", test_name: "", result: "", status: "Pending" });
  };

  const handleDialogClose = (open) => {
    if (!open) {
      setEditing(null);
      setUploadedFiles([]);
      form.reset({ patient_id: "", doctor_id: "", test_name: "", result: "", status: "Pending" });
    }
    setOpen(open);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Lab</h1>
          <p className="text-sm text-slate-500">Track live lab orders and reports.</p>
        </div>
        <Button className="bg-sky-600 hover:bg-sky-700" onClick={() => setOpen(true)}>
          Add Lab Order
        </Button>
      </div>

      <Input
        placeholder="Search by patient, doctor, or test"
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          setPage(1);
        }}
      />

      {isLoading ? (
        <LoadingSkeleton rows={6} />
      ) : error ? (
        <EmptyState
          title="Lab data unavailable"
          description={error.message || "Unable to load lab orders."}
        />
      ) : pagedItems.length === 0 ? (
        <EmptyState title="No lab orders" description="Create the first lab order." />
      ) : (
        <div className="rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Doctor</TableHead>
                <TableHead>Test</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Result</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.patient_name}</TableCell>
                  <TableCell>{item.doctor_name}</TableCell>
                  <TableCell>{item.test_name}</TableCell>
                  <TableCell>
                    <Badge variant={BADGE_VARIANTS[item.status] || "secondary"}>{item.status}</Badge>
                  </TableCell>
                  <TableCell>{item.result || "-"}</TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditing(item);
                        form.reset({
                          patient_id: item.patient_id,
                          doctor_id: item.doctor_id,
                          test_name: item.test_name,
                          result: item.result || "",
                          status: item.status,
                        });
                        setOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      <Dialog open={open} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Update Lab Order" : "Create Lab Order"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-700">Patient</label>
              <Select value={String(form.watch("patient_id") || "")} onValueChange={(value) => form.setValue("patient_id", Number(value))}>
                <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                <SelectContent>
                  {patients.map((patient) => (
                    <SelectItem key={patient.id} value={String(patient.id)}>{patient.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Doctor</label>
              <Select value={String(form.watch("doctor_id") || "")} onValueChange={(value) => form.setValue("doctor_id", Number(value))}>
                <SelectTrigger><SelectValue placeholder="Select doctor" /></SelectTrigger>
                <SelectContent>
                  {doctors.map((doctor) => (
                    <SelectItem key={doctor.id} value={String(doctor.id)}>{doctor.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-slate-700">Test Name</label>
              <Input {...form.register("test_name")} placeholder="Enter test name" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Status</label>
              <Select value={form.watch("status")} onValueChange={(value) => form.setValue("status", value)}>
                <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                <SelectContent>
                  {STATUS.lab.map((status) => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-slate-700">Result</label>
              <Input {...form.register("result")} placeholder="Enter result summary" />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-slate-700">Lab Reports/Documents</label>
              <FileDropZone
                onFilesSelected={setUploadedFiles}
                multiple={true}
                title="Drop lab reports here, or click to browse"
                description="Supports: PDF, Images, Word, Text (Max 10MB each)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="bg-sky-600 hover:bg-sky-700" onClick={form.handleSubmit(saveOrder)} disabled={creating || updating}>
              {creating || updating ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

