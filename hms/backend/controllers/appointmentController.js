import { query } from "../config/db.js";

const appointmentSelect = `
  SELECT
    a.id,
    a.appointment_code,
    a.patient_id,
    a.doctor_id,
    a.appointment_date,
    COALESCE(a.duration, 30) AS duration,
    COALESCE(a.type, '') AS type,
    COALESCE(a.status, 'Booked') AS status,
    a.status_reason,
    COALESCE(a.notes, '') AS notes,
    COALESCE(a.symptoms, '') AS symptoms,
    COALESCE(a.prescription, '') AS prescription,
    a.follow_up_date,
    a.created_at,
    a.updated_at,
    COALESCE(p.name, '') AS patient_name,
    COALESCE(p.patient_code, '') AS patient_code,
    COALESCE(d.name, '') AS doctor_name,
    COALESCE(d.doctor_code, '') AS doctor_code
  FROM appointments a
  JOIN patients p ON p.id = a.patient_id
  JOIN doctors d ON d.id = a.doctor_id
  WHERE a.is_deleted = false
`;

export const APPOINTMENT_STATUSES = ["Booked", "Confirmed", "InProgress", "Completed", "Cancelled", "NoShow"];

const createAppointmentCode = async () => {
  const result = await query(
    "SELECT COALESCE(MAX(CAST(SUBSTRING(appointment_code FROM 3) AS INTEGER)), 3000) + 1 AS next_code FROM appointments"
  );
  return `A-${String(result.rows[0].next_code).padStart(4, "0")}`;
};

export const getAllAppointments = async (req, res, next) => {
  try {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 10);
    const search = req.query.search || "";
    const status = req.query.status || "";
    const doctorId = req.query.doctor_id || "";
    const date = req.query.date || "";
    const offset = (page - 1) * limit;

    const params = [];
    let filters = "";

    if (search) {
      params.push(`%${search}%`);
      const idx = params.length;
      filters += ` AND (p.name ILIKE $${idx} OR d.name ILIKE $${idx} OR a.appointment_code ILIKE $${idx})`;
    }
    if (status) {
      params.push(status);
      filters += ` AND a.status = $${params.length}`;
    }
    if (doctorId) {
      params.push(doctorId);
      filters += ` AND a.doctor_id = $${params.length}`;
    }
    if (date) {
      params.push(date);
      filters += ` AND DATE(a.appointment_date) = $${params.length}`;
    }

    params.push(limit, offset);

    const [itemsResult, countResult] = await Promise.all([
      query(
        `${appointmentSelect} ${filters} ORDER BY a.appointment_date DESC, a.id DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
      ),
      query(
        `SELECT COUNT(*) FROM appointments a JOIN patients p ON p.id = a.patient_id JOIN doctors d ON d.id = a.doctor_id WHERE a.is_deleted = false ${filters}`,
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
      message: "Appointments fetched",
    });
  } catch (error) {
    return next(error);
  }
};

export const getAppointmentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query(`${appointmentSelect} AND a.id = $1`, [id]);

    if (!result.rows.length) {
      return res.status(404).json({ success: false, data: null, message: "Appointment not found" });
    }

    const historyResult = await query(
      `SELECT ash.new_status, ash.reason, ash.changed_at, u.name AS changed_by_name
       FROM appointment_status_history ash
       LEFT JOIN users u ON u.id = ash.changed_by
       WHERE ash.appointment_id = $1
       ORDER BY ash.changed_at DESC`,
      [id]
    );

    return res.json({ 
      success: true, 
      data: { 
        ...result.rows[0], 
        status_history: historyResult.rows 
      }, 
      message: "Appointment fetched" 
    });
  } catch (error) {
    return next(error);
  }
};

export const createAppointment = async (req, res, next) => {
  try {
    const appointmentCode = await createAppointmentCode();
    const {
      patient_id,
      doctor_id,
      appointment_date,
      duration,
      type,
      status,
      notes,
      symptoms,
      prescription,
      follow_up_date,
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

    const result = await query(
      `INSERT INTO appointments (
        appointment_code, patient_id, doctor_id, appointment_date, duration, type, status, status_reason, notes, symptoms, prescription, follow_up_date
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING id`,
      [
        appointmentCode,
        patient_id,
        doctor_id,
        appointment_date,
        duration ?? 30,
        type ?? "Consultation",
        status || "Booked",
        req.body.status_reason || null,
        notes || null,
        symptoms || null,
        prescription || null,
        follow_up_date || null,
      ]
    );

    const created = await query(`${appointmentSelect} AND a.id = $1`, [result.rows[0].id]);

    // History logging should NEVER cause the main appointment creation to fail
    try {
      await query(
        `INSERT INTO appointment_status_history (appointment_id, previous_status, new_status, reason, changed_by)
         VALUES ($1, NULL, $2, $3, $4)`,
        [result.rows[0].id, "Booked", "Appointment created", req.user?.id]
      );
    } catch (historyErr) {
      console.error('History log failed (non-fatal):', historyErr.message);
      // Do NOT re-throw — appointment creation still succeeds
    }

    return res.status(201).json({ success: true, data: created.rows[0], message: "Appointment created" });
  } catch (error) {
    return next(error);
  }
};

export const updateAppointment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await query("SELECT * FROM appointments WHERE id = $1 AND is_deleted = false", [id]);

    if (!existing.rows.length) {
      return res.status(404).json({ success: false, data: null, message: "Appointment not found" });
    }

    const current = existing.rows[0];
    const newStatus = req.body.status ?? current.status;
    const statusReason = req.body.status_reason ?? null;
    
    const payload = {
      patient_id: req.body.patient_id ?? current.patient_id,
      doctor_id: req.body.doctor_id ?? current.doctor_id,
      appointment_date: req.body.appointment_date ?? current.appointment_date,
      duration: req.body.duration ?? current.duration,
      type: req.body.type ?? current.type,
      status: newStatus,
      status_reason: statusReason,
      notes: req.body.notes ?? current.notes,
      symptoms: req.body.symptoms ?? current.symptoms,
      prescription: req.body.prescription ?? current.prescription,
      follow_up_date: req.body.follow_up_date ?? current.follow_up_date,
    };

    await query(
      `UPDATE appointments
       SET patient_id = $1,
           doctor_id = $2,
           appointment_date = $3,
           duration = $4,
           type = $5,
           status = $6,
           status_reason = $7,
           notes = $8,
           symptoms = $9,
           prescription = $10,
           follow_up_date = $11,
           updated_at = NOW()
       WHERE id = $12 AND is_deleted = false`,
      [
        payload.patient_id,
        payload.doctor_id,
        payload.appointment_date,
        payload.duration,
        payload.type,
        payload.status,
        payload.status_reason,
        payload.notes,
        payload.symptoms,
        payload.prescription,
        payload.follow_up_date || null,
        id,
      ]
    );

    if (newStatus !== current.status) {
      try {
        await query(
          `INSERT INTO appointment_status_history (appointment_id, previous_status, new_status, reason, changed_by)
           VALUES ($1, $2, $3, $4, $5)`,
          [id, current.status, newStatus, statusReason, req.user?.id]
        );
      } catch (historyErr) {
        console.error('History log failed (non-fatal):', historyErr.message);
        // Do NOT re-throw — appointment update still succeeds
      }
    }

    const updated = await query(`${appointmentSelect} AND a.id = $1`, [id]);
    return res.json({ success: true, data: updated.rows[0], message: "Appointment updated" });
  } catch (error) {
    return next(error);
  }
};

export const deleteAppointment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await query("SELECT * FROM appointments WHERE id = $1 AND is_deleted = false", [id]);

    if (!existing.rows.length) {
      return res.status(404).json({ success: false, data: null, message: "Appointment not found" });
    }

    await query("UPDATE appointments SET is_deleted = true, deleted_at = NOW() WHERE id = $1", [id]);
    return res.json({ success: true, data: { id: existing.rows[0].id, appointment_code: existing.rows[0].appointment_code }, message: "Appointment deleted" });
  } catch (error) {
    return next(error);
  }
};
