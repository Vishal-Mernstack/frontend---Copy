import { useState, useEffect } from "react";
import { Search, Plus, Upload, Package, DollarSign, AlertTriangle } from "lucide-react";
import { medicinesApi } from "../services/medicinesApi";
import MedicinesUploader from "../components/pharmacy/MedicinesUploader";

export default function PharmacyInventory() {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [showUploader, setShowUploader] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0 });

  const fetchMedicines = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await medicinesApi.getAll({
        page: pagination.page,
        limit: pagination.limit,
        search,
      });
      
      const rawItems = response.data.data.items;
      
      const validItems = rawItems.filter(item => {
        const name = (item.name || "").toLowerCase();
        const manufacturer = (item.manufacturer || "").toLowerCase();
        
        const invalidPatterns = [
          "health", "insurance", "shield", "bluecross", "blueshield",
          "united", "molina", "priority", "meridian", "alliance",
          "aetna", "cigna", "humana", "kaiser", "doctor", "patient"
        ];
        
        for (const pattern of invalidPatterns) {
          if (name.includes(pattern) || manufacturer.includes(pattern)) {
            return false;
          }
        }
        
        return item.name && item.name.length >= 2;
      });
      
      setMedicines(validItems);
      setPagination((prev) => ({
        ...prev,
        total: response.data.data.pagination.total,
      }));
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load medicines");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedicines();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (search) {
        setPagination((prev) => ({ ...prev, page: 1 }));
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleUploadSuccess = () => {
    setShowUploader(false);
    fetchMedicines();
  };

  const stockStatus = (stock) => {
    if (stock === 0) return { color: "text-red-600", label: "Out of Stock" };
    if (stock < 50) return { color: "text-yellow-600", label: "Low Stock" };
    return { color: "text-green-600", label: "In Stock" };
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Pharmacy Inventory</h1>
          <p className="text-gray-500">Manage medicines and stock</p>
        </div>
        <button
          onClick={() => setShowUploader(!showUploader)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Upload className="h-4 w-4" />
          Upload CSV/Excel
        </button>
      </div>

      {showUploader && (
        <div className="mb-6">
          <MedicinesUploader onSuccess={handleUploadSuccess} />
        </div>
      )}

      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search medicines..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border rounded-lg"
        />
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : error ? (
        <div className="text-center py-8 text-red-500">{error}</div>
      ) : medicines.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No medicines found. Upload a CSV or Excel file to get started.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Medicine Name</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Manufacturer</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Price</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Stock</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {medicines.map((medicine) => {
                  const status = stockStatus(medicine.stock);
                  return (
                    <tr key={medicine.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{medicine.name}</td>
                      <td className="px-4 py-3 text-gray-500">{medicine.manufacturer || "-"}</td>
                      <td className="px-4 py-3">₹{Number(medicine.price).toFixed(2)}</td>
                      <td className="px-4 py-3">{medicine.stock}</td>
                      <td className={`px-4 py-3 font-medium ${status.color}`}>
                        {status.label}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-500">
              Showing {medicines.length} of {pagination.total} medicines
            </p>
            <div className="flex gap-2">
              <button
                onClick={() =>
                  setPagination((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))
                }
                disabled={pagination.page === 1}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() =>
                  setPagination((prev) => ({
                    ...prev,
                    page: Math.ceil(prev.total / prev.limit),
                  }))
                }
                disabled={pagination.page >= Math.ceil(pagination.total / pagination.limit)}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}