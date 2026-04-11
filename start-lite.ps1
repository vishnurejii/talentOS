# TalentOS Memory-Lite Startup Script

Write-Host "--- Initializing TalentOS Memory-Lite (Native Windows) ---" -ForegroundColor Cyan

# 1. Setup Backend
Write-Host "[1/3] Setting up Backend..." -ForegroundColor Yellow
cd backend
if (-not (Test-Path "venv")) {
    python -m venv venv
}
.\venv\Scripts\python -m pip install -r requirements.txt
cd ..

# 2. Setup Real-time
Write-Host "[2/3] Checking Real-time server..." -ForegroundColor Yellow
cd realtime
if (-not (Test-Path "node_modules")) {
    npm install
}
cd ..

# 3. Setup Frontend
Write-Host "[3/3] Checking Frontend..." -ForegroundColor Yellow
cd frontend
if (-not (Test-Path "node_modules")) {
    npm install
}
cd ..

Write-Host "`n--- Starting Services ---" -ForegroundColor Cyan
Write-Host "Services will open in separate windows."

# Launch Redis & Mongo check? (Assume already running as services)

# Launch Backend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; .\venv\Scripts\python manage.py runserver" -WindowStyle Normal

# Launch Real-time (Node)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd realtime; node server.js" -WindowStyle Normal

# Launch Frontend (React/Vite)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev" -WindowStyle Normal

Write-Host "`nTalentOS is launching! Reverted to Monolith + Public APIs for minimum memory usage." -ForegroundColor Green
