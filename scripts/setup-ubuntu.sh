#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "========================================="
echo "  Asset Manager - Ubuntu Setup & Deploy  "
echo "========================================="

# 1. Update system and install basic dependencies
echo "[1/6] Updating system and installing build tools..."
sudo apt-update -y
sudo apt install -y curl git build-essential python3

# 2. Install Node.js 20 (if not installed)
if ! command -v node > /dev/null; then
    echo "[2/6] Installing Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo "[2/6] Node.js is already installed. Version: $(node -v)"
fi

# 3. Install pnpm and pm2 globally
echo "[3/6] Installing global npm packages (pnpm, pm2)..."
sudo npm install -g pnpm pm2 tsx

# 4. Install project dependencies
echo "[4/6] Installing project dependencies..."
pnpm install --ignore-scripts
# Rebuild better-sqlite3 specifically for the Ubuntu architecture
npm run install --prefix node_modules/.pnpm/better-sqlite3@11.10.0/node_modules/better-sqlite3

# 5. Build the application (Frontend & Backend)
echo "[5/6] Building the application..."
pnpm run build

# 6. Start or Restart the application with PM2
echo "[6/6] Starting the application with PM2..."
pm2 stop asset-manager || true
pm2 start artifacts/api-server/src/index.ts --interpreter tsx --name asset-manager

# Save PM2 list so it restarts on server reboot
pm2 save
pm2 startup | grep "sudo" | bash || true

echo "========================================="
echo "  Deployment Complete!                   "
echo "  Your app is running on port 8080       "
echo "  To view logs, run: pm2 logs            "
echo "========================================="
