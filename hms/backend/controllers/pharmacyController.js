import { query } from "../config/db.js";

const pharmacySelect = `
  SELECT
    id,
    medicine_name,
    COALESCE(manufacturer, '') AS manufacturer,
    COALESCE(stock, 0) AS stock,
    COALESCE(price, 0) AS price,
    COALESCE(status, 'Active') AS status,
    created_at,
    updated_at
  FROM pharmacy
`;

export const getAllPharmacyItems = async (req, res, next) => {
  try {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 10);
    const search = req.query.search || "";
    const offset = (page - 1) * limit;
    const params = [];
    let where = "WHERE 1=1";

    if (search) {
      params.push(`%${search}%`);
      const idx = params.length;
      where += ` AND (medicine_name ILIKE $${idx} OR manufacturer ILIKE $${idx})`;
    }

    params.push(limit, offset);

    const [itemsResult, countResult] = await Promise.all([
      query(
        `${pharmacySelect} ${where} ORDER BY created_at DESC, id DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
      ),
      query(`SELECT COUNT(*) FROM pharmacy ${where}`, params.slice(0, -2)),
    ]);

    const total = Number(countResult.rows[0].count);
    return res.json({
      success: true,
      data: {
        items: itemsResult.rows,
        pagination: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) },
      },
      message: "Pharmacy items fetched",
    });
  } catch (error) {
    return next(error);
  }
};

export const createPharmacyItem = async (req, res, next) => {
  try {
    const { medicine_name, manufacturer, stock, price, status } = req.body;
    const created = await query(
      `INSERT INTO pharmacy (medicine_name, manufacturer, stock, price, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [medicine_name, manufacturer || null, stock, price, status || "Active"]
    );

    const resultRow = await query(`${pharmacySelect} WHERE id = $1`, [created.rows[0].id]);
    return res.status(201).json({
      success: true,
      data: resultRow.rows[0],
      message: "Pharmacy item created",
    });
  } catch (error) {
    return next(error);
  }
};

export const updatePharmacyItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const parsedId = Number(id);
    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      return res.status(400).json({ success: false, data: null, message: "Invalid pharmacy item ID" });
    }
    
    const existing = await query("SELECT * FROM pharmacy WHERE id = $1", [id]);
    if (!existing.rows.length) {
      return res.status(404).json({ success: false, data: null, message: "Pharmacy item not found" });
    }

    const current = existing.rows[0];
    const payload = {
      medicine_name: req.body.medicine_name ?? current.medicine_name,
      manufacturer: req.body.manufacturer ?? current.manufacturer,
      stock: req.body.stock ?? current.stock,
      price: req.body.price ?? current.price,
      status: req.body.status ?? current.status,
    };

await query(
      `UPDATE pharmacy
       SET medicine_name = $1, manufacturer = $2, stock = $3, price = $4, status = $5, updated_at = NOW()
       WHERE id = $6`,
      [payload.medicine_name, payload.manufacturer, payload.stock, payload.price, payload.status, id]
    );

    const resultRow = await query(`${pharmacySelect} WHERE id = $1`, [id]);
    return res.json({ success: true, data: resultRow.rows[0], message: "Pharmacy item updated" });
  } catch (error) {
    return next(error);
  }
};

export const getPharmacyItemById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const parsedId = Number(id);
    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      return res.status(400).json({ success: false, data: null, message: "Invalid pharmacy item ID" });
    }
    
    const result = await query(`${pharmacySelect} WHERE id = $1`, [id]);

    if (!result.rows.length) {
      return res.status(404).json({ success: false, data: null, message: "Pharmacy item not found" });
    }

    return res.json({ success: true, data: result.rows[0], message: "Pharmacy item fetched" });
  } catch (error) {
    return next(error);
  }
};

export const deletePharmacyItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const parsedId = Number(id);
    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      return res.status(400).json({ success: false, data: null, message: "Invalid pharmacy item ID" });
    }
    
    const existing = await query("SELECT * FROM pharmacy WHERE id = $1", [id]);

    if (!existing.rows.length) {
      return res.status(404).json({ success: false, data: null, message: "Pharmacy item not found" });
    }

    await query("DELETE FROM pharmacy WHERE id = $1", [id]);
    return res.json({ success: true, message: "Pharmacy item deleted" });
  } catch (error) {
    return next(error);
  }
};
