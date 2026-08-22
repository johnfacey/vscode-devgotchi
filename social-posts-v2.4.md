# DevGotchi 2.4 — Social Media Posts (dev.to / Hashnode / Hacker News)

---

## ✍️ dev.to

**Suggested tags:** `#showdev` `#vscode` `#productivity` `#opensource`
**Cover image suggestion:** `skins_showcase.png` (or a fresh screenshot showing the Activity Calendar card)

**Title:**
```
DevGotchi 2.4: a GitHub-style activity calendar, built entirely from data I was already tracking
```

**Body:**
```markdown
DevGotchi turns VS Code into an RPG — stats decay as you work, real activity
(saves, commits, fixing lint errors) earns XP, and a boss fight is tied to
your actual error count. 2.3 added a Team Raid Boss where the whole team's
combined bug count is a shared HP bar. 2.4 is smaller in scope but the
feature I like most so far, because it cost almost nothing to build.

## 📅 Activity Calendar

A GitHub-contribution-graph-style heatmap now sits on the main panel,
showing your last year of DevGotchi activity — every XP-earning action
(saves, commits, bug fixes, quests, boss defeats, focus sprints) lights up
that day's cell.

The interesting part isn't the feature, it's where the data came from: I
didn't add any new tracking. Every XP-earning action already passes through
one function, `addXP()`. I hooked a single `recordDailyActivity()` call into
that one choke point, stamped the date, and the entire feature fell out of
data the extension was already producing — just not persisting anywhere
durable. Pruned to ~370 days so the save file doesn't grow unbounded.

Drawn straight to a `<canvas>`, same approach as the panel's pixel-art scene
and the Share Stats Card export — no charting library, no DOM grid of divs.

## 🧙 Six new skins

Code Wizard, Debug Ninja, Autobuild Mode, Alien Contractor, Night Shift, and
Principal Engineer join the shop, purchasable with coffee beans. This one
required literally zero new code — the buy/equip/render pipeline was already
fully data-driven from a single `SHOP_ITEMS` array, so six new skins is six
new array entries. Equipped skins already show up in the exported Share
Stats Card too, since that renderer just draws whatever `dev.role` is set to.

## The pattern, if it's useful to anyone else

Both of these shipped fast because of decisions made in earlier versions,
not this one: a single addXP() choke point for all XP-earning logic, and a
fully generic shop-item renderer instead of hardcoded skin cases. Neither
was built with "activity calendar" or "more skins" in mind — they were just
the less-special-cased way to write the original features. Worth remembering
next time a "small" feature feels expensive: sometimes the actual fix is
upstream, in how the last feature was structured.

Still a single TypeScript file, zero runtime dependencies, no backend. Free
and open source.

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
I Added a GitHub-Style Contribution Graph to My VS Code Extension Without Adding Any New Tracking
```

**Body:**
```markdown
DevGotchi is a VS Code extension that turns coding sessions into a small
RPG — stats decay over time, real activity restores them and earns XP, and
a boss fight is tied to your actual lint/build error count. The last update
(2.3) added a shared "raid boss" for teams. This one (2.4) is smaller, but
it's the release that made me appreciate a decision from months earlier.

### The feature: an activity calendar

A heatmap on the main panel now shows the last year of activity, GitHub's
contribution-graph style — darker cells for more active days, drawn
straight to canvas. Every XP-earning action lights up that day.

### Why it was cheap

Every single XP-earning action in the extension — saving a file, a commit,
fixing a bug, finishing a quest, defeating a boss — already routes through
one private method, `addXP()`. That wasn't designed for this feature; it's
just where leveling-up logic lived because XP gain and level-up are tightly
coupled. But it meant there was exactly one place to add
`recordDailyActivity()`, a call that stamps today's date into a
`activityDates: Record<string, number>` map and prunes anything older than
~370 days. No new event listeners, no new call sites to remember, no risk of
missing an XP source. The whole feature is maybe 20 lines outside of the
canvas-drawing code.

### The other half: more skins, basically for free

Six new cosmetic skins (Code Wizard, Debug Ninja, Autobuild Mode, Alien
Contractor, Night Shift, Principal Engineer) shipped alongside it. The shop
system was built as a single data array (`SHOP_ITEMS`) with a fully generic
buy/equip/render pipeline from the start — adding a skin was never going to
require touching the buy button, the equip button, or the shop list
renderer, just adding an object to an array. Six new entries, zero logic
changes.

### The actual lesson

Neither of these was "designed for extensibility" in some formal sense —
they were just written the less-special-cased way at the time, because that
was the simpler code to write for the original feature. The payoff showed up
two releases later, when a completely unrelated feature turned out to be
nearly free. Worth remembering the next time a small feature estimate feels
too high: the expensive part is sometimes further upstream than the feature
itself.

Still a single TypeScript file, zero runtime dependencies, no backend, no
accounts. Free and open source.

Marketplace: https://marketplace.visualstudio.com/items?itemName=johnfacey.vscode-devgotchi
GitHub: https://github.com/johnfacey/vscode-devgotchi

Code is a martial art.
```

---

## 👾 Hacker News (Show HN)

HN culture rewards plain, specific, low-hype writing — lead with what it
does and how it's built.

**Title:**
```
Show HN: Added a GitHub-style contribution graph to my VS Code RPG extension, for free
```

**Post body:**
```
DevGotchi is a VS Code extension that turns coding into a small RPG — stats
decay over time, real activity (saving, committing, fixing lint errors)
restores them and earns XP, a boss fight is tied to your actual error count.
Previous updates added a team feature (a shared "raid boss" synced via git
commits, no server). This one's smaller: an activity heatmap and six new
cosmetic skins.

Posting mainly because of how cheap both ended up being, which I think says
more about earlier decisions than this release:

Every XP-earning action in the codebase (saves, commits, bug fixes, quests,
boss defeats, focus sprints) already routed through one function,
`addXP()`, because XP gain and level-up logic are coupled. Adding the
activity calendar meant hooking one `recordDailyActivity()` call into that
single choke point — stamp today's date into a `Record<string, number>`,
prune anything past ~370 days. No new event listeners, no per-feature
instrumentation, no way to accidentally miss a source of activity. Drawn to
canvas the same way the rest of the panel's pixel art is, no charting
library.

The six new skins were similar: the shop was already a single data array
with a generic buy/equip/render pipeline, so new skins are new array
entries, not new code paths.

Neither was built with this in mind at the time — they were just the
less-special-cased way to write the original feature. The payoff showed up
releases later. Feels like a useful thing to notice: when a "small" feature
turns out to be expensive, the actual problem is often upstream in how an
earlier feature got structured, not in the small feature itself.

Free, MIT-licensed, single TypeScript file, zero runtime dependencies,
no backend.

GitHub: https://github.com/johnfacey/vscode-devgotchi
Marketplace: https://marketplace.visualstudio.com/items?itemName=johnfacey.vscode-devgotchi
```

**Anticipated first comment (post shortly after submitting):**
```
Maker here. The activity calendar counts *events*, not time spent — so a
day with one huge refactor commit and a day with twenty small saves can
look identically "dark" on the heatmap even though the actual effort was
very different. I went back and forth on weighting by XP gained instead of
raw event count, and landed on event count because it's more legible at a
glance, but I'm not fully sold on it. Open to hearing how people think about
this if you've built something similar.
```

---

## Notes on cross-posting

- Post dev.to and Hashnode a day or two apart, same cadence as prior
  releases.
- This release is a good HN "small but well-engineered" post rather than a
  "big feature" post — lead with the design insight (upstream choke points
  paying off later), not the feature itself, since that's the part this
  audience responds to.
- Reuse `skins_showcase.png` as the lead image on dev.to/Hashnode; it's
  already built and on-brand.
