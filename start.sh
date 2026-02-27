#!/bin/sh
# Startup script for Railway deployment

# Use PORT environment variable or default to 8000
PORT=${PORT:-8000}

echo "Starting server on port $PORT"
exec uvicorn main:app --host 0.0.0.0 --port $PORT

BACKEND_PID=$!

echo "Starting frontend dev server..."
cd frontend || exit 1
npm run dev &

FRONTEND_PID=$!

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
