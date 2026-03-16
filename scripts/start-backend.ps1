$Host.UI.RawUI.WindowTitle = "AttendX Backend - Port 8080"

# Ensure we run from the repo's backend folder regardless of where the repo is located on disk
Set-Location "$PSScriptRoot\..\backend"

# Environment Variables
$env:JWT_SECRET = "oo7fBm3airbvtz0WxhopUTnhu7nr4ZhYqbq4HkMLaBhLCuXuQg6f3WPwfVOEjm9liWAeAv6dejDzUijYR8Q2EA=="
$env:DB_URL = "jdbc:mysql://localhost:3306/attendance_db"
$env:DB_USER = "root"
$env:DB_PASS = "29aug2005"  # Empty password - update if your MySQL has a password

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  AttendX Backend Server" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Database: attendance_db@localhost:3306" -ForegroundColor Yellow
Write-Host "API URL: http://localhost:8080/api" -ForegroundColor Green
Write-Host "Starting..." -ForegroundColor Yellow
Write-Host ""
.\mvnw.cmd spring-boot:run
