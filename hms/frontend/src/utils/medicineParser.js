/**
 * Medicine Parser - Extracts pharmacy data from uploaded files via backend API
 */

import api from "../lib/api";
import { toast } from "sonner";

export const normalizeMedicine = (row) => ({
  medicine_name: String(row.medicine_name || row.name || "").trim(),
  manufacturer: String(row.manufacturer || row.company || "Unknown").trim() || "Unknown",
  price: Number(row.price || row.mrp || 0),
  stock: Number(row.stock || row.quantity || 0),
  status: row.status || "Active",
  errors: Array.isArray(row.errors) ? row.errors : [],
  isDuplicate: Boolean(row.isDuplicate),
  existingStock: Number(row.existingStock || 0),
  sourceFiles: Array.isArray(row.sourceFiles)
    ? row.sourceFiles
    : row.sourceFile
      ? [row.sourceFile]
      : [],
});

export const removeDuplicates = (data) => {
  const map = new Map();

  data.forEach((rawItem) => {
    const item = normalizeMedicine(rawItem);
    const key = `${item.medicine_name.toLowerCase()}::${item.manufacturer.toLowerCase()}`;

    if (!map.has(key)) {
      map.set(key, item);
      return;
    }

    const existing = map.get(key);
    map.set(key, {
      ...existing,
      stock: existing.stock + item.stock,
      price: item.price > 0 ? item.price : existing.price,
      status: item.status || existing.status,
      errors: [...new Set([...(existing.errors || []), ...(item.errors || [])])],
      isDuplicate: existing.isDuplicate || item.isDuplicate,
      existingStock: Math.max(existing.existingStock || 0, item.existingStock || 0),
      sourceFiles: [...new Set([...(existing.sourceFiles || []), ...(item.sourceFiles || [])])],
    });
  });

  return Array.from(map.values());
};

/**
 * Upload files to backend and extract medicines
 * @param {File[]} files - Array of CSV/Excel files
 * @returns {Promise<{ extractedMedicines: Array, stats: Object, files: Array, errors?: Array }>}
 */
export async function extractMedicinesFromFiles(files) {
  try {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    
    const response = await api.post("/medicines/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    
    if (!response.data.success) {
      throw new Error(response.data.message || "Upload failed");
    }
    
    const { extractedMedicines, files: processedFiles, errors } = response.data.data || {};
    const medicinesData = Array.isArray(extractedMedicines) ? extractedMedicines : [];
    const mergedMedicines = removeDuplicates(medicinesData);
    const stats = calculateExtractionStats(mergedMedicines);
    
    // Add id to each medicine for frontend tracking
    const medicinesWithIds = mergedMedicines.map((med, index) => ({
      ...normalizeMedicine(med),
      id: `extracted-${index}-${Date.now()}`,
      validated: (med.errors || []).length === 0,
    }));
    
    return {
      extractedMedicines: medicinesWithIds,
      stats,
      files: processedFiles,
      errors
    };
  } catch (error) {
    const message = error?.response?.data?.message || error.message || "Failed to process files";
    toast.error(message);
    throw error;
  }
}

// Check for duplicates in extracted medicines
export const checkDuplicates = (data) => {
  const seen = new Set();
  return data.filter((item) => {
    const key = (item.medicine_name || "").toLowerCase() + (item.manufacturer || "").toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

// Calculate summary statistics
export function calculateExtractionStats(medicines) {
  const total = medicines.length;
  const valid = medicines.filter(m => m.errors.length === 0).length;
  const invalid = total - valid;
  const duplicates = medicines.filter(m => m.isDuplicate).length;
  const totalValue = medicines.reduce((sum, m) => sum + (m.price * m.stock), 0);
  
  return { total, valid, invalid, duplicates, totalValue };
}
