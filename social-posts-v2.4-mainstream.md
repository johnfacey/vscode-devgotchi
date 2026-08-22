# DevGotchi 2.4 — Social Media Posts (X / LinkedIn / Facebook / Instagram)

Companion to `social-posts-v2.4.md` (dev.to / Hashnode / Hacker News).

**Recommended media:** `screenshot.png` now shows the new 📅 Activity
Calendar card and works well as the main hero shot. `skins_showcase.png`
(the new card grid) is a good secondary/standalone image for posts that
want to focus on the skins specifically.

---

## 🐦 X / Twitter — Thread

**Tweet 1 (hook — attach skins_showcase.png)**
```
Your coding activity, GitHub-contribution-graph style, right inside VS Code.

DevGotchi 2.4 is live — new Activity Calendar + 6 new skins. 🧵
```

**Tweet 2 (Activity Calendar)**
```
📅 ACTIVITY CALENDAR

A heatmap of your last year of DevGotchi activity, right on the panel.
Every save, commit, bug fix, quest, and boss defeat lights up that day.

Drawn straight to canvas — no charting library.
```

**Tweet 3 (new skins)**
```
🧙 6 NEW SKINS

Code Wizard, Debug Ninja, Autobuild Mode, Alien Contractor, Night Shift,
Principal Engineer — all in the Coffee Shop now.

Equip one and it shows up everywhere, including your exported stats card.
```

**Tweet 4 (CTA)**
```
Still free. Still no backend, no accounts, no telemetry.

👉 Search "DevGotchi" on the VS Code Marketplace: [marketplace link]

Code is a martial art. 🥋⚡

#VSCode #DevTools #IndieDev #OpenSource
```

---

## 💼 LinkedIn

```
🚀 DevGotchi 2.4 is live — a smaller update than last time, but the one I've enjoyed building the most.

DevGotchi turns VS Code into an RPG: stats decay as you work, real coding activity earns XP, and a boss fight is tied to your actual lint/build errors. Recent updates added Team Mode and a shared "Raid Boss" for teams sharing a repo. This release adds two things:

📅 ACTIVITY CALENDAR
A GitHub-contribution-graph-style heatmap on the main panel, showing your last year of activity at a glance. Every XP-earning action — saves, commits, bug fixes, quests, boss defeats — lights up that day's cell.

🧙 SIX NEW SKINS
Code Wizard, Debug Ninja, Autobuild Mode, Alien Contractor, Night Shift, and Principal Engineer join the Coffee Shop, purchasable with the same coffee-bean currency as everything else.

What I actually want to highlight: both of these were cheap to build because of decisions made in earlier versions, not this one. Every XP-earning action already routed through a single function, so the activity calendar needed one new hook, not new tracking scattered across the codebase. The shop was already a single data-driven array, so six new skins meant six new entries, not new code. Neither was designed with this in mind at the time — they were just the less-special-cased way to write the original feature, and the payoff showed up two releases later.

Still one TypeScript file, zero runtime dependencies, no backend, no accounts. Free on the VS Code Marketplace.

#VSCode #DeveloperTools #OpenSource #TypeScript #Productivity #Gamification
```

---

## 👍 Facebook

```
New update to DevGotchi, my VS Code extension that turns coding into a game 🎮

DevGotchi 2.4 adds:
📅 An Activity Calendar — a GitHub-style heatmap of your last year of coding activity, right in the panel
🧙 Six new character skins: Code Wizard, Debug Ninja, Autobuild Mode, Alien Contractor, Night Shift, Principal Engineer — all buyable with in-game coffee beans

Still completely free, still no accounts, still nothing leaving your computer. If you live in VS Code, this might make the daily grind a little more fun to look at.

🔗 [marketplace link]

Code is a martial art. ⚡
```

---

## 📸 Instagram

Post `skins_showcase.png` as the main image.

**Caption:**
```
Six new looks for your DevGotchi avatar 🧙🥷🤖👽🧛🤴

Plus a GitHub-style activity calendar right on the panel — your last year
of coding, at a glance.

Still free. Still no tracking. Just your code and a wizard hat if you want it.

Code is a martial art. 🥋⚡

Link in bio → VS Code Marketplace, search "DevGotchi"

#vscode #devtools #codinglife #programmerlife #indiedev #productivity
#opensource #softwareengineer #buildinpublic #cyberpunk #gamedev
```

---

## Notes on cross-posting

- Lead with the Activity Calendar visual — it's the more universally
  legible feature (anyone who's seen a GitHub profile gets it instantly),
  the skins are the fun secondary hook.
- Stagger by a few hours to a day, same as prior releases.
- `screenshot.png` has been regenerated and now shows the 📅 Activity
  Calendar card — ready to use as-is.
