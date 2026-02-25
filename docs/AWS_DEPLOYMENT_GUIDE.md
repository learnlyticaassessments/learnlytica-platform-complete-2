# ☁️ AWS UBUNTU DEPLOYMENT GUIDE

## 🚀 **DEPLOY TO AWS IN 20 MINUTES**

Complete guide to deploy Learnlytica on AWS Ubuntu.

---

## 📋 **PREREQUISITES**

### **AWS Resources Needed:**
```
✅ EC2 Instance (t3.medium or larger recommended)
✅ Ubuntu 22.04 LTS or 20.04 LTS
✅ At least 20GB storage
✅ Security group allowing ports: 22, 80, 443
✅ Elastic IP (optional but recommended)
```

### **Recommended EC2 Instance:**
```
Instance Type: t3.medium (2 vCPU, 4GB RAM)
Storage: 30GB SSD
OS: Ubuntu 22.04 LTS
Region: Any (us-east-1, us-west-2, etc.)
```

---

## 🎯 **QUICK DEPLOYMENT (20 MINUTES)**

### **Step 1: Launch EC2 Instance (5 min)**

```bash
# 1. Go to AWS Console → EC2 → Launch Instance

# 2. Configure:
   Name: learnlytica-prod
   OS: Ubuntu 22.04 LTS
   Instance Type: t3.medium
   Storage: 30GB gp3
   
# 3. Security Group:
   SSH (22) - Your IP
   HTTP (80) - 0.0.0.0/0
   HTTPS (443) - 0.0.0.0/0

# 4. Create or select key pair
# 5. Launch instance
# 6. Note the Public IP address
```

### **Step 2: Connect to Instance (2 min)**

```bash
# Download your key pair (yourkey.pem)
chmod 400 yourkey.pem

# Connect via SSH
ssh -i yourkey.pem ubuntu@YOUR_EC2_PUBLIC_IP
```

### **Step 3: Upload Package (3 min)**

```bash
# On your local machine, upload the package:
scp -i yourkey.pem learnlytica-FINAL-AI-PRODUCTION.zip ubuntu@YOUR_EC2_PUBLIC_IP:~

# On EC2 instance, extract:
cd ~
sudo apt-get update
sudo apt-get install -y unzip
unzip learnlytica-FINAL-AI-PRODUCTION.zip
cd learnlytica-platform-complete
```

### **Step 4: Run Deployment Script (10 min)**

```bash
# Run the automated deployment
sudo bash deploy-aws-ubuntu.sh

# Follow prompts:
# 1. Enter your domain or EC2 public IP
# 2. Enter your Anthropic API key
# 3. Wait for completion
```

### **Step 5: Verify Deployment (1 min)**

```bash
# Check service status
pm2 status

# Check logs
pm2 logs --lines 50

# Test health endpoint
curl http://localhost:3666/health

# Expected response:
# {"status":"ok","aiEnabled":true}
```

### **Step 6: Access Platform (1 min)**

```
Open browser: http://YOUR_EC2_PUBLIC_IP

You should see the Learnlytica platform! 🎉
```

---

## 📝 **DETAILED STEP-BY-STEP**

### **Launch EC2 Instance (Detailed)**

1. **Go to AWS Console**
   ```
   Services → EC2 → Instances → Launch Instance
   ```

2. **Name and Tags**
   ```
   Name: learnlytica-production
   Environment: production
   ```

3. **AMI Selection**
   ```
   Ubuntu Server 22.04 LTS (HVM), SSD Volume Type
   64-bit (x86)
   ```

4. **Instance Type**
   ```
   Recommended: t3.medium (2 vCPU, 4 GB RAM)
   Minimum: t3.small (2 vCPU, 2 GB RAM)
   ```

5. **Key Pair**
   ```
   Create new key pair: learnlytica-key
   Type: RSA
   Format: .pem
   Download and save securely
   ```

6. **Network Settings**
   ```
   VPC: Default VPC
   Subnet: No preference
   Auto-assign public IP: Enable
   ```

7. **Configure Security Group**
   ```
   Create new security group: learnlytica-sg
   
   Inbound Rules:
   - Type: SSH, Port: 22, Source: My IP
   - Type: HTTP, Port: 80, Source: 0.0.0.0/0
   - Type: HTTPS, Port: 443, Source: 0.0.0.0/0
   ```

8. **Configure Storage**
   ```
   Root volume:
   - Size: 30 GB
   - Type: gp3
   - Encryption: Default
   ```

9. **Launch Instance**
   ```
   Review → Launch
   Wait for instance to be "Running"
   Note the Public IPv4 address
   ```

---

## 🔐 **SECURITY CONFIGURATION**

### **Update Security Group:**

```bash
# Allow only necessary ports
Port 22 (SSH): Your IP only (for security)
Port 80 (HTTP): 0.0.0.0/0 (public access)
Port 443 (HTTPS): 0.0.0.0/0 (public access)

# Block all other ports
```

### **Setup Elastic IP (Optional but Recommended):**

```bash
# In AWS Console:
1. EC2 → Elastic IPs → Allocate Elastic IP
2. Actions → Associate Elastic IP address
3. Select your instance
4. Associate

# Benefits:
- IP doesn't change on restart
- Professional setup
- Can point domain to this IP
```

---

## 🌐 **DOMAIN SETUP (OPTIONAL)**

### **Point Domain to EC2:**

```bash
# If you have a domain (e.g., learnlytica.com):

1. Go to your domain registrar (GoDaddy, Namecheap, etc.)
2. Add A record:
   Type: A
   Host: @ (or subdomain like 'app')
   Value: YOUR_EC2_IP
   TTL: 3600

3. Wait 5-30 minutes for DNS propagation

4. Update deployment:
   - When script asks for domain, enter: learnlytica.com
   - Update backend/.env CORS_ORIGIN
   - Update frontend/.env VITE_API_URL
   - Restart: pm2 restart all
```

---

## 🔒 **SSL CERTIFICATE (HTTPS)**

### **Setup Free SSL with Let's Encrypt:**

```bash
# After deployment, run:
sudo apt-get install -y certbot python3-certbot-nginx

# Get certificate (replace with your domain):
sudo certbot --nginx -d yourdomain.com

# Follow prompts:
# 1. Enter email
# 2. Agree to terms
# 3. Choose: Redirect HTTP to HTTPS (option 2)

# Auto-renewal is configured automatically
# Test renewal:
sudo certbot renew --dry-run
```

---

## 📊 **MONITORING & MAINTENANCE**

### **Check Service Status:**

```bash
# PM2 status
pm2 status

# View logs
pm2 logs

# View specific service logs
pm2 logs learnlytica-backend
pm2 logs learnlytica-frontend

# Monitor in real-time
pm2 monit
```

### **Restart Services:**

```bash
# Restart all services
pm2 restart all

# Restart specific service
pm2 restart learnlytica-backend

# Reload (zero-downtime)
pm2 reload all
```

### **Database Management:**

```bash
# Connect to database
sudo -u postgres psql -d learnlytica

# Backup database
sudo -u postgres pg_dump learnlytica > backup_$(date +%Y%m%d).sql

# Restore database
sudo -u postgres psql -d learnlytica < backup_20240225.sql
```

### **View Logs:**

```bash
# Backend logs
tail -f backend/logs/backend-out.log
tail -f backend/logs/backend-error.log

# Frontend logs
tail -f frontend/logs/frontend-out.log

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

---

## 🚨 **TROUBLESHOOTING**

### **Issue: Services not starting**

```bash
# Check PM2 logs
pm2 logs --lines 100

# Check if ports are in use
sudo netstat -tulpn | grep 3666
sudo netstat -tulpn | grep 4666

# Restart services
pm2 restart all
```

### **Issue: Database connection failed**

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check database exists
sudo -u postgres psql -l | grep learnlytica

# Verify credentials in backend/.env
cat backend/.env | grep DATABASE_URL
```

### **Issue: Cannot access from browser**

```bash
# Check Nginx status
sudo systemctl status nginx

# Test Nginx configuration
sudo nginx -t

# Check firewall
sudo ufw status

# Verify security group in AWS Console
# Ensure port 80 is open to 0.0.0.0/0
```

### **Issue: AI generation not working**

```bash
# Check API key is set
cat backend/.env | grep ANTHROPIC_API_KEY

# Test API key
curl http://localhost:3666/health
# Should show: "aiEnabled": true

# Check backend logs
pm2 logs learnlytica-backend
```

---

## 💰 **AWS COSTS ESTIMATE**

### **Monthly Costs (US East):**

```
EC2 t3.medium:       ~$30/month
30GB EBS Storage:    ~$3/month
Elastic IP:          Free (if attached)
Data Transfer:       ~$5-10/month
Total:               ~$38-43/month

Anthropic API:       ~$30/month (1000 questions)

Grand Total:         ~$68-73/month
```

### **Cost Optimization:**

```
1. Use Reserved Instances (save 30-40%)
2. Use t3.small if <50 concurrent users
3. Enable auto-scaling for peak times only
4. Use S3 for file uploads (cheaper than EBS)
```

---

## ⚡ **PERFORMANCE OPTIMIZATION**

### **1. Enable Caching:**

```nginx
# Add to Nginx config:
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### **2. Enable Gzip Compression:**

```nginx
# Add to /etc/nginx/nginx.conf:
gzip on;
gzip_vary on;
gzip_types text/plain text/css application/json application/javascript;
gzip_min_length 1000;
```

### **3. Optimize PostgreSQL:**

```bash
sudo nano /etc/postgresql/14/main/postgresql.conf

# Update:
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 128MB
```

---

## 🔄 **BACKUP STRATEGY**

### **Automated Daily Backups:**

```bash
# Create backup script
cat > /root/backup-learnlytica.sh << 'BACKUP'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/root/backups"
mkdir -p $BACKUP_DIR

# Database backup
sudo -u postgres pg_dump learnlytica | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Keep only last 7 days
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +7 -delete

echo "Backup completed: db_$DATE.sql.gz"
BACKUP

chmod +x /root/backup-learnlytica.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add line:
0 2 * * * /root/backup-learnlytica.sh >> /var/log/backup.log 2>&1
```

---

## ✅ **POST-DEPLOYMENT CHECKLIST**

```
□ EC2 instance running
□ Services started (pm2 status shows running)
□ Can access http://YOUR_IP
□ Health check returns OK
□ Can generate AI question
□ Can create manual question
□ Can create assessment
□ Database working
□ Docker images built
□ Nginx configured
□ Firewall enabled
□ Credentials saved
□ Backups configured
□ SSL certificate (if using domain)
□ Monitoring setup
```

---

## 🎉 **SUCCESS!**

Your AI-powered assessment platform is now running on AWS!

**Access:** http://YOUR_EC2_IP  
**AI Generator:** http://YOUR_EC2_IP/ai/generate

**Generate your first AI question in 2 minutes!** 🤖🚀

---

*AWS Ubuntu Deployment Guide*
*Version: 1.0.0*
*Learnlytica Platform*
