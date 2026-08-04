# DevGotchi 2.1 — Social Media Posts (dev.to / Hashnode / Hacker News)

---

## ✍️ dev.to

**Suggested tags:** `#showdev` `#vscode` `#productivity` `#opensource`
**Cover image suggestion:** `screenshot.png` or a frame from `devgotchi_boss_fight.gif`

**Title:**
```
I turned VS Code into a cyberpunk RPG that fights your real bugs as a boss monster
```

**Body:**
```markdown
A while back I built DevGotchi — a VS Code extension that turns your coding
sessions into an RPG. Four stats (Focus, Motivation, Energy, Health) decay in
real time as you work, saving files and pushing commits earns XP and Coffee
Beans, and a living developer avatar reacts to what you're actually doing.

2.1 just shipped, and this update is about tying the game closer to *real*
signals from your editor instead of simulated ones. Here's what's new.

## 🐛 The Boss Fight Is Now Real

The panel has always had a "Burnout Boss" card. In 2.1, when you have active
lint or build errors, that card transforms into a **Bug Boss** — and its HP is
tied 1:1 to your actual error count.

- More active errors = a bigger, angrier boss (Syntax Wraith → NullPointerDemon
  → StackOverflow Behemoth → Overwhelmulus, depending on how bad it gets).
- Every real error you fix does real damage to the boss.
- Clear every error and the boss is **defeated** — +30 XP, +15 Coffee Beans,
  and a notification.
- Zero errors reverts the card back to the standard health-based Burnout Boss.

No fake typing minigame here (that still exists separately as one of the
Challenges) — this is your actual `getDiagnostics()` error count, live.

## ⏱️ Focus Sprint (an actual Pomodoro timer)

Start a 15/25/50-minute sprint from the panel or Command Palette. While it's
running:

- Everything you earn gets a **1.5× XP multiplier**.
- Your Focus stat decays 50% slower.
- Finishing awards a completion bonus (+40 XP, +25 beans).
- Cancelling early forfeits the bonus — same incentive structure as a real
  Pomodoro technique, just gamified.

## 📊 Weekly Recap

Once every ~7 days, a notification summarizes what you actually did that
week — XP earned, commits, bugs fixed, focus sprints completed, level
progress, current streak. If you didn't touch code that week, it stays
silent. No guilt-tripping, just a recap.

## 📤 Share Stats Card

New Share button that opens a shareable stats card with two export options:

- **Copy as Markdown** — a paste-ready block for your GitHub README or a PR
  description.
- **Save as Image** — a cyberpunk-styled PNG rendered client-side on an HTML
  canvas inside the panel, saved wherever you want.

Both run entirely locally — the extension has zero telemetry, so nothing
about your code or stats goes anywhere unless you explicitly export it.

## The technical bit

The whole extension — UI, canvas-drawn pixel art scene, procedurally
synthesized cyberpunk music (Web Audio API, no audio files), and now the
stats-card renderer — lives in a single TypeScript file that compiles to a
VS Code webview. No external services, no backend, no accounts.

13 achievements, daily quests, a skill tree, a coffee-bean shop, git and
linter integrations, and now a boss fight your own bugs are directly
responsible for.

It's free and open source. I'd genuinely like feedback, especially from
anyone who tries running a Focus Sprint during a real work session.

🔗 Marketplace: search "DevGotchi" or visit
https://marketplace.visualstudio.com/items?itemName=johnfacey.vscode-devgotchi
🔗 GitHub: https://github.com/johnfacey/vscode-devgotchi

*Code is a martial art.*
```

---

## 📝 Hashnode

Hashnode's audience skews slightly more essay-driven and community/series
oriented than dev.to — the post below reuses the same structure and facts
but opens with more of a "why I built this" narrative hook, which tends to
land better there.

**Suggested tags:** `vscode`, `productivity`, `webdev`, `opensource`

**Title:**
```
Your Bugs Are Now a Boss Fight: What's New in DevGotchi 2.1
```

**Body:**
```markdown
I've always thought the worst part of a long coding session isn't the bugs —
it's not noticing how burnt out you are until you're deep in it. That's the
whole premise behind DevGotchi, a VS Code extension I've been building that
turns your editor into a lightweight RPG: four stats that decay as you work,
XP for real coding activity, and a developer avatar that reacts to your
session in real time.

Version 2.1 leans harder into one idea: instead of simulating game mechanics,
tie them to things that are *already true* about your session.

### Your lint errors are now a boss monster

The panel has a boss card. Previously it only reflected your Burnout stat.
Now, whenever you have active lint or build errors, it becomes a **Bug Boss**
with HP equal to your real error count. Fix an error, the boss takes damage.
Clear your build, the boss dies — actual boss, actual defeat, actual reward
(+30 XP, +15 Coffee Beans). The angrier your codebase, the bigger the boss:
Syntax Wraith at a couple of errors, all the way up to Overwhelmulus if
things have really gotten away from you.

### A Focus Sprint that isn't just a countdown

15/25/50-minute Pomodoro-style sprints, with a 1.5× XP multiplier and slower
Focus decay while active. Finish it and you get a bonus; bail early and you
don't — which turns out to be a surprisingly effective nudge to actually
finish the block instead of tabbing away at minute 12.

### A weekly check-in that isn't guilt-driven

Once a week, if — and only if — you actually did something, DevGotchi tells
you what: XP, commits, bugs fixed, sprints completed, streak, level change.
If you had a quiet week, it says nothing. I didn't want this to be another
notification that makes you feel bad for resting.

### Share Stats Card

A new panel button renders a shareable "stats card" — either copied as
Markdown for a GitHub README, or exported as a PNG drawn entirely client-side
on canvas. Zero telemetry either way; nothing leaves your machine unless you
choose to export it.

### Everything else, still here

13 achievements, daily quests, a skill tree, a coffee-bean economy, procedural
cyberpunk music synthesized with the Web Audio API, git/linter integrations,
and the original burnout mechanic that makes the stakes feel real instead of
decorative.

It's free, open source, and has no backend — just a webview, some TypeScript,
and Canvas 2D. If you spend a lot of time in VS Code and have ever wanted
your actual bug count to have consequences, I'd love for you to try it and
tell me what breaks.

Marketplace: https://marketplace.visualstudio.com/items?itemName=johnfacey.vscode-devgotchi
GitHub: https://github.com/johnfacey/vscode-devgotchi

Code is a martial art.
```

---

## 👾 Hacker News (Show HN)

HN culture rewards plain, specific, low-hype writing — no emoji, no
exclamation points, lead with what it does and how it's built, let the
"fun" premise speak for itself. The title should read like a factual
description, not a tagline.

**Title:**
```
Show HN: DevGotchi – a VS Code extension where a boss monster's HP is your actual lint error count
```

**Post body:**
```
DevGotchi is a VS Code extension that turns coding sessions into a small RPG:
four stats (focus, motivation, energy, health) decay over time and are
restored by real activity (saving files, committing, fixing lint errors),
you earn XP and an in-extension currency, and there's a status bar/panel
avatar that reflects your current state.

The part I think is actually interesting, and the reason for posting now:
in the 2.1 update, the game's "boss fight" is driven by real data instead of
a simulated minigame. The panel has a boss card; when your project has
active lint/build errors, its HP becomes your literal error count (via
vscode.languages.getDiagnostics()). Fixing an error deals damage. Clearing
your build to zero errors defeats the boss and grants a small reward. No
errors, and the card reverts to a separate, health-based "burnout boss" that
reflects the RPG stats instead.

Also new in 2.1:

- A real Pomodoro timer (15/25/50 min) with an XP multiplier while it runs,
  and a penalty (forfeited bonus) for cancelling early rather than seeing it
  through.
- A weekly recap notification that summarizes real deltas (XP, commits,
  bugs fixed, sprints, streak) since the last one — it stays silent if
  nothing happened that week.
- A "share stats card" feature: either a markdown block for a README, or a
  PNG rendered client-side on an HTML canvas inside the webview, both fully
  local (no network calls either way).

Implementation notes, since I expect this crowd will ask: it's a single
TypeScript file, compiled to a VS Code webview extension. All persistence is
through globalState (no backend, no telemetry, no external requests). The
"pixel art" scene and the ambient music in the panel are both generated at
runtime — the music via the Web Audio API with a lookahead scheduler, no
audio files shipped. Git integration hooks vscode.git's repository state
change events; linter integration polls onDidChangeDiagnostics.

It's free, MIT-licensed, and open source. Feedback and issues welcome,
especially on the error-count-to-boss-HP mapping, which I'm not 100% sure I
have balanced correctly yet.

GitHub: https://github.com/johnfacey/vscode-devgotchi
Marketplace: https://marketplace.visualstudio.com/items?itemName=johnfacey.vscode-devgotchi
```

**Anticipated first comment (from you, the maker) — post this yourself
shortly after submitting, HN convention for Show HN:**
```
Maker here. Happy to answer questions.

A couple of things I went back and forth on: the Bug Boss HP curve is
currently a flat multiplier on error count (errors * 20%, capped at 100%
bar width) rather than anything log-scaled, so a file with 20+ errors just
pins the bar at full — open to suggestions on making that feel better at
the high end.

Also aware "gamifying error counts" could push in a bad direction (e.g.
resist committing WIP code with a couple of lint warnings to "protect" the
boss). So far in my own use it hasn't changed my behavior that way, but I'd
like to hear if others hit that.
```

---

## Notes on cross-posting

- Post dev.to and Hashnode versions a day or two apart rather than
  simultaneously — both platforms' feeds slightly deprioritize content
  that's identical to something already indexed elsewhere within the same
  window.
- Submit to Hacker News separately from the blog posts, and don't
  cross-link them in the initial submission — HN prefers the primary
  source (GitHub/Marketplace), not a blog writeup about the thing.
- Same rule as the 2.0 push: reply to the first few comments quickly on
  whichever platform gets traction first. Early engagement is what keeps
  a Show HN or dev.to post from falling off the front page/feed.
