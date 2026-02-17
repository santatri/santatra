# ✅ Checklist de Déploiement VPS Ubuntu avec Git

Suivez cette checklist pour déployer votre application CFPM sur votre VPS Ubuntu en utilisant Git.

## 📦 Préparation Locale (Sur votre PC)

### Git Repository
- [ ] Vérifier que votre code est dans Git (GitHub, GitLab, etc.)
- [ ] Vérifier que `.gitignore` exclut bien:
  - [ ] `node_modules/`
  - [ ] `.env` (fichiers d'environnement locaux)
  - [ ] `frontend/dist/`
- [ ] Faire un commit de tous vos changements
- [ ] Push vers votre repository: `git push origin main`

### Configuration Files
- [ ] Vérifier que `frontend/.env.production` contient la bonne URL
- [ ] Vérifier que tous les fichiers de config sont présents:
  - [ ] `backend/package.json` (avec scripts start/migrate:prod)
  - [ ] `backend/ecosystem.config.js` (configuration PM2)
  - [ ] `deploy-with-git.sh` (script de déploiement)
  - [ ] `backend/backup-db.sh` (script de backup)
- [ ] Préparer les credentials pour le fichier `.env` de production

## 🖥️ Configuration VPS Ubuntu

### Connexion et Installation des Outils
- [ ] Se connecter en SSH: `ssh root@VOTRE_IP_VPS`
- [ ] Installer Node.js 18.x
- [ ] Installer PostgreSQL
- [ ] Installer Nginx
- [ ] Installer PM2 globalement: `npm install -g pm2`
- [ ] Vérifier que Git est installé: `git --version`

### PostgreSQL
- [ ] Se connecter à PostgreSQL: `sudo -u postgres psql`
- [ ] Créer la base de données: `CREATE DATABASE ge_cfpm;`
- [ ] Créer l'utilisateur avec mot de passe fort
- [ ] Accorder les privilèges

### Structure de Dossiers
- [ ] Créer `/var/www/cfpm/backend`
- [ ] Créer `/var/www/cfpm/frontend-build`
- [ ] Créer `/var/www/cfpm/backups`

## 📤 Upload des Fichiers

### Via SCP ou FileZilla
- [ ] Transférer `d:\8219\backend\*` vers `/var/www/cfpm/backend/`
- [ ] Transférer `d:\8219\frontend\dist\*` vers `/var/www/cfpm/frontend-build/`
- [ ] Transférer `d:\8219\nginx.conf` vers le VPS (pour référence)

## ⚙️ Configuration Backend

- [ ] Aller dans `/var/www/cfpm/backend`
- [ ] Créer le fichier `.env` avec les vrais credentials de production
- [ ] Installer les dépendances: `npm install --production`
- [ ] Créer le dossier logs: `mkdir -p logs`
- [ ] Exécuter les migrations: `npm run migrate:prod`
- [ ] Démarrer avec PM2: `pm2 start ecosystem.config.js --env production`
- [ ] Sauvegarder PM2: `pm2 save`
- [ ] Configurer le démarrage automatique: `pm2 startup`
- [ ] Vérifier le statut: `pm2 status` ✅ doit être "online"
- [ ] Vérifier les logs: `pm2 logs cfpm-backend`

## 🌐 Configuration Nginx

- [ ] Créer `/etc/nginx/sites-available/cfpm` avec le contenu de `nginx.conf`
- [ ] Créer le lien symbolique: `ln -s /etc/nginx/sites-available/cfpm /etc/nginx/sites-enabled/`
- [ ] Tester la configuration: `sudo nginx -t`
- [ ] Redémarrer Nginx: `sudo systemctl restart nginx`

## 🔒 Configuration DNS et SSL

### DNS (Panel LWS)
- [ ] Créer un enregistrement A pointant vers l'IP du VPS
- [ ] Attendre la propagation DNS (5-30 minutes)
- [ ] Tester: `ping ge.cfpm-de-madagascar.com`

### SSL avec Certbot
- [ ] Installer Certbot: `apt-get install certbot python3-certbot-nginx`
- [ ] Obtenir le certificat: `certbot --nginx -d ge.cfpm-de-madagascar.com`
- [ ] Suivre les instructions de Certbot
- [ ] Vérifier le renouvellement auto: `certbot renew --dry-run`

## ✅ Tests et Vérification

### Backend
- [ ] Test local: `curl http://localhost:5000` ➜ doit répondre
- [ ] PM2 status: `pm2 status` ➜ doit être "online"
- [ ] Logs: `pm2 logs cfpm-backend` ➜ pas d'erreurs

### Frontend + Nginx
- [ ] Tester HTTP: `curl http://localhost` ➜ retourne HTML
- [ ] Nginx status: `systemctl status nginx` ➜ actif

### Base de Données
- [ ] Se connecter: `sudo -u postgres psql -d ge_cfpm`
- [ ] Lister les tables: `\dt` ➜ toutes les tables présentes
- [ ] Vérifier les données: `SELECT COUNT(*) FROM users;`

### Depuis le Navigateur
- [ ] Ouvrir `https://ge.cfpm-de-madagascar.com`
- [ ] Page d'accueil se charge correctement
- [ ] Tester la connexion
- [ ] Vérifier que les appels API fonctionnent (DevTools > Network)
- [ ] Tester une fonctionnalité complète (créer un paiement, etc.)

## 🔧 Configuration des Backups

- [ ] Rendre le script exécutable: `chmod +x /var/www/cfpm/backend/backup-db.sh`
- [ ] Tester le backup manuellement: `./backend/backup-db.sh`
- [ ] Configurer le cron pour backup quotidien à 2h du matin:
  ```bash
  crontab -e
  # Ajouter: 0 2 * * * /var/www/cfpm/backend/backup-db.sh >> /var/www/cfpm/backups/cron.log 2>&1
  ```

## 🔐 Sécurité

- [ ] Changer tous les mots de passe par défaut
- [ ] Configurer le pare-feu UFW:
  ```bash
  ufw enable
  ufw allow ssh
  ufw allow 'Nginx Full'
  ```
- [ ] Mettre à jour le système: `apt-get update && apt-get upgrade`
- [ ] Vérifier que `.env` n'est pas accessible publiquement

## 📝 Documentation

- [ ] Noter toutes les credentials dans un gestionnaire de mots de passe sécurisé
- [ ] Documenter l'IP du VPS
- [ ] Documenter les chemins importants
- [ ] Garder une copie de `DEPLOIEMENT_VPS.md` accessible

## 🎉 Finalisation

- [ ] Tester toutes les fonctionnalités principales de l'application
- [ ] Surveiller les logs pendant 24h pour détecter d'éventuelles erreurs
- [ ] Informer les utilisateurs que le système est en ligne

---

## 📞 En cas de problème

1. **Vérifier les logs**: `pm2 logs cfpm-backend`
2. **Vérifier Nginx**: `sudo tail -f /var/log/nginx/error.log`
3. **Vérifier PostgreSQL**: `sudo systemctl status postgresql`
4. **Redémarrer si nécessaire**: `pm2 restart cfpm-backend`
5. **Consulter** `DEPLOIEMENT_VPS.md` section Dépannage

---

**Bonne chance avec votre déploiement! 🚀**
