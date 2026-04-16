import { query } from "../config/db.js";

const doctorSelect = `
  SELECT
    id,
    doctor_code,
    COALESCE(name, '') AS name,
    COALESCE(specialization, '') AS specialization,
    COALESCE(qualification, '') AS qualification,
    COALESCE(experience, 0) AS experience,
    COALESCE(phone, '') AS phone,
    COALESCE(email, '') AS email,
    COALESCE(availability, 'Available') AS availability,
    COALESCE(rating, 0) AS rating,
    COALESCE(bio, '') AS bio,
    COALESCE(status, 'Active') AS status,
    COALESCE(working_hours, '{}'::jsonb) AS working_hours,
    created_at,
    updated_at
  FROM doctors
`;

const createDoctorCode = async () => {
  const result = await query(
    "SELECT COALESCE(MAX(CAST(SUBSTRING(doctor_code FROM 3) AS INTEGER)), 2000) + 1 AS next_code FROM doctors"
  );
  return `D-${String(result.rows[0].next_code).padStart(4, "0")}`;
};

export const getAllDoctors = async (req, res, next) => {
  try {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 10);
    const search = req.query.search || "";
    const availability = req.query.availability || "";
    const status = req.query.status || "";
    const offset = (page - 1) * limit;

    const params = [];
    let where = "WHERE 1=1";

    if (search) {
      params.push(`%${search}%`);
      const idx = params.length;
      where += ` AND (name ILIKE $${idx} OR specialization ILIKE $${idx} OR doctor_code ILIKE $${idx})`;
    }
    if (availability) {
      params.push(availability);
      where += ` AND availability = $${params.length}`;
    }
    if (status) {
      params.push(status);
      where += ` AND status = $${params.length}`;
    }

    params.push(limit, offset);

    const [itemsResult, countResult] = await Promise.all([
      query(
        `${doctorSelect} ${where} ORDER BY created_at DESC, id DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
      ),
      query(`SELECT COUNT(*) FROM doctors ${where}`, params.slice(0, -2)),
    ]);

    const total = Number(countResult.rows[0].count);

    return res.json({
      success: true,
      data: {
        items: itemsResult.rows,
        pagination: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) },
      },
      message: "Doctors fetched",
    });
  } catch (error) {
    return next(error);
  }
};

export const getDoctorById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query(`${doctorSelect} WHERE id = $1`, [id]);

    if (!result.rows.length) {
      return res.status(404).json({ success: false, data: null, message: "Doctor not found" });
    }

    return res.json({ success: true, data: result.rows[0], message: "Doctor fetched" });
  } catch (error) {
    return next(error);
  }
};

export const createDoctor = async (req, res, next) => {
  try {
    const doctorCode = await createDoctorCode();
    const {
      name,
      specialization,
      qualification,
      experience,
      phone,
      email,
      availability,
      rating,
      bio,
      status,
      working_hours,
    } = req.body;

    const result = await query(
      `INSERT INTO doctors (
        doctor_code, name, specialization, qualification, experience, phone, email, availability, rating, bio, status, working_hours
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING id`,
      [
        doctorCode,
        name,
        specialization ?? "",
        qualification || null,
        experience ?? 0,
        phone || null,
        email || null,
        availability || "Available",
        rating ?? 0,
        bio || null,
        status || "Active",
        working_hours || {},
      ]
    );

    const created = await query(`${doctorSelect} WHERE id = $1`, [result.rows[0].id]);
    return res.status(201).json({ success: true, data: created.rows[0], message: "Doctor created" });
  } catch (error) {
    return next(error);
  }
};

export const updateDoctor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await query("SELECT * FROM doctors WHERE id = $1", [id]);

    if (!existing.rows.length) {
      return res.status(404).json({ success: false, data: null, message: "Doctor not found" });
    }

    const current = existing.rows[0];
    const payload = {
      name: req.body.name ?? current.name,
      specialization: req.body.specialization ?? current.specialization,
      qualification: req.body.qualification ?? current.qualification,
      experience: req.body.experience ?? current.experience,
      phone: req.body.phone === "" ? null : req.body.phone ?? current.phone,
      email: req.body.email === "" ? null : req.body.email ?? current.email,
      availability: req.body.availability ?? current.availability,
      rating: req.body.rating ?? current.rating,
      bio: req.body.bio ?? current.bio,
      status: req.body.status ?? current.status,
      working_hours: req.body.working_hours ?? current.working_hours,
    };

    await query(
      `UPDATE doctors
       SET name = $1,
           specialization = $2,
           qualification = $3,
           experience = $4,
           phone = $5,
           email = $6,
           availability = $7,
           rating = $8,
           bio = $9,
           status = $10,
           working_hours = $11,
           updated_at = NOW()
       WHERE id = $12`,
      [
        payload.name,
        payload.specialization,
        payload.qualification,
        payload.experience,
        payload.phone,
        payload.email,
        payload.availability,
        payload.rating,
        payload.bio,
        payload.status,
        payload.working_hours,
        id,
      ]
    );

    const updated = await query(`${doctorSelect} WHERE id = $1`, [id]);
    return res.json({ success: true, data: updated.rows[0], message: "Doctor updated" });
  } catch (error) {
    return next(error);
  }
};

export const deleteDoctor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query("DELETE FROM doctors WHERE id = $1 RETURNING id, doctor_code, name", [id]);

    if (!result.rows.length) {
      return res.status(404).json({ success: false, data: null, message: "Doctor not found" });
    }

    return res.json({ success: true, data: result.rows[0], message: "Doctor deleted" });
  } catch (error) {
    return next(error);
  }
};
