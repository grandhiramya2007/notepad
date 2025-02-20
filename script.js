// Firebase Configuration and Initialization
const firebaseConfig = {
    apiKey: "AIzaSyDH9gTNLAywqwZUmiXNmHwEOKna4N06Ik4",
    authDomain: "notepad-385d4.firebaseapp.com",
    projectId: "notepad-385d4",
    storageBucket: "notepad-385d4.firebasestorage.app",
    messagingSenderId: "52656669669",
    appId: "1:52656669669:web:3ce0bb33988653d1b1250c",
    measurementId: "G-E8DNTCGBDW"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// DOM Elements
const authContainer = document.getElementById('authContainer');
const notesContainer = document.getElementById('notesContainer');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const showSignupLink = document.getElementById('showSignup');
const showLoginLink = document.getElementById('showLogin');
const logoutBtn = document.getElementById('logoutBtn');
const notesList = document.getElementById('notesList');
const saveNoteBtn = document.getElementById('saveNoteBtn');
const noteTitleInput = document.getElementById('noteTitle');
const noteContentInput = document.getElementById('noteContent');
const passwordInput = document.getElementById('signupPassword');
const passwordStrength = document.getElementById('passwordStrength');

// Authentication State Observer
auth.onAuthStateChanged(user => {
    if (user) {
        authContainer.classList.add('hidden');
        notesContainer.classList.remove('hidden');
        loadNotes();
    } else {
        authContainer.classList.remove('hidden');
        notesContainer.classList.add('hidden');
        notesList.innerHTML = '';
    }
});

// Form Toggle
showSignupLink.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.classList.add('hidden');
    signupForm.classList.remove('hidden');
});

showLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    signupForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
});

// Password Strength Checker
passwordInput.addEventListener('input', () => {
    const password = passwordInput.value;
    let strength = 0;
    
    if (password.length >= 8) strength += 25;
    if (password.match(/[a-z]+/)) strength += 25;
    if (password.match(/[A-Z]+/)) strength += 25;
    if (password.match(/[0-9]+/)) strength += 25;
    
    passwordStrength.style.width = `${strength}%`;
    passwordStrength.style.background = 
        strength <= 25 ? '#f44336' :
        strength <= 50 ? '#FF9800' :
        strength <= 75 ? '#FFD600' : '#4CAF50';
});

// Login Handler
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        await auth.signInWithEmailAndPassword(email, password);
        loginForm.reset();
    } catch (error) {
        console.error(error.message); // Log error to console
    }
});

// Signup Handler
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        await db.collection('users').doc(userCredential.user.uid).set({
            name,
            email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        signupForm.reset();
    } catch (error) {
        console.error(error.message); // Log error to console
    }
});

// Logout Handler
logoutBtn.addEventListener('click', () => auth.signOut());

// Save Note Handler
saveNoteBtn.addEventListener('click', async () => {
    const title = noteTitleInput.value.trim();
    const content = noteContentInput.value.trim();
    
    if (!title || !content) {
        console.error('Please fill in both title and content'); // Log error to console
        return;
    }
    
    try {
        const noteData = {
            userId: auth.currentUser.uid,
            title,
            content,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await db.collection('notes').add(noteData);
        noteTitleInput.value = '';
        noteContentInput.value = '';
        loadNotes();
    } catch (error) {
        console.error(error.message); // Log error to console
    }
});

// Load Notes
async function loadNotes() {
    if (!auth.currentUser) return;
    
    try {
        // Ensure the required Firestore index is created
        // You can create it here: https://console.firebase.google.com/v1/r/project/notepad-385d4/firestore/indexes?create_composite=Cktwcm9qZWN0cy9ub3RlcGFkLTM4NWQ0L2RhdGFiYXNlcy9kZWZhdWx0L2NvbGxlY3Rpb25Hcm91cHMvbm90ZXMvaW5kZXhlcy9fEAE4oQoGdXNlcklkEAEaDQoJdGltZXN0YW1wEAIaDAoIX19uYW1lX18QAg

        const snapshot = await db.collection('notes')
            .where('userId', '==', auth.currentUser.uid)
            .orderBy('timestamp', 'desc')
            .get();
        
        notesList.innerHTML = '';
        snapshot.forEach(doc => {
            const note = doc.data();
            const noteElement = createNoteElement(doc.id, note);
            notesList.appendChild(noteElement);
        });
    } catch (error) {
        console.error(error.message); // Log error to console
    }
}

// Create Note Element
function createNoteElement(noteId, note) {
    const div = document.createElement('div');
    div.className = 'note-card';
    
    // Escape HTML to prevent XSS
    const escapedTitle = escapeHtml(note.title);
    const escapedContent = escapeHtml(note.content);
    
    div.innerHTML = `
        <h3>${escapedTitle}</h3>
        <p>${escapedContent}</p>
        <div class="note-actions">
            <button class="copy-btn" onclick="copyNote('${escapedContent}')">Copy</button>
            <button class="edit-btn" onclick="editNote('${noteId}', '${escapedTitle}', '${escapedContent}')">Edit</button>
            <button class="delete-btn" onclick="deleteNote('${noteId}')">Delete</button>
        </div>
    `;
    return div;
}

// Copy Note
async function copyNote(content) {
    try {
        await navigator.clipboard.writeText(content);
        console.log('Note copied to clipboard!'); // Log success message to console
    } catch (error) {
        console.error('Failed to copy note'); // Log error to console
    }
}

// Edit Note
async function editNote(noteId, title, content) {
    noteTitleInput.value = title;
    noteContentInput.value = content;
    
    // Remove existing event listener if any
    saveNoteBtn.onclick = async () => {
        try {
            await db.collection('notes').doc(noteId).update({
                title: noteTitleInput.value,
                content: noteContentInput.value,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            noteTitleInput.value = '';
            noteContentInput.value = '';
            saveNoteBtn.onclick = null; // Reset event listener
            loadNotes();
        } catch (error) {
            console.error(error.message); // Log error to console
        }
    };
}

// Delete Note
async function deleteNote(noteId) {
    if (!confirm('Are you sure you want to delete this note?')) return;
    
    try {
        await db.collection('notes').doc(noteId).delete();
        loadNotes();
    } catch (error) {
        console.error('Error deleting note: ' + error.message); // Log error to console
    }
}

// Utility function to escape HTML and prevent XSS
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Error Handler
window.onerror = function(message, source, lineno, colno, error) {
    console.error('Error:', message, 'Source:', source, 'Line:', lineno, 'Column:', colno, 'Error object:', error);
    return false;
};

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    // Reset forms
    loginForm.reset();
    signupForm.reset();
    
    // Clear note inputs
    noteTitleInput.value = '';
    noteContentInput.value = '';
});