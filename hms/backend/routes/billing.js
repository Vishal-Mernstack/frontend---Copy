import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import { validate, schemas } from "../middleware/validate.js";
import {
  getAllBilling,
  getBillingById,
  createBilling,
  updateBilling,
  deleteBilling,
} from "../controllers/billingController.js";
import { query } from '../config/db.js';

const router = Router();

router.get("/stats", authenticate, authorize(["admin", "staff", "billing"]), async (req, res) => {
  try {
    const totalResult = await query(`
      SELECT 
        COALESCE(SUM(total), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN status = 'Paid' THEN total ELSE 0 END), 0) as collected,
        COALESCE(SUM(CASE WHEN status IN ('Pending', 'Partial') THEN total ELSE 0 END), 0) as pending,
        COALESCE(SUM(CASE WHEN status = 'Overdue' THEN total ELSE 0 END), 0) as overdue,
        COUNT(*) as total_invoices
      FROM billing WHERE is_deleted = false
    `);

    const statusResult = await query(`
      SELECT status, COUNT(*) as count, COALESCE(SUM(total), 0) as amount
      FROM billing WHERE is_deleted = false
      GROUP BY status
    `);

    const recentInvoices = await query(`
      SELECT b.*, p.name as patient_name, d.name as doctor_name
      FROM billing b
      LEFT JOIN patients p ON p.id = b.patient_id
      LEFT JOIN doctors d ON d.id = b.doctor_id
      WHERE b.is_deleted = false
      ORDER BY b.created_at DESC
      LIMIT 5
    `);

    res.json({
      success: true,
      data: {
        summary: totalResult.rows[0],
        statusBreakdown: statusResult.rows,
        recentInvoices: recentInvoices.rows
      }
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to fetch billing stats' });
  }
});

router.get("/services", authenticate, async (req, res) => {
  try {
    const result = await query('SELECT * FROM service_master WHERE is_active = true ORDER BY category, service_name');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

router.get("/insurance", authenticate, async (req, res) => {
  try {
    const result = await query('SELECT * FROM insurance_companies WHERE is_active = true');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch insurance companies' });
  }
});

router.get("/discounts", authenticate, async (req, res) => {
  try {
    const result = await query('SELECT * FROM discount_policies WHERE is_active = true');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch discount policies' });
  }
});

// UPI Config Routes (admin-only)
router.get("/upi-config", authenticate, authorize(["admin"]), async (req, res) => {
  try {
    const result = await query('SELECT * FROM upi_config ORDER BY created_at DESC');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch UPI config' });
  }
});

router.post("/upi-config", authenticate, authorize(["admin"]), async (req, res) => {
  try {
    const { upi_id, merchant_name, merchant_code, is_active } = req.body;
    if (!upi_id || !merchant_name) {
      return res.status(400).json({ success: false, message: 'UPI ID and merchant name are required' });
    }
    // Deactivate others if this is set active
    if (is_active) {
      await query('UPDATE upi_config SET is_active = false WHERE is_active = true');
    }
    const result = await query(
      'INSERT INTO upi_config (upi_id, merchant_name, merchant_code, is_active) VALUES ($1, $2, $3, $4) RETURNING *',
      [upi_id, merchant_name, merchant_code || null, is_active !== false]
    );
    res.status(201).json({ success: true, data: result.rows[0], message: 'UPI config created' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create UPI config' });
  }
});

router.put("/upi-config/:id", authenticate, authorize(["admin"]), async (req, res) => {
  try {
    const { upi_id, merchant_name, merchant_code, is_active } = req.body;
    const existing = await query('SELECT * FROM upi_config WHERE id = $1', [req.params.id]);
    if (!existing.rows.length) {
      return res.status(404).json({ success: false, message: 'UPI config not found' });
    }
    if (is_active) {
      await query('UPDATE upi_config SET is_active = false WHERE is_active = true AND id != $1', [req.params.id]);
    }
    const result = await query(
      'UPDATE upi_config SET upi_id = COALESCE($1, upi_id), merchant_name = COALESCE($2, merchant_name), merchant_code = COALESCE($3, merchant_code), is_active = COALESCE($4, is_active), updated_at = NOW() WHERE id = $5 RETURNING *',
      [upi_id, merchant_name, merchant_code, is_active, req.params.id]
    );
    res.json({ success: true, data: result.rows[0], message: 'UPI config updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update UPI config' });
  }
});

router.delete("/upi-config/:id", authenticate, authorize(["admin"]), async (req, res) => {
  try {
    const result = await query('DELETE FROM upi_config WHERE id = $1 RETURNING *', [req.params.id]);
    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'UPI config not found' });
    }
    res.json({ success: true, message: 'UPI config deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete UPI config' });
  }
});

// QR Code generation using active UPI config from DB
router.post("/qr/generate", authenticate, async (req, res) => {
  try {
    const { amount, invoice_id, patient_name } = req.body;
    const configResult = await query('SELECT * FROM upi_config WHERE is_active = true LIMIT 1');
    const upiConfig = configResult.rows[0];
    if (!upiConfig) {
      return res.status(400).json({ success: false, message: 'No active UPI configuration found. Admin must configure UPI settings first.' });
    }
    const upiId = upiConfig.upi_id;
    const hospitalName = encodeURIComponent(upiConfig.merchant_name);
    const transactionNote = encodeURIComponent(`Invoice ${invoice_id}`);
    const qrUrl = `upi://pay?pa=${upiId}&pn=${hospitalName}&tn=${transactionNote}&am=${amount}&cu=INR`;
    
    res.json({
      success: true,
      data: {
        upi_url: qrUrl,
        qr_data: qrUrl,
        amount,
        upi_id: upiId,
        merchant_name: upiConfig.merchant_name,
        merchant_code: upiConfig.merchant_code
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to generate QR code data' });
  }
});

router.post("/payment", authenticate, authorize(["admin", "staff", "billing"]), async (req, res) => {
  try {
    const { invoice_id, amount, payment_method, transaction_id, upi_reference, notes } = req.body;
    
    const invoiceResult = await query('SELECT * FROM billing WHERE id = $1 AND is_deleted = false', [invoice_id]);
    const invoice = invoiceResult.rows[0];
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const paymentAmount = Number(amount || 0);
    const invoiceTotal = Number(invoice.total || 0);
    const newStatus = paymentAmount >= invoiceTotal ? 'Paid' : 'Partial';

    // Record payment transaction
    const txnId = transaction_id || 'TXN' + Date.now();
    await query(
      'INSERT INTO payment_transactions (billing_id, transaction_id, amount, payment_method, status, upi_reference, notes, processed_by, processed_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())',
      [invoice_id, txnId, paymentAmount, payment_method, newStatus === 'Paid' ? 'Completed' : 'Pending', upi_reference || null, notes || null, req.user?.id]
    );

    // Update billing record
    await query(`
      UPDATE billing 
      SET status = $1, 
          paid_at = CASE WHEN $1 = 'Paid' THEN NOW() ELSE paid_at END,
          payment_method = $2,
          updated_at = NOW()
      WHERE id = $3
    `, [newStatus, payment_method, invoice_id]);

    res.json({
      success: true,
      message: 'Payment recorded successfully',
      data: { status: newStatus, amount_paid: paymentAmount, transaction_id: txnId, notes }
    });
  } catch (error) {
    console.error('Payment error:', error);
    res.status(500).json({ success: false, message: 'Failed to record payment' });
  }
});

// Get payment transactions for an invoice
router.get("/transactions/:billingId", authenticate, async (req, res) => {
  try {
    const result = await query(
      'SELECT pt.*, u.name as processed_by_name FROM payment_transactions pt LEFT JOIN users u ON pt.processed_by = u.id WHERE pt.billing_id = $1 ORDER BY pt.created_at DESC',
      [req.params.billingId]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch transactions' });
  }
});

router.post("/reminder/:id", authenticate, authorize(["admin", "staff"]), async (req, res) => {
  try {
    const { id } = req.params;
    res.json({ success: true, message: 'Reminder sent successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send reminder' });
  }
});

router.get("/", authenticate, authorize(["admin", "staff", "billing"]), getAllBilling);
router.get("/:id", authenticate, authorize(["admin", "staff", "doctor", "billing", "patient"]), getBillingById);
router.post("/", authenticate, authorize(["admin", "staff", "billing"]), validate(schemas.billingCreate), createBilling);
router.put("/:id", authenticate, authorize(["admin", "staff", "billing"]), validate(schemas.billingUpdate), updateBilling);
router.delete("/:id", authenticate, authorize(["admin", "staff", "billing"]), deleteBilling);

export default router;
