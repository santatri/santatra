#!/bin/bash

# Script de déploiement complet avec Git
# À exécuter sur le VPS Ubuntu après la configuration initiale

set -e  # Arrêter en cas d'erreur

echo "🚀 Déploiement CFPM avec Git..."

# Variables - PERSONNALISER SELON VOTRE CONFIG
REPO_URL="https://github.com/VOTRE_USERNAME/VOTRE_REPO.git"  # À MODIFIER
BRANCH="main"  # ou "master" selon votre branche principale
APP_DIR="/var/www/cfpm"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"
BUILD_DIR="$APP_DIR/frontend-build"
BACKUP_DIR="$APP_DIR/backups"

# Couleurs pour les messages
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}📦 Backup de la base de données...${NC}"
mkdir -p $BACKUP_DIR
if sudo -u postgres pg_dump ge_cfpm > "$BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).sql" 2>/dev/null; then
    echo -e "${GREEN}✅ Backup créé${NC}"
else
    echo -e "${YELLOW}⚠️  Pas de backup (première installation ?)${NC}"
fi

# Cloner ou mettre à jour le repository
if [ -d "$APP_DIR/.git" ]; then
    echo -e "${YELLOW}🔄 Mise à jour du code depuis Git...${NC}"
    cd $APP_DIR
    git fetch origin
    git reset --hard origin/$BRANCH
    git pull origin $BRANCH
else
    echo -e "${YELLOW}📥 Clone du repository...${NC}"
    sudo mkdir -p $APP_DIR
    cd /var/www
    sudo rm -rf cfpm
    git clone $REPO_URL cfpm
    cd $APP_DIR
    git checkout $BRANCH
fi

echo -e "${GREEN}✅ Code mis à jour${NC}"

# Backend
echo -e "${YELLOW}🔧 Configuration du backend...${NC}"
cd $BACKEND_DIR

# Vérifier si .env existe
if [ ! -f .env ]; then
    echo -e "${RED}❌ ERREUR: Fichier .env manquant !${NC}"
    echo "Créez le fichier .env avec les bonnes credentials de production"
    echo "Exemple: cp .env.production .env puis éditer avec nano .env"
    exit 1
fi

# Installer les dépendances
echo -e "${YELLOW}📦 Installation des dépendances backend...${NC}"
npm install --production

# Migrations
echo -e "${YELLOW}🗃️  Exécution des migrations...${NC}"
npm run migrate:prod

# Redémarrer le backend
echo -e "${YELLOW}🔄 Redémarrage du backend...${NC}"
if pm2 describe cfpm-backend > /dev/null 2>&1; then
    pm2 restart cfpm-backend
else
    pm2 start ecosystem.config.js --env production
    pm2 save
fi

echo -e "${GREEN}✅ Backend déployé${NC}"

# Frontend
echo -e "${YELLOW}🎨 Build du frontend...${NC}"
cd $FRONTEND_DIR

# Installer les dépendances
npm install

# Build de production
npm run build

# Copier le build vers le dossier servi par Nginx
echo -e "${YELLOW}📋 Copie du build frontend...${NC}"
sudo rm -rf $BUILD_DIR/*
sudo cp -r dist/* $BUILD_DIR/

echo -e "${GREEN}✅ Frontend déployé${NC}"

# Vérifications
echo ""
echo -e "${GREEN}✨ Déploiement terminé !${NC}"
echo ""
echo -e "${YELLOW}📊 Statut de l'application:${NC}"
pm2 status

echo ""
echo -e "${YELLOW}🔍 Derniers logs:${NC}"
pm2 logs cfpm-backend --lines 10 --nostream

echo ""
echo -e "${GREEN}✅ Vérifications à faire:${NC}"
echo "   1. Tester l'API: curl http://localhost:5000"
echo "   2. Tester le site: https://ge.cfpm-de-madagascar.com"
echo "   3. Vérifier les logs: pm2 logs cfpm-backend"
