import { query, getClient } from "../config/db.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import csvParser from "csv-parser";
import xlsx from "xlsx";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(__dirname, "..", "uploads", "medicines");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const getMedicineStatus = (medicine) => {
  const now = new Date();
  const expiry = medicine.expiry_date ? new Date(medicine.expiry_date) : null;
  
  if (medicine.stock === 0) return "Out of Stock";
  if (expiry && expiry < now) return "Expired";
  if (expiry && expiry < new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)) return "Expiring Soon";
  if (medicine.stock < medicine.min_stock_level) return "Low Stock";
  return "Active";
};

export const getAllMedicines = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search = "", status = "", manufacturer = "" } = req.query;
    const offset = (page - 1) * limit;
    const params = [];
    let where = "WHERE 1=1";

    if (search) {
      params.push(`%${search}%`);
      where += ` AND (name ILIKE $${params.length} OR manufacturer ILIKE $${params.length})`;
    }

    if (manufacturer) {
      params.push(manufacturer);
      where += ` AND manufacturer = $${params.length}`;
    }

    const [itemsResult, countResult] = await Promise.all([
      query(
        `SELECT id, name, manufacturer, price, stock, min_stock_level, expiry_date, batch_number, created_at, updated_at
         FROM medicines ${where} 
         ORDER BY created_at DESC 
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset]
      ),
      query(`SELECT COUNT(*) FROM medicines ${where}`, params),
    ]);

    const total = Number(countResult.rows[0].count);
    const items = itemsResult.rows.map(m => ({
      ...m,
      status: getMedicineStatus(m)
    }));

    const lowStockCount = items.filter(m => m.status === "Low Stock").length;
    const outOfStockCount = items.filter(m => m.status === "Out of Stock").length;
    const expiringCount = items.filter(m => m.status === "Expired" || m.status === "Expiring Soon").length;

    res.json({
      success: true,
      data: {
        items,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / limit),
        },
        alerts: {
          lowStock: lowStockCount,
          outOfStock: outOfStockCount,
          expiring: expiringCount,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const getLowStockAlerts = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, name, manufacturer, stock, min_stock_level, expiry_date
       FROM medicines 
       WHERE stock < min_stock_level OR expiry_date < CURRENT_DATE + INTERVAL '30 days'
       ORDER BY 
         CASE WHEN stock = 0 THEN 0 WHEN expiry_date < CURRENT_DATE THEN 1 ELSE 2 END,
         stock ASC`
    );

    const alerts = result.rows.map(m => ({
      ...m,
      status: getMedicineStatus(m)
    }));

    res.json({ success: true, data: alerts });
  } catch (error) {
    return next(error);
  }
};

export const getMedicineById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT id, name, manufacturer, price, stock, min_stock_level, expiry_date, batch_number, created_at, updated_at 
       FROM medicines WHERE id = $1`,
      [id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: "Medicine not found" });
    }

    const medicine = result.rows[0];
    res.json({ success: true, data: { ...medicine, status: getMedicineStatus(medicine) } });
  } catch (error) {
    return next(error);
  }
};

export const createMedicine = async (req, res, next) => {
  try {
    const { name, manufacturer, price, stock, min_stock_level, expiry_date, batch_number } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ success: false, message: "Valid medicine name is required" });
    }

    if (price !== undefined && price < 0) {
      return res.status(400).json({ success: false, message: "Price must be positive" });
    }

    if (stock !== undefined && stock < 0) {
      return res.status(400).json({ success: false, message: "Stock cannot be negative" });
    }

    const result = await query(
      `INSERT INTO medicines (name, manufacturer, price, stock, min_stock_level, expiry_date, batch_number)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, manufacturer, price, stock, min_stock_level, expiry_date, batch_number, created_at`,
      [
        name.trim(),
        manufacturer || null,
        price || 0,
        stock || 0,
        min_stock_level || 10,
        expiry_date || null,
        batch_number || null
      ]
    );

    const medicine = result.rows[0];
    
    if (stock > 0 && batch_number) {
      await query(
        `INSERT INTO medicine_batches (medicine_id, batch_number, quantity, expiry_date)
         VALUES ($1, $2, $3, $4)`,
        [medicine.id, batch_number, stock, expiry_date]
      );
    }

    res.status(201).json({ success: true, data: { ...medicine, status: getMedicineStatus(medicine) } });
  } catch (error) {
    return next(error);
  }
};

export const updateMedicine = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, manufacturer, price, stock, min_stock_level, expiry_date, batch_number } = req.body;

    if (price !== undefined && price < 0) {
      return res.status(400).json({ success: false, message: "Price must be positive" });
    }

    if (stock !== undefined && stock < 0) {
      return res.status(400).json({ success: false, message: "Stock cannot be negative" });
    }

    const existing = await query("SELECT * FROM medicines WHERE id = $1", [id]);
    if (!existing.rows.length) {
      return res.status(404).json({ success: false, message: "Medicine not found" });
    }

    const oldStock = existing.rows[0].stock;
    const stockDiff = stock !== undefined ? stock - oldStock : 0;

    const result = await query(
      `UPDATE medicines 
       SET name = COALESCE($1, name),
           manufacturer = COALESCE($2, manufacturer),
           price = COALESCE($3, price),
           stock = COALESCE($4, stock),
           min_stock_level = COALESCE($5, min_stock_level),
           expiry_date = COALESCE($6, expiry_date),
           batch_number = COALESCE($7, batch_number),
           updated_at = NOW()
       WHERE id = $8
       RETURNING id, name, manufacturer, price, stock, min_stock_level, expiry_date, batch_number, created_at, updated_at`,
      [name, manufacturer, price, stock, min_stock_level, expiry_date, batch_number, id]
    );

    const medicine = result.rows[0];

    if (stockDiff !== 0) {
      await query(
        `INSERT INTO medicine_stock_movements (medicine_id, quantity, movement_type, notes)
         VALUES ($1, $2, $3, $4)`,
        [id, Math.abs(stockDiff), stockDiff > 0 ? 'IN' : 'ADJUSTMENT', `Stock adjusted from ${oldStock} to ${stock}`]
      );
    }

    res.json({ success: true, data: { ...medicine, status: getMedicineStatus(medicine) } });
  } catch (error) {
    return next(error);
  }
};

export const deleteMedicine = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query("DELETE FROM medicines WHERE id = $1 RETURNING id", [id]);

    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: "Medicine not found" });
    }

    res.json({ success: true, message: "Medicine deleted" });
  } catch (error) {
    return next(error);
  }
};

export const reduceStock = async (medicineId, quantity, referenceType = null, referenceId = null, notes = null) => {
  const result = await query(
    `SELECT id, name, stock, expiry_date, min_stock_level, batch_number
     FROM medicines WHERE id = $1`,
    [medicineId]
  );

  if (!result.rows.length) {
    throw new Error("Medicine not found");
  }

  const medicine = result.rows[0];

  if (medicine.stock < quantity) {
    throw new Error(`Insufficient stock for ${medicine.name}. Available: ${medicine.stock}, Requested: ${quantity}`);
  }

  if (medicine.expiry_date && new Date(medicine.expiry_date) < new Date()) {
    throw new Error(`Medicine ${medicine.name} has expired`);
  }

  await query(
    "UPDATE medicines SET stock = stock - $1, updated_at = NOW() WHERE id = $2",
    [quantity, medicineId]
  );

  await query(
    `INSERT INTO medicine_stock_movements (medicine_id, quantity, movement_type, reference_type, reference_id, notes)
     VALUES ($1, $2, 'OUT', $3, $4, $5)`,
    [medicineId, quantity, referenceType, referenceId, notes]
  );

  if (medicine.stock - quantity < medicine.min_stock_level) {
    console.warn(`Low stock alert: ${medicine.name} now has ${medicine.stock - quantity} units left`);
  }

  return { success: true, medicineId, quantity, remainingStock: medicine.stock - quantity };
};

export const addStock = async (medicineId, quantity, batchNumber, expiryDate, notes = null) => {
  const result = await query("SELECT * FROM medicines WHERE id = $1", [medicineId]);
  if (!result.rows.length) {
    throw new Error("Medicine not found");
  }

  await query(
    "UPDATE medicines SET stock = stock + $1, updated_at = NOW() WHERE id = $2",
    [quantity, medicineId]
  );

  if (batchNumber) {
    const existingBatch = await query(
      "SELECT id, quantity FROM medicine_batches WHERE medicine_id = $1 AND batch_number = $2",
      [medicineId, batchNumber]
    );

    if (existingBatch.rows.length) {
      await query(
        "UPDATE medicine_batches SET quantity = quantity + $1 WHERE id = $2",
        [quantity, existingBatch.rows[0].id]
      );
    } else {
      await query(
        `INSERT INTO medicine_batches (medicine_id, batch_number, quantity, expiry_date)
         VALUES ($1, $2, $3, $4)`,
        [medicineId, batchNumber, quantity, expiryDate]
      );
    }
  }

  await query(
    `INSERT INTO medicine_stock_movements (medicine_id, quantity, movement_type, notes)
     VALUES ($1, $2, 'IN', $3)`,
    [medicineId, quantity, notes || `Stock added: ${quantity} units`]
  );

  return { success: true, medicineId, quantity, newStock: result.rows[0].stock + quantity };
};

const parseCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on("data", (data) => results.push(data))
      .on("end", () => resolve(results))
      .on("error", reject);
  });
};

const parseExcel = (filePath) => {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  return xlsx.utils.sheet_to_json(worksheet);
};

const normalizeMedicineData = (data) => {
  const name = data.name || data.Name || data["Medicine Name"] || data.medicine_name || "";
  const manufacturer = data.manufacturer || data.Manufacturer || data["Manufacturer"] || data.manufacture || "";
  const price = parseFloat(data.price || data.Price || data["Price"] || data.cost || 0);
  const stock = parseInt(data.stock || data.Stock || data["Stock"] || data.quantity || data.qty || 0);
  const minStock = parseInt(data.min_stock || data.min_stock_level || data["Min Stock"] || 10);
  const expiry = data.expiry_date || data.expiry || data["Expiry Date"] || data.Expiry || null;
  const batch = data.batch_number || data.batch || data["Batch"] || data.BatchNumber || "";

  const cleanName = String(name).trim();
  const cleanManufacturer = String(manufacturer).trim();

  return {
    name: cleanName,
    manufacturer: cleanManufacturer,
    price: isNaN(price) ? 0 : price,
    stock: isNaN(stock) ? 0 : stock,
    min_stock_level: isNaN(minStock) ? 10 : minStock,
    expiry_date: expiry || null,
    batch_number: String(batch).trim(),
  };
};

const isValidMedicine = (medicine) => {
  const name = medicine.name?.toLowerCase() || "";
  const manufacturer = medicine.manufacturer?.toLowerCase() || "";
  
  if (!medicine.name || medicine.name.length < 2) {
    return { valid: false, error: "Name too short" };
  }

  const invalidPatterns = [
    "health", "insurance", "shield", "bluecross", "united", "molina", "priority", 
    "meridian", "alliance", "aetna", "cigna", "humana", "kaiser"
  ];
  
  for (const pattern of invalidPatterns) {
    if (name.includes(pattern) || manufacturer.includes(pattern)) {
      return { valid: false, error: `Invalid: contains "${pattern}"` };
    }
  }

  const invalidNames = [
    "robert hong", "sarsam muther", "thikra hussein", "raad alsaraf", 
    "sundus jabro", "gupta madhu", "ali hassan", "hussein ali",
    "bluecross", "blueshield", "unitedhealth", "priorityhealth", "meridian"
  ];
  
  for (const invalidName of invalidNames) {
    if (name.includes(invalidName)) {
      return { valid: false, error: `Invalid name: "${medicine.name}"` };
    }
  }

  if (medicine.price !== undefined && medicine.price < 0) {
    return { valid: false, error: "Negative price" };
  }

  if (medicine.stock !== undefined && medicine.stock < 0) {
    return { valid: false, error: "Negative stock" };
  }

  return { valid: true };
};

export const processMedicineUpload = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: "No files uploaded" });
    }

    const allMedicines = [];
    const errors = [];

    for (const file of req.files) {
      const filePath = file.path;
      const ext = path.extname(file.originalname).toLowerCase();

      try {
        let parsedData = [];

        if (ext === ".csv") {
          parsedData = await parseCSV(filePath);
        } else if (ext === ".xlsx" || ext === ".xls") {
          parsedData = await parseExcel(filePath);
        } else {
          errors.push({ file: file.originalname, error: "Unsupported file type" });
          continue;
        }

        for (const row of parsedData) {
          const normalized = normalizeMedicineData(row);
          const validation = isValidMedicine(normalized);
          if (!validation.valid) {
            errors.push({ medicine: normalized.name, error: validation.error });
            continue;
          }
          if (normalized.name) {
            allMedicines.push(normalized);
          }
        }

        fs.unlinkSync(filePath);
      } catch (parseError) {
        errors.push({ file: file.originalname, error: parseError.message });
      }
    }

    if (allMedicines.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid medicine data found in files",
        errors,
      });
    }

    const inserted = [];
    const duplicates = [];

    for (const med of allMedicines) {
      try {
        const existing = await query(
          "SELECT id FROM medicines WHERE LOWER(name) = LOWER($1)",
          [med.name]
        );

        if (existing.rows.length > 0) {
          await query(
            "UPDATE medicines SET stock = stock + $1, price = $2, min_stock_level = COALESCE($3, min_stock_level), expiry_date = COALESCE($4, expiry_date) WHERE LOWER(name) = LOWER($5)",
            [med.stock, med.price, med.min_stock_level, med.expiry_date, med.name]
          );
          duplicates.push(med.name);
        } else {
          const result = await query(
            `INSERT INTO medicines (name, manufacturer, price, stock, min_stock_level, expiry_date, batch_number) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
            [med.name, med.manufacturer, med.price, med.stock, med.min_stock_level, med.expiry_date, med.batch_number]
          );
          inserted.push({ ...med, id: result.rows[0].id });

          if (med.stock > 0 && med.batch_number) {
            await query(
              `INSERT INTO medicine_batches (medicine_id, batch_number, quantity, expiry_date)
               VALUES ($1, $2, $3, $4)`,
              [result.rows[0].id, med.batch_number, med.stock, med.expiry_date]
            );
          }
        }
      } catch (dbError) {
        errors.push({ medicine: med.name, error: dbError.message });
      }
    }

    res.json({
      success: true,
      message: `Successfully processed ${inserted.length} medicines`,
      data: {
        inserted: inserted.length,
        duplicates: duplicates.length,
        errors: errors.length,
      },
    });
  } catch (error) {
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

    const results = {
      added: 0,
      updated: 0,
      failed: 0,
      errors: []
    };

    client = await getClient();
    await client.query("BEGIN");

    const existingRows = await client.query("SELECT id, name FROM medicines");
    const existingByName = new Map(
      existingRows.rows.map((row) => [String(row.name).toLowerCase(), row])
    );

    for (const med of medicines) {
      if (!med.name || !med.name.trim()) {
        results.failed++;
        results.errors.push({ medicine: med.name, error: "Medicine name is required" });
        continue;
      }

      const validation = isValidMedicine(med);
      if (!validation.valid) {
        results.failed++;
        results.errors.push({ medicine: med.name, error: validation.error });
        continue;
      }

      try {
        const existing = existingByName.get(String(med.name).toLowerCase().trim());

        if (existing) {
          await client.query(
            `UPDATE medicines 
             SET manufacturer = COALESCE($1, manufacturer),
                 stock = stock + COALESCE($2, 0),
                 price = CASE WHEN $3 > 0 THEN $3 ELSE price END,
                 min_stock_level = COALESCE($4, min_stock_level),
                 expiry_date = COALESCE($5, expiry_date),
                 updated_at = NOW()
             WHERE id = $6`,
            [
              med.manufacturer || null,
              Number(med.stock || 0),
              Number(med.price || 0),
              Number(med.min_stock_level || 10),
              med.expiry_date || null,
              existing.id,
            ]
          );
          results.updated++;
        } else {
          const inserted = await client.query(
            `INSERT INTO medicines (name, manufacturer, price, stock, min_stock_level, expiry_date, batch_number)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
            [
              med.name.trim(),
              med.manufacturer || null,
              Number(med.price || 0),
              Number(med.stock || 0),
              Number(med.min_stock_level || 10),
              med.expiry_date || null,
              med.batch_number || null
            ]
          );
          existingByName.set(String(med.name).toLowerCase().trim(), inserted.rows[0]);
          
          if (med.stock > 0 && med.batch_number) {
            await client.query(
              `INSERT INTO medicine_batches (medicine_id, batch_number, quantity, expiry_date)
               VALUES ($1, $2, $3, $4)`,
              [inserted.rows[0].id, med.batch_number, med.stock, med.expiry_date]
            );
          }
          results.added++;
        }
      } catch (error) {
        results.failed++;
        results.errors.push({ medicine: med.name, error: error.message });
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

export const cleanContaminatedData = async (req, res, next) => {
  try {
    const invalidPatterns = [
      "bluecross", "blueshield", "unitedhealth", "united health",
      "aetna", "cigna", "humana", "kaiser", "molina", "priorityhealth",
      "priority health", "meridian", "alliance", "insurance", "health plan",
      "robert hong", "sarsam muther", "thikra hussein", "raad alsaraf",
      "sundus jabro", "gupta madhu", "ali hassan", "hussein ali"
    ];
    
    const result = await query(
      "SELECT id, name FROM medicines WHERE LOWER(name) LIKE ANY($1)",
      [invalidPatterns.map(p => `%${p}%`)]
    );

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        message: "No contaminated data found",
        deleted: 0
      });
    }

    const idsToDelete = result.rows.map(r => r.id);
    const deleteResult = await query(
      "DELETE FROM medicines WHERE id = ANY($1) RETURNING id",
      [idsToDelete]
    );

    res.json({
      success: true,
      message: `Cleaned ${deleteResult.rows.length} contaminated records`,
      deleted: deleteResult.rows.length,
      deletedNames: result.rows.map(r => r.name)
    });
  } catch (error) {
    return next(error);
  }
};