import { useCallback, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Building2, 
  Plus, 
  Search, 
  Filter, 
  Edit2, 
  Trash2, 
  Eye,
  CheckCircle,
  XCircle,
  Users,
  Bed,
  Activity,
  Stethoscope,
  X,
  AlertTriangle
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Card, CardContent } from "../components/ui/card";
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
import { Textarea } from "../components/ui/textarea";
import LoadingSkeleton from "../components/shared/LoadingSkeleton";
import EmptyState from "../components/shared/EmptyState";
import ConfirmDialog from "../components/shared/ConfirmDialog";
import Pagination from "../components/shared/Pagination";
import useDepartments from "../hooks/useDepartments";
import useDoctors from "../hooks/useDoctors";

const schema = z.object({
  name: z.string().min(2, "Department name required"),
  description: z.string().optional(),
  head_doctor_id: z.coerce.number().optional(),
  status: z.string().default("Active"),
});

export default function Departments() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const { 
    data, 
    isLoading, 
    error, 
    createDepartment, 
    updateDepartment, 
    deleteDepartment,
    isCreating,
    isUpdating 
  } = useDepartments({
    search,
    status: statusFilter === "all" ? "" : statusFilter,
    page,
    limit: 20,
  });

  const { data: doctorsData } = useDoctors({ page: 1, limit: 200 });

  const departments = data?.items || [];
  const stats = data?.stats || {};
  const doctors = doctorsData?.items || [];

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      description: "",
      head_doctor_id: "",
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

  const handleEdit = useCallback((dept) => {
    setEditing(dept);
    form.reset({
      name: dept.name || "",
      description: dept.description || "",
      head_doctor_id: dept.head_doctor_id || "",
      status: dept.status || "Active",
    });
    setOpen(true);
  }, [form]);

  const handleView = useCallback((dept) => {
    setViewing(dept);
  }, []);

  const handleSubmit = async (values) => {
    try {
      if (editing) {
        await updateDepartment({ id: editing.id, payload: values });
      } else {
        await createDepartment(values);
      }
      handleOpenChange(false);
    } catch (err) {
      console.error("Error saving department:", err);
    }
  };

  const handleDelete = useCallback(async () => {
    if (!confirmDelete) return;
    await deleteDepartment(confirmDelete.id);
    setConfirmDelete(null);
  }, [confirmDelete, deleteDepartment]);

  const getStatusBadge = (status) => {
    const styles = {
      Active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200",
      Inactive: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border-slate-200",
    };
    return styles[status] || styles.Inactive;
  };

  const formatHeadDoctor = (dept) => {
    if (dept.head_doctor_name) {
      return (
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-sky-100 dark:bg-sky-900/50 flex items-center justify-center">
            <Stethoscope className="h-4 w-4 text-sky-600 dark:text-sky-400" />
          </div>
          <div>
            <p className="font-medium text-slate-900 dark:text-white">{dept.head_doctor_name}</p>
            {dept.head_doctor_specialization && (
              <p className="text-xs text-slate-500 dark:text-slate-400">{dept.head_doctor_specialization}</p>
            )}
          </div>
        </div>
      );
    }
    return <span className="text-slate-400 italic">Not assigned</span>;
  };

  const occupancyRate = useMemo(() => {
    const total = parseInt(stats.total_beds) || 0;
    const occupied = parseInt(stats.occupied_beds) || 0;
    if (total === 0) return 0;
    return Math.round((occupied / total) * 100);
  }, [stats]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="h-6 w-6 text-sky-600" />
            Departments
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Manage hospital departments and units.</p>
        </div>
        <Button className="bg-sky-600 hover:bg-sky-700 shadow-sm" onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Department
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-sky-50 to-white dark:from-sky-900/20 dark:to-slate-900 border-sky-200 dark:border-sky-800/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-sky-100 dark:bg-sky-900/50 p-2.5">
                <Building2 className="h-5 w-5 text-sky-600 dark:text-sky-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{data?.pagination?.total || 0}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Total Departments</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-900/20 dark:to-slate-900 border-emerald-200 dark:border-emerald-800/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-emerald-100 dark:bg-emerald-900/50 p-2.5">
                <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{parseInt(stats.active_count) || 0}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Active Departments</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-white dark:from-purple-900/20 dark:to-slate-900 border-purple-200 dark:border-purple-800/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-purple-100 dark:bg-purple-900/50 p-2.5">
                <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{parseInt(stats.total_doctors) || 0}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Total Doctors</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-white dark:from-amber-900/20 dark:to-slate-900 border-amber-200 dark:border-amber-800/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-amber-100 dark:bg-amber-900/50 p-2.5">
                <Activity className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{occupancyRate}%</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Bed Occupancy</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search by name or description..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[160px] dark:bg-slate-800 dark:border-slate-700">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <LoadingSkeleton rows={6} />
      ) : error ? (
        <EmptyState title="Departments unavailable" description={error.message || "Unable to load departments."} />
      ) : departments.length === 0 ? (
        <EmptyState 
          title="No departments found" 
          description="Create your first department to organize your hospital."
          action={
            <Button className="bg-sky-600 hover:bg-sky-700" onClick={() => setOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Department
            </Button>
          }
        />
      ) : (
        <div className="rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-700 overflow-hidden shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <TableHead className="dark:text-slate-300 font-semibold">Department</TableHead>
                <TableHead className="dark:text-slate-300 font-semibold">Head Doctor</TableHead>
                <TableHead className="dark:text-slate-300 font-semibold text-center">Doctors</TableHead>
                <TableHead className="dark:text-slate-300 font-semibold text-center">Beds</TableHead>
                <TableHead className="dark:text-slate-300 font-semibold">Status</TableHead>
                <TableHead className="dark:text-slate-300 font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="dark:border-slate-700">
              {departments.map((dept) => (
                <TableRow 
                  key={dept.id} 
                  className="dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <TableCell>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">{dept.name}</p>
                      {dept.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">{dept.description}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="dark:text-slate-300">
                    {formatHeadDoctor(dept)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800">
                      <Users className="h-3 w-3 mr-1" />
                      {parseInt(dept.doctor_count) || 0}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800">
                      <Bed className="h-3 w-3 mr-1" />
                      {parseInt(dept.bed_count) || 0}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={`${getStatusBadge(dept.status)} border`}>
                      {dept.status === "Active" ? (
                        <CheckCircle className="h-3 w-3 mr-1" />
                      ) : (
                        <XCircle className="h-3 w-3 mr-1" />
                      )}
                      {dept.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleView(dept)}
                        className="h-8 w-8 p-0 text-slate-500 hover:text-sky-600"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleEdit(dept)}
                        className="h-8 w-8 p-0 text-slate-500 hover:text-blue-600"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setConfirmDelete(dept)}
                        className="h-8 w-8 p-0 text-slate-500 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-sky-600" />
              {editing ? "Edit Department" : "Add New Department"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Department Name *</label>
              <Input 
                {...form.register("name")} 
                placeholder="e.g. Cardiology"
                className="dark:bg-slate-800 dark:border-slate-700 dark:text-white" 
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Description</label>
              <Textarea 
                {...form.register("description")} 
                placeholder="Brief description of the department..."
                rows={3}
                className="dark:bg-slate-800 dark:border-slate-700 dark:text-white" 
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Head of Department</label>
              <Select 
                value={form.watch("head_doctor_id") ? String(form.watch("head_doctor_id")) : "none"} 
                onValueChange={(v) => form.setValue("head_doctor_id", v === "none" ? null : Number(v))}
              >
                <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700">
                  <SelectValue placeholder="Select doctor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {doctors.map((doctor) => (
                    <SelectItem key={doctor.id} value={String(doctor.id)}>
                      {doctor.name} - {doctor.specialization}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Status</label>
              <Select 
                value={form.watch("status")} 
                onValueChange={(v) => form.setValue("status", v)}
              >
                <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
            <Button 
              className="bg-sky-600 hover:bg-sky-700" 
              onClick={form.handleSubmit(handleSubmit)} 
              disabled={isCreating || isUpdating}
            >
              {isCreating || isUpdating ? "Saving..." : editing ? "Update Department" : "Create Department"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewing} onOpenChange={() => setViewing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-sky-600" />
              {viewing?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Status</p>
                <Badge className={getStatusBadge(viewing?.status)}>
                  {viewing?.status}
                </Badge>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Doctors</p>
                <p className="font-semibold text-slate-900 dark:text-white">{parseInt(viewing?.doctor_count) || 0}</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Beds</p>
                <p className="font-semibold text-slate-900 dark:text-white">{parseInt(viewing?.bed_count) || 0}</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Department Head</p>
                <p className="font-medium text-slate-900 dark:text-white text-sm">
                  {viewing?.head_doctor_name || "Not assigned"}
                </p>
              </div>
            </div>
            {viewing?.description && (
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Description</p>
                <p className="text-sm text-slate-700 dark:text-slate-300">{viewing.description}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewing(null)}>Close</Button>
            <Button variant="outline" onClick={() => { setViewing(null); handleEdit(viewing); }}>
              <Edit2 className="h-4 w-4 mr-2" />
              Edit Department
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        onOpenChange={(v) => !v && setConfirmDelete(null)}
        title="Delete Department?"
        description={
          <div className="space-y-2">
            <p>This will permanently delete <strong>{confirmDelete?.name}</strong>.</p>
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-sm">
              <AlertTriangle className="h-4 w-4" />
              <span>{parseInt(confirmDelete?.doctor_count) || 0} doctors and {parseInt(confirmDelete?.bed_count) || 0} beds may be affected.</span>
            </div>
          </div>
        }
        confirmText="Delete"
        onConfirm={handleDelete}
      />
    </div>
  );
}
