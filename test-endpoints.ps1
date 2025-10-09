# Test all API endpoints after deployment
$BASE_URL = "https://ss.srvcflo.com"

Write-Host "🧪 Testing Sonic Crypto MCP Server Endpoints..." -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Health Check
Write-Host "1. Health Check..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/health" -Method Get
    Write-Host "✅ Status: $($response.status)" -ForegroundColor Green
    Write-Host "   Instruments: $($response.database.instruments)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Health check failed: $_" -ForegroundColor Red
}
Write-Host ""

# 2. Initialize Database
Write-Host "2. Initialize Database..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/api/init-db" -Method Post
    Write-Host "✅ $($response.message)" -ForegroundColor Green
} catch {
    Write-Host "❌ Database init failed: $_" -ForegroundColor Red
}
Write-Host ""

# 3. Get Trending (Sonic)
Write-Host "3. Get Trending Sonic Tokens..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/api/trending?source=sonic&limit=5" -Method Get
    $gainers = $response.data.gainers
    if ($gainers) {
        foreach ($token in $gainers | Select-Object -First 3) {
            Write-Host "   📈 $($token.symbol): $($token.percent_change_24h.ToString('F2'))% | Price: `$$($token.price.ToString('F4'))" -ForegroundColor Green
        }
    }
} catch {
    Write-Host "❌ Trending failed: $_" -ForegroundColor Red
}
Write-Host ""

# 4. Get Latest Prices
Write-Host "4. Get Latest Prices..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/api/price" -Method Get
    Write-Host "✅ Fetched prices for $($response.data.PSObject.Properties.Count) instruments" -ForegroundColor Green
} catch {
    Write-Host "❌ Price fetch failed: $_" -ForegroundColor Red
}
Write-Host ""

# 5. Get Global Market Metrics
Write-Host "5. Get Global Market Metrics..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/api/global-metrics" -Method Get
    if ($response.data) {
        $mcap = [math]::Round($response.data.total_market_cap / 1e12, 2)
        $vol = [math]::Round($response.data.total_volume_24h / 1e9, 2)
        Write-Host "   💰 Market Cap: `$$($mcap)T" -ForegroundColor Cyan
        Write-Host "   📊 24h Volume: `$$($vol)B" -ForegroundColor Cyan
        Write-Host "   ₿ BTC Dominance: $($response.data.btc_dominance.ToString('F2'))%" -ForegroundColor Cyan
    }
} catch {
    Write-Host "❌ Global metrics failed: $_" -ForegroundColor Red
}
Write-Host ""

# 6. Test Discord Intel (may fail if token not set)
Write-Host "6. Test Discord Intelligence..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/api/discord-intel?type=tweets&limit=5" -Method Get
    Write-Host "✅ Discord intel available" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Discord intel unavailable (token may not be set)" -ForegroundColor DarkYellow
}
Write-Host ""

# 7. Test Dashboard
Write-Host "7. Test Dashboard..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$BASE_URL/" -Method Get -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Dashboard accessible (Status: $($response.StatusCode))" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Dashboard failed: $_" -ForegroundColor Red
}
Write-Host ""

# 8. Test AI Chat
Write-Host "8. Test AI Chat..." -ForegroundColor Yellow
try {
    $body = @{
        message = "What is Bitcoin?"
        history = @()
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$BASE_URL/api/chat" -Method Post -Body $body -ContentType "application/json"
    if ($response.success) {
        $preview = $response.response.Substring(0, [Math]::Min(100, $response.response.Length))
        Write-Host "✅ AI Response: $preview..." -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Chat failed: $_" -ForegroundColor Red
}
Write-Host ""

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "✅ Test suite complete!" -ForegroundColor Green
Write-Host ""
Write-Host "View live dashboard at: $BASE_URL" -ForegroundColor Cyan
Write-Host "Monitor logs with: wrangler tail" -ForegroundColor Gray
