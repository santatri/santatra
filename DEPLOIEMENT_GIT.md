# Guide de Déploiement VPS Ubuntu avec Git - CFPM

## 📋 Vue d'ensemble

Ce guide vous accompagne dans le déploiement de votre application CFPM sur un serveur VPS Ubuntu en utilisant Git pour la gestion du code.

## 🎯 Architecture

- **Frontend**: React (Vite) - Build automatique sur le serveur
- **Backend**: Node.js/Express sur port 5000 - Géré par PM2
- **Base de données**: PostgreSQL
- **Reverse Proxy**: Nginx avec SSL/HTTPS
- **Gestion du code**: Git (clone direct sur le VPS)
- **Domaine**: ge.cfpm-de-madagascar.com

## ⚡ Démarrage Rapide

### Prérequis

- ✅ Votre code est dans un repository Git (GitHub, GitLab, Bitbucket, etc.)
- ✅ Vous avez accès SSH à votre VPS Ubuntu
- ✅ Votre domaine pointe vers l'IP du VPS

---

## 🚀 Installation Initiale (à faire une seule fois)

### 1. Connexion au VPS

```bash
ssh root@VOTRE_IP_VPS
```

### 2. Installation des Prérequis

#### Node.js 18.x
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo bash -
sudo apt-get install -y nodejs
node --version  # Vérifier
npm --version   # Vérifier
```

#### PostgreSQL
```bash
sudo apt-get update
sudo apt-get install -y postgresql postgresql-contrib

# Démarrer PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql
sudo systemctl status postgresql
```

#### Nginx
```bash
sudo apt-get install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
sudo systemctl status nginx
```

#### PM2 (Process Manager)
```bash
sudo npm install -g pm2
pm2 --version
```

#### Git (normalement déjà installé sur Ubuntu)
```bash
git --version
# Si pas installé:
sudo apt-get install -y git
```

### 3. Configuration PostgreSQL

```bash
# Se connecter à PostgreSQL
sudo -u postgres psql

# Dans le prompt PostgreSQL:
CREATE DATABASE ge_cfpm;
CREATE USER postgres WITH PASSWORD 'CHOISIR_UN_MOT_DE_PASSE_FORT';
ALTER USER postgres WITH SUPERUSER;
GRANT ALL PRIVILEGES ON DATABASE ge_cfpm TO postgres;
\q
```

### 4. Cloner le Repository

```bash
# Aller dans le dossier web
cd /var/www

# Cloner votre repository
git clone https://github.com/VOTRE_USERNAME/VOTRE_REPO.git cfpm

# Ou si repository privé avec authentification:
git clone https://USERNAME:TOKEN@github.com/VOTRE_USERNAME/VOTRE_REPO.git cfpm

cd cfpm
```

> [!TIP]
> **Repository Privé avec Token GitHub**
> 1. Aller sur GitHub → Settings → Developer settings → Personal access tokens
> 2. Générer un token avec accès `repo`
> 3. Utiliser: `git clone https://USERNAME:TOKEN@github.com/USER/REPO.git`

### 5. Configuration du Backend

```bash
cd /var/www/cfpm/backend

# Créer le fichier .env de production
nano .env
```

**Contenu du fichier `.env`:**
```env
NODE_ENV=production
PORT=5000
PGHOST=localhost
PGUSER=postgres
PGPASSWORD=VOTRE_MOT_DE_PASSE_POSTGRESQL_FORT
PGDATABASE=ge_cfpm
PGPORT=5432

EMAIL_USER=santatriniainafeno01@gmail.com
EMAIL_PASS=qggryohniboznwzd
EMAIL_DIRECTION=santatriniainafeno01@gmail.com
```

**Sauvegarder**: `Ctrl+O`, `Enter`, `Ctrl+X`

```bash
# Installer les dépendances
npm install --production

# Créer le dossier logs
mkdir -p logs

# Exécuter les migrations
npm run migrate:prod

# Démarrer avec PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
# Exécuter la commande affichée par pm2 startup

# Vérifier
pm2 status
pm2 logs cfpm-backend --lines 20
```

### 6. Build du Frontend

```bash
cd /var/www/cfpm/frontend

# Installer les dépendances
npm install

# Build de production
npm run build

# Créer le dossier pour Nginx
sudo mkdir -p /var/www/cfpm/frontend-build

# Copier le build
sudo cp -r dist/* /var/www/cfpm/frontend-build/
```

### 7. Configuration Nginx

```bash
# Créer le fichier de configuration
sudo nano /etc/nginx/sites-available/cfpm
```

**Copier cette configuration:**

```nginx
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
```

**Activer le site:**
```bash
sudo ln -s /etc/nginx/sites-available/cfpm /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 8. Configuration SSL (HTTPS)

```bash
# Installer Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Obtenir le certificat SSL gratuit
sudo certbot --nginx -d ge.cfpm-de-madagascar.com

# Suivre les instructions
# Le renouvellement automatique est configuré
```

### 9. Rendre le script de déploiement exécutable

```bash
cd /var/www/cfpm
chmod +x deploy-with-git.sh
chmod +x backend/backup-db.sh
```

### 10. Configuration des Backups Automatiques

```bash
# Éditer le crontab
crontab -e

# Ajouter cette ligne pour backup quotidien à 2h du matin:
0 2 * * * /var/www/cfpm/backend/backup-db.sh >> /var/www/cfpm/backups/cron.log 2>&1
```

---

## 🔄 Déploiement des Mises à Jour (déploiement futur)

Une fois l'installation initiale terminée, pour déployer vos modifications :

### Sur votre PC Local

```powershell
# 1. Faire vos modifications
# 2. Commit et push
git add .
git commit -m "Description des changements"
git push origin main
```

### Sur le VPS

**Option A - Script Automatique (RECOMMANDÉ)**
```bash
cd /var/www/cfpm
./deploy-with-git.sh
```

**Option B - Manuel**
```bash
# 1. Pull les changements
cd /var/www/cfpm
git pull origin main

# 2. Backend
cd backend
npm install --production
npm run migrate:prod
pm2 restart cfpm-backend

# 3. Frontend
cd ../frontend
npm install
npm run build
sudo cp -r dist/* /var/www/cfpm/frontend-build/

# 4. Vérifier
pm2 logs cfpm-backend
```

---

## ✅ Vérifications

### Backend
```bash
# Test local
curl http://localhost:5000

# Statut PM2
pm2 status

# Logs
pm2 logs cfpm-backend
```

### Frontend
```bash
# Test Nginx
curl http://localhost

# Logs Nginx
sudo tail -f /var/log/nginx/error.log
```

### Dans le navigateur
1. Ouvrir `https://ge.cfpm-de-madagascar.com`
2. Tester la connexion
3. Vérifier les appels API (DevTools > Network)

---

## 🛠️ Commandes Utiles

### Git
```bash
# Voir l'état du repo
cd /var/www/cfpm
git status
git log --oneline -5

# Voir la branche actuelle
git branch

# Changer de branche
git checkout production
```

### PM2
```bash
# Statut
pm2 status

# Logs en temps réel
pm2 logs cfpm-backend

# Redémarrer
pm2 restart cfpm-backend

# Arrêter
pm2 stop cfpm-backend

# Démarrer
pm2 start cfpm-backend
```

### Nginx
```bash
# Tester la config
sudo nginx -t

# Redémarrer
sudo systemctl restart nginx

# Voir les logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/cfpm-access.log
```

### PostgreSQL
```bash
# Connexion
sudo -u postgres psql -d ge_cfpm

# Backup manuel
sudo -u postgres pg_dump ge_cfpm > backup.sql

# Restore
sudo -u postgres psql ge_cfpm < backup.sql
```

---

## 🐛 Dépannage

### Erreur lors du git pull

```bash
# Si conflits ou modifications locales
cd /var/www/cfpm
git stash  # Sauvegarder les changements locaux
git pull origin main
git stash pop  # Réappliquer les changements si nécessaire
```

### Backend ne démarre pas
```bash
pm2 logs cfpm-backend --lines 50
# Vérifier les erreurs dans .env
cat backend/.env
```

### Erreurs de base de données
```bash
# Vérifier que PostgreSQL fonctionne
sudo systemctl status postgresql

# Tester la connexion
sudo -u postgres psql -d ge_cfpm -c "SELECT version();"
```

### Site inaccessible
```bash
# Vérifier Nginx
sudo systemctl status nginx
sudo nginx -t

# Vérifier le pare-feu
sudo ufw status
sudo ufw allow 'Nginx Full'
```

---

## 🔐 Sécurité

### Configuration du Pare-feu
```bash
# Activer UFW
sudo ufw enable

# Autoriser SSH
sudo ufw allow ssh
sudo ufw allow 22/tcp

# Autoriser HTTP/HTTPS
sudo ufw allow 'Nginx Full'

# Vérifier
sudo ufw status
```

### Protéger le fichier .env
```bash
# S'assurer que .env n'est jamais commité
cd /var/www/cfpm
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
```

### Mises à jour système
```bash
sudo apt-get update
sudo apt-get upgrade -y
sudo apt-get autoremove -y
```

---

## 📚 Structure des Dossiers

```
/var/www/cfpm/
├── .git/                  # Repository Git
├── backend/
│   ├── .env              # ⚠️ À créer manuellement (jamais dans Git)
│   ├── ecosystem.config.js
│   ├── deploy.sh
│   ├── backup-db.sh
│   ├── server.js
│   └── logs/
├── frontend/
│   ├── src/
│   ├── dist/             # Généré par npm run build
│   └── package.json
├── frontend-build/        # Copie de frontend/dist pour Nginx
└── backups/              # Backups PostgreSQL
```

---

## 🎯 Workflow Complet

### Développement Local
```powershell
# Sur votre PC
cd d:\8219
# Faire vos modifications
git add .
git commit -m "Description"
git push origin main
```

### Déploiement Production
```bash
# Sur le VPS
ssh root@votre-vps
cd /var/www/cfpm
./deploy-with-git.sh
```

**C'est tout ! Le script s'occupe de :**
- ✅ Backup automatique de la DB
- ✅ Pull du code depuis Git
- ✅ Installation des dépendances
- ✅ Migrations de la DB
- ✅ Build du frontend
- ✅ Redémarrage du backend
- ✅ Copie du frontend vers Nginx

---

## 📞 Aide Rapide

**Le déploiement échoue ?**
1. Vérifier les logs: `pm2 logs cfpm-backend`
2. Vérifier que .env existe: `ls -la /var/www/cfpm/backend/.env`
3. Vérifier les permissions Git: `cd /var/www/cfpm && git status`

**Le site ne se charge pas ?**
1. Vérifier Nginx: `sudo systemctl status nginx`
2. Vérifier les logs: `sudo tail -f /var/log/nginx/error.log`
3. Tester l'API: `curl http://localhost:5000`

**Besoin d'aide ?**
- Consulter les logs détaillés
- Vérifier que tous les services sont actifs (PostgreSQL, Nginx, PM2)
- Relire ce guide étape par étape

---

**Bon déploiement avec Git ! 🚀**
