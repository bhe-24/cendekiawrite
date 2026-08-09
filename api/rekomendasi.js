export default async function handler(req, res) {
    // 1. Izinkan akses dari halaman web (CORS)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Metode tidak diizinkan. Gunakan POST.' });
    }

    const { action, text } = req.body;
    
    // API Key Groq dari Vercel Environment Variables
    const GROQ_API_KEY = process.env.GROQ_API_KEY; 

    if (!GROQ_API_KEY) {
        return res.status(500).json({ error: 'API Key Groq belum dipasang di Server Vercel.' });
    }

    try {
        let systemPrompt = "";

        if (action === "auto_tag") {
            systemPrompt = `Kamu adalah asisten editor novel profesional di platform Aksara Narasi. 
            Tugasmu: Baca sinopsis atau potongan cerita dari penulis berikut, lalu berikan MAKSIMAL 5 tagar (genre/tema) yang paling relevan.
            ATURAN MUTLAK: Balasanmu HARUS berupa array JSON murni tanpa awalan/akhiran teks apapun. 
            Contoh balasan: ["Romansa", "Sekolah", "PatahHati", "FiksiRemaja", "Sedih"]`;
        } else if (action === "semantic_search") {
            systemPrompt = `Kamu adalah asisten mesin pencari buku. 
            Tugasmu: Analisis curhatan/kalimat pembaca berikut, lalu ekstrak menjadi MAKSIMAL 3 kata kunci/tagar utama untuk mencari novel yang cocok.
            ATURAN MUTLAK: Balasanmu HARUS berupa array JSON murni tanpa awalan/akhiran teks apapun.
            Contoh: Jika pembaca bilang "aku pengen nangis brutal", balasanmu: ["Sedih", "Tragis", "Angst"]`;
        } else {
            return res.status(400).json({ error: 'Action tidak dikenali.' });
        }

        // 4. Memanggil Groq API
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "llama-3.1-8b-instant", 
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: text }
                ],
                temperature: 0.3 
            })
        });

        const data = await response.json();
        
        // --- PERBAIKAN DI SINI: TANGKAP ERROR DARI GROQ ---
        if (!response.ok || !data.choices || data.choices.length === 0) {
            console.error("ALASAN ERROR DARI GROQ:", JSON.stringify(data, null, 2));
            return res.status(500).json({ 
                success: false, 
                error: data.error?.message || 'Groq API menolak permintaan atau mengembalikan data kosong.' 
            });
        }
        
        let aiReply = data.choices[0].message.content.trim();
        
        // Bersihkan balasan dari karakter tak berguna
        const jsonMatch = aiReply.match(/\[.*\]/s);
        if (jsonMatch) {
            aiReply = jsonMatch[0];
        }

        const tagsArray = JSON.parse(aiReply);

        return res.status(200).json({ success: true, tags: tagsArray });

    } catch (error) {
        console.error("System Error (Rekomendasi):", error.message);
        return res.status(500).json({ success: false, error: 'Gagal memproses data JSON dari AI.' });
    }
}
