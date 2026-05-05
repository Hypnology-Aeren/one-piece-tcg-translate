require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS ayarlarÄ±: MasaÃ¼stÃ¼ uygulamanÄ±zdan gelen isteklere izin verir
app.use(cors());
app.use(express.json());

app.post('/api/chat', async (req, res) => {
    try {
        const { prompt, context } = req.body; console.log("GELEN CONTEXT:", context);
        const apiKey = process.env.GEMINI_API_KEY;
        
        if (!apiKey) {
            return res.status(500).json({ success: false, error: "API AnahtarÄ± sunucuda bulunamadÄ±." });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-flash-lite-latest" });

        const systemInstruction = `
Sen uzman bir One Piece TCG (Trading Card Game) hakemisin.
Ã‡OK Ã–NEMLÄ° KURAL: YanÄ±tlarÄ±n her zaman MÄ°NÄ°MUM uzunlukta, doÄŸrudan sadede gelen ve son derece KISA olmalÄ±dÄ±r.
Gereksiz nezaket cÃ¼mleleri kurma, uzatma. En fazla 2-3 cÃ¼mle ile doÄŸrudan soruyu yanÄ±tla veya kuralÄ± aÃ§Ä±kla.
Asla kendi kafandan kural uydurma.

BaÄŸlam olarak verilen kart verileri (varsa):
${context || 'Yok'}
        `;

        const fullPrompt = `${systemInstruction}\n\nKullanÄ±cÄ± Sorusu:\n${prompt}`;

        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        const text = response.text();

        res.json({ success: true, text: text });
    } catch (error) {
        console.error("Gemini API HatasÄ±:", error);
        
        let errorMessage = "Yapay zeka sunucusunda beklenmeyen bir hata oluÅŸtu.";
        
        if (error.message && error.message.includes("429")) {
            errorMessage = "1 dakika iÃ§inde Ã§ok fazla soru sordunuz. Sistemin dinlenmesi iÃ§in lÃ¼tfen 1 dakika bekleyip tekrar deneyin.";
        } else if (error.message && error.message.includes("503")) {
            errorMessage = "Åu anda Google sunucularÄ± Ã§ok yoÄŸun. LÃ¼tfen birkaÃ§ dakika sonra tekrar deneyin.";
        } else {
            errorMessage = error.message;
        }

        res.status(500).json({ success: false, error: errorMessage });
    }
});

// Sunucuyu baÅŸlat
app.listen(PORT, () => {
    console.log(`âœ… Yapay Zeka Sunucusu Ã§alÄ±ÅŸÄ±yor: http://localhost:${PORT}`);
});

