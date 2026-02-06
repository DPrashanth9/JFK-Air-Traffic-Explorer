# PowerShell script to start the FastAPI server

Write-Host "Starting JFK Air Traffic Explorer API Server..." -ForegroundColor Green
Write-Host ""

# Navigate to backend directory
$backendPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $backendPath

# Activate virtual environment
Write-Host "Activating virtual environment..." -ForegroundColor Yellow
& ".\venv\Scripts\Activate.ps1"

# Check if Neo4j is accessible
Write-Host "Checking Neo4j connection..." -ForegroundColor Yellow
python -c "from app.database.connection import db; db.connect(); db.close()" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "[WARNING] Neo4j connection check failed. Server will still start." -ForegroundColor Yellow
    Write-Host "Make sure Neo4j Desktop is running and your instance is started." -ForegroundColor Yellow
    Write-Host ""
}

# Start the server
Write-Host "Starting FastAPI server on http://localhost:8000" -ForegroundColor Green
Write-Host "Press CTRL+C to stop the server" -ForegroundColor Cyan
Write-Host ""
Write-Host "API Documentation: http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host ""

uvicorn app.main:app --reload --port 8000
