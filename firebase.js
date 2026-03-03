/* ═══════════════════════════════════════════════════════════
   firebase.js — Firebase Auth + Firestore integration
   Thrain Ironhammerson Character Sheet
   ═══════════════════════════════════════════════════════════ */

'use strict';

// ─────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────

const firebaseConfig = {
  apiKey:            "AIzaSyBsUSh19jQEy2_XaZmVJtvluWfr3yBhTXI",
  authDomain:        "thrain-6490c.firebaseapp.com",
  projectId:         "thrain-6490c",
  storageBucket:     "thrain-6490c.firebasestorage.app",
  messagingSenderId: "959355493011",
  appId:             "1:959355493011:web:1e371fb3b2e85ed9f90b66",
  measurementId:     "G-1X0CGZ4S04",
};

// ─────────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────────

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db   = firebase.firestore();

// Enable offline persistence (works without internet at the table!)
db.enablePersistence({ synchronizeTabs: true })
  .catch(err => {
    if (err.code === 'failed-precondition') {
      // Multiple tabs open — persistence only works in one tab at a time
      console.warn('Firestore persistence: multiple tabs open, offline mode limited.');
    } else if (err.code === 'unimplemented') {
      console.warn('Firestore persistence not supported in this browser.');
    }
  });

// Firestore doc path for the current user's sheet
function sheetDocRef(uid) {
  return db.collection('sheets').doc(uid);
}

// Debounce timer for cloud saves
let _saveDebounce = null;

// Track the live listener so we can unsubscribe on sign-out
let _snapshotUnsub = null;

// ─────────────────────────────────────────────────────────────
// AUTH — SIGN IN / OUT
// ─────────────────────────────────────────────────────────────

function signInWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  // Use redirect (more reliable on GitHub Pages / hosted sites than popup)
  auth.signInWithRedirect(provider).catch(err => {
    console.error('Sign-in failed:', err);
    showSyncStatus('Sign-in failed: ' + err.message, 'error');
  });
}

// Handle the redirect result when the page loads back after Google sign-in
auth.getRedirectResult().then(result => {
  if (result && result.user) {
    console.log('Redirect sign-in success:', result.user.email);
  }
}).catch(err => {
  console.error('Redirect result error:', err);
  showSyncStatus('Sign-in failed: ' + err.message, 'error');
});

function signOutUser() {
  if (!confirm('Sign out? Changes will still be saved locally.')) return;
  auth.signOut();
}

// ─────────────────────────────────────────────────────────────
// AUTH STATE LISTENER — drives the whole sync lifecycle
// ─────────────────────────────────────────────────────────────

auth.onAuthStateChanged(user => {
  if (user) {
    updateAuthUI(user);
    showSyncStatus('⏳ Loading cloud data…', 'loading');

    // One-time load from Firestore on sign-in (cloud wins over localStorage)
    sheetDocRef(user.uid).get()
      .then(doc => {
        if (doc.exists) {
          const data = doc.data();
          applySheetData(data);
          showSyncStatus('☁ Synced', 'success');
        } else {
          // First time — push current localStorage data up to the cloud
          const localData = getLocalData();
          if (localData) {
            sheetDocRef(user.uid).set(localData)
              .then(() => showSyncStatus('☁ Sheet uploaded to cloud', 'success'))
              .catch(err => console.error('Initial upload failed:', err));
          } else {
            showSyncStatus('☁ Connected (no cloud data yet)', 'success');
          }
        }
      })
      .catch(err => {
        console.error('Firestore load failed:', err);
        showSyncStatus('⚠ Cloud load failed — using local data', 'error');
      });

    // Real-time listener — keeps all open tabs/devices in sync
    _snapshotUnsub = sheetDocRef(user.uid).onSnapshot(doc => {
      if (doc.exists && doc.metadata.hasPendingWrites === false) {
        // Only apply remote changes (ignore our own writes echoing back)
        const source = doc.metadata.fromCache ? 'cache' : 'server';
        if (source === 'server') {
          applySheetData(doc.data());
          showSyncStatus('☁ Synced', 'success');
        }
      }
    }, err => {
      console.error('Snapshot error:', err);
    });

  } else {
    // Signed out
    updateAuthUI(null);
    showSyncStatus('', '');
    if (_snapshotUnsub) { _snapshotUnsub(); _snapshotUnsub = null; }
  }
});

// ─────────────────────────────────────────────────────────────
// CLOUD SAVE (debounced — waits 800ms after last change)
// ─────────────────────────────────────────────────────────────

function scheduleSaveToCloud(data) {
  clearTimeout(_saveDebounce);
  _saveDebounce = setTimeout(() => {
    const user = auth.currentUser;
    if (!user) return;

    showSyncStatus('⏳ Saving…', 'loading');
    sheetDocRef(user.uid).set(data)
      .then(() => showSyncStatus('☁ Saved', 'success'))
      .catch(err => {
        console.error('Cloud save failed:', err);
        showSyncStatus('⚠ Cloud save failed', 'error');
      });
  }, 800);
}

// ─────────────────────────────────────────────────────────────
// AUTH UI
// ─────────────────────────────────────────────────────────────

function updateAuthUI(user) {
  const signInBtn  = document.getElementById('btn-signin');
  const signOutBtn = document.getElementById('btn-signout');
  const userInfo   = document.getElementById('auth-user-info');
  const userAvatar = document.getElementById('auth-avatar');
  const userName   = document.getElementById('auth-username');

  if (user) {
    if (signInBtn)  signInBtn.style.display  = 'none';
    if (signOutBtn) signOutBtn.style.display = 'inline-block';
    if (userInfo)   userInfo.style.display   = 'flex';
    if (userAvatar) {
      if (user.photoURL) {
        userAvatar.src = user.photoURL;
        userAvatar.alt = user.displayName || 'User';
        userAvatar.style.display = 'inline-block';
      } else {
        // No photo — show a letter avatar via CSS
        userAvatar.style.display = 'none';
      }
    }
    if (userName) userName.textContent = user.displayName || user.email || 'Signed In';
  } else {
    if (signInBtn)  signInBtn.style.display  = 'inline-block';
    if (signOutBtn) signOutBtn.style.display = 'none';
    if (userInfo)   userInfo.style.display   = 'none';
  }
}

// ─────────────────────────────────────────────────────────────
// SYNC STATUS
// ─────────────────────────────────────────────────────────────

let _statusTimer = null;

function showSyncStatus(msg, type) {
  const el = document.getElementById('sync-status');
  if (!el) return;
  el.textContent = msg;
  el.className = 'sync-status sync-' + type;
  clearTimeout(_statusTimer);
  if (type === 'success') {
    _statusTimer = setTimeout(() => {
      if (el.textContent === msg) el.textContent = '☁ Synced';
    }, 3000);
  }
}

// ─────────────────────────────────────────────────────────────
// HELPERS (called from script.js)
// ─────────────────────────────────────────────────────────────

/** Returns parsed localStorage data or null */
function getLocalData() {
  try {
    const raw = localStorage.getItem('thrain_character_sheet_v1');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

/** Expose to script.js */
window.firebaseReady = true;
window.scheduleSaveToCloud = scheduleSaveToCloud;
window.signInWithGoogle    = signInWithGoogle;
window.signOutUser         = signOutUser;
