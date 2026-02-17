# 🚀 GUIDE COMPLET - TOUTES LES COMMANDES DE DÉPLOIEMENT VPS

Guide pas à pas avec **toutes les commandes** à exécuter sur votre VPS Ubuntu.

---

## 📝 Prérequis

- ✅ VPS Ubuntu accessible en SSH
- ✅ Code sur GitHub : https://github.com/santatri/santatra.git
- ✅ Domaine pointant vers l'IP du VPS : `ge.cfpm-de-madagascar.com`

---

## 🔌 ÉTAPE 1 : CONNEXION AU VPS

```bash
ssh root@VOTRE_IP_VPS
```

---

## 💿 ÉTAPE 2 : INSTALLATION DES PRÉREQUIS

### 2.1 Mise à jour du système
```bash
sudo apt-get update
sudo apt-get upgrade -y
```

### 2.2 Installation Node.js 18.x
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo bash -
sudo apt-get install -y nodejs
node --version
npm --version
```

### 2.3 Installation PostgreSQL
```bash
sudo apt-get install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
sudo systemctl status postgresql
```

### 2.4 Installation Nginx
```bash
sudo apt-get install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
sudo systemctl status nginx
```

### 2.5 Installation PM2
```bash
sudo npm install -g pm2
pm2 --version
```

### 2.6 Installation Git (si nécessaire)
```bash
sudo apt-get install -y git
git --version
```

---

## 🗄️ ÉTAPE 3 : CONFIGURATION POSTGRESQL

```bash
# Se connecter à PostgreSQL
sudo -u postgres psql
```

**Dans le prompt PostgreSQL, exécuter :**

```sql
-- Créer la base de données
CREATE DATABASE ge_cfpm;

-- Créer l'utilisateur (⚠️ Choisir un MOT DE PASSE FORT)
CREATE USER postgres WITH PASSWORD 'VotreMotDePasseFort123!';

-- Donner les privilèges
ALTER USER postgres WITH SUPERUSER;
GRANT ALL PRIVILEGES ON DATABASE ge_cfpm TO postgres;

-- Quitter
\q
```

---

## 📦 ÉTAPE 4 : CLONER LE REPOSITORY

```bash
# Aller dans le dossier web
cd /var/www

# Cloner votre repository GitHub
git clone https://github.com/santatri/santatra.git cfpm

# Aller dans le dossier
cd cfpm

# Vérifier que le code est bien là
ls -la
```

---

## ⚙️ ÉTAPE 5 : CONFIGURATION DU BACKEND

```bash
# Aller dans le dossier backend
cd /var/www/cfpm/backend

# Créer le fichier .env
nano .env
```

**Copier ce contenu dans `.env` (⚠️ Modifier le mot de passe PostgreSQL) :**

```env
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
```

**Sauvegarder :** `Ctrl+O`, `Enter`, puis `Ctrl+X`

```bash
# Installer les dépendances
npm install --production

# Créer le dossier logs
mkdir -p logs

# Exécuter les migrations
npm run migrate:prod

# Démarrer avec PM2
pm2 start ecosystem.config.js --env production

# Sauvegarder la config PM2
pm2 save

# Configurer le démarrage automatique
pm2 startup
```

**⚠️ IMPORTANT :** Exécuter la commande affichée par `pm2 startup`

```bash
# Vérifier que tout fonctionne
pm2 status
pm2 logs cfpm-backend --lines 20

# Tester l'API
curl http://localhost:5000
```

---

## 🎨 ÉTAPE 6 : BUILD DU FRONTEND

```bash
# Aller dans le dossier frontend
cd /var/www/cfpm/frontend

# Installer les dépendances
npm install

# Build de production
npm run build

# Créer le dossier pour Nginx
sudo mkdir -p /var/www/cfpm/frontend-build

# Copier le build
sudo cp -r dist/* /var/www/cfpm/frontend-build/

# Vérifier
ls -la /var/www/cfpm/frontend-build/
```

---

## 🌐 ÉTAPE 7 : CONFIGURATION NGINX

```bash
# Créer le fichier de configuration
sudo nano /etc/nginx/sites-available/cfpm
```

**Copier cette configuration :**

```nginx
server {
    listen 80;
    server_name ge.cfpm-de-madagascar.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ge.cfpm-de-madagascar.com;

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

**Sauvegarder :** `Ctrl+O`, `Enter`, `Ctrl+X`

```bash
# Activer le site
sudo ln -s /etc/nginx/sites-available/cfpm /etc/nginx/sites-enabled/

# Tester la configuration
sudo nginx -t

# Si OK, redémarrer Nginx
sudo systemctl restart nginx

# Vérifier le statut
sudo systemctl status nginx
```

---

## 🔒 ÉTAPE 8 : CONFIGURATION SSL (HTTPS)

```bash
# Installer Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Obtenir le certificat SSL (⚠️ Votre domaine DOIT pointer vers ce serveur)
sudo certbot --nginx -d ge.cfpm-de-madagascar.com
```

**Suivre les instructions :**
1. Entrer votre email
2. Accepter les conditions (Y)
3. Choisir de rediriger HTTP vers HTTPS (option 2)

```bash
# Tester le renouvellement automatique
sudo certbot renew --dry-run
```

---

## 💾 ÉTAPE 9 : CONFIGURATION DES BACKUPS AUTOMATIQUES

```bash
# Créer le dossier backups
mkdir -p /var/www/cfpm/backups

# Rendre les scripts exécutables
chmod +x /var/www/cfpm/deploy-with-git.sh
chmod +x /var/www/cfpm/backend/backup-db.sh

# Tester le backup manuellement
/var/www/cfpm/backend/backup-db.sh

# Configurer le cron pour backup quotidien à 2h du matin
crontab -e
```

**Ajouter cette ligne à la fin du fichier :**
```
0 2 * * * /var/www/cfpm/backend/backup-db.sh >> /var/www/cfpm/backups/cron.log 2>&1
```

---

## 🔥 ÉTAPE 10 : CONFIGURATION DU PARE-FEU

```bash
# Activer UFW
sudo ufw enable

# Autoriser SSH
sudo ufw allow ssh
sudo ufw allow 22/tcp

# Autoriser HTTP et HTTPS
sudo ufw allow 'Nginx Full'
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Vérifier le statut
sudo ufw status
```

---

## ✅ ÉTAPE 11 : VÉRIFICATIONS FINALES

### Test Backend
```bash
curl http://localhost:5000
# Devrait afficher: "Backend Node.js + PostgreSQL fonctionne !"
```

### Vérifier PM2
```bash
pm2 status
# Le statut doit être "online"

pm2 logs cfpm-backend --lines 20
# Pas d'erreurs critiques
```

### Vérifier Nginx
```bash
sudo systemctl status nginx
# Doit être "active (running)"

sudo tail -f /var/log/nginx/error.log
# Ctrl+C pour quitter
```

### Vérifier PostgreSQL
```bash
sudo systemctl status postgresql
# Doit être "active (running)"

# Se connecter à la base
sudo -u postgres psql -d ge_cfpm
\dt
# Devrait lister toutes les tables
\q
```

### Test dans le navigateur
```
https://ge.cfpm-de-madagascar.com
```

1. ✅ Page d'accueil se charge
2. ✅ Test de connexion fonctionne
3. ✅ API répond (voir DevTools > Network)

---

## 🔄 MISES À JOUR FUTURES

### Sur votre PC (après modifications) :
```powershell
git add .
git commit -m "Description des changements"
git push origin main
```

### Sur le VPS :
```bash
cd /var/www/cfpm
./deploy-with-git.sh
```

---

## 📊 COMMANDES UTILES QUOTIDIENNES

```bash
# Voir les logs en temps réel
pm2 logs cfpm-backend

# Redémarrer l'application
pm2 restart cfpm-backend

# Voir le statut
pm2 status

# Backup manuel de la DB
/var/www/cfpm/backend/backup-db.sh

# Voir les logs Nginx
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/cfpm-access.log

# Redémarrer Nginx
sudo systemctl restart nginx

# Vérifier l'espace disque
df -h
```

---

## 🆘 DÉPANNAGE

### Backend ne démarre pas
```bash
pm2 logs cfpm-backend --lines 50
# Regarder les erreurs

cat /var/www/cfpm/backend/.env
# Vérifier les credentials
```

### Erreur de base de données
```bash
sudo systemctl status postgresql
# Vérifier que PostgreSQL fonctionne

sudo -u postgres psql -d ge_cfpm -c "SELECT version();"
# Tester la connexion
```

### Site inaccessible
```bash
sudo systemctl status nginx
sudo nginx -t
# Vérifier Nginx

sudo ufw status
# Vérifier le pare-feu
```

---

## ✨ FÉLICITATIONS !

Votre application CFPM est maintenant déployée sur votre VPS Ubuntu ! 🎉

**URL :** https://ge.cfpm-de-madagascar.com

---

**Fichier script automatique disponible :** [COMMANDES_DEPLOIEMENT_COMPLET.sh](file:///d:/8219/COMMANDES_DEPLOIEMENT_COMPLET.sh)
