// Connected Credentials
const BIN_URL = "https://api.jsonbin.io/v3/b/6a092aef250b1311c3602575";
// NOTE: Hardcoding API keys in frontend JS is not secure for production apps!
const API_KEY = "$2a$10$lqtzvPNB028JnvmaxXVBv.XQAPheFwW5ak6/xiPLYZrOnrPkYJXra";
const STORAGE_KEY = "darknet_links_cache";

let localLinksCache = []; 
let isAdminLoggedIn = false;
let ipRotationInterval = null;

// --- UTILITIES ---

// Pro Tip: Always escape user input to prevent XSS (Cross-Site Scripting) attacks
function escapeHTML(str) {
    if (!str) return "";
    return str.replace(/[&<>'"]/g, tag => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[tag]));
}

// 1. LIVE SYSTEM CLOCK & DATE CONFIGURATION
function startSystemClock() {
    const clockEl = document.getElementById('clockDisplay');
    const dateEl = document.getElementById('dateDisplay');
    
    const tick = () => {
        const now = new Date();
        if(clockEl) {
            clockEl.textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
        }
    };
    
    if(dateEl) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateEl.textContent = new Date().toLocaleDateString('en-US', options);
    }
    
    tick();
    setInterval(tick, 1000);
}

// 2. LOCAL STORAGE HELPER FUNCTIONS
function saveToLocalStorage(data) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
        console.warn("localStorage save failed:", err);
    }
}

// Fixed to guarantee deep copy initialization
function loadFromLocalStorage() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : [];
    } catch (err) {
        console.warn("localStorage load failed:", err);
        return [];
    }
}

// 3. FETCH WITH TIMEOUT ENGINE
async function fetchWithTimeout(resource, options = {}, timeout = 8000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        return await fetch(resource, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(id);
    }
}

// 4. CENTRAL ONLINE STORE ENGINE 
async function pushToCloud(dataArray) {
    const payload = JSON.stringify({ links: dataArray });
    
    let response = await fetchWithTimeout(BIN_URL, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'X-Master-Key': API_KEY,
            'X-Bin-Versioning': 'false'
        },
        body: payload
    }, 8000).catch(() => null);

    return !!(response && response.ok);
}

// 5. FETCH DIRECTORY FROM CLOUD STORAGE
async function loadPublicLinks() {
    try {
        const url = `${BIN_URL}/latest`;
        const response = await fetchWithTimeout(url, { method: 'GET', headers: { 'X-Master-Key': API_KEY } }, 8000);

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

// 6. RENDER FUNCTION INTERFACE
function renderLinksList(records) {
    const container = document.getElementById('linkList');
    if (!container) return; 
    container.innerHTML = '';

    if (!records || !Array.isArray(records) || records.length === 0) {
        container.innerHTML = '<div class="empty-state">📚 No Saved Links in database. Add a link above to get started!</div>';
        return;
    }

    records.forEach((item, index) => {
        if (!item) return; 
        
        const displayTitle = escapeHTML(item.title || "UNTITLED RECORD");
        const displayUrl = escapeHTML(item.url || "#");
        const displayMeta = escapeHTML(item.timestamp || "Added via Public Node Portal");

        const li = document.createElement('li');
        li.className = 'link-item'; 
        li.innerHTML = `
            <div class="link-details">
                <span class="link-title">${displayTitle}</span>
                <a href="${displayUrl}" target="_blank" class="link-url">${displayUrl}</a>
                <span class="rendered-meta" style="margin-top: 6px; display: block; opacity: 0.5; font-size: 0.75rem;">${displayMeta}</span>
            </div>
            <button class="btn-delete-link" onclick="removeLinkItem(${index})">&times;</button>
        `;
        container.appendChild(li);
    });
}

// 7. ADD NEW URL
async function addNewLink() {
    const urlIn = document.getElementById('linkInput');
    const titleIn = document.getElementById('titleInput');
    if (!urlIn) return; 

    const cleanUrl = urlIn.value.trim();
    const cleanTitle = titleIn && titleIn.value ? titleIn.value.trim() : "UNTITLED SECURE NODE";
    
    if (cleanUrl === '') return alert('Please input a valid URL configuration link.');

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    
    const newEntry = {
        url: cleanUrl,
        title: cleanTitle,
        timestamp: `Added on ${dateStr}, ${timeStr}`
    };
    
    localLinksCache.push(newEntry);
    saveToLocalStorage(localLinksCache);
    renderLinksList(localLinksCache);

    urlIn.value = '';
    if(titleIn) titleIn.value = '';

    if (navigator.onLine) {
        const cloudSynced = await pushToCloud(localLinksCache);
        if (cloudSynced) {
            loadPublicLinks();
        } else {
            alert("Saved locally. Cloud database update failed.");
        }
    } else {
        alert("Stored inside offline cache. Will sync when network connection is restored.");
    }
}

// 8. REMOVE ITEM FROM STORAGE
async function removeLinkItem(indexTarget) {
    if (!isAdminLoggedIn) {
        const passwordCheck = prompt("Security Lock: Enter Owner Password to delete this link:");
        if (passwordCheck === null) return; 
        if (passwordCheck !== "admin123") return alert("Access Denied. Incorrect owner passphrase.");
    }

    if(!confirm("Are you sure you want to completely erase this data link?")) return;

    localLinksCache.splice(indexTarget, 1);
    saveToLocalStorage(localLinksCache);
    renderLinksList(localLinksCache);

    if (navigator.onLine) {
        await pushToCloud(localLinksCache);
        loadPublicLinks();
    }
}

// 9. HEADER LOGIN MODULE (Fixed to preserve state securely on refresh)
function initializeLoginSystem() {
    const loginBtn = document.getElementById('loginBtn');
    const userStatus = document.getElementById('userStatus');
    if (!loginBtn || !userStatus) return;

    // Fixed: Changed from sessionStorage to localStorage
    if (localStorage.getItem('admin_session') === 'true') {
        setAdminState(loginBtn, userStatus, true);
    }

    loginBtn.addEventListener('click', () => {
        if (isAdminLoggedIn) {
            setAdminState(loginBtn, userStatus, false);
            alert("Terminal connection closed. Logged out.");
            return;
        }

        const passwordInput = prompt("Enter Terminal Security Password:");
        if (passwordInput === "admin123") {
            setAdminState(loginBtn, userStatus, true);
            alert("Access granted. Terminal running in Admin mode.");
        } else if (passwordInput !== null) {
            alert("Access Denied. Invalid terminal passphrase.");
        }
    });
}

function setAdminState(btn, statusEl, isLoggedIn) {
    isAdminLoggedIn = isLoggedIn;
    if (isLoggedIn) {
        btn.textContent = "🔓 Logout";
        statusEl.textContent = "Admin Root";
        statusEl.style.background = 'linear-gradient(135deg, var(--cute-cyan), var(--accent-purple))';
        localStorage.setItem('admin_session', 'true'); // Fixed
    } else {
        btn.textContent = "🔒 Login";
        statusEl.textContent = "Guest";
        statusEl.style.background = 'linear-gradient(135deg, var(--primary-hot), var(--accent-purple))';
        localStorage.removeItem('admin_session'); // Fixed
    }
}

// 10. GENERATE RANDOM VPN IP (Fixed to save changes)
function generateRandomIP() {
    const part1 = Math.floor(Math.random() * 190) + 12; 
    const part2 = Math.floor(Math.random() * 254);
    const part3 = Math.floor(Math.random() * 254);
    const part4 = Math.floor(Math.random() * 253) + 1;
    const ipDisplay = document.getElementById('ipDisplay');
    
    const generatedIp = `${part1}.${part2}.${part3}.${part4}`;
    if (ipDisplay) ipDisplay.textContent = generatedIp;
    
    // Save to cache so a refresh doesn't alter a current active session IP
    localStorage.setItem('vpn_ip_cache', generatedIp);
}

// 11. PERSISTENT VPN TRACKING ENGINE (New Logic added to survive reloads)
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
        
        // Resume rotation loops cleanly
        if (ipRotationInterval) clearInterval(ipRotationInterval);
        ipRotationInterval = setInterval(generateRandomIP, 60000);
    } else {
        vpn.textContent = "Disabled";
        vpn.className = "txt-cyan";
        if (ipDisplay) ipDisplay.textContent = "Hidden";
    }
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    startSystemClock();
    initializeLoginSystem();
    initializeVpnSystem(); // Boot up VPN structural memory sync

    // Load instantly from cache for better UX, then sync cloud
    localLinksCache = loadFromLocalStorage();
    renderLinksList(localLinksCache);
    loadPublicLinks(); 

    // Setup Event Listeners
    const addBtn = document.getElementById('addLinkBtn');
    if (addBtn) addBtn.addEventListener('click', addNewLink);

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
