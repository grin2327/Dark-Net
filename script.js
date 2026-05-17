// Insert your verified JSONbin dashboard configurations here
const BIN_URL = "https://api.jsonbin.io/v3/b/YOUR_BIN_ID";
const API_KEY = "YOUR_X_ACCESS_KEY";

let localLinksCache = []; 

// LIVE CLOCK SCHEDULER
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

// FETCH SYSTEM DIRECTORY
async function loadPublicLinks() {
    const container = document.getElementById('linkList');
    container.innerHTML = '<div class="empty-state">Synchronizing secure cloud terminal streams...</div>';

    try {
        const response = await fetch(`${BIN_URL}/latest`, {
            method: 'GET',
            headers: { 'X-Master-Key': API_KEY }
        });
        const data = await response.json();
        localLinksCache = data.record.links || [];
        renderLinksList(localLinksCache);
    } catch (err) {
        console.error(err);
        container.innerHTML = '<div class="empty-state" style="color:#ef5350">Handshake encryption failed.</div>';
    }
}

// RENDER FUNCTION INTERFACE WITH TIMESTAMP + DELETE ATTACHED
function renderLinksList(records) {
    const container = document.getElementById('linkList');
    container.innerHTML = '';

    if (records.length === 0) {
        container.innerHTML = '<div class="empty-state">📚 No links yet. Add one to get started!</div>';
        return;
    }

    records.forEach((item, index) => {
        const displayTitle = item.title || "UNTITLED RECORD";
        const displayMeta = item.timestamp || "Added via Secure Node Portal";

        const li = document.createElement('li');
        li.className = 'link-item-wrapper';
        li.innerHTML = `
            <div class="link-text-block">
                <span class="rendered-title">${displayTitle}</span>
                <span class="rendered-meta">${displayMeta}</span>
            </div>
            <button class="btn-remove" onclick="removeLinkItem(${index})">Remove</button>
        `;
        container.appendChild(li);
    });
}

// RECORD GENERATOR (WITH TIMESTAMP CREATION)
async function addNewLink() {
    const urlIn = document.getElementById('linkInput');
    const titleIn = document.getElementById('titleInput');

    const cleanUrl = urlIn.value.trim();
    const cleanTitle = titleIn.value.trim() || "UNTITLED SECURE NODE";

    if (cleanUrl === '') return;

    // Generate dynamic timestamp matching your screenshot format
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

        // Save object setup tracking URL, custom Title, and individual Timestamp
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
            loadPublicLinks();
        }
    } catch (err) {
        console.error(err);
    }
}

// REMOVE FUNCTION TERMINAL INTERFACE
async function removeLinkItem(indexTarget) {
    if(!confirm("Are you sure you want to remove this data link?")) return;

    try {
        // Splice target selection out of the array list setup
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
            loadPublicLinks(); // Refresh live view
        }
    } catch (err) {
        console.error(err);
    }
}

// TEXT SELECTION LOOKUP KEYWORDS (REALTIME FILTER)
document.getElementById('searchInput').addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const filteredResults = localLinksCache.filter(item => {
        const matchTitle = (item.title || "").toLowerCase();
        const matchUrl = (item.url || "").toLowerCase();
        return matchTitle.includes(query) || matchUrl.includes(query);
    });
    renderLinksList(filteredResults);
});

// VPN MOCK ACTION SWITCH
document.getElementById('toggleVpnBtn').addEventListener('click', () => {
    const vpn = document.getElementById('vpnStatus');
    if (vpn.textContent === "Disabled") {
        vpn.textContent = "Enabled";
        vpn.style.color = "#26a69a";
    } else {
        vpn.textContent = "Disabled";
        vpn.style.color = "#29b6f6";
    }
});

// INITIALIZATION
document.getElementById('addLinkBtn').addEventListener('click', addNewLink);
window.onload = () => {
    startSystemClock();
    loadPublicLinks();
};