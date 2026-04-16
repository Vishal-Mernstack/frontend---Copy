import { useCallback, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { UserPlus, Users, Shield, Mail, Phone, Calendar, Building2 } from "lucide-react";
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
import useStaff from "../hooks/useStaff";
import useDepartments from "../hooks/useDepartments";
import useUsers from "../hooks/useUsers";
import { format } from "date-fns";

const staffSchema = z.object({
  user_id: z.coerce.number().min(1, "User is required"),
  department_id: z.coerce.number().optional(),
  position: z.string().optional(),
  salary: z.coerce.number().optional(),
  join_date: z.string().optional(),
  status: z.string().default("Active"),
});

export default function Staff() {
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const { data, isLoading, error, createStaff, updateStaff, deleteStaff, isCreating, isUpdating } = useStaff({
    search,
    department_id: departmentFilter === "all" ? "" : departmentFilter,
    status: statusFilter === "all" ? "" : statusFilter,
    page,
    limit: 20,
  });

  const { data: deptData } = useDepartments({ limit: 100 });
  const { data: usersData } = useUsers({ role: "staff", limit: 200 });

  const staff = useMemo(() => data?.items || [], [data?.items]);
  const departments = deptData?.items || [];
  const users = usersData?.items || [];

  const filteredStaff = useMemo(() => staff, [staff]);

  const form = useForm({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      user_id: "",
      department_id: "",
      position: "",
      salary: 0,
      join_date: "",
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

  const handleEdit = useCallback((member) => {
    setEditing(member);
    form.reset({
      user_id: member.user_id || "",
      department_id: member.department_id || "",
      position: member.position || "",
      salary: member.salary || 0,
      join_date: member.join_date ? format(new Date(member.join_date), "yyyy-MM-dd") : "",
      status: member.status || "Active",
    });
    setOpen(true);
  }, [form]);

  const handleSubmit = async (values) => {
    if (editing) {
      await updateStaff({ id: editing.id, payload: values });
    } else {
      await createStaff(values);
    }
    setOpen(false);
    setEditing(null);
    form.reset();
  };

  const handleDelete = useCallback(async () => {
    if (!confirmDelete) return;
    await deleteStaff(confirmDelete.id);
    setConfirmDelete(null);
  }, [confirmDelete, deleteStaff]);

  const getStatusBadge = (status) => {
    const colors = {
      Active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
      Inactive: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400",
    };
    return colors[status] || colors.Active;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Staff Management</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Manage hospital staff and employees.</p>
        </div>
        <Button className="bg-sky-600 hover:bg-sky-700" onClick={() => setOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add Staff
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Input
          placeholder="Search staff..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="dark:bg-slate-800 dark:border-slate-700 dark:text-white"
        />
        <Select value={departmentFilter} onValueChange={(v) => { setDepartmentFilter(v); setPage(1); }}>
          <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map((dept) => (
              <SelectItem key={dept.id} value={String(dept.id)}>{dept.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700">
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
        <EmptyState title="Staff unavailable" description={error.message || "Unable to load staff."} />
      ) : filteredStaff.length === 0 ? (
        <EmptyState title="No staff found" description="Add staff members to get started." />
      ) : (
        <div className="rounded-lg border bg-white dark:bg-slate-900 dark:border-slate-700">
          <Table>
            <TableHeader>
              <TableRow className="dark:border-slate-700">
                <TableHead className="dark:text-slate-300">Employee</TableHead>
                <TableHead className="dark:text-slate-300">Code</TableHead>
                <TableHead className="dark:text-slate-300">Department</TableHead>
                <TableHead className="dark:text-slate-300">Position</TableHead>
                <TableHead className="dark:text-slate-300">Join Date</TableHead>
                <TableHead className="dark:text-slate-300">Status</TableHead>
                <TableHead className="dark:text-slate-300">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="dark:border-slate-700">
              {filteredStaff.map((member) => (
                <TableRow key={member.id} className="dark:border-slate-700">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300">
                        {(member.user_name || "S").slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium dark:text-white">{member.user_name || "Unknown"}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{member.user_email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="dark:text-slate-300">{member.employee_code}</TableCell>
                  <TableCell className="dark:text-slate-300">{member.department_name || "-"}</TableCell>
                  <TableCell className="dark:text-slate-300">{member.position || "-"}</TableCell>
                  <TableCell className="dark:text-slate-300">
                    {member.join_date ? format(new Date(member.join_date), "MMM d, yyyy") : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusBadge(member.status)}>{member.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(member)}>Edit</Button>
                      <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(member)}>Delete</Button>
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
            <DialogTitle>{editing ? "Edit Staff" : "Add New Staff"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <label className="text-sm font-medium dark:text-slate-200">User Account</label>
              <Select value={String(form.watch("user_id") || "")} onValueChange={(v) => form.setValue("user_id", Number(v))}>
                <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700">
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={String(user.id)}>{user.name} ({user.email})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium dark:text-slate-200">Department</label>
                <Select value={form.watch("department_id") ? String(form.watch("department_id")) : "none"} onValueChange={(v) => form.setValue("department_id", v === "none" ? null : Number(v))}>
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
                <label className="text-sm font-medium dark:text-slate-200">Position</label>
                <Input {...form.register("position")} placeholder="e.g. Nurse" className="dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium dark:text-slate-200">Salary</label>
                <Input type="number" {...form.register("salary")} className="dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
              </div>
              <div>
                <label className="text-sm font-medium dark:text-slate-200">Join Date</label>
                <Input type="date" {...form.register("join_date")} className="dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium dark:text-slate-200">Status</label>
              <Select value={form.watch("status")} onValueChange={(v) => form.setValue("status", v)}>
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
            <Button className="bg-sky-600 hover:bg-sky-700" onClick={form.handleSubmit(handleSubmit)} disabled={isCreating || isUpdating}>
              {isCreating || isUpdating ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        onOpenChange={(v) => !v && setConfirmDelete(null)}
        title="Delete Staff?"
        description="This will remove the staff member."
        confirmText="Delete"
        onConfirm={handleDelete}
      />
    </div>
  );
}