# DevGotchi 2.0 — Social Media Posts

---

## 🐦 Twitter / X — Thread

**Tweet 1 (hook)**
```
DevGotchi 2.0 just dropped and it hits different 🔥

Your VS Code is now a full cyberpunk RPG.
Pixel art scenes. Procedural synth music. Burnout mechanics. Achievements.

Code is a martial art. 🥋⚡

🧵 Here's everything that's new:
```

**Tweet 2 (visual)**
```
🎨 The panel got a complete visual overhaul.

Deep navy. Neon purple. Glowing stat bars.
A pixel art room — kanji scroll, bonsai, lantern, lotus — with your meditating dev character at the centre.

It looks like a lo-fi beats thumbnail. Except it's your IDE.
```

**Tweet 3 (music)**
```
🎵 Cyberpunk music. In your VS Code. Right now.

Fully procedural — synthesised with Web Audio API.
No files. No downloads. Just vibes.

Arpeggios. Bass lines. Pad chords. A synth lead that creeps in every 4 bars.

Toggle it on and code like you're in a neon-soaked basement at 2am.
```

**Tweet 4 (burnout + events)**
```
☠️ BURNOUT STATE is real now.

Let your health hit zero and the whole UI goes red and glitchy.
Actions lock. A warning banner pulses.
Only coffee and breaks can save you.

Also: random events fire mid-session.
"Production incident! -Energy -Motivation" 😬
"Found a forgotten coffee stash! +20 beans" ✅
```

**Tweet 5 (achievements + log)**
```
🏅 12 achievements to unlock.
📡 A live activity log of every XP gain, level-up, and random event.

First Commit. Code Monk. Iron Discipline. Back from the Edge.
All colour-coded. All tracked.

Your coding session has never been this documented.
```

**Tweet 6 (CTA)**
```
DevGotchi is free on the VS Code Marketplace.

👉 Install it, open the panel, and turn on the music.
Then don't stop coding until you hit Level 10.

🧘 Code is a martial art.

#VSCode #DevTools #GameDev #CyberpunkAesthetic
```

---

## 💼 LinkedIn

```
🚀 DevGotchi 2.0 is live — and I'm genuinely proud of this one.

DevGotchi turns your VS Code sessions into an RPG. Your stats (Focus, Energy, Motivation) 
decay as you work, XP rewards real coding activity like saves and git commits, and your 
developer avatar reacts to everything.

Version 2.0 is a full reimagination. Here's what's new:

🎨 CYBERPUNK UI REDESIGN
The panel was rebuilt from scratch — deep navy backgrounds, neon purple/pink glowing stat 
bars, and a full-width pixel art scene in the header. A meditating developer character sits 
in a Japanese-inspired room: kanji scroll, bonsai tree, neon lotus, warm lantern, VS Code 
monitor glowing in the background.

🎵 PROCEDURAL CYBERPUNK MUSIC
Ambient music synthesised entirely with the Web Audio API — no external files, no network 
requests, CSP-safe. Layered bass lines, arpeggios, pad chords, and a synth lead. Toggle 
it on and it fades in. Toggle it off and it fades out. It just works.

☠️ BURNOUT STATE
When your health hits zero, the UI shifts red, a glitch overlay kicks in, and most actions 
lock. Only coffee and breaks can bring you back. It's a mechanic that makes you feel the 
consequences of ignoring your stats — and recovering from it earns you an achievement.

⚡ RANDOM EVENTS
Every passive tick has a chance of a surprise event — "Rubber duck debugging breakthrough! 
+Motivation", "Production incident! −Energy", "Git blame points at you. −Motivation." 
It keeps sessions unpredictable.

🏅 12 ACHIEVEMENTS + ACTIVITY LOG
A full achievement system tracking lifetime milestones, plus a colour-coded activity log 
showing every XP gain, level-up, and event in real time.

---

The technical highlight for me: the music and the pixel art scene are both generated 
entirely in JavaScript — no assets, no CDN, just Web Audio API and Canvas 2D. It's one 
self-contained TypeScript file that compiles to a VS Code extension.

Free on the VS Code Marketplace. Install it, turn on the music, and don't stop coding.

#VSCode #DeveloperTools #OpenSource #TypeScript #WebDev #GameDev
```

---

## 👾 Reddit — r/vscode or r/webdev

**Title:**
```
I rebuilt DevGotchi — my VS Code RPG extension — with a full cyberpunk UI, pixel art scene, 
procedural synth music, burnout mechanics, and achievements (v2.0)
```

**Body:**
```
Hey everyone — I've been working on DevGotchi for a while, a VS Code extension that turns 
your coding sessions into a developer Tamagotchi / RPG. Your stats (Focus, Motivation, 
Energy, Health) decay over time, coding activity earns XP, and you manage a developer 
avatar that reacts to what you're doing.

Version 2.0 just dropped and it's a pretty significant overhaul. Here's what changed:

---

**🎨 Full cyberpunk UI redesign**

The entire panel was rebuilt. Deep navy/dark backgrounds, neon purple glow on everything, 
pixel-art-style fonts. The big new addition is a **full-width pixel art scene canvas** in 
the header — a meditating developer character sitting in a Japanese-inspired room, drawn 
entirely with Canvas 2D:

- Kanji scroll (改善) hanging on the left
- Neon lotus flower built from bezier curves with glow
- Warm paper lantern with radial light halo
- Pixel art bonsai tree
- Glowing VS Code monitor in the background
- Vertical Japanese text on the right wall (コードは武道だ)
- The character reacts to mood: sparkles when productive, z's when tired, red tint when burnt out

No images, no assets — pure canvas drawing code.

---

**🎵 Procedural cyberpunk music**

This was a fun one. The extension's CSP blocks all external URLs, so I synthesised the music 
entirely with the Web Audio API. It's a layered composition:

- Kick drum (sine sweep)
- Hi-hats (filtered white noise)
- Walking A-minor bass line (sawtooth through low-pass)
- 16-step pentatonic arpeggio (square wave, stereo panning)
- Slow pad chords every 2 bars (4-voice A minor)
- Sparse synth lead every 4 bars

Uses a lookahead scheduler so there are no glitches. Toggle button in the panel fades 
in/out with a gain ramp.

---

**☠️ Burnout state**

When health hits zero, the whole UI changes:
- Red glitch overlay (CSS animation)
- Pulsing critical warning banner
- Most action buttons become `pointer-events: none` with 35% opacity
- Only Coffee and Take a Break remain usable
- Recovery above 30 health exits burnout and unlocks the *Back from the Edge* achievement

---

**⚡ Random events + 🏅 Achievements + 📡 Activity log**

- ~12% chance each passive tick of a surprise event (mix of good and bad)
- 12 achievement badges tracking lifetime milestones
- Scrollable activity log, colour-coded by event type

---

It's free on the VS Code Marketplace — just search **DevGotchi**. Happy to answer questions 
about any of the implementation details.

[GitHub link] | [Marketplace link]
```

---

## 🚀 Product Hunt

**Tagline:**
```
Your VS Code is now a cyberpunk RPG. Code. Earn XP. Survive burnout.
```

**Description:**
```
DevGotchi 2.0 turns your VS Code into a living developer RPG — and the 2.0 update is a 
complete reimagination.

CODE IS A MARTIAL ART. ⚡

Your four stats — Focus, Motivation, Energy, Health — decay in real time as you work. 
Saving files, pushing commits, and fixing bugs earn XP and Coffee Beans. Let your health 
hit zero and you enter full burnout: the UI goes red and glitchy, most actions lock, and 
only breaks can save you.

**What's new in 2.0:**

🎨 Cyberpunk UI — Rebuilt from scratch with neon glows, dark navy panels, and a 
full-width pixel art scene: meditating character in a Japanese room with a kanji scroll, 
bonsai, neon lotus, and a glowing VS Code monitor in the background. All drawn with Canvas 2D.

🎵 Procedural music — Cyberpunk ambient music synthesised entirely with the Web Audio API 
(no files, no network). Bass lines, arpeggios, pad chords, synth lead. Toggle it on and 
code like you're in a neon-soaked basement.

☠️ Burnout — A real game mechanic. Let your health collapse and face the consequences.

⚡ Random events — Production incidents, coffee stashes, mysterious bugs that vanish on 
their own. Keeps every session unpredictable.

🏅 12 Achievements — First Commit, Code Monk, Iron Discipline, Back from the Edge, and more.

📡 Activity log — Every XP gain, level-up, and random event tracked in real time.

Free. One TypeScript file. Zero telemetry.
```

**First comment (maker):**
```
Hey PH! 👋

I built DevGotchi because I wanted something that made long coding sessions feel like 
*progress* beyond just shipping features. The RPG loop — stats decaying, activity earning 
rewards, leveling up — genuinely makes me more intentional about taking breaks and staying 
in flow.

The most technically interesting part of 2.0: the music and the pixel art scene are both 
generated entirely in JavaScript at runtime. No external assets, no CDN — the extension's 
CSP blocks everything. The pixel art room is ~200 lines of Canvas 2D draw calls, and the 
music is a full layered synth composition using the Web Audio API with a lookahead scheduler.

Would love to hear feedback — especially from anyone who ends up actually leaving the music 
running during a session. 🎵
```
