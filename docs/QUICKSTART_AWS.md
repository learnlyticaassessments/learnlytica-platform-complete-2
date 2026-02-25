# ⚡ AWS DEPLOYMENT - QUICK START

## 🚀 **DEPLOY IN 3 COMMANDS**

### **Prerequisites:**
- AWS account
- EC2 instance running Ubuntu 22.04
- SSH access to instance

---

## 📋 **3-STEP DEPLOYMENT**

### **Step 1: Upload & Extract**
```bash
# On your local machine:
scp -i yourkey.pem learnlytica-FINAL-AI-PRODUCTION.zip ubuntu@YOUR_IP:~

# On EC2 instance:
sudo apt-get update && sudo apt-get install -y unzip
unzip learnlytica-FINAL-AI-PRODUCTION.zip
cd learnlytica-platform-complete
```

### **Step 2: Deploy**
```bash
sudo bash deploy-aws-ubuntu.sh
# Enter domain/IP when prompted
# Enter Anthropic API key when prompted
# Wait 15-20 minutes
```

### **Step 3: Access**
```
Open browser: http://YOUR_EC2_IP
```

**DONE! Platform running! 🎉**

---

## 🎯 **WHAT THE SCRIPT DOES**

```
✅ Installs Node.js 18
✅ Installs PostgreSQL
✅ Installs Docker
✅ Installs Nginx
✅ Installs PM2
✅ Creates database
✅ Builds Docker images (4 images)
✅ Installs dependencies
✅ Runs migrations
✅ Configures Nginx reverse proxy
✅ Starts services with PM2
✅ Configures firewall
✅ Saves credentials

Time: 15-20 minutes
Result: Fully running platform
```

---

## 📊 **EC2 REQUIREMENTS**

**Minimum:**
- Instance: t3.small
- vCPU: 2
- RAM: 2 GB
- Storage: 20 GB

**Recommended:**
- Instance: t3.medium
- vCPU: 2
- RAM: 4 GB
- Storage: 30 GB

**Security Group:**
- Port 22 (SSH): Your IP
- Port 80 (HTTP): 0.0.0.0/0
- Port 443 (HTTPS): 0.0.0.0/0

---

## 🔐 **AFTER DEPLOYMENT**

### **Credentials Location:**
```bash
cat /root/learnlytica-credentials.txt
```

### **Check Status:**
```bash
pm2 status
pm2 logs
```

### **Access Points:**
```
Frontend: http://YOUR_IP
Backend API: http://YOUR_IP/api
Health: http://YOUR_IP/health
AI Generator: http://YOUR_IP/ai/generate
```

---

## 🤖 **GENERATE FIRST AI QUESTION**

```
1. Go to: http://YOUR_IP/ai/generate
2. Enter: "Create a binary search algorithm question"
3. Select: JavaScript, Intermediate, Algorithm
4. Click: "Generate Question with AI"
5. Wait: 30-60 seconds
6. Review: Complete question with test cases
7. Click: "Create Question in Database"
8. Done! ✅
```

---

## 🆘 **TROUBLESHOOTING**

**Services not running?**
```bash
pm2 restart all
pm2 logs
```

**Can't access from browser?**
```bash
# Check security group in AWS Console
# Ensure port 80 is open to 0.0.0.0/0
```

**AI not working?**
```bash
# Check API key is set
cat backend/.env | grep ANTHROPIC_API_KEY
pm2 restart learnlytica-backend
```

---

## 💰 **MONTHLY COST**

```
AWS EC2 (t3.medium):  ~$30
Storage (30GB):       ~$3
Anthropic API:        ~$30 (1000 questions)
Total:                ~$63/month
```

---

## ✅ **VERIFICATION**

After deployment:
```bash
# 1. Check services
pm2 status
# Both services should be "online"

# 2. Check health
curl http://localhost:3666/health
# Should return: {"status":"ok","aiEnabled":true}

# 3. Test in browser
# Open: http://YOUR_IP
# Should see Learnlytica platform

# 4. Test AI
# Go to: http://YOUR_IP/ai/generate
# Generate a question
```

---

**🎉 That's it! Your AI-powered platform is live!**

For detailed guide, see: `AWS_DEPLOYMENT_GUIDE.md`

---

*Quick Start Guide*
*Deployment Time: 20 minutes*
*Difficulty: Easy*
