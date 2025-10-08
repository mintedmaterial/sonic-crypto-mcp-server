@echo off
REM Quick Test Script for Sonic Crypto MCP Server
REM Run this in Windows Command Prompt

echo ========================================
echo Sonic Crypto MCP Server - Quick Tests
echo ========================================
echo.

cd /d C:\Users\PC\sonic-crypto-mcp-server

echo [1/8] Building TypeScript...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Build failed!
    pause
    exit /b 1
)
echo ✅ Build successful
echo.

echo [2/8] Starting dev server...
echo NOTE: Server will start in background. Wait 15 seconds for it to be ready.
start /B npm run dev
timeout /t 15 /nobreak >nul
echo.

echo [3/8] Testing health endpoint...
curl -s http://localhost:8787/health
echo.
echo.

echo [4/8] Testing API docs...
curl -s http://localhost:8787/api/docs | findstr "Sonic Crypto"
echo.
echo.

echo [5/8] Testing price endpoint (multi-source)...
curl -s -X POST http://localhost:8787/api/price -H "Content-Type: application/json" -d "{\"market\":\"orderly\",\"instruments\":[\"BTC-USD\",\"SONIC-USD\"]}"
echo.
echo.

echo [6/8] Testing Orderly markets...
curl -s http://localhost:8787/api/orderly/markets | findstr "success"
echo.
echo.

echo [7/8] Testing MCP tools list...
curl -s http://localhost:8787/mcp/tools/list | findstr "get_latest_index_tick"
echo.
echo.

echo [8/8] Testing MCP tool call...
curl -s -X POST http://localhost:8787/mcp/tools/call -H "Content-Type: application/json" -d "{\"name\":\"get_latest_index_tick\",\"arguments\":{\"instruments\":[\"BTC-USD\"]}}"
echo.
echo.

echo ========================================
echo All tests complete!
echo ========================================
echo.
echo To view dashboard: http://localhost:8787/
echo To view logs: wrangler tail
echo.
echo Press any key to stop the server...
pause >nul

taskkill /F /IM node.exe /T >nul 2>&1
echo Server stopped.
pause
