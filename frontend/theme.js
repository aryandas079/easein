// ── Shared Theme & Font Persistence ──
// This script runs on every page to apply saved preferences and wire up toggles.

(function () {
    const body = document.getElementById('app-body') || document.body;

    // ── Apply saved preferences IMMEDIATELY (before page renders fully) ──
    const savedDark = localStorage.getItem('easein-dark-mode');
    const savedDyslexia = localStorage.getItem('easein-dyslexia-font');
    const html = document.documentElement;

    if (savedDark === 'true') {
        body.classList.add('dark-mode');
        html.classList.add('dark');
    }
    if (savedDyslexia === 'true') body.classList.add('dyslexia-font');

    // ── Wire up toggle switches if they exist on this page ──
    const darkToggle = document.getElementById('dark-mode-toggle');
    const dyslexiaToggle = document.getElementById('dyslexia-toggle');

    if (darkToggle) {
        // Sync checkbox state with saved preference
        darkToggle.checked = savedDark === 'true';

        darkToggle.addEventListener('change', function () {
            body.classList.toggle('dark-mode', this.checked);
            html.classList.toggle('dark', this.checked);
            localStorage.setItem('easein-dark-mode', this.checked);
        });
    }

    if (dyslexiaToggle) {
        // Sync checkbox state with saved preference
        dyslexiaToggle.checked = savedDyslexia === 'true';

        dyslexiaToggle.addEventListener('change', function () {
            body.classList.toggle('dyslexia-font', this.checked);
            localStorage.setItem('easein-dyslexia-font', this.checked);
        });
    }
})();
