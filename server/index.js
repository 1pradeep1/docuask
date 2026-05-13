require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const Groq = require('groq-sdk');
const pdfParse = require('pdf-parse');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const sessions = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions.entries()) {
    if (now - session.createdAt > 2 * 60 * 60 * 1000) sessions.delete(id);
  }
}, 30 * 60 * 1000);

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    file.mimetype === 'application/pdf' ? cb(null, true) : cb(new Error('Only PDF files are allowed'), false);
  },
  limits: { fileSize: 20 * 1024 * 1024 },
});

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client/dist')));

const SYSTEM_PROMPT = `You are a strict document Q&A assistant. Answer questions using ONLY the content of the provided PDF document text.

STRICT RULES:
1. Answer ONLY from information explicitly present in the document. Do not use external knowledge.
2. If the answer is NOT found in the document, respond with exactly: "Not available in document"
3. Never hallucinate or fabricate any information.
4. Reference the relevant section or page number if identifiable.
5. If partially answerable, answer what is available and state what is not found.
6. Keep answers concise and accurate.`;

app.post('/api/upload', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No PDF file uploaded or invalid file type.' });
    const parsed = await pdfParse(req.file.buffer);
    const pdfText = parsed.text.trim();
    if (!pdfText) return res.status(400).json({ error: 'Could not extract text from PDF.' });
    const sessionId = uuidv4();
    sessions.set(sessionId, {
      pdfText,
      filename: req.file.originalname,
      messages: [],
      createdAt: Date.now(),
    });
    res.json({ sessionId, filename: req.file.originalname });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message || 'Upload failed.' });
  }
});

app.post('/api/ask', async (req, res) => {
  try {
    const { sessionId, question } = req.body;
    if (!sessionId || !question) return res.status(400).json({ error: 'sessionId and question are required.' });
    const session = sessions.get(sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found. Please re-upload the PDF.' });
    const { pdfText, messages } = session;
    const groqMessages = [
      {
        role: 'system',
        content: `${SYSTEM_PROMPT}\n\n--- DOCUMENT CONTENT START ---\n${pdfText}\n--- DOCUMENT CONTENT END ---`,
      },
      ...messages.flatMap(m => [
        { role: 'user', content: m.question },
        { role: 'assistant', content: m.answer },
      ]),
      { role: 'user', content: question },
    ];
    const response = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: groqMessages,
      max_tokens: 1024,
      temperature: 0.1,
    });
    const answer = response.choices[0].message.content.trim();
    session.messages.push({ question, answer });
    res.json({ answer, questionNumber: session.messages.length });
  } catch (err) {
    console.error('Ask error:', err);
    res.status(500).json({ error: err.message || 'Failed to get answer.' });
  }
});

app.post('/api/clear', (req, res) => {
  const { sessionId } = req.body;
  if (sessionId && sessions.has(sessionId)) {
    sessions.get(sessionId).messages = [];
    res.json({ message: 'Chat history cleared.' });
  } else {
    res.status(404).json({ error: 'Session not found.' });
  }
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`✅ PDF Q&A Server running on http://localhost:${PORT}`));