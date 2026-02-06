# Script to start both frontend and backend servers

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting JFK Air Traffic Explorer" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get the project root directory
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

# Start Backend Server
Write-Host "[1/2] Starting Backend API Server..." -ForegroundColor Yellow
$backendPath = Join-Path $projectRoot "backend"
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$backendPath'; " +
    ".\venv\Scripts\Activate.ps1; " +
    "Write-Host 'Backend API Server' -ForegroundColor Green; " +
    "Write-Host 'URL: http://localhost:8000' -ForegroundColor Cyan; " +
    "Write-Host 'API Docs: http://localhost:8000/docs' -ForegroundColor Cyan; " +
    "Write-Host ''; " +
    "uvicorn app.main:app --reload --port 8000"
)

Start-Sleep -Seconds 3

# Start Frontend Server
Write-Host "[2/2] Starting Frontend React App..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$projectRoot'; " +
    "Write-Host 'Frontend React App' -ForegroundColor Green; " +
    "Write-Host 'URL: http://localhost:5173' -ForegroundColor Cyan; " +
    "Write-Host ''; " +
    "npm run dev"
)

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Both servers are starting!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Backend API:  http://localhost:8000" -ForegroundColor Cyan
Write-Host "Frontend App: http://localhost:5173" -ForegroundColor Cyan
Write-Host "API Docs:     http://localhost:8000/docs" -ForegroundColor Magenta
Write-Host ""
Write-Host "Wait 10-15 seconds for both to start, then:" -ForegroundColor Yellow
Write-Host "1. Open http://localhost:5173 in your browser" -ForegroundColor White
Write-Host "2. Check the browser console (F12) for any errors" -ForegroundColor White
Write-Host ""
