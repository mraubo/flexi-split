#!/bin/bash

# Advanced script to kill processes on specified ports
# Usage: ./kill_ports_advanced.sh [start_port] [end_port]
# Example: ./kill_ports_advanced.sh 3000 3009
# Default: 3000 3009

START_PORT=${1:-3000}
END_PORT=${2:-3009}

# Validate input
if ! [[ "$START_PORT" =~ ^[0-9]+$ ]] || ! [[ "$END_PORT" =~ ^[0-9]+$ ]]; then
    echo "❌ Error: Ports must be numeric"
    echo "Usage: $0 [start_port] [end_port]"
    exit 1
fi

if [ "$START_PORT" -gt "$END_PORT" ]; then
    echo "❌ Error: Start port must be less than or equal to end port"
    exit 1
fi

if [ "$START_PORT" -lt 1 ] || [ "$END_PORT" -gt 65535 ]; then
    echo "❌ Error: Ports must be between 1 and 65535"
    exit 1
fi

echo "🔍 Checking ports $START_PORT-$END_PORT for running processes..."

PIDS_TO_KILL=()
PROCESSES_INFO=()

for port in $(seq $START_PORT $END_PORT); do
    PROCESS_INFO=$(lsof -i :$port 2>/dev/null)

    if [ $? -eq 0 ] && [ ! -z "$PROCESS_INFO" ]; then
        PID=$(echo "$PROCESS_INFO" | tail -n +2 | awk '{print $2}' | head -n1)
        PROCESS_NAME=$(echo "$PROCESS_INFO" | tail -n +2 | awk '{print $1}' | head -n1)
        USER=$(echo "$PROCESS_INFO" | tail -n +2 | awk '{print $3}' | head -n1)

        if [ ! -z "$PID" ]; then
            echo "📍 Port $port: $PROCESS_NAME (PID: $PID, User: $USER)"
            PIDS_TO_KILL+=("$PID")
            PROCESSES_INFO+=("$port:$PROCESS_NAME:$PID:$USER")
        fi
    else
        echo "✅ Port $port: Free"
    fi
done

if [ ${#PIDS_TO_KILL[@]} -eq 0 ]; then
    echo ""
    echo "🎉 No processes found on ports $START_PORT-$END_PORT. All ports are free!"
    exit 0
fi

echo ""
echo "⚠️  Found ${#PIDS_TO_KILL[@]} process(es) to kill."
echo "Processes to be killed:"
for info in "${PROCESSES_INFO[@]}"; do
    IFS=':' read -r port name pid user <<< "$info"
    echo "  - Port $port: $name (PID: $pid, User: $user)"
done
echo ""

# Force mode check
FORCE_MODE=false
if [ "$3" = "--force" ] || [ "$3" = "-f" ]; then
    FORCE_MODE=true
    echo "🔪 Force mode enabled - killing without confirmation..."
else
    read -p "❓ Do you want to kill these processes? (y/N): " -n 1 -r
    echo ""

    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Operation cancelled."
        exit 1
    fi
fi

echo "🔪 Killing processes..."
FAILED_KILLS=()
for pid in "${PIDS_TO_KILL[@]}"; do
    if kill -9 "$pid" 2>/dev/null; then
        echo "✅ Killed process with PID: $pid"
    else
        echo "❌ Failed to kill process with PID: $pid"
        FAILED_KILLS+=("$pid")
    fi
done

echo ""
echo "⏳ Waiting 2 seconds for processes to terminate..."
sleep 2

echo ""
echo "🔍 Verifying ports are now free..."
FREED_PORTS=0
STILL_USED=0

for port in $(seq $START_PORT $END_PORT); do
    if lsof -i :$port >/dev/null 2>&1; then
        echo "❌ Port $port: Still in use"
        ((STILL_USED++))
    else
        echo "✅ Port $port: Free"
        ((FREED_PORTS++))
    fi
done

echo ""
echo "📊 Summary:"
echo "  - Ports checked: $((END_PORT - START_PORT + 1))"
echo "  - Processes killed: ${#PIDS_TO_KILL[@]}"
if [ ${#FAILED_KILLS[@]} -gt 0 ]; then
    echo "  - Failed to kill: ${#FAILED_KILLS[@]}"
fi
echo "  - Ports freed: $FREED_PORTS"
echo "  - Ports still in use: $STILL_USED"

if [ $STILL_USED -eq 0 ]; then
    echo "🎉 All ports are now free!"
else
    echo "⚠️  Some ports are still in use. You may need to run the script again or check manually."
fi
