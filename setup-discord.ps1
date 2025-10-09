# Discord Bot Quick Setup Script
# Run this after creating your Discord bot

Write-Host "🤖 Discord Community Intel Setup" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Get bot token
Write-Host "Step 1: Discord Bot Token" -ForegroundColor Yellow
Write-Host "Have you created a Discord bot at https://discord.com/developers/applications?" -ForegroundColor White
$created = Read-Host "Enter 'yes' to continue"

if ($created -ne "yes") {
    Write-Host "❌ Please create a Discord bot first. See DISCORD-COMMUNITY-INTEL.md for instructions." -ForegroundColor Red
    exit
}

Write-Host ""
Write-Host "Setting Discord bot token as Cloudflare secret..." -ForegroundColor Green
wrangler secret put DISCORD_BOT_TOKEN

Write-Host ""
Write-Host "✅ Discord bot token configured!" -ForegroundColor Green
Write-Host ""

# Get channel IDs
Write-Host "Step 2: Channel IDs" -ForegroundColor Yellow
Write-Host "Have you enabled Developer Mode in Discord and copied your channel IDs?" -ForegroundColor White
Write-Host "(Settings → Advanced → Developer Mode, then right-click channels)" -ForegroundColor Gray
Write-Host ""

$nftChannel = Read-Host "Enter your NFT channel ID (or press Enter to skip)"
$tweetChannel = Read-Host "Enter your Tweet channel ID (or press Enter to skip)"

Write-Host ""
Write-Host "📝 Channel Configuration:" -ForegroundColor Cyan
if ($nftChannel) {
    Write-Host "  NFT Channel: $nftChannel" -ForegroundColor White
}
if ($tweetChannel) {
    Write-Host "  Tweet Channel: $tweetChannel" -ForegroundColor White
}

Write-Host ""
Write-Host "Step 3: Test Configuration" -ForegroundColor Yellow
Write-Host "Deploy your worker and test with:" -ForegroundColor White
Write-Host ""

if ($nftChannel -and $tweetChannel) {
    Write-Host "curl -X POST https://ss.srvcflo.com/api/discord/intel \" -ForegroundColor Gray
    Write-Host "  -H 'Content-Type: application/json' \" -ForegroundColor Gray
    Write-Host "  -d '{" -ForegroundColor Gray
    Write-Host "    \`"nft_channel_id\`": \`"$nftChannel\`"," -ForegroundColor Gray
    Write-Host "    \`"tweet_channel_id\`": \`"$tweetChannel\`"," -ForegroundColor Gray
    Write-Host "    \`"limit\`": 10" -ForegroundColor Gray
    Write-Host "  }'" -ForegroundColor Gray
} elseif ($nftChannel) {
    Write-Host "curl -X POST https://ss.srvcflo.com/api/discord/intel \" -ForegroundColor Gray
    Write-Host "  -H 'Content-Type: application/json' \" -ForegroundColor Gray
    Write-Host "  -d '{" -ForegroundColor Gray
    Write-Host "    \`"nft_channel_id\`": \`"$nftChannel\`"," -ForegroundColor Gray
    Write-Host "    \`"intel_type\`": \`"nft\`"," -ForegroundColor Gray
    Write-Host "    \`"limit\`": 10" -ForegroundColor Gray
    Write-Host "  }'" -ForegroundColor Gray
} elseif ($tweetChannel) {
    Write-Host "curl -X POST https://ss.srvcflo.com/api/discord/intel \" -ForegroundColor Gray
    Write-Host "  -H 'Content-Type: application/json' \" -ForegroundColor Gray
    Write-Host "  -d '{" -ForegroundColor Gray
    Write-Host "    \`"tweet_channel_id\`": \`"$tweetChannel\`"," -ForegroundColor Gray
    Write-Host "    \`"intel_type\`": \`"tweets\`"," -ForegroundColor Gray
    Write-Host "    \`"limit\`": 10" -ForegroundColor Gray
    Write-Host "  }'" -ForegroundColor Gray
}

Write-Host ""
Write-Host "✅ Setup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📚 Documentation:" -ForegroundColor Cyan
Write-Host "  Full guide: DISCORD-COMMUNITY-INTEL.md" -ForegroundColor White
Write-Host "  API docs: https://ss.srvcflo.com/api/docs" -ForegroundColor White
Write-Host ""
Write-Host "🚀 Next: npm run deploy" -ForegroundColor Yellow
