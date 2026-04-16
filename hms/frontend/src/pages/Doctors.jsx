import { useCallback, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Briefcase, LayoutGrid, List, Star } from "lucide-react";
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
import useDoctors from "../hooks/useDoctors";
import { BADGE_VARIANTS } from "../utils/constants";
import useLocalStorage from "../hooks/useLocalStorage";

const schema = z.object({
  name: z.string().min(2, "Required"),
  specialization: z.string().min(1, "Required"),
  qualification: z.string().optional(),
  experience: z.coerce.number().min(0).max(50).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  availability: z.string().min(1, "Required"),
  rating: z.coerce.number().min(0).max(5).optional(),
  bio: z.string().optional(),
});

const specializations = [
  "All",
  "Cardiology",
  "Neurology",
  "Orthopedics",
  "Pediatrics",
  "General Medicine",
  "Dermatology",
  "Oncology",
  "Gynecology",
  "ENT",
  "Psychiatry",
];

const availabilityOptions = ["Available", "In Surgery", "On Leave"];
const getRatingValue = (doctor) => Number(doctor?.rating ?? 0);

export default function Doctors() {
  const [search, setSearch] = useState("");
  const [specializationFilter, setSpecializationFilter] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [viewMode, setViewMode] = useLocalStorage("doctor_view", "grid");

  const debouncedSearch = useDebounce(search, 300);
  const {
    data,
    isLoading,
    error,
    createDoctor,
    updateDoctor,
    deleteDoctor,
    creating,
    updating,
  } = useDoctors({ page: 1, limit: 200, search: debouncedSearch });

  const doctors = useMemo(() => data?.items || [], [data?.items]);

  const filteredDoctors = useMemo(() => {
    let items = [...doctors];
    if (specializationFilter !== "all") {
      items = items.filter(
        (doc) => doc?.specialization === specializationFilter
      );
    }
    if (availabilityFilter !== "all") {
      items = items.filter((doc) => doc?.availability === availabilityFilter);
    }
    if (sortBy === "name") {
      items.sort((a, b) => (a?.name || "").localeCompare(b?.name || ""));
    }
    if (sortBy === "experience") {
      items.sort((a, b) => (b?.experience || 0) - (a?.experience || 0));
    }
    if (sortBy === "rating") {
      items.sort((a, b) => getRatingValue(b) - getRatingValue(a));
    }
    return items;
  }, [doctors, specializationFilter, availabilityFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredDoctors.length / 10));
  const pagedDoctors = filteredDoctors.slice((page - 1) * 10, page * 10);

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      specialization: "",
      qualification: "",
      experience: 0,
      phone: "",
      email: "",
      availability: "Available",
      rating: 0,
      bio: "",
    },
  });

  const handleOpenChange = useCallback(
    (value) => {
      setOpen(value);
      if (!value) {
        setEditing(null);
        form.reset();
      }
    },
    [form]
  );

  const handleEdit = useCallback(
    (doctor) => {
      setEditing(doctor);
      form.reset({
        name: doctor?.name || "",
        specialization: doctor?.specialization || "",
        qualification: doctor?.qualification || "",
        experience: doctor?.experience || 0,
        phone: doctor?.phone || "",
        email: doctor?.email || "",
        availability: doctor?.availability || "Available",
        rating: getRatingValue(doctor),
        bio: doctor?.bio || "",
      });
      setOpen(true);
    },
    [form]
  );

  const handleSubmit = async (values) => {
    if (editing) {
      await updateDoctor({ id: editing?.id, payload: values });
    } else {
      await createDoctor(values);
    }
    setOpen(false);
    setEditing(null);
    form.reset();
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    await deleteDoctor(confirmDelete?.id);
    setConfirmDelete(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Doctors</h1>
          <p className="text-sm text-slate-500">Manage doctor profiles and availability.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            onClick={() => setViewMode("grid")}
          >
            <LayoutGrid className="mr-2 h-4 w-4" />
            Grid
          </Button>
          <Button
            variant={viewMode === "table" ? "default" : "outline"}
            onClick={() => setViewMode("table")}
          >
            <List className="mr-2 h-4 w-4" />
            Table
          </Button>
          <Button className="bg-sky-600 hover:bg-sky-700" onClick={() => setOpen(true)}>
            Add New Doctor
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Input
          placeholder="Search doctors..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Select
          value={specializationFilter}
          onValueChange={(value) => {
            setSpecializationFilter(value);
            setPage(1);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Specialization" />
          </SelectTrigger>
          <SelectContent>
            {specializations.map((item) => (
              <SelectItem key={item} value={item === "All" ? "all" : item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={availabilityFilter}
          onValueChange={(value) => {
            setAvailabilityFilter(value);
            setPage(1);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Availability" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {availabilityOptions.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger>
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="experience">Experience</SelectItem>
            <SelectItem value="rating">Rating</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <LoadingSkeleton rows={6} />
      ) : error ? (
        <EmptyState
          title="Doctors unavailable"
          description={error.message || "Unable to load doctor records."}
        />
      ) : filteredDoctors.length === 0 ? (
        <EmptyState title="No doctors found" description="Try adjusting your filters." />
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {pagedDoctors.map((doctor) => (
            <div key={doctor?.id} className="rounded-lg border bg-white p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-600 text-white">
                  {(doctor?.name || "D").slice(0, 1)}
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{doctor?.name}</p>
                  <p className="text-sm text-slate-500">{doctor?.specialization}</p>
                </div>
              </div>
              <div className="my-3 border-t" />
              <div className="space-y-2 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-slate-400" />
                  {doctor?.experience || 0} years experience
                </div>
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-400" />
                  {getRatingValue(doctor).toFixed(1)} / 5.0
                </div>
              </div>
              <div className="mt-3">
                <Badge variant={BADGE_VARIANTS[doctor?.availability] || "secondary"}>
                  {doctor?.availability || "Available"}
                </Badge>
              </div>
              <div className="mt-4 flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleEdit(doctor)}
                >
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => setConfirmDelete(doctor)}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Specialization</TableHead>
                <TableHead>Experience</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Availability</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedDoctors.map((doctor) => (
                <TableRow key={doctor?.id}>
                  <TableCell className="font-medium">{doctor?.name}</TableCell>
                  <TableCell>{doctor?.specialization}</TableCell>
                  <TableCell>{doctor?.experience || 0} yrs</TableCell>
                  <TableCell>{getRatingValue(doctor).toFixed(1)}</TableCell>
                  <TableCell>
                    <Badge variant={BADGE_VARIANTS[doctor?.availability] || "secondary"}>
                      {doctor?.availability || "Available"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => handleEdit(doctor)}>
                        Edit
                      </Button>
                      <Button variant="destructive" onClick={() => setConfirmDelete(doctor)}>
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Doctor" : "Add New Doctor"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-700">Name</label>
              <Input placeholder="Doctor name" {...form.register("name")} />
              {form.formState.errors.name ? (
                <p className="mt-1 text-xs text-rose-500">
                  {form.formState.errors.name.message}
                </p>
              ) : null}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Specialization</label>
              <Select
                value={form.watch("specialization")}
                onValueChange={(value) => form.setValue("specialization", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select specialization" />
                </SelectTrigger>
                <SelectContent>
                  {specializations
                    .filter((item) => item !== "All")
                    .map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {form.formState.errors.specialization ? (
                <p className="mt-1 text-xs text-rose-500">
                  {form.formState.errors.specialization.message}
                </p>
              ) : null}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Qualification</label>
              <Input placeholder="Qualification" {...form.register("qualification")} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Experience</label>
              <Input type="number" min={0} max={50} {...form.register("experience")} />
              {form.formState.errors.experience ? (
                <p className="mt-1 text-xs text-rose-500">
                  {form.formState.errors.experience.message}
                </p>
              ) : null}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Phone</label>
              <Input placeholder="Phone" {...form.register("phone")} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Email</label>
              <Input type="email" placeholder="Email" {...form.register("email")} />
              {form.formState.errors.email ? (
                <p className="mt-1 text-xs text-rose-500">
                  {form.formState.errors.email.message}
                </p>
              ) : null}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Availability</label>
              <Select
                value={form.watch("availability")}
                onValueChange={(value) => form.setValue("availability", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select availability" />
                </SelectTrigger>
                <SelectContent>
                  {availabilityOptions.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Rating</label>
              <Input type="number" step="0.1" min={0} max={5} {...form.register("rating")} />
              {form.formState.errors.rating ? (
                <p className="mt-1 text-xs text-rose-500">
                  {form.formState.errors.rating.message}
                </p>
              ) : null}
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-slate-700">Bio</label>
              <Input placeholder="Short bio" {...form.register("bio")} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
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

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        onOpenChange={(value) => !value && setConfirmDelete(null)}
        title="Deactivate this doctor?"
        description="This will deactivate the doctor record."
        confirmText="Deactivate"
        onConfirm={handleDelete}
      />
    </div>
  );
}

