-- Database Performance Optimization for Medicare HMS
-- This file contains indexes, query optimizations, and performance improvements

-- Performance Indexes for Frequently Queried Tables

-- Users Table Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(role, status) WHERE status = 'active';

-- Patients Table Indexes
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(name);
CREATE INDEX IF NOT EXISTS idx_patients_email ON patients(email);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);
CREATE INDEX IF NOT EXISTS idx_patients_status ON patients(status);
CREATE INDEX IF NOT EXISTS idx_patients_blood_type ON patients(blood_type);
CREATE INDEX IF NOT EXISTS idx_patients_created_at ON patients(created_at);
CREATE INDEX IF NOT EXISTS idx_patients_search ON patients USING gin(to_tsvector('english', name || ' ' || COALESCE(email, '') || ' ' || COALESCE(phone, '')));
CREATE INDEX IF NOT EXISTS idx_patients_active ON patients(status) WHERE status = 'active';

-- Doctors Table Indexes
CREATE INDEX IF NOT EXISTS idx_doctors_name ON doctors(name);
CREATE INDEX IF NOT EXISTS idx_doctors_specialization ON doctors(specialization);
CREATE INDEX IF NOT EXISTS idx_doctors_status ON doctors(status);
CREATE INDEX IF NOT EXISTS idx_doctors_rating ON doctors(rating);
CREATE INDEX IF NOT EXISTS idx_doctors_created_at ON doctors(created_at);
CREATE INDEX IF NOT EXISTS idx_doctors_active ON doctors(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_doctors_search ON doctors USING gin(to_tsvector('english', name || ' ' || specialization));

-- Appointments Table Indexes
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_type ON appointments(type);
CREATE INDEX IF NOT EXISTS idx_appointments_created_at ON appointments(created_at);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_date ON appointments(doctor_id, appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_date ON appointments(patient_id, appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_upcoming ON appointments(appointment_date, status) WHERE status = 'scheduled';

-- Billing Table Indexes
CREATE INDEX IF NOT EXISTS idx_billing_patient_id ON billing(patient_id);
CREATE INDEX IF NOT EXISTS idx_billing_doctor_id ON billing(doctor_id);
CREATE INDEX IF NOT EXISTS idx_billing_appointment_id ON billing(appointment_id);
CREATE INDEX IF NOT EXISTS idx_billing_status ON billing(status);
CREATE INDEX IF NOT EXISTS idx_billing_payment_method ON billing(payment_method);
CREATE INDEX IF NOT EXISTS idx_billing_due_date ON billing(due_date);
CREATE INDEX IF NOT EXISTS idx_billing_created_at ON billing(created_at);
CREATE INDEX IF NOT EXISTS idx_billing_unpaid ON billing(status, due_date) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_billing_overdue ON billing(status, due_date) WHERE status = 'pending' AND due_date < NOW();

-- Lab Orders Table Indexes
CREATE INDEX IF NOT EXISTS idx_lab_orders_patient_id ON lab_orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_orders_doctor_id ON lab_orders(doctor_id);
CREATE INDEX IF NOT EXISTS idx_lab_orders_test_name ON lab_orders(test_name);
CREATE INDEX IF NOT EXISTS idx_lab_orders_status ON lab_orders(status);
CREATE INDEX IF NOT EXISTS idx_lab_orders_test_date ON lab_orders(test_date);
CREATE INDEX IF NOT EXISTS idx_lab_orders_created_at ON lab_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_lab_orders_pending ON lab_orders(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_lab_orders_patient_pending ON lab_orders(patient_id, status) WHERE status = 'pending';

-- Pharmacy/Medicines Table Indexes
CREATE INDEX IF NOT EXISTS idx_pharmacy_medicine_name ON pharmacy(medicine_name);
CREATE INDEX IF NOT EXISTS idx_pharmacy_manufacturer ON pharmacy(manufacturer);
CREATE INDEX IF NOT EXISTS idx_pharmacy_status ON pharmacy(status);
CREATE INDEX IF NOT EXISTS idx_pharmacy_category ON pharmacy(category);
CREATE INDEX IF NOT EXISTS idx_pharmacy_stock ON pharmacy(stock);
CREATE INDEX IF NOT EXISTS idx_pharmacy_price ON pharmacy(price);
CREATE INDEX IF NOT EXISTS idx_pharmacy_created_at ON pharmacy(created_at);
CREATE INDEX IF NOT EXISTS idx_pharmacy_low_stock ON pharmacy(stock, status) WHERE stock < 50;
CREATE INDEX IF NOT EXISTS idx_pharmacy_search ON pharmacy USING gin(to_tsvector('english', medicine_name || ' ' || COALESCE(manufacturer, '')));

-- Departments Table Indexes
CREATE INDEX IF NOT EXISTS idx_departments_name ON departments(name);
CREATE INDEX IF NOT EXISTS idx_departments_status ON departments(status);
CREATE INDEX IF NOT EXISTS idx_departments_created_at ON departments(created_at);

-- Staff Table Indexes
CREATE INDEX IF NOT EXISTS idx_staff_user_id ON staff(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_department_id ON staff(department_id);
CREATE INDEX IF NOT EXISTS idx_staff_position ON staff(position);
CREATE INDEX IF NOT EXISTS idx_staff_status ON staff(status);
CREATE INDEX IF NOT EXISTS idx_staff_created_at ON staff(created_at);
CREATE INDEX IF NOT EXISTS idx_staff_active ON staff(status) WHERE status = 'active';

-- Prescriptions Table Indexes
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_id ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor_id ON prescriptions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_appointment_id ON prescriptions(appointment_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_created_at ON prescriptions(created_at);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_active ON prescriptions(patient_id, created_at) ORDER BY created_at DESC;

-- Compound Indexes for Common Query Patterns
CREATE INDEX IF NOT EXISTS idx_appointments_composite ON appointments(status, appointment_date, doctor_id);
CREATE INDEX IF NOT EXISTS idx_billing_composite ON billing(status, patient_id, created_at);
CREATE INDEX IF NOT EXISTS idx_patients_composite ON patients(status, created_at, name);
CREATE INDEX IF NOT EXISTS idx_lab_orders_composite ON lab_orders(status, test_date, patient_id);

-- Full-Text Search Indexes
CREATE INDEX IF NOT EXISTS idx_patients_fts ON patients USING gin(to_tsvector('english', 
  COALESCE(name, '') || ' ' || 
  COALESCE(email, '') || ' ' || 
  COALESCE(phone, '') || ' ' || 
  COALESCE(address, '')
));

CREATE INDEX IF NOT EXISTS idx_doctors_fts ON doctors USING gin(to_tsvector('english', 
  COALESCE(name, '') || ' ' || 
  COALESCE(specialization, '') || ' ' || 
  COALESCE(qualification, '')
));

-- Partitioning Strategy for Large Tables (if needed)
-- Uncomment if tables become very large (>10M rows)

/*
-- Partition appointments by year
CREATE TABLE appointments_2024 PARTITION OF appointments
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

CREATE TABLE appointments_2025 PARTITION OF appointments
FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
*/

-- Query Optimization Views

-- Patient Summary View (optimized for dashboard)
CREATE OR REPLACE VIEW patient_summary AS
SELECT 
  p.id,
  p.name,
  p.email,
  p.phone,
  p.age,
  p.gender,
  p.blood_type,
  p.status,
  p.last_visit,
  COUNT(DISTINCT a.id) as total_appointments,
  COUNT(DISTINCT a.id) FILTER (WHERE a.appointment_date >= NOW() - INTERVAL '30 days') as recent_appointments,
  COUNT(DISTINCT b.id) as total_bills,
  COALESCE(SUM(b.total), 0) as total_amount,
  COALESCE(SUM(b.total) FILTER (WHERE b.status = 'pending'), 0) as outstanding_amount
FROM patients p
LEFT JOIN appointments a ON p.id = a.patient_id
LEFT JOIN billing b ON p.id = b.patient_id
GROUP BY p.id, p.name, p.email, p.phone, p.age, p.gender, p.blood_type, p.status, p.last_visit;

-- Doctor Performance View (optimized for analytics)
CREATE OR REPLACE VIEW doctor_performance AS
SELECT 
  d.id,
  d.name,
  d.specialization,
  d.rating,
  COUNT(DISTINCT a.id) as total_appointments,
  COUNT(DISTINCT a.id) FILTER (WHERE a.appointment_date >= NOW() - INTERVAL '30 days') as recent_appointments,
  COUNT(DISTINCT a.patient_id) as unique_patients,
  COUNT(DISTINCT b.id) as total_bills,
  COALESCE(SUM(b.total), 0) as total_revenue,
  AVG(EXTRACT(EPOCH FROM (a.updated_at - a.created_at))/60) as avg_appointment_duration
FROM doctors d
LEFT JOIN appointments a ON d.id = a.doctor_id
LEFT JOIN billing b ON d.id = b.doctor_id
GROUP BY d.id, d.name, d.specialization, d.rating;

-- Financial Summary View (optimized for reporting)
CREATE OR REPLACE VIEW financial_summary AS
SELECT 
  DATE_TRUNC('month', b.created_at) as month,
  COUNT(*) as total_bills,
  COUNT(*) FILTER (WHERE b.status = 'paid') as paid_bills,
  COUNT(*) FILTER (WHERE b.status = 'pending') as pending_bills,
  SUM(b.amount) as total_amount,
  SUM(b.amount) FILTER (WHERE b.status = 'paid') as paid_amount,
  SUM(b.amount) FILTER (WHERE b.status = 'pending') as pending_amount,
  COUNT(DISTINCT b.patient_id) as unique_patients,
  COUNT(DISTINCT b.doctor_id) as unique_doctors
FROM billing b
GROUP BY DATE_TRUNC('month', b.created_at)
ORDER BY month DESC;

-- Performance Monitoring Queries

-- Query Performance Analysis
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Table Size Analysis
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
  pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY size_bytes DESC;

-- Slow Query Identification
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  rows
FROM pg_stat_statements 
WHERE mean_time > 1000 -- queries taking more than 1 second
ORDER BY mean_time DESC
LIMIT 10;

-- Database Maintenance Procedures

-- Update Statistics (run after large data changes)
ANALYZE patients;
ANALYZE doctors;
ANALYZE appointments;
ANALYZE billing;
ANALYZE lab_orders;
ANALYZE pharmacy;
ANALYZE departments;
ANALYZE staff;
ANALYZE prescriptions;

-- Reindex Fragmented Indexes
REINDEX INDEX CONCURRENTLY idx_patients_name;
REINDEX INDEX CONCURRENTLY idx_doctors_name;
REINDEX INDEX CONCURRENTLY idx_appointments_date;
REINDEX INDEX CONCURRENTLY idx_billing_created_at;

-- Vacuum and Analyze (run during maintenance window)
VACUUM ANALYZE patients;
VACUUM ANALYZE doctors;
VACUUM ANALYZE appointments;
VACUUM ANALYZE billing;
VACUUM ANALYZE lab_orders;
VACUUM ANALYZE pharmacy;

-- Query Optimization Examples

-- Optimized Patient Search
EXPLAIN (ANALYZE, BUFFERS)
SELECT p.* 
FROM patients p 
WHERE p.name ILIKE '%john%' 
  OR p.email ILIKE '%john%'
  OR p.phone ILIKE '%john%'
LIMIT 20;

-- Optimized Appointment Query
EXPLAIN (ANALYZE, BUFFERS)
SELECT a.*, p.name as patient_name, d.name as doctor_name
FROM appointments a
JOIN patients p ON a.patient_id = p.id
JOIN doctors d ON a.doctor_id = d.id
WHERE a.appointment_date BETWEEN '2024-01-01' AND '2024-01-31'
  AND a.status = 'scheduled'
ORDER BY a.appointment_date;

-- Optimized Financial Query
EXPLAIN (ANALYZE, BUFFERS)
SELECT 
  DATE_TRUNC('month', created_at) as month,
  SUM(amount) as total_revenue,
  COUNT(*) as transaction_count
FROM billing
WHERE created_at >= NOW() - INTERVAL '12 months'
  AND status = 'paid'
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month;

-- Configuration Settings for Performance

-- Increase work_mem for complex queries (temporary)
SET work_mem = '256MB';

-- Increase maintenance_work_mem for index creation
SET maintenance_work_mem = '512MB';

-- Enable parallel query processing
SET max_parallel_workers_per_gather = 4;
SET max_parallel_workers = 8;

-- Optimize random_page_cost for SSD storage
SET random_page_cost = 1.1;

-- Set effective_cache_size appropriately
SET effective_cache_size = '4GB';
