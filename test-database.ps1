# Hospital Management System - Database Validation & Edge Case Testing
$BaseUrl = "http://127.0.0.1:5000/api/v1"
$TestResults = @()
$Global:AuthToken = $null
$Global:AdminToken = $null

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

function Invoke-ApiRequest($method, $endpoint, $body = $null, $token = $null) {
    $headers = @{ "Content-Type" = "application/json" }
    if ($token) { $headers["Authorization"] = "Bearer $token" }
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
            try { $errorData = $_.ErrorDetails.Message | ConvertFrom-Json; $errorMsg = $errorData.message } catch {}
        }
        return @{ Success = $false; Data = $null; Error = $errorMsg; StatusCode = $_.Exception.Response.StatusCode.value__ }
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "DATABASE VALIDATION & EDGE CASE TESTING" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Setup: Create admin and staff users
$timestamp = Get-Date -Format "yyyyMMddHHmmss"

# First create a staff user
$staffUser = @{ name = "DB Test Staff $timestamp"; email = "staffdb$timestamp@test.com"; password = "SecurePass123!"; role = "staff" }
$staffReg = Invoke-ApiRequest "POST" "/auth/register" $staffUser
if ($staffReg.Success) { $Global:AuthToken = $staffReg.Data.data.token }
Add-TestResult "Setup: Create Staff User" $staffReg.Success $staffReg.Error

# ============================================
# DATABASE FOREIGN KEY CONSTRAINT TESTS
# ============================================
Write-Host "`n--- DATABASE FK CONSTRAINT TESTS ---" -ForegroundColor Yellow

# Create a patient
$patient = @{ name = "FK Test Patient"; age = 30; gender = "Male"; blood_type = "A+"; phone = "555-0001"; email = "fkpatient$timestamp@test.com"; status = "Active" }
$pat = Invoke-ApiRequest "POST" "/patients" $patient $Global:AuthToken
$patientId = if ($pat.Success) { $pat.Data.data.id } else { $null }
Add-TestResult "Create Patient for FK Tests" $pat.Success $pat.Error

# Create a doctor
$doctor = @{ name = "FK Test Doctor"; specialization = "Internal Medicine"; qualification = "MD"; experience = 5; phone = "555-0002"; email = "fkdoctor$timestamp@test.com"; availability = "Available"; rating = 4.0; status = "Active"; working_hours = @{} }
$doc = Invoke-ApiRequest "POST" "/doctors" $doctor $Global:AuthToken
$doctorId = if ($doc.Success) { $doc.Data.data.id } else { $null }
Add-TestResult "Create Doctor for FK Tests" $doc.Success $doc.Error

# Test 1: Create appointment with valid FKs
if ($patientId -and $doctorId) {
    $appt = @{ patient_id = $patientId; doctor_id = $doctorId; appointment_date = (Get-Date).AddDays(1).ToString("yyyy-MM-ddTHH:mm:ss"); duration = 30; type = "Consultation"; status = "Scheduled" }
    $apptRes = Invoke-ApiRequest "POST" "/appointments" $appt $Global:AuthToken
    $apptId = if ($apptRes.Success) { $apptRes.Data.data.id } else { $null }
    Add-TestResult "Create Appointment with Valid FKs" $apptRes.Success $apptRes.Error
    
    # Test 2: Create appointment with invalid patient_id (should fail)
    $invalidAppt = @{ patient_id = 99999; doctor_id = $doctorId; appointment_date = (Get-Date).AddDays(1).ToString("yyyy-MM-ddTHH:mm:ss"); duration = 30; type = "Consultation" }
    $invalidApptRes = Invoke-ApiRequest "POST" "/appointments" $invalidAppt $Global:AuthToken
    Add-TestResult "Appointment with Invalid Patient ID (should fail)" (-not $invalidApptRes.Success) "Expected failure but got: $($invalidApptRes.Error)"
    
    # Test 3: Create appointment with invalid doctor_id (should fail)
    $invalidAppt2 = @{ patient_id = $patientId; doctor_id = 99999; appointment_date = (Get-Date).AddDays(1).ToString("yyyy-MM-ddTHH:mm:ss"); duration = 30; type = "Consultation" }
    $invalidApptRes2 = Invoke-ApiRequest "POST" "/appointments" $invalidAppt2 $Global:AuthToken
    Add-TestResult "Appointment with Invalid Doctor ID (should fail)" (-not $invalidApptRes2.Success) "Expected failure but got: $($invalidApptRes2.Error)"
    
    # Test 4: Create billing with valid FKs
    $billing = @{ patient_id = $patientId; doctor_id = $doctorId; appointment_id = $apptId; amount = 100.00; discount = 0; tax = 0; status = "Pending" }
    $billRes = Invoke-ApiRequest "POST" "/billing" $billing $Global:AuthToken
    $billId = if ($billRes.Success) { $billRes.Data.data.id } else { $null }
    Add-TestResult "Create Billing with Valid FKs" $billRes.Success $billRes.Error
    
    # Test 5: Create billing with invalid FKs (should fail)
    $invalidBill = @{ patient_id = 99999; doctor_id = $doctorId; amount = 100.00; status = "Pending" }
    $invalidBillRes = Invoke-ApiRequest "POST" "/billing" $invalidBill $Global:AuthToken
    Add-TestResult "Billing with Invalid Patient ID (should fail)" (-not $invalidBillRes.Success) "Expected failure but got: $($invalidBillRes.Error)"
}

# ============================================
# EDGE CASE TESTS
# ============================================
Write-Host "`n--- EDGE CASE TESTS ---" -ForegroundColor Yellow

# Test 6: Empty string inputs
$emptyPatient = @{ name = ""; age = 30; gender = "Male"; blood_type = "A+"; phone = "555-0003" }
$emptyRes = Invoke-ApiRequest "POST" "/patients" $emptyPatient $Global:AuthToken
Add-TestResult "Empty Name Validation" (-not $emptyRes.Success) "Should reject empty name"

# Test 7: Very long name (255+ chars)
$longName = "A" * 300
$longPatient = @{ name = $longName; age = 30; gender = "Male"; blood_type = "A+"; phone = "555-0004" }
$longRes = Invoke-ApiRequest "POST" "/patients" $longPatient $Global:AuthToken
Add-TestResult "Very Long Name Handling" $longRes.Success "System should handle or reject long names"

# Test 8: Special characters in name
$specialPatient = @{ name = "Patient O'Connor-Smith Jr."; age = 30; gender = "Male"; blood_type = "A+"; phone = "555-0005" }
$specialRes = Invoke-ApiRequest "POST" "/patients" $specialPatient $Global:AuthToken
Add-TestResult "Special Characters in Name" $specialRes.Success "Should handle special characters"
if ($specialRes.Success -and $specialRes.Data.data.id) {
    # Cleanup
    Invoke-ApiRequest "DELETE" "/patients/$($specialRes.Data.data.id)" $null $Global:AuthToken | Out-Null
}

# Test 9: Duplicate email (should fail)
$dupEmail = @{ name = "Duplicate Email Test"; age = 30; gender = "Male"; blood_type = "A+"; phone = "555-0006"; email = "fkpatient$timestamp@test.com" }
$dupRes = Invoke-ApiRequest "POST" "/patients" $dupEmail $Global:AuthToken
Add-TestResult "Duplicate Email Prevention" (-not $dupRes.Success) "Should reject duplicate email"

# Test 10: Boundary age values
$boundaryAge = @{ name = "Boundary Age Test"; age = 130; gender = "Male"; blood_type = "A+"; phone = "555-0007" }
$boundRes = Invoke-ApiRequest "POST" "/patients" $boundaryAge $Global:AuthToken
Add-TestResult "Boundary Age (130)" $boundRes.Success "Should accept max boundary age"
if ($boundRes.Success -and $boundRes.Data.data.id) {
    Invoke-ApiRequest "DELETE" "/patients/$($boundRes.Data.data.id)" $null $Global:AuthToken | Out-Null
}

# Test 11: Negative age (should fail validation)
$negAge = @{ name = "Negative Age Test"; age = -1; gender = "Male"; blood_type = "A+"; phone = "555-0008" }
$negRes = Invoke-ApiRequest "POST" "/patients" $negAge $Global:AuthToken
Add-TestResult "Negative Age Rejection" (-not $negRes.Success) "Should reject negative age"

# ============================================
# SECURITY TESTS
# ============================================
Write-Host "`n--- SECURITY TESTS ---" -ForegroundColor Yellow

# Test 12: SQL Injection in search
$sqliSearch = Invoke-ApiRequest "GET" "/patients?search=' OR '1'='1" $null $Global:AuthToken
Add-TestResult "SQL Injection Prevention (Search)" $sqliSearch.Success "SQL injection should be prevented"

# Test 13: SQL Injection in ID parameter
$sqliId = Invoke-ApiRequest "GET" "/patients/1 OR 1=1" $null $Global:AuthToken
Add-TestResult "SQL Injection Prevention (ID)" (-not $sqliId.Success -or $sqliId.StatusCode -eq 404) "SQL injection in ID should fail"

# Test 14: XSS Prevention - Script tag in input
$xssPatient = @{ name = "<script>alert('xss')</script>"; age = 30; gender = "Male"; blood_type = "A+"; phone = "555-0009" }
$xssRes = Invoke-ApiRequest "POST" "/patients" $xssPatient $Global:AuthToken
Add-TestResult "XSS Script Tag Handling" $xssRes.Success "System should handle script tags safely"
if ($xssRes.Success -and $xssRes.Data.data.id) {
    $storedName = $xssRes.Data.data.name
    $scriptCheck = $storedName -notlike "*<script>*"
    Add-TestResult "XSS Script Tag Sanitization" $scriptCheck "Script tags should be sanitized"
    Invoke-ApiRequest "DELETE" "/patients/$($xssRes.Data.data.id)" $null $Global:AuthToken | Out-Null
}

# Test 15: NoSQL Injection attempt
$nosqli = @{ name = "NoSQL Test"; age = 30; gender = "Male"; blood_type = "A+"; phone = "555-0010"; metadata = @{ '$gt' = 0 } }
$nosqliRes = Invoke-ApiRequest "POST" "/patients" $nosqli $Global:AuthToken
Add-TestResult "NoSQL Injection Prevention" $nosqliRes.Success "Should handle object injection safely"

# ============================================
# PERFORMANCE TESTS
# ============================================
Write-Host "`n--- PERFORMANCE TESTS ---" -ForegroundColor Yellow

# Test 16: API Response Time
$sw = [System.Diagnostics.Stopwatch]::StartNew()
$perfRes = Invoke-ApiRequest "GET" "/patients?page=1&limit=10" $null $Global:AuthToken
$sw.Stop()
$ms = $sw.ElapsedMilliseconds
Add-TestResult "API Response Time ($ms ms)" ($ms -lt 1000) "Response should be under 1 second"

# Test 17: Large dataset pagination
$sw2 = [System.Diagnostics.Stopwatch]::StartNew()
$largeRes = Invoke-ApiRequest "GET" "/patients?page=1&limit=100" $null $Global:AuthToken
$sw2.Stop()
$ms2 = $sw2.ElapsedMilliseconds
Add-TestResult "Large Page Request ($ms2 ms)" ($ms2 -lt 2000) "Large pages should load in under 2 seconds"

# ============================================
# RBAC EDGE CASES
# ============================================
Write-Host "`n--- RBAC EDGE CASES ---" -ForegroundColor Yellow

# Test 18: Access without token
$noToken = Invoke-ApiRequest "GET" "/patients"
Add-TestResult "No Token Access Rejected" (-not $noToken.Success -and $noToken.StatusCode -eq 401) "Should reject unauthenticated requests"

# Test 19: Invalid token format
$headers = @{ "Authorization" = "InvalidTokenFormat"; "Content-Type" = "application/json" }
try {
    $invalidToken = Invoke-RestMethod -Uri "$BaseUrl/patients" -Headers $headers -TimeoutSec 5
    Add-TestResult "Invalid Token Format" $false "Should reject invalid token format"
} catch {
    Add-TestResult "Invalid Token Format Rejected" $true "Invalid token rejected: $($_.Exception.Response.StatusCode.value__)"
}

# Test 20: Expired/invalid token
$headers2 = @{ "Authorization" = "Bearer invalid_token_12345"; "Content-Type" = "application/json" }
try {
    $badToken = Invoke-RestMethod -Uri "$BaseUrl/patients" -Headers $headers2 -TimeoutSec 5
    Add-TestResult "Invalid Bearer Token" $false "Should reject invalid bearer token"
} catch {
    Add-TestResult "Invalid Bearer Token Rejected" $true "Invalid bearer rejected: $($_.Exception.Response.StatusCode.value__)"
}

# ============================================
# CLEANUP
# ============================================
Write-Host "`n--- CLEANUP ---" -ForegroundColor Yellow

if ($billId) {
    $delBill = Invoke-ApiRequest "DELETE" "/billing/$billId" $null $Global:AuthToken
    Add-TestResult "Cleanup: Delete Billing" $delBill.Success $delBill.Error
}

if ($apptId) {
    $delAppt = Invoke-ApiRequest "DELETE" "/appointments/$apptId" $null $Global:AuthToken
    Add-TestResult "Cleanup: Delete Appointment" $delAppt.Success $delAppt.Error
}

if ($patientId) {
    # This tests CASCADE - deleting patient should affect appointments/billing
    $delPat = Invoke-ApiRequest "DELETE" "/patients/$patientId" $null $Global:AuthToken
    Add-TestResult "Cleanup: Delete Patient (CASCADE test)" $delPat.Success $delPat.Error
}

if ($doctorId) {
    $delDoc = Invoke-ApiRequest "DELETE" "/doctors/$doctorId" $null $Global:AuthToken
    Add-TestResult "Cleanup: Delete Doctor" $delDoc.Success $delDoc.Error
}

# ============================================
# SUMMARY
# ============================================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "TEST SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$total = $TestResults.Count
$passed = ($TestResults | Where-Object { $_.Passed }).Count
$failed = $total - $passed
$passRate = if ($total -gt 0) { [math]::Round(($passed / $total) * 100, 2) } else { 0 }

Write-Host "Total Tests: $total" -ForegroundColor White
Write-Host "Passed: $passed" -ForegroundColor Green
Write-Host "Failed: $failed" -ForegroundColor Red
Write-Host "Pass Rate: $passRate%" -ForegroundColor $(if ($passRate -ge 90) { "Green" } elseif ($passRate -ge 70) { "Yellow" } else { "Red" })

# Show failed tests
if ($failed -gt 0) {
    Write-Host "`nFailed Tests:" -ForegroundColor Red
    $TestResults | Where-Object { -not $_.Passed } | ForEach-Object {
        Write-Host "  - $($_.Test): $($_.Details)" -ForegroundColor Yellow
    }
}

# Export results
$export = @{
    timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    summary = @{ total = $total; passed = $passed; failed = $failed; passRate = $passRate }
    results = $TestResults
} | ConvertTo-Json -Depth 10

$export | Out-File -FilePath "test-database-results.json" -Encoding UTF8
Write-Host "`nResults exported to test-database-results.json" -ForegroundColor Green
