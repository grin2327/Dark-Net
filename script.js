// ==========================================
//  DARK-NET | Link Directory App
// ==========================================

// JSONBin API Credentials
const JSONBIN_BIN_ID = "6ab4cc2bffd5d16053296812";
const JSONBIN_API_KEY = "$2a$10$m4eIAJmTQZprzKodfXSYkuRhrcLr86GfwudESfXURtTjelCl4GRxa";
const JSONBIN_URL = `https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`;

// Firebase Config (Used for Admin Auth)
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

// Initialize Firebase Auth
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();

let localLinksCache = [];
let isAdminLoggedIn = false;
let currentSearchQuery = "";

// Firebase Auth State Listener
auth.onAuthStateChanged((user) => {
    isAdminLoggedIn = !!user;
    updateAdminUIStatus();
    renderLinksList(getFilteredData());
});

// HTML Escaping (XSS Prevention)
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

// Custom Notification Toast
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

// ==========================================
// MODAL CONTROLS
// ==========================================

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

// ==========================================
// BKASH COPY SYSTEM
// ==========================================

function copyBkashNumber() {
    const actualFullNumber = "01560001721";

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(actualFullNumber)
            .then(() => {
                const btn = document.getElementById('copyBkashBtn');
                if (btn) {
                    const originalHTML = btn.innerHTML;
                    btn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
                    btn.style.background = '#2eff66';
                    btn.style.color = '#000000';

                    setTimeout(() => {
                        btn.innerHTML = originalHTML;
                        btn.style.background = '';
                        btn.style.color = '';
                    }, 2000);
                }
                showNotification("bKash Number Copied: " + actualFullNumber, "success");
            })
            .catch(() => {
                showNotification("bKash Number: " + actualFullNumber, "info");
            });
    } else {
        showNotification("bKash Number: " + actualFullNumber, "info");
    }
}

// ==========================================
// JSONBIN API OPERATIONS (READ & WRITE)
// ==========================================

// Fetch All Links from JSONBin
async function fetchLinksFromJSONBin() {
    try {
        const response = await fetch(`${JSONBIN_URL}/latest`, {
            method: 'GET',
            headers: {
                'X-Access-Key': JSONBIN_API_KEY
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }

        const result = await response.json();
        
        // JSONBin stores data in result.record
        if (Array.isArray(result.record)) {
            localLinksCache = result.record;
        } else if (result.record && Array.isArray(result.record.links)) {
            localLinksCache = result.record.links;
        } else {
            localLinksCache = [];
        }

        renderLinksList(getFilteredData());
    } catch (error) {
        console.error("JSONBin Read Error: ", error);
        showNotification("Error loading links from JSONBin!", "info");
    }
}

// Update JSONBin Data (Save or Delete)
async function syncToJSONBin(updatedLinksList) {
    try {
        const response = await fetch(JSONBIN_URL, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Access-Key': JSONBIN_API_KEY
            },
            body: JSON.stringify(updatedLinksList)
        });

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }

        localLinksCache = updatedLinksList;
        renderLinksList(getFilteredData());
        return true;
    } catch (error) {
        console.error("JSONBin Sync Error: ", error);
        showNotification("Failed to update JSONBin!", "info");
        return false;
    }
}

// ==========================================
// SEARCH & FILTER
// ==========================================

function getFilteredData() {
    if (!currentSearchQuery) {
        return localLinksCache;
    }

    const query = currentSearchQuery.toLowerCase().trim();
    return localLinksCache.filter(item => {
        if (!item) return false;
        const titleMatch = (item.title || '').toLowerCase().includes(query);
        const urlMatch = (item.url || '').toLowerCase().includes(query);
        return titleMatch || urlMatch;
    });
}

// ==========================================
// RENDER LINKS LIST
// ==========================================

function renderLinksList(records) {
    const container = document.getElementById('linkList');
    if (!container) return;

    container.innerHTML = '';

    if (!records || !Array.isArray(records) || records.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="color: var(--text-muted, #888); padding: 15px; text-align: center;">
                📂 No database links found. Add one to start!
            </div>
        `;
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

        const deleteBtnHTML = isAdminLoggedIn
            ? `<button class="btn-delete-link" data-id="${itemId}" title="Delete">&times;</button>`
            : '';

        li.innerHTML = `
            <div class="link-details">
                <span class="link-title">${displayTitle}</span>
                <a href="${displayUrl}" target="_blank" rel="noopener noreferrer" class="link-url">
                    ${displayUrl}
                </a>
                <span class="link-meta" style="font-size: 0.7rem; color: #666;">
                    ${displayMeta}
                </span>
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

// ==========================================
// ADD NEW LINK
// ==========================================

async function addNewLink() {
    const urlIn = document.getElementById('linkInput');
    const titleIn = document.getElementById('titleInput');
    const addBtn = document.getElementById('addLinkBtn');

    if (!urlIn) return;

    let cleanUrl = urlIn.value.trim();
    const cleanTitle = (titleIn && titleIn.value.trim()) ? titleIn.value.trim() : "Unnamed Link";

    if (!cleanUrl) {
        showNotification("Please enter a valid URL!", "info");
        return;
    }

    if (!/^https?:\/\//i.test(cleanUrl)) {
        cleanUrl = 'https://' + cleanUrl;
    }

    try {
        new URL(cleanUrl);
    } catch (_) {
        showNotification("Please enter a valid URL format!", "info");
        return;
    }

    if (addBtn) {
        addBtn.disabled = true;
        addBtn.innerText = "Adding...";
    }

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: '2-digit'
    });
    const timeStr = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });

    const newEntry = {
        _id: 'link_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        title: cleanTitle,
        url: cleanUrl,
        timestamp: `${dateStr} ${timeStr}`,
        createdAt: Date.now()
    };

    const updatedList = [newEntry, ...localLinksCache];
    const success = await syncToJSONBin(updatedList);

    if (success) {
        urlIn.value = '';
        if (titleIn) titleIn.value = '';
        showNotification("Link Saved Successfully!", "success");
    }

    if (addBtn) {
        addBtn.disabled = false;
        addBtn.innerText = "Add Link";
    }
}

// ==========================================
// REMOVE LINK
// ==========================================

async function removeLinkItem(id) {
    if (!isAdminLoggedIn) {
        alert("Only Admin can delete links!");
        return;
    }

    if (!confirm("Delete this link from JSONBin database?")) {
        return;
    }

    const updatedList = localLinksCache.filter(item => item._id !== id);
    const success = await syncToJSONBin(updatedList);

    if (success) {
        showNotification("Link Removed!", "info");
    }
}

// ==========================================
// ADMIN UI STATUS
// ==========================================

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
            profileRoleBadge.style.color = "var(--text-muted, #aaa)";
            profileRoleBadge.style.borderColor = "rgba(255, 255, 255, 0.1)";
        }
    }
}

// ==========================================
// INITIALIZE AUTH & EVENT LISTENERS
// ==========================================

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
                    auth.signInWithEmailAndPassword("grin2327@gmail.com", passwordInput)
                        .then(() => {
                            closeProfileModal();
                            showNotification("Admin Logged In Successfully!", "success");
                        })
                        .catch(() => {
                            alert("Incorrect Password or Login Failed!");
                        });
                }
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initializeLoginSystem();
    
    // ১ম বার পেজ লোডের সময় ডেটা ফেচ করবে
    fetchLinksFromJSONBin();

    // 🔄 AUTO-POLLING: প্রতি ১০ সেকেন্ড পর পর অটোমেটিক নতুন ডেটা চেক করবে
    setInterval(() => {
        fetchLinksFromJSONBin();
    }, 10000); // ১০,০০০ মিলি-সেকেন্ড = ১০ সেকেন্ড

    // Modals Close Events
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

    // Copy bKash Number
    const copyBkashBtn = document.getElementById('copyBkashBtn');
    if (copyBkashBtn) copyBkashBtn.addEventListener('click', copyBkashNumber);

    // Add Link Event
    const addLinkBtn = document.getElementById('addLinkBtn');
    if (addLinkBtn) addLinkBtn.addEventListener('click', addNewLink);

    // Enter Key Handler for Inputs
    const linkInput = document.getElementById('linkInput');
    const titleInput = document.getElementById('titleInput');

    [linkInput, titleInput].forEach(input => {
        if (input) {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    addNewLink();
                }
            });
        }
    });

    // Search Input Handler
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentSearchQuery = e.target.value || '';
            renderLinksList(getFilteredData());
        });
    }

    // Nav Search Trigger
    const navSearchTrigger = document.getElementById('navSearchTrigger');
    if (navSearchTrigger && searchInput) {
        navSearchTrigger.addEventListener('click', () => {
            searchInput.scrollIntoView({ behavior: 'smooth' });
            searchInput.focus();
        });
    }
});