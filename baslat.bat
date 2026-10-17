@echo off
chcp 65001 >nul
echo ============================================================================
echo Kisisel Finans, Yatirim Fonlari ve Seffaflik Platformu (TUBITAK 2209-A)
echo Sunucular Baslatiliyor...
echo ============================================================================

start "Fon Platformu - FastAPI Backend (8000)" cmd /k "cd /d %~dp0backend && .\venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000"
start "Fon Platformu - Next.js Frontend (3000)" cmd /k "cd /d %~dp0frontend && npm run start -- -p 3000"

timeout /t 4 >nul
start http://localhost:3000
echo.
echo Her iki sunucu da baslatildi ve http://localhost:3000 tarayicida acildi!
