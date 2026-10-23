import { app } from "./firebase-config.js";

import {
    getAuth,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

import {
    getFirestore,
    collection,
    query,
    where,
    getDocs,
    addDoc,
    updateDoc,
    doc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let students = [];
let existingAttendance = new Map();

const dateInput = document.getElementById("attendanceDate");
const loadButton = document.getElementById("loadAttendanceBtn");
const saveButton = document.getElementById("saveAttendanceBtn");
const tableBody = document.getElementById("attendanceTableBody");
const message = document.getElementById("attendanceMessage");
const logoutButton = document.getElementById("logoutBtn");

function showMessage(text, isError = false) {
    if (!message) return;

    message.textContent = text;
    message.style.color = isError ? "#dc3545" : "#198754";
}

function getToday() {
    const today = new Date();

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

if (dateInput && !dateInput.value) {
    dateInput.value = getToday();
}

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "index.html";
        return;
    }

    currentUser = user;

    await loadStudents();

    if (students.length > 0) {
        await loadAttendance();
    }
});

async function loadStudents() {
    try {
        const studentQuery = query(
            collection(db, "students"),
            where("ownerId", "==", currentUser.uid)
        );

        const snapshot = await getDocs(studentQuery);

        students = snapshot.docs.map((studentDoc) => ({
            id: studentDoc.id,
            ...studentDoc.data()
        }));

        students.sort((a, b) =>
            String(a.rollNumber || "").localeCompare(
                String(b.rollNumber || "")
            )
        );

        renderStudents();

        if (students.length === 0) {
            showMessage("No students found. Add students first.", true);
        }
    } catch (error) {
        console.error("Loading students failed:", error);
        showMessage("Unable to load students: " + error.message, true);
    }
}

function renderStudents() {
    if (!tableBody) {
        console.error("Could not find attendanceTableBody in attendance.html");
        return;
    }

    tableBody.replaceChildren();

    students.forEach((student) => {
        const row = document.createElement("tr");

        const rollCell = document.createElement("td");
        rollCell.textContent = student.rollNumber || "-";

        const nameCell = document.createElement("td");
        nameCell.textContent = student.studentName || "Name not found";

        const departmentCell = document.createElement("td");
        departmentCell.textContent = student.department || "-";

        const statusCell = document.createElement("td");
        const select = document.createElement("select");

        select.className = "attendance-status";
        select.dataset.studentId = student.id;

        ["Present", "Absent", "Late"].forEach((status) => {
            const option = document.createElement("option");
            option.value = status;
            option.textContent = status;
            select.appendChild(option);
        });

        select.value = "Present";

        statusCell.appendChild(select);

        row.append(rollCell, nameCell, departmentCell, statusCell);
        tableBody.appendChild(row);
    });
}

async function loadAttendance() {
    if (!currentUser) return;

    const selectedDate = dateInput?.value;

    if (!selectedDate) {
        showMessage("Please select a date.", true);
        return;
    }

    try {
        showMessage("Loading attendance...");

        existingAttendance.clear();

        const attendanceQuery = query(
            collection(db, "attendance"),
            where("ownerId", "==", currentUser.uid),
            where("date", "==", selectedDate)
        );

        const snapshot = await getDocs(attendanceQuery);

        snapshot.forEach((attendanceDoc) => {
            const record = attendanceDoc.data();

            existingAttendance.set(record.studentId, {
                id: attendanceDoc.id,
                status: record.status
            });
        });

        document.querySelectorAll(".attendance-status").forEach((select) => {
            const savedRecord = existingAttendance.get(select.dataset.studentId);

            select.value = savedRecord?.status || "Present";
        });

        showMessage("Attendance loaded successfully.");
    } catch (error) {
        console.error("Loading attendance failed:", error);
        showMessage("Unable to load attendance: " + error.message, true);
    }
}

if (loadButton) {
    loadButton.addEventListener("click", loadAttendance);
}

if (saveButton) {
    saveButton.addEventListener("click", async () => {
        if (!currentUser) {
            showMessage("Please log in again.", true);
            return;
        }

        if (!dateInput?.value) {
            showMessage("Please select a date.", true);
            return;
        }

        if (students.length === 0) {
            showMessage("No students available to save attendance.", true);
            return;
        }

        saveButton.disabled = true;
        showMessage("Saving attendance...");

        try {
            const selectedDate = dateInput.value;
            const statusSelects = document.querySelectorAll(
                ".attendance-status"
            );

            for (const select of statusSelects) {
                const student = students.find(
                    (item) => item.id === select.dataset.studentId
                );

                if (!student) continue;

                const savedRecord = existingAttendance.get(student.id);

                const attendanceData = {
                    ownerId: currentUser.uid,
                    studentId: student.id,
                    rollNumber: student.rollNumber || "",
                    studentName: student.studentName || "",
                    date: selectedDate,
                    status: select.value,
                    updatedAt: serverTimestamp()
                };

                if (savedRecord) {
                    await updateDoc(
                        doc(db, "attendance", savedRecord.id),
                        attendanceData
                    );
                } else {
                    const newRecord = await addDoc(
                        collection(db, "attendance"),
                        {
                            ...attendanceData,
                            createdAt: serverTimestamp()
                        }
                    );

                    existingAttendance.set(student.id, {
                        id: newRecord.id,
                        status: select.value
                    });
                }
            }

            showMessage("Attendance saved successfully!");
        } catch (error) {
            console.error("Saving attendance failed:", error);

            showMessage(
                "Attendance could not be saved: " + error.message,
                true
            );
        } finally {
            saveButton.disabled = false;
        }
    });
}

if (logoutButton) {
    logoutButton.addEventListener("click", async (event) => {
        event.preventDefault();

        try {
            await signOut(auth);
            window.location.href = "index.html";
        } catch (error) {
            console.error("Logout failed:", error);
            showMessage("Logout failed: " + error.message, true);
        }
    });
}