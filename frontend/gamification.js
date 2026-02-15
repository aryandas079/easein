
// ── Gamification Engine ──

const Gamification = {
    state: {
        xp: 0,
        level: 1,
        streak: 0,
        lastActiveDate: null,
        history: [] // { task: "...", timestamp: "...", xp: 10 }
    },

    chartInstance: null,

    init: function () {
        this.loadState();
        this.checkStreak();
        // Delay UI update slightly to ensure DOM is ready if called early
        setTimeout(() => this.updateUI(), 50);

        // Bind Clear History (Full Reset)
        const clearBtn = document.getElementById('clear-history-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (confirm("⚠️ RESET PROFILE DATA?\n\nThis will wipe all your progress (XP, Level, History) for this account.\n\nAre you sure?")) {
                    this.reset();
                    location.reload();
                }
            });
        }
    },

    reset: function () {
        this.state = {
            xp: 0,
            level: 1,
            streak: 0,
            lastActiveDate: null,
            history: []
        };
        this.saveState();
    },

    // ── Storage Helpers ──
    getUserId: function () {
        try {
            const user = JSON.parse(localStorage.getItem('easein-user'));
            if (user && (user.uid || user.email)) return user.uid || user.email;
        } catch (e) { }
        return 'guest';
    },

    getStorageKey: function () {
        return `easein-gamification-${this.getUserId()}`;
    },

    loadState: function () {
        const key = this.getStorageKey();
        const saved = localStorage.getItem(key);

        if (saved) {
            this.state = { ...this.state, ...JSON.parse(saved) };
        } else {
            // Check for legacy global data to migrate (One-Time ONLY)
            const isMigrated = localStorage.getItem('easein-global-migrated');
            const legacy = localStorage.getItem('easein-gamification');

            if (legacy && !isMigrated) {
                try {
                    console.log("Migrating legacy gamification data to profile:", key);
                    this.state = { ...this.state, ...JSON.parse(legacy) };
                    this.saveState();

                    // Mark global migration as done so we don't copy it for the next user
                    localStorage.setItem('easein-global-migrated', 'true');
                } catch (e) {
                    console.error("Migration failed", e);
                }
            } else {
                // New User / Already Migrated
                this.state = {
                    xp: 0,
                    level: 1,
                    streak: 0,
                    lastActiveDate: null,
                    history: []
                };
            }
        }
    },

    saveState: function () {
        localStorage.setItem(this.getStorageKey(), JSON.stringify(this.state));
        this.updateUI();
    },

    // ── Logic ──

    calculateLevel: function (xp) {
        // Logic: Lvl 1->2: 50 XP, Lvl 2->3: 100 XP, etc.
        // Formula: XP = 25 * n * (n-1) -> Inverse to find n
        let level = 1;
        while (true) {
            const xpNeeded = 25 * level * (level + 1);
            if (xp < xpNeeded) return level;
            level++;
        }
    },

    xpForNextLevel: function (level) {
        return 25 * level * (level + 1);
    },

    completeTask: function (taskText) {
        // 1. Play Sound
        this.playTwing();

        // 2. Add XP (Random 6-10 XP)
        const xpGain = Math.floor(Math.random() * 5) + 6;
        this.state.xp += xpGain;

        // 3. Check Level Up
        const newLevel = this.calculateLevel(this.state.xp);
        if (newLevel > this.state.level) {
            this.state.level = newLevel;
            this.showLevelUpNotification(newLevel);
            this.playCheer();
        }

        // 4. Update Streak
        this.updateStreak();

        // 5. Add to History
        this.state.history.unshift({
            task: taskText,
            timestamp: new Date().toISOString(),
            xp: xpGain
        });

        // 6. Save
        this.saveState();
    },

    updateStreak: function () {
        const today = new Date().toDateString();
        if (this.state.lastActiveDate !== today) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            if (this.state.lastActiveDate === yesterday.toDateString()) {
                this.state.streak++;
            } else if (this.state.lastActiveDate === today) {
                // Done today
            } else {
                if (this.state.lastActiveDate) this.state.streak = 1;
                else this.state.streak = 1;
            }
            this.state.lastActiveDate = today;
        }
    },

    checkStreak: function () {
        // Optional
    },

    // ── Audio ──

    audioCtx: null,

    playTwing: function () {
        if (!this.audioCtx) this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
        const ctx = this.audioCtx;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1400, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.0);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 1.0);
    },

    playCheer: function () {
        if (!this.audioCtx) this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

        const now = this.audioCtx.currentTime;
        [0, 0.2, 0.4].forEach((offset, i) => {
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(600 + (i * 200), now + offset);
            gain.gain.setValueAtTime(0.2, now + offset);
            gain.gain.exponentialRampToValueAtTime(0.01, now + offset + 0.5);
            osc.connect(gain);
            gain.connect(this.audioCtx.destination);
            osc.start(now + offset);
            osc.stop(now + offset + 0.5);
        });
    },

    celebrate: function () {
        this.playCheer();
        if (typeof confetti !== 'undefined') {
            const duration = 3000;
            const end = Date.now() + duration;
            (function frame() {
                confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 } });
                confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 } });
                if (Date.now() < end) requestAnimationFrame(frame);
            }());
        }
    },

    showLevelUpNotification: function (level) {
        const toast = document.createElement('div');
        toast.className = 'fixed bottom-10 right-10 bg-yellow-400 text-black px-6 py-4 rounded-2xl shadow-2xl z-50 font-bold transform transition-all duration-500 translate-y-20';
        toast.innerText = `🎉 Level Up! You are now Level ${level}`;
        document.body.appendChild(toast);
        setTimeout(() => toast.classList.remove('translate-y-20'), 100);
        setTimeout(() => {
            toast.classList.add('translate-y-20', 'opacity-0');
            setTimeout(() => toast.remove(), 500);
        }, 3000);
    },

    // ── UI Updates ──

    updateUI: function () {
        // Update Stats (Class-based)
        document.querySelectorAll('.user-xp-display').forEach(el => el.textContent = this.state.xp);
        document.querySelectorAll('.user-level-display').forEach(el => el.textContent = this.state.level);
        document.querySelectorAll('.user-streak-display').forEach(el => el.textContent = this.state.streak);

        // Update Avatar from LocalStorage (Google Auth)
        // Check 'easein-user' object first (standard auth), fallback to 'user_photo'
        const userJson = localStorage.getItem('easein-user');
        let photoUrl = null;

        if (userJson) {
            try {
                const user = JSON.parse(userJson);
                photoUrl = user.picture || user.photoURL;
            } catch (e) {
                console.error("Error parsing user data", e);
            }
        }

        if (!photoUrl) photoUrl = localStorage.getItem('user_photo');

        if (photoUrl) {
            document.querySelectorAll('#user-avatar').forEach(img => img.src = photoUrl);
        }

        // Update Charts & History
        this.renderChart();
        this.renderHistory();

        // Add Info Button click handler logic
        document.querySelectorAll('.user-streak-display').forEach(el => {
            const parent = el.closest('.rounded-full');
            if (parent && !parent.hasAttribute('data-info-init')) {
                parent.setAttribute('data-info-init', 'true');
                // parent.style.cursor = 'pointer'; // Removed to enforce custom cursor
                parent.addEventListener('click', () => this.showInfoModal());
            }
        });
    },

    showInfoModal: function () {
        if (document.getElementById('info-modal')) return;

        const nextLvlXp = this.xpForNextLevel(this.state.level);
        const xpNeeded = nextLvlXp - this.state.xp;

        const modal = document.createElement('div');
        modal.id = 'info-modal';
        modal.className = 'fixed inset-0 bg-black/50 z-[100] flex items-center justify-center backdrop-blur-sm';
        modal.innerHTML = `
            <div class="bg-white dark:bg-zinc-900 p-8 rounded-3xl max-w-md w-full shadow-2xl border border-white/10 relative transform scale-95 opacity-0 transition-all duration-300">
                <button id="close-modal" class="absolute top-4 right-4 opacity-50 hover:opacity-100 dark:text-white">✕</button>
                <h3 class="text-2xl font-bold mb-4 dark:text-white">Level System</h3>
                <div class="space-y-4">
                    <div class="p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
                        <div class="flex justify-between text-sm mb-2 dark:text-gray-200">
                            <span class="opacity-70">Current Level</span>
                            <span class="font-bold">Lvl ${this.state.level}</span>
                        </div>
                        <div class="flex justify-between text-sm mb-2 dark:text-gray-200">
                            <span class="opacity-70">Total XP</span>
                            <span class="font-bold">${this.state.xp} XP</span>
                        </div>
                        <div class="w-full bg-black/10 dark:bg-white/10 h-2 rounded-full overflow-hidden">
                            <div class="bg-blue-500 h-full" style="width: ${(this.state.xp / nextLvlXp) * 100}%"></div>
                        </div>
                        <div class="text-xs opacity-50 mt-2 text-right dark:text-gray-300">${xpNeeded} XP to Level ${this.state.level + 1}</div>
                    </div>
                    <div class="text-sm opacity-70 leading-relaxed dark:text-gray-300">
                        <p class="mb-2"><strong class="text-blue-400">XP Logic:</strong> Each task grants 6-10 XP.</p>
                        <p class="mb-2"><strong class="text-purple-400">Level Up:</strong> Arithmetic progression.</p>
                         <ul class="list-disc pl-5 space-y-1 text-xs">
                            <li>Lvl 1 → 2: 50 XP</li>
                            <li>Lvl 2 → 3: +100 XP (Total 150)</li>
                            <li>Lvl 3 → 4: +150 XP (Total 300)</li>
                        </ul>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        setTimeout(() => modal.children[0].classList.remove('scale-95', 'opacity-0'), 10);
        const close = () => {
            modal.children[0].classList.add('scale-95', 'opacity-0');
            setTimeout(() => modal.remove(), 300);
        };
        modal.querySelector('#close-modal').addEventListener('click', close);
        modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
    },

    renderChart: function () {
        const ctx = document.getElementById('analytics-chart');
        if (!ctx) return;

        // Prepare Data: Tasks per day for last 7 days
        const last7Days = [];
        const taskCounts = [];
        const xpGrowth = [];

        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            last7Days.push(d.toLocaleDateString('en-US', { weekday: 'short' }));

            const dateIso = d.toISOString().split('T')[0];
            const dayItems = this.state.history.filter(h => h.timestamp.startsWith(dateIso));

            taskCounts.push(dayItems.length);
            xpGrowth.push(dayItems.reduce((sum, item) => sum + (item.xp || 10), 0));
        }

        if (this.chartInstance) {
            this.chartInstance.data.labels = last7Days;
            this.chartInstance.data.datasets[0].data = taskCounts;
            this.chartInstance.data.datasets[1].data = xpGrowth;
            this.chartInstance.update();
        } else {
            if (typeof Chart === 'undefined') return;

            this.chartInstance = new Chart(ctx, {
                type: 'bar', // Mixed chart
                data: {
                    labels: last7Days,
                    datasets: [
                        {
                            label: 'Tasks',
                            data: taskCounts,
                            backgroundColor: '#4d79ff',
                            borderRadius: 6,
                            order: 2
                        },
                        {
                            label: 'XP Gained',
                            data: xpGrowth,
                            type: 'line',
                            borderColor: '#34d399',
                            backgroundColor: 'rgba(52, 211, 153, 0.1)',
                            borderWidth: 2,
                            tension: 0.4,
                            fill: true,
                            order: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: true, position: 'bottom' } },
                    scales: {
                        y: { beginAtZero: true, grid: { display: false } },
                        x: { grid: { display: false } }
                    }
                }
            });
        }
    },

    renderHistory: function () {
        const list = document.getElementById('history-list');
        // Only render if we are NOt on the search page (pure list)
        // OR if search page uses this function.
        // The search page logic in history.html handles its own rendering usually.
        // But for dashboard or small widgets, this is used.
        if (!list) return;

        // If history.html is controlling it via search listener, we might skip?
        // But history.html calls render() inside its own script.
        // We can leave this for generic usage (e.g. if we add a widget back).
    }
};

document.addEventListener('DOMContentLoaded', () => {
    Gamification.init();
});

window.Gamification = Gamification;
