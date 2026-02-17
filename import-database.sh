#!/bin/bash

# Script d'import de base de données sur VPS
# À exécuter sur le serveur Ubuntu

SQL_FILE=$1

if [ -z "$SQL_FILE" ]; then
    echo "❌ Usage: ./import-database.sh <chemin_vers_fichier.sql>"
    echo "Exemple: ./import-database.sh /tmp/ge_cfpm_backup.sql"
    exit 1
fi

if [ ! -f "$SQL_FILE" ]; then
    echo "❌ Fichier introuvable: $SQL_FILE"
    exit 1
fi

echo "🗄️ Import de la base de données ge_cfpm..."
echo "📄 Fichier: $SQL_FILE"
echo ""

# Backup de sécurité avant import (si la base existe déjà)
BACKUP_FILE="/tmp/ge_cfpm_backup_before_import_$(date +%Y%m%d_%H%M%S).sql"
echo "📦 Création d'un backup de sécurité..."
if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw ge_cfpm; then
    sudo -u postgres pg_dump ge_cfpm > "$BACKUP_FILE"
    echo "✅ Backup sauvegardé: $BACKUP_FILE"
else
    echo "ℹ️ Base de données ge_cfpm n'existe pas encore, création..."
    sudo -u postgres psql -c "CREATE DATABASE ge_cfpm;"
fi

# Import du fichier SQL
echo ""
echo "📥 Import en cours..."
sudo -u postgres psql -d ge_cfpm -f "$SQL_FILE"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Import réussi!"
    echo ""
    
    # Statistiques
    echo "📊 Statistiques de la base de données:"
    sudo -u postgres psql -d ge_cfpm -c "
    SELECT 
        schemaname,
        tablename,
        n_tup_ins as total_rows
    FROM pg_stat_user_tables
    ORDER BY n_tup_ins DESC;
    "
    
    echo ""
    echo "📋 Tables disponibles:"
    sudo -u postgres psql -d ge_cfpm -c "\dt"
    
    echo ""
    echo "🔄 Redémarrage du backend..."
    if pm2 describe cfpm-backend > /dev/null 2>&1; then
        pm2 restart cfpm-backend
        echo "✅ Backend redémarré"
    else
        echo "⚠️ Backend PM2 non trouvé, démarrez-le manuellement"
    fi
    
    echo ""
    echo "✨ Import terminé avec succès!"
else
    echo ""
    echo "❌ Erreur lors de l'import"
    echo "💡 Vérifiez les logs ci-dessus pour plus de détails"
    
    if [ -f "$BACKUP_FILE" ]; then
        echo "📦 Un backup a été créé: $BACKUP_FILE"
    fi
    exit 1
fi
