import { useState, useMemo } from "react";
import { format, addDays, differenceInDays } from "date-fns";
import { 
  Microscope, 
  TestTube, 
  FileText, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Plus,
  Search,
  Filter,
  Upload,
  Eye,
  Download,
  Calendar,
  User
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
import { Textarea } from "../components/ui/textarea";

const TEST_CATEGORIES = {
  HEMATOLOGY: "Hematology",
  BIOCHEMISTRY: "Biochemistry", 
  MICROBIOLOGY: "Microbiology",
  HISTOPATHOLOGY: "Histopathology",
  RADIOLOGY: "Radiology",
  CARDIOLOGY: "Cardiology",
  ENDOCRINOLOGY: "Endocrinology",
  IMMUNOLOGY: "Immunology",
  GENETICS: "Genetics",
};

const TEST_STATUS = {
  PENDING: "Pending",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  URGENT: "Urgent",
};

const PRIORITY_LEVELS = {
  ROUTINE: "Routine",
  URGENT: "Urgent",
  STAT: "Stat (Emergency)",
};

const STATUS_COLORS = {
  [TEST_STATUS.PENDING]: "bg-amber-100 text-amber-800 border-amber-200",
  [TEST_STATUS.IN_PROGRESS]: "bg-blue-100 text-blue-800 border-blue-200",
  [TEST_STATUS.COMPLETED]: "bg-green-100 text-green-800 border-green-200",
  [TEST_STATUS.CANCELLED]: "bg-red-100 text-red-800 border-red-200",
  [TEST_STATUS.URGENT]: "bg-purple-100 text-purple-800 border-purple-200",
};

const SAMPLE_LAB_TESTS = [
  {
    id: 1,
    testName: "Complete Blood Count (CBC)",
    category: "HEMATOLOGY",
    patient: "John Doe",
    doctor: "Dr. Smith",
    requestedDate: "2024-12-10",
    status: "COMPLETED",
    priority: "ROUTINE",
    sampleType: "Blood",
    specimenId: "BLD-2024-001",
    results: {
      wbc: 7.2,
      rbc: 4.8,
      hemoglobin: 14.5,
      hematocrit: 43,
      platelets: 250,
    },
    normalRanges: {
      wbc: "4.5-11.0 K/μL",
      rbc: "4.5-5.9 M/μL",
      hemoglobin: "13.5-17.5 g/dL",
      hematocrit: "41-50%",
      platelets: "150-450 K/μL",
    },
    completedDate: "2024-12-10",
    technician: "Lab Tech Johnson",
    reportUrl: "/reports/cbc-john-doe-2024-12-10.pdf",
    cost: 45.00,
  },
  {
    id: 2,
    testName: "Lipid Profile",
    category: "BIOCHEMISTRY",
    patient: "Jane Smith",
    doctor: "Dr. Johnson",
    requestedDate: "2024-12-11",
    status: "IN_PROGRESS",
    priority: "ROUTINE",
    sampleType: "Blood",
    specimenId: "BLD-2024-002",
    results: null,
    normalRanges: null,
    completedDate: null,
    technician: "Lab Tech Williams",
    reportUrl: null,
    cost: 65.00,
  },
  {
    id: 3,
    testName: "Chest X-Ray",
    category: "RADIOLOGY",
    patient: "Robert Brown",
    doctor: "Dr. Davis",
    requestedDate: "2024-12-11",
    status: "PENDING",
    priority: "URGENT",
    sampleType: "Imaging",
    specimenId: "IMG-2024-001",
    results: null,
    normalRanges: null,
    completedDate: null,
    technician: null,
    reportUrl: null,
    cost: 120.00,
  },
  {
    id: 4,
    testName: "Urinalysis",
    category: "MICROBIOLOGY",
    patient: "Alice Wilson",
    doctor: "Dr. Martinez",
    requestedDate: "2024-12-09",
    status: "COMPLETED",
    priority: "ROUTINE",
    sampleType: "Urine",
    specimenId: "URN-2024-001",
    results: {
      color: "Yellow",
      clarity: "Clear",
      ph: 6.5,
      protein: "Negative",
      glucose: "Negative",
      ketones: "Negative",
      blood: "Negative",
    },
    normalRanges: {
      color: "Pale yellow to amber",
      clarity: "Clear to slightly cloudy",
      ph: "4.5-8.0",
    },
    completedDate: "2024-12-09",
    technician: "Lab Tech Anderson",
    reportUrl: "/reports/urinalysis-alice-wilson-2024-12-09.pdf",
    cost: 25.00,
  },
];

export default function LabManagement() {
  const [labTests, setLabTests] = useState(SAMPLE_LAB_TESTS);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedTest, setSelectedTest] = useState(null);
  const [activeTab, setActiveTab] = useState("tests");

  const filteredTests = useMemo(() => {
    return labTests.filter(test => {
      const matchesSearch = test.testName.toLowerCase().includes(search.toLowerCase()) ||
                          test.patient.toLowerCase().includes(search.toLowerCase()) ||
                          test.doctor.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = categoryFilter === "all" || test.category === categoryFilter;
      const matchesStatus = statusFilter === "all" || test.status === statusFilter;
      
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [labTests, search, categoryFilter, statusFilter]);

  const stats = useMemo(() => {
    const total = labTests.length;
    const pending = labTests.filter(t => t.status === TEST_STATUS.PENDING).length;
    const inProgress = labTests.filter(t => t.status === TEST_STATUS.IN_PROGRESS).length;
    const completed = labTests.filter(t => t.status === TEST_STATUS.COMPLETED).length;
    const urgent = labTests.filter(t => t.priority === PRIORITY_LEVELS.URGENT || t.priority === PRIORITY_LEVELS.STAT).length;
    
    const totalRevenue = labTests
      .filter(t => t.status === TEST_STATUS.COMPLETED)
      .reduce((sum, test) => sum + test.cost, 0);

    return {
      total,
      pending,
      inProgress,
      completed,
      urgent,
      totalRevenue,
    };
  }, [labTests]);

  const handleStatusUpdate = (testId, newStatus) => {
    const updatedTests = labTests.map(test => 
      test.id === testId ? { 
        ...test, 
        status: newStatus,
        completedDate: newStatus === TEST_STATUS.COMPLETED ? format(new Date(), 'yyyy-MM-dd') : test.completedDate
      } : test
    );
    setLabTests(updatedTests);
  };

  const handleReportUpload = (testId, reportUrl) => {
    const updatedTests = labTests.map(test => 
      test.id === testId ? { ...test, reportUrl } : test
    );
    setLabTests(updatedTests);
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case PRIORITY_LEVELS.STAT:
        return "bg-red-100 text-red-800 border-red-200";
      case PRIORITY_LEVELS.URGENT:
        return "bg-orange-100 text-orange-800 border-orange-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Laboratory Management</h1>
          <p className="text-sm text-slate-500">Manage lab tests, results, and diagnostic services.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setOpenDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Book Test
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Microscope className="h-8 w-8 text-slate-600" />
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                <p className="text-xs text-slate-500">Total Tests</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-8 w-8 text-amber-600" />
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.pending}</p>
                <p className="text-xs text-slate-500">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TestTube className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.inProgress}</p>
                <p className="text-xs text-slate-500">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-8 w-8 text-green-600" />
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
              <AlertTriangle className="h-8 w-8 text-red-600" />
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.urgent}</p>
                <p className="text-xs text-slate-500">Urgent</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center">
                <span className="text-sm font-bold text-emerald-700">$</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">${stats.totalRevenue}</p>
                <p className="text-xs text-slate-500">Total Revenue</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="tests">Lab Tests</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="tests" className="space-y-4">
          {/* Filters */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search tests, patients, doctors..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {Object.entries(TEST_CATEGORIES).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {Object.values(TEST_STATUS).map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Test List */}
          <div className="space-y-3">
            {filteredTests.map((test) => (
              <Card key={test.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-slate-900">{test.testName}</h3>
                        <Badge className={STATUS_COLORS[test.status]}>
                          {test.status}
                        </Badge>
                        <Badge className={getPriorityColor(test.priority)}>
                          {test.priority}
                        </Badge>
                      </div>
                      
                      <div className="grid gap-2 md:grid-cols-2">
                        <div className="text-sm">
                          <span className="font-medium text-slate-700">Patient:</span>
                          <span className="text-slate-600 ml-2">{test.patient}</span>
                        </div>
                        <div className="text-sm">
                          <span className="font-medium text-slate-700">Doctor:</span>
                          <span className="text-slate-600 ml-2">{test.doctor}</span>
                        </div>
                        <div className="text-sm">
                          <span className="font-medium text-slate-700">Category:</span>
                          <span className="text-slate-600 ml-2">{TEST_CATEGORIES[test.category]}</span>
                        </div>
                        <div className="text-sm">
                          <span className="font-medium text-slate-700">Specimen:</span>
                          <span className="text-slate-600 ml-2">{test.specimenId}</span>
                        </div>
                        <div className="text-sm">
                          <span className="font-medium text-slate-700">Requested:</span>
                          <span className="text-slate-600 ml-2">{format(new Date(test.requestedDate), 'MMM d, yyyy')}</span>
                        </div>
                        <div className="text-sm">
                          <span className="font-medium text-slate-700">Cost:</span>
                          <span className="text-slate-600 ml-2">${test.cost.toFixed(2)}</span>
                        </div>
                      </div>

                      {test.status === TEST_STATUS.COMPLETED && test.results && (
                        <div className="mt-3 p-3 bg-green-50 rounded-lg">
                          <h4 className="text-sm font-semibold text-green-800 mb-2">Test Results</h4>
                          <div className="text-sm text-green-700">
                            {Object.entries(test.results).map(([key, value]) => (
                              <div key={key} className="flex justify-between">
                                <span className="font-medium">{key.toUpperCase()}:</span>
                                <span>{value} {test.normalRanges?.[key] && `(Normal: ${test.normalRanges[key]})`}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2 pt-3 border-t">
                        {test.status === TEST_STATUS.PENDING && (
                          <Button
                            size="sm"
                            onClick={() => handleStatusUpdate(test.id, TEST_STATUS.IN_PROGRESS)}
                          >
                            Start Test
                          </Button>
                        )}
                        {test.status === TEST_STATUS.IN_PROGRESS && (
                          <Button
                            size="sm"
                            onClick={() => handleStatusUpdate(test.id, TEST_STATUS.COMPLETED)}
                          >
                            Complete Test
                          </Button>
                        )}
                        {test.reportUrl && (
                          <Button variant="outline" size="sm">
                            <Eye className="mr-2 h-4 w-4" />
                            View Report
                          </Button>
                        )}
                        <Button variant="outline" size="sm">
                          <Upload className="mr-2 h-4 w-4" />
                          Upload Report
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          <Card>
            <CardContent className="p-6 text-center">
              <FileText className="mx-auto h-12 w-12 text-slate-400" />
              <h3 className="mt-4 text-lg font-semibold text-slate-900">Test Results Management</h3>
              <p className="mt-2 text-sm text-slate-500">
                Upload and manage lab test results with automatic patient notifications.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardContent className="p-6 text-center">
              <FileText className="mx-auto h-12 w-12 text-slate-400" />
              <h3 className="mt-4 text-lg font-semibold text-slate-900">Lab Reports</h3>
              <p className="mt-2 text-sm text-slate-500">
                Generate comprehensive reports for lab operations, test volumes, and revenue analysis.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardContent className="p-6 text-center">
              <Microscope className="mx-auto h-12 w-12 text-slate-400" />
              <h3 className="mt-4 text-lg font-semibold text-slate-900">Lab Analytics</h3>
              <p className="mt-2 text-sm text-slate-500">
                Detailed analytics for test trends, turnaround times, and department performance.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Book Test Dialog */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Book Lab Test</DialogTitle>
          </DialogHeader>
          <LabTestForm 
            test={selectedTest}
            onSubmit={(testData) => {
              // Handle test booking
              setOpenDialog(false);
            }}
            onCancel={() => setOpenDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LabTestForm({ test, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    testName: test?.testName || "",
    category: test?.category || "",
    patient: test?.patient || "",
    doctor: test?.doctor || "",
    priority: test?.priority || "ROUTINE",
    sampleType: test?.sampleType || "",
    notes: test?.notes || "",
    urgentReason: test?.urgentReason || "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-slate-700">Test Name</label>
          <Input
            value={formData.testName}
            onChange={(e) => setFormData({ ...formData, testName: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Category</label>
          <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(TEST_CATEGORIES).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Patient Name</label>
          <Input
            value={formData.patient}
            onChange={(e) => setFormData({ ...formData, patient: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Requesting Doctor</label>
          <Input
            value={formData.doctor}
            onChange={(e) => setFormData({ ...formData, doctor: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Priority</label>
          <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(PRIORITY_LEVELS).map((priority) => (
                <SelectItem key={priority} value={priority}>
                  {priority}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Sample Type</label>
          <Input
            value={formData.sampleType}
            onChange={(e) => setFormData({ ...formData, sampleType: e.target.value })}
            required
          />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium text-slate-700">Additional Notes</label>
        <Textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
        />
      </div>
      {formData.priority === PRIORITY_LEVELS.URGENT || formData.priority === PRIORITY_LEVELS.STAT ? (
        <div>
          <label className="text-sm font-medium text-slate-700">Reason for Urgency</label>
          <Textarea
            value={formData.urgentReason}
            onChange={(e) => setFormData({ ...formData, urgentReason: e.target.value })}
            rows={2}
            required
          />
        </div>
      ) : null}
      <div className="flex gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {test ? "Update Test" : "Book Test"}
        </Button>
      </div>
    </form>
  );
}
