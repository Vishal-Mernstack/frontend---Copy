import { useCallback, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/table";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../components/ui/select";
import LoadingSkeleton from "../components/shared/LoadingSkeleton";
import ConfirmDialog from "../components/shared/ConfirmDialog";
import Pagination from "../components/shared/Pagination";
import EmptyState from "../components/shared/EmptyState";
import useDebounce from "../hooks/useDebounce";
import usePatients from "../hooks/usePatients";
import { BADGE_VARIANTS, STATUS } from "../utils/constants";
import { compareStrings } from "../utils/helpers";

const patientSchema = z.object({
  name: z.string().min(2, "Name is required"),
  age: z.coerce.number().min(0).max(120),
  gender: z.string().min(1, "Gender is required"),
  blood_type: z.string().min(1, "Blood type is required"),
  phone: z.string().min(8, "Phone is required"),
  email: z.string().email().optional().or(z.literal("")),
  status: z.string().min(1, "Status is required"),
});

/**
 * Patients page with CRUD operations.
 */
export default function Patients() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading, error, createPatient, updatePatient, deletePatient, creating, updating } = usePatients({
    page: 1,
    limit: 200,
    search: debouncedSearch,
    status: statusFilter === "all" ? "" : statusFilter,
  });

  const patients = useMemo(() => data?.items || [], [data?.items]);

  const sortedPatients = useMemo(() => {
    const list = [...patients];
    if (sortBy === "name") {
      list.sort((a, b) => compareStrings(a?.name, b?.name));
    } else if (sortBy === "status") {
      list.sort((a, b) => compareStrings(a?.status, b?.status));
    } else if (sortBy === "created") {
      list.sort((a, b) => new Date(b?.created_at || 0) - new Date(a?.created_at || 0));
    }
    return list;
  }, [patients, sortBy]);

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(sortedPatients.length / pageSize));
  const pagedPatients = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedPatients.slice(start, start + pageSize);
  }, [page, sortedPatients]);

  const form = useForm({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      name: "",
      age: 30,
      gender: "Male",
      blood_type: "O+",
      phone: "",
      email: "",
      status: "Active",
    },
  });

  const handleOpenChange = useCallback((value) => {
    setOpen(value);
    if (!value) {
      setEditing(null);
      form.reset();
    }
  }, [form]);

  const onSubmit = useCallback(async (values) => {
    if (editing) {
      await updatePatient({ id: editing.id, payload: values });
    } else {
      await createPatient(values);
    }
    handleOpenChange(false);
  }, [createPatient, editing, handleOpenChange, updatePatient]);

  const handleEdit = useCallback((patient) => {
    setEditing(patient);
    form.reset({
      name: patient?.name || "",
      age: patient?.age || 0,
      gender: patient?.gender || "",
      blood_type: patient?.blood_type || "",
      phone: patient?.phone || "",
      email: patient?.email || "",
      status: patient?.status || "Active",
    });
    setOpen(true);
  }, [form]);

  const handleDelete = useCallback(async () => {
    if (!confirmDelete) return;
    const deleted = confirmDelete;
    await deletePatient(deleted.id);
    setConfirmDelete(null);
    toast("Patient deleted", {
      action: {
        label: "Undo",
        onClick: async () => {
          await createPatient({
            name: deleted.name,
            age: deleted.age,
            gender: deleted.gender,
            blood_type: deleted.blood_type,
            phone: deleted.phone,
            email: deleted.email,
            status: deleted.status,
          });
        },
      },
    });
  }, [confirmDelete, createPatient, deletePatient]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Patients</h1>
          <p className="text-sm text-slate-500">Manage patient records and care status</p>
        </div>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button>Add New Patient</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Patient" : "Add New Patient"}</DialogTitle>
            </DialogHeader>
            <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Name</label>
                <Input {...form.register("name")} placeholder="Patient name" />
                {form.formState.errors.name && (
                  <span className="text-xs text-rose-600">{form.formState.errors.name.message}</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Age</label>
                  <Input type="number" {...form.register("age")} />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Gender</label>
                  <Select value={form.watch("gender")} onValueChange={(value) => form.setValue("gender", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Blood Type</label>
                  <Input {...form.register("blood_type")} placeholder="O+" />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Phone</label>
                  <Input {...form.register("phone")} placeholder="Phone number" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input type="email" {...form.register("email")} placeholder="Email" />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select value={form.watch("status")} onValueChange={(value) => form.setValue("status", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS.patient.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={creating || updating}>
                  {creating || updating ? "Saving..." : "Save Patient"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex w-full max-w-md items-center gap-2">
          <Input
            placeholder="Search by name, email, or phone"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="flex w-full flex-wrap gap-3 lg:w-auto">
          <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value); setPage(1); }}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {STATUS.patient.map((status) => (
                <SelectItem key={status} value={status}>{status}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="status">Status</SelectItem>
              <SelectItem value="created">Recently Added</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        {isLoading ? (
          <div className="p-6">
            <LoadingSkeleton rows={6} />
          </div>
        ) : error ? (
          <div className="p-6">
            <EmptyState
              title="Patients unavailable"
              description={error.message || "Unable to load patients from the server."}
            />
          </div>
        ) : pagedPatients.length === 0 ? (
          <div className="p-6">
            <EmptyState title="No patients" message="Try adjusting filters or add a new patient." />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Age</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead>Blood</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedPatients.map((patient) => (
                <TableRow key={patient.id}>
                  <TableCell>
                    <Link to={`/patients/${patient.id}`} className="font-medium text-slate-900 hover:text-sky-600">
                      {patient?.name}
                    </Link>
                    <p className="text-xs text-slate-500">{patient?.email || "-"}</p>
                  </TableCell>
                  <TableCell>{patient?.age ?? "-"}</TableCell>
                  <TableCell>{patient?.gender ?? "-"}</TableCell>
                  <TableCell>{patient?.blood_type ?? "-"}</TableCell>
                  <TableCell>{patient?.phone ?? "-"}</TableCell>
                  <TableCell>
                    <Badge variant={BADGE_VARIANTS[patient?.status] || "default"}>{patient?.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(patient)}>
                        Edit
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(patient)}>
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Delete patient"
        description="This action cannot be undone."
        confirmLabel="Delete"
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}

Patients.propTypes = {
  initialPage: PropTypes.number,
};

