# DARK-NET / DRK-JU Project Documentation

This is a simple, beginner-friendly explanation of the project.

---

## 1. What is this project?

DARK-NET / DRK-JU is a cyberpunk-style website that works like a personal portal for:

- software links
- useful tools
- online resources
- videos
- platform-based software lists
- admin/public user interface

The design is dark, neon, and futuristic. The website looks like a hacker or cyber-themed dashboard.

---

## 2. Main purpose of the project

This project is mostly a front-end website with:

- interactive pages
- a search system
- link saving and filtering
- admin-like login simulation
- browser storage for saved data
- remote storage using JSONBin API

It is created to act like a resource hub where users can browse and add useful links.

---

## 3. Project structure

Here is the basic structure:

- `index.html` — main home page
- `script.js` — all logic and behavior
- `video.html` — video gallery and player
- `me/` — OS category pages like Windows, Linux, Apple, Android
- `logo/` — logo assets
- `video-file/` — video files or media content
- `dark_net_project_documentation.md` — project explanation
- `CNAME` — custom domain name

---

## 4. File-by-file explanation

### `index.html`

This is the main landing page. It includes:

- top navigation bar
- neon cyberpunk design
- quick access buttons
- search area
- category cards
- profile modal
- donation modal
- link list section

This page is the main dashboard of the site.

### `script.js`

This is the brain of the project.

It handles:

- public user registration in browser storage
- login system simulation
- reading and saving link data
- searching and filtering links
- rendering cards on the page
- admin actions
- Firebase authentication setup
- JSONBin API integration

This is the most important file for functionality.

### `video.html`

This page shows a collection of video items.

Features:

- category filters
- video cards
- hover effects
- modal video player
- video titles and metadata

This is basically a media hub.

### `me/` folder

This folder contains OS-specific pages:

- `windows.html` — Windows software links
- `linux.html` — Linux tools and software
- `apple.html` — Apple/macOS software links
- `android.html` — Android-related apps or tools
- `appleiso.html` — Apple ISO or installer related content

These files are separate pages for software categories.

---

## 5. Core features of the website

### a) Search and filter

The website lets users search items by title or keyword.

The logic filters links and displays matching results only.

### b) Add new link

Users can submit a new link with data such as:

- title
- URL
- category
- description

This data is saved to local storage or synced to the remote database.

### c) Public registration system

The app creates a guest/public ID in local storage automatically. This helps track the user session.

### d) Admin status

The project includes a mock admin flow using Firebase authentication.

Although it looks like a real login system, it is still a front-end prototype.

### e) Donation popup

There is a modal for bKash or donation details. This is only for UI purposes and style.

### f) JSONBin integration

The project uses JSONBin API to store data remotely.

This means the app can send saved links to a cloud database.

---

## 6. Important JavaScript behavior

Here is a simple explanation of the main logic in `script.js`:

### `initPublicSession()`

This function creates or loads the public guest ID. It stores it in `localStorage`.

### `escapeHTML(str)`

This protects the page from HTML injection by converting dangerous characters.

### `showNotification(message, type)`

This creates a toast message on the screen to show success or info alerts.

### `fetchLinksFromJSONBin()`

This reads data from the JSONBin server.

### `syncToJSONBin(updatedLinksList)`

This sends the updated link list to the remote database.

### `getFilteredData()`

This filters the link list based on the current search input.

### `renderLinksList(records)`

This shows the final list in the browser as cards or rows.

### `addNewLink()`

This collects all input from the form and adds a new item to the list.

### `removeLinkItem(id)`

This deletes a link from the saved list.

### `updateAdminUIStatus()`

This updates the UI depending on whether the user is admin or public mode.

---

## 7. How the app stores data

The project uses two store systems:

| Storage | Purpose |
| :--- | :--- |
| `localStorage` | saves user session and cached data locally in browser |
| JSONBin API | stores shared/public link records remotely |

This hybrid approach makes the app more flexible.

---

## 8. How to open the project

### Option 1: Open directly in browser

1. Open the project folder.
2. Double-click `index.html`.
3. The website should open in your browser.

### Option 2: Use a local web server

You can also run a simple local server from the folder:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

---

## 9. How to use the website

1. Open the homepage.
2. Browse the main dashboard and quick links.
3. Use the search box to find items.
4. Submit a new link if needed.
5. Open the profile modal for admin/public actions.
6. Visit the video pages to watch content.
7. Explore OS-specific software pages.

---

## 10. Good points of the project

- Modern cyberpunk design
- Works without a backend for basic functions
- Easy to modify
- Good beginner project for HTML, CSS, and JavaScript
- Good example of local storage and API usage

---

## 11. Weak points / security issues

This project is a front-end demo, so it has some limitations:

- API keys are exposed in the browser
- there is no server-side validation
- public data submission can be unsafe without sanitization
- admin login is not truly secure
- production use needs a proper backend

---

## 12. Recommended future improvements

To make this project stronger, the next upgrade should be:

1. Create a real backend with Node.js or Python.
2. Use a proper database like MongoDB, MySQL, or PostgreSQL.
3. Add login system with secure authentication.
4. Validate user input before saving.
5. Add admin dashboard for managing links and videos.
6. Add file upload support for media content.
7. Improve portfolio or CMS features.

---

## 13. Summary

The DARK-NET project is a stylish cyber-themed website that mixes:

- dashboard design
- link directory
- media gallery
- software catalog
- JavaScript logic
- browser/local storage
- cloud data syncing

It is a strong example of a front-end resource portal and a good learning project for web development beginners.

---

## 14. Final note

This project is visually attractive and functionally interesting, but it should be treated as a prototype.

If you want to turn it into a real professional website, the next step is to build a secure backend and database system.

---

If you want, I can also turn this into:

- a more professional README file
- a Bangla version
- a full developer guide with code comments
- a step-by-step coding explanation for each page and script
