# DevGotchi 2.2 — Social Media Posts (X / LinkedIn / Facebook / Instagram)

Companion to `social-posts-v2.2.md` (dev.to / Hashnode / Hacker News). These
are tuned for feed-scroll platforms rather than long-form technical readers.

**Recommended media:** the freshly-regenerated `screenshot.png` (now shows
the Bug Boss card, Focus Sprint countdown, and the full action row including
Share/Settings/Team) works well everywhere as a static image. If you want
motion for X/Instagram/Facebook, `devgotchi_boss_fight.gif` from the 2.1
push is still on-brand and doesn't need to be redone for this release.

---

## 🐦 X / Twitter — Thread

**Tweet 1 (hook — attach the updated screenshot)**
```
Your teammates' progress, synced through git. No server, no accounts.

DevGotchi 2.2 is live — the VS Code extension that turns coding into a
cyberpunk RPG just got a Team Mode that doesn't need a backend.

🧵 how it works, plus everything else that's new:
```

**Tweet 2 (Team Mode)**
```
👥 TEAM MODE

Each teammate who opts in gets a small file written into the repo with
their level, XP, and streak. DevGotchi never commits or pushes it for you —
it just rides along in your next normal commit.

Git IS the sync layer. No server required.
```

**Tweet 3 (the honest tradeoff)**
```
Worth knowing: Team Mode makes your stats visible to anyone with repo
access. That's why it's opt-in per workspace, not a default — and why it
only shows up at all if your repo actually has more than one contributor.

A "team" of one is just clutter.
```

**Tweet 4 (Settings + Vacation Mode)**
```
⚙️ SETTINGS PANEL
Toggle Weekly Recap notifications, reduce achievement popups, tune stat
decay speed (Relaxed/Normal/Intense).

🌴 VACATION MODE
Freezes stat decay and your streak while you're away. Come back to exactly
where you left off — no burnout, no broken streak.
```

**Tweet 5 (Export/Import + Feedback)**
```
💾 EXPORT/IMPORT
Your full save, as a portable JSON file. Back it up or move it to a new
machine — still zero telemetry, still nothing sent anywhere.

💬 A direct feedback link, straight to GitHub issues, right in Settings.
```

**Tweet 6 (CTA)**
```
DevGotchi is free on the VS Code Marketplace. Still no telemetry, no
accounts, no backend — now with a way to see your team without asking
anyone to run a server.

👉 Search "DevGotchi" or grab it here: [marketplace link]

Code is a martial art. 🥋⚡

#VSCode #DevTools #IndieDev #OpenSource
```

---

## 💼 LinkedIn

```
🚀 DevGotchi 2.2 is live — and this update solves a problem I'd been putting off: how do you add a team feature to a tool that has a strict "no backend, no accounts" rule?

DevGotchi turns VS Code into an RPG: your stats decay as you work, real coding activity earns XP, and a developer avatar reacts to your session. Recent updates tied the game closer to real signals — a boss fight driven by actual lint errors, a genuine Pomodoro timer, a weekly recap. 2.2 adds more control over how the game behaves, plus the feature I'm most proud of solving cleanly:

👥 TEAM MODE
The most requested feature was some way to see teammates' progress. The obvious implementation is a server holding everyone's scores — which I didn't want to build, both on principle and because it would mean real infrastructure for what's still a hobby project. Instead: each teammate who opts in gets a small JSON snapshot written into the repo itself. DevGotchi never runs git commit or push on its own — the file just becomes part of your next normal commit, and syncs the same way every other file in your repo already does. A new Team view reads everyone's snapshot and shows a simple, sorted list. Git is doing the job a sync server would do, using infrastructure the team already has.

It's an explicit opt-in, gated on there being an actual team (checked via distinct commit authors), and transparent that it makes your stats visible to anyone with repo access — a real tradeoff worth stating plainly rather than glossing over.

⚙️ SETTINGS PANEL
Toggle Weekly Recap notifications, dial back achievement popups, and choose a stat decay speed that matches how intense you want the game to feel.

🌴 VACATION MODE
Freezes stat decay, burnout, and your streak while you're away. No more coming back from a week off to a burnt-out avatar and a broken streak.

💾 PROGRESS EXPORT/IMPORT
Your save as a portable JSON file — back it up, move it to a new machine, still fully local.

💬 FEEDBACK LINK
A direct line to GitHub issues, right in Settings.

---

The extension is still one TypeScript file, zero runtime dependencies, no backend, no accounts — a constraint I keep leaning into rather than working around, which is what made Team Mode an interesting problem to solve rather than a routine one.

Free on the VS Code Marketplace. If your team shares a repo and lives in VS Code, I'd love for you to try Team Mode together and tell me if the git-based sync feels natural.

#VSCode #DeveloperTools #OpenSource #TypeScript #Productivity #Gamification
```

---

## 👍 Facebook

```
New update to DevGotchi, my VS Code extension that turns coding into a game 🎮

The headline feature in 2.2: you can now see your teammates' progress — level, streak, all of it — without me needing to run a server anywhere. Each person's progress gets written to a small file inside your project, and it syncs the normal way your team already shares code: through git commits and pushes. No accounts, no login, no data going to some company's server (mine included).

Also new:

⚙️ A real Settings menu — turn off notifications you don't want, adjust how fast your stats decay
🌴 Vacation Mode — freezes your streak and stats while you're away, so a week off doesn't wreck your progress
💾 Backup/restore your progress as a file
💬 A one-click way to send me feedback or report a bug

Still completely free, still no ad tracking, still runs entirely on your own computer. If you or someone on your team lives in VS Code, this might make the daily grind a little more fun — and now a little more social.

🔗 [marketplace link]

Code is a martial art. ⚡
```

---

## 📸 Instagram

Post the updated `screenshot.png` as the main image, or pair it with a
before/after style carousel (old panel → new panel with Team/Settings
buttons visible) if you want a two-slide post.

**Caption:**
```
Your team's progress, synced through git — no server needed 👥⚡

DevGotchi 2.2 adds Team Mode: everyone's level and streak, written straight
into your repo, shared the same way you already share code. No accounts, no
backend, no data leaving your machine except what git already moves.

Also new: a real Settings menu, Vacation Mode (freeze your streak while
you're away), progress backup/restore, and a direct feedback link.

Free. No tracking. Just your code, your team, and a bug count that fights
back.

Code is a martial art. 🥋⚡

Link in bio → VS Code Marketplace, search "DevGotchi"

#vscode #devtools #codinglife #programmerlife #indiedev #productivity
#opensource #softwareengineer #buildinpublic #cyberpunk #teamwork #gamedev
```

---

## Notes on cross-posting

- Lead with Team Mode everywhere on this round — it's the most differentiated
  feature and the strongest hook ("no server" is a much more interesting
  claim than "new settings menu").
- The updated screenshot now shows more UI than before (Focus Sprint card,
  13 action buttons) — if a platform crops or resizes images aggressively,
  double-check the crop doesn't cut off the Team/Settings buttons that the
  copy is specifically calling out.
- Stagger these by a few hours to a day, same as always — avoids the
  cross-platform "obviously scheduled" look.
- Reply fast to early engagement, especially anyone asking "wait, how does
  the sync actually work" — that's the question this release is built to
  answer well, so it's worth a thorough reply rather than a one-liner.
