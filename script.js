// ==========================================
//  DARK-NET | Link Directory App
//  POWERED BY FREE PUBLIC JSON API (KVDB)
// ==========================================

const KVDB_BUCKET_URL = "https://kvdb.io/3QKuAXCJ6AqgDwMGQCKAs9/";
const API_URL = `${KVDB_BUCKET_URL}darknet_links`;

const STORAGE_KEY = "darknet_links_cache_v3";
const SESSION_KEY = "admin_session_active";

let localLinksCache = [];
let isAdminLoggedIn = false;
let currentSearchQuery = "";

// HTML Safe korar jonno Escape Function
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

// Notification Show Function
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
    `;
    document.body.appendChild(notification);
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 3000);
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

// bKash Number Copy Functionality
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
            console.error("Could not copy number: ", err);
        });
    } else {
        showNotification("bKash Number: " + actualFullNumber, "info");
    }
}

// Unique ID Generator
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// Save to LocalStorage
function saveToLocalStorage(data) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        return true;
    } catch (err) {
        console.error("Storage save error:", err);
        return false;
    }
}

// Load from LocalStorage
function loadFromLocalStorage() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) return [];
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
        return [];
    }
}

// Load Links from Cloud Database
async function loadPublicLinks() {
    try {
        const response = await fetch(API_URL, { method: 'GET' });

        if (response.status === 404) {
            localLinksCache = loadFromLocalStorage();
            renderLinksList(getFilteredData());
            return;
        }

        if (!response.ok) throw new Error("Database Connection Error");

        const data = await response.json();
        const cloudData = Array.isArray(data) ? data : [];

        const localData = loadFromLocalStorage();
        if (localData.length >= cloudData.length) {
            localLinksCache = localData;
            syncToCloud(localData);
        } else {
            localLinksCache = cloudData;
            saveToLocalStorage(localLinksCache);
        }

        renderLinksList(getFilteredData());

    } catch (err) {
        console.error('Cloud load error:', err);
        localLinksCache = loadFromLocalStorage();
        renderLinksList(getFilteredData());
    }
}

// Sync Data to Cloud
async function syncToCloud(data) {
    try {
        await fetch(API_URL, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });
    } catch (err) {
        console.error("Cloud sync error:", err.message);
    }
}

// Get Filtered Data based on Search Query
function getFilteredData() {
    if (!currentSearchQuery) return localLinksCache;
    const query = currentSearchQuery.toLowerCase();
    return localLinksCache.filter(item => {
        if (!item) return false;
        return (item.title || '').toLowerCase().includes(query) ||
               (item.url || '').toLowerCase().includes(query);
    });
}

// Render Links List in HTML
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
        li.innerHTML = `
            <div class="link-details">
                <span class="link-title">${displayTitle}</span>
                <a href="${displayUrl}" target="_blank" rel="noopener noreferrer" class="link-url">${displayUrl}</a>
                <span class="link-meta" style="font-size: 0.7rem; color: #666;">${displayMeta}</span>
            </div>
            <button class="btn-delete-link" onclick="removeLinkItem('${itemId}')" title="Delete">&times;</button>
        `;
        container.appendChild(li);
    });
}

// Add New Link
async function addNewLink() {
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
        _id: generateId(),
        title: cleanTitle,
        url: cleanUrl,
        timestamp: `${dateStr} ${timeStr}`
    };

    localLinksCache.push(newEntry);
    saveToLocalStorage(localLinksCache);

    urlIn.value = '';
    if (titleIn) titleIn.value = '';

    renderLinksList(getFilteredData());

    try {
        const response = await fetch(API_URL, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(localLinksCache)
        });
        if (response.ok) {
            showNotification("Link Saved Successfully!", "success");
        }
    } catch (error) {
        console.error("Cloud sync error:", error);
    }
}

// Remove Link Item
async function removeLinkItem(id) {
    if (!confirm("Delete this link from database?")) return;

    const index = localLinksCache.findIndex(item => item && item._id === id);
    if (index === -1) return;

    localLinksCache.splice(index, 1);
    saveToLocalStorage(localLinksCache);

    renderLinksList(getFilteredData());

    try {
        await fetch(API_URL, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(localLinksCache)
        });
        showNotification("Link Removed!", "info");
    } catch (error) {
        console.error("Cloud delete error:", error);
    }
}

// Profile/Login System Handler
function initializeLoginSystem() {
    const loginBtn = document.getElementById('loginBtn');
    if (!loginBtn) return;

    if (localStorage.getItem(SESSION_KEY) === "true") {
        isAdminLoggedIn = true;
        loginBtn.style.border = "2px solid #2eff66";
    }

    loginBtn.addEventListener('click', () => {
        if (isAdminLoggedIn) {
            if (confirm("Are you sure you want to Logout?")) {
                isAdminLoggedIn = false;
                localStorage.removeItem(SESSION_KEY);
                loginBtn.style.border = "1px solid rgba(255, 255, 255, 0.2)";
                showNotification("Logged Out", "info");
            }
            return;
        }

        const passwordInput = prompt("Enter Admin Password:");
        if (passwordInput === "admin123") {
            isAdminLoggedIn = true;
            localStorage.setItem(SESSION_KEY, "true");
            loginBtn.style.border = "2px solid #2eff66";
            showNotification("Admin Logged In!", "success");
        } else if (passwordInput !== null) {
            alert("Incorrect Password!");
        }
    });
}

// Track Session Views
function handleSessionTracking() {
    const countEl = document.getElementById('viewCount');
    if (countEl) {
        let views = parseInt(sessionStorage.getItem('page_view_count') || '0', 10);
        views++;
        sessionStorage.setItem('page_view_count', views);
        countEl.textContent = `${views} ${views === 1 ? 'view' : 'views'}`;
    }
}

// DOM Initialization
document.addEventListener('DOMContentLoaded', () => {
    initializeLoginSystem();
    handleSessionTracking();

    localLinksCache = loadFromLocalStorage();
    renderLinksList(getFilteredData());

    if (navigator.onLine) {
        loadPublicLinks();
    }

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

// Auto Sync on Reconnecting Online
window.addEventListener('online', () => {
    loadPublicLinks();
});