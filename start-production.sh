#!/bin/bash

echo "╔════════════════════════════════════════════════════════╗"
echo "║                                                        ║"
echo "║   🚀 STARTING LEARNLYTICA PLATFORM                     ║"
echo "║                                                        ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Start backend
echo "🔧 Starting backend (port 3666)..."
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

# Wait for backend
echo "⏳ Waiting for backend to start..."
sleep 5

# Start frontend
echo "🎨 Starting frontend (port 4666)..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║                                                        ║"
echo "║   ✅ LEARNLYTICA PLATFORM IS RUNNING!                  ║"
echo "║                                                        ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo "🌐 Frontend: http://localhost:4666"
echo "🔌 Backend:  http://localhost:3666"
echo ""
echo "🤖 AI Features: ${ANTHROPIC_API_KEY:+ENABLED ✅}${ANTHROPIC_API_KEY:-DISABLED (set ANTHROPIC_API_KEY)}"
echo ""
echo "Press Ctrl+C to stop"
echo ""

# Wait for processes
wait $BACKEND_PID $FRONTEND_PID
