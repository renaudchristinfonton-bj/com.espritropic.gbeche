# Script de migration pnpm -> npm
# Exécuter depuis le dossier du projet : .\migrate-to-npm.ps1

Write-Host "Migration pnpm -> npm..." -ForegroundColor Cyan

# 1. Supprimer les fichiers pnpm
if (Test-Path "pnpm-workspace.yaml") {
    Remove-Item "pnpm-workspace.yaml" -Force
    Write-Host "[OK] pnpm-workspace.yaml supprime" -ForegroundColor Green
}
if (Test-Path "pnpm-lock.yaml") {
    Remove-Item "pnpm-lock.yaml" -Force
    Write-Host "[OK] pnpm-lock.yaml supprime" -ForegroundColor Green
}

# 2. Supprimer node_modules
if (Test-Path "node_modules") {
    Write-Host "Suppression de node_modules (peut prendre du temps)..." -ForegroundColor Yellow
    Remove-Item "node_modules" -Recurse -Force
    Write-Host "[OK] node_modules supprime" -ForegroundColor Green
}

# 3. Supprimer package-lock.json si existe (ancienne version)
if (Test-Path "package-lock.json") {
    Remove-Item "package-lock.json" -Force
    Write-Host "[OK] package-lock.json supprime" -ForegroundColor Green
}

# 4. Reinstaller avec npm
Write-Host "Installation des paquets avec npm..." -ForegroundColor Cyan
npm install

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "[OK] Migration terminee ! Paquets installes avec npm." -ForegroundColor Green
    Write-Host "Lance le projet avec : npx expo start" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "[ERREUR] npm install a echoue. Voir les erreurs ci-dessus." -ForegroundColor Red
    Write-Host "Essaie : npm install --legacy-peer-deps" -ForegroundColor Yellow
}
