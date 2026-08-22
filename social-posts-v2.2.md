# DevGotchi 2.2 — Social Media Posts (dev.to / Hashnode / Hacker News)

---

## ✍️ dev.to

**Suggested tags:** `#showdev` `#vscode` `#productivity` `#opensource`
**Cover image suggestion:** updated `screenshot.png`

**Title:**
```
DevGotchi 2.2: your teammates' progress, synced through git — no server involved
```

**Body:**
```markdown
DevGotchi turns VS Code into an RPG: four stats decay as you work, real coding
activity (saves, commits, fixing lint errors) earns XP, and a living developer
avatar reflects your session. 2.1 tied the game to real signals — a boss fight
driven by your actual error count, a real Pomodoro timer, a weekly recap.

2.2 is about two things: giving you more control over how the game behaves,
and — the one I'm most excited about — letting a team see each other's
progress without adding a backend to a project that has deliberately never
had one.

## ⚙️ A real Settings panel

New ⚙️ button on the panel:

- Turn Weekly Recap notifications on/off
- Reduce achievement popups (they still log to the Activity Log, just no popup)
- Pick a stat decay speed — Relaxed, Normal, or Intense

## 💾 Progress export/import

Your save now travels. `Export Progress` writes your full save (stats +
settings) to a JSON file; `Import Progress` restores it elsewhere, after a
confirmation since it overwrites. Useful for backups or moving to a new
machine — everything stays a local file, nothing round-trips through a server.

## 🌴 Vacation Mode

A toggle that freezes stat decay, burnout, and streak-breaking entirely.
Going on a trip used to mean coming back to a burnt-out avatar and a broken
streak — now it doesn't. Flip it off when you're back and everything resumes
exactly where it left off.

## 👥 Team Mode — the one I want feedback on

This is the feature I spent the most time thinking through. The idea: let a
team see each other's level, XP, and streak, without DevGotchi ever running a
server, storing an account, or making a network call of its own.

The mechanism is just git. Each teammate who opts in gets one small JSON
snapshot file written into the repo, at `.devgotchi/team/<them>.json` — keyed
by git email, so nobody's file collides with anyone else's. DevGotchi never
runs `git commit` or `git push` for you; the file just sits there like any
other change, and syncs the same way everything else does — through the
commits and pushes your team is already making. A new 👥 Team view reads
every snapshot in that folder and shows a simple sorted list.

It's gated on there actually being a team: it checks distinct commit-author
emails in the repo and only shows the Team button/toggle if there's more than
one. A "team" of one is just clutter — same reasoning that killed an earlier
idea I had for a global cross-install leaderboard (not enough users to make
it meaningful).

Worth being upfront about: this makes your stats visible to anyone with repo
access. It's an explicit per-workspace opt-in, not a default, and the readme
in `.devgotchi/team/` says exactly what the folder is and how to turn it off.

## 💬 Feedback link

Small one: a direct link in Settings to file an issue. No in-editor form,
just routes straight to GitHub.

## The technical bit

Team Mode's git lookups (identity, contributor count) shell out to git
synchronously and are capped at a 5-second timeout, cached after the first
call per session. It's the one place in the extension that can technically
block the UI thread — worth knowing if you're digging through the source.

Still a single TypeScript file, zero runtime dependencies, no backend. 15+
achievements, daily quests, a skill tree, a coffee-bean economy, and now a
Bug Boss, a Pomodoro mode, and a way to see your team without asking anyone
to stand up infrastructure for a game.

Free and open source. I'd love feedback specifically on Team Mode — whether
the git-file approach feels natural or like a workaround, and whether the
opt-in framing is clear enough.

🔗 Marketplace: search "DevGotchi" or visit
https://marketplace.visualstudio.com/items?itemName=johnfacey.vscode-devgotchi
🔗 GitHub: https://github.com/johnfacey/vscode-devgotchi

*Code is a martial art.*
```

---

## 📝 Hashnode

**Suggested tags:** `vscode`, `productivity`, `webdev`, `opensource`

**Title:**
```
I Added a Team Leaderboard to My VS Code Extension Without Building a Backend
```

**Body:**
```markdown
DevGotchi is a VS Code extension I've been building that turns coding
sessions into a lightweight RPG — stats that decay as you work, XP from real
activity, a boss fight tied to your actual lint errors, a Pomodoro mode. The
whole thing has one rule I've held onto since the start: no backend, no
accounts, nothing leaves your machine unless you explicitly export it.

That rule became an interesting constraint when I wanted to add the most
commonly requested feature: some way to see what your teammates are up to.
A leaderboard is the obvious answer, and the obvious *implementation* is a
server holding everyone's scores. I didn't want to build that — partly on
principle, partly because it would mean a real backend for a project that's
currently a hobby extension with a few hundred installs.

### The insight: git already does everything a server would do

A server's job, reduced to basics, is to store data and move it between
machines. A git repository already does both of those things, and every team
using DevGotchi in a shared repo already has one. So Team Mode works like
this: each person who opts in gets a small JSON file — their level, XP,
streak, last-active timestamp — written to `.devgotchi/team/<their-git-email>.json`
in the repo. One file per person, so nobody's write ever collides with
anyone else's. DevGotchi never runs `git add`, `commit`, or `push` on its
own; the file just becomes part of your next normal commit, and syncs
exactly the way every other file in the repo does.

A new Team view reads every file in that folder and shows a sorted list.
That's the entire feature. No server, no polling, no websockets, no account
system — the "backend" is a folder your team is already synchronizing.

### The parts that needed real thought

Getting the mechanism right wasn't the hard part; the judgment calls were:

- **Gating it on team size.** A repo with one contributor doesn't need a
  Team view — I check distinct commit-author emails and only show the
  feature when there's actually a team, the same reasoning that made me kill
  an earlier idea for a global leaderboard across all installs (not enough
  users yet to matter).
- **Being honest about the tradeoff.** This does put your stats somewhere
  visible to anyone with repo access — a real departure from "nothing leaves
  your machine." It's opt-in per workspace, not a default, and the folder
  ships with its own README explaining what it is.
- **Failing closed.** No git installed, not a repo, git command fails for
  any reason — Team Mode just quietly doesn't offer itself, rather than
  erroring.

### Also in 2.2

- A real Settings panel (Weekly Recap toggle, notification volume, stat
  decay speed)
- Progress export/import as a portable JSON file
- Vacation Mode — freezes decay and your streak while you're away
- A direct feedback link to GitHub issues

Everything is still a single TypeScript file compiling to a VS Code webview,
zero runtime dependencies. Free, open source, and I'd genuinely like to hear
whether the git-file approach to Team Mode reads as clever or as a hack —
I've gone back and forth on it myself.

Marketplace: https://marketplace.visualstudio.com/items?itemName=johnfacey.vscode-devgotchi
GitHub: https://github.com/johnfacey/vscode-devgotchi

Code is a martial art.
```

---

## 👾 Hacker News (Show HN)

HN culture rewards plain, specific, low-hype writing — no emoji, lead with
what it does and how it's built, let the premise speak for itself.

**Title:**
```
Show HN: I added a team leaderboard to my VS Code extension using git as the backend
```

**Post body:**
```
DevGotchi is a VS Code extension that turns coding sessions into a small RPG
— stats decay over time and are restored by real activity (saving files,
committing, fixing lint errors), you earn XP, and a boss fight in the panel
is tied to your actual lint/build error count. Previous updates covered that
part; this one (2.2) is about two things: giving users more control over the
game's behavior, and adding a team feature without a backend.

The part I think is worth posting about: Team Mode. The extension has a hard
rule — no server, no accounts, nothing leaves the user's machine unless they
explicitly export it. That made a "see your teammates' progress" feature
non-trivial, since the obvious implementation (a server holding scores) is
exactly what the rule rules out.

The mechanism I landed on: each person who opts in writes a small JSON
snapshot (level, XP, streak, last active) to a file in the repo, keyed by
their git email — one file per person, so writes never collide. The
extension never runs `git commit` or `git push` itself; the file just
becomes part of the user's next normal commit and syncs the way every other
file in the repo already does. A view in the panel reads every snapshot file
in the folder and renders a sorted list. Git is doing exactly what a
sync server would do — storing and moving data between machines — except
it's infrastructure the team already has.

Some implementation details, since I expect this crowd will ask:

- Contributor count is checked via `git log --format=%ae` (capped at the
  most recent 500 commits) to decide whether the team UI is worth showing at
  all — a repo with one contributor doesn't get the feature.
- Git identity (name/email) comes from `git config`, shelled out
  synchronously via `execFileSync` with a 5s timeout, cached after the first
  call. This is the one place in the extension that can technically block
  the UI thread, which I'm noting here because I know someone will ask.
- Any git failure (not a repo, git not installed, etc.) fails closed rather
  than throwing.

Also in this release: a settings panel (notification toggles, stat decay
rate), JSON export/import of your save, and a "Vacation Mode" that freezes
stat decay and streak-breaking while you're away.

It's free, MIT-licensed, single TypeScript file, zero runtime dependencies.
Feedback welcome, especially on whether the git-file approach to syncing
feels like a reasonable pattern for other local-first tools or whether it's
too cute for its own good.

GitHub: https://github.com/johnfacey/vscode-devgotchi
Marketplace: https://marketplace.visualstudio.com/items?itemName=johnfacey.vscode-devgotchi
```

**Anticipated first comment (post this yourself shortly after submitting):**
```
Maker here. The thing I'm least sure about is the failure mode when two
teammates are on wildly different clocks (a laptop with the wrong system
time, for instance) — "last active" timestamps could look wrong relative to
each other. Doesn't break anything, just cosmetic, but I don't have a great
fix for it beyond "trust the machine's clock," which feels fragile.

Also aware this only really works for teams that already commit to a shared
repo frequently — if your workflow is long-lived feature branches that don't
merge for weeks, the sync latency would make the Team view feel pretty
stale. Curious if anyone has a better sync primitive in mind that's still
server-free.
```

---

## Notes on cross-posting

- Post dev.to and Hashnode a day or two apart, same as last time — both
  platforms slightly deprioritize content that's already indexed elsewhere
  in the same window.
- Submit to Hacker News separately, link to GitHub as the primary source,
  not the blog posts.
- Team Mode is the interesting/discussable feature this round — lead with it
  everywhere, since "here's a leaderboard" is a much weaker hook than "here's
  a leaderboard with no server."
- Reply to early comments fast, especially on HN — the maker's-comment
  convention only helps if it's actually early.
