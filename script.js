// ==========================================
//  NIOM IT - Link Directory App
//  Connected Credentials
//  বিঃদ্রঃ: এগুলো প্রোডাকশনে ব্যাকএন্ডে রাখা উচিত
// ==========================================

const BIN_URL = "https://api.jsonbin.io/v3/b/6a092aef250b1311c3602575";
const API_KEY = "$2a$10$lqtzvPNB028JnvmaxXVBv.XQAPheFwW5ak6/xiPLYZrOnrPkYJXra";
const STORAGE_KEY = "darknet_links_cache";

let localLinksCache = [];
let isAdminLoggedIn = false;
let ipRotationInterval = null;


// ==========================================
//  UTILITIES
// ==========================================

// XSS প্রতিরোধ করার জন্য HTML এস্কেপ ফাংশন
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


// ==========================================
//  ১. লাইভ সিস্টেম ক্লক
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
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateEl.textContent = new Date().toLocaleDateString('en-US', options);
    }

    tick();
    setInterval(tick, 1000);
}


// ==========================================
//  ২. লোকাল স্টোরেজ হেল্পার ফাংশনস
// ==========================================

function saveToLocalStorage(data) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
        console.warn("localStorage save failed:", err);
    }
}

function loadFromLocalStorage() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : [];
    } catch (err) {
        console.warn("localStorage load failed:", err);
        return [];
    }
}


// ==========================================
//  ৩. ফেচ টাইমআউট ইঞ্জিন
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
//  ৪. ক্লাউড সার্ভারে ডেটা পুশ (Admin Only)
// ==========================================

async function pushToCloud(dataArray) {
    if (!isAdminLoggedIn) {
        alert("Unauthorized Action: Please login to sync with cloud.");
        return false;
    }

    const payload = JSON.stringify({ links: dataArray });
    try {
        let response = await fetchWithTimeout(BIN_URL, {
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
        console.error("Cloud Sync Failed:", error);
        return false;
    }
}


// ==========================================
//  ৫. ক্লাউড থেকে ডেটা লোড ও মার্জ
// ==========================================

async function loadPublicLinks() {
    try {
        const url = `${BIN_URL}/latest`;
        const response = await fetchWithTimeout(url, {
            method: 'GET',
            headers: { 'X-Master-Key': API_KEY }
        }, 8000);

        if (!response || !response.ok) throw new Error(`Server offline.`);

        const data = await response.json();
        let extractedLinks = [];

        if (data.record && Array.isArray(data.record.links)) {
            extractedLinks = data.record.links;
        } else if (data.record && Array.isArray(data.record)) {
            extractedLinks = data.record;
        } else if (Array.isArray(data)) {
            extractedLinks = data;
        }

        // ডুপ্লিকেট রিমুভ করে লোকাল + ক্লাউড মার্জ
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
        console.error('Cloud sync error, keeping local cache:', err);
        renderLinksList(localLinksCache);
    }
}


// ==========================================
//  ৬. লিংক লিস্ট রেন্ডার
// ==========================================

function renderLinksList(records) {
    const container = document.getElementById('linkList');
    if (!container) return;
    container.innerHTML = '';

    if (!records || !Array.isArray(records) || records.length === 0) {
        container.innerHTML = '<div class="empty-state">📚 No Saved Links in database.</div>';
        return;
    }

    records.forEach((item, index) => {
        if (!item) return;

        const displayTitle = escapeHTML(item.title || "UNTITLED RECORD");
        const displayUrl = escapeHTML(item.url || "#");
        const displayMeta = escapeHTML(item.timestamp || "Added via Public Node");

        const li = document.createElement('li');
        li.className = 'link-item';
        li.innerHTML = `
            <div class="link-details">
                <span class="link-title">${displayTitle}</span>
                <a href="${displayUrl}" target="_blank" class="link-url">${displayUrl}</a>
                <span class="rendered-meta" style="margin-top:6px; display:block; opacity:0.5; font-size:0.75rem;">
                    ${displayMeta}
                </span>
            </div>
            <button class="btn-delete-link" onclick="removeLinkItem(${index})">&times;</button>
        `;
        container.appendChild(li);
    });
}


// ==========================================
//  ৭. নতুন লিঙ্ক যোগ করা (Admin Only)
// ==========================================

async function addNewLink() {
    if (!isAdminLoggedIn) {
        return alert('নিরাপত্তা লক: নতুন লিঙ্ক যোগ করতে প্রথমে লগইন করুন।');
    }

    const urlIn = document.getElementById('linkInput');
    const titleIn = document.getElementById('titleInput');
    if (!urlIn) return;

    const cleanUrl = urlIn.value.trim();
    const cleanTitle = titleIn && titleIn.value
        ? titleIn.value.trim()
        : "UNTITLED SECURE NODE";

    if (cleanUrl === '') return alert('দয়া করে একটি সঠিক URL প্রদান করুন।');

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
    });
    const timeStr = now.toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit', hour12: true
    });

    const newEntry = {
        url: cleanUrl,
        title: cleanTitle,
        timestamp: `Added on ${dateStr}, ${timeStr}`
    };

    localLinksCache.push(newEntry);
    saveToLocalStorage(localLinksCache);
    renderLinksList(localLinksCache);

    urlIn.value = '';
    if (titleIn) titleIn.value = '';

    // Offline-First Architecture
    if (navigator.onLine) {
        const cloudSynced = await pushToCloud(localLinksCache);
        if (cloudSynced) {
            loadPublicLinks();
        } else {
            alert("লোকালি সংরক্ষিত হয়েছে, তবে ক্লাউড সিঙ্ক ব্যর্থ হয়েছে।");
        }
    } else {
        alert("অফলাইন ক্যাশে জমা হয়েছে। ইন্টারনেট কানেকশন পেলে ক্লাউডে সিঙ্ক হবে।");
    }
}


// ==========================================
//  ৮. লিঙ্ক মুছে ফেলা (Admin Only)
// ==========================================

async function removeLinkItem(indexTarget) {
    if (!isAdminLoggedIn) {
        return alert("অ্যাক্সেস অস্বীকৃত! লিঙ্ক মুছতে হলে লগইন থাকা আবশ্যক।");
    }

    if (!confirm("আপনি কি নিশ্চিতভাবে এই লিঙ্কটি মুছে ফেলতে চান?")) return;

    localLinksCache.splice(indexTarget, 1);
    saveToLocalStorage(localLinksCache);
    renderLinksList(localLinksCache);

    if (navigator.onLine) {
        await pushToCloud(localLinksCache);
        loadPublicLinks();
    }
}


// ==========================================
//  ৯. লগইন সেশন ম্যানেজমেন্ট
// ==========================================

function initializeLoginSystem() {
    const loginBtn = document.getElementById('loginBtn');
    const userStatus = document.getElementById('userStatus');
    if (!loginBtn || !userStatus) return;

    // পেজ রিফ্রেশ করলেও সেশন চেক করবে
    if (localStorage.getItem('admin_session') === 'true') {
        setAdminState(loginBtn, userStatus, true);
    }

    loginBtn.addEventListener('click', () => {
        if (isAdminLoggedIn) {
            setAdminState(loginBtn, userStatus, false);
            alert("লগআউট সম্পন্ন হয়েছে।");
            return;
        }

        const passwordInput = prompt("এডমিন সিকিউরিটি পাসওয়ার্ড দিন:");
        // ⚠️ প্রোডাকশনে এই পাসওয়ার্ড ব্যাকএন্ডে রাখতে হবে
        if (passwordInput === "admin123") {
            setAdminState(loginBtn, userStatus, true);
            alert("অ্যাক্সেস অনুমোদিত। এডমিন মোড সক্রিয়।");
            loadPublicLinks();
        } else if (passwordInput !== null) {
            alert("ভুল পাসওয়ার্ড! অ্যাক্সেস দেওয়া সম্ভব নয়।");
        }
    });
}

function setAdminState(btn, statusEl, isLoggedIn) {
    isAdminLoggedIn = isLoggedIn;
    if (isLoggedIn) {
        btn.textContent = "🔓 Logout";
        statusEl.textContent = "Admin Root";
        statusEl.style.background = 'linear-gradient(135deg, #00f0ff, #7000ff)';
        localStorage.setItem('admin_session', 'true');
    } else {
        btn.textContent = "🔒 Login";
        statusEl.textContent = "Guest";
        statusEl.style.background = 'linear-gradient(135deg, #ff0055, #7000ff)';
        localStorage.removeItem('admin_session');
    }
}


// ==========================================
//  ১০. VPN আইপি জেনারেটর ও ট্র্যাকিং
// ==========================================

function generateRandomIP() {
    const part1 = Math.floor(Math.random() * 190) + 12;
    const part2 = Math.floor(Math.random() * 254);
    const part3 = Math.floor(Math.random() * 254);
    const part4 = Math.floor(Math.random() * 253) + 1;

    const generatedIp = `${part1}.${part2}.${part3}.${part4}`;
    const ipDisplay = document.getElementById('ipDisplay');
    if (ipDisplay) ipDisplay.textContent = generatedIp;

    // রিফ্রেশেও আইপি ধরে রাখার জন্য ক্যাশ
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
        // প্রতি ৬০ সেকেন্ডে আইপি রোটেট
        ipRotationInterval = setInterval(generateRandomIP, 60000);
    } else {
        vpn.textContent = "Disabled";
        vpn.className = "txt-cyan";
        if (ipDisplay) ipDisplay.textContent = "Hidden";
    }
}

// (Optional) Real IP Fetcher — ব্যবহার করতে চাইলে আনকমেন্ট করুন
// async function getRealIP() {
//     const res = await fetch('https://api.ipify.org?format=json');
//     const data = await res.json();
//     const ipDisplay = document.getElementById('ipDisplay');
//     if (ipDisplay) ipDisplay.textContent = data.ip;
// }


// ==========================================
//  অ্যাপ্লিকেশন বুটআপ (DOMContentLoaded)
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    startSystemClock();
    initializeLoginSystem();
    initializeVpnSystem();

    // ক্লাউড আসার আগে ক্যাশ ডেটা দিয়ে UI রেন্ডার
    localLinksCache = loadFromLocalStorage();
    renderLinksList(localLinksCache);

    // অনলাইনে থাকলে ব্যাকগ্রাউন্ডে ক্লাউড সিঙ্ক
    if (navigator.onLine) {
        loadPublicLinks();
    }

    // সার্চ ফিল্টার
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

    // VPN অন/অফ টগল
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
            } else {
                vpn.textContent = "Disabled";
                vpn.className = "txt-cyan";
                localStorage.setItem('vpn_status_cache', 'Disabled');
                localStorage.setItem('vpn_ip_cache', 'Hidden');

                clearInterval(ipRotationInterval);
                ipRotationInterval = null;
                if (ipDisplay) ipDisplay.textContent = "Hidden";
            }
        });
    }
});