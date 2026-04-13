#!/bin/sh
# Startup script for Railway deployment

# Use PORT environment variable or default to 8000
PORT=${PORT:-8000}

echo "Starting server on port $PORT"
exec uvicorn main:app --host 0.0.0.0 --port $PORT
