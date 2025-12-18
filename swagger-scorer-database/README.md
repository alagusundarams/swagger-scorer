# Swagger Scorer Database

PostgreSQL database for the Swagger Scorer application.

## Prerequisites

- Docker installed and running

## Quick Start

### Mac/Linux
```bash
cp .env.example .env
./scripts/start.sh
```

### Windows
```powershell
Copy-Item .env.example .env
.\scripts\start.ps1
```

## Connection Details

| Property | Value |
|----------|-------|
| Host | localhost |
| Port | 5432 |
| Database | swagger_scorer |
| User | scorer |
| Password | scorer_dev |

## Connection String

```
postgresql://scorer:scorer_dev@localhost:5432/swagger_scorer
```

## Commands

```bash
# Start
docker-compose up -d

# Stop
docker-compose down

# Stop and remove data
docker-compose down -v

# View logs
docker-compose logs -f
```
