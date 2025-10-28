import express from "express";
import fetch from "node-fetch";
import { createWorker } from "tesseract.js";

const app = express();
app.use(express.json({ limit: "20mb" }));

async function baixarImagemBuffer(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Erro ao baixar imagem: ${resp.status}`);
  const buffer = await resp.arrayBuffer();
  return Buffer.from(buffer);
}

app.post("/ocr", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ sucesso: false, erro: "URL ausente" });

    const imageBuffer = await baixarImagemBuffer(url);

    const worker = await createWorker("por"); // idioma português
    const { data } = await worker.recognize(imageBuffer);
    await worker.terminate();

    return res.json({ sucesso: true, textoExtraido: data.text.trim() });
  } catch (erro) {
    console.error("❌ Erro OCR-Tesseract:", erro);
    return res.status(500).json({ sucesso: false, erro: String(erro.message || erro) });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor OCR (Tesseract) ativo na porta ${PORT}`));
