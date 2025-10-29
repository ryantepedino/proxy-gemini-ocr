
// server.js
// OCR API simples usando Express + Tesseract.js
// Endpoints:
//   GET  /health            -> status OK
//   POST /ocr               -> { url: "https://..." }  OU  multipart form-data (campo "image")

import express from "express";
import cors from "cors";
import morgan from "morgan";
import { createServer } from "http";
import { readFile } from "fs/promises";

// fetch nativo do Node >=18 (Render usa)
// se seu package.json usar "type": "module", ok.
// Se estiver em CommonJS, troque imports por require().

import Tesseract from "tesseract.js";
import multer from "multer";
import { fileTypeFromBuffer } from "file-type";

// ---------- Config ----------
const app = express();
const server = createServer(app);

const PORT = process.env.PORT || 10000;           // Render define PORT
const HOST = "0.0.0.0";                           // IMPORTANTE para aceitar conexões externas

// Limites razoáveis para uploads JSON/multipart
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cors());
app.use(morgan("tiny"));

// Multer em memória para /ocr com arquivo
const upload = multer({ storage: multer.memoryStorage() });

// ---------- Utils ----------
async function bufferFromUrl(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000); // 25s
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`Falha ao baixar imagem (${res.status})`);
    }
    return Buffer.from(await res.arrayBuffer());
  } finally {
    clearTimeout(timeout);
  }
}

async function runOCR(buffer) {
  // valida tipo do arquivo (png/jpg/jpeg/webp)
  const type = await fileTypeFromBuffer(buffer);
  if (!type || !["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(type.mime)) {
    throw new Error(`Tipo de arquivo não suportado: ${type?.mime || "desconhecido"}`);
  }

  // Tesseract.js baixa os dados automaticamente via CDN se necessário
  // Idiomas: inglês + português (ajuste conforme sua necessidade)
  const { data } = await Tesseract.recognize(buffer, "eng+por", {
    tessedit_pageseg_mode: 3, // automático
    logger: () => {}          // silencioso nos logs
  });
  return (data && data.text ? data.text.trim() : "").slice(0, 20000);
}

// ---------- Rotas ----------
app.get("/health", (req, res) => {
  res.json({ ok: true, service: "ocr", ts: new Date().toISOString() });
});

// 1) JSON: { url: "https://..." }
// 2) multipart/form-data: campo "image"
app.post("/ocr", upload.single("image"), async (req, res) => {
  try {
    let imgBuffer = null;

    if (req.body?.url) {
      imgBuffer = await bufferFromUrl(req.body.url);
    } else if (req.file?.buffer) {
      imgBuffer = req.file.buffer;
    } else {
      return res.status(400).json({
        ok: false,
        error: "Envie {url} no corpo JSON OU um arquivo em form-data com campo 'image'."
      });
    }

    const text = await runOCR(imgBuffer);
    res.json({ ok: true, text });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err.message || err) });
  }
});

// ---------- Start ----------
server.listen(PORT, HOST, () => {
  console.log(`🚀 Servidor OCR (Tesseract) ativo na porta ${PORT}`);
});