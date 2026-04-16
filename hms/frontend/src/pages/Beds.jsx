import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Bed, Plus } from "lucide-react";
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
import useHospital from "../hooks/useHospital";
import useDepartments from "../hooks/useDepartments";

const bedSchema = z.object({
  bed_number: z.string().min(1, "Bed number required"),
  ward_type: z.string().min(1, "Ward type required"),
  department_id: z.coerce.number().optional(),
  status: z.string().default("Available"),
  price_per_day: z.coerce.number().optional(),
});

const wardTypes = ["General", "ICU", "Emergency", "Private", "Semi-Private", "Pediatric", "Maternity", "Surgical"];

export default function Beds() {
  const [search, setSearch] = useState("");
  const [wardFilter, setWardFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const { useBeds, createBed, updateBed, deleteBed, isCreating, isUpdating } = useHospital();
  const { data, isLoading, error } = useBeds({ 
    ward_type: wardFilter === "all" ? undefined : wardFilter, 
    status: statusFilter === "all" ? undefined : statusFilter, 
    page, 
    limit: 20 
  });
  const { data: deptData } = useDepartments({ limit: 100 });

  const beds = data?.items || [];
  const departments = deptData?.items || [];

  const form = useForm({
    resolver: zodResolver(bedSchema),
    defaultValues: {
      bed_number: "",
      ward_type: "",
      department_id: "",
      status: "Available",
      price_per_day: 0,
    },
  });

  const handleOpenChange = useCallback((value) => {
    setOpen(value);
    if (!value) {
      setEditing(null);
      form.reset();
    }
  }, [form]);

  const handleEdit = useCallback((bed) => {
    setEditing(bed);
    form.reset({
      bed_number: bed.bed_number || "",
      ward_type: bed.ward_type || "",
      department_id: bed.department_id || "",
      status: bed.status || "Available",
      price_per_day: bed.price_per_day || 0,
    });
    setOpen(true);
  }, [form]);

  const handleSubmit = async (values) => {
    if (editing) {
      await updateBed({ id: editing.id, payload: values });
    } else {
      await createBed(values);
    }
    setOpen(false);
    setEditing(null);
    form.reset();
  };

  const handleDelete = useCallback(async () => {
    if (!confirmDelete) return;
    await deleteBed(confirmDelete.id);
    setConfirmDelete(null);
  }, [confirmDelete, deleteBed]);

  const getStatusBadge = (status) => {
    const colors = {
      Available: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
      Occupied: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
      Maintenance: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400",
    };
    return colors[status] || colors.Available;
  };

  const getWardIcon = (ward) => {
    return <Bed className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Bed Management</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Manage hospital beds and ward allocation.</p>
        </div>
        <Button className="bg-sky-600 hover:bg-sky-700" onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Bed
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Select value={wardFilter} onValueChange={(v) => { setWardFilter(v); setPage(1); }}>
          <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700">
            <SelectValue placeholder="Ward Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Wards</SelectItem>
            {wardTypes.map((type) => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Available">Available</SelectItem>
            <SelectItem value="Occupied">Occupied</SelectItem>
            <SelectItem value="Maintenance">Maintenance</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <LoadingSkeleton rows={6} />
      ) : error ? (
        <EmptyState title="Beds unavailable" description={error.message || "Unable to load beds."} />
      ) : beds.length === 0 ? (
        <EmptyState title="No beds found" description="Add beds to get started." />
      ) : (
        <div className="rounded-lg border bg-white dark:bg-slate-900 dark:border-slate-700">
          <Table>
            <TableHeader>
              <TableRow className="dark:border-slate-700">
                <TableHead className="dark:text-slate-300">Bed Number</TableHead>
                <TableHead className="dark:text-slate-300">Ward Type</TableHead>
                <TableHead className="dark:text-slate-300">Department</TableHead>
                <TableHead className="dark:text-slate-300">Price/Day</TableHead>
                <TableHead className="dark:text-slate-300">Status</TableHead>
                <TableHead className="dark:text-slate-300">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="dark:border-slate-700">
              {beds.map((bed) => (
                <TableRow key={bed.id} className="dark:border-slate-700">
                  <TableCell className="font-medium dark:text-white">{bed.bed_number}</TableCell>
                  <TableCell className="dark:text-slate-300">
                    <div className="flex items-center gap-2">
                      {getWardIcon(bed.ward_type)}
                      {bed.ward_type}
                    </div>
                  </TableCell>
                  <TableCell className="dark:text-slate-300">{bed.department_name || "-"}</TableCell>
                  <TableCell className="dark:text-slate-300">₹{bed.price_per_day || 0}</TableCell>
                  <TableCell>
                    <Badge className={getStatusBadge(bed.status)}>{bed.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(bed)}>Edit</Button>
                      <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(bed)}>Delete</Button>
                    </div>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Bed" : "Add New Bed"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium dark:text-slate-200">Bed Number</label>
                <Input {...form.register("bed_number")} placeholder="e.g. B-101" className="dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
              </div>
              <div>
                <label className="text-sm font-medium dark:text-slate-200">Ward Type</label>
                <Select value={form.watch("ward_type")} onValueChange={(v) => form.setValue("ward_type", v)}>
                  <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700">
                    <SelectValue placeholder="Select ward" />
                  </SelectTrigger>
                  <SelectContent>
                    {wardTypes.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium dark:text-slate-200">Department</label>
                <Select value={form.watch("department_id") ? String(form.watch("department_id")) : "none"} onValueChange={(v) => form.setValue("department_id", v !== "none" ? Number(v) : null)}>
                  <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={String(dept.id)}>{dept.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium dark:text-slate-200">Price per Day</label>
                <Input type="number" {...form.register("price_per_day")} className="dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium dark:text-slate-200">Status</label>
              <Select value={form.watch("status")} onValueChange={(v) => form.setValue("status", v)}>
                <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Available">Available</SelectItem>
                  <SelectItem value="Occupied">Occupied</SelectItem>
                  <SelectItem value="Maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
            <Button className="bg-sky-600 hover:bg-sky-700" onClick={form.handleSubmit(handleSubmit)} disabled={isCreating || isUpdating}>
              {isCreating || isUpdating ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        onOpenChange={(v) => !v && setConfirmDelete(null)}
        title="Delete Bed?"
        description="This will remove the bed."
        confirmText="Delete"
        onConfirm={handleDelete}
      />
    </div>
  );
}