#!/bin/bash
curl -v -X POST http://localhost:3001/api/v1/analyze \
  -H "Content-Type: application/json" \
  -d @repro_payload.json
