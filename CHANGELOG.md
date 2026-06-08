# Change Log

All notable changes to the "DevGotchi" extension will be documented in this file.

## [2.0.0] - 2026-06-08

### Added
- **Cyberpunk UI Redesign**:
    - Full visual overhaul using a dark navy + neon purple/pink/blue/gold palette.
    - Monospace pixel-style font (`Share Tech Mono`) throughout the panel.
    - Neon glowing stat bars, avatar frame pulse animation, and neon-bordered cards.
    - Profile card with avatar, level badge, XP bar, coffee beans chip, and daily streak chip.
    - Active Quest and Burnout Boss mini-cards visible on the main panel at all times.
    - All modals, buttons, and skill/shop items restyled to match the cyberpunk aesthetic.

- **Procedural Cyberpunk Music**:
    - Ambient music synthesised entirely with the Web Audio API — no external files or network requests.
    - Layered composition: kick drum, hi-hat pattern, walking A-minor bass line, pentatonic arpeggio, slow-swelling pad chords, and a sparse synth lead.
    - Toggle on/off with the 🎵 Music button; fades in/out smoothly.

- **Achievements System**:
    - 12 unlockable badges tracking lifetime milestones: First Keystroke, Ship It, Code Monk, Legendary Dev, Week Warrior, Iron Discipline, Exterminator, Commit Machine, Caffeinated, Back from the Edge, Quest Master, and Getting Warmed Up.
    - Achievement unlocks show a VS Code notification and are recorded in the activity log.
    - Dedicated 🏅 Awards panel listing earned and locked achievements with progress context.

- **Activity Log**:
    - Scrollable real-time feed of XP gains, coffee earnings, level-ups, achievement unlocks, random events, and burnout state changes.
    - Entries are colour-coded by type (purple = XP, gold = coffee, blue = events, pink = achievements, red = burnout).
    - Capped at 50 entries; toggled via the 📡 Log button.

- **Random Events**:
    - Approximately 12% chance per passive tick of triggering a surprise event.
    - Pool of 10 events: both positive (coffee stash found, rubber duck breakthrough, open-source PR merged) and negative (production incident, git blame, surprise code review).
    - Each event is logged to the activity log and shown as a VS Code notification.

- **Burnout State**:
    - Entering full burnout (health = 0) triggers a red glitch overlay, a pulsing critical warning banner, and locks most action buttons.
    - Only Coffee and Take a Break remain available during burnout.
    - Recovering above 30 health automatically exits burnout and unlocks the *Back from the Edge* achievement.

- **Lifetime Stat Tracking**:
    - New persistent counters: `totalBugsFixed`, `totalCommits`, `totalCoffeeEarned` — used to gate achievements across sessions.

## [1.1.1] - 2024-01-17

### Added
- **Patched**:
    - **XP Gain**: Change to the XP Gain.
- **RPG Mechanics**:
    - **Leveling System**: Gain XP from coding activities to level up your developer.
    - **Dynamic Stats**: Track Health, Motivation, Focus, and Energy in real-time.
    - **Mood System**: Avatar reacts to stats and time of day (e.g., "Productive", "Tired", "Burnt Out").
- **Economy & Shop**:
    - **Coffee Beans**: Earn currency by saving files and completing challenges.
    - **The Shop**: Purchase cosmetic skins (Space Suit, Business Suit) and stat-boosting items (Ergo Chair, Mech Keyboard).
    - **Inventory**: Manage and equip purchased items.
- **Skill System**:
    - **Skill Tree**: Unlock passive abilities like "Caffeine Tolerance" and "Iron Focus" to improve stat sustainability.
- **Workflow Integrations**:
    - **Git Integration**: Awards XP and Motivation for commits and merges.
    - **Linter Sync**: Active errors drain stats; fixing errors grants XP bonuses.
- **Gameplay Features**:
    - **Daily Quests**: Complete random daily objectives (e.g., "Fix 3 Bugs") for extra rewards.
    - **Daily Login Bonus**: Earn rewards for logging in daily, with a streak multiplier.
    - **Night Mode**: Avatar automatically sleeps between 10 PM and 6 AM.
    - **Leaderboard**: Compare your level against rival developers.
    - **Tutorial Mode**: Interactive guide for new users explaining UI features.
    - **Management**: Options to rename your avatar or reset progress entirely.
- **Mini-Games**:
    - **Boss Battle**: Type code snippets quickly to defeat the Bug Monster.
    - **Bug Hunt**: Click bugs in a grid to clear them.
    - **Speed Test**: Test your typing speed for rewards.
- **UI Improvements**:
    - Interactive Webview Panel with action buttons for Coffee, Breaks, and Menus.
    - Status Bar item displaying current Level, Mood, and Health.
    - Visual feedback for leveling up and earning rewards.