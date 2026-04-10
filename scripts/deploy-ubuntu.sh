#!/bin/bash
set -e

echo "Starting deployment workflow..."

# 1. Update system packages
echo "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# 2. Install build essentials (needed for better-sqlite3)
echo "Installing build tools..."
sudo apt install -y build-essential python3 curl git

# 3. Install Node.js 20 (LTS) if not installed
if ! command -v node &> /dev/null || [[ $(node -v) != v20* ]]; then
    echo "Installing Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
else
    echo "Node.js 20 is already installed."
fi

# 4. Install PM2 process manager globally
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    sudo npm install -g pm2
fi

# 5. Install pnpm globally
if ! command -v pnpm &> /dev/null; then
    echo "Installing pnpm..."
    sudo npm install -g pnpm
fi

# 6. Install project dependencies
echo "Installing project dependencies..."
pnpm install

# 7. Build the frontend and backend (if needed)
echo "Building the application..."
pnpm run build

# 8. Start or restart the application using PM2
echo "Starting the application with PM2..."
# We run the compiled API server directly using tsx or node if it was compiled.
# Wait, let's use the local tsx via npx or pnpm to run the index.ts
pm2 describe asset-manager > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "Restarting existing PM2 process..."
    pm2 restart asset-manager
else
    echo "Starting new PM2 process..."
    # Start the unified server on port 80 (requires sudo or port forwarding, let's stick to 8080 or use authbind)
    # Using default port 8080 for now
    PORT=8080 pm2 start "pnpm --filter @workspace/api-server run dev" --name "asset-manager"
fi

# Save PM2 process list so it starts on boot
pm2 save
sudo pm2 startup systemd -u $USER --hp $HOME || true

echo "Deployment completed successfully!"
echo "Your application should be running on port 8080."
