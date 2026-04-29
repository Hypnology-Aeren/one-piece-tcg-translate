// ===== OPTCG Keyword & Effect Translation Dictionary =====
// English -> Turkish translations for One Piece TCG terms

const KEYWORD_TRANSLATIONS = {
    // Core game mechanics
    "Rush": "Hücum",
    "Blocker": "Engelleyici",
    "Double Attack": "Çift Saldırı",
    "Banish": "Sürgün",
    "DON!!": "DON!!",
    "Counter": "Sayaç",
    "Trigger": "Tetik",
    "Activate: Main": "Aktifleştir: Ana",
    "Activate": "Aktifleştir",
    "Main": "Ana",
    "On Play": "Oyuna Girişte",
    "When Attacking": "Saldırırken",
    "On Block": "Engelleme Sırasında",
    "On K.O.": "Yenilgide",
    "End of Your Turn": "Turunuzun Sonunda",
    "Your Turn": "Sizin Turunuz",
    "Opponent's Turn": "Rakibin Turu",
    "Once Per Turn": "Tur Başına Bir Kez",

    // Common card text patterns
    "Leader": "Lider",
    "Character": "Karakter",
    "Event": "Olay",
    "Stage": "Sahne",
    "power": "güç",
    "Power": "Güç",
    "cost": "maliyet",
    "Cost": "Maliyet",
    "life": "can",
    "Life": "Can",
    "hand": "el",
    "Hand": "El",
    "trash": "çöp",
    "Trash": "Çöp",
    "deck": "deste",
    "Deck": "Deste",
    "rest": "dinlen",
    "Rest": "Dinlen",
    "active": "aktif",
    "Active": "Aktif",

    // Colors
    "Red": "Kırmızı",
    "Blue": "Mavi",
    "Green": "Yeşil",
    "Purple": "Mor",
    "Black": "Siyah",
    "Yellow": "Sarı",

    // Card types
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

    // Rarity
    "L": "L (Lider)",
    "SR": "SR (Süper Nadir)",
    "R": "R (Nadir)",
    "UC": "UC (Yaygın Olmayan)",
    "C": "C (Yaygın)",
    "SEC": "SEC (Gizli Nadir)",
    "SP": "SP (Özel)",
    "P": "P (Promo)",

    // Attributes
    "Slash": "Kesici",
    "Strike": "Vurucu",
    "Ranged": "Menzilli",
    "Wisdom": "Bilgelik",
    "Special": "Özel",
    // Additional common terms
    "Battle": "Savaş",
    "battle": "savaş",
    "card": "kart",
    "cards": "kartlar",
    "Card": "Kart",
    "Cards": "Kartlar",
    "give": "ver",
    "Give": "Ver",
    "play": "oyna",
    "Play": "Oyna",
    "cannot": "yapamaz",
    "attribute": "özellik",
    "Attribute": "Özellik",
};

// Full-sentence pattern translations
const PATTERN_TRANSLATIONS = [
    // DON!! effects
    { en: /\[DON!! x(\d+)\]/g, tr: "[DON!! x$1]" },
    { en: /\[Your Turn\]/g, tr: "[Sizin Turunuz]" },
    { en: /\[Opponent's Turn\]/g, tr: "[Rakibin Turu]" },
    { en: /\[On Play\]/g, tr: "[Oyuna Girişte]" },
    { en: /\[When Attacking\]/g, tr: "[Saldırırken]" },
    { en: /\[On Block\]/g, tr: "[Engelleme Sırasında]" },
    { en: /\[On K\.O\.\]/g, tr: "[Yenilgide]" },
    { en: /\[Activate: ?Main\]/g, tr: "[Aktifleştir: Ana]" },
    { en: /\[Activate:Main\]/g, tr: "[Aktifleştir: Ana]" },
    { en: /\[Trigger\]/g, tr: "[Tetik]" },
    { en: /\[Counter\]/g, tr: "[Sayaç]" },
    { en: /\[Once Per Turn\]/g, tr: "[Tur Başına Bir Kez]" },
    { en: /\[End of Your Turn\]/g, tr: "[Turunuzun Sonunda]" },
    { en: /\[Rush\]/g, tr: "[Hücum]" },
    { en: /\[Blocker\]/g, tr: "[Engelleyici]" },
    { en: /\[Double Attack\]/g, tr: "[Çift Saldırı]" },
    { en: /\[Banish\]/g, tr: "[Sürgün]" },

    // Common full-sentence patterns (ORDER MATTERS - longer/more specific patterns first)
    // K.O. related patterns (must be before standalone K.O.)
    { en: /cannot be K\.O\.'d in battle/gi, tr: "savaşta yenilgiye uğratılamaz" },
    { en: /cannot be K\.O\.'d/gi, tr: "yenilgiye uğratılamaz" },
    { en: /K\.O\.'d/gi, tr: "yenilgiye uğratıldığında" },
    
    // Character/Leader phrases
    { en: /All of your Characters/gi, tr: "Tüm Karakterleriniz" },
    { en: /all of your Characters/gi, tr: "tüm Karakterleriniz" },
    { en: /one of your opponent's Characters/gi, tr: "rakibinizin Karakterlerinden biri" },
    { en: /your opponent's Characters/gi, tr: "rakibinizin Karakterleri" },
    { en: /your opponent's Leader/gi, tr: "rakibinizin Lideri" },
    { en: /your opponent's active/gi, tr: "rakibinizin aktif" },
    { en: /your opponent's rested/gi, tr: "rakibinizin dinlenme durumundaki" },
    { en: /your Characters/gi, tr: "Karakterleriniz" },
    { en: /your Leader/gi, tr: "Lideriniz" },
    { en: /your opponent/gi, tr: "rakibiniz" },
    { en: /this Leader/gi, tr: "bu Lider" },
    { en: /this Character/gi, tr: "bu Karakter" },
    { en: /this card/gi, tr: "bu kart" },

    // Attribute patterns
    { en: /"Slash" attribute/gi, tr: "\"Kesici\" özellikli" },
    { en: /"Strike" attribute/gi, tr: "\"Vurucu\" özellikli" },
    { en: /"Ranged" attribute/gi, tr: "\"Menzilli\" özellikli" },
    { en: /"Wisdom" attribute/gi, tr: "\"Bilgelik\" özellikli" },
    { en: /"Special" attribute/gi, tr: "\"Özel\" özellikli" },
    { en: /attribute Characters/gi, tr: "özellikli Karakterler" },
    { en: /attribute Character/gi, tr: "özellikli Karakter" },

    // Power gain/loss patterns
    { en: /gain \+(\d+) power/gi, tr: "+$1 güç kazanır" },
    { en: /gains \+(\d+) power/gi, tr: "+$1 güç kazanır" },
    { en: /give up to (\d+) of your opponent's Characters -(\d+) power/gi, tr: "rakibinizin $1 adede kadar Karakterine -$2 güç verir" },
    { en: /give this Character \+(\d+) power/gi, tr: "bu Karaktere +$1 güç ver" },
    { en: /give this Leader \+(\d+) power/gi, tr: "bu Lidere +$1 güç ver" },
    { en: /give .*? -(\d+) power/gi, tr: "-$1 güç verir" },
    { en: /Give this Character/gi, tr: "Bu Karaktere ver" },
    { en: /Give this Leader/gi, tr: "Bu Lidere ver" },
    
    // DON!! specific patterns
    { en: /rested DON!! cards/gi, tr: "dinlenme durumundaki DON!! kartları" },
    { en: /DON!! cards/gi, tr: "DON!! kartları" },
    { en: /DON!! card/gi, tr: "DON!! kartı" },
    { en: /set as active/gi, tr: "aktif olarak ayarla" },
    { en: /as active/gi, tr: "aktif olarak" },
    
    // Draw/Trash patterns
    { en: /draw (\d+) cards/gi, tr: "$1 kart çek" },
    { en: /draw (\d+) card/gi, tr: "$1 kart çek" },
    { en: /draw a card/gi, tr: "bir kart çek" },
    { en: /add (\d+) to your life/gi, tr: "canına $1 ekle" },
    { en: /rest this/gi, tr: "bunu dinlendir" },
    { en: /play this card/gi, tr: "bu kartı oyna" },
    { en: /You may trash (\d+) cards? from your hand/gi, tr: "Elinizden $1 kartı çöpe atabilirsiniz" },
    { en: /trash (\d+) cards? from your hand/gi, tr: "elinizden $1 kartı çöpe at" },
    { en: /trash the top (\d+) cards? of your deck/gi, tr: "destenizin üstündeki $1 kartı çöpe at" },
    { en: /return this card to your hand/gi, tr: "bu kartı elinize geri alın" },
    { en: /return .*? to .*? owner's hand/gi, tr: "sahibinin eline geri döndür" },
    
    // Cost/Power conditions
    { en: /up to (\d+)/gi, tr: "$1 adede kadar" },
    { en: /with a cost of (\d+) or less/gi, tr: "maliyeti $1 veya daha az olan" },
    { en: /with a cost of (\d+) or more/gi, tr: "maliyeti $1 veya daha fazla olan" },
    { en: /with a cost of (\d+)/gi, tr: "maliyeti $1 olan" },
    { en: /with (\d+) power or less/gi, tr: "$1 veya daha az güce sahip" },
    { en: /with (\d+) power or more/gi, tr: "$1 veya daha fazla güce sahip" },
    
    // K.O. standalone (after more specific K.O. patterns)
    { en: /K\.O\./g, tr: "yenilgiye uğrat" },
    
    // Location patterns
    { en: /from your hand/gi, tr: "elinizden" },
    { en: /from your deck/gi, tr: "destenizden" },
    { en: /from your trash/gi, tr: "çöpünüzden" },
    { en: /to your hand/gi, tr: "elinize" },
    { en: /to your deck/gi, tr: "destenize" },
    { en: /to your trash/gi, tr: "çöpünüze" },
    { en: /to your life/gi, tr: "canınıza" },
    { en: /at the top of your deck/gi, tr: "destenizin üstüne" },
    { en: /at the bottom of your deck/gi, tr: "destenizin altına" },
    { en: /the bottom of your deck/gi, tr: "destenizin altı" },
    { en: /the top of your deck/gi, tr: "destenizin üstü" },
    { en: /place it at the top of your deck/gi, tr: "destenizin üstüne koy" },
    { en: /look at the top (\d+) cards? of your deck/gi, tr: "destenizin üstündeki $1 karta bak" },
    { en: /reveal the top card of your deck/gi, tr: "destenizin üstündeki kartı aç" },
    
    // Conditionals
    { en: /If this card is a/gi, tr: "Bu kart bir" },
    { en: /if this card has/gi, tr: "bu kartın" },
    { en: /If your Leader is/gi, tr: "Lideriniz" },
    { en: /If your Leader has/gi, tr: "Liderinizin" },
    { en: /Then,/gi, tr: "Sonra," },
    { en: /Also,/gi, tr: "Ayrıca," },
    { en: /however/gi, tr: "ancak" },
    { en: /instead/gi, tr: "bunun yerine" },
    
    // Turn/Battle timing
    { en: /during this turn/gi, tr: "bu tur boyunca" },
    { en: /during this battle/gi, tr: "bu savaş boyunca" },
    { en: /until the end of your next turn/gi, tr: "bir sonraki turunuzun sonuna kadar" },
    { en: /at the end of your turn/gi, tr: "turunuzun sonunda" },
    { en: /in battle by/gi, tr: "savaşta" },
    { en: /in battle/gi, tr: "savaşta" },
    
    // Actions
    { en: /you may/gi, tr: "yapabilirsiniz:" },
    { en: /if you do/gi, tr: "bunu yaparsanız" },
    { en: /if you don't/gi, tr: "yapmazsanız" },
    { en: /You may add/gi, tr: "Ekleyebilirsiniz" },
    { en: /cannot attack/gi, tr: "saldıramaz" },
    { en: /cannot block/gi, tr: "engelleyemez" },
    
    // Card type references in effects
    { en: /a Character/gi, tr: "bir Karakter" },
    { en: /Characters/gi, tr: "Karakterler" },
    { en: /Character card/gi, tr: "Karakter kartı" },
    { en: /Leader card/gi, tr: "Lider kartı" },
    { en: /Event card/gi, tr: "Olay kartı" },
    { en: /Stage card/gi, tr: "Sahne kartı" },
    
    // State words
    { en: /rested/gi, tr: "dinlenme durumundaki" },
    { en: /active/gi, tr: "aktif" },
    { en: /or less/gi, tr: "veya daha az" },
    { en: /or more/gi, tr: "veya daha fazla" },
    { en: /power/gi, tr: "güç" },
    { en: /\bcards\b/gi, tr: "kartlar" },
    { en: /\bcard\b/gi, tr: "kart" },
];

/**
 * Translate card effect text from English to Turkish
 */
function translateEffect(text) {
    if (!text) return "Efekt yok";
    
    let translated = text;
    
    // Apply pattern translations
    for (const pattern of PATTERN_TRANSLATIONS) {
        translated = translated.replace(pattern.en, pattern.tr);
    }
    
    return translated;
}

/**
 * Translate card color
 */
function translateColor(color) {
    if (!color) return "—";
    return KEYWORD_TRANSLATIONS[color] || color;
}

/**
 * Translate card type
 */
function translateType(type) {
    if (!type) return "—";
    return KEYWORD_TRANSLATIONS[type] || type;
}

/**
 * Translate rarity
 */
function translateRarity(rarity) {
    if (!rarity) return "—";
    return KEYWORD_TRANSLATIONS[rarity] || rarity;
}

/**
 * Translate attribute
 */
function translateAttribute(attr) {
    if (!attr) return "—";
    return KEYWORD_TRANSLATIONS[attr] || attr;
}

/**
 * Translate sub_types
 */
function translateSubTypes(subtypes) {
    if (!subtypes) return [];
    // Handle both "/" separated and other formats
    let parts;
    if (subtypes.includes("/")) {
        parts = subtypes.split("/");
    } else {
        // Try to match known multi-word subtypes first, then split remaining
        parts = [subtypes];
    }
    
    return parts.map(s => {
        const trimmed = s.trim();
        // Direct match
        if (KEYWORD_TRANSLATIONS[trimmed]) return KEYWORD_TRANSLATIONS[trimmed];
        
        // Try to translate each known term within the subtype string
        let translated = trimmed;
        // Sort keywords by length (longest first) to match multi-word terms first
        const sortedKeys = Object.keys(KEYWORD_TRANSLATIONS)
            .filter(k => k.length > 2)
            .sort((a, b) => b.length - a.length);
        
        for (const key of sortedKeys) {
            if (translated.includes(key)) {
                translated = translated.replace(new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), KEYWORD_TRANSLATIONS[key]);
            }
        }
        return translated;
    });
}
