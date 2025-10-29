#!/bin/bash

# Script to kill processes listening on ports 3000-3009
# Usage: ./kill_ports.sh

echo "🔍 Checking ports 3000-3009 for running processes..."

PIDS_TO_KILL=()

for port in {3000..3009}; do
    # Check if port is in use
    PROCESS_INFO=$(lsof -i :$port 2>/dev/null)

    if [ $? -eq 0 ] && [ ! -z "$PROCESS_INFO" ]; then
        # Extract PID from the output (skip header line)
        PID=$(echo "$PROCESS_INFO" | tail -n +2 | awk '{print $2}' | head -n1)

        if [ ! -z "$PID" ]; then
            PROCESS_NAME=$(echo "$PROCESS_INFO" | tail -n +2 | awk '{print $1}' | head -n1)
            echo "📍 Port $port: $PROCESS_NAME (PID: $PID)"
            PIDS_TO_KILL+=("$PID")
        fi
    else
        echo "✅ Port $port: Free"
    fi
done

if [ ${#PIDS_TO_KILL[@]} -eq 0 ]; then
    echo ""
    echo "🎉 No processes found on ports 3000-3009. All ports are free!"
    exit 0
fi

echo ""
echo "⚠️  Found ${#PIDS_TO_KILL[@]} process(es) to kill."
echo "Processes to be killed:"
printf '  - PID: %s\n' "${PIDS_TO_KILL[@]}"
echo ""

read -p "❓ Do you want to kill these processes? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Operation cancelled."
    exit 1
fi

echo "🔪 Killing processes..."
for pid in "${PIDS_TO_KILL[@]}"; do
    if kill -9 "$pid" 2>/dev/null; then
        echo "✅ Killed process with PID: $pid"
    else
        echo "❌ Failed to kill process with PID: $pid"
    fi
done

echo ""
echo "⏳ Waiting 2 seconds for processes to terminate..."
sleep 2

echo ""
echo "🔍 Verifying ports are now free..."
for port in {3000..3009}; do
    if lsof -i :$port >/dev/null 2>&1; then
        echo "❌ Port $port: Still in use"
    else
        echo "✅ Port $port: Free"
    fi
done

echo ""
echo "🎉 Port cleanup completed!"
