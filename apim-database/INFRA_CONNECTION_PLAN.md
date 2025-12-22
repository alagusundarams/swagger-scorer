# Real Infrastructure Connection Plan

## Goal
Transition the portal from mock data to real Azure infrastructure (PostgreSQL, APIM, and Azure DevOps).

## 1. Data Extraction (Windows Machine)
To pull real state from your Azure environment into the database:

### Prerequisites
- Install [Azure CLI](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli-windows)
- Run `az login` and `az account set --subscription <YOUR_SUBSCRIPTION_ID>`

### Steps
1. **Navigate to DB Project**:
   ```powershell
   cd apim-database
   npm install
   ```
2. **Configure (JSON Mode)**:
   - Copy `config.template.json` to `config.json`.
   - Add your Azure environment IDs.
   - Add your **Read-Only ADO PAT**, your **Organization**, and a list of **Projects** to scan for repositories to `config.json`.
3. **Fetch Data parallelly**:
   ```powershell
   az login
   npx tsx scripts/fetch-apim-data.ts
   ```
   *This script will now crawl your ADO Projects to find matching repositories for each APIM product automatically.*

4. **Migrate to Postgres**:
   ```powershell
   npx tsx scripts/migrate-to-postgres.ts data/apim-data-dev-<date>.json
   ```

## 2. Infrastructure Configuration (Backend)

### Database
Update `apim-self-service-backend/.env`:
```env
DATABASE_URL=postgresql://<user>:<password>@<host>:5432/apim
```

### APIM (Managed Identity)
- Locally: The backend will use your `az login` identity.
- In Azure: Ensure the Backend App Service has a **System Assigned Managed Identity** and is granted **API Management Service Contributor** role on the APIM instance.

### Azure DevOps (Repo Constraint)
> [!IMPORTANT]
> **Existing Repos Only**: Since your identity permissions do not allow for repository creation, the GitOps flow will exclusively target resources (Products/APIs) that are already linked to an existing Git repository URL in the database.

**Onboarding Strategy**:
- For new products, we will leverage a **Shared Governance Repository** (if available) or require a manual link to an existing repo before enabling "Save & Deploy".
- The UI will dynamically disable the "Save & Deploy" button if no `git_repo_url` is found for the active resource.

## 3. Verification Queries
Run these in your Postgres tool (e.g. pgAdmin, psql) to see how the UI will react:
```sql
-- Count real products migrated
SELECT environment, COUNT(*) FROM products GROUP BY environment;

-- Check for anomalies (Manual vs Git managed)
SELECT display_name, management_mode, detected_anomalies 
FROM products 
WHERE management_mode = 'TERRAFORM_MANAGED';
```
