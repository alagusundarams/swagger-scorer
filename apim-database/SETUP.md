# PostgreSQL Setup Guide

## Quick Start: Local PostgreSQL with Docker

### Option 1: Docker (Recommended for Testing)

```bash
# 1. Start PostgreSQL in Docker
docker run --name apim-postgres \
  -e POSTGRES_PASSWORD=dev_password \
  -e POSTGRES_DB=apim_portal \
  -p 5432:5432 \
  -d postgres:15

# 2. Wait a few seconds for PostgreSQL to start
timeout /t 5

# 3. Create the schema
docker exec -i apim-postgres psql -U postgres -d apim_portal < database/schema.sql

# 4. Verify
docker exec -it apim-postgres psql -U postgres -d apim_portal -c "\dt"
```

### Option 2: Windows PostgreSQL Installation

1. Download PostgreSQL 15: https://www.postgresql.org/download/windows/
2. Install with defaults (remember the postgres password!)
3. Create database:
   ```cmd
   psql -U postgres
   CREATE DATABASE apim_portal;
   \q
   ```
4. Apply schema:
   ```cmd
   psql -U postgres -d apim_portal -f database/schema.sql
   ```

---

## Complete Migration Flow

### Step 1: Fetch APIM Data

```powershell
# Login to Azure
az login

# Set your APIM details
$env:APIM_INSTANCE="your-apim-dev"
$env:RESOURCE_GROUP="your-rg"
$env:SUBSCRIPTION_ID="your-sub-id"

# Fetch data (saves to data/apim-data-YYYY-MM-DD.json)
npx tsx scripts/fetch-apim-data.ts
```

###Step 2: Setup PostgreSQL (if using Docker)

```powershell
# Start PostgreSQL
docker run --name apim-postgres `
  -e POSTGRES_PASSWORD=dev_password `
  -e POSTGRES_DB=apim_portal `
  -p 5432:5432 `
  -d postgres:15

# Wait for startup
Start-Sleep -Seconds 5

# Apply schema
Get-Content database/schema.sql | docker exec -i apim-postgres psql -U postgres -d apim_portal
```

### Step 3: Migrate Data to PostgreSQL

```powershell
# Set database connection
$env:DATABASE_URL="postgresql://postgres:dev_password@localhost:5432/apim_portal"

# Run migration (use the JSON file from step 1)
npx tsx scripts/migrate-to-postgres.ts data/apim-data-2024-12-19.json
```

### Step 4: Verify Data

```powershell
# Connect to database
docker exec -it apim-postgres psql -U postgres -d apim_portal

# Or on Windows:
# psql -U postgres -d apim_portal

# Run queries
SELECT COUNT(*) FROM products;
SELECT COUNT(*) FROM apis;
SELECT COUNT(*) FROM subscriptions;

# View products with team info
SELECT * FROM products_with_teams LIMIT 5;
```

---

## Expected Output

```
🔄 APIM to PostgreSQL Migration
==================================================

📂 Loading data from: data/apim-data-2024-12-19.json
  ✅ Loaded data from your-apim-dev
  📊 Summary:
     - Products: 45
     - APIs: 123
     - Subscriptions: 67

🔌 Connecting to PostgreSQL...
  ✅ Connected successfully

👥 Setting up default team...
  ✅ Default team ready: default-team

📦 Migrating 45 products...
  ✅ Inserted/Updated: 45
  ⚠️  Skipped: 0

📡 Migrating 123 APIs...
  ✅ Inserted/Updated: 120
  ⚠️  Skipped: 3

🔑 Migrating 67 subscriptions...
  ✅ Inserted/Updated: 65
  ⚠️  Skipped: 2

📊 Updating product statistics...
  ✅ Product stats updated

✅ Migration complete!
```

---

## Troubleshooting

### "CONNECTION_REFUSED"
- PostgreSQL not running
- Check: `docker ps` or Windows Services
- Fix: Start PostgreSQL container/service

### "AUTHENTICATION_FAILED"
- Wrong password in DATABASE_URL
- Fix: Match password from docker run command

### "DATABASE_DOES_NOT_EXIST"
- Database not created
- Fix: Run CREATE DATABASE command

### "SCHEMA_ERROR"
- Schema not applied
- Fix: Run schema.sql file

---

## Next Steps

After migration:
1. Review data: `SELECT * FROM products_with_teams LIMIT 10;`
2. Assign real teams to products
3. Update backend to read from PostgreSQL instead of mocks
4. Connect frontend to real API endpoints

---

## Production Checklist

Before deploying to production:
- [ ] Use Azure Database for PostgreSQL
- [ ] Enable SSL connections
- [ ] Set strong passwords (Azure Key Vault)
- [ ] Encrypt subscription keys at rest
- [ ] Enable audit logging
- [ ] Set up automated backups
- [ ] Configure connection pooling
- [ ] Set up monitoring (Azure Monitor)
