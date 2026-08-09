// File: api/rekomendasi.js

export default async function handler(req, res) {
    // 1. Izinkan akses dari halaman web (CORS)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // 2. Pastikan requestnya adalah POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Metode tidak diizinkan. Gunakan POST.' });
    }

    const { action, text } = req.body;
    
    // API Key Groq ini NANTI harus kamu masukkan di pengaturan Vercel (Environment Variables)
    // JANGAN PERNAH MENULIS API KEY LANGSUNG DI KODE HTML!
    const GROQ_API_KEY = process.env.GROQ_API_KEY; 

    if (!GROQ_API_KEY) {
        return res.status(500).json({ error: 'API Key Groq belum dipasang di Server.' });
    }

    try {
        let systemPrompt = "";

        // 3. Logika "Banyak Kamar": AI bertindak sesuai perintah dari halaman yang memanggilnya
        if (action === "auto_tag") {
            // Jika dipanggil dari halaman Menulis (menulis-info.html)
            systemPrompt = `Kamu adalah asisten editor novel profesional di platform Aksara Narasi. 
            Tugasmu: Baca sinopsis atau potongan cerita dari penulis berikut, lalu berikan MAKSIMAL 5 tagar (genre/tema) yang paling relevan.
            ATURAN MUTLAK: Balasanmu HARUS berupa array JSON murni tanpa awalan/akhiran teks apapun. 
            Contoh balasan: ["Romansa", "Sekolah", "PatahHati", "FiksiRemaja", "Sedih"]`;
        
        } else if (action === "semantic_search") {
            // Jika dipanggil dari halaman Pencarian (search.html)
            systemPrompt = `Kamu adalah asisten mesin pencari buku. 
            Tugasmu: Analisis curhatan/kalimat pembaca berikut, lalu ekstrak menjadi MAKSIMAL 3 kata kunci/tagar utama untuk mencari novel yang cocok.
            ATURAN MUTLAK: Balasanmu HARUS berupa array JSON murni tanpa awalan/akhiran teks apapun.
            Contoh: Jika pembaca bilang "aku pengen nangis brutal", balasanmu: ["Sedih", "Tragis", "Angst"]`;
        } else {
            return res.status(400).json({ error: 'Action tidak dikenali.' });
        }

        // 4. Memanggil Groq API yang Super Cepat (Pakai model Llama 3 8B)
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "llama3-8b-8192", // Model ringan dan super kilat
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: text }
                ],
                temperature: 0.3 // Dibuat rendah agar jawabannya fokus dan tidak melantur
            })
        });

        const data = await response.json();
        
        // 5. Tangkap balasan AI
        let aiReply = data.choices[0].message.content.trim();
        
        // Bersihkan balasan jika AI bandel memberikan teks tambahan di luar JSON
        const jsonMatch = aiReply.match(/\[.*\]/s);
        if (jsonMatch) {
            aiReply = jsonMatch[0];
        }

        const tagsArray = JSON.parse(aiReply);

        // 6. Kirim kembali ke halaman web (HTML)
        return res.status(200).json({ success: true, tags: tagsArray });

    } catch (error) {
        console.error("Groq Error:", error);
        return res.status(500).json({ success: false, error: 'Gagal berkomunikasi dengan otak AI.' });
    }
}
