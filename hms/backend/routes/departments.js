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
    
    let whereClause = "WHERE 1=1";
    const params = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      whereClause += ` AND (name ILIKE $${paramCount} OR code ILIKE $${paramCount})`;
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
      `SELECT * FROM departments ${whereClause} ORDER BY name LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
      [...params, limit, offset]
    );

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
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", authenticate, authorize(["admin", "doctor", "staff"]), async (req, res, next) => {
  try {
    const result = await query("SELECT * FROM departments WHERE id = $1", [req.params.id]);
    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: "Department not found" });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

router.post("/", authenticate, authorize(["admin"]), validate(schemas.departmentCreate), async (req, res, next) => {
  try {
    const { name, description, head_of_department, status } = req.body;
    const code = generateCode(name);

    const result = await query(
      `INSERT INTO departments (name, code, description, head_of_department, status) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, code, description, head_of_department, status || "Active"]
    );

    res.status(201).json({ success: true, data: result.rows[0], message: "Department created" });
  } catch (error) {
    next(error);
  }
});

router.put("/:id", authenticate, authorize(["admin"]), validate(schemas.departmentUpdate), async (req, res, next) => {
  try {
    const { name, description, head_of_department, status } = req.body;
    
    const result = await query(
      `UPDATE departments SET name = COALESCE($1, name), description = COALESCE($2, description), 
       head_of_department = COALESCE($3, head_of_department), status = COALESCE($4, status), 
       updated_at = NOW() WHERE id = $5 RETURNING *`,
      [name, description, head_of_department, status, req.params.id]
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
    const result = await query("DELETE FROM departments WHERE id = $1 RETURNING *", [req.params.id]);
    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: "Department not found" });
    }
    res.json({ success: true, message: "Department deleted" });
  } catch (error) {
    next(error);
  }
});

export default router;