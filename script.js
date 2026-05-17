// Insert your verified JSONbin dashboard configurations here
const BIN_URL = "https://api.jsonbin.io/v3/b/YOUR_BIN_ID";
const API_KEY = "YOUR_X_ACCESS_KEY";

let localLinksCache = []; 

// 1. LIVE SYSTEM CLOCK SCHEDULER
function startSystemClock() {
    const clockEl = document.getElementById('clockDisplay');
    if(!clockEl) return;
    const tick = () => {
        const now = new Date();
        clockEl.textContent = now.toLocaleTimeString('en-US', { hour12: true });
    };
    tick();
    setInterval(tick, 1000);
}

// 2. FETCH SYSTEM DIRECTORY FROM CLOUD
async function loadPublicLinks() {
    const container = document.getElementById('linkList');
    container.innerHTML = '<div class="empty-state">Synchronizing secure cloud terminal streams...</div>';

    try {
        const response = await fetch(`${BIN_URL}/latest`, {
            method: 'GET',
            headers: { 'X-Master-Key': API_KEY }
        });
        
        if (!response.ok) {
            throw new Error("Network response mismatch");
        }
        
        const data = await response.json();
        localLinksCache = data.record.links || [];
        renderLinksList(localLinksCache);
    } catch (err) {
        console.error(err);
        container.innerHTML = '<div class="empty-state" style="color:#ef5350">Handshake encryption failed.</div>';
    }
}

// 3. RENDER FUNCTION INTERFACE WITH TIMESTAMP + REMOVE BUTTON
function renderLinksList(records) {
    const container = document.getElementById('linkList');
    container.innerHTML = '';

    if (records.length === 0) {
        container.innerHTML = '<div class="empty-state">🕵️ No Saved Links in database. Add a link above to get started!</div>';
        return;
    }

    records.forEach((item, index) => {
        // Read object fields safely, fallback to item if it's an old plain-string URL
        const displayTitle = item.title || "UNTITLED RECORD";
        const displayUrl = item.url || (typeof item === 'string' ? item : "#");
        const displayMeta = item.timestamp || "Added via Secure Node Portal";

        const li = document.createElement('li');
        li.className = 'link-item-wrapper'; 
        li.innerHTML = `
            <div class="link-text-block">
                <span class="rendered-title">${displayTitle}</span>
                <a href="${displayUrl}" target="_blank" class="rendered-meta" style="color: var(--text-muted-slate); text-decoration: none;">${displayUrl}</a>
                <span class="rendered-meta" style="margin-top: 4px; display: block; opacity: 0.6;">${displayMeta}</span>
            </div>
            <button class="btn-remove" onclick="removeLinkItem(${index})">Remove</button>
        `;
        container.appendChild(li);
    });
}

// 4. RECORD GENERATOR (SAVES TITLE, URL & TIMESTAMP)
async function addNewLink() {
    const urlIn = document.getElementById('linkInput');
    const titleIn = document.getElementById('titleInput');

    const cleanUrl = urlIn.value.trim();
    const cleanTitle = titleIn.value.trim() || "UNTITLED SECURE NODE";

    if (cleanUrl === '') return;

    // Generate accurate dynamic timestamp matching your screenshot format
    const now = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    const dateStr = now.toLocaleDateString('en-US', options);
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const formattedTimestamp = `Added on ${dateStr}, ${timeStr}`;

    try {
        const getResponse = await fetch(`${BIN_URL}/latest`, {
            method: 'GET',
            headers: { 'X-Master-Key': API_KEY }
        });
        const currentData = await getResponse.json();
        let currentArray = currentData.record.links || [];

        // Save everything inside an structured object entry
        currentArray.push({
            url: cleanUrl,
            title: cleanTitle,
            timestamp: formattedTimestamp
        });

        const putResponse = await fetch(BIN_URL, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': API_KEY
            },
            body: JSON.stringify({ links: currentArray })
        });

        if (putResponse.ok) {
            urlIn.value = '';
            titleIn.value = '';
            loadPublicLinks(); // Refresh layout view instantly
        }
    } catch (err) {
        console.error(err);
    }
}

// 5. REMOVE ITEM FROM LIVE JSONBIN ARRAY
async function removeLinkItem(indexTarget) {
    if(!confirm("Are you sure you want to remove this data link?")) return;

    try {
        // Remove selection from the local list cache array
        localLinksCache.splice(indexTarget, 1);

        const putResponse = await fetch(BIN_URL, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': API_KEY
            },
            body: JSON.stringify({ links: localLinksCache })
        });

        if (putResponse.ok) {
            loadPublicLinks(); // Reload database values layout
        }
    } catch (err) {
        console.error(err);
    }
}

// 6. REAL-TIME SEARCH FILTER SYSTEM
document.getElementById('searchInput').addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const filteredResults = localLinksCache.filter(item => {
        const matchTitle = (item.title || "").toLowerCase();
        const matchUrl = (item.url || (typeof item === 'string' ? item : "")).toLowerCase();
        return matchTitle.includes(query) || matchUrl.includes(query);
    });
    renderLinksList(filteredResults);
});

// 7. VPN INTERACTIVE ACTION SWITCH MOCKUP
document.getElementById('toggleVpnBtn').addEventListener('click', () => {
    const vpn = document.getElementById('vpnStatus');
    if (vpn.textContent === "Disabled") {
        vpn.textContent = "Enabled";
        vpn.style.color = "#00e676"; // Changes to bright green on active connect
    } else {
        vpn.textContent = "Disabled";
        vpn.style.color = "#00e5ff"; // Back to cyan on disconnect
    }
});

// INITIALIZE APP ON RUN
document.getElementById('addLinkBtn').addEventListener('click', addNewLink);
window.onload = () => {
    startSystemClock();
    loadPublicLinks();
};
