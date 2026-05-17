// Connected Credentials - Public Upload & Protected Admin Deletion
const BIN_URL = "https://api.jsonbin.io/v3/b/6a092aef250b1311c3602575";
const API_KEY = "$2a$10$lqtzvPNB028JnvmaxXVBv.XQAPheFwW5ak6/xiPLYZrOnrPkYJXra";

let localLinksCache = []; 
let isAdminLoggedIn = false; // Tracks if they used the header login button

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

// 2. FETCH DIRECTORY FROM CLOUD STORAGE
async function loadPublicLinks() {
    const container = document.getElementById('linkList');
    container.innerHTML = '<div class="empty-state">Synchronizing secure cloud terminal streams...</div>';

    try {
        const response = await fetch(`${BIN_URL}/latest`, {
            method: 'GET',
            headers: { 'X-Master-Key': API_KEY }
        });
        
        if (!response.ok) {
            throw new Error("Handshake rejected by cloud server.");
        }
        
        const data = await response.json();
        
        // Smart Data Extractor to scan across JSON layouts
        if (data.record) {
            if (data.record.links && Array.isArray(data.record.links)) {
                localLinksCache = data.record.links;
            } else if (data.record.record && data.record.record.links && Array.isArray(data.record.record.links)) {
                localLinksCache = data.record.record.links;
            } else if (Array.isArray(data.record)) {
                localLinksCache = data.record;
            } else {
                localLinksCache = [];
            }
        } else {
            localLinksCache = [];
        }
        
        renderLinksList(localLinksCache);
    } catch (err) {
        console.error(err);
        container.innerHTML = '<div class="empty-state" style="color:#ef5350">Handshake encryption failed. Verify your JSONbin connections.</div>';
    }
}

// 3. RENDER FUNCTION TERMINAL INTERFACE
function renderLinksList(records) {
    const container = document.getElementById('linkList');
    container.innerHTML = '';

    if (!records || records.length === 0) {
        container.innerHTML = '<div class="empty-state">📚 No Saved Links in database. Add a link above to get started!</div>';
        return;
    }

    records.forEach((item, index) => {
        const displayTitle = item.title || "UNTITLED RECORD";
        const displayUrl = item.url || (typeof item === 'string' ? item : "#");
        const displayMeta = item.timestamp || "Added via Public Node Portal";

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

// 4. ADD NEW URL (100% OPEN PUBLIC UPLOAD - NO LOGIN REQUIRED)
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

    try {
        // Format 1 Upload Strategy
        let response = await fetch(BIN_URL, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': API_KEY
            },
            body: JSON.stringify({ links: localLinksCache })
        });

        if (response.ok) {
            urlIn.value = '';
            titleIn.value = '';
            loadPublicLinks();
            return;
        }

        // Format 2 Fallback Strategy
        response = await fetch(BIN_URL, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': API_KEY
            },
            body: JSON.stringify({ record: { links: localLinksCache } })
        });

        if (response.ok) {
            urlIn.value = '';
            titleIn.value = '';
            loadPublicLinks();
            return;
        }

        // Format 3 Fallback Strategy
        response = await fetch(BIN_URL, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': API_KEY
            },
            body: JSON.stringify(localLinksCache)
        });

        if (response.ok) {
            urlIn.value = '';
            titleIn.value = '';
            loadPublicLinks();
            return;
        }

        alert("Cloud storage rejected format handling.");

    } catch (err) {
        console.error("Network Link Error:", err);
    }
}

// 5. REMOVE ITEM FROM LIVE STORAGE ARRAY (RESTRICTED WITH PASSWORD PROMPT)
async function removeLinkItem(indexTarget) {
    // Check if user is already authenticated from header login button.
    // If they aren't logged in, prompt them for the owner password.
    if (!isAdminLoggedIn) {
        const passwordCheck = prompt("Security Lock: Enter Owner Password to delete this link:");
        
        if (passwordCheck === null) return; // User pressed cancel
        
        if (passwordCheck !== "admin123") {
            alert("Access Denied. Incorrect owner passphrase.");
            return; // Terminate execution
        }
    }

    // Passphrase confirmed, proceed with verification check
    if(!confirm("Are you sure you want to completely erase this data link?")) return;

    try {
        localLinksCache.splice(indexTarget, 1);

        let response = await fetch(BIN_URL, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'X-Master-Key': API_KEY },
            body: JSON.stringify({ links: localLinksCache })
        });

        if (!response.ok) {
            response = await fetch(BIN_URL, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'X-Master-Key': API_KEY },
                body: JSON.stringify({ record: { links: localLinksCache } })
            });
            
            if(!response.ok) {
                await fetch(BIN_URL, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'X-Master-Key': API_KEY },
                    body: JSON.stringify(localLinksCache)
                });
            }
        }
        
        loadPublicLinks();
    } catch (err) {
        console.error(err);
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
            isAdminLoggedIn = false; // Turn off admin permissions
            alert("Terminal connection closed. Logged out.");
            return;
        }

        const passwordInput = prompt("Enter Terminal Security Password:");
        
        if (passwordInput === "admin123") {
            loginBtn.textContent = "🔓 Logout";
            userStatus.textContent = "Admin Root";
            userStatus.style.color = "#00e676"; 
            isAdminLoggedIn = true; // Unlock all deletion rights instantly without prompts
            alert("Access granted. Terminal running in Admin mode.");
        } else if (passwordInput !== null) {
            alert("Access Denied. Invalid terminal passphrase.");
        }
    });
}

// 7. REAL-TIME SEARCH STREAM
document.getElementById('searchInput').addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const filteredResults = localLinksCache.filter(item => {
        const matchTitle = (item.title || "").toLowerCase();
        const matchUrl = (item.url || (typeof item === 'string' ? item : "")).toLowerCase();
        return matchTitle.includes(query) || matchUrl.includes(query);
    });
    renderLinksList(filteredResults);
});

// 8. VPN INTERACTIVE ACTION TOGGLE MOCKUP
document.getElementById('toggleVpnBtn').addEventListener('click', () => {
    const vpn = document.getElementById('vpnStatus');
    if (vpn.textContent === "Disabled") {
        vpn.textContent = "Enabled";
        vpn.style.color = "#00e676"; 
    } else {
        vpn.textContent = "Disabled";
        vpn.style.color = "#00e5ff"; 
    }
});

// INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('addLinkBtn').addEventListener('click', addNewLink);
    startSystemClock();
    initializeLoginSystem();
    loadPublicLinks();
});
