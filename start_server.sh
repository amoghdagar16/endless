#!/bin/bash

# AI Accounting Backend Server Startup Script
# This script ensures the correct Python path is used

cd /Users/atimanr/AI_accounting/v21.1/backend

echo "Killing any existing uvicorn processes..."
pkill -f uvicorn 2>/dev/null
sleep 2

echo "Clearing Python cache..."
find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null
find . -name "*.pyc" -delete 2>/dev/null

echo "Starting backend server..."
echo "Server will be available at: http://0.0.0.0:8000"
echo "API docs at: http://127.0.0.1:8000/docs"
echo ""

PYTHONPATH=/Users/atimanr/AI_accounting/v21.1/backend \
  /Users/atimanr/AI_accounting/v21.1/.venv/bin/uvicorn \
  app.main:app \
  --host 0.0.0.0 \
  --port 8000 \
  --reload
