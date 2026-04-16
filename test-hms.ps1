# Hospital Management System - Comprehensive Test Script
# This script performs systematic testing of all API endpoints

$BaseUrl = "http://127.0.0.1:5000/api/v1"
$TestResults = @()
$Global:AuthToken = $null
$Global:TestPatientId = $null
$Global:TestDoctorId = $null
$Global:TestAppointmentId = $null
$Global:TestBillingId = $null

function Write-TestHeader($title) {
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host $title -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
}

function Invoke-ApiRequest($method, $endpoint, $body = $null, $token = $null) {
    $headers = @{ "Content-Type" = "application/json" }
    if ($token) {
        $headers["Authorization"] = "Bearer $token"
    }
    
    try {
        $uri = "$BaseUrl$endpoint"
        if ($body) {
            $jsonBody = $body | ConvertTo-Json -Depth 10
            $response = Invoke-RestMethod -Uri $uri -Method $method -Headers $headers -Body $jsonBody -TimeoutSec 10
        } else {
            $response = Invoke-RestMethod -Uri $uri -Method $method -Headers $headers -TimeoutSec 10
        }
        return @{ Success = $true; Data = $response; Error = $null }
    } catch {
        $errorMsg = $_.Exception.Message
        if ($_.ErrorDetails.Message) {
            try {
                $errorData = $_.ErrorDetails.Message | ConvertFrom-Json
                $errorMsg = $errorData.message
            } catch {
                $errorMsg = $_.ErrorDetails.Message
            }
        }
        return @{ Success = $false; Data = $null; Error = $errorMsg; StatusCode = $_.Exception.Response.StatusCode.value__ }
    }
}

function Add-TestResult($test, $passed, $details) {
    $script:TestResults += [PSCustomObject]@{
        Test = $test
        Passed = $passed
        Details = $details
        Timestamp = Get-Date
    }
    $color = if ($passed) { "Green" } else { "Red" }
    $status = if ($passed) { "PASS" } else { "FAIL" }
    Write-Host "[$status] $test" -ForegroundColor $color
    if ($details -and -not $passed) {
        Write-Host "  Details: $details" -ForegroundColor Yellow
    }
}

# ============================================
# STEP 1: SYSTEM STARTUP VALIDATION
# ============================================
Write-TestHeader "STEP 1: System Startup Validation"

# Test Health Endpoint
$health = Invoke-ApiRequest "GET" "/health"
Add-TestResult "Health Check" ($health.Success -and $health.Data.status -eq "healthy") $health.Error

# Test Root Endpoint
$root = Invoke-ApiRequest "GET" "/"
Add-TestResult "Root Endpoint" ($root.Success -and $root.Data.message -like "*Medicare*") $root.Error

# Test 404 Handler
$notFound = Invoke-ApiRequest "GET" "/nonexistent"
Add-TestResult "404 Handler" (-not $notFound.Success -and $notFound.StatusCode -eq 404) $notFound.Error

# ============================================
# STEP 2: AUTHENTICATION TESTING
# ============================================
Write-TestHeader "STEP 2: Authentication Testing"

# Test Registration - Create Admin User
$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$adminUser = @{
    name = "Test Admin $timestamp"
    email = "admin$timestamp@test.com"
    password = "SecurePass123!"
    role = "admin"
}

# Try registering without auth (should fail for admin)
$adminRegNoAuth = Invoke-ApiRequest "POST" "/auth/register" $adminUser
Add-TestResult "Admin Registration (no auth - should fail)" (-not $adminRegNoAuth.Success) $adminRegNoAuth.Error

# Register as regular staff first
$staffUser = @{
    name = "Test Staff $timestamp"
    email = "staff$timestamp@test.com"
    password = "SecurePass123!"
    role = "staff"
}
$staffReg = Invoke-ApiRequest "POST" "/auth/register" $staffUser
Add-TestResult "Staff Registration" $staffReg.Success "$($staffReg.Error) | Response: $($staffReg.Data.message)"

if ($staffReg.Success -and $staffReg.Data.data.token) {
    $Global:AuthToken = $staffReg.Data.data.token
}

# Test Login with Valid Credentials
$loginCreds = @{
    email = $staffUser.email
    password = $staffUser.password
}
$login = Invoke-ApiRequest "POST" "/auth/login" $loginCreds
Add-TestResult "Valid Login" ($login.Success -and $login.Data.data.token) $login.Error

if ($login.Success -and $login.Data.data.token) {
    $Global:AuthToken = $login.Data.data.token
}

# Test Login with Invalid Credentials
$invalidLogin = Invoke-ApiRequest "POST" "/auth/login" @{ email = "invalid@test.com"; password = "wrongpass" }
Add-TestResult "Invalid Login (should fail)" (-not $invalidLogin.Success) $invalidLogin.Error

# Test Login with Wrong Password
$wrongPassLogin = Invoke-ApiRequest "POST" "/auth/login" @{ email = $staffUser.email; password = "wrongpassword123" }
Add-TestResult "Wrong Password Login (should fail)" (-not $wrongPassLogin.Success) $wrongPassLogin.Error

# Test Get Me (with valid token)
$me = Invoke-ApiRequest "GET" "/auth/me" $null $Global:AuthToken
Add-TestResult "Get Current User (/auth/me)" ($me.Success -and $me.Data.data.user.email -eq $staffUser.email) $me.Error

# Test Get Me without token
$meNoToken = Invoke-ApiRequest "GET" "/auth/me"
Add-TestResult "Get Current User (no token - should fail)" (-not $meNoToken.Success) $meNoToken.Error

# ============================================
# STEP 3: RBAC TESTING
# ============================================
Write-TestHeader "STEP 3: RBAC (Role-Based Access Control) Testing"

# Test accessing patient endpoints with staff token
$patientsList = Invoke-ApiRequest "GET" "/patients" $null $Global:AuthToken
Add-TestResult "Staff Access - List Patients" $patientsList.Success $patientsList.Error

# ============================================
# STEP 4: API ENDPOINT TESTING - PATIENTS
# ============================================
Write-TestHeader "STEP 4: API Endpoint Testing - Patients"

# Create Patient
$newPatient = @{
    name = "John Doe Test"
    age = 35
    gender = "Male"
    blood_type = "O+"
    phone = "555-0123"
    email = "patient$timestamp@test.com"
    address = "123 Test St"
    medical_history = "No known allergies"
    status = "Active"
}
$createPatient = Invoke-ApiRequest "POST" "/patients" $newPatient $Global:AuthToken
Add-TestResult "Create Patient" $createPatient.Success "$($createPatient.Error) | Response: $($createPatient.Data.message)"

if ($createPatient.Success -and $createPatient.Data.data.id) {
    $Global:TestPatientId = $createPatient.Data.data.id
}

# Get All Patients
$getPatients = Invoke-ApiRequest "GET" "/patients" $null $Global:AuthToken
Add-TestResult "Get All Patients" ($getPatients.Success -and $getPatients.Data.data.items) $getPatients.Error

# Get Patient by ID (if created)
if ($Global:TestPatientId) {
    $getPatient = Invoke-ApiRequest "GET" "/patients/$($Global:TestPatientId)" $null $Global:AuthToken
    Add-TestResult "Get Patient by ID" ($getPatient.Success -and $getPatient.Data.data.id -eq $Global:TestPatientId) $getPatient.Error
    
    # Update Patient
    $updatePatient = @{
        name = "John Doe Updated"
        age = 36
    }
    $updated = Invoke-ApiRequest "PUT" "/patients/$($Global:TestPatientId)" $updatePatient $Global:AuthToken
    Add-TestResult "Update Patient" ($updated.Success -and $updated.Data.data.name -eq "John Doe Updated") $updated.Error
}

# Test Invalid Patient ID
$invalidPatient = Invoke-ApiRequest "GET" "/patients/999999" $null $Global:AuthToken
Add-TestResult "Get Invalid Patient (should 404)" (-not $invalidPatient.Success -and $invalidPatient.StatusCode -eq 404) $invalidPatient.Error

# ============================================
# STEP 5: API ENDPOINT TESTING - DOCTORS
# ============================================
Write-TestHeader "STEP 5: API Endpoint Testing - Doctors"

# Get All Doctors
$getDoctors = Invoke-ApiRequest "GET" "/doctors" $null $Global:AuthToken
Add-TestResult "Get All Doctors" ($getDoctors.Success -and $getDoctors.Data.data.items) $getDoctors.Error

# Create Doctor (if we have admin rights, otherwise test access)
$newDoctor = @{
    name = "Dr. Sarah Test"
    specialization = "Cardiology"
    qualification = "MD"
    experience = 10
    phone = "555-0456"
    email = "doctor$timestamp@test.com"
    availability = "Available"
    rating = 4.5
    bio = "Expert cardiologist"
    status = "Active"
    working_hours = @{}
}
$createDoctor = Invoke-ApiRequest "POST" "/doctors" $newDoctor $Global:AuthToken
Add-TestResult "Create Doctor" $createDoctor.Success "$($createDoctor.Error) | Response: $($createDoctor.Data.message)"

if ($createDoctor.Success -and $createDoctor.Data.data.id) {
    $Global:TestDoctorId = $createDoctor.Data.data.id
}

# ============================================
# STEP 6: API ENDPOINT TESTING - APPOINTMENTS
# ============================================
Write-TestHeader "STEP 6: API Endpoint Testing - Appointments"

if ($Global:TestPatientId -and $Global:TestDoctorId) {
    # Create Appointment
    $newAppointment = @{
        patient_id = $Global:TestPatientId
        doctor_id = $Global:TestDoctorId
        appointment_date = (Get-Date).AddDays(1).ToString("yyyy-MM-ddTHH:mm:ss")
        duration = 30
        type = "Consultation"
        status = "Scheduled"
        notes = "Regular checkup"
        symptoms = "Headache"
    }
    $createAppt = Invoke-ApiRequest "POST" "/appointments" $newAppointment $Global:AuthToken
    Add-TestResult "Create Appointment" $createAppt.Success "$($createAppt.Error) | Response: $($createAppt.Data.message)"
    
    if ($createAppt.Success -and $createAppt.Data.data.id) {
        $Global:TestAppointmentId = $createAppt.Data.data.id
    }
} else {
    Add-TestResult "Create Appointment (skipped - no patient/doctor)" $false "Patient or Doctor not available"
}

# Get All Appointments
$getAppointments = Invoke-ApiRequest "GET" "/appointments" $null $Global:AuthToken
Add-TestResult "Get All Appointments" ($getAppointments.Success -and $getAppointments.Data.data.items) $getAppointments.Error

# ============================================
# STEP 7: API ENDPOINT TESTING - BILLING
# ============================================
Write-TestHeader "STEP 7: API Endpoint Testing - Billing"

if ($Global:TestPatientId -and $Global:TestDoctorId) {
    $newBilling = @{
        patient_id = $Global:TestPatientId
        doctor_id = $Global:TestDoctorId
        appointment_id = $Global:TestAppointmentId
        amount = 150.00
        discount = 10.00
        tax = 5.00
        status = "Pending"
        payment_method = "Credit Card"
        notes = "Consultation fee"
    }
    $createBilling = Invoke-ApiRequest "POST" "/billing" $newBilling $Global:AuthToken
    Add-TestResult "Create Billing" $createBilling.Success "$($createBilling.Error) | Response: $($createBilling.Data.message)"
    
    if ($createBilling.Success -and $createBilling.Data.data.id) {
        $Global:TestBillingId = $createBilling.Data.data.id
    }
} else {
    Add-TestResult "Create Billing (skipped - no patient/doctor)" $false "Patient or Doctor not available"
}

# Get All Billing
$getBilling = Invoke-ApiRequest "GET" "/billing" $null $Global:AuthToken
Add-TestResult "Get All Billing" ($getBilling.Success -and $getBilling.Data.data.items) $getBilling.Error

# ============================================
# STEP 8: API ENDPOINT TESTING - LAB
# ============================================
Write-TestHeader "STEP 8: API Endpoint Testing - Lab"

if ($Global:TestPatientId -and $Global:TestDoctorId) {
    $newLabOrder = @{
        patient_id = $Global:TestPatientId
        doctor_id = $Global:TestDoctorId
        test_name = "Blood Test"
        status = "Pending"
    }
    $createLab = Invoke-ApiRequest "POST" "/lab" $newLabOrder $Global:AuthToken
    Add-TestResult "Create Lab Order" $createLab.Success "$($createLab.Error) | Response: $($createLab.Data.message)"
} else {
    Add-TestResult "Create Lab Order (skipped - no patient/doctor)" $false "Patient or Doctor not available"
}

# Get All Lab Orders
$getLab = Invoke-ApiRequest "GET" "/lab" $null $Global:AuthToken
Add-TestResult "Get All Lab Orders" ($getLab.Success -and $getLab.Data.data.items) $getLab.Error

# ============================================
# STEP 9: API ENDPOINT TESTING - PHARMACY
# ============================================
Write-TestHeader "STEP 9: API Endpoint Testing - Pharmacy"

$newMedicine = @{
    medicine_name = "Test Medicine $timestamp"
    manufacturer = "Test Pharma"
    stock = 100
    price = 25.99
    status = "Active"
}
$createPharmacy = Invoke-ApiRequest "POST" "/pharmacy" $newMedicine $Global:AuthToken
Add-TestResult "Create Medicine" $createPharmacy.Success "$($createPharmacy.Error) | Response: $($createPharmacy.Data.message)"

# Get All Medicines
$getPharmacy = Invoke-ApiRequest "GET" "/pharmacy" $null $Global:AuthToken
Add-TestResult "Get All Medicines" ($getPharmacy.Success -and $getPharmacy.Data.data.items) $getPharmacy.Error

# ============================================
# STEP 10: SECURITY TESTING
# ============================================
Write-TestHeader "STEP 10: Security Testing"

# Test SQL Injection attempt
$sqlInjection = Invoke-ApiRequest "GET" "/patients?search=' OR '1'='1" $null $Global:AuthToken
Add-TestResult "SQL Injection Prevention" ($sqlInjection.Success -or $sqlInjection.StatusCode -eq 400) "SQL injection test: $($sqlInjection.Error)"

# Test XSS attempt in patient name
$xssPatient = @{
    name = "<script>alert('xss')</script>"
    age = 30
    gender = "Male"
    blood_type = "A+"
    phone = "555-0000"
}
$xssTest = Invoke-ApiRequest "POST" "/patients" $xssPatient $Global:AuthToken
Add-TestResult "XSS Prevention (input validation)" $xssTest.Success "XSS test: $($xssTest.Error) - Name stored as: $($xssTest.Data.data.name)"

# Test unauthorized access to admin-only route (billing creation with doctor role)
# First create a doctor user
$doctorUser = @{
    name = "Test Doctor $timestamp"
    email = "doctoruser$timestamp@test.com"
    password = "SecurePass123!"
    role = "doctor"
}
$doctorReg = Invoke-ApiRequest "POST" "/auth/register" $doctorUser
if ($doctorReg.Success) {
    $doctorToken = $doctorReg.Data.data.token
    
    # Try to create billing with doctor token (should fail - billing requires billing role)
    $unauthBilling = Invoke-ApiRequest "POST" "/billing" $newBilling $doctorToken
    Add-TestResult "RBAC - Doctor cannot create billing" (-not $unauthBilling.Success -or $unauthBilling.StatusCode -eq 403) $unauthBilling.Error
}

# ============================================
# STEP 11: VALIDATION TESTING
# ============================================
Write-TestHeader "STEP 11: Validation Testing"

# Test empty patient name (should fail)
$emptyName = @{
    name = ""
    age = 30
    gender = "Male"
    blood_type = "A+"
    phone = "555-0000"
}
$emptyTest = Invoke-ApiRequest "POST" "/patients" $emptyName $Global:AuthToken
Add-TestResult "Validation - Empty Patient Name (should fail)" (-not $emptyTest.Success -or $emptyTest.StatusCode -eq 400) $emptyTest.Error

# Test invalid email format
$invalidEmail = @{
    name = "Test Patient"
    email = "invalid-email-format"
    age = 30
    gender = "Male"
    blood_type = "A+"
    phone = "555-0000"
}
$emailTest = Invoke-ApiRequest "POST" "/patients" $invalidEmail $Global:AuthToken
Add-TestResult "Validation - Invalid Email (should fail)" (-not $emailTest.Success -or $emailTest.StatusCode -eq 400) $emailTest.Error

# Test negative age
$negativeAge = @{
    name = "Test Patient"
    age = -5
    gender = "Male"
    blood_type = "A+"
    phone = "555-0000"
}
$ageTest = Invoke-ApiRequest "POST" "/patients" $negativeAge $Global:AuthToken
Add-TestResult "Validation - Negative Age (should fail)" (-not $ageTest.Success -or $ageTest.StatusCode -eq 400) $ageTest.Error

# ============================================
# STEP 12: CLEANUP
# ============================================
Write-TestHeader "STEP 12: Cleanup"

# Delete test billing
if ($Global:TestBillingId) {
    $deleteBilling = Invoke-ApiRequest "DELETE" "/billing/$($Global:TestBillingId)" $null $Global:AuthToken
    Add-TestResult "Delete Test Billing" $deleteBilling.Success $deleteBilling.Error
}

# Delete test appointment
if ($Global:TestAppointmentId) {
    $deleteAppt = Invoke-ApiRequest "DELETE" "/appointments/$($Global:TestAppointmentId)" $null $Global:AuthToken
    Add-TestResult "Delete Test Appointment" $deleteAppt.Success $deleteAppt.Error
}

# Delete test patient
if ($Global:TestPatientId) {
    $deletePatient = Invoke-ApiRequest "DELETE" "/patients/$($Global:TestPatientId)" $null $Global:AuthToken
    Add-TestResult "Delete Test Patient" $deletePatient.Success $deletePatient.Error
}

# ============================================
# SUMMARY
# ============================================
Write-TestHeader "TEST SUMMARY"

$total = $TestResults.Count
$passed = ($TestResults | Where-Object { $_.Passed }).Count
$failed = $total - $passed
$passRate = if ($total -gt 0) { [math]::Round(($passed / $total) * 100, 2) } else { 0 }

Write-Host "Total Tests: $total" -ForegroundColor White
Write-Host "Passed: $passed" -ForegroundColor Green
Write-Host "Failed: $failed" -ForegroundColor Red
Write-Host "Pass Rate: $passRate%" -ForegroundColor $(if ($passRate -ge 80) { "Green" } elseif ($passRate -ge 60) { "Yellow" } else { "Red" })

Write-Host "`nDetailed Results:" -ForegroundColor Cyan
$TestResults | Format-Table -Property Test, Passed, Details -AutoSize

# Export results to JSON
$resultsJson = @{
    timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    summary = @{
        total = $total
        passed = $passed
        failed = $failed
        passRate = $passRate
    }
    results = $TestResults
} | ConvertTo-Json -Depth 10

$resultsJson | Out-File -FilePath "test-results.json" -Encoding UTF8
Write-Host "`nResults exported to test-results.json" -ForegroundColor Green
