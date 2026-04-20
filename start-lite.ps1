# TalentOS MongoDB Atlas Lite - Startup Script

$Host.UI.RawUI.WindowTitle = "TalentOS - Startup"
Clear-Host
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "   🚀 TalentOS: MongoDB Atlas Lite Edition 🚀   " -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "   (Native Windows, No Docker, No Redis)   " -ForegroundColor DarkCyan
Write-Host ""

# 0. Check Environment
if (-not (Test-Path ".env")) {
    Write-Host "[!] .env file not found! Please create it based on .env.example" -ForegroundColor Red
    exit
}

# 1. Setup Backend
Write-Host "[1/3] Preparing Backend (Django)..." -ForegroundColor Yellow
cd backend
if (-not (Test-Path "venv")) {
    Write-Host "Creating virtual environment..." -ForegroundColor Gray
    python -m venv venv
}
.\venv\Scripts\python -m pip install -r requirements.txt --quiet
cd ..

# 2. Setup Real-time
Write-Host "[2/3] Preparing Real-time Server (Node)..." -ForegroundColor Yellow
cd realtime
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing Node dependencies..." -ForegroundColor Gray
    npm install --silent
}
cd ..

# 3. Setup Frontend
Write-Host "[3/3] Preparing Frontend (React/Vite)..." -ForegroundColor Yellow
cd frontend
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing Frontend dependencies..." -ForegroundColor Gray
    npm install --silent
}
cd ..

Write-Host "`n--- Starting Services ---" -ForegroundColor Cyan
Write-Host "Services are launching in separate windows."

# Launch Backend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$Host.UI.RawUI.WindowTitle = 'TalentOS - Backend'; cd backend; .\venv\Scripts\python manage.py runserver 8002"

# Launch Real-time (Node)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$Host.UI.RawUI.WindowTitle = 'TalentOS - Realtime'; cd realtime; node server.js"

# Launch Frontend (React/Vite)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$Host.UI.RawUI.WindowTitle = 'TalentOS - Frontend'; cd frontend; npm run dev"

Write-Host "`nTalentOS is running!" -ForegroundColor Green
Write-Host "Check the new terminal windows for logs." -ForegroundColor Gray
Write-Host "Using MongoDB Atlas connection: $($(Get-Content .env | Select-String 'MONGO_URI').ToString().Split('=')[1])" -ForegroundColor DarkGray
