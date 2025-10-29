// server.js
import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import Tesseract from "tesseract.js";
import morgan from "morgan";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// rota de status
app.get("/", (req, res) => {
  res.json({ status: "✅ Servidor OCR ativo", hora: new Date().toISOString() });
});

// OCR principal
app.post("/ocr", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL da imagem ausente." });

    // baixa a imagem
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // salva temporariamente
    const tempPath = path.join(__dirname, "temp_image.jpg");
    fs.writeFileSync(tempPath, buffer);

    // executa OCR
    const result = await Tesseract.recognize(tempPath, "por", {
      logger: (m) => console.log(m),
    });

    // remove o arquivo temporário
    fs.unlinkSync(tempPath);

    res.json({
      sucesso: true,
      textoExtraido: result.data.text.trim(),
    });
  } catch (error) {
    console.error("❌ Erro no OCR:", error);
    res.status(500).json({ error: "Erro interno no OCR." });
  }
});

app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));