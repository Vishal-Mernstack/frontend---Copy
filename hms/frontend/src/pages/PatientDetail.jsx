import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Plus, Upload, Activity, Calendar, ClipboardList } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
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
import api from "../lib/api";
import { BADGE_VARIANTS } from "../utils/constants";
import { formatDate, formatDateTime } from "../utils/helpers";
import { toast } from "sonner";

const medicalRecordSchema = z.object({
  record_type: z.string().min(1, "Record type required"),
  diagnosis: z.string().min(1, "Diagnosis required"),
  treatment: z.string().optional(),
  notes: z.string().optional(),
  doctor_id: z.coerce.number().optional(),
});

export default function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [recordOpen, setRecordOpen] = useState(false);
  const [admissionOpen, setAdmissionOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [reportType, setReportType] = useState("Lab Report");
  
  // Keep medical records in localStorage (no backend table exists)
  const [medicalRecords, setMedicalRecords] = useState([]);

  const recordForm = useForm({
    resolver: zodResolver(medicalRecordSchema),
    defaultValues: {
      record_type: "",
      diagnosis: "",
      treatment: "",
      notes: "",
    },
  });

  const admissionForm = useForm({
    defaultValues: {
      admission_date: "",
      discharge_date: "",
      ward: "",
      bed_number: "",
      reason: "",
      status: "Admitted",
    },
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["patient", id],
    queryFn: async () => {
      const response = await api.get(`/patients/${id}`);
      return response.data.data;
    },
    enabled: Boolean(id),
  });

  const patientRecords = medicalRecords.filter(r => r.patient_id === Number(id));

  // Fetch admissions from backend
  const { data: admissionsData } = useQuery({
    queryKey: ["admissions", id],
    queryFn: async () => {
      const response = await api.get(`/hospital/admissions?patient_id=${id}&limit=100`);
      return response.data.data.items;
    },
    enabled: Boolean(id),
  });

  // Fetch reports from backend
  const { data: reportsData } = useQuery({
    queryKey: ["patient-reports", id],
    queryFn: async () => {
      const response = await api.get(`/patient-reports?patient_id=${id}&limit=100`);
      return response.data.data.items;
    },
    enabled: Boolean(id),
  });

  const patientAdmissions = admissionsData || [];
  const patientReports = reportsData || [];

  const handleAddRecord = (values) => {
    setMedicalRecords(prev => [...prev, { ...values, id: Date.now(), patient_id: Number(id), created_at: new Date().toISOString() }]);
    setRecordOpen(false);
    recordForm.reset();
    toast.success("Medical record added");
  };

  // Create admission mutation
  const createAdmissionMutation = useMutation({
    mutationFn: async (values) => {
      const response = await api.post("/hospital/admissions", {
        patient_id: Number(id),
        bed_id: values.bed_id || null,
        doctor_id: values.doctor_id || null,
        reason: values.reason,
        diagnosis: values.diagnosis || null,
        treatment_plan: values.treatment_plan || null,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admissions", id] });
      setAdmissionOpen(false);
      admissionForm.reset();
      toast.success("Patient admitted successfully");
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to admit patient");
    },
  });

  const handleAdmission = (values) => {
    createAdmissionMutation.mutate(values);
  };

  // Upload report mutation
  const uploadReportMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) throw new Error("No file selected");
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("patient_id", id);
      formData.append("report_type", reportType);
      formData.append("description", "");
      const response = await api.post("/patient-reports/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-reports", id] });
      setUploadOpen(false);
      setSelectedFile(null);
      toast.success("Report uploaded successfully");
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to upload report");
    },
  });

  const handleFileSelect = (e) => {
    if (e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  if (isLoading) {
    return <LoadingSkeleton rows={6} />;
  }

  if (!data) {
    if (error) {
      return (
        <EmptyState
          title="Patient unavailable"
          message={error.message || "Unable to load patient details."}
        />
      );
    }
    return <EmptyState title="Patient not found" message="Try another patient." />;
  }

  const tabs = [
    { key: "overview", label: "Overview", icon: Activity },
    { key: "records", label: "Medical Records", icon: ClipboardList },
    { key: "admissions", label: "Admission/Discharge", icon: Calendar },
    { key: "reports", label: "Reports", icon: FileText },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => navigate(-1)}>
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{data?.name}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Patient ID: {id}</p>
        </div>
        <Badge variant={BADGE_VARIANTS[data?.status] || "default"} className="ml-auto">
          {data?.status}
        </Badge>
      </div>

      <div className="flex gap-2 border-b overflow-x-auto dark:border-slate-700">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium whitespace-nowrap transition ${
                activeTab === tab.key
                  ? "border-b-2 border-sky-600 text-sky-600"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "overview" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="dark:bg-slate-900 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="dark:text-white">Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <span className="text-slate-500 dark:text-slate-400">Email:</span>
                <span className="dark:text-white">{data?.email || "-"}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <span className="text-slate-500 dark:text-slate-400">Phone:</span>
                <span className="dark:text-white">{data?.phone || "-"}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <span className="text-slate-500 dark:text-slate-400">Blood Type:</span>
                <span className="dark:text-white">{data?.blood_type || "-"}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <span className="text-slate-500 dark:text-slate-400">Gender:</span>
                <span className="dark:text-white">{data?.gender || "-"}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <span className="text-slate-500 dark:text-slate-400">Age:</span>
                <span className="dark:text-white">{data?.age ?? "-"}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <span className="text-slate-500 dark:text-slate-400">Address:</span>
                <span className="dark:text-white">{data?.address || "-"}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="dark:bg-slate-900 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="dark:text-white">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <div className="text-center">
                <p className="text-3xl font-bold text-sky-600 dark:text-sky-400">{patientRecords.length}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Records</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{patientAdmissions.length}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Admissions</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{patientReports.length}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Reports</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "records" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button className="bg-sky-600 hover:bg-sky-700" onClick={() => setRecordOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Medical Record
            </Button>
          </div>

          <Card className="dark:bg-slate-900 dark:border-slate-700">
            <Table>
              <TableHeader>
                <TableRow className="dark:border-slate-700">
                  <TableHead className="dark:text-slate-300">Date</TableHead>
                  <TableHead className="dark:text-slate-300">Type</TableHead>
                  <TableHead className="dark:text-slate-300">Diagnosis</TableHead>
                  <TableHead className="dark:text-slate-300">Treatment</TableHead>
                  <TableHead className="dark:text-slate-300">Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="dark:border-slate-700">
                {patientRecords.length === 0 ? (
                  <TableRow className="dark:border-slate-700">
                    <TableCell colSpan={5} className="text-center py-8 text-slate-500 dark:text-slate-400">
                      No medical records found
                    </TableCell>
                  </TableRow>
                ) : (
                  patientRecords.map((record) => (
                    <TableRow key={record.id} className="dark:border-slate-700">
                      <TableCell className="dark:text-white">{formatDate(record.created_at)}</TableCell>
                      <TableCell className="dark:text-white">{record.record_type}</TableCell>
                      <TableCell className="dark:text-slate-300">{record.diagnosis}</TableCell>
                      <TableCell className="dark:text-slate-300">{record.treatment || "-"}</TableCell>
                      <TableCell className="dark:text-slate-300">{record.notes || "-"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      {activeTab === "admissions" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button className="bg-sky-600 hover:bg-sky-700" onClick={() => setAdmissionOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Admit Patient
            </Button>
          </div>

          <Card className="dark:bg-slate-900 dark:border-slate-700">
            <Table>
              <TableHeader>
                <TableRow className="dark:border-slate-700">
                  <TableHead className="dark:text-slate-300">Admission Date</TableHead>
                  <TableHead className="dark:text-slate-300">Discharge Date</TableHead>
                  <TableHead className="dark:text-slate-300">Ward</TableHead>
                  <TableHead className="dark:text-slate-300">Bed</TableHead>
                  <TableHead className="dark:text-slate-300">Reason</TableHead>
                  <TableHead className="dark:text-slate-300">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="dark:border-slate-700">
                {patientAdmissions.length === 0 ? (
                  <TableRow className="dark:border-slate-700">
                    <TableCell colSpan={6} className="text-center py-8 text-slate-500 dark:text-slate-400">
                      No admission records found
                    </TableCell>
                  </TableRow>
                ) : (
                  patientAdmissions.map((admission) => (
                    <TableRow key={admission.id} className="dark:border-slate-700">
                      <TableCell className="dark:text-white">{formatDate(admission.admission_date)}</TableCell>
                      <TableCell className="dark:text-white">{admission.discharge_date ? formatDate(admission.discharge_date) : "-"}</TableCell>
                      <TableCell className="dark:text-slate-300">{admission.ward || "-"}</TableCell>
                      <TableCell className="dark:text-slate-300">{admission.bed_number || "-"}</TableCell>
                      <TableCell className="dark:text-slate-300">{admission.reason}</TableCell>
                      <TableCell>
                        <Badge variant={admission.status === "Admitted" ? "default" : "secondary"}>
                          {admission.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      {activeTab === "reports" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button className="bg-sky-600 hover:bg-sky-700" onClick={() => setUploadOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Upload Report
            </Button>
          </div>

          <Card className="dark:bg-slate-900 dark:border-slate-700">
            <Table>
              <TableHeader>
                <TableRow className="dark:border-slate-700">
                  <TableHead className="dark:text-slate-300">Report Name</TableHead>
                  <TableHead className="dark:text-slate-300">Type</TableHead>
                  <TableHead className="dark:text-slate-300">Uploaded</TableHead>
                  <TableHead className="dark:text-slate-300">Status</TableHead>
                  <TableHead className="dark:text-slate-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="dark:border-slate-700">
                {patientReports.length === 0 ? (
                  <TableRow className="dark:border-slate-700">
                    <TableCell colSpan={5} className="text-center py-8 text-slate-500 dark:text-slate-400">
                      No reports uploaded
                    </TableCell>
                  </TableRow>
                ) : (
                  patientReports.map((report) => (
                    <TableRow key={report.id} className="dark:border-slate-700">
                      <TableCell className="font-medium dark:text-white">{report.file_name}</TableCell>
                      <TableCell className="dark:text-slate-300">{report.report_type}</TableCell>
                      <TableCell className="dark:text-slate-300">{formatDateTime(report.created_at)}</TableCell>
                      <TableCell>
                        <Badge variant="default">Available</Badge>
                      </TableCell>
                      <TableCell>
                        <a href={`http://127.0.0.1:5000${report.file_path}`} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm">View</Button>
                        </a>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      <Dialog open={recordOpen} onOpenChange={(v) => { if (!v) recordForm.reset(); setRecordOpen(v); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Medical Record</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <label className="text-sm font-medium dark:text-slate-200">Record Type</label>
              <Select value={recordForm.watch("record_type")} onValueChange={(v) => recordForm.setValue("record_type", v)}>
                <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Checkup">Checkup</SelectItem>
                  <SelectItem value="Diagnosis">Diagnosis</SelectItem>
                  <SelectItem value="Treatment">Treatment</SelectItem>
                  <SelectItem value="Surgery">Surgery</SelectItem>
                  <SelectItem value="Follow-up">Follow-up</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium dark:text-slate-200">Diagnosis</label>
              <Input {...recordForm.register("diagnosis")} className="dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
            </div>
            <div>
              <label className="text-sm font-medium dark:text-slate-200">Treatment</label>
              <Textarea {...recordForm.register("treatment")} className="dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
            </div>
            <div>
              <label className="text-sm font-medium dark:text-slate-200">Notes</label>
              <Textarea {...recordForm.register("notes")} className="dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRecordOpen(false)}>Cancel</Button>
            <Button className="bg-sky-600 hover:bg-sky-700" onClick={recordForm.handleSubmit(handleAddRecord)}>Save Record</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={admissionOpen} onOpenChange={(v) => { if (!v) admissionForm.reset(); setAdmissionOpen(v); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Admit Patient</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium dark:text-slate-200">Admission Date</label>
                <Input type="date" {...admissionForm.register("admission_date")} className="dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
              </div>
              <div>
                <label className="text-sm font-medium dark:text-slate-200">Discharge Date</label>
                <Input type="date" {...admissionForm.register("discharge_date")} className="dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium dark:text-slate-200">Ward</label>
                <Select value={admissionForm.watch("ward")} onValueChange={(v) => admissionForm.setValue("ward", v)}>
                  <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700">
                    <SelectValue placeholder="Select ward" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="General">General</SelectItem>
                    <SelectItem value="ICU">ICU</SelectItem>
                    <SelectItem value="Emergency">Emergency</SelectItem>
                    <SelectItem value="Private">Private</SelectItem>
                    <SelectItem value="Pediatric">Pediatric</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium dark:text-slate-200">Bed Number</label>
                <Input {...admissionForm.register("bed_number")} className="dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium dark:text-slate-200">Reason for Admission</label>
              <Textarea {...admissionForm.register("reason")} className="dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdmissionOpen(false)}>Cancel</Button>
            <Button className="bg-sky-600 hover:bg-sky-700" onClick={admissionForm.handleSubmit(handleAdmission)} disabled={createAdmissionMutation.isPending}>
              {createAdmissionMutation.isPending ? "Admitting..." : "Admit Patient"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={uploadOpen} onOpenChange={(v) => { if (!v) { setSelectedFile(null); } setUploadOpen(v); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Medical Report</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <label className="text-sm font-medium dark:text-slate-200">Report Type</label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Lab Report">Lab Report</SelectItem>
                  <SelectItem value="X-Ray">X-Ray</SelectItem>
                  <SelectItem value="MRI">MRI</SelectItem>
                  <SelectItem value="CT Scan">CT Scan</SelectItem>
                  <SelectItem value="Prescription">Prescription</SelectItem>
                  <SelectItem value="Discharge Summary">Discharge Summary</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium dark:text-slate-200">File</label>
              <Input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileSelect} className="dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
              {selectedFile && (
                <p className="text-sm text-slate-500 mt-1">Selected: {selectedFile.name}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>Cancel</Button>
            <Button className="bg-sky-600 hover:bg-sky-700" onClick={() => uploadReportMutation.mutate()} disabled={!selectedFile || uploadReportMutation.isPending}>
              {uploadReportMutation.isPending ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}