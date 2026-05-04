/**
 * OPTCG Card Translation Builder
 * 
 * Fetches all cards from OPTCG API, translates card effects to Turkish
 * using Google Translate, and saves to cards_tr.json for offline use.
 * 
 * Usage: node build_translations.js
 */

const fs = require('fs');
const path = require('path');

const API_BASE = "https://optcgapi.com/api";
const OUTPUT_FILE = path.join(__dirname, "cards_tr.json");
const PROGRESS_FILE = path.join(__dirname, "build_progress.json");

// ===== Google Translate (Free) =====
async function translateText(text, targetLang = 'tr') {
    if (!text || text.trim() === '') return '';

    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;

    const maxRetries = 3;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const res = await fetch(url);
            if (!res.ok) {
                if (res.status === 429) {
                    // Rate limited - wait longer
                    const waitTime = (attempt + 1) * 5000;
                    console.log(`    ⏳ Rate limited, waiting ${waitTime / 1000}s...`);
                    await sleep(waitTime);
                    continue;
                }
                throw new Error(`HTTP ${res.status}`);
            }
            const data = await res.json();
            // Google Translate returns array of arrays
            let translated = '';
            if (data && data[0]) {
                for (const segment of data[0]) {
                    if (segment[0]) translated += segment[0];
                }
            }
            return translated || text;
        } catch (err) {
            if (attempt < maxRetries - 1) {
                await sleep(2000 * (attempt + 1));
                continue;
            }
            console.error(`    ❌ Translation failed: ${err.message}`);
            return text; // Return original text as fallback
        }
    }
    return text;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ===== Fix Negative Power Values =====
// The OPTCG API returns "give ... X000 power" without the minus sign.
// In the TCG, "give" power to opponent's characters always means REDUCING power (-X000).
function fixNegativePower(text) {
    if (!text) return text;
    let result = text;

    // English: "give [opponent's] Characters X000 power" -> "-X000 power"
    result = result.replace(
        /([Gg]ive\s+(?:(?:all\s+of\s+)?(?:up\s+to\s+\d+\s+of\s+)?your\s+opponent'?s?\s+(?:Leader\s+(?:or|and)\s+(?:all\s+of\s+their\s+)?)?(?:Leader\s+or\s+)?(?:Character|Leader)s?\s+(?:cards?\s+)?|(?:up\s+to\s+\d+\s+of\s+)?your\s+opponent'?s?\s+\d+\s+cost\s+Characters?\s+))(\d+)\s+power/g,
        '$1-$2 power'
    );

    // English: "give this/your Character/Leader X000 power" (penalty effects)
    result = result.replace(
        /([Gg]ive\s+(?:this|your)\s+(?:Character|Leader)\s+)(\d+)\s+power/g,
        '$1-$2 power'
    );

    // Turkish: "rakibinizin ... X000 güç" -> "-X000 güç"
    result = result.replace(
        /(rakibinizin[^.]*?)(?<![+-])(\b\d{4,}\b)\s+güç\s+(ver)/gi,
        '$1-$2 güç $3'
    );

    // Turkish: "Bu Karaktere/Lidere X000 güç" -> "-X000 güç"
    result = result.replace(
        /([Bb]u\s+(?:Karakter(?:e|den|i)?|Lider(?:e|den|i)?)\s+)(\d{4,})\s+güç/g,
        '$1-$2 güç'
    );

    // Fix double-negatives
    result = result.replace(/--(\d+)\s+power/g, '-$1 power');
    result = result.replace(/--(\d+)\s+güç/g, '-$1 güç');

    return result;
}

// ===== OPTCG Game Term Post-Processing =====
// After Google Translate, fix game-specific terms that shouldn't be translated
function postProcessTranslation(translated, original) {
    if (!translated) return translated;

    let result = translated;

    // Preserve DON!! formatting
    result = result.replace(/don\s*!!/gi, 'DON!!');
    result = result.replace(/DON\s*!!\s*!/g, 'DON!!');

    // Fix K.O. formatting
    result = result.replace(/k\.?\s*o\.?/gi, 'K.O.');
    result = result.replace(/KO\b/g, 'K.O.');

    // Preserve card ID references (e.g., OP01-003)
    const cardIdRegex = /[A-Z]{2,3}\d{2}-\d{3}/g;
    const originalIds = original.match(cardIdRegex) || [];
    // Re-insert if they got mangled

    // Fix bracket formatting for game keywords
    result = result.replace(/\[\s*Aktifleştir\s*:\s*Ana\s*\]/gi, '[Aktifleştir: Ana]');
    result = result.replace(/\[\s*Tur\s+Başına\s+Bir\s+Kez\s*\]/gi, '[Tur Başına Bir Kez]');
    result = result.replace(/\[\s*DON\s*!!\s*x\s*(\d+)\s*\]/gi, '[DON!! x$1]');
    result = result.replace(/\[\s*Tetik\s*\]/gi, '[Tetik]');
    result = result.replace(/\[\s*Sayaç\s*\]/gi, '[Sayaç]');
    result = result.replace(/\[\s*Engelleyici\s*\]/gi, '[Engelleyici]');
    result = result.replace(/\[\s*Hücum\s*\]/gi, '[Hücum]');
    result = result.replace(/\[\s*Çift\s+Saldırı\s*\]/gi, '[Çift Saldırı]');
    result = result.replace(/\[\s*Sürgün\s*\]/gi, '[Sürgün]');

    return result;
}

// ===== Translate Sub Types =====
const SUBTYPE_MAP = {
    "Straw Hat Crew": "Hasır Şapka Mürettebatı",
    "Supernovas": "Süpernova",
    "Navy": "Donanma",
    "The Seven Warlords of the Sea": "Yedi Deniz Korsanı",
    "Fish-Man": "Balık-Adam",
    "Animal": "Hayvan",
    "Giant": "Dev",
    "FILM": "FİLM",
    "Former Baroque Works": "Eski Baroque Works",
    "Dressrosa": "Dressrosa",
    "Donquixote Pirates": "Donquixote Korsanları",
    "Impel Down": "Impel Down",
    "Revolutionary Army": "Devrimci Ordu",
    "Whitebeard Pirates": "Aksakal Korsanları",
    "Big Mom Pirates": "Big Mom Korsanları",
    "Beast Pirates": "Canavar Korsanları",
    "Heart Pirates": "Kalp Korsanları",
    "Kid Pirates": "Kid Korsanları",
    "Baroque Works": "Baroque Works",
    "Alabasta": "Alabasta",
    "Wano Country": "Wano Ülkesi",
    "Land of Wano": "Wano Diyarı",
    "Thriller Bark Pirates": "Thriller Bark Korsanları",
    "CP9": "CP9",
    "CP0": "CP0",
    "Sky Island": "Gökyüzü Adası",
    "Fishman Island": "Balıkadam Adası",
    "Germa 66": "Germa 66",
    "Vinsmoke Family": "Vinsmoke Ailesi",
    "Mink Tribe": "Mink Kabilesi",
    "Kozuki Clan": "Kozuki Klanı",
    "Samurai": "Samuray",
    "Beautiful Pirates": "Güzel Korsanlar",
    "Sun Pirates": "Güneş Korsanları",
    "Punk Hazard": "Punk Hazard",
    "Arlong Pirates": "Arlong Korsanları",
    "Water Seven": "Water Seven",
    "Egghead": "Egghead",
    "World Government": "Dünya Hükümeti",
    "Straw Hat Crew/Supernovas": "Hasır Şapka Mürettebatı/Süpernova",
    "The Four Emperors": "Dört İmparator",
    "Scientist": "Bilim İnsanı",
    "Kuja Pirates": "Kuja Korsanları",
    "Biological Weapon": "Biyolojik Silah",
    "ODYSSEY": "ODYSSEY",
    "Mountain Bandits": "Dağ Haydutları",
    "Merfolk": "Deniz Kızı",
    "Tontattas": "Tontatta",
    "Corrida Colosseum Gladiators": "Corrida Kolezyum Gladyatörleri",
    "Kozuki Clan/Samurai": "Kozuki Klanı/Samuray",
    "Mink Tribe/Kozuki Clan": "Mink Kabilesi/Kozuki Klanı"
};

function translateSubTypes(subtypes) {
    if (!subtypes) return '';

    // Direct match first
    if (SUBTYPE_MAP[subtypes]) return SUBTYPE_MAP[subtypes];

    // Try splitting by / 
    if (subtypes.includes('/')) {
        return subtypes.split('/').map(s => {
            const t = s.trim();
            return SUBTYPE_MAP[t] || t;
        }).join('/');
    }

    // Try matching known multi-word subtypes (space separated, no delimiter)
    let remaining = subtypes;
    const sortedKeys = Object.keys(SUBTYPE_MAP).sort((a, b) => b.length - a.length);
    for (const key of sortedKeys) {
        if (remaining.includes(key)) {
            remaining = remaining.replace(key, SUBTYPE_MAP[key]);
        }
    }
    return remaining;
}

// ===== Color Translation =====
const COLOR_MAP = {
    "Red": "Kırmızı",
    "Blue": "Mavi",
    "Green": "Yeşil",
    "Purple": "Mor",
    "Black": "Siyah",
    "Yellow": "Sarı",
    "Green Red": "Yeşil Kırmızı",
    "Red Green": "Kırmızı Yeşil",
    "Blue Purple": "Mavi Mor",
    "Purple Blue": "Mor Mavi",
    "Red Blue": "Kırmızı Mavi",
    "Blue Red": "Mavi Kırmızı",
    "Black Yellow": "Siyah Sarı",
    "Yellow Black": "Sarı Siyah",
    "Red Purple": "Kırmızı Mor",
    "Purple Red": "Mor Kırmızı",
    "Green Yellow": "Yeşil Sarı",
    "Yellow Green": "Sarı Yeşil",
    "Blue Black": "Mavi Siyah",
    "Black Blue": "Siyah Mavi",
    "Purple Black": "Mor Siyah",
    "Black Purple": "Siyah Mor",
};

// ===== Type Translation =====
const TYPE_MAP = {
    "Leader": "Lider",
    "Character": "Karakter",
    "Event": "Olay",
    "Stage": "Sahne",
};

// ===== Rarity Translation =====
const RARITY_MAP = {
    "L": "L (Lider)",
    "SR": "SR (Süper Nadir)",
    "R": "R (Nadir)",
    "UC": "UC (Yaygın Olmayan)",
    "C": "C (Yaygın)",
    "SEC": "SEC (Gizli Nadir)",
    "SP": "SP (Özel)",
    "P": "P (Promo)",
};

// ===== Attribute Translation =====
const ATTR_MAP = {
    "Slash": "Kesici",
    "Strike": "Vurucu",
    "Ranged": "Menzilli",
    "Wisdom": "Bilgelik",
    "Special": "Özel",
};

// ===== Main Build Process =====
async function fetchJSON(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return res.json();
}

async function fetchAllCards() {
    console.log("📦 Tüm kartlar çekiliyor...\n");

    let allCards = [];

    // Fetch set cards
    try {
        console.log("  → Set kartları çekiliyor (allSetCards)...");
        const setCards = await fetchJSON(`${API_BASE}/allSetCards/`);
        console.log(`    ✅ ${setCards.length} set kartı alındı`);
        allCards = [...allCards, ...setCards];
    } catch (e) {
        console.error(`    ❌ Set kartları alınamadı: ${e.message}`);
    }

    // Fetch starter deck cards
    try {
        console.log("  → Starter deste kartları çekiliyor (allSTCards)...");
        const stCards = await fetchJSON(`${API_BASE}/allSTCards/`);
        console.log(`    ✅ ${stCards.length} starter deste kartı alındı`);
        allCards = [...allCards, ...stCards];
    } catch (e) {
        console.error(`    ❌ Starter deste kartları alınamadı: ${e.message}`);
    }

    // Deduplicate by card_set_id (keep first occurrence)
    const seen = new Map();
    for (const card of allCards) {
        const key = card.card_set_id;
        if (!seen.has(key)) {
            seen.set(key, card);
        }
    }

    const uniqueCards = Array.from(seen.values());
    console.log(`\n📊 Toplam: ${allCards.length} kart → ${uniqueCards.length} benzersiz kart\n`);

    return uniqueCards;
}

async function buildTranslations() {
    console.log("╔══════════════════════════════════════════╗");
    console.log("║    OPTCG Kart Çeviri Veritabanı Oluşturucu   ║");
    console.log("╚══════════════════════════════════════════╝\n");

    // Load progress if exists (for resume capability)
    let translatedCards = {};
    let startIndex = 0;

    if (fs.existsSync(PROGRESS_FILE)) {
        try {
            const progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
            translatedCards = progress.cards || {};
            startIndex = Object.keys(translatedCards).length;
            console.log(`📋 Önceki ilerleme bulundu: ${startIndex} kart zaten çevrilmiş\n`);
        } catch {
            console.log("⚠️ İlerleme dosyası okunamadı, baştan başlanıyor\n");
        }
    }

    // Fetch all cards
    const allCards = await fetchAllCards();

    // Collect unique effect texts to avoid translating duplicates
    const uniqueTexts = new Map(); // text -> translated text
    const cardsToTranslate = [];

    for (const card of allCards) {
        if (translatedCards[card.card_set_id]) continue; // Already translated
        cardsToTranslate.push(card);
        if (card.card_text && card.card_text.trim()) {
            uniqueTexts.set(card.card_text.trim(), null);
        }
    }

    console.log(`🔤 ${uniqueTexts.size} benzersiz efekt metni çevrilecek`);
    console.log(`🃏 ${cardsToTranslate.length} yeni kart işlenecek\n`);

    // Translate unique texts
    const textsArray = Array.from(uniqueTexts.keys());
    let translatedCount = 0;

    for (let i = 0; i < textsArray.length; i++) {
        const text = textsArray[i];
        const progress = `[${i + 1}/${textsArray.length}]`;

        // Translate the effect text
        process.stdout.write(`  ${progress} Çevriliyor... `);

        const translated = await translateText(text, 'tr');
        const postProcessed = postProcessTranslation(translated, text);
        uniqueTexts.set(text, postProcessed);
        translatedCount++;

        // Show a snippet
        const snippet = postProcessed.substring(0, 60).replace(/\n/g, ' ');
        console.log(`✅ ${snippet}...`);

        // Rate limiting: small delay between requests
        await sleep(150);

        // Save progress every 50 translations
        if (translatedCount % 50 === 0) {
            saveProgress(translatedCards, allCards, uniqueTexts, cardsToTranslate);
            console.log(`  💾 İlerleme kaydedildi (${translatedCount} çeviri)\n`);
        }
    }

    console.log(`\n✅ ${translatedCount} efekt metni çevrildi!\n`);

    // Build final card database
    console.log("🔨 Veritabanı oluşturuluyor...\n");

    for (const card of cardsToTranslate) {
        const effectTr = card.card_text ? (uniqueTexts.get(card.card_text.trim()) || '') : '';
        // Fix negative power values in both EN and TR texts
        const effectEn = fixNegativePower(card.card_text || '');
        const effectTrFixed = fixNegativePower(effectTr);

        translatedCards[card.card_set_id] = {
            id: card.card_set_id,
            name: card.card_name || '',
            set_name: card.set_name || '',
            set_id: card.set_id || '',
            color: card.card_color || '',
            color_tr: COLOR_MAP[card.card_color] || card.card_color || '',
            type: card.card_type || '',
            type_tr: TYPE_MAP[card.card_type] || card.card_type || '',
            cost: card.card_cost || null,
            power: card.card_power || null,
            counter: card.counter_amount || null,
            life: card.life || null,
            rarity: card.rarity || '',
            rarity_tr: RARITY_MAP[card.rarity] || card.rarity || '',
            attribute: card.attribute || '',
            attribute_tr: ATTR_MAP[card.attribute] || card.attribute || '',
            sub_types: card.sub_types || '',
            sub_types_tr: translateSubTypes(card.sub_types),
            effect_en: effectEn,
            effect_tr: effectTrFixed,
            image: card.card_image || `https://optcgapi.com/media/static/Card_Images/${card.card_set_id}.jpg`,
            image_id: card.card_image_id || card.card_set_id,
        };
    }

    // Also add already-translated cards from progress
    // They're already in translatedCards

    // Save final output
    const output = {
        version: new Date().toISOString(),
        total_cards: Object.keys(translatedCards).length,
        cards: translatedCards,
    };

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf8');
    console.log(`✅ ${output.total_cards} kart veritabanına kaydedildi!`);
    console.log(`📁 Dosya: ${OUTPUT_FILE}`);
    console.log(`📦 Boyut: ${(fs.statSync(OUTPUT_FILE).size / 1024 / 1024).toFixed(2)} MB`);

    // Clean up progress file
    if (fs.existsSync(PROGRESS_FILE)) {
        fs.unlinkSync(PROGRESS_FILE);
        console.log("🗑️ İlerleme dosyası temizlendi");
    }

    console.log("\n🎉 Tamamlandı!");
}

function saveProgress(translatedCards, allCards, uniqueTexts, cardsToTranslate) {
    // Build partial translated cards for progress
    const partial = { ...translatedCards };

    for (const card of cardsToTranslate) {
        if (partial[card.card_set_id]) continue;
        const effectTr = card.card_text ? (uniqueTexts.get(card.card_text.trim())) : '';
        if (effectTr === null || effectTr === undefined) continue; // Not yet translated

        partial[card.card_set_id] = {
            id: card.card_set_id,
            name: card.card_name || '',
            set_name: card.set_name || '',
            set_id: card.set_id || '',
            color: card.card_color || '',
            color_tr: COLOR_MAP[card.card_color] || card.card_color || '',
            type: card.card_type || '',
            type_tr: TYPE_MAP[card.card_type] || card.card_type || '',
            cost: card.card_cost || null,
            power: card.card_power || null,
            counter: card.counter_amount || null,
            life: card.life || null,
            rarity: card.rarity || '',
            rarity_tr: RARITY_MAP[card.rarity] || card.rarity || '',
            attribute: card.attribute || '',
            attribute_tr: ATTR_MAP[card.attribute] || card.attribute || '',
            sub_types: card.sub_types || '',
            sub_types_tr: translateSubTypes(card.sub_types),
            effect_en: card.card_text || '',
            effect_tr: effectTr || '',
            image: card.card_image || '',
            image_id: card.card_image_id || card.card_set_id,
        };
    }

    fs.writeFileSync(PROGRESS_FILE, JSON.stringify({ cards: partial }), 'utf8');
}

// Run
buildTranslations().catch(err => {
    console.error("\n💥 Kritik hata:", err);
    process.exit(1);
});
