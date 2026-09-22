// ==========================================
//  DARK-NET | Link Directory App (Admin Delete Protected)
// ==========================================

const firebaseConfig = {
    apiKey: "AIzaSyBxJn4KP-GMOdH_cu2ijTkFlt2SYxLldoQ",
    authDomain: "data-base-16fb9.firebaseapp.com",
    databaseURL: "https://data-base-16fb9-default-rtdb.firebaseio.com",
    projectId: "data-base-16fb9",
    storageBucket: "data-base-16fb9.firebasestorage.app",
    messagingSenderId: "821747454613",
    appId: "1:821747454613:web:8484fdfa72d4967fdd819c",
    measurementId: "G-8MQ54L9G66"
};

// Firebase Initializations
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();

let localLinksCache = [];
let isAdminLoggedIn = false;
let currentSearchQuery = "";

// Firebase Auth State Listener (লগইন অবস্থা ট্র্যাক করবে)
auth.onAuthStateChanged((user) => {
    if (user) {
        isAdminLoggedIn = true;
    } else {
        isAdminLoggedIn = false;
    }
    updateAdminUIStatus();
    renderLinksList(getFilteredData()); // ডিলিট বাটন দেখানো বা লুকানোর জন্য রি-রেন্ডার
});

// HTML Escaping to prevent XSS Attacks
function escapeHTML(str) {
    if (!str) return "";
    return String(str).replace(/[&<>'"]/g, tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
    }[tag] || tag));
}

// Custom Floating Notification System
function showNotification(message, type = "info") {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 14px 22px;
        border-radius: 8px;
        background: ${type === 'success' ? '#2eff66' : '#00e5ff'};
        color: #0b0914;
        font-weight: 800;
        z-index: 10000;
        box-shadow: 0 4px 15px rgba(0,0,0,0.5);
        transition: all 0.3s ease;
    `;
    document.body.appendChild(notification);
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 3000);
}

// PROFILE MODAL CONTROL
function openProfileModal() {
    const overlay = document.getElementById('profileModalOverlay');
    if (overlay) overlay.classList.add('active');
}

function closeProfileModal() {
    const overlay = document.getElementById('profileModalOverlay');
    if (overlay) overlay.classList.remove('active');
}

function closeProfileModalOnOutside(e) {
    if (e && e.target && e.target.id === 'profileModalOverlay') {
        closeProfileModal();
    }
}

// BKASH POPUP MODAL CONTROL
function openBkashModal() {
    const overlay = document.getElementById('bkashModalOverlay');
    if (overlay) overlay.classList.add('active');
}

function closeBkashModal() {
    const overlay = document.getElementById('bkashModalOverlay');
    if (overlay) overlay.classList.remove('active');
}

function closeBkashModalOnOutside(e) {
    if (e && e.target && e.target.id === 'bkashModalOverlay') {
        closeBkashModal();
    }
}

// bKash Number Copy
function copyBkashNumber() {
    const actualFullNumber = "01560001721";
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(actualFullNumber).then(() => {
            const btn = document.getElementById('copyBkashBtn');
            if (btn) {
                btn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
                btn.style.background = '#2eff66';
                btn.style.color = '#000000';
                setTimeout(() => {
                    btn.innerHTML = '<i class="fa-regular fa-copy"></i> Copy';
                    btn.style.background = '';
                    btn.style.color = '';
                }, 2000);
            }
            showNotification("bKash Number Copied: " + actualFullNumber, "success");
        }).catch(err => {
            showNotification("bKash Number: " + actualFullNumber, "info");
        });
    } else {
        showNotification("bKash Number: " + actualFullNumber, "info");
    }
}

// Realtime Database Listener
function listenToFirebaseLinks() {
    db.ref('links').on('value', (snapshot) => {
        localLinksCache = [];
        const data = snapshot.val();
        if (data) {
            Object.keys(data).forEach((key) => {
                localLinksCache.push({
                    _id: key,
                    ...data[key]
                });
            });
            localLinksCache.reverse();
        }
        renderLinksList(getFilteredData());
    }, (error) => {
        console.error("Firebase Read Error: ", error);
        showNotification("Error loading links!", "info");
    });
}

function getFilteredData() {
    if (!currentSearchQuery) return localLinksCache;
    const query = currentSearchQuery.toLowerCase();
    return localLinksCache.filter(item => {
        if (!item) return false;
        return (item.title || '').toLowerCase().includes(query) ||
               (item.url || '').toLowerCase().includes(query);
    });
}

// Render Links List (শুধুমাত্র অ্যাডমিন হলেই ডিলিট বাটন দেখাবে)
function renderLinksList(records) {
    const container = document.getElementById('linkList');
    if (!container) return;
    container.innerHTML = '';

    if (!records || !Array.isArray(records) || records.length === 0) {
        container.innerHTML = '<div class="empty-state" style="color: var(--text-muted); padding: 15px; text-align: center;">📂 No database links found. Add one to start!</div>';
        return;
    }

    records.forEach((item) => {
        if (!item) return;

        const displayTitle = escapeHTML(item.title);
        const displayUrl = escapeHTML(item.url);
        const displayMeta = escapeHTML(item.timestamp || '');
        const itemId = escapeHTML(item._id);

        const li = document.createElement('li');
        li.className = 'link-item';
        
        // অ্যাডমিন হলে ডিলিট বাটন থাকবে, সাধারণ ইউজারের জন্য হাইড থাকবে
        const deleteBtnHTML = isAdminLoggedIn 
            ? `<button class="btn-delete-link" data-id="${itemId}" title="Delete">&times;</button>` 
            : '';

        li.innerHTML = `
            <div class="link-details">
                <span class="link-title">${displayTitle}</span>
                <a href="${displayUrl}" target="_blank" rel="noopener noreferrer" class="link-url">${displayUrl}</a>
                <span class="link-meta" style="font-size: 0.7rem; color: #666;">${displayMeta}</span>
            </div>
            ${deleteBtnHTML}
        `;
        container.appendChild(li);
    });

    if (isAdminLoggedIn) {
        const deleteButtons = container.querySelectorAll('.btn-delete-link');
        deleteButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                removeLinkItem(id);
            });
        });
    }
}

// Add New Link (সবাই লিংক যোগ করতে পারবে)
function addNewLink() {
    const urlIn = document.getElementById('linkInput');
    const titleIn = document.getElementById('titleInput');
    if (!urlIn) return;

    let cleanUrl = urlIn.value.trim();
    const cleanTitle = titleIn && titleIn.value ? titleIn.value.trim() : "Unnamed Link";

    if (!cleanUrl) {
        alert("Please enter a valid URL!");
        return;
    }

    if (!/^https?:\/\//i.test(cleanUrl)) {
        cleanUrl = 'https://' + cleanUrl;
    }

    try {
        new URL(cleanUrl);
    } catch (_) {
        alert("Please enter a valid URL!");
        return;
    }

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    const newEntry = {
        title: cleanTitle,
        url: cleanUrl,
        timestamp: `${dateStr} ${timeStr}`,
        createdAt: Date.now()
    };

    db.ref('links').push(newEntry)
    .then(() => {
        urlIn.value = '';
        if (titleIn) titleIn.value = '';
        showNotification("Link Saved Successfully!", "success");
    })
    .catch((error) => {
        console.error("Firebase Add Error: ", error);
        alert("Failed to save link!");
    });
}

// Remove Link (শুধুমাত্র অ্যাডমিন সার্ভারে রিকোয়েস্ট পাঠাবে)
function removeLinkItem(id) {
    if (!isAdminLoggedIn) {
        alert("Only Admin can delete links!");
        return;
    }

    if (!confirm("Delete this link from database?")) return;

    db.ref('links/' + id).remove()
    .then(() => {
        showNotification("Link Removed!", "info");
    })
    .catch((error) => {
        console.error("Firebase Delete Error: ", error);
        alert("Permission Denied: Only logged in Admin can delete!");
    });
}

// Update Admin UI Status
function updateAdminUIStatus() {
    const loginBtn = document.getElementById('loginBtn');
    const adminAuthText = document.getElementById('adminAuthText');
    const profileTitleText = document.getElementById('profileTitleText');
    const profileRoleBadge = document.getElementById('profileRoleBadge');

    if (isAdminLoggedIn) {
        if (loginBtn) loginBtn.style.border = "2px solid #2eff66";
        if (adminAuthText) adminAuthText.textContent = "Admin Logout";
        if (profileTitleText) profileTitleText.textContent = "Administrator";
        if (profileRoleBadge) {
            profileRoleBadge.textContent = "Admin Active";
            profileRoleBadge.style.background = "rgba(46, 255, 102, 0.15)";
            profileRoleBadge.style.color = "#2eff66";
            profileRoleBadge.style.borderColor = "rgba(46, 255, 102, 0.3)";
        }
    } else {
        if (loginBtn) loginBtn.style.border = "1px solid rgba(255, 255, 255, 0.2)";
        if (adminAuthText) adminAuthText.textContent = "Admin Login";
        if (profileTitleText) profileTitleText.textContent = "Guest User";
        if (profileRoleBadge) {
            profileRoleBadge.textContent = "Public Session";
            profileRoleBadge.style.background = "rgba(255, 255, 255, 0.08)";
            profileRoleBadge.style.color = "var(--text-muted)";
            profileRoleBadge.style.borderColor = "rgba(255, 255, 255, 0.1)";
        }
    }
}

// Admin Auth System (Firebase Auth Integration)
function initializeLoginSystem() {
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', openProfileModal);
    }

    const adminAuthBtn = document.getElementById('adminAuthBtn');
    if (adminAuthBtn) {
        adminAuthBtn.addEventListener('click', () => {
            if (isAdminLoggedIn) {
                if (confirm("Are you sure you want to Logout?")) {
                    auth.signOut().then(() => {
                        closeProfileModal();
                        showNotification("Logged Out", "info");
                    });
                }
            } else {
                const passwordInput = prompt("Enter Admin Password:");
                if (passwordInput) {
                    // ফায়ারবেসে রেজিস্টার করা ইমেইল এবং ইনপুট দেওয়া পাসওয়ার্ড দিয়ে লগইন (Line 330)
                    auth.signInWithEmailAndPassword("grin2327@gmail.com", passwordInput)
                    .then(() => {
                        closeProfileModal();
                        showNotification("Admin Logged In Successfully!", "success");
                    })
                    .catch((error) => {
                        alert("Incorrect Password or Login Failed!");
                    });
                }
            }
        });
    }
}

// DOM Event Listeners Setup
document.addEventListener('DOMContentLoaded', () => {
    initializeLoginSystem();
    listenToFirebaseLinks();

    const closeProfileBtn = document.getElementById('closeProfileModalBtn');
    if (closeProfileBtn) closeProfileBtn.addEventListener('click', closeProfileModal);

    const profileOverlay = document.getElementById('profileModalOverlay');
    if (profileOverlay) profileOverlay.addEventListener('click', closeProfileModalOnOutside);

    const profileDonateBtn = document.getElementById('profileDonateBtn');
    if (profileDonateBtn) {
        profileDonateBtn.addEventListener('click', () => {
            closeProfileModal();
            openBkashModal();
        });
    }

    const closeBkashBtn = document.getElementById('closeBkashModalBtn');
    if (closeBkashBtn) closeBkashBtn.addEventListener('click', closeBkashModal);

    const bkashOverlay = document.getElementById('bkashModalOverlay');
    if (bkashOverlay) bkashOverlay.addEventListener('click', closeBkashModalOnOutside);

    const copyBkashBtn = document.getElementById('copyBkashBtn');
    if (copyBkashBtn) copyBkashBtn.addEventListener('click', copyBkashNumber);

    const addLinkBtn = document.getElementById('addLinkBtn');
    if (addLinkBtn) {
        addLinkBtn.addEventListener('click', addNewLink);
    }

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentSearchQuery = e.target.value || '';
            renderLinksList(getFilteredData());
        });
    }

    const navSearchTrigger = document.getElementById('navSearchTrigger');
    if (navSearchTrigger && searchInput) {
        navSearchTrigger.addEventListener('click', () => {
            searchInput.scrollIntoView({ behavior: 'smooth' });
            searchInput.focus();
        });
    }
});