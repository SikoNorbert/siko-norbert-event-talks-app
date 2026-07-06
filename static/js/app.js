// App State
let releaseNotes = [];

// DOM Elements
const btnRefresh = document.getElementById('btn-refresh');
const btnExportCsv = document.getElementById('btn-export-csv');
const btnThemeToggle = document.getElementById('btn-theme-toggle');
const feedMeta = document.getElementById('feed-meta');
const feedContainer = document.getElementById('feed-container');
const loadingState = document.getElementById('loading-state');
const errorState = document.getElementById('error-state');
const errorMessage = document.getElementById('error-message');
const btnRetry = document.getElementById('btn-retry');
const emptyState = document.getElementById('empty-state');
const btnEmptyReset = document.getElementById('btn-empty-reset');

// Search & Filter Elements
const searchInput = document.getElementById('search-input');
const filterCheckboxes = document.querySelectorAll('.checkbox-group input');
const btnResetFilters = document.getElementById('btn-reset-filters');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    fetchReleaseNotes();
    setupEventListeners();
});

// Setup Event Listeners
function setupEventListeners() {
    btnRefresh.addEventListener('click', fetchReleaseNotes);
    btnRetry.addEventListener('click', fetchReleaseNotes);
    if (btnExportCsv) {
        btnExportCsv.addEventListener('click', exportToCSV);
    }
    if (btnThemeToggle) {
        btnThemeToggle.addEventListener('click', toggleTheme);
    }
    if (btnEmptyReset) {
        btnEmptyReset.addEventListener('click', resetFilters);
    }

    // Filters
    searchInput.addEventListener('input', filterFeed);
    filterCheckboxes.forEach(cb => cb.addEventListener('change', filterFeed));
    btnResetFilters.addEventListener('click', resetFilters);
}

// Fetch notes from Flask API
async function fetchReleaseNotes() {
    document.body.classList.add('is-fetching');
    loadingState.classList.remove('hidden');
    feedContainer.classList.add('hidden');
    errorState.classList.add('hidden');
    emptyState.classList.add('hidden');
    if (btnExportCsv) btnExportCsv.disabled = true;

    try {
        const response = await fetch('/api/release-notes');
        const data = await response.json();

        if (data.success) {
            releaseNotes = data.entries;

            // Format Last Updated Text
            if (data.updated) {
                const date = new Date(data.updated);
                const options = { year: 'numeric', month: 'long', day: 'numeric' };
                feedMeta.textContent = `Last feed update: ${date.toLocaleDateString(undefined, options)}`;
            } else {
                feedMeta.textContent = 'Last feed update: Unknown';
            }

            renderFeed(releaseNotes);
            updateFilterCounters();
            if (btnExportCsv) btnExportCsv.disabled = false;
        } else {
            showError(data.error || 'Server failed to process feed');
        }
    } catch (err) {
        showError('Network error connecting to Flask backend.');
        console.error(err);
    } finally {
        document.body.classList.remove('is-fetching');
        loadingState.classList.add('hidden');
    }
}

// Show Error Panel
function showError(msg) {
    errorMessage.textContent = msg;
    errorState.classList.remove('hidden');
    feedContainer.classList.add('hidden');
    if (btnExportCsv) btnExportCsv.disabled = true;
}

// Utility: Strip HTML tags to get clean text
function stripHtml(html) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return tempDiv.textContent || tempDiv.innerText || "";
}

// Render feed entries to the screen
function renderFeed(entries) {
    feedContainer.innerHTML = '';

    if (entries.length === 0) {
        emptyState.classList.remove('hidden');
        feedContainer.classList.add('hidden');
        return;
    }

    emptyState.classList.add('hidden');
    feedContainer.classList.remove('hidden');

    entries.forEach((entry, entryIndex) => {
        // Create Day Group
        const dayGroup = document.createElement('article');
        dayGroup.className = 'day-group';

        // Day Title Header
        const dayTitle = document.createElement('h3');
        dayTitle.className = 'day-title';
        dayTitle.textContent = entry.date;
        dayGroup.appendChild(dayTitle);

        // Render individual updates for this day
        entry.updates.forEach((update, updateIndex) => {
            const card = document.createElement('div');
            card.className = 'update-card glass-panel';
            card.dataset.date = entry.date;
            card.dataset.link = entry.link;
            card.dataset.type = update.type;

            // Generate a unique ID for selection tracking
            const updateId = `${entryIndex}-${updateIndex}`;
            card.dataset.id = updateId;

            // Build badge class based on type
            let badgeClass = 'badge-update';
            const normType = update.type.toLowerCase();
            if (normType.includes('feature')) badgeClass = 'badge-feature';
            else if (normType.includes('change')) badgeClass = 'badge-change';
            else if (normType.includes('deprecat')) badgeClass = 'badge-deprecated';
            else if (normType.includes('issue')) badgeClass = 'badge-issue';
            else if (normType.includes('security')) badgeClass = 'badge-security';

            card.innerHTML = `
                <header class="card-header">
                    <div class="card-header-left">
                        <span class="badge ${badgeClass}">${update.type}</span>
                    </div>
                    <div class="card-header-right">
                        <button class="card-action-btn copy-btn" title="Copy to Clipboard">
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M16 1H4C2.9 1 2 1.9 2 3V17H4V3H16V1ZM19 5H8C6.9 5 6 5.9 6 7V21C6 22.1 6.9 23 8 23H19C20.1 23 21 22.1 21 21V7C21 5.9 20.1 5 19 5ZM19 21H8V7H19V21Z" fill="currentColor"/>
                            </svg>
                        </button>
                        ${entry.link ? `
                        <a href="${entry.link}" target="_blank" rel="noopener noreferrer" class="card-link" title="Open official release notes page" onclick="event.stopPropagation()">
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M19 19H5V5H12V3H5C3.89 3 3 3.9 3 5V19C3 20.1 3.89 21 5 21H19C20.1 21 21 20.1 21 19V12H19V19ZM14 3V5H17.59L7.76 14.83L9.17 16.24L19 6.41V10H21V3H14Z" fill="currentColor"/>
                            </svg>
                        </a>` : ''}
                    </div>
                </header>
                <div class="card-body">
                    ${update.content}
                </div>
            `;

            // Save original HTML for search highlighting reset
            card._originalHtml = update.content;

            // Add copy button click listener
            const copyBtn = card.querySelector('.copy-btn');
            if (copyBtn) {
                copyBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    copyCardToClipboard(update, entry.date, copyBtn);
                });
            }

            dayGroup.appendChild(card);
        });

        feedContainer.appendChild(dayGroup);
    });
}

// Client Side Search and Filters
function filterFeed() {
    const query = searchInput.value.toLowerCase().trim();

    // Get active checkboxes
    const checkedTypes = Array.from(filterCheckboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value.toLowerCase());

    let visibleCardsCount = 0;

    // Filter each group
    document.querySelectorAll('.day-group').forEach(group => {
        let visibleCardsInGroup = 0;

        group.querySelectorAll('.update-card').forEach(card => {
            const cardBody = card.querySelector('.card-body');

            // Restore original HTML to remove previous highlighting
            if (card._originalHtml) {
                cardBody.innerHTML = card._originalHtml;
            }

            const cardType = card.dataset.type.toLowerCase();
            const cardDate = card.dataset.date.toLowerCase();
            const cardText = cardBody.textContent.toLowerCase();

            // Match type checkbox
            let matchesType = false;
            checkedTypes.forEach(t => {
                if (t === 'update' && cardType === 'update') matchesType = true;
                else if (cardType.includes(t)) matchesType = true;
            });

            // Match search text
            const matchesSearch = query === '' ||
                cardText.includes(query) ||
                cardType.includes(query) ||
                cardDate.includes(query);

            if (matchesType && matchesSearch) {
                card.classList.remove('hidden');
                visibleCardsInGroup++;
                visibleCardsCount++;

                // Highlight search matches
                if (query) {
                    highlightSearchQuery(cardBody, query);
                }
            } else {
                card.classList.add('hidden');
            }
        });

        // Hide entire group if no cards are visible
        if (visibleCardsInGroup > 0) {
            group.classList.remove('hidden');
        } else {
            group.classList.add('hidden');
        }
    });

    // Show empty state if no matching notes
    if (visibleCardsCount === 0 && releaseNotes.length > 0) {
        emptyState.classList.remove('hidden');
    } else if (releaseNotes.length > 0) {
        emptyState.classList.add('hidden');
    }

    // Enable/disable CSV export button based on matches count
    if (btnExportCsv) {
        btnExportCsv.disabled = (visibleCardsCount === 0);
    }

    // Update category badge counters dynamically
    updateFilterCounters();
}

// Reset Search & Filters
function resetFilters() {
    searchInput.value = '';
    filterCheckboxes.forEach(cb => cb.checked = true);
    filterFeed();
}

// Copy individual card details to clipboard
async function copyCardToClipboard(update, date, btn) {
    const textToCopy = `BigQuery ${update.type} (${date}): \n${stripHtml(update.content).trim()}`;
    try {
        await navigator.clipboard.writeText(textToCopy);

        // Visual feedback
        const origHtml = btn.innerHTML;
        btn.classList.add('copied');
        btn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="currentColor" />
            </svg>`;

        setTimeout(() => {
            btn.classList.remove('copied');
            btn.innerHTML = origHtml;
        }, 2000);
    } catch (err) {
        console.error('Failed to copy to clipboard', err);
    }
}

// Export filtered release notes to CSV
function exportToCSV() {
    if (releaseNotes.length === 0) return;

    const query = searchInput.value.toLowerCase().trim();
    const checkedTypes = Array.from(filterCheckboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value.toLowerCase());

    const filteredEntries = [];

    releaseNotes.forEach(entry => {
        const matchingUpdates = entry.updates.filter(update => {
            const cardType = update.type.toLowerCase();
            const cardText = stripHtml(update.content).toLowerCase();
            const cardDate = entry.date.toLowerCase();

            let matchesType = false;
            checkedTypes.forEach(t => {
                if (t === 'update' && cardType === 'update') matchesType = true;
                else if (cardType.includes(t)) matchesType = true;
            });

            const matchesSearch = query === '' ||
                cardText.includes(query) ||
                cardType.includes(query) ||
                cardDate.includes(query);

            return matchesType && matchesSearch;
        });

        if (matchingUpdates.length > 0) {
            matchingUpdates.forEach(update => {
                filteredEntries.push({
                    date: entry.date,
                    type: update.type,
                    content: stripHtml(update.content).trim(),
                    link: entry.link
                });
            });
        }
    });

    if (filteredEntries.length === 0) {
        alert('No release notes found to export matching current filters.');
        return;
    }

    // Generate CSV contents
    const csvRows = [];
    // CSV Header
    csvRows.push(['Date', 'Type', 'Content', 'Link'].map(h => `"${h.replace(/"/g, '""')}"`).join(','));

    // CSV Data Rows
    filteredEntries.forEach(row => {
        const values = [
            row.date,
            row.type,
            row.content,
            row.link
        ];
        csvRows.push(values.map(val => `"${(val || '').replace(/"/g, '""')}"`).join(','));
    });

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `bigquery_release_notes_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();

    // Clean up
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// Theme Toggle
function toggleTheme() {
    const isLightMode = document.body.classList.toggle('light-mode');
    localStorage.setItem('theme', isLightMode ? 'light' : 'dark');
    updateThemeIcon();
}

function updateThemeIcon() {
    const isLightMode = document.body.classList.contains('light-mode');
    const sunIcon = document.querySelector('.theme-icon-sun');
    const moonIcon = document.querySelector('.theme-icon-moon');

    if (!sunIcon || !moonIcon) return;

    if (isLightMode) {
        sunIcon.classList.add('hidden');
        moonIcon.classList.remove('hidden');
    } else {
        sunIcon.classList.remove('hidden');
        moonIcon.classList.add('hidden');
    }
}

// Initial theme setup
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;

    if (savedTheme === 'light' || (!savedTheme && prefersLight)) {
        document.body.classList.add('light-mode');
    } else {
        document.body.classList.remove('light-mode');
    }
    updateThemeIcon();
}

// Highlight search terms inside text nodes of an element (preserving tag nodes)
function highlightSearchQuery(element, query) {
    if (!query) return;
    const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');

    const walk = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
    const textNodes = [];

    while (walk.nextNode()) {
        const node = walk.currentNode;
        if (node.nodeValue.trim().length > 0 && node.nodeValue.match(regex)) {
            textNodes.push(node);
        }
    }

    textNodes.forEach(node => {
        const fragment = document.createDocumentFragment();
        const parts = node.nodeValue.split(regex);

        parts.forEach(part => {
            if (part.match(regex)) {
                const mark = document.createElement('mark');
                mark.className = 'search-highlight';
                mark.textContent = part;
                fragment.appendChild(mark);
            } else {
                fragment.appendChild(document.createTextNode(part));
            }
        });

        node.parentNode.replaceChild(fragment, node);
    });
}

// Escape regular expression special characters
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Update filter checklist badge counts based on active text search matching
function updateFilterCounters() {
    const query = searchInput.value.toLowerCase().trim();

    const counts = {
        'feature': 0,
        'change': 0,
        'deprecated': 0,
        'known issue': 0,
        'security': 0,
        'update': 0
    };

    releaseNotes.forEach(entry => {
        entry.updates.forEach(update => {
            const cardType = update.type.toLowerCase();
            const cardText = stripHtml(update.content).toLowerCase();
            const cardDate = entry.date.toLowerCase();

            const matchesSearch = query === '' ||
                cardText.includes(query) ||
                cardType.includes(query) ||
                cardDate.includes(query);

            if (matchesSearch) {
                let matched = false;
                for (const type in counts) {
                    if (cardType.includes(type)) {
                        counts[type]++;
                        matched = true;
                        break;
                    }
                }
                if (!matched) {
                    counts['update']++;
                }
            }
        });
    });

    document.querySelectorAll('.filter-count').forEach(span => {
        const type = span.dataset.type;
        const count = counts[type] || 0;
        span.textContent = `(${count})`;
    });
}