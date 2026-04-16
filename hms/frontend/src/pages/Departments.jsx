import { useCallback, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Building2 } from "lucide-react";
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
import useLocalStorage from "../hooks/useLocalStorage";

const schema = z.object({
  name: z.string().min(2, "Department name required"),
  code: z.string().min(2, "Code required"),
  description: z.string().optional(),
  head_of_department: z.string().optional(),
  status: z.string().default("Active"),
});

const mockDepartments = [
  { id: 1, name: "Cardiology", code: "CARD", description: "Heart and cardiovascular care", head: "Dr. Sarah Johnson", status: "Active", doctors: 5 },
  { id: 2, name: "Neurology", code: "NEUR", description: "Brain and nervous system", head: "Dr. Michael Chen", status: "Active", doctors: 4 },
  { id: 3, name: "Orthopedics", code: "ORTH", description: "Bones and joints", head: "Dr. James Wilson", status: "Active", doctors: 6 },
  { id: 4, name: "Pediatrics", code: "PED", description: "Child healthcare", head: "Dr. Emily Brown", status: "Active", doctors: 4 },
  { id: 5, name: "Oncology", code: "ONCO", description: "Cancer treatment", head: "Dr. Robert Lee", status: "Active", doctors: 3 },
  { id: 6, name: "Dermatology", code: "DERM", description: "Skin care", head: "Dr. Lisa Anderson", status: "Active", doctors: 2 },
];

export default function Departments() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [departments, setDepartments] = useLocalStorage("departments", mockDepartments);

  const filteredDepartments = useMemo(() => {
    let items = [...departments];
    if (search) {
      const s = search.toLowerCase();
      items = items.filter(d => d.name.toLowerCase().includes(s) || d.code.toLowerCase().includes(s));
    }
    if (statusFilter !== "all") {
      items = items.filter(d => d.status === statusFilter);
    }
    return items;
  }, [departments, search, statusFilter]);

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filteredDepartments.length / pageSize));
  const pagedDepartments = filteredDepartments.slice((page - 1) * pageSize, page * pageSize);

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      code: "",
      description: "",
      head_of_department: "",
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
      code: dept.code || "",
      description: dept.description || "",
      head_of_department: dept.head || "",
      status: dept.status || "Active",
    });
    setOpen(true);
  }, [form]);

  const handleSubmit = async (values) => {
    if (editing) {
      setDepartments(prev => prev.map(d => d.id === editing.id ? { ...d, ...values, head: values.head_of_department } : d));
    } else {
      setDepartments(prev => [...prev, { id: Date.now(), ...values, head: values.head_of_department, doctors: 0 }]);
    }
    setOpen(false);
    setEditing(null);
    form.reset();
  };

  const handleDelete = useCallback(() => {
    if (!confirmDelete) return;
    setDepartments(prev => prev.filter(d => d.id !== confirmDelete.id));
    setConfirmDelete(null);
  }, [confirmDelete, setDepartments]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Departments</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Manage hospital departments and units.</p>
        </div>
        <Button className="bg-sky-600 hover:bg-sky-700" onClick={() => setOpen(true)}>
          <Building2 className="mr-2 h-4 w-4" />
          Add Department
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Input
          placeholder="Search departments..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="dark:bg-slate-800 dark:border-slate-700 dark:text-white"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredDepartments.length === 0 ? (
        <EmptyState title="No departments" description="Add a department to get started." />
      ) : (
        <div className="rounded-lg border bg-white dark:bg-slate-900 dark:border-slate-700">
          <Table>
            <TableHeader>
              <TableRow className="dark:border-slate-700">
                <TableHead className="dark:text-slate-300">Name</TableHead>
                <TableHead className="dark:text-slate-300">Code</TableHead>
                <TableHead className="dark:text-slate-300">Head</TableHead>
                <TableHead className="dark:text-slate-300">Doctors</TableHead>
                <TableHead className="dark:text-slate-300">Status</TableHead>
                <TableHead className="dark:text-slate-300">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="dark:border-slate-700">
              {pagedDepartments.map((dept) => (
                <TableRow key={dept.id} className="dark:border-slate-700">
                  <TableCell className="font-medium dark:text-white">{dept.name}</TableCell>
                  <TableCell className="dark:text-slate-300">{dept.code}</TableCell>
                  <TableCell className="dark:text-slate-300">{dept.head || "-"}</TableCell>
                  <TableCell className="dark:text-slate-300">{dept.doctors}</TableCell>
                  <TableCell>
                    <Badge variant={dept.status === "Active" ? "default" : "secondary"}>
                      {dept.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(dept)}>
                        Edit
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(dept)}>
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Department" : "Add New Department"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <label className="text-sm font-medium dark:text-slate-200">Department Name</label>
              <Input {...form.register("name")} placeholder="e.g. Cardiology" className="dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
            </div>
            <div>
              <label className="text-sm font-medium dark:text-slate-200">Code</label>
              <Input {...form.register("code")} placeholder="e.g. CARD" className="dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
            </div>
            <div>
              <label className="text-sm font-medium dark:text-slate-200">Head of Department</label>
              <Input {...form.register("head_of_department")} placeholder="Dr. Name" className="dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
            </div>
            <div>
              <label className="text-sm font-medium dark:text-slate-200">Description</label>
              <Input {...form.register("description")} placeholder="Description" className="dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
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
            <Button className="bg-sky-600 hover:bg-sky-700" onClick={form.handleSubmit(handleSubmit)}>
              {editing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        onOpenChange={(v) => !v && setConfirmDelete(null)}
        title="Delete Department?"
        description="This action cannot be undone."
        confirmText="Delete"
        onConfirm={handleDelete}
      />
    </div>
  );
}