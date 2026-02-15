
// ── Email Authentication (Magic Link) ──

document.addEventListener('DOMContentLoaded', () => {
    // Check if coming back from email link
    if (firebase.auth().isSignInWithEmailLink(window.location.href)) {
        handleEmailLinkSignIn();
        return;
    }

    // Find "Continue with Email" buttons (if any exist, or inject one)
    // For now, we might need to inject the UI or attach to an existing button.
    // I will assume we will add a button with class 'email-auth-btn'
    const emailBtns = document.querySelectorAll('.email-auth-btn');
    emailBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            startEmailAuth();
        });
    });
});

function startEmailAuth() {
    const card = document.querySelector('.auth-card') || document.querySelector('.login-card');
    if (!card) return;

    // Email Input UI
    card.innerHTML = `
        <div class="logo-text">easein</div>
        <div class="subtitle mb-6">Sign in with Email</div>
        <p class="text-sm opacity-60 mb-6">We'll send you a magic link for a password-free sign in.</p>
        
        <div class="text-left mb-6">
            <label class="text-xs font-bold uppercase tracking-widest opacity-50 ml-1 mb-2 block">Email Address</label>
            <input type="email" id="email-input" placeholder="you@example.com" 
                class="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 w-full outline-none font-medium text-lg focus:border-blue-500 transition-colors" autofocus>
            <p id="email-error" class="text-red-500 text-xs mt-2 hidden">Please enter a valid email</p>
        </div>

        <button id="send-link-btn" class="auth-button bg-black text-white dark:bg-white dark:text-black font-bold justify-center" disabled>
            Send Verification Link
        </button>
        
        <button onclick="window.location.reload()" class="text-xs opacity-40 hover:opacity-100 mt-4 underline">Cancel</button>
    `;

    const input = document.getElementById('email-input');
    const btn = document.getElementById('send-link-btn');
    const errorMsg = document.getElementById('email-error');

    input.addEventListener('input', () => {
        btn.disabled = !input.value.includes('@') || !input.value.includes('.');
    });

    // Enter key
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !btn.disabled) btn.click();
    });

    btn.addEventListener('click', () => {
        const email = input.value.trim();
        const actionCodeSettings = {
            // URL you want to redirect back to. The domain (localhost:8000) must be in the authorized domains list in the Firebase Console.
            url: window.location.href, // Returns to key page (continue or getstarted)
            handleCodeInApp: true
        };

        btn.innerHTML = 'Sending...';
        btn.disabled = true;

        firebase.auth().sendSignInLinkToEmail(email, actionCodeSettings)
            .then(() => {
                // Save email to localStorage (needed for verification)
                window.localStorage.setItem('emailForSignIn', email);
                showSentSuccess(card, email);
            })
            .catch((error) => {
                console.error("Email Auth Error:", error);
                btn.innerHTML = 'Send Verification Link';
                btn.disabled = false;
                errorMsg.textContent = error.message;
                errorMsg.classList.remove('hidden');
            });
    });
}

function showSentSuccess(card, email) {
    card.innerHTML = `
        <div class="logo-text">easein</div>
        <div class="subtitle mb-4">Check your inbox</div>
        <p class="opacity-60 mb-8">We sent a verification link to <br><b class="opacity-100">${email}</b></p>
        
        <div class="bg-blue-500/10 text-blue-500 p-4 rounded-xl text-sm mb-8">
            Click the link in the email to complete your sign in. You can close this tab.
        </div>

        <button onclick="window.location.reload()" class="text-xs opacity-40 hover:opacity-100 mt-4 underline">Back to Login</button>
    `;
}

function handleEmailLinkSignIn() {
    let email = window.localStorage.getItem('emailForSignIn');
    if (!email) {
        // User opened link on different device/browser. Ask for email.
        email = window.prompt('Please provide your email for confirmation');
    }

    firebase.auth().signInWithEmailLink(email, window.location.href)
        .then((result) => {
            window.localStorage.removeItem('emailForSignIn');

            // Success! Handle Name Prompt
            if (window.ProfileManager) {
                window.ProfileManager.promptForName(result.user, () => {
                    window.location.href = 'dashboard.html';
                });
            } else {
                // Fallback
                const user = {
                    name: email.split('@')[0],
                    email: email,
                    loggedInAt: new Date().toISOString()
                };
                localStorage.setItem('easein-user', JSON.stringify(user));
                localStorage.setItem('easein-logged-in', 'true');

                // Log user to backend
                fetch('/api/log-user', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        provider: 'email',
                        name: user.name,
                        email: user.email
                    })
                }).catch(err => console.error("Logging failed", err));

                setTimeout(() => window.location.href = 'dashboard.html', 500);
            }
        })
        .catch((error) => {
            console.error("Link Error:", error);
            alert("Error signing in with email link: " + error.message);
            window.location.href = 'continue.html'; // Reset
        });
}
