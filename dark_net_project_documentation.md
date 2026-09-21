# DARK-NET / DRK-JU (DARK 365) Project Documentation

## Executive Overview
**DARK-NET / DRK-JU** is a dark/cyberpunk-themed web portal designed as a personal resource repository, software distribution hub, and utility dashboard.

---

## Key Features & Components

### 1. Main Navigation & Resource Dashboard (`index.html`)
* **Real-time Link Database:** A dynamic link library where users can publicly submit or search saved items in real time.
* **Hybrid Storage:** Synchronizes public items with an external REST key-value database (`kvdb.io`) with local browser cache fallbacks.
* **Resource Quick Links:** Directly links to web tools, OSINT resources, utilities, and AI platforms.
* **Platform Applications Hub:** Dedicated navigation cards pointing to OS-specific software hubs (Windows, Linux, macOS).
* **Interactive Modals:** Built-in modal popups for administrative login simulation and bKash donations.

### 2. Media Hub (`video.html`)
* **Multi-Category Filter:** Filter content across domains like Graphics, Research, Video Editing, Open Source, and Utilities.
* **Modal Video Player:** Integrated modal layer to stream videos with custom titles and overlay controls.

### 3. Software Catalog (`apple.html`, `windows.html`, `linux.html`)
* Tailored resource listings organized by operating system with category-based filtering.

---

## Technical Stack

| Layer | Technology Used |
| :--- | :--- |
| **Frontend** | Vanilla HTML5, CSS3 (Flexbox/Grid, Glassmorphism, CSS Variables), FontAwesome Icons |
| **Logic & State** | Vanilla JavaScript (ES6+ DOM manipulation, Fetch API) |
| **Storage** | Browser `localStorage` / `sessionStorage` + External REST Key-Value Database (`kvdb.io`) |

---

## Recommended Development Roadmap

1. **Backend Integration:** Replace the public REST storage with a secure custom backend (Node.js/Express with SQLite/PostgreSQL).
2. **Security & Input Validation:** Add URL validation and HTML sanitization to prevent potential XSS vulnerabilities in public submissions.
3. **Dynamic Content Management:** Develop an admin CMS dashboard to manage software and video entries without editing static HTML code.
4. **Dynamic Media Pipeline:** Connect the video page to dynamic JSON video feeds or media storage services.