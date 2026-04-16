import Joi from "joi";

/**
 * Validate request body against a Joi schema.
 * @param {Joi.ObjectSchema} schema
 * @returns {(req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => void}
 */
export const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    const message = error.details.map((detail) => detail.message).join(", ");
    return res.status(400).json({ success: false, data: null, message });
  }
  return next();
};

/**
 * Joi schemas for request validation.
 */
export const schemas = {
  register: Joi.object({
    name: Joi.string().min(2).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    role: Joi.string().valid(
      "admin",
      "doctor",
      "nurse",
      "receptionist",
      "billing",
      "lab_technician",
      "pharmacist",
      "patient",
      "staff"
    ).optional(),
  }),
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),
  patientCreate: Joi.object({
    name: Joi.string().min(2).required(),
    age: Joi.number().min(0).max(130).optional(),
    gender: Joi.string().optional(),
    blood_type: Joi.string().optional(),
    phone: Joi.string().optional(),
    email: Joi.string().email().allow("").optional(),
    address: Joi.string().allow("").optional(),
    medical_history: Joi.string().allow("").optional(),
    last_visit: Joi.date().optional().allow(null),
    status: Joi.string().optional(),
  }),
  patientUpdate: Joi.object({
    name: Joi.string().min(2).optional(),
    age: Joi.number().min(0).max(130).optional(),
    gender: Joi.string().optional(),
    blood_type: Joi.string().optional(),
    phone: Joi.string().optional(),
    email: Joi.string().email().allow("").optional(),
    address: Joi.string().allow("").optional(),
    medical_history: Joi.string().allow("").optional(),
    last_visit: Joi.date().optional().allow(null),
    status: Joi.string().optional(),
  }),
  doctorCreate: Joi.object({
    name: Joi.string().min(2).required(),
    specialization: Joi.string().optional(),
    qualification: Joi.string().allow("").optional(),
    experience: Joi.number().min(0).optional(),
    phone: Joi.string().allow("").optional(),
    email: Joi.string().email().allow("").optional(),
    availability: Joi.string().optional(),
    rating: Joi.number().min(0).max(5).optional(),
    bio: Joi.string().allow("").optional(),
    status: Joi.string().optional(),
    working_hours: Joi.object().optional(),
  }),
  doctorUpdate: Joi.object({
    name: Joi.string().min(2).optional(),
    specialization: Joi.string().optional(),
    qualification: Joi.string().allow("").optional(),
    experience: Joi.number().min(0).optional(),
    phone: Joi.string().allow("").optional(),
    email: Joi.string().email().allow("").optional(),
    availability: Joi.string().optional(),
    rating: Joi.number().min(0).max(5).optional(),
    bio: Joi.string().allow("").optional(),
    status: Joi.string().optional(),
    working_hours: Joi.object().optional(),
  }),
  appointmentCreate: Joi.object({
    patient_id: Joi.number().required(),
    doctor_id: Joi.number().required(),
    appointment_date: Joi.date().required(),
    duration: Joi.number().optional(),
    type: Joi.string().optional(),
    status: Joi.string().optional(),
    notes: Joi.string().allow("").optional(),
    symptoms: Joi.string().allow("").optional(),
    prescription: Joi.string().allow("").optional(),
    follow_up_date: Joi.date().allow("").optional(),
  }),
  appointmentUpdate: Joi.object({
    patient_id: Joi.number().optional(),
    doctor_id: Joi.number().optional(),
    appointment_date: Joi.date().optional(),
    duration: Joi.number().optional(),
    type: Joi.string().optional(),
    status: Joi.string().optional(),
    notes: Joi.string().allow("").optional(),
    symptoms: Joi.string().allow("").optional(),
    prescription: Joi.string().allow("").optional(),
    follow_up_date: Joi.date().allow("").optional(),
  }),
  billingCreate: Joi.object({
    patient_id: Joi.number().required(),
    doctor_id: Joi.number().required(),
    appointment_id: Joi.number().allow(null, "").optional(),
    amount: Joi.number().required(),
    discount: Joi.number().optional(),
    tax: Joi.number().optional(),
    total: Joi.number().optional(),
    status: Joi.string().optional(),
    payment_method: Joi.string().allow("").optional(),
    due_date: Joi.date().allow("").optional(),
    paid_at: Joi.date().allow("").optional(),
    invoice_date: Joi.date().allow("").optional(),
    notes: Joi.string().allow("").optional(),
  }),
  billingUpdate: Joi.object({
    patient_id: Joi.number().optional(),
    doctor_id: Joi.number().optional(),
    appointment_id: Joi.number().allow(null, "").optional(),
    amount: Joi.number().optional(),
    discount: Joi.number().optional(),
    tax: Joi.number().optional(),
    total: Joi.number().optional(),
    status: Joi.string().optional(),
    payment_method: Joi.string().allow("").optional(),
    due_date: Joi.date().allow("").optional(),
    paid_at: Joi.date().allow("").optional(),
    invoice_date: Joi.date().allow("").optional(),
    notes: Joi.string().allow("").optional(),
  }),
  labCreate: Joi.object({
    patient_id: Joi.number().required(),
    doctor_id: Joi.number().required(),
    test_name: Joi.string().min(2).required(),
    result: Joi.string().allow("").optional(),
    status: Joi.string().valid("Pending", "Completed").optional(),
  }),
  labUpdate: Joi.object({
    patient_id: Joi.number().optional(),
    doctor_id: Joi.number().optional(),
    test_name: Joi.string().min(2).optional(),
    result: Joi.string().allow("").optional(),
    status: Joi.string().valid("Pending", "Completed").optional(),
  }),
  pharmacyCreate: Joi.object({
    medicine_name: Joi.string().min(2).required(),
    manufacturer: Joi.string().allow("").optional(),
    stock: Joi.number().min(0).required(),
    price: Joi.number().min(0).required(),
    status: Joi.string().valid("Active", "Inactive").optional(),
  }),
  pharmacyUpdate: Joi.object({
    medicine_name: Joi.string().min(2).optional(),
    manufacturer: Joi.string().allow("").optional(),
    stock: Joi.number().min(0).optional(),
    price: Joi.number().min(0).optional(),
    status: Joi.string().valid("Active", "Inactive").optional(),
  }),
  departmentCreate: Joi.object({
    name: Joi.string().min(2).required(),
    description: Joi.string().allow("").optional(),
    head_of_department: Joi.string().allow("").optional(),
    status: Joi.string().optional(),
  }),
  departmentUpdate: Joi.object({
    name: Joi.string().min(2).optional(),
    description: Joi.string().allow("").optional(),
    head_of_department: Joi.string().allow("").optional(),
    status: Joi.string().optional(),
  }),
  staffCreate: Joi.object({
    user_id: Joi.number().required(),
    department_id: Joi.number().optional(),
    position: Joi.string().optional(),
    salary: Joi.number().optional(),
    join_date: Joi.date().optional(),
    status: Joi.string().optional(),
  }),
  bedCreate: Joi.object({
    bed_number: Joi.string().required(),
    ward_type: Joi.string().required(),
    department_id: Joi.number().optional(),
    status: Joi.string().optional(),
    price_per_day: Joi.number().optional(),
  }),
  admissionCreate: Joi.object({
    patient_id: Joi.number().required(),
    bed_id: Joi.number().optional(),
    doctor_id: Joi.number().optional(),
    reason: Joi.string().allow("").optional(),
    diagnosis: Joi.string().allow("").optional(),
    treatment_plan: Joi.string().allow("").optional(),
  }),
  prescriptionCreate: Joi.object({
    patient_id: Joi.number().required(),
    doctor_id: Joi.number().required(),
    appointment_id: Joi.number().allow(null).optional(),
    diagnosis: Joi.string().allow("").optional(),
    symptoms: Joi.string().allow("").optional(),
    notes: Joi.string().allow("").optional(),
  }),
  activityLogCreate: Joi.object({
    action: Joi.string().required(),
    entity_type: Joi.string().allow("").optional(),
    entity_id: Joi.number().optional(),
    details: Joi.string().allow("").optional(),
  }),
};
