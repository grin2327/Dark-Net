// Connected Credentials - Public Upload Fix with Version Overwrite Bypasses
const BIN_URL = "https://api.jsonbin.io/v3/b/6a092aef250b1311c3602575";
const API_KEY = "$2a$10$lqtzvPNB028JnvmaxXVBv.XQAPheFwW5ak6/xiPLYZrOnrPkYJXra";
const STORAGE_KEY = "darknet_links_cache";
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // ms

let localLinksCache = []; 
let isAdminLoggedIn = false;
let ipRotationInterval = null; // Track VPN interval loop

// 1. LIVE SYSTEM CLOCK & DATE CONFIGURATION
function startSystemClock() {
    const clockEl = document.getElementById('clockDisplay');
    const dateEl = document.getElementById('dateDisplay');
    
    const tick = () => {
        const now = new Date();
        if(clockEl) clockEl.textContent = now.toLocaleTimeString('en-US', { hour12: true });
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
        const res = await fetch(resource, { ...options, signal: controller.signal });
        return res;
    } finally {
        clearTimeout(id);
    }
}

// 4. CENTRAL ONLINE STORE ENGINE (Pushes cache arrays up to JSONBin)
async function pushToCloud(dataArray) {
    let success = false;
    
    // Structure Format Payload 1
    let response = await fetchWithTimeout(BIN_URL, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'X-Master-Key': API_KEY,
            'X-Bin-Versioning': 'false'
        },
        body: JSON.stringify({ links: dataArray })
    }, 8000).catch(() => null);

    if (response && response.ok) return true;

    // Structure Format Payload 2 Fallback
    response = await fetchWithTimeout(BIN_URL, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'X-Master-Key': API_KEY,
            'X-Bin-Versioning': 'false'
        },
        body: JSON.stringify({ record: { links: dataArray } })
    }, 8000).catch(() => null);

    if (response && response.ok) return true;

    // Structure Format Payload 3 Fallback
    response = await fetchWithTimeout(BIN_URL, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'X-Master-Key': API_KEY,
            'X-Bin-Versioning': 'false'
        },
        body: JSON.stringify(dataArray)
    }, 8000).catch(() => null);

    if (response && response.ok) return true;

    return false;
}

// 5. FETCH DIRECTORY FROM CLOUD STORAGE
async function loadPublicLinks() {
    const container = document.getElementById('linkList');
    if (container) container.innerHTML = '<div class="empty-state">Synchronizing secure cloud terminal streams...</div>';

    try {
        const url = `${BIN_URL}/latest`;
        const response = await fetchWithTimeout(url, { method: 'GET', headers: { 'X-Master-Key': API_KEY } }, 8000);

        if (!response || !response.ok) {
            throw new Error(`Server returned status offline or broken.`);
        }

        const data = await response.json();
        let extractedLinks = [];
        
        if (data.record) {
            if (data.record.links && Array.isArray(data.record.links)) {
                extractedLinks = data.record.links;
            } else if (data.record.record && data.record.record.links && Array.isArray(data.record.record.links)) {
                extractedLinks = data.record.record.links;
            } else if (Array.isArray(data.record)) {
                extractedLinks = data.record;
            }
        } else if (Array.isArray(data)) {
            extractedLinks = data;
        }
        
        if (Array.isArray(extractedLinks)) {
            localLinksCache = extractedLinks;
            saveToLocalStorage(localLinksCache);
            renderLinksList(localLinksCache);
            return;
        }

        throw new Error('No valid data extracted from server');
    } catch (err) {
        console.error('Cloud sync error, falling back to offline cache:', err);

        localLinksCache = loadFromLocalStorage();
        renderLinksList(localLinksCache);
        
        if (container && localLinksCache.length > 0) {
            const warningBadge = document.createElement('div');
            warningBadge.className = 'empty-state';
            warningBadge.style = 'color:#ffeb3b; margin-top: -10px; font-size: 11px;';
            warningBadge.textContent = '⚠️ Operating in Offline Storage Mode (Local Copy)';
            container.insertBefore(warningBadge, container.firstChild);
        }
    }
}

// 6. RENDER FUNCTION TERMINAL INTERFACE
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
        
        const displayTitle = (item.title || "UNTITLED RECORD").toString();
        const displayUrl = (item.url || (typeof item === 'string' ? item : "#")).toString();
        const displayMeta = (item.timestamp || "Added via Public Node Portal").toString();

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

// 7. ADD NEW URL (Saves locally instantly, pushes online if connected)
async function addNewLink() {
    const urlIn = document.getElementById('linkInput');
    const titleIn = document.getElementById('titleInput');
    if (!urlIn) return; 

    const cleanUrl = (urlIn.value || '').trim();
    const cleanTitle = (titleIn && titleIn.value) ? titleIn.value.trim() : "UNTITLED SECURE NODE";
    if (cleanUrl === '') return;

    const now = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    const dateStr = now.toLocaleDateString('en-US', options);
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const formattedTimestamp = `Added on ${dateStr}, ${timeStr}`;

    const newEntry = {
        url: cleanUrl,
        title: cleanTitle,
        timestamp: formattedTimestamp
    };
    
    // Save locally first to guarantee no data loss
    localLinksCache.push(newEntry);
    saveToLocalStorage(localLinksCache);
    renderLinksList(localLinksCache);

    // Clear inputs immediately
    urlIn.value = '';
    titleIn.value = '';

    // Check online visibility state
    if (navigator.onLine) {
        const cloudSynced = await pushToCloud(localLinksCache);
        if (cloudSynced) {
            console.log("Successfully stored online.");
            loadPublicLinks();
        } else {
            alert("Saved locally. Cloud database failed to accept package.");
        }
    } else {
        alert("Device Offline! Link stored inside local storage cache. Will sync automatically when connected.");
    }
}

// 8. REMOVE ITEM FROM STORAGE ARRAY
async function removeLinkItem(indexTarget) {
    if (!isAdminLoggedIn) {
        const passwordCheck = prompt("Security Lock: Enter Owner Password to delete this link:");
        if (passwordCheck === null) return; 
        if (passwordCheck !== "admin123") {
            alert("Access Denied. Incorrect owner passphrase.");
            return; 
        }
    }

    if(!confirm("Are you sure you want to completely erase this data link?")) return;

    if (indexTarget < 0 || indexTarget >= localLinksCache.length) return;

    localLinksCache.splice(indexTarget, 1);
    saveToLocalStorage(localLinksCache);
    renderLinksList(localLinksCache);

    if (navigator.onLine) {
        await pushToCloud(localLinksCache);
        loadPublicLinks();
    } else {
        alert("Removed locally. Sync pending next online connection window.");
    }
}

// 9. HEADER LOGIN MODULE CONTROLLER
function initializeLoginSystem() {
    const loginBtn = document.getElementById('loginBtn');
    const userStatus = document.getElementById('userStatus');

    if (!loginBtn || !userStatus) return;

    loginBtn.addEventListener('click', () => {
        if (loginBtn.textContent.includes("Logout")) {
            loginBtn.textContent = "🔒 Login";
            userStatus.textContent = "Guest";
            userStatus.style.background = 'linear-gradient(135deg, var(--primary-hot), var(--accent-purple))';
            isAdminLoggedIn = false; 
            alert("Terminal connection closed. Logged out.");
            return;
        }

        const passwordInput = prompt("Enter Terminal Security Password:");
        
        if (passwordInput === "admin123") {
            loginBtn.textContent = "🔓 Logout";
            userStatus.textContent = "Admin Root";
            userStatus.style.background = 'linear-gradient(135deg, var(--cute-cyan), var(--accent-purple))';
            isAdminLoggedIn = true; 
            alert("Access granted. Terminal running in Admin mode.");
        } else if (passwordInput !== null) {
            alert("Access Denied. Invalid terminal passphrase.");
        }
    });
}

// 10. GENERATE RANDOM VPN IP ADDRESS
function generateRandomIP() {
    const part1 = Math.floor(Math.random() * 190) + 12; 
    const part2 = Math.floor(Math.random() * 254);
    const part3 = Math.floor(Math.random() * 254);
    const part4 = Math.floor(Math.random() * 253) + 1;
    const ipDisplay = document.getElementById('ipDisplay');
    if (ipDisplay) ipDisplay.textContent = `${part1}.${part2}.${part3}.${part4}`;
}

// 11. AUTOMATIC BACKGROUND ONLINE RECONNECT SYNCHRONIZER
window.addEventListener('online', async () => {
    console.log("Network status altered: Device connected online. Executing cloud update updates...");
    const temporaryCache = loadFromLocalStorage();
    if(temporaryCache.length > 0) {
        const syncSuccess = await pushToCloud(temporaryCache);
        if(syncSuccess) {
            console.log("Background synchronization complete. Online storage match verified.");
            loadPublicLinks();
        }
    }
});

// INITIALIZATION AND EVENT LISTENERS
document.addEventListener('DOMContentLoaded', () => {
    startSystemClock();
    initializeLoginSystem();
    loadPublicLinks(); // Seed system data from cloud target

    const addBtn = document.getElementById('addLinkBtn');
    if (addBtn) {
        addBtn.addEventListener('click', (e) => { 
            try { addNewLink(); } catch (err) { console.error(err); } 
        });
    }

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            try {
                const query = (e.target.value || '').toLowerCase();
                const filteredResults = localLinksCache.filter(item => {
                    if (!item) return false;
                    const matchTitle = (item.title || "").toLowerCase();
                    const matchUrl = (item.url || (typeof item === 'string' ? item : "")).toLowerCase();
                    return matchTitle.includes(query) || matchUrl.includes(query);
                });
                renderLinksList(filteredResults);
            } catch (err) {
                console.error("Search error:", err);
            }
        });
    }

    const toggleVpnBtn = document.getElementById('toggleVpnBtn');
    if (toggleVpnBtn) {
        toggleVpnBtn.addEventListener('click', () => {
            try {
                const vpn = document.getElementById('vpnStatus');
                const ipDisplay = document.getElementById('ipDisplay');
                if (vpn) {
                    if (vpn.textContent === "Disabled") {
                        vpn.textContent = "Enabled";
                        vpn.className = "txt-green-neon"; 
                        generateRandomIP();
                        // Rotates the IP address automatically every 60000ms (1 minute)
                        ipRotationInterval = setInterval(generateRandomIP, 60000);
                    } else {
                        vpn.textContent = "Disabled";
                        vpn.className = "txt-cyan"; 
                        clearInterval(ipRotationInterval);
                        ipRotationInterval = null;
                        if (ipDisplay) ipDisplay.textContent = "Hidden";
                    }
                }
            } catch (err) {
                console.error("VPN implementation execution breakdown:", err);
            }
        });
    }
});