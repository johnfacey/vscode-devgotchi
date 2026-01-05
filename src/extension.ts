import * as vscode from 'vscode';

/**
 * Interface representing the state of the digital developer avatar.
 * Tracks attributes like energy, motivation, and game progress.
 */
interface ProgrammerStats {
  energy: number;      // 0-100: Determines tiredness
  motivation: number;  // 0-100: Affects mood
  focus: number;       // 0-100: Mental sharpness
  health: number;      // 0-100: Overall well-being (average of others)
  xp: number;          // Current experience points
  level: number;       // Current RPG level
  lastUpdated: number; // Timestamp of last stats calculation
  mood: 'productive' | 'neutral' | 'stressed' | 'tired' | 'burnt-out' | 'caffeinated';
  role: string;        // Display role (emoji)
  name: string;        // Name of the developer
  coffee: number;      // Currency for buying actions
}

/**
 * Extension activation entry point.
 * Initializes the game manager, status bar, and event listeners.
 */
export function activate(context: vscode.ExtensionContext) {
  const devManager = new DeveloperManager(context);
  
  // Create and configure the status bar item
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
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
  context.subscriptions.push(
    vscode.commands.registerCommand('devgotchi.openPanel', () => {
      DeveloperPanel.createOrShow(context.extensionUri, devManager);
    })
  );
  
  // Listen for file saves to reward the user
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(() => {
      devManager.onCodeSaved();
      updateStatusBar();
    })
  );
  
  // The "Passive Loop": Update stats every 30 seconds
  const interval = setInterval(() => {
    devManager.updateStats();
    updateStatusBar();
    DeveloperPanel.currentPanel?.updateDeveloper();
  }, 30000);
  
  context.subscriptions.push({
    dispose: () => clearInterval(interval)
  });
}

/**
 * Helper to get the emoji corresponding to a specific mood.
 */
function getMoodEmoji(mood: string): string {
  const emojis: Record<string, string> = {
    productive: '🚀',
    neutral: '💻',
    stressed: '😰',
    tired: '😴',
    'burnt-out': '🔥',
    caffeinated: '☕'
  };
  return emojis[mood] || '👨‍💻';
}

/**
 * Manages the state and logic of the developer avatar.
 * Handles persistence, stat calculations, and game mechanics.
 */
class DeveloperManager {
  private developer: ProgrammerStats;
  private context: vscode.ExtensionContext;
  
  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.developer = this.loadDeveloper();
    this.updateStats();
  }
  
  /**
   * Loads developer state from global storage or creates a default one.
   */
  private loadDeveloper(): ProgrammerStats {
    const saved = this.context.globalState.get<ProgrammerStats>('developer');
    return saved || {
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
      coffee: 50
    };
  }
  
  /**
   * Persists the current state to global storage.
   */
  private saveDeveloper() {
    this.context.globalState.update('developer', this.developer);
  }
  
  getDeveloper(): ProgrammerStats {
    return { ...this.developer };
  }
  
  /**
   * Calculates stat decay based on time passed since last update.
   * Updates health and mood derived from primary stats.
   */
  updateStats() {
    const now = Date.now();
    const hoursPassed = (now - this.developer.lastUpdated) / (1000 * 60 * 60);
    
    this.developer.energy = Math.max(0, this.developer.energy - hoursPassed * 4);
    this.developer.focus = Math.max(0, this.developer.focus - hoursPassed * 3);
    this.developer.motivation = Math.max(0, this.developer.motivation - hoursPassed * 2);
    this.developer.health = (this.developer.energy + this.developer.motivation + this.developer.focus) / 3;
    this.developer.mood = this.calculateMood();
    this.developer.lastUpdated = now;
    this.saveDeveloper();
  }
  
  /**
   * Determines the current mood based on stat thresholds.
   */
  private calculateMood(): ProgrammerStats['mood'] {
    if (this.developer.health < 30) return 'burnt-out';
    if (this.developer.energy < 30) return 'tired';
    if (this.developer.focus < 30) return 'stressed';
    if (this.developer.coffee > 80) return 'caffeinated';
    if (this.developer.motivation > 70) return 'productive';
    return 'neutral';
  }
  
  /**
   * Action: Spend coffee beans to boost energy and focus.
   */
  giveCoffee() {
    if (this.developer.coffee < 10) return { success: false, message: 'Out of coffee beans!' };
    this.developer.coffee -= 10;
    this.developer.energy = Math.min(100, this.developer.energy + 35);
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
    if (this.developer.energy == 100 && this.developer.motivation == 100) return { success: false, message: 'Energy and motivation are full!' };
    this.addXP(Math.floor(Math.max(5, 5 * (100 - this.developer.energy) / 40, 5 * (100 - this.developer.motivation) / 15)));
    this.developer.energy = Math.min(100, this.developer.energy + 40);
    this.developer.motivation = Math.min(100, this.developer.motivation + 15);
    this.developer.focus = Math.max(0, this.developer.focus - 5);
    this.saveDeveloper();
    return { success: true, message: 'Refreshed! 🌴' };
  }
  
  /**
   * Action: Pair program to boost motivation and focus at the cost of energy.
   */
  pairProgram() {
    if (this.developer.energy < 15) return { success: false, message: 'Too tired to pair program!' };
    this.developer.motivation = Math.min(100, this.developer.motivation + 30);
    this.developer.focus = Math.min(100, this.developer.focus + 15);
    this.developer.energy = Math.max(0, this.developer.energy - 15);
    this.addXP(15);
    this.saveDeveloper();
    return { success: true, message: 'Great session! 👥' };
  }
  
  /**
   * Event: Triggered when a file is saved. Small boost to motivation and coffee.
   */
  onCodeSaved() {
    this.developer.motivation = Math.min(100, this.developer.motivation + 3);
    this.developer.coffee += 1;
    this.addXP(3);
    this.saveDeveloper();
  }
  
  /**
   * Event: Triggered when a mini-game challenge is completed.
   */
  challengeCompleted(score: number) {
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
  renameDeveloper(newName: string) {
    this.developer.name = newName;
    this.saveDeveloper();
    return { success: true, message: `Renamed to ${newName}!` };
  }
  
  /**
   * Adds XP and handles leveling up logic.
   */
  private addXP(amount: number) {
    this.developer.xp += Math.floor(amount * (1 + this.developer.energy / 100) * (1 + this.developer.focus / 100) * (1 + this.developer.motivation / 100);
    const xpNeeded = this.developer.level * 100;
    if (this.developer.xp >= xpNeeded) {
      this.developer.level++;
      this.developer.xp -= xpNeeded;
      vscode.window.showInformationMessage(`🎉 ${this.developer.name} leveled up to Level ${this.developer.level}!`);
    }
  }
}

/**
 * Manages the Webview UI for the DevGotchi panel.
 * Handles HTML generation and communication between VS Code and the webview.
 */
class DeveloperPanel {
  public static currentPanel: DeveloperPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private disposables: vscode.Disposable[] = [];
  
  /**
   * Creates or reveals the existing panel.
   */
  public static createOrShow(extensionUri: vscode.Uri, devManager: DeveloperManager) {
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
  private constructor(panel: vscode.WebviewPanel, private devManager: DeveloperManager) {
    this.panel = panel;
    this.panel.webview.html = this.getHtmlContent();
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    this.panel.webview.onDidReceiveMessage((message: any) => {
      switch (message.command) {
        case 'coffee': this.updatePanel(this.devManager.giveCoffee()); break;
        case 'break': this.updatePanel(this.devManager.takeBreak()); break;
        case 'rename': this.updatePanel(this.devManager.renameDeveloper(message.name)); break;
        case 'challenge-completed':
          const coffee = this.devManager.challengeCompleted(message.score);
          this.panel.webview.postMessage({ command: 'challenge-result', result: { message: `Earned ${coffee} coffee beans!` } });
          this.updateDeveloper();
          break;
      }
    }, null, this.disposables);
    this.updateDeveloper();
  }

  /**
   * Sends an action result (success/failure message) back to the webview.
   */
  private updatePanel(result: any) {
    this.panel.webview.postMessage({ command: 'action-result', result });
    this.updateDeveloper();
  }
  
  /**
   * Sends the latest developer stats to the webview to update the UI.
   */
  public updateDeveloper() {
    this.panel.webview.postMessage({ command: 'update', developer: this.devManager.getDeveloper() });
  }
  
  /**
   * Cleans up resources when the panel is closed.
   */
  private dispose() {
    DeveloperPanel.currentPanel = undefined;
    this.panel.dispose();
    while (this.disposables.length) {
      const x = this.disposables.pop();
      if (x) x.dispose();
    }
  }

  /**
   * Generates the complete HTML content for the webview.
   */
  private getHtmlContent(): string {
    return `<!DOCTYPE html><html><head><style>
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
          <button onclick="giveCoffee()" title="Give coffee (10 beans)">☕</button>
          <button onclick="toggleChallenges()" title="Coding challenges">🎯</button>
          <button onclick="takeBreak()" title="Take a break">🌴</button>
        </div>
        
        <div id="challengeContainer" class="challenge-container">
          <h3 style="text-align: center; margin-bottom: 15px;">Coding Challenges</h3>
          <div id="challengeMenu" class="challenge-menu">
            <button class="challenge-btn" onclick="startBugHunt()">🐛<br>Bug Hunt</button>
            <button class="challenge-btn" onclick="startSpeedTest()">⚡<br>Speed Test</button>
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
      
      <script>
        const vscode = acquireVsCodeApi();
        let currentChallenge = null;

        function giveCoffee() { vscode.postMessage({ command: 'coffee' }); }
        function takeBreak() { vscode.postMessage({ command: 'break' }); }
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
          if(currentChallenge) clearInterval(currentChallenge.interval);
        }

        window.addEventListener('message', event => {
          const m = event.data;
          if (m.command === 'update') {
            const dev = m.developer;
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
            document.getElementById('devAvatar').textContent = dev.role;
            document.getElementById('levelBadge').textContent = 'Level ' + dev.level;
            
            const xpNeeded = dev.level * 100;
            const xpPercent = (dev.xp / xpNeeded) * 100;
            document.getElementById('xpBar').style.width = xpPercent + '%';
            document.getElementById('xpText').textContent = dev.xp + ' / ' + xpNeeded + ' XP';
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
      </script>
    </body></html>`;
  }
}
export function deactivate() {}
