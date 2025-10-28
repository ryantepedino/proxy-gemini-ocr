import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json({ limit: "20mb" }));

// 🔑 Variável de ambiente do Render
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// ✅ Função auxiliar: baixar imagem e converter em base64
async function baixarImagemComoBase64(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Erro ao baixar imagem: ${resp.status}`);
  const buffer = await resp.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  const contentType = resp.headers.get("content-type") || "image/jpeg";
  return { base64, contentType };
}

// ✅ Endpoint principal OCR
app.post("/ocr", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ sucesso: false, erro: "URL ausente" });

    // 1️⃣ Baixa a imagem
    const { base64, contentType } = await baixarImagemComoBase64(url);

    // 2️⃣ Monta requisição ao Gemini
    const geminiURL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`;

    const bodyGemini = {
      contents: [
        {
          role: "user",
          parts: [
            { text: "Extraia todo o texto visível desta imagem e retorne apenas o texto puro." },
            { inline_data: { mime_type: contentType, data: base64 } },
          ],
        },
      ],
    };

    // 3️⃣ Envia pro Gemini
    const respGemini = await fetch(geminiURL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyGemini),
    });

    const txt = await respGemini.text();
    if (!respGemini.ok) throw new Error(`Gemini falhou: ${txt}`);

    const json = JSON.parse(txt);
    const textoExtraido = json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

    return res.json({
      sucesso: true,
      modelo: "gemini-2.0-flash-exp",
      textoExtraido,
    });
  } catch (erro) {
    console.error("❌ Erro OCR:", erro);
    return res.status(500).json({ sucesso: false, erro: String(erro.message || erro) });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor OCR ativo na porta ${PORT}`));
