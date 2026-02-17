#!/bin/bash

# Script de backup automatique de la base de données
# À programmer dans cron pour exécution quotidienne

# Variables
BACKUP_DIR="/var/www/cfpm/backups"
DB_NAME="ge_cfpm"
DB_USER="postgres"
RETENTION_DAYS=7

# Créer le dossier de backup s'il n'existe pas
mkdir -p $BACKUP_DIR

# Nom du fichier de backup
BACKUP_FILE="$BACKUP_DIR/cfpm_backup_$(date +%Y%m%d_%H%M%S).sql"

# Créer le backup
echo "🗄️  Création du backup de la base de données..."
sudo -u postgres pg_dump $DB_NAME > $BACKUP_FILE

# Compresser le backup
gzip $BACKUP_FILE
echo "✅ Backup créé: $BACKUP_FILE.gz"

# Supprimer les backups de plus de X jours
echo "🧹 Nettoyage des anciens backups (> $RETENTION_DAYS jours)..."
find $BACKUP_DIR -name "*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete

echo "✨ Backup terminé avec succès!"

# Afficher les backups disponibles
echo ""
echo "📋 Backups disponibles:"
ls -lh $BACKUP_DIR/*.sql.gz | tail -5
