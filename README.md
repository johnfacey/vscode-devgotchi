# 👨‍💻 DevGotchi

**DevGotchi** turns your VS Code sessions into a cyberpunk RPG. Your productivity, focus, and mental health are tracked in real-time through a living developer avatar. Code to earn XP, manage your stats, survive burnout, and become a Legendary Dev.

> *Code is a Martial Art.*

![DevGotchi Screenshot](screenshot.png)

---

## ✨ Features

### 🎮 Core RPG Loop
- **Live Avatar** — Your developer reacts to your coding habits in a dedicated side panel.
- **Four Stats** — Focus 🎯, Motivation ⭐, Energy ⚡, and Health 💪 decay over time and are boosted by activity.
- **XP & Leveling** — Earn XP for saves, commits, and bug fixes. Level up from Junior to Legendary Dev.
- **Coffee Economy** — Coffee Beans are your currency. Earn them by coding, spend them on upgrades.
- **Mood System** — Your developer's mood shifts: 🚀 Productive → 😰 Stressed → 😴 Tired → 💀 Burnt Out.

### ☠️ Burnout State
When your health hits zero, **full burnout** kicks in:
- The UI shifts red with a glitch overlay and a critical warning banner.
- Most actions are locked — you can only **Take a Break** or **Drink Coffee** to recover.
- Recovering from burnout earns you the **Back from the Edge** achievement.

### 🏅 Achievements
12 unlockable badges tracking your milestones:

| Badge | How to Earn |
| :--- | :--- |
| ⌨️ First Keystroke | Save your first file |
| 🚀 Ship It | Make your first commit |
| 🔥 Getting Warmed Up | Reach Level 5 |
| 🧘 Code Monk | Reach Level 10 |
| ⚡ Legendary Dev | Reach Level 25 |
| 📅 Week Warrior | 7-day login streak |
| 🏆 Iron Discipline | 30-day login streak |
| 🐛 Exterminator | Fix 50 bugs total |
| 📦 Commit Machine | Make 20 commits |
| ☕ Caffeinated | Earn 500 coffee beans lifetime |
| 💀 Back from the Edge | Recover from full burnout |
| 📜 Quest Master | Complete quests 5 days in a row |

### ⚡ Random Events
Every 30-second tick, there's a chance of a surprise event — good or bad:
- *"Found a forgotten coffee stash! +20 beans"*
- *"Production incident! −Energy −Motivation"*
- *"Rubber duck debugging breakthrough! +Motivation"*
- *"Git blame points at you. −Motivation"*
- ...and more. Stay on your toes.

### 📡 Activity Log
A live scrollable feed inside the panel showing every recent XP gain, achievement unlock, random event, and level-up — colour-coded by type.

### 🎵 Cyberpunk Music
Procedurally synthesised ambient music generated entirely with the Web Audio API (no external files):
- Driving kick & hi-hat pattern
- Walking A-minor bass line
- Pentatonic arpeggio with stereo movement
- Slow-swelling pad chords every 2 bars
- Sparse synth lead phrase every 4 bars

Toggle it on/off with the **🎵 Music** button. Fades in and out smoothly.

### 📜 Daily Quests
Three randomised quests refresh each day:
- Save files, push commits, fix bugs, or log coding time.
- Completing all three awards a streak bonus that grows over consecutive days.

### 🎯 Mini-Games (Challenges)
| Game | Description |
| :--- | :--- |
| 🐛 Bug Hunt | Click bugs before they vanish — 20 second frenzy |
| ⚡ Speed Test | Type a code snippet as fast as possible |
| 👾 Boss Battle | Type snippets to deal damage before time runs out |

### ⚡ Skill Tree
Unlock passive abilities with Coffee Beans:
- **Caffeine Tolerance** — Coffee restores 50% more energy
- **Iron Focus** — Focus decays 30% slower
- **Bug Slayer** — Earn 2× XP when fixing bugs

### 🛍️ Shop
Spend beans on skins and gear that affect your stats:
- Business Suit 🕴️, Space Suit 👨‍🚀
- Ergo Chair (energy decays slower), Mech Keyboard (motivation decays slower)

### 🔗 IDE Integrations
- **Status Bar** — Level, mood emoji, and stat summary always visible.
- **Git** — Commits award +50 XP and +5 beans automatically.
- **Linter** — Fixing errors awards XP; active errors slowly drain your stats.

---

## 🚀 Getting Started

1. Install the extension.
2. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`).
3. Run **"DevGotchi: Open Panel"**.
4. Your developer appears in the side column. A tutorial walks you through each feature.

---

## 🛠 Commands

| Command | Description |
| :--- | :--- |
| `DevGotchi: Open Panel` | Opens the main dashboard |
| `DevGotchi: Reset Progress` | Wipe all progress and start fresh |

---

## 🎨 Panel Layout

```
┌─────────────────────────────────────┐
│  Avatar │ Name · Role               │
│         │ LEVEL N  ████░░ XP        │
│         │ ☕ Beans   🔥 Streak      │
├─────────────────────────────────────┤
│ ◈ Stats                             │
│  🎯 Focus      ████████░░  82       │
│  ⭐ Motivation ██████░░░░  65       │
│  ⚡ Energy     ████░░░░░░  42       │
│  💪 Health     ██████████  100      │
├──────────────────┬──────────────────┤
│ ◈ Active Quest  │ ☠ Burnout Boss   │
│  Ship Something │  Overwhelmulus    │
│  ████░░ 60%     │  ██████░░ 300 HP  │
├─────────────────────────────────────┤
│ ☕ 🎯 🌴 ⚡ 🛍️ 🏆 📜 🎵 🏅 📡    │
└─────────────────────────────────────┘
```

---

**Happy Coding.** Keep your developer alive, your streak unbroken, and your coffee cup full. ☕
