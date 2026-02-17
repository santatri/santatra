# Export de la base de données PostgreSQL locale
# À exécuter sur Windows PowerShell

$date = Get-Date -Format "yyyyMMdd_HHmmss"
$filename = "ge_cfpm_backup_$date.sql"

Write-Host "🗄️ Export de la base de données ge_cfpm..." -ForegroundColor Cyan

# Chemin vers pg_dump (adapter selon votre installation)
$pgDumpPath = "C:\Program Files\PostgreSQL\14\bin\pg_dump.exe"

# Si pg_dump est dans le PATH, utiliser directement "pg_dump"
if (Test-Path $pgDumpPath) {
    & $pgDumpPath -U postgres -h localhost -d ge_cfpm -F p -f $filename
} else {
    pg_dump -U postgres -h localhost -d ge_cfpm -F p -f $filename
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Export réussi: $filename" -ForegroundColor Green
    
    $fileSize = (Get-Item $filename).Length / 1MB
    Write-Host "📊 Taille: $([math]::Round($fileSize, 2)) MB" -ForegroundColor Yellow
    
    Write-Host ""
    Write-Host "📤 Prochaines étapes:" -ForegroundColor Cyan
    Write-Host "1. Transférer vers le VPS:"
    Write-Host "   scp $filename root@VOTRE_IP_VPS:/tmp/" -ForegroundColor White
    Write-Host ""
    Write-Host "2. Sur le VPS, importer:"
    Write-Host "   sudo -u postgres psql -d ge_cfpm -f /tmp/$filename" -ForegroundColor White
} else {
    Write-Host "❌ Erreur lors de l'export" -ForegroundColor Red
}
