import {
    getAuth,
    onAuthStateChanged
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

const studentSelect = document.getElementById("student-select");
const generateButton = document.getElementById("generate-button");
const reportMessage = document.getElementById("report-message");
const reportTable = document.getElementById("report-table");

let currentUser = null;
let students = [];
let attendanceRecords = [];

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.replace("index.html");
        return;
    }

    currentUser = user;
    await loadStudents();
});

async function loadStudents() {
    try {
        const studentsQuery = query(
            collection(db, "students"),
            where("ownerId", "==", currentUser.uid)
        );

        const snapshot = await getDocs(studentsQuery);

        students = snapshot.docs.map(item => ({
            id: item.id,
            ...item.data()
        }));

        students.sort((a, b) =>
            String(a.rollNumber).localeCompare(String(b.rollNumber))
        );

        if (students.length === 0) {
            studentSelect.innerHTML =
                '<option value="">No students available</option>';

            reportMessage.textContent =
                "Add students before generating attendance reports.";

            return;
        }

        studentSelect.innerHTML =
            '<option value="">Select a student</option>' +
            students.map(student => `
                <option value="${escapeHTML(student.id)}">
                    ${escapeHTML(student.rollNumber)} -
                    ${escapeHTML(student.name)}
                </option>
            `).join("");

    } catch (error) {
        console.error("Student loading error:", error);

        studentSelect.innerHTML =
            '<option value="">Unable to load students</option>';

        reportMessage.textContent =
            "Could not load student information. Check Firestore rules.";
    }
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

generateButton.addEventListener("click", generateReport);

async function generateReport() {
    if (!currentUser) return;

    const studentId = studentSelect.value;

    if (!studentId) {
        reportMessage.textContent = "Please select a student.";
        return;
    }

    const student = students.find(item => item.id === studentId);

    if (!student) {
        reportMessage.textContent = "Selected student was not found.";
        return;
    }

    generateButton.disabled = true;
    reportMessage.textContent = "Generating report...";

    try {
        const attendanceQuery = query(
            collection(db, "attendance"),
            where("ownerId", "==", currentUser.uid),
            where("studentId", "==", studentId)
        );

        const snapshot = await getDocs(attendanceQuery);

        attendanceRecords = snapshot.docs.map(item => ({
            id: item.id,
            ...item.data()
        }));

        attendanceRecords.sort((a, b) =>
            String(b.date).localeCompare(String(a.date))
        );

        displayReport(student);

    } catch (error) {
        console.error("Report error:", error);

        reportMessage.textContent =
            "Could not generate the report. Check Firestore security rules.";

    } finally {
        generateButton.disabled = false;
    }
}

function displayReport(student) {
    const total = attendanceRecords.length;

    const present = attendanceRecords.filter(record =>
        record.status === "Present" ||
        record.status === "Late"
    ).length;

    const absent = attendanceRecords.filter(record =>
        record.status === "Absent"
    ).length;

    const percentage = total > 0
        ? Math.round((present / total) * 100)
        : 0;

    document.getElementById("total-days").textContent = total;
    document.getElementById("present-days").textContent = present;
    document.getElementById("absent-days").textContent = absent;

    document.getElementById("attendance-percentage").textContent =
        `${percentage}%`;

    if (attendanceRecords.length === 0) {
        reportTable.innerHTML = `
            <tr>
                <td colspan="4">
                    No attendance records found for this student.
                </td>
            </tr>
        `;
    } else {
        reportTable.innerHTML = attendanceRecords.map(record => `
            <tr>
                <td>${escapeHTML(record.date)}</td>
                <td>${escapeHTML(record.rollNumber || student.rollNumber)}</td>
                <td>${escapeHTML(record.studentName || student.name)}</td>
                <td>${escapeHTML(record.status)}</td>
            </tr>
        `).join("");
    }

    reportMessage.textContent =
        `Report generated for ${student.name}.`;
}