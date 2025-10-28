import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json({ limit: "10mb" }));

app.post("/ocr", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ sucesso: false, erro: "URL ausente no corpo da requisição" });

    const proxyUrl = "https://eot93e48srsoatj.m.pipedream.net";
    const proxyResp = await fetch(proxyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    if (!proxyResp.ok) throw new Error(`Falha no proxy: HTTP ${proxyResp.status}`);
    const proxyJson = await proxyResp.json();
    const base64 = proxyJson?.base64 || proxyJson?.resultado?.base64;
    const contentType = proxyJson?.mime || proxyJson?.resultado?.mime || "image/png";

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) throw new Error("Chave GEMINI_API_KEY não configurada.");

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiKey}`;
    const geminiBody = {
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

    const geminiResp = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(geminiBody),
    });

    const txt = await geminiResp.text();
    if (!geminiResp.ok) throw new Error(`Erro Gemini API (${geminiResp.status}): ${txt}`);

    const geminiJson = JSON.parse(txt);
    const textoExtraido = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

    res.json({ sucesso: true, modelo: "gemini-2.0-flash-exp", textoExtraido });
  } catch (erro) {
    console.error("🚨 Erro:", erro);
    res.status(500).json({ sucesso: false, erro: erro.message });
  }
});

app.get("/", (_, res) => res.send("✅ OCR Gemini Proxy ativo"));
app.listen(process.env.PORT || 3000, () => console.log("Servidor OCR ativo"));
