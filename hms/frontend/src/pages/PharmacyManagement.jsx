import { useState, useMemo } from "react";
import { format, addDays, differenceInDays } from "date-fns";
import { 
  Pill, 
  Package, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp, 
  TrendingDown,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  BarChart3,
  DollarSign
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

const MEDICINE_CATEGORIES = {
  ANTIBIOTICS: "Antibiotics",
  ANALGESICS: "Analgesics",
  ANTIPYRETICS: "Antipyretics",
  VITAMINS: "Vitamins & Supplements",
  CHRONIC: "Chronic Medications",
  EMERGENCY: "Emergency Drugs",
  VACCINES: "Vaccines",
  TOPICAL: "Topical Medications",
  INJECTABLES: "Injectables",
};

const STOCK_STATUS = {
  IN_STOCK: "In Stock",
  LOW_STOCK: "Low Stock", 
  OUT_OF_STOCK: "Out of Stock",
  DISCONTINUED: "Discontinued",
};

const STATUS_COLORS = {
  [STOCK_STATUS.IN_STOCK]: "bg-green-100 text-green-800 border-green-200",
  [STOCK_STATUS.LOW_STOCK]: "bg-amber-100 text-amber-800 border-amber-200",
  [STOCK_STATUS.OUT_OF_STOCK]: "bg-red-100 text-red-800 border-red-200",
  [STOCK_STATUS.DISCONTINUED]: "bg-gray-100 text-gray-800 border-gray-200",
};

const SAMPLE_MEDICINES = [
  { 
    id: 1, 
    name: "Amoxicillin 500mg", 
    category: "ANTIBIOTICS", 
    stock: 150, 
    minStock: 50, 
    unit: "tablets", 
    price: 12.50, 
    supplier: "MedCorp Pharmaceuticals",
    expiryDate: "2025-06-30",
    batchNumber: "AMX-2024-001",
    description: "Broad-spectrum antibiotic for bacterial infections",
    dosage: "500mg tablets",
    storage: "Room temperature, dry place"
  },
  { 
    id: 2, 
    name: "Paracetamol 500mg", 
    category: "ANALGESICS", 
    stock: 45, 
    minStock: 100, 
    unit: "tablets", 
    price: 8.75, 
    supplier: "PharmaTech Ltd",
    expiryDate: "2024-12-31",
    batchNumber: "PAR-2024-002",
    description: "Pain reliever and fever reducer",
    dosage: "500mg tablets",
    storage: "Room temperature"
  },
  { 
    id: 3, 
    name: "Ibuprofen 400mg", 
    category: "ANALGESICS", 
    stock: 200, 
    minStock: 75, 
    unit: "tablets", 
    price: 15.20, 
    supplier: "MedCorp Pharmaceuticals",
    expiryDate: "2025-08-15",
    batchNumber: "IBU-2024-003",
    description: "Anti-inflammatory pain medication",
    dosage: "400mg tablets",
    storage: "Room temperature"
  },
  { 
    id: 4, 
    name: "Vitamin D3 1000IU", 
    category: "VITAMINS", 
    stock: 0, 
    minStock: 50, 
    unit: "capsules", 
    price: 22.00, 
    supplier: "NutriHealth Inc",
    expiryDate: "2025-03-20",
    batchNumber: "VIT-2024-004",
    description: "Vitamin D3 supplement for bone health",
    dosage: "1000IU capsules",
    storage: "Cool, dry place"
  },
  { 
    id: 5, 
    name: "Insulin Glargine", 
    category: "INJECTABLES", 
    stock: 25, 
    minStock: 30, 
    unit: "pens", 
    price: 145.00, 
    supplier: "DiabetesCare Solutions",
    expiryDate: "2024-11-30",
    batchNumber: "INS-2024-005",
    description: "Long-acting insulin for diabetes management",
    dosage: "100U/ml pens",
    storage: "Refrigerated (2-8°C)"
  },
];

export default function PharmacyManagement() {
  const [medicines, setMedicines] = useState(SAMPLE_MEDICINES);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [openDialog, setOpenDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [activeTab, setActiveTab] = useState("inventory");

  const filteredMedicines = useMemo(() => {
    return medicines.filter(medicine => {
      const matchesSearch = medicine.name.toLowerCase().includes(search.toLowerCase()) ||
                          medicine.description.toLowerCase().includes(search.toLowerCase()) ||
                          medicine.supplier.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = categoryFilter === "all" || medicine.category === categoryFilter;
      
      let stockStatus = STOCK_STATUS.IN_STOCK;
      if (medicine.stock === 0) {
        stockStatus = STOCK_STATUS.OUT_OF_STOCK;
      } else if (medicine.stock <= medicine.minStock) {
        stockStatus = STOCK_STATUS.LOW_STOCK;
      }
      
      const matchesStatus = statusFilter === "all" || stockStatus === statusFilter;
      
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [medicines, search, categoryFilter, statusFilter]);

  const stats = useMemo(() => {
    const total = medicines.length;
    const inStock = medicines.filter(m => m.stock > m.minStock).length;
    const lowStock = medicines.filter(m => m.stock > 0 && m.stock <= m.minStock).length;
    const outOfStock = medicines.filter(m => m.stock === 0).length;
    
    const totalValue = medicines.reduce((sum, med) => sum + (med.stock * med.price), 0);
    const expiringSoon = medicines.filter(med => {
      const daysToExpiry = differenceInDays(new Date(med.expiryDate), new Date());
      return daysToExpiry <= 30 && daysToExpiry > 0;
    }).length;
    
    return {
      total,
      inStock,
      lowStock,
      outOfStock,
      totalValue,
      expiringSoon,
    };
  }, [medicines]);

  const getStockStatus = (medicine) => {
    if (medicine.stock === 0) return STOCK_STATUS.OUT_OF_STOCK;
    if (medicine.stock <= medicine.minStock) return STOCK_STATUS.LOW_STOCK;
    return STOCK_STATUS.IN_STOCK;
  };

  const getDaysToExpiry = (expiryDate) => {
    return differenceInDays(new Date(expiryDate), new Date());
  };

  const handleAddMedicine = (medicineData) => {
    if (editing) {
      const updatedMedicines = medicines.map(med => 
        med.id === editing.id ? { ...medicineData, id: editing.id } : med
      );
      setMedicines(updatedMedicines);
    } else {
      const newMedicine = {
        ...medicineData,
        id: Math.max(...medicines.map(m => m.id)) + 1,
      };
      setMedicines([...medicines, newMedicine]);
    }
    setOpenDialog(false);
    setEditing(null);
  };

  const handleDeleteMedicine = (id) => {
    setMedicines(medicines.filter(med => med.id !== id));
  };

  const handleStockUpdate = (id, newStock) => {
    const updatedMedicines = medicines.map(med => 
      med.id === id ? { ...med, stock: newStock } : med
    );
    setMedicines(updatedMedicines);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Pharmacy Management</h1>
          <p className="text-sm text-slate-500">Manage medicine inventory, prescriptions, and stock levels.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setOpenDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Medicine
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="h-8 w-8 text-slate-600" />
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                <p className="text-xs text-slate-500">Total Medicines</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.inStock}</p>
                <p className="text-xs text-slate-500">In Stock</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-8 w-8 text-amber-600" />
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.lowStock}</p>
                <p className="text-xs text-slate-500">Low Stock</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-8 w-8 text-red-600" />
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.outOfStock}</p>
                <p className="text-xs text-slate-500">Out of Stock</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-slate-900">${stats.totalValue.toLocaleString()}</p>
                <p className="text-xs text-slate-500">Total Value</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.expiringSoon}</p>
                <p className="text-xs text-slate-500">Expiring Soon</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-4">
          {/* Filters */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search medicines..."
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
                {Object.entries(MEDICINE_CATEGORIES).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Stock Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {Object.values(STOCK_STATUS).map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Medicine Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredMedicines.map((medicine) => {
              const stockStatus = getStockStatus(medicine);
              const daysToExpiry = getDaysToExpiry(medicine.expiryDate);
              const isExpiringSoon = daysToExpiry <= 30 && daysToExpiry > 0;
              const isExpired = daysToExpiry < 0;
              
              return (
                <Card key={medicine.id} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base font-medium text-slate-900">
                          {medicine.name}
                        </CardTitle>
                        <Badge className="mt-1" variant="outline">
                          {MEDICINE_CATEGORIES[medicine.category]}
                        </Badge>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setEditing(medicine)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Badge className={STATUS_COLORS[stockStatus]}>
                          {stockStatus}
                        </Badge>
                        <span className="text-sm font-medium text-slate-900">
                          {medicine.stock} {medicine.unit}
                        </span>
                      </div>
                      
                      <div className="text-sm text-slate-600">
                        <p>Min Stock: {medicine.minStock} {medicine.unit}</p>
                        <p>Price: ${medicine.price.toFixed(2)} per {medicine.unit}</p>
                        <p>Supplier: {medicine.supplier}</p>
                      </div>

                      <div className={`text-sm p-2 rounded ${
                        isExpired ? 'bg-red-50 text-red-700' :
                        isExpiringSoon ? 'bg-amber-50 text-amber-700' :
                        'bg-green-50 text-green-700'
                      }`}>
                        <p className="font-medium">
                          {isExpired ? 'EXPIRED' :
                           isExpiringSoon ? `Expires in ${daysToExpiry} days` :
                           'Good condition'}
                        </p>
                        <p>Exp: {format(new Date(medicine.expiryDate), 'MMM d, yyyy')}</p>
                      </div>

                      <div className="text-xs text-slate-500 space-y-1">
                        <p>Batch: {medicine.batchNumber}</p>
                        <p>Storage: {medicine.storage}</p>
                      </div>

                      <div className="flex gap-2 pt-2 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStockUpdate(medicine.id, medicine.stock + 10)}
                        >
                          <Plus className="mr-1 h-3 w-3" />
                          Add Stock
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStockUpdate(medicine.id, Math.max(0, medicine.stock - 10))}
                        >
                          Remove 10
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="prescriptions" className="space-y-4">
          <Card>
            <CardContent className="p-6 text-center">
              <Pill className="mx-auto h-12 w-12 text-slate-400" />
              <h3 className="mt-4 text-lg font-semibold text-slate-900">Prescription Management</h3>
              <p className="mt-2 text-sm text-slate-500">
                Digital prescription system with doctor integration and automated dispensing.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardContent className="p-6 text-center">
              <BarChart3 className="mx-auto h-12 w-12 text-slate-400" />
              <h3 className="mt-4 text-lg font-semibold text-slate-900">Pharmacy Reports</h3>
              <p className="mt-2 text-sm text-slate-500">
                Comprehensive analytics for inventory, sales, and medication usage patterns.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Medicine Dialog */}
      <Dialog open={openDialog} onOpenChange={(open) => {
        setOpenDialog(open);
        if (!open) setEditing(null);
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Medicine" : "Add New Medicine"}</DialogTitle>
          </DialogHeader>
          <MedicineForm 
            medicine={editing}
            onSubmit={handleAddMedicine}
            onCancel={() => {
              setOpenDialog(false);
              setEditing(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MedicineForm({ medicine, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    name: medicine?.name || "",
    category: medicine?.category || "",
    stock: medicine?.stock || 0,
    minStock: medicine?.minStock || 50,
    unit: medicine?.unit || "tablets",
    price: medicine?.price || 0,
    supplier: medicine?.supplier || "",
    expiryDate: medicine?.expiryDate || "",
    batchNumber: medicine?.batchNumber || "",
    description: medicine?.description || "",
    dosage: medicine?.dosage || "",
    storage: medicine?.storage || "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-slate-700">Medicine Name</label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
              {Object.entries(MEDICINE_CATEGORIES).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Current Stock</label>
          <Input
            type="number"
            value={formData.stock}
            onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Minimum Stock</label>
          <Input
            type="number"
            value={formData.minStock}
            onChange={(e) => setFormData({ ...formData, minStock: Number(e.target.value) })}
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Unit</label>
          <Input
            value={formData.unit}
            onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Price per Unit</label>
          <Input
            type="number"
            step="0.01"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Supplier</label>
          <Input
            value={formData.supplier}
            onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Expiry Date</label>
          <Input
            type="date"
            value={formData.expiryDate}
            onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Batch Number</label>
          <Input
            value={formData.batchNumber}
            onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
            required
          />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium text-slate-700">Description</label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={2}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-slate-700">Dosage</label>
          <Input
            value={formData.dosage}
            onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Storage Instructions</label>
          <Input
            value={formData.storage}
            onChange={(e) => setFormData({ ...formData, storage: e.target.value })}
          />
        </div>
      </div>
      <div className="flex gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {medicine ? "Update Medicine" : "Add Medicine"}
        </Button>
      </div>
    </form>
  );
}
