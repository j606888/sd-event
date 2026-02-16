# Vercel Deployment Guide - Database Migrations

## Option 1: Using Migrations (Recommended for Production)

### Step 1: Generate Migrations Locally

Before deploying, generate migration files locally:

```bash
npm run db:generate
```

This will create migration files in the `./drizzle` folder. **Commit these files to git** - they will be used during deployment.

### Step 2: Set Environment Variables in Vercel

1. Go to your Vercel project settings
2. Navigate to "Environment Variables"
3. Add `DATABASE_URL` with your production database connection string

### Step 3: Deploy

The migrations will run automatically during the build process because the `build` script includes `db:migrate:deploy`.

## Option 2: Using Push (Simpler, but less control)

If you prefer to use `drizzle-kit push` instead of migrations:

1. Update `package.json` build script to:
   ```json
   "build": "npm run db:push && next build"
   ```

2. Make sure `DATABASE_URL` is set in Vercel environment variables

3. Deploy

**Note**: `db:push` directly syncs your schema to the database without creating migration files. This is simpler but gives you less control over schema changes.

## Troubleshooting

### Migrations folder not found
- Make sure you've run `npm run db:generate` locally and committed the `drizzle` folder to git
- Check that the `drizzle` folder exists in your repository

### DATABASE_URL not set
- Verify the environment variable is set in Vercel project settings
- Make sure it's available during build time (not just runtime)

### Migration fails
- Check Vercel build logs for detailed error messages
- Ensure your database is accessible from Vercel's IP addresses
- Verify the database user has proper permissions
