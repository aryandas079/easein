
// ── Task Breakdown Engine ──

const TaskEngine = {
    generateTasks: async function () {
        const fileInput = document.getElementById('task-file-input');
        const textInput = document.getElementById('task-text-input');
        const container = document.getElementById('task-list-container');
        const loader = document.getElementById('task-loader');

        // Validation
        if (!fileInput.files.length && !textInput.value.trim()) {
            alert("Please upload a file or enter text.");
            return;
        }

        // Show Loader
        loader.classList.remove('hidden');
        container.innerHTML = ''; // Clear previous

        const formData = new FormData();
        if (fileInput.files.length) {
            formData.append('file', fileInput.files[0]);
        }
        formData.append('text', textInput.value);
        formData.append('instructions', "Break down into actionable steps.");

        try {
            const response = await fetch('/api/generate-tasks', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            this.renderTasks(data.tasks);

            // Save to Backend History
            try {
                fetch('/api/save-history', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        tasks: data.tasks,
                        prompt: textInput.value || (fileInput.files.length ? fileInput.files[0].name : "Context Task"),
                        timestamp: new Date().toISOString()
                    })
                });
            } catch (e) {
                console.error("Failed to save history:", e);
            }

        } catch (err) {
            console.error(err);
            // Render error as a task item so user sees it clearly
            this.renderTasks([`Error: ${err.message}`]);
        } finally {
            loader.classList.add('hidden');
        }
    },

    renderTasks: function (tasks) {
        const container = document.getElementById('task-list-container');
        container.innerHTML = '';

        if (!Array.isArray(tasks) || tasks.length === 0) {
            container.innerHTML = '<p class="opacity-50 text-center">No tasks generated.</p>';
            return;
        }

        tasks.forEach((taskText, index) => {
            // Show Visualize Button
            const visualBtn = document.getElementById('visual-btn-container');
            if (visualBtn) visualBtn.classList.remove('hidden');

            const taskEl = document.createElement('div');
            // Style: "Task Item"
            taskEl.className = 'group flex items-center gap-4 p-4 bg-white/5 border border-black/5 dark:border-white/5 rounded-xl cursor-pointer hover:bg-blue-500/10 transition-all mb-3';

            taskEl.innerHTML = `
                <div class="w-6 h-6 rounded-full border-2 border-current opacity-40 group-hover:bg-blue-500 group-hover:border-blue-500 transition-colors flex items-center justify-center">
                    <svg class="w-4 h-4 text-white opacity-0 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
                </div>
                <span class="font-medium group-hover:line-through opacity-80 group-hover:opacity-50 transition-all select-none">${taskText}</span>
            `;

            taskEl.addEventListener('click', () => {
                // Prevent double clicks
                if (taskEl.style.opacity === '0') return;

                // 1. Logic (XP + Sound)
                if (window.Gamification) {
                    window.Gamification.completeTask(taskText);
                }

                // 2. Animate Out (Swipe/Disappear)
                taskEl.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
                taskEl.style.transform = 'translateX(50px)';
                taskEl.style.opacity = '0';

                // 3. Remove & Check All Done
                setTimeout(() => {
                    taskEl.remove();

                    // Check if any tasks remain
                    const remaining = container.querySelectorAll('.group').length;
                    if (remaining === 0) {
                        if (window.Gamification) window.Gamification.celebrate();

                        // Hide Visualize Button
                        const visualBtn = document.getElementById('visual-btn-container');
                        if (visualBtn) visualBtn.classList.add('hidden');

                        // Show "All Done" message
                        container.innerHTML = `
                            <div class="flex flex-col items-center justify-center py-20 animate-fade-in">
                                <span class="text-6xl mb-4">🎉</span>
                                <h3 class="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">All Tasks Completed!</h3>
                                <p class="opacity-50 mt-2">Great work today.</p>
                            </div>
                        `;
                    }
                }, 500);
            });

            container.appendChild(taskEl);
        });
    },

    startListening: function () {
        if (!('webkitSpeechRecognition' in window)) {
            alert("Microphone not supported in this browser. Try Chrome.");
            return;
        }

        const recognition = new webkitSpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        const micBtn = document.getElementById('mic-btn');
        micBtn.classList.add('bg-red-500', 'animate-pulse');

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            const input = document.getElementById('task-text-input');
            input.value += (input.value ? " " : "") + transcript;
        };

        recognition.onerror = (event) => {
            console.error(event.error);
            alert("Microphone error: " + event.error);
        };

        recognition.onend = () => {
            micBtn.classList.remove('bg-red-500', 'animate-pulse');
        };

        recognition.start();
    }
};

// Bind Buttons & Events
document.addEventListener('DOMContentLoaded', () => {
    // Note: TaskEngine.init() was in the provided snippet but TaskEngine does not have an init method.
    // Assuming it was meant to be added or is part of a larger context not provided.
    // For now, it's omitted to maintain syntactical correctness and avoid calling an undefined function.

    // Visualize Button Logic
    const visBtn = document.getElementById('visualize-btn');
    const mermaidModal = document.getElementById('mermaid-modal');
    const closeMermaid = document.getElementById('close-mermaid');
    const mermaidContainer = document.querySelector('.mermaid-output');
    const mermaidLoading = document.getElementById('mermaid-loading');

    if (visBtn) {
        visBtn.addEventListener('click', async () => {
            mermaidModal.classList.remove('hidden');
            mermaidLoading.classList.remove('hidden');
            mermaidContainer.innerHTML = '';

            const tasks = Array.from(document.querySelectorAll('.group span')).map(el => el.textContent); // Changed .task-item to .group to match existing task elements

            try {
                const res = await fetch('/api/generate-mindmap', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ tasks })
                });

                const data = await res.json();
                if (data.mermaid) {
                    const { svg } = await window.mermaid.render('graphDiv', data.mermaid);
                    mermaidContainer.innerHTML = svg;
                } else {
                    mermaidContainer.innerHTML = '<p class="text-red-500">Failed to generate visual.</p>';
                }
            } catch (e) {
                console.error(e);
                mermaidContainer.innerHTML = '<p class="text-red-500">Error connecting to AI.</p>';
            } finally {
                mermaidLoading.classList.add('hidden');
            }
        });
    }

    if (closeMermaid) {
        closeMermaid.addEventListener('click', () => mermaidModal.classList.add('hidden'));
    }

    // Download SVG
    const downloadMermaid = document.getElementById('download-mermaid');
    if (downloadMermaid) {
        downloadMermaid.addEventListener('click', () => {
            const svg = document.querySelector('.mermaid-output svg');
            if (svg) {
                const svgData = new XMLSerializer().serializeToString(svg);
                const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = 'task-flow.svg';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else {
                alert("No visual to download!");
            }
        });
    }

    // Generate Button
    const btn = document.getElementById('generate-btn');
    if (btn) {
        btn.addEventListener('click', () => TaskEngine.generateTasks());
    }

    // Mic Button
    const micBtn = document.getElementById('mic-btn');
    if (micBtn) {
        micBtn.addEventListener('click', () => TaskEngine.startListening());
    }

    // File Input UI Sync (Moved from inline script)
    const fileInput = document.getElementById('task-file-input');
    const dropZone = document.getElementById('drop-zone');
    const nameDisplay = document.getElementById('file-name-display');

    if (fileInput && dropZone && nameDisplay) {
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                nameDisplay.textContent = e.target.files[0].name;
                dropZone.classList.add('bg-blue-500/10', 'border-blue-500');
            }
        });
    }
});
