# Guide de Déploiement VPS LWS - CFPM

## 📋 Vue d'ensemble

Ce guide vous accompagne dans le déploiement de votre application CFPM (frontend React + backend Node.js + PostgreSQL) sur un serveur VPS LWS.

## 🎯 Architecture

- **Frontend**: React (Vite) - Fichiers statiques servis par Nginx
- **Backend**: Node.js/Express sur port 5000 - Géré par PM2
- **Base de données**: PostgreSQL
- **Reverse Proxy**: Nginx avec SSL/HTTPS
- **Domaine**: ge.cfpm-de-madagascar.com

## ⚡ Démarrage Rapide

### 1. Sur votre PC Local

#### Build du Frontend
```powershell
cd d:\8219\frontend
npm install
npm run build
```

Les fichiers de production seront dans `frontend\dist\`

### 2. Sur votre VPS LWS

#### Connexion SSH
```bash
ssh root@VOTRE_IP_VPS
```

#### Installation des Prérequis

**Node.js 18.x:**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo bash -
sudo apt-get install -y nodejs
node --version  # Vérifier la version
```

**PostgreSQL:**
```bash
sudo apt-get update
sudo apt-get install -y postgresql postgresql-contrib
sudo systemctl status postgresql  # Vérifier que c'est actif
```

**Nginx:**
```bash
sudo apt-get install -y nginx
sudo systemctl status nginx  # Vérifier que c'est actif
```

**PM2 (Process Manager):**
```bash
sudo npm install -g pm2
pm2 --version  # Vérifier l'installation
```

#### Configuration PostgreSQL

```bash
# Se connecter à PostgreSQL
sudo -u postgres psql

# Dans le prompt PostgreSQL, exécuter:
CREATE DATABASE ge_cfpm;
CREATE USER postgres WITH PASSWORD 'CHOISIR_UN_MOT_DE_PASSE_FORT';
GRANT ALL PRIVILEGES ON DATABASE ge_cfpm TO postgres;
\q
```

### 3. Upload du Code

#### Créer la structure de dossiers
```bash
sudo mkdir -p /var/www/cfpm/backend
sudo mkdir -p /var/www/cfpm/frontend-build
sudo mkdir -p /var/www/cfpm/backups
```

#### Transférer les fichiers (depuis votre PC Windows)

**Option A - Avec SCP (ligne de commande):**
```powershell
# Backend (depuis d:\8219)
scp -r .\backend\* root@VOTRE_IP_VPS:/var/www/cfpm/backend/

# Frontend build
scp -r .\frontend\dist\* root@VOTRE_IP_VPS:/var/www/cfpm/frontend-build/
```

**Option B - Avec FileZilla (interface graphique):**
1. Ouvrir FileZilla
2. Hôte: `sftp://VOTRE_IP_VPS`
3. Utilisateur: `root`
4. Mot de passe: votre mot de passe VPS
5. Port: `22`
6. Glisser-déposer:
   - `d:\8219\backend\` vers `/var/www/cfpm/backend/`
   - `d:\8219\frontend\dist\` vers `/var/www/cfpm/frontend-build/`

### 4. Configuration Backend

```bash
cd /var/www/cfpm/backend

# Créer le fichier .env de production
nano .env
```

**Contenu de `.env`:**
```env
NODE_ENV=production
PORT=5000
PGHOST=localhost
PGUSER=postgres
PGPASSWORD=VOTRE_MOT_DE_PASSE_POSTGRESQL
PGDATABASE=ge_cfpm
PGPORT=5432

EMAIL_USER=santatriniainafeno01@gmail.com
EMAIL_PASS=qggryohniboznwzd
EMAIL_DIRECTION=santatriniainafeno01@gmail.com
```

**Sauvegarder**: `Ctrl+O`, `Enter`, `Ctrl+X`

```bash
# Installer les dépendances NPM
npm install --production

# Créer le dossier logs
mkdir -p logs

# Exécuter les migrations de base de données
npm run migrate:prod

# Démarrer l'application avec PM2
pm2 start ecosystem.config.js --env production

# Sauvegarder la configuration PM2
pm2 save

# Configurer PM2 pour démarrer au boot
pm2 startup
# Copier et exécuter la commande affichée

# Vérifier que tout fonctionne
pm2 status
pm2 logs cfpm-backend --lines 20
```

### 5. Configuration Nginx

```bash
# Créer le fichier de configuration
sudo nano /etc/nginx/sites-available/cfpm
```

**Copier le contenu du fichier `nginx.conf` que j'ai créé**

```bash
# Activer le site
sudo ln -s /etc/nginx/sites-available/cfpm /etc/nginx/sites-enabled/

# Vérifier la configuration
sudo nginx -t

# Si OK, redémarrer Nginx
sudo systemctl restart nginx
```

### 6. Configuration DNS

**Sur votre panel LWS:**
1. Aller dans la gestion DNS
2. Créer un enregistrement A:
   - Type: `A`
   - Nom: `ge` ou `@` (selon si c'est un sous-domaine ou domaine principal)
   - Valeur: `VOTRE_IP_VPS`
   - TTL: `3600`

**Attendre 5-30 minutes pour la propagation DNS**

### 7. Configuration SSL (HTTPS)

```bash
# Installer Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Obtenir le certificat SSL gratuit
sudo certbot --nginx -d ge.cfpm-de-madagascar.com

# Suivre les instructions à l'écran
# - Entrer votre email
# - Accepter les conditions
# - Choisir de rediriger HTTP vers HTTPS (option 2)

# Le renouvellement automatique est configuré par Certbot
# Tester le renouvellement:
sudo certbot renew --dry-run
```

## ✅ Vérification du Déploiement

### Tests Backend
```bash
# Test local
curl http://localhost:5000
# Devrait afficher: "Backend Node.js + PostgreSQL fonctionne !"

# Vérifier PM2
pm2 status
# Le statut doit être "online"

# Voir les logs
pm2 logs cfpm-backend
```

### Tests Frontend + API

**Ouvrir dans un navigateur:**
```
https://ge.cfpm-de-madagascar.com
```

1. La page d'accueil doit se charger
2. Tester la connexion avec un compte
3. Ouvrir les DevTools (F12) > Network
4. Les requêtes API doivent retourner des réponses 200

### Tests Base de Données
```bash
# Connexion à la DB
sudo -u postgres psql -d ge_cfpm

# Lister les tables
\dt

# Vérifier les utilisateurs (exemple)
SELECT * FROM users LIMIT 5;

# Quitter
\q
```

## 🔄 Maintenance

### Voir les logs en temps réel
```bash
pm2 logs cfpm-backend
```

### Redémarrer l'application
```bash
pm2 restart cfpm-backend
```

### Backup manuel de la base de données
```bash
cd /var/www/cfpm
chmod +x backend/backup-db.sh
./backend/backup-db.sh
```

### Configurer les backups automatiques (quotidiens à 2h du matin)
```bash
# Éditer le crontab
crontab -e

# Ajouter cette ligne:
0 2 * * * /var/www/cfpm/backend/backup-db.sh >> /var/www/cfpm/backups/cron.log 2>&1
```

### Mise à jour du Backend

**Sur votre PC, après modifications:**
```powershell
cd d:\8219\backend
```

**Transférer vers le VPS:**
```powershell
scp -r .\* root@VOTRE_IP_VPS:/var/www/cfpm/backend/
```

**Sur le VPS:**
```bash
cd /var/www/cfpm/backend
chmod +x deploy.sh
./deploy.sh
```

### Mise à jour du Frontend

**Sur votre PC:**
```powershell
cd d:\8219\frontend
npm run build
scp -r .\dist\* root@VOTRE_IP_VPS:/var/www/cfpm/frontend-build/
```

**Pas besoin de redémarrer quoi que ce soit, Nginx sert les nouveaux fichiers immédiatement!**

## 🐛 Dépannage

### L'application ne démarre pas
```bash
# Vérifier les logs
pm2 logs cfpm-backend --lines 50

# Vérifier les erreurs PM2
pm2 describe cfpm-backend
```

### Erreurs de connexion à la base de données
```bash
# Vérifier que PostgreSQL fonctionne
sudo systemctl status postgresql

# Vérifier les credentials dans .env
cat /var/www/cfpm/backend/.env

# Tester la connexion manuellement
sudo -u postgres psql -d ge_cfpm
```

### Nginx ne démarre pas
```bash
# Voir les erreurs
sudo nginx -t

# Vérifier les logs
sudo tail -f /var/log/nginx/error.log
```

### Le site n'est pas accessible
```bash
# Vérifier que Nginx écoute sur le port 80/443
sudo netstat -tlnp | grep nginx

# Vérifier le pare-feu
sudo ufw status
# Si actif, autoriser HTTP/HTTPS:
sudo ufw allow 'Nginx Full'
```

### Problèmes SSL
```bash
# Renouveler manuellement le certificat
sudo certbot renew

# Vérifier la validité du certificat
sudo certbot certificates
```

## 📚 Ressources Utiles

- **Logs Backend**: `/var/www/cfpm/backend/logs/`
- **Logs Nginx**: `/var/log/nginx/`
- **Logs PM2**: `pm2 logs`
- **Backups DB**: `/var/www/cfpm/backups/`

## 🔐 Sécurité

### Recommandations importantes:

1. **Changer tous les mots de passe par défaut**
2. **Configurer un pare-feu:**
   ```bash
   sudo ufw enable
   sudo ufw allow ssh
   sudo ufw allow 'Nginx Full'
   ```

3. **Désactiver l'accès SSH par mot de passe (utiliser des clés SSH)**

4. **Mettre à jour régulièrement le système:**
   ```bash
   sudo apt-get update
   sudo apt-get upgrade
   ```

5. **Surveiller les logs régulièrement**

## 📞 Support

Si vous rencontrez des problèmes:
1. Vérifier les logs (`pm2 logs`, logs Nginx)
2. Consulter ce guide
3. Contacter le support LWS si problème d'infrastructure

---

**Bon déploiement! 🚀**
