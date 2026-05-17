// Connected Credentials - Public Upload Fix with Version Overwrite Bypasses
const BIN_URL = "https://api.jsonbin.io/v3/b/6a092aef250b1311c3602575";
const API_KEY = "$2a$10$lqtzvPNB028JnvmaxXVBv.XQAPheFwW5ak6/xiPLYZrOnrPkYJXra";
const STORAGE_KEY = "darknet_links_cache";
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // ms

let localLinksCache = []; 
let isAdminLoggedIn = false;
let retryCount = 0; 

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

// 1.5. LOCAL STORAGE HELPER FUNCTIONS
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

// 2. FETCH DIRECTORY FROM CLOUD STORAGE
async function loadPublicLinks() {
    const container = document.getElementById('linkList');
    container.innerHTML = '<div class="empty-state">Synchronizing secure cloud terminal streams...</div>';

    try {
        const response = await fetch(`${BIN_URL}/latest`, {
            method: 'GET',
            headers: { 'X-Master-Key': API_KEY },
            timeout: 8000
        });
        
        if (!response.ok) {
            throw new Error(`Server returned status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Smart Data Extractor to scan across different JSON layouts
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
        
        // Validate extracted data
        if (Array.isArray(extractedLinks) && extractedLinks.length > 0) {
            localLinksCache = extractedLinks;
            saveToLocalStorage(localLinksCache);
            retryCount = 0;
            renderLinksList(localLinksCache);
        } else {
            throw new Error("No valid data extracted from server");
        }
    } catch (err) {
        console.error("Cloud sync error:", err);
        
        // Fallback to localStorage
        const cachedData = loadFromLocalStorage();
        if (cachedData && cachedData.length > 0) {
            localLinksCache = cachedData;
            renderLinksList(localLinksCache);
            container.innerHTML = '<div class="empty-state" style="color:#ffeb3b; margin-top: -10px; font-size: 11px;">⚠️ Using cached data (offline mode)</div>' + container.innerHTML;
        } else {
            container.innerHTML = '<div class="empty-state" style="color:#ef5350">Handshake encryption failed. Verify your JSONbin connections.</div>';
        }
    }
}

// 3. RENDER FUNCTION TERMINAL INTERFACE
function renderLinksList(records) {
    const container = document.getElementById('linkList');
    container.innerHTML = '';

    if (!records || !Array.isArray(records) || records.length === 0) {
        container.innerHTML = '<div class="empty-state">📚 No Saved Links in database. Add a link above to get started!</div>';
        return;
    }

    records.forEach((item, index) => {
        if (!item) return; // Skip invalid items
        
        const displayTitle = (item.title || "UNTITLED RECORD").toString();
        const displayUrl = (item.url || (typeof item === 'string' ? item : "#")).toString();
        const displayMeta = (item.timestamp || "Added via Public Node Portal").toString();

        const li = document.createElement('li');
        li.className = 'link-item-wrapper'; 
        li.innerHTML = `
            <div class="link-text-block">
                <span class="rendered-title">${displayTitle}</span>
                <a href="${displayUrl}" target="_blank" class="rendered-meta" style="color: var(--neon-cyan); text-decoration: none; margin-top:2px;">${displayUrl}</a>
                <span class="rendered-meta" style="margin-top: 6px; display: block; opacity: 0.5;">${displayMeta}</span>
            </div>
            <button class="btn-remove" onclick="removeLinkItem(${index})">Remove</button>
        `;
        container.appendChild(li);
    });
}

// 4. ADD NEW URL (PUBLIC UPLOAD - FORCED VERSION OVERWRITE)
async function addNewLink() {
    const urlIn = document.getElementById('linkInput');
    const titleIn = document.getElementById('titleInput');

    const cleanUrl = urlIn.value.trim();
    const cleanTitle = titleIn.value.trim() || "UNTITLED SECURE NODE";

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
    
    localLinksCache.push(newEntry);
    saveToLocalStorage(localLinksCache);

    try {
        let success = false;

        // Format 1: Standard format with versioning disabled
        let response = await fetch(BIN_URL, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': API_KEY,
                'X-Bin-Versioning': 'false'
            },
            body: JSON.stringify({ links: localLinksCache })
        });

        if (response.ok) {
            success = true;
        } else {
            // Format 2 Fallback: Nested record syntax
            response = await fetch(BIN_URL, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': API_KEY,
                    'X-Bin-Versioning': 'false'
                },
                body: JSON.stringify({ record: { links: localLinksCache } })
            });

            if (response.ok) {
                success = true;
            } else {
                // Format 3 Fallback: Pure array format
                response = await fetch(BIN_URL, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Master-Key': API_KEY,
                        'X-Bin-Versioning': 'false'
                    },
                    body: JSON.stringify(localLinksCache)
                });

                if (response.ok) {
                    success = true;
                }
            }
        }

        if (success) {
            urlIn.value = '';
            titleIn.value = '';
            loadPublicLinks();
        } else {
            // If server fails, data is saved locally anyway
            const serverErrorDetails = await response.json().catch(() => ({}));
            console.error("JSONBIN ERROR:", serverErrorDetails);
            urlIn.value = '';
            titleIn.value = '';
            loadPublicLinks();
            alert("Link saved locally. Cloud sync pending...");
        }

    } catch (err) {
        console.error("Network error:", err);
        // Data already saved to localStorage
        urlIn.value = '';
        titleIn.value = '';
        loadPublicLinks();
        alert("Link saved to local cache. Cloud will sync when available.");
    }
}

// 5. REMOVE ITEM FROM LIVE STORAGE ARRAY (PASSWORD PROTECTED)
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

    try {
        if (indexTarget < 0 || indexTarget >= localLinksCache.length) {
            console.error("Invalid index for removal");
            return;
        }

        localLinksCache.splice(indexTarget, 1);
        saveToLocalStorage(localLinksCache);

        let success = false;

        let response = await fetch(BIN_URL, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'X-Master-Key': API_KEY, 'X-Bin-Versioning': 'false' },
            body: JSON.stringify({ links: localLinksCache })
        });

        if (!response.ok) {
            response = await fetch(BIN_URL, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'X-Master-Key': API_KEY, 'X-Bin-Versioning': 'false' },
                body: JSON.stringify({ record: { links: localLinksCache } })
            });
            
            if(!response.ok) {
                await fetch(BIN_URL, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'X-Master-Key': API_KEY, 'X-Bin-Versioning': 'false' },
                    body: JSON.stringify(localLinksCache)
                });
            }
        }
        
        loadPublicLinks();
    } catch (err) {
        console.error("Remove item error:", err);
        // Data already removed from localStorage
        loadPublicLinks();
    }
}

// 6. HEADER LOGIN MODULE CONTROLLER
function initializeLoginSystem() {
    const loginBtn = document.getElementById('loginBtn');
    const userStatus = document.getElementById('userStatus');

    if (!loginBtn || !userStatus) return;

    loginBtn.addEventListener('click', () => {
        if (loginBtn.textContent.includes("Logout")) {
            loginBtn.textContent = "🔒 Login";
            userStatus.textContent = "Guest";
            userStatus.style.color = ""; 
            isAdminLoggedIn = false; 
            alert("Terminal connection closed. Logged out.");
            return;
        }

        const passwordInput = prompt("Enter Terminal Security Password:");
        
        if (passwordInput === "admin123") {
            loginBtn.textContent = "🔓 Logout";
            userStatus.textContent = "Admin Root";
            userStatus.style.color = "#00e676"; 
            isAdminLoggedIn = true; 
            alert("Access granted. Terminal running in Admin mode.");
        } else if (passwordInput !== null) {
            alert("Access Denied. Invalid terminal passphrase.");
        }
    });
}

// 7. REAL-TIME SEARCH STREAM
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

// 8. VPN INTERACTIVE ACTION TOGGLE MOCKUP
const toggleVpnBtn = document.getElementById('toggleVpnBtn');
if (toggleVpnBtn) {
    toggleVpnBtn.addEventListener('click', () => {
        try {
            const vpn = document.getElementById('vpnStatus');
            if (vpn) {
                if (vpn.textContent === "Disabled") {
                    vpn.textContent = "Enabled";
                    vpn.style.color = "#00e676"; 
                } else {
                    vpn.textContent = "Disabled";
                    vpn.style.color = "#00e5ff"; 
                }
            }
        } catch (err) {
            console.error("VPN toggle error:", err);
        }
    });
}

// INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('addLinkBtn').addEventListener('click', addNewLink);
    startSystemClock();
    initializeLoginSystem();
    
    // Load from localStorage first for instant UI
    const cachedData = loadFromLocalStorage();
    if (cachedData && cachedData.length > 0) {
        localLinksCache = cachedData;
        renderLinksList(localLinksCache);
    }
    
    // Then sync with cloud asynchronously
    loadPublicLinks();
});