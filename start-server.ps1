# Yatri Portal Server Starter
Write-Host "🚀 Starting Yatri Portal Server..." -ForegroundColor Green

# Stop any existing Node.js processes
Write-Host "🛑 Stopping any existing Node.js processes..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

# Wait for port to be released
Write-Host "⏳ Waiting for port 3000 to be released..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Check if port is free
$portCheck = netstat -ano | findstr ":3000"
if ($portCheck) {
    Write-Host "⚠️  Port 3000 is still in use. Trying to free it..." -ForegroundColor Red
    Start-Sleep -Seconds 2
}

# Start the server
Write-Host "🎯 Starting server on http://localhost:3000..." -ForegroundColor Green
try {
    node server.js
} catch {
    Write-Host "❌ Error starting server: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "💡 Try running this script again or manually kill Node processes with: taskkill /F /IM node.exe" -ForegroundColor Yellow
}

Write-Host "Press any key to exit..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

