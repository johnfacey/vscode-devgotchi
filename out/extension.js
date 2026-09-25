"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const path = require("path");
const os = require("os");
const cp = require("child_process");
const SKILLS = [
    { id: 'caffeine_tolerance', name: 'Caffeine Tolerance', description: 'Coffee restores 50% more energy', cost: 50 },
    { id: 'iron_focus', name: 'Iron Focus', description: 'Focus decays 30% slower', cost: 75 },
    { id: 'bug_slayer', name: 'Bug Slayer', description: 'Earn 2x XP when fixing bugs', cost: 100 }
];
const CLASSES = [
    { id: 'backend_mage', name: 'Backend Mage', emoji: '🔮', color: '#9d4edd', description: 'Git commits channel extra power: +25% XP from commits.' },
    { id: 'frontend_rogue', name: 'Frontend Rogue', emoji: '🗡️', color: '#2dd4a5', description: 'Fast and precise: +25% XP from file saves.' },
    { id: 'devops_paladin', name: 'DevOps Paladin', emoji: '🛡️', color: '#ffb020', description: 'Built for uptime: energy & motivation decay 15% slower.' }
];
const CLASS_RESPEC_COST = 200;
// Two-frame glyph cycle per class, used to give the status bar badge a
// subtle "alive" animation instead of a static emoji. Purely cosmetic.
const CLASS_ANIM_FRAMES = {
    backend_mage: ['🔮', '✨'],
    frontend_rogue: ['🗡️', '💨'],
    devops_paladin: ['🛡️', '⚡']
};
const HACKTOBERFEST_EVENT = {
    id: 'hacktoberfest',
    name: 'Hacktoberfest',
    emoji: '🎃',
    questType: 'pr_merge',
    questTarget: 4, // matches the traditional real-world Hacktoberfest target
    questLabel: 'Merge 4 pull requests',
    progressUnitSingular: 'pull request',
    progressUnitPlural: 'pull requests',
    progressVerb: 'merged',
    perTickReward: { xp: 30, coffee: 15 }, // PR merges have no existing reward pipeline, so pay out per merge
    showToastOnProgress: true, // merges are infrequent enough that a toast each time is welcome
    skinId: 'skin_hacktoberfest',
    skinName: 'Hacktoberfest Hunter',
    skinEmoji: '🎃',
    skinDescription: 'Earned by merging 4 pull requests during Hacktoberfest. Not for sale.',
    isActive: (d) => d.getMonth() === 9, // October, 0-indexed — recurs every year
    bannerGradientStart: '#4d2600',
    bannerGradientEnd: '#ff8c00',
    bannerTextColor: '#1a0f00',
    accentColor: '#ff8c00'
};
const DEBUG_THE_HALLS_EVENT = {
    id: 'debug_the_halls',
    name: 'Debug the Halls',
    emoji: '🎄',
    questType: 'bugs_fixed',
    questTarget: 25,
    questLabel: 'Fix 25 bugs',
    progressUnitSingular: 'bug',
    progressUnitPlural: 'bugs',
    progressVerb: 'fixed',
    perTickReward: null, // bug fixes already grant XP via updateErrorCount — avoid double-paying and toast spam
    showToastOnProgress: false,
    skinId: 'skin_debug_the_halls',
    skinName: 'Holiday Debugger',
    skinEmoji: '🎅',
    skinDescription: 'Earned by fixing 25 bugs during Debug the Halls (December). Not for sale.',
    isActive: (d) => d.getMonth() === 11, // December — recurs every year
    bannerGradientStart: '#7a0000',
    bannerGradientEnd: '#0d4d1a',
    bannerTextColor: '#ffffff',
    accentColor: '#2ea043'
};
const PI_DAY_EVENT = {
    id: 'pi_day',
    name: 'Pi Day',
    emoji: '🥧',
    questType: 'commits',
    questTarget: 3,
    questLabel: 'Ship 3 commits',
    progressUnitSingular: 'commit',
    progressUnitPlural: 'commits',
    progressVerb: 'shipped',
    perTickReward: null, // commits already grant XP via onGitCommit — avoid double-paying
    showToastOnProgress: false,
    skinId: 'skin_pi_day',
    skinName: '3.14 Coder',
    skinEmoji: '🥧',
    skinDescription: 'Earned by shipping 3 commits on Pi Day (March 14). Not for sale.',
    isActive: (d) => d.getMonth() === 2 && d.getDate() === 14, // March 14 only
    bannerGradientStart: '#1a2b4d',
    bannerGradientEnd: '#f4c430',
    bannerTextColor: '#1a1a1a',
    accentColor: '#f4c430'
};
const APRIL_FOOLS_EVENT = {
    id: 'april_fools',
    name: "April Fools'",
    emoji: '🤡',
    questType: 'panel_open',
    questTarget: 1,
    questLabel: "Open DevGotchi on April Fools' Day",
    progressUnitSingular: 'visit',
    progressUnitPlural: 'visits',
    progressVerb: 'logged',
    perTickReward: null, // purely a joke skin, no economy impact intended
    showToastOnProgress: false, // completes on the very first tick anyway
    skinId: 'skin_april_fools',
    skinName: 'Prankster',
    skinEmoji: '🤡',
    skinDescription: "Earned just by having DevGotchi open on April Fools' Day. Not for sale.",
    isActive: (d) => d.getMonth() === 3 && d.getDate() === 1, // April 1 only
    bannerGradientStart: '#4d004d',
    bannerGradientEnd: '#ff66ff',
    bannerTextColor: '#ffffff',
    accentColor: '#ff66ff'
};
const MAY_THE_FOURTH_EVENT = {
    id: 'may_the_fourth',
    name: 'May the 4th',
    emoji: '🌌',
    questType: 'bugs_fixed',
    questTarget: 5,
    questLabel: 'Fix 5 bugs — the Force is strong today',
    progressUnitSingular: 'bug',
    progressUnitPlural: 'bugs',
    progressVerb: 'fixed',
    perTickReward: null, // bug fixes already grant XP via updateErrorCount — avoid double-paying and toast spam
    showToastOnProgress: false,
    skinId: 'skin_may_the_fourth',
    skinName: 'Jedi Debugger',
    skinEmoji: '⚔️',
    skinDescription: 'Earned by fixing 5 bugs on Star Wars Day (May 4). Not for sale.',
    isActive: (d) => d.getMonth() === 4 && d.getDate() === 4, // May 4 only
    bannerGradientStart: '#001a00',
    bannerGradientEnd: '#00ff41',
    bannerTextColor: '#ffffff',
    accentColor: '#00ff41'
};
const SUMMER_HACK_SEASON_EVENT = {
    id: 'summer_hack_season',
    name: 'Summer Hack Season',
    emoji: '🏖️',
    questType: 'focus_sprints',
    questTarget: 10,
    questLabel: 'Complete 10 Focus Sprints',
    progressUnitSingular: 'Focus Sprint',
    progressUnitPlural: 'Focus Sprints',
    progressVerb: 'completed',
    perTickReward: null, // Focus Sprint completion already grants its own bonus — avoid double-paying
    showToastOnProgress: false,
    skinId: 'skin_summer_hack_season',
    skinName: 'Code Beach',
    skinEmoji: '🏖️',
    skinDescription: 'Earned by completing 10 Focus Sprints during Summer Hack Season (June–August). Not for sale.',
    isActive: (d) => [5, 6, 7].includes(d.getMonth()), // June, July, August — recurs every year
    bannerGradientStart: '#003d4d',
    bannerGradientEnd: '#ffd166',
    bannerTextColor: '#00232b',
    accentColor: '#ffd166'
};
const PROGRAMMERS_DAY_EVENT = {
    id: 'programmers_day',
    name: "Programmer's Day",
    emoji: '💾',
    questType: 'commits',
    questTarget: 1,
    questLabel: 'Make 1 commit to celebrate',
    progressUnitSingular: 'commit',
    progressUnitPlural: 'commits',
    progressVerb: 'made',
    perTickReward: null, // commits already grant XP via onGitCommit — avoid double-paying
    showToastOnProgress: false,
    skinId: 'skin_programmers_day',
    skinName: '256 Club',
    skinEmoji: '💾',
    skinDescription: "Earned by committing on Programmer's Day (Sept 13 — the 256th day of a non-leap year). Not for sale.",
    // Programmer's Day is technically "day 256 of the year" (Sept 12 in leap
    // years), but hardcoding Sept 13 is close enough for a cosmetic game event.
    isActive: (d) => d.getMonth() === 8 && d.getDate() === 13, // September 13 only
    bannerGradientStart: '#0d1b2a',
    bannerGradientEnd: '#00d9ff',
    bannerTextColor: '#001018',
    accentColor: '#00d9ff'
};
const SEASONAL_EVENTS = [
    PI_DAY_EVENT,
    APRIL_FOOLS_EVENT,
    MAY_THE_FOURTH_EVENT,
    SUMMER_HACK_SEASON_EVENT,
    PROGRAMMERS_DAY_EVENT,
    HACKTOBERFEST_EVENT,
    DEBUG_THE_HALLS_EVENT
];
function getActiveSeasonalEvent(d = new Date()) {
    return SEASONAL_EVENTS.find(e => e.isActive(d)) || null;
}
/** Year-scoped id so next year's Hacktoberfest starts with fresh progress automatically. */
function seasonalEventInstanceId(event, d = new Date()) {
    return `${event.id}-${d.getFullYear()}`;
}
const BOSS_AFFIXES = [
    { id: 'double_trouble', name: 'Double Trouble', emoji: '🔥', description: 'Active bugs drain energy & motivation twice as fast — keep that error count down.', bugStressMultiplier: 2 },
    { id: 'sprint_surge', name: 'Sprint Surge', emoji: '⏱️', description: 'Focus Sprint completions pay double coffee this week.', sprintCoffeeMultiplier: 2 },
    { id: 'boss_rush', name: 'Boss Rush', emoji: '👾', description: 'Every boss defeat pays double XP and coffee this week.', bossBonusMultiplier: 2 },
    { id: 'quest_rally', name: 'Quest Rally', emoji: '📜', description: 'Daily quest rewards are doubled this week.', questRewardMultiplier: 2 },
    { id: 'iron_streak', name: 'Iron Streak', emoji: '🔥', description: 'The daily login bonus pays double coffee this week.', dailyBonusMultiplier: 2 },
    { id: 'slow_burn', name: 'Slow Burn', emoji: '🌙', description: 'All stat decay is 30% slower this week — an easy week.', decayMultiplier: 0.7 },
    { id: 'caffeine_week', name: 'Caffeine Week', emoji: '☕', description: 'Every source of coffee beans pays 50% more this week.', sprintCoffeeMultiplier: 1.5, dailyBonusMultiplier: 1.5, questRewardMultiplier: 1.5, bossBonusMultiplier: 1.5 }
];
/** ISO 8601 week key (Monday-start), e.g. "2026-W39" — changes every Monday. */
function getISOWeekKey(d = new Date()) {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return `${date.getUTCFullYear()}-W${weekNo}`;
}
/** Deterministic pick: the same ISO week always maps to the same affix, with no state to persist or reset. */
function getActiveBossAffix(d = new Date()) {
    const key = getISOWeekKey(d);
    let hash = 0;
    for (let i = 0; i < key.length; i++)
        hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
    return BOSS_AFFIXES[hash % BOSS_AFFIXES.length];
}
const LEGACY_DUNGEON_CHAPTERS = [
    { title: 'The Crumbling Entrance', flavorText: 'You step through a splintered doorway into a repo no one has touched since 2014. Dust and dead branches everywhere.', type: 'save', target: 10, rewardXp: 20, rewardCoffee: 15 },
    { title: 'Whispers in the Changelog', flavorText: "Something moved in utils.js. The changelog hasn't been updated in three years, yet the entries keep growing.", type: 'commit', target: 3, rewardXp: 30, rewardCoffee: 20 },
    { title: 'The Dependency Crypt', flavorText: 'Ancient imports guard the path forward, each one older and more deprecated than the last.', type: 'fix', target: 5, rewardXp: 40, rewardCoffee: 25 },
    { title: 'Echoes of Deprecated Code', flavorText: 'Voices in the console warn of functions long forgotten. You press on, one keystroke at a time.', type: 'time', target: 45, rewardXp: 50, rewardCoffee: 30 },
    { title: 'The Merge Conflict Labyrinth', flavorText: 'The walls shift with every rebase. There is no map here, only <<<<<<< HEAD.', type: 'fix', target: 8, rewardXp: 60, rewardCoffee: 35 },
    { title: "The Refactor's Reckoning", flavorText: 'One final push before the core. Ship clean, ship often.', type: 'commit', target: 6, rewardXp: 75, rewardCoffee: 45 },
    { title: 'The Legacy Core', flavorText: 'At the heart of the dungeon: the original commit. Everything in this codebase traces back to this one change.', type: 'save', target: 25, rewardXp: 100, rewardCoffee: 60 }
];
const LEGACY_DUNGEON_SKIN_ID = 'skin_legacy_slayer';
const SHOP_ITEMS = [
    { id: 'skin_suit', name: 'Business Suit', type: 'skin', description: 'Dress for success', cost: 150, emoji: '🕴️' },
    { id: 'skin_space', name: 'Space Suit', type: 'skin', description: 'Code in zero-g', cost: 300, emoji: '👨‍🚀' },
    { id: 'skin_wizard', name: 'Code Wizard', type: 'skin', description: 'Cast spells, not just functions', cost: 200, emoji: '🧙' },
    { id: 'skin_ninja', name: 'Debug Ninja', type: 'skin', description: 'Silent, deadly, zero console.logs', cost: 250, emoji: '🥷' },
    { id: 'skin_robot', name: 'Autobuild Mode', type: 'skin', description: "CI/CD, but it's you", cost: 350, emoji: '🤖' },
    { id: 'skin_alien', name: 'Alien Contractor', type: 'skin', description: 'Definitely not from this codebase', cost: 400, emoji: '👽' },
    { id: 'skin_vampire', name: 'Night Shift', type: 'skin', description: 'Commits after midnight only', cost: 275, emoji: '🧛' },
    { id: 'skin_royalty', name: 'Principal Engineer', type: 'skin', description: 'You approve your own PRs now', cost: 500, emoji: '🤴' },
    { id: 'furn_chair', name: 'Ergo Chair', type: 'furniture', description: 'Energy decays 15% slower', cost: 200 },
    { id: 'acc_keyboard', name: 'Mech Keyboard', type: 'accessory', description: 'Motivation decays 15% slower', cost: 250 },
    { id: HACKTOBERFEST_EVENT.skinId, name: HACKTOBERFEST_EVENT.skinName, type: 'skin', description: HACKTOBERFEST_EVENT.skinDescription, cost: 0, emoji: HACKTOBERFEST_EVENT.skinEmoji, eventOnly: true },
    { id: DEBUG_THE_HALLS_EVENT.skinId, name: DEBUG_THE_HALLS_EVENT.skinName, type: 'skin', description: DEBUG_THE_HALLS_EVENT.skinDescription, cost: 0, emoji: DEBUG_THE_HALLS_EVENT.skinEmoji, eventOnly: true },
    { id: PI_DAY_EVENT.skinId, name: PI_DAY_EVENT.skinName, type: 'skin', description: PI_DAY_EVENT.skinDescription, cost: 0, emoji: PI_DAY_EVENT.skinEmoji, eventOnly: true },
    { id: APRIL_FOOLS_EVENT.skinId, name: APRIL_FOOLS_EVENT.skinName, type: 'skin', description: APRIL_FOOLS_EVENT.skinDescription, cost: 0, emoji: APRIL_FOOLS_EVENT.skinEmoji, eventOnly: true },
    { id: MAY_THE_FOURTH_EVENT.skinId, name: MAY_THE_FOURTH_EVENT.skinName, type: 'skin', description: MAY_THE_FOURTH_EVENT.skinDescription, cost: 0, emoji: MAY_THE_FOURTH_EVENT.skinEmoji, eventOnly: true },
    { id: SUMMER_HACK_SEASON_EVENT.skinId, name: SUMMER_HACK_SEASON_EVENT.skinName, type: 'skin', description: SUMMER_HACK_SEASON_EVENT.skinDescription, cost: 0, emoji: SUMMER_HACK_SEASON_EVENT.skinEmoji, eventOnly: true },
    { id: PROGRAMMERS_DAY_EVENT.skinId, name: PROGRAMMERS_DAY_EVENT.skinName, type: 'skin', description: PROGRAMMERS_DAY_EVENT.skinDescription, cost: 0, emoji: PROGRAMMERS_DAY_EVENT.skinEmoji, eventOnly: true },
    { id: LEGACY_DUNGEON_SKIN_ID, name: 'Legacy Slayer', type: 'skin', description: 'Earned by completing all 7 chapters of The Legacy Code Dungeon. Not for sale.', cost: 0, emoji: '💀', eventOnly: true }
];
const QUEST_PACK_MAX_QUESTS = 30;
const QUEST_PACK_MAX_TARGET = 10000;
const QUEST_PACK_MAX_REWARD = 1000;
const QUEST_PACK_ID_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;
/** Escapes text pulled from an untrusted Quest Pack before it's ever stored — the webview renders quest descriptions via innerHTML, not textContent. */
function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
/**
 * Validates and normalizes a parsed Quest Pack JSON payload. Returns an
 * error string if anything is wrong (caller shows it verbatim), or the
 * validated pack (with all free text escaped) on success. Deliberately
 * strict — this is the one place in DevGotchi that ever consumes content
 * someone else wrote, so every field is bounds-checked rather than trusted.
 */
function validateQuestPack(raw) {
    if (!raw || typeof raw !== 'object')
        return { error: 'Not a valid Quest Pack: expected a JSON object.' };
    if (typeof raw.packId !== 'string' || !QUEST_PACK_ID_PATTERN.test(raw.packId)) {
        return { error: 'Invalid packId: must be 1-64 letters/numbers/dashes/underscores.' };
    }
    if (typeof raw.packName !== 'string' || !raw.packName.trim() || raw.packName.length > 80) {
        return { error: 'Invalid packName: must be a non-empty string up to 80 characters.' };
    }
    if (raw.packDescription !== undefined && (typeof raw.packDescription !== 'string' || raw.packDescription.length > 300)) {
        return { error: 'Invalid packDescription: must be a string up to 300 characters.' };
    }
    if (!Array.isArray(raw.quests) || raw.quests.length === 0) {
        return { error: 'Invalid quests: must be a non-empty array.' };
    }
    if (raw.quests.length > QUEST_PACK_MAX_QUESTS) {
        return { error: `Too many quests: a pack can have at most ${QUEST_PACK_MAX_QUESTS}.` };
    }
    const seenIds = new Set();
    const quests = [];
    for (const q of raw.quests) {
        if (!q || typeof q !== 'object')
            return { error: 'Invalid quest entry: expected an object.' };
        if (typeof q.id !== 'string' || !QUEST_PACK_ID_PATTERN.test(q.id)) {
            return { error: `Invalid quest id "${q?.id}": must be 1-64 letters/numbers/dashes/underscores.` };
        }
        if (seenIds.has(q.id))
            return { error: `Duplicate quest id "${q.id}" within the pack.` };
        seenIds.add(q.id);
        if (!['save', 'commit', 'fix', 'time'].includes(q.type)) {
            return { error: `Invalid quest type "${q.type}": must be one of save, commit, fix, time.` };
        }
        if (typeof q.description !== 'string' || !q.description.trim() || q.description.length > 150) {
            return { error: `Invalid description for quest "${q.id}": must be a non-empty string up to 150 characters.` };
        }
        if (!Number.isInteger(q.target) || q.target < 1 || q.target > QUEST_PACK_MAX_TARGET) {
            return { error: `Invalid target for quest "${q.id}": must be an integer between 1 and ${QUEST_PACK_MAX_TARGET}.` };
        }
        if (!Number.isInteger(q.reward) || q.reward < 0 || q.reward > QUEST_PACK_MAX_REWARD) {
            return { error: `Invalid reward for quest "${q.id}": must be an integer between 0 and ${QUEST_PACK_MAX_REWARD}.` };
        }
        quests.push({
            id: q.id,
            type: q.type,
            description: escapeHtml(q.description.trim()),
            target: q.target,
            reward: q.reward
        });
    }
    return {
        pack: {
            packId: raw.packId,
            packName: escapeHtml(raw.packName.trim()),
            packDescription: raw.packDescription ? escapeHtml(raw.packDescription.trim()) : undefined,
            quests
        }
    };
}
const ACHIEVEMENTS = [
    { id: 'first_save', name: 'First Keystroke', icon: '⌨️', description: 'Save your first file' },
    { id: 'first_commit', name: 'Ship It', icon: '🚀', description: 'Make your first commit' },
    { id: 'level_5', name: 'Getting Warmed Up', icon: '🔥', description: 'Reach Level 5' },
    { id: 'level_10', name: 'Code Monk', icon: '🧘', description: 'Reach Level 10' },
    { id: 'level_25', name: 'Legendary Dev', icon: '⚡', description: 'Reach Level 25' },
    { id: 'streak_7', name: 'Week Warrior', icon: '📅', description: 'Maintain a 7-day streak' },
    { id: 'streak_30', name: 'Iron Discipline', icon: '🏆', description: 'Maintain a 30-day streak' },
    { id: 'bugs_50', name: 'Exterminator', icon: '🐛', description: 'Fix 50 bugs total' },
    { id: 'commits_20', name: 'Commit Machine', icon: '📦', description: 'Make 20 commits' },
    { id: 'coffee_500', name: 'Caffeinated', icon: '☕', description: 'Earn 500 coffee beans total' },
    { id: 'survived_burnout', name: 'Back from the Edge', icon: '💀', description: 'Recover from full burnout' },
    { id: 'quest_streak_5', name: 'Quest Master', icon: '📜', description: 'Complete quests 5 days in a row' },
    { id: 'focus_sprints_10', name: 'Deep Work', icon: '⏱️', description: 'Complete 10 Focus Sprints' },
    { id: 'night_owl', name: 'Night Owl', icon: '🦉', description: 'Save a file between 3am and 4am', secret: true },
    { id: 'quick_draw', name: 'Quick Draw', icon: '🤠', description: 'Fix a bug within 60 seconds of it appearing', secret: true },
];
const FOCUS_SPRINT_XP_MULTIPLIER = 1.5;
const FOCUS_SPRINT_BONUS_XP = 40;
const FOCUS_SPRINT_BONUS_COFFEE = 25;
const BUG_BOSS_DEFEAT_BONUS_XP = 30;
const BUG_BOSS_DEFEAT_BONUS_COFFEE = 15;
const MERGE_KRAKEN_DEFEAT_BONUS_XP = 30;
const MERGE_KRAKEN_DEFEAT_BONUS_COFFEE = 15;
const LONG_FILE_LINE_THRESHOLD = 300; // Files past this line count count as Code Smell Boss HP — matches the common ESLint max-lines default
const CODE_SMELL_REFACTOR_XP_PER_FILE = 40; // Chunkier than a bug fix's 5 XP — shrinking a bloated file below threshold is real refactoring work
const CODE_SMELL_BOSS_DEFEAT_BONUS_XP = 30;
const CODE_SMELL_BOSS_DEFEAT_BONUS_COFFEE = 15;
const TEAM_RAID_BOSS_DEFEAT_BONUS_XP = 25;
const TEAM_RAID_BOSS_DEFEAT_BONUS_COFFEE = 20;
const WEEKLY_RECAP_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;
const YEARLY_RECAP_INTERVAL_MS = 365 * 24 * 60 * 60 * 1000;
const PRESTIGE_LEVEL_REQUIREMENT = 50;
const PRESTIGE_XP_BONUS_PER_PRESTIGE = 0.05; // +5% XP gain per prestige, stacking and permanent
const DAILY_CALENDAR_CYCLE_LENGTH = 30;
const DAILY_CALENDAR_MILESTONE_BONUS_XP = 100;
const DAILY_CALENDAR_MILESTONE_BONUS_COFFEE = 100;
const IDLE_THRESHOLD_MS = 10 * 60 * 1000; // No editor activity for 10 minutes reads as AFK, not "still coding"
const SPONSOR_CLICK_COFFEE_BONUS = 25;
const SPONSOR_CLICK_COOLDOWN_MS = 24 * 60 * 60 * 1000; // Once per day — there's no way to verify a real sponsorship, so this rewards checking the page out, not payment
const DEFAULT_SETTINGS = {
    weeklyRecapEnabled: true,
    reduceNotifications: false,
    decayRate: 'normal'
};
const DECAY_RATE_MULTIPLIERS = {
    relaxed: 0.5,
    normal: 1,
    intense: 1.5
};
/**
 * Fills in any missing/invalid fields on a partial settings object with
 * defaults. Used both for loading saved settings and for validating a
 * settings object that arrived from the webview or an imported file.
 */
function mergeSettings(raw) {
    const allowedDecayRates = ['relaxed', 'normal', 'intense'];
    const decayRate = allowedDecayRates.includes(raw?.decayRate) ? raw.decayRate : DEFAULT_SETTINGS.decayRate;
    return {
        weeklyRecapEnabled: typeof raw?.weeklyRecapEnabled === 'boolean' ? raw.weeklyRecapEnabled : DEFAULT_SETTINGS.weeklyRecapEnabled,
        reduceNotifications: typeof raw?.reduceNotifications === 'boolean' ? raw.reduceNotifications : DEFAULT_SETTINGS.reduceNotifications,
        decayRate
    };
}
/**
 * Code Smell Boss detection: counts currently-open files over
 * LONG_FILE_LINE_THRESHOLD lines. Scoped to open documents rather than a
 * workspace-wide scan — TextDocument.lineCount is a free in-memory
 * property, so this is cheap enough to call on every open/close/save
 * without a debounce or background scan. Top-level (not a closure inside
 * activate()) so it can be called from listeners registered at different
 * points in activation without duplicating the filter logic.
 */
function countOpenLongFiles() {
    return vscode.workspace.textDocuments.filter(doc => doc.uri.scheme === 'file' && doc.lineCount > LONG_FILE_LINE_THRESHOLD).length;
}
/**
 * Extension activation entry point.
 * Initializes the game manager, status bar, and event listeners.
 */
function activate(context) {
    // Capture this BEFORE constructing DeveloperManager, which saves a fresh
    // default state on first run — we need to know whether a save already
    // existed to tell "brand new install" apart from "upgraded from an older
    // version" for the What's New popup below.
    const hadExistingSave = !!context.globalState.get('developer');
    const devManager = new DeveloperManager(context);
    // Team Mode: wired up further down once/if a git repository is detected
    // (see the Git Integration block). Declared here so every command closure
    // above and below can reference the same instance once it exists.
    let teamManager;
    checkAndShowWhatsNew(context, hadExistingSave);
    // Prompt for a class the first time (free) — including for existing saves
    // that predate this feature, since they never got to pick one either. Runs
    // fire-and-forget so it never blocks activation; if dismissed, it'll ask
    // again next time VS Code starts (no class is ever silently assigned).
    if (!devManager.getCharacterClass()) {
        devManager.chooseClass().then(result => {
            if (result.success) {
                vscode.window.showInformationMessage(result.message);
                updateStatusBar();
                DeveloperPanel.currentPanel?.updateDeveloper();
            }
        });
    }
    // Create and configure the status bar item
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'devgotchi.openPanel';
    context.subscriptions.push(statusBarItem);
    // A small always-on badge, left of everything else in the status bar, that
    // stays tinted in the chosen class's accent color — an ambient reminder of
    // who's "watching over" your code, distinct from the main stats item.
    const classBadgeItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    classBadgeItem.command = 'devgotchi.openPanel';
    context.subscriptions.push(classBadgeItem);
    // Toggled by classAnimInterval below to give the class glyph in the main
    // status bar item a subtle two-frame animation instead of sitting static.
    let classAnimFrame = 0;
    /**
     * Updates the status bar text and tooltip with current stats.
     */
    const updateStatusBar = () => {
        const dev = devManager.getDeveloper();
        const emoji = getMoodEmoji(dev.mood);
        const classInfo = devManager.getClassInfo();
        let text = `${emoji} ${dev.name} Lv${dev.level}`;
        if (classInfo) {
            const frames = CLASS_ANIM_FRAMES[classInfo.id] || [classInfo.emoji, classInfo.emoji];
            text = `${frames[classAnimFrame % frames.length]} ${text}`;
        }
        const remaining = (dev.focusSprintEndsAt || 0) - Date.now();
        if (remaining > 0) {
            text += ` ⏱ ${formatMMSS(remaining)}`;
        }
        statusBarItem.text = text;
        statusBarItem.tooltip = `💪 ${Math.round(dev.health)}% | 🔥 ${Math.round(dev.motivation)}% | 🧠 ${Math.round(dev.focus)}% | ☕ ${dev.coffee}`
            + (classInfo ? `\n${classInfo.emoji} ${classInfo.name} — ${classInfo.description}` : '')
            + (remaining > 0 ? `\n⏱ Focus Sprint: ${formatMMSS(remaining)} left (${FOCUS_SPRINT_XP_MULTIPLIER}x XP)` : '');
        statusBarItem.show();
        if (classInfo) {
            classBadgeItem.text = classInfo.emoji;
            classBadgeItem.color = classInfo.color;
            classBadgeItem.tooltip = `${classInfo.emoji} ${classInfo.name} — ${classInfo.description}`;
            classBadgeItem.show();
        }
        else {
            classBadgeItem.hide();
        }
    };
    // Initial status bar update
    updateStatusBar();
    // Advances the class glyph animation independently of the 30s stats loop
    // so it stays lively even when nothing else changes.
    const classAnimInterval = setInterval(() => {
        if (!devManager.getClassInfo())
            return;
        classAnimFrame++;
        updateStatusBar();
    }, 900);
    context.subscriptions.push({ dispose: () => clearInterval(classAnimInterval) });
    // Register the command to open the main webview panel
    context.subscriptions.push(vscode.commands.registerCommand('devgotchi.openPanel', () => {
        DeveloperPanel.createOrShow(context.extensionUri, devManager, teamManager);
    }));
    // Register command to reset progress
    context.subscriptions.push(vscode.commands.registerCommand('devgotchi.resetProgress', async () => {
        await devManager.resetProgress();
        DeveloperPanel.currentPanel?.updateDeveloper();
    }));
    // Register Prestige — only does anything once the player hits the level
    // cap (devManager.prestige() itself guards that and confirms with the user).
    context.subscriptions.push(vscode.commands.registerCommand('devgotchi.prestige', async () => {
        const result = await devManager.prestige();
        if (!result.success && result.message !== 'Prestige cancelled.') {
            vscode.window.showWarningMessage(result.message);
        }
        DeveloperPanel.currentPanel?.updateDeveloper();
    }));
    // Register Focus Sprint commands (Pomodoro-style timed XP boost)
    context.subscriptions.push(vscode.commands.registerCommand('devgotchi.startFocusSprint', async () => {
        if (devManager.isFocusSprintActive()) {
            const dev = devManager.getDeveloper();
            const remaining = (dev.focusSprintEndsAt || 0) - Date.now();
            const choice = await vscode.window.showInformationMessage(`A Focus Sprint is already running (${formatMMSS(Math.max(0, remaining))} left).`, 'Cancel Sprint');
            if (choice === 'Cancel Sprint') {
                const result = devManager.cancelFocusSprint();
                vscode.window.showInformationMessage(result.message);
                updateStatusBar();
                DeveloperPanel.currentPanel?.updateDeveloper();
            }
            return;
        }
        const pick = await vscode.window.showQuickPick([
            { label: '15 min — Quick Sprint', minutes: 15 },
            { label: '25 min — Classic Pomodoro', minutes: 25 },
            { label: '50 min — Deep Work', minutes: 50 }
        ], { placeHolder: `Start a Focus Sprint (${FOCUS_SPRINT_XP_MULTIPLIER}x XP while it runs)` });
        if (!pick)
            return;
        const result = devManager.startFocusSprint(pick.minutes);
        vscode.window.showInformationMessage(result.message);
        updateStatusBar();
        DeveloperPanel.currentPanel?.updateDeveloper();
    }));
    context.subscriptions.push(vscode.commands.registerCommand('devgotchi.cancelFocusSprint', () => {
        const result = devManager.cancelFocusSprint();
        vscode.window.showInformationMessage(result.message);
        updateStatusBar();
        DeveloperPanel.currentPanel?.updateDeveloper();
    }));
    // Register command to export a shareable stats card
    context.subscriptions.push(vscode.commands.registerCommand('devgotchi.exportStatsCard', () => {
        DeveloperPanel.createOrShow(context.extensionUri, devManager, teamManager);
        DeveloperPanel.currentPanel?.openShareCard();
    }));
    // Register command to open the Weekly Recap share card — used both from
    // the Command Palette and as the "Share Recap" action on the weekly
    // recap notification (see DeveloperManager.checkWeeklyRecap()).
    context.subscriptions.push(vscode.commands.registerCommand('devgotchi.openWeeklyRecap', () => {
        DeveloperPanel.createOrShow(context.extensionUri, devManager, teamManager);
        DeveloperPanel.currentPanel?.openWeeklyRecapShare();
    }));
    // Register command to open the Year in Code Wrapped share card — used
    // both from the Command Palette and as the "View Wrapped" action on the
    // yearly recap notification (see DeveloperManager.checkYearlyRecap()).
    context.subscriptions.push(vscode.commands.registerCommand('devgotchi.openYearlyRecap', () => {
        DeveloperPanel.createOrShow(context.extensionUri, devManager, teamManager);
        DeveloperPanel.currentPanel?.openYearlyRecapShare();
    }));
    // Register command to open the Settings modal
    context.subscriptions.push(vscode.commands.registerCommand('devgotchi.openSettings', () => {
        DeveloperPanel.createOrShow(context.extensionUri, devManager, teamManager);
        DeveloperPanel.currentPanel?.openSettings();
    }));
    // Register progress export: writes the full save (+ settings) to a JSON
    // file the user picks, so it can be backed up or moved to another machine.
    context.subscriptions.push(vscode.commands.registerCommand('devgotchi.exportProgress', async () => {
        const dev = devManager.getDeveloper();
        const safeName = (dev.name || 'dev').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
        const defaultUri = vscode.Uri.file(path.join(os.homedir(), `devgotchi-progress-${safeName}.json`));
        const target = await vscode.window.showSaveDialog({
            defaultUri,
            filters: { 'DevGotchi Progress': ['json'] }
        });
        if (!target)
            return;
        try {
            await vscode.workspace.fs.writeFile(target, Buffer.from(devManager.exportProgressData(), 'utf8'));
            const choice = await vscode.window.showInformationMessage('💾 Progress exported!', 'Reveal in Folder');
            if (choice === 'Reveal in Folder') {
                vscode.commands.executeCommand('revealFileInOS', target);
            }
        }
        catch (err) {
            vscode.window.showErrorMessage('Failed to export progress.');
        }
    }));
    // Register Timesheet Mode: exports the tracked daily-minutes-coded log
    // (see DeveloperManager.recordTimesheetMinutes) as a billable-hours CSV.
    // No rate/currency — DevGotchi hands over honest hours per day, not a bill.
    context.subscriptions.push(vscode.commands.registerCommand('devgotchi.exportTimesheet', async () => {
        const rangeChoice = await vscode.window.showQuickPick([
            { label: 'Last 7 days', value: 7 },
            { label: 'Last 30 days', value: 30 },
            { label: 'Last 90 days', value: 90 },
            { label: 'All tracked history', value: 'all' }
        ], { placeHolder: 'Timesheet range' });
        if (!rangeChoice)
            return;
        const csv = devManager.exportTimesheetData(rangeChoice.value);
        const defaultUri = vscode.Uri.file(path.join(os.homedir(), `devgotchi-timesheet.csv`));
        const target = await vscode.window.showSaveDialog({
            defaultUri,
            filters: { 'CSV': ['csv'] }
        });
        if (!target)
            return;
        try {
            await vscode.workspace.fs.writeFile(target, Buffer.from(csv, 'utf8'));
            const choice = await vscode.window.showInformationMessage('💼 Timesheet exported!', 'Reveal in Folder');
            if (choice === 'Reveal in Folder') {
                vscode.commands.executeCommand('revealFileInOS', target);
            }
        }
        catch {
            vscode.window.showErrorMessage('Failed to export timesheet.');
        }
    }));
    // Register progress import: reads a previously exported JSON file and
    // overwrites the current save after explicit confirmation.
    context.subscriptions.push(vscode.commands.registerCommand('devgotchi.importProgress', async () => {
        const picked = await vscode.window.showOpenDialog({
            canSelectMany: false,
            filters: { 'DevGotchi Progress': ['json'] }
        });
        if (!picked || !picked[0])
            return;
        const confirm = await vscode.window.showWarningMessage('Importing will overwrite your current DevGotchi progress. This cannot be undone. Continue?', 'Yes', 'No');
        if (confirm !== 'Yes')
            return;
        try {
            const bytes = await vscode.workspace.fs.readFile(picked[0]);
            const result = devManager.importProgressData(Buffer.from(bytes).toString('utf8'));
            if (result.success) {
                vscode.window.showInformationMessage(result.message);
            }
            else {
                vscode.window.showErrorMessage(result.message);
            }
            updateStatusBar();
            DeveloperPanel.currentPanel?.updateDeveloper();
        }
        catch (err) {
            vscode.window.showErrorMessage('Failed to read that file.');
        }
    }));
    // Register Quest Pack import from a local file — the zero-network-call
    // default. Community-authored quest packs are plain data (type/target/
    // reward), validated and HTML-escaped in DeveloperManager.importQuestPack
    // before ever touching state or the webview.
    context.subscriptions.push(vscode.commands.registerCommand('devgotchi.importQuestPack', async () => {
        const picked = await vscode.window.showOpenDialog({
            canSelectMany: false,
            filters: { 'DevGotchi Quest Pack': ['json'] }
        });
        if (!picked || !picked[0])
            return;
        try {
            const bytes = await vscode.workspace.fs.readFile(picked[0]);
            const result = devManager.importQuestPack(Buffer.from(bytes).toString('utf8'));
            if (result.success) {
                vscode.window.showInformationMessage(result.message);
            }
            else {
                vscode.window.showErrorMessage(result.message);
            }
            DeveloperPanel.currentPanel?.updateDeveloper();
        }
        catch {
            vscode.window.showErrorMessage('Failed to read that file.');
        }
    }));
    // Register Quest Pack import from a URL — the only thing in DevGotchi
    // that ever makes a network request, and only when the user explicitly
    // pastes a URL and confirms it. Lets someone share a pack as a raw
    // GitHub JSON link instead of a file to download first.
    context.subscriptions.push(vscode.commands.registerCommand('devgotchi.importQuestPackFromUrl', async () => {
        const url = await vscode.window.showInputBox({
            prompt: 'URL of a Quest Pack JSON file (e.g. a raw GitHub link)',
            placeHolder: 'https://raw.githubusercontent.com/.../quest-pack.json',
            validateInput: (v) => (/^https:\/\//.test(v.trim()) ? undefined : 'Must be an https:// URL')
        });
        if (!url)
            return;
        const confirm = await vscode.window.showWarningMessage(`This will make a network request to fetch:\n${url}\n\nDevGotchi otherwise makes no network calls at all. Continue?`, 'Yes', 'No');
        if (confirm !== 'Yes')
            return;
        try {
            const response = await fetch(url.trim());
            if (!response.ok) {
                vscode.window.showErrorMessage(`Failed to fetch that URL (HTTP ${response.status}).`);
                return;
            }
            const text = await response.text();
            const result = devManager.importQuestPack(text);
            if (result.success) {
                vscode.window.showInformationMessage(result.message);
            }
            else {
                vscode.window.showErrorMessage(result.message);
            }
            DeveloperPanel.currentPanel?.updateDeveloper();
        }
        catch {
            vscode.window.showErrorMessage('Failed to fetch or parse that URL.');
        }
    }));
    // Register Vacation Mode toggle: freezes stat decay and streak-breaking
    // for people who can't code for a few days and don't want to come back to
    // a burnt-out avatar and a broken streak.
    context.subscriptions.push(vscode.commands.registerCommand('devgotchi.toggleVacationMode', () => {
        const result = devManager.setVacationMode(!devManager.isVacationModeActive());
        vscode.window.showInformationMessage(result.message);
        updateStatusBar();
        DeveloperPanel.currentPanel?.updateDeveloper();
    }));
    // Register the feedback link: opens the GitHub issues page in the
    // default browser. No in-editor form — keeps things simple and puts
    // feedback wherever the project is already tracked.
    context.subscriptions.push(vscode.commands.registerCommand('devgotchi.sendFeedback', () => {
        vscode.env.openExternal(vscode.Uri.parse('https://github.com/johnfacey/vscode-devgotchi/issues/new'));
    }));
    // Register the GitHub Sponsors link, same pattern as the feedback link
    // above — DevGotchi stays free forever with no accounts or IAP, so this is
    // just an external link for anyone who wants to support development. Also
    // grants a small, once-per-day in-game coffee bonus for checking it out —
    // see DeveloperManager.supportOnSponsors for why it's framed that way
    // instead of gating on an unverifiable "did they actually sponsor" check.
    context.subscriptions.push(vscode.commands.registerCommand('devgotchi.openSponsors', () => {
        vscode.env.openExternal(vscode.Uri.parse('https://github.com/sponsors/johnfacey'));
        const result = devManager.supportOnSponsors();
        if (result.success) {
            vscode.window.showInformationMessage(result.message);
        }
        DeveloperPanel.currentPanel?.updateDeveloper();
    }));
    // Register Team Mode toggle. teamManager only exists once a git repo has
    // been detected (see the Git Integration block below) — if someone runs
    // this from the Command Palette in a non-git workspace, tell them plainly
    // rather than silently no-oping.
    context.subscriptions.push(vscode.commands.registerCommand('devgotchi.toggleTeamMode', async () => {
        if (!teamManager) {
            vscode.window.showWarningMessage('Team Mode needs an open git repository.');
            return;
        }
        const result = await teamManager.setEnabled(!teamManager.isEnabled());
        if (result.success) {
            vscode.window.showInformationMessage(result.message);
            if (teamManager.isEnabled()) {
                await teamManager.writeSnapshot(devManager.getDeveloper());
            }
        }
        else {
            vscode.window.showWarningMessage(result.message);
        }
        DeveloperPanel.currentPanel?.updateDeveloper();
    }));
    // Register command to open the class picker/respec directly from the
    // Command Palette (the Shop exposes the same action for a coffee cost
    // once a class is already set).
    context.subscriptions.push(vscode.commands.registerCommand('devgotchi.chooseClass', async () => {
        const result = await devManager.chooseClass();
        if (result.success) {
            vscode.window.showInformationMessage(result.message);
        }
        else if (result.message !== 'Class selection cancelled.') {
            vscode.window.showWarningMessage(result.message);
        }
        updateStatusBar();
        DeveloperPanel.currentPanel?.updateDeveloper();
    }));
    // Register command to open the Team view directly.
    context.subscriptions.push(vscode.commands.registerCommand('devgotchi.openTeamView', () => {
        DeveloperPanel.createOrShow(context.extensionUri, devManager, teamManager);
        DeveloperPanel.currentPanel?.openTeamView();
    }));
    // Lightweight 1-second ticker purely for a smooth Focus Sprint countdown in
    // the status bar / panel — does not run game logic (that stays on the 30s loop).
    const focusTickInterval = setInterval(() => {
        if (devManager.isFocusSprintActive()) {
            updateStatusBar();
            DeveloperPanel.currentPanel?.updateDeveloper();
        }
    }, 1000);
    context.subscriptions.push({ dispose: () => clearInterval(focusTickInterval) });
    // Listen for file saves to reward the user
    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(() => {
        devManager.recordActivity();
        devManager.onCodeSaved();
        devManager.updateLongFileCount(countOpenLongFiles());
        updateStatusBar();
    }));
    // Idle detection input: there's no OS-level AFK API for extensions, so
    // this is a best-effort proxy for "the user is actually here" —
    // selection change fires on nearly every keystroke/cursor move, so it's
    // the primary signal; editor switches and regaining window focus cover
    // the rest. See DeveloperManager.recordActivity / isIdle, used by
    // updateStats() to pause decay (and put the avatar to sleep) once nothing
    // has fired for a while — going to lunch shouldn't tank your stats.
    context.subscriptions.push(vscode.window.onDidChangeTextEditorSelection(() => devManager.recordActivity()));
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(() => devManager.recordActivity()));
    context.subscriptions.push(vscode.window.onDidChangeWindowState(state => { if (state.focused)
        devManager.recordActivity(); }));
    // The "Passive Loop": Update stats every 30 seconds
    const interval = setInterval(() => {
        devManager.updateStats();
        updateStatusBar();
        DeveloperPanel.currentPanel?.updateDeveloper();
    }, 30000);
    context.subscriptions.push({
        dispose: () => clearInterval(interval)
    });
    // Git Integration: Listen for commits/HEAD changes
    const gitExtension = vscode.extensions.getExtension('vscode.git');
    if (gitExtension) {
        const git = gitExtension.exports.getAPI(1);
        const hookRepo = (repo) => {
            // Team Mode piggybacks on the first repo we see. Multi-root workspaces
            // with several repos are an edge case we don't try to solve — the
            // first one is good enough for "does this workspace have a team".
            if (!teamManager && repo.rootUri) {
                teamManager = new TeamManager(context, repo.rootUri.fsPath, git.git?.path || 'git');
            }
            let lastHead = repo.state.HEAD?.commit;
            // Merge Conflict Kraken: HP is just the live count of files with
            // unresolved conflicts, sourced straight from the git extension's own
            // `mergeChanges` — same "derived from real repo state" idea as the Bug
            // Boss above. A conflicted merge/rebase doesn't necessarily move HEAD,
            // so this is checked on every state change, not just the HEAD-moved
            // branch below.
            devManager.setInitialConflictCount((repo.state.mergeChanges || []).length);
            repo.state.onDidChange(() => {
                devManager.updateConflictCount((repo.state.mergeChanges || []).length);
                updateStatusBar();
                DeveloperPanel.currentPanel?.updateDeveloper();
                const currentHead = repo.state.HEAD?.commit;
                if (currentHead && currentHead !== lastHead) {
                    lastHead = currentHead;
                    devManager.onGitCommit();
                    updateStatusBar();
                    // Fire-and-forget: writes the current user's own snapshot file
                    // (no-op if Team Mode isn't enabled for this workspace).
                    teamManager?.writeSnapshot(devManager.getDeveloper());
                    // Seasonal events (e.g. Hacktoberfest): ask the git extension for
                    // this commit's message and see if it looks like a merged PR.
                    // Best-effort — wrapped defensively since getCommit isn't
                    // something we want able to break commit handling if it ever
                    // throws or isn't available on some git extension version.
                    try {
                        Promise.resolve(repo.getCommit(currentHead)).then((commit) => {
                            if (commit?.message) {
                                devManager.onPossiblePRMerge(commit.message);
                                updateStatusBar();
                                DeveloperPanel.currentPanel?.updateDeveloper();
                            }
                        }, () => { });
                    }
                    catch {
                        // Ignore — seasonal quest progress just won't tick for this commit.
                    }
                }
            });
        };
        if (git.repositories)
            git.repositories.forEach(hookRepo);
        git.onDidOpenRepository(hookRepo);
    }
    // Linter Integration: Listen for diagnostics
    const getErrorCount = () => {
        return vscode.languages.getDiagnostics().reduce((acc, [, diags]) => {
            return acc + diags.filter(d => d.severity === vscode.DiagnosticSeverity.Error).length;
        }, 0);
    };
    devManager.setInitialErrorCount(getErrorCount());
    context.subscriptions.push(vscode.languages.onDidChangeDiagnostics(() => {
        devManager.updateErrorCount(getErrorCount());
        updateStatusBar();
    }));
    // Code Smell Boss: also recheck on open/close (save is already wired up
    // above, via countOpenLongFiles — see its doc comment for why this is
    // scoped to open documents rather than a workspace-wide scan).
    devManager.setInitialLongFileCount(countOpenLongFiles());
    context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(() => {
        devManager.updateLongFileCount(countOpenLongFiles());
        updateStatusBar();
        DeveloperPanel.currentPanel?.updateDeveloper();
    }));
    context.subscriptions.push(vscode.workspace.onDidCloseTextDocument(() => {
        devManager.updateLongFileCount(countOpenLongFiles());
        updateStatusBar();
        DeveloperPanel.currentPanel?.updateDeveloper();
    }));
}
// ── WHAT'S NEW ──────────────────────────────────────────────────────────
// Bump WHATS_NEW_VERSION and update WHATS_NEW_ITEMS whenever a release adds
// features worth resurfacing to existing users. Keep WHATS_NEW_VERSION in
// sync with package.json's "version" — there's no build step wiring the two
// together, so it's a manual pair (same tradeoff the codebase already makes
// elsewhere, e.g. duplicated color constants across the webview template).
const WHATS_NEW_VERSION = '2.8.0';
const WHATS_NEW_ITEMS = [
    { icon: '📖', title: 'The Legacy Code Dungeon', desc: 'A 7-chapter narrative questline — one chapter unlocks per day as you complete each objective.' },
    { icon: '🎁', title: 'Community Quest Packs', desc: 'Import shareable JSON quest packs from a file or URL — try the bundled "100 Days of Code" pack.' },
    { icon: '🎲', title: 'Boss Affixes', desc: 'A weekly mutator (Diablo-rift style) rotates automatically every Monday — this week’s shown right on the panel.' },
    { icon: '💼', title: 'Timesheet Mode', desc: 'Export your real coding time as a billable-hours CSV, right from Settings.' }
];
/**
 * Shows a one-time "What's New" panel to users who are upgrading from an
 * older version (not brand-new installs — they already get the tutorial).
 * Only fires once per version, tracked via globalState.
 */
function checkAndShowWhatsNew(context, hadExistingSave) {
    if (!hadExistingSave) {
        // Brand new install — nothing to "catch up" on, and the tutorial covers this.
        context.globalState.update('lastSeenVersion', WHATS_NEW_VERSION);
        return;
    }
    const lastSeenVersion = context.globalState.get('lastSeenVersion');
    if (lastSeenVersion !== WHATS_NEW_VERSION) {
        WhatsNewPanel.createOrShow(context.extensionUri);
        context.globalState.update('lastSeenVersion', WHATS_NEW_VERSION);
    }
}
/**
 * A small, self-contained webview panel announcing new features to
 * returning users. Intentionally has no message-passing or persistent
 * state of its own — it's a one-shot announcement, not a game surface.
 */
class WhatsNewPanel {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept for signature symmetry with DeveloperPanel.createOrShow
    static createOrShow(extensionUri) {
        if (WhatsNewPanel.currentPanel) {
            WhatsNewPanel.currentPanel.panel.reveal();
            return;
        }
        const panel = vscode.window.createWebviewPanel('devGotchiWhatsNew', "🚀 What's New in DevGotchi", vscode.ViewColumn.Two, { enableScripts: true });
        WhatsNewPanel.currentPanel = new WhatsNewPanel(panel);
    }
    constructor(panel) {
        this.disposables = [];
        this.panel = panel;
        this.panel.webview.html = this.getHtmlContent();
        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
        this.panel.webview.onDidReceiveMessage((message) => {
            if (message.command === 'open-panel') {
                vscode.commands.executeCommand('devgotchi.openPanel');
            }
        }, null, this.disposables);
    }
    dispose() {
        WhatsNewPanel.currentPanel = undefined;
        this.panel.dispose();
        while (this.disposables.length) {
            const x = this.disposables.pop();
            if (x)
                x.dispose();
        }
    }
    getHtmlContent() {
        const itemsHtml = WHATS_NEW_ITEMS.map(item => `
      <div class="item">
        <div class="item-icon">${item.icon}</div>
        <div class="item-body">
          <div class="item-title">${item.title}</div>
          <div class="item-desc">${item.desc}</div>
        </div>
      </div>
    `).join('');
        return `<!DOCTYPE html><html><head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
    <style>
      :root {
        --bg-deep: #080812; --bg-panel: #0e0e1e; --bg-card: #13132a;
        --neon-purple: #9d4edd; --neon-pink: #e040fb; --neon-gold: #ffd740;
        --text-main: #e8e8ff; --text-dim: #7070a0; --border: #2a2a4a;
      }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        font-family: 'Courier New', monospace;
        background: var(--bg-deep);
        color: var(--text-main);
        padding: 28px;
      }
      .container { max-width: 480px; margin: 0 auto; }
      h1 {
        font-size: 20px;
        margin-bottom: 4px;
        background: linear-gradient(90deg, var(--neon-purple), var(--neon-pink));
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      .tagline { font-size: 11px; color: var(--neon-gold); letter-spacing: 2px; margin-bottom: 24px; }
      .item {
        display: flex; gap: 14px; align-items: flex-start;
        background: var(--bg-panel);
        border: 1px solid var(--border);
        border-left: 3px solid var(--neon-purple);
        border-radius: 4px;
        padding: 14px;
        margin-bottom: 12px;
      }
      .item-icon { font-size: 24px; line-height: 1; }
      .item-title { font-size: 14px; font-weight: bold; margin-bottom: 4px; }
      .item-desc { font-size: 12px; color: var(--text-dim); line-height: 1.5; }
      .cta {
        width: 100%;
        margin-top: 8px;
        padding: 12px;
        background: linear-gradient(135deg, var(--neon-purple), #5c1da4);
        border: none;
        color: white;
        font-family: inherit;
        font-size: 13px;
        letter-spacing: 1px;
        border-radius: 4px;
        cursor: pointer;
        box-shadow: 0 0 10px rgba(157,78,221,0.4);
      }
      .cta:hover { box-shadow: 0 0 16px rgba(157,78,221,0.6); }
    </style></head>
    <body>
      <div class="container">
        <h1>WHAT'S NEW IN ${WHATS_NEW_VERSION}</h1>
        <div class="tagline">CODE IS A MARTIAL ART</div>
        ${itemsHtml}
        <button class="cta" onclick="openPanel()">OPEN DEVELOPER PANEL</button>
      </div>
      <script>
        const vscode = acquireVsCodeApi();
        function openPanel() { vscode.postMessage({ command: 'open-panel' }); }
      </script>
    </body></html>`;
    }
}
const TEAM_DIR_NAME = '.devgotchi/team';
/** Turns an email into a filesystem-safe slug for a per-person snapshot file. */
function slugifyEmail(email) {
    const slug = email.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return slug || 'anonymous';
}
const defaultExecGit = (gitPath, args, options) => cp.execFileSync(gitPath, args, options);
/**
 * Runs `git <args>` in `cwd` and returns trimmed stdout, or undefined if git
 * isn't available or the command fails for any reason (not a repo yet, no
 * commits yet, git missing, permissions, etc.). Team Mode always fails
 * "closed" rather than throwing — it's an optional layer on top of a game,
 * not something that should ever be able to break the extension.
 */
function tryRunGit(gitPath, args, cwd, execFn = defaultExecGit) {
    try {
        const result = execFn(gitPath, args, { cwd, encoding: 'utf8', timeout: 5000 });
        return result.toString().trim();
    }
    catch {
        return undefined;
    }
}
/**
 * Counts distinct commit-author emails in the repo (capped at the most
 * recent 500 commits for performance on large histories). Used to decide
 * whether Team Mode's UI is worth showing at all — a "team" of one is just
 * clutter, the same reasoning that ruled out a global leaderboard.
 */
function countDistinctContributors(gitPath, cwd, execFn) {
    const output = tryRunGit(gitPath, ['log', '--format=%ae', '-n', '500'], cwd, execFn);
    if (!output)
        return 0;
    const emails = new Set(output.split('\n').map(e => e.trim().toLowerCase()).filter(Boolean));
    return emails.size;
}
/** Reads the local git identity (user.name / user.email) configured for this repo. */
function getGitIdentity(gitPath, cwd, execFn) {
    const name = tryRunGit(gitPath, ['config', 'user.name'], cwd, execFn);
    const email = tryRunGit(gitPath, ['config', 'user.email'], cwd, execFn);
    if (!name || !email)
        return undefined;
    return { name, email };
}
/**
 * Manages Team Mode's on-disk state: enabling/disabling per workspace,
 * writing the current user's own snapshot file, and reading everyone's
 * snapshots back in for the Team view. Every git shell-out is injectable
 * (via `execFn`) purely so tests can simulate multiple teammates without a
 * real git repo.
 */
class TeamManager {
    constructor(context, repoRoot, gitPath, execFn) {
        this.context = context;
        this.repoRoot = repoRoot;
        this.gitPath = gitPath;
        this.execFn = execFn;
    }
    get teamDir() {
        return path.join(this.repoRoot, TEAM_DIR_NAME);
    }
    isEnabled() {
        return !!this.context.workspaceState.get('teamModeEnabled');
    }
    /**
     * Whether Team Mode is worth surfacing in the UI at all: needs more than
     * one distinct commit author in this repo. Cached for the manager's
     * lifetime since it only changes as new people join the project.
     */
    isAvailable() {
        if (this.contributorCountCache === undefined) {
            this.contributorCountCache = countDistinctContributors(this.gitPath, this.repoRoot, this.execFn);
        }
        return this.contributorCountCache > 1;
    }
    async setEnabled(enabled) {
        if (enabled && !this.isAvailable()) {
            return { success: false, message: "Team Mode needs a shared git repo with more than one contributor." };
        }
        await this.context.workspaceState.update('teamModeEnabled', enabled);
        if (enabled) {
            await this.ensureTeamDir();
        }
        return {
            success: true,
            message: enabled
                ? '👥 Team Mode on — your progress will be written to .devgotchi/team/ and shared the next time you commit and push.'
                : '👥 Team Mode off.'
        };
    }
    async ensureTeamDir() {
        const dirUri = vscode.Uri.file(this.teamDir);
        try {
            await vscode.workspace.fs.createDirectory(dirUri);
        }
        catch {
            // Already exists, or can't be created — writeSnapshot() below will
            // surface a real problem if there genuinely is one.
        }
        const readmeUri = vscode.Uri.file(path.join(this.teamDir, 'README.md'));
        try {
            await vscode.workspace.fs.stat(readmeUri);
        }
        catch {
            const readme = [
                '# DevGotchi Team Mode',
                '',
                'This folder is created by the [DevGotchi](https://marketplace.visualstudio.com/items?itemName=johnfacey.vscode-devgotchi) VS Code extension.',
                '',
                "Each teammate who enables Team Mode gets one small JSON file here with their level, streak, and a few lifetime stats. There's no server involved — files are written locally and shared the normal way, through your team's existing git commits and pushes.",
                '',
                'Turn this off anytime from the DevGotchi Settings panel. Safe to delete this whole folder if nobody on the team uses it.'
            ].join('\n');
            await vscode.workspace.fs.writeFile(readmeUri, Buffer.from(readme, 'utf8'));
        }
    }
    /**
     * Writes (or updates) the current user's own snapshot file. Never touches
     * any other teammate's file, so there's nothing to merge-conflict over —
     * each person exclusively owns their own file.
     */
    async writeSnapshot(dev) {
        if (!this.isEnabled())
            return;
        const identity = getGitIdentity(this.gitPath, this.repoRoot, this.execFn);
        if (!identity)
            return;
        await this.ensureTeamDir();
        const snapshot = {
            name: dev.name || identity.name,
            email: identity.email,
            level: dev.level,
            totalXpEarned: dev.totalXpEarned || 0,
            streak: dev.streak || 0,
            totalCommits: dev.totalCommits || 0,
            totalBugsFixed: dev.totalBugsFixed || 0,
            totalFocusSprintsCompleted: dev.totalFocusSprintsCompleted || 0,
            lastActive: Date.now(),
            activeErrorCount: dev.activeErrorCount || 0
        };
        const fileUri = vscode.Uri.file(path.join(this.teamDir, `${slugifyEmail(identity.email)}.json`));
        await vscode.workspace.fs.writeFile(fileUri, Buffer.from(JSON.stringify(snapshot, null, 2), 'utf8'));
    }
    /**
     * Reads every snapshot file in the team folder (including your own) and
     * returns them sorted by lifetime XP, then level, highest first. Corrupt
     * or unrecognized files are skipped rather than failing the whole view —
     * a stray hand-edited file shouldn't break the Team view for everyone.
     */
    /** The current user's own git email, for the webview to mark "(you)" precisely instead of guessing by name/level. */
    getOwnEmail() {
        return getGitIdentity(this.gitPath, this.repoRoot, this.execFn)?.email;
    }
    async readTeamSnapshots() {
        const dirUri = vscode.Uri.file(this.teamDir);
        let entries;
        try {
            entries = await vscode.workspace.fs.readDirectory(dirUri);
        }
        catch {
            return [];
        }
        const snapshots = [];
        for (const [name] of entries) {
            if (!name.endsWith('.json'))
                continue;
            try {
                const bytes = await vscode.workspace.fs.readFile(vscode.Uri.file(path.join(this.teamDir, name)));
                const parsed = JSON.parse(Buffer.from(bytes).toString('utf8'));
                if (parsed && typeof parsed.email === 'string' && typeof parsed.level === 'number') {
                    snapshots.push(parsed);
                }
            }
            catch {
                // Skip unreadable/corrupt files rather than failing the whole view.
            }
        }
        snapshots.sort((a, b) => (b.totalXpEarned - a.totalXpEarned) || (b.level - a.level));
        return snapshots;
    }
    /**
     * The "Team Raid Boss" is just the sum of every teammate's active error
     * count, as of their last-synced snapshot — a shared HP bar the whole
     * team drains together, entirely derived from data that's already synced
     * via git (no new sync mechanism needed). Tracks a peak HP (for the bar's
     * fill %) and whether the boss was "up" last check, both in workspace
     * state, so it can detect the moment the team collectively clears it —
     * i.e. reward the transition, not just "HP happens to be 0 right now"
     * (which would re-fire the reward on every single panel refresh).
     */
    async checkRaidBoss(snapshots) {
        const totalHp = snapshots.reduce((sum, s) => sum + (s.activeErrorCount || 0), 0);
        let peak = this.context.workspaceState.get('teamRaidBossPeakHp', 0);
        const wasUp = !!this.context.workspaceState.get('teamRaidBossUp');
        let justCleared = false;
        if (totalHp > peak) {
            peak = totalHp;
            await this.context.workspaceState.update('teamRaidBossPeakHp', peak);
        }
        if (totalHp > 0) {
            await this.context.workspaceState.update('teamRaidBossUp', true);
        }
        else if (wasUp && snapshots.length > 1) {
            // Only counts as a real "clear" if there's actually more than one
            // teammate contributing — a solo snapshot hitting 0 errors is just
            // normal Bug Boss behavior, not a team achievement.
            justCleared = true;
            peak = 0;
            await this.context.workspaceState.update('teamRaidBossUp', false);
            await this.context.workspaceState.update('teamRaidBossPeakHp', 0);
        }
        return { totalHp, peakHp: peak, justCleared };
    }
}
/**
 * Helper to get the emoji corresponding to a specific mood.
 */
function getMoodEmoji(mood) {
    const emojis = {
        productive: '🚀',
        neutral: '💻',
        stressed: '😰',
        tired: '😴',
        'burnt-out': '🔥',
        caffeinated: '☕',
        sleeping: '💤'
    };
    return emojis[mood] || '👨‍💻';
}
/**
 * Formats a millisecond duration as MM:SS for the Focus Sprint countdown.
 */
function formatMMSS(ms) {
    const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}
/**
 * Fills in any missing fields on a (possibly partial, possibly from an old
 * save or an imported file) developer object with sensible defaults. This is
 * the single source of truth for "what does a valid ProgrammerStats look
 * like" — used when loading from globalState, migrating an old save, and
 * importing a file exported via `devgotchi.exportProgress`.
 */
function normalizeDeveloper(saved) {
    const totalXpEarned = typeof saved.totalXpEarned === 'number' ? saved.totalXpEarned : 0;
    const totalCommits = typeof saved.totalCommits === 'number' ? saved.totalCommits : 0;
    const totalBugsFixed = typeof saved.totalBugsFixed === 'number' ? saved.totalBugsFixed : 0;
    const totalCoffeeEarned = typeof saved.totalCoffeeEarned === 'number' ? saved.totalCoffeeEarned : 0;
    const totalFocusSprintsCompleted = typeof saved.totalFocusSprintsCompleted === 'number' ? saved.totalFocusSprintsCompleted : 0;
    const level = typeof saved.level === 'number' ? saved.level : 1;
    return {
        energy: typeof saved.energy === 'number' ? saved.energy : 100,
        motivation: typeof saved.motivation === 'number' ? saved.motivation : 100,
        focus: typeof saved.focus === 'number' ? saved.focus : 100,
        health: typeof saved.health === 'number' ? saved.health : 100,
        xp: typeof saved.xp === 'number' ? saved.xp : 0,
        level,
        lastUpdated: typeof saved.lastUpdated === 'number' ? saved.lastUpdated : Date.now(),
        mood: saved.mood || 'productive',
        role: saved.role || '👨‍💻',
        name: typeof saved.name === 'string' && saved.name.trim() ? saved.name : 'Dev',
        coffee: typeof saved.coffee === 'number' ? saved.coffee : 50,
        skills: saved.skills || [],
        inventory: saved.inventory || [],
        lastDailyBonus: saved.lastDailyBonus || 0,
        streak: saved.streak || 0,
        quests: saved.quests || [],
        questStreak: saved.questStreak === undefined ? 0 : saved.questStreak,
        dailyQuestsCompleted: saved.dailyQuestsCompleted === undefined ? false : saved.dailyQuestsCompleted,
        tutorialCompleted: saved.tutorialCompleted === undefined ? false : saved.tutorialCompleted,
        achievements: saved.achievements || [],
        activityLog: saved.activityLog || [],
        isBurntOut: saved.isBurntOut === undefined ? false : saved.isBurntOut,
        totalBugsFixed,
        totalCommits,
        totalCoffeeEarned,
        focusSprintEndsAt: saved.focusSprintEndsAt === undefined ? 0 : saved.focusSprintEndsAt,
        focusSprintMinutes: saved.focusSprintMinutes === undefined ? 0 : saved.focusSprintMinutes,
        totalFocusSprintsCompleted,
        activeErrorCount: saved.activeErrorCount === undefined ? 0 : saved.activeErrorCount,
        mergeConflictCount: saved.mergeConflictCount === undefined ? 0 : saved.mergeConflictCount,
        longFileCount: saved.longFileCount === undefined ? 0 : saved.longFileCount,
        prestigeCount: saved.prestigeCount === undefined ? 0 : saved.prestigeCount,
        lastSponsorClickAt: saved.lastSponsorClickAt === undefined ? 0 : saved.lastSponsorClickAt,
        lastYearlyRecapAt: saved.lastYearlyRecapAt === undefined ? Date.now() : saved.lastYearlyRecapAt,
        lastYearlyRecap: saved.lastYearlyRecap && typeof saved.lastYearlyRecap === 'object' ? saved.lastYearlyRecap : undefined,
        longestStreak: saved.longestStreak === undefined ? (saved.streak || 0) : saved.longestStreak,
        totalBossesDefeated: saved.totalBossesDefeated === undefined ? 0 : saved.totalBossesDefeated,
        hourlyActivity: Array.isArray(saved.hourlyActivity) && saved.hourlyActivity.length === 24 ? saved.hourlyActivity : new Array(24).fill(0),
        legacyDungeonChapter: saved.legacyDungeonChapter === undefined ? 1 : saved.legacyDungeonChapter,
        legacyDungeonProgress: saved.legacyDungeonProgress === undefined ? 0 : saved.legacyDungeonProgress,
        legacyDungeonChapterCompletedAt: saved.legacyDungeonChapterCompletedAt === undefined ? 0 : saved.legacyDungeonChapterCompletedAt,
        legacyDungeonCompleted: saved.legacyDungeonCompleted === undefined ? false : saved.legacyDungeonCompleted,
        packQuests: Array.isArray(saved.packQuests) ? saved.packQuests : [],
        importedQuestPackIds: Array.isArray(saved.importedQuestPackIds) ? saved.importedQuestPackIds : [],
        dailyMinutesCoded: saved.dailyMinutesCoded && typeof saved.dailyMinutesCoded === 'object' ? saved.dailyMinutesCoded : {},
        totalXpEarned,
        lastWeeklyRecapAt: saved.lastWeeklyRecapAt === undefined ? Date.now() : saved.lastWeeklyRecapAt,
        vacationMode: saved.vacationMode === undefined ? false : saved.vacationMode,
        vacationModeSince: saved.vacationModeSince === undefined ? 0 : saved.vacationModeSince,
        activityDates: saved.activityDates && typeof saved.activityDates === 'object' ? saved.activityDates : {},
        characterClass: typeof saved.characterClass === 'string' && CLASSES.some(c => c.id === saved.characterClass) ? saved.characterClass : null,
        lastWeeklyRecap: saved.lastWeeklyRecap && typeof saved.lastWeeklyRecap === 'object' ? saved.lastWeeklyRecap : undefined,
        seasonalProgress: saved.seasonalProgress && typeof saved.seasonalProgress === 'object' ? saved.seasonalProgress : {},
        weeklyRecapSnapshot: saved.weeklyRecapSnapshot || {
            level,
            totalXpEarned,
            totalCommits,
            totalBugsFixed,
            totalCoffeeEarned,
            totalFocusSprintsCompleted
        }
    };
}
/**
 * Manages the state and logic of the developer avatar.
 * Handles persistence, stat calculations, and game mechanics.
 */
class DeveloperManager {
    constructor(context) {
        this.lastErrorCount = 0;
        this.lastConflictCount = 0;
        this.lastLongFileCount = 0;
        this.lastErrorIncreaseAt = 0; // Timestamp a lint/build error last appeared — drives the secret "Quick Draw" achievement
        this.lastActivityAt = Date.now(); // Last real editor activity — drives idle detection (see recordActivity/isIdle)
        this.context = context;
        this.developer = this.loadDeveloper();
        this.settings = this.loadSettings();
        this.updateStats();
    }
    /**
     * Loads developer state from global storage or creates a default one.
     */
    loadDeveloper() {
        const saved = this.context.globalState.get('developer');
        return normalizeDeveloper(saved || {});
    }
    /**
     * Loads user settings (notifications, decay rate, etc.) from global storage,
     * falling back to defaults for anything missing or invalid.
     */
    loadSettings() {
        return mergeSettings(this.context.globalState.get('settings'));
    }
    /**
     * Persists the current settings to global storage.
     */
    saveSettings() {
        this.context.globalState.update('settings', this.settings);
    }
    getSettings() {
        return { ...this.settings };
    }
    /**
     * Updates one or more settings, validating each field, and persists them.
     */
    updateSettings(partial) {
        this.settings = mergeSettings({ ...this.settings, ...partial });
        this.saveSettings();
        return { success: true, message: '⚙️ Settings saved.' };
    }
    /**
     * Serializes the full save (progress + settings) to a JSON string, for the
     * "Export Progress" command. Kept as plain JSON so it's human-readable and
     * portable between machines.
     */
    exportProgressData() {
        const payload = {
            schemaVersion: 1,
            exportedAt: Date.now(),
            developer: this.developer,
            settings: this.settings
        };
        return JSON.stringify(payload, null, 2);
    }
    /**
     * Restores progress (and settings, if present) from a previously exported
     * JSON file. Validates the shape before committing to overwrite the
     * current save — an invalid or unrelated JSON file is rejected rather than
     * silently wiping progress.
     */
    importProgressData(raw) {
        let parsed;
        try {
            parsed = JSON.parse(raw);
        }
        catch {
            return { success: false, message: 'That file is not valid JSON.' };
        }
        const candidate = parsed && typeof parsed === 'object' && parsed.developer ? parsed.developer : parsed;
        const looksValid = candidate && typeof candidate === 'object'
            && typeof candidate.name === 'string'
            && typeof candidate.level === 'number'
            && typeof candidate.xp === 'number'
            && typeof candidate.energy === 'number'
            && typeof candidate.motivation === 'number'
            && typeof candidate.focus === 'number'
            && typeof candidate.health === 'number';
        if (!looksValid) {
            return { success: false, message: "That file doesn't look like a DevGotchi progress export." };
        }
        this.developer = normalizeDeveloper(candidate);
        if (parsed && typeof parsed === 'object' && parsed.settings && typeof parsed.settings === 'object') {
            this.settings = mergeSettings(parsed.settings);
            this.saveSettings();
        }
        this.saveDeveloper();
        return { success: true, message: `Progress imported — welcome back, ${this.developer.name}!` };
    }
    /**
     * Persists the current state to global storage.
     */
    saveDeveloper() {
        this.context.globalState.update('developer', this.developer);
    }
    getDeveloper() {
        return { ...this.developer };
    }
    /**
     * Appends a message to the activity log (max 50 entries).
     */
    addLog(message, type) {
        this.developer.activityLog.unshift({ message, timestamp: Date.now(), type });
        if (this.developer.activityLog.length > 50)
            this.developer.activityLog.length = 50;
    }
    /**
     * Checks all achievements and unlocks any newly earned ones.
     */
    /**
     * Unlocks a single achievement by id, if not already earned. Shared by
     * checkAchievements() below and by triggers that unlock a specific
     * achievement directly outside the general sweep (e.g. a secret
     * achievement tied to a narrow timing window).
     */
    unlockAchievement(id) {
        if (this.developer.achievements.includes(id))
            return;
        this.developer.achievements.push(id);
        const ach = ACHIEVEMENTS.find(a => a.id === id);
        this.addLog(`Achievement unlocked: ${ach.icon} ${ach.name}`, 'achievement');
        if (!this.settings.reduceNotifications) {
            vscode.window.showInformationMessage(`${this.classTag()}🏅 Achievement Unlocked: ${ach.icon} ${ach.name} — ${ach.description}`);
        }
    }
    checkAchievements() {
        const unlock = (id) => this.unlockAchievement(id);
        if (this.developer.totalBugsFixed >= 1)
            unlock('first_save'); // reuse as first activity
        if (this.developer.totalCommits >= 1)
            unlock('first_commit');
        if (this.developer.level >= 5)
            unlock('level_5');
        if (this.developer.level >= 10)
            unlock('level_10');
        if (this.developer.level >= 25)
            unlock('level_25');
        if ((this.developer.streak || 0) >= 7)
            unlock('streak_7');
        if ((this.developer.streak || 0) >= 30)
            unlock('streak_30');
        if (this.developer.totalBugsFixed >= 50)
            unlock('bugs_50');
        if (this.developer.totalCommits >= 20)
            unlock('commits_20');
        if (this.developer.totalCoffeeEarned >= 500)
            unlock('coffee_500');
        if ((this.developer.questStreak || 0) >= 5)
            unlock('quest_streak_5');
        if ((this.developer.totalFocusSprintsCompleted || 0) >= 10)
            unlock('focus_sprints_10');
        if (new Date().getHours() === 3)
            unlock('night_owl'); // secret: coding between 3am-4am local time
        this.maybeShowReviewPrompt();
    }
    /**
     * Shows a one-time (periodically-reminded) prompt asking engaged users to
     * rate DevGotchi on the Marketplace. Only fires once the user has some real
     * investment in the extension (3+ achievements or level 5+), and respects
     * "Remind Me Later" / "Don't Ask Again" so it never turns into nagging.
     */
    maybeShowReviewPrompt() {
        const state = this.context.globalState.get('reviewPromptState', {});
        if (state.dismissedForever)
            return;
        if (state.remindAfter && Date.now() < state.remindAfter)
            return;
        const isEngaged = this.developer.achievements.length >= 3 || this.developer.level >= 5;
        if (!isEngaged)
            return;
        const RATE = '⭐ Rate DevGotchi';
        const LATER = 'Remind Me Later';
        const NEVER = "Don't Ask Again";
        vscode.window
            .showInformationMessage(`Enjoying DevGotchi, ${this.developer.name}? A quick rating helps other devs discover it. 🙏`, RATE, LATER, NEVER)
            .then((choice) => {
            if (choice === RATE) {
                vscode.env.openExternal(vscode.Uri.parse('https://marketplace.visualstudio.com/items?itemName=johnfacey.vscode-devgotchi&ssr=false#review-details'));
                this.context.globalState.update('reviewPromptState', { dismissedForever: true });
            }
            else if (choice === NEVER) {
                this.context.globalState.update('reviewPromptState', { dismissedForever: true });
            }
            else if (choice === LATER) {
                // Ask again in 2 weeks.
                this.context.globalState.update('reviewPromptState', { remindAfter: Date.now() + 1000 * 60 * 60 * 24 * 14 });
            }
            else {
                // Dismissed via Escape/click-away — don't nag again tomorrow, but don't give up either.
                this.context.globalState.update('reviewPromptState', { remindAfter: Date.now() + 1000 * 60 * 60 * 24 * 3 });
            }
        });
    }
    /**
     * Checks for burnout entry/recovery and triggers events accordingly.
     */
    checkBurnout() {
        const wasBurntOut = this.developer.isBurntOut;
        if (this.developer.health <= 0 && !wasBurntOut) {
            this.developer.isBurntOut = true;
            this.addLog('⚠️ Entered full burnout — take a break!', 'burnout');
            vscode.window.showWarningMessage(`💀 ${this.developer.name} has burned out! Take a break to recover.`);
        }
        else if (this.developer.health > 30 && wasBurntOut) {
            this.developer.isBurntOut = false;
            this.developer.achievements.push('survived_burnout');
            const ach = ACHIEVEMENTS.find(a => a.id === 'survived_burnout');
            this.addLog('✅ Recovered from burnout!', 'burnout');
            if (!this.settings.reduceNotifications) {
                vscode.window.showInformationMessage(`${this.classTag()}🏅 Achievement Unlocked: ${ach.icon} ${ach.name} — ${ach.description}`);
            }
        }
    }
    /**
     * Random event pool — called occasionally from the passive loop.
     */
    maybeRandomEvent() {
        if (Math.random() > 0.12)
            return; // ~12% chance each tick
        const events = [
            { msg: 'Found a forgotten coffee stash!', effect: () => { this.developer.coffee += 20; this.developer.totalCoffeeEarned += 20; }, type: 'coffee' },
            { msg: 'Stack Overflow saved the day! +Focus', effect: () => { this.developer.focus = Math.min(100, this.developer.focus + 15); }, type: 'event' },
            { msg: 'Rubber duck debugging breakthrough! +Motivation', effect: () => { this.developer.motivation = Math.min(100, this.developer.motivation + 20); }, type: 'event' },
            { msg: 'Surprise code review — stress hits! -Focus', effect: () => { this.developer.focus = Math.max(0, this.developer.focus - 10); }, type: 'event' },
            { msg: 'Energy drink kicks in! +Energy', effect: () => { this.developer.energy = Math.min(100, this.developer.energy + 25); }, type: 'event' },
            { msg: 'Production incident! -Energy -Motivation', effect: () => { this.developer.energy = Math.max(0, this.developer.energy - 15); this.developer.motivation = Math.max(0, this.developer.motivation - 10); }, type: 'event' },
            { msg: 'Open-source PR merged! +XP +Motivation', effect: () => { this.addXP(40); this.developer.motivation = Math.min(100, this.developer.motivation + 15); }, type: 'xp' },
            { msg: 'Mysterious bug vanished on its own. +Sanity', effect: () => { this.addXP(20); this.developer.focus = Math.min(100, this.developer.focus + 10); }, type: 'xp' },
            { msg: 'Fellow dev brought donuts! +Energy', effect: () => { this.developer.energy = Math.min(100, this.developer.energy + 20); this.developer.coffee += 10; this.developer.totalCoffeeEarned += 10; }, type: 'coffee' },
            { msg: 'Git blame points at you. -Motivation', effect: () => { this.developer.motivation = Math.max(0, this.developer.motivation - 12); }, type: 'event' },
        ];
        const ev = events[Math.floor(Math.random() * events.length)];
        ev.effect();
        this.addLog(`⚡ Random event: ${ev.msg}`, ev.type);
        vscode.window.showInformationMessage(`⚡ ${ev.msg}`);
    }
    /**
     * Calculates stat decay based on time passed since last update.
     * Updates health and mood derived from primary stats.
     */
    updateStats() {
        const now = Date.now();
        // Vacation Mode: freeze everything. No decay, no burnout, no random
        // events, no quest/achievement checks — and critically, we advance
        // lastDailyBonus/lastUpdated by the same elapsed time so that once
        // Vacation Mode is turned off, the gap you were away for doesn't read as
        // "missed a day" (which would reset your streak) or "N hours of banked
        // decay" (which would tank your stats the moment you come back).
        if (this.developer.vacationMode) {
            const elapsed = now - this.developer.lastUpdated;
            this.developer.lastUpdated = now;
            // Only shift lastDailyBonus forward if a bonus has actually fired
            // before (it's 0 as a sentinel for "never happened yet") — otherwise
            // 0 + elapsed produces a bogus near-epoch timestamp that reads as an
            // enormous gap and wrongly resets the (nonexistent) streak to 1.
            if (this.developer.lastDailyBonus) {
                this.developer.lastDailyBonus += elapsed;
            }
            this.developer.lastWeeklyRecapAt = (this.developer.lastWeeklyRecapAt || now) + elapsed;
            this.developer.mood = this.calculateMood();
            this.saveDeveloper();
            return;
        }
        // Idle detection: no real editor activity for IDLE_THRESHOLD_MS reads as
        // "stepped away" (lunch, a meeting) rather than "still coding." Unlike
        // Vacation Mode above, this doesn't touch lastDailyBonus/lastWeeklyRecapAt
        // — a short AFK gap shouldn't affect streak/recap timing, only decay —
        // so it just bridges lastUpdated forward to skip this tick's decay and
        // puts the avatar visibly to sleep. Resumes normally the moment activity
        // is recorded again.
        if (this.isIdle()) {
            this.developer.lastUpdated = now;
            this.developer.mood = 'sleeping';
            this.saveDeveloper();
            return;
        }
        const hoursPassed = (now - this.developer.lastUpdated) / (1000 * 60 * 60);
        const decayMultiplier = DECAY_RATE_MULTIPLIERS[this.settings.decayRate];
        const affix = getActiveBossAffix();
        const affixDecayMultiplier = affix.decayMultiplier ?? 1;
        let energyDecay = 4 * decayMultiplier * affixDecayMultiplier;
        if (this.developer.inventory.includes('furn_chair'))
            energyDecay *= 0.85;
        if (this.developer.characterClass === 'devops_paladin')
            energyDecay *= 0.85; // Built for uptime
        let motivationDecay = 2 * decayMultiplier * affixDecayMultiplier;
        if (this.developer.inventory.includes('acc_keyboard'))
            motivationDecay *= 0.85;
        if (this.developer.characterClass === 'devops_paladin')
            motivationDecay *= 0.85; // Built for uptime
        this.developer.energy = Math.max(0, this.developer.energy - hoursPassed * energyDecay);
        this.developer.motivation = Math.max(0, this.developer.motivation - hoursPassed * motivationDecay);
        let focusDecay = (this.developer.skills.includes('iron_focus') ? 2.1 : 3) * decayMultiplier * affixDecayMultiplier; // 30% slower
        if (this.isFocusSprintActive())
            focusDecay *= 0.5; // Deep work protects your Focus stat
        this.developer.focus = Math.max(0, this.developer.focus - hoursPassed * focusDecay);
        // Linter Stress: Active errors drain energy and motivation over time
        if (this.lastErrorCount > 0) {
            const stressFactor = this.lastErrorCount * 0.05 * decayMultiplier * (affix.bugStressMultiplier ?? 1);
            this.developer.energy = Math.max(0, this.developer.energy - stressFactor);
            this.developer.motivation = Math.max(0, this.developer.motivation - stressFactor);
        }
        // Track active coding time for quests (ignore offline time > 5 mins)
        if (hoursPassed < 0.083) {
            this.updateQuestProgress('time', hoursPassed * 60);
            this.recordTimesheetMinutes(hoursPassed * 60);
        }
        this.checkDailyBonus();
        this.developer.health = (this.developer.energy + this.developer.motivation + this.developer.focus) / 3;
        this.developer.mood = this.calculateMood();
        this.developer.lastUpdated = now;
        this.checkBurnout();
        this.maybeRandomEvent();
        this.checkFocusSprintCompletion();
        this.checkAchievements();
        this.checkWeeklyRecap();
        this.checkYearlyRecap();
        // 'panel_open' events (e.g. April Fools') just need DevGotchi to be
        // running that day — this ticks every ~30s while active, but
        // progressSeasonalEvent no-ops once the (target 1) quest is completed.
        this.progressSeasonalEvent('panel_open', 1);
        this.saveDeveloper();
    }
    /**
     * Once every ~7 days, surfaces a friendly recap of what changed since the
     * last one (XP, commits, bugs fixed, sprints, level). Snapshots are stored
     * so the numbers always reflect genuinely new activity, not lifetime totals.
     */
    checkWeeklyRecap() {
        const last = this.developer.lastWeeklyRecapAt || 0;
        if (Date.now() - last < WEEKLY_RECAP_INTERVAL_MS)
            return;
        const prev = this.developer.weeklyRecapSnapshot || {
            level: 1, totalXpEarned: 0, totalCommits: 0, totalBugsFixed: 0, totalCoffeeEarned: 0, totalFocusSprintsCompleted: 0
        };
        const xpGained = Math.max(0, (this.developer.totalXpEarned || 0) - prev.totalXpEarned);
        const commitsGained = Math.max(0, (this.developer.totalCommits || 0) - prev.totalCommits);
        const bugsGained = Math.max(0, (this.developer.totalBugsFixed || 0) - prev.totalBugsFixed);
        const sprintsGained = Math.max(0, (this.developer.totalFocusSprintsCompleted || 0) - prev.totalFocusSprintsCompleted);
        const levelsGained = this.developer.level - prev.level;
        const hadActivity = xpGained > 0 || commitsGained > 0 || bugsGained > 0 || sprintsGained > 0;
        // Persisted regardless of activity, so the Weekly Recap share card
        // always has something to show for "come back and share your week."
        this.developer.lastWeeklyRecap = {
            generatedAt: Date.now(),
            prevLevel: prev.level,
            newLevel: this.developer.level,
            xpGained,
            commitsGained,
            bugsGained,
            sprintsGained,
            streak: this.developer.streak || 0
        };
        if (hadActivity) {
            const parts = [];
            if (levelsGained > 0)
                parts.push(`Level ${prev.level} → ${this.developer.level}`);
            parts.push(`+${xpGained} XP`);
            if (commitsGained > 0)
                parts.push(`${commitsGained} commit${commitsGained === 1 ? '' : 's'}`);
            if (bugsGained > 0)
                parts.push(`${bugsGained} bug${bugsGained === 1 ? '' : 's'} fixed`);
            if (sprintsGained > 0)
                parts.push(`${sprintsGained} focus sprint${sprintsGained === 1 ? '' : 's'}`);
            parts.push(`🔥 ${this.developer.streak || 0}-day streak`);
            const summary = parts.join(' · ');
            this.addLog(`📊 Weekly recap: ${summary}`, 'event');
            if (this.settings.weeklyRecapEnabled) {
                vscode.window.showInformationMessage(`${this.classTag()}📊 Your week with ${this.developer.name}: ${summary}`, 'Share Recap').then(choice => {
                    if (choice === 'Share Recap') {
                        vscode.commands.executeCommand('devgotchi.openWeeklyRecap');
                    }
                });
            }
        }
        // Reset the snapshot regardless of activity, so next week measures a fresh delta.
        this.developer.lastWeeklyRecapAt = Date.now();
        this.developer.weeklyRecapSnapshot = {
            level: this.developer.level,
            totalXpEarned: this.developer.totalXpEarned || 0,
            totalCommits: this.developer.totalCommits || 0,
            totalBugsFixed: this.developer.totalBugsFixed || 0,
            totalCoffeeEarned: this.developer.totalCoffeeEarned || 0,
            totalFocusSprintsCompleted: this.developer.totalFocusSprintsCompleted || 0
        };
    }
    /**
     * Once every ~365 days, surfaces "Year in Code Wrapped" — a Spotify-
     * Wrapped-style summary. Unlike the weekly recap, this is lifetime-to-date
     * totals rather than a delta (see YearlyRecapResult), so there's no
     * snapshot to reset — just recompute and store the latest totals.
     */
    checkYearlyRecap() {
        const last = this.developer.lastYearlyRecapAt || 0;
        if (Date.now() - last < YEARLY_RECAP_INTERVAL_MS)
            return;
        const hourly = this.developer.hourlyActivity || [];
        let mostProductiveHour = 0;
        let mostProductiveCount = -1;
        for (let h = 0; h < hourly.length; h++) {
            if (hourly[h] > mostProductiveCount) {
                mostProductiveCount = hourly[h];
                mostProductiveHour = h;
            }
        }
        const hadActivity = (this.developer.totalXpEarned || 0) > 0;
        this.developer.lastYearlyRecap = {
            generatedAt: Date.now(),
            level: this.developer.level,
            totalXpEarned: this.developer.totalXpEarned || 0,
            totalCommits: this.developer.totalCommits || 0,
            totalBugsFixed: this.developer.totalBugsFixed || 0,
            totalFocusSprintsCompleted: this.developer.totalFocusSprintsCompleted || 0,
            totalBossesDefeated: this.developer.totalBossesDefeated || 0,
            longestStreak: this.developer.longestStreak || 0,
            mostProductiveHour,
            achievementsUnlocked: this.developer.achievements.length
        };
        if (hadActivity && this.settings.weeklyRecapEnabled) {
            vscode.window.showInformationMessage(`${this.classTag()}🎁 Your Year in Code Wrapped is ready — Level ${this.developer.level}, ${this.developer.totalXpEarned} XP, ${this.developer.totalBossesDefeated || 0} bosses defeated.`, 'View Wrapped').then(choice => {
                if (choice === 'View Wrapped') {
                    vscode.commands.executeCommand('devgotchi.openYearlyRecap');
                }
            });
        }
        this.developer.lastYearlyRecapAt = Date.now();
    }
    /**
     * Whether a Focus Sprint is currently running.
     */
    isFocusSprintActive() {
        return !!this.developer.focusSprintEndsAt && this.developer.focusSprintEndsAt > Date.now();
    }
    /**
     * Whether Vacation Mode is currently active.
     */
    isVacationModeActive() {
        return !!this.developer.vacationMode;
    }
    /**
     * Marks real editor activity "now" — called from the workspace/window
     * event listeners wired up in activate(). See IDLE_THRESHOLD_MS.
     */
    recordActivity() {
        this.lastActivityAt = Date.now();
    }
    /** Whether no real editor activity has been seen for IDLE_THRESHOLD_MS. */
    isIdle() {
        return Date.now() - this.lastActivityAt >= IDLE_THRESHOLD_MS;
    }
    /**
     * Toggles Vacation Mode on/off. While on, updateStats() freezes stat decay,
     * burnout, and streak-breaking entirely — see the early-return in
     * updateStats() for how the streak/decay gap is bridged on return.
     */
    setVacationMode(enabled) {
        if (enabled === this.isVacationModeActive()) {
            return {
                success: false,
                message: enabled ? 'Vacation Mode is already on.' : 'Vacation Mode is already off.'
            };
        }
        this.developer.vacationMode = enabled;
        this.developer.vacationModeSince = enabled ? Date.now() : 0;
        this.addLog(enabled ? '🌴 Vacation Mode enabled — stats and streak are frozen.' : '🌴 Vacation Mode disabled — welcome back!', 'event');
        this.saveDeveloper();
        return {
            success: true,
            message: enabled
                ? '🌴 Vacation Mode on — your stats and streak are frozen until you turn it off.'
                : '🌴 Vacation Mode off — welcome back! Decay and your streak have resumed.'
        };
    }
    /**
     * Rewards the local player when TeamManager.checkRaidBoss() detects the
     * whole team's combined error count just dropped to 0. Called once per
     * clear (TeamManager already de-dupes the "just cleared" transition), so
     * this doesn't need its own idempotency check.
     */
    teamRaidBossBonus() {
        this.addXP(TEAM_RAID_BOSS_DEFEAT_BONUS_XP);
        this.developer.coffee += TEAM_RAID_BOSS_DEFEAT_BONUS_COFFEE;
        this.developer.totalCoffeeEarned = (this.developer.totalCoffeeEarned || 0) + TEAM_RAID_BOSS_DEFEAT_BONUS_COFFEE;
        this.addLog(`🐉 Team Raid Boss defeated! +${TEAM_RAID_BOSS_DEFEAT_BONUS_XP} XP, +${TEAM_RAID_BOSS_DEFEAT_BONUS_COFFEE} ☕`, 'achievement');
        this.saveDeveloper();
        return {
            success: true,
            message: `🐉 Team Raid Boss defeated! +${TEAM_RAID_BOSS_DEFEAT_BONUS_XP} XP, +${TEAM_RAID_BOSS_DEFEAT_BONUS_COFFEE} ☕ — nice work, team.`
        };
    }
    /**
     * Starts a timed Focus Sprint. While active, XP earned is multiplied and
     * the Focus stat decays more slowly. Only one sprint can run at a time.
     */
    startFocusSprint(minutes) {
        if (this.isFocusSprintActive()) {
            return { success: false, message: 'A Focus Sprint is already in progress.' };
        }
        this.developer.focusSprintEndsAt = Date.now() + minutes * 60 * 1000;
        this.developer.focusSprintMinutes = minutes;
        this.addLog(`⏱️ Focus Sprint started (${minutes} min) — ${FOCUS_SPRINT_XP_MULTIPLIER}x XP`, 'event');
        this.saveDeveloper();
        return { success: true, message: `Focus Sprint started! ${minutes} minutes of ${FOCUS_SPRINT_XP_MULTIPLIER}x XP.` };
    }
    /**
     * Cancels an in-progress Focus Sprint early. No completion bonus is awarded —
     * that's the incentive to see it through, same as a real Pomodoro timer.
     */
    cancelFocusSprint() {
        if (!this.isFocusSprintActive()) {
            return { success: false, message: 'No Focus Sprint is currently running.' };
        }
        this.developer.focusSprintEndsAt = 0;
        this.addLog('⏱️ Focus Sprint cancelled early.', 'event');
        this.saveDeveloper();
        return { success: true, message: 'Focus Sprint cancelled.' };
    }
    /**
     * Checks whether an active sprint has just finished and, if so, awards the
     * completion bonus exactly once.
     */
    checkFocusSprintCompletion() {
        const endsAt = this.developer.focusSprintEndsAt || 0;
        if (endsAt > 0 && Date.now() >= endsAt) {
            this.developer.focusSprintEndsAt = 0;
            const coffeeBonus = Math.round(FOCUS_SPRINT_BONUS_COFFEE * (getActiveBossAffix().sprintCoffeeMultiplier ?? 1));
            this.developer.coffee += coffeeBonus;
            this.developer.totalCoffeeEarned = (this.developer.totalCoffeeEarned || 0) + coffeeBonus;
            this.developer.totalFocusSprintsCompleted = (this.developer.totalFocusSprintsCompleted || 0) + 1;
            this.addXP(FOCUS_SPRINT_BONUS_XP);
            this.addLog(`🎯 Focus Sprint complete! +${FOCUS_SPRINT_BONUS_XP} XP, +${coffeeBonus} ☕`, 'achievement');
            this.progressSeasonalEvent('focus_sprints', 1);
            vscode.window.showInformationMessage(`🎯 Focus Sprint complete! +${FOCUS_SPRINT_BONUS_XP} XP, +${coffeeBonus} ☕ — nice focus.`);
        }
    }
    /**
     * Determines the current mood based on stat thresholds.
     */
    calculateMood() {
        const hour = new Date().getHours();
        if (hour >= 22 || hour < 6)
            return 'sleeping';
        if (this.developer.health < 30)
            return 'burnt-out';
        if (this.developer.energy < 30)
            return 'tired';
        if (this.developer.focus < 30)
            return 'stressed';
        if (this.developer.coffee > 80)
            return 'caffeinated';
        if (this.developer.motivation > 70)
            return 'productive';
        return 'neutral';
    }
    /**
     * Checks and awards daily bonus if eligible.
     */
    checkDailyBonus() {
        const now = Date.now();
        const lastBonus = this.developer.lastDailyBonus || 0;
        const oneDay = 24 * 60 * 60 * 1000;
        const twoDays = 48 * 60 * 60 * 1000;
        if (now - lastBonus >= oneDay) {
            // Check for consecutive login (within 48 hours of last bonus)
            if (lastBonus > 0 && now - lastBonus < twoDays) {
                this.developer.streak = (this.developer.streak || 0) + 1;
            }
            else {
                this.developer.streak = 1;
            }
            this.developer.longestStreak = Math.max(this.developer.longestStreak || 0, this.developer.streak);
            const bonus = Math.round((20 + (this.developer.streak * 5)) * (getActiveBossAffix().dailyBonusMultiplier ?? 1));
            this.developer.coffee += bonus;
            this.developer.lastDailyBonus = now;
            this.generateDailyQuests();
            const paladinFlavor = this.developer.characterClass === 'devops_paladin' ? ' — your uptime never wavered.' : '';
            // Daily Login Calendar: a repeating 30-day cycle laid on top of the
            // streak above (see renderDailyCalendar in the webview) — day 30 of
            // every cycle pays a big one-time bonus on top of the normal one.
            const dayInCycle = ((this.developer.streak - 1) % DAILY_CALENDAR_CYCLE_LENGTH) + 1;
            let milestoneFlavor = '';
            if (dayInCycle === DAILY_CALENDAR_CYCLE_LENGTH) {
                this.addXP(DAILY_CALENDAR_MILESTONE_BONUS_XP);
                this.developer.coffee += DAILY_CALENDAR_MILESTONE_BONUS_COFFEE;
                this.developer.totalCoffeeEarned = (this.developer.totalCoffeeEarned || 0) + DAILY_CALENDAR_MILESTONE_BONUS_COFFEE;
                this.addLog(`📅 Day 30 calendar bonus! +${DAILY_CALENDAR_MILESTONE_BONUS_XP} XP, +${DAILY_CALENDAR_MILESTONE_BONUS_COFFEE} ☕`, 'achievement');
                milestoneFlavor = ` — 📅 Day 30 calendar bonus: +${DAILY_CALENDAR_MILESTONE_BONUS_XP} XP, +${DAILY_CALENDAR_MILESTONE_BONUS_COFFEE} ☕! 🎉`;
            }
            vscode.window.showInformationMessage(`${this.classTag()}🌞 Daily Login Bonus! +${bonus} ☕ (Streak: ${this.developer.streak} days)${paladinFlavor}${milestoneFlavor}`);
        }
    }
    /**
     * Generates 3 random daily quests.
     */
    generateDailyQuests() {
        // Reset quest streak if login streak was broken (streak === 1) or if yesterday's quests weren't completed
        if (this.developer.streak === 1 || !this.developer.dailyQuestsCompleted) {
            this.developer.questStreak = 0;
        }
        // Reset completion flag for the new day
        this.developer.dailyQuestsCompleted = false;
        const templates = [
            { type: 'save', desc: 'Save Master: Save 30 files', target: 30, reward: 15 },
            { type: 'save', desc: 'Typing Machine: Save 50 files', target: 50, reward: 25 },
            { type: 'commit', desc: 'Committer: Push 2 commits', target: 2, reward: 30 },
            { type: 'commit', desc: 'Ship It: Push 5 commits', target: 5, reward: 60 },
            { type: 'fix', desc: 'Bug Zapper: Fix 3 errors', target: 3, reward: 20 },
            { type: 'fix', desc: 'Quality Control: Fix 10 errors', target: 10, reward: 50 },
            { type: 'time', desc: 'Deep Work: Code for 30 minutes', target: 30, reward: 20 },
            { type: 'time', desc: 'Marathon: Code for 60 minutes', target: 60, reward: 45 }
        ];
        // Shuffle and pick 3
        const shuffled = templates.sort(() => 0.5 - Math.random()).slice(0, 3);
        this.developer.quests = shuffled.map((t, i) => ({
            id: `quest_${Date.now()}_${i}`,
            description: t.desc,
            type: t.type,
            target: t.target,
            progress: 0,
            reward: t.reward,
            completed: false
        }));
        this.saveDeveloper();
    }
    /**
     * Resets the developer state to default values.
     */
    async resetProgress() {
        const selection = await vscode.window.showWarningMessage('Are you sure you want to reset all progress? This cannot be undone.', 'Yes', 'No');
        if (selection === 'Yes') {
            // Reuse the same defaulting logic as a fresh install/import, so this
            // never drifts out of sync with normalizeDeveloper() as new fields
            // get added (note: settings are intentionally untouched by a reset).
            this.developer = normalizeDeveloper({});
            this.saveDeveloper();
            this.updateStats();
            vscode.window.showInformationMessage('Progress reset successfully.');
        }
    }
    /**
     * "Buy the dev a coffee": opens GitHub Sponsors (see the devgotchi.openSponsors
     * command) and, once per day, grants a small in-game coffee-bean bonus for
     * checking the page out. There's no way for a VS Code extension to verify
     * an actual sponsorship happened, so this deliberately rewards clicking
     * through rather than paying — monetization framed as a game mechanic, not
     * a paywall gated on something we can't check anyway.
     */
    supportOnSponsors() {
        const last = this.developer.lastSponsorClickAt || 0;
        if (Date.now() - last < SPONSOR_CLICK_COOLDOWN_MS) {
            return { success: false, message: '' };
        }
        this.developer.lastSponsorClickAt = Date.now();
        this.developer.coffee += SPONSOR_CLICK_COFFEE_BONUS;
        this.developer.totalCoffeeEarned = (this.developer.totalCoffeeEarned || 0) + SPONSOR_CLICK_COFFEE_BONUS;
        this.addLog(`💖 Checked out GitHub Sponsors  +${SPONSOR_CLICK_COFFEE_BONUS} ☕`, 'coffee');
        this.saveDeveloper();
        return { success: true, message: `💖 +${SPONSOR_CLICK_COFFEE_BONUS} ☕ — thanks for checking out GitHub Sponsors!` };
    }
    /**
     * Action: Spend coffee beans to boost energy and focus.
     */
    giveCoffee() {
        if (this.developer.coffee < 10)
            return { success: false, message: 'Out of coffee beans!' };
        this.developer.coffee -= 10;
        const energyBoost = this.developer.skills.includes('caffeine_tolerance') ? 52 : 35;
        this.developer.energy = Math.min(100, this.developer.energy + energyBoost);
        this.developer.focus = Math.min(100, this.developer.focus + 20);
        this.developer.motivation = Math.min(100, this.developer.motivation + 10);
        this.addXP(5);
        this.saveDeveloper();
        return { success: true, message: 'Ahh, coffee! ☕' };
    }
    /**
     * Action: Take a break to restore energy but lose some focus.
     */
    takeBreak() {
        if (this.developer.energy == 100 && this.developer.motivation == 100)
            return { success: false, message: 'Energy and motivation are full!' };
        this.addXP(Math.floor(Math.max(5, 5 * (100 - this.developer.energy) / 40, 5 * (100 - this.developer.motivation) / 15)));
        this.developer.energy = Math.min(100, this.developer.energy + 40);
        this.developer.motivation = Math.min(100, this.developer.motivation + 15);
        this.developer.focus = Math.max(0, this.developer.focus - 5);
        this.saveDeveloper();
        return { success: true, message: 'Refreshed! 🌴' };
    }
    /**
     * Event: Triggered when a file is saved. Small boost to motivation and coffee.
     */
    onCodeSaved() {
        if (!this.developer.achievements.includes('first_save')) {
            this.developer.achievements.push('first_save');
            const ach = ACHIEVEMENTS.find(a => a.id === 'first_save');
            if (!this.settings.reduceNotifications) {
                vscode.window.showInformationMessage(`${this.classTag()}🏅 Achievement Unlocked: ${ach.icon} ${ach.name}`);
            }
        }
        this.developer.motivation = Math.min(100, this.developer.motivation + 3);
        this.developer.coffee += 1;
        this.developer.totalCoffeeEarned = (this.developer.totalCoffeeEarned || 0) + 1;
        const saveXp = this.developer.characterClass === 'frontend_rogue' ? 4 : 3; // +25% XP from saves
        this.addXP(saveXp);
        this.addLog(`📝 File saved  +${saveXp} XP  +1 ☕`, 'xp');
        this.updateQuestProgress('save');
        this.checkAchievements();
        this.saveDeveloper();
        // Saves fire far too often for a modal toast, so the Rogue's bonus gets a
        // quick, self-dismissing status bar flash instead of an interruption.
        if (this.developer.characterClass === 'frontend_rogue') {
            vscode.window.setStatusBarMessage(`🗡️ Frontend Rogue +${saveXp} XP (save bonus)`, 2500);
        }
    }
    /**
     * Event: Triggered when a git commit or merge is detected.
     */
    onGitCommit() {
        this.developer.motivation = Math.min(100, this.developer.motivation + 20);
        this.developer.coffee += 5;
        this.developer.totalCoffeeEarned = (this.developer.totalCoffeeEarned || 0) + 5;
        this.developer.totalCommits = (this.developer.totalCommits || 0) + 1;
        const commitXp = this.developer.characterClass === 'backend_mage' ? 63 : 50; // +25% XP from commits
        this.addXP(commitXp);
        this.addLog(`📦 Git commit  +${commitXp} XP  +5 ☕`, 'xp');
        this.updateQuestProgress('commit');
        this.checkAchievements();
        this.progressSeasonalEvent('commits', 1);
        this.saveDeveloper();
        const mageFlavor = this.developer.characterClass === 'backend_mage' ? ' — channels extra power!' : '';
        vscode.window.showInformationMessage(`${this.classTag()}Git Activity! +${commitXp} XP, +5 ☕${mageFlavor}`);
    }
    /**
     * Best-effort seasonal event hook: called with a commit's message whenever
     * HEAD moves. If there's an active 'pr_merge' event and the message looks
     * like a merged PR — GitHub's default "Merge pull request #123 from ..."
     * merge commit, or a squash-merge's trailing "(#123)" — progress that
     * event's quest. No GitHub API involved, so this only sees PRs actually
     * merged into the branch you have checked out locally; it can't detect
     * merges elsewhere or a merge method that produces neither pattern (e.g.
     * a bare rebase-and-merge with a manually written subject). That's an
     * accepted trade-off to keep the extension server-free.
     */
    onPossiblePRMerge(commitMessage) {
        const subject = (commitMessage.split('\n')[0] || '').trim();
        const looksLikeMergedPR = /^Merge pull request #\d+/i.test(subject) || /\(#\d+\)\s*$/.test(subject);
        if (!looksLikeMergedPR)
            return;
        this.progressSeasonalEvent('pr_merge', 1);
    }
    /**
     * Shared engine for every seasonal event's quest. No-ops unless the
     * currently active event (if any) matches `questType`, so callers can
     * always call this unconditionally on their trigger (a PR merge, a bug
     * fix, ...) without checking what's active themselves.
     */
    progressSeasonalEvent(questType, amount) {
        if (amount <= 0)
            return;
        const event = getActiveSeasonalEvent();
        if (!event || event.questType !== questType)
            return;
        const instanceId = seasonalEventInstanceId(event);
        if (!this.developer.seasonalProgress)
            this.developer.seasonalProgress = {};
        const entry = this.developer.seasonalProgress[instanceId] || { progress: 0, completed: false };
        if (entry.completed)
            return;
        entry.progress += amount;
        if (event.perTickReward) {
            this.addXP(event.perTickReward.xp);
            this.developer.coffee += event.perTickReward.coffee;
            this.developer.totalCoffeeEarned = (this.developer.totalCoffeeEarned || 0) + event.perTickReward.coffee;
        }
        const unit = amount === 1 ? event.progressUnitSingular : event.progressUnitPlural;
        if (entry.progress >= event.questTarget) {
            entry.progress = event.questTarget;
            entry.completed = true;
            if (!this.developer.inventory.includes(event.skinId))
                this.developer.inventory.push(event.skinId);
            this.addLog(`${event.emoji} ${event.name} complete — earned ${event.skinEmoji} ${event.skinName}!`, 'achievement');
            vscode.window.showInformationMessage(`${event.emoji} ${event.name} complete! You've earned the ${event.skinEmoji} ${event.skinName} skin — equip it from the Shop.`);
        }
        else {
            this.addLog(`${event.emoji} ${event.name}: ${amount} ${unit} ${event.progressVerb} (${entry.progress}/${event.questTarget})`, 'xp');
            if (event.showToastOnProgress) {
                const rewardText = event.perTickReward ? ` +${event.perTickReward.xp} XP, +${event.perTickReward.coffee} ☕` : '';
                vscode.window.showInformationMessage(`${event.emoji} ${event.name}: ${amount} ${unit} ${event.progressVerb}!${rewardText} (${entry.progress}/${event.questTarget})`);
            }
        }
        this.developer.seasonalProgress[instanceId] = entry;
        this.saveDeveloper();
    }
    /**
     * Current seasonal event status for the panel, or null if none is active
     * right now.
     */
    getSeasonalStatus() {
        const event = getActiveSeasonalEvent();
        if (!event)
            return null;
        const instanceId = seasonalEventInstanceId(event);
        const entry = (this.developer.seasonalProgress || {})[instanceId] || { progress: 0, completed: false };
        return {
            id: event.id,
            name: event.name,
            emoji: event.emoji,
            questLabel: event.questLabel,
            target: event.questTarget,
            progress: Math.min(entry.progress, event.questTarget),
            completed: entry.completed,
            skinName: event.skinName,
            skinEmoji: event.skinEmoji,
            bannerGradientStart: event.bannerGradientStart,
            bannerGradientEnd: event.bannerGradientEnd,
            bannerTextColor: event.bannerTextColor,
            accentColor: event.accentColor
        };
    }
    /** This week's Boss Affix, for the panel banner. Always present — see getActiveBossAffix. */
    getBossAffixStatus() {
        const affix = getActiveBossAffix();
        return { id: affix.id, name: affix.name, emoji: affix.emoji, description: affix.description };
    }
    setInitialErrorCount(count) {
        this.lastErrorCount = count;
        this.developer.activeErrorCount = count;
    }
    /**
     * Live "Bug Boss" HP is just the real active error count — this is called
     * on every diagnostics change so the panel always reflects reality, not a
     * simulated fight.
     */
    updateErrorCount(currentErrors) {
        const diff = currentErrors - this.lastErrorCount;
        const previousErrors = this.lastErrorCount;
        if (diff < 0) {
            // Fixed bugs
            const fixed = Math.abs(diff);
            const xpMult = this.developer.skills.includes('bug_slayer') ? 2 : 1;
            this.addXP(fixed * 5 * xpMult);
            this.developer.motivation = Math.min(100, this.developer.motivation + fixed);
            this.developer.totalBugsFixed = (this.developer.totalBugsFixed || 0) + fixed;
            this.addLog(`🐛 Fixed ${fixed} bug${fixed > 1 ? 's' : ''}  +${fixed * 5 * xpMult} XP`, 'xp');
            this.updateQuestProgress('fix', fixed);
            // Secret: fixed within 60s of an error appearing — best-effort, since
            // several errors could be in flight at once and this just checks the
            // most recent appearance, not which specific one got fixed.
            if (this.lastErrorIncreaseAt && Date.now() - this.lastErrorIncreaseAt <= 60000) {
                this.unlockAchievement('quick_draw');
            }
            this.checkAchievements();
            this.progressSeasonalEvent('bugs_fixed', fixed);
            vscode.window.setStatusBarMessage(`Bug squashed! +${fixed * 5 * xpMult} XP 🐛`, 3000);
            // Bug Boss defeated: every active error just got cleared.
            if (currentErrors === 0 && previousErrors > 0) {
                const xpBonus = this.applyBossBonusAffix(BUG_BOSS_DEFEAT_BONUS_XP);
                const coffeeBonus = this.applyBossBonusAffix(BUG_BOSS_DEFEAT_BONUS_COFFEE);
                this.addXP(xpBonus);
                this.developer.coffee += coffeeBonus;
                this.developer.totalCoffeeEarned = (this.developer.totalCoffeeEarned || 0) + coffeeBonus;
                this.developer.totalBossesDefeated = (this.developer.totalBossesDefeated || 0) + 1;
                this.addLog(`👾 Bug Boss defeated! +${xpBonus} XP, +${coffeeBonus} ☕`, 'achievement');
                vscode.window.showInformationMessage(`👾 Bug Boss defeated! +${xpBonus} XP, +${coffeeBonus} ☕ — your code is clean.`);
            }
        }
        else if (diff > 0) {
            // New bugs introduced - slight focus hit
            this.developer.focus = Math.max(0, this.developer.focus - (diff * 0.5));
            this.lastErrorIncreaseAt = Date.now();
        }
        this.lastErrorCount = currentErrors;
        this.developer.activeErrorCount = currentErrors;
        this.saveDeveloper();
    }
    setInitialConflictCount(count) {
        this.lastConflictCount = count;
        this.developer.mergeConflictCount = count;
    }
    /**
     * Live "Merge Conflict Kraken" HP is the real count of files with
     * unresolved git merge conflicts (sourced from the git extension's
     * `state.mergeChanges` — see hookRepo below) — same "actual repo state as
     * boss HP" pattern as the Bug Boss above.
     */
    updateConflictCount(currentConflicts) {
        const diff = currentConflicts - this.lastConflictCount;
        const previousConflicts = this.lastConflictCount;
        if (diff < 0) {
            const resolved = Math.abs(diff);
            this.addXP(resolved * 8);
            this.developer.motivation = Math.min(100, this.developer.motivation + resolved * 2);
            this.addLog(`🐙 Resolved ${resolved} merge conflict${resolved > 1 ? 's' : ''}  +${resolved * 8} XP`, 'xp');
            // Merge Conflict Kraken defeated: every conflicted file just got resolved.
            if (currentConflicts === 0 && previousConflicts > 0) {
                const xpBonus = this.applyBossBonusAffix(MERGE_KRAKEN_DEFEAT_BONUS_XP);
                const coffeeBonus = this.applyBossBonusAffix(MERGE_KRAKEN_DEFEAT_BONUS_COFFEE);
                this.addXP(xpBonus);
                this.developer.coffee += coffeeBonus;
                this.developer.totalCoffeeEarned = (this.developer.totalCoffeeEarned || 0) + coffeeBonus;
                this.developer.totalBossesDefeated = (this.developer.totalBossesDefeated || 0) + 1;
                this.addLog(`🐙 Merge Conflict Kraken defeated! +${xpBonus} XP, +${coffeeBonus} ☕`, 'achievement');
                vscode.window.showInformationMessage(`🐙 Merge Conflict Kraken defeated! +${xpBonus} XP, +${coffeeBonus} ☕ — the merge is clean.`);
            }
        }
        else if (diff > 0) {
            // A merge/rebase just surfaced new conflicts - slight focus hit
            this.developer.focus = Math.max(0, this.developer.focus - diff);
        }
        this.lastConflictCount = currentConflicts;
        this.developer.mergeConflictCount = currentConflicts;
        this.saveDeveloper();
    }
    setInitialLongFileCount(count) {
        this.lastLongFileCount = count;
        this.developer.longFileCount = count;
    }
    /**
     * Live "Code Smell Boss" HP is the count of currently-open files over
     * LONG_FILE_LINE_THRESHOLD lines (see countOpenLongFiles) — same
     * "actual repo state as boss HP" pattern as the Bug Boss and Merge
     * Conflict Kraken above. Deliberately scoped to files VS Code already has
     * open/loaded (free via TextDocument.lineCount, no disk I/O) rather than
     * scanning the whole workspace — honest about what it can see, and cheap
     * enough to recheck on every open/close/save without a debounce.
     */
    updateLongFileCount(currentCount) {
        const diff = currentCount - this.lastLongFileCount;
        const previousCount = this.lastLongFileCount;
        if (diff < 0) {
            const shrunk = Math.abs(diff);
            this.addXP(shrunk * CODE_SMELL_REFACTOR_XP_PER_FILE);
            this.developer.motivation = Math.min(100, this.developer.motivation + shrunk * 3);
            this.addLog(`🧟 Refactored ${shrunk} bloated file${shrunk > 1 ? 's' : ''} under ${LONG_FILE_LINE_THRESHOLD} lines  +${shrunk * CODE_SMELL_REFACTOR_XP_PER_FILE} XP`, 'xp');
            // Code Smell Boss defeated: every open file just dropped under the threshold.
            if (currentCount === 0 && previousCount > 0) {
                const xpBonus = this.applyBossBonusAffix(CODE_SMELL_BOSS_DEFEAT_BONUS_XP);
                const coffeeBonus = this.applyBossBonusAffix(CODE_SMELL_BOSS_DEFEAT_BONUS_COFFEE);
                this.addXP(xpBonus);
                this.developer.coffee += coffeeBonus;
                this.developer.totalCoffeeEarned = (this.developer.totalCoffeeEarned || 0) + coffeeBonus;
                this.developer.totalBossesDefeated = (this.developer.totalBossesDefeated || 0) + 1;
                this.addLog(`🧟 Code Smell Boss defeated! +${xpBonus} XP, +${coffeeBonus} ☕`, 'achievement');
                vscode.window.showInformationMessage(`🧟 Code Smell Boss defeated! +${xpBonus} XP, +${coffeeBonus} ☕ — nothing bloated left open.`);
            }
        }
        else if (diff > 0) {
            // A file just grew past the threshold (or a bloated file got opened) - slight focus hit
            this.developer.focus = Math.max(0, this.developer.focus - diff);
        }
        this.lastLongFileCount = currentCount;
        this.developer.longFileCount = currentCount;
        this.saveDeveloper();
    }
    /**
     * Updates progress for active quests of a specific type.
     */
    /**
     * Advances progress on any quest of `type` in `list` (daily quests, or a
     * community Quest Pack — see importQuestPack), paying its reward (scaled
     * by this week's Boss Affix questRewardMultiplier, if any) the moment it
     * completes. Returns true if anything in the list changed, so callers can
     * decide whether a save is needed.
     */
    advanceQuestList(list, type, amount) {
        let updated = false;
        const rewardMultiplier = getActiveBossAffix().questRewardMultiplier ?? 1;
        list.forEach(q => {
            if (q.type === type && !q.completed) {
                q.progress += amount;
                if (q.progress >= q.target) {
                    q.progress = q.target;
                    q.completed = true;
                    const reward = Math.round(q.reward * rewardMultiplier);
                    this.developer.coffee += reward;
                    vscode.window.showInformationMessage(`✅ Quest Complete: ${q.description} (+${reward} ☕)`);
                }
                updated = true;
            }
        });
        return updated;
    }
    /**
     * Advances "The Legacy Code Dungeon". Two phases:
     *  1. Chapter in progress: accumulate progress toward its objective; on
     *     completion, pay its reward and start the next-day gate.
     *  2. Gate pending (legacyDungeonChapterCompletedAt is set): waits for a
     *     new calendar day, then either unlocks the next chapter or, if that
     *     was the last one, finishes the story and grants the exclusive skin.
     * Runs on every quest-progress trigger regardless of type, since the gate
     * check itself doesn't depend on which action fired it. Returns true if
     * anything changed, so the caller knows whether to save.
     */
    advanceLegacyDungeon(type, amount) {
        if (this.developer.legacyDungeonCompleted)
            return false;
        const chapterIndex = (this.developer.legacyDungeonChapter || 1) - 1;
        const chapter = LEGACY_DUNGEON_CHAPTERS[chapterIndex];
        if (!chapter)
            return false;
        const isLastChapter = chapterIndex + 1 >= LEGACY_DUNGEON_CHAPTERS.length;
        if (this.developer.legacyDungeonChapterCompletedAt) {
            const completedDay = new Date(this.developer.legacyDungeonChapterCompletedAt).toDateString();
            const today = new Date().toDateString();
            if (completedDay === today)
                return false; // still gated until a new calendar day
            if (isLastChapter) {
                this.developer.legacyDungeonCompleted = true;
                if (!this.developer.inventory.includes(LEGACY_DUNGEON_SKIN_ID))
                    this.developer.inventory.push(LEGACY_DUNGEON_SKIN_ID);
                this.addLog('📖 The Legacy Code Dungeon complete! Earned 💀 Legacy Slayer.', 'achievement');
                vscode.window.showInformationMessage("📖 The Legacy Code Dungeon complete! You've earned the 💀 Legacy Slayer skin — equip it from the Shop.");
                return true;
            }
            this.developer.legacyDungeonChapter = (this.developer.legacyDungeonChapter || 1) + 1;
            this.developer.legacyDungeonProgress = 0;
            this.developer.legacyDungeonChapterCompletedAt = 0;
            const nextChapter = LEGACY_DUNGEON_CHAPTERS[this.developer.legacyDungeonChapter - 1];
            this.addLog(`📖 Chapter ${this.developer.legacyDungeonChapter} unlocked: ${nextChapter.title}`, 'event');
            vscode.window.showInformationMessage(`📖 Chapter ${this.developer.legacyDungeonChapter} unlocked: ${nextChapter.title}`);
            return true;
        }
        if (chapter.type !== type)
            return false;
        this.developer.legacyDungeonProgress = (this.developer.legacyDungeonProgress || 0) + amount;
        if (this.developer.legacyDungeonProgress >= chapter.target) {
            this.developer.legacyDungeonProgress = chapter.target;
            this.developer.legacyDungeonChapterCompletedAt = Date.now();
            this.addXP(chapter.rewardXp);
            this.developer.coffee += chapter.rewardCoffee;
            this.developer.totalCoffeeEarned = (this.developer.totalCoffeeEarned || 0) + chapter.rewardCoffee;
            const gateFlavor = isLastChapter ? " — the dungeon's final chapter awaits tomorrow." : ' — next chapter unlocks tomorrow.';
            this.addLog(`📖 Chapter ${this.developer.legacyDungeonChapter} complete: ${chapter.title}  +${chapter.rewardXp} XP, +${chapter.rewardCoffee} ☕`, 'achievement');
            vscode.window.showInformationMessage(`📖 Chapter ${this.developer.legacyDungeonChapter} complete: ${chapter.title}! +${chapter.rewardXp} XP, +${chapter.rewardCoffee} ☕${gateFlavor}`);
        }
        return true;
    }
    /**
     * Current Legacy Dungeon status for the Story modal: the active chapter's
     * narrative text/progress, whether it's gated waiting on a new day, and a
     * compact list of every chapter's title + completion state for the
     * table-of-contents view.
     */
    getLegacyDungeonStatus() {
        const chapterNum = this.developer.legacyDungeonChapter || 1;
        const chapter = LEGACY_DUNGEON_CHAPTERS[chapterNum - 1] || LEGACY_DUNGEON_CHAPTERS[LEGACY_DUNGEON_CHAPTERS.length - 1];
        const completed = !!this.developer.legacyDungeonCompleted;
        const gated = !completed && !!this.developer.legacyDungeonChapterCompletedAt;
        return {
            completed,
            currentChapter: chapterNum,
            totalChapters: LEGACY_DUNGEON_CHAPTERS.length,
            gated,
            title: chapter.title,
            flavorText: chapter.flavorText,
            objectiveType: chapter.type,
            progress: Math.min(this.developer.legacyDungeonProgress || 0, chapter.target),
            target: chapter.target,
            rewardXp: chapter.rewardXp,
            rewardCoffee: chapter.rewardCoffee,
            chapters: LEGACY_DUNGEON_CHAPTERS.map((c, i) => ({
                title: c.title,
                state: completed || i + 1 < chapterNum ? 'completed' : (i + 1 === chapterNum ? 'current' : 'locked')
            }))
        };
    }
    /**
     * Imports a community Quest Pack from raw JSON text (from a local file or
     * a URL — see the two devgotchi.importQuestPack* commands). Validates and
     * HTML-escapes everything via validateQuestPack before touching state;
     * a pack already imported (by packId) is a no-op, not a duplicate import.
     */
    importQuestPack(jsonText) {
        let raw;
        try {
            raw = JSON.parse(jsonText);
        }
        catch {
            return { success: false, message: 'That file is not valid JSON.' };
        }
        const result = validateQuestPack(raw);
        if ('error' in result) {
            return { success: false, message: result.error };
        }
        const pack = result.pack;
        if (!this.developer.importedQuestPackIds)
            this.developer.importedQuestPackIds = [];
        if (this.developer.importedQuestPackIds.includes(pack.packId)) {
            return { success: false, message: `"${pack.packName}" is already imported.` };
        }
        if (!this.developer.packQuests)
            this.developer.packQuests = [];
        pack.quests.forEach(q => {
            this.developer.packQuests.push({
                id: `${pack.packId}__${q.id}`,
                description: q.description,
                type: q.type,
                target: q.target,
                progress: 0,
                reward: q.reward,
                completed: false,
                packId: pack.packId,
                packName: pack.packName
            });
        });
        this.developer.importedQuestPackIds.push(pack.packId);
        this.addLog(`🎁 Imported Quest Pack: ${pack.packName} (${pack.quests.length} quest${pack.quests.length === 1 ? '' : 's'})`, 'event');
        this.saveDeveloper();
        return { success: true, message: `🎁 Imported "${pack.packName}" — ${pack.quests.length} quest${pack.quests.length === 1 ? '' : 's'} added.` };
    }
    /** Removes every quest from a previously-imported pack (completed or not) and allows re-importing it later. */
    removeQuestPack(packId) {
        if (!this.developer.importedQuestPackIds?.includes(packId)) {
            return { success: false, message: 'That pack is not currently imported.' };
        }
        this.developer.packQuests = (this.developer.packQuests || []).filter(q => q.packId !== packId);
        this.developer.importedQuestPackIds = this.developer.importedQuestPackIds.filter(id => id !== packId);
        this.saveDeveloper();
        return { success: true, message: 'Quest Pack removed.' };
    }
    updateQuestProgress(type, amount = 1) {
        let updated = this.advanceQuestList(this.developer.quests, type, amount);
        if (this.developer.packQuests && this.developer.packQuests.length > 0) {
            updated = this.advanceQuestList(this.developer.packQuests, type, amount) || updated;
        }
        updated = this.advanceLegacyDungeon(type, amount) || updated;
        // Check if all quests are completed for the day
        if (!this.developer.dailyQuestsCompleted && this.developer.quests.length > 0 && this.developer.quests.every(q => q.completed)) {
            this.developer.dailyQuestsCompleted = true;
            this.developer.questStreak = (this.developer.questStreak || 0) + 1;
            const bonus = 50 + (this.developer.questStreak * 10);
            this.developer.coffee += bonus;
            vscode.window.showInformationMessage(`${this.classTag()}🎉 All Daily Quests Complete! +${bonus} ☕ (Quest Streak: ${this.developer.questStreak})`);
            updated = true;
        }
        if (updated)
            this.saveDeveloper();
    }
    /**
     * Marks the tutorial as completed.
     */
    completeTutorial() {
        this.developer.tutorialCompleted = true;
        this.saveDeveloper();
    }
    getCharacterClass() {
        return this.developer.characterClass;
    }
    getClassInfo() {
        return CLASSES.find(c => c.id === this.developer.characterClass) || null;
    }
    /**
     * Emoji prefix (with trailing space) for the developer's chosen class, or
     * '' if unclassed — used to tag toasts so the class stays visible across
     * the extension, not just inside the panel.
     */
    classTag() {
        const info = this.getClassInfo();
        return info ? `${info.emoji} ` : '';
    }
    /** Applies this week's Boss Affix bossBonusMultiplier (if any) to a boss-defeat XP/coffee bonus. */
    applyBossBonusAffix(base) {
        return Math.round(base * (getActiveBossAffix().bossBonusMultiplier ?? 1));
    }
    /**
     * Opens a class picker. Free the first time (no class set yet); after
     * that it's a paid respec (CLASS_RESPEC_COST coffee), surfaced as a Shop
     * action. Coffee is only spent once a choice is actually confirmed, so
     * dismissing the picker never costs anything.
     */
    async chooseClass() {
        const isRespec = !!this.developer.characterClass;
        if (isRespec && this.developer.coffee < CLASS_RESPEC_COST) {
            return { success: false, message: `Need ${CLASS_RESPEC_COST} ☕ to respec your class.` };
        }
        const picked = await vscode.window.showQuickPick(CLASSES.map(c => ({ label: `${c.emoji} ${c.name}`, description: c.description, id: c.id })), { placeHolder: isRespec ? `Respec your class (-${CLASS_RESPEC_COST} ☕)` : 'Choose your class — grants a permanent passive bonus' });
        if (!picked)
            return { success: false, message: 'Class selection cancelled.' };
        if (isRespec)
            this.developer.coffee -= CLASS_RESPEC_COST;
        this.developer.characterClass = picked.id;
        this.saveDeveloper();
        return { success: true, message: `${picked.label} it is!${isRespec ? ` (-${CLASS_RESPEC_COST} ☕)` : ''}` };
    }
    /**
     * Action: Unlock a skill from the skill tree.
     */
    unlockSkill(skillId) {
        const skill = SKILLS.find(s => s.id === skillId);
        if (!skill)
            return { success: false, message: 'Skill not found' };
        if (this.developer.skills.includes(skillId))
            return { success: false, message: 'Skill already unlocked' };
        if (this.developer.coffee < skill.cost)
            return { success: false, message: `Need ${skill.cost} beans!` };
        this.developer.coffee -= skill.cost;
        this.developer.skills.push(skillId);
        this.saveDeveloper();
        return { success: true, message: `Unlocked ${skill.name}! 🎉` };
    }
    /**
     * Action: Buy an item from the shop.
     */
    buyItem(itemId) {
        const item = SHOP_ITEMS.find(i => i.id === itemId);
        if (!item)
            return { success: false, message: 'Item not found' };
        if (item.eventOnly)
            return { success: false, message: 'This one can only be earned, not bought.' };
        if (this.developer.inventory.includes(itemId))
            return { success: false, message: 'Already owned' };
        if (this.developer.coffee < item.cost)
            return { success: false, message: 'Not enough beans' };
        this.developer.coffee -= item.cost;
        this.developer.inventory.push(itemId);
        // Auto-equip skins
        if (item.type === 'skin' && item.emoji) {
            this.developer.role = item.emoji;
        }
        this.saveDeveloper();
        vscode.window.setStatusBarMessage(`Bought ${item.name}! 🛍️`, 3000);
        return { success: true, message: `Bought ${item.name}! 🛍️` };
    }
    equipItem(itemId) {
        const item = SHOP_ITEMS.find(i => i.id === itemId);
        if (!item || !this.developer.inventory.includes(itemId))
            return { success: false, message: 'Cannot equip' };
        if (item.type !== 'skin' || !item.emoji)
            return { success: false, message: 'Not equippable' };
        this.developer.role = item.emoji;
        this.saveDeveloper();
        return { success: true, message: `Equipped ${item.name}` };
    }
    /**
     * Event: Triggered when a mini-game challenge is completed.
     */
    challengeCompleted(score) {
        const coffeeEarned = Math.floor(score / 10);
        this.developer.coffee += coffeeEarned;
        this.developer.motivation = Math.min(100, this.developer.motivation + 20);
        this.addXP(score + score * score / 100 + score * score * score / 100000);
        this.saveDeveloper();
        return coffeeEarned;
    }
    /**
     * Updates the developer's name.
     */
    renameDeveloper(newName) {
        this.developer.name = newName;
        this.saveDeveloper();
        return { success: true, message: `Renamed to ${newName}!` };
    }
    /**
     * Stamps today's date in activityDates, incrementing its event count.
     * Called from addXP() since that's the single choke point every
     * XP-earning action already passes through (saves, commits, bug fixes,
     * quests, focus sprints, the Bug Boss and Team Raid Boss bonuses, etc.) —
     * no need to instrument each call site separately. Pruned to the last
     * ~370 days so a long-running save doesn't accumulate an unbounded object.
     */
    recordDailyActivity() {
        if (!this.developer.activityDates)
            this.developer.activityDates = {};
        const now = new Date();
        const key = now.toISOString().slice(0, 10);
        this.developer.activityDates[key] = (this.developer.activityDates[key] || 0) + 1;
        const keys = Object.keys(this.developer.activityDates);
        if (keys.length > 400) {
            keys.sort();
            const excess = keys.length - 370;
            for (let i = 0; i < excess; i++) {
                delete this.developer.activityDates[keys[i]];
            }
        }
        // Same choke point doubles as the tally behind Year in Code Wrapped's
        // "most productive hour" — a 24-length bucket by local hour-of-day.
        if (!this.developer.hourlyActivity || this.developer.hourlyActivity.length !== 24) {
            this.developer.hourlyActivity = new Array(24).fill(0);
        }
        this.developer.hourlyActivity[now.getHours()]++;
    }
    /**
     * Per-day minutes-coded log behind Timesheet Mode (see exportTimesheetData).
     * Called from the same "ignore offline time" gate as the quest time
     * tracker in updateStats() — and since updateStats() early-returns during
     * both Vacation Mode and idle detection before reaching that gate, this
     * only accumulates while you're actually coding, not just while VS Code
     * happens to be open.
     */
    recordTimesheetMinutes(minutes) {
        if (!this.developer.dailyMinutesCoded)
            this.developer.dailyMinutesCoded = {};
        const key = new Date().toISOString().slice(0, 10);
        this.developer.dailyMinutesCoded[key] = (this.developer.dailyMinutesCoded[key] || 0) + minutes;
        const keys = Object.keys(this.developer.dailyMinutesCoded);
        if (keys.length > 400) {
            keys.sort();
            const excess = keys.length - 370;
            for (let i = 0; i < excess; i++) {
                delete this.developer.dailyMinutesCoded[keys[i]];
            }
        }
    }
    /**
     * Builds a CSV timesheet (Date,Hours + a Total row) from the tracked
     * daily-minutes log, for `days` most recent days (or 'all'). Decimal
     * hours, freelancer-CSV-style — DevGotchi doesn't know your billing rate,
     * so it just hands over honest hours and lets you apply one yourself.
     */
    exportTimesheetData(days) {
        const log = this.developer.dailyMinutesCoded || {};
        const keys = Object.keys(log).sort();
        let cutoffKey = null;
        if (days !== 'all') {
            const d = new Date();
            d.setDate(d.getDate() - (days - 1));
            cutoffKey = d.toISOString().slice(0, 10);
        }
        const rows = ['Date,Hours'];
        let totalMinutes = 0;
        keys.forEach(key => {
            if (cutoffKey && key < cutoffKey)
                return;
            const minutes = log[key];
            totalMinutes += minutes;
            rows.push(`${key},${(minutes / 60).toFixed(2)}`);
        });
        rows.push('');
        rows.push(`Total,${(totalMinutes / 60).toFixed(2)}`);
        return rows.join('\n');
    }
    /**
     * Adds XP and handles leveling up logic.
     */
    addXP(amount) {
        this.recordDailyActivity();
        const sprintMultiplier = this.isFocusSprintActive() ? FOCUS_SPRINT_XP_MULTIPLIER : 1;
        const prestigeMultiplier = 1 + (this.developer.prestigeCount || 0) * PRESTIGE_XP_BONUS_PER_PRESTIGE;
        const gained = Math.floor(amount * (1 + this.developer.energy / 100) * (1 + this.developer.focus / 100) * (1 + this.developer.motivation / 100) * sprintMultiplier * prestigeMultiplier);
        this.developer.xp += gained;
        this.developer.totalXpEarned = (this.developer.totalXpEarned || 0) + gained;
        let leveledUp = false;
        let xpNeeded = this.developer.level * 100;
        // Level is capped at PRESTIGE_LEVEL_REQUIREMENT — past that, XP still
        // accrues (visible as a full bar) but only Prestige moves you further.
        while (this.developer.level < PRESTIGE_LEVEL_REQUIREMENT && this.developer.xp >= xpNeeded) {
            this.developer.level++;
            this.developer.xp -= xpNeeded;
            xpNeeded = this.developer.level * 100;
            leveledUp = true;
        }
        if (this.developer.level >= PRESTIGE_LEVEL_REQUIREMENT) {
            this.developer.xp = Math.min(this.developer.xp, xpNeeded);
        }
        if (leveledUp) {
            this.addLog(`🎉 LEVEL UP → Level ${this.developer.level}!`, 'achievement');
            vscode.window.showInformationMessage(`${this.classTag()}🎉 ${this.developer.name} leveled up to Level ${this.developer.level}!`);
        }
    }
    /**
     * Prestige: available once Level cap is reached. Resets level/xp back to
     * 1/0 (visually "Junior" again via getTitleForLevel in the webview) in
     * exchange for a permanent, stacking +5%-per-prestige XP badge. Everything
     * else — lifetime totals, streak, achievements, inventory, coffee — is
     * untouched; this only resets the level/xp progression loop.
     */
    async prestige() {
        if (this.developer.level < PRESTIGE_LEVEL_REQUIREMENT) {
            return {
                success: false,
                message: `Reach Level ${PRESTIGE_LEVEL_REQUIREMENT} before you can Prestige (you're Level ${this.developer.level}).`
            };
        }
        const nextPrestige = (this.developer.prestigeCount || 0) + 1;
        const selection = await vscode.window.showWarningMessage(`Prestige ${nextPrestige}: resets your level to 1 and clears current XP, in exchange for a permanent +${nextPrestige * PRESTIGE_XP_BONUS_PER_PRESTIGE * 100}% XP boost. Your lifetime stats, streak, achievements, and inventory are untouched. Continue?`, 'Yes', 'No');
        if (selection !== 'Yes') {
            return { success: false, message: 'Prestige cancelled.' };
        }
        this.developer.prestigeCount = nextPrestige;
        this.developer.level = 1;
        this.developer.xp = 0;
        const message = `🌟 Prestige ${nextPrestige}! Back to Level 1 — Junior Developer again, with a permanent +${nextPrestige * PRESTIGE_XP_BONUS_PER_PRESTIGE * 100}% XP boost.`;
        this.addLog(message, 'achievement');
        this.saveDeveloper();
        vscode.window.showInformationMessage(message);
        return { success: true, message };
    }
}
/**
 * Manages the Webview UI for the DevGotchi panel.
 * Handles HTML generation and communication between VS Code and the webview.
 */
class DeveloperPanel {
    /**
     * Creates or reveals the existing panel.
     */
    static createOrShow(extensionUri, devManager, teamManager) {
        if (DeveloperPanel.currentPanel) {
            DeveloperPanel.currentPanel.panel.reveal();
            return;
        }
        const panel = vscode.window.createWebviewPanel('devGotchi', '👨‍💻 DevGotchi', vscode.ViewColumn.Two, { enableScripts: true, retainContextWhenHidden: true });
        DeveloperPanel.currentPanel = new DeveloperPanel(panel, devManager, teamManager);
    }
    /**
     * Private constructor. Sets up the webview HTML and message listeners.
     */
    constructor(panel, devManager, teamManager) {
        this.devManager = devManager;
        this.teamManager = teamManager;
        this.disposables = [];
        this.panel = panel;
        this.panel.webview.html = this.getHtmlContent();
        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
        this.panel.webview.onDidReceiveMessage((message) => {
            switch (message.command) {
                case 'coffee':
                    this.updatePanel(this.devManager.giveCoffee());
                    break;
                case 'break':
                    this.updatePanel(this.devManager.takeBreak());
                    break;
                case 'rename':
                    this.updatePanel(this.devManager.renameDeveloper(message.name));
                    break;
                case 'unlock-skill':
                    this.updatePanel(this.devManager.unlockSkill(message.skillId));
                    break;
                case 'buy-item':
                    this.updatePanel(this.devManager.buyItem(message.itemId));
                    break;
                case 'equip-item':
                    this.updatePanel(this.devManager.equipItem(message.itemId));
                    break;
                case 'choose-class':
                    this.devManager.chooseClass().then(result => this.updatePanel(result));
                    break;
                case 'challenge-completed': {
                    const coffee = this.devManager.challengeCompleted(message.score);
                    this.panel.webview.postMessage({ command: 'challenge-result', result: { message: `Earned ${coffee} coffee beans!` } });
                    this.updateDeveloper();
                    break;
                }
                case 'complete-tutorial':
                    this.devManager.completeTutorial();
                    break;
                case 'start-focus-sprint':
                    this.updatePanel(this.devManager.startFocusSprint(message.minutes));
                    break;
                case 'cancel-focus-sprint':
                    this.updatePanel(this.devManager.cancelFocusSprint());
                    break;
                case 'copy-text':
                    vscode.env.clipboard.writeText(message.text);
                    this.panel.webview.postMessage({ command: 'action-result', result: { message: message.confirmMessage || '📋 Copied! Paste it into your README or a post.' } });
                    break;
                case 'save-stats-image':
                    this.saveStatsImage(message.dataUrl, message.suggestedName);
                    break;
                case 'flex-share':
                    this.flexShare(message.dataUrl, message.suggestedName, message.caption);
                    break;
                case 'save-settings':
                    this.updatePanel(this.devManager.updateSettings(message.settings));
                    break;
                case 'export-progress':
                    vscode.commands.executeCommand('devgotchi.exportProgress');
                    break;
                case 'export-timesheet':
                    vscode.commands.executeCommand('devgotchi.exportTimesheet');
                    break;
                case 'import-progress':
                    vscode.commands.executeCommand('devgotchi.importProgress');
                    break;
                case 'reset-progress':
                    vscode.commands.executeCommand('devgotchi.resetProgress');
                    break;
                case 'prestige':
                    vscode.commands.executeCommand('devgotchi.prestige');
                    break;
                case 'import-quest-pack':
                    vscode.commands.executeCommand('devgotchi.importQuestPack');
                    break;
                case 'import-quest-pack-url':
                    vscode.commands.executeCommand('devgotchi.importQuestPackFromUrl');
                    break;
                case 'remove-quest-pack':
                    this.updatePanel(this.devManager.removeQuestPack(message.packId));
                    break;
                case 'toggle-vacation-mode':
                    this.updatePanel(this.devManager.setVacationMode(!!message.enabled));
                    break;
                case 'open-feedback':
                    vscode.commands.executeCommand('devgotchi.sendFeedback');
                    break;
                case 'open-sponsors':
                    vscode.commands.executeCommand('devgotchi.openSponsors');
                    break;
                case 'get-team-data':
                    this.sendTeamData();
                    break;
                case 'toggle-team-mode':
                    Promise.resolve(vscode.commands.executeCommand('devgotchi.toggleTeamMode')).then(() => {
                        this.updateDeveloper();
                        this.sendTeamData();
                    });
                    break;
            }
        }, null, this.disposables);
        this.updateDeveloper();
    }
    /**
     * Decodes a data-URL PNG from the webview canvas and saves it to disk,
     * offering to reveal it in the OS file browser afterward.
     */
    async saveStatsImage(dataUrl, suggestedName) {
        try {
            const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
            const buffer = Buffer.from(base64, 'base64');
            const defaultUri = vscode.Uri.file(path.join(os.homedir(), suggestedName || 'devgotchi-stats.png'));
            const target = await vscode.window.showSaveDialog({
                defaultUri,
                filters: { 'PNG Image': ['png'] }
            });
            if (!target)
                return;
            await vscode.workspace.fs.writeFile(target, buffer);
            const choice = await vscode.window.showInformationMessage('🖼️ Stats card saved!', 'Reveal in Folder');
            if (choice === 'Reveal in Folder') {
                vscode.commands.executeCommand('revealFileInOS', target);
            }
        }
        catch (err) {
            vscode.window.showErrorMessage('Failed to save the stats card image.');
        }
    }
    /**
     * One-click "flex": copies a ready-to-post caption (with hashtags) to the
     * clipboard, then immediately runs the same save flow as saveStatsImage()
     * so the matching card image is one save-dialog away. VS Code's clipboard
     * API only carries text, not images, so "copied together" means: caption
     * on the clipboard, image saved to disk — the actual paste-into-a-tweet
     * step still needs the two attached separately, but both halves are ready
     * after a single click.
     */
    async flexShare(dataUrl, suggestedName, caption) {
        await vscode.env.clipboard.writeText(caption);
        vscode.window.setStatusBarMessage('📋 Caption copied — now save the image to attach it!', 5000);
        await this.saveStatsImage(dataUrl, suggestedName);
    }
    /**
     * Sends an action result (success/failure message) back to the webview.
     */
    updatePanel(result) {
        this.panel.webview.postMessage({ command: 'action-result', result });
        this.updateDeveloper();
    }
    /**
     * Sends the latest developer stats to the webview to update the UI.
     */
    updateDeveloper() {
        this.panel.webview.postMessage({
            command: 'update',
            developer: this.devManager.getDeveloper(),
            settings: this.devManager.getSettings(),
            // isAvailable() is cached after its first (real) git shell-out, so
            // calling it on every 30s tick is cheap.
            teamAvailable: this.teamManager?.isAvailable() ?? false,
            teamEnabled: this.teamManager?.isEnabled() ?? false,
            seasonalStatus: this.devManager.getSeasonalStatus(),
            bossAffix: this.devManager.getBossAffixStatus(),
            legacyDungeon: this.devManager.getLegacyDungeonStatus()
        });
    }
    /**
     * Tells the webview to open the Share Stats Card modal (used by the
     * "Export Stats Card" command palette entry).
     */
    openShareCard() {
        this.panel.webview.postMessage({ command: 'open-share-modal' });
    }
    /**
     * Tells the webview to open the Share modal on the Weekly Recap tab (used
     * by the "Share Recap" action on the weekly recap notification).
     */
    openWeeklyRecapShare() {
        this.panel.webview.postMessage({ command: 'open-weekly-recap-modal' });
    }
    /**
     * Tells the webview to open the Share modal on the Year in Code Wrapped
     * tab (used by the "View Wrapped" action on the yearly recap notification).
     */
    openYearlyRecapShare() {
        this.panel.webview.postMessage({ command: 'open-yearly-recap-modal' });
    }
    /**
     * Tells the webview to open the Settings modal (used by the
     * "Open Settings" command palette entry).
     */
    openSettings() {
        this.panel.webview.postMessage({ command: 'open-settings-modal', settings: this.devManager.getSettings() });
    }
    /**
     * Tells the webview to open the Team modal and kicks off an async read of
     * every teammate's snapshot file (used by the "Open Team View" command
     * palette entry and the panel's Team button).
     */
    async openTeamView() {
        this.panel.webview.postMessage({ command: 'open-team-modal' });
        await this.sendTeamData();
    }
    /**
     * Reads all team snapshot files (if Team Mode's manager exists at all —
     * it won't in a non-git workspace) and sends them to the webview.
     */
    async sendTeamData() {
        if (!this.teamManager) {
            this.panel.webview.postMessage({ command: 'team-data', snapshots: [], enabled: false, available: false });
            return;
        }
        const snapshots = await this.teamManager.readTeamSnapshots();
        const raidBoss = await this.teamManager.checkRaidBoss(snapshots);
        if (raidBoss.justCleared) {
            const result = this.devManager.teamRaidBossBonus();
            vscode.window.showInformationMessage(result.message);
            this.updateDeveloper();
        }
        this.panel.webview.postMessage({
            command: 'team-data',
            snapshots,
            enabled: this.teamManager.isEnabled(),
            available: this.teamManager.isAvailable(),
            ownEmail: this.teamManager.getOwnEmail(),
            raidBossHp: raidBoss.totalHp,
            raidBossPeakHp: raidBoss.peakHp
        });
    }
    /**
     * Cleans up resources when the panel is closed.
     */
    dispose() {
        DeveloperPanel.currentPanel = undefined;
        this.panel.dispose();
        while (this.disposables.length) {
            const x = this.disposables.pop();
            if (x)
                x.dispose();
        }
    }
    /**
     * Generates the complete HTML content for the webview.
     */
    getHtmlContent() {
        return `<!DOCTYPE html><html><head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap');

    :root {
      --bg-deep:    #080812;
      --bg-panel:   #0e0e1e;
      --bg-card:    #13132a;
      --neon-purple:#9d4edd;
      --neon-pink:  #e040fb;
      --neon-blue:  #00e5ff;
      --neon-gold:  #ffd740;
      --neon-green: #00e676;
      --neon-red:   #ff1744;
      --text-main:  #e8e8ff;
      --text-dim:   #7070a0;
      --border:     #2a2a4a;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Share Tech Mono', 'Courier New', monospace;
      background: var(--bg-deep);
      color: var(--text-main);
      padding: 16px;
      min-height: 100vh;
    }

    .container { max-width: 480px; margin: 0 auto; }

    /* ── HEADER CARD ── */
    .header-card {
      background: var(--bg-panel);
      border: 1px solid var(--border);
      border-top: 2px solid var(--neon-purple);
      border-radius: 4px;
      padding: 14px 14px 12px;
      margin-bottom: 12px;
      position: relative;
      overflow: hidden;
    }

    .profile-bar {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 10px;
    }

    .scene-wrap {
      position: relative;
      margin: 0 -14px;
      width: calc(100% + 28px);
    }
    #sceneCanvas {
      width: 100%;
      height: auto;
      display: block;
      image-rendering: pixelated;
      image-rendering: crisp-edges;
    }
    .scene-mood-badge {
      position: absolute;
      bottom: 8px;
      left: 10px;
      font-size: 18px;
      background: rgba(6, 6, 18, 0.75);
      border: 1px solid var(--border);
      border-radius: 3px;
      padding: 3px 6px;
      line-height: 1;
      cursor: pointer;
    }

    .dev-name {
      font-size: 18px;
      font-weight: bold;
      color: #fff;
      cursor: pointer;
      display: inline-block;
      letter-spacing: 1px;
      text-shadow: 0 0 8px rgba(157,78,221,0.6);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 180px;
    }
    .dev-name:hover { color: var(--neon-purple); }

    .dev-role {
      font-size: 11px;
      color: var(--text-dim);
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-bottom: 6px;
    }

    .level-badge {
      display: inline-block;
      background: linear-gradient(135deg, var(--neon-purple), #5c1da4);
      padding: 3px 12px;
      border-radius: 2px;
      font-size: 12px;
      font-weight: bold;
      color: white;
      letter-spacing: 2px;
      box-shadow: 0 0 10px rgba(157,78,221,0.5);
      margin-bottom: 8px;
    }

    .xp-row { display: flex; align-items: center; gap: 8px; }
    .xp-bar-wrap { flex: 1; background: #1a1a30; height: 6px; border-radius: 1px; overflow: hidden; }
    .xp-fill { height: 100%; background: linear-gradient(90deg, var(--neon-purple), var(--neon-pink)); transition: width 0.4s; box-shadow: 0 0 6px var(--neon-purple); }
    .xp-text { font-size: 10px; color: var(--text-dim); white-space: nowrap; }

    /* ── RESOURCES ROW ── */
    .resources-row {
      display: flex;
      gap: 10px;
      margin-top: 12px;
    }
    .resource-chip {
      flex: 1;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 8px 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .resource-icon { font-size: 18px; }
    .resource-label { font-size: 10px; color: var(--text-dim); text-transform: uppercase; letter-spacing: 1px; }
    .resource-value { font-size: 16px; font-weight: bold; color: var(--neon-gold); }

    /* ── ACTIVITY CALENDAR ── */
    .calendar-card {
      margin-top: 10px;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 8px 12px;
    }
    .calendar-title { font-size: 10px; color: var(--text-dim); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
    #streakCalCanvas { width: 100%; height: 60px; display: block; }
    .resource-streak .resource-value { color: var(--neon-pink); }

    /* ── STATS PANEL ── */
    .stats-panel {
      background: var(--bg-panel);
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 14px;
      margin-bottom: 12px;
    }
    .section-title {
      font-size: 10px;
      letter-spacing: 3px;
      color: var(--text-dim);
      text-transform: uppercase;
      margin-bottom: 12px;
      border-bottom: 1px solid var(--border);
      padding-bottom: 6px;
    }

    .stat-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
    }
    .stat-row:last-child { margin-bottom: 0; }

    .stat-icon { font-size: 14px; width: 20px; text-align: center; flex-shrink: 0; }
    .stat-name {
      font-size: 11px;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: var(--text-dim);
      width: 80px;
      flex-shrink: 0;
    }
    .stat-track {
      flex: 1;
      height: 10px;
      background: #1a1a30;
      border-radius: 1px;
      overflow: hidden;
      position: relative;
    }
    .stat-fill {
      height: 100%;
      border-radius: 1px;
      transition: width 0.4s ease;
    }
    .stat-fill.focus-fill      { background: linear-gradient(90deg, #5c1da4, var(--neon-purple)); box-shadow: 0 0 8px var(--neon-purple); }
    .stat-fill.motivation-fill { background: linear-gradient(90deg, #b35c00, var(--neon-gold));   box-shadow: 0 0 8px var(--neon-gold); }
    .stat-fill.energy-fill     { background: linear-gradient(90deg, #00638a, var(--neon-blue));   box-shadow: 0 0 8px var(--neon-blue); }
    .stat-fill.health-fill     { background: linear-gradient(90deg, #880e2a, var(--neon-red));    box-shadow: 0 0 8px var(--neon-red); }
    .stat-val {
      font-size: 12px;
      font-weight: bold;
      width: 36px;
      text-align: right;
      flex-shrink: 0;
    }

    /* ── BOTTOM ROW: QUEST + BOSS ── */
    .bottom-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 12px;
    }
    .mini-card {
      background: var(--bg-panel);
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 12px;
    }

    .quest-name {
      font-size: 11px;
      color: var(--text-main);
      margin-bottom: 8px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .quest-track {
      height: 6px;
      background: #1a1a30;
      border-radius: 1px;
      overflow: hidden;
    }
    .quest-fill {
      height: 100%;
      background: linear-gradient(90deg, #006633, var(--neon-green));
      box-shadow: 0 0 6px var(--neon-green);
      transition: width 0.4s;
    }
    .quest-pct { font-size: 10px; color: var(--text-dim); margin-top: 4px; text-align: right; }

    .boss-title {
      font-size: 10px;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: var(--neon-red);
      margin-bottom: 4px;
    }
    .boss-name { font-size: 13px; color: #ff7070; margin-bottom: 6px; }
    .boss-track {
      height: 8px;
      background: #1a1a30;
      border-radius: 1px;
      overflow: hidden;
      border: 1px solid #3a1010;
    }
    .boss-hp-fill {
      height: 100%;
      background: linear-gradient(90deg, #7a0000, var(--neon-red));
      box-shadow: 0 0 8px var(--neon-red);
      transition: width 0.3s;
    }

    /* Bug Boss mode — swaps in when there are real active lint/build errors */
    #bossCard.bug-mode {
      border-color: #4a3a10;
      box-shadow: 0 0 10px rgba(255,215,64,0.1);
    }
    #bossCard.bug-mode .boss-title { color: var(--neon-gold); }
    #bossCard.bug-mode .boss-name { color: #ffcf5c; }
    #bossCard.bug-mode .boss-track { border-color: #4a3a10; }
    #bossCard.bug-mode .boss-hp-fill {
      background: linear-gradient(90deg, #7a5a00, var(--neon-gold));
      box-shadow: 0 0 8px var(--neon-gold);
    }

    /* Merge Conflict Kraken mode — swaps in when the repo has real
       unresolved merge-conflict files; takes priority over Bug Boss since
       a live conflict is a blocking state. */
    #bossCard.kraken-mode {
      border-color: #0a3a4a;
      box-shadow: 0 0 10px rgba(64,200,255,0.12);
    }
    #bossCard.kraken-mode .boss-title { color: var(--neon-blue); }
    #bossCard.kraken-mode .boss-name { color: #6fe0ff; }
    #bossCard.kraken-mode .boss-track { border-color: #0a3a4a; }
    #bossCard.kraken-mode .boss-hp-fill {
      background: linear-gradient(90deg, #004a5e, var(--neon-blue));
      box-shadow: 0 0 8px var(--neon-blue);
    }

    /* Code Smell Boss mode — swaps in when open files are bloated past
       LONG_FILE_LINE_THRESHOLD lines; lowest priority of the three "real"
       bosses since it's a non-blocking chore, not an active error state. */
    #bossCard.smell-mode {
      border-color: #0a3a1a;
      box-shadow: 0 0 10px rgba(0,230,118,0.12);
    }
    #bossCard.smell-mode .boss-title { color: var(--neon-green); }
    #bossCard.smell-mode .boss-name { color: #6fffa8; }
    #bossCard.smell-mode .boss-track { border-color: #0a3a1a; }
    #bossCard.smell-mode .boss-hp-fill {
      background: linear-gradient(90deg, #005e2e, var(--neon-green));
      box-shadow: 0 0 8px var(--neon-green);
    }

    /* ── FOCUS SPRINT ── */
    .focus-card {
      background: var(--bg-panel);
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 12px 14px;
      margin-bottom: 12px;
      text-align: center;
    }
    .focus-desc { font-size: 10.5px; color: var(--text-dim); margin: 4px 0 10px; }
    .focus-btn-row { display: flex; gap: 8px; }
    .focus-len-btn {
      flex: 1;
      background: var(--bg-card);
      border: 1px solid var(--neon-purple);
      color: var(--text-main);
      font-family: inherit;
      font-size: 11px;
      letter-spacing: 1px;
      padding: 8px 4px;
      border-radius: 3px;
      cursor: pointer;
    }
    .focus-len-btn:hover { box-shadow: 0 0 10px rgba(157,78,221,0.4); }
    .focus-multiplier {
      float: right;
      font-size: 10px;
      color: var(--neon-gold);
      letter-spacing: 0.5px;
    }
    .focus-countdown {
      font-size: 30px;
      font-weight: bold;
      color: var(--neon-purple);
      text-shadow: 0 0 10px rgba(157,78,221,0.6);
      margin: 6px 0 10px;
      letter-spacing: 2px;
    }
    .focus-cancel-btn {
      background: var(--bg-card);
      border: 1px solid var(--neon-red);
      color: #ff7070;
      font-family: inherit;
      font-size: 10.5px;
      letter-spacing: 1px;
      padding: 7px 14px;
      border-radius: 3px;
      cursor: pointer;
    }
    .focus-cancel-btn:hover { box-shadow: 0 0 10px rgba(255,23,68,0.4); }
    .boss-hp-text { font-size: 10px; color: var(--text-dim); margin-top: 4px; text-align: right; }

    /* ── ACTION BUTTONS ── */
    .actions {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 12px;
    }

    button {
      cursor: pointer;
      border: none;
      border-radius: 3px;
      transition: all 0.15s;
      font-family: inherit;
    }

    .action-btn {
      background: var(--bg-card);
      border: 1px solid var(--border);
      color: var(--text-main);
      padding: 10px 6px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }
    .action-btn:hover {
      border-color: var(--neon-purple);
      box-shadow: 0 0 8px rgba(157,78,221,0.3);
      transform: translateY(-2px);
    }
    .action-icon { font-size: 20px; line-height: 1; }
    .action-label { font-size: 9px; letter-spacing: 1px; text-transform: uppercase; color: var(--text-dim); }

    /* ── CHALLENGE PANEL ── */
    .challenge-container {
      display: none;
      background: var(--bg-panel);
      border: 1px solid var(--neon-purple);
      border-radius: 4px;
      padding: 16px;
      margin-bottom: 12px;
      box-shadow: 0 0 16px rgba(157,78,221,0.15);
    }
    .challenge-container.active { display: block; }
    .challenge-menu { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 12px; }
    .challenge-btn {
      background: var(--bg-card);
      border: 1px solid var(--border);
      color: var(--text-main);
      padding: 18px 8px;
      font-size: 13px;
      font-family: inherit;
    }
    .challenge-btn:hover { border-color: var(--neon-purple); box-shadow: 0 0 8px rgba(157,78,221,0.3); }

    .bug-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; max-width: 280px; margin: 16px auto; }
    .bug-spot {
      height: 72px;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 4px;
      display: flex; align-items: center; justify-content: center;
      font-size: 36px;
      cursor: pointer;
      transition: all 0.1s;
    }
    .bug-spot:hover { border-color: var(--neon-purple); transform: scale(1.05); }
    .bug-spot:active { transform: scale(0.95); }

    .timer {
      font-size: 16px;
      font-weight: bold;
      color: var(--neon-blue);
      text-align: center;
      margin-bottom: 8px;
      letter-spacing: 2px;
    }

    /* ── BOSS BATTLE (in challenge) ── */
    .boss-container { text-align: center; padding: 10px 0; }
    .boss-sprite { font-size: 72px; margin-bottom: 8px; transition: transform 0.1s; display: inline-block; }
    .boss-hp-bar {
      width: 100%; height: 16px;
      background: #1a1a30;
      border-radius: 2px;
      overflow: hidden;
      margin-bottom: 16px;
      border: 1px solid #3a1010;
    }
    .boss-hp-fill-game {
      height: 100%;
      background: linear-gradient(90deg, #7a0000, var(--neon-red));
      box-shadow: 0 0 8px var(--neon-red);
      width: 100%;
      transition: width 0.2s;
    }
    .shake { animation: shake 0.4s; }
    @keyframes shake {
      0%,100% { transform: translate(0,0) rotate(0deg); }
      20%      { transform: translate(-4px,-2px) rotate(-2deg); }
      40%      { transform: translate(4px,2px) rotate(2deg); }
      60%      { transform: translate(-3px,1px) rotate(-1deg); }
      80%      { transform: translate(3px,-1px) rotate(1deg); }
    }

    /* ── NOTIFICATION ── */
    .notification {
      position: fixed;
      top: 16px; right: 16px;
      background: var(--bg-card);
      border: 1px solid var(--neon-purple);
      border-left: 3px solid var(--neon-purple);
      padding: 12px 16px;
      border-radius: 4px;
      box-shadow: 0 4px 16px rgba(157,78,221,0.3);
      animation: slideIn 0.25s ease;
      z-index: 1000;
      font-size: 13px;
      max-width: 260px;
    }
    @keyframes slideIn { from { transform: translateX(300px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }

    /* ── MODALS ── */
    .modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); z-index: 2000; }
    .modal.active { display: flex; align-items: center; justify-content: center; padding: 20px; }
    .modal-content {
      background: var(--bg-panel);
      border: 1px solid var(--neon-purple);
      border-top: 2px solid var(--neon-purple);
      padding: 24px;
      border-radius: 4px;
      width: 100%;
      max-width: 420px;
      box-shadow: 0 0 32px rgba(157,78,221,0.2);
    }
    .modal-content h3 {
      font-size: 14px;
      letter-spacing: 3px;
      text-transform: uppercase;
      color: var(--neon-purple);
      margin-bottom: 16px;
      padding-bottom: 10px;
      border-bottom: 1px solid var(--border);
    }
    .modal-input {
      width: 100%;
      padding: 10px;
      margin: 12px 0;
      background: var(--bg-card);
      color: var(--text-main);
      border: 1px solid var(--border);
      border-radius: 3px;
      font-size: 14px;
      font-family: inherit;
    }
    .modal-input:focus { outline: none; border-color: var(--neon-purple); }
    .settings-row { margin-bottom: 14px; text-align: left; }
    .settings-label {
      display: flex; align-items: center; gap: 8px;
      font-size: 13px; color: var(--text-main); cursor: pointer;
    }
    .settings-divider { height: 1px; background: var(--border); margin: 16px 0; }
    .modal-buttons { display: flex; gap: 10px; margin-top: 16px; }
    .modal-buttons button {
      flex: 1;
      padding: 10px;
      font-size: 12px;
      font-family: inherit;
      letter-spacing: 1px;
    }
    .modal-buttons button:first-child {
      background: var(--bg-card);
      border: 1px solid var(--border);
      color: var(--text-dim);
    }
    .modal-buttons button:last-child {
      background: linear-gradient(135deg, var(--neon-purple), #5c1da4);
      border: none;
      color: white;
      box-shadow: 0 0 10px rgba(157,78,221,0.4);
    }
    .modal-close-btn {
      width: 100%;
      margin-top: 14px;
      padding: 10px;
      background: var(--bg-card);
      border: 1px solid var(--border);
      color: var(--text-dim);
      font-size: 12px;
      font-family: inherit;
      letter-spacing: 1px;
    }
    .modal-close-btn:hover { border-color: var(--neon-purple); color: var(--text-main); }

    /* ── SHARE STATS CARD ── */
    .share-tabs { display: flex; gap: 8px; margin-bottom: 10px; }
    .share-tab {
      flex: 1;
      padding: 8px;
      font-size: 12px;
      font-family: inherit;
      letter-spacing: 0.5px;
      background: var(--bg-card);
      border: 1px solid var(--border);
      color: var(--text-dim);
      cursor: pointer;
    }
    .share-tab.active {
      border-color: var(--neon-purple);
      color: var(--text-main);
      box-shadow: 0 0 8px rgba(157,78,221,0.3);
    }
    .share-canvas-wrap {
      border: 1px solid var(--border);
      border-radius: 4px;
      overflow: hidden;
      line-height: 0;
    }
    #shareCanvas, #recapCanvas, #wrappedCanvas { width: 100%; height: auto; display: block; }
    .flex-share-btn {
      width: 100%;
      padding: 12px;
      font-size: 13px;
      font-family: inherit;
      letter-spacing: 1px;
      background: linear-gradient(135deg, #00e5ff, #9d4edd);
      border: none;
      color: #08080f;
      font-weight: bold;
      box-shadow: 0 0 12px rgba(0,229,255,0.35);
      cursor: pointer;
    }
    .standup-preview {
      background: var(--bg-deep);
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 14px;
      font-family: inherit;
      font-size: 12px;
      line-height: 1.7;
      color: var(--text-main);
      white-space: pre-wrap;
      word-break: break-word;
      max-height: 340px;
      overflow-y: auto;
      margin: 0;
    }
    .log-panel-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
    .standup-btn {
      padding: 5px 10px;
      font-size: 10px;
      letter-spacing: 0.5px;
      font-family: inherit;
      background: var(--bg-card);
      border: 1px solid var(--neon-blue);
      color: var(--neon-blue);
      border-radius: 3px;
      cursor: pointer;
      white-space: nowrap;
    }
    .standup-btn:hover { background: rgba(0,229,255,0.12); }

    /* ── SKILL / SHOP ITEMS ── */
    .skill-item {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 3px;
      padding: 12px;
      margin-bottom: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
    }
    .skill-item:hover { border-color: #3a3a6a; }
    .skill-info { text-align: left; min-width: 0; }
    .skill-name { font-weight: bold; font-size: 13px; display: block; margin-bottom: 3px; }
    .skill-desc { font-size: 11px; color: var(--text-dim); }
    .skill-btn {
      background: linear-gradient(135deg, var(--neon-purple), #5c1da4);
      border: none;
      color: white;
      padding: 6px 12px;
      font-size: 11px;
      font-family: inherit;
      border-radius: 2px;
      white-space: nowrap;
      box-shadow: 0 0 8px rgba(157,78,221,0.3);
    }
    .skill-btn:hover { box-shadow: 0 0 14px rgba(157,78,221,0.6); }
    .unlocked-badge { color: var(--neon-green); font-size: 11px; font-weight: bold; white-space: nowrap; }
    .active-badge { color: var(--neon-blue); font-size: 11px; white-space: nowrap; }
    .cant-afford { color: var(--neon-red); }

    /* ── LEADERBOARD ── */
    .leaderboard-table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 13px; }
    .leaderboard-table th, .leaderboard-table td { padding: 8px 10px; text-align: left; border-bottom: 1px solid var(--border); }
    .leaderboard-table th { color: var(--text-dim); font-size: 10px; letter-spacing: 2px; text-transform: uppercase; }
    .leaderboard-row.highlight { background: rgba(157,78,221,0.15); color: var(--neon-purple); font-weight: bold; }

    /* ── TEAM RAID BOSS ── */
    .raid-boss-card {
      background: var(--bg-panel);
      border: 1px solid #4a1010;
      border-radius: 4px;
      padding: 12px 14px;
      margin-bottom: 12px;
      text-align: center;
    }
    .raid-boss-title {
      font-size: 11px;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: var(--neon-red);
      margin-bottom: 8px;
    }
    .raid-boss-track {
      height: 10px;
      background: #1a1a30;
      border-radius: 1px;
      overflow: hidden;
      border: 1px solid #3a1010;
    }
    .raid-boss-fill {
      height: 100%;
      background: linear-gradient(90deg, #7a0000, var(--neon-red));
      box-shadow: 0 0 8px var(--neon-red);
      transition: width 0.3s;
    }
    .raid-boss-hp-text { font-size: 10px; color: var(--text-dim); margin-top: 6px; }
    .raid-boss-card.cleared { border-color: #006633; }
    .raid-boss-card.cleared .raid-boss-title { color: var(--neon-green); }
    .raid-boss-card.cleared .raid-boss-track { border-color: #006633; }
    .raid-boss-card.cleared .raid-boss-fill { background: linear-gradient(90deg, #006633, var(--neon-green)); box-shadow: 0 0 8px var(--neon-green); }

    /* ── QUESTS ── */
    .quest-item {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 3px;
      padding: 12px;
      margin-bottom: 8px;
    }
    .quest-header { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 8px; gap: 8px; }
    .quest-progress-bg { height: 6px; background: #1a1a30; border-radius: 1px; overflow: hidden; }
    .quest-progress-fill { height: 100%; background: linear-gradient(90deg, #006633, var(--neon-green)); box-shadow: 0 0 6px var(--neon-green); transition: width 0.3s; }
    .streak-badge { text-align: center; margin-bottom: 12px; font-size: 13px; color: var(--neon-pink); }

    /* ── TUTORIAL ── */
    .tutorial-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 9000; pointer-events: none; display: none; }
    .tutorial-overlay.active { display: block; }
    .tutorial-highlight { position: relative; z-index: 9001; box-shadow: 0 0 0 9999px rgba(0,0,0,0.88); pointer-events: none; border-radius: 4px; }
    .tutorial-box {
      position: fixed;
      bottom: 20px; left: 50%;
      transform: translateX(-50%);
      background: var(--bg-panel);
      border: 1px solid var(--neon-purple);
      border-top: 2px solid var(--neon-purple);
      padding: 20px;
      border-radius: 4px;
      z-index: 9002;
      width: 90%; max-width: 380px;
      text-align: center;
      box-shadow: 0 0 24px rgba(157,78,221,0.25);
      display: none;
    }
    .tutorial-box.active { display: block; }
    .tutorial-box h3 { color: var(--neon-purple); font-size: 14px; letter-spacing: 2px; margin-bottom: 8px; }
    .tutorial-box p { font-size: 12px; color: var(--text-dim); line-height: 1.5; }
    .tutorial-next-btn {
      margin-top: 14px;
      padding: 8px 24px;
      background: linear-gradient(135deg, var(--neon-purple), #5c1da4);
      border: none;
      color: white;
      font-family: inherit;
      font-size: 12px;
      letter-spacing: 1px;
      border-radius: 2px;
      box-shadow: 0 0 10px rgba(157,78,221,0.4);
    }

    /* ── EXIT GAME BTN ── */
    .exit-btn {
      width: 100%;
      margin-top: 10px;
      padding: 10px;
      background: var(--bg-card);
      border: 1px solid var(--border);
      color: var(--text-dim);
      font-family: inherit;
      font-size: 11px;
      letter-spacing: 1px;
    }
    .exit-btn:hover { border-color: var(--neon-red); color: var(--neon-red); }
    #btn-music.music-on {
      border-color: var(--neon-pink);
      box-shadow: 0 0 10px rgba(224,64,251,0.4);
    }
    #btn-music.music-on .action-label { color: var(--neon-pink); }

    @keyframes burnoutFlicker {
      0%,100% { opacity: 1; } 50% { opacity: 0.6; }
    }
    @keyframes burnoutPulse {
      0%,100% { opacity: 1; } 50% { opacity: 0.7; }
    }
    .burnout-active .stats-panel { border-color: var(--neon-red); box-shadow: 0 0 16px rgba(255,23,68,0.2); }
    .burnout-active .header-card { border-top-color: var(--neon-red); }
    .burnout-active .action-btn:not(#btn-break):not(#btn-coffee):not(#btn-music) {
      opacity: 0.35;
      pointer-events: none;
    }
    .burnout-active .action-btn:not(#btn-break):not(#btn-coffee):not(#btn-music)::after {
      content: '🔒';
      position: absolute;
      font-size: 10px;
    }
    .action-btn { position: relative; }

    /* Achievement items */
    .ach-item {
      display: flex; align-items: center; gap: 12px;
      padding: 10px 12px; margin-bottom: 6px;
      background: var(--bg-card); border: 1px solid var(--border); border-radius: 3px;
    }
    .ach-item.earned { border-color: var(--neon-gold); background: rgba(255,215,64,0.05); }
    .ach-icon { font-size: 24px; width: 32px; text-align:center; flex-shrink:0; }
    .ach-info { flex:1; min-width:0; }
    .ach-name { font-size: 13px; font-weight: bold; }
    .ach-desc { font-size: 11px; color: var(--text-dim); margin-top: 2px; }
    .ach-item.locked { opacity: 0.45; filter: grayscale(1); }

    /* Daily Login Calendar */
    .cal-grid {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 6px;
      margin-bottom: 12px;
    }
    .cal-cell {
      aspect-ratio: 1;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      background: var(--bg-card); border: 1px solid var(--border); border-radius: 3px;
      font-size: 10px; color: var(--text-dim);
    }
    .cal-cell .cal-day { font-size: 9px; letter-spacing: 0.5px; }
    .cal-cell .cal-icon { font-size: 15px; margin: 2px 0; }
    .cal-cell.claimed { border-color: var(--neon-green); background: rgba(0,255,65,0.08); color: var(--text-main); }
    .cal-cell.today { border-color: var(--neon-gold); box-shadow: 0 0 8px rgba(255,215,64,0.4); color: var(--text-main); }
    .cal-cell.milestone { border-color: var(--neon-pink); }
    .cal-cell.milestone.claimed { background: rgba(224,64,251,0.12); border-color: var(--neon-pink); }

    /* Log entries */
    .log-xp   { color: var(--neon-purple); }
    .log-coffee { color: var(--neon-gold); }
    .log-event  { color: var(--neon-blue); }
    .log-achievement { color: var(--neon-pink); }
    .log-burnout { color: var(--neon-red); }
    .log-time { color: var(--text-dim); font-size: 10px; margin-left: 6px; }

    /* ── CHALLENGE AREA INPUTS ── */
    .challenge-input {
      width: 100%;
      padding: 10px;
      background: var(--bg-card);
      color: var(--text-main);
      border: 1px solid var(--neon-purple);
      border-radius: 3px;
      font-size: 14px;
      font-family: inherit;
    }
    .challenge-input:focus { outline: none; box-shadow: 0 0 8px rgba(157,78,221,0.4); }
    .code-snippet {
      background: var(--bg-deep);
      border: 1px solid var(--border);
      padding: 12px;
      border-radius: 3px;
      font-family: monospace;
      font-size: 14px;
      margin: 12px 0;
      color: var(--neon-blue);
      letter-spacing: 0.5px;
    }
    </style></head>
    <body>
      <div class="container">

        <!-- ── HEADER: avatar + name + level + XP ── -->
        <div class="header-card">
          <!-- Name + Level row above scene -->
          <div class="profile-bar">
            <div>
              <div class="dev-role" id="devClassLabel">Junior Developer</div>
              <div id="devName" class="dev-name" onclick="showRenameModal()" title="Click to rename">Dev</div>
            </div>
            <div style="text-align:right; flex-shrink:0;">
              <div class="level-badge" id="levelBadge">LEVEL 1</div>
              <div class="xp-row" style="justify-content:flex-end; margin-top:4px;">
                <div class="xp-bar-wrap" style="max-width:120px;"><div id="xpBar" class="xp-fill" style="width:0%"></div></div>
                <div class="xp-text" id="xpText">0 / 100 XP</div>
              </div>
              <button id="prestigeBtn" onclick="doPrestige()" title="Reset to Level 1 for a permanent +5% XP badge" style="display:none; margin-top:6px; background:var(--bg-card); border:1px solid var(--neon-gold); color:var(--neon-gold); font-family:inherit; font-size:10.5px; letter-spacing:1px; padding:5px 10px; border-radius:3px; cursor:pointer;">🌟 PRESTIGE</button>
            </div>
          </div>
          <!-- Pixel art scene canvas -->
          <div class="scene-wrap">
            <canvas id="sceneCanvas" width="440" height="200"></canvas>
            <div id="devAvatar" class="scene-mood-badge" onclick="showRenameModal()" title="Click to rename">👨‍💻</div>
          </div>
          <div class="resources-row">
            <div class="resource-chip">
              <div class="resource-icon">☕</div>
              <div>
                <div class="resource-label">Coffee Beans</div>
                <div class="resource-value" id="coffeeVal">50</div>
              </div>
            </div>
            <div class="resource-chip resource-streak">
              <div class="resource-icon">🔥</div>
              <div>
                <div class="resource-label">Daily Streak</div>
                <div class="resource-value" id="streakVal">0 days</div>
              </div>
            </div>
          </div>
          <div class="calendar-card">
            <div class="calendar-title">📅 Activity</div>
            <canvas id="streakCalCanvas" width="400" height="60"></canvas>
          </div>
        </div>

        <!-- ── STATS ── -->
        <div class="stats-panel">
          <div class="section-title">◈ Stats</div>
          <div class="stat-row">
            <div class="stat-icon">🎯</div>
            <div class="stat-name">Focus</div>
            <div class="stat-track"><div id="focusBar" class="stat-fill focus-fill" style="width:100%"></div></div>
            <div class="stat-val" id="focusText" style="color:var(--neon-purple)">100</div>
          </div>
          <div class="stat-row">
            <div class="stat-icon">⭐</div>
            <div class="stat-name">Motivation</div>
            <div class="stat-track"><div id="motivationBar" class="stat-fill motivation-fill" style="width:100%"></div></div>
            <div class="stat-val" id="motivationText" style="color:var(--neon-gold)">100</div>
          </div>
          <div class="stat-row">
            <div class="stat-icon">⚡</div>
            <div class="stat-name">Energy</div>
            <div class="stat-track"><div id="energyBar" class="stat-fill energy-fill" style="width:100%"></div></div>
            <div class="stat-val" id="energyText" style="color:var(--neon-blue)">100</div>
          </div>
          <div class="stat-row">
            <div class="stat-icon">💪</div>
            <div class="stat-name">Health</div>
            <div class="stat-track"><div id="healthBar" class="stat-fill health-fill" style="width:100%"></div></div>
            <div class="stat-val" id="healthText" style="color:var(--neon-red)">100</div>
          </div>
        </div>

        <!-- ── ACTIVE QUEST + BURNOUT BOSS ── -->
        <div class="bottom-row">
          <div class="mini-card">
            <div class="section-title">◈ Active Quest</div>
            <div class="quest-name" id="activeQuestName">No active quest</div>
            <div class="quest-track"><div id="activeQuestBar" class="quest-fill" style="width:0%"></div></div>
            <div class="quest-pct" id="activeQuestPct">—</div>
          </div>
          <div class="mini-card" id="bossCard">
            <div class="boss-title" id="bossTitleDisplay">☠ Burnout Boss</div>
            <div class="boss-name" id="bossNameDisplay">Overwhelmulus</div>
            <div class="boss-track"><div id="bossHealthBar" class="boss-hp-fill" style="width:60%"></div></div>
            <div class="boss-hp-text" id="bossHealthText">300 / 500 HP</div>
          </div>
        </div>

        <!-- ── FOCUS SPRINT (Pomodoro-style timed XP boost) ── -->
        <div class="focus-card" id="focusCard">
          <div id="focusInactive">
            <div class="section-title">◈ Focus Sprint</div>
            <div class="focus-desc">Run a timed sprint for 1.5x XP and slower Focus decay.</div>
            <div class="focus-btn-row">
              <button class="focus-len-btn" onclick="startFocusSprint(15)">15 MIN</button>
              <button class="focus-len-btn" onclick="startFocusSprint(25)">25 MIN</button>
              <button class="focus-len-btn" onclick="startFocusSprint(50)">50 MIN</button>
            </div>
          </div>
          <div id="focusActive" style="display:none">
            <div class="section-title">◈ Focus Sprint <span class="focus-multiplier">1.5x XP</span></div>
            <div class="focus-countdown" id="focusCountdown">25:00</div>
            <button class="focus-cancel-btn" onclick="cancelFocusSprint()">CANCEL SPRINT</button>
          </div>
        </div>

        <!-- ── ACTIONS ── -->
        <div class="actions">
          <button id="btn-coffee" class="action-btn" onclick="giveCoffee()" title="Give coffee (10 beans)">
            <div class="action-icon">☕</div><div class="action-label">Coffee</div>
          </button>
          <button id="btn-games" class="action-btn" onclick="toggleChallenges()" title="Coding challenges">
            <div class="action-icon">🎯</div><div class="action-label">Games</div>
          </button>
          <button id="btn-break" class="action-btn" onclick="takeBreak()" title="Take a break">
            <div class="action-icon">🌴</div><div class="action-label">Break</div>
          </button>
          <button id="btn-skills" class="action-btn" onclick="showSkills()" title="Skill Tree">
            <div class="action-icon">⚡</div><div class="action-label">Skills</div>
          </button>
          <button id="btn-shop" class="action-btn" onclick="showShop()" title="Shop">
            <div class="action-icon">🛍️</div><div class="action-label">Shop</div>
          </button>
          <button id="btn-rank" class="action-btn" onclick="showLeaderboard()" title="Leaderboard">
            <div class="action-icon">🏆</div><div class="action-label">Rank</div>
          </button>
          <button id="btn-quests" class="action-btn" onclick="showQuests()" title="Daily Quests">
            <div class="action-icon">📜</div><div class="action-label">Quests</div>
          </button>
          <button id="btn-music" class="action-btn" onclick="toggleMusic()" title="Toggle cyberpunk music">
            <div class="action-icon" id="musicIcon">🎵</div><div class="action-label" id="musicLabel">Music</div>
          </button>
          <button id="btn-achievements" class="action-btn" onclick="showAchievements()" title="Achievements">
            <div class="action-icon">🏅</div><div class="action-label">Awards</div>
          </button>
          <button id="btn-calendar" class="action-btn" onclick="showDailyCalendar()" title="Daily Login Calendar">
            <div class="action-icon">📅</div><div class="action-label">Calendar</div>
          </button>
          <button id="btn-story" class="action-btn" onclick="showStory()" title="The Legacy Code Dungeon">
            <div class="action-icon">📖</div><div class="action-label">Story</div>
          </button>
          <button id="btn-log" class="action-btn" onclick="toggleLog()" title="Activity Log">
            <div class="action-icon">📡</div><div class="action-label">Log</div>
          </button>
          <button id="btn-share" class="action-btn" onclick="showShareModal()" title="Share your stats">
            <div class="action-icon">📤</div><div class="action-label">Share</div>
          </button>
          <button id="btn-settings" class="action-btn" onclick="showSettingsModal()" title="Settings">
            <div class="action-icon">⚙️</div><div class="action-label">Settings</div>
          </button>
          <button id="btn-team" class="action-btn" onclick="showTeamModal()" title="Team" style="display:none;">
            <div class="action-icon">👥</div><div class="action-label">Team</div>
          </button>
          <button id="btn-sponsor" class="action-btn" onclick="openSponsors()" title="Buy the dev a coffee — opens GitHub Sponsors, +25 beans for checking it out (once/day)">
            <div class="action-icon">💖</div><div class="action-label">Sponsor</div>
          </button>
        </div>

        <!-- ── CHALLENGE PANEL ── -->
        <div id="challengeContainer" class="challenge-container">
          <div class="section-title" style="margin-bottom:12px;">◈ Coding Challenges</div>
          <div id="challengeMenu" class="challenge-menu">
            <button class="challenge-btn" onclick="startBugHunt()">🐛<br><span style="font-size:10px;letter-spacing:1px;">BUG HUNT</span></button>
            <button class="challenge-btn" onclick="startSpeedTest()">⚡<br><span style="font-size:10px;letter-spacing:1px;">SPEED TEST</span></button>
            <button class="challenge-btn" onclick="startBossBattle()">👾<br><span style="font-size:10px;letter-spacing:1px;">BOSS BATTLE</span></button>
          </div>
          <div id="challengeArea" style="display:none"></div>
          <button class="exit-btn" onclick="backToMenu()">EXIT GAME</button>
        </div>

      </div><!-- /container -->

      <!-- ── MODALS ── -->
      <div id="renameModal" class="modal">
        <div class="modal-content">
          <h3>Rename Developer</h3>
          <input type="text" id="nameInput" class="modal-input" placeholder="Enter new name" maxlength="20">
          <div class="modal-buttons">
            <button onclick="closeRenameModal()">CANCEL</button>
            <button onclick="submitRename()">SAVE</button>
          </div>
        </div>
      </div>

      <div id="skillsModal" class="modal">
        <div class="modal-content" style="max-width:480px">
          <h3>Skill Tree</h3>
          <div id="skillsList"></div>
          <button class="modal-close-btn" onclick="closeSkillsModal()">CLOSE</button>
        </div>
      </div>

      <div id="shopModal" class="modal">
        <div class="modal-content" style="max-width:480px">
          <h3>Coffee Shop</h3>
          <div id="shopList"></div>
          <button class="modal-close-btn" onclick="closeShopModal()">CLOSE</button>
        </div>
      </div>

      <div id="leaderboardModal" class="modal">
        <div class="modal-content" style="max-width:380px">
          <h3>🏆 Global Leaderboard</h3>
          <table class="leaderboard-table">
            <thead><tr><th>#</th><th>Dev</th><th>Lvl</th></tr></thead>
            <tbody id="leaderboardBody"></tbody>
          </table>
          <button class="modal-close-btn" onclick="closeLeaderboardModal()">CLOSE</button>
        </div>
      </div>

      <div id="questsModal" class="modal">
        <div class="modal-content" style="max-width:380px">
          <h3>📜 Daily Quests</h3>
          <div id="questsList"></div>
          <button class="modal-close-btn" onclick="closeQuestsModal()">CLOSE</button>
        </div>
      </div>

      <!-- ── BURNOUT OVERLAY ── -->
      <div id="burnoutOverlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:500; background: repeating-linear-gradient(0deg, rgba(255,23,68,0.03) 0px, rgba(255,23,68,0.03) 1px, transparent 1px, transparent 4px); animation: burnoutFlicker 0.15s infinite;"></div>
      <div id="burnoutBanner" style="display:none; background: linear-gradient(90deg, #7a0000, #ff1744); padding: 10px 16px; margin-bottom: 10px; border-radius: 3px; font-size: 12px; letter-spacing: 2px; text-align:center; animation: burnoutPulse 1s ease-in-out infinite;">
        ☠ CRITICAL BURNOUT — TAKE A BREAK TO RECOVER ☠
      </div>
      <div id="vacationBanner" style="display:none; background: linear-gradient(90deg, #0d4d3a, #14a67a); padding: 10px 16px; margin-bottom: 10px; border-radius: 3px; font-size: 12px; letter-spacing: 1px; text-align:center;">
        🌴 VACATION MODE — stats and streak are frozen. Turn it off in Settings when you're back.
      </div>
      <div id="seasonalBanner" onclick="showQuests()" style="display:none; cursor:pointer; padding: 10px 16px; margin-bottom: 10px; border-radius: 3px; font-size: 12px; letter-spacing: 1px; text-align:center; font-weight:bold;">
        <span id="seasonalBannerText"></span>
      </div>
      <div id="affixBanner" title="This week's Boss Affix — a mutator that rotates automatically every Monday" style="display:none; background: linear-gradient(90deg, #3a0a4a, #7a1fae); padding: 10px 16px; margin-bottom: 10px; border-radius: 3px; font-size: 12px; letter-spacing: 1px; text-align:center; font-weight:bold; color:#f0e0ff;">
        <span id="affixBannerText"></span>
      </div>

      <!-- ── ACTIVITY LOG ── -->
      <div id="logPanel" style="display:none; background:var(--bg-panel); border:1px solid var(--border); border-top:2px solid var(--neon-blue); border-radius:4px; padding:14px; margin-bottom:12px;">
        <div class="log-panel-header">
          <div class="section-title" style="color:var(--neon-blue); margin-bottom:0; border-bottom:none; padding-bottom:0;">◈ Activity Log</div>
          <button class="standup-btn" onclick="showShareModal('standup')" title="Turn today's log into a Slack standup">📋 Standup</button>
        </div>
        <div id="logEntries" style="max-height:180px; overflow-y:auto; font-size:11px; line-height:1.8;"></div>
      </div>

      <!-- ── ACHIEVEMENTS MODAL ── -->
      <div id="achievementsModal" class="modal">
        <div class="modal-content" style="max-width:460px">
          <h3>🏅 Achievements</h3>
          <div id="achievementsList" style="max-height:400px; overflow-y:auto;"></div>
          <button class="modal-close-btn" onclick="closeAchievementsModal()">CLOSE</button>
        </div>
      </div>

      <!-- ── DAILY LOGIN CALENDAR MODAL ── -->
      <div id="dailyCalendarModal" class="modal">
        <div class="modal-content" style="max-width:460px">
          <h3>📅 Daily Login Calendar</h3>
          <div id="dailyCalendarSubtitle" style="font-size:11px; color:var(--text-dim); margin-bottom:12px;">Log in on consecutive days to climb the calendar. Day 30 pays out big.</div>
          <div id="dailyCalendarGrid" class="cal-grid"></div>
          <button class="modal-close-btn" onclick="closeDailyCalendar()">CLOSE</button>
        </div>
      </div>

      <!-- ── STORY MODAL (The Legacy Code Dungeon) ── -->
      <div id="storyModal" class="modal">
        <div class="modal-content" style="max-width:480px">
          <h3>📖 The Legacy Code Dungeon</h3>
          <div id="storyCurrentCard" style="background:var(--bg-card); border:1px solid var(--border); border-radius:4px; padding:14px; margin-bottom:14px;"></div>
          <div id="storyChapterList" style="max-height:220px; overflow-y:auto;"></div>
          <button class="modal-close-btn" onclick="closeStory()">CLOSE</button>
        </div>
      </div>

      <!-- ── SHARE STATS CARD MODAL ── -->
      <div id="shareModal" class="modal">
        <div class="modal-content" style="max-width:640px">
          <h3>📤 Share Your Stats</h3>
          <div class="share-tabs">
            <button id="shareTabStats" class="share-tab active" onclick="switchShareTab('stats')">🕹️ Stats Card</button>
            <button id="shareTabRecap" class="share-tab" onclick="switchShareTab('recap')">📊 Weekly Recap</button>
            <button id="shareTabWrapped" class="share-tab" onclick="switchShareTab('wrapped')">🎁 Year Wrapped</button>
            <button id="shareTabStandup" class="share-tab" onclick="switchShareTab('standup')">📋 Standup</button>
          </div>
          <div class="share-canvas-wrap" id="shareCanvasWrap">
            <canvas id="shareCanvas" width="1200" height="630"></canvas>
            <canvas id="recapCanvas" width="1200" height="630" style="display:none"></canvas>
            <canvas id="wrappedCanvas" width="1200" height="630" style="display:none"></canvas>
          </div>
          <div id="standupWrap" style="display:none;">
            <pre id="standupPreview" class="standup-preview"></pre>
          </div>
          <div class="modal-buttons" id="flexButtonRow" style="margin-top:12px;">
            <button class="flex-share-btn" onclick="flexShare()">🐦 FLEX THIS — COPY CAPTION + SAVE IMAGE</button>
          </div>
          <div class="modal-buttons" id="standupButtonRow" style="margin-top:12px; display:none;">
            <button class="flex-share-btn" onclick="copyStandup()">📋 COPY FOR SLACK</button>
          </div>
          <div class="modal-buttons" id="statsExtraButtons" style="margin-top:8px;">
            <button onclick="copyStatsMarkdown()">📋 COPY AS MARKDOWN</button>
            <button onclick="saveStatsImage()">🖼️ SAVE AS IMAGE</button>
          </div>
          <button class="modal-close-btn" onclick="closeShareModal()">CLOSE</button>
        </div>
      </div>

      <!-- ── SETTINGS MODAL ── -->
      <div id="settingsModal" class="modal">
        <div class="modal-content" style="max-width:420px">
          <h3>⚙️ Settings</h3>
          <div class="settings-row">
            <label class="settings-label">
              <input type="checkbox" id="setWeeklyRecap"> Weekly Recap notifications
            </label>
          </div>
          <div class="settings-row">
            <label class="settings-label">
              <input type="checkbox" id="setReduceNotifications"> Reduce achievement notifications
            </label>
          </div>
          <div class="settings-row">
            <label class="settings-label" style="display:block; margin-bottom:6px; cursor:default;">Stat decay speed</label>
            <select id="setDecayRate" class="modal-input">
              <option value="relaxed">Relaxed (slower decay)</option>
              <option value="normal">Normal</option>
              <option value="intense">Intense (faster decay)</option>
            </select>
          </div>
          <div class="modal-buttons" style="margin-top:8px;">
            <button onclick="closeSettingsModal()">CANCEL</button>
            <button onclick="saveSettingsForm()">SAVE</button>
          </div>
          <div class="settings-divider"></div>
          <div class="settings-row">
            <label class="settings-label">
              <input type="checkbox" id="setVacationMode" onchange="toggleVacationModeFromSettings()"> 🌴 Vacation Mode (freeze stats &amp; streak)
            </label>
            <div style="font-size:11px; color:var(--text-dim); margin-top:4px; padding-left:24px;">
              Takes effect immediately — good for trips or time off where you don't want to lose your streak or burn out.
            </div>
          </div>
          <div class="settings-divider"></div>
          <div class="settings-row" id="teamSettingsRow" style="display:none;">
            <label class="settings-label">
              <input type="checkbox" id="setTeamMode" onchange="toggleTeamModeFromSettings()"> 👥 Team Mode (share progress via git)
            </label>
            <div style="font-size:11px; color:var(--text-dim); margin-top:4px; padding-left:24px;">
              Writes your progress to <code>.devgotchi/team/</code> in this repo, shared the next time you commit and push. No server — visible to anyone with repo access.
            </div>
          </div>
          <div class="settings-divider" id="teamSettingsDivider" style="display:none;"></div>
          <div class="settings-row">
            <label class="settings-label" style="display:block; margin-bottom:8px; cursor:default;">Progress data</label>
            <div class="modal-buttons">
              <button onclick="exportProgress()">💾 EXPORT</button>
              <button onclick="importProgress()">📂 IMPORT</button>
            </div>
          </div>
          <div class="settings-row">
            <label class="settings-label" style="display:block; margin-bottom:8px; cursor:default;">💼 Timesheet Mode</label>
            <div class="modal-buttons">
              <button onclick="exportTimesheet()">📊 EXPORT TIMESHEET (CSV)</button>
            </div>
            <div style="font-size:11px; color:var(--text-dim); margin-top:4px;">
              Billable hours per day, tracked from real (non-idle) coding time. No rate applied — just honest hours.
            </div>
          </div>
          <button class="modal-close-btn" style="margin-top:14px; color:var(--neon-pink); border-color:var(--neon-pink);" onclick="confirmResetProgress()">RESET ALL PROGRESS</button>
          <div class="settings-row" style="text-align:center; margin-top:14px; margin-bottom:0;">
            <a href="#" onclick="sendFeedback(); return false;" style="color:var(--neon-blue); font-size:12px; text-decoration:underline; cursor:pointer;">💬 Send Feedback / Report a Bug</a>
          </div>
          <div class="settings-row" style="text-align:center; margin-top:8px; margin-bottom:0;">
            <a href="#" onclick="openSponsors(); return false;" style="color:var(--neon-pink); font-size:12px; text-decoration:underline; cursor:pointer;">💖 Support DevGotchi on GitHub Sponsors</a>
          </div>
        </div>
      </div>

      <!-- ── TEAM MODAL ── -->
      <div id="teamModal" class="modal">
        <div class="modal-content" style="max-width:420px">
          <h3>👥 Team</h3>
          <div id="teamContent" style="font-size:12px; color:var(--text-dim); text-align:center; padding:12px 0;">Loading…</div>
          <button class="modal-close-btn" onclick="closeTeamModal()">CLOSE</button>
        </div>
      </div>

      <div id="tutorialOverlay" class="tutorial-overlay"></div>
      <div id="tutorialBox" class="tutorial-box">
        <h3 id="tutTitle">Welcome!</h3>
        <p id="tutText">Let's take a quick tour of DevGotchi.</p>
        <button class="tutorial-next-btn" onclick="nextTutorialStep()">NEXT →</button>
      </div>
      
      <script>
        const vscode = acquireVsCodeApi();
        let currentChallenge = null;
        let currentDev = null;
        let currentSettings = null;
        let teamAvailable = false;
        let teamEnabled = false;
        let currentSeasonalStatus = null;
        let currentLegacyDungeon = null;
        const SKILLS = ${JSON.stringify(SKILLS)};
        const SHOP_ITEMS = ${JSON.stringify(SHOP_ITEMS)};
        const CLASSES = ${JSON.stringify(CLASSES)};
        const CLASS_RESPEC_COST = ${CLASS_RESPEC_COST};

        // ── SETTINGS ──
        function showSettingsModal() {
          document.getElementById('settingsModal').classList.add('active');
          renderSettings();
        }
        function closeSettingsModal() { document.getElementById('settingsModal').classList.remove('active'); }
        function renderSettings() {
          if (currentSettings) {
            document.getElementById('setWeeklyRecap').checked = currentSettings.weeklyRecapEnabled !== false;
            document.getElementById('setReduceNotifications').checked = !!currentSettings.reduceNotifications;
            document.getElementById('setDecayRate').value = currentSettings.decayRate || 'normal';
          }
          if (currentDev) {
            document.getElementById('setVacationMode').checked = !!currentDev.vacationMode;
          }
          const teamRow = document.getElementById('teamSettingsRow');
          const teamDivider = document.getElementById('teamSettingsDivider');
          if (teamAvailable || teamEnabled) {
            teamRow.style.display = 'block';
            teamDivider.style.display = 'block';
            document.getElementById('setTeamMode').checked = teamEnabled;
          } else {
            teamRow.style.display = 'none';
            teamDivider.style.display = 'none';
          }
        }
        function saveSettingsForm() {
          const settings = {
            weeklyRecapEnabled: document.getElementById('setWeeklyRecap').checked,
            reduceNotifications: document.getElementById('setReduceNotifications').checked,
            decayRate: document.getElementById('setDecayRate').value
          };
          vscode.postMessage({ command: 'save-settings', settings });
          closeSettingsModal();
        }
        function exportProgress() { vscode.postMessage({ command: 'export-progress' }); }
        function importProgress() { vscode.postMessage({ command: 'import-progress' }); }
        function exportTimesheet() { vscode.postMessage({ command: 'export-timesheet' }); }
        function confirmResetProgress() { vscode.postMessage({ command: 'reset-progress' }); }
        function doPrestige() { vscode.postMessage({ command: 'prestige' }); }
        function importQuestPack() { vscode.postMessage({ command: 'import-quest-pack' }); }
        function importQuestPackFromUrl() { vscode.postMessage({ command: 'import-quest-pack-url' }); }
        function removeQuestPack(packId) { vscode.postMessage({ command: 'remove-quest-pack', packId: packId }); }

        // Vacation Mode takes effect immediately on toggle, unlike the other
        // settings above which batch into the SAVE button — it's live game
        // state, not a persisted preference, so it shouldn't wait for Save.
        function toggleVacationModeFromSettings() {
          const enabled = document.getElementById('setVacationMode').checked;
          vscode.postMessage({ command: 'toggle-vacation-mode', enabled });
        }

        function sendFeedback() { vscode.postMessage({ command: 'open-feedback' }); }
        function openSponsors() { vscode.postMessage({ command: 'open-sponsors' }); }

        // ── TEAM MODE ──
        // Like Vacation Mode, this takes effect immediately rather than
        // waiting for Settings' SAVE button — it's a live workspace-scoped
        // toggle, not a batched preference.
        function toggleTeamModeFromSettings() {
          vscode.postMessage({ command: 'toggle-team-mode' });
        }
        function showTeamModal() {
          document.getElementById('teamModal').classList.add('active');
          document.getElementById('teamContent').innerHTML = 'Loading…';
          vscode.postMessage({ command: 'get-team-data' });
        }
        function closeTeamModal() { document.getElementById('teamModal').classList.remove('active'); }
        function renderTeamData(data) {
          const el = document.getElementById('teamContent');
          if (!data.enabled) {
            el.innerHTML = '<p>Team Mode is off. Turn it on in Settings to share your progress with teammates via git — no server involved.</p>';
            return;
          }
          if (!data.snapshots || data.snapshots.length === 0) {
            el.innerHTML = '<p>No teammates found yet. Once you and a teammate both enable Team Mode and push/pull, you\\'ll show up here.</p>';
            return;
          }
          let html = '';
          // Raid Boss: only worth showing once there's more than one
          // teammate contributing — a "team" of one is just the regular
          // Bug Boss card already on the main panel.
          if (data.snapshots.length > 1) {
            const hp = data.raidBossHp || 0;
            const peak = Math.max(data.raidBossPeakHp || 0, hp, 1);
            const pct = hp === 0 ? 0 : Math.max(4, Math.round((hp / peak) * 100));
            const cleared = hp === 0;
            html += '<div class="raid-boss-card' + (cleared ? ' cleared' : '') + '">';
            html += '<div class="raid-boss-title">' + (cleared ? '🎉 Raid Boss Defeated!' : '👹 Team Raid Boss') + '</div>';
            html += '<div class="raid-boss-track"><div class="raid-boss-fill" style="width:' + pct + '%"></div></div>';
            html += '<div class="raid-boss-hp-text">' + hp + ' combined bug' + (hp === 1 ? '' : 's') + ' across the team</div>';
            html += '</div>';
          }
          html += '<table class="leaderboard-table"><thead><tr><th>Dev</th><th>Lvl</th><th>Streak</th><th>Bugs</th></tr></thead><tbody>';
          data.snapshots.forEach(s => {
            const isYou = data.ownEmail && s.email === data.ownEmail;
            html += '<tr' + (isYou ? ' style="color:var(--neon-gold)"' : '') + '><td>' + (s.name || s.email) + (isYou ? ' (you)' : '') + '</td><td>' + s.level + '</td><td>🔥 ' + (s.streak || 0) + '</td><td>' + (s.activeErrorCount || 0) + '</td></tr>';
          });
          html += '</tbody></table>';
          el.innerHTML = html;
        }

        function giveCoffee() { vscode.postMessage({ command: 'coffee' }); }
        function takeBreak() { vscode.postMessage({ command: 'break' }); }
        function buyItem(id) { vscode.postMessage({ command: 'buy-item', itemId: id }); }
        function equipItem(id) { vscode.postMessage({ command: 'equip-item', itemId: id }); }
        function toggleChallenges() { document.getElementById('challengeContainer').classList.toggle('active'); }

        // ── FOCUS SPRINT (Pomodoro-style timed XP boost) ──
        function startFocusSprint(minutes) { vscode.postMessage({ command: 'start-focus-sprint', minutes }); }
        function cancelFocusSprint() { vscode.postMessage({ command: 'cancel-focus-sprint' }); }
        function formatMMSS(ms) {
          const total = Math.max(0, Math.ceil(ms / 1000));
          const m = Math.floor(total / 60);
          const s = total % 60;
          return m + ':' + String(s).padStart(2, '0');
        }
        function updateFocusUI() {
          if (!currentDev) return;
          const remaining = (currentDev.focusSprintEndsAt || 0) - Date.now();
          const active = remaining > 0;
          document.getElementById('focusInactive').style.display = active ? 'none' : 'block';
          document.getElementById('focusActive').style.display = active ? 'block' : 'none';
          if (active) {
            document.getElementById('focusCountdown').textContent = formatMMSS(remaining);
          }
        }
        setInterval(updateFocusUI, 1000);
        
        function showRenameModal() {
          document.getElementById('renameModal').classList.add('active');
          document.getElementById('nameInput').value = document.getElementById('devName').textContent;
          document.getElementById('nameInput').focus();
        }

        function closeRenameModal() {
          document.getElementById('renameModal').classList.remove('active');
        }

        function submitRename() {
          const newName = document.getElementById('nameInput').value.trim();
          if (newName && newName.length > 0) {
            vscode.postMessage({ command: 'rename', name: newName });
            closeRenameModal();
          }
        }

        document.getElementById('nameInput').addEventListener('keypress', (e) => {
          if (e.key === 'Enter') submitRename();
        });
        
        function backToMenu() { 
          document.getElementById('challengeMenu').style.display = 'grid';
          document.getElementById('challengeArea').style.display = 'none';
          if (currentChallenge) clearInterval(currentChallenge.interval);
        }

        function showSkills() {
          document.getElementById('skillsModal').classList.add('active');
          renderSkills();
        }
        function closeSkillsModal() { document.getElementById('skillsModal').classList.remove('active'); }
        
        function renderSkills() {
          const list = document.getElementById('skillsList');
          list.innerHTML = '';
          if (!currentDev) return;
          
          SKILLS.forEach(skill => {
            const unlocked = currentDev.skills && currentDev.skills.includes(skill.id);
            const canAfford = currentDev.coffee >= skill.cost;
            const costHtml = canAfford ? skill.cost : '<span class="cant-afford">' + skill.cost + '</span>';
            const btnHtml = unlocked
              ? '<span class="unlocked-badge">✓ UNLOCKED</span>'
              : '<button class="skill-btn" onclick="unlockSkill(\\'' + skill.id + '\\')">UNLOCK (' + costHtml + '☕)</button>';
            
            list.innerHTML += '<div class="skill-item"><div class="skill-info"><span class="skill-name">' + skill.name + '</span><span class="skill-desc">' + skill.description + '</span></div><div>' + btnHtml + '</div></div>';
          });
        }

        function unlockSkill(id) {
          vscode.postMessage({ command: 'unlock-skill', skillId: id });
        }

        function showShop() {
          document.getElementById('shopModal').classList.add('active');
          renderShop();
        }
        function closeShopModal() { document.getElementById('shopModal').classList.remove('active'); }

        function chooseClass() {
          vscode.postMessage({ command: 'choose-class' });
        }

        function renderShop() {
          const list = document.getElementById('shopList');
          list.innerHTML = '';
          if (!currentDev) return;

          const classInfo = CLASSES.find(c => c.id === currentDev.characterClass);
          const classCostHtml = currentDev.coffee >= CLASS_RESPEC_COST ? CLASS_RESPEC_COST : '<span class="cant-afford">' + CLASS_RESPEC_COST + '</span>';
          const classBtnHtml = classInfo
            ? '<button class="skill-btn" onclick="chooseClass()">RESPEC (' + classCostHtml + '☕)</button>'
            : '<button class="skill-btn" onclick="chooseClass()">CHOOSE (FREE)</button>';
          list.innerHTML += '<div class="skill-item"><div class="skill-info"><span class="skill-name">'
            + (classInfo ? classInfo.emoji + ' ' + classInfo.name : '🎭 No Class')
            + '</span><span class="skill-desc">' + (classInfo ? classInfo.description : 'Pick a class for a permanent passive bonus.')
            + '</span></div><div>' + classBtnHtml + '</div></div>';

          SHOP_ITEMS.forEach(item => {
            const owned = currentDev.inventory && currentDev.inventory.includes(item.id);
            // Event-only items (e.g. the Hacktoberfest skin) aren't for sale —
            // only show them here once earned, so the Shop isn't cluttered
            // with unbuyable items the rest of the year.
            if (item.eventOnly && !owned) return;
            const canAfford = currentDev.coffee >= item.cost;
            const costHtml = canAfford ? item.cost : '<span class="cant-afford">' + item.cost + '</span>';
            let btnHtml = '';

            if (owned) {
              if (item.type === 'skin') {
                const isEquipped = currentDev.role === item.emoji;
                btnHtml = isEquipped
                  ? '<span class="unlocked-badge">✓ EQUIPPED</span>'
                  : '<button class="skill-btn" onclick="equipItem(\\'' + item.id + '\\')">EQUIP</button>';
              } else {
                btnHtml = '<span class="active-badge">◈ ACTIVE</span>';
              }
            } else {
              btnHtml = '<button class="skill-btn" onclick="buyItem(\\'' + item.id + '\\')">BUY (' + costHtml + '☕)</button>';
            }

            list.innerHTML += '<div class="skill-item"><div class="skill-info"><span class="skill-name">' + (item.emoji ? item.emoji + ' ' : '') + item.name + '</span><span class="skill-desc">' + item.description + '</span></div><div>' + btnHtml + '</div></div>';
          });
        }

        function showLeaderboard() {
          document.getElementById('leaderboardModal').classList.add('active');
          renderLeaderboard();
        }
        function closeLeaderboardModal() { document.getElementById('leaderboardModal').classList.remove('active'); }

        function renderLeaderboard() {
          if (!currentDev) return;
          const body = document.getElementById('leaderboardBody');
          body.innerHTML = '';
          
          // Generate fake rivals based on user level
          const rivals = [
            { name: "VimMaster", level: currentDev.level + 2 },
            { name: "CodeNinja", level: Math.max(1, currentDev.level - 1) },
            { name: "BugHunter", level: currentDev.level + 5 },
            { name: "StackOverflow", level: Math.max(1, currentDev.level - 3) },
            { name: "GitPushForce", level: currentDev.level + 1 }
          ];
          
          const all = [...rivals, { name: currentDev.name, level: currentDev.level, isUser: true }];
          all.sort((a, b) => b.level - a.level);
          
          all.forEach((dev, index) => {
            const row = document.createElement('tr');
            if (dev.isUser) row.className = 'leaderboard-row highlight';
            row.innerHTML = '<td>' + (index + 1) + '</td><td>' + dev.name + '</td><td>' + dev.level + '</td>';
            body.appendChild(row);
          });
        }

        function showQuests() {
          document.getElementById('questsModal').classList.add('active');
          renderQuests();
        }
        function closeQuestsModal() { document.getElementById('questsModal').classList.remove('active'); }

        function renderQuests() {
          if (!currentDev) return;
          const list = document.getElementById('questsList');
          list.innerHTML = '';

          if (currentSeasonalStatus) {
            const s = currentSeasonalStatus;
            const pct = Math.floor(Math.min(100, (s.progress / s.target) * 100));
            const status = s.completed ? '✅' : pct + '%';
            list.innerHTML += '<div class="quest-item" style="border-color:' + s.accentColor + ';"><div class="quest-header"><span>' + s.emoji + ' ' + s.questLabel + ' — ' + s.skinEmoji + ' ' + s.skinName + '</span><span>' + status + '</span></div><div class="quest-progress-bg"><div class="quest-progress-fill" style="width: ' + pct + '%; background: linear-gradient(90deg, ' + s.bannerGradientStart + ', ' + s.accentColor + '); box-shadow: 0 0 6px ' + s.accentColor + ';"></div></div></div>';
          }

          const streak = currentDev.questStreak || 0;
          list.innerHTML += '<div class="streak-badge">🔥 Quest Streak: ' + streak + ' days</div>';

          (currentDev.quests || []).forEach(q => {
            const pct = Math.floor(Math.min(100, (q.progress / q.target) * 100));
            const status = q.completed ? '✅' : pct + '%';
            const html = '<div class="quest-item"><div class="quest-header"><span>' + q.description + '</span><span>' + status + '</span></div><div class="quest-progress-bg"><div class="quest-progress-fill" style="width: ' + pct + '%"></div></div></div>';
            list.innerHTML += html;
          });
          
          if (!currentDev.quests || currentDev.quests.length === 0) {
            list.innerHTML += '<p style="text-align:center; color:var(--text-dim); font-size:12px; padding:12px 0;">No active quests. Wait for daily reset!</p>';
          }

          // ── Community Quest Packs ──
          list.innerHTML += '<div style="margin-top:16px; padding-top:12px; border-top:1px solid var(--border); display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">' +
            '<span style="font-size:11px; color:var(--text-dim); letter-spacing:1px;">🎁 QUEST PACKS</span>' +
            '<span>' +
              '<button style="font-size:10px; padding:4px 8px;" onclick="importQuestPack()">📂 FILE</button> ' +
              '<button style="font-size:10px; padding:4px 8px;" onclick="importQuestPackFromUrl()">🔗 URL</button>' +
            '</span>' +
          '</div>';

          const packQuests = currentDev.packQuests || [];
          if (packQuests.length === 0) {
            list.innerHTML += '<p style="text-align:center; color:var(--text-dim); font-size:12px; padding:4px 0 8px;">No Quest Packs imported yet — try "100 Days of Code".</p>';
          } else {
            const byPack = {};
            packQuests.forEach(q => {
              const key = q.packId || 'unknown';
              if (!byPack[key]) byPack[key] = { name: q.packName || key, quests: [] };
              byPack[key].quests.push(q);
            });
            Object.keys(byPack).forEach(packId => {
              const group = byPack[packId];
              list.innerHTML += '<div style="font-size:10px; color:var(--neon-pink); margin:8px 0 4px; display:flex; justify-content:space-between; align-items:center;">' +
                '<span>' + group.name + '</span>' +
                '<a href="#" onclick="removeQuestPack(\\'' + packId + '\\'); return false;" style="color:var(--text-dim); font-size:10px; cursor:pointer;">remove</a>' +
              '</div>';
              group.quests.forEach(q => {
                const pct = Math.floor(Math.min(100, (q.progress / q.target) * 100));
                const status = q.completed ? '✅' : pct + '%';
                list.innerHTML += '<div class="quest-item"><div class="quest-header"><span>' + q.description + '</span><span>' + status + '</span></div><div class="quest-progress-bg"><div class="quest-progress-fill" style="width: ' + pct + '%"></div></div></div>';
              });
            });
          }
        }

        // Tutorial Logic
        let tutorialStep = 0;
        let isTutorialActive = false;
        const tutorialSteps = [
          { target: null, title: "Welcome to DevGotchi! 👨‍💻", text: "Your personal developer avatar. Keep them happy and productive!" },
          { target: "btn-coffee", title: "Give Coffee ☕", text: "Spend beans to boost Energy and Focus instantly." },
          { target: "btn-games", title: "Play Games 🎯", text: "Earn XP and Coffee Beans by completing mini-games." },
          { target: "btn-break", title: "Take a Break 🌴", text: "Restore Energy and Health, but be careful—Focus will drop!" },
          { target: "btn-skills", title: "Skill Tree ⚡", text: "Unlock passive abilities to make your stats decay slower." },
          { target: "btn-shop", title: "The Shop 🛍️", text: "Buy cool outfits and office upgrades with your beans." },
          { target: "btn-quests", title: "Daily Quests 📜", text: "Complete daily coding tasks for big rewards." }
        ];

        function startTutorial() {
          isTutorialActive = true;
          tutorialStep = 0;
          document.getElementById('tutorialOverlay').classList.add('active');
          document.getElementById('tutorialBox').classList.add('active');
          showTutorialStep();
        }

        function showTutorialStep() {
          const step = tutorialSteps[tutorialStep];
          document.getElementById('tutTitle').textContent = step.title;
          document.getElementById('tutText').textContent = step.text;
          
          // Remove old highlights
          document.querySelectorAll('.tutorial-highlight').forEach(el => el.classList.remove('tutorial-highlight'));
          
          if (step.target) {
            document.getElementById(step.target).classList.add('tutorial-highlight');
          }
        }

        function nextTutorialStep() {
          tutorialStep++;
          if (tutorialStep >= tutorialSteps.length) {
            document.getElementById('tutorialOverlay').classList.remove('active');
            document.getElementById('tutorialBox').classList.remove('active');
            document.querySelectorAll('.tutorial-highlight').forEach(el => el.classList.remove('tutorial-highlight'));
            isTutorialActive = false;
            vscode.postMessage({ command: 'complete-tutorial' });
          } else {
            showTutorialStep();
          }
        }

        window.addEventListener('message', event => {
          const m = event.data;
          if (m.command === 'update') {
            const dev = m.developer;
            currentDev = dev;
            if (m.settings) currentSettings = m.settings;
            teamAvailable = !!m.teamAvailable;
            teamEnabled = !!m.teamEnabled;
            document.getElementById('btn-team').style.display = (teamAvailable || teamEnabled) ? 'flex' : 'none';
            // Boss theme visual tell: flip the music icon while the
            // soundtrack is in intensified "boss mode" (see getBossIntensity
            // / scheduleBar), so the escalation is visible, not just audible.
            if (musicPlaying) {
              document.getElementById('musicIcon').textContent = getBossIntensity() > 0 ? '👾' : '🔊';
            }
            currentSeasonalStatus = m.seasonalStatus || null;
            currentLegacyDungeon = m.legacyDungeon || null;
            const seasonalBanner = document.getElementById('seasonalBanner');
            if (currentSeasonalStatus) {
              const s = currentSeasonalStatus;
              seasonalBanner.style.display = 'block';
              seasonalBanner.style.background = 'linear-gradient(90deg, ' + s.bannerGradientStart + ', ' + s.bannerGradientEnd + ')';
              seasonalBanner.style.color = s.bannerTextColor;
              document.getElementById('seasonalBannerText').textContent = s.completed
                ? (s.emoji + ' ' + s.name + ' complete — ' + s.skinEmoji + ' ' + s.skinName + ' unlocked!')
                : (s.emoji + ' ' + s.name + ' — ' + s.questLabel + ' (' + s.progress + '/' + s.target + ') for the ' + s.skinEmoji + ' ' + s.skinName + ' skin');
            } else {
              seasonalBanner.style.display = 'none';
            }
            const affix = m.bossAffix || null;
            const affixBanner = document.getElementById('affixBanner');
            if (affix) {
              affixBanner.style.display = 'block';
              document.getElementById('affixBannerText').textContent = "🎲 This Week's Affix: " + affix.emoji + ' ' + affix.name + ' — ' + affix.description;
            } else {
              affixBanner.style.display = 'none';
            }
            updateFocusUI();

            // Stats
            document.getElementById('healthBar').style.width = Math.round(dev.health) + '%';
            document.getElementById('healthText').textContent = Math.round(dev.health);
            document.getElementById('motivationBar').style.width = Math.round(dev.motivation) + '%';
            document.getElementById('motivationText').textContent = Math.round(dev.motivation);
            document.getElementById('focusBar').style.width = Math.round(dev.focus) + '%';
            document.getElementById('focusText').textContent = Math.round(dev.focus);
            document.getElementById('energyBar').style.width = Math.round(dev.energy) + '%';
            document.getElementById('energyText').textContent = Math.round(dev.energy);

            // Profile
            document.getElementById('coffeeVal').textContent = dev.coffee;
            document.getElementById('streakVal').textContent = (dev.streak || 0) + ' days';
            document.getElementById('devName').textContent = dev.name;
            const headerClassInfo = CLASSES.find(c => c.id === dev.characterClass);
            document.getElementById('devClassLabel').textContent = headerClassInfo ? (headerClassInfo.emoji + ' ' + headerClassInfo.name) : 'Unclassed Developer';
            document.getElementById('devAvatar').textContent = dev.mood === 'sleeping' ? '💤' : dev.role;
            // Redraw scene with current mood
            const sc = document.getElementById('sceneCanvas');
            if (sc) drawScene(sc, dev.mood, dev.characterClass);
            const calC = document.getElementById('streakCalCanvas');
            if (calC) drawStreakCalendar(calC, dev.activityDates);
            const prestigeCount = dev.prestigeCount || 0;
            document.getElementById('levelBadge').textContent = (prestigeCount > 0 ? '🌟×' + prestigeCount + ' ' : '') + 'LEVEL ' + dev.level;
            document.getElementById('prestigeBtn').style.display = dev.level >= 50 ? 'inline-block' : 'none';

            // XP
            const xpNeeded = dev.level * 100;
            const xpPercent = (dev.xp / xpNeeded) * 100;
            document.getElementById('xpBar').style.width = xpPercent + '%';
            document.getElementById('xpText').textContent = dev.xp + ' / ' + xpNeeded + ' XP';

            // Active quest (first incomplete)
            const activeQ = (dev.quests || []).find(q => !q.completed);
            if (activeQ) {
              const pct = Math.min(100, Math.floor((activeQ.progress / activeQ.target) * 100));
              document.getElementById('activeQuestName').textContent = activeQ.description;
              document.getElementById('activeQuestBar').style.width = pct + '%';
              document.getElementById('activeQuestPct').textContent = pct + '%';
            } else {
              document.getElementById('activeQuestName').textContent = (dev.quests||[]).length ? 'All quests complete! ✅' : 'No active quests';
              document.getElementById('activeQuestBar').style.width = (dev.quests||[]).length ? '100%' : '0%';
              document.getElementById('activeQuestPct').textContent = '';
            }

            // Boss card: Merge Conflict Kraken takes priority (a live conflict
            // blocks work), then Bug Boss (active lint/build errors), then
            // Code Smell Boss (bloated open files — a non-blocking chore, so
            // it only shows once nothing more urgent is going on), otherwise
            // falls back to the burnout-derived boss.
            const bossCard = document.getElementById('bossCard');
            const activeErrors = dev.activeErrorCount || 0;
            const conflicts = dev.mergeConflictCount || 0;
            const longFiles = dev.longFileCount || 0;
            if (conflicts > 0) {
              bossCard.classList.remove('bug-mode', 'smell-mode');
              bossCard.classList.add('kraken-mode');
              document.getElementById('bossTitleDisplay').textContent = '🐙 Merge Conflict Kraken';
              let bossName = 'Conflict Tentacle';
              if (conflicts >= 11) bossName = 'Git Cthulhu';
              else if (conflicts >= 6) bossName = 'Rebase Leviathan';
              else if (conflicts >= 3) bossName = 'Merge Kraken';
              document.getElementById('bossNameDisplay').textContent = bossName;
              const krakenPct = Math.min(100, conflicts * 25);
              document.getElementById('bossHealthBar').style.width = krakenPct + '%';
              document.getElementById('bossHealthText').textContent = conflicts + ' conflict' + (conflicts === 1 ? '' : 's') + ' remaining';
            } else if (activeErrors > 0) {
              bossCard.classList.remove('kraken-mode', 'smell-mode');
              bossCard.classList.add('bug-mode');
              document.getElementById('bossTitleDisplay').textContent = '🐛 Bug Boss';
              let bossName = 'Syntax Wraith';
              if (activeErrors >= 11) bossName = 'Overwhelmulus';
              else if (activeErrors >= 6) bossName = 'StackOverflow Behemoth';
              else if (activeErrors >= 3) bossName = 'NullPointerDemon';
              document.getElementById('bossNameDisplay').textContent = bossName;
              const bugPct = Math.min(100, activeErrors * 20);
              document.getElementById('bossHealthBar').style.width = bugPct + '%';
              document.getElementById('bossHealthText').textContent = activeErrors + ' error' + (activeErrors === 1 ? '' : 's') + ' remaining';
            } else if (longFiles > 0) {
              bossCard.classList.remove('kraken-mode', 'bug-mode');
              bossCard.classList.add('smell-mode');
              document.getElementById('bossTitleDisplay').textContent = '🧟 Code Smell Boss';
              let bossName = 'Spaghetti Sprite';
              if (longFiles >= 11) bossName = 'Technical Debt Titan';
              else if (longFiles >= 6) bossName = 'Legacy Behemoth';
              else if (longFiles >= 3) bossName = 'Code Smell Ooze';
              document.getElementById('bossNameDisplay').textContent = bossName;
              const smellPct = Math.min(100, longFiles * 20);
              document.getElementById('bossHealthBar').style.width = smellPct + '%';
              document.getElementById('bossHealthText').textContent = longFiles + ' bloated file' + (longFiles === 1 ? '' : 's') + ' open (300+ lines)';
            } else {
              bossCard.classList.remove('bug-mode', 'kraken-mode', 'smell-mode');
              document.getElementById('bossTitleDisplay').textContent = '☠ Burnout Boss';
              document.getElementById('bossNameDisplay').textContent = 'Overwhelmulus';
              const bossMaxHp = 500;
              const bossHp = Math.round((dev.health / 100) * bossMaxHp);
              document.getElementById('bossHealthBar').style.width = (dev.health) + '%';
              document.getElementById('bossHealthText').textContent = bossHp + ' / ' + bossMaxHp + ' HP';
            }

            if(document.getElementById('skillsModal').classList.contains('active')) renderSkills();
            if(document.getElementById('shopModal').classList.contains('active')) renderShop();
            if(document.getElementById('questsModal').classList.contains('active')) renderQuests();
            if(document.getElementById('achievementsModal').classList.contains('active')) renderAchievements();
            if(document.getElementById('dailyCalendarModal').classList.contains('active')) renderDailyCalendar();
            if(document.getElementById('storyModal').classList.contains('active')) renderStory();
            if(document.getElementById('logPanel').style.display !== 'none') renderLog();
            if(document.getElementById('settingsModal').classList.contains('active')) renderSettings();

            // Burnout state
            const body = document.body;
            const burnoutOverlay = document.getElementById('burnoutOverlay');
            const burnoutBanner  = document.getElementById('burnoutBanner');
            if (dev.isBurntOut) {
              body.classList.add('burnout-active');
              burnoutOverlay.style.display = 'block';
              burnoutBanner.style.display  = 'block';
            } else {
              body.classList.remove('burnout-active');
              burnoutOverlay.style.display = 'none';
              burnoutBanner.style.display  = 'none';
            }

            document.getElementById('vacationBanner').style.display = dev.vacationMode ? 'block' : 'none';

            if (!dev.tutorialCompleted && !isTutorialActive) {
              startTutorial();
            }
          }
          if (m.command === 'action-result' || m.command === 'challenge-result') {
            const n = document.createElement('div');
            n.className = 'notification';
            n.textContent = m.result.message;
            document.body.appendChild(n);
            setTimeout(() => n.remove(), 3000);
          }
          if (m.command === 'open-share-modal') {
            showShareModal();
          }
          if (m.command === 'open-weekly-recap-modal') {
            showShareModal('recap');
          }
          if (m.command === 'open-yearly-recap-modal') {
            showShareModal('wrapped');
          }
          if (m.command === 'open-settings-modal') {
            if (m.settings) currentSettings = m.settings;
            showSettingsModal();
          }
          if (m.command === 'open-team-modal') {
            showTeamModal();
          }
          if (m.command === 'team-data') {
            teamEnabled = !!m.enabled;
            teamAvailable = !!m.available;
            document.getElementById('btn-team').style.display = (teamAvailable || teamEnabled) ? 'flex' : 'none';
            renderTeamData(m);
            if (document.getElementById('settingsModal').classList.contains('active')) renderSettings();
          }
        });

        function startBugHunt() {
          document.getElementById('challengeMenu').style.display = 'none';
          const area = document.getElementById('challengeArea');
          area.style.display = 'block';
          let score = 0; 
          let time = 20;
          area.innerHTML = '<div class="timer" id="timer">TIME: 20s</div><div style="text-align:center; margin: 8px 0; font-size:12px; letter-spacing:2px; color:var(--text-dim);">SCORE: <span id="score" style="color:var(--neon-gold)">0</span></div><div class="bug-grid" id="grid"></div>';
          const grid = document.getElementById('grid');
          for(let i=0; i<9; i++) {
            const s = document.createElement('div'); 
            s.className = 'bug-spot';
            s.onclick = () => { 
              if(s.textContent === '🐛') { 
                s.textContent = '✅'; 
                score += 10; 
                document.getElementById('score').textContent = score / 10;
                setTimeout(() => s.textContent = '', 200); 
              } 
            };
            grid.appendChild(s);
          }
          const interval = setInterval(() => {
            time--; 
            document.getElementById('timer').textContent = 'Time: ' + time + 's';
            const spots = document.querySelectorAll('.bug-spot');
            const emptySpots = Array.from(spots).filter(s => !s.textContent);
            if(emptySpots.length > 0) {
              emptySpots[Math.floor(Math.random() * emptySpots.length)].textContent = '🐛';
            }
            setTimeout(() => { 
              spots.forEach(s => { if(s.textContent === '🐛') s.textContent = ''; }) 
            }, 900);
            if(time <= 0) {
              clearInterval(interval);
              vscode.postMessage({ command: 'challenge-completed', score });
              setTimeout(() => backToMenu(), 1500);
            }
          }, 1000);
          currentChallenge = { interval };
        }

        function startSpeedTest() {
          document.getElementById('challengeMenu').style.display = 'none';
          const area = document.getElementById('challengeArea');
          area.style.display = 'block';
          const code = "console.log('hello');";
          area.innerHTML = '<div style="font-size:11px;letter-spacing:2px;color:var(--text-dim);margin-bottom:12px;">TYPE THIS CODE:</div><div class="code-snippet">' + code + '</div><input id="ti" class="challenge-input" placeholder="Type here..." autocomplete="off">';
          const input = document.getElementById('ti'); 
          input.focus();
          const startTime = Date.now();
          input.oninput = () => {
            if(input.value === code) {
              const timeTaken = Date.now() - startTime;
              const score = Math.max(300 - Math.floor(Math.max(timeTaken / 100, 0)), 20);
              vscode.postMessage({ command: 'challenge-completed', score });
              setTimeout(() => backToMenu(), 1500);
            }
          };
        }

        function startBossBattle() {
          document.getElementById('challengeMenu').style.display = 'none';
          const area = document.getElementById('challengeArea');
          area.style.display = 'block';
          
          let bossHp = 100;
          let time = 45;
          let score = 0;
          
          const snippets = [
            "git commit -m 'fix'", "npm install", "console.log(err)", 
            "while(true) {}", "if (err) throw err;", "return false;", 
            "import * as fs from 'fs';", "const x = 10;", 
            "await Promise.all([]);", "class Monster extends Bug {}"
          ];
          
          area.innerHTML = '<div class="boss-container"><div class="timer" id="bossTimer">TIME: ' + time + 's</div><div class="boss-hp-bar"><div id="bossHp" class="boss-hp-fill-game" style="width:100%"></div></div><div id="bossSprite" class="boss-sprite">👾</div><div style="font-size:11px;letter-spacing:2px;color:var(--text-dim);margin-bottom:8px;">TYPE TO ATTACK:</div><div id="bossCode" class="code-snippet"></div><input id="bossInput" class="challenge-input" placeholder="Type code..." autocomplete="off"></div>';
          
          const input = document.getElementById('bossInput');
          const codeDisplay = document.getElementById('bossCode');
          const sprite = document.getElementById('bossSprite');
          const hpBar = document.getElementById('bossHp');
          
          let currentSnippet = snippets[Math.floor(Math.random() * snippets.length)];
          codeDisplay.textContent = currentSnippet;
          input.focus();
          
          const interval = setInterval(() => {
            time--;
            document.getElementById('bossTimer').textContent = 'Time: ' + time + 's';
            if (time <= 0) {
              clearInterval(interval);
              area.innerHTML = '<h3>Game Over! 💀</h3><p>The bug monster escaped.</p>';
              setTimeout(() => backToMenu(), 2000);
            }
          }, 1000);
          
          input.oninput = () => {
            if (input.value === currentSnippet) {
              bossHp -= 20;
              hpBar.style.width = bossHp + '%';
              sprite.classList.remove('shake');
              void sprite.offsetWidth; 
              sprite.classList.add('shake');
              input.value = '';
              
              if (bossHp <= 0) {
                clearInterval(interval);
                score = 100 + (time * 10);
                area.innerHTML = '<h3>Victory! 🏆</h3><p>Bug Monster defeated!</p>';
                vscode.postMessage({ command: 'challenge-completed', score });
                setTimeout(() => backToMenu(), 2000);
              } else {
                currentSnippet = snippets[Math.floor(Math.random() * snippets.length)];
                codeDisplay.textContent = currentSnippet;
              }
            }
          };
          
          currentChallenge = { interval };
        }
        // ── PIXEL ART SCENE CANVAS ────────────────────────────────────────
        function roundRect(ctx, x, y, w, h, r) {
          ctx.beginPath();
          ctx.moveTo(x + r, y);
          ctx.lineTo(x + w - r, y);
          ctx.arcTo(x + w, y,     x + w, y + r,     r);
          ctx.lineTo(x + w, y + h - r);
          ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
          ctx.lineTo(x + r, y + h);
          ctx.arcTo(x,     y + h, x,     y + h - r, r);
          ctx.lineTo(x, y + r);
          ctx.arcTo(x,     y,     x + r, y,          r);
          ctx.closePath();
        }

        function drawLotus(ctx, cx, cy, size) {
          ctx.save();
          // Outer 8 petals
          ctx.shadowColor = '#9d4edd';
          ctx.shadowBlur = 14;
          ctx.strokeStyle = '#9d4edd';
          ctx.lineWidth = 1.5;
          for (let i = 0; i < 8; i++) {
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate((i / 8) * Math.PI * 2);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.bezierCurveTo(-size * 0.13, -size * 0.45, size * 0.13, -size * 0.45, 0, -size);
            ctx.stroke();
            ctx.restore();
          }
          // Inner 8 petals (brighter)
          ctx.shadowColor = '#e040fb';
          ctx.strokeStyle = '#e040fb';
          ctx.lineWidth = 1;
          for (let i = 0; i < 8; i++) {
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(((i + 0.5) / 8) * Math.PI * 2);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.bezierCurveTo(-size * 0.08, -size * 0.26, size * 0.08, -size * 0.26, 0, -size * 0.58);
            ctx.stroke();
            ctx.restore();
          }
          // Glowing center
          ctx.shadowColor = '#fff';
          ctx.shadowBlur = 22;
          ctx.fillStyle = '#e040fb';
          ctx.beginPath();
          ctx.arc(cx, cy, size * 0.09, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        function drawLantern(ctx, x, y) {
          // Hanging rope
          ctx.strokeStyle = '#3a3055';
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, y - 12); ctx.stroke();
          // Body
          ctx.fillStyle = '#1e0e08';
          ctx.fillRect(x - 8, y - 10, 16, 24);
          // Warm glow fill
          ctx.fillStyle = 'rgba(255, 140, 55, 0.55)';
          ctx.fillRect(x - 6, y - 8, 12, 20);
          // Frame
          ctx.strokeStyle = '#5a3820';
          ctx.lineWidth = 1;
          ctx.strokeRect(x - 8, y - 10, 16, 24);
          ctx.beginPath(); ctx.moveTo(x, y - 10); ctx.lineTo(x, y + 14); ctx.stroke();
          // Caps
          ctx.fillStyle = '#3a2010';
          ctx.fillRect(x - 6, y - 15, 12, 6);
          ctx.fillRect(x - 6, y + 13, 12, 6);
          // Warm glow halo
          const lg = ctx.createRadialGradient(x, y + 4, 2, x, y + 4, 48);
          lg.addColorStop(0, 'rgba(255, 140, 55, 0.18)');
          lg.addColorStop(1, 'rgba(255, 140, 55, 0)');
          ctx.fillStyle = lg;
          ctx.fillRect(x - 55, y - 30, 110, 90);
        }

        function drawBonsai(ctx, x, groundY) {
          // Pot
          ctx.fillStyle = '#221208';
          ctx.fillRect(x - 13, groundY - 17, 26, 17);
          ctx.fillStyle = '#321a10';
          ctx.fillRect(x - 15, groundY - 20, 30, 6);
          // Trunk
          ctx.fillStyle = '#2e1c08';
          ctx.fillRect(x - 3, groundY - 52, 6, 35);
          // Branches
          const branch = (x1, y1, x2, y2, w) => {
            ctx.strokeStyle = '#2e1c08';
            ctx.lineWidth = w;
            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
          };
          branch(x, groundY - 40, x - 24, groundY - 58, 3);
          branch(x, groundY - 34, x + 20, groundY - 52, 2.5);
          branch(x - 24, groundY - 58, x - 33, groundY - 67, 1.5);
          branch(x - 24, groundY - 58, x - 14, groundY - 68, 1.5);
          branch(x + 20, groundY - 52, x + 28, groundY - 62, 1.5);
          // Foliage
          [[x - 1, groundY - 75, 20], [x - 26, groundY - 66, 17], [x + 18, groundY - 62, 15], [x - 10, groundY - 62, 13]].forEach(([fx, fy, fr]) => {
            ctx.fillStyle = '#070f07'; ctx.beginPath(); ctx.arc(fx, fy, fr, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#0d1c0d'; ctx.beginPath(); ctx.arc(fx - 2, fy - 2, fr * 0.68, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#142514'; ctx.beginPath(); ctx.arc(fx - 4, fy - 4, fr * 0.38, 0, Math.PI * 2); ctx.fill();
          });
        }

        // Per-class recolor of the same sprite/scene art (hoodie + glow only —
        // shape and everything else stays identical). Keyed by CLASSES id;
        // falls back to the original purple palette when no class is set.
        const CLASS_THEME = {
          backend_mage:   { hoodie: '#2d1b60', hoodieLight: '#3d287a', glow: '157,78,221' },
          frontend_rogue: { hoodie: '#0f3d33', hoodieLight: '#15594a', glow: '45,212,165' },
          devops_paladin: { hoodie: '#4a3410', hoodieLight: '#6b4b16', glow: '255,176,32' }
        };
        const DEFAULT_CLASS_THEME = CLASS_THEME.backend_mage;

        function drawCharacter(ctx, cx, groundY, mood, characterClass) {
          const P = 3; // canvas pixels per logical pixel
          const theme = CLASS_THEME[characterClass] || DEFAULT_CLASS_THEME;
          // Colour palette
          const C = {
            ' ': null,
            'H': '#1a1a2e', 'h': '#252550',           // hair
            'S': '#b87048', 's': '#ca8860',            // skin
            'e': '#080818',                             // eyes/dark detail
            'C': theme.hoodie, 'c': theme.hoodieLight, // hoodie (class-colored)
            'G': 'rgb(' + theme.glow + ')',             // chest glow pixel
            'L': '#231555', 'l': '#2e1c72',            // legs
          };
          const sprite = [
            '    hhHHHHhh    ',
            '   hHHHHHHHHh   ',
            '  hHHhhhhhHHHh  ',
            '  HhsSSSSSShHH  ',
            '  HhSeSSeSSShH  ',
            '  HhSSSSSSSShH  ',
            '   hSSSSSSShh   ',
            '   hSSSSSSShh   ',
            '  CCcCCCCcCCC   ',
            ' CCCcCCCCcCCCC  ',
            ' CCCcCGCCcCCCC  ',
            ' CCCCCCCCcCCCC  ',
            ' CCCCCCCCcCCCC  ',
            'LLLlCCCCClLLLL  ',
            'LLLLllllllLLLL  ',
            'lLLLLLLLLLLLLl  ',
            ' LLLLlllLLLLl   ',
          ];
          const sW = sprite[0].length;
          const sH = sprite.length;
          const startX = Math.floor(cx - (sW * P) / 2);
          const startY = groundY - sH * P + P * 3;

          sprite.forEach((row, ry) => {
            for (let rx = 0; rx < row.length; rx++) {
              const col = C[row[rx]];
              if (!col) continue;
              ctx.fillStyle = col;
              ctx.fillRect(startX + rx * P, startY + ry * P, P, P);
            }
          });

          // Chest glow
          const gx = cx, gy = startY + 10 * P;
          const cg = ctx.createRadialGradient(gx, gy, 0, gx, gy, 22);
          cg.addColorStop(0, 'rgba(' + theme.glow + ',0.4)');
          cg.addColorStop(1, 'rgba(' + theme.glow + ',0)');
          ctx.fillStyle = cg;
          ctx.fillRect(gx - 26, gy - 20, 52, 44);

          // Mood effects
          ctx.font = 'bold 13px monospace';
          if (mood === 'sleeping' || mood === 'tired') {
            ctx.fillStyle = 'rgba(160,160,255,0.7)';
            ctx.fillText('z', cx + 22, startY - 2);
            ctx.font = 'bold 9px monospace';
            ctx.fillText('z', cx + 30, startY - 13);
          } else if (mood === 'productive' || mood === 'caffeinated') {
            ctx.fillStyle = 'rgba(255,215,64,0.75)';
            [[cx - 28, startY - 2], [cx + 26, startY + 4], [cx - 32, startY + 12]].forEach(([sx, sy]) => {
              ctx.fillText('✦', sx, sy);
            });
          } else if (mood === 'burnt-out') {
            ctx.fillStyle = 'rgba(255,20,68,0.15)';
            ctx.fillRect(startX, startY, sW * P, sH * P);
          }
        }

        // GitHub-contribution-graph-style heatmap of daily activity, drawn
        // straight to a <canvas> the same way the pixel-art scene above is —
        // no DOM grid of divs, just cells painted at fixed coordinates.
        // Shows the last 53 weeks (~1 year), oldest on the left, today on
        // the right, matching activityDates' ~370-day retention window.
        function drawStreakCalendar(canvas, activityDates) {
          const ctx = canvas.getContext('2d');
          const W = canvas.width, H = canvas.height;
          ctx.clearRect(0, 0, W, H);

          const weeks = 53, cell = 6, gap = 1, pitch = cell + gap;
          const gridW = weeks * pitch;
          const offsetX = Math.max(2, (W - gridW) / 2);
          const offsetY = 2;
          const totalDays = weeks * 7;
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          for (let i = 0; i < totalDays; i++) {
            const d = new Date(today.getTime() - (totalDays - 1 - i) * 86400000);
            const key = d.toISOString().slice(0, 10);
            const count = (activityDates && activityDates[key]) || 0;
            const col = Math.floor(i / 7);
            const row = i % 7;
            const x = offsetX + col * pitch;
            const y = offsetY + row * pitch;

            let color = 'rgba(255,255,255,0.06)';
            if (count >= 15) color = '#e040fb';
            else if (count >= 8) color = '#9d4edd';
            else if (count >= 3) color = '#5a2fae';
            else if (count >= 1) color = '#2a1a4a';

            ctx.fillStyle = color;
            ctx.fillRect(x, y, cell, cell);
          }
        }

        function drawScene(canvas, mood, characterClass) {
          const ctx = canvas.getContext('2d');
          ctx.imageSmoothingEnabled = false;
          const W = canvas.width, H = canvas.height;
          const theme = CLASS_THEME[characterClass] || DEFAULT_CLASS_THEME;
          const floorY = 148;

          // Background
          const bg = ctx.createLinearGradient(0, 0, 0, H);
          bg.addColorStop(0,   '#04040E');
          bg.addColorStop(0.6, '#080820');
          bg.addColorStop(1,   '#060614');
          ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

          // Floor slab
          ctx.fillStyle = '#05051a';
          ctx.fillRect(0, floorY, W, H - floorY);

          // Floor perspective grid
          ctx.strokeStyle = '#111130';
          ctx.lineWidth = 1;
          for (let y = floorY + 10; y <= H; y += 13) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
          }
          const vp = W / 2;
          for (let i = -6; i <= 6; i++) {
            ctx.beginPath(); ctx.moveTo(vp, floorY); ctx.lineTo(vp + i * 68, H + 30); ctx.stroke();
          }

          // Central ambient glow
          const ag = ctx.createRadialGradient(W/2, floorY - 10, 0, W/2, floorY - 10, 190);
          ag.addColorStop(0,   'rgba(90,20,170,0.22)');
          ag.addColorStop(0.5, 'rgba(70,15,140,0.08)');
          ag.addColorStop(1,   'rgba(0,0,0,0)');
          ctx.fillStyle = ag; ctx.fillRect(0, 0, W, H);

          // Kanji scroll (left)
          ctx.fillStyle = '#181430'; ctx.fillRect(18, 10, 34, 82);
          ctx.fillStyle = '#221c42'; ctx.fillRect(20, 12, 30, 78);
          ctx.fillStyle = '#3a3268'; ctx.fillRect(16, 8, 38, 7);
          ctx.fillStyle = '#3a3268'; ctx.fillRect(16, 88, 38, 7);
          ctx.save();
          ctx.shadowColor = 'rgba(190,160,255,0.7)';
          ctx.shadowBlur = 7;
          ctx.fillStyle = 'rgba(205,182,255,0.78)';
          ctx.font = 'bold 19px serif';
          ctx.textAlign = 'center';
          ctx.fillText('改', 35, 47);
          ctx.fillText('善', 35, 74);
          ctx.restore();

          // VS Code monitor (top right)
          ctx.fillStyle = '#0b0f16';
          roundRect(ctx, 278, 16, 114, 78, 4);
          ctx.fill();
          ctx.strokeStyle = 'rgba(0,122,204,0.55)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          // Screen glow
          const sg = ctx.createRadialGradient(335, 55, 4, 335, 55, 62);
          sg.addColorStop(0, 'rgba(0,122,204,0.14)');
          sg.addColorStop(1, 'rgba(0,122,204,0)');
          ctx.fillStyle = sg; ctx.fillRect(250, 0, 180, 140);
          // Code lines
          const lineLens = [62, 44, 72, 36, 54];
          ctx.fillStyle = 'rgba(0,180,255,0.38)';
          lineLens.forEach((len, i) => ctx.fillRect(290, 28 + i * 12, len, 3));
          // Cursor
          ctx.fillStyle = 'rgba(0,210,255,0.85)';
          ctx.fillRect(290, 28, 2, 9);

          // Neon lotus (centre top)
          drawLotus(ctx, W / 2, 54, 44);

          // Lantern (slightly left of centre)
          drawLantern(ctx, W / 2 - 80, 36);

          // Bonsai (left foreground)
          drawBonsai(ctx, 88, floorY);

          // Right wall vertical Japanese text
          ctx.fillStyle = 'rgba(120,75,200,0.38)';
          ctx.font = '11px serif';
          ctx.textAlign = 'center';
          ['コ','ー','ド','は','武','道','だ'].forEach((ch, i) => ctx.fillText(ch, W - 17, 22 + i * 16));

          // Character
          drawCharacter(ctx, W / 2, floorY, mood, characterClass);

          // Ground glow under character (class-colored)
          const gg = ctx.createRadialGradient(W/2, floorY + 10, 2, W/2, floorY + 10, 70);
          gg.addColorStop(0, 'rgba(' + theme.glow + ',0.32)');
          gg.addColorStop(1, 'rgba(' + theme.glow + ',0)');
          ctx.fillStyle = gg;
          ctx.fillRect(W/2 - 80, floorY - 8, 160, 75);
        }

        // Initial draw (mood unknown yet, use neutral)
        (function() {
          const canvas = document.getElementById('sceneCanvas');
          if (canvas) drawScene(canvas, 'neutral');
        })();
        // ── END SCENE CANVAS ──────────────────────────────────────────────

        // ── ACHIEVEMENTS ──────────────────────────────────────────────────
        const ALL_ACHIEVEMENTS = ${JSON.stringify(ACHIEVEMENTS)};

        function showAchievements() {
          document.getElementById('achievementsModal').classList.add('active');
          renderAchievements();
        }
        function closeAchievementsModal() {
          document.getElementById('achievementsModal').classList.remove('active');
        }
        function renderAchievements() {
          if (!currentDev) return;
          const list = document.getElementById('achievementsList');
          const earned = new Set(currentDev.achievements || []);
          const earnedItems = ALL_ACHIEVEMENTS.filter(a => earned.has(a.id));
          const lockedItems = ALL_ACHIEVEMENTS.filter(a => !earned.has(a.id));
          const total = ALL_ACHIEVEMENTS.length;
          list.innerHTML = '<div style="font-size:11px; color:var(--text-dim); margin-bottom:12px; letter-spacing:1px;">' +
            earnedItems.length + ' / ' + total + ' UNLOCKED</div>';
          [...earnedItems, ...lockedItems].forEach(ach => {
            const isEarned = earned.has(ach.id);
            // Secret achievements stay a "???" mystery until unlocked, so
            // players discover the trigger instead of reading it off the list.
            const isHidden = ach.secret && !isEarned;
            const icon = isHidden ? '❓' : ach.icon;
            const name = isHidden ? '???' : ach.name;
            const desc = isHidden ? 'Secret achievement — keep coding to find out.' : ach.description;
            list.innerHTML += '<div class="ach-item ' + (isEarned ? 'earned' : 'locked') + '">' +
              '<div class="ach-icon">' + icon + '</div>' +
              '<div class="ach-info">' +
                '<div class="ach-name">' + name + '</div>' +
                '<div class="ach-desc">' + desc + '</div>' +
              '</div>' +
              (isEarned ? '<span style="color:var(--neon-gold);font-size:14px;">✓</span>' : '<span style="color:var(--text-dim);font-size:11px;">🔒</span>') +
            '</div>';
          });
        }

        // ── DAILY LOGIN CALENDAR ────────────────────────────────────────────
        // Overlays a repeating 30-day cycle on top of the existing login
        // streak (dev.streak) — day 30 of each cycle pays a big one-time
        // bonus (see checkDailyBonus in the extension host). Purely a view;
        // no separate state to track here.
        function showDailyCalendar() {
          document.getElementById('dailyCalendarModal').classList.add('active');
          renderDailyCalendar();
        }
        function closeDailyCalendar() {
          document.getElementById('dailyCalendarModal').classList.remove('active');
        }
        function renderDailyCalendar() {
          if (!currentDev) return;
          const streak = currentDev.streak || 0;
          const dayInCycle = streak > 0 ? ((streak - 1) % 30) + 1 : 0;
          const grid = document.getElementById('dailyCalendarGrid');
          let html = '';
          for (let day = 1; day <= 30; day++) {
            const isMilestone = day === 30;
            const isClaimed = day <= dayInCycle;
            const isToday = day === dayInCycle;
            const classes = ['cal-cell'];
            if (isClaimed) classes.push('claimed');
            if (isToday) classes.push('today');
            if (isMilestone) classes.push('milestone');
            const icon = isMilestone ? '🎁' : (isClaimed ? '☕' : '·');
            html += '<div class="' + classes.join(' ') + '" title="' + (isMilestone ? 'Day 30: big bonus' : ('Day ' + day)) + '">' +
              '<div class="cal-day">' + day + '</div>' +
              '<div class="cal-icon">' + icon + '</div>' +
            '</div>';
          }
          grid.innerHTML = html;
          document.getElementById('dailyCalendarSubtitle').textContent =
            streak > 0
              ? ('🔥 ' + streak + '-day streak — Day ' + dayInCycle + ' of this 30-day cycle. Log in daily; Day 30 pays out big.')
              : 'Log in on consecutive days to climb the calendar. Day 30 pays out big.';
        }

        // ── STORY (The Legacy Code Dungeon) ─────────────────────────────────
        function showStory() {
          document.getElementById('storyModal').classList.add('active');
          renderStory();
        }
        function closeStory() {
          document.getElementById('storyModal').classList.remove('active');
        }
        const STORY_OBJECTIVE_LABEL = { save: 'files saved', commit: 'commits', fix: 'bugs fixed', time: 'minutes coded' };
        function renderStory() {
          const d = currentLegacyDungeon;
          const card = document.getElementById('storyCurrentCard');
          const list = document.getElementById('storyChapterList');
          if (!d) { card.innerHTML = ''; list.innerHTML = ''; return; }

          if (d.completed) {
            card.innerHTML = '<div style="text-align:center;">' +
              '<div style="font-size:28px; margin-bottom:6px;">💀</div>' +
              '<div style="font-weight:bold; color:var(--neon-gold); margin-bottom:6px;">THE LEGACY CODE DUNGEON — COMPLETE</div>' +
              '<div style="font-size:12px; color:var(--text-dim);">You cleared all ' + d.totalChapters + ' chapters and earned the 💀 Legacy Slayer skin — equip it from the Shop.</div>' +
            '</div>';
          } else if (d.gated) {
            card.innerHTML = '<div style="text-align:center;">' +
              '<div style="font-size:11px; color:var(--text-dim); letter-spacing:1px; margin-bottom:4px;">CHAPTER ' + d.currentChapter + ' OF ' + d.totalChapters + ' — COMPLETE</div>' +
              '<div style="font-weight:bold; margin-bottom:8px;">' + d.title + '</div>' +
              '<div style="font-size:12px; color:var(--text-dim);">The next chapter unlocks tomorrow — come back after a new day begins.</div>' +
            '</div>';
          } else {
            const pct = Math.floor(Math.min(100, (d.progress / d.target) * 100));
            card.innerHTML =
              '<div style="font-size:11px; color:var(--text-dim); letter-spacing:1px; margin-bottom:4px;">CHAPTER ' + d.currentChapter + ' OF ' + d.totalChapters + '</div>' +
              '<div style="font-weight:bold; margin-bottom:8px;">' + d.title + '</div>' +
              '<div style="font-size:12px; color:var(--text-main); font-style:italic; margin-bottom:12px; line-height:1.5;">' + d.flavorText + '</div>' +
              '<div class="quest-track"><div class="quest-fill" style="width:' + pct + '%"></div></div>' +
              '<div style="font-size:11px; color:var(--text-dim); margin-top:4px; text-align:right;">' + d.progress + ' / ' + d.target + ' ' + (STORY_OBJECTIVE_LABEL[d.objectiveType] || '') + '</div>';
          }

          list.innerHTML = (d.chapters || []).map(function(c, i) {
            const icon = c.state === 'completed' ? '✅' : (c.state === 'current' ? '▶️' : '🔒');
            const title = c.state === 'locked' ? '???' : c.title;
            const dim = c.state === 'locked' ? 'color:var(--text-dim); opacity:0.6;' : '';
            return '<div style="display:flex; gap:8px; align-items:center; padding:6px 0; font-size:12px; ' + dim + '">' +
              '<span>' + icon + '</span><span>Chapter ' + (i + 1) + ': ' + title + '</span>' +
            '</div>';
          }).join('');
        }

        // ── SHARE STATS CARD ────────────────────────────────────────────────
        function getTitleForLevel(level) {
          if (level >= 25) return 'Legendary Dev';
          if (level >= 10) return 'Code Monk';
          if (level >= 5) return 'Mid-Level Developer';
          return 'Junior Developer';
        }

        let currentShareTab = 'stats';

        function showShareModal(tab) {
          document.getElementById('shareModal').classList.add('active');
          switchShareTab(tab || 'stats');
        }
        function closeShareModal() {
          document.getElementById('shareModal').classList.remove('active');
        }

        function switchShareTab(tab) {
          currentShareTab = tab;
          document.getElementById('shareTabStats').classList.toggle('active', tab === 'stats');
          document.getElementById('shareTabRecap').classList.toggle('active', tab === 'recap');
          document.getElementById('shareTabWrapped').classList.toggle('active', tab === 'wrapped');
          document.getElementById('shareTabStandup').classList.toggle('active', tab === 'standup');

          document.getElementById('shareCanvasWrap').style.display = tab === 'standup' ? 'none' : 'block';
          document.getElementById('shareCanvas').style.display = tab === 'stats' ? 'block' : 'none';
          document.getElementById('recapCanvas').style.display = tab === 'recap' ? 'block' : 'none';
          document.getElementById('wrappedCanvas').style.display = tab === 'wrapped' ? 'block' : 'none';
          document.getElementById('standupWrap').style.display = tab === 'standup' ? 'block' : 'none';

          document.getElementById('flexButtonRow').style.display = tab === 'standup' ? 'none' : 'flex';
          document.getElementById('standupButtonRow').style.display = tab === 'standup' ? 'flex' : 'none';
          document.getElementById('statsExtraButtons').style.display = tab === 'standup' ? 'none' : 'flex';

          if (tab === 'recap') renderRecapCard();
          else if (tab === 'wrapped') renderWrappedCard();
          else if (tab === 'standup') renderStandupPreview();
          else renderShareCard();
        }

        // Shared background/border chrome for both the Stats Card and the
        // Weekly Recap card — keeps the two share images visually matched.
        function drawCardChrome(ctx, W, H, subtitle) {
          ctx.save();
          roundRect(ctx, 0, 0, W, H, 18);
          ctx.clip();
          const bg = ctx.createLinearGradient(0, 0, W, H);
          bg.addColorStop(0, '#080812');
          bg.addColorStop(1, '#12102a');
          ctx.fillStyle = bg;
          ctx.fillRect(0, 0, W, H);
          // Ambient corner glows
          const glow1 = ctx.createRadialGradient(W*0.85, H*0.15, 0, W*0.85, H*0.15, 420);
          glow1.addColorStop(0, 'rgba(157,78,221,0.22)'); glow1.addColorStop(1, 'rgba(157,78,221,0)');
          ctx.fillStyle = glow1; ctx.fillRect(0, 0, W, H);
          const glow2 = ctx.createRadialGradient(W*0.1, H*0.9, 0, W*0.1, H*0.9, 360);
          glow2.addColorStop(0, 'rgba(224,64,251,0.14)'); glow2.addColorStop(1, 'rgba(224,64,251,0)');
          ctx.fillStyle = glow2; ctx.fillRect(0, 0, W, H);
          ctx.restore();

          // Border
          roundRect(ctx, 3, 3, W-6, H-6, 16);
          ctx.strokeStyle = '#9d4edd';
          ctx.lineWidth = 3;
          ctx.stroke();

          // Header wordmark
          ctx.textAlign = 'left';
          ctx.fillStyle = '#e8e8ff';
          ctx.font = 'bold 30px "Share Tech Mono", monospace';
          ctx.fillText('DEVGOTCHI', 56, 78);
          ctx.fillStyle = '#00e5ff';
          ctx.font = '14px "Share Tech Mono", monospace';
          ctx.fillText(subtitle, 58, 100);
        }

        function renderShareCard() {
          if (!currentDev) return;
          const dev = currentDev;
          const canvas = document.getElementById('shareCanvas');
          const ctx = canvas.getContext('2d');
          const W = canvas.width, H = canvas.height;

          drawCardChrome(ctx, W, H, 'CODE IS A MARTIAL ART');

          // Mood badge (top right)
          ctx.textAlign = 'right';
          ctx.font = '46px sans-serif';
          ctx.fillText(dev.mood === 'sleeping' ? '💤' : (dev.role || '👨‍💻'), W-56, 82);

          // Dev name + title
          ctx.textAlign = 'left';
          ctx.fillStyle = '#7070a0';
          ctx.font = '16px "Share Tech Mono", monospace';
          ctx.fillText(getTitleForLevel(dev.level).toUpperCase(), 58, 158);
          ctx.fillStyle = '#e8e8ff';
          ctx.font = 'bold 44px "Share Tech Mono", monospace';
          ctx.fillText(dev.name || 'Dev', 56, 206);

          // Level badge
          ctx.fillStyle = '#ffd740';
          ctx.font = 'bold 22px "Share Tech Mono", monospace';
          ctx.textAlign = 'right';
          ctx.fillText('LEVEL ' + dev.level, W-56, 158);

          // XP bar
          const xpNeeded = dev.level * 100;
          const xpPct = Math.max(0, Math.min(1, dev.xp / xpNeeded));
          const barX = 56, barY = 226, barW = W - 112, barH = 14;
          roundRect(ctx, barX, barY, barW, barH, 7);
          ctx.fillStyle = '#1a1a30';
          ctx.fill();
          roundRect(ctx, barX, barY, Math.max(barH, barW * xpPct), barH, 7);
          const xpGrad = ctx.createLinearGradient(barX, 0, barX+barW, 0);
          xpGrad.addColorStop(0, '#9d4edd'); xpGrad.addColorStop(1, '#e040fb');
          ctx.fillStyle = xpGrad;
          ctx.fill();
          ctx.textAlign = 'right';
          ctx.fillStyle = '#7070a0';
          ctx.font = '13px "Share Tech Mono", monospace';
          ctx.fillText(dev.xp + ' / ' + xpNeeded + ' XP', W-56, barY + 32);

          // Stat readout
          const stats = [
            ['FOCUS', Math.round(dev.focus), '#9d4edd'],
            ['MOTIVATION', Math.round(dev.motivation), '#ffd740'],
            ['ENERGY', Math.round(dev.energy), '#00e5ff'],
            ['HEALTH', Math.round(dev.health), '#ff1744']
          ];
          const statY = 300;
          const statColW = (W - 112) / 4;
          stats.forEach((s, i) => {
            const sx = 56 + i * statColW;
            ctx.textAlign = 'left';
            ctx.fillStyle = '#7070a0';
            ctx.font = '11px "Share Tech Mono", monospace';
            ctx.fillText(s[0], sx, statY);
            ctx.fillStyle = s[2];
            ctx.font = 'bold 26px "Share Tech Mono", monospace';
            ctx.fillText(String(s[1]), sx, statY + 32);
          });

          // Stat tiles row (lifetime stats)
          const earned = (dev.achievements || []).length;
          const totalAch = (typeof ALL_ACHIEVEMENTS !== 'undefined') ? ALL_ACHIEVEMENTS.length : earned;
          const tiles = [
            ['🔥', (dev.streak || 0) + 'd', 'STREAK'],
            ['☕', String(dev.totalCoffeeEarned || 0), 'BEANS EARNED'],
            ['📦', String(dev.totalCommits || 0), 'COMMITS'],
            ['⏱️', String(dev.totalFocusSprintsCompleted || 0), 'SPRINTS'],
            ['🏅', earned + '/' + totalAch, 'AWARDS']
          ];
          drawTileRow(ctx, W, tiles, 380, 150);
          drawCardFooter(ctx, W, H);
        }

        // Shared tile-row renderer for both share cards (stat tiles / recap tiles).
        function drawTileRow(ctx, W, tiles, tileY, tileH) {
          const tileGap = 14;
          const tileW = (W - 112 - tileGap * (tiles.length - 1)) / tiles.length;
          tiles.forEach((t, i) => {
            const tx = 56 + i * (tileW + tileGap);
            roundRect(ctx, tx, tileY, tileW, tileH, 8);
            ctx.fillStyle = '#13132a';
            ctx.fill();
            ctx.strokeStyle = '#2a2a4a';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.textAlign = 'center';
            ctx.font = '34px sans-serif';
            ctx.fillText(t[0], tx + tileW/2, tileY + 52);
            ctx.fillStyle = '#e8e8ff';
            ctx.font = 'bold 24px "Share Tech Mono", monospace';
            ctx.fillText(t[1], tx + tileW/2, tileY + 92);
            ctx.fillStyle = '#7070a0';
            ctx.font = '10px "Share Tech Mono", monospace';
            ctx.fillText(t[2], tx + tileW/2, tileY + 118);
          });
        }

        function drawCardFooter(ctx, W, H) {
          ctx.textAlign = 'center';
          ctx.fillStyle = '#5a5878';
          ctx.font = '13px "Share Tech Mono", monospace';
          ctx.fillText('Built with DevGotchi — a virtual developer for VS Code', W/2, H - 34);
        }

        // Contribution-graph-style heatmap (GitHub-style) for the recap card —
        // full past year, with the current 7-day week outlined so it reads as
        // "here's this week, in context."
        function drawContributionGraph(ctx, x, y, width, activityDates) {
          const weeks = 53;
          const pitch = width / weeks;
          const gap = Math.max(1, pitch * 0.18);
          const cell = pitch - gap;
          const totalDays = weeks * 7;
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          for (let i = 0; i < totalDays; i++) {
            const d = new Date(today.getTime() - (totalDays - 1 - i) * 86400000);
            const key = d.toISOString().slice(0, 10);
            const count = (activityDates && activityDates[key]) || 0;
            const col = Math.floor(i / 7);
            const row = i % 7;
            const cx = x + col * pitch;
            const cy = y + row * pitch;

            let color = 'rgba(255,255,255,0.06)';
            if (count >= 15) color = '#e040fb';
            else if (count >= 8) color = '#9d4edd';
            else if (count >= 3) color = '#5a2fae';
            else if (count >= 1) color = '#2a1a4a';

            ctx.fillStyle = color;
            ctx.fillRect(cx, cy, cell, cell);
          }

          // Outline the current week (rightmost column) in cyan
          const hx = x + (weeks - 1) * pitch - gap * 0.5;
          const hy = y - gap * 0.5;
          ctx.strokeStyle = '#00e5ff';
          ctx.lineWidth = 2;
          ctx.strokeRect(hx, hy, pitch, pitch * 7);
        }

        function renderRecapCard() {
          if (!currentDev) return;
          const dev = currentDev;
          const canvas = document.getElementById('recapCanvas');
          const ctx = canvas.getContext('2d');
          const W = canvas.width, H = canvas.height;

          drawCardChrome(ctx, W, H, 'WEEKLY RECAP');

          // Mood badge (top right)
          ctx.textAlign = 'right';
          ctx.font = '46px sans-serif';
          ctx.fillText(dev.mood === 'sleeping' ? '💤' : (dev.role || '👨‍💻'), W-56, 82);

          const r = dev.lastWeeklyRecap;

          // Dev name + label
          ctx.textAlign = 'left';
          ctx.fillStyle = '#7070a0';
          ctx.font = '16px "Share Tech Mono", monospace';
          ctx.fillText('THIS WEEK IN CODE', 58, 158);
          ctx.fillStyle = '#e8e8ff';
          ctx.font = 'bold 44px "Share Tech Mono", monospace';
          ctx.fillText(dev.name || 'Dev', 56, 206);

          // Level badge (top right)
          ctx.fillStyle = '#ffd740';
          ctx.font = 'bold 22px "Share Tech Mono", monospace';
          ctx.textAlign = 'right';
          const levelLabel = (r && r.newLevel > r.prevLevel) ? ('LEVEL ' + r.prevLevel + ' → ' + r.newLevel) : ('LEVEL ' + dev.level);
          ctx.fillText(levelLabel, W-56, 158);

          if (!r) {
            ctx.textAlign = 'center';
            ctx.fillStyle = '#7070a0';
            ctx.font = '18px "Share Tech Mono", monospace';
            ctx.fillText('Your first Weekly Recap unlocks after 7 days of tracked activity.', W/2, 320);
            drawCardFooter(ctx, W, H);
            return;
          }

          // Tiles: what changed this week
          const tiles = [
            ['⚡', '+' + r.xpGained, 'XP GAINED'],
            ['📦', String(r.commitsGained), 'COMMITS'],
            ['🐛', String(r.bugsGained), 'BUGS FIXED'],
            ['⏱️', String(r.sprintsGained), 'SPRINTS']
          ];
          drawTileRow(ctx, W, tiles, 230, 130);

          ctx.textAlign = 'left';
          ctx.fillStyle = '#7070a0';
          ctx.font = '13px "Share Tech Mono", monospace';
          ctx.fillText('🔥 ' + (r.streak || 0) + '-day streak', 56, 400);

          ctx.fillStyle = '#7070a0';
          ctx.font = '11px "Share Tech Mono", monospace';
          ctx.fillText('PAST 12 MONTHS', 56, 428);
          drawContributionGraph(ctx, 56, 440, W - 112, dev.activityDates);

          drawCardFooter(ctx, W, H);
        }

        // ── YEAR IN CODE WRAPPED ─────────────────────────────────────────
        function formatHour12(h) {
          const period = h < 12 ? 'AM' : 'PM';
          let hour12 = h % 12;
          if (hour12 === 0) hour12 = 12;
          return hour12 + ' ' + period;
        }

        function getHourFlavor(h) {
          if (h < 5) return 'Night Owl 🦉';
          if (h < 9) return 'Early Bird 🐦';
          if (h < 12) return 'Morning Person ☀️';
          if (h < 17) return 'Afternoon Grinder 💻';
          if (h < 21) return 'Evening Coder 🌆';
          return 'Late Night Hacker 🌙';
        }

        // Lifetime-to-date totals, not a delta — see YearlyRecapResult in the
        // extension host. Reuses the same chrome/tile/footer/contribution-
        // graph helpers as the Weekly Recap card above, just with a year's
        // worth of stats instead of a week's.
        function renderWrappedCard() {
          if (!currentDev) return;
          const dev = currentDev;
          const canvas = document.getElementById('wrappedCanvas');
          const ctx = canvas.getContext('2d');
          const W = canvas.width, H = canvas.height;

          drawCardChrome(ctx, W, H, 'YEAR IN CODE WRAPPED');

          // Mood badge (top right)
          ctx.textAlign = 'right';
          ctx.font = '46px sans-serif';
          ctx.fillText(dev.mood === 'sleeping' ? '💤' : (dev.role || '👨‍💻'), W-56, 82);

          const r = dev.lastYearlyRecap;

          ctx.textAlign = 'left';
          ctx.fillStyle = '#7070a0';
          ctx.font = '16px "Share Tech Mono", monospace';
          ctx.fillText('YEAR IN CODE — WRAPPED', 58, 158);
          ctx.fillStyle = '#e8e8ff';
          ctx.font = 'bold 44px "Share Tech Mono", monospace';
          ctx.fillText(dev.name || 'Dev', 56, 206);

          ctx.fillStyle = '#ffd740';
          ctx.font = 'bold 22px "Share Tech Mono", monospace';
          ctx.textAlign = 'right';
          ctx.fillText('LEVEL ' + (r ? r.level : dev.level), W-56, 158);

          if (!r) {
            ctx.textAlign = 'center';
            ctx.fillStyle = '#7070a0';
            ctx.font = '18px "Share Tech Mono", monospace';
            ctx.fillText('Your Year in Code Wrapped unlocks after a year of tracked activity.', W/2, 320);
            drawCardFooter(ctx, W, H);
            return;
          }

          const tiles = [
            ['⚡', String(r.totalXpEarned), 'TOTAL XP'],
            ['👾', String(r.totalBossesDefeated), 'BOSSES SLAIN'],
            ['🔥', r.longestStreak + 'd', 'LONGEST STREAK'],
            ['🕐', formatHour12(r.mostProductiveHour), 'PEAK HOUR']
          ];
          drawTileRow(ctx, W, tiles, 230, 130);

          ctx.textAlign = 'left';
          ctx.fillStyle = '#7070a0';
          ctx.font = '13px "Share Tech Mono", monospace';
          ctx.fillText(getHourFlavor(r.mostProductiveHour) + ' · 🏅 ' + r.achievementsUnlocked + ' achievements unlocked', 56, 400);

          ctx.fillStyle = '#7070a0';
          ctx.font = '11px "Share Tech Mono", monospace';
          ctx.fillText('PAST 12 MONTHS', 56, 428);
          drawContributionGraph(ctx, 56, 440, W - 112, dev.activityDates);

          drawCardFooter(ctx, W, H);
        }

        // ── STANDUP GENERATOR ─────────────────────────────────────────────
        // Turns today's Activity Log into a "what I did today" post for
        // Slack — one click, no re-typing the log by hand. The dev's avatar
        // emoji rides along at the top of the post.
        function getTodayLogEntries() {
          const dev = currentDev;
          if (!dev || !dev.activityLog) return [];
          const now = new Date();
          const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
          return dev.activityLog.filter(e => e.timestamp >= startOfDay);
        }

        function buildStandupText() {
          const dev = currentDev;
          const entries = getTodayLogEntries();

          let commits = 0, bugsFixed = 0, sprints = 0, saves = 0, bossesDefeated = 0;
          let leveledTo = null;
          const achievements = [];

          entries.forEach(e => {
            const m = e.message;
            if (m.indexOf('📦 Git commit') === 0) {
              commits++;
            } else if (m.indexOf('🐛 Fixed') === 0) {
              const match = m.match(/Fixed (\\d+) bug/);
              bugsFixed += match ? parseInt(match[1], 10) : 1;
            } else if (m.indexOf('🎯 Focus Sprint complete') === 0) {
              sprints++;
            } else if (m.indexOf('📝 File saved') === 0) {
              saves++;
            } else if (m.indexOf('🎉 LEVEL UP') === 0) {
              const match = m.match(/Level (\\d+)/);
              if (match) leveledTo = parseInt(match[1], 10);
            } else if (m.indexOf('Achievement unlocked:') === 0) {
              achievements.push(m.replace('Achievement unlocked: ', ''));
            } else if (m.indexOf('👾 Bug Boss defeated') === 0 || m.indexOf('🐉 Team Raid Boss defeated') === 0) {
              bossesDefeated++;
            }
          });

          const bullets = [];
          if (commits > 0) bullets.push('📦 Shipped ' + commits + ' commit' + (commits === 1 ? '' : 's'));
          if (bugsFixed > 0) bullets.push('🐛 Fixed ' + bugsFixed + ' bug' + (bugsFixed === 1 ? '' : 's'));
          if (sprints > 0) bullets.push('⏱️ Ran ' + sprints + ' focus sprint' + (sprints === 1 ? '' : 's'));
          if (bossesDefeated > 0) bullets.push('👾 Cleared ' + bossesDefeated + ' bug boss fight' + (bossesDefeated === 1 ? '' : 's'));
          if (leveledTo) bullets.push('🎉 Leveled up to Level ' + leveledTo);
          if (achievements.length) bullets.push('🏅 Unlocked: ' + achievements.join(', '));
          if (saves > 0) bullets.push('📝 ' + saves + ' file save' + (saves === 1 ? '' : 's'));

          if (bullets.length === 0) {
            bullets.push('🌱 Quiet day in the editor — holding at a ' + (dev.streak || 0) + '-day streak.');
          }

          const avatar = dev.mood === 'sleeping' ? '💤' : (dev.role || '👨‍💻');
          const dateStr = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });

          const lines = [
            avatar + ' *Standup — ' + (dev.name || 'Dev') + '* — ' + dateStr,
            '',
            ...bullets.map(b => '• ' + b),
            '',
            '🔥 ' + (dev.streak || 0) + '-day streak · Lvl ' + dev.level,
            '_Generated with DevGotchi_'
          ];
          return lines.join('\\n');
        }

        function renderStandupPreview() {
          const el = document.getElementById('standupPreview');
          if (!el) return;
          el.textContent = currentDev ? buildStandupText() : '';
        }

        function copyStandup() {
          if (!currentDev) return;
          vscode.postMessage({ command: 'copy-text', text: buildStandupText(), confirmMessage: '📋 Standup copied — paste it into Slack!' });
        }

        function buildStatsMarkdown() {
          const dev = currentDev;
          const xpNeeded = dev.level * 100;
          const earned = (dev.achievements || []).length;
          const totalAch = (typeof ALL_ACHIEVEMENTS !== 'undefined') ? ALL_ACHIEVEMENTS.length : earned;
          return [
            '### 🕹️ DevGotchi Stats — ' + (dev.name || 'Dev'),
            '',
            '**Level ' + dev.level + '** (' + getTitleForLevel(dev.level) + ') · ' + dev.xp + ' / ' + xpNeeded + ' XP · 🔥 ' + (dev.streak || 0) + '-day streak',
            '',
            '| 🎯 Focus | ⭐ Motivation | ⚡ Energy | 💪 Health |',
            '|:---:|:---:|:---:|:---:|',
            '| ' + Math.round(dev.focus) + ' | ' + Math.round(dev.motivation) + ' | ' + Math.round(dev.energy) + ' | ' + Math.round(dev.health) + ' |',
            '',
            '☕ ' + (dev.totalCoffeeEarned || 0) + ' beans earned · 📦 ' + (dev.totalCommits || 0) + ' commits · ⏱️ ' + (dev.totalFocusSprintsCompleted || 0) + ' focus sprints · 🏅 ' + earned + '/' + totalAch + ' achievements',
            '',
            '*Code is a Martial Art.* — via [DevGotchi](https://marketplace.visualstudio.com/items?itemName=johnfacey.vscode-devgotchi)'
          ].join('\\n');
        }

        function copyStatsMarkdown() {
          if (!currentDev) return;
          vscode.postMessage({ command: 'copy-text', text: buildStatsMarkdown() });
        }

        // Renders whichever card is on-screen and returns { dataUrl, suggestedName }.
        function renderActiveShareCanvas() {
          const isRecap = currentShareTab === 'recap';
          const isWrapped = currentShareTab === 'wrapped';
          if (isRecap) renderRecapCard();
          else if (isWrapped) renderWrappedCard();
          else renderShareCard();
          const canvasId = isRecap ? 'recapCanvas' : (isWrapped ? 'wrappedCanvas' : 'shareCanvas');
          const canvas = document.getElementById(canvasId);
          const dataUrl = canvas.toDataURL('image/png');
          const safeName = (currentDev.name || 'dev').toLowerCase().replace(/[^a-z0-9]+/g, '-');
          const prefix = isRecap ? 'recap-' : (isWrapped ? 'wrapped-' : '');
          const suggestedName = 'devgotchi-' + prefix + safeName + '.png';
          return { dataUrl, suggestedName };
        }

        function saveStatsImage() {
          if (!currentDev) return;
          const { dataUrl, suggestedName } = renderActiveShareCanvas();
          vscode.postMessage({ command: 'save-stats-image', dataUrl, suggestedName });
        }

        // Pre-written, hashtag-ready captions — every share is free marketing,
        // so make the copy-paste path a single click (see flexShare()).
        function buildStatsCaption() {
          const dev = currentDev;
          return [
            '🕹️ Level ' + dev.level + ' ' + getTitleForLevel(dev.level) + ' — 🔥 ' + (dev.streak || 0) + '-day coding streak',
            '📦 ' + (dev.totalCommits || 0) + ' commits · 🐛 ' + (dev.totalBugsFixed || 0) + ' bugs squashed · ⏱️ ' + (dev.totalFocusSprintsCompleted || 0) + ' focus sprints',
            '',
            'Gamifying my coding sessions with DevGotchi 🧙',
            '',
            '#DevGotchi #100DaysOfCode #BuildInPublic #CodeNewbie #DeveloperLife'
          ].join('\\n');
        }

        function buildRecapCaption() {
          const dev = currentDev;
          const r = dev.lastWeeklyRecap;
          if (!r) return buildStatsCaption();
          const leveledUp = r.newLevel > r.prevLevel;
          return [
            '📊 My week in code, courtesy of DevGotchi:',
            (leveledUp ? '⬆️ Level ' + r.prevLevel + ' → ' + r.newLevel + ' · ' : '') + '+' + r.xpGained + ' XP',
            '📦 ' + r.commitsGained + ' commits · 🐛 ' + r.bugsGained + ' bugs fixed · ⏱️ ' + r.sprintsGained + ' focus sprints',
            '🔥 ' + (r.streak || 0) + '-day streak',
            '',
            '#DevGotchi #BuildInPublic #100DaysOfCode #WeeklyRecap #DeveloperLife'
          ].join('\\n');
        }

        function buildWrappedCaption() {
          const dev = currentDev;
          const r = dev.lastYearlyRecap;
          if (!r) return buildStatsCaption();
          return [
            '🎁 My Year in Code Wrapped, courtesy of DevGotchi:',
            '⚡ ' + r.totalXpEarned + ' total XP · Level ' + r.level,
            '👾 ' + r.totalBossesDefeated + ' bosses slain · 🔥 ' + r.longestStreak + '-day longest streak',
            getHourFlavor(r.mostProductiveHour) + ' — peak coding hour: ' + formatHour12(r.mostProductiveHour),
            '',
            '#DevGotchi #YearInCode #BuildInPublic #100DaysOfCode #DeveloperLife'
          ].join('\\n');
        }

        function buildFlexCaption() {
          if (currentShareTab === 'recap') return buildRecapCaption();
          if (currentShareTab === 'wrapped') return buildWrappedCaption();
          return buildStatsCaption();
        }

        // One-click "flex": copies a ready-to-post caption to the clipboard
        // and immediately prompts to save the matching card image, so both
        // halves of the post are one click away from being pasted/attached.
        function flexShare() {
          if (!currentDev) return;
          const { dataUrl, suggestedName } = renderActiveShareCanvas();
          vscode.postMessage({ command: 'flex-share', dataUrl, suggestedName, caption: buildFlexCaption() });
        }

        // ── ACTIVITY LOG ──────────────────────────────────────────────────
        function toggleLog() {
          const panel = document.getElementById('logPanel');
          const isVisible = panel.style.display !== 'none';
          panel.style.display = isVisible ? 'none' : 'block';
          if (!isVisible) renderLog();
        }
        function renderLog() {
          if (!currentDev) return;
          const entries = document.getElementById('logEntries');
          const log = currentDev.activityLog || [];
          if (log.length === 0) {
            entries.innerHTML = '<div style="color:var(--text-dim); padding: 8px 0;">No activity yet — start coding!</div>';
            return;
          }
          entries.innerHTML = log.map(entry => {
            const d = new Date(entry.timestamp);
            const time = d.getHours().toString().padStart(2,'0') + ':' + d.getMinutes().toString().padStart(2,'0');
            return '<div class="log-' + entry.type + '">' + entry.message +
              '<span class="log-time">' + time + '</span></div>';
          }).join('');
        }

        // ── CYBERPUNK MUSIC SYNTHESIZER ──────────────────────────────────
        let audioCtx = null;
        let musicPlaying = false;
        let masterGain = null;
        let scheduledNodes = [];
        let sequencerTimeout = null;

        // Pentatonic minor scale (A) — very cyberpunk
        const SCALE = [110, 130.81, 146.83, 164.81, 196, 220, 261.63, 293.66, 329.63, 392, 440];
        const BASS  = [55, 65.41, 73.42, 82.41, 98, 110];
        const BPM   = 118;
        const STEP  = 60 / BPM / 2; // eighth note

        function initAudio() {
          if (audioCtx) return;
          audioCtx = new (window.AudioContext || window.webkitAudioContext)();

          masterGain = audioCtx.createGain();
          masterGain.gain.setValueAtTime(0.0, audioCtx.currentTime);
          masterGain.connect(audioCtx.destination);
        }

        function makeReverb(ctx) {
          const conv = ctx.createConvolver();
          const len = ctx.sampleRate * 2.5;
          const buf = ctx.createBuffer(2, len, ctx.sampleRate);
          for (let c = 0; c < 2; c++) {
            const d = buf.getChannelData(c);
            for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.2);
          }
          conv.buffer = buf;
          return conv;
        }

        function playNote(freq, startTime, duration, type, gainVal, filterFreq, pan) {
          if (!audioCtx || !musicPlaying) return;
          const osc  = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          const filt = audioCtx.createBiquadFilter();
          const panNode = audioCtx.createStereoPanner();

          osc.type = type;
          osc.frequency.setValueAtTime(freq, startTime);

          filt.type = 'lowpass';
          filt.frequency.setValueAtTime(filterFreq, startTime);
          filt.Q.value = 3;

          panNode.pan.setValueAtTime(pan, startTime);

          gain.gain.setValueAtTime(0, startTime);
          gain.gain.linearRampToValueAtTime(gainVal, startTime + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

          osc.connect(filt);
          filt.connect(gain);
          gain.connect(panNode);
          panNode.connect(masterGain);

          osc.start(startTime);
          osc.stop(startTime + duration + 0.05);
          scheduledNodes.push(osc);
        }

        function playKick(startTime) {
          if (!audioCtx || !musicPlaying) return;
          const osc  = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(150, startTime);
          osc.frequency.exponentialRampToValueAtTime(40, startTime + 0.08);
          gain.gain.setValueAtTime(0.7, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.22);
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(startTime);
          osc.stop(startTime + 0.25);
          scheduledNodes.push(osc);
        }

        function playHat(startTime, vol) {
          if (!audioCtx || !musicPlaying) return;
          const buf  = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.05, audioCtx.sampleRate);
          const data = buf.getChannelData(0);
          for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
          const src  = audioCtx.createBufferSource();
          src.buffer = buf;
          const filt = audioCtx.createBiquadFilter();
          filt.type = 'highpass';
          filt.frequency.value = 7000;
          const gain = audioCtx.createGain();
          gain.gain.setValueAtTime(vol, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.05);
          src.connect(filt);
          filt.connect(gain);
          gain.connect(masterGain);
          src.start(startTime);
          scheduledNodes.push(src);
        }

        // Bass sequence: root, fifth, flat-7, root octave up
        const bassSeq   = [0, 0, 4, 2, 0, 0, 3, 4];
        // Arp sequence: pentatonic run
        const arpSeq    = [4, 6, 7, 9, 7, 6, 4, 2, 4, 6, 8, 9, 8, 7, 6, 4];
        // Pad chord intervals (A minor)
        const padNotes  = [110, 130.81, 164.81, 220]; // A2 chord
        let   arpStep   = 0;
        let   bassStep  = 0;
        let   barCount  = 0;

        // Boss intensity: 0 (no active errors) to 1 (Bug Boss at full HP) —
        // mirrors the Bug Boss card's own pacing (Math.min(100, errors*20)
        // caps at 5 errors) so "boss bar full" and "music maxed out" line up.
        // currentDev is refreshed on every 'update' message from the
        // extension host (~every 30s, or right after a fix/new error), so
        // this drifts in step with the real Bug Boss HP without any extra
        // wiring — the sequencer just reads it fresh each bar.
        function getBossIntensity() {
          const errors = (currentDev && currentDev.activeErrorCount) || 0;
          return Math.min(1, errors / 5);
        }

        function scheduleBar(barStart) {
          if (!musicPlaying) return;
          const stepsPerBar = 16;
          const intensity = getBossIntensity();

          for (let s = 0; s < stepsPerBar; s++) {
            const t = barStart + s * STEP;

            // ── Kick: 1, 3, 5, 7 always; a growing Bug Boss adds urgent
            // double-time kicks on the off-beats too, past the halfway point.
            if (s === 0 || s === 4 || s === 8 || s === 12) playKick(t);
            if (intensity > 0.5 && (s === 2 || s === 6 || s === 10 || s === 14)) playKick(t);
            // ── Hi-hat: every even eighth, louder as the boss grows
            if (s % 2 === 0) playHat(t, 0.18 + intensity * 0.12);
            if (s % 2 === 1) playHat(t, 0.08 + intensity * 0.1);

            // ── Bass: every 2 steps, brighter + louder under a growing boss
            if (s % 2 === 0) {
              const bIdx = bassSeq[(bassStep++) % bassSeq.length];
              playNote(BASS[bIdx], t, STEP * 2.2, 'sawtooth', 0.22 + intensity * 0.1, 320 + intensity * 500, 0);
            }

            // ── Arp: every step, brighter with the boss; past the halfway
            // point it doubles into urgent 16th-note fills
            const aIdx = arpSeq[(arpStep++) % arpSeq.length];
            playNote(SCALE[aIdx], t, STEP * 0.6, 'square', 0.07 + intensity * 0.05, 2200 + intensity * 1500, (s % 4 < 2) ? -0.3 : 0.3);
            if (intensity > 0.6) {
              const aIdx2 = arpSeq[(arpStep++) % arpSeq.length];
              playNote(SCALE[aIdx2] * 2, t + STEP * 0.5, STEP * 0.3, 'square', 0.05 * intensity, 3200, (s % 4 < 2) ? 0.3 : -0.3);
            }
          }

          // ── Pad chord: whole bar, swells every 2 bars — brighter/tenser as the boss grows
          if (barCount % 2 === 0) {
            padNotes.forEach((freq, i) => {
              const panVal = [-0.5, -0.2, 0.2, 0.5][i];
              playNote(freq, barStart, STEP * stepsPerBar * 2, 'sawtooth', 0.055 + intensity * 0.03, 900 + intensity * 900, panVal);
            });
          }

          // ── Synth lead: sparse, every 4 bars
          if (barCount % 4 === 0) {
            const lead = [SCALE[6], SCALE[8], SCALE[9], SCALE[7]];
            lead.forEach((f, i) => {
              playNote(f * 2, barStart + i * STEP * 4, STEP * 3, 'sawtooth', 0.09 + intensity * 0.05, 3000, 0.1);
            });
          }

          // ── Boss alarm: a low pulsing siren once the Bug Boss is past 80%
          // HP — the "whoa, it noticed" moment.
          if (intensity > 0.8) {
            playNote(BASS[0] / 2, barStart, STEP * 4, 'sawtooth', 0.05 + intensity * 0.06, 200, 0);
            playNote(BASS[0] / 2, barStart + STEP * 8, STEP * 4, 'sawtooth', 0.05 + intensity * 0.06, 200, 0);
          }

          barCount++;
          // Prune finished nodes
          scheduledNodes = scheduledNodes.filter(n => {
            try { return n.context && n.context.state !== 'closed'; } catch(e) { return false; }
          });
        }

        let nextBarTime = 0;
        function runSequencer() {
          if (!musicPlaying || !audioCtx) return;
          const barDuration = STEP * 16;
          const lookahead   = 0.2; // seconds ahead
          while (nextBarTime < audioCtx.currentTime + lookahead) {
            scheduleBar(nextBarTime);
            nextBarTime += barDuration;
          }
          sequencerTimeout = setTimeout(runSequencer, 80);
        }

        function toggleMusic() {
          const btn   = document.getElementById('btn-music');
          const icon  = document.getElementById('musicIcon');
          const label = document.getElementById('musicLabel');

          if (!musicPlaying) {
            initAudio();
            if (audioCtx.state === 'suspended') audioCtx.resume();
            // Always re-ramp volume up here, not just on first init — a
            // prior OFF toggle ramps this down to 0, and since initAudio()
            // no-ops once audioCtx exists, without this the ramp-up would
            // only ever happen once and every subsequent "on" would be
            // silent (state says playing, oscillators scheduled, but
            // masterGain stuck at 0 from the last fade-out).
            masterGain.gain.cancelScheduledValues(audioCtx.currentTime);
            masterGain.gain.setValueAtTime(masterGain.gain.value, audioCtx.currentTime);
            masterGain.gain.linearRampToValueAtTime(0.72, audioCtx.currentTime + 1.0);
            musicPlaying = true;
            nextBarTime  = audioCtx.currentTime + 0.1;
            runSequencer();
            btn.classList.add('music-on');
            icon.textContent  = '🔊';
            label.textContent = 'Music';
          } else {
            musicPlaying = false;
            clearTimeout(sequencerTimeout);
            if (masterGain) {
              masterGain.gain.cancelScheduledValues(audioCtx.currentTime);
              masterGain.gain.setValueAtTime(masterGain.gain.value, audioCtx.currentTime);
              masterGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.8);
            }
            btn.classList.remove('music-on');
            icon.textContent  = '🎵';
            label.textContent = 'Music';
          }
        }
        // ── END MUSIC ─────────────────────────────────────────────────────

      </script>
    </body></html>`;
    }
}
function deactivate() { }
//# sourceMappingURL=extension.js.map