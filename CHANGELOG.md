# Change Log

All notable changes to the "DevGotchi" extension will be documented in this file.

## [Unreleased]

### Roadmap — ideas being considered, not yet built
- **Raid Boss MVP**: show each teammate's bug-fix contribution during a Team Raid Boss fight, with an "MVP" tag for whoever cleared the most.
- **Code Smell Boss, function-length mode**: the current boss only counts bloated *files* (300+ lines, free via `TextDocument.lineCount`); flagging individual 200-line *functions* needs real per-language parsing and is a bigger, separate build.

## [2.8.0] - 2026-09-25

### Added
- **The Legacy Code Dungeon**: a 7-chapter narrative questline, new 📖 Story button. Each chapter is one objective (save/commit/fix/time, same shape as a daily quest) with its own flavor text; completing one starts a next-day gate, so the full arc plays out over at least 7 real days instead of being grindable in one sitting. Finishing all 7 chapters grants an exclusive 💀 Legacy Slayer skin.
- **Community Quest Packs**: a shareable JSON format for themed quest sets, importable from a local file (`DevGotchi: Import Quest Pack from File`, zero network calls) or, opt-in, from a URL (`DevGotchi: Import Quest Pack from URL`) with an explicit confirmation dialog disclosing the request — the only thing in DevGotchi that ever makes a network call, and only when you ask it to. Since this is the first place the extension ever consumes someone else's content, every field is strictly validated (bounded targets/rewards, allow-listed quest types) and HTML-escaped before it's stored. Two example packs ship in the repo's `quest-packs/` folder: "100 Days of Code" and a "Hacktoberfest Quest Pack" (a separate, stackable track from the existing seasonal Hacktoberfest event). New 🎁 Quest Packs section in the Quests modal, with per-pack removal.
- **Boss Affixes**: a Diablo-rift-style weekly mutator, shown as a banner on the panel — deterministically picked from the ISO week number, so it rotates automatically every Monday with no server and no persisted state. Mostly positive/flavorful (Sprint Surge, Boss Rush, Quest Rally, Iron Streak, Slow Burn, Caffeine Week), plus one that ties into something you already control directly (Double Trouble: active bugs drain stats twice as fast).
- **Timesheet Mode**: a new 📊 Export Timesheet button in Settings exports your real coding time (tracked the same "ignore offline/idle time" way as quest time already was) as a Date/Hours CSV for the last 7/30/90 days or all history — no rate applied, just honest billable hours for freelancers to plug into their own invoicing.

## [2.7.0] - 2026-09-25

### Added
- **Seasonal Events**: a full year-round calendar of recurring, time-boxed events — each lives automatically every year on the same real-world date(s), no manual reset needed. Seven events ship with it:
    - **Pi Day 🥧** (March 14): ship 3 commits to earn **3.14 Coder**.
    - **April Fools' 🤡** (April 1): just have DevGotchi open that day to earn **Prankster**.
    - **May the 4th 🌌** (May 4): fix 5 bugs to earn **Jedi Debugger**.
    - **Summer Hack Season 🏖️** (June–August): complete 10 Focus Sprints to earn **Code Beach**.
    - **Programmer's Day 💾** (Sept 13): make 1 commit to earn **256 Club**.
    - **Hacktoberfest 🎃** (October): merge 4 pull requests — detected from local git history (GitHub's default merge-commit message or a squash-merge's trailing `(#123)`), no account or API access needed — to earn **Hacktoberfest Hunter**.
    - **Debug the Halls 🎄** (December): fix 25 bugs to earn **Holiday Debugger**.
    - Every skin is limited — earned only, never purchasable — and a themed banner (unique colors per event) appears on the panel while its event is active, showing a "complete" state once earned; progress also shows in the Quests modal. Both disappear once the event's window ends. High-frequency triggers (bug fixes, Focus Sprints) tick silently off their existing reward pipelines instead of adding another popup on top of an already-frequent one; rarer triggers (PR merges) still get their own toast.
- **Merge Conflict Kraken**: a second live boss, same family as the Bug Boss — HP is the real count of files with unresolved git merge conflicts, sourced straight from the git extension's own state (no shelling out). Tiered by conflict count (Conflict Tentacle → Merge Kraken → Rebase Leviathan → Git Cthulhu). Resolving conflicts pays XP as you go; clearing every conflict defeats it for +30 XP, +15 ☕. Takes priority over the Bug Boss on the boss card, since a live conflict blocks work.
- **Code Smell Boss**: a third boss — HP is the count of currently-open files over 300 lines. Scoped to open documents (a free, in-memory check, no workspace scan) rather than the whole repo, so it only sees what you actually have open. Shrinking a bloated file under the threshold pays 40 XP; clearing every open file defeats it for the same +30 XP, +15 ☕ bonus. Lowest priority of the three real bosses — it only shows once nothing more urgent (a merge conflict or a lint error) is going on.
- **Prestige**: once you hit the Level 50 cap, a 🌟 PRESTIGE button appears — resets you to Level 1 (back to "Junior Developer") in exchange for a permanent, stacking +5% XP bonus per prestige. Lifetime stats, streak, achievements, and inventory are untouched.
- **Secret Achievements**: two hidden "???" badges that only reveal themselves once unlocked — **Night Owl** (save a file between 3–4am) and **Quick Draw** (fix a bug within 60 seconds of it appearing).
- **Daily Login Calendar**: a new 📅 Calendar view overlays a repeating 30-day cycle on top of your existing login streak — Day 30 of every cycle pays a one-time +100 XP, +100 ☕ bonus on top of the normal daily bonus.
- **Idle Detection**: no real editor activity (selection changes, editor switches, window focus) for 10 minutes reads as AFK — stat decay pauses and your avatar visibly falls asleep instead of draining while you're at lunch. Resumes the instant you're back.
- **Dynamic Boss Music**: the procedural soundtrack now intensifies as the Bug Boss grows — double-time kicks, a brighter/louder bass and arp, urgent 16th-note fills, and a low pulsing alarm siren past 80% HP, all scaled to the same pacing as the boss's own HP bar. The music icon flips to 👾 while it's active.
- **Year in Code Wrapped**: a new 🎁 tab in the Share modal — a Spotify-Wrapped-style annual card covering lifetime total XP, bosses slain, longest streak ever, and your most productive coding hour, with a fun flavor tag (Night Owl 🦉, Early Bird 🐦, etc.). Fires as a one-time notification roughly once a year; reopen anytime from the tab.
- **Buy the Dev a Coffee**: a new 💖 Sponsor button opens GitHub Sponsors and, once per day, grants a small in-game coffee-bean bonus (+25 ☕) for checking it out — there's no way for a VS Code extension to verify an actual sponsorship, so this rewards clicking through rather than paying.

## [2.6.0] - 2026-09-24

### Added
- **Character Class presence, everywhere**: your chosen class now shows up well beyond the panel.
    - Status bar gets a new class badge, tinted in your class's accent color, sitting alongside the main stats item as a persistent reminder of who's watching over your code.
    - The main status bar item's class glyph now gently animates between two frames (🔮↔✨ Backend Mage, 🗡️↔💨 Frontend Rogue, 🛡️↔⚡ DevOps Paladin) instead of sitting static.
    - Toasts for level-ups, achievement unlocks, the daily login bonus, completing all daily quests, and the weekly recap are now tagged with your class emoji.
    - Backend Mage's commit toast and DevOps Paladin's daily bonus toast get a class-flavored line when their passive applies; Frontend Rogue's save bonus shows as a quick status bar flash (saves fire too often for a popup every time).

## [2.5.0] - 2026-09-21

### Added
- **Character Classes**: pick a class the first time you open the panel — free, and grants a permanent passive bonus. Backend Mage 🔮 (+25% XP from commits), Frontend Rogue 🗡️ (+25% XP from saves), or DevOps Paladin 🛡️ (energy & motivation decay 15% slower). Your class retints the avatar's hoodie and chest glow in the panel scene. Respec anytime from the Shop for 200 ☕.
- **Shareable Weekly Recap card**: the Share modal now has tabs for a 🕹️ Stats Card, a 📊 Weekly Recap card, and a 📋 Standup post. The Recap card renders a GitHub-contribution-graph-style heatmap of the past year with this week's XP/commits/bugs-fixed/sprints called out and the current 7-day column outlined. The weekly recap notification gets a "Share Recap" action that opens straight to it (`DevGotchi: Share Weekly Recap`).
- **Standup generator**: a new 📋 Standup button in the Activity Log header turns today's log entries into a ready-to-paste "what I did today" post for Slack, with a one-click copy.
- **🐦 Flex This**: one-click share for the Stats Card and Weekly Recap — copies a pre-written, hashtag-ready caption to the clipboard and immediately prompts to save the matching card image, so both halves of a social post are ready together.

### Fixed
- Toggling the background music off and back on repeatedly could go silent after the first toggle — the volume ramp-up only ever fired once per session instead of on every "on".

### Changed
- Marketplace listing: reworded display name/description and reordered keywords for discoverability.

## [2.4.0] - 2026-08-17

### Added
- **Activity calendar**: a new 📅 card on the main panel shows a GitHub-contribution-graph-style heatmap of the last year of activity, drawn straight to canvas. Every XP-earning action (saves, commits, bug fixes, quests, boss defeats, focus sprints) lights up that day's cell.
- **6 new cosmetic skins**: Code Wizard 🧙, Debug Ninja 🥷, Autobuild Mode 🤖, Alien Contractor 👽, Night Shift 🧛, and Principal Engineer 🤴 join Business Suit and Space Suit in the Coffee Shop — same coffee-bean economy, no new mechanics, just more ways to show off your avatar (including in exported Share Stats Cards).

## [2.3.0] - 2026-08-17

### Added
- **Team Raid Boss**: the Team view now shows a shared HP bar equal to the whole team's combined active error count, synced the same way the rest of Team Mode already works (git commits, no server). Watch the HP bar drain as everyone fixes bugs — the first teammate to open the Team view after the combined count hits 0 (with 2+ contributors) gets a one-time bonus (+25 XP, +20 ☕) and a log entry, then a fresh fight starts from 0. Only appears once there's more than one teammate's snapshot to combine.

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