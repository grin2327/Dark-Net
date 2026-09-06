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
let ipRotationInterval = null;
let currentSearchQuery = "";

function escapeHTML(str) {
    if (!str) return "";
    return str.replace(/[&<>'"]/g, tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
    }[tag]));
}

function showNotification(message, type = "info") {
    if (type === "error") return;
    
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
        font-weight: 700;
        z-index: 10000;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function saveToLocalStorage(data) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        return true;
    } catch (err) {
        console.error("Storage save error:", err);
        return false;
    }
}

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

function startSystemClock() {
    const clockEl = document.getElementById('clockDisplay');
    const dateEl = document.getElementById('dateDisplay');

    const tick = () => {
        const now = new Date();
        if (clockEl) {
            clockEl.textContent = now.toLocaleTimeString('en-US', {
                hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
            });
        }
    };

    if (dateEl) {
        const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
        dateEl.textContent = new Date().toLocaleDateString('en-US', options);
    }

    tick();
    setInterval(tick, 1000);
}

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

function getFilteredData() {
    if (!currentSearchQuery) return localLinksCache;
    const query = currentSearchQuery.toLowerCase();
    return localLinksCache.filter(item => {
        if (!item) return false;
        return (item.title || '').toLowerCase().includes(query) ||
               (item.url || '').toLowerCase().includes(query);
    });
}

function renderLinksList(records) {
    const container = document.getElementById('linkList');
    if (!container) return;
    container.innerHTML = '';

    if (!records || !Array.isArray(records) || records.length === 0) {
        container.innerHTML = '<div class="empty-state">No database links found. Add one to start!</div>';
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
                <a href="${displayUrl}" target="_blank" rel="noopener" class="link-url">${displayUrl}</a>
                <span class="link-meta">${displayMeta}</span>
            </div>
            <button class="btn-delete-link" onclick="removeLinkItem('${itemId}')" title="Delete">&times;</button>
        `;
        container.appendChild(li);
    });
}

async function addNewLink() {
    const urlIn = document.getElementById('linkInput');
    const titleIn = document.getElementById('titleInput');
    if (!urlIn) return;

    const cleanUrl = urlIn.value.trim();
    const cleanTitle = titleIn && titleIn.value ? titleIn.value.trim() : "Unnamed Link";

    if (!cleanUrl) return;

    try {
        new URL(cleanUrl);
    } catch {
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
            showNotification("Link Saved!", "success");
        }
    } catch (error) {
        console.error("Cloud sync error:", error);
    }
}

async function removeLinkItem(id) {
    if (!confirm("Delete this link from the database?")) return;

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
    } catch (err) {
        console.error("Delete sync error:", err.message);
    }
}

function initializeLoginSystem() {
    const loginBtn = document.getElementById('loginBtn');
    const userStatus = document.getElementById('userStatus');
    if (!loginBtn || !userStatus) return;

    if (localStorage.getItem(SESSION_KEY) === "true") {
        isAdminLoggedIn = true;
        loginBtn.textContent = "🔒 Logout";
        userStatus.textContent = "Admin Root";
        userStatus.style.background = 'linear-gradient(135deg, #2eff66, #00e5ff)';
    }

    loginBtn.addEventListener('click', () => {
        if (isAdminLoggedIn) {
            isAdminLoggedIn = false;
            localStorage.removeItem(SESSION_KEY);
            loginBtn.textContent = "🔒 Login";
            userStatus.textContent = "Guest";
            userStatus.style.background = 'linear-gradient(135deg, #ff337a, #8a4fff)';
            return;
        }

        const passwordInput = prompt("Enter admin password:");
        if (passwordInput === "admin123") {
            isAdminLoggedIn = true;
            localStorage.setItem(SESSION_KEY, "true");
            loginBtn.textContent = "🔒 Logout";
            userStatus.textContent = "Admin Root";
            userStatus.style.background = 'linear-gradient(135deg, #2eff66, #00e5ff)';
        }
    });
}

function generateRandomIP() {
    const generatedIp = `${Math.floor(Math.random() * 190) + 12}.${Math.floor(Math.random() * 254)}.${Math.floor(Math.random() * 254)}.${Math.floor(Math.random() * 253) + 1}`;
    const ipDisplay = document.getElementById('ipDisplay');
    if (ipDisplay) ipDisplay.textContent = generatedIp;
}

function initializeVpnSystem() {
    const vpn = document.getElementById('vpnStatus');
    if (!vpn) return;
    vpn.textContent = "Disabled";
    vpn.className = "txt-cyan";
}

document.addEventListener('DOMContentLoaded', () => {
    startSystemClock();
    initializeLoginSystem();
    initializeVpnSystem();

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

    const toggleVpnBtn = document.getElementById('toggleVpnBtn');
    if (toggleVpnBtn) {
        toggleVpnBtn.addEventListener('click', () => {
            const vpn = document.getElementById('vpnStatus');
            const ipDisplay = document.getElementById('ipDisplay');
            if (!vpn) return;

            if (vpn.textContent.trim() === "Disabled") {
                vpn.textContent = "Enabled";
                vpn.className = "txt-green-neon";
                generateRandomIP();
                ipRotationInterval = setInterval(generateRandomIP, 60000);
            } else {
                vpn.textContent = "Disabled";
                vpn.className = "txt-cyan";
                clearInterval(ipRotationInterval);
                if (ipDisplay) ipDisplay.textContent = "Hidden";
            }
        });
    }
});

window.addEventListener('online', () => {
    loadPublicLinks();
});