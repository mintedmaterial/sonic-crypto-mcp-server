# 🪙 Token Mappings & Price Sources

## Sonic Ecosystem Token Guide

### S Token vs SONIC Token

**Important:** There are TWO different tokens in the Sonic ecosystem:

1. **S Token** (`S-USD`)
   - The primary Sonic token used in perpetual trading
   - Orderly Symbol: `PERP_S_USDC`
   - Source: https://trade.what.exchange/perp/PERP_S_USDC
   - **Primary Source:** Orderly Network (most accurate)
   - DexScreener Address: `0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38` (wrapped S)

2. **SONIC Token** (`SONIC-USD`)
   - Different from S token
   - Orderly Symbol: `PERP_SONIC_USDC`
   - DexScreener Address: `0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38` (wrapped SONIC)

---

## Data Source Priority

### For S-USD (S Token):
```
Priority 1: Orderly Network → PERP_S_USDC ✅ (BEST - from what.exchange)
Priority 2: DexScreener → Wrapped S address ⚠️ (Fallback)
Priority 3: CoinDesk → CADLI index ❌ (Usually unavailable)
```

### For SONIC-USD:
```
Priority 1: Orderly Network → PERP_SONIC_USDC ✅ (if available)
Priority 2: DexScreener → Wrapped SONIC ✅ (Good fallback)
Priority 3: CoinDesk → CADLI index ❌ (Usually unavailable)
```

### For BTC-USD & ETH-USD:
```
Priority 1: Orderly Network → PERP_BTC_USDC / PERP_ETH_USDC ✅
Priority 2: DexScreener → Search for BTC/ETH pairs ✅
Priority 3: CoinDesk → CADLI index ✅ (Reliable fallback)
```

---

## Token Address Mappings

### DexScreener (Sonic Chain)

```typescript
const sonicTokenAddresses = {
  'SONIC': '0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38', // Wrapped Sonic (wS)
  'S': '0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38',     // S token uses wrapped S
  'wS': '0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38',    // Wrapped Sonic explicit
  'scUSD': '0xd3DCe716f3eF535C5Ff8d041c1A41C3bd89b97aE', // Sonic USD stablecoin (different!)
  'USDC': '0x29219dd400f2Bf60E5a23d13Be72B486D4038894',  // USDC on Sonic
};
```

**Note:** `scUSD` is a DIFFERENT token from S - it's a stablecoin, not the S perpetual token.

---

## Orderly Network Symbol Mappings

### Perpetual Contracts (what.exchange)

```typescript
const orderlySymbols = {
  'BTC-USD': 'PERP_BTC_USDC',     // Bitcoin perpetual
  'ETH-USD': 'PERP_ETH_USDC',     // Ethereum perpetual
  'S-USD': 'PERP_S_USDC',         // S token perpetual ✅ CORRECT
  'SONIC-USD': 'PERP_SONIC_USDC', // SONIC token perpetual
  'USDC-USD': 'SPOT_USDC_USDT',   // USDC spot
  'USDT-USD': 'SPOT_USDT_USDC',   // USDT spot
};
```

### Where to Find Prices

- **S Token Perpetual:** https://trade.what.exchange/perp/PERP_S_USDC
- **SONIC Perpetual:** https://trade.what.exchange/perp/PERP_SONIC_USDC
- **BTC Perpetual:** https://trade.what.exchange/perp/PERP_BTC_USDC
- **ETH Perpetual:** https://trade.what.exchange/perp/PERP_ETH_USDC

---

## API Endpoints

### Get S Token Price (Correct)
```bash
# Via MCP tool (uses Orderly first)
curl -X POST http://localhost:8787/mcp/tools/call \
  -H "Content-Type: application/json" \
  -d '{"name":"get_latest_index_tick","arguments":{"instruments":["S-USD"]}}'

# Via direct API
curl http://localhost:8787/api/price

# Via Orderly endpoint directly
curl http://localhost:8787/api/orderly/ticker/PERP_S_USDC
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "INSTRUMENT": "S-USD",
        "VALUE": {
          "PRICE": 0.956,  // Example price from PERP_S_USDC
          "BID": 0.955,
          "ASK": 0.957
        },
        "CURRENT_DAY": {
          "CHANGE_PERCENTAGE": 2.1,
          "HIGH": 0.96,
          "LOW": 0.93,
          "VOLUME": 1234567
        },
        "SOURCE": "orderly"
      }
    ],
    "sources_used": ["orderly"]
  }
}
```

---

## Why This Matters

### ❌ Wrong Way (Old Implementation)
Using DexScreener address `0xd3DCe716f3eF535C5Ff8d041c1A41C3bd89b97aE` for S-USD would give you the **scUSD stablecoin price**, not the S token perpetual price.

### ✅ Right Way (Current Implementation)
1. Try Orderly PERP_S_USDC first (most accurate perpetual price)
2. Fallback to DexScreener with wrapped S address if needed
3. Use CoinDesk as last resort

---

## Testing Token Mappings

### Test S-USD Price Source
```bash
# Start dev server
npm run dev

# Test S-USD specifically
curl -X POST http://localhost:8787/api/price \
  -H "Content-Type: application/json" \
  -d '{"market":"orderly","instruments":["S-USD"]}'
```

**Check logs for:**
```
✅ Orderly: S-USD = $0.956
```

**NOT:**
```
❌ DexScreener: S-USD = $1.00  (This would be scUSD stablecoin - wrong!)
```

---

## Summary

| Symbol | Correct Source | Symbol/Address | URL |
|--------|---------------|----------------|-----|
| **S-USD** | Orderly | `PERP_S_USDC` | https://trade.what.exchange/perp/PERP_S_USDC |
| SONIC-USD | Orderly/DexScreener | `PERP_SONIC_USDC` / `0x039...` | - |
| BTC-USD | Orderly | `PERP_BTC_USDC` | https://trade.what.exchange/perp/PERP_BTC_USDC |
| ETH-USD | Orderly | `PERP_ETH_USDC` | https://trade.what.exchange/perp/PERP_ETH_USDC |

**Priority Order:** Orderly (what.exchange) → DexScreener → CoinDesk

---

## Files Modified

1. **`src/services/dexscreener.ts`** - Fixed S token address to use wrapped S
2. **`src/services/orderly.ts`** - Added comment about what.exchange source
3. **`src/tools/price-tool.ts`** - Added documentation about PERP_S_USDC

---

## Need Help?

- **Check Orderly Markets:** `curl http://localhost:8787/api/orderly/markets`
- **Check what.exchange:** https://trade.what.exchange/
- **View Logs:** `wrangler tail`
- **API Docs:** http://localhost:8787/api/docs
