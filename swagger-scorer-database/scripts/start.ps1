# Start PostgreSQL container (Windows)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location "$scriptDir\.."
docker-compose up -d
Write-Host "PostgreSQL started on localhost:5432"
Write-Host "Database: swagger_scorer"
Write-Host "User: scorer"
