import {
    getAuth,
    signInWithEmailAndPassword,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

import { app } from "./firebase-config.js";

const auth = getAuth(app);

const loginForm = document.getElementById("login-form");
const loginButton = document.getElementById("login-button");
const loginMessage = document.getElementById("login-message");

// If a user is already logged in, open the dashboard.
onAuthStateChanged(auth, (user) => {
    if (user) {
        window.location.replace("dashboard.html");
    }
});

// Handle login form submission.
loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    loginButton.disabled = true;
    loginButton.textContent = "Logging in...";
    loginMessage.textContent = "";

    try {
        await signInWithEmailAndPassword(auth, email, password);

        window.location.replace("dashboard.html");

    } catch (error) {
        console.error("Login error:", error);

        const messages = {
            "auth/invalid-email": "Please enter a valid email address.",
            "auth/invalid-credential": "Incorrect email or password.",
            "auth/user-not-found": "No account found. Please register first.",
            "auth/wrong-password": "Incorrect email or password.",
            "auth/too-many-requests": "Too many attempts. Please try again later."
        };

        loginMessage.textContent =
            messages[error.code] ||
            "Login failed. Check your connection and Firebase configuration.";

    } finally {
        loginButton.disabled = false;
        loginButton.textContent = "Login";
    }
});