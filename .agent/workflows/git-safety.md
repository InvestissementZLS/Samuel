---
description: Guide de sécurité Git pour Antigravity
---

# Guide de Sécurité & Backups Git

Ce guide explique comment protéger votre code avant de faire des modifications importantes.

## 1. Créer un point de sauvegarde (Tag)
Avant tout gros changement, créez un marque-page permanent.
```powershell
# Créer le tag localement
git tag -a v1.0-stable -m "Version stable avant modifs"
# Envoyer le tag sur GitHub
git push origin v1.0-stable
```

## 2. Travailler sur une Branche (Sécurité Maximale)
Ne travaillez jamais directement sur `main` pour des nouveaux projets.
```powershell
# 1. Créer et aller sur une nouvelle branche
git checkout -b ma-nouvelle-fonctionnalite

# 2. Travaillez normalement, faites vos commits
git add .
git commit -m "Ajout de X"

# 3. Envoyer la branche sur GitHub
git push origin ma-nouvelle-fonctionnalite
```

## 3. Revenir en arrière si tout casse
### Si vous êtes sur une branche :
Revenez simplement sur `main` pour retrouver votre code intact.
```powershell
git checkout main
```

### Si vous avez cassé `main` :
Utilisez le tag que vous avez créé à l'étape 1.
```powershell
git reset --hard v1.0-stable
git push origin main --force
```

## 4. Fusionner (Merge) quand tout est fini
Une fois que votre branche fonctionne parfaitement et que vous l'avez testée :
```powershell
git checkout main
git merge ma-nouvelle-fonctionnalite
git push origin main
```
