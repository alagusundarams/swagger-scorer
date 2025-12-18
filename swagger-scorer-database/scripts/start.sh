#!/bin/bash
# Start PostgreSQL container (Mac/Linux)

cd "$(dirname "$0")/.."
docker-compose up -d
echo "PostgreSQL started on localhost:5432"
echo "Database: swagger_scorer"
echo "User: scorer"
