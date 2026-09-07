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

// HTML সেফ করার জন্য এসকেপ ফাংশন
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

// নোটিফিকেশন প্রদর্শন
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
        background: ${type === 'success' ? '#e2136e' : '#00e5ff'};
        color: #ffffff;
        font-weight: 700;
        z-index: 10000;
        box-shadow: 0 4px 15px rgba(0,0,0,0.5);
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
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
    if (e.target.id === 'bkashModalOverlay') {
        closeBkashModal();
    }
}

// bKash Number Copy Functionality
function copyBkashNumber() {
    const bkashNumEl = document.getElementById('bkashNum');
    if (!bkashNumEl) return;
    
    const bkashNum = bkashNumEl.textContent;
    navigator.clipboard.writeText(bkashNum).then(() => {
        showNotification("bKash Personal Number Copied: " + bkashNum, "success");
    }).catch(err => {
        console.error("Could not copy number: ", err);
    });
}

// ইউনিক আইডি তৈরি
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// র্যান্ডম IP জেনারেটর (VPN এর জন্য)
function generateRandomIP() {
    const ipDisplay = document.getElementById('ipDisplay');
    if (ipDisplay) {
        const randomIP = `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
        ipDisplay.textContent = randomIP;
    }
}

// লোকাল স্টোরেজে সেভ
function saveToLocalStorage(data) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        return true;
    } catch (err) {
        console.error("Storage save error:", err);
        return false;
    }
}

// লোকাল স্টোরেজ থেকে লোড
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

// ক্লাউড ডেটাবেস থেকে লিংক লোড
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

// ক্লাউডে সিঙ্ক করা
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

// সার্চ ফিল্টারিং ডেটা পাওয়া
function getFilteredData() {
    if (!currentSearchQuery) return localLinksCache;
    const query = currentSearchQuery.toLowerCase();
    return localLinksCache.filter(item => {
        if (!item) return false;
        return (item.title || '').toLowerCase().includes(query) ||
               (item.url || '').toLowerCase().includes(query);
    });
}

// এইচটিএমএল-এ লিংক রেন্ডার করা
function renderLinksList(records) {
    const container = document.getElementById('linkList');
    if (!container) return;
    container.innerHTML = '';

    if (!records || !Array.isArray(records) || records.length === 0) {
        container.innerHTML = '<div class="empty-state">📂 No database links found. Add one to start!</div>';
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

// নতুন লিংক যোগ করা
async function addNewLink() {
    const urlIn = document.getElementById('linkInput');
    const titleIn = document.getElementById('titleInput');
    if (!urlIn) return;

    let cleanUrl = urlIn.value.trim();
    const cleanTitle = titleIn && titleIn.value ? titleIn.value.trim() : "Unnamed Link";

    if (!cleanUrl) return;

    if (!/^https?:\/\//i.test(cleanUrl)) {
        cleanUrl = 'https://' + cleanUrl;
    }

    try {
        new URL(cleanUrl);
    } catch {
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
            showNotification("Link Saved!", "success");
        }
    } catch (error) {
        console.error("Cloud sync error:", error);
    }
}

// লিংক মুছে ফেলা
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
        showNotification("Link Removed!", "info");
    } catch (error) {
        console.error("Cloud delete error:", error);
    }
}

// লগইন সিস্টেম
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

// VPN সিস্টেম
function initializeVpnSystem() {
    const vpn = document.getElementById('vpnStatus');
    if (!vpn) return;
    vpn.textContent = "Disabled";
    vpn.className = "txt-cyan";
}

// পেজ লোড হওয়ার পর ইনিশিয়ালাইজেশন
document.addEventListener('DOMContentLoaded', () => {
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

// ইন্টারনেট কানেকশন ফেরত আসলে অটো সিঙ্ক
window.addEventListener('online', () => {
    loadPublicLinks();
});