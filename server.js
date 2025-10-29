const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const multer = require("multer");
const fetch = require("node-fetch");
const { fromBuffer } = require("file-type");
const Tesseract = require("tesseract.js");

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(morgan("dev"));

const upload = multer({ storage: multer.memoryStorage() });

app.get("/", (req, res) => {
  res.json({ status: "✅ Servidor OCR ativo", hora: new Date().toISOString() });
});

async function extractTextFromBuffer(buffer) {
  const result = await Tesseract.recognize(buffer, "por+eng");
  return result.data.text;
}

app.post("/ocr", upload.single("image"), async (req, res) => {
  try {
    let imgBuffer = null;

    if (req.file) {
      imgBuffer = req.file.buffer;
    } else if (req.body.url) {
      const response = await fetch(req.body.url);
      imgBuffer = await response.buffer();
    } else {
      return res.status(400).json({ error: "Envie uma imagem ou URL." });
    }

    const fileType = await fromBuffer(imgBuffer);
    if (!fileType?.mime?.startsWith("image/")) {
      return res.status(400).json({ error: "Arquivo inválido." });
    }

    const text = await extractTextFromBuffer(imgBuffer);
    res.json({ texto: text, tamanho: text.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro interno no OCR." });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Servidor OCR ativo na porta ${PORT}`));