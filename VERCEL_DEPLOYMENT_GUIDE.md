# Vercel Deployment Guide for Evaluna ERP

## Issue: Unsupported URL Type "workspace:" 

This error occurs when Vercel tries to use `npm install` on a project configured for Bun workspaces.

## Root Cause
Your project uses Bun workspace dependencies (e.g., `"@evaluna/env": "workspace:*"`), but Vercel's default build process is attempting to use `npm install` which doesn't understand the `workspace:` protocol.

## Solution: Configure Vercel to Use Bun

### Step 1: Create/Update vercel.json
Create a `vercel.json` file in your project root with:

```json
{
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": ".vercel/output"
      }
    }
  ],
  "functions": {
    "api/**": {
      "runtime": "nodejs20.x"
    }
  },
  "env": {
    "BUN_INSTALL": "1"
  }
}
```

### Step 2: Add Bun Build Command
Alternatively, create a custom build script by updating your `package.json`:

```json
{
  "scripts": {
    "build": "bun run build",
    "dev": "bun run dev",
    "vercel-build": "bun run build"
  }
}
```

Then in `vercel.json`:

```json
{
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/node",
      "config": { 
        "command": "bun run vercel-build"
      }
    }
  ]
}
```

### Step 3: Ensure Bun is Available
Add this to your `vercel.json` to install Bun during build:

```json
{
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/node",
      "config": {
        "command": "curl -fsSL https://bun.sh/install | bash && bun install && bun run build"
      }
    }
  ]
}
```

### Step 4: Alternative - Use Pre-built Bun Cache
Since you already have `bun.lock`, Vercel should detect and use Bun automatically if:
1. You have a `bun.lock` file
2. You don't have a `package-lock.json` or `yarn.lock` that takes precedence

**Try removing any conflicting lock files:**
```bash
# Remove these if they exist and are causing confusion:
rm -f package-lock.json yarn.lock pnpm-lock.yaml
# Keep only bun.lock
```

### Step 5: Vercel Project Settings
In your Vercel dashboard:
1. Go to Project Settings → Build & Development Settings
2. Set **Build Command** to: `bun run build`
3. Set **Output Directory** to: `.vercel/output` or `.next` (depending on your Next.js config)
4. Ensure **Install Command** is either blank or set to: `bun install`

## Troubleshooting

### If you still see npm errors:
1. Check that Vercel is detecting your `bun.lock` file
2. Make sure no `package-lock.json` was accidentally committed
3. Verify your `package.json` has `"type": "module"` (which you already have)

### Quick Fix for Immediate Build
Add this as your build command in Vercel settings:
```
bun install && bun run build
```

## Expected Outcome
Once configured correctly, Vercel will:
1. Install Bun during the build process
2. Use `bun install` to respect your workspace dependencies
3. Run your build with `bun run build`
4. Successfully deploy your Evaluna ERP application

## Note on Environment Variables
Ensure your Vercel project has these environment variables set (matching your .env):
- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `NEXT_PUBLIC_APP_URL`
- And any others from your .env file

## After Successful Deploy
Once your application is deployed and running, you can then:
1. Access your admin interface
2. Run the customer import via your seed endpoint: `POST /api/seed-all`
3. Or execute the generated SQL directly against your production database

The SQL import files I prepared earlier (`import_customers_complete.sql`) are ready to use once your application is deployed and connected to your database.