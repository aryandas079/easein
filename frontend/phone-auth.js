// ── Phone Authentication (Firebase + Simulation) ──

// Global Variable for Verification
let confirmationResult = null;
let recaptchaVerifier = null;

document.addEventListener('DOMContentLoaded', () => {
    // Find "Continue with Phone" buttons
    const buttons = document.querySelectorAll('button');
    const phoneBtn = Array.from(buttons).find(b =>
        b.textContent.includes('Phone') || b.innerText.includes('Phone')
    );

    if (phoneBtn) {
        phoneBtn.addEventListener('click', (e) => {
            e.preventDefault();
            startPhoneAuth();
        });
    }
});

function setupRecaptcha() {
    if (!recaptchaVerifier && typeof firebase !== 'undefined' && auth) {
        recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
            'size': 'invisible',
            'callback': (response) => {
                // reCAPTCHA solved, allow signInWithPhoneNumber.
                console.log("reCAPTCHA solved");
            }
        });
    }
}

function startPhoneAuth() {
    const card = document.querySelector('.auth-card') || document.querySelector('.login-card');
    if (!card) return;

    // Initialize Recaptcha if using real Firebase
    if (typeof isConfigured === 'function' && isConfigured()) {
        try {
            setupRecaptcha();
        } catch (e) { console.error("Recaptcha Setup Error:", e); }
    }

    // Phase 1: Enter Phone
    card.innerHTML = `
        <div class="logo-text">easein</div>
        <div class="subtitle mb-6">Verify your number</div>
        
        <div class="text-left mb-6">
            <label class="text-xs font-bold uppercase tracking-widest opacity-50 ml-1 mb-2 block">Mobile Number</label>
            <div class="flex gap-2">
                <select id="country-code" class="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-2 py-3 outline-none font-mono text-sm">
                    <option value="+1">+1</option>
                    <option value="+91">+91</option>
                    <option value="+44">+44</option>
                </select>
                <input type="tel" id="mobile-input" placeholder="98765 43210" 
                    class="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 w-full outline-none font-mono text-lg" autofocus>
            </div>
            <p id="error-msg" class="text-red-500 text-xs mt-2 hidden">Please enter a valid number</p>
        </div>

        <button id="send-otp-btn" class="auth-button bg-black text-white dark:bg-white dark:text-black font-bold justify-center" disabled>
            Send Verification Code
        </button>
        
        <button onclick="window.location.reload()" class="text-xs opacity-40 hover:opacity-100 mt-4 underline">Cancel</button>
    `;

    const input = document.getElementById('mobile-input');
    const countrySelect = document.getElementById('country-code');
    const btn = document.getElementById('send-otp-btn');
    const errorMsg = document.getElementById('error-msg');

    input.addEventListener('input', (e) => {
        let val = e.target.value.replace(/\D/g, '');
        if (val.length > 5) {
            btn.disabled = false;
            btn.classList.remove('opacity-50');
        } else {
            btn.disabled = true;
            btn.classList.add('opacity-50');
        }
    });

    btn.addEventListener('click', () => {
        const phoneNumber = `${countrySelect.value}${input.value}`;
        btn.innerHTML = 'Sending...';
        btn.disabled = true;
        errorMsg.classList.add('hidden');

        // Check if we should use Real Firebase or Simulation
        if (typeof isConfigured === 'function' && isConfigured() && auth) {
            // REAL FIREBASE FLOW
            auth.signInWithPhoneNumber(phoneNumber, recaptchaVerifier)
                .then((result) => {
                    confirmationResult = result;
                    showOtpScreen(card, phoneNumber, true); // true = real mode
                }).catch((error) => {
                    console.error("SMS Error:", error);
                    btn.innerHTML = 'Send Verification Code';
                    btn.disabled = false;
                    errorMsg.textContent = error.message || "Failed to send SMS. Try again.";
                    errorMsg.classList.remove('hidden');

                    // Fallback to simulation if config is broken/quota exceeded? 
                    // No, explicit error is better for debugging.
                });
        } else {
            // SIMULATION FLOW
            console.log("Simulating SMS to", phoneNumber);
            setTimeout(() => {
                showOtpScreen(card, phoneNumber, false); // false = sim mode
            }, 1000);
        }
    });
}

function showOtpScreen(card, phone, isReal) {
    // Phase 2: Enter OTP
    card.innerHTML = `
        <div class="logo-text">easein</div>
        <div class="subtitle mb-2">Check your text</div>
        <p class="text-xs opacity-50 mb-8">We sent a code to <span class="font-mono font-bold">${phone}</span></p>
        
        <div class="flex justify-center gap-3 mb-8">
            ${[0, 1, 2, 3, 4, 5].map(i => `
                <input type="text" maxlength="1" class="otp-digit w-10 h-14 text-center text-xl font-bold bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl outline-none focus:border-blue-500 transition-colors" data-index="${i}">
            `).join('')}
        </div>

        <button id="verify-otp-btn" class="auth-button bg-black text-white dark:bg-white dark:text-black font-bold justify-center opacity-50" disabled>
            Verify & Login
        </button>
        
        <button onclick="startPhoneAuth()" class="text-xs opacity-40 hover:opacity-100 mt-4">Change Number</button>
        <p id="otp-error" class="text-red-500 text-xs mt-4 hidden">Invalid Code</p>
    `;

    const inputs = card.querySelectorAll('.otp-digit');
    const verifyBtn = document.getElementById('verify-otp-btn');
    const errorMsg = document.getElementById('otp-error');

    inputs[0].focus();

    inputs.forEach((input, idx) => {
        input.addEventListener('input', (e) => {
            if (e.target.value && idx < 5) inputs[idx + 1].focus();

            const code = Array.from(inputs).map(i => i.value).join('');
            if (code.length === 6) {
                verifyBtn.disabled = false;
                verifyBtn.classList.remove('opacity-50');
            } else {
                verifyBtn.disabled = true;
                verifyBtn.classList.add('opacity-50');
            }
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !e.target.value && idx > 0) inputs[idx - 1].focus();
        });
    });

    verifyBtn.addEventListener('click', () => {
        const code = Array.from(inputs).map(i => i.value).join('');
        verifyBtn.innerHTML = 'Verifying...';
        verifyBtn.disabled = true;
        errorMsg.classList.add('hidden');

        if (isReal && confirmationResult) {
            // REAL FIREBASE VERIFY
            confirmationResult.confirm(code).then((result) => {
                const user = result.user;
                handleSuccess(user);
            }).catch((error) => {
                console.error("OTP Error:", error);
                verifyBtn.innerHTML = 'Verify & Login';
                verifyBtn.disabled = false;
                errorMsg.textContent = "Incorrect code.";
                errorMsg.classList.remove('hidden');

                // Clear inputs on error?
                inputs.forEach(i => i.value = '');
                inputs[0].focus();
            });
        } else {
            // SIMULATION VERIFY
            setTimeout(() => {
                const dummyUser = {
                    displayName: '', // Empty to trigger prompt
                    phoneNumber: phone
                };
                handleSuccess(dummyUser);
            }, 1000);
        }
    });
}

function handleSuccess(firebaseUser) {
    // Check if ProfileManager is loaded
    if (window.ProfileManager) {
        window.ProfileManager.promptForName(firebaseUser, () => {
            window.location.href = 'dashboard.html';
        });
    } else {
        // Fallback if ProfileManager missing
        const user = {
            name: firebaseUser.displayName || 'Mobile User',
            given_name: (firebaseUser.displayName || 'Mobile').split(' ')[0],
            phone: firebaseUser.phoneNumber,
            loggedInAt: new Date().toISOString()
        };
        localStorage.setItem('easein-user', JSON.stringify(user));
        localStorage.setItem('easein-logged-in', 'true');

        // Log user to backend
        fetch('/api/log-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                provider: 'phone',
                name: user.name,
                phone: user.phone || user.email // Fallback just in case
            })
        }).catch(err => console.error("Logging failed", err));

        setTimeout(() => window.location.href = 'dashboard.html', 500);
    }
}
