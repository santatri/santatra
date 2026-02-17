# 🚀 Déploiement CFPM - Guide Rapide

Ce projet est configuré pour un déploiement facile sur VPS Ubuntu avec Git.

## 📚 Documentation Disponible

### ⭐ RECOMMANDÉ : [DEPLOIEMENT_GIT.md](file:///d:/8219/DEPLOIEMENT_GIT.md)
**Guide complet pour déploiement avec Git sur Ubuntu**
- Installation initiale étape par étape
- Configuration PostgreSQL, Nginx, SSL
- Workflow de mise à jour avec Git
- Dépannage et commandes utiles

### ✅ [CHECKLIST_DEPLOIEMENT.md](file:///d:/8219/CHECKLIST_DEPLOIEMENT.md)
**Checklist interactive** avec cases à cocher pour chaque étape

### 🔄 Alternative : [DEPLOIEMENT_VPS.md](file:///d:/8219/DEPLOIEMENT_VPS.md)
Guide pour déploiement manuel (sans Git)

## 🎯 Déploiement Rapide

### 1️⃣ Préparation (sur votre PC)

```bash
# Commiter et pusher votre code
git add .
git commit -m "Preparing for deployment"
git push origin main
```

### 2️⃣ Installation Initiale (une seule fois)

**Sur votre VPS Ubuntu :**

```bash
# 1. Installer les prérequis
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo bash -
sudo apt-get install -y nodejs postgresql postgresql-contrib nginx
sudo npm install -g pm2

# 2. Configurer PostgreSQL
sudo -u postgres psql
CREATE DATABASE ge_cfpm;
CREATE USER postgres WITH PASSWORD 'MOT_DE_PASSE_FORT';
GRANT ALL PRIVILEGES ON DATABASE ge_cfpm TO postgres;
\q

# 3. Cloner le repository
cd /var/www
git clone https://github.com/VOTRE_USERNAME/VOTRE_REPO.git cfpm
cd cfpm

# 4. Configurer le backend
cd backend
nano .env  # Créer avec vos credentials de production
npm install --production
npm run migrate:prod
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup

# 5. Build le frontend
cd ../frontend
npm install
npm run build
sudo mkdir -p /var/www/cfpm/frontend-build
sudo cp -r dist/* /var/www/cfpm/frontend-build/

# 6. Configurer Nginx (voir DEPLOIEMENT_GIT.md)
sudo nano /etc/nginx/sites-available/cfpm
# Copier la configuration depuis le guide
sudo ln -s /etc/nginx/sites-available/cfpm /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# 7. SSL gratuit
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d ge.cfpm-de-madagascar.com
```

### 3️⃣ Mises à Jour Futures

**Sur votre PC :**
```bash
git add .
git commit -m "Vos modifications"
git push origin main
```

**Sur le VPS :**
```bash
cd /var/www/cfpm
./deploy-with-git.sh
```

## 📁 Fichiers de Configuration Créés

- ✅ `backend/ecosystem.config.js` - Configuration PM2
- ✅ `backend/package.json` - Scripts de démarrage
- ✅ `deploy-with-git.sh` - Script de déploiement automatique
- ✅ `backend/backup-db.sh` - Script de backup
- ✅ `nginx.conf` - Configuration Nginx (exemple)

## ⚠️ Important

> **Avant de déployer :**
> 1. Vérifier que `.env` est dans `.gitignore` (✅ déjà fait)
> 2. Créer le fichier `.env` **manuellement sur le VPS** avec les vraies credentials
> 3. Changer le mot de passe PostgreSQL par défaut
> 4. Vérifier que votre domaine pointe vers l'IP du VPS

## 🔧 Commandes Utiles

```bash
# Vérifier l'état de l'application
pm2 status
pm2 logs cfpm-backend

# Redémarrer
pm2 restart cfpm-backend

# Backup manuel
/var/www/cfpm/backend/backup-db.sh

# Logs Nginx
sudo tail -f /var/log/nginx/error.log
```

## 📞 Besoin d'Aide ?

Consultez le guide détaillé : [DEPLOIEMENT_GIT.md](file:///d:/8219/DEPLOIEMENT_GIT.md)

---

**Bon déploiement ! 🎉**
