import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import EmptyState from "../components/shared/EmptyState";
import LoadingSkeleton from "../components/shared/LoadingSkeleton";
import Pagination from "../components/shared/Pagination";
import FileDropZone from "../components/shared/FileDropZone";
import ProductCard from "../components/pharmacy/ProductCard";
import useDebounce from "../hooks/useDebounce";
import usePharmacy from "../hooks/usePharmacy";
import { BADGE_VARIANTS } from "../utils/constants";
import { formatCurrency } from "../utils/helpers";
import { toast } from "sonner";
import { extractMedicinesFromFiles, calculateExtractionStats } from "../utils/medicineParser";

const schema = z.object({
  name: z.string().min(2, "Medicine name required"),
  manufacturer: z.string().optional(),
  stock: z.coerce.number().min(0, "Stock cannot be negative"),
  price: z.coerce.number().min(0, "Price cannot be negative"),
  min_stock_level: z.coerce.number().min(0, "Min stock cannot be negative"),
  expiry_date: z.string().optional(),
  batch_number: z.string().optional(),
});

export default function Pharmacy() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [fileDialogOpen, setFileDialogOpen] = useState(false);
  const [dialogKey, setDialogKey] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractedMedicines, setExtractedMedicines] = useState([]);
  const [editingExtracted, setEditingExtracted] = useState({});
  const [showExtractedInMain, setShowExtractedInMain] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [manufacturerFilter, setManufacturerFilter] = useState("all");

  const debouncedSearch = useDebounce(search, 300);
  const pharmacy = usePharmacy({
    page: 1,
    limit: 200,
    search: debouncedSearch,
  });
  
  const { data, isLoading, error, createMedicine, updateMedicine, deleteMedicine, bulkInsert, creating, updating, deleting, inserting, refetch } = pharmacy || {};
  
  console.log("Destructured values - data:", data, "error:", error, "isLoading:", isLoading);
  
  // Removed early return to prevent hook rule violation
  
  // Defensive checks to prevent crashes
  const safeData = data || { items: [], alerts: { lowStock: 0, outOfStock: 0, expiring: 0 }, pagination: { totalPages: 1 } };
  const items = useMemo(() => Array.isArray(safeData.items) ? safeData.items : [], [safeData.items]);
  const alerts = safeData.alerts || { lowStock: 0, outOfStock: 0, expiring: 0 };
  
  console.log("Processed items count:", items.length, "alerts:", alerts);
  console.log("Filters - status:", statusFilter, "manufacturer:", manufacturerFilter);

  const manufacturers = useMemo(() => {
    try {
      const mfrs = new Set(items.map(i => i?.manufacturer).filter(Boolean));
      return Array.from(mfrs).sort();
    } catch (e) {
      console.error("Error calculating manufacturers:", e);
      return [];
    }
  }, [items]);

  const filteredItems = useMemo(() => {
    try {
      return items.filter(item => {
        if (!item) return false;
        if (manufacturerFilter !== "all" && item.manufacturer !== manufacturerFilter) return false;
        if (statusFilter === "all") return true;
        return item.status === statusFilter;
      });
    } catch (e) {
      console.error("Error filtering items:", e);
      return [];
    }
  }, [items, statusFilter, manufacturerFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / 50));
  const pagedItems = useMemo(() => filteredItems.slice((page - 1) * 50, page * 50), [filteredItems, page]);

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: "", manufacturer: "", stock: 0, price: 0, min_stock_level: 10, expiry_date: "", batch_number: "" },
  });

  const saveMedicine = async (values) => {
    try {
      if (editing) {
        await updateMedicine({ id: editing.id, payload: values });
      } else {
        await createMedicine(values);
      }
      setOpen(false);
      setEditing(null);
      form.reset({ name: "", manufacturer: "", stock: 0, price: 0, min_stock_level: 10, expiry_date: "", batch_number: "" });
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (item) => {
    setEditing(item);
    form.reset({
      name: item.name || "",
      manufacturer: item.manufacturer || "",
      stock: Number(item.stock || 0),
      price: Number(item.price || 0),
      min_stock_level: Number(item.min_stock_level || 10),
      expiry_date: item.expiry_date || "",
      batch_number: item.batch_number || "",
    });
    setOpen(true);
  };

  
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Pharmacy</h1>
          <p className="text-sm text-slate-500">Manage live pharmacy inventory and pricing.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setFileDialogOpen(true)}>
            Upload Medical Files
          </Button>
          <Button className="bg-sky-600 hover:bg-sky-700" onClick={() => setOpen(true)}>
            Add Medicine
          </Button>
        </div>
      </div>

      
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search medicine or manufacturer"
          value={search}
          className="max-w-xs"
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Low Stock">Low Stock</SelectItem>
            <SelectItem value="Out of Stock">Out of Stock</SelectItem>
            <SelectItem value="Expired">Expired</SelectItem>
            <SelectItem value="Expiring Soon">Expiring Soon</SelectItem>
          </SelectContent>
        </Select>
        <Select value={manufacturerFilter} onValueChange={(v) => { setManufacturerFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Manufacturers" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Manufacturers</SelectItem>
            {manufacturers.map(m => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {alerts.lowStock > 0 && (
          <Badge 
            variant="destructive" 
            className="gap-1 cursor-pointer hover:bg-red-700"
            onClick={() => { setStatusFilter("Low Stock"); setPage(1); }}
            title="Click to filter low stock medicines"
          >
            {alerts.lowStock} Low Stock
          </Badge>
        )}
        {alerts.outOfStock > 0 && (
          <Badge 
            variant="destructive" 
            className="gap-1 cursor-pointer bg-red-600 hover:bg-red-700"
            onClick={() => { setStatusFilter("Out of Stock"); setPage(1); }}
            title="Click to filter out of stock medicines"
          >
            {alerts.outOfStock} Out of Stock
          </Badge>
        )}
        {alerts.expiring > 0 && (
          <Badge 
            variant="outline" 
            className="gap-1 border-amber-500 text-amber-600 cursor-pointer"
            onClick={() => { setStatusFilter("Expiring Soon"); setPage(1); }}
            title="Click to filter expiring soon medicines"
          >
            {alerts.expiring} Expiring
          </Badge>
        )}
      </div>

      {isLoading ? (
        <LoadingSkeleton rows={6} />
      ) : error ? (
        <EmptyState
          title="Pharmacy unavailable"
          description={error.message || "Unable to load pharmacy inventory. Please check your connection and try again."}
        >
          <Button onClick={() => pharmacy.refetch()} className="mt-4 bg-sky-600 hover:bg-sky-700">
            Retry
          </Button>
        </EmptyState>
      ) : pagedItems.length === 0 ? (
        <EmptyState 
          title={items.length === 0 ? "No medicines" : "No matching medicines"} 
          description={items.length === 0 
            ? "Create the first pharmacy item." 
            : `No medicines match the current filters. Showing ${items.length} total items.`} 
        >
          {items.length > 0 && (
            <Button 
              variant="outline" 
              onClick={() => { setStatusFilter("all"); setManufacturerFilter("all"); setSearch(""); }}
              className="mt-4"
            >
              Clear Filters
            </Button>
          )}
        </EmptyState>
      ) : (
        <div className="rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Medicine</TableHead>
                <TableHead>Manufacturer</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Min Level</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.manufacturer || "-"}</TableCell>
                  <TableCell>
                    <span className={item.stock === 0 ? "text-red-600 font-semibold" : item.stock < item.min_stock_level ? "text-amber-600 font-semibold" : ""}>
                      {item.stock}
                    </span>
                  </TableCell>
                  <TableCell>{item.min_stock_level || 10}</TableCell>
                  <TableCell>
                    {item.expiry_date ? (
                      <span className={new Date(item.expiry_date) < new Date() ? "text-red-600 font-semibold" : new Date(item.expiry_date) < new Date(Date.now() + 30*24*60*60*1000) ? "text-amber-600" : ""}>
                        {new Date(item.expiry_date).toLocaleDateString()}
                      </span>
                    ) : "-"}
                  </TableCell>
                  <TableCell>{formatCurrency(item.price)}</TableCell>
                  <TableCell>
                    <Badge variant={BADGE_VARIANTS[item.status] || "secondary"}>{item.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(item)}>Edit</Button>
                      <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => deleteMedicine(item.id)}>Delete</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {/* Add/Edit Medicine Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Medicine" : "Add Medicine"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-700">Medicine Name *</label>
              <Input placeholder="Enter medicine name" {...form.register("name")} />
              {form.formState.errors.name && <p className="text-xs text-red-500">{form.formState.errors.name.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Manufacturer</label>
              <Input placeholder="Enter manufacturer" {...form.register("manufacturer")} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Stock</label>
              <Input type="number" {...form.register("stock")} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Min Stock Level</label>
              <Input type="number" {...form.register("min_stock_level")} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Expiry Date</label>
              <Input type="date" {...form.register("expiry_date")} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Batch Number</label>
              <Input placeholder="Enter batch number" {...form.register("batch_number")} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Price</label>
              <Input type="number" step="0.01" {...form.register("price")} />
              {form.formState.errors.price && <p className="text-xs text-red-500">{form.formState.errors.price.message}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="bg-sky-600 hover:bg-sky-700" onClick={form.handleSubmit(saveMedicine)} disabled={creating || updating}>
              {creating || updating ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* File Upload Dialog */}
      <Dialog open={fileDialogOpen} onOpenChange={(open) => {
        setFileDialogOpen(open);
        if (open) setDialogKey(k => k + 1);
        if (!open) setUploadedFiles([]);
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload Medical Files</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              Upload one or more pharmacy inventory files.
              Supported formats: CSV, XLSX, XLS.
            </p>
            <FileDropZone
              key={dialogKey}
              multiple={true}
              allowedTypes={[".csv", ".xlsx", ".xls", "text/csv", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]}
              title="Drop pharmacy files here, or click to browse"
              description="Supports: CSV, Excel (.xlsx, .xls) (Max 10MB each)"
              onFilesSelected={(files) => setUploadedFiles(files)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setFileDialogOpen(false); setUploadedFiles([]); }}>
              Cancel
            </Button>
            <Button 
              className="bg-sky-600 hover:bg-sky-700" 
              disabled={uploadedFiles.length === 0 || uploading || extracting}
              onClick={async () => {
                const token = localStorage.getItem("medicare_token");
                if (!token) {
                  toast.error("Please login first to upload files");
                  window.location.href = "/role-based-login";
                  return;
                }
                
                setExtracting(true);
                const fileCount = uploadedFiles.length;
                try {
                  const result = await extractMedicinesFromFiles(uploadedFiles);
                  toast.success(`Extracted ${result.stats.valid} medicines from ${fileCount} file(s). Review below.`);
                  setExtractedMedicines(result.extractedMedicines);
                  setShowExtractedInMain(true);
                  setFileDialogOpen(false);
                  setUploadedFiles([]);
                } catch (error) {
                  console.error(error);
                } finally {
                  setExtracting(false);
                }
              }}
            >
              {extracting ? "Extracting..." : uploading ? "Uploading..." : `Process Files ${uploadedFiles.length > 0 ? `(${uploadedFiles.length})` : ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extracted Medicines Review Section */}
      {showExtractedInMain && extractedMedicines.length > 0 && (
        <div className="space-y-4 rounded-xl border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Extracted Medicines from Files</h2>
              <p className="text-sm text-slate-500">Review and add the extracted medicines to your inventory</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setShowExtractedInMain(false); setExtractedMedicines([]); setEditingExtracted({}); }}>
                Cancel
              </Button>
              <Button className="bg-green-600 hover:bg-green-700" disabled={extractedMedicines.filter(m => m.errors.length === 0).length === 0 || inserting} onClick={async () => {
                const validMedicines = extractedMedicines.filter(m => m.errors.length === 0);
                try {
                  const result = await bulkInsert(validMedicines);
                  setShowExtractedInMain(false);
                  setExtractedMedicines([]);
                  setEditingExtracted({});
                  if (result?.failed > 0) {
                    toast.warning(`Added ${result.added}, updated ${result.updated}, ${result.failed} failed`);
                  }
                } catch (error) {
                  console.error("Bulk insert failed:", error);
                }
              }}>
                {inserting ? "Saving..." : `Add ${extractedMedicines.filter(m => m.errors.length === 0).length} Valid Medicines`}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            {(() => {
              const stats = calculateExtractionStats(extractedMedicines);
              return (
                <>
                  <div className="bg-sky-50 p-3 rounded-lg text-center">
                    <p className="text-2xl font-bold text-sky-600">{stats.total}</p>
                    <p className="text-xs text-slate-600">Total Extracted</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg text-center">
                    <p className="text-2xl font-bold text-green-600">{stats.valid}</p>
                    <p className="text-xs text-slate-600">Valid</p>
                  </div>
                  <div className="bg-amber-50 p-3 rounded-lg text-center">
                    <p className="text-2xl font-bold text-amber-600">{stats.duplicates}</p>
                    <p className="text-xs text-slate-600">Duplicates</p>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg text-center">
                    <p className="text-2xl font-bold text-purple-600">{formatCurrency(stats.totalValue)}</p>
                    <p className="text-xs text-slate-600">Total Value</p>
                  </div>
                </>
              );
            })()}
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Medicine Name</TableHead>
                  <TableHead>Manufacturer</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {extractedMedicines.map((med, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{med.name}</TableCell>
                    <TableCell>{med.manufacturer || "-"}</TableCell>
                    <TableCell>{med.stock}</TableCell>
                    <TableCell>{formatCurrency(med.price)}</TableCell>
                    <TableCell>
                      {med.errors.length > 0 ? (
                        <Badge variant="destructive">Invalid</Badge>
                      ) : med.isDuplicate ? (
                        <Badge variant="outline">Duplicate</Badge>
                      ) : (
                        <Badge variant="secondary">Valid</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}