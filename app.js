// ===== OPTCG Card Translator App =====
const API_BASE = "https://optcgapi.com/api";

// State
let cardDb = {};
let allCards = [];
let filteredCards = [];
let favorites = JSON.parse(localStorage.getItem("optcg_favorites") || "[]");
let savedDecks = JSON.parse(localStorage.getItem("optcg_saved_decks") || "[]");
let currentDeckId = null;
let currentView = "search";
let deckLeaderColor = null; // Destenin lider rengi

// ===== BANNED / RESTRICTED CARDS =====
const BANNED_CARDS = []; // Åu an tamamen banlÄ± kart yok
const RESTRICTED_CARDS = []; // Åu an restricted kart yok
const BANNED_PAIRS = [
    { a: "OP07-115", b: "EB04-058" } // Banned Pair: Bu iki kart aynÄ± destede bulunamaz
];
const MAX_DECK_SIZE = 51; // 1 Lider + 50 kart
let currentViewMode = "grid";
let setsLoaded = false;
let allSets = [];
let searchTimeout = null;
let cardsLoading = true;
let currentModalCard = null;

// ===== DOM Elements =====
const searchInput = document.getElementById("searchInput");
const searchClearBtn = document.getElementById("searchClearBtn");
const colorFilter = document.getElementById("colorFilter");
const typeFilter = document.getElementById("typeFilter");
const setFilter = document.getElementById("setFilter");
const cardsGrid = document.getElementById("cardsGrid");
const loadingSpinner = document.getElementById("loadingSpinner");
const emptyState = document.getElementById("emptyState");
const resultsHeader = document.getElementById("resultsHeader");
const resultsCount = document.getElementById("resultsCount");
const totalCardsCount = document.getElementById("totalCardsCount");
const cardModal = document.getElementById("cardModal");
const modalClose = document.getElementById("modalClose");

// ===== INIT =====
document.addEventListener("DOMContentLoaded", async () => {
    setupNavigation();
    setupSearch();
    setupModal();
    setupViewToggle();
    setupGuide();
    setupDeck();
    setupBackButton();

    await loadDatabase();
    loadSets();
});

async function loadDatabase() {
    showLoading(true);
    try {
        const response = await fetch('cards_tr.json');
        const data = await response.json();
        cardDb = data.cards;
        allCards = Object.values(cardDb);
        updateTotalCount(allCards.length);
        console.log(`âœ… VeritabanÄ± yÃ¼klendi: ${allCards.length} kart`);
    } catch (e) {
        console.error("âŒ VeritabanÄ± yÃ¼klenemedi:", e);
        showToast("âš ï¸ VeritabanÄ± yÃ¼klenemedi. Ä°nternet Ã¼zerinden devam ediliyor...");
    }
    showLoading(false);
    cardsLoading = false;
}

// ===== NAVIGATION (Updated) =====
function setupNavigation() {
    document.querySelectorAll(".nav-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const view = btn.dataset.view;
            if (view) switchView(view);
        });
    });
}

function switchView(view, saveHistory = true) {
    currentView = view;
    document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
    document.querySelector(`[data-view="${view}"]`).classList.add("active");
    document.querySelectorAll(".view-section").forEach(s => s.classList.remove("active"));
    document.getElementById(`${view}View`).classList.add("active");

    if (view === "sets" && !setsLoaded) {
        loadSetsView();
    }
    if (view === "favorites") {
        renderFavorites();
    }
}

// ===== SETS =====
async function loadSets() {
    try {
        const [setsRes, stsRes] = await Promise.all([
            fetch(`${API_BASE}/allSets/`),
            fetch(`${API_BASE}/allDecks/`)
        ]);
        const sets = await setsRes.json();
        const sts = await stsRes.json();
        allSets = [...sets, ...sts.map(s => ({ set_name: s.deck_name || s.set_name, set_id: s.set_id || s.set_id }))];

        // Populate set filter dropdown
        allSets.forEach(s => {
            const opt = document.createElement("option");
            opt.value = s.set_id;
            opt.textContent = `${s.set_id} â€” ${s.set_name}`;
            setFilter.appendChild(opt);
        });
    } catch (e) {
        console.error("Sets yÃ¼klenemedi:", e);
    }
}

async function loadSetsView() {
    const setsGrid = document.getElementById("setsGrid");
    try {
        const setMap = new Map();
        for (const card of allCards) {
            const idPrefix = (card.id || "").match(/^([A-Z]+\d+)/i);
            if (idPrefix) {
                const prefix = idPrefix[1].toUpperCase();
                if (!setMap.has(prefix)) {
                    setMap.set(prefix, { id: prefix, name: card.set_name || prefix, count: 0 });
                }
                setMap.get(prefix).count++;
            }
        }
        const sortedSets = Array.from(setMap.values()).sort((a, b) => {
            const aType = a.id.replace(/\d+/g, '');
            const bType = b.id.replace(/\d+/g, '');
            const aNum = parseInt(a.id.replace(/\D+/g, '')) || 0;
            const bNum = parseInt(b.id.replace(/\D+/g, '')) || 0;
            const typeOrder = { OP: 0, ST: 1, EB: 2, PRB: 3 };
            const aOrder = typeOrder[aType] ?? 4;
            const bOrder = typeOrder[bType] ?? 4;
            if (aOrder !== bOrder) return aOrder - bOrder;
            return bNum - aNum;
        });
        const groups = {};
        const groupNames = { OP: "Booster Setler", ST: "Starter Desteler", EB: "Extra Booster", PRB: "Premium Booster" };
        for (const set of sortedSets) {
            const type = set.id.replace(/\d+/g, '');
            const groupKey = groupNames[type] ? type : "OTHER";
            if (!groups[groupKey]) groups[groupKey] = [];
            groups[groupKey].push(set);
        }
        let html = '';
        for (const [key, sets] of Object.entries(groups)) {
            const groupName = groupNames[key] || "DiÄŸer";
            html += `<div class="sets-group-title">${groupName}</div>`;
            html += sets.map(s => `
                <div class="set-card" onclick="loadSetCardsByPrefix('${s.id}')">
                    <div class="set-card-id">${s.id}</div>
                    <div class="set-card-name">${s.name}</div>
                    <div class="set-card-count">${s.count} kart</div>
                    <div class="set-card-arrow">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="9 18 15 12 9 6"/>
                        </svg>
                    </div>
                </div>
            `).join("");
        }
        setsGrid.innerHTML = html;
        setsLoaded = true;
    } catch (e) {
        setsGrid.innerHTML = `<p style="color:var(--text-muted);">Setler yÃ¼klenemedi.</p>`;
    }
}

function loadSetCardsByPrefix(prefix) {
    switchView("search");
    searchInput.value = "";
    setFilter.value = "";
    colorFilter.value = "";
    typeFilter.value = "";
    const results = allCards.filter(c => c.id && c.id.toUpperCase().startsWith(prefix));
    filteredCards = results;
    renderCards(results);
    resultsCount.textContent = `${results.length} kart bulundu`;
    resultsHeader.style.display = results.length > 0 ? "flex" : "none";
    emptyState.style.display = results.length === 0 ? "block" : "none";
    showToast(`ğŸ“¦ ${prefix} seti yÃ¼klendi (${results.length} kart)`);
}

async function loadSetCards(setId, setName) {
    switchView("search");
    searchInput.value = "";
    setFilter.value = setId;
    colorFilter.value = "";
    typeFilter.value = "";

    searchCards("", setId);
    showToast(`ğŸ“¦ ${setName} seti yÃ¼klendi`);
}

// ===== SEARCH =====
function setupSearch() {
    searchInput.addEventListener("input", () => {
        searchClearBtn.style.display = searchInput.value ? "flex" : "none";
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            searchCards(searchInput.value);
        }, 300);
    });

    searchInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            clearTimeout(searchTimeout);
            searchCards(searchInput.value);
        }
    });

    searchClearBtn.addEventListener("click", () => {
        searchInput.value = "";
        searchClearBtn.style.display = "none";
        cardsGrid.innerHTML = "";
        resultsHeader.style.display = "none";
        emptyState.style.display = "block";
        filteredCards = [];
    });

    [colorFilter, typeFilter, setFilter].forEach(el => {
        el.addEventListener("change", () => {
            searchCards(searchInput.value);
        });
    });
}

function searchCards(query, forceSetId = null) {
    const q = query.trim().toLowerCase();
    const selectedSet = forceSetId || setFilter.value;
    const selectedColor = colorFilter.value;
    const selectedType = typeFilter.value;

    if (!q && !selectedSet && !selectedColor && !selectedType) {
        cardsGrid.innerHTML = "";
        resultsHeader.style.display = "none";
        emptyState.style.display = "block";
        return;
    }

    showLoading(true);
    emptyState.style.display = "none";

    // Filter local database
    let results = allCards;

    if (q) {
        results = results.filter(c =>
            c.id.toLowerCase().includes(q) ||
            c.name.toLowerCase().includes(q) ||
            (c.sub_types && c.sub_types.toLowerCase().includes(q))
        );
    }

    if (selectedSet) {
        results = results.filter(c => c.set_id === selectedSet || c.id.startsWith(selectedSet));
    }

    if (selectedColor) {
        results = results.filter(c => c.color && c.color.includes(selectedColor));
    }

    if (selectedType) {
        results = results.filter(c => c.type === selectedType);
    }

    filteredCards = results;
    renderCards(results);

    resultsCount.textContent = `${results.length} kart bulundu`;
    resultsHeader.style.display = results.length > 0 ? "flex" : "none";
    emptyState.style.display = results.length === 0 ? "block" : "none";

    if (results.length === 0) {
        emptyState.querySelector("h3").textContent = "SonuÃ§ bulunamadÄ±";
        emptyState.querySelector("p").textContent = "FarklÄ± bir arama terimi veya filtre deneyin";
    }

    showLoading(false);
}

function renderCards(cards) {
    cardsGrid.className = `cards-grid${currentViewMode === "list" ? " list-view" : ""}`;
    cardsGrid.innerHTML = cards.slice(0, 100).map((card, i) => {
        const isFav = favorites.includes(card.id);
        return `
        <div class="card-item" style="animation-delay: ${Math.min(i * 30, 600)}ms" 
             onclick="openCardModal('${card.id}')">
            <div class="card-image-wrapper">
                <div class="card-color-bar ${card.color || ''}"></div>
                <img src="${card.image || `https://optcgapi.com/media/static/Card_Images/${card.id}.jpg`}" 
                     alt="${card.name}" loading="lazy"
                     onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 250 350%22><rect fill=%22%2316161f%22 width=%22250%22 height=%22350%22/><text fill=%22%23555%22 font-size=%2214%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22>GÃ¶rsel Yok</text></svg>'">
                <button class="card-favorite-btn ${isFav ? 'favorited' : ''}" 
                        onclick="event.stopPropagation();toggleFavorite('${card.id}', this)">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                    </svg>
                </button>
            </div>
            <div class="card-info-section">
                <div class="card-info-id">${card.id}</div>
                <div class="card-info-name">${card.name || "?"}</div>
                <div class="card-info-meta">
                    <span class="meta-tag">${card.color_tr || card.color}</span>
                    <span class="meta-tag">${card.type_tr || card.type}</span>
                    ${card.power ? `<span class="meta-tag">âš¡${card.power}</span>` : ""}
                </div>
            </div>
        </div>`;
    }).join("");
}

// ===== MODAL =====
function setupModal() {
    modalClose.addEventListener("click", closeModal);
    cardModal.addEventListener("click", (e) => {
        if (e.target === cardModal) closeModal();
    });
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeModal();
    });
    
    const modalAiAnalyzeBtn = document.getElementById("modalAiAnalyzeBtn");
    if (modalAiAnalyzeBtn) {
        modalAiAnalyzeBtn.addEventListener("click", () => {
            if (!currentModalCard) return;
            
            const cardName = currentModalCard.name || currentModalCard.card_name || "Bu kart";
            const cardId = currentModalCard.id || currentModalCard.card_set_id || "";
            
            closeModal();
            
            const aiChatWindow = document.getElementById("aiChatWindow");
            if (aiChatWindow && !aiChatWindow.classList.contains("active")) {
                document.getElementById("aiChatBtn").click();
            }
            
            const chatInput = document.getElementById("aiChatInput");
            if (chatInput) {
                chatInput.value = `[${cardId}] ${cardName} kartı nasıl oynanır, ne işe yarar ve hangi kartlarla kombo yapılabilir?`;
                document.getElementById("aiChatSend").click();
            }
        });
    }
}

async function openCardModal(cardId) {
    let card = cardDb[cardId];

    // Fallback if not in local DB
    if (!card) {
        try {
            const res = await fetch(`${API_BASE}/sets/card/${cardId}/`);
            if (res.ok) {
                const data = await res.json();
                card = data[0];
            }
        } catch { }
    }

    if (!card) return;
    currentModalCard = card;

    // Fill modal
    document.getElementById("modalCardImage").src = card.image || card.card_image || `https://optcgapi.com/media/static/Card_Images/${card.id}.jpg`;
    document.getElementById("modalCardId").textContent = card.id || card.card_set_id;
    document.getElementById("modalRarity").textContent = card.rarity_tr || card.rarity;
    document.getElementById("modalCardName").textContent = card.name || card.card_name || "â€”";

    // Color
    const colorVal = document.getElementById("modalColor");
    const colorStr = card.color || card.card_color;
    colorVal.textContent = card.color_tr || colorStr;
    colorVal.style.color = getColorHex(colorStr);

    document.getElementById("modalType").textContent = card.type_tr || card.card_type;
    document.getElementById("modalCost").textContent = card.cost || card.card_cost || "â€”";
    document.getElementById("modalPower").textContent = card.power || card.card_power || "â€”";
    document.getElementById("modalCounter").textContent = card.counter || card.counter_amount || "â€”";
    document.getElementById("modalLife").textContent = card.life || "â€”";

    // Show/hide stats
    document.getElementById("modalCostStat").style.display = (card.cost || card.card_cost) ? "" : "none";
    document.getElementById("modalLifeStat").style.display = card.life ? "" : "none";
    document.getElementById("modalCounterStat").style.display = (card.counter || card.counter_amount) ? "" : "none";

    // Subtypes
    const subtypesContainer = document.getElementById("modalSubtypes");
    const subtypesTags = document.getElementById("modalSubtypesTags");
    const subTypes = card.sub_types_tr || card.sub_types;
    if (subTypes) {
        subtypesContainer.style.display = "block";
        const parts = Array.isArray(subTypes) ? subTypes : subTypes.split('/');
        subtypesTags.innerHTML = parts.map(t => `<span class="subtype-tag">${t.trim()}</span>`).join("");
    } else {
        subtypesContainer.style.display = "none";
    }

    // Effects
    const effectEn = document.getElementById("modalEffectEn");
    const effectTr = document.getElementById("modalEffectTr");
    const textEn = card.effect_en || card.card_text;
    const textTr = card.effect_tr;

    if (textEn) {
        document.getElementById("modalEffectOriginal").style.display = "block";
        document.getElementById("modalEffectTranslated").style.display = "block";
        document.querySelector(".effect-divider").style.display = "flex";
        effectEn.textContent = textEn;
        effectTr.textContent = textTr || textEn; // Fallback to EN if no TR
    } else {
        document.getElementById("modalEffectOriginal").style.display = "block";
        document.getElementById("modalEffectTranslated").style.display = "none";
        document.querySelector(".effect-divider").style.display = "none";
        effectEn.textContent = "Bu kartÄ±n efekti yok.";
    }

    // Set & Attribute
    document.getElementById("modalSetName").textContent = card.set_name || "â€”";
    document.getElementById("modalAttribute").textContent = card.attribute_tr || card.attribute;
    document.getElementById("modalAttribute").style.display = (card.attribute_tr || card.attribute) ? "" : "none";

    // Favorite button
    const favBtn = document.getElementById("modalFavBtn");
    const isFav = favorites.includes(card.id || card.card_set_id);
    favBtn.className = `favorite-btn modal-fav-btn ${isFav ? "favorited" : ""}`;
    favBtn.querySelector("svg").setAttribute("fill", isFav ? "currentColor" : "none");
    favBtn.onclick = () => toggleFavorite(card.id || card.card_set_id, favBtn);

    cardModal.classList.add("active"); history.pushState({modal: 'card'}, '', '');
    document.body.style.overflow = "hidden";
}

function closeModal() {
    cardModal.classList.remove("active");
    document.body.style.overflow = "";
    currentModalCard = null;
}

// ===== FAVORITES =====
function toggleFavorite(cardId, btn) {
    const idx = favorites.indexOf(cardId);
    if (idx > -1) {
        favorites.splice(idx, 1);
        if (btn) {
            btn.classList.remove("favorited");
            btn.querySelector("svg").setAttribute("fill", "none");
        }
        showToast("ğŸ’” Favorilerden Ã§Ä±karÄ±ldÄ±");
    } else {
        favorites.push(cardId);
        if (btn) {
            btn.classList.add("favorited");
            btn.querySelector("svg").setAttribute("fill", "currentColor");
        }
        showToast("â¤ï¸ Favorilere eklendi");
    }
    localStorage.setItem("optcg_favorites", JSON.stringify(favorites));
}

async function renderFavorites() {
    const grid = document.getElementById("favoritesGrid");
    const empty = document.getElementById("favoritesEmpty");

    if (favorites.length === 0) {
        grid.innerHTML = "";
        empty.style.display = "block";
        return;
    }
    empty.style.display = "none";

    const cards = favorites.map(id => cardDb[id]).filter(Boolean);

    filteredCards = cards;
    grid.className = "cards-grid";
    grid.innerHTML = cards.map((card, i) => `
        <div class="card-item" style="animation-delay: ${i * 30}ms" onclick="openCardModal('${card.id}')">
            <div class="card-image-wrapper">
                <div class="card-color-bar ${card.color || ''}"></div>
                <img src="${card.image || `https://optcgapi.com/media/static/Card_Images/${card.id}.jpg`}" 
                     alt="${card.name}" loading="lazy">
                <button class="card-favorite-btn favorited" onclick="event.stopPropagation();toggleFavorite('${card.id}', this);renderFavorites();">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                    </svg>
                </button>
            </div>
            <div class="card-info-section">
                <div class="card-info-id">${card.id}</div>
                <div class="card-info-name">${card.name || "?"}</div>
                <div class="card-info-meta">
                    <span class="meta-tag">${card.color_tr || card.color}</span>
                    <span class="meta-tag">${card.type_tr || card.type}</span>
                </div>
            </div>
        </div>
    `).join("");
}

// ===== VIEW TOGGLE =====
function setupViewToggle() {
    document.getElementById("gridViewBtn").addEventListener("click", () => {
        currentViewMode = "grid";
        document.getElementById("gridViewBtn").classList.add("active");
        document.getElementById("listViewBtn").classList.remove("active");
        if (filteredCards.length) renderCards(filteredCards);
    });
    document.getElementById("listViewBtn").addEventListener("click", () => {
        currentViewMode = "list";
        document.getElementById("listViewBtn").classList.add("active");
        document.getElementById("gridViewBtn").classList.remove("active");
        if (filteredCards.length) renderCards(filteredCards);
    });
}

// ===== UTILS =====
function showLoading(show) {
    loadingSpinner.style.display = show ? "block" : "none";
}

function updateTotalCount(count) {
    totalCardsCount.querySelector(".stat-number").textContent = count.toLocaleString("tr-TR");
}

function getColorHex(color) {
    const map = { Red: "#ef4444", Blue: "#3b82f6", Green: "#22c55e", Purple: "#a855f7", Black: "#888", Yellow: "#eab308" };
    return map[color] || "var(--text-primary)";
}

function showToast(message) {
    const container = document.getElementById("toastContainer");
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ===== DECK =====
function setupDeck() {
    const deckParseBtn = document.getElementById("deckParseBtn");
    const deckSaveBtn = document.getElementById("deckSaveBtn");
    const deckNewBtn = document.getElementById("deckNewBtn");

    if (deckParseBtn) deckParseBtn.addEventListener("click", parseDeck);
    if (deckSaveBtn) deckSaveBtn.addEventListener("click", saveDeck);
    if (deckNewBtn) deckNewBtn.addEventListener("click", newDeck);

    setupDeckAddSearch();
    renderSavedDecks();
}

function newDeck() {
    document.getElementById("deckNameInput").value = "";
    document.getElementById("deckInput").value = "";
    document.getElementById("deckGrid").innerHTML = "";
    document.getElementById("deckStats").style.display = "none";
    document.getElementById("deckEmpty").style.display = "block";
    currentDeckId = null;

    document.querySelectorAll(".saved-deck-item").forEach(item => item.classList.remove("active"));
}

function saveDeck() {
    const nameInput = document.getElementById("deckNameInput").value.trim();
    const contentInput = document.getElementById("deckInput").value.trim();

    if (!contentInput) {
        showToast("Kaydedilecek bir deste bulunmuyor.");
        return;
    }

    const deckName = nameInput || "Ä°simsiz Deste";

    if (currentDeckId) {
        const deckIndex = savedDecks.findIndex(d => d.id === currentDeckId);
        if (deckIndex > -1) {
            savedDecks[deckIndex].name = deckName;
            savedDecks[deckIndex].content = contentInput;
            savedDecks[deckIndex].updatedAt = new Date().toISOString();
        }
    } else {
        const newDeckObj = {
            id: 'deck_' + Date.now(),
            name: deckName,
            content: contentInput,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        savedDecks.unshift(newDeckObj);
        currentDeckId = newDeckObj.id;
    }

    localStorage.setItem("optcg_saved_decks", JSON.stringify(savedDecks));
    showToast(`"${deckName}" kaydedildi.`);
    renderSavedDecks();
    parseDeck();
}

function loadDeck(id) {
    const deck = savedDecks.find(d => d.id === id);
    if (!deck) return;

    currentDeckId = deck.id;
    document.getElementById("deckNameInput").value = deck.name;
    document.getElementById("deckInput").value = deck.content;

    renderSavedDecks();
    parseDeck();
}

function deleteDeck(id, event) {
    if (event) {
        event.stopPropagation();
    }

    if (!confirm("Bu desteyi silmek istediÄŸinize emin misiniz?")) return;

    savedDecks = savedDecks.filter(d => d.id !== id);
    localStorage.setItem("optcg_saved_decks", JSON.stringify(savedDecks));

    if (currentDeckId === id) {
        newDeck();
    }

    renderSavedDecks();
    showToast("Deste silindi.");
}

function renderSavedDecks() {
    const list = document.getElementById("savedDecksList");
    if (!list) return;

    if (savedDecks.length === 0) {
        list.innerHTML = `<div style="padding: 10px; color: var(--text-muted); font-size: 0.85rem; text-align: center;">HenÃ¼z kayÄ±tlÄ± deste yok.</div>`;
        return;
    }

    list.innerHTML = savedDecks.map(deck => {
        const date = new Date(deck.updatedAt || deck.createdAt).toLocaleDateString("tr-TR");
        const isActive = currentDeckId === deck.id ? "active" : "";
        return `
            <div class="saved-deck-item ${isActive}" onclick="loadDeck('${deck.id}')">
                <div class="saved-deck-info">
                    <span class="saved-deck-name">${deck.name}</span>
                    <span class="saved-deck-date">${date}</span>
                </div>
                <div class="saved-deck-actions">
                    <button class="saved-deck-delete" onclick="deleteDeck('${deck.id}', event)" title="Sil">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 6h18"></path>
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }).join("");
}

function parseDeck() {
    const deckInput = document.getElementById("deckInput");
    const deckGrid = document.getElementById("deckGrid");
    const deckEmpty = document.getElementById("deckEmpty");
    const deckStats = document.getElementById("deckStats");
    const deckTotalCards = document.getElementById("deckTotalCards");

    const text = deckInput.value.trim();
    if (!text) return;

    // Parse the lines
    const lines = text.split("\n");
    const deckCards = [];
    let totalCards = 0;

    for (let line of lines) {
        line = line.trim();
        if (!line) continue;

        // Try to match standard format: quantity [spaces] ID [spaces] Name
        // e.g., 4 OP15-061 Ohm
        // Or 1x OP15-058 Enel
        const match = line.match(/^(\d+)x?\s+([A-Z0-9]+-[0-9]+)\s*(.*)/i);
        if (match) {
            const quantity = parseInt(match[1]);
            const cardId = match[2].toUpperCase();
            const name = match[3];

            deckCards.push({
                quantity,
                cardId,
                name
            });
            totalCards += quantity;
        } else {
            // Check if it's just ID format like "OP15-061" without quantity
            const idMatch = line.match(/([A-Z0-9]+-[0-9]+)/i);
            if (idMatch) {
                deckCards.push({
                    quantity: 1,
                    cardId: idMatch[1].toUpperCase(),
                    name: ""
                });
                totalCards += 1;
            }
        }
    }

    if (deckCards.length === 0) {
        showToast("GeÃ§erli bir deste formatÄ± bulunamadÄ±.");
        return;
    }

    renderDeckCards(deckCards);
    deckTotalCards.textContent = totalCards;
    deckStats.style.display = "block";
    deckEmpty.style.display = "none";
}

function changeDeckCardQty(cardId, delta) {
    const deckInput = document.getElementById("deckInput");
    const text = deckInput.value.trim();

    // Validation for adding cards
    if (delta > 0) {
        const card = cardDb[cardId];
        if (card) {
            // Leader rules
            if (card.type === "Leader") {
                const existingLeader = getDeckLeaderId();
                if (existingLeader) {
                    showToast(`ğŸ‘‘ Destede zaten bir Lider var! Sadece 1 Lider eklenebilir.`);
                    return;
                }
            } else {
                // Non-leader card: leader must exist first
                if (!getDeckLeaderId()) {
                    showToast(`ğŸ‘‘ Ã–nce bir Lider seÃ§in! Lider seÃ§ilmeden kart eklenemez.`);
                    return;
                }
                // Max 4 copies check
                const currentQty = getCurrentDeckCardQty(cardId);
                if (currentQty >= 4) {
                    showToast(`âš ï¸ AynÄ± karttan en fazla 4 adet eklenebilir! (${card.name})`);
                    return;
                }
            }
            // Banned check
            if (BANNED_CARDS.includes(cardId)) {
                showToast(`ğŸš« Bu kart banlÄ±! ${card.name} turnuvalarda kullanÄ±lamaz.`);
                return;
            }
            // Color check
            const deckColors = getDeckLeaderColors();
            if (deckColors && card.type !== "Leader") {
                const cardColors = (card.color || "").split(/\s+/);
                const hasMatch = cardColors.some(c => deckColors.includes(c));
                if (!hasMatch && card.color) {
                    showToast(`ğŸ¨ Renk uyumsuz! ${card.color_tr || card.color} kart eklenemez.`);
                    return;
                }
            }
        }
        const totalCards = getCurrentDeckTotal();
        if (totalCards >= MAX_DECK_SIZE) {
            showToast(`âš ï¸ Deste limiti! Maksimum ${MAX_DECK_SIZE} kart (1 Lider + 50 kart) eklenebilir.`);
            return;
        }
    }

    if (!text && delta > 0) {
        deckInput.value = `1 ${cardId}`;
        parseDeck();
        return;
    }

    let lines = text.split("\n");
    let found = false;

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        if (!line) continue;

        // Match standard format: "4 OP15-061 Ohm"
        const match = line.match(/^(\d+)x?\s+([A-Z0-9]+-[0-9]+)\s*(.*)/i);
        if (match && match[2].toUpperCase() === cardId.toUpperCase()) {
            let qty = parseInt(match[1]) + delta;
            if (qty <= 0) {
                lines.splice(i, 1);
                i--; // adjust index after splice
            } else {
                lines[i] = `${qty} ${cardId} ${match[3]}`.trim();
            }
            found = true;
            break;
        } else {
            // Match ID only format: "OP15-061"
            const idMatch = line.match(/^([A-Z0-9]+-[0-9]+)$/i);
            if (idMatch && idMatch[1].toUpperCase() === cardId.toUpperCase()) {
                let qty = 1 + delta;
                if (qty <= 0) {
                    lines.splice(i, 1);
                    i--;
                } else {
                    const card = cardDb[cardId];
                    lines[i] = `${qty} ${cardId} ${card ? card.name : ''}`.trim();
                }
                found = true;
                break;
            }
        }
    }

    if (!found && delta > 0) {
        const card = cardDb[cardId];
        lines.push(`1 ${cardId} ${card ? card.name : ''}`.trim());
    }

    deckInput.value = lines.join("\n");
    parseDeck();

    // Auto save if an existing deck is loaded
    if (currentDeckId) {
        saveDeck();
    }
}

function setupDeckAddSearch() {
    const addInput = document.getElementById("deckAddInput");
    const resultsContainer = document.getElementById("deckAddResults");

    if (!addInput) return;

    let searchTimeout;

    addInput.addEventListener("input", () => {
        const q = addInput.value.trim().toLowerCase();

        clearTimeout(searchTimeout);
        if (!q) {
            resultsContainer.style.display = "none";
            return;
        }

        searchTimeout = setTimeout(() => {
            const results = allCards.filter(c =>
                c.id.toLowerCase().includes(q) ||
                c.name.toLowerCase().includes(q)
            ).slice(0, 10);

            if (results.length === 0) {
                resultsContainer.innerHTML = '<div style="padding: 10px; color: var(--text-muted); text-align: center;">Kart bulunamadÄ±</div>';
            } else {
                resultsContainer.innerHTML = results.map(c => `
                    <div class="deck-add-result-item" onclick="addCardToDeck('${c.id}')">
                        <img class="deck-add-result-img" src="${c.image || `https://optcgapi.com/media/static/Card_Images/${c.id}.jpg`}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 250 350%22><rect fill=%22%2316161f%22 width=%22250%22 height=%22350%22/></svg>'">
                        <div class="deck-add-result-info">
                            <span class="deck-add-result-name">${c.name}</span>
                            <span class="deck-add-result-id">${c.id}</span>
                        </div>
                    </div>
                `).join("");
            }
            resultsContainer.style.display = "block";
        }, 300);
    });

    // Hide results on outside click
    document.addEventListener("click", (e) => {
        if (!addInput.contains(e.target) && !resultsContainer.contains(e.target)) {
            resultsContainer.style.display = "none";
        }
    });
}

function addCardToDeck(cardId) {
    const card = cardDb[cardId];
    if (!card) {
        showToast("âŒ Kart veritabanÄ±nda bulunamadÄ±.");
        return;
    }

    // === LEADER RULES ===
    if (card.type === "Leader") {
        const existingLeader = getDeckLeaderId();
        if (existingLeader) {
            showToast(`ğŸ‘‘ Destede zaten bir Lider var! Sadece 1 Lider eklenebilir.`);
            return;
        }
    } else {
        // Non-leader: leader must be selected first
        if (!getDeckLeaderId()) {
            showToast(`ğŸ‘‘ Ã–nce bir Lider seÃ§in! Lider seÃ§ilmeden kart eklenemez.`);
            return;
        }
        // Max 4 copies
        const currentQty = getCurrentDeckCardQty(cardId);
        if (currentQty >= 4) {
            showToast(`âš ï¸ AynÄ± karttan en fazla 4 adet eklenebilir! (${card.name})`);
            return;
        }
    }

    // === BANNED CHECK ===
    if (BANNED_CARDS.includes(cardId)) {
        showToast(`ğŸš« Bu kart banlÄ±! ${card.name} (${cardId}) turnuvalarda kullanÄ±lamaz.`);
        return;
    }

    // === BANNED PAIR CHECK ===
    const currentDeckCardIds = getCurrentDeckCardIds();
    for (const pair of BANNED_PAIRS) {
        if (cardId === pair.a && currentDeckCardIds.includes(pair.b)) {
            const otherCard = cardDb[pair.b];
            showToast(`ğŸš« Banned Pair! ${card.name} ile ${otherCard ? otherCard.name : pair.b} aynÄ± destede bulunamaz.`);
            return;
        }
        if (cardId === pair.b && currentDeckCardIds.includes(pair.a)) {
            const otherCard = cardDb[pair.a];
            showToast(`ğŸš« Banned Pair! ${card.name} ile ${otherCard ? otherCard.name : pair.a} aynÄ± destede bulunamaz.`);
            return;
        }
    }

    // === 51 CARD LIMIT CHECK ===
    const totalCards = getCurrentDeckTotal();
    if (totalCards >= MAX_DECK_SIZE) {
        showToast(`âš ï¸ Deste limiti! Maksimum ${MAX_DECK_SIZE} kart (1 Lider + 50 kart) eklenebilir.`);
        return;
    }

    // === COLOR CHECK ===
    const deckColors = getDeckLeaderColors();
    if (deckColors && card.type !== "Leader") {
        const cardColor = card.color || "";
        const cardColors = cardColor.split(/\s+/);
        const hasMatchingColor = cardColors.some(c => deckColors.includes(c));
        if (!hasMatchingColor && cardColor) {
            showToast(`ğŸ¨ Renk uyumsuz! Bu kart (${card.color_tr || cardColor}) destenizin Lider rengiyle (${deckColors.join('/')}) uyuÅŸmuyor.`);
            return;
        }
    }

    changeDeckCardQty(cardId, 1);
    document.getElementById("deckAddInput").value = "";
    document.getElementById("deckAddResults").style.display = "none";
    showToast("âœ… Kart desteye eklendi");
}

// === DECK HELPER FUNCTIONS ===
function getCurrentDeckCardIds() {
    const text = (document.getElementById("deckInput").value || "").trim();
    if (!text) return [];
    const ids = [];
    for (let line of text.split("\n")) {
        line = line.trim();
        if (!line) continue;
        const match = line.match(/^(\d+)x?\s+([A-Z0-9]+-[0-9]+)/i);
        if (match) { ids.push(match[2].toUpperCase()); }
        else {
            const idMatch = line.match(/([A-Z0-9]+-[0-9]+)/i);
            if (idMatch) ids.push(idMatch[1].toUpperCase());
        }
    }
    return ids;
}

function getCurrentDeckTotal() {
    const text = (document.getElementById("deckInput").value || "").trim();
    if (!text) return 0;
    let total = 0;
    for (let line of text.split("\n")) {
        line = line.trim();
        if (!line) continue;
        const match = line.match(/^(\d+)x?\s+([A-Z0-9]+-[0-9]+)/i);
        if (match) { total += parseInt(match[1]); }
        else {
            const idMatch = line.match(/([A-Z0-9]+-[0-9]+)/i);
            if (idMatch) total += 1;
        }
    }
    return total;
}

function getDeckLeaderColors() {
    const leaderId = getDeckLeaderId();
    if (leaderId) {
        const card = cardDb[leaderId];
        if (card) return (card.color || "").split(/\s+/).filter(Boolean);
    }
    return null;
}

function getDeckLeaderId() {
    const ids = getCurrentDeckCardIds();
    for (const id of ids) {
        const card = cardDb[id];
        if (card && card.type === "Leader") return id;
    }
    return null;
}

function getCurrentDeckCardQty(cardId) {
    const text = (document.getElementById("deckInput").value || "").trim();
    if (!text) return 0;
    for (let line of text.split("\n")) {
        line = line.trim();
        if (!line) continue;
        const match = line.match(/^(\d+)x?\s+([A-Z0-9]+-[0-9]+)/i);
        if (match && match[2].toUpperCase() === cardId.toUpperCase()) {
            return parseInt(match[1]);
        }
        const idMatch = line.match(/^([A-Z0-9]+-[0-9]+)$/i);
        if (idMatch && idMatch[1].toUpperCase() === cardId.toUpperCase()) {
            return 1;
        }
    }
    return 0;
}

function renderDeckCards(deckCards) {
    const deckGrid = document.getElementById("deckGrid");

    deckGrid.innerHTML = deckCards.map((deckCard, i) => {
        const card = cardDb[deckCard.cardId] || { id: deckCard.cardId, name: deckCard.name };
        const isFav = favorites.includes(card.id);

        return `
        <div class="card-item deck-card-item" style="animation-delay: ${Math.min(i * 30, 600)}ms" 
             onclick="openCardModal('${card.id}')">
            <div class="deck-quantity-badge">
                <button class="deck-qty-btn" onclick="event.stopPropagation(); changeDeckCardQty('${card.id}', -1)">-</button>
                <span class="deck-qty-val">${deckCard.quantity}</span>
                <button class="deck-qty-btn" onclick="event.stopPropagation(); changeDeckCardQty('${card.id}', 1)">+</button>
            </div>
            <div class="card-image-wrapper">
                <div class="card-color-bar ${card.color || ''}"></div>
                <img src="${card.image || `https://optcgapi.com/media/static/Card_Images/${card.id}.jpg`}" 
                     alt="${card.name}" loading="lazy"
                     onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 250 350%22><rect fill=%22%2316161f%22 width=%22250%22 height=%22350%22/><text fill=%22%23555%22 font-size=%2214%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22>GÃ¶rsel Yok</text></svg>'">
                <button class="card-favorite-btn ${isFav ? 'favorited' : ''}" 
                        onclick="event.stopPropagation();toggleFavorite('${card.id}', this)">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                    </svg>
                </button>
            </div>
            <div class="card-info-section">
                <div class="card-info-id">${card.id}</div>
                <div class="card-info-name">${card.name || deckCard.name || "?"}</div>
                <div class="card-info-meta">
                    ${card.color_tr || card.color ? `<span class="meta-tag">${card.color_tr || card.color}</span>` : ""}
                    ${card.type_tr || card.type ? `<span class="meta-tag">${card.type_tr || card.type}</span>` : ""}
                </div>
            </div>
        </div>`;
    }).join("");
}

// ===== GUIDE (TUTORIAL) =====
const guideSteps = [
    {
        title: "1. HazÄ±rlÄ±k ve Desteler",
        desc: "Oyuna baÅŸlamak iÃ§in 1 Lider kartÄ±, tam 50 kartlÄ±k bir Ana Deste ve 10 kartlÄ±k bir DON!! destesine ihtiyacÄ±nÄ±z vardÄ±r. Her iki oyuncu da destesini karÄ±ÅŸtÄ±rÄ±r, Liderini alana koyar. ArdÄ±ndan desteden 5 kart Ã§ekilir. Ä°sterseniz bu 5 kartÄ± destenize geri karÄ±ÅŸtÄ±rÄ±p yeni bir 5 kart Ã§ekebilirsiniz (Mulligan). Son olarak Liderinizin can deÄŸeri kadar kartÄ± destenizin en Ã¼stÃ¼nden kapalÄ± ÅŸekilde 'Can AlanÄ±'na yerleÅŸtirirsiniz.",
        highlightZones: ["zone-leader", "zone-deck", "zone-don-deck", "zone-life"]
    },
    {
        title: "2. Oyun AlanÄ± (Playmat)",
        desc: "Oyun masasÄ± 6 ana bÃ¶lgeden oluÅŸur: Lider, Karakter AlanÄ± (en fazla 5 karakter), Can AlanÄ±, Deste & Ã‡Ã¶plÃ¼k, DON!! Destesi ve DON!! Maliyet AlanÄ± (oynadÄ±ÄŸÄ±nÄ±z DON'larÄ±n durduÄŸu yer). AyrÄ±ca Sahne (Stage) kartlarÄ± iÃ§in ayrÄ±lmÄ±ÅŸ Ã¶zel bir alan bulunur.",
        highlightZones: ["zone-character", "zone-leader", "zone-stage", "zone-deck", "zone-trash", "zone-don-deck", "zone-cost", "zone-life"]
    },
    {
        title: "3. Kart Tipleri",
        desc: "DÃ¶rt temel kart vardÄ±r: Lider (Oyunun kalbi), Karakterler (SaldÄ±rÄ±r ve savunur), Olaylar/Event (OynandÄ±ÄŸÄ± an etkisini gÃ¶sterip Ã§Ã¶pe gider) ve Sahneler/Stage (Alana kalÄ±cÄ± olarak yerleÅŸir). DON!! kartlarÄ± ise maliyetleri Ã¶demek ve karakterleri gÃ¼Ã§lendirmek iÃ§in kullanÄ±lan mananÄ±zdÄ±r.",
        highlightZones: []
    },
    {
        title: "4. Tur AÅŸamasÄ± 1: Refresh & Draw",
        desc: "SÄ±ranÄ±z baÅŸladÄ±ÄŸÄ±nda Ã¶ncelikle 'Refresh Phase' gerÃ§ekleÅŸir: Oyun alanÄ±nÄ±zda daha Ã¶nce kullandÄ±ÄŸÄ±nÄ±z iÃ§in yan Ã§evrilmiÅŸ (Rested) tÃ¼m Karakterlerinizi ve DON!! kartlarÄ±nÄ±zÄ± dÃ¼z (Active) pozisyona getirirsiniz. Karakterlere eklenmiÅŸ DON!! kartlarÄ± Maliyet alanÄ±na geri dÃ¶ner. ArdÄ±ndan 'Draw Phase' gelir ve destenizin en Ã¼stÃ¼nden 1 kart Ã§ekersiniz. (Oyuna ilk baÅŸlayan oyuncu ilk turunda kart Ã‡EKEMEZ).",
        highlightZones: ["zone-deck", "zone-cost", "zone-character"]
    },
    {
        title: "5. Tur AÅŸamasÄ± 2: DON!! Phase",
        desc: "Her tur DON!! destenizin en Ã¼stÃ¼nden 2 adet DON!! kartÄ± Ã§eker ve 'Maliyet AlanÄ±'na (Cost Area) dÃ¼z (Active) olarak koyarsÄ±nÄ±z. Bu sizin bÃ¼tÃ§enizdir. (Oyuna ilk baÅŸlayan oyuncu ilk turunda sadece 1 DON!! kartÄ± Ã§eker). Maksimum 10 DON!! kartÄ±na sahip olabilirsiniz.",
        highlightZones: ["zone-don-deck", "zone-cost"]
    },
    {
        title: "6. Ana AÅŸama (Main Phase)",
        desc: "Bu aÅŸamada aktif olan DON!! kartlarÄ±nÄ±zÄ± yan Ã§evirerek (Rested) bedelini Ã¶deyip elinizden Karakter, Olay veya Sahne kartÄ± oynayabilirsiniz. AyrÄ±ca DON!! kartlarÄ±nÄ± Liderinize veya Karakterlerinize ekleyerek onlara +1000 Power (GÃ¼Ã§) kazandÄ±rabilirsiniz.",
        highlightZones: ["zone-character", "zone-leader", "zone-cost"]
    },
    {
        title: "7. SavaÅŸ ve SaldÄ±rÄ±",
        desc: "SaldÄ±rmak iÃ§in dÃ¼z duran (Active) Liderinizi veya bir Karakterinizi yan Ã§evirirsiniz (Rested). Hedef olarak rakibin Liderini veya onun halihazÄ±rda 'Rested' pozisyonundaki bir Karakterini seÃ§ebilirsiniz. GÃ¼Ã§leri (Power) karÅŸÄ±laÅŸtÄ±rÄ±lÄ±r. SaldÄ±ranÄ±n gÃ¼cÃ¼ eÅŸit veya daha yÃ¼ksekse, saldÄ±rÄ± baÅŸarÄ±lÄ± olur.",
        highlightZones: ["zone-character", "zone-leader"]
    },
    {
        title: "8. Savunma (Counter ve Blocker)",
        desc: "SaldÄ±rÄ±ya uÄŸrayan taraf hasar almamak iÃ§in elindeki kartlarÄ± Ã§Ã¶pe atarak Ã¼zerlerinde yazan 'Counter' deÄŸeri kadar geÃ§ici gÃ¼Ã§ kazanabilir. AyrÄ±ca alanÄ±nda 'Blocker' Ã¶zelliÄŸi olan bir karakter varsa, onu yan Ã§evirip saldÄ±rÄ±yÄ± kendi Ã¼zerine Ã§ekebilir.",
        highlightZones: ["zone-character", "zone-trash"]
    },
    {
        title: "9. Hasar Alma ve Trigger",
        desc: "EÄŸer bir Lidere yapÄ±lan saldÄ±rÄ± baÅŸarÄ±lÄ± olursa, hasar alan lider Can AlanÄ±'ndaki kapalÄ± kartlarÄ±ndan en Ã¼sttekini eline alÄ±r. EÄŸer eline aldÄ±ÄŸÄ± kartÄ±n Ã¼zerinde [Trigger] (Tetikleyici) yazÄ±yorsa, kartÄ±n maliyetini Ã¶demeden o anlÄ±k etkisini anÄ±nda kullanabilir (Ã¶rneÄŸin rakip bir karakteri yok etme).",
        highlightZones: ["zone-leader", "zone-life"]
    },
    {
        title: "10. BitiÅŸ AÅŸamasÄ± ve Kazanma",
        desc: "Ana AÅŸamadaki hamleleriniz bittiÄŸinde 'SÄ±ram bitti' dersiniz ve sÄ±ra rakibe geÃ§er. Oyunu kazanmanÄ±n koÅŸulu ÅŸudur: Rakibinizin Can AlanÄ±'nda hiÃ§ kart kalmamÄ±ÅŸken (yani 0 canÄ± varken) Liderine baÅŸarÄ±lÄ± bir saldÄ±rÄ± daha yapmalÄ±sÄ±nÄ±z!",
        highlightZones: ["zone-life", "zone-leader"]
    }
];

let currentGuideStep = 0;
const guideModal = document.getElementById("guideModal");
const navGuide = document.getElementById("navGuide");
const guideModalClose = document.getElementById("guideModalClose");
const guidePrevBtn = document.getElementById("guidePrevBtn");
const guideNextBtn = document.getElementById("guideNextBtn");
const guideStepTitle = document.getElementById("guideStepTitle");
const guideStepDesc = document.getElementById("guideStepDesc");
const guideProgressContainer = document.getElementById("guideProgress");
const allZones = document.querySelectorAll(".zone");

let progressSteps = [];
let progressLines = [];

function setupGuide() {
    navGuide.addEventListener("click", openGuide);
    guideModalClose.addEventListener("click", closeGuide);
    guideNextBtn.addEventListener("click", nextGuideStep);
    guidePrevBtn.addEventListener("click", prevGuideStep);

    // Generate Progress Bar HTML dynamically
    if (guideProgressContainer) {
        guideProgressContainer.innerHTML = '';
        for (let i = 0; i < guideSteps.length; i++) {
            const stepDiv = document.createElement("div");
            stepDiv.className = "progress-step";
            stepDiv.textContent = i + 1;
            guideProgressContainer.appendChild(stepDiv);

            if (i < guideSteps.length - 1) {
                const lineDiv = document.createElement("div");
                lineDiv.className = "progress-line";
                guideProgressContainer.appendChild(lineDiv);
            }
        }
        progressSteps = document.querySelectorAll(".progress-step");
        progressLines = document.querySelectorAll(".progress-line");
    }

    // Check if first time
    if (!localStorage.getItem("optcg_guide_seen")) {
        setTimeout(() => {
            openGuide();
            localStorage.setItem("optcg_guide_seen", "true");
        }, 1000);
    }
}

function openGuide() {
    currentGuideStep = 0;
    updateGuideUI();
    guideModal.classList.add("active"); history.pushState({modal: 'guide'}, '', '');
    document.body.style.overflow = "hidden";
}

function closeGuide() {
    guideModal.classList.remove("active");
    document.body.style.overflow = "";
}

function nextGuideStep() {
    if (currentGuideStep < guideSteps.length - 1) {
        currentGuideStep++;
        updateGuideUI();
    } else {
        closeGuide();
    }
}

function prevGuideStep() {
    if (currentGuideStep > 0) {
        currentGuideStep--;
        updateGuideUI();
    }
}

function updateGuideUI() {
    const step = guideSteps[currentGuideStep];

    // Update Text
    guideStepTitle.textContent = step.title;
    guideStepDesc.textContent = step.desc;

    // Update Buttons
    guidePrevBtn.disabled = currentGuideStep === 0;
    if (currentGuideStep === guideSteps.length - 1) {
        guideNextBtn.textContent = "Rehberi Kapat";
        guideNextBtn.style.background = "var(--green)";
    } else {
        guideNextBtn.textContent = "Sonraki AdÄ±m";
        guideNextBtn.style.background = "var(--accent)";
    }

    // Update Progress Bar
    progressSteps.forEach((el, idx) => {
        if (idx < currentGuideStep) {
            el.className = "progress-step completed";
        } else if (idx === currentGuideStep) {
            el.className = "progress-step active";
        } else {
            el.className = "progress-step";
        }
    });

    progressLines.forEach((el, idx) => {
        if (idx < currentGuideStep) {
            el.className = "progress-line completed";
        } else {
            el.className = "progress-line";
        }
    });

    // Highlight Zones
    let firstHighlightedZone = null;
    allZones.forEach(zone => {
        if (step.highlightZones.includes(zone.id)) {
            zone.classList.add("highlight");
            if (!firstHighlightedZone) firstHighlightedZone = zone;
        } else {
            zone.classList.remove("highlight");
        }
    });

    // Auto-scroll to highlight on mobile
    if (firstHighlightedZone && window.innerWidth <= 768) {
        const container = document.querySelector(".playmat-container");
        const scrollX = firstHighlightedZone.offsetLeft - (container.offsetWidth / 2) + (firstHighlightedZone.offsetWidth / 2);
        container.scrollTo({
            left: scrollX,
            behavior: 'smooth'
        });
    }
}

function setupBackButton() {
    window.addEventListener('popstate', (event) => {
        if (cardModal && cardModal.classList.contains('active')) {
            closeModal(false);
        } else if (guideModal && guideModal.classList.contains('active')) {
            closeGuide(false);
        } else if (event.state && event.state.view) {
            switchView(event.state.view, false);
        } else if (currentView !== 'search') {
            switchView('search', false);
        }
    });

    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
        window.Capacitor.Plugins.App.addListener('backButton', () => {
            if (cardModal && cardModal.classList.contains('active')) {
                window.history.back();
            } else if (guideModal && guideModal.classList.contains('active')) {
                window.history.back();
            } else if (currentView !== 'search') {
                window.history.back();
            } else {
                window.Capacitor.Plugins.App.exitApp();
            }
        });
    }
}


// ===== AI CHATBOT =====
const aiChatBtn = document.getElementById("aiChatBtn");
const aiChatWindow = document.getElementById("aiChatWindow");
const aiChatClose = document.getElementById("aiChatClose");
const aiChatInput = document.getElementById("aiChatInput");
const aiChatSend = document.getElementById("aiChatSend");
const aiChatMessages = document.getElementById("aiChatMessages");

let isChatbotTyping = false;

if (aiChatBtn) {
    aiChatBtn.addEventListener("click", () => {
        aiChatWindow.classList.add("active");
        aiChatInput.focus();
    });
}

if (aiChatClose) {
    aiChatClose.addEventListener("click", () => {
        aiChatWindow.classList.remove("active");
    });
}

if (aiChatSend) {
    aiChatSend.addEventListener("click", handleChatbotSubmit);
}

if (aiChatInput) {
    aiChatInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleChatbotSubmit();
        }
    });
}

async function handleChatbotSubmit() {
    const text = aiChatInput.value.trim();
    if (!text || isChatbotTyping) return;

    addChatMessage(text, "user");
    aiChatInput.value = "";
    
    isChatbotTyping = true;
    aiChatSend.disabled = true;
    const loadingId = addChatLoading();
    
    try {
        let contextText = "";
        
        const deckInputEl = document.getElementById("deckInput");
        let deckText = "";
        if (deckInputEl && deckInputEl.value.trim().length > 0) {
            deckText = deckInputEl.value.trim();
        } else if (typeof currentDeckId !== "undefined" && currentDeckId && typeof savedDecks !== "undefined") {
            const activeDeck = savedDecks.find(d => d.id === currentDeckId);
            if (activeDeck) deckText = activeDeck.content;
        }
        
        if (deckText) {
            contextText += "Kullanicinin su anki destesi su sekildedir:\n" + deckText + "\n\n";
        }
        
        const foundCard = allCards.find(c => 
            (c.name && text.toLowerCase().includes(c.name.toLowerCase())) || 
            (c.id && text.toUpperCase().includes(c.id))
        );
        
        if (foundCard) {
            contextText += "Kullanicinin bahsettigi kart: [" + foundCard.id + "] " + foundCard.name + ". Tipi: " + (foundCard.type_tr || foundCard.type) + ". Maliyet: " + (foundCard.cost || 0) + ". Guc: " + (foundCard.power || 0) + ". Efekt: " + (foundCard.effect_tr || foundCard.effect_en || "Yok");
        }

        let responseText = "";
        try {
            const response = await fetch("http://localhost:3000/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: text, context: contextText })
            });
            const result = await response.json();
            if (result.success) {
                responseText = result.text;
            } else {
                responseText = "⚠️ " + result.error;
            }
        } catch (err) {
            responseText = "Sunucuya baglanilamadi. Lutfen node server.js komutu ile sunucuyu baslattiginizdan emin olun.";
        }

        removeChatLoading(loadingId);
        addChatMessage(responseText, "ai");

    } catch (e) {
        removeChatLoading(loadingId);
        addChatMessage("Üzgünüm, şu an bağlantı kuramıyorum.", "ai");
    } finally {
        isChatbotTyping = false;
        aiChatSend.disabled = false;
        aiChatInput.focus();
    }
}

function addChatMessage(text, sender) {
    const msgDiv = document.createElement("div");
    msgDiv.className = "ai-message " + sender;
    
    const contentDiv = document.createElement("div");
    contentDiv.className = "ai-message-content";
    contentDiv.textContent = text;
    
    msgDiv.appendChild(contentDiv);
    aiChatMessages.appendChild(msgDiv);
    
    // Scroll to bottom
    aiChatMessages.scrollTop = aiChatMessages.scrollHeight;
}

function addChatLoading() {
    const id = "loading-" + Date.now();
    const msgDiv = document.createElement("div");
    msgDiv.className = "ai-message ai";
    msgDiv.id = id;
    
    msgDiv.innerHTML = "<div class=\"ai-loading-indicator\"><div class=\"ai-dot\"></div><div class=\"ai-dot\"></div><div class=\"ai-dot\"></div></div>";
    
    aiChatMessages.appendChild(msgDiv);
    aiChatMessages.scrollTop = aiChatMessages.scrollHeight;
    
    return id;
}

function removeChatLoading(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}







