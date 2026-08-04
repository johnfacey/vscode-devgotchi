# Change Log

All notable changes to the "DevGotchi" extension will be documented in this file.

## [Unreleased]

## [2.2.0] - 2026-08-03

### Added
- **Settings panel**: a new ⚙️ Settings button on the panel (and `DevGotchi: Open Settings` command) lets you toggle Weekly Recap notifications, reduce achievement popups (they still log to the Activity Log), and choose a stat decay speed (Relaxed / Normal / Intense). Settings are stored separately from progress, so resetting or importing progress never touches them.
- **Progress export/import**: `DevGotchi: Export Progress` saves your full save (stats + settings) as a portable JSON file; `DevGotchi: Import Progress` restores from one after an explicit confirmation, so you can back up progress or move it to another machine. Both are also available as Export/Import buttons inside the new Settings panel.
- **Vacation Mode**: a new toggle in Settings (and `DevGotchi: Toggle Vacation Mode`) freezes stat decay, burnout, and streak-breaking entirely while it's on — so a few days off doesn't come back to a burnt-out avatar or a broken streak. A banner shows on the panel while it's active; turn it off to resume normally right where you left off.
- **Feedback link**: a "💬 Send Feedback / Report a Bug" link inside the Settings panel (and `DevGotchi: Send Feedback` command) opens the GitHub issues page directly.
- **Team Mode**: an opt-in, per-workspace way to see teammates' progress — no server, no accounts. When enabled (Settings, or `DevGotchi: Toggle Team Mode`), your progress is written to `.devgotchi/team/<you>.json` in the repo; syncing happens through your team's normal git commits and pushes. A new 👥 Team button/view (also `DevGotchi: Open Team View`) shows everyone's level and streak. Only shown for repos with more than one contributor — a "team" of one is just clutter.
- A "What's New" popup now shows existing users a summary of new features when the extension updates to a new version.

## [2.1.0] - 2026-07-06

### Added
- **Bug Boss**: the panel's boss card now reflects real active lint/build errors — HP is tied 1:1 to your actual error count (Syntax Wraith → NullPointerDemon → StackOverflow Behemoth → Overwhelmulus as errors pile up). Clearing every error defeats the boss for a bonus (+30 XP, +15 ☕). Falls back to the original health-based Burnout Boss when there are no active errors.
- **Weekly Recap**: once every ~7 days, a notification summarizes what changed since the last one — XP earned, commits, bugs fixed, focus sprints completed, level progress, current streak. Stays silent for weeks with no activity.
- **Focus Sprint (Pomodoro mode)**:
    - Start a 15/25/50-minute timed sprint from the panel or Command Palette (`DevGotchi: Start Focus Sprint`).
    - 1.5x XP multiplier and 50%-slower Focus decay while a sprint is active.
    - Completion awards a bonus (+40 XP, +25 ☕); cancelling early forfeits it.
    - Live countdown in the panel (new Focus Sprint card) and in the status bar.
    - New command: `DevGotchi: Cancel Focus Sprint`.
    - New **Deep Work** achievement (13th badge) for completing 10 Focus Sprints.
- **Share Stats Card**: a new 📤 Share button (and `DevGotchi: Export Stats Card` command) opens a shareable stats card with two export options:
    - **Copy as Markdown** — a paste-ready stats block for a GitHub README or PR description.
    - **Save as Image** — a cyberpunk-styled PNG rendered client-side in the panel, saved wherever you choose.
    - Fully local: the card is drawn from data already on your machine, nothing is sent anywhere except the file/text you explicitly export.
- **Review prompt**: engaged users (3+ achievements or Level 5+) are asked once to rate DevGotchi on the Marketplace, with "Remind Me Later" / "Don't Ask Again" respected.
- Refreshed Marketplace listing copy (description, keywords) and a new panel screenshot reflecting the 2.0 cyberpunk UI.

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