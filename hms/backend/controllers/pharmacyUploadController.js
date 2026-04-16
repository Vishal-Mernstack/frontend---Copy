import fs from "fs";
import path from "path";
import csv from "csv-parser";
import xlsx from "xlsx";
import { getClient, query } from "../config/db.js";

const ALLOWED_EXTENSIONS = [".csv", ".xlsx", ".xls"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const validateFile = (file) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return { valid: false, error: `Invalid file type. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}` };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File too large. Max size: ${MAX_FILE_SIZE / 1024 / 1024}MB` };
  }
  return { valid: true };
};

const normalizeMedicineData = (row) => {
  const normalized = {};
  
  // Map various column names to standard fields
  for (const [key, value] of Object.entries(row)) {
    const lowerKey = key.toLowerCase().trim();
    
    if (lowerKey.includes("name") || lowerKey === "medicine" || lowerKey === "drug" || lowerKey === "product") {
      normalized.medicine_name = String(value || "").trim();
    } else if (lowerKey.includes("manufacturer") || lowerKey.includes("company") || lowerKey.includes("brand") || lowerKey === "mfg") {
      normalized.manufacturer = String(value || "").trim();
    } else if (lowerKey.includes("price") || lowerKey.includes("cost") || lowerKey.includes("rate") || lowerKey.includes("amount")) {
      const price = parseFloat(value);
      normalized.price = isNaN(price) || price < 0 ? 0 : price;
    } else if (lowerKey.includes("stock") || lowerKey.includes("quantity") || lowerKey.includes("qty") || lowerKey.includes("inventory") || lowerKey.includes("units")) {
      const stock = parseInt(value, 10);
      normalized.stock = isNaN(stock) || stock < 0 ? 0 : stock;
    } else if (lowerKey.includes("status") || lowerKey.includes("active") || lowerKey.includes("state")) {
      const status = String(value || "Active").trim();
      normalized.status = ["Active", "Inactive"].includes(status) ? status : "Active";
    }
  }
  
  // Set defaults
  if (!normalized.status) normalized.status = "Active";
  if (!normalized.manufacturer) normalized.manufacturer = "Unknown";
  if (typeof normalized.price !== "number") normalized.price = 0;
  if (typeof normalized.stock !== "number") normalized.stock = 0;
  
  return normalized;
};

const getDatasetHeaders = (rows) => {
  if (!Array.isArray(rows) || rows.length === 0) {
    return [];
  }

  return Array.from(
    new Set(rows.flatMap((row) => Object.keys(row).map((key) => key.toLowerCase().trim())))
  );
};

const detectDatasetType = (rows) => {
  const headers = getDatasetHeaders(rows);
  const has = (header) => headers.includes(header);

  if (has("medicine_name") || (has("name") && has("manufacturer") && has("price") && has("stock"))) {
    return "inventory";
  }

  if (has("brandname") && has("genericname") && has("ndc")) {
    return "drugs";
  }

  if (has("patientid") && has("ndc") && has("qty")) {
    return "prescriptions";
  }

  if (has("supid") && has("name") && has("address") && has("phone")) {
    return "suppliers";
  }

  return "unsupported";
};

const validateMedicine = (medicine) => {
  const errors = [];
  
  if (!medicine.medicine_name || medicine.medicine_name.length < 2) {
    errors.push("Medicine name must be at least 2 characters");
  }
  
  if (isNaN(medicine.price) || medicine.price < 0) {
    errors.push("Price must be a positive number");
  }
  
  if (isNaN(medicine.stock) || medicine.stock < 0) {
    errors.push("Stock must be a positive number");
  }
  
  return errors;
};

const mergeMedicineRecords = (medicines) => {
  const merged = new Map();

  medicines.forEach((medicine) => {
    const name = String(medicine.medicine_name || "").trim();
    const manufacturer = String(medicine.manufacturer || "Unknown").trim() || "Unknown";
    const key = `${name.toLowerCase()}::${manufacturer.toLowerCase()}`;
    const sourceFiles = Array.isArray(medicine.sourceFiles)
      ? medicine.sourceFiles
      : medicine.sourceFile
        ? [medicine.sourceFile]
        : [];

    if (!merged.has(key)) {
      merged.set(key, {
        ...medicine,
        medicine_name: name,
        manufacturer,
        stock: Number(medicine.stock || 0),
        price: Number(medicine.price || 0),
        sourceFiles: [...new Set(sourceFiles)],
      });
      return;
    }

    const current = merged.get(key);
    merged.set(key, {
      ...current,
      stock: Number(current.stock || 0) + Number(medicine.stock || 0),
      price: Number(medicine.price || 0) > 0 ? Number(medicine.price) : Number(current.price || 0),
      status: medicine.status || current.status || "Active",
      sourceFiles: [...new Set([...(current.sourceFiles || []), ...sourceFiles])],
    });
  });

  return Array.from(merged.values()).map((medicine) => ({
    ...medicine,
    errors: validateMedicine(medicine),
  }));
};

const buildSupplierMap = (supplierRows) => {
  return new Map(
    supplierRows.map((row) => [
      String(row.supID ?? row.supid ?? "").trim(),
      String(row.name || row.Name || "Unknown").trim() || "Unknown",
    ])
  );
};

const buildPrescriptionTotals = (prescriptionRows) => {
  const totals = new Map();

  prescriptionRows.forEach((row) => {
    const ndc = String(row.NDC ?? row.ndc ?? "").trim();
    if (!ndc) {
      return;
    }

    const qty = Number.parseInt(row.qty ?? row.QTY ?? row.quantity ?? 0, 10);
    totals.set(ndc, (totals.get(ndc) || 0) + (Number.isNaN(qty) ? 0 : qty));
  });

  return totals;
};

const buildMedicinesFromDrugRows = (drugRows, supplierMap, prescriptionTotals, sourceFile) => {
  return drugRows.map((row) => {
    const ndc = String(row.NDC ?? row.ndc ?? "").trim();
    const dosage = Number.parseInt(row.dosage ?? row.DOSAGE ?? 0, 10);
    const stockFromPrescriptions = prescriptionTotals.get(ndc);
    const sellPrice = Number.parseFloat(row.sellPrice ?? row.sellprice ?? row.price ?? 0);
    const purchasePrice = Number.parseFloat(row.purchasePrice ?? row.purchaseprice ?? 0);
    const supplierId = String(row.supID ?? row.supid ?? "").trim();

    return {
      medicine_name: String(row.brandName ?? row.brandname ?? row.genericName ?? row.genericname ?? ndc).trim(),
      manufacturer: supplierMap.get(supplierId) || "Unknown",
      price: Number.isNaN(sellPrice) ? (Number.isNaN(purchasePrice) ? 0 : purchasePrice) : sellPrice,
      stock: stockFromPrescriptions ?? (Number.isNaN(dosage) ? 0 : dosage),
      status: "Active",
      sourceFile,
      ndc,
    };
  });
};

const checkDuplicates = async (medicines) => {
  const existingMedicines = await query("SELECT id, medicine_name, stock FROM pharmacy");
  const existingMap = new Map(existingMedicines.rows.map(m => [m.medicine_name.toLowerCase(), m]));
  
  return medicines.map(med => {
    const existing = existingMap.get(med.medicine_name.toLowerCase());
    if (existing) {
      return {
        ...med,
        isDuplicate: true,
        existingId: existing.id,
        existingStock: existing.stock,
        warnings: [`Already exists with stock: ${existing.stock}`]
      };
    }
    return med;
  });
};

const parseCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (data) => results.push(data))
      .on("end", () => resolve(results))
      .on("error", (error) => reject(error));
  });
};

const parseExcel = (filePath) => {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  return xlsx.utils.sheet_to_json(worksheet);
};

export const uploadPharmacyFiles = async (req, res, next) => {
  const processedFiles = [];
  const errors = [];
  const parsedDatasets = {
    inventory: [],
    drugs: [],
    prescriptions: [],
    suppliers: [],
  };
  
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No files uploaded"
      });
    }

    // Validate all files first
    for (const file of req.files) {
      const validation = validateFile(file);
      if (!validation.valid) {
        errors.push({ file: file.originalname, error: validation.error });
        continue;
      }
      
      try {
        const ext = path.extname(file.originalname).toLowerCase();
        let rawRows = [];
         
        if (ext === ".csv") {
          rawRows = await parseCSV(file.path);
        } else if (ext === ".xlsx" || ext === ".xls") {
          rawRows = parseExcel(file.path);
        }

        const datasetType = detectDatasetType(rawRows);
        if (datasetType === "unsupported") {
          errors.push({
            file: file.originalname,
            error: "Skipped: file is not a supported pharmacy dataset",
          });
          fs.unlinkSync(file.path);
          continue;
        }

        processedFiles.push({
          fileName: file.originalname,
          datasetType,
          count: rawRows.length,
        });

        parsedDatasets[datasetType].push({
          fileName: file.originalname,
          rows: rawRows,
        });
        
        // Clean up temp file
        fs.unlinkSync(file.path);
      } catch (error) {
        errors.push({ file: file.originalname, error: error.message });
        // Clean up temp file on error
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      }
    }

    const supplierMap = buildSupplierMap(parsedDatasets.suppliers.flatMap((dataset) => dataset.rows));
    const prescriptionTotals = buildPrescriptionTotals(
      parsedDatasets.prescriptions.flatMap((dataset) => dataset.rows)
    );

    const inventoryMedicines = parsedDatasets.inventory.flatMap((dataset) =>
      dataset.rows.map((row) => ({
        ...normalizeMedicineData(row),
        sourceFile: dataset.fileName,
      }))
    );

    const drugMedicines = parsedDatasets.drugs.flatMap((dataset) =>
      buildMedicinesFromDrugRows(dataset.rows, supplierMap, prescriptionTotals, dataset.fileName)
    );

    const allMedicines = mergeMedicineRecords([...inventoryMedicines, ...drugMedicines]);

    if (allMedicines.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No pharmacy medicines were found in the uploaded files",
        data: {
          extractedMedicines: [],
          stats: { total: 0, valid: 0, invalid: 0, duplicates: 0, totalValue: 0 },
          files: [],
          errors,
        },
      });
    }

    const medicinesWithDuplicates = await checkDuplicates(allMedicines);
    
    // Calculate stats
    const total = medicinesWithDuplicates.length;
    const valid = medicinesWithDuplicates.filter(m => m.errors.length === 0).length;
    const duplicates = medicinesWithDuplicates.filter(m => m.isDuplicate).length;
    const totalValue = medicinesWithDuplicates.reduce((sum, m) => sum + (m.price * m.stock), 0);

    return res.json({
      success: true,
      data: {
        extractedMedicines: medicinesWithDuplicates,
        stats: {
          total,
          valid,
          invalid: total - valid,
          duplicates,
          totalValue
        },
        files: processedFiles.map((f) => ({
          name: f.fileName,
          count: f.count,
          datasetType: f.datasetType,
        })),
        errors: errors.length > 0 ? errors : undefined
      },
      message: `Processed ${processedFiles.length} supported file(s). Extracted ${total} medicines.`
    });
    
  } catch (error) {
    // Clean up any remaining temp files
    if (req.files) {
      for (const file of req.files) {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      }
    }
    return next(error);
  }
};

export const bulkInsertMedicines = async (req, res, next) => {
  let client;
  try {
    const medicines = Array.isArray(req.body) ? req.body : req.body?.medicines;
    
    if (!Array.isArray(medicines) || medicines.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No medicines provided"
      });
    }

    const preparedMedicines = mergeMedicineRecords(
      medicines.map((medicine) => ({
        ...medicine,
        sourceFiles: medicine.sourceFiles || (medicine.sourceFile ? [medicine.sourceFile] : []),
      }))
    );

    const results = {
      added: 0,
      updated: 0,
      failed: 0,
      errors: []
    };

    client = await getClient();
    await client.query("BEGIN");

    const existingRows = await client.query("SELECT id, medicine_name FROM pharmacy");
    const existingByName = new Map(
      existingRows.rows.map((row) => [String(row.medicine_name).toLowerCase(), row])
    );

    for (const med of preparedMedicines) {
      if (med.errors && med.errors.length > 0) {
        results.failed++;
        results.errors.push({ medicine: med.medicine_name, error: med.errors.join(", ") });
        continue;
      }

      try {
        const existing = existingByName.get(String(med.medicine_name).toLowerCase());

        if (existing) {
          await client.query(
            `UPDATE pharmacy
             SET manufacturer = $1,
                 stock = stock + $2,
                 price = CASE WHEN $3 > 0 THEN $3 ELSE price END,
                 status = $4,
                 updated_at = NOW()
             WHERE id = $5`,
            [
              med.manufacturer || "Unknown",
              Number(med.stock || 0),
              Number(med.price || 0),
              med.status || "Active",
              existing.id,
            ]
          );
          results.updated++;
        } else {
          const inserted = await client.query(
            `INSERT INTO pharmacy (medicine_name, manufacturer, stock, price, status)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, medicine_name`,
            [
              med.medicine_name,
              med.manufacturer || "Unknown",
              Number(med.stock || 0),
              Number(med.price || 0),
              med.status || "Active",
            ]
          );
          existingByName.set(String(inserted.rows[0].medicine_name).toLowerCase(), inserted.rows[0]);
          results.added++;
        }
      } catch (error) {
        results.failed++;
        results.errors.push({ medicine: med.medicine_name, error: error.message });
      }
    }

    await client.query("COMMIT");

    return res.json({
      success: true,
      data: results,
      message: `Added ${results.added} new, updated ${results.updated} existing, ${results.failed} failed`
    });
    
  } catch (error) {
    if (client) {
      await client.query("ROLLBACK");
    }
    return next(error);
  } finally {
    client?.release();
  }
};
