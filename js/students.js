import { app } from "./firebase-config.js";

import {
    getAuth,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

import {
    getFirestore,
    collection,
    addDoc,
    getDocs,
    query,
    where,
    deleteDoc,
    doc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const auth = getAuth(app);
const db = getFirestore(app);

const studentForm = document.getElementById("studentForm");
const studentTableBody = document.getElementById("studentTableBody");
const studentCount = document.getElementById("studentCount");
const formMessage = document.getElementById("formMessage");
const listMessage = document.getElementById("listMessage");
const addStudentBtn = document.getElementById("addStudentBtn");
const logoutBtn = document.getElementById("logoutBtn");

let currentUser = null;

// Check whether the teacher is logged in.
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "index.html";
        return;
    }

    currentUser = user;
    await loadStudents();
});

// Display messages safely.
function showMessage(element, message, isError = false) {
    element.textContent = message;
    element.style.color = isError ? "#dc3545" : "#198754";
}

// Add a new student.
studentForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!currentUser) {
        showMessage(formMessage, "Please log in again.", true);
        return;
    }

    const rollNumber = document
        .getElementById("rollNumber")
        .value.trim();

    const studentName = document
        .getElementById("studentName")
        .value.trim();

    const email = document
        .getElementById("email")
        .value.trim();

    const department = document
        .getElementById("department")
        .value.trim();

    if (!rollNumber || !studentName || !department) {
        showMessage(formMessage, "Please fill in all required fields.", true);
        return;
    }

    addStudentBtn.disabled = true;
    addStudentBtn.textContent = "Adding...";
    showMessage(formMessage, "");

    try {
        // Prevent duplicate roll numbers for this teacher.
        const duplicateQuery = query(
            collection(db, "students"),
            where("ownerId", "==", currentUser.uid),
            where("rollNumber", "==", rollNumber)
        );

        const duplicateSnapshot = await getDocs(duplicateQuery);

        if (!duplicateSnapshot.empty) {
            showMessage(
                formMessage,
                "A student with this roll number already exists.",
                true
            );
            return;
        }

        await addDoc(collection(db, "students"), {
            ownerId: currentUser.uid,
            rollNumber: rollNumber,
            studentName: studentName,
            email: email,
            department: department,
            createdAt: serverTimestamp()
        });

        showMessage(formMessage, "Student added successfully!");
        studentForm.reset();

        await loadStudents();

    } catch (error) {
        console.error("Error adding student:", error);

        showMessage(
            formMessage,
            "Unable to add student. Check your Firebase configuration and Firestore rules.",
            true
        );
    } finally {
        addStudentBtn.disabled = false;
        addStudentBtn.textContent = "Add Student";
    }
});

// Load students belonging to the logged-in teacher.
async function loadStudents() {
    if (!currentUser) return;

    studentTableBody.replaceChildren();
    studentCount.textContent = "Loading students...";
    showMessage(listMessage, "");

    try {
        const studentsQuery = query(
            collection(db, "students"),
            where("ownerId", "==", currentUser.uid)
        );

        const snapshot = await getDocs(studentsQuery);

        studentCount.textContent =
            `Total Students: ${snapshot.size}`;

        if (snapshot.empty) {
            const row = document.createElement("tr");
            const cell = document.createElement("td");

            cell.colSpan = 5;
            cell.textContent = "No students added yet.";
            row.appendChild(cell);
            studentTableBody.appendChild(row);

            return;
        }

        // Sort by roll number for display.
        const students = snapshot.docs.map((studentDoc) => ({
            id: studentDoc.id,
            ...studentDoc.data()
        }));

        students.sort((a, b) =>
            String(a.rollNumber || "").localeCompare(
                String(b.rollNumber || "")
            )
        );

        for (const student of students) {
            const row = document.createElement("tr");

            addCell(row, student.rollNumber);
            addCell(row, student.studentName);
            addCell(row, student.email || "-");
            addCell(row, student.department);

            const actionCell = document.createElement("td");
            const deleteButton = document.createElement("button");

            deleteButton.type = "button";
            deleteButton.className = "delete-btn";
            deleteButton.textContent = "Delete";

            deleteButton.addEventListener("click", () => {
                deleteStudent(student.id, student.studentName);
            });

            actionCell.appendChild(deleteButton);
            row.appendChild(actionCell);

            studentTableBody.appendChild(row);
        }

    } catch (error) {
        console.error("Error loading students:", error);

        studentCount.textContent = "Unable to load students.";

        showMessage(
            listMessage,
            "Could not retrieve students. Check your Firestore rules and internet connection.",
            true
        );
    }
}

// Create table cells using textContent.
function addCell(row, value) {
    const cell = document.createElement("td");
    cell.textContent = value ?? "-";
    row.appendChild(cell);
}

// Delete a student after confirmation.
async function deleteStudent(studentId, studentName) {
    if (!currentUser) return;

    const confirmed = window.confirm(
        `Are you sure you want to delete ${studentName}?`
    );

    if (!confirmed) return;

    try {
        // Verify ownership before deleting.
        const studentReference = doc(db, "students", studentId);
        const studentSnapshot = await getDocs(
            query(
                collection(db, "students"),
                where("__name__", "==", studentId),
                where("ownerId", "==", currentUser.uid)
            )
        );

        if (studentSnapshot.empty) {
            showMessage(
                listMessage,
                "Student not found or you do not have permission to delete this record.",
                true
            );
            return;
        }

        await deleteDoc(studentReference);

        showMessage(listMessage, "Student deleted successfully.");
        await loadStudents();

    } catch (error) {
        console.error("Error deleting student:", error);

        showMessage(
            listMessage,
            "Unable to delete student. Please check your Firestore rules.",
            true
        );
    }
}

// Log out the teacher.
logoutBtn.addEventListener("click", async (event) => {
    event.preventDefault();

    try {
        await signOut(auth);
        window.location.href = "index.html";
    } catch (error) {
        console.error("Logout failed:", error);
        showMessage(listMessage, "Unable to log out. Please try again.", true);
    }
}); 