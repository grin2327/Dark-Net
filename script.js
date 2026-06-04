// ==========================================
//  DARK-NET | Link Directory App
//  FIXED: Login Persistence & Better UX
// ==========================================

const BIN_URL = "https://api.jsonbin.io/v3/b/6a092aef250b1311c3602575";
const API_KEY = "$2a$10$lqtzvPNB028JnvmaxXVBv.XQAPheFwW5ak6/xiPLYZrOnrPkYJXra";
const STORAGE_KEY = "darknet_links_cache_v3";
const SESSION_KEY = "admin_session_active";
const SESSION_EXPIRY_KEY = "admin_session_expires";

let localLinksCache = [];
let isAdminLoggedIn = false;
let ipRotationInterval = null;

// ==========================================
//  CORE UTILITIES
// ==========================================

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
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 14px 22px;
        border-radius: 8px;
        background: ${type === 'success' ? '#2eff66' : type === 'error' ? '#ff3366' : '#00e5ff'};
        color: #0b0914;
        font-weight: 700;
        z-index: 10000;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

// ==========================================
//  PERSISTENT STORAGE
// ==========================================

function saveToLocalStorage(data) {
    try {
        const payload = JSON.stringify(data);
        localStorage.setItem(STORAGE_KEY, payload);
        const verify = localStorage.getItem(STORAGE_KEY);
        if (!verify) throw new Error("Verify failed");
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
        console.error("Storage load error:", err);
        return [];
    }
}

// ==========================================
//  SESSION MANAGEMENT (FIX #1)
// ==========================================

function saveSessionState(isLoggedIn) {
    try {
        if (isLoggedIn) {
            const expiry = Date.now() + (30 * 24 * 60 * 60 * 1000); // 30 days
            localStorage.setItem(SESSION_KEY, "active");
            localStorage.setItem(SESSION_EXPIRY_KEY, expiry.toString());
        } else {
            localStorage.removeItem(SESSION_KEY);
            localStorage.removeItem(SESSION_EXPIRY_KEY);
        }
    } catch (err) {
        console.warn("Session save error:", err);
    }
}

function loadSessionState() {
    try {
        const session = localStorage.getItem(SESSION_KEY);
        const expiry = localStorage.getItem(SESSION_EXPIRY_KEY);
        
        if (!session || !expiry) return false;
        if (Date.now() > parseInt(expiry, 10)) {
            saveSessionState(false);
            return false;
        }
        return session === "active";
    } catch (err) {
        console.warn("Session load error:", err);
        return false;
    }
}

// ==========================================
//  SYSTEM CLOCK
// ==========================================

function startSystemClock() {
    const clockEl = document.getElementById('clockDisplay');
    const dateEl = document.getElementById('dateDisplay');

    const tick = () => {
        const now = new Date();
        if (clockEl) {
            clockEl.textContent = now.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
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

// ==========================================
//  FETCH WITH TIMEOUT
// ==========================================

async function fetchWithTimeout(resource, options = {}, timeout = 8000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        return await fetch(resource, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(id);
    }
}

// ==========================================
//  CLOUD SYNC
// ==========================================

async function pushToCloud(dataArray) {
    if (!isAdminLoggedIn) return false;

    const payload = JSON.stringify({ links: dataArray });
    try {
        const response = await fetchWithTimeout(BIN_URL, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': API_KEY,
                'X-Bin-Versioning': 'false'
            },
            body: payload
        }, 8000);

        return !!(response && response.ok);
    } catch (error) {
        console.error("Cloud sync failed:", error);
        return false;
    }
}

async function loadPublicLinks() {
    try {
        const url = `${BIN_URL}/latest`;
        const response = await fetchWithTimeout(url, {
            method: 'GET',
            headers: { 'X-Master-Key': API_KEY }
        }, 8000);

        if (!response || !response.ok) throw new Error("Offline");

        const data = await response.json();
        let extractedLinks = [];

        if (data.record && Array.isArray(data.record.links)) {
            extractedLinks = data.record.links;
        } else if (data.record && Array.isArray(data.record)) {
            extractedLinks = data.record;
        } else if (Array.isArray(data)) {
            extractedLinks = data;
        }

        const mergedMap = new Map();
        [...localLinksCache, ...extractedLinks].forEach(item => {
            if (!item || !item.url) return;
            const key = item.url.trim();
            if (!mergedMap.has(key)) {
                mergedMap.set(key, item);
            }
        });

        localLinksCache = Array.from(mergedMap.values());
        saveToLocalStorage(localLinksCache);
        renderLinksList(localLinksCache);

    } catch (err) {
        console.error('Cloud sync error:', err);
        renderLinksList(localLinksCache);
    }
}

// ==========================================
//  RENDER LINKS
// ==========================================

function renderLinksList(records) {
    const container = document.getElementById('linkList');
    if (!container) return;
    container.innerHTML = '';

    if (!records || !Array.isArray(records) || records.length === 0) {
        container.innerHTML = '<div class="empty-state">📚 No links saved. Add one to get started!</div>';
        return;
    }

    records.forEach((item, index) => {
        if (!item) return;

        const displayTitle = escapeHTML(item.title || "Unnamed");
        const displayUrl = escapeHTML(item.url || "#");
        const displayMeta = escapeHTML(item.timestamp || "Unknown");

        const li = document.createElement('li');
        li.className = 'link-item';
        li.innerHTML = `
            <div class="link-details">
                <span class="link-title">${displayTitle}</span>
                <a href="${displayUrl}" target="_blank" rel="noopener" class="link-url">${displayUrl}</a>
                <span class="link-meta">${displayMeta}</span>
            </div>
            <button class="btn-delete-link" onclick="removeLinkItem(${index})" title="Delete">&times;</button>
        `;
        container.appendChild(li);
    });
}

// ==========================================
//  ADD LINK
// ==========================================

async function addNewLink() {
    if (!isAdminLoggedIn) {
        showNotification("Login required", "error");
        return;
    }

    const urlIn = document.getElementById('linkInput');
    const titleIn = document.getElementById('titleInput');
    if (!urlIn) return;

    const cleanUrl = urlIn.value.trim();
    const cleanTitle = titleIn && titleIn.value ? titleIn.value.trim() : "Unnamed Link";

    if (!cleanUrl) {
        showNotification("Enter a URL", "error");
        return;
    }

    try {
        new URL(cleanUrl);
    } catch {
        showNotification("Invalid URL", "error");
        return;
    }

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    const newEntry = {
        url: cleanUrl,
        title: cleanTitle,
        timestamp: `${dateStr} ${timeStr}`
    };

    localLinksCache.push(newEntry);
    if (saveToLocalStorage(localLinksCache)) {
        renderLinksList(localLinksCache);
        urlIn.value = '';
        if (titleIn) titleIn.value = '';
        showNotification("Link added!", "success");

        if (navigator.onLine) {
            const cloudSynced = await pushToCloud(localLinksCache);
            if (cloudSynced) {
                showNotification("Synced to cloud", "success");
                loadPublicLinks();
            }
        }
    } else {
        showNotification("Failed to save", "error");
    }
}

// ==========================================
//  REMOVE LINK
// ==========================================

async function removeLinkItem(indexTarget) {
    if (!isAdminLoggedIn) {
        showNotification("Login required", "error");
        return;
    }

    if (!confirm("Delete this link?")) return;

    localLinksCache.splice(indexTarget, 1);
    if (saveToLocalStorage(localLinksCache)) {
        renderLinksList(localLinksCache);
        showNotification("Link deleted", "success");

        if (navigator.onLine) {
            await pushToCloud(localLinksCache);
            loadPublicLinks();
        }
    }
}

// ==========================================
//  LOGIN SYSTEM (FIXED #2)
// ==========================================

function initializeLoginSystem() {
    const loginBtn = document.getElementById('loginBtn');
    const userStatus = document.getElementById('userStatus');
    if (!loginBtn || !userStatus) return;

    // Restore session if it's still valid
    if (loadSessionState()) {
        setAdminState(loginBtn, userStatus, true);
    }

    loginBtn.addEventListener('click', () => {
        if (isAdminLoggedIn) {
            setAdminState(loginBtn, userStatus, false);
            // removed logout notification per user request
            return;
        }

        const passwordInput = prompt("Enter admin password:");
        if (passwordInput === "admin123") {
            setAdminState(loginBtn, userStatus, true);
            saveSessionState(true);
            // removed login success notification per user request
            loadPublicLinks();
        } else if (passwordInput !== null) {
            showNotification("Wrong password", "error");
        }
    });
}

function setAdminState(btn, statusEl, isLoggedIn) {
    isAdminLoggedIn = isLoggedIn;
    if (isLoggedIn) {
        btn.textContent = "🔓 Logout";
        btn.classList.add('btn-logout');
        btn.classList.remove('btn-login');
        statusEl.textContent = "Admin Root";
        statusEl.style.background = 'linear-gradient(135deg, #2eff66, #00e5ff)';
        saveSessionState(true);
    } else {
        btn.textContent = "🔒 Login";
        btn.classList.add('btn-login');
        btn.classList.remove('btn-logout');
        statusEl.textContent = "Guest";
        statusEl.style.background = 'linear-gradient(135deg, #ff0055, #ff337a)';
        saveSessionState(false);
    }
}

// ==========================================
//  VPN SYSTEM
// ==========================================

function generateRandomIP() {
    const part1 = Math.floor(Math.random() * 190) + 12;
    const part2 = Math.floor(Math.random() * 254);
    const part3 = Math.floor(Math.random() * 254);
    const part4 = Math.floor(Math.random() * 253) + 1;

    const generatedIp = `${part1}.${part2}.${part3}.${part4}`;
    const ipDisplay = document.getElementById('ipDisplay');
    if (ipDisplay) ipDisplay.textContent = generatedIp;

    localStorage.setItem('vpn_ip_cache', generatedIp);
}

function initializeVpnSystem() {
    const vpn = document.getElementById('vpnStatus');
    const ipDisplay = document.getElementById('ipDisplay');
    if (!vpn) return;

    const savedVpnStatus = localStorage.getItem('vpn_status_cache') || 'Disabled';
    const savedIp = localStorage.getItem('vpn_ip_cache') || 'Hidden';

    if (savedVpnStatus === "Enabled") {
        vpn.textContent = "Enabled";
        vpn.className = "txt-green-neon";
        if (ipDisplay) ipDisplay.textContent = savedIp;

        if (ipRotationInterval) clearInterval(ipRotationInterval);
        ipRotationInterval = setInterval(generateRandomIP, 60000);
    } else {
        vpn.textContent = "Disabled";
        vpn.className = "txt-cyan";
        if (ipDisplay) ipDisplay.textContent = "Hidden";
    }
}

// ==========================================
//  APP INITIALIZATION (FIXED #3)
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    startSystemClock();
    initializeLoginSystem();
    initializeVpnSystem();

    // Load local data first (FIX #4: Restore all saved links)
    localLinksCache = loadFromLocalStorage();
    renderLinksList(localLinksCache);

    // Then sync with cloud if online
    if (navigator.onLine) {
        loadPublicLinks();
    }

    // Add link button
    const addLinkBtn = document.getElementById('addLinkBtn');
    if (addLinkBtn) {
        addLinkBtn.addEventListener('click', addNewLink);
    }

    // Search functionality
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = (e.target.value || '').toLowerCase();
            const filteredResults = localLinksCache.filter(item => {
                if (!item) return false;
                return (item.title || "").toLowerCase().includes(query) ||
                       (item.url || "").toLowerCase().includes(query);
            });
            renderLinksList(filteredResults);
        });
    }

    // VPN toggle
    const toggleVpnBtn = document.getElementById('toggleVpnBtn');
    if (toggleVpnBtn) {
        toggleVpnBtn.addEventListener('click', () => {
            const vpn = document.getElementById('vpnStatus');
            const ipDisplay = document.getElementById('ipDisplay');
            if (!vpn) return;

            if (vpn.textContent.trim() === "Disabled") {
                vpn.textContent = "Enabled";
                vpn.className = "txt-green-neon";
                localStorage.setItem('vpn_status_cache', 'Enabled');
                generateRandomIP();

                if (ipRotationInterval) clearInterval(ipRotationInterval);
                ipRotationInterval = setInterval(generateRandomIP, 60000);
                showNotification("VPN Enabled", "success");
            } else {
                vpn.textContent = "Disabled";
                vpn.className = "txt-cyan";
                localStorage.setItem('vpn_status_cache', 'Disabled');
                localStorage.setItem('vpn_ip_cache', 'Hidden');

                clearInterval(ipRotationInterval);
                ipRotationInterval = null;
                if (ipDisplay) ipDisplay.textContent = "Hidden";
                showNotification("VPN Disabled", "info");
            }
        });
    }
});

// Handle online/offline
window.addEventListener('online', () => {
    if (isAdminLoggedIn) {
        loadPublicLinks();
        showNotification("Back online - syncing", "info");
    }
});

window.addEventListener('offline', () => {
    showNotification("Offline - using cached data", "info");
});
