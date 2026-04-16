import { query } from "../config/db.js";
import { logAudit } from "../db/audit.js";

const billingSelect = `
  SELECT
    b.id,
    b.invoice_id,
    b.patient_id,
    b.doctor_id,
    b.appointment_id,
    COALESCE(b.amount, 0)::numeric AS amount,
    COALESCE(b.discount, 0)::numeric AS discount,
    COALESCE(b.tax, 0)::numeric AS tax,
    COALESCE(b.total, 0)::numeric AS total,
    COALESCE(b.status, 'Pending') AS status,
    COALESCE(b.payment_method, '') AS payment_method,
    b.invoice_date,
    b.due_date,
    b.paid_at,
    COALESCE(b.notes, '') AS notes,
    b.created_at,
    b.updated_at,
    COALESCE(p.name, '') AS patient_name,
    COALESCE(p.patient_code, '') AS patient_code,
    COALESCE(d.name, '') AS doctor_name,
    COALESCE(d.doctor_code, '') AS doctor_code
  FROM billing b
  JOIN patients p ON p.id = b.patient_id
  JOIN doctors d ON d.id = b.doctor_id
  WHERE b.is_deleted = false
`;

const createInvoiceCode = async () => {
  const result = await query(
    "SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_id FROM 3) AS INTEGER)), 4000) + 1 AS next_code FROM billing"
  );
  return `B-${String(result.rows[0].next_code).padStart(4, "0")}`;
};

export const getAllBilling = async (req, res, next) => {
  try {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 10);
    const search = req.query.search || "";
    const status = req.query.status || "";
    const offset = (page - 1) * limit;

    const params = [];
    let filters = "";
    let countFilters = "WHERE b.is_deleted = false";

    if (search) {
      params.push(`%${search}%`);
      const idx = params.length;
      filters += ` AND (p.name ILIKE $${idx} OR d.name ILIKE $${idx} OR b.invoice_id ILIKE $${idx})`;
      countFilters += ` AND (p.name ILIKE $${idx} OR d.name ILIKE $${idx} OR b.invoice_id ILIKE $${idx})`;
    }
    if (status) {
      params.push(status);
      filters += ` AND b.status = $${params.length}`;
      countFilters += ` AND b.status = $${params.length}`;
    }

    params.push(limit, offset);

    const [itemsResult, countResult] = await Promise.all([
      query(
        `${billingSelect} ${filters} ORDER BY b.invoice_date DESC, b.id DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
      ),
      query(
        `SELECT COUNT(*) FROM billing b JOIN patients p ON p.id = b.patient_id JOIN doctors d ON d.id = b.doctor_id ${countFilters}`,
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
      message: "Billing records fetched",
    });
  } catch (error) {
    console.error('getAllBilling error:', error.message);
    return res.status(500).json({ error: 'Failed to retrieve billing records' });
  }
};

export const getBillingById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query(`${billingSelect} AND b.id = $1`, [id]);

    if (!result.rows.length) {
      return res.status(404).json({ success: false, data: null, message: "Billing record not found" });
    }

    await logAudit({
      userId: req.user?.id,
      action: "ACCESS",
      entity: "billing",
      entityId: id,
      newValues: result.rows[0],
      req
    });

    return res.json({ success: true, data: result.rows[0], message: "Billing record fetched" });
  } catch (error) {
    return next(error);
  }
};

export const createBilling = async (req, res, next) => {
  try {
    const invoiceCode = await createInvoiceCode();
    const {
      patient_id,
      doctor_id,
      appointment_id,
      amount,
      discount,
      tax,
      total,
      status,
      payment_method,
      invoice_date,
      due_date,
      paid_at,
      notes,
    } = req.body;

    const parsedPatientId = Number(patient_id);
    const parsedDoctorId = Number(doctor_id);
    if (!Number.isInteger(parsedPatientId) || parsedPatientId <= 0) {
      return res.status(400).json({ success: false, data: null, message: "Invalid patient ID" });
    }
    if (!Number.isInteger(parsedDoctorId) || parsedDoctorId <= 0) {
      return res.status(400).json({ success: false, data: null, message: "Invalid doctor ID" });
    }

    const [patientExists, doctorExists] = await Promise.all([
      query("SELECT id FROM patients WHERE id = $1 AND is_deleted = false", [patient_id]),
      query("SELECT id FROM doctors WHERE id = $1 AND is_deleted = false", [doctor_id]),
    ]);

    if (!patientExists.rows.length) {
      return res.status(400).json({ success: false, data: null, message: "Patient not found" });
    }
    if (!doctorExists.rows.length) {
      return res.status(400).json({ success: false, data: null, message: "Doctor not found" });
    }

    const computedTotal =
      total ?? Number(amount || 0) - Number(discount || 0) + Number(tax || 0);

    const result = await query(
      `INSERT INTO billing (
        invoice_id, patient_id, doctor_id, appointment_id, amount, discount, tax, total, status, payment_method, invoice_date, due_date, paid_at, notes
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      RETURNING id`,
      [
        invoiceCode,
        patient_id,
        doctor_id,
        appointment_id || null,
        amount,
        discount || 0,
        tax || 0,
        computedTotal,
        status || "Pending",
        payment_method || null,
        invoice_date || new Date().toISOString().slice(0, 10),
        due_date || null,
        paid_at || null,
        notes || null,
      ]
    );

    const created = await query(`${billingSelect} AND b.id = $1`, [result.rows[0].id]);

    await logAudit({
      userId: req.user?.id,
      action: "CREATE",
      entity: "billing",
      entityId: result.rows[0].id,
      newValues: created.rows[0],
      req
    });

    return res.status(201).json({ success: true, data: created.rows[0], message: "Billing record created" });
  } catch (error) {
    return next(error);
  }
};

export const updateBilling = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await query("SELECT * FROM billing WHERE id = $1", [id]);

    if (!existing.rows.length) {
      return res.status(404).json({ success: false, data: null, message: "Billing record not found" });
    }

    const current = existing.rows[0];
    const payload = {
      patient_id: req.body.patient_id ?? current.patient_id,
      doctor_id: req.body.doctor_id ?? current.doctor_id,
      appointment_id: req.body.appointment_id ?? current.appointment_id,
      amount: req.body.amount ?? current.amount,
      discount: req.body.discount ?? current.discount,
      tax: req.body.tax ?? current.tax,
      total: req.body.total,
      status: req.body.status ?? current.status,
      payment_method: req.body.payment_method ?? current.payment_method,
      invoice_date: req.body.invoice_date ?? current.invoice_date,
      due_date: req.body.due_date ?? current.due_date,
      paid_at: req.body.paid_at ?? current.paid_at,
      notes: req.body.notes ?? current.notes,
    };

    const computedTotal =
      payload.total ?? Number(payload.amount || 0) - Number(payload.discount || 0) + Number(payload.tax || 0);

    await query(
      `UPDATE billing
       SET patient_id = $1,
           doctor_id = $2,
           appointment_id = $3,
           amount = $4,
           discount = $5,
           tax = $6,
           total = $7,
           status = $8,
           payment_method = $9,
           invoice_date = $10,
           due_date = $11,
           paid_at = $12,
           notes = $13,
           updated_at = NOW()
       WHERE id = $14`,
      [
        payload.patient_id,
        payload.doctor_id,
        payload.appointment_id || null,
        payload.amount,
        payload.discount,
        payload.tax,
        computedTotal,
        payload.status,
        payload.payment_method || null,
        payload.invoice_date,
        payload.due_date || null,
        payload.paid_at || null,
        payload.notes || null,
        id,
      ]
    );

    const updated = await query(`${billingSelect} AND b.id = $1`, [id]);
    return res.json({ success: true, data: updated.rows[0], message: "Billing record updated" });
  } catch (error) {
    return next(error);
  }
};

export const deleteBilling = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await query("SELECT * FROM billing WHERE id = $1 AND is_deleted = false", [id]);

    if (!existing.rows.length) {
      return res.status(404).json({ success: false, data: null, message: "Billing record not found" });
    }

    const current = existing.rows[0];
    await query("UPDATE billing SET is_deleted = true, deleted_at = NOW() WHERE id = $1", [id]);

    await logAudit({
      userId: req.user?.id,
      action: "DELETE",
      entity: "billing",
      entityId: id,
      oldValues: current,
      newValues: null,
      req
    });

    return res.json({ success: true, data: { id: current.id, invoice_id: current.invoice_id }, message: "Billing record deleted" });
  } catch (error) {
    return next(error);
  }
};
