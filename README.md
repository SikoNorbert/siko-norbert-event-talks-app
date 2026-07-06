# 🌌 BigQuery Release Notes Broadcaster

An elegant, glassmorphic single-page web application built with **Flask** and **Vanilla Javascript/CSS** to monitor Google Cloud BigQuery release notes.

---

## ✨ Features

- **Automated Feed Integration**: Retrieves the official Google Cloud BigQuery RSS/Atom feed dynamically on launch or refresh.
- **Granular Update Classification**: Parses feed contents and groups updates into distinct categories:
  - 🌟 `Feature`
  - 🔧 `Change`
  - ⚠️ `Deprecated`
  - 🐛 `Known Issue`
  - 🛡️ `Security`
  - 🔄 `General Update`
- **Real-time Search & Filters**: Filter updates dynamically with live text search or select specific categories to narrow your focus.
- **Copy to Clipboard**: Click the copy icon on any release note card to copy formatted text with immediate visual feedback (success icon transition).
- **Export to CSV**: Download a CSV spreadsheet containing all currently active, filtered release notes including date, type, content, and source link.
- **Theme Toggle**: Swap between a dark and light mode instantly via the header toggle. Stores theme state in `localStorage` and detects default system-level color preferences.
- **Search Highlighting**: Dynamically highlights matching query text terms inside the release logs text nodes.
- **Dynamic Badge Counts**: Real-time counters next to category filters indicating the number of available entries matching current text searches.
- **Improved Empty State Recovery**: A direct reset button inside the empty state screen restores full list view immediately.
- **Premium Aesthetics**: Features a modern space-themed glassmorphism interface with custom typography (Outfit & Inter), smooth micro-interactions, responsive grids, and glowing background orbs.


---

## 🛠️ Tech Stack

- **Backend**: Python 3.x, Flask 3.0.3, Requests 2.32.3
- **Frontend**: HTML5, Vanilla CSS3 (Custom variables, glassmorphism filters, grid layouts), Modern Vanilla Javascript (ES6+, async/await, HTML5 Dialog API)

---

## 📂 Project Structure

```text
├── app.py                 # Flask server, RSS feed fetcher and XML parser
├── requirements.txt       # Python dependencies (Flask, requests)
├── templates/
│   └── index.html         # Main dashboard layout, search sidebar, modal dialogs
└── static/
    ├── css/
    │   └── style.css      # Premium dark-theme glassmorphism stylesheet
    └── js/
        └── app.js         # State management, feed filtering, Twitter composer logic
```

---

## 🚀 Getting Started

### 1. Prerequisites
Make sure you have Python 3.8+ installed on your system.

### 2. Clone and Setup Environment
Navigate to the project root and create a Python virtual environment:

```bash
# Create a virtual environment
python3 -m venv venv

# Activate the virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate
```

### 3. Install Dependencies
Install the required packages listed in `requirements.txt`:

```bash
pip install -r requirements.txt
```

### 4. Start the Application
Run the Flask server:

```bash
python app.py
```

By default, the server runs on **`http://localhost:5001`** (port `5001` is selected to avoid conflicts with macOS Control Center/AirPlay on port `5000`).

---

## 💡 How It Works

1. **Fetching**: The backend (`app.py`) fetches release notes from Google Cloud Feeds, parses the XML, splits updates based on standard HTML headings (`<h3>`), and structures them into a clean JSON API endpoint (`/api/release-notes`).
2. **Filtering**: The frontend UI displays updates grouped by date. As you type in the search bar or toggle checkboxes, JavaScript dynamically filters the DOM elements.
3. **Sharing**:
   - Click on any update card. A floating action bar will slide up.
   - Click **Draft Tweet** to open the dialog.
   - If the text is too long, click **Auto-Shorten** to compress the summary.
   - Click **Share on X** to open a new tab containing the tweet draft ready to post.
