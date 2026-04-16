import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import { validate, schemas } from "../middleware/validate.js";
import { query } from "../config/db.js";

const router = Router();

const generateCode = (name) => {
  return name.substring(0, 3).toUpperCase() + Math.floor(Math.random() * 1000);
};

router.get("/", authenticate, authorize(["admin", "doctor", "staff", "nurse", "receptionist"]), async (req, res, next) => {
  try {
    const { search, status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = "WHERE is_deleted = false";
    const params = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      whereClause += ` AND name ILIKE $${paramCount}`;
      params.push(`%${search}%`);
    }
    if (status) {
      paramCount++;
      whereClause += ` AND status = $${paramCount}`;
      params.push(status);
    }

    const countResult = await query(`SELECT COUNT(*) FROM departments ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
      `SELECT 
        d.*, 
        doc.name as head_doctor_name,
        doc.specialization as head_doctor_specialization,
        (SELECT COUNT(*) FROM doctors WHERE doctors.specialization ILIKE '%' || d.name || '%' OR doctors.specialization ILIKE '%' || d.description || '%') as doctor_count,
        (SELECT COUNT(*) FROM beds WHERE beds.department_id = d.id) as bed_count
       FROM departments d 
       LEFT JOIN doctors doc ON d.head_doctor_id = doc.id 
       ${whereClause} 
       ORDER BY d.name 
       LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
      [...params, limit, offset]
    );

    const statsResult = await query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'Active') as active_count,
        (SELECT COUNT(*) FROM doctors) as total_doctors,
        (SELECT COUNT(*) FROM beds WHERE status = 'Occupied') as occupied_beds,
        (SELECT COUNT(*) FROM beds) as total_beds
      FROM departments WHERE is_deleted = false
    `);

    res.json({
      success: true,
      data: {
        items: result.rows,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / limit),
        },
        stats: statsResult.rows[0] || {},
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", authenticate, authorize(["admin", "doctor", "staff"]), async (req, res, next) => {
  try {
    const result = await query(
      `SELECT d.*, doc.name as head_doctor_name 
       FROM departments d 
       LEFT JOIN doctors doc ON d.head_doctor_id = doc.id 
       WHERE d.id = $1 AND d.is_deleted = false`,
      [req.params.id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: "Department not found" });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

router.post("/", authenticate, authorize(["admin"]), async (req, res, next) => {
  try {
    const { name, description, head_doctor_id, status } = req.body;

    const result = await query(
      `INSERT INTO departments (name, description, head_doctor_id, status) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, description || null, head_doctor_id || null, status || "Active"]
    );

    res.status(201).json({ success: true, data: result.rows[0], message: "Department created" });
  } catch (error) {
    next(error);
  }
});

router.put("/:id", authenticate, authorize(["admin"]), async (req, res, next) => {
  try {
    const { name, description, head_doctor_id, status } = req.body;
    
    const result = await query(
      `UPDATE departments SET 
       name = COALESCE($1, name), 
       description = COALESCE($2, description), 
       head_doctor_id = $3, 
       status = COALESCE($4, status), 
       updated_at = NOW() 
       WHERE id = $5 AND is_deleted = false 
       RETURNING *`,
      [name, description, head_doctor_id, status, req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: "Department not found" });
    }
    res.json({ success: true, data: result.rows[0], message: "Department updated" });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", authenticate, authorize(["admin"]), async (req, res, next) => {
  try {
    const result = await query(
      "UPDATE departments SET is_deleted = true, deleted_at = NOW() WHERE id = $1 RETURNING *",
      [req.params.id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: "Department not found" });
    }
    res.json({ success: true, message: "Department deleted" });
  } catch (error) {
    next(error);
  }
});

export default router;