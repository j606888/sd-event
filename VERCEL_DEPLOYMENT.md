# Vercel Deployment Guide - Database Migrations

## Current Setup: Using Push (Recommended)

The build script is configured to use `drizzle-kit push`, which directly syncs your schema to the database. This is simpler and handles existing schema better.

### Step 1: Set Environment Variables in Vercel

1. Go to your Vercel project settings
2. Navigate to "Environment Variables"
3. Add `DATABASE_URL` with your production database connection string

### Step 2: Deploy

The schema will be synced automatically during the build process because the `build` script includes `db:push:deploy`.

**Note**: `db:push` directly syncs your schema to the database without creating migration files. This is simpler and works well for most use cases.

## Alternative: Using Migrations (More Control)

If you prefer to use migrations instead:

1. Update `package.json` build script to:
   ```json
   "build": "npm run db:migrate:deploy && next build"
   ```

2. Generate migrations locally:
   ```bash
   npm run db:generate
   ```

3. Commit the `drizzle` folder to git

4. Deploy

**Note**: Migrations give you more control over schema changes but require managing migration files.

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
