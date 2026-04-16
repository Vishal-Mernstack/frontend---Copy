import { query } from "../config/db.js";

const reportSelect = `
  SELECT
    r.id,
    r.patient_id,
    r.report_type,
    r.file_name,
    r.file_path,
    r.description,
    r.created_at,
    COALESCE(p.name, '') AS patient_name,
    COALESCE(u.name, '') AS uploaded_by_name
  FROM patient_reports r
  LEFT JOIN patients p ON p.id = r.patient_id
  LEFT JOIN users u ON u.id = r.uploaded_by
`;

export const getPatientReports = async (req, res, next) => {
  try {
    const { patient_id } = req.query;
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 10);
    const offset = (page - 1) * limit;

    let whereClause = "WHERE 1=1";
    const params = [];
    let paramCount = 0;

    if (patient_id) {
      paramCount++;
      whereClause += ` AND r.patient_id = $${paramCount}`;
      params.push(patient_id);
    }

    const countResult = await query(`SELECT COUNT(*) FROM patient_reports r ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(limit, offset);
    const result = await query(
      `${reportSelect} ${whereClause} ORDER BY r.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
      params
    );

    return res.json({
      success: true,
      data: {
        items: result.rows,
        pagination: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) },
      },
      message: "Patient reports fetched",
    });
  } catch (error) {
    return next(error);
  }
};

export const uploadPatientReport = async (req, res, next) => {
  try {
    const { patient_id, report_type, description } = req.body;

    if (!patient_id) {
      return res.status(400).json({ success: false, message: "Patient ID is required" });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const fileUrl = `/uploads/documents/${req.file.filename}`;

    const result = await query(
      `INSERT INTO patient_reports (patient_id, report_type, file_name, file_path, description, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [patient_id, report_type || "Other", req.file.originalname, fileUrl, description || null, req.user?.id || null]
    );

    return res.status(201).json({
      success: true,
      data: result.rows[0],
      message: "Report uploaded successfully",
    });
  } catch (error) {
    return next(error);
  }
};

export const deletePatientReport = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await query("SELECT * FROM patient_reports WHERE id = $1", [id]);
    if (!existing.rows.length) {
      return res.status(404).json({ success: false, message: "Report not found" });
    }

    await query("DELETE FROM patient_reports WHERE id = $1", [id]);

    return res.json({ success: true, message: "Report deleted" });
  } catch (error) {
    return next(error);
  }
};
