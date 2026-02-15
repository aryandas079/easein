// ── Firebase Configuration & Initialization ──
// Project: assistant-94938
const firebaseConfig = {
    apiKey: "AIzaSyBeTKyc_YDyxuj-kYItY7iZYk3lrIj6IkQ",
    authDomain: "assistant-94938.firebaseapp.com",
    projectId: "assistant-94938",
    storageBucket: "assistant-94938.firebasestorage.app",
    messagingSenderId: "50904866356",
    appId: "1:50904866356:web:4adbd4e8c6b8f7af05f461"
};

// Check if Firebase SDK is loaded
let auth = null;

if (typeof firebase !== 'undefined') {
    // Initialize Firebase
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    } else {
        firebase.app(); // if already initialized
    }

    // Initialize Auth
    auth = firebase.auth();
    auth.useDeviceLanguage(); // Use device language for SMS
    console.log('Firebase Auth Initialized');
} else {
    console.warn('Firebase SDK not loaded. Phone Auth will simulate.');
}

// Helper to check if config is real
function isConfigured() {
    // Config is filled, so real mode is active
    return true;
}
