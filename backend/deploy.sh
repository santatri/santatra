#!/bin/bash

# Script de déploiement automatique pour CFPM
# À exécuter sur le VPS LWS

set -e  # Arrêter en cas d'erreur

echo "🚀 Démarrage du déploiement CFPM..."

# Variables
APP_DIR="/var/www/cfpm"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend-build"
BACKUP_DIR="$APP_DIR/backups"

# Créer un backup de la base de données
echo "📦 Backup de la base de données..."
mkdir -p $BACKUP_DIR
sudo -u postgres pg_dump ge_cfpm > "$BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).sql"

# Backend - Mise à jour
echo "🔧 Mise à jour du backend..."
cd $BACKEND_DIR

# Arrêter l'application
pm2 stop cfpm-backend || true

# Installer les dépendances
npm install --production

# Exécuter les migrations
npm run migrate:prod

# Redémarrer l'application
pm2 start ecosystem.config.js --env production
pm2 save

echo "✅ Backend mis à jour et redémarré"

# Vérifier le statut
echo "📊 Statut de l'application:"
pm2 status

echo ""
echo "✨ Déploiement terminé avec succès!"
echo ""
echo "🔍 Vérifications à faire:"
echo "   - Vérifier les logs: pm2 logs cfpm-backend"
echo "   - Tester l'API: curl http://localhost:5000"
echo "   - Tester le site: https://ge.cfpm-de-madagascar.com"
