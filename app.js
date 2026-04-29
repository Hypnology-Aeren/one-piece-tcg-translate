// ===== OPTCG Card Translator App =====
const API_BASE = "https://optcgapi.com/api";

// State
let cardDb = {};
let allCards = [];
let filteredCards = [];
let favorites = JSON.parse(localStorage.getItem("optcg_favorites") || "[]");
let currentView = "search";
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
        console.log(`✅ Veritabanı yüklendi: ${allCards.length} kart`);
    } catch (e) {
        console.error("❌ Veritabanı yüklenemedi:", e);
        showToast("⚠️ Veritabanı yüklenemedi. İnternet üzerinden devam ediliyor...");
    }
    showLoading(false);
    cardsLoading = false;
}

// ===== NAVIGATION =====
function setupNavigation() {
    document.querySelectorAll(".nav-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const view = btn.dataset.view;
            switchView(view);
        });
    });
}

function switchView(view) {
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
            opt.textContent = `${s.set_id} — ${s.set_name}`;
            setFilter.appendChild(opt);
        });
    } catch (e) {
        console.error("Sets yüklenemedi:", e);
    }
}

async function loadSetsView() {
    const setsGrid = document.getElementById("setsGrid");
    try {
        setsGrid.innerHTML = allSets.map(s => `
            <div class="set-card" data-set-id="${s.set_id}" onclick="loadSetCards('${s.set_id}', '${s.set_name.replace(/'/g, "\\'")}')">
                <div class="set-card-id">${s.set_id}</div>
                <div class="set-card-name">${s.set_name}</div>
                <div class="set-card-arrow">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="9 18 15 12 9 6"/>
                    </svg>
                </div>
            </div>
        `).join("");
        setsLoaded = true;
    } catch (e) {
        setsGrid.innerHTML = `<p style="color:var(--text-muted);">Setler yüklenemedi.</p>`;
    }
}

async function loadSetCards(setId, setName) {
    switchView("search");
    searchInput.value = "";
    setFilter.value = setId;
    colorFilter.value = "";
    typeFilter.value = "";

    searchCards("", setId);
    showToast(`📦 ${setName} seti yüklendi`);
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
        emptyState.querySelector("h3").textContent = "Sonuç bulunamadı";
        emptyState.querySelector("p").textContent = "Farklı bir arama terimi veya filtre deneyin";
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
                     onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 250 350%22><rect fill=%22%2316161f%22 width=%22250%22 height=%22350%22/><text fill=%22%23555%22 font-size=%2214%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22>Görsel Yok</text></svg>'">
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
                    ${card.power ? `<span class="meta-tag">⚡${card.power}</span>` : ""}
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
        } catch {}
    }

    if (!card) return;
    currentModalCard = card;

    // Fill modal
    document.getElementById("modalCardImage").src = card.image || card.card_image || `https://optcgapi.com/media/static/Card_Images/${card.id}.jpg`;
    document.getElementById("modalCardId").textContent = card.id || card.card_set_id;
    document.getElementById("modalRarity").textContent = card.rarity_tr || card.rarity;
    document.getElementById("modalCardName").textContent = card.name || card.card_name || "—";
    
    // Color
    const colorVal = document.getElementById("modalColor");
    const colorStr = card.color || card.card_color;
    colorVal.textContent = card.color_tr || colorStr;
    colorVal.style.color = getColorHex(colorStr);

    document.getElementById("modalType").textContent = card.type_tr || card.card_type;
    document.getElementById("modalCost").textContent = card.cost || card.card_cost || "—";
    document.getElementById("modalPower").textContent = card.power || card.card_power || "—";
    document.getElementById("modalCounter").textContent = card.counter || card.counter_amount || "—";
    document.getElementById("modalLife").textContent = card.life || "—";

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
        effectEn.textContent = "Bu kartın efekti yok.";
    }

    // Set & Attribute
    document.getElementById("modalSetName").textContent = card.set_name || "—";
    document.getElementById("modalAttribute").textContent = card.attribute_tr || card.attribute;
    document.getElementById("modalAttribute").style.display = (card.attribute_tr || card.attribute) ? "" : "none";

    // Favorite button
    const favBtn = document.getElementById("modalFavBtn");
    const isFav = favorites.includes(card.id || card.card_set_id);
    favBtn.className = `favorite-btn modal-fav-btn ${isFav ? "favorited" : ""}`;
    favBtn.querySelector("svg").setAttribute("fill", isFav ? "currentColor" : "none");
    favBtn.onclick = () => toggleFavorite(card.id || card.card_set_id, favBtn);

    cardModal.classList.add("active");
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
        showToast("💔 Favorilerden çıkarıldı");
    } else {
        favorites.push(cardId);
        if (btn) {
            btn.classList.add("favorited");
            btn.querySelector("svg").setAttribute("fill", "currentColor");
        }
        showToast("❤️ Favorilere eklendi");
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
