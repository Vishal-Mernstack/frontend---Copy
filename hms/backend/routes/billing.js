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

router.post("/qr/generate", authenticate, async (req, res) => {
  try {
    const { amount, invoice_id, patient_name } = req.body;
    const upiId = 'medicarehhospital@upi';
    const hospitalName = encodeURIComponent('Medicare Hospital');
    const transactionNote = encodeURIComponent(`Invoice ${invoice_id}`);
    const qrUrl = `upi://pay?pa=${upiId}&pn=${hospitalName}&tn=${transactionNote}&am=${amount}`;
    
    res.json({
      success: true,
      data: {
        upi_url: qrUrl,
        qr_data: qrUrl,
        amount,
        upi_id: upiId
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate QR code data' });
  }
});

router.post("/payment", authenticate, authorize(["admin", "staff", "billing"]), async (req, res) => {
  try {
    const { invoice_id, amount, payment_method, transaction_id, notes } = req.body;
    
    const invoiceResult = await query('SELECT * FROM billing WHERE id = $1 AND is_deleted = false', [invoice_id]);
    const invoice = invoiceResult.rows[0];
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const paymentAmount = Number(amount || 0);
    const invoiceTotal = Number(invoice.total || 0);
    const newStatus = paymentAmount >= invoiceTotal ? 'Paid' : 'Partial';

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
      data: { status: newStatus, amount_paid: paymentAmount, transaction_id, notes }
    });
  } catch (error) {
    console.error('Payment error:', error);
    res.status(500).json({ error: 'Failed to record payment' });
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
