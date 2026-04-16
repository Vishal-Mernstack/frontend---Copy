import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import { query } from "../config/db.js";

const router = Router();

const generateEmpCode = () => "EMP" + Math.floor(Math.random() * 10000);

router.get("/", authenticate, authorize(["admin", "doctor", "staff"]), async (req, res, next) => {
  try {
    const { search, department_id, status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = "WHERE s.id IS NOT NULL";
    const params = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      whereClause += ` AND (u.name ILIKE $${paramCount} OR s.employee_code ILIKE $${paramCount} OR s.position ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }
    if (department_id) {
      paramCount++;
      whereClause += ` AND s.department_id = $${paramCount}`;
      params.push(department_id);
    }
    if (status) {
      paramCount++;
      whereClause += ` AND s.status = $${paramCount}`;
      params.push(status);
    }

    const countResult = await query(
      `SELECT COUNT(*) FROM staff s 
       LEFT JOIN users u ON s.user_id = u.id 
       LEFT JOIN departments d ON s.department_id = d.id 
       ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
      `SELECT s.*, u.name as user_name, u.email as user_email, u.role as user_role, d.name as department_name 
       FROM staff s 
       LEFT JOIN users u ON s.user_id = u.id 
       LEFT JOIN departments d ON s.department_id = d.id 
       ${whereClause} 
       ORDER BY s.created_at DESC 
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

router.get("/:id", authenticate, authorize(["admin"]), async (req, res, next) => {
  try {
    const result = await query(
      `SELECT s.*, u.name as user_name, u.email as user_email, u.role as user_role, d.name as department_name 
       FROM staff s 
       LEFT JOIN users u ON s.user_id = u.id 
       LEFT JOIN departments d ON s.department_id = d.id 
       WHERE s.id = $1`,
      [req.params.id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: "Staff not found" });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

router.post("/", authenticate, authorize(["admin"]), async (req, res, next) => {
  try {
    const { user_id, department_id, position, salary, join_date, status } = req.body;
    const employee_code = generateEmpCode();

    const result = await query(
      `INSERT INTO staff (user_id, employee_code, department_id, position, salary, join_date, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [user_id, employee_code, department_id, position, salary, join_date, status || "Active"]
    );

    res.status(201).json({ success: true, data: result.rows[0], message: "Staff created" });
  } catch (error) {
    next(error);
  }
});

router.put("/:id", authenticate, authorize(["admin"]), async (req, res, next) => {
  try {
    const { department_id, position, salary, join_date, status } = req.body;
    
    const result = await query(
      `UPDATE staff SET 
       department_id = COALESCE($1, department_id), 
       position = COALESCE($2, position), 
       salary = COALESCE($3, salary), 
       join_date = COALESCE($4, join_date), 
       status = COALESCE($5, status), 
       updated_at = NOW() 
       WHERE id = $6 RETURNING *`,
      [department_id, position, salary, join_date, status, req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: "Staff not found" });
    }
    res.json({ success: true, data: result.rows[0], message: "Staff updated" });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", authenticate, authorize(["admin"]), async (req, res, next) => {
  try {
    const result = await query("DELETE FROM staff WHERE id = $1 RETURNING *", [req.params.id]);
    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: "Staff not found" });
    }
    res.json({ success: true, message: "Staff deleted" });
  } catch (error) {
    next(error);
  }
});

export default router;