# 🎪 Festitoche

**Festitoche** est un jeu web de **gestion et simulation de festival de musique**. Vous incarnez un
organisateur qui développe son événement **édition après édition** (= année après année), jusqu'à bâtir
un festival de renommée **mondiale**.

> Inspiré de Football Manager, RollerCoaster Tycoon, Planet Coaster & Two Point Campus.
> Simple à prendre en main, profond à maîtriser.

---

## 🎮 Le jeu en bref

À chaque édition, vous devez :

1. **🎤 Programmer** des artistes (catalogue de **120 artistes** fictifs, popularité évolutive).
2. **🏗️ Construire** vos infrastructures (scènes, sanitaires, bars, food, camping, parking, VIP, sécurité, personnel).
3. **📣 Investir** en marketing (Instagram, TikTok, Facebook, Google Ads, Influenceurs, Affichage).
4. **🤝 Signer** des sponsors (en gérant la compatibilité avec votre image).
5. **🎟️ Fixer** le prix du billet (élasticité prix/demande en direct).
6. **🎬 Lancer** l'édition : le moteur simule fréquentation, recettes, dépenses, incidents, satisfaction
   et réputation, puis génère un **rapport complet** avec des **avis de festivaliers réalistes**.

Votre **réputation** débloque progressivement 5 paliers — `📍 Local → 🗺️ Régional → 🏆 National →
🇪🇺 Européen → 🌍 Mondial` — qui ouvrent de nouveaux artistes, sponsors, infrastructures et capacités.

La partie est **sauvegardée automatiquement** dans le navigateur (localStorage). Aucun backend requis.

---

## 🚀 Démarrer

```bash
npm install      # installe les dépendances
npm run dev      # lance le serveur de développement (http://localhost:5173)
npm run build    # vérifie les types + build de production
npm run preview  # sert le build de production
npm run smoke    # test de fumée du moteur de simulation (Node/tsx)
```

> Node 18+ recommandé. Le jeu est **entièrement jouable dès le premier lancement**.

---

## 🧱 Architecture

Application **React + TypeScript + Tailwind**, bundlée avec **Vite**, état géré par **Zustand**
(avec persistance localStorage). Toute la base de données est en TypeScript/JSON local.

```
src/
├── types/             # Modèle de données complet du jeu (une source de vérité)
│
├── data/              # « Base de données » locale du jeu
│   ├── artists.ts        # 120 artistes (générés de façon déterministe + stats dérivées)
│   ├── sponsors.ts       # Sponsors par palier (boisson, bière, auto, télécom, streaming…)
│   ├── infrastructures.ts# Scènes, sanitaires, bars, food, camping, parking, VIP, sécurité, staff
│   ├── marketing.ts      # 6 canaux marketing (coût, portée, efficacité, ciblage)
│   ├── locations.ts      # 6 localisations (coût, capacité, climat, contraintes)
│   ├── styles.ts         # 7 styles musicaux + matrice d'affinité de genre
│   ├── weather.ts        # Conditions météo et leurs impacts
│   ├── reputation.ts     # 5 paliers de réputation et leurs déblocages
│   └── events.ts         # Événements aléatoires (incidents & opportunités)
│
├── engine/            # Moteur de jeu (logique pure, testable, sans React)
│   ├── economy.ts        # Agrégation line-up / infra / marketing, capacité, prix de référence
│   ├── simulation.ts     # Cœur : fréquentation, recettes, dépenses, satisfaction, réputation
│   ├── events.ts         # Tirage & résolution des événements (probabilités contextuelles)
│   ├── feedback.ts       # Génération d'avis de festivaliers réalistes
│   ├── forecast.ts       # Prévision météo selon le climat de la localisation
│   └── popularity.ts     # Évolution annuelle de la popularité des artistes
│
├── store/
│   └── gameStore.ts      # État global Zustand + sauvegarde auto + cycle des éditions
│
├── hooks/
│   └── usePlanSummary.ts # Calculs de planification en direct partagés par toute l'UI
│
├── components/        # UI
│   ├── ui/               # Primitives réutilisables (barres, jauges, étoiles, modale, stepper…)
│   ├── Dashboard.tsx     # Tableau de bord (toutes les métriques clés + projection)
│   ├── ArtistBooking.tsx # Phase 2 — programmation artistique
│   ├── InfrastructurePanel.tsx # Phase 3 — infrastructures
│   ├── MarketingPanel.tsx# Phase 4 — marketing
│   ├── SponsorsPanel.tsx # Phase 5 — sponsors
│   ├── TicketsPanel.tsx  # Billetterie / prix
│   ├── SimulationScreen.tsx # Phase 6 — gestion des imprévus & lancement
│   ├── ReportScreen.tsx  # Rapport de fin d'édition
│   └── HistoryModal.tsx  # Historique des éditions précédentes
│
└── screens/
    ├── NewGameScreen.tsx # Phase 1 — création du festival (nom / style / lieu)
    └── GameScreen.tsx    # Ossature : barre supérieure, navigation, routage des phases
```

---

## ⚙️ Le moteur de simulation

Le fichier `engine/simulation.ts` calcule, à partir de votre planification :

- **Demande & fréquentation** : pouvoir d'attraction du line-up (pondéré par l'affinité de genre) +
  notoriété marketing + popularité + réputation, modulé par l'**élasticité-prix**, le style, la
  localisation, la **météo** et les **événements**, puis plafonné par la **capacité** (scènes × site × palier).
- **Recettes** : billetterie, sponsors, bars/food/camping/parking (panier moyen × public servi) et VIP.
- **Dépenses** : cachets, infrastructures, personnel & sécurité, marketing, location du site, imprévus.
- **Satisfaction** : 3 sous-notes — **Programmation**, **Infrastructures**, **Organisation** —
  combinées avec la météo, le prix et l'image des sponsors (couverture des besoins = clé anti-files d'attente).
- **Réputation** : évolue selon la qualité de l'édition, le remplissage, le prestige de la tête d'affiche
  et les événements (gains ralentis vers le sommet).

Le tout est **déterministe par édition** (RNG seedé) pour éviter le _save-scumming_, tout en restant
imprévisible d'une année à l'autre.

---

## 💾 Sauvegarde

- **Automatique** : chaque action est persistée dans `localStorage` (`festitoche-save-v1`).
- **Chargement** : la partie reprend automatiquement à l'ouverture.
- **Historique** : toutes les éditions passées sont consultables (menu `⋯ → Historique`).
- **Nouvelle partie** : réinitialise tout (avec confirmation).

---

## 🛠️ Stack technique

| Outil        | Rôle                                  |
| ------------ | ------------------------------------- |
| React 18     | UI                                    |
| TypeScript 5 | Typage strict de bout en bout         |
| Tailwind 3   | Style (thème festival sombre & néon)  |
| Vite 5       | Dev server & build                    |
| Zustand 4    | État global + persistance localStorage|

Aucun backend, aucune base de données externe : **100 % côté client**.
