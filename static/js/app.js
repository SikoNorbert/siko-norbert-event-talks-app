// App State
let releaseNotes = [];
let selectedUpdate = null;

// DOM Elements
const btnRefresh = document.getElementById('btn-refresh');
const feedMeta = document.getElementById('feed-meta');
const feedContainer = document.getElementById('feed-container');
const loadingState = document.getElementById('loading-state');
const errorState = document.getElementById('error-state');
const errorMessage = document.getElementById('error-message');
const btnRetry = document.getElementById('btn-retry');
const emptyState = document.getElementById('empty-state');

// Search & Filter Elements
const searchInput = document.getElementById('search-input');
const filterCheckboxes = document.querySelectorAll('.checkbox-group input');
const btnResetFilters = document.getElementById('btn-reset-filters');

// Floating Bar Elements
const floatingBar = document.getElementById('floating-bar');
const btnDeselect = document.getElementById('btn-deselect');
const btnComposeTweet = document.getElementById('btn-compose-tweet');

// Dialog Elements
const tweetDialog = document.getElementById('tweet-dialog');
const btnCloseDialog = document.getElementById('btn-close-dialog');
const btnCancelDialog = document.getElementById('btn-cancel-dialog');
const btnPublishTweet = document.getElementById('btn-publish-tweet');
const btnShortenTweet = document.getElementById('btn-shorten-tweet');
const tweetTextarea = document.getElementById('tweet-textarea');
const charCounter = document.getElementById('char-counter');
const previewType = document.getElementById('preview-type');
const previewDate = document.getElementById('preview-date');
const previewText = document.getElementById('preview-text');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    fetchReleaseNotes();
    setupEventListeners();
});

// Setup Event Listeners
function setupEventListeners() {
    btnRefresh.addEventListener('click', fetchReleaseNotes);
    btnRetry.addEventListener('click', fetchReleaseNotes);
    
    // Filters
    searchInput.addEventListener('input', filterFeed);
    filterCheckboxes.forEach(cb => cb.addEventListener('change', filterFeed));
    btnResetFilters.addEventListener('click', resetFilters);
    
    // Selection
    btnDeselect.addEventListener('click', deselectUpdate);
    btnComposeTweet.addEventListener('click', openComposer);
    
    // Dialog Actions
    btnCloseDialog.addEventListener('click', () => tweetDialog.close());
    btnCancelDialog.addEventListener('click', () => tweetDialog.close());
    btnShortenTweet.addEventListener('click', autoShortenTweet);
    tweetTextarea.addEventListener('input', updateCharCount);
    btnPublishTweet.addEventListener('click', publishTweet);
}

// Fetch notes from Flask API
async function fetchReleaseNotes() {
    document.body.classList.add('is-fetching');
    loadingState.classList.remove('hidden');
    feedContainer.classList.add('hidden');
    errorState.classList.add('hidden');
    emptyState.classList.add('hidden');
    deselectUpdate();

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
                        <div class="card-selector"></div>
                        <span class="badge ${badgeClass}">${update.type}</span>
                    </div>
                    ${entry.link ? `
                    <a href="${entry.link}" target="_blank" rel="noopener noreferrer" class="card-link" title="Open official release notes page" onclick="event.stopPropagation()">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M19 19H5V5H12V3H5C3.89 3 3 3.9 3 5V19C3 20.1 3.89 21 5 21H19C20.1 21 21 20.1 21 19V12H19V19ZM14 3V5H17.59L7.76 14.83L9.17 16.24L19 6.41V10H21V3H14Z" fill="currentColor"/>
                        </svg>
                    </a>
                    ` : ''}
                </header>
                <div class="card-body">
                    ${update.content}
                </div>
            `;
            
            // Add click listener for selection
            card.addEventListener('click', () => toggleCardSelection(card, update, entry.date, entry.link));
            
            dayGroup.appendChild(card);
        });
        
        feedContainer.appendChild(dayGroup);
    });
}

// Handle Selection
function toggleCardSelection(card, update, date, link) {
    const isAlreadySelected = card.classList.contains('selected');
    
    // Clear previous selection
    document.querySelectorAll('.update-card').forEach(c => c.classList.remove('selected'));
    selectedUpdate = null;
    
    if (!isAlreadySelected) {
        card.classList.add('selected');
        selectedUpdate = {
            id: card.dataset.id,
            type: update.type,
            date: date,
            link: link,
            rawHtml: update.content,
            text: stripHtml(update.content).trim()
        };
        
        showFloatingBar(true);
    } else {
        showFloatingBar(false);
    }
}

function deselectUpdate() {
    document.querySelectorAll('.update-card').forEach(c => c.classList.remove('selected'));
    selectedUpdate = null;
    showFloatingBar(false);
}

function showFloatingBar(show) {
    if (show) {
        floatingBar.classList.remove('hidden');
    } else {
        floatingBar.classList.add('hidden');
    }
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
            const cardType = card.dataset.type.toLowerCase();
            const cardDate = card.dataset.date.toLowerCase();
            const cardText = card.querySelector('.card-body').innerText.toLowerCase();
            
            // Match type checkbox
            // If the card type contains the badge name, or falls back to 'update'
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
            } else {
                card.classList.add('hidden');
                // Deselect if hidden
                if (selectedUpdate && selectedUpdate.id === card.dataset.id) {
                    deselectUpdate();
                }
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
}

// Reset Search & Filters
function resetFilters() {
    searchInput.value = '';
    filterCheckboxes.forEach(cb => cb.checked = true);
    filterFeed();
}

// Composer Dialog Opening
function openComposer() {
    if (!selectedUpdate) return;
    
    // Set preview details
    previewType.textContent = selectedUpdate.type;
    // Map preview tag classes
    previewType.className = 'preview-tag';
    const normType = selectedUpdate.type.toLowerCase();
    if (normType.includes('feature')) previewType.classList.add('badge-feature');
    else if (normType.includes('change')) previewType.classList.add('badge-change');
    else if (normType.includes('deprecat')) previewType.classList.add('badge-deprecated');
    else if (normType.includes('issue')) previewType.classList.add('badge-issue');
    else if (normType.includes('security')) previewType.classList.add('badge-security');
    else previewType.classList.add('badge-update');
    
    previewDate.textContent = selectedUpdate.date;
    previewText.textContent = selectedUpdate.text;
    
    // Build initial tweet text
    // Example: BigQuery Feature (July 01, 2026): You can now use pre-trained TimesFM models... #BigQuery #GoogleCloud https://docs.cloud.google.com/...
    const typeLabel = selectedUpdate.type;
    const dateLabel = selectedUpdate.date;
    const cleanText = selectedUpdate.text;
    const link = selectedUpdate.link;
    
    // Basic structure
    let initialTweet = `BigQuery ${typeLabel} (${dateLabel}): ${cleanText}`;
    const suffix = ` #BigQuery #GoogleCloud\n${link}`;
    
    // Fit check
    if ((initialTweet + suffix).length > 280) {
        // Truncate text part to fit
        const available = 280 - suffix.length - 4; // 4 for "..." and spacing
        if (available > 0) {
            initialTweet = `BigQuery ${typeLabel} (${dateLabel}): ${cleanText.substring(0, available)}...` + suffix;
        } else {
            initialTweet = `${cleanText.substring(0, 280 - link.length - 5)}...\n${link}`;
        }
    } else {
        initialTweet = initialTweet + suffix;
    }
    
    tweetTextarea.value = initialTweet;
    updateCharCount();
    
    tweetDialog.showModal();
}

// Character Counter
function updateCharCount() {
    const len = tweetTextarea.value.length;
    charCounter.textContent = `${len} / 280`;
    
    if (len > 280) {
        charCounter.classList.add('warning');
        btnPublishTweet.disabled = true;
        btnPublishTweet.style.opacity = '0.5';
        btnPublishTweet.style.cursor = 'not-allowed';
    } else {
        charCounter.classList.remove('warning');
        btnPublishTweet.disabled = false;
        btnPublishTweet.style.opacity = '1';
        btnPublishTweet.style.cursor = 'pointer';
    }
}

// Auto-Shorten Logic
function autoShortenTweet() {
    if (!selectedUpdate) return;
    
    const typeLabel = selectedUpdate.type;
    const dateLabel = selectedUpdate.date;
    const cleanText = selectedUpdate.text;
    const link = selectedUpdate.link;
    
    const suffix = ` #BigQuery #GoogleCloud\n${link}`;
    const prefix = `BigQuery ${typeLabel} (${dateLabel}): `;
    
    // Calculate how many characters we can spare for the text body
    const maxTextLen = 280 - prefix.length - suffix.length - 4; // 4 for '...' and spacing
    
    if (maxTextLen > 0) {
        // Truncate cleanText to fit
        const shortenedText = cleanText.substring(0, maxTextLen).trim();
        tweetTextarea.value = `${prefix}${shortenedText}...${suffix}`;
    } else {
        // Fallback: strip tags and do minimum
        const fallbackSuffix = `\n${link}`;
        tweetTextarea.value = `${cleanText.substring(0, 280 - fallbackSuffix.length - 3)}...${fallbackSuffix}`;
    }
    
    updateCharCount();
}

// Open Twitter intent to post the tweet
function publishTweet() {
    const text = tweetTextarea.value;
    if (text.length === 0 || text.length > 280) return;
    
    const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(intentUrl, '_blank', 'noopener,noreferrer');
    
    // Close modal and deselect
    tweetDialog.close();
    deselectUpdate();
}
