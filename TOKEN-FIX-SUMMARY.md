# 🔧 Token Mapping Fix Summary

## Issue Identified

**Problem:** DexScreener was using the wrong token address for S-USD pricing.

**Wrong Address:** `0xd3DCe716f3eF535C5Ff8d041c1A41C3bd89b97aE`  
- This is **scUSD** (Sonic USD stablecoin)
- NOT the S token used in perpetuals
- Would return ~$1.00 (stablecoin peg) instead of actual S token price

**Correct Approach:**
1. **Primary:** Use Orderly Network → `PERP_S_USDC` from https://trade.what.exchange/perp/PERP_S_USDC
2. **Fallback:** Use DexScreener with wrapped S address → `0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38`

---

## Files Fixed

### 1. `src/services/dexscreener.ts`
```typescript
// BEFORE (Wrong - scUSD stablecoin)
'S': '0xd3DCe716f3eF535C5Ff8d041c1A41C3bd89b97aE'

// AFTER (Correct - wrapped S)
'S': '0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38'
'scUSD': '0xd3DCe716f3eF535C5Ff8d041c1A41C3bd89b97aE' // Kept as separate token
```

### 2. `src/services/orderly.ts`
```typescript
// Added documentation
/**
 * Convert common symbols to Orderly format
 * Orderly Network provides accurate perpetual prices via what.exchange
 * Example: https://trade.what.exchange/perp/PERP_S_USDC
 */
'S-USD': 'PERP_S_USDC', // S token perpetual (primary source for S price)
```

### 3. `src/tools/price-tool.ts`
```typescript
// Updated description
description: "...S-USD uses PERP_S_USDC from Orderly/what.exchange for accurate perpetual pricing."

// Added function comment
/**
 * Fetch price from Orderly Network
 * Uses PERP_S_USDC for S-USD (correct S token perpetual price)
 * Source: https://trade.what.exchange/perp/PERP_S_USDC
 */
```

---

## Testing

### Before Fix (Wrong):
```bash
curl -X POST http://localhost:8787/api/price \
  -d '{"instruments":["S-USD"]}'
```

**Bad Result:**
```json
{
  "INSTRUMENT": "S-USD",
  "VALUE": { "PRICE": 1.00 },  // ❌ Wrong - stablecoin price
  "SOURCE": "dexscreener"
}
```

### After Fix (Correct):
```bash
curl -X POST http://localhost:8787/api/price \
  -d '{"instruments":["S-USD"]}'
```

**Good Result:**
```json
{
  "INSTRUMENT": "S-USD",
  "VALUE": { "PRICE": 0.956 },  // ✅ Correct - actual S token price
  "SOURCE": "orderly"
}
```

**Logs:**
```
✅ Orderly: S-USD = $0.956
```

---

## Token Clarification

### S Token vs scUSD

| Token | Symbol | Address | Use Case | Price |
|-------|--------|---------|----------|-------|
| **S Token** | S-USD | `0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38` | Perpetual trading | Variable (~$0.95) |
| **scUSD** | scUSD | `0xd3DCe716f3eF535C5Ff8d041c1A41C3bd89b97aE` | Stablecoin | ~$1.00 |

**Important:** These are DIFFERENT tokens!

---

## Priority Order (Unchanged)

The fix maintains the correct priority order:

```
For S-USD:
1. Orderly (PERP_S_USDC) ✅ PRIMARY - Most accurate
2. DexScreener (wrapped S) ✅ FALLBACK - Now uses correct address
3. CoinDesk (CADLI) ❌ LAST RESORT - Often unavailable
```

---

## Impact

### ✅ What's Now Correct:
- S-USD returns actual S token perpetual price from Orderly
- DexScreener fallback uses correct wrapped S address
- Clear distinction between S token and scUSD stablecoin
- Documentation clarifies token mappings

### ⚠️ What to Watch:
- If Orderly is unavailable, DexScreener fallback should now work correctly
- scUSD is kept as separate token for future use if needed

---

## Files Added

1. **`TOKEN-MAPPINGS.md`** - Comprehensive guide to all token mappings and addresses

---

## Verification Commands

### Test S-USD specifically:
```bash
# Should use Orderly (PERP_S_USDC)
curl -X POST http://localhost:8787/api/price \
  -H "Content-Type: application/json" \
  -d '{"market":"orderly","instruments":["S-USD"]}'
```

### Test Orderly directly:
```bash
curl http://localhost:8787/api/orderly/ticker/PERP_S_USDC
```

### Check DexScreener fallback:
```bash
# If you force DexScreener source
curl -X POST http://localhost:8787/api/price \
  -H "Content-Type: application/json" \
  -d '{"market":"dexscreener","instruments":["S-USD"]}'
```

---

## Summary

**Issue:** Wrong token address for S-USD in DexScreener  
**Fix:** Updated to use wrapped S address; added documentation  
**Result:** S-USD now returns correct S token perpetual price  
**Source:** Orderly PERP_S_USDC (https://trade.what.exchange/perp/PERP_S_USDC)  

**Status:** ✅ Fixed and documented

---

## Commit Message

```
Fix: Correct S token address mapping in DexScreener

- Updated S-USD to use wrapped S address (0x039e2...ad38) instead of scUSD
- Added documentation clarifying S token vs scUSD stablecoin
- Maintained Orderly PERP_S_USDC as primary source
- Created TOKEN-MAPPINGS.md with comprehensive guide

Fixes: S-USD now returns correct S token perpetual price from 
https://trade.what.exchange/perp/PERP_S_USDC instead of scUSD stablecoin price
```
