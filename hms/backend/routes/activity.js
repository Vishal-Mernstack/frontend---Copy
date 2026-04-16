import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import { query } from "../config/db.js";

const router = Router();

router.get("/", authenticate, authorize(["admin"]), async (req, res, next) => {
  try {
    const { search, action, user_id, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = "WHERE 1=1";
    const params = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      whereClause += ` AND (al.action ILIKE $${paramCount} OR al.details ILIKE $${paramCount} OR u.name ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }
    if (action) {
      paramCount++;
      whereClause += ` AND al.action = $${paramCount}`;
      params.push(action);
    }
    if (user_id) {
      paramCount++;
      whereClause += ` AND al.user_id = $${paramCount}`;
      params.push(user_id);
    }

    const countResult = await query(
      `SELECT COUNT(*) FROM activity_logs al LEFT JOIN users u ON al.user_id = u.id ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
      `SELECT al.*, u.name as user_name, u.email as user_email, u.role as user_role 
       FROM activity_logs al 
       LEFT JOIN users u ON al.user_id = u.id 
       ${whereClause} 
       ORDER BY al.created_at DESC 
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

router.post("/", authenticate, async (req, res, next) => {
  try {
    const { action, entity_type, entity_id, details } = req.body;
    const userId = req.user?.id;

    const result = await query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details, ip_address) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [userId, action, entity_type, entity_id, details, req.ip]
    );

    res.status(201).json({ success: true, data: result.rows[0], message: "Activity logged" });
  } catch (error) {
    next(error);
  }
});

export default router;