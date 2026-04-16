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
  addDays,
  isToday,
  isBefore,
  isAfter,
} from "date-fns";
import { 
  CalendarDays, 
  List, 
  Stethoscope, 
  Clock, 
  Users, 
  Settings,
  Bell,
  Video,
  Phone,
  MapPin
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
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
import SlotManager from "../components/appointments/SlotManager";
import QueueManager from "../components/appointments/QueueManager";
import NotificationTemplates from "../components/notifications/NotificationTemplates";

const schema = z.object({
  patient_id: z.coerce.number().min(1, "Patient required"),
  doctor_id: z.coerce.number().min(1, "Doctor required"),
  appointment_date: z.string().min(1, "Date required"),
  duration: z.coerce.number().default(30),
  type: z.string().min(1, "Type required"),
  status: z.string().min(1, "Status required"),
  mode: z.string().default("in-person"),
  symptoms: z.string().optional(),
  notes: z.string().optional(),
  prescription: z.string().optional(),
  follow_up_date: z.string().optional(),
  send_reminder: z.boolean().default(true),
  video_link: z.string().optional(),
});

const APPOINTMENT_TYPES = [
  { value: "consultation", label: "Consultation", icon: Stethoscope },
  { value: "follow-up", label: "Follow-up", icon: Clock },
  { value: "emergency", label: "Emergency", icon: Bell },
  { value: "routine", label: "Routine Check", icon: Users },
  { value: "diagnostic", label: "Diagnostic", icon: Settings },
  { value: "therapy", label: "Therapy", icon: Users },
  { value: "telemedicine", label: "Telemedicine", icon: Video },
];

const APPOINTMENT_MODES = [
  { value: "in-person", label: "In Person", icon: MapPin },
  { value: "video", label: "Video Call", icon: Video },
  { value: "phone", label: "Phone Call", icon: Phone },
];

const DURATIONS = [15, 30, 45, 60, 90];

const STATUS_ORDER = ["Scheduled", "Confirmed", "In Progress", "Completed", "Cancelled", "No Show"];

export default function EnhancedAppointments() {
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
  const [activeTab, setActiveTab] = useState("appointments");
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [doctorSlots, setDoctorSlots] = useState([]);

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
      type: "consultation",
      status: "Scheduled",
      mode: "in-person",
      symptoms: "",
      notes: "",
      prescription: "",
      follow_up_date: "",
      send_reminder: true,
      video_link: "",
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
  const watchMode = form.watch("mode");
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
        type: appt?.type || "consultation",
        status: appt?.status || "Scheduled",
        mode: appt?.mode || "in-person",
        symptoms: appt?.symptoms || "",
        notes: appt?.notes || "",
        prescription: appt?.prescription || "",
        follow_up_date: appt?.follow_up_date || "",
        send_reminder: appt?.send_reminder ?? true,
        video_link: appt?.video_link || "",
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
    const nextIndex = (STATUS_ORDER.indexOf(current) + 1) % STATUS_ORDER.length;
    const nextStatus = STATUS_ORDER[nextIndex];
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

  const filteredDoctors = doctors.filter((d) =>
    (d?.name || "").toLowerCase().includes(search.toLowerCase())
  );

  const stats = useMemo(() => {
    const today = new Date();
    const todayAppts = appointments.filter(appt => 
      isSameDay(parseISO(appt?.appointment_date || new Date().toISOString()), today)
    );
    
    return {
      total: appointments.length,
      today: todayAppts.length,
      upcoming: appointments.filter(appt => 
        isAfter(parseISO(appt?.appointment_date || new Date().toISOString()), today)
      ).length,
      completed: appointments.filter(appt => appt?.status === "Completed").length,
      cancelled: appointments.filter(appt => appt?.status === "Cancelled").length,
    };
  }, [appointments]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Enhanced Appointments</h1>
          <p className="text-sm text-slate-500">Advanced scheduling and patient flow management.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-8 w-8 text-sky-600" />
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                <p className="text-xs text-slate-500">Total Appointments</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.today}</p>
                <p className="text-xs text-slate-500">Today</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.upcoming}</p>
                <p className="text-xs text-slate-500">Upcoming</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Stethoscope className="h-8 w-8 text-emerald-600" />
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.completed}</p>
                <p className="text-xs text-slate-500">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Bell className="h-8 w-8 text-red-600" />
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.cancelled}</p>
                <p className="text-xs text-slate-500">Cancelled</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="queue">Queue Management</TabsTrigger>
          <TabsTrigger value="slots">Slot Management</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="appointments" className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <Input
              placeholder="Search appointments..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="md:col-span-2"
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
                <SelectItem value="all">All Status</SelectItem>
                {STATUS_ORDER.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input 
              type="date" 
              value={dateFilter} 
              onChange={(event) => setDateFilter(event.target.value)} 
            />
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
                      <Card key={appt?.id}>
                        <CardContent className="p-4">
                          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div className="flex items-start gap-3">
                              <span
                                className={`mt-1 h-2.5 w-2.5 rounded-full ${
                                  appt?.status === "Completed"
                                    ? "bg-emerald-500"
                                    : appt?.status === "Cancelled"
                                    ? "bg-rose-500"
                                    : appt?.status === "In Progress"
                                    ? "bg-blue-500"
                                    : "bg-sky-500"
                                }`}
                              />
                              <div>
                                <p className="text-base font-semibold text-slate-900">
                                  {appt?.patient_name || appt?.patient || "Unknown"}
                                </p>
                                <div className="flex items-center gap-2 text-sm text-slate-500">
                                  <Stethoscope className="h-4 w-4" />
                                  {appt?.doctor_name || appt?.doctor || "Unknown"}
                                  {appt?.mode === "video" && <Video className="h-4 w-4" />}
                                  {appt?.mode === "phone" && <Phone className="h-4 w-4" />}
                                </div>
                                <p className="text-sm text-slate-500">
                                  {formatDateTime(appt?.appointment_date)}
                                </p>
                                {appt?.video_link && (
                                  <p className="text-xs text-blue-600">
                                    📹 Video link available
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="secondary">{appt?.type || "Consultation"}</Badge>
                              <Badge variant="secondary">{appt?.duration || 30} mins</Badge>
                              <Badge variant="outline">{appt?.mode || "in-person"}</Badge>
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
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                );
              })}
            </div>
          ) : (
            /* Calendar View - Enhanced */
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <Button variant="outline" onClick={() => setCalendarDate(subMonths(calendarDate, 1))}>
                    Previous
                  </Button>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {format(calendarDate, "MMMM yyyy")}
                  </h3>
                  <Button variant="outline" onClick={() => setCalendarDate(addMonths(calendarDate, 1))}>
                    Next
                  </Button>
                </div>
                {/* Calendar implementation here */}
                <div className="text-center text-slate-500 py-8">
                  Enhanced calendar view with drag-and-drop functionality
                </div>
              </CardContent>
            </Card>
          )}
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </TabsContent>

        <TabsContent value="queue">
          <QueueManager 
            appointments={appointments} 
            onUpdateAppointment={(id, payload) => updateAppointment({ id, payload })}
          />
        </TabsContent>

        <TabsContent value="slots">
          <SlotManager 
            doctorId={selectedDoctor}
            existingSlots={doctorSlots}
            onSlotsChange={setDoctorSlots}
          />
          <div className="mt-4">
            <Select value={String(selectedDoctor || "")} onValueChange={(value) => setSelectedDoctor(Number(value))}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select doctor to manage slots" />
              </SelectTrigger>
              <SelectContent>
                {doctors.map((doctor) => (
                  <SelectItem key={doctor?.id} value={String(doctor?.id)}>
                    {doctor?.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </TabsContent>

        <TabsContent value="notifications">
          <NotificationTemplates />
        </TabsContent>
      </Tabs>

      {/* Enhanced Appointment Dialog */}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Appointment" : "Book New Appointment"}</DialogTitle>
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
                  {filteredDoctors.map((doctor) => (
                    <SelectItem key={doctor?.id} value={String(doctor?.id)}>
                      {doctor?.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Mode</label>
              <Select
                value={form.watch("mode")}
                onValueChange={(value) => form.setValue("mode", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {APPOINTMENT_MODES.map((mode) => (
                    <SelectItem key={mode.value} value={mode.value}>
                      <div className="flex items-center gap-2">
                        <mode.icon className="h-4 w-4" />
                        {mode.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Date & Time</label>
              <Input type="datetime-local" {...form.register("appointment_date")} />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Duration</label>
              <Select
                value={String(form.watch("duration"))}
                onValueChange={(value) => form.setValue("duration", Number(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATIONS.map((duration) => (
                    <SelectItem key={duration} value={String(duration)}>
                      {duration} minutes
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
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {APPOINTMENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <type.icon className="h-4 w-4" />
                        {type.label}
                      </div>
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
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_ORDER.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {watchMode === "video" && (
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-slate-700">Video Link</label>
                <Input 
                  placeholder="https://zoom.us/meeting/..." 
                  {...form.register("video_link")} 
                />
              </div>
            )}

            <div className="md:col-span-2">
              <label className="text-sm font-medium text-slate-700">Symptoms</label>
              <Input placeholder="Describe symptoms..." {...form.register("symptoms")} />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium text-slate-700">Notes</label>
              <Input placeholder="Additional notes..." {...form.register("notes")} />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="send_reminder"
                {...form.register("send_reminder")}
              />
              <label htmlFor="send_reminder" className="text-sm text-slate-700">
                Send appointment reminder
              </label>
            </div>

            {editing ? (
              <>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-slate-700">Prescription</label>
                  <Input placeholder="Prescription details..." {...form.register("prescription")} />
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
              {creating || updating ? "Saving..." : "Save Appointment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        onOpenChange={(value) => !value && setConfirmDelete(null)}
        title="Cancel this appointment?"
        description="This will remove the appointment record and send cancellation notification if enabled."
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
