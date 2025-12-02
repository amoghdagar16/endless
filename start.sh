#!/bin/bash

# Start Backend and Frontend servers

echo "🚀 Starting AI Financial Companion..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found in backend directory"
    echo "Please create .env with SUPABASE_URL and SUPABASE_KEY"
    exit 1
fi

# Start backend in background
echo "📦 Starting backend server (port 8000)..."
cd "$(dirname "$0")"
source venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
echo "✅ Backend started (PID: $BACKEND_PID)"

# Wait a moment for backend to start
sleep 2

# Start frontend in background
echo "🎨 Starting frontend server (port 3000)..."
cd frontend
npm run dev &
FRONTEND_PID=$!
echo "✅ Frontend started (PID: $FRONTEND_PID)"

echo ""
echo "✨ Both servers are running!"
echo "   Backend:  http://localhost:8000"
echo "   Frontend: http://localhost:3000"
echo "   API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop both servers"
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"

# Wait for user interrupt
wait





