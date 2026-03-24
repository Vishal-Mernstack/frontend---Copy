# Route To Database Map

This document shows which frontend route and backend router file connect to which PostgreSQL table in pgAdmin4.

Database name:
- `medicare_hms`

Main PostgreSQL tables in pgAdmin4:
- `users`
- `patients`
- `doctors`
- `appointments`
- `billing`

Important note:
- `notifications` is **not** stored in PostgreSQL right now.
- It is using an in-memory array in [notificationController.js](C:\Users\VISHAL\OneDrive\Documents\Downloads\frontend - Copy\hms\backend\controllers\notificationController.js), so you will not see a `notifications` table in pgAdmin4.

## Frontend Route Map

### `/`
- Frontend page: [Dashboard.jsx](C:\Users\VISHAL\OneDrive\Documents\Downloads\frontend - Copy\hms\frontend\src\pages\Dashboard.jsx)
- Sidebar link source: [Sidebar.jsx](C:\Users\VISHAL\OneDrive\Documents\Downloads\frontend - Copy\hms\frontend\src\components\layout\Sidebar.jsx)
- Frontend router: [AppRouter.jsx](C:\Users\VISHAL\OneDrive\Documents\Downloads\frontend - Copy\hms\frontend\src\routes\AppRouter.jsx)
- Uses these hooks:
  - [usePatients.js](C:\Users\VISHAL\OneDrive\Documents\Downloads\frontend - Copy\hms\frontend\src\hooks\usePatients.js)
  - [useDoctors.js](C:\Users\VISHAL\OneDrive\Documents\Downloads\frontend - Copy\hms\frontend\src\hooks\useDoctors.js)
  - [useAppointments.js](C:\Users\VISHAL\OneDrive\Documents\Downloads\frontend - Copy\hms\frontend\src\hooks\useAppointments.js)
  - [useBilling.js](C:\Users\VISHAL\OneDrive\Documents\Downloads\frontend - Copy\hms\frontend\src\hooks\useBilling.js)
- Database tables used:
  - `patients`
  - `doctors`
  - `appointments`
  - `billing`

### `/patients`
- Frontend page: [Patients.jsx](C:\Users\VISHAL\OneDrive\Documents\Downloads\frontend - Copy\hms\frontend\src\pages\Patients.jsx)
- Hook: [usePatients.js](C:\Users\VISHAL\OneDrive\Documents\Downloads\frontend - Copy\hms\frontend\src\hooks\usePatients.js)
- Database table used:
  - `patients`

### `/patients/:id`
- Frontend page: [PatientDetail.jsx](C:\Users\VISHAL\OneDrive\Documents\Downloads\frontend - Copy\hms\frontend\src\pages\PatientDetail.jsx)
- API call:
  - `GET /api/v1/patients/:id`
- Database table used:
  - `patients`

### `/doctors`
- Frontend page: [Doctors.jsx](C:\Users\VISHAL\OneDrive\Documents\Downloads\frontend - Copy\hms\frontend\src\pages\Doctors.jsx)
- Hook: [useDoctors.js](C:\Users\VISHAL\OneDrive\Documents\Downloads\frontend - Copy\hms\frontend\src\hooks\useDoctors.js)
- Database table used:
  - `doctors`

### `/appointments`
- Frontend page: [Appointments.jsx](C:\Users\VISHAL\OneDrive\Documents\Downloads\frontend - Copy\hms\frontend\src\pages\Appointments.jsx)
- Hooks:
  - [useAppointments.js](C:\Users\VISHAL\OneDrive\Documents\Downloads\frontend - Copy\hms\frontend\src\hooks\useAppointments.js)
  - [usePatients.js](C:\Users\VISHAL\OneDrive\Documents\Downloads\frontend - Copy\hms\frontend\src\hooks\usePatients.js)
  - [useDoctors.js](C:\Users\VISHAL\OneDrive\Documents\Downloads\frontend - Copy\hms\frontend\src\hooks\useDoctors.js)
- Database tables used:
  - `appointments`
  - `patients`
  - `doctors`

### `/billing`
- Frontend page: [Billing.jsx](C:\Users\VISHAL\OneDrive\Documents\Downloads\frontend - Copy\hms\frontend\src\pages\Billing.jsx)
- Hooks:
  - [useBilling.js](C:\Users\VISHAL\OneDrive\Documents\Downloads\frontend - Copy\hms\frontend\src\hooks\useBilling.js)
  - [usePatients.js](C:\Users\VISHAL\OneDrive\Documents\Downloads\frontend - Copy\hms\frontend\src\hooks\usePatients.js)
  - [useDoctors.js](C:\Users\VISHAL\OneDrive\Documents\Downloads\frontend - Copy\hms\frontend\src\hooks\useDoctors.js)
  - [useAppointments.js](C:\Users\VISHAL\OneDrive\Documents\Downloads\frontend - Copy\hms\frontend\src\hooks\useAppointments.js)
- Database tables used:
  - `billing`
  - `patients`
  - `doctors`
  - `appointments`

### `/login`
- Frontend page: [Login.jsx](C:\Users\VISHAL\OneDrive\Documents\Downloads\frontend - Copy\hms\frontend\src\pages\Login.jsx)
- Auth context: [AuthContext.jsx](C:\Users\VISHAL\OneDrive\Documents\Downloads\frontend - Copy\hms\frontend\src\context\AuthContext.jsx)
- Backend route used:
  - `POST /api/v1/auth/login`
- Database table used:
  - `users`

### `/register`
- Frontend page: [Register.jsx](C:\Users\VISHAL\OneDrive\Documents\Downloads\frontend - Copy\hms\frontend\src\pages\Register.jsx)
- Auth context: [AuthContext.jsx](C:\Users\VISHAL\OneDrive\Documents\Downloads\frontend - Copy\hms\frontend\src\context\AuthContext.jsx)
- Backend route used:
  - `POST /api/v1/auth/register`
- Database table used:
  - `users`

## Backend API Router Map

### Auth Router
- Router file: [auth.js](C:\Users\VISHAL\OneDrive\Documents\Downloads\frontend - Copy\hms\backend\routes\auth.js)
- Controller file: [authController.js](C:\Users\VISHAL\OneDrive\Documents\Downloads\frontend - Copy\hms\backend\controllers\authController.js)
- API endpoints:
  - `POST /api/v1/auth/register`
  - `POST /api/v1/auth/login`
  - `GET /api/v1/auth/me`
- PostgreSQL table:
  - `users`

### Patients Router
- Router file: [patients.js](C:\Users\VISHAL\OneDrive\Documents\Downloads\frontend - Copy\hms\backend\routes\patients.js)
- Controller file: [patientController.js](C:\Users\VISHAL\OneDrive\Documents\Downloads\frontend - Copy\hms\backend\controllers\patientController.js)
- API endpoints:
  - `GET /api/v1/patients`
  - `GET /api/v1/patients/:id`
  - `POST /api/v1/patients`
  - `PUT /api/v1/patients/:id`
  - `DELETE /api/v1/patients/:id`
- PostgreSQL table:
  - `patients`

### Doctors Router
- Router file: [doctors.js](C:\Users\VISHAL\OneDrive\Documents\Downloads\frontend - Copy\hms\backend\routes\doctors.js)
- Controller file: [doctorController.js](C:\Users\VISHAL\OneDrive\Documents\Downloads\frontend - Copy\hms\backend\controllers\doctorController.js)
- API endpoints:
  - `GET /api/v1/doctors`
  - `GET /api/v1/doctors/:id`
  - `POST /api/v1/doctors`
  - `PUT /api/v1/doctors/:id`
  - `DELETE /api/v1/doctors/:id`
- PostgreSQL table:
  - `doctors`

### Appointments Router
- Router file: [appointments.js](C:\Users\VISHAL\OneDrive\Documents\Downloads\frontend - Copy\hms\backend\routes\appointments.js)
- Controller file: [appointmentController.js](C:\Users\VISHAL\OneDrive\Documents\Downloads\frontend - Copy\hms\backend\controllers\appointmentController.js)
- API endpoints:
  - `GET /api/v1/appointments`
  - `GET /api/v1/appointments/:id`
  - `POST /api/v1/appointments`
  - `PUT /api/v1/appointments/:id`
  - `DELETE /api/v1/appointments/:id`
- PostgreSQL table:
  - `appointments`
- Joined lookup tables also used:
  - `patients`
  - `doctors`

### Billing Router
- Router file: [billing.js](C:\Users\VISHAL\OneDrive\Documents\Downloads\frontend - Copy\hms\backend\routes\billing.js)
- Controller file: [billingController.js](C:\Users\VISHAL\OneDrive\Documents\Downloads\frontend - Copy\hms\backend\controllers\billingController.js)
- API endpoints:
  - `GET /api/v1/billing`
  - `GET /api/v1/billing/:id`
  - `POST /api/v1/billing`
  - `PUT /api/v1/billing/:id`
  - `DELETE /api/v1/billing/:id`
- PostgreSQL table:
  - `billing`
- Joined lookup tables also used:
  - `patients`
  - `doctors`
  - `appointments`

### Notifications Router
- Router file: [notifications.js](C:\Users\VISHAL\OneDrive\Documents\Downloads\frontend - Copy\hms\backend\routes\notifications.js)
- Controller file: [notificationController.js](C:\Users\VISHAL\OneDrive\Documents\Downloads\frontend - Copy\hms\backend\controllers\notificationController.js)
- API endpoints:
  - `GET /api/v1/notifications`
  - `PATCH /api/v1/notifications/:id/read`
- PostgreSQL table:
  - none
- Storage type:
  - in-memory JavaScript array only

## Quick pgAdmin Lookup

If you open `medicare_hms` in pgAdmin4:

- Open table `users`
  - used by login/register/auth me

- Open table `patients`
  - used by Patients page
  - also joined into Appointments and Billing

- Open table `doctors`
  - used by Doctors page
  - also joined into Appointments and Billing

- Open table `appointments`
  - used by Appointments page
  - referenced by Billing

- Open table `billing`
  - used by Billing page

## Simplest Mental Model

- `/login` and `/register` -> `users`
- `/patients` -> `patients`
- `/doctors` -> `doctors`
- `/appointments` -> `appointments` + joins to `patients` and `doctors`
- `/billing` -> `billing` + joins to `patients`, `doctors`, and sometimes `appointments`
- `/notifications` -> not in pgAdmin, only in memory
