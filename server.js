import express from "express";
import cors from "cors";
import morgan from "morgan";
import multer from "multer";
import fetch from "node-fetch";
import { fromBuffer } from "file-type";
import Tesseract from "tesseract.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(morgan("dev"));

const upload = multer({ storage: multer.memoryStorage() });

// 🧠 Função para processar OCR
async function extractTextFromBuffer(buffer) {
  try {
    const result = await Tesseract.recognize(buffer, "por+eng", {
      logger: (m) => console.log(m),
    });
    return result.data.text;
  } catch (err) {
    console.error("Erro no OCR:", err);
    throw err;
  }
}

// 🧩 Rota principal de teste
app.get("/", (req, res) => {
  res.json({ status: "✅ Servidor OCR ativo", time: new Date().toISOString() });
});

// 🧩 Rota para processar OCR (imagem ou URL)
app.post("/ocr", upload.single("image"), async (req, res) => {
  try {
    let imgBuffer = null;

    if (req.file) {
      // Envio multipart/form-data
      imgBuffer = req.file.buffer;
    } else if (req.body.url) {
      // Envio via JSON: { "url": "https://..." }
      const response = await fetch(req.body.url);
      imgBuffer = await response.arrayBuffer();
      imgBuffer = Buffer.from(imgBuffer);
    } else {
      return res.status(400).json({ error: "Envie uma imagem ou uma URL." });
    }

    const fileType = await fromBuffer(imgBuffer);
    if (!fileType || !fileType.mime.startsWith("image/")) {
      return res.status(400).json({ error: "Arquivo inválido." });
    }

    const text = await extractTextFromBuffer(imgBuffer);
    res.json({ text, length: text.length, processedAt: new Date().toISOString() });
  } catch (err) {
    console.error("Erro no processamento:", err);
    res.status(500).json({ error: "Erro interno ao processar OCR." });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor OCR (Tesseract) ativo na porta ${PORT}`);
});