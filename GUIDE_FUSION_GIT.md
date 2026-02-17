# Guide : Fusionner Backend et Frontend en un Seul Repository Git

## Situation Actuelle
- ✅ `d:\8219\backend` a son propre repository Git
- ✅ `d:\8219\frontend` a son propre repository Git
- ❌ `d:\8219` n'est pas un repository Git

## Objectif
Créer un seul repository Git dans `d:\8219` contenant backend ET frontend.

---

## 🚀 Méthode 1 : Nouveau Repository (RECOMMANDÉ)

### Étape 1 : Initialiser le repository principal

```powershell
# Aller dans le dossier principal
cd d:\8219

# Initialiser Git
git init

# Créer le fichier .gitignore principal
# (Le fichier sera créé automatiquement, voir ci-dessous)
```

### Étape 2 : Nettoyer les anciens repositories

```powershell
# Supprimer les anciens .git dans backend et frontend
Remove-Item -Path "d:\8219\backend\.git" -Recurse -Force
Remove-Item -Path "d:\8219\frontend\.git" -Recurse -Force
```

### Étape 3 : Premier commit

```powershell
# Ajouter tous les fichiers
git add .

# Premier commit
git commit -m "Initial commit - Backend + Frontend"
```

### Étape 4 : Connecter à GitHub/GitLab

**Si vous n'avez pas encore de repository distant :**

1. Créer un nouveau repository sur GitHub (ou GitLab/Bitbucket)
2. NE PAS initialiser avec README ou .gitignore

```powershell
# Connecter au repository distant (remplacer par votre URL)
git remote add origin https://github.com/VOTRE_USERNAME/VOTRE_REPO.git

# Pousser le code
git branch -M main
git push -u origin main
```

---

## 🔧 Méthode 2 : Garder l'Historique (Plus complexe)

Si vous voulez conserver l'historique Git de backend et frontend, c'est possible mais plus complexe. Dites-moi si vous en avez besoin.

---

## ⚠️ Fichiers Importants

### .gitignore Principal

Créez `d:\8219\.gitignore` avec ce contenu :

```gitignore
# Dependencies
node_modules/
*/node_modules/

# Environment variables
.env
.env.local
.env.*.local
backend/.env
frontend/.env

# Build outputs
frontend/dist/
frontend/build/

# Logs
logs/
*.log
npm-debug.log*
backend/logs/

# OS files
.DS_Store
Thumbs.db

# Editor files
.vscode/
.idea/
*.swp
*.swo

# Backups
backups/
*.sql
*.sql.gz
```

---

## ✅ Vérification Finale

```powershell
# Vérifier le statut
git status

# Vérifier les branches
git branch

# Vérifier les remotes
git remote -v
```

---

## 📁 Structure Finale

```
d:\8219/                    # ← Repository Git principal
├── .git/                   # ← Git du projet complet
├── .gitignore              # ← Gitignore principal
├── README_DEPLOIEMENT.md
├── DEPLOIEMENT_GIT.md
├── deploy-with-git.sh
├── nginx.conf
├── backend/
│   ├── .env               # ← Ignoré par .gitignore
│   ├── .gitignore         # ← (Optionnel, déjà dans principal)
│   └── ...
└── frontend/
    ├── .env               # ← Ignoré par .gitignore
    ├── .gitignore         # ← (Optionnel, déjà dans principal)
    └── ...
```

---

## 🎯 Après la Fusion

Une fois le repository unique créé :

1. **Sur votre PC** : 
   ```powershell
   git add .
   git commit -m "Vos modifications"
   git push origin main
   ```

2. **Sur le VPS** :
   ```bash
   cd /var/www
   git clone https://github.com/VOTRE_USERNAME/VOTRE_REPO.git cfpm
   # Puis suivre le guide DEPLOIEMENT_GIT.md
   ```

---

## 💡 Conseils

- ✅ Le .gitignore principal exclut déjà `.env` - ne commitez JAMAIS vos credentials
- ✅ Vous pouvez garder les .gitignore dans backend/ et frontend/ si vous voulez
- ✅ Faites un backup avant de supprimer les .git si vous avez du code non commité

---

**Besoin d'aide pour exécuter ces commandes ? Dites-le moi !**
