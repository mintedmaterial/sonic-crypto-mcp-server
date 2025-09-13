# Sonic Crypto Dashboard - Deployment Guide

This Next.js dashboard integrates with the Sonic Crypto MCP Server to provide a beautiful, animated interface for cryptocurrency data and AI-powered market analysis.

## Architecture

- **Backend**: Cloudflare Worker MCP Server at `https://sonic-crypto-mcp-server.your-subdomain.workers.dev`
- **Frontend**: Next.js dashboard deployed on Cloudflare Pages
- **Integration**: Dashboard consumes MCP server via REST API calls

## Local Development

1. **Install dependencies**:
   ```bash
   cd sonic-crypto-dashboard
   npm install
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```

3. **Access locally**: Open http://localhost:3000

## Deployment to Cloudflare Pages

### Prerequisites
- Cloudflare account
- `wrangler` CLI installed and authenticated
- MCP server already deployed and running

### Deploy Steps

1. **Build the static site**:
   ```bash
   npm run build
   ```
   This creates an `out/` directory with static files.

2. **Deploy to Cloudflare Pages**:
   ```bash
   # Production deployment
   npm run deploy

   # Or staging deployment
   npm run deploy:staging
   ```

3. **Set environment variables** in Cloudflare Dashboard:
   - Go to Pages → sonic-crypto-dashboard → Settings → Environment variables
   - Add: `NEXT_PUBLIC_MCP_SERVER_URL` = `https://sonic-crypto-mcp-server.your-subdomain.workers.dev`

### Alternative: Automatic Git Deployment

1. **Push to Git repository**
2. **Connect to Cloudflare Pages**:
   - Go to Cloudflare Dashboard → Pages
   - Create new project → Connect to Git
   - Select your repository
   - Build settings:
     - Framework preset: Next.js (Static HTML Export)
     - Build command: `npm run build`
     - Build output directory: `out`

## Configuration

### Environment Variables
- `NEXT_PUBLIC_MCP_SERVER_URL`: URL of your deployed MCP server
- `NEXT_PUBLIC_APP_NAME`: Dashboard application name
- `NEXT_PUBLIC_APP_VERSION`: Application version

### MCP Server Integration
The dashboard connects to these MCP server endpoints:
- `/mcp/tools/list` - List available tools
- `/mcp/tools/call` - Execute tools
- `/api/*` - Direct API access

### Features Integrated
1. **Real-time Price Data**: Live cryptocurrency prices via `get_latest_index_tick`
2. **Market Reports**: AI-generated reports via `get_latest_market_report`
3. **Sentiment Analysis**: Market sentiment via `analyze_sonic_market_sentiment`
4. **Yield Opportunities**: DeFi opportunities via `search_sonic_opportunities`
5. **Background Animation**: Logo rainfall with Sonic ecosystem branding

## Troubleshooting

### CORS Issues
If you encounter CORS errors, ensure your MCP server includes proper CORS headers for your dashboard domain.

### Build Errors
- Ensure all dependencies are installed: `npm install`
- Check Next.js configuration in `next.config.ts`
- Verify static export compatibility

### MCP Connection Issues
- Verify MCP server URL is correct and accessible
- Check network connectivity
- Review browser console for API errors

## Performance

- **Static Site**: Deployed as static files for fast loading
- **Auto-refresh**: Dashboard updates every 30 seconds
- **Error Handling**: Graceful fallback to mock data if MCP server unavailable
- **Responsive**: Works on desktop and mobile devices

## Security

- **Client-side only**: No server-side secrets exposed
- **HTTPS**: All API calls use HTTPS
- **Environment variables**: Sensitive configs via Cloudflare environment variables