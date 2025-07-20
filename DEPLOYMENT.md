# Vercel Deployment Guide

This application is optimized for Vercel deployment. Follow these steps to deploy your Craftons Curves Calculator.

## Prerequisites

- GitHub account with your code repository
- Vercel account (free tier available)
- Shopify store (if using Shopify integration)

## Deployment Steps

### 1. Prepare Your Repository

Ensure your code is pushed to GitHub:
```bash
git add .
git commit -m "Ready for Vercel deployment"
git push origin main
```

### 2. Connect to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Sign in with your GitHub account
3. Click "New Project"
4. Import your `craftons-curves-calculator` repository

### 3. Configure Deployment Settings

Vercel will auto-detect this as a Next.js project. The default settings will work:

- **Framework Preset**: Next.js
- **Root Directory**: `./`
- **Build Command**: `npm run build` (auto-detected)
- **Output Directory**: `.next` (auto-detected)
- **Install Command**: `npm install` (auto-detected)

### 4. Environment Variables (Optional)

If you're using Shopify integration, add these environment variables in Vercel:

```
SHOPIFY_API_KEY=your_shopify_api_key
SHOPIFY_API_SECRET=your_shopify_api_secret
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_APP_URL=your-vercel-domain.vercel.app
```

### 5. Deploy

Click "Deploy" and wait for the build to complete (usually 1-2 minutes).

## Post-Deployment

### Update Shopify Configuration

If using Shopify integration, update your `shopify.app.toml`:

```toml
[app]
application_url = "https://your-project.vercel.app"

[app.auth]
redirect_urls = [
  "https://your-project.vercel.app/api/auth/callback",
  "http://localhost:3000/api/auth/callback"
]
```

### Custom Domain (Optional)

1. In Vercel dashboard, go to your project
2. Navigate to "Settings" → "Domains"
3. Add your custom domain
4. Update DNS records as instructed

## Automatic Deployments

Every push to your `main` branch will automatically trigger a new deployment.

## Features Included

✅ **Static Asset Optimization** - Images, fonts, and assets are optimized
✅ **Serverless Functions** - API routes work seamlessly
✅ **Edge Caching** - Fast global content delivery
✅ **HTTPS** - Automatic SSL certificates
✅ **Shopify Embedding** - Proper headers for iframe embedding
✅ **Dynamic Iframe Height** - Automatic height adjustment to prevent dual scrollbars
✅ **Mobile Responsive** - Works on all devices

## Troubleshooting

### Build Failures
- Check the build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Verify no TypeScript errors locally

### API Routes Not Working
- Ensure API files are in `src/app/api/` directory
- Check that endpoints return proper JSON responses

### Shopify Embedding Issues
- Verify CORS headers are set correctly
- Check that iframe embedding is allowed
- Ensure HTTPS is enabled
- Update Liquid section to include dynamic height script (see DYNAMIC_IFRAME_HEIGHT_GUIDE.md)

## Performance

Your Vercel deployment includes:
- Global CDN distribution
- Automatic image optimization
- Edge caching for static assets
- Serverless function optimization

## Monitoring

Monitor your deployment:
- **Analytics**: Vercel provides built-in analytics
- **Logs**: Real-time function logs in dashboard
- **Performance**: Core Web Vitals tracking

## Support

For deployment issues:
- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
- [Vercel Community](https://github.com/vercel/vercel/discussions) 