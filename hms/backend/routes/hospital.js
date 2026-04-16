import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import { query } from "../config/db.js";

const router = Router();

router.get("", authenticate, (req, res) => res.json({ success: true, message: "Hospital API v1" }));

router.get("/beds", authenticate, async (req, res, next) => {
  try {
    const { ward_type, status, department_id, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = "WHERE 1=1";
    const params = [];
    let paramCount = 0;

    if (ward_type) {
      paramCount++;
      whereClause += ` AND ward_type = $${paramCount}`;
      params.push(ward_type);
    }
    if (status) {
      paramCount++;
      whereClause += ` AND b.status = $${paramCount}`;
      params.push(status);
    }
    if (department_id) {
      paramCount++;
      whereClause += ` AND b.department_id = $${paramCount}`;
      params.push(department_id);
    }

    const countResult = await query(`SELECT COUNT(*) FROM beds b ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
      `SELECT b.*, d.name as department_name 
       FROM beds b 
       LEFT JOIN departments d ON b.department_id = d.id 
       ${whereClause} 
       ORDER BY b.ward_type, b.bed_number 
       LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
      [...params, limit, offset]
    );

    res.json({
      success: true,
      data: {
        items: result.rows,
        pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/beds/:id", authenticate, async (req, res, next) => {
  try {
    const result = await query("SELECT * FROM beds WHERE id = $1", [req.params.id]);
    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: "Bed not found" });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

router.post("/beds", authenticate, authorize(["admin"]), async (req, res, next) => {
  try {
    const { bed_number, ward_type, department_id, status, price_per_day } = req.body;
    const result = await query(
      `INSERT INTO beds (bed_number, ward_type, department_id, status, price_per_day) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [bed_number, ward_type, department_id, status || "Available", price_per_day || 0]
    );
    res.status(201).json({ success: true, data: result.rows[0], message: "Bed created" });
  } catch (error) {
    next(error);
  }
});

router.put("/beds/:id", authenticate, authorize(["admin"]), async (req, res, next) => {
  try {
    const { bed_number, ward_type, department_id, status, price_per_day } = req.body;
    const result = await query(
      `UPDATE beds SET 
       bed_number = COALESCE($1, bed_number), 
       ward_type = COALESCE($2, ward_type), 
       department_id = COALESCE($3, department_id), 
       status = COALESCE($4, status), 
       price_per_day = COALESCE($5, price_per_day), 
       updated_at = NOW() 
       WHERE id = $6 RETURNING *`,
      [bed_number, ward_type, department_id, status, price_per_day, req.params.id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: "Bed not found" });
    }
    res.json({ success: true, data: result.rows[0], message: "Bed updated" });
  } catch (error) {
    next(error);
  }
});

router.delete("/beds/:id", authenticate, authorize(["admin"]), async (req, res, next) => {
  try {
    const result = await query("DELETE FROM beds WHERE id = $1 RETURNING *", [req.params.id]);
    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: "Bed not found" });
    }
    res.json({ success: true, message: "Bed deleted" });
  } catch (error) {
    next(error);
  }
});

// Admissions routes
router.get("/admissions", authenticate, async (req, res, next) => {
  try {
    const { patient_id, status, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = "WHERE 1=1";
    const params = [];
    let paramCount = 0;

    if (patient_id) {
      paramCount++;
      whereClause += ` AND a.patient_id = $${paramCount}`;
      params.push(patient_id);
    }
    if (status) {
      paramCount++;
      whereClause += ` AND a.status = $${paramCount}`;
      params.push(status);
    }
    if (search) {
      paramCount++;
      whereClause += ` AND (p.name ILIKE $${paramCount} OR p.patient_code ILIKE $${paramCount} OR a.admission_code ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    const countResult = await query(`SELECT COUNT(*) FROM admissions a LEFT JOIN patients p ON a.patient_id = p.id ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
      `SELECT a.*, p.name as patient_name, p.patient_code, d.name as doctor_name, b.bed_number, b.ward_type
       FROM admissions a
       LEFT JOIN patients p ON a.patient_id = p.id
       LEFT JOIN doctors d ON a.doctor_id = d.id
       LEFT JOIN beds b ON a.bed_id = b.id
       ${whereClause}
       ORDER BY a.admission_date DESC
       LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
      [...params, limit, offset]
    );

    res.json({
      success: true,
      data: {
        items: result.rows,
        pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/admissions/:id", authenticate, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT a.*, p.name as patient_name, p.patient_code, d.name as doctor_name, b.bed_number, b.ward_type 
       FROM admissions a 
       LEFT JOIN patients p ON a.patient_id = p.id 
       LEFT JOIN doctors d ON a.doctor_id = d.id 
       LEFT JOIN beds b ON a.bed_id = b.id 
       WHERE a.id = $1`,
      [req.params.id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: "Admission not found" });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

router.post("/admissions", authenticate, authorize(["admin", "doctor", "nurse", "receptionist"]), async (req, res, next) => {
  try {
    const { patient_id, bed_id, doctor_id, reason, diagnosis, treatment_plan } = req.body;
    const admission_code = "ADM" + Date.now();

    const result = await query(
      `INSERT INTO admissions (admission_code, patient_id, bed_id, doctor_id, reason, diagnosis, treatment_plan, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'Admitted') RETURNING *`,
      [admission_code, patient_id, bed_id, doctor_id, reason, diagnosis, treatment_plan]
    );

    if (bed_id) {
      await query("UPDATE beds SET status = 'Occupied' WHERE id = $1", [bed_id]);
    }

    res.status(201).json({ success: true, data: result.rows[0], message: "Patient admitted" });
  } catch (error) {
    next(error);
  }
});

router.put("/admissions/:id", authenticate, authorize(["admin", "doctor", "nurse"]), async (req, res, next) => {
  try {
    const { bed_id, doctor_id, diagnosis, treatment_plan, status } = req.body;
    
    const existing = await query("SELECT * FROM admissions WHERE id = $1", [req.params.id]);
    if (!existing.rows.length) {
      return res.status(404).json({ success: false, message: "Admission not found" });
    }

    const oldBedId = existing.rows[0].bed_id;
    
    const result = await query(
      `UPDATE admissions SET 
       bed_id = COALESCE($1, bed_id), 
       doctor_id = COALESCE($2, doctor_id), 
       diagnosis = COALESCE($3, diagnosis), 
       treatment_plan = COALESCE($4, treatment_plan), 
       status = COALESCE($5, status), 
       discharge_date = CASE WHEN $5 = 'Discharged' THEN NOW() ELSE discharge_date END,
       updated_at = NOW() 
       WHERE id = $6 RETURNING *`,
      [bed_id, doctor_id, diagnosis, treatment_plan, status, req.params.id]
    );

    if (status === "Discharged" && oldBedId) {
      await query("UPDATE beds SET status = 'Available' WHERE id = $1", [oldBedId]);
    }
    if (bed_id && bed_id !== oldBedId) {
      await query("UPDATE beds SET status = 'Occupied' WHERE id = $1", [bed_id]);
      if (oldBedId) {
        await query("UPDATE beds SET status = 'Available' WHERE id = $1", [oldBedId]);
      }
    }

    res.json({ success: true, data: result.rows[0], message: "Admission updated" });
  } catch (error) {
    next(error);
  }
});

export default router;