import { useState, useMemo } from "react";
import { format, addDays, differenceInDays } from "date-fns";
import { 
  Bed, 
  Users, 
  MapPin, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  ArrowRightLeft,
  Plus,
  Edit,
  Trash2,
  Filter
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

const WARD_TYPES = {
  ICU: { name: "ICU", color: "bg-red-100 text-red-800 border-red-200", icon: AlertCircle },
  ICCU: { name: "ICCU", color: "bg-orange-100 text-orange-800 border-orange-200", icon: AlertCircle },
  GENERAL: { name: "General", color: "bg-blue-100 text-blue-800 border-blue-200", icon: Users },
  PRIVATE: { name: "Private", color: "bg-green-100 text-green-800 border-green-200", icon: Users },
  SEMI_PRIVATE: { name: "Semi-Private", color: "bg-purple-100 text-purple-800 border-purple-200", icon: Users },
  MATERNITY: { name: "Maternity", color: "bg-pink-100 text-pink-800 border-pink-200", icon: Users },
  PEDIATRIC: { name: "Pediatric", color: "bg-cyan-100 text-cyan-800 border-cyan-200", icon: Users },
};

const BED_STATUS = {
  AVAILABLE: "Available",
  OCCUPIED: "Occupied", 
  MAINTENANCE: "Maintenance",
  RESERVED: "Reserved",
  CLEANING: "Cleaning",
};

const STATUS_COLORS = {
  [BED_STATUS.AVAILABLE]: "bg-green-100 text-green-800 border-green-200",
  [BED_STATUS.OCCUPIED]: "bg-red-100 text-red-800 border-red-200",
  [BED_STATUS.MAINTENANCE]: "bg-amber-100 text-amber-800 border-amber-200",
  [BED_STATUS.RESERVED]: "bg-blue-100 text-blue-800 border-blue-200",
  [BED_STATUS.CLEANING]: "bg-gray-100 text-gray-800 border-gray-200",
};

const SAMPLE_BEDS = [
  { id: 1, number: "ICU-001", wardType: "ICU", status: "OCCUPIED", patient: "John Doe", admittedDate: "2024-12-10", dailyRate: 500 },
  { id: 2, number: "ICU-002", wardType: "ICU", status: "AVAILABLE", patient: null, admittedDate: null, dailyRate: 500 },
  { id: 3, number: "GEN-101", wardType: "GENERAL", status: "OCCUPIED", patient: "Jane Smith", admittedDate: "2024-12-08", dailyRate: 150 },
  { id: 4, number: "GEN-102", wardType: "GENERAL", status: "AVAILABLE", patient: null, admittedDate: null, dailyRate: 150 },
  { id: 5, number: "PVT-201", wardType: "PRIVATE", status: "OCCUPIED", patient: "Robert Johnson", admittedDate: "2024-12-05", dailyRate: 300 },
  { id: 6, number: "PVT-202", wardType: "PRIVATE", status: "RESERVED", patient: "Alice Brown", admittedDate: null, dailyRate: 300 },
  { id: 7, number: "MAT-301", wardType: "MATERNITY", status: "AVAILABLE", patient: null, admittedDate: null, dailyRate: 250 },
  { id: 8, number: "PED-401", wardType: "PEDIATRIC", status: "MAINTENANCE", patient: null, admittedDate: null, dailyRate: 200 },
];

export default function BedManagement() {
  const [beds, setBeds] = useState(SAMPLE_BEDS);
  const [search, setSearch] = useState("");
  const [wardFilter, setWardFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [openDialog, setOpenDialog] = useState(false);
  const [transferDialog, setTransferDialog] = useState(false);
  const [selectedBed, setSelectedBed] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  const filteredBeds = useMemo(() => {
    return beds.filter(bed => {
      const matchesSearch = bed.number.toLowerCase().includes(search.toLowerCase()) ||
                          (bed.patient && bed.patient.toLowerCase().includes(search.toLowerCase()));
      const matchesWard = wardFilter === "all" || bed.wardType === wardFilter;
      const matchesStatus = statusFilter === "all" || bed.status === statusFilter;
      return matchesSearch && matchesWard && matchesStatus;
    });
  }, [beds, search, wardFilter, statusFilter]);

  const stats = useMemo(() => {
    const total = beds.length;
    const available = beds.filter(b => b.status === BED_STATUS.AVAILABLE).length;
    const occupied = beds.filter(b => b.status === BED_STATUS.OCCUPIED).length;
    const maintenance = beds.filter(b => b.status === BED_STATUS.MAINTENANCE).length;
    const reserved = beds.filter(b => b.status === BED_STATUS.RESERVED).length;

    const occupancyRate = total > 0 ? Math.round((occupied / total) * 100) : 0;
    const dailyRevenue = beds
      .filter(b => b.status === BED_STATUS.OCCUPIED)
      .reduce((sum, bed) => sum + bed.dailyRate, 0);

    return {
      total,
      available,
      occupied,
      maintenance,
      reserved,
      occupancyRate,
      dailyRevenue,
    };
  }, [beds]);

  const handleBedTransfer = (fromBed, toBed) => {
    const updatedBeds = beds.map(bed => {
      if (bed.id === fromBed.id) {
        return { ...bed, status: BED_STATUS.CLEANING, patient: null, admittedDate: null };
      }
      if (bed.id === toBed.id) {
        return { ...bed, status: BED_STATUS.OCCUPIED, patient: fromBed.patient, admittedDate: fromBed.admittedDate };
      }
      return bed;
    });
    setBeds(updatedBeds);
    setTransferDialog(false);
  };

  const handleBedStatusUpdate = (bedId, newStatus) => {
    const updatedBeds = beds.map(bed => 
      bed.id === bedId ? { ...bed, status: newStatus } : bed
    );
    setBeds(updatedBeds);
  };

  const calculateStayDuration = (admittedDate) => {
    if (!admittedDate) return 0;
    return differenceInDays(new Date(), new Date(admittedDate));
  };

  const calculateTotalCharges = (bed) => {
    if (!bed.admittedDate) return 0;
    const days = calculateStayDuration(bed.admittedDate);
    return days * bed.dailyRate;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Bed & Ward Management</h1>
          <p className="text-sm text-slate-500">Manage hospital beds, wards, and patient allocations.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setOpenDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Bed
          </Button>
        </div>
      </div>

      {/* Statistics Overview */}
      <div className="grid gap-4 md:grid-cols-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Bed className="h-8 w-8 text-slate-600" />
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                <p className="text-xs text-slate-500">Total Beds</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.available}</p>
                <p className="text-xs text-slate-500">Available</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-8 w-8 text-red-600" />
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.occupied}</p>
                <p className="text-xs text-slate-500">Occupied</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.reserved}</p>
                <p className="text-xs text-slate-500">Reserved</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-8 w-8 text-amber-600" />
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.maintenance}</p>
                <p className="text-xs text-slate-500">Maintenance</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-sky-100 flex items-center justify-center">
                <span className="text-sm font-bold text-sky-700">{stats.occupancyRate}%</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">${stats.dailyRevenue}</p>
                <p className="text-xs text-slate-500">Daily Revenue</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Bed Overview</TabsTrigger>
          <TabsTrigger value="wards">Ward Management</TabsTrigger>
          <TabsTrigger value="transfers">Patient Transfers</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Filters */}
          <div className="flex gap-3">
            <Input
              placeholder="Search beds or patients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
            <Select value={wardFilter} onValueChange={setWardFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Ward Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Wards</SelectItem>
                {Object.entries(WARD_TYPES).map(([key, ward]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <ward.icon className="h-4 w-4" />
                      {ward.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {Object.values(BED_STATUS).map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Bed Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredBeds.map((bed) => {
              const WardIcon = WARD_TYPES[bed.wardType]?.icon || Bed;
              const stayDuration = calculateStayDuration(bed.admittedDate);
              const totalCharges = calculateTotalCharges(bed);
              
              return (
                <Card key={bed.id} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium text-slate-900">
                        {bed.number}
                      </CardTitle>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedBed(bed)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={WARD_TYPES[bed.wardType]?.color}>
                        <WardIcon className="mr-1 h-3 w-3" />
                        {WARD_TYPES[bed.wardType]?.name}
                      </Badge>
                      <Badge className={STATUS_COLORS[bed.status]}>
                        {bed.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      {bed.patient && (
                        <div>
                          <p className="text-sm font-medium text-slate-900">Patient</p>
                          <p className="text-sm text-slate-600">{bed.patient}</p>
                        </div>
                      )}
                      {bed.admittedDate && (
                        <div>
                          <p className="text-sm font-medium text-slate-900">Admitted</p>
                          <p className="text-sm text-slate-600">
                            {format(new Date(bed.admittedDate), 'MMM d, yyyy')}
                          </p>
                          <p className="text-xs text-slate-500">
                            {stayDuration} days
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-slate-900">Daily Rate</p>
                        <p className="text-sm text-slate-600">${bed.dailyRate}</p>
                      </div>
                      {bed.patient && (
                        <div>
                          <p className="text-sm font-medium text-slate-900">Total Charges</p>
                          <p className="text-sm font-semibold text-slate-900">${totalCharges}</p>
                        </div>
                      )}
                    </div>
                    {bed.status === BED_STATUS.OCCUPIED && (
                      <div className="mt-3 pt-3 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedBed(bed);
                            setTransferDialog(true);
                          }}
                          className="w-full"
                        >
                          <ArrowRightLeft className="mr-2 h-4 w-4" />
                          Transfer Patient
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="wards" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Object.entries(WARD_TYPES).map(([key, ward]) => {
              const wardBeds = beds.filter(b => b.wardType === key);
              const occupied = wardBeds.filter(b => b.status === BED_STATUS.OCCUPIED).length;
              const available = wardBeds.filter(b => b.status === BED_STATUS.AVAILABLE).length;
              const occupancyRate = wardBeds.length > 0 ? Math.round((occupied / wardBeds.length) * 100) : 0;
              
              return (
                <Card key={key}>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <ward.icon className="h-5 w-5" />
                      <CardTitle className="text-lg">{ward.name} Ward</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Total Beds:</span>
                        <span className="font-medium">{wardBeds.length}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Occupied:</span>
                        <span className="font-medium text-red-600">{occupied}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Available:</span>
                        <span className="font-medium text-green-600">{available}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Occupancy:</span>
                        <span className="font-medium">{occupancyRate}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-sky-600 h-2 rounded-full transition-all"
                          style={{ width: `${occupancyRate}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="transfers" className="space-y-4">
          <Card>
            <CardContent className="p-6 text-center">
              <ArrowRightLeft className="mx-auto h-12 w-12 text-slate-400" />
              <h3 className="mt-4 text-lg font-semibold text-slate-900">Patient Transfer System</h3>
              <p className="mt-2 text-sm text-slate-500">
                Click "Transfer Patient" on any occupied bed to initiate a transfer.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Transfer Dialog */}
      <Dialog open={transferDialog} onOpenChange={setTransferDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Patient</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-slate-700">From Bed</p>
              <div className="mt-2 rounded-md border p-3">
                <p className="font-medium">{selectedBed?.number}</p>
                <p className="text-sm text-slate-600">Patient: {selectedBed?.patient}</p>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">To Bed</p>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select destination bed" />
                </SelectTrigger>
                <SelectContent>
                  {beds
                    .filter(bed => bed.status === BED_STATUS.AVAILABLE && bed.id !== selectedBed?.id)
                    .map((bed) => (
                      <SelectItem key={bed.id} value={String(bed.id)}>
                        {bed.number} - {WARD_TYPES[bed.wardType]?.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">Transfer Notes</p>
              <Textarea placeholder="Reason for transfer..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              // Handle transfer logic
              setTransferDialog(false);
            }}>
              Complete Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
