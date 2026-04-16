# Medicare HMS API Documentation

**Version:** 1.0.0  
**Base URL:** `http://localhost:5000/api/v1`  
**Authentication:** Bearer Token (JWT)

---

## Table of Contents

1. [Authentication](#authentication)
2. [Patients](#patients)
3. [Doctors](#doctors)
4. [Appointments](#appointments)
5. [Billing](#billing)
6. [Lab Tests](#lab-tests)
7. [Pharmacy](#pharmacy)
8. [Medicines](#medicines)
9. [Notifications](#notifications)
10. [Departments](#departments)
11. [Staff](#staff)
12. [Error Handling](#error-handling)
13. [Rate Limiting](#rate-limiting)

---

## Authentication

### Register User
```http
POST /auth/register
```

**Description:** Register a new user in the system.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "patient|doctor|nurse|staff|billing|lab_technician|pharmacist|admin"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "role": "patient"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "User registered"
}
```

**Rate Limit:** 5 requests per 15 minutes per IP

### Login
```http
POST /auth/login
```

**Description:** Authenticate user and return JWT token.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "role": "patient"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Login successful"
}
```

**Rate Limit:** 5 requests per 15 minutes per IP

### Get Current User
```http
GET /auth/me
```

**Description:** Get current authenticated user profile.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "role": "patient"
    }
  },
  "message": "User profile fetched"
}
```

---

## Patients

### Get All Patients
```http
GET /patients
```

**Description:** Retrieve all patients with optional filtering.

**Query Parameters:**
- `search` (string): Search patients by name, email, or phone
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `status` (string): Filter by status (active, inactive, discharged)

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "John Doe",
      "age": 35,
      "gender": "Male",
      "blood_type": "O+",
      "phone": "123-456-7890",
      "email": "john@example.com",
      "address": "123 Main St",
      "medical_history": "Hypertension",
      "last_visit": "2024-01-15",
      "status": "active",
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "pages": 5
  }
}
```

**Rate Limit:** 100 requests per 15 minutes per IP

### Create Patient
```http
POST /patients
```

**Description:** Create a new patient record.

**Request Body:**
```json
{
  "name": "Jane Smith",
  "age": 28,
  "gender": "Female",
  "blood_type": "A+",
  "phone": "987-654-3210",
  "email": "jane@example.com",
  "address": "456 Oak Ave",
  "medical_history": "No significant medical history",
  "status": "active"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 2,
    "name": "Jane Smith",
    "age": 28,
    "gender": "Female",
    "blood_type": "A+",
    "phone": "987-654-3210",
    "email": "jane@example.com",
    "address": "456 Oak Ave",
    "medical_history": "No significant medical history",
    "last_visit": null,
    "status": "active",
    "created_at": "2024-01-16T14:30:00.000Z",
    "updated_at": "2024-01-16T14:30:00.000Z"
  },
  "message": "Patient created successfully"
}
```

**Rate Limit:** 50 requests per hour per IP

### Get Patient by ID
```http
GET /patients/:id
```

**Description:** Retrieve a specific patient by ID.

**Response:** Same structure as single patient object in list response.

### Update Patient
```http
PUT /patients/:id
```

**Description:** Update patient information.

**Request Body:** Same as create patient (all fields optional).

**Response:** Updated patient object.

### Delete Patient
```http
DELETE /patients/:id
```

**Description:** Delete a patient record (cascades to related records).

**Response:**
```json
{
  "success": true,
  "data": null,
  "message": "Patient deleted successfully"
}
```

---

## Doctors

### Get All Doctors
```http
GET /doctors
```

**Description:** Retrieve all doctors with optional filtering.

**Query Parameters:**
- `search` (string): Search doctors by name, specialization
- `specialization` (string): Filter by specialization
- `status` (string): Filter by status (active, inactive)
- `page` (number): Page number
- `limit` (number): Items per page

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Dr. Sarah Johnson",
      "specialization": "Cardiology",
      "qualification": "MD, FACC",
      "experience": 15,
      "phone": "555-0123",
      "email": "drjohnson@hospital.com",
      "availability": "Mon-Fri 9AM-5PM",
      "rating": 4.8,
      "bio": "Experienced cardiologist specializing in heart diseases",
      "status": "active",
      "working_hours": {
        "monday": "9:00-17:00",
        "tuesday": "9:00-17:00",
        "wednesday": "9:00-17:00",
        "thursday": "9:00-17:00",
        "friday": "9:00-17:00"
      },
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  }
}
```

### Create Doctor
```http
POST /doctors
```

**Description:** Create a new doctor record.

**Request Body:**
```json
{
  "name": "Dr. Michael Chen",
  "specialization": "Neurology",
  "qualification": "MD, FAAN",
  "experience": 12,
  "phone": "555-0456",
  "email": "drchen@hospital.com",
  "availability": "Mon-Wed, Fri 8AM-4PM",
  "rating": 4.9,
  "bio": "Neurologist specializing in brain and nervous system disorders",
  "status": "active",
  "working_hours": {
    "monday": "8:00-16:00",
    "tuesday": "8:00-16:00",
    "wednesday": "8:00-16:00",
    "friday": "8:00-16:00"
  }
}
```

**Rate Limit:** 50 requests per hour per IP

---

## Appointments

### Get All Appointments
```http
GET /appointments
```

**Description:** Retrieve all appointments with filtering.

**Query Parameters:**
- `patient_id` (number): Filter by patient
- `doctor_id` (number): Filter by doctor
- `date` (string): Filter by date (YYYY-MM-DD)
- `status` (string): Filter by status (scheduled, completed, cancelled)
- `page` (number): Page number
- `limit` (number): Items per page

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "patient_id": 1,
      "doctor_id": 1,
      "appointment_date": "2024-01-20T10:30:00.000Z",
      "duration": 30,
      "type": "consultation",
      "status": "scheduled",
      "notes": "Regular checkup",
      "symptoms": "Chest pain, shortness of breath",
      "prescription": "Prescribed medication for hypertension",
      "follow_up_date": "2024-02-20T10:30:00.000Z",
      "created_at": "2024-01-15T14:30:00.000Z",
      "updated_at": "2024-01-15T14:30:00.000Z",
      "patient": {
        "id": 1,
        "name": "John Doe",
        "phone": "123-456-7890"
      },
      "doctor": {
        "id": 1,
        "name": "Dr. Sarah Johnson",
        "specialization": "Cardiology"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10
  }
}
```

### Create Appointment
```http
POST /appointments
```

**Description:** Create a new appointment.

**Request Body:**
```json
{
  "patient_id": 1,
  "doctor_id": 1,
  "appointment_date": "2024-01-25T14:30:00.000Z",
  "duration": 30,
  "type": "consultation",
  "status": "scheduled",
  "notes": "Follow-up appointment",
  "symptoms": "Continued chest discomfort",
  "prescription": "",
  "follow_up_date": "2024-02-25T14:30:00.000Z"
}
```

**Rate Limit:** 50 requests per hour per IP

---

## Billing

### Get All Bills
```http
GET /billing
```

**Description:** Retrieve all billing records.

**Query Parameters:**
- `patient_id` (number): Filter by patient
- `doctor_id` (number): Filter by doctor
- `status` (string): Filter by status (pending, paid, overdue)
- `date_from` (string): Filter by date range start
- `date_to` (string): Filter by date range end

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "patient_id": 1,
      "doctor_id": 1,
      "appointment_id": 1,
      "amount": 500.00,
      "discount": 50.00,
      "tax": 45.00,
      "total": 495.00,
      "status": "pending",
      "payment_method": "cash",
      "due_date": "2024-01-30T00:00:00.000Z",
      "paid_at": null,
      "invoice_date": "2024-01-15T00:00:00.000Z",
      "notes": "Consultation and lab tests",
      "created_at": "2024-01-15T14:30:00.000Z",
      "updated_at": "2024-01-15T14:30:00.000Z",
      "patient": {
        "id": 1,
        "name": "John Doe"
      },
      "doctor": {
        "id": 1,
        "name": "Dr. Sarah Johnson"
      }
    }
  ]
}
```

### Create Bill
```http
POST /billing
```

**Description:** Create a new billing record.

**Request Body:**
```json
{
  "patient_id": 1,
  "doctor_id": 1,
  "appointment_id": 1,
  "amount": 750.00,
  "discount": 75.00,
  "tax": 67.50,
  "total": 742.50,
  "status": "pending",
  "payment_method": "card",
  "due_date": "2024-02-15T00:00:00.000Z",
  "notes": "Specialist consultation and advanced diagnostics"
}
```

**Rate Limit:** 50 requests per hour per IP

---

## Lab Tests

### Get All Lab Tests
```http
GET /lab
```

**Description:** Retrieve all lab test orders.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "patient_id": 1,
      "doctor_id": 1,
      "test_name": "Complete Blood Count (CBC)",
      "result": "WBC: 7.2, RBC: 4.8, Hgb: 14.5, Hct: 43, Plt: 250",
      "status": "completed",
      "test_date": "2024-01-16T09:00:00.000Z",
      "report_date": "2024-01-16T14:00:00.000Z",
      "technician": "Lab Tech Johnson",
      "notes": "All values within normal range",
      "created_at": "2024-01-15T14:30:00.000Z",
      "updated_at": "2024-01-16T14:00:00.000Z",
      "patient": {
        "id": 1,
        "name": "John Doe"
      },
      "doctor": {
        "id": 1,
        "name": "Dr. Sarah Johnson"
      }
    }
  ]
}
```

### Create Lab Test
```http
POST /lab
```

**Description:** Create a new lab test order.

**Request Body:**
```json
{
  "patient_id": 1,
  "doctor_id": 1,
  "test_name": "Lipid Profile",
  "result": "",
  "status": "pending",
  "notes": "Fasting required"
}
```

**Rate Limit:** 50 requests per hour per IP

---

## Pharmacy

### Get All Pharmacy Items
```http
GET /pharmacy
```

**Description:** Retrieve all pharmacy inventory items.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "medicine_name": "Ibuprofen 400mg",
      "manufacturer": "Pfizer",
      "stock": 150,
      "price": 15.99,
      "status": "active",
      "description": "NSAID for pain and inflammation",
      "category": "analgesic",
      "expiry_date": "2025-12-31",
      "batch_number": "IBU400-2024-001",
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

### Create Pharmacy Item
```http
POST /pharmacy
```

**Description:** Add new medicine to pharmacy inventory.

**Request Body:**
```json
{
  "medicine_name": "Amoxicillin 500mg",
  "manufacturer": "GlaxoSmithKline",
  "stock": 200,
  "price": 25.50,
  "status": "active",
  "description": "Antibiotic for bacterial infections",
  "category": "antibiotic",
  "expiry_date": "2025-06-30",
  "batch_number": "AMX500-2024-001"
}
```

**Rate Limit:** 50 requests per hour per IP

---

## Error Handling

All API endpoints return consistent error responses:

```json
{
  "success": false,
  "data": null,
  "message": "Error description"
}
```

### Common HTTP Status Codes

- **200 OK**: Request successful
- **201 Created**: Resource created successfully
- **400 Bad Request**: Invalid input data
- **401 Unauthorized**: Authentication required or invalid
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource not found
- **409 Conflict**: Resource already exists
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Server error

---

## Rate Limiting

The API implements rate limiting to prevent abuse:

### Rate Limits by Endpoint

- **Authentication endpoints**: 5 requests per 15 minutes per IP
- **General API endpoints**: 100 requests per 15 minutes per IP
- **Sensitive operations (POST/PUT/DELETE)**: 50 requests per hour per IP
- **File uploads**: 20 uploads per hour per IP

### Rate Limit Headers

Rate limit information is included in response headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642694400
```

### Rate Limit Exceeded Response

```json
{
  "success": false,
  "message": "Too many requests from this IP, please try again later.",
  "data": {
    "retryAfter": 900
  }
}
```

---

## Security Features

### Authentication
- JWT-based authentication
- Token expiration: 7 days
- Password hashing with bcrypt (10 rounds)

### Input Validation
- All inputs validated using Joi schemas
- XSS protection with HTML entity encoding
- SQL injection prevention with parameterized queries

### CORS Protection
- Whitelist-based origin validation
- Credentials support for authenticated requests

### Security Headers
- Helmet.js for security headers
- Content Security Policy
- XSS Protection
- Frame Protection

---

## SDK Examples

### JavaScript/Node.js

```javascript
const axios = require('axios');

class HMSAPI {
  constructor(baseURL = 'http://localhost:5000/api/v1') {
    this.baseURL = baseURL;
    this.token = null;
  }

  async login(email, password) {
    try {
      const response = await axios.post(`${this.baseURL}/auth/login`, {
        email,
        password
      });
      
      if (response.data.success) {
        this.token = response.data.data.token;
        return response.data;
      }
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  }

  async getPatients(page = 1, limit = 10) {
    try {
      const response = await axios.get(`${this.baseURL}/patients`, {
        headers: { Authorization: `Bearer ${this.token}` },
        params: { page, limit }
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch patients');
    }
  }
}

// Usage
const api = new HMSAPI();
await api.login('admin@medicare.com', 'Admin@123');
const patients = await api.getPatients();
```

### Python

```python
import requests

class HMSAPI:
    def __init__(self, base_url='http://localhost:5000/api/v1'):
        self.base_url = base_url
        self.token = None

    def login(self, email, password):
        response = requests.post(f'{self.base_url}/auth/login', json={
            'email': email,
            'password': password
        })
        
        if response.json().get('success'):
            self.token = response.json()['data']['token']
            return response.json()
        else:
            raise Exception(response.json().get('message', 'Login failed'))

    def get_patients(self, page=1, limit=10):
        headers = {'Authorization': f'Bearer {self.token}'}
        params = {'page': page, 'limit': limit}
        
        response = requests.get(f'{self.base_url}/patients', 
                               headers=headers, params=params)
        return response.json()

# Usage
api = HMSAPI()
api.login('admin@medicare.com', 'Admin@123')
patients = api.get_patients()
```

---

*Last Updated: January 16, 2024*
