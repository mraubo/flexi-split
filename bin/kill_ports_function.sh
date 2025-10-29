# Function to kill processes on ports (add to ~/.bashrc or ~/.zshrc)
# Usage: killports [start_port] [end_port]
# Example: killports 3000 3009
# Default: 3000 3009

killports() {
    local START_PORT=${1:-3000}
    local END_PORT=${2:-3009}

    # Validate input
    if ! [[ "$START_PORT" =~ ^[0-9]+$ ]] || ! [[ "$END_PORT" =~ ^[0-9]+$ ]]; then
        echo "❌ Error: Ports must be numeric"
        return 1
    fi

    if [ "$START_PORT" -gt "$END_PORT" ]; then
        echo "❌ Error: Start port must be less than or equal to end port"
        return 1
    fi

    echo "🔍 Checking ports $START_PORT-$END_PORT..."

    local PIDS_TO_KILL=()
    local PORTS_WITH_PROCESSES=()

    for port in $(seq $START_PORT $END_PORT); do
        if lsof -i :$port >/dev/null 2>&1; then
            local PID=$(lsof -ti :$port)
            if [ ! -z "$PID" ]; then
                PIDS_TO_KILL+=("$PID")
                PORTS_WITH_PROCESSES+=("$port")
                echo "📍 Port $port: PID $PID"
            fi
        fi
    done

    if [ ${#PIDS_TO_KILL[@]} -eq 0 ]; then
        echo "✅ All ports $START_PORT-$END_PORT are free!"
        return 0
    fi

    echo ""
    echo "🔪 Killing ${#PIDS_TO_KILL[@]} process(es)..."
    for pid in "${PIDS_TO_KILL[@]}"; do
        if kill -9 "$pid" 2>/dev/null; then
            echo "✅ Killed PID: $pid"
        else
            echo "❌ Failed to kill PID: $pid"
        fi
    done

    sleep 1
    echo ""
    echo "🔍 Verification:"
    for port in "${PORTS_WITH_PROCESSES[@]}"; do
        if lsof -i :$port >/dev/null 2>&1; then
            echo "❌ Port $port: Still in use"
        else
            echo "✅ Port $port: Freed"
        fi
    done
}

# Quick aliases for common port ranges
alias kill3000='killports 3000 3009'  # Kill ports 3000-3009
alias kill8000='killports 8000 8009'  # Kill ports 8000-8009
alias kill9000='killports 9000 9009'  # Kill ports 9000-9009
