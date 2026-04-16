import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import { query } from "../config/db.js";

const router = Router();

router.get("/", authenticate, async (req, res, next) => {
  try {
    const { patient_id, doctor_id, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = "WHERE 1=1";
    const params = [];
    let paramCount = 0;

    if (patient_id) {
      paramCount++;
      whereClause += ` AND p.patient_id = $${paramCount}`;
      params.push(patient_id);
    }
    if (doctor_id) {
      paramCount++;
      whereClause += ` AND p.doctor_id = $${paramCount}`;
      params.push(doctor_id);
    }

    const countResult = await query(`SELECT COUNT(*) FROM prescriptions p ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
      `SELECT p.*, pat.name as patient_name, pat.patient_code, d.name as doctor_name, d.specialization,
       a.appointment_date
       FROM prescriptions p 
       LEFT JOIN patients pat ON p.patient_id = pat.id 
       LEFT JOIN doctors d ON p.doctor_id = d.id 
       LEFT JOIN appointments a ON p.appointment_id = a.id 
       ${whereClause} 
       ORDER BY p.created_at DESC 
       LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
      [...params, limit, offset]
    );

    for (let i = 0; i < result.rows.length; i++) {
      const items = await query("SELECT * FROM prescription_items WHERE prescription_id = $1", [result.rows[i].id]);
      result.rows[i].items = items.rows;
    }

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

router.get("/:id", authenticate, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT p.*, pat.name as patient_name, pat.patient_code, d.name as doctor_name, d.specialization 
       FROM prescriptions p 
       LEFT JOIN patients pat ON p.patient_id = pat.id 
       LEFT JOIN doctors d ON p.doctor_id = d.id 
       WHERE p.id = $1`,
      [req.params.id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: "Prescription not found" });
    }

    const items = await query("SELECT * FROM prescription_items WHERE prescription_id = $1", [req.params.id]);
    result.rows[0].items = items.rows;

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

router.post("/", authenticate, authorize(["admin", "doctor"]), async (req, res, next) => {
  try {
    const { patient_id, doctor_id, appointment_id, diagnosis, symptoms, notes, items } = req.body;
    const prescription_code = "RX" + Date.now();

    const result = await query(
      `INSERT INTO prescriptions (prescription_code, patient_id, doctor_id, appointment_id, diagnosis, symptoms, notes) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [prescription_code, patient_id, doctor_id, appointment_id, diagnosis, symptoms, notes]
    );

    const prescriptionId = result.rows[0].id;

    if (items && items.length > 0) {
      for (const item of items) {
        await query(
          `INSERT INTO prescription_items (prescription_id, medicine_name, dosage, frequency, duration, instructions) 
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [prescriptionId, item.medicine_name, item.dosage, item.frequency, item.duration, item.instructions]
        );
      }
    }

    if (appointment_id) {
      await query("UPDATE appointments SET prescription_id = $1 WHERE id = $2", [prescriptionId, appointment_id]);
    }

    res.status(201).json({ success: true, data: result.rows[0], message: "Prescription created" });
  } catch (error) {
    next(error);
  }
});

router.put("/:id", authenticate, authorize(["admin", "doctor"]), async (req, res, next) => {
  try {
    const { diagnosis, symptoms, notes, items } = req.body;
    
    const result = await query(
      `UPDATE prescriptions SET 
       diagnosis = COALESCE($1, diagnosis), 
       symptoms = COALESCE($2, symptoms), 
       notes = COALESCE($3, notes), 
       updated_at = NOW() 
       WHERE id = $4 RETURNING *`,
      [diagnosis, symptoms, notes, req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: "Prescription not found" });
    }

    if (items) {
      await query("DELETE FROM prescription_items WHERE prescription_id = $1", [req.params.id]);
      for (const item of items) {
        await query(
          `INSERT INTO prescription_items (prescription_id, medicine_name, dosage, frequency, duration, instructions) 
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [req.params.id, item.medicine_name, item.dosage, item.frequency, item.duration, item.instructions]
        );
      }
    }

    res.json({ success: true, data: result.rows[0], message: "Prescription updated" });
  } catch (error) {
    next(error);
  }
});

export default router;