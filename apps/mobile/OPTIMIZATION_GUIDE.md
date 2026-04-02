# Guide d'Optimisation - Application Mobile Praxis ZLS (React Native / Expo)

Félicitations pour la compilation réussie de ta toute première application mobile ! 🎉
Puisque l'application `apps/mobile` est maintenant fonctionnelle, voici le guide de référence pour optimiser l'expérience utilisateur, la rapidité, et la fluidité au fur et à mesure que tu ajoutes des fonctionnalités.

L'optimisation sur mobile (React Native) se divise en 4 grands piliers. 

---

## 1. La Fluidité de l'Interface (FPS & Rendu)
Contrairement au web où l'ordinateur a beaucoup de puissance de calcul, une application mobile doit être totalement fluide sous le doigt (idéalement 60 images par seconde) même sur les vieux téléphones.

*   **L'affichage des Listes :** Si tu as un écran avec des centaines d'éléments (comme `JobListScreen.tsx` ou la liste des clients), n'utilise **jamais** de simples `.map()`. Utilise le composant `<FlatList>` natif de React Native.
    *   *Pourquoi ?* Le `<FlatList>` détruit intelligemment de la mémoire les éléments qui sortent de l'écran, et ne crée que ceux qui deviennent visibles. C'est le secret absolu de la fluidité.
*   **La mémoire React (Re-renders) :** Quand l'utilisateur tape sur un bouton, on ne veut pas que tout l'écran complet se recharge inutilement. Utilise des outils comme `React.memo` sur tes sous-composants ou `useCallback` sur tes fonctions complexes pour dire à l'application : *"Ne recalcule que la zone exacte qui a changé"*.

## 2. Les Animations (Le processeur Graphique)
Tu te souviens du module `react-native-worklets` qu'on a dû installer manuellement pour débloquer la compilation de l'APK ? C'est le cœur de l'optimisation des animations !

*   Sur un téléphone, le code Javascript et l'Interface Visuelle (UI Thread) tournent sur deux fils séparés. Si tu calcules une animation avec du simple Javascript (comme un compte à rebours web), ça risque de saccader fortement. 
*   **La solution :** La librairie `react-native-reanimated` (et ses fameux *worklets*) intercepte ton animation et l'envoie **directement sur la carte graphique** du téléphone. L'animation roule alors en natif sans jamais bloquer le reste de l'application.

## 3. Le Réseau, les Données et l'API Vercel
La connexion internet sur un téléphone saute constamment (ascenseurs, sous-sols, zones rurales).

*   **Mise en cache intelligente :** Au lieu de refaire appel à la base de données Vercel (`REST` ou `tRPC`) à chaque fois que l'utilisateur ouvre l'écran des Jobs, on sauvegarde la dernière réponse en mémoire (avec des outils comme `React Query` ou `Zustand`). L'écran s'affiche ainsi instantanément depuis le cache, et la mise à jour des nouvelles données se fait silencieusement en arrière-plan.
*   **Mode hors-ligne (`SQLite`) :** Pour les techniciens sur la route, la synchronisation avec la base de données interne (`expo-sqlite`) permet de continuer à travailler (comme "Punch in" / "Punch out") même sans aucun réseau, avec l'envoi au serveur Vercel différé dès que la connexion revient.

## 4. La Taille de l'Application (L'APK / Bundle Size)
Plus l'application est légère, plus vite elle s'installe et s'ouvre.

*   Évite d'importer l'intégralité d'une énorme librairie externe si tu n'as besoin que d'une seule petite fonction.
*   Compresse physiquement les images de base de l'application (dans le dossier `/assets/`) au format WebP ou PNG optimisé. Le serveur d'Expo va ainsi compiler un `.apk` et un `.aab` (pour le Play Store) beaucoup plus minces !

---
*Document généré automatiquement à la suite du succès de l'intégration continue.*
