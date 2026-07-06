"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const path = require("path");
const os = require("os");
const SKILLS = [
    { id: 'caffeine_tolerance', name: 'Caffeine Tolerance', description: 'Coffee restores 50% more energy', cost: 50 },
    { id: 'iron_focus', name: 'Iron Focus', description: 'Focus decays 30% slower', cost: 75 },
    { id: 'bug_slayer', name: 'Bug Slayer', description: 'Earn 2x XP when fixing bugs', cost: 100 }
];
const SHOP_ITEMS = [
    { id: 'skin_suit', name: 'Business Suit', type: 'skin', description: 'Dress for success', cost: 150, emoji: '🕴️' },
    { id: 'skin_space', name: 'Space Suit', type: 'skin', description: 'Code in zero-g', cost: 300, emoji: '👨‍🚀' },
    { id: 'furn_chair', name: 'Ergo Chair', type: 'furniture', description: 'Energy decays 15% slower', cost: 200 },
    { id: 'acc_keyboard', name: 'Mech Keyboard', type: 'accessory', description: 'Motivation decays 15% slower', cost: 250 }
];
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
];
const FOCUS_SPRINT_XP_MULTIPLIER = 1.5;
const FOCUS_SPRINT_BONUS_XP = 40;
const FOCUS_SPRINT_BONUS_COFFEE = 25;
const BUG_BOSS_DEFEAT_BONUS_XP = 30;
const BUG_BOSS_DEFEAT_BONUS_COFFEE = 15;
const WEEKLY_RECAP_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;
/**
 * Extension activation entry point.
 * Initializes the game manager, status bar, and event listeners.
 */
function activate(context) {
    const devManager = new DeveloperManager(context);
    // Create and configure the status bar item
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'devgotchi.openPanel';
    context.subscriptions.push(statusBarItem);
    /**
     * Updates the status bar text and tooltip with current stats.
     */
    const updateStatusBar = () => {
        const dev = devManager.getDeveloper();
        const emoji = getMoodEmoji(dev.mood);
        let text = `${emoji} ${dev.name} Lv${dev.level}`;
        const remaining = (dev.focusSprintEndsAt || 0) - Date.now();
        if (remaining > 0) {
            text += ` ⏱ ${formatMMSS(remaining)}`;
        }
        statusBarItem.text = text;
        statusBarItem.tooltip = `💪 ${Math.round(dev.health)}% | 🔥 ${Math.round(dev.motivation)}% | 🧠 ${Math.round(dev.focus)}% | ☕ ${dev.coffee}`
            + (remaining > 0 ? `\n⏱ Focus Sprint: ${formatMMSS(remaining)} left (${FOCUS_SPRINT_XP_MULTIPLIER}x XP)` : '');
        statusBarItem.show();
    };
    // Initial status bar update
    updateStatusBar();
    // Register the command to open the main webview panel
    context.subscriptions.push(vscode.commands.registerCommand('devgotchi.openPanel', () => {
        DeveloperPanel.createOrShow(context.extensionUri, devManager);
    }));
    // Register command to reset progress
    context.subscriptions.push(vscode.commands.registerCommand('devgotchi.resetProgress', async () => {
        await devManager.resetProgress();
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
        DeveloperPanel.createOrShow(context.extensionUri, devManager);
        DeveloperPanel.currentPanel?.openShareCard();
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
        devManager.onCodeSaved();
        updateStatusBar();
    }));
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
            let lastHead = repo.state.HEAD?.commit;
            repo.state.onDidChange(() => {
                const currentHead = repo.state.HEAD?.commit;
                if (currentHead && currentHead !== lastHead) {
                    lastHead = currentHead;
                    devManager.onGitCommit();
                    updateStatusBar();
                }
            });
        };
        if (git.repositories)
            git.repositories.forEach(hookRepo);
        git.onDidOpenRepository(hookRepo);
    }
    // Linter Integration: Listen for diagnostics
    const getErrorCount = () => {
        return vscode.languages.getDiagnostics().reduce((acc, [uri, diags]) => {
            return acc + diags.filter(d => d.severity === vscode.DiagnosticSeverity.Error).length;
        }, 0);
    };
    devManager.setInitialErrorCount(getErrorCount());
    context.subscriptions.push(vscode.languages.onDidChangeDiagnostics(() => {
        devManager.updateErrorCount(getErrorCount());
        updateStatusBar();
    }));
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
 * Manages the state and logic of the developer avatar.
 * Handles persistence, stat calculations, and game mechanics.
 */
class DeveloperManager {
    constructor(context) {
        this.lastErrorCount = 0;
        this.context = context;
        this.developer = this.loadDeveloper();
        this.updateStats();
    }
    /**
     * Loads developer state from global storage or creates a default one.
     */
    loadDeveloper() {
        const saved = this.context.globalState.get('developer');
        if (saved) {
            // Ensure new properties exist on old saves
            if (!saved.inventory)
                saved.inventory = [];
            if (!saved.lastDailyBonus)
                saved.lastDailyBonus = 0;
            if (!saved.streak)
                saved.streak = 0;
            if (!saved.skills)
                saved.skills = [];
            if (!saved.quests)
                saved.quests = [];
            if (saved.questStreak === undefined)
                saved.questStreak = 0;
            if (saved.dailyQuestsCompleted === undefined)
                saved.dailyQuestsCompleted = false;
            if (saved.tutorialCompleted === undefined)
                saved.tutorialCompleted = false;
            if (!saved.achievements)
                saved.achievements = [];
            if (!saved.activityLog)
                saved.activityLog = [];
            if (saved.isBurntOut === undefined)
                saved.isBurntOut = false;
            if (saved.totalBugsFixed === undefined)
                saved.totalBugsFixed = 0;
            if (saved.totalCommits === undefined)
                saved.totalCommits = 0;
            if (saved.totalCoffeeEarned === undefined)
                saved.totalCoffeeEarned = 0;
            if (saved.focusSprintEndsAt === undefined)
                saved.focusSprintEndsAt = 0;
            if (saved.focusSprintMinutes === undefined)
                saved.focusSprintMinutes = 0;
            if (saved.totalFocusSprintsCompleted === undefined)
                saved.totalFocusSprintsCompleted = 0;
            if (saved.activeErrorCount === undefined)
                saved.activeErrorCount = 0;
            if (saved.totalXpEarned === undefined)
                saved.totalXpEarned = 0;
            if (saved.lastWeeklyRecapAt === undefined)
                saved.lastWeeklyRecapAt = Date.now();
            if (saved.weeklyRecapSnapshot === undefined) {
                saved.weeklyRecapSnapshot = {
                    level: saved.level,
                    totalXpEarned: saved.totalXpEarned,
                    totalCommits: saved.totalCommits || 0,
                    totalBugsFixed: saved.totalBugsFixed || 0,
                    totalCoffeeEarned: saved.totalCoffeeEarned || 0,
                    totalFocusSprintsCompleted: saved.totalFocusSprintsCompleted || 0
                };
            }
            return saved;
        }
        return {
            energy: 100,
            motivation: 100,
            focus: 100,
            health: 100,
            xp: 0,
            level: 1,
            lastUpdated: Date.now(),
            mood: 'productive',
            role: '👨‍💻',
            name: 'Dev',
            coffee: 50,
            skills: [],
            inventory: [],
            lastDailyBonus: 0,
            streak: 0,
            quests: [],
            questStreak: 0,
            dailyQuestsCompleted: false,
            tutorialCompleted: false,
            achievements: [],
            activityLog: [],
            isBurntOut: false,
            totalBugsFixed: 0,
            totalCommits: 0,
            totalCoffeeEarned: 0,
            focusSprintEndsAt: 0,
            focusSprintMinutes: 0,
            totalFocusSprintsCompleted: 0,
            activeErrorCount: 0,
            totalXpEarned: 0,
            lastWeeklyRecapAt: Date.now(),
            weeklyRecapSnapshot: {
                level: 1,
                totalXpEarned: 0,
                totalCommits: 0,
                totalBugsFixed: 0,
                totalCoffeeEarned: 0,
                totalFocusSprintsCompleted: 0
            }
        };
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
    checkAchievements() {
        const earned = this.developer.achievements;
        const unlock = (id) => {
            if (earned.includes(id))
                return;
            earned.push(id);
            const ach = ACHIEVEMENTS.find(a => a.id === id);
            this.addLog(`Achievement unlocked: ${ach.icon} ${ach.name}`, 'achievement');
            vscode.window.showInformationMessage(`🏅 Achievement Unlocked: ${ach.icon} ${ach.name} — ${ach.description}`);
        };
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
            vscode.window.showInformationMessage(`🏅 Achievement Unlocked: ${ach.icon} ${ach.name} — ${ach.description}`);
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
        const hoursPassed = (now - this.developer.lastUpdated) / (1000 * 60 * 60);
        let energyDecay = 4;
        if (this.developer.inventory.includes('furn_chair'))
            energyDecay *= 0.85;
        let motivationDecay = 2;
        if (this.developer.inventory.includes('acc_keyboard'))
            motivationDecay *= 0.85;
        this.developer.energy = Math.max(0, this.developer.energy - hoursPassed * energyDecay);
        this.developer.motivation = Math.max(0, this.developer.motivation - hoursPassed * motivationDecay);
        let focusDecay = this.developer.skills.includes('iron_focus') ? 2.1 : 3; // 30% slower
        if (this.isFocusSprintActive())
            focusDecay *= 0.5; // Deep work protects your Focus stat
        this.developer.focus = Math.max(0, this.developer.focus - hoursPassed * focusDecay);
        // Linter Stress: Active errors drain energy and motivation over time
        if (this.lastErrorCount > 0) {
            const stressFactor = this.lastErrorCount * 0.05;
            this.developer.energy = Math.max(0, this.developer.energy - stressFactor);
            this.developer.motivation = Math.max(0, this.developer.motivation - stressFactor);
        }
        // Track active coding time for quests (ignore offline time > 5 mins)
        if (hoursPassed < 0.083) {
            this.updateQuestProgress('time', hoursPassed * 60);
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
            vscode.window.showInformationMessage(`📊 Your week with ${this.developer.name}: ${summary}`);
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
     * Whether a Focus Sprint is currently running.
     */
    isFocusSprintActive() {
        return !!this.developer.focusSprintEndsAt && this.developer.focusSprintEndsAt > Date.now();
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
            this.developer.coffee += FOCUS_SPRINT_BONUS_COFFEE;
            this.developer.totalCoffeeEarned = (this.developer.totalCoffeeEarned || 0) + FOCUS_SPRINT_BONUS_COFFEE;
            this.developer.totalFocusSprintsCompleted = (this.developer.totalFocusSprintsCompleted || 0) + 1;
            this.addXP(FOCUS_SPRINT_BONUS_XP);
            this.addLog(`🎯 Focus Sprint complete! +${FOCUS_SPRINT_BONUS_XP} XP, +${FOCUS_SPRINT_BONUS_COFFEE} ☕`, 'achievement');
            vscode.window.showInformationMessage(`🎯 Focus Sprint complete! +${FOCUS_SPRINT_BONUS_XP} XP, +${FOCUS_SPRINT_BONUS_COFFEE} ☕ — nice focus.`);
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
            const bonus = 20 + (this.developer.streak * 5);
            this.developer.coffee += bonus;
            this.developer.lastDailyBonus = now;
            this.generateDailyQuests();
            vscode.window.showInformationMessage(`🌞 Daily Login Bonus! +${bonus} ☕ (Streak: ${this.developer.streak} days)`);
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
            this.developer = {
                energy: 100,
                motivation: 100,
                focus: 100,
                health: 100,
                xp: 0,
                level: 1,
                lastUpdated: Date.now(),
                mood: 'productive',
                role: '👨‍💻',
                name: 'Dev',
                coffee: 50,
                skills: [],
                inventory: [],
                lastDailyBonus: 0,
                streak: 0,
                quests: [],
                achievements: [],
                activityLog: [],
                isBurntOut: false,
                totalBugsFixed: 0,
                totalCommits: 0,
                totalCoffeeEarned: 0,
                focusSprintEndsAt: 0,
                focusSprintMinutes: 0,
                totalFocusSprintsCompleted: 0,
                activeErrorCount: 0,
                totalXpEarned: 0,
                lastWeeklyRecapAt: Date.now(),
                weeklyRecapSnapshot: {
                    level: 1,
                    totalXpEarned: 0,
                    totalCommits: 0,
                    totalBugsFixed: 0,
                    totalCoffeeEarned: 0,
                    totalFocusSprintsCompleted: 0
                }
            };
            this.saveDeveloper();
            this.updateStats();
            vscode.window.showInformationMessage('Progress reset successfully.');
        }
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
            vscode.window.showInformationMessage(`🏅 Achievement Unlocked: ${ach.icon} ${ach.name}`);
        }
        this.developer.motivation = Math.min(100, this.developer.motivation + 3);
        this.developer.coffee += 1;
        this.developer.totalCoffeeEarned = (this.developer.totalCoffeeEarned || 0) + 1;
        this.addXP(3);
        this.addLog(`📝 File saved  +3 XP  +1 ☕`, 'xp');
        this.updateQuestProgress('save');
        this.checkAchievements();
        this.saveDeveloper();
    }
    /**
     * Event: Triggered when a git commit or merge is detected.
     */
    onGitCommit() {
        this.developer.motivation = Math.min(100, this.developer.motivation + 20);
        this.developer.coffee += 5;
        this.developer.totalCoffeeEarned = (this.developer.totalCoffeeEarned || 0) + 5;
        this.developer.totalCommits = (this.developer.totalCommits || 0) + 1;
        this.addXP(50);
        this.addLog(`📦 Git commit  +50 XP  +5 ☕`, 'xp');
        this.updateQuestProgress('commit');
        this.checkAchievements();
        this.saveDeveloper();
        vscode.window.showInformationMessage(`Git Activity! +50 XP, +5 ☕`);
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
            this.checkAchievements();
            vscode.window.setStatusBarMessage(`Bug squashed! +${fixed * 5 * xpMult} XP 🐛`, 3000);
            // Bug Boss defeated: every active error just got cleared.
            if (currentErrors === 0 && previousErrors > 0) {
                this.addXP(BUG_BOSS_DEFEAT_BONUS_XP);
                this.developer.coffee += BUG_BOSS_DEFEAT_BONUS_COFFEE;
                this.developer.totalCoffeeEarned = (this.developer.totalCoffeeEarned || 0) + BUG_BOSS_DEFEAT_BONUS_COFFEE;
                this.addLog(`👾 Bug Boss defeated! +${BUG_BOSS_DEFEAT_BONUS_XP} XP, +${BUG_BOSS_DEFEAT_BONUS_COFFEE} ☕`, 'achievement');
                vscode.window.showInformationMessage(`👾 Bug Boss defeated! +${BUG_BOSS_DEFEAT_BONUS_XP} XP, +${BUG_BOSS_DEFEAT_BONUS_COFFEE} ☕ — your code is clean.`);
            }
        }
        else if (diff > 0) {
            // New bugs introduced - slight focus hit
            this.developer.focus = Math.max(0, this.developer.focus - (diff * 0.5));
        }
        this.lastErrorCount = currentErrors;
        this.developer.activeErrorCount = currentErrors;
        this.saveDeveloper();
    }
    /**
     * Updates progress for active quests of a specific type.
     */
    updateQuestProgress(type, amount = 1) {
        let updated = false;
        this.developer.quests.forEach(q => {
            if (q.type === type && !q.completed) {
                q.progress += amount;
                if (q.progress >= q.target) {
                    q.progress = q.target;
                    q.completed = true;
                    this.developer.coffee += q.reward;
                    vscode.window.showInformationMessage(`✅ Quest Complete: ${q.description} (+${q.reward} ☕)`);
                }
                updated = true;
            }
        });
        // Check if all quests are completed for the day
        if (!this.developer.dailyQuestsCompleted && this.developer.quests.length > 0 && this.developer.quests.every(q => q.completed)) {
            this.developer.dailyQuestsCompleted = true;
            this.developer.questStreak = (this.developer.questStreak || 0) + 1;
            const bonus = 50 + (this.developer.questStreak * 10);
            this.developer.coffee += bonus;
            vscode.window.showInformationMessage(`🎉 All Daily Quests Complete! +${bonus} ☕ (Quest Streak: ${this.developer.questStreak})`);
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
     * Adds XP and handles leveling up logic.
     */
    addXP(amount) {
        const sprintMultiplier = this.isFocusSprintActive() ? FOCUS_SPRINT_XP_MULTIPLIER : 1;
        const gained = Math.floor(amount * (1 + this.developer.energy / 100) * (1 + this.developer.focus / 100) * (1 + this.developer.motivation / 100) * sprintMultiplier);
        this.developer.xp += gained;
        this.developer.totalXpEarned = (this.developer.totalXpEarned || 0) + gained;
        let leveledUp = false;
        let xpNeeded = this.developer.level * 100;
        while (this.developer.xp >= xpNeeded) {
            this.developer.level++;
            this.developer.xp -= xpNeeded;
            xpNeeded = this.developer.level * 100;
            leveledUp = true;
        }
        if (leveledUp) {
            this.addLog(`🎉 LEVEL UP → Level ${this.developer.level}!`, 'achievement');
            vscode.window.showInformationMessage(`🎉 ${this.developer.name} leveled up to Level ${this.developer.level}!`);
        }
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
    static createOrShow(extensionUri, devManager) {
        if (DeveloperPanel.currentPanel) {
            DeveloperPanel.currentPanel.panel.reveal();
            return;
        }
        const panel = vscode.window.createWebviewPanel('devGotchi', '👨‍💻 DevGotchi', vscode.ViewColumn.Two, { enableScripts: true, retainContextWhenHidden: true });
        DeveloperPanel.currentPanel = new DeveloperPanel(panel, devManager);
    }
    /**
     * Private constructor. Sets up the webview HTML and message listeners.
     */
    constructor(panel, devManager) {
        this.devManager = devManager;
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
                case 'challenge-completed':
                    const coffee = this.devManager.challengeCompleted(message.score);
                    this.panel.webview.postMessage({ command: 'challenge-result', result: { message: `Earned ${coffee} coffee beans!` } });
                    this.updateDeveloper();
                    break;
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
                    this.panel.webview.postMessage({ command: 'action-result', result: { message: '📋 Copied! Paste it into your README or a post.' } });
                    break;
                case 'save-stats-image':
                    this.saveStatsImage(message.dataUrl, message.suggestedName);
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
        this.panel.webview.postMessage({ command: 'update', developer: this.devManager.getDeveloper() });
    }
    /**
     * Tells the webview to open the Share Stats Card modal (used by the
     * "Export Stats Card" command palette entry).
     */
    openShareCard() {
        this.panel.webview.postMessage({ command: 'open-share-modal' });
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
    .share-canvas-wrap {
      border: 1px solid var(--border);
      border-radius: 4px;
      overflow: hidden;
      line-height: 0;
    }
    #shareCanvas { width: 100%; height: auto; display: block; }

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
              <div class="dev-role">Junior Developer</div>
              <div id="devName" class="dev-name" onclick="showRenameModal()" title="Click to rename">Dev</div>
            </div>
            <div style="text-align:right; flex-shrink:0;">
              <div class="level-badge" id="levelBadge">LEVEL 1</div>
              <div class="xp-row" style="justify-content:flex-end; margin-top:4px;">
                <div class="xp-bar-wrap" style="max-width:120px;"><div id="xpBar" class="xp-fill" style="width:0%"></div></div>
                <div class="xp-text" id="xpText">0 / 100 XP</div>
              </div>
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
          <button id="btn-log" class="action-btn" onclick="toggleLog()" title="Activity Log">
            <div class="action-icon">📡</div><div class="action-label">Log</div>
          </button>
          <button id="btn-share" class="action-btn" onclick="showShareModal()" title="Share your stats">
            <div class="action-icon">📤</div><div class="action-label">Share</div>
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

      <!-- ── ACTIVITY LOG ── -->
      <div id="logPanel" style="display:none; background:var(--bg-panel); border:1px solid var(--border); border-top:2px solid var(--neon-blue); border-radius:4px; padding:14px; margin-bottom:12px;">
        <div class="section-title" style="color:var(--neon-blue);">◈ Activity Log</div>
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

      <!-- ── SHARE STATS CARD MODAL ── -->
      <div id="shareModal" class="modal">
        <div class="modal-content" style="max-width:640px">
          <h3>📤 Share Your Stats</h3>
          <div class="share-canvas-wrap">
            <canvas id="shareCanvas" width="1200" height="630"></canvas>
          </div>
          <div class="modal-buttons" style="margin-top:12px;">
            <button onclick="copyStatsMarkdown()">📋 COPY AS MARKDOWN</button>
            <button onclick="saveStatsImage()">🖼️ SAVE AS IMAGE</button>
          </div>
          <button class="modal-close-btn" onclick="closeShareModal()">CLOSE</button>
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
        const SKILLS = ${JSON.stringify(SKILLS)};
        const SHOP_ITEMS = ${JSON.stringify(SHOP_ITEMS)};

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

        function renderShop() {
          const list = document.getElementById('shopList');
          list.innerHTML = '';
          if (!currentDev) return;

          SHOP_ITEMS.forEach(item => {
            const owned = currentDev.inventory && currentDev.inventory.includes(item.id);
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
            document.getElementById('devAvatar').textContent = dev.mood === 'sleeping' ? '💤' : dev.role;
            // Redraw scene with current mood
            const sc = document.getElementById('sceneCanvas');
            if (sc) drawScene(sc, dev.mood);
            document.getElementById('levelBadge').textContent = 'LEVEL ' + dev.level;

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

            // Boss card: shows a real Bug Boss when there are active lint/build
            // errors, otherwise falls back to the burnout-derived boss.
            const bossCard = document.getElementById('bossCard');
            const activeErrors = dev.activeErrorCount || 0;
            if (activeErrors > 0) {
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
            } else {
              bossCard.classList.remove('bug-mode');
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
            if(document.getElementById('logPanel').style.display !== 'none') renderLog();

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

        function drawCharacter(ctx, cx, groundY, mood) {
          const P = 3; // canvas pixels per logical pixel
          // Colour palette
          const C = {
            ' ': null,
            'H': '#1a1a2e', 'h': '#252550',           // hair
            'S': '#b87048', 's': '#ca8860',            // skin
            'e': '#080818',                             // eyes/dark detail
            'C': '#2d1b60', 'c': '#3d287a',            // hoodie
            'G': '#9d4edd',                             // chest glow pixel
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
          cg.addColorStop(0, 'rgba(157,78,221,0.4)');
          cg.addColorStop(1, 'rgba(157,78,221,0)');
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

        function drawScene(canvas, mood) {
          const ctx = canvas.getContext('2d');
          ctx.imageSmoothingEnabled = false;
          const W = canvas.width, H = canvas.height;
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
          drawCharacter(ctx, W / 2, floorY, mood);

          // Ground glow under character
          const gg = ctx.createRadialGradient(W/2, floorY + 10, 2, W/2, floorY + 10, 70);
          gg.addColorStop(0, 'rgba(110,35,200,0.32)');
          gg.addColorStop(1, 'rgba(110,35,200,0)');
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
            list.innerHTML += '<div class="ach-item ' + (isEarned ? 'earned' : 'locked') + '">' +
              '<div class="ach-icon">' + ach.icon + '</div>' +
              '<div class="ach-info">' +
                '<div class="ach-name">' + ach.name + '</div>' +
                '<div class="ach-desc">' + ach.description + '</div>' +
              '</div>' +
              (isEarned ? '<span style="color:var(--neon-gold);font-size:14px;">✓</span>' : '<span style="color:var(--text-dim);font-size:11px;">🔒</span>') +
            '</div>';
          });
        }

        // ── SHARE STATS CARD ────────────────────────────────────────────────
        function getTitleForLevel(level) {
          if (level >= 25) return 'Legendary Dev';
          if (level >= 10) return 'Code Monk';
          if (level >= 5) return 'Mid-Level Developer';
          return 'Junior Developer';
        }

        function showShareModal() {
          document.getElementById('shareModal').classList.add('active');
          renderShareCard();
        }
        function closeShareModal() {
          document.getElementById('shareModal').classList.remove('active');
        }

        function renderShareCard() {
          if (!currentDev) return;
          const dev = currentDev;
          const canvas = document.getElementById('shareCanvas');
          const ctx = canvas.getContext('2d');
          const W = canvas.width, H = canvas.height;

          // Background
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
          ctx.fillText('CODE IS A MARTIAL ART', 58, 100);

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
          const tileY = 380, tileH = 150;
          const tileGap = 14;
          const tileW = (W - 112 - tileGap * 4) / 5;
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

          // Footer
          ctx.textAlign = 'center';
          ctx.fillStyle = '#5a5878';
          ctx.font = '13px "Share Tech Mono", monospace';
          ctx.fillText('Built with DevGotchi — a virtual developer for VS Code', W/2, H - 34);
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

        function saveStatsImage() {
          if (!currentDev) return;
          renderShareCard();
          const canvas = document.getElementById('shareCanvas');
          const dataUrl = canvas.toDataURL('image/png');
          const safeName = (currentDev.name || 'dev').toLowerCase().replace(/[^a-z0-9]+/g, '-');
          vscode.postMessage({ command: 'save-stats-image', dataUrl, suggestedName: 'devgotchi-' + safeName + '.png' });
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
          masterGain.gain.linearRampToValueAtTime(0.72, audioCtx.currentTime + 2.0);
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

        function scheduleBar(barStart) {
          if (!musicPlaying) return;
          const stepsPerBar = 16;

          for (let s = 0; s < stepsPerBar; s++) {
            const t = barStart + s * STEP;

            // ── Kick: 1, 3, 5, 7 (quarter notes on beat 1 & 3)
            if (s === 0 || s === 4 || s === 8 || s === 12) playKick(t);
            // ── Hi-hat: every even eighth
            if (s % 2 === 0) playHat(t, 0.18);
            if (s % 2 === 1) playHat(t, 0.08);

            // ── Bass: every 2 steps
            if (s % 2 === 0) {
              const bIdx = bassSeq[(bassStep++) % bassSeq.length];
              playNote(BASS[bIdx], t, STEP * 2.2, 'sawtooth', 0.22, 320, 0);
            }

            // ── Arp: every step
            const aIdx = arpSeq[(arpStep++) % arpSeq.length];
            playNote(SCALE[aIdx], t, STEP * 0.6, 'square', 0.07, 2200, (s % 4 < 2) ? -0.3 : 0.3);
          }

          // ── Pad chord: whole bar, swells every 2 bars
          if (barCount % 2 === 0) {
            padNotes.forEach((freq, i) => {
              const panVal = [-0.5, -0.2, 0.2, 0.5][i];
              playNote(freq, barStart, STEP * stepsPerBar * 2, 'sawtooth', 0.055, 900, panVal);
            });
          }

          // ── Synth lead: sparse, every 4 bars
          if (barCount % 4 === 0) {
            const lead = [SCALE[6], SCALE[8], SCALE[9], SCALE[7]];
            lead.forEach((f, i) => {
              playNote(f * 2, barStart + i * STEP * 4, STEP * 3, 'sawtooth', 0.09, 3000, 0.1);
            });
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