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

// 🧠 Função OCR
async function extractTextFromBuffer(buffer) {
  try {
    const result = await Tesseract.recognize(buffer, "por+eng");
    return result.data.text;
  } catch (err) {
    console.error("Erro no OCR:", err);
    throw err;
  }
}

// 🔹 Rota raiz
app.get("/", (req, res) => {
  res.json({ status: "✅ Servidor OCR ativo", hora: new Date().toISOString() });
});

// 🔹 Rota OCR
app.post("/ocr", upload.single("image"), async (req, res) => {
  try {
    let imgBuffer = null;

    if (req.file) {
      imgBuffer = req.file.buffer;
    } else if (req.body.url) {
      const response = await fetch(req.body.url);
      imgBuffer = Buffer.from(await response.arrayBuffer());
    } else {
      return res.status(400).json({ error: "Envie uma imagem ou URL." });
    }

    const fileType = await fromBuffer(imgBuffer);
    if (!fileType || !fileType.mime.startsWith("image/")) {
      return res.status(400).json({ error: "Arquivo inválido." });
    }

    const text = await extractTextFromBuffer(imgBuffer);
    res.json({ texto: text, tamanho: text.length });
  } catch (err) {
    console.error("Erro OCR:", err);
    res.status(500).json({ error: "Falha no OCR." });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Servidor OCR ativo na porta ${PORT}`));