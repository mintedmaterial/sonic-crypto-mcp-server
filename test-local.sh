#!/bin/bash
# Quick Test Script for Sonic Crypto MCP Server (Unix/Mac/Git Bash)

echo "========================================"
echo "Sonic Crypto MCP Server - Quick Tests"
echo "========================================"
echo ""

cd "C:/Users/PC/sonic-crypto-mcp-server" || exit 1

echo "[1/8] Building TypeScript..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ ERROR: Build failed!"
    exit 1
fi
echo "✅ Build successful"
echo ""

echo "[2/8] Starting dev server..."
echo "NOTE: Server will start in background. Wait 15 seconds for it to be ready."
npm run dev &
DEV_PID=$!
sleep 15
echo ""

echo "[3/8] Testing health endpoint..."
curl -s http://localhost:8787/health | jq '.' || curl -s http://localhost:8787/health
echo ""
echo ""

echo "[4/8] Testing API docs..."
curl -s http://localhost:8787/api/docs | grep "Sonic Crypto"
echo ""
echo ""

echo "[5/8] Testing price endpoint (multi-source)..."
curl -s -X POST http://localhost:8787/api/price \
  -H "Content-Type: application/json" \
  -d '{"market":"orderly","instruments":["BTC-USD","SONIC-USD"]}' | jq '.' || \
curl -s -X POST http://localhost:8787/api/price \
  -H "Content-Type: application/json" \
  -d '{"market":"orderly","instruments":["BTC-USD","SONIC-USD"]}'
echo ""
echo ""

echo "[6/8] Testing Orderly markets..."
curl -s http://localhost:8787/api/orderly/markets | grep -o "success"
echo ""
echo ""

echo "[7/8] Testing MCP tools list..."
curl -s http://localhost:8787/mcp/tools/list | grep "get_latest_index_tick"
echo ""
echo ""

echo "[8/8] Testing MCP tool call..."
curl -s -X POST http://localhost:8787/mcp/tools/call \
  -H "Content-Type: application/json" \
  -d '{"name":"get_latest_index_tick","arguments":{"instruments":["BTC-USD"]}}' | jq '.' || \
curl -s -X POST http://localhost:8787/mcp/tools/call \
  -H "Content-Type: application/json" \
  -d '{"name":"get_latest_index_tick","arguments":{"instruments":["BTC-USD"]}}'
echo ""
echo ""

echo "========================================"
echo "All tests complete!"
echo "========================================"
echo ""
echo "To view dashboard: http://localhost:8787/"
echo "To view logs: wrangler tail"
echo ""
echo "Press Enter to stop the server..."
read

kill $DEV_PID 2>/dev/null
echo "Server stopped."
