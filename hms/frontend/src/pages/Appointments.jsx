import { useCallback, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { CalendarDays, List, Stethoscope } from "lucide-react";
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
import LoadingSkeleton from "../components/shared/LoadingSkeleton";
import EmptyState from "../components/shared/EmptyState";
import ConfirmDialog from "../components/shared/ConfirmDialog";
import Pagination from "../components/shared/Pagination";
import useDebounce from "../hooks/useDebounce";
import useAppointments from "../hooks/useAppointments";
import usePatients from "../hooks/usePatients";
import useDoctors from "../hooks/useDoctors";
import { BADGE_VARIANTS } from "../utils/constants";
import { formatDate, formatDateTime } from "../utils/helpers";
import useLocalStorage from "../hooks/useLocalStorage";

const schema = z.object({
  patient_id: z.coerce.number().min(1, "Patient required"),
  doctor_id: z.coerce.number().min(1, "Doctor required"),
  appointment_date: z.string().min(1, "Date required"),
  duration: z.coerce.number().default(30),
  type: z.string().min(1, "Type required"),
  status: z.string().min(1, "Status required"),
  symptoms: z.string().optional(),
  notes: z.string().optional(),
  prescription: z.string().optional(),
  follow_up_date: z.string().optional(),
});

const types = [
  "Consultation",
  "Follow-up",
  "Emergency",
  "Routine Check",
  "Diagnostic",
  "Therapy",
];

const durations = [15, 30, 45, 60];

const statusOrder = ["Scheduled", "Completed", "Cancelled"];

export default function Appointments() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [quickFilter, setQuickFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(new Date());
  const [viewMode, setViewMode] = useLocalStorage("appt_view", "list");
  const [patientSearch, setPatientSearch] = useState("");

  const debouncedSearch = useDebounce(search, 300);
  const {
    data,
    isLoading,
    error,
    createAppointment,
    updateAppointment,
    deleteAppointment,
    creating,
    updating,
  } = useAppointments({ page: 1, limit: 200, search: debouncedSearch });

  const patientsData = usePatients({ page: 1, limit: 200 })?.data?.items;
  const patients = useMemo(() => patientsData || [], [patientsData]);
  const doctorsData = useDoctors({ page: 1, limit: 200 })?.data?.items;
  const doctors = useMemo(() => doctorsData || [], [doctorsData]);

  const appointments = useMemo(() => data?.items || [], [data?.items]);

  const filteredAppointments = useMemo(() => {
    let items = [...appointments];
    if (statusFilter !== "all") {
      items = items.filter((appt) => appt?.status === statusFilter);
    }
    if (dateFilter) {
      items = items.filter((appt) => {
        const date = appt?.appointment_date
          ? format(parseISO(appt.appointment_date), "yyyy-MM-dd")
          : "";
        return date === dateFilter;
      });
    }
    if (quickFilter !== "all") {
      const today = new Date();
      if (quickFilter === "today") {
        items = items.filter((appt) =>
          isSameDay(parseISO(appt?.appointment_date || new Date().toISOString()), today)
        );
      }
      if (quickFilter === "week") {
        const start = startOfWeek(today, { weekStartsOn: 0 });
        const end = endOfWeek(today, { weekStartsOn: 0 });
        items = items.filter((appt) => {
          const date = parseISO(appt?.appointment_date || new Date().toISOString());
          return date >= start && date <= end;
        });
      }
      if (quickFilter === "month") {
        items = items.filter((appt) => {
          const date = parseISO(appt?.appointment_date || new Date().toISOString());
          return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
        });
      }
    }
    return items;
  }, [appointments, statusFilter, dateFilter, quickFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredAppointments.length / 10));
  const pagedAppointments = filteredAppointments.slice((page - 1) * 10, page * 10);

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      patient_id: "",
      doctor_id: "",
      appointment_date: "",
      duration: 30,
      type: "Consultation",
      status: "Scheduled",
      symptoms: "",
      notes: "",
      prescription: "",
      follow_up_date: "",
    },
  });

  const checkConflict = useCallback(
    (doctorId, dateTime) => {
      if (!doctorId || !dateTime) return false;
      const target = new Date(dateTime);
      return appointments.some((appt) => {
        const date = new Date(appt?.appointment_date);
        return (
          Number(appt?.doctor_id) === Number(doctorId) &&
          date.getFullYear() === target.getFullYear() &&
          date.getMonth() === target.getMonth() &&
          date.getDate() === target.getDate() &&
          date.getHours() === target.getHours()
        );
      });
    },
    [appointments]
  );

  const watchDoctor = form.watch("doctor_id");
  const watchDate = form.watch("appointment_date");
  const hasConflict = checkConflict(watchDoctor, watchDate);

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
    (appt) => {
      setEditing(appt);
      form.reset({
        patient_id: appt?.patient_id || "",
        doctor_id: appt?.doctor_id || "",
        appointment_date: appt?.appointment_date
          ? format(parseISO(appt.appointment_date), "yyyy-MM-dd'T'HH:mm")
          : "",
        duration: appt?.duration || 30,
        type: appt?.type || "Consultation",
        status: appt?.status || "Scheduled",
        symptoms: appt?.symptoms || "",
        notes: appt?.notes || "",
        prescription: appt?.prescription || "",
        follow_up_date: appt?.follow_up_date || "",
      });
      setOpen(true);
    },
    [form]
  );

  const handleSubmit = async (values) => {
    if (editing) {
      await updateAppointment({ id: editing?.id, payload: values });
    } else {
      await createAppointment(values);
    }
    setOpen(false);
    setEditing(null);
    form.reset();
  };

  const cycleStatus = async (appt) => {
    const current = appt?.status || "Scheduled";
    const nextIndex = (statusOrder.indexOf(current) + 1) % statusOrder.length;
    const nextStatus = statusOrder[nextIndex];
    await updateAppointment({ id: appt?.id, payload: { status: nextStatus } });
  };

  const groupedAppointments = useMemo(() => {
    const groups = {};
    pagedAppointments.forEach((appt) => {
      const date = appt?.appointment_date
        ? format(parseISO(appt.appointment_date), "yyyy-MM-dd")
        : "unknown";
      if (!groups[date]) groups[date] = [];
      groups[date].push(appt);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [pagedAppointments]);

  const calendarDays = useMemo(() => {
    const start = startOfMonth(calendarDate);
    const end = endOfMonth(calendarDate);
    return eachDayOfInterval({ start, end });
  }, [calendarDate]);

  const offset = startOfMonth(calendarDate).getDay();

  const appointmentsByDate = useMemo(() => {
    const map = {};
    appointments.forEach((appt) => {
      const date = appt?.appointment_date
        ? format(parseISO(appt.appointment_date), "yyyy-MM-dd")
        : "";
      if (!map[date]) map[date] = [];
      map[date].push(appt);
    });
    return map;
  }, [appointments]);

  const selectedDateKey = format(selectedCalendarDate, "yyyy-MM-dd");
  const selectedAppointments = appointmentsByDate[selectedDateKey] || [];

  const filteredPatients = patients.filter((p) =>
    (p?.name || "").toLowerCase().includes(patientSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Appointments</h1>
          <p className="text-sm text-slate-500">Manage and schedule appointments.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {[
            { key: "all", label: "All" },
            { key: "today", label: "Today" },
            { key: "week", label: "Week" },
            { key: "month", label: "Month" },
          ].map((item) => (
            <Button
              key={item.key}
              variant={quickFilter === item.key ? "default" : "outline"}
              onClick={() => {
                setQuickFilter(item.key);
                setPage(1);
              }}
            >
              {item.label}
            </Button>
          ))}
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            onClick={() => setViewMode("list")}
          >
            <List className="mr-2 h-4 w-4" />
            List
          </Button>
          <Button
            variant={viewMode === "calendar" ? "default" : "outline"}
            onClick={() => setViewMode("calendar")}
          >
            <CalendarDays className="mr-2 h-4 w-4" />
            Calendar
          </Button>
          <Button className="bg-sky-600 hover:bg-sky-700" onClick={() => setOpen(true)}>
            Book Appointment
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Input
          placeholder="Search appointments..."
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
            {statusOrder.map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} />
      </div>

      {isLoading ? (
        <LoadingSkeleton rows={5} />
      ) : error ? (
        <EmptyState
          title="Appointments unavailable"
          description={error.message || "Unable to load appointment data."}
        />
      ) : filteredAppointments.length === 0 ? (
        <EmptyState title="No appointments" description="No appointments match your filters." />
      ) : viewMode === "list" ? (
        <div className="space-y-4">
          {groupedAppointments.map(([dateKey, list]) => {
            const label = isSameDay(parseISO(dateKey), new Date())
              ? "Today"
              : format(parseISO(dateKey), "MMM d, yyyy");
            return (
              <div key={dateKey} className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-500">{label}</h3>
                {list.map((appt) => (
                  <div key={appt?.id} className="flex flex-col gap-3 rounded-lg border bg-white p-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-start gap-3">
                      <span
                        className={`mt-1 h-2.5 w-2.5 rounded-full ${
                          appt?.status === "Completed"
                            ? "bg-emerald-500"
                            : appt?.status === "Cancelled"
                            ? "bg-rose-500"
                            : "bg-sky-500"
                        }`}
                      />
                      <div>
                        <p className="text-base font-semibold text-slate-900">
                          {appt?.patient_name || appt?.patient || "Unknown"}
                        </p>
                        <p className="flex items-center gap-2 text-sm text-slate-500">
                          <Stethoscope className="h-4 w-4" />
                          {appt?.doctor_name || appt?.doctor || "Unknown"}
                        </p>
                        <p className="text-sm text-slate-500">
                          {formatDateTime(appt?.appointment_date)}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{appt?.type || "Consultation"}</Badge>
                      <Badge variant="secondary">{appt?.duration || 30} mins</Badge>
                      <button type="button" onClick={() => cycleStatus(appt)}>
                        <Badge variant={BADGE_VARIANTS[appt?.status] || "secondary"}>
                          {appt?.status || "Scheduled"}
                        </Badge>
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => handleEdit(appt)}>
                        Edit
                      </Button>
                      <Button variant="destructive" onClick={() => setConfirmDelete(appt)}>
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border bg-white p-4">
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => setCalendarDate(subMonths(calendarDate, 1))}>
              Prev
            </Button>
            <h3 className="text-sm font-semibold text-slate-700">
              {format(calendarDate, "MMMM yyyy")}
            </h3>
            <Button variant="outline" onClick={() => setCalendarDate(addMonths(calendarDate, 1))}>
              Next
            </Button>
          </div>
          <div className="mt-4 grid grid-cols-7 gap-2 text-center text-xs text-slate-500">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-7 gap-2">
            {Array.from({ length: offset }).map((_, index) => (
              <div key={`offset-${index}`} />
            ))}
            {calendarDays.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const items = appointmentsByDate[key] || [];
              return (
                <button
                  type="button"
                  key={key}
                  onClick={() => setSelectedCalendarDate(day)}
                  className={`rounded-lg border p-2 text-left text-xs ${
                    isSameDay(day, selectedCalendarDate)
                      ? "border-sky-500 bg-sky-50"
                      : "border-slate-200"
                  }`}
                >
                  <div className="text-sm font-semibold text-slate-700">{format(day, "d")}</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {items.slice(0, 3).map((appt) => (
                      <span
                        key={appt?.id}
                        className={`h-2 w-2 rounded-full ${
                          appt?.status === "Completed"
                            ? "bg-emerald-500"
                            : appt?.status === "Cancelled"
                            ? "bg-rose-500"
                            : "bg-sky-500"
                        }`}
                      />
                    ))}
                    {items.length > 3 ? (
                      <span className="text-[10px] text-slate-400">+{items.length - 3}</span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-6">
            <h4 className="text-sm font-semibold text-slate-700">
              {format(selectedCalendarDate, "MMMM d, yyyy")}
            </h4>
            {selectedAppointments.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">No appointments on this date.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {selectedAppointments.map((appt) => (
                  <div key={appt?.id} className="rounded-md border p-3 text-sm">
                    <p className="font-medium text-slate-900">
                      {appt?.patient_name || appt?.patient}
                    </p>
                    <p className="text-slate-500">
                      {appt?.doctor_name || appt?.doctor} · {formatDateTime(appt?.appointment_date)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Appointment" : "Book Appointment"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-slate-700">Patient</label>
              <Input
                placeholder="Search patient..."
                value={patientSearch}
                onChange={(event) => setPatientSearch(event.target.value)}
              />
              <div className="mt-2 max-h-32 overflow-auto rounded-md border bg-white">
                {filteredPatients.length === 0 ? (
                  <p className="p-2 text-sm text-slate-500">No patients found.</p>
                ) : (
                  filteredPatients.map((patient) => (
                    <button
                      type="button"
                      key={patient?.id}
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                      onClick={() => {
                        form.setValue("patient_id", patient?.id);
                        setPatientSearch(patient?.name || "");
                      }}
                    >
                      {patient?.name}
                    </button>
                  ))
                )}
              </div>
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
              <label className="text-sm font-medium text-slate-700">Date & Time</label>
              <Input type="datetime-local" {...form.register("appointment_date")} />
              {form.formState.errors.appointment_date ? (
                <p className="mt-1 text-xs text-rose-500">
                  {form.formState.errors.appointment_date.message}
                </p>
              ) : null}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Duration</label>
              <Select
                value={String(form.watch("duration"))}
                onValueChange={(value) => form.setValue("duration", Number(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Duration" />
                </SelectTrigger>
                <SelectContent>
                  {durations.map((duration) => (
                    <SelectItem key={duration} value={String(duration)}>
                      {duration} mins
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Type</label>
              <Select
                value={form.watch("type")}
                onValueChange={(value) => form.setValue("type", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  {types.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                  {statusOrder.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-slate-700">Symptoms</label>
              <Input placeholder="Symptoms" {...form.register("symptoms")} />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-slate-700">Notes</label>
              <Input placeholder="Notes" {...form.register("notes")} />
            </div>
            {editing ? (
              <>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-slate-700">Prescription</label>
                  <Input placeholder="Prescription" {...form.register("prescription")} />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Follow-up Date</label>
                  <Input type="date" {...form.register("follow_up_date")} />
                </div>
              </>
            ) : null}
          </div>
          {hasConflict ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
              This doctor already has an appointment at this time. Please choose a different slot.
            </div>
          ) : null}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button
              className="bg-sky-600 hover:bg-sky-700"
              onClick={form.handleSubmit(handleSubmit)}
              disabled={creating || updating || hasConflict}
            >
              {creating || updating ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        onOpenChange={(value) => !value && setConfirmDelete(null)}
        title="Cancel this appointment?"
        description="This will remove the appointment record."
        confirmText="Delete"
        onConfirm={async () => {
          if (confirmDelete) {
            await deleteAppointment(confirmDelete?.id);
            setConfirmDelete(null);
          }
        }}
      />
    </div>
  );
}

