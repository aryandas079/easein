// ── Google Authentication Handler ──
// Uses Google Identity Services (GIS) renderButton approach — no redirect URIs needed.

const GOOGLE_CLIENT_ID = '50904866356-soqup96r4l1p5asccb7grhbcflp29el5.apps.googleusercontent.com';

// Decode JWT token payload without external libraries
function decodeJwtPayload(token) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
        atob(base64).split('').map(c =>
            '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        ).join('')
    );
    return JSON.parse(jsonPayload);
}

// Handle Google credential response (called automatically by GIS)
function handleGoogleAuth(response) {
    try {
        const user = decodeJwtPayload(response.credential);

        // Store user data in localStorage
        const userData = {
            name: user.name || '',
            email: user.email || '',
            picture: user.picture || '',
            given_name: user.given_name || '',
            family_name: user.family_name || '',
            uid: user.sub, // Google unique ID
            loggedInAt: new Date().toISOString()
        };

        localStorage.setItem('easein-user', JSON.stringify(userData));
        localStorage.setItem('easein-logged-in', 'true');

        // Log user to backend
        fetch('/api/log-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                provider: 'google',
                name: userData.name,
                email: userData.email
            })
        }).catch(err => console.error("Logging failed", err));

        // Redirect to dashboard
        setTimeout(() => window.location.href = 'dashboard.html', 500);
    } catch (err) {
        console.error('Google auth failed:', err);
        alert('Authentication failed. Please try again.');
    }
}

// Initialize Google Sign-In when GIS library is loaded
function initGoogleAuth() {
    if (typeof google === 'undefined' || !google.accounts) {
        setTimeout(initGoogleAuth, 200);
        return;
    }

    google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleAuth,
        auto_select: false,
        cancel_on_tap_outside: true
    });

    // Find all custom Google auth buttons and overlay a real Google button on each
    const googleBtns = document.querySelectorAll('[data-google-auth]');
    googleBtns.forEach(btn => {
        // Make the button a positioning container
        btn.style.position = 'relative';
        btn.style.overflow = 'hidden';

        // Create a hidden container for Google's rendered button
        const gContainer = document.createElement('div');
        gContainer.style.cssText = `
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            opacity: 0.01;
            z-index: 10;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: none !important;
        `;
        btn.appendChild(gContainer);

        // Render the actual Google Sign-In button (invisible, overlaid on our custom button)
        google.accounts.id.renderButton(gContainer, {
            type: 'standard',
            size: 'large',
            width: btn.offsetWidth,
            text: 'continue_with',
            shape: 'pill'
        });
    });
}

// Make the callback globally accessible (required by GIS)
window.handleGoogleAuth = handleGoogleAuth;

document.addEventListener('DOMContentLoaded', initGoogleAuth);
