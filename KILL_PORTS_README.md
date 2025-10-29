# Port Killing Scripts

This directory contains scripts to easily kill processes listening on specific ports, particularly useful for development environments.

## Scripts Overview

### 1. `bin/kill_ports.sh` - Interactive Basic Script
**Purpose:** Kill processes on ports 3000-3009 with confirmation

**Usage:**
```bash
./bin/kill_ports.sh
```

**Features:**
- Checks ports 3000-3009
- Shows detailed process information
- Asks for confirmation before killing
- Verifies ports are freed after killing

### 2. `bin/kill_ports_advanced.sh` - Advanced Configurable Script
**Purpose:** Kill processes on any port range with advanced options

**Usage:**
```bash
# Default: ports 3000-3009
./bin/kill_ports_advanced.sh

# Custom port range
./bin/kill_ports_advanced.sh 8000 8010

# Force mode (no confirmation)
./bin/kill_ports_advanced.sh 3000 3009 --force
```

**Features:**
- Configurable port range
- Force mode for automation
- Detailed process information with user names
- Comprehensive summary report
- Input validation

### 3. `bin/kill_ports_function.sh` - Shell Functions
**Purpose:** Functions to add to your shell configuration

**Installation:**
Add this line to your `~/.bashrc` or `~/.zshrc`:
```bash
source /path/to/your/project/bin/kill_ports_function.sh
```

**Usage:**
```bash
# Kill ports 3000-3009 (default)
killports

# Kill custom port range
killports 8000 8010

# Quick aliases for common ranges
kill3000  # Kill 3000-3009
kill8000  # Kill 8000-8009
kill9000  # Kill 9000-9009
```

## Examples

### Basic Usage
```bash
# Check and kill processes on default ports
./kill_ports.sh

# Output:
# 🔍 Checking ports 3000-3009 for running processes...
# 📍 Port 3001: node (PID: 12345)
# 📍 Port 3002: node (PID: 12346)
# ✅ Port 3000: Free
# ...
#
# ⚠️  Found 2 process(es) to kill.
# ❓ Do you want to kill these processes? (y/N): y
#
# 🔪 Killing processes...
# ✅ Killed process with PID: 12345
# ✅ Killed process with PID: 12346
# ...
```

### Advanced Usage
```bash
# Kill processes on ports 8000-8010 without confirmation
./kill_ports_advanced.sh 8000 8010 --force

# Output:
# 🔍 Checking ports 8000-8010 for running processes...
# 📍 Port 8001: python (PID: 23456, User: mraubo)
# ✅ Port 8000: Free
# ...
#
# 🔪 Force mode enabled - killing without confirmation...
# 🔪 Killing processes...
# ✅ Killed process with PID: 23456
# ...
```

### Function Usage
```bash
# After adding to shell config
killports 4000 4005

# Output:
# 🔍 Checking ports 4000-4005...
# 📍 Port 4001: node (PID: 34567)
# 🔪 Killing 1 process(es)...
# ✅ Killed PID: 34567
# 🔍 Verification:
# ✅ Port 4001: Freed
```

## Safety Features

- **Confirmation prompts** prevent accidental process killing
- **Input validation** ensures valid port ranges
- **Process verification** confirms successful termination
- **Detailed logging** shows exactly what's happening
- **Force mode available** for automation scripts

## Requirements

- `lsof` command (usually pre-installed on macOS/Linux)
- Bash shell
- Appropriate permissions to kill processes

## Troubleshooting

### Permission Denied
If you get "Permission denied" when killing processes, try:
```bash
sudo ./bin/kill_ports.sh
```

### Command Not Found
Make sure the scripts are executable:
```bash
chmod +x bin/kill_ports.sh bin/kill_ports_advanced.sh
```

### lsof Not Available
On some systems, you might need to install `lsof`:
```bash
# macOS
brew install lsof

# Ubuntu/Debian
sudo apt-get install lsof

# CentOS/RHEL
sudo yum install lsof
```
