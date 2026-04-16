# Medicare HMS - Deployment Guide

**Version:** 1.0.0  
**Last Updated:** January 16, 2024  

---

## Table of Contents

1. [Overview](#overview)
2. [System Requirements](#system-requirements)
3. [Environment Setup](#environment-setup)
4. [Database Configuration](#database-configuration)
5. [Backend Deployment](#backend-deployment)
6. [Frontend Deployment](#frontend-deployment)
7. [SSL/TLS Configuration](#ssltls-configuration)
8. [Monitoring & Logging](#monitoring--logging)
9. [Backup & Recovery](#backup--recovery)
10. [Security Hardening](#security-hardening)
11. [Troubleshooting](#troubleshooting)

---

## Overview

This guide provides comprehensive instructions for deploying the Medicare Hospital Management System (HMS) in a production environment. The system consists of a React.js frontend, Node.js backend API, and PostgreSQL database.

### Architecture Overview

```
Internet
    |
    v
[Load Balancer] (Nginx/HAProxy)
    |
    v
[Web Server] (Nginx) -> [Frontend] (React.js)
    |
    v
[Application Server] (Node.js) -> [Backend API]
    |
    v
[Database Server] (PostgreSQL)
    |
    v
[Backup Storage] (Local/Cloud)
```

---

## System Requirements

### Minimum Requirements

**Application Server**
- CPU: 2 cores
- RAM: 4GB
- Storage: 50GB SSD
- OS: Ubuntu 20.04 LTS / CentOS 8 / RHEL 8

**Database Server**
- CPU: 2 cores
- RAM: 4GB
- Storage: 100GB SSD
- OS: Ubuntu 20.04 LTS / CentOS 8 / RHEL 8

**Network**
- Bandwidth: 100 Mbps
- Latency: <50ms
- Uptime: 99.9%

### Recommended Requirements

**Application Server**
- CPU: 4 cores
- RAM: 8GB
- Storage: 100GB SSD
- OS: Ubuntu 22.04 LTS

**Database Server**
- CPU: 4 cores
- RAM: 16GB
- Storage: 500GB SSD (with RAID 1)
- OS: Ubuntu 22.04 LTS

**Load Balancer**
- CPU: 2 cores
- RAM: 2GB
- Storage: 20GB SSD
- Software: Nginx/HAProxy

---

## Environment Setup

### Prerequisites

**Node.js Runtime**
```bash
# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should be v18.x.x
npm --version   # Should be 9.x.x
```

**PostgreSQL Database**
```bash
# Install PostgreSQL 14+
sudo apt update
sudo apt install postgresql postgresql-contrib

# Start and enable service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database user
sudo -u postgres createuser --interactive
```

**Nginx Web Server**
```bash
# Install Nginx
sudo apt install nginx

# Start and enable service
sudo systemctl start nginx
sudo systemctl enable nginx
```

**Additional Dependencies**
```bash
# Install PM2 for process management
sudo npm install -g pm2

# Install Certbot for SSL certificates
sudo apt install certbot python3-certbot-nginx

# Install Git
sudo apt install git
```

### Directory Structure

```bash
# Create application directory
sudo mkdir -p /opt/medicare-hms
sudo chown $USER:$USER /opt/medicare-hms
cd /opt/medicare-hms

# Create subdirectories
mkdir -p {backend,frontend,logs,backups,scripts,config}
```

---

## Database Configuration

### PostgreSQL Setup

**Initialize Database**
```bash
# Switch to postgres user
sudo -u postgres psql

# Create database
CREATE DATABASE medicare_hms;

# Create application user
CREATE USER medicare_user WITH PASSWORD 'your_secure_password';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE medicare_hms TO medicare_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO medicare_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO medicare_user;

# Exit psql
\q
```

**Database Schema**
```bash
# Navigate to backend directory
cd /opt/medicare-hms/backend

# Run schema files
psql -U medicare_user -d medicare_hms -f db/schema.sql
psql -U medicare_user -d medicare_hms -f db/audit_schema.sql
psql -U medicare_user -d medicare_hms -f db/performance_optimization.sql
```

**Database Configuration**
```bash
# Edit PostgreSQL configuration
sudo nano /etc/postgresql/14/main/postgresql.conf

# Add these settings:
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 4MB
min_wal_size = 1GB
max_wal_size = 4GB

# Restart PostgreSQL
sudo systemctl restart postgresql
```

---

## Backend Deployment

### Application Setup

**Clone Repository**
```bash
# Clone the application
cd /opt/medicare-hms/backend
git clone <repository-url> .

# Install dependencies
npm install --production
```

**Environment Configuration**
```bash
# Create environment file
cp .env.example .env
nano .env
```

**Environment Variables**
```bash
# Database Configuration
DATABASE_URL=postgresql://medicare_user:your_secure_password@localhost:5432/medicare_hms
NODE_ENV=production

# Server Configuration
PORT=5000
HOST=127.0.0.1

# Security Configuration
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_SECRET=your_refresh_token_secret

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=noreply@medicare.com
EMAIL_PASS=your_email_password
EMAIL_FROM=Medicare HMS <noreply@medicare.com>

# Frontend URL
FRONTEND_URL=https://your-domain.com

# File Upload Configuration
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=5242880

# CORS Configuration
CORS_ORIGINS=https://your-domain.com,https://www.your-domain.com
```

### Process Management with PM2

**Create PM2 Configuration**
```bash
# Create ecosystem file
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [{
    name: 'medicare-hms-api',
    script: 'server.js',
    instances: 'max', // Use all available CPU cores
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: '/opt/medicare-hms/logs/api-error.log',
    out_file: '/opt/medicare-hms/logs/api-out.log',
    log_file: '/opt/medicare-hms/logs/api-combined.log',
    time: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
```

**Start Application**
```bash
# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Enable startup script
pm2 startup
```

**Monitor Application**
```bash
# Check status
pm2 status

# View logs
pm2 logs

# Monitor metrics
pm2 monit

# Restart application
pm2 restart medicare-hms-api
```

---

## Frontend Deployment

### Build Configuration

**Clone Repository**
```bash
# Navigate to frontend directory
cd /opt/medicare-hms/frontend
git clone <repository-url> .

# Install dependencies
npm install
```

**Production Build**
```bash
# Create production build
npm run build

# Verify build output
ls -la dist/
```

### Nginx Configuration

**Create Nginx Configuration**
```bash
sudo nano /etc/nginx/sites-available/medicare-hms
```

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin";
    
    # Frontend Static Files
    location / {
        root /opt/medicare-hms/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # API Proxy
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # File Uploads
    location /uploads/ {
        alias /opt/medicare-hms/backend/uploads/;
        expires 1h;
        add_header Cache-Control "public";
    }
    
    # Health Check
    location /health {
        proxy_pass http://127.0.0.1:5000/health;
        access_log off;
    }
}
```

**Enable Site**
```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/medicare-hms /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## SSL/TLS Configuration

### Let's Encrypt Certificate

**Obtain SSL Certificate**
```bash
# Stop Nginx
sudo systemctl stop nginx

# Obtain certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Start Nginx
sudo systemctl start nginx
```

**Auto-Renewal**
```bash
# Test renewal
sudo certbot renew --dry-run

# Add cron job for auto-renewal
sudo crontab -e

# Add this line:
0 12 * * * /usr/bin/certbot renew --quiet
```

### SSL Security Best Practices

**Certificate Configuration**
```nginx
# Add to server block in Nginx config
ssl_stapling on;
ssl_stapling_verify on;
resolver 8.8.8.8 8.8.4.4 valid=300s;
ssl_trusted_certificate /etc/letsencrypt/live/your-domain.com/chain.pem;
```

---

## Monitoring & Logging

### Log Rotation

**Configure Log Rotation**
```bash
# Create logrotate configuration
sudo nano /etc/logrotate.d/medicare-hms
```

```
/opt/medicare-hms/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        pm2 reload medicare-hms-api
    endscript
}
```

**Application Monitoring**
```bash
# Install monitoring tools
npm install -g clinic
npm install -g 0x

# Monitor Node.js application
clinic doctor -- /opt/medicare-hms/backend

# Monitor PM2 processes
pm2 monit
```

### System Monitoring

**Install Monitoring Tools**
```bash
# Install htop for system monitoring
sudo apt install htop

# Install iotop for I/O monitoring
sudo apt install iotop

# Install nethogs for network monitoring
sudo apt install nethogs
```

**Create Monitoring Script**
```bash
# Create monitoring script
nano /opt/medicare-hms/scripts/monitor.sh
```

```bash
#!/bin/bash

# System monitoring script
DATE=$(date +%Y-%m-%d_%H:%M:%S)
LOG_FILE="/opt/medicare-hms/logs/monitor_$DATE.log"

# System resources
echo "=== System Resources ===" >> $LOG_FILE
echo "CPU Usage:" >> $LOG_FILE
top -bn1 | grep "Cpu(s)" >> $LOG_FILE
echo "Memory Usage:" >> $LOG_FILE
free -h >> $LOG_FILE
echo "Disk Usage:" >> $LOG_FILE
df -h >> $LOG_FILE

# Application status
echo "=== Application Status ===" >> $LOG_FILE
pm2 status >> $LOG_FILE

# Database status
echo "=== Database Status ===" >> $LOG_FILE
sudo -u postgres pg_isready >> $LOG_FILE

# Nginx status
echo "=== Nginx Status ===" >> $LOG_FILE
sudo systemctl status nginx >> $LOG_FILE

echo "Monitor completed at $DATE" >> $LOG_FILE
```

**Schedule Monitoring**
```bash
# Make script executable
chmod +x /opt/medicare-hms/scripts/monitor.sh

# Add to crontab
sudo crontab -e

# Add monitoring every 5 minutes
*/5 * * * * /opt/medicare-hms/scripts/monitor.sh
```

---

## Backup & Recovery

### Database Backup

**Create Backup Script**
```bash
# Create backup script
nano /opt/medicare-hms/scripts/backup.sh
```

```bash
#!/bin/bash

# Database backup script
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/medicare-hms/backups"
DB_NAME="medicare_hms"
DB_USER="medicare_user"

# Create backup directory
mkdir -p $BACKUP_DIR

# Full database backup
pg_dump -U $DB_USER -h localhost $DB_NAME > $BACKUP_DIR/backup_$DATE.sql

# Compress backup
gzip $BACKUP_DIR/backup_$DATE.sql

# Remove backups older than 30 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete

echo "Backup completed: backup_$DATE.sql.gz"
```

**Schedule Backups**
```bash
# Make script executable
chmod +x /opt/medicare-hms/scripts/backup.sh

# Add to crontab
sudo crontab -e

# Daily backup at 2 AM
0 2 * * * /opt/medicare-hms/scripts/backup.sh
```

### Application Backup

**Backup Application Files**
```bash
# Create application backup script
nano /opt/medicare-hms/scripts/app-backup.sh
```

```bash
#!/bin/bash

# Application backup script
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/medicare-hms/backups"
APP_DIR="/opt/medicare-hms"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup application files
tar -czf $BACKUP_DIR/app_backup_$DATE.tar.gz \
    $APP_DIR/backend \
    $APP_DIR/frontend \
    $APP_DIR/config \
    --exclude=node_modules \
    --exclude=dist \
    --exclude=.git

echo "Application backup completed: app_backup_$DATE.tar.gz"
```

### Recovery Procedures

**Database Recovery**
```bash
# Stop application
pm2 stop medicare-hms-api

# Drop existing database (if needed)
sudo -u postgres dropdb medicare_hms

# Create new database
sudo -u postgres createdb medicare_hms

# Restore from backup
gunzip -c /opt/medicare-hms/backups/backup_20240116_020000.sql.gz | \
sudo -u postgres psql medicare_hms

# Restart application
pm2 start medicare-hms-api
```

**Application Recovery**
```bash
# Extract application backup
tar -xzf /opt/medicare-hms/backups/app_backup_20240116_020000.tar.gz -C /opt/medicare-hms/

# Install dependencies
cd /opt/medicare-hms/backend && npm install --production
cd /opt/medicare-hms/frontend && npm install

# Restart services
pm2 restart medicare-hms-api
sudo systemctl reload nginx
```

---

## Security Hardening

### System Security

**Update System**
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install security updates
sudo apt install unattended-upgrades
sudo dpkg-reconfigure unattended-upgrades
```

**Firewall Configuration**
```bash
# Install UFW firewall
sudo apt install ufw

# Configure firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 5000/tcp  # API server

# Enable firewall
sudo ufw enable
```

**Fail2Ban Configuration**
```bash
# Install Fail2Ban
sudo apt install fail2ban

# Configure Fail2Ban
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.conf.local
sudo nano /etc/fail2ban/jail.conf.local
```

```ini
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
logpath = /var/log/nginx/error.log
maxretry = 5

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
logpath = /var/log/nginx/error.log
maxretry = 5
```

```bash
# Restart Fail2Ban
sudo systemctl restart fail2ban
```

### Application Security

**Environment Variables Security**
```bash
# Set proper file permissions
chmod 600 /opt/medicare-hms/backend/.env
chown $USER:$USER /opt/medicare-hms/backend/.env

# Secure uploads directory
chmod 755 /opt/medicare-hms/backend/uploads
chown www-data:www-data /opt/medicare-hms/backend/uploads
```

**Security Headers**
```nginx
# Add to Nginx configuration
add_header X-Frame-Options DENY;
add_header X-Content-Type-Options nosniff;
add_header X-XSS-Protection "1; mode=block";
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header Referrer-Policy "strict-origin-when-cross-origin";
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';";
```

---

## Troubleshooting

### Common Issues

**Application Won't Start**
```bash
# Check Node.js version
node --version

# Check dependencies
cd /opt/medicare-hms/backend && npm list

# Check logs
pm2 logs medicare-hms-api

# Check database connection
sudo -u postgres pg_isready
```

**Database Connection Issues**
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check database exists
sudo -u postgres psql -l

# Test connection
psql -U medicare_user -d medicare_hms -h localhost
```

**Nginx Issues**
```bash
# Test Nginx configuration
sudo nginx -t

# Check Nginx status
sudo systemctl status nginx

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log
```

**Performance Issues**
```bash
# Check system resources
htop
free -h
df -h

# Check application performance
pm2 monit
clinic doctor -- /opt/medicare-hms/backend
```

### Emergency Procedures

**Service Recovery**
```bash
# Restart all services
pm2 restart medicare-hms-api
sudo systemctl restart nginx
sudo systemctl restart postgresql

# Check service status
pm2 status
sudo systemctl status nginx
sudo systemctl status postgresql
```

**Full System Recovery**
```bash
# Stop all services
pm2 stop medicare-hms-api
sudo systemctl stop nginx
sudo systemctl stop postgresql

# Start database
sudo systemctl start postgresql

# Start application
pm2 start medicare-hms-api

# Start web server
sudo systemctl start nginx
```

---

## Maintenance Tasks

### Regular Maintenance

**Weekly Tasks**
- Review system logs
- Check disk space usage
- Monitor application performance
- Update security patches

**Monthly Tasks**
- Database maintenance (VACUUM, ANALYZE)
- Review backup logs
- Update application dependencies
- Security audit

**Quarterly Tasks**
- Full system backup verification
- Performance optimization
- Security review
- Documentation updates

### Automation Scripts

**Maintenance Script**
```bash
# Create maintenance script
nano /opt/medicare-hms/scripts/maintenance.sh
```

```bash
#!/bin/bash

# Maintenance script
echo "Starting maintenance tasks..."

# Database maintenance
echo "Performing database maintenance..."
sudo -u postgres psql medicare_hms -c "VACUUM ANALYZE;"

# Log rotation
echo "Rotating logs..."
sudo logrotate -f /etc/logrotate.d/medicare-hms

# System cleanup
echo "Cleaning up temporary files..."
sudo apt autoremove
sudo apt autoclean

# Check disk space
echo "Checking disk space..."
df -h

# Check application status
echo "Checking application status..."
pm2 status

echo "Maintenance completed!"
```

**Schedule Maintenance**
```bash
# Make script executable
chmod +x /opt/medicare-hms/scripts/maintenance.sh

# Add to crontab
sudo crontab -e

# Monthly maintenance on first Sunday at 3 AM
0 3 1-7 * 0 /opt/medicare-hms/scripts/maintenance.sh
```

---

## Contact Information

**Technical Support**
- Email: support@medicare.com
- Phone: (555) 123-4567
- Available: Monday-Friday, 8AM-6PM

**Emergency Support**
- Phone: (555) 111-2222
- Available: 24/7

**Documentation**
- Online: docs.medicare.com
- GitHub: github.com/medicare/hms
- Wiki: wiki.medicare.com

---

*This deployment guide is updated regularly. Check for the latest version at docs.medicare.com/deployment*
