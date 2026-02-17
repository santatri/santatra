#!/bin/bash

# ============================================================================
# GUIDE COMPLET - TOUTES LES COMMANDES POUR DÉPLOYER SUR VPS UBUNTU
# Repository: https://github.com/santatri/santatra.git
# ============================================================================

# ============================================================================
# PARTIE 1 : INSTALLATION DES PRÉREQUIS
# ============================================================================

echo "===== 1. MISE À JOUR DU SYSTÈME ====="
sudo apt-get update
sudo apt-get upgrade -y

echo "===== 2. INSTALLATION DE NODE.JS 18.x ====="
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo bash -
sudo apt-get install -y nodejs

# Vérifier l'installation
node --version
npm --version

echo "===== 3. INSTALLATION DE POSTGRESQL ====="
sudo apt-get install -y postgresql postgresql-contrib

# Démarrer et activer PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql
sudo systemctl status postgresql

echo "===== 4. INSTALLATION DE NGINX ====="
sudo apt-get install -y nginx

# Démarrer et activer Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
sudo systemctl status nginx

echo "===== 5. INSTALLATION DE PM2 ====="
sudo npm install -g pm2

# Vérifier PM2
pm2 --version

echo "===== 6. INSTALLATION DE GIT (si nécessaire) ====="
sudo apt-get install -y git
git --version


# ============================================================================
# PARTIE 2 : CONFIGURATION POSTGRESQL
# ============================================================================

echo "===== 7. CONFIGURATION DE LA BASE DE DONNÉES ====="

# Se connecter à PostgreSQL
sudo -u postgres psql << EOF
-- Créer la base de données
CREATE DATABASE ge_cfpm;

-- Créer l'utilisateur avec un mot de passe FORT
-- ⚠️ REMPLACER 'VotreMotDePasseFort123!' par un vrai mot de passe fort
CREATE USER postgres WITH PASSWORD 'VotreMotDePasseFort123!';

-- Donner les privilèges
ALTER USER postgres WITH SUPERUSER;
GRANT ALL PRIVILEGES ON DATABASE ge_cfpm TO postgres;

-- Quitter
\q
EOF

echo "Base de données créée avec succès!"


# ============================================================================
# PARTIE 3 : CLONER LE REPOSITORY
# ============================================================================

echo "===== 8. CLONER LE CODE DEPUIS GITHUB ====="

# Aller dans le dossier web
cd /var/www

# Cloner le repository
git clone https://github.com/santatri/santatra.git cfpm

# Aller dans le dossier
cd cfpm

echo "Code cloné avec succès!"


# ============================================================================
# PARTIE 4 : CONFIGURATION DU BACKEND
# ============================================================================

echo "===== 9. CONFIGURATION DU BACKEND ====="

cd /var/www/cfpm/backend

# Créer le fichier .env
cat > .env << 'EOF'
NODE_ENV=production
PORT=5000
PGHOST=localhost
PGUSER=postgres
PGPASSWORD=VotreMotDePasseFort123!
PGDATABASE=ge_cfpm
PGPORT=5432

EMAIL_USER=santatriniainafeno01@gmail.com
EMAIL_PASS=qggryohniboznwzd
EMAIL_DIRECTION=santatriniainafeno01@gmail.com
EOF

echo "⚠️ IMPORTANT: Éditez le fichier .env pour mettre votre vrai mot de passe PostgreSQL"
echo "Commande: nano .env"
echo "Puis Ctrl+O pour sauvegarder, Ctrl+X pour quitter"

# Installer les dépendances
npm install --production

# Créer le dossier logs
mkdir -p logs

# Exécuter les migrations
npm run migrate:prod

# Démarrer avec PM2
pm2 start ecosystem.config.js --env production

# Sauvegarder la configuration PM2
pm2 save

# Configurer PM2 pour démarrer au boot
pm2 startup
# ⚠️ Exécuter la commande affichée par pm2 startup

# Vérifier que tout fonctionne
pm2 status
pm2 logs cfpm-backend --lines 20


# ============================================================================
# PARTIE 5 : BUILD DU FRONTEND
# ============================================================================

echo "===== 10. BUILD DU FRONTEND ====="

cd /var/www/cfpm/frontend

# Installer les dépendances
npm install

# Build de production
npm run build

# Créer le dossier pour Nginx
sudo mkdir -p /var/www/cfpm/frontend-build

# Copier le build
sudo cp -r dist/* /var/www/cfpm/frontend-build/

echo "Frontend build avec succès!"


# ============================================================================
# PARTIE 6 : CONFIGURATION NGINX
# ============================================================================

echo "===== 11. CONFIGURATION DE NGINX ====="

# Créer le fichier de configuration
sudo tee /etc/nginx/sites-available/cfpm > /dev/null << 'EOF'
server {
    listen 80;
    server_name ge.cfpm-de-madagascar.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ge.cfpm-de-madagascar.com;

    # Certificats SSL (Certbot les configurera)
    ssl_certificate /etc/letsencrypt/live/ge.cfpm-de-madagascar.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ge.cfpm-de-madagascar.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    client_max_body_size 50M;

    access_log /var/log/nginx/cfpm-access.log;
    error_log /var/log/nginx/cfpm-error.log;

    root /var/www/cfpm/frontend-build;
    index index.html;

    # API Backend
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Frontend - React Router
    location / {
        try_files $uri $uri/ /index.html;
        
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    location ~ /\. {
        deny all;
    }

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
EOF

# Activer le site
sudo ln -s /etc/nginx/sites-available/cfpm /etc/nginx/sites-enabled/

# Tester la configuration
sudo nginx -t

# Redémarrer Nginx
sudo systemctl restart nginx

echo "Nginx configuré avec succès!"


# ============================================================================
# PARTIE 7 : CONFIGURATION SSL (HTTPS)
# ============================================================================

echo "===== 12. INSTALLATION DE CERTBOT ET SSL ====="

# Installer Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Obtenir le certificat SSL
# ⚠️ IMPORTANT: Votre domaine DOIT pointer vers l'IP de ce serveur
sudo certbot --nginx -d ge.cfpm-de-madagascar.com

# Tester le renouvellement automatique
sudo certbot renew --dry-run

echo "SSL configuré avec succès!"


# ============================================================================
# PARTIE 8 : CONFIGURATION DES BACKUPS AUTOMATIQUES
# ============================================================================

echo "===== 13. CONFIGURATION DES BACKUPS ====="

# Créer le dossier backups
mkdir -p /var/www/cfpm/backups

# Rendre les scripts exécutables
chmod +x /var/www/cfpm/deploy-with-git.sh
chmod +x /var/www/cfpm/backend/backup-db.sh

# Configurer le cron pour backup quotidien à 2h du matin
(crontab -l 2>/dev/null; echo "0 2 * * * /var/www/cfpm/backend/backup-db.sh >> /var/www/cfpm/backups/cron.log 2>&1") | crontab -

echo "Backups automatiques configurés!"


# ============================================================================
# PARTIE 9 : CONFIGURATION DU PARE-FEU
# ============================================================================

echo "===== 14. CONFIGURATION DU PARE-FEU ====="

# Activer UFW
sudo ufw --force enable

# Autoriser SSH
sudo ufw allow ssh
sudo ufw allow 22/tcp

# Autoriser HTTP/HTTPS
sudo ufw allow 'Nginx Full'
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Vérifier le statut
sudo ufw status

echo "Pare-feu configuré!"


# ============================================================================
# PARTIE 10 : VÉRIFICATIONS FINALES
# ============================================================================

echo "===== 15. VÉRIFICATIONS FINALES ====="

echo "--- Test Backend ---"
curl http://localhost:5000
echo ""

echo "--- Statut PM2 ---"
pm2 status

echo "--- Logs Backend ---"
pm2 logs cfpm-backend --lines 10 --nostream

echo "--- Statut Nginx ---"
sudo systemctl status nginx --no-pager

echo "--- Statut PostgreSQL ---"
sudo systemctl status postgresql --no-pager

echo ""
echo "============================================================================"
echo "✅ INSTALLATION TERMINÉE!"
echo "============================================================================"
echo ""
echo "🌐 Votre application devrait être accessible sur:"
echo "   https://ge.cfpm-de-madagascar.com"
echo ""
echo "📊 Commandes utiles:"
echo "   - Voir les logs backend: pm2 logs cfpm-backend"
echo "   - Redémarrer backend: pm2 restart cfpm-backend"
echo "   - Voir logs Nginx: sudo tail -f /var/log/nginx/error.log"
echo "   - Déployer mise à jour: cd /var/www/cfpm && ./deploy-with-git.sh"
echo ""
echo "⚠️ N'oubliez pas:"
echo "   1. Éditer /var/www/cfpm/backend/.env avec votre vrai mot de passe"
echo "   2. Vérifier que votre domaine pointe vers l'IP de ce serveur"
echo "   3. Tester l'application dans un navigateur"
echo ""
echo "============================================================================"
