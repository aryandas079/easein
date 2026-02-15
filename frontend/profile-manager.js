
// ── Profile Manager ──
// Handles collecting user details (Name) after initial auth.

const ProfileManager = {
    // Shows a modal to collect the user's name
    promptForName: function (user, onComplete) {
        // If user already has a name (e.g. from Google), skip
        if (user.displayName && user.displayName.trim() !== "") {
            this.saveAndRedirect(user, onComplete);
            return;
        }

        // Check if we already have a stored name for this user (e.g. from previous session)
        // Actually, we trust the `user` object passed in.

        // Create Modal HTML
        const modal = document.createElement('div');
        modal.id = 'profile-modal';
        modal.className = 'fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4';
        modal.innerHTML = `
            <div class="bg-white dark:bg-[#1a1a1a] p-8 rounded-3xl max-w-md w-full shadow-2xl relative border border-white/10">
                <h2 class="text-2xl font-bold mb-2">Welcome to easein</h2>
                <p class="opacity-60 mb-6 text-sm">Let's get to know you. What should we call you?</p>
                
                <input type="text" id="profile-name-input" placeholder="Your Name" 
                    class="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 outline-none mb-6 font-medium text-lg focus:border-blue-500 transition-colors" autofocus>
                
                <button id="profile-save-btn" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                    Continue to Dashboard
                </button>
            </div>
        `;

        document.body.appendChild(modal);

        const input = document.getElementById('profile-name-input');
        const btn = document.getElementById('profile-save-btn');

        // Validation
        input.addEventListener('input', () => {
            btn.disabled = input.value.trim().length === 0;
        });
        btn.disabled = true; // Start disabled

        // Handle Save
        btn.addEventListener('click', () => {
            const name = input.value.trim();
            if (name) {
                // Update User Object
                user.displayName = name;
                user.name = name; // Normalized for our app
                user.given_name = name.split(' ')[0];

                // Cleanup
                modal.remove();

                // Persist & Redirect
                this.saveAndRedirect(user, onComplete);
            }
        });

        // Enter key support
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !btn.disabled) {
                btn.click();
            }
        });

        input.focus();
    },

    saveAndRedirect: function (user, onComplete) {
        // Standardize user object
        const userData = {
            name: user.displayName || user.name || 'User',
            given_name: (user.displayName || user.name || 'User').split(' ')[0],
            email: user.email || '',
            phone: user.phoneNumber || '',
            photoURL: user.photoURL || '',
            uid: user.uid || ('user_' + Date.now()),
            loggedInAt: new Date().toISOString()
        };

        localStorage.setItem('easein-user', JSON.stringify(userData));
        localStorage.setItem('easein-logged-in', 'true');

        if (onComplete) {
            onComplete(userData);
        } else {
            window.location.href = 'dashboard.html';
        }
    }
};

// Expose globally
window.ProfileManager = ProfileManager;
