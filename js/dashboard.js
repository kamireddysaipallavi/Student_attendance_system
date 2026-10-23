import {
    getAuth,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

import {
    getFirestore,
    collection,
    getDocs,
    query,
    where
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

import { app } from "./firebase-config.js";

const auth = getAuth(app);
const db = getFirestore(app);

const today = getLocalDate();

document.getElementById("current-date").textContent = today;

document.getElementById("logout-button").addEventListener(
    "click",
    async () => {
        try {
            await signOut(auth);
            window.location.replace("index.html");
        } catch (error) {
            console.error(error);
            alert("Unable to log out. Please try again.");
        }
    }
);

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.replace("index.html");
        return;
    }

    document.getElementById("welcome-message").textContent =
        `Welcome, ${user.displayName || user.email}.`;

    await loadDashboard(user.uid);
});

function getLocalDate() {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

async function loadDashboard(userId) {
    const message = document.getElementById("dashboard-message");

    try {
        const studentsQuery = query(
            collection(db, "students"),
            where("ownerId", "==", userId)
        );

        const attendanceQuery = query(
            collection(db, "attendance"),
            where("ownerId", "==", userId),
            where("date", "==", today)
        );

        const [studentsSnapshot, attendanceSnapshot] =
            await Promise.all([
                getDocs(studentsQuery),
                getDocs(attendanceQuery)
            ]);

        const students = studentsSnapshot.docs.map(
            document => ({
                id: document.id,
                ...document.data()
            })
        );

        const attendance = attendanceSnapshot.docs.map(
            document => document.data()
        );

        const present = attendance.filter(
            record =>
                record.status === "Present" ||
                record.status === "Late"
        ).length;

        const absent = attendance.filter(
            record => record.status === "Absent"
        ).length;

        const markedCount = present + absent;

        const rate = markedCount > 0
            ? Math.round((present / markedCount) * 100)
            : 0;

        document.getElementById("total-students").textContent =
            students.length;

        document.getElementById("present-students").textContent =
            present;

        document.getElementById("absent-students").textContent =
            absent;

        document.getElementById("attendance-rate").textContent =
            `${rate}%`;

        message.textContent = markedCount === 0
            ? "No attendance has been recorded for today yet."
            : "";

    } catch (error) {
        console.error("Dashboard error:", error);

        message.textContent =
            "Could not load dashboard data. Check Firestore security rules.";
    }
}