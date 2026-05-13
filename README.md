# DocuAsk — AI-Powered PDF Q&A System

> Ask questions about any PDF document and receive answers grounded strictly in the document's content.

---

## Live Demo

- **Frontend:** https://docuask.vercel.app *(replace after deploy)*
- **Backend API:** https://docuask-api.railway.app *(replace after deploy)*

---

## Project Setup

### Prerequisites
- Node.js v18+
- An Anthropic API key → [console.anthropic.com](https://console.anthropic.com)

### 1. Clone the Repository
```bash
git clone https://github.com/<your-username>/docuask.git
cd docuask
```

### 2. Set Up the Server
```bash
cd server
npm install
cp .env.example .env
# Add your ANTHROPIC_API_KEY to the .env file
npm run dev         # starts on http://localhost:3001
```

### 3. Set Up the Client
```bash
cd client
npm install
npm run dev         # starts on http://localhost:5173
```

The Vite dev server proxies `/api/*` requests to the backend automatically.

---

## Architecture & Flow

```
User (Browser)
    │
    │  1. Select & upload PDF (multipart/form-data)
    ▼
React Frontend (Vite + Tailwind)
    │
    │  POST /api/upload → receives sessionId
    │
    │  POST /api/ask   { sessionId, question }
    ▼
Express Backend (Node.js)
    │  • Stores PDF in memory, keyed by sessionId
    │  • Maintains conversation history per session
    │  • Sessions auto-expire after 2 hours
    ▼
Anthropic Claude API
    │  • claude-sonnet-4-20250514
    │  • PDF sent as base64 document in first message
    │  • Full conversation history replayed on each turn
    │    (PDF included only in the first user message)
    ▼
Answer returned to user
```

---

## AI Approach

### Model
**Claude Sonnet 4** (`claude-sonnet-4-20250514`) via the Anthropic Messages API.

Claude natively supports PDF documents — the PDF is passed directly as a base64-encoded `document` block in the API request. No external PDF parsing library is needed.

### Prompt Design

#### System Prompt
```
You are a strict document Q&A assistant. Your sole purpose is to answer
questions using ONLY the content of the uploaded PDF document.

STRICT RULES:
1. Answer ONLY from information explicitly present in the document.
   Do not infer, assume, or use external knowledge.
2. If the answer is NOT found in the document, respond with exactly:
   "Not available in document"
3. Never hallucinate or fabricate any information.
4. When answering, try to reference the relevant section or page number
   if identifiable.
5. If a question is partially answerable, answer what is available and
   state what is not found.
6. Keep answers concise and accurate.
```

#### Why This Prompt Works
- **Role assignment** ("strict document Q&A assistant") sets a narrow persona that resists scope creep.
- **Explicit prohibition** on external knowledge and inference prevents the model from drawing on its training data.
- **Exact fallback phrase** ("Not available in document") gives the application a parseable, unambiguous signal for unanswerable questions.
- **Partial answerability instruction** handles edge cases where only part of a question can be answered.

### Multi-Turn Conversation
The server reconstructs the full conversation history on every request:
- **First user message:** contains the PDF document block + first question.
- **Subsequent messages:** plain text only (the model retains document context from the conversation history).
This avoids re-uploading the PDF binary on every turn while keeping Claude grounded.

---

## How Hallucinations Are Prevented

| Mechanism | Detail |
|-----------|--------|
| **System prompt constraint** | Explicitly forbids using external knowledge or making assumptions. |
| **Native document grounding** | Claude's document QA is designed to cite the provided source rather than generate freely. |
| **Exact fallback phrase** | Model is instructed to return a deterministic string when the answer is absent — UI detects and styles this differently. |
| **No RAG chunking errors** | The entire PDF is provided in context; there is no retrieval step that could surface the wrong chunk. |
| **Conversation history fidelity** | Full history is replayed on each turn — model cannot "forget" the document constraints mid-conversation. |

---

## Features Implemented

### Mandatory
- ✅ PDF upload with file type validation (MIME type check) and 20 MB size limit
- ✅ Text extracted and processed by Claude natively (no manual parsing)
- ✅ AI Q&A strictly grounded in document content
- ✅ Returns **"Not available in document"** when answer is absent
- ✅ Interactive chat interface with conversation history

### Nice-to-Have
- ✅ Chat history maintained across multiple questions in a session
- ✅ Visual indicator when answer is not found in document (amber styling)
- ✅ Quick-start suggestion chips for first question
- ⬜ Page number references (Claude provides these when detectable in the PDF)
- ⬜ Multi-PDF support (out of scope for this version)

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/upload` | Upload a PDF. Returns `{ sessionId, filename }` |
| `POST` | `/api/ask` | Ask a question. Body: `{ sessionId, question }`. Returns `{ answer }` |
| `POST` | `/api/clear` | Clear session chat history. Body: `{ sessionId }` |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS |
| Backend | Node.js, Express |
| AI Model | Claude Sonnet 4 (Anthropic) |
| PDF Handling | Native Claude document API (no parsing library) |
| File Upload | Multer (in-memory storage) |
| Session Management | In-memory Map with TTL cleanup |
| Deployment | Vercel (frontend) + Railway (backend) |

---

## Limitations

1. **In-memory sessions** — server restart clears all sessions; not suitable for production at scale without a database.
2. **No persistent storage** — PDFs are not saved; users must re-upload after session expiry (2 hours) or server restart.
3. **Single PDF per session** — uploading a new PDF starts a fresh session.
4. **Token limits** — very large PDFs (100+ pages) may hit Claude's context window limit.
5. **API key cost** — each question makes a Claude API call; high-volume usage incurs cost.

---

## Possible Improvements

- Add Redis for persistent session and conversation storage
- Stream responses using Server-Sent Events for better UX
- Highlight the exact passage in the PDF that answers each question
- Support multiple simultaneous PDFs in one session
- Add rate limiting and API key management for production
- Export chat history as PDF or markdown
- Offline PDF text extraction fallback using `pdf-parse` for cost reduction

---

## AI Tools Used

This project was developed with assistance from **Claude (Anthropic)** for:
- Architecture planning and code scaffolding
- React component design
- Prompt engineering for document grounding

All code was reviewed, understood, and validated by the developer.

---

## Author

**Pradeep C**  
B.E. Computer Science | Java Full Stack Developer  
[GitHub](https://github.com/1pradeep1) · [Portfolio](https://1pradeep1.github.io/Pradeep-portfolio)
