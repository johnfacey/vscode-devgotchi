"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
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
        statusBarItem.text = `${emoji} ${dev.name} Lv${dev.level}`;
        statusBarItem.tooltip = `💪 ${Math.round(dev.health)}% | 🔥 ${Math.round(dev.motivation)}% | 🧠 ${Math.round(dev.focus)}% | ☕ ${dev.coffee}`;
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
            tutorialCompleted: false
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
        const focusDecay = this.developer.skills.includes('iron_focus') ? 2.1 : 3; // 30% slower
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
        this.saveDeveloper();
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
                quests: []
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
        this.developer.motivation = Math.min(100, this.developer.motivation + 3);
        this.developer.coffee += 1;
        this.addXP(3);
        this.updateQuestProgress('save');
        this.saveDeveloper();
    }
    /**
     * Event: Triggered when a git commit or merge is detected.
     */
    onGitCommit() {
        this.developer.motivation = Math.min(100, this.developer.motivation + 20);
        this.developer.coffee += 5;
        this.addXP(50);
        this.updateQuestProgress('commit');
        this.saveDeveloper();
        vscode.window.showInformationMessage(`Git Activity! +50 XP, +5 ☕`);
    }
    setInitialErrorCount(count) {
        this.lastErrorCount = count;
    }
    updateErrorCount(currentErrors) {
        const diff = currentErrors - this.lastErrorCount;
        if (diff < 0) {
            // Fixed bugs
            const fixed = Math.abs(diff);
            const xpMult = this.developer.skills.includes('bug_slayer') ? 2 : 1;
            this.addXP(fixed * 5 * xpMult);
            this.developer.motivation = Math.min(100, this.developer.motivation + fixed);
            this.updateQuestProgress('fix', fixed);
            vscode.window.setStatusBarMessage(`Bug squashed! +${fixed * 5 * xpMult} XP 🐛`, 3000);
        }
        else if (diff > 0) {
            // New bugs introduced - slight focus hit
            this.developer.focus = Math.max(0, this.developer.focus - (diff * 0.5));
        }
        this.lastErrorCount = currentErrors;
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
        this.developer.xp += Math.floor(amount * (1 + this.developer.energy / 100) * (1 + this.developer.focus / 100) * (1 + this.developer.motivation / 100));
        let leveledUp = false;
        let xpNeeded = this.developer.level * 100;
        while (this.developer.xp >= xpNeeded) {
            this.developer.level++;
            this.developer.xp -= xpNeeded;
            xpNeeded = this.developer.level * 100;
            leveledUp = true;
        }
        if (leveledUp) {
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
            }
        }, null, this.disposables);
        this.updateDeveloper();
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
    body { font-family: var(--vscode-font-family); padding: 20px; color: var(--vscode-foreground); background: var(--vscode-editor-background); }
    .container { max-width: 500px; margin: 0 auto; }
    .dev-display { text-align: center; padding: 30px; border: 2px solid var(--vscode-panel-border); border-radius: 10px; margin-bottom: 20px; background: var(--vscode-input-background); }
    .dev-avatar { font-size: 100px; margin: 15px 0; animation: float 3s ease-in-out infinite; }
    @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
    .dev-name-container { margin: 15px 0; }
    .dev-name { font-size: 24px; font-weight: bold; cursor: pointer; padding: 8px 16px; border-radius: 8px; display: inline-block; transition: background 0.2s; }
    .dev-name:hover { background: var(--vscode-button-hoverBackground); }
    .level-info { margin: 15px 0; }
    .level-badge { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 8px 20px; border-radius: 20px; font-size: 16px; font-weight: bold; color: white; box-shadow: 0 4px 8px rgba(0,0,0,0.2); }
    .xp-bar-container { margin: 10px auto; max-width: 200px; }
    .xp-bar { background: #333; height: 8px; border-radius: 4px; overflow: hidden; }
    .xp-fill { height: 100%; background: linear-gradient(90deg, #667eea, #764ba2); transition: width 0.3s; }
    .xp-text { font-size: 11px; margin-top: 5px; opacity: 0.7; }
    .coffee-display { font-size: 20px; font-weight: bold; margin: 10px 0; color: #d4a574; }
    .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 20px 0; }
    .stat { background: var(--vscode-input-background); padding: 12px; border-radius: 8px; border: 1px solid var(--vscode-panel-border); }
    .stat-label { font-size: 13px; font-weight: 600; margin-bottom: 8px; }
    .stat-bar { background: #2d2d2d; height: 20px; border-radius: 10px; overflow: hidden; position: relative; }
    .stat-fill { height: 100%; transition: width 0.3s; }
    .stat-text { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 11px; font-weight: bold; color: white; text-shadow: 0 1px 2px rgba(0,0,0,0.5); }
    .health { background: linear-gradient(90deg, #ff4444, #ff6666); } 
    .motivation { background: linear-gradient(90deg, #ffaa00, #ffcc44); } 
    .focus { background: linear-gradient(90deg, #9d4edd, #c77dff); } 
    .energy { background: linear-gradient(90deg, #4444ff, #6666ff); }
    .actions { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 20px 0; }
    button { padding: 15px; font-size: 24px; cursor: pointer; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 8px; transition: all 0.2s; }
    button:hover { background: var(--vscode-button-hoverBackground); transform: translateY(-2px); }
    .action-btn { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 10px; font-size: 14px; }
    .action-icon { font-size: 24px; margin-bottom: 4px; }
    .action-label { font-size: 10px; opacity: 0.9; font-weight: 600; }
    .challenge-container { display: none; margin-top: 20px; border: 2px solid var(--vscode-panel-border); padding: 20px; border-radius: 10px; background: var(--vscode-input-background); }
    .challenge-container.active { display: block; }
    .challenge-menu { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px; }
    .challenge-btn { padding: 25px; font-size: 16px; }
    .bug-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; max-width: 300px; margin: 20px auto; }
    .bug-spot { height: 80px; background: var(--vscode-editor-background); border: 2px solid var(--vscode-panel-border); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 40px; cursor: pointer; transition: transform 0.1s; }
    .bug-spot:hover { transform: scale(1.05); }
    .bug-spot:active { transform: scale(0.95); }
    .notification { position: fixed; top: 20px; right: 20px; background: var(--vscode-notifications-background); border: 1px solid var(--vscode-notifications-border); padding: 15px 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); animation: slideIn 0.3s ease; z-index: 1000; }
    @keyframes slideIn { from { transform: translateX(400px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    .timer { font-size: 18px; font-weight: bold; margin: 10px 0; }
    .modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 2000; }
    .modal.active { display: flex; align-items: center; justify-content: center; }
    .modal-content { background: var(--vscode-editor-background); padding: 30px; border-radius: 10px; border: 2px solid var(--vscode-panel-border); max-width: 400px; }
    .modal-input { width: 100%; padding: 10px; margin: 15px 0; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-panel-border); border-radius: 5px; font-size: 16px; }
    .modal-buttons { display: flex; gap: 10px; margin-top: 20px; }
    .modal-buttons button { flex: 1; padding: 10px; font-size: 14px; }
    .skill-item { background: var(--vscode-input-background); padding: 10px; margin-bottom: 10px; border-radius: 5px; border: 1px solid var(--vscode-panel-border); display: flex; justify-content: space-between; align-items: center; }
    .skill-info { text-align: left; }
    .skill-name { font-weight: bold; display: block; }
    .skill-desc { font-size: 12px; opacity: 0.8; }
    .skill-cost { font-weight: bold; color: #d4a574; }
    .shop-tabs { display: flex; gap: 10px; margin-bottom: 15px; border-bottom: 1px solid var(--vscode-panel-border); padding-bottom: 5px; }
    .shop-tab { cursor: pointer; opacity: 0.6; padding: 5px; }
    .shop-tab.active { opacity: 1; font-weight: bold; border-bottom: 2px solid var(--vscode-button-background); }
    .boss-container { text-align: center; padding: 20px; }
    .boss-sprite { font-size: 80px; margin-bottom: 10px; transition: transform 0.1s; }
    .boss-hp-bar { width: 100%; height: 20px; background: #555; border-radius: 10px; overflow: hidden; margin-bottom: 20px; border: 1px solid var(--vscode-panel-border); }
    .boss-hp-fill { height: 100%; background: #ff4444; width: 100%; transition: width 0.2s; }
    .shake { animation: shake 0.5s; }
    @keyframes shake { 0% { transform: translate(1px, 1px) rotate(0deg); } 10% { transform: translate(-1px, -2px) rotate(-1deg); } 20% { transform: translate(-3px, 0px) rotate(1deg); } 30% { transform: translate(3px, 2px) rotate(0deg); } 40% { transform: translate(1px, -1px) rotate(1deg); } 50% { transform: translate(-1px, 2px) rotate(-1deg); } 60% { transform: translate(-3px, 1px) rotate(0deg); } 70% { transform: translate(3px, 1px) rotate(-1deg); } 80% { transform: translate(-1px, -1px) rotate(1deg); } 90% { transform: translate(1px, 2px) rotate(0deg); } 100% { transform: translate(1px, -2px) rotate(-1deg); } }
    .leaderboard-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    .leaderboard-table th, .leaderboard-table td { padding: 10px; text-align: left; border-bottom: 1px solid var(--vscode-panel-border); }
    .leaderboard-table th { font-weight: bold; opacity: 0.8; }
    .leaderboard-row.highlight { background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
    .quest-item { background: var(--vscode-input-background); padding: 10px; margin-bottom: 10px; border-radius: 5px; border: 1px solid var(--vscode-panel-border); }
    .quest-header { display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 5px; }
    .quest-progress-bg { height: 6px; background: #333; border-radius: 3px; overflow: hidden; }
    .quest-progress-fill { height: 100%; background: #4caf50; transition: width 0.3s; }
    .tutorial-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 9000; pointer-events: none; display: none; }
    .tutorial-overlay.active { display: block; }
    .tutorial-highlight { position: relative; z-index: 9001; box-shadow: 0 0 0 9999px rgba(0,0,0,0.85); pointer-events: none; border-radius: 8px; }
    .tutorial-box { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background: var(--vscode-editor-background); border: 2px solid var(--vscode-focusBorder); padding: 20px; border-radius: 8px; z-index: 9002; width: 90%; max-width: 400px; text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.5); display: none; }
    .tutorial-box.active { display: block; }
    </style></head>
    <body>
      <div class="container">
        <div class="dev-display">
          <div id="devAvatar" class="dev-avatar">👨‍💻</div>
          <div class="dev-name-container">
            <div id="devName" class="dev-name" onclick="showRenameModal()" title="Click to rename">Dev</div>
          </div>
          <div class="level-info">
            <div class="level-badge" id="levelBadge">Level 1</div>
            <div class="xp-bar-container">
              <div class="xp-bar">
                <div id="xpBar" class="xp-fill" style="width: 0%;"></div>
              </div>
              <div class="xp-text" id="xpText">0 / 100 XP</div>
            </div>
          </div>
          <div class="coffee-display" id="coffeeDisplay">☕ 50 beans</div>
        </div>
        
        <div class="stats">
          <div class="stat">
            <div class="stat-label">💪 Health</div>
            <div class="stat-bar">
              <div id="healthBar" class="stat-fill health" style="width: 100%;"></div>
              <div id="healthText" class="stat-text">100%</div>
            </div>
          </div>
          <div class="stat">
            <div class="stat-label">🔥 Motivation</div>
            <div class="stat-bar">
              <div id="motivationBar" class="stat-fill motivation" style="width: 100%;"></div>
              <div id="motivationText" class="stat-text">100%</div>
            </div>
          </div>
          <div class="stat">
            <div class="stat-label">🧠 Focus</div>
            <div class="stat-bar">
              <div id="focusBar" class="stat-fill focus" style="width: 100%;"></div>
              <div id="focusText" class="stat-text">100%</div>
            </div>
          </div>
          <div class="stat">
            <div class="stat-label">⚡ Energy</div>
            <div class="stat-bar">
              <div id="energyBar" class="stat-fill energy" style="width: 100%;"></div>
              <div id="energyText" class="stat-text">100%</div>
            </div>
          </div>
        </div>
        
        <div class="actions">
          <button id="btn-coffee" class="action-btn" onclick="giveCoffee()" title="Give coffee (10 beans)"><div class="action-icon">☕</div><div class="action-label">Coffee</div></button>
          <button id="btn-games" class="action-btn" onclick="toggleChallenges()" title="Coding challenges"><div class="action-icon">🎯</div><div class="action-label">Games</div></button>
          <button id="btn-break" class="action-btn" onclick="takeBreak()" title="Take a break"><div class="action-icon">🌴</div><div class="action-label">Break</div></button>
          <button id="btn-skills" class="action-btn" onclick="showSkills()" title="Skill Tree"><div class="action-icon">⚡</div><div class="action-label">Skills</div></button>
          <button id="btn-shop" class="action-btn" onclick="showShop()" title="Shop"><div class="action-icon">🛍️</div><div class="action-label">Shop</div></button>
          <button id="btn-rank" class="action-btn" onclick="showLeaderboard()" title="Leaderboard"><div class="action-icon">🏆</div><div class="action-label">Rank</div></button>
          <button id="btn-quests" class="action-btn" onclick="showQuests()" title="Daily Quests"><div class="action-icon">📜</div><div class="action-label">Quests</div></button>
        </div>
        
        <div id="challengeContainer" class="challenge-container">
          <h3 style="text-align: center; margin-bottom: 15px;">Coding Challenges</h3>
          <div id="challengeMenu" class="challenge-menu">
            <button class="challenge-btn" onclick="startBugHunt()">🐛<br>Bug Hunt</button>
            <button class="challenge-btn" onclick="startSpeedTest()">⚡<br>Speed Test</button>
            <button class="challenge-btn" onclick="startBossBattle()">👾<br>Boss Battle</button>
          </div>
          <div id="challengeArea" style="display:none"></div>
          <button onclick="backToMenu()" style="width:100%; margin-top:10px; font-size: 14px;">Exit Game</button>
        </div>
      </div>

      <div id="renameModal" class="modal">
        <div class="modal-content">
          <h3>Rename Developer</h3>
          <input type="text" id="nameInput" class="modal-input" placeholder="Enter new name" maxlength="20">
          <div class="modal-buttons">
            <button onclick="closeRenameModal()">Cancel</button>
            <button onclick="submitRename()">Save</button>
          </div>
        </div>
      </div>

      <div id="skillsModal" class="modal">
        <div class="modal-content" style="max-width: 500px;">
          <h3>Skill Tree</h3>
          <div id="skillsList" class="skills-list"></div>
          <button onclick="closeSkillsModal()" style="margin-top: 15px; width: 100%;">Close</button>
        </div>
      </div>

      <div id="shopModal" class="modal">
        <div class="modal-content" style="max-width: 500px;">
          <h3>Coffee Shop</h3>
          <div id="shopList" class="skills-list"></div>
          <button onclick="closeShopModal()" style="margin-top: 15px; width: 100%;">Close</button>
        </div>
      </div>

      <div id="leaderboardModal" class="modal">
        <div class="modal-content" style="max-width: 400px;">
          <h3>🏆 Global Leaderboard</h3>
          <table class="leaderboard-table">
            <thead><tr><th>#</th><th>Dev</th><th>Lvl</th></tr></thead>
            <tbody id="leaderboardBody"></tbody>
          </table>
          <button onclick="closeLeaderboardModal()" style="margin-top: 15px; width: 100%;">Close</button>
        </div>
      </div>

      <div id="questsModal" class="modal">
        <div class="modal-content" style="max-width: 400px;">
          <h3>📜 Daily Quests</h3>
          <div id="questsList"></div>
          <button onclick="closeQuestsModal()" style="margin-top: 15px; width: 100%;">Close</button>
        </div>
      </div>

      <div id="tutorialOverlay" class="tutorial-overlay"></div>
      <div id="tutorialBox" class="tutorial-box">
        <h3 id="tutTitle">Welcome!</h3>
        <p id="tutText">Let's take a quick tour of DevGotchi.</p>
        <button onclick="nextTutorialStep()" style="margin-top: 10px; font-size: 14px; padding: 8px 20px;">Next</button>
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
            const costHtml = canAfford ? skill.cost : '<span style="color:#ff4444">' + skill.cost + '</span>';
            const btnHtml = unlocked 
              ? '<span style="color:#4caf50; font-weight:bold;">Unlocked</span>' 
              : '<button onclick="unlockSkill(\\'' + skill.id + '\\')" style="padding:5px 10px; font-size:12px;">Unlock (' + costHtml + ')</button>';
            
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
            const costHtml = canAfford ? item.cost : '<span style="color:#ff4444">' + item.cost + '</span>';
            let btnHtml = '';
            
            if (owned) {
              if (item.type === 'skin') {
                const isEquipped = currentDev.role === item.emoji;
                btnHtml = isEquipped 
                  ? '<span style="color:#4caf50; font-size:12px;">Equipped</span>' 
                  : '<button onclick="equipItem(\\'' + item.id + '\\')" style="padding:5px 10px; font-size:12px;">Equip</button>';
              } else {
                btnHtml = '<span style="color:#4caf50; font-size:12px;">Active</span>';
              }
            } else {
              btnHtml = '<button onclick="buyItem(\\'' + item.id + '\\')" style="padding:5px 10px; font-size:12px;">Buy (' + costHtml + ')</button>';
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
          list.innerHTML += '<div style="text-align:center; margin-bottom:10px; font-weight:bold; color:#d4a574;">🔥 Quest Streak: ' + streak + ' days</div>';

          (currentDev.quests || []).forEach(q => {
            const pct = Math.floor(Math.min(100, (q.progress / q.target) * 100));
            const status = q.completed ? '✅' : pct + '%';
            const html = '<div class="quest-item"><div class="quest-header"><span>' + q.description + '</span><span>' + status + '</span></div><div class="quest-progress-bg"><div class="quest-progress-fill" style="width: ' + pct + '%"></div></div></div>';
            list.innerHTML += html;
          });
          
          if (!currentDev.quests || currentDev.quests.length === 0) {
            list.innerHTML = '<p style="text-align:center; opacity:0.7;">No active quests. Wait for daily reset!</p>';
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
            document.getElementById('healthBar').style.width = Math.round(dev.health) + '%';
            document.getElementById('healthText').textContent = Math.round(dev.health) + '%';
            document.getElementById('motivationBar').style.width = Math.round(dev.motivation) + '%';
            document.getElementById('motivationText').textContent = Math.round(dev.motivation) + '%';
            document.getElementById('focusBar').style.width = Math.round(dev.focus) + '%';
            document.getElementById('focusText').textContent = Math.round(dev.focus) + '%';
            document.getElementById('energyBar').style.width = Math.round(dev.energy) + '%';
            document.getElementById('energyText').textContent = Math.round(dev.energy) + '%';
            document.getElementById('coffeeDisplay').textContent = '☕ ' + dev.coffee + ' beans';
            document.getElementById('devName').textContent = dev.name;
            document.getElementById('devAvatar').textContent = dev.mood === 'sleeping' ? '💤' : dev.role;
            document.getElementById('levelBadge').textContent = 'Level ' + dev.level;
            
            const xpNeeded = dev.level * 100;
            const xpPercent = (dev.xp / xpNeeded) * 100;
            document.getElementById('xpBar').style.width = xpPercent + '%';
            document.getElementById('xpText').textContent = dev.xp + ' / ' + xpNeeded + ' XP';
            
            if(document.getElementById('skillsModal').classList.contains('active')) renderSkills();
            if(document.getElementById('shopModal').classList.contains('active')) renderShop();
            if(document.getElementById('questsModal').classList.contains('active')) renderQuests();

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
        });

        function startBugHunt() {
          document.getElementById('challengeMenu').style.display = 'none';
          const area = document.getElementById('challengeArea');
          area.style.display = 'block';
          let score = 0; 
          let time = 20;
          area.innerHTML = '<div class="timer" id="timer">Time: 20s</div><div style="text-align:center; margin: 10px 0;">Score: <span id="score">0</span></div><div class="bug-grid" id="grid"></div>';
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
          area.innerHTML = '<h4 style="margin-bottom: 15px;">Type this code:</h4><div style="background: #2d2d2d; padding: 15px; border-radius: 5px; margin: 15px 0; font-family: monospace; font-size: 16px;">' + code + '</div><input id="ti" class="modal-input" placeholder="Type here..." style="margin: 0;">';
          const input = document.getElementById('ti'); 
          input.focus();
          const startTime = Date.now();
          input.oninput = () => {
            if(input.value === code) {
              const timeTaken = Date.now() - startTime;
              const score = Math.max(100 - Math.floor(timeTaken / 100), 20);
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
          
          area.innerHTML = '<div class="boss-container"><div class="timer" id="bossTimer">Time: ' + time + 's</div><div class="boss-hp-bar"><div id="bossHp" class="boss-hp-fill" style="width: 100%"></div></div><div id="bossSprite" class="boss-sprite">👾</div><div style="margin-bottom:10px; font-weight:bold;">Type to attack:</div><div id="bossCode" style="background: #2d2d2d; padding: 10px; border-radius: 5px; font-family: monospace; margin-bottom: 10px;"></div><input id="bossInput" class="modal-input" placeholder="Type code..." style="margin: 0;" autocomplete="off"></div>';
          
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
                score = 300 + (time * 5);
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
      </script>
    </body></html>`;
    }
}
function deactivate() { }
//# sourceMappingURL=extension.js.map