import { query } from "../config/db.js";

const labSelect = `
  SELECT
    l.id,
    l.patient_id,
    l.doctor_id,
    l.test_name,
    COALESCE(l.result, '') AS result,
    l.file_url,
    COALESCE(l.status, 'Pending') AS status,
    l.ordered_at,
    l.updated_at,
    COALESCE(p.name, '') AS patient_name,
    COALESCE(d.name, '') AS doctor_name
  FROM lab_orders l
  JOIN patients p ON p.id = l.patient_id
  JOIN doctors d ON d.id = l.doctor_id
  WHERE l.is_deleted = false
`;

export const getAllLabOrders = async (req, res, next) => {
  try {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 10);
    const search = req.query.search || "";
    const status = req.query.status || "";
    const offset = (page - 1) * limit;
    const params = [];
    let where = "AND 1=1";
    let countWhere = "WHERE 1=1";

    if (search) {
      params.push(`%${search}%`);
      const idx = params.length;
      where += ` AND (p.name ILIKE $${idx} OR d.name ILIKE $${idx} OR l.test_name ILIKE $${idx})`;
      countWhere += ` AND (p.name ILIKE $${idx} OR d.name ILIKE $${idx} OR l.test_name ILIKE $${idx})`;
    }
    if (status) {
      params.push(status);
      where += ` AND l.status = $${params.length}`;
      countWhere += ` AND l.status = $${params.length}`;
    }

    params.push(limit, offset);

    const [itemsResult, countResult] = await Promise.all([
      query(
        `${labSelect} ${where} ORDER BY l.ordered_at DESC, l.id DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
      ),
      query(
        `SELECT COUNT(*) FROM lab_orders l JOIN patients p ON p.id = l.patient_id JOIN doctors d ON d.id = l.doctor_id ${countWhere}`,
        params.slice(0, -2)
      ),
    ]);

    const total = Number(countResult.rows[0].count);
    return res.json({
      success: true,
      data: {
        items: itemsResult.rows,
        pagination: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) },
      },
      message: "Lab orders fetched",
    });
  } catch (error) {
    return next(error);
  }
};

export const createLabOrder = async (req, res, next) => {
  try {
    const { patient_id, doctor_id, test_name, result, status } = req.body;
    const created = await query(
      `INSERT INTO lab_orders (patient_id, doctor_id, test_name, result, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [patient_id, doctor_id, test_name, result || null, status || "Pending"]
    );

    const resultRow = await query(`${labSelect} AND l.id = $1`, [created.rows[0].id]);
    return res.status(201).json({
      success: true,
      data: resultRow.rows[0],
      message: "Lab order created",
    });
  } catch (error) {
    return next(error);
  }
};

export const updateLabOrder = async (req, res, next) => {
  try {
    const existing = await query("SELECT * FROM lab_orders WHERE id = $1 AND is_deleted = false", [req.params.id]);
    if (!existing.rows.length) {
      return res.status(404).json({ success: false, data: null, message: "Lab order not found" });
    }

    const current = existing.rows[0];
    const payload = {
      patient_id: req.body.patient_id ?? current.patient_id,
      doctor_id: req.body.doctor_id ?? current.doctor_id,
      test_name: req.body.test_name ?? current.test_name,
      result: req.body.result ?? current.result,
      status: req.body.status ?? current.status,
    };

    await query(
      `UPDATE lab_orders
       SET patient_id = $1, doctor_id = $2, test_name = $3, result = $4, status = $5, updated_at = NOW()
       WHERE id = $6 AND is_deleted = false`,
      [payload.patient_id, payload.doctor_id, payload.test_name, payload.result, payload.status, req.params.id]
    );

    const resultRow = await query(`${labSelect} AND l.id = $1`, [req.params.id]);
    return res.json({ success: true, data: resultRow.rows[0], message: "Lab order updated" });
  } catch (error) {
    return next(error);
  }
};

export const uploadLabReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await query("SELECT * FROM lab_orders WHERE id = $1 AND is_deleted = false", [id]);

    if (!existing.rows.length) {
      return res.status(404).json({ success: false, data: null, message: "Lab order not found" });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, data: null, message: "No file uploaded" });
    }

    const fileUrl = `/uploads/lab-reports/${req.file.filename}`;
    await query(
      "UPDATE lab_orders SET file_url = $1, status = 'Completed', updated_at = NOW() WHERE id = $2",
      [fileUrl, id]
    );

    const resultRow = await query(`${labSelect} AND l.id = $1`, [id]);
    return res.json({ success: true, data: { ...resultRow.rows[0], file_url: fileUrl }, message: "Lab report uploaded" });
  } catch (error) {
    return next(error);
  }
};
