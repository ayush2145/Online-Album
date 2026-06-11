# 📸 Online Photo Album & Image Studio

A full-stack, responsive web application designed for organizing, searching, and professionally editing photos. Built with a modern **React (Vite)** frontend, an **Express** backend, and a lightweight **SQLite** database.

---

## ✨ Features

### 📁 Organization & Curation
* **Smart Albums:** Create, manage, and assign photos to custom albums with live cover photos and count badges.
* **Tagging System:** Add custom tags to your photos. Search, filter, and organize assets by descriptive tags (e.g. `#nature`, `#family`).
* **Favorites:** Quick one-click favoriting to curate your personal best shots.
* **Bulk Operations:** Select multiple photos to delete them permanently or assign them to an album in a single action.

### 🔍 Advanced Search & Navigation
* **Live Search:** Search instantly across titles, descriptions, and tags.
* **Immersive Lightbox:** Double-click or click any image to view it in high resolution.
* **Keyboard Shortcuts:** Use <kbd>←</kbd> and <kbd>→</kbd> arrow keys to navigate the lightbox slideshow, and <kbd>Esc</kbd> to close.

### 🎨 Integrated Image Studio (Photo Editor)
No external tools needed! Edit your photos directly in-browser using the built-in studio:
* **Sliders & Adjustments:** Fine-tune brightness, contrast, saturation, and blur.
* **Creative Presets:** Apply instant filters including Black & White (Grayscale), Sepia, Vintage, Warm Sun, Cool Slate, and Invert.
* **Canvas Transforms:** Rotate image by 90° intervals, flip horizontally, or flip vertically.
* **Cropping Tool:** Crop with a precision overlay. Support for **Free/Custom** crop or preset aspects (**1:1 Square**, **4:3 Photo**, **16:9 Widescreen**).
* **Save Controls:** Overwrite original image or save as a new edited copy.

### ⚙️ Under-the-Hood Specs
* **EXIF Metadata Extractor:** Automatically parses camera model, exposure time, aperture (F-number), ISO, and original capture date for uploaded JPEGs.
* **Concurrent Execution:** Run both backend and frontend development environments with a single command.

---

## 🛠️ Tech Stack

### Frontend
* **React 19** & **Vite 8**
* **Lucide React** (icons)
* **HTML5 Canvas API** (high-performance client-side image editing)
* Custom CSS variables for modern styling, transitions, and dark themes

### Backend
* **Node.js** & **Express**
* **SQLite 3** (local relation storage)
* **Multer** (image uploads handling)
* **exif-parser** (JPEG metadata extraction)
* **Concurrently** & **Nodemon** (developer experience tools)

---

## 📂 Project Structure

```text
ONLINE ALBUM/
├── public/                 # Static assets
├── server/
│   ├── uploads/            # Uploaded photos folder (gitignored)
│   ├── db.js               # SQLite database setup and wrapper
│   ├── index.js            # Express API server & routes
│   └── photos.db           # SQLite database file (gitignored)
├── src/
│   ├── components/         # React components (Sidebar, PhotoGrid, PhotoEditor, etc.)
│   ├── App.jsx             # Main Application hub
│   ├── App.css             # Main styling configuration
│   ├── index.css           # Global variables and resets
│   └── main.jsx            # React mounting point
├── package.json            # Configuration and script manager
├── vite.config.js          # Vite configuration
└── README.md               # You are here!
```

---

## 🚀 Getting Started

Follow these steps to run the project locally on your machine:

### 1. Prerequisites
Ensure you have [Node.js](https://nodejs.org/) installed (v18+ recommended).

### 2. Installation
Clone this repository and install all dependencies:
```bash
# Go to project root directory
npm install
```

### 3. Run the App
Launch both the frontend and backend servers concurrently:
```bash
npm run dev
```

* The **Frontend** development server will run at: [http://localhost:5173](http://localhost:5173) (or `http://localhost:5174` if port 5173 is occupied).
* The **Express API Server** will run at: `http://localhost:5000`.

---

## ⚙️ Scripts

Manage development and building via these scripts in the project root:

* `npm run dev` - Runs both front and back end development modes concurrently.
* `npm run dev:frontend` - Runs Vite frontend only.
* `npm run dev:backend` - Runs nodemon backend server only.
* `npm run build` - Builds optimized frontend production bundle inside `/dist`.
* `npm run lint` - Runs ESLint code-quality checks.
