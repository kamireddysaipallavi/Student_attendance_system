import {
    getAuth,
    createUserWithEmailAndPassword,
    updateProfile
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

import {
    getFirestore,
    doc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

import { app } from "./firebase-config.js";

const auth = getAuth(app);
const db = getFirestore(app);

const registerForm = document.getElementById("register-form");
const registerButton = document.getElementById("register-button");
const registerMessage = document.getElementById("register-message");

registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = document.getElementById("teacher-name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const confirmPassword =
        document.getElementById("confirm-password").value;

    registerMessage.textContent = "";

    if (!name) {
        registerMessage.textContent = "Please enter your name.";
        return;
    }

    if (password !== confirmPassword) {
        registerMessage.textContent = "Passwords do not match.";
        return;
    }

    registerButton.disabled = true;
    registerButton.textContent = "Creating account...";

    let createdUser = null;

    try {
        const credential = await createUserWithEmailAndPassword(
            auth,
            email,
            password
        );

        createdUser = credential.user;

        await updateProfile(createdUser, {
            displayName: name
        });

        await setDoc(doc(db, "teachers", createdUser.uid), {
            name: name,
            email: email,
            createdAt: serverTimestamp()
        });

        window.location.replace("dashboard.html");

    } catch (error) {
        console.error("Registration error:", error);

        const messages = {
            "auth/email-already-in-use":
                "This email is already registered. Please log in.",
            "auth/invalid-email":
                "Please enter a valid email address.",
            "auth/weak-password":
                "Choose a stronger password with at least 6 characters.",
            "auth/network-request-failed":
                "Network error. Check your internet connection."
        };

        if (createdUser) {
            registerMessage.textContent =
                "Your account was created, but saving the teacher profile failed. " +
                "Please check your Firestore security rules before continuing.";
        } else {
            registerMessage.textContent =
                messages[error.code] ||
                "Registration failed. Please check Firebase configuration.";
        }

    } finally {
        registerButton.disabled = false;
        registerButton.textContent = "Create Account";
    }
});