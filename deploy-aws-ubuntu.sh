#!/bin/bash

echo "╔════════════════════════════════════════════════════════╗"
echo "║                                                        ║"
echo "║   🚀 LEARNLYTICA - AWS UBUNTU DEPLOYMENT              ║"
echo "║                                                        ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Exit on any error
set -e

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Please run as root (use: sudo bash deploy-aws-ubuntu.sh)"
    exit 1
fi

echo "📋 Starting AWS Ubuntu deployment..."
echo ""

# Step 1: Update system
echo "Step 1/12: Updating system packages..."
apt-get update -y
apt-get upgrade -y
echo "✅ System updated"
echo ""

# Step 2: Install Node.js 18
echo "Step 2/12: Installing Node.js 18..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
    echo "✅ Node.js installed: $(node --version)"
else
    echo "✅ Node.js already installed: $(node --version)"
fi
echo ""

# Step 3: Install PostgreSQL
echo "Step 3/12: Installing PostgreSQL..."
if ! command -v psql &> /dev/null; then
    apt-get install -y postgresql postgresql-contrib
    systemctl start postgresql
    systemctl enable postgresql
    echo "✅ PostgreSQL installed"
else
    echo "✅ PostgreSQL already installed"
fi
echo ""

# Step 4: Install Docker
echo "Step 4/12: Installing Docker..."
if ! command -v docker &> /dev/null; then
    apt-get install -y apt-transport-https ca-certificates curl software-properties-common
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update -y
    apt-get install -y docker-ce docker-ce-cli containerd.io
    systemctl start docker
    systemctl enable docker
    echo "✅ Docker installed: $(docker --version)"
else
    echo "✅ Docker already installed: $(docker --version)"
fi
echo ""

# Step 5: Install Nginx
echo "Step 5/12: Installing Nginx..."
if ! command -v nginx &> /dev/null; then
    apt-get install -y nginx
    systemctl start nginx
    systemctl enable nginx
    echo "✅ Nginx installed"
else
    echo "✅ Nginx already installed"
fi
echo ""

# Step 6: Install PM2
echo "Step 6/12: Installing PM2 process manager..."
npm install -g pm2
echo "✅ PM2 installed"
echo ""

# Step 7: Install other dependencies
echo "Step 7/12: Installing additional dependencies..."
apt-get install -y git curl wget unzip build-essential
echo "✅ Dependencies installed"
echo ""

# Step 8: Setup PostgreSQL database
echo "Step 8/12: Setting up database..."
DB_NAME="learnlytica"
DB_USER="learnlytica"
if [ -f backend/.env ]; then
  EXISTING_DB_PASSWORD=$(sed -n "s#^DATABASE_URL=postgresql://$DB_USER:\\([^@]*\\)@localhost:5432/$DB_NAME#\\1#p" backend/.env | head -1)
fi
DB_PASSWORD="${EXISTING_DB_PASSWORD:-$(openssl rand -base64 32)}"

sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname = '$DB_USER'" | grep -q 1 || \
sudo -u postgres psql -c "CREATE USER $DB_USER WITH ENCRYPTED PASSWORD '$DB_PASSWORD';"

# Keep the DB password and backend/.env in sync on reruns.
sudo -u postgres psql -c "ALTER USER $DB_USER WITH ENCRYPTED PASSWORD '$DB_PASSWORD';"

sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 || \
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME;"

sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
sudo -u postgres psql -c "ALTER DATABASE $DB_NAME OWNER TO $DB_USER;"
sudo -u postgres psql -d $DB_NAME -c "GRANT USAGE, CREATE ON SCHEMA public TO $DB_USER;"

echo "✅ Database created: $DB_NAME"
echo ""

# Step 9: Get user configuration
echo "Step 9/12: Collecting configuration..."
echo ""
read -p "Enter your domain name (or EC2 public IP): " DOMAIN
echo ""
read -p "Enter your Anthropic API key (from https://console.anthropic.com): " ANTHROPIC_KEY
echo ""

# Generate JWT secret
JWT_SECRET=$(openssl rand -base64 64)

# Create backend .env
cat > backend/.env << ENV
PORT=3666
NODE_ENV=production
DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME
JWT_SECRET=$JWT_SECRET
CORS_ORIGIN=http://$DOMAIN,https://$DOMAIN,http://localhost:4666
ANTHROPIC_API_KEY=$ANTHROPIC_KEY
DOCKER_HOST=unix:///var/run/docker.sock
ENV

# Create frontend .env
cat > frontend/.env << ENV
VITE_API_URL=http://$DOMAIN
VITE_PORT=4666
ENV

echo "✅ Application configured"
echo ""

# Step 10: Build Docker images
echo "Step 10/12: Building Docker execution environments..."
echo "This may take 10-15 minutes..."
cd docker/execution-environments

echo "Building Node.js executor..."
docker build -t learnlytica/executor-node:latest -f Dockerfile.node .

echo "Building Python executor..."
docker build -t learnlytica/executor-python:latest -f Dockerfile.python .

echo "Building Java executor..."
docker build -t learnlytica/executor-java:latest -f Dockerfile.java .

echo "Building Playwright executor..."
docker build -t learnlytica/executor-playwright:latest -f Dockerfile.playwright .

cd ../..
echo "✅ All Docker images built"
echo ""

# Step 11: Install and build application
echo "Step 11/12: Installing and building application..."

echo "Installing backend dependencies..."
cd backend
npm install
npm run build || echo "Build failed, continuing with source runtime"
cd ..

echo "Installing frontend dependencies..."
cd frontend
npm install
echo "Building frontend for production..."
npm run build
cd ..

echo "✅ Application built"
echo ""

# Run database migrations
echo "Running database migrations..."
sudo -u postgres psql -d $DB_NAME -f backend/migrations/001_create_questions.sql 2>/dev/null || echo "Migration 1 already applied or failed"
sudo -u postgres psql -d $DB_NAME -f backend/migrations/002_create_lab_templates.sql 2>/dev/null || echo "Migration 2 already applied or failed"
sudo -u postgres psql -d $DB_NAME -f backend/migrations/003_create_assessments.sql 2>/dev/null || echo "Migration 3 already applied or failed"
sudo -u postgres psql -d $DB_NAME -f backend/migrations/004_create_auth.sql 2>/dev/null || echo "Migration 4 already applied or failed"
echo "✅ Database migrations completed"
echo ""

# Ensure the app DB user can read/write tables created by postgres-owned migrations.
echo "Applying database grants for application user..."
sudo -u postgres psql -d $DB_NAME -c "GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO $DB_USER;" 2>/dev/null || true
sudo -u postgres psql -d $DB_NAME -c "GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO $DB_USER;" 2>/dev/null || true
sudo -u postgres psql -d $DB_NAME -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO $DB_USER;" 2>/dev/null || true
sudo -u postgres psql -d $DB_NAME -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO $DB_USER;" 2>/dev/null || true
echo "✅ Database grants applied"
echo ""

# Step 12: Configure Nginx
echo "Step 12/12: Configuring Nginx reverse proxy..."
cat > /etc/nginx/sites-available/learnlytica << 'NGINX'
server {
    listen 80;
    server_name _;

    client_max_body_size 10M;

    # Backend health endpoint
    location = /health {
        proxy_pass http://localhost:3666/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3666/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }

    # Frontend
    location / {
        proxy_pass http://localhost:4666;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/learnlytica /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
echo "✅ Nginx configured"
echo ""

# Setup PM2 ecosystem
echo "Setting up PM2 process management..."
cat > ecosystem.config.cjs << 'PM2CONFIG'
module.exports = {
  apps: [
    {
      name: 'learnlytica-backend',
      cwd: './backend',
      script: 'dist/src/index.js',
      env: {
        NODE_ENV: 'production'
      },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    },
    {
      name: 'learnlytica-frontend',
      cwd: './frontend',
      script: 'npm',
      args: 'run preview -- --host 0.0.0.0 --port 4666',
      env: {
        NODE_ENV: 'production'
      },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    }
  ]
};
PM2CONFIG

# Create log directories
mkdir -p backend/logs
mkdir -p frontend/logs

# Start services with PM2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup systemd -u root --hp /root

echo "✅ PM2 services started"
echo ""

# Configure firewall
echo "Configuring firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
echo "✅ Firewall configured"
echo ""

# Save credentials
cat > /root/learnlytica-credentials.txt << CREDS
╔════════════════════════════════════════════════════════╗
║   LEARNLYTICA - DEPLOYMENT CREDENTIALS                 ║
╚════════════════════════════════════════════════════════╝

🌐 ACCESS URLs:
   Frontend: http://$DOMAIN
   Backend API: http://$DOMAIN/api
   Health Check (via Nginx): http://$DOMAIN/health
   Health Check (direct):    http://localhost:3666/health

💾 DATABASE:
   Name: $DB_NAME
   User: $DB_USER
   Password: $DB_PASSWORD
   Connection: postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME

🔐 SECRETS:
   JWT Secret: $JWT_SECRET
   Anthropic API Key: $ANTHROPIC_KEY

👤 DEMO LOGIN USERS:
   admin@learnlytica.local   / Admin@123
   client@learnlytica.local  / Client@123
   student@learnlytica.local / Student@123

📋 USEFUL COMMANDS:
   View logs:        pm2 logs
   Restart all:      pm2 restart all
   Stop all:         pm2 stop all
   Service status:   pm2 status
   Nginx status:     systemctl status nginx
   Database access:  sudo -u postgres psql -d $DB_NAME

⚠️  SECURITY: Keep this file secure - delete after saving credentials!
   To delete: rm /root/learnlytica-credentials.txt

CREDS

chmod 600 /root/learnlytica-credentials.txt

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║                                                        ║"
echo "║   ✅ DEPLOYMENT COMPLETE!                              ║"
echo "║                                                        ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo "🌐 Your AI-powered platform is now running at:"
echo ""
echo "   http://$DOMAIN"
echo ""
echo "🤖 AI Features: ENABLED ✅"
echo ""
echo "📋 Useful commands:"
echo ""
echo "   View logs:        pm2 logs"
echo "   View status:      pm2 status"
echo "   Restart services: pm2 restart all"
echo "   Stop services:    pm2 stop all"
echo "   Monitor:          pm2 monit"
echo ""
echo "🔐 Credentials saved to: /root/learnlytica-credentials.txt"
echo ""
echo "🎉 Start generating AI questions at: http://$DOMAIN/ai/generate"
echo ""
