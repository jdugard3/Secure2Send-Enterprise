# OCR Implementation Decisions

## Decisions Made

### ✅ Auto-Processing on Upload
**Decision**: Auto-process documents when uploaded

**Implementation**: 
- After document upload succeeds, trigger OCR processing in the background (async)
- User doesn't need to manually trigger OCR
- Processing happens automatically but doesn't block the upload response

### ✅ Mandatory Review for Low Confidence
**Decision**: Fields with confidence < 80% require mandatory user review

**Implementation**:
- Confidence score stored with extracted data
- Frontend will flag low-confidence fields visually
- User must confirm/review low-confidence fields before applying to application
- Fields > 80% confidence can be auto-applied (with user confirmation option)

### ❓ Real-Time Updates - **NEED YOUR DECISION**
**Options**:

#### Option A: Polling (Recommended to Start)
- **How it works**: Frontend checks every 2-5 seconds: "Is OCR done yet?"
- **Pros**: 
  - Simple to implement
  - No extra infrastructure needed
  - Works with existing Express app
  - Easy to debug
- **Cons**: 
  - Slight delay (2-5 seconds)
  - Uses more HTTP requests
- **Implementation**: 
  - Add `GET /api/documents/:id/ocr-status` endpoint
  - Frontend polls this endpoint every 2 seconds
  - Returns `{ status: 'processing' | 'complete' | 'error', extractedDataId?: string }`

#### Option B: Server-Sent Events (SSE)
- **How it works**: Browser opens persistent connection, server pushes updates
- **Pros**: 
  - Real-time updates (instant)
  - More efficient than polling
  - Standard HTTP (no special protocol)
- **Cons**: 
  - Slightly more complex
  - Need connection management
  - Each user needs a persistent connection
- **Implementation**: 
  - Add `GET /api/documents/:id/ocr-stream` endpoint
  - Server sends events: `data: {"status": "processing"}\n\n`
  - Frontend uses `EventSource` API

#### Option C: WebSocket
- **How it works**: Bidirectional real-time connection
- **Pros**: 
  - Most flexible
  - Real-time bidirectional communication
- **Cons**: 
  - Most complex
  - Need WebSocket server (socket.io)
  - More infrastructure
  - Overkill for simple status updates

**Recommendation**: Start with **Polling (Option A)**, upgrade to SSE later if needed.

---

### ❓ Cleanup Cron Job - **EXPLANATION NEEDED**

**What is it?**
A background job that runs periodically (e.g., daily) to delete old/unused data.

**What gets cleaned up?**
- Extracted document data older than 30 days
- Data that was never reviewed/applied to an application
- Prevents database from growing indefinitely

**Why needed?**
- Storage costs (database size)
- Compliance (don't keep data longer than needed)
- Performance (smaller tables = faster queries)

**Options**:

#### Option 1: Cron Job Script (Recommended)
- Create `scripts/cleanup-extracted-data.ts`
- Run via cron on server (daily at 2 AM)
- Deletes expired data
- Logs what was deleted

**Pros**: Simple, reliable, easy to monitor
**Cons**: Need server access to set up cron

#### Option 2: In-App Scheduled Job
- Use `node-cron` package
- Schedule runs from within the Express app
- Runs on app startup

**Pros**: No separate cron setup needed
**Cons**: Only runs when app is running, more complex

#### Option 3: Fly.io Cron Jobs
- Use Fly.io's scheduled jobs feature
- Define in `fly.toml`
- Runs independently of app

**Pros**: Managed by Fly.io, always runs
**Cons**: Fly.io specific

**Recommendation**: **Option 1 (Cron Script)** - most portable and reliable.

---

### ✅ Process PDFs Directly
**Decision**: Process PDFs directly (no conversion to images)

**Implementation**: 
- GPT-4 Vision handles PDFs natively (up to 512MB, 50 pages)
- PDFs passed through unchanged to OpenAI API
- Images still optimized (metadata stripped, resized if needed)

---

## Summary

- ✅ Auto-processing: Enabled
- ✅ Low confidence review: Mandatory (<80%)
- ✅ Real-time updates: **Polling** (2-5 second checks)
- ✅ Cleanup job: **Cron script** (works locally + Fly.io via external trigger or Machines API)
- ✅ PDF processing: Direct (no conversion)
- ✅ OCR Provider: **OpenAI Direct** (GPT-4 Vision)

## Testing Phase 1

You can test Phase 1 now! See `OCR_TESTING_GUIDE.md` for instructions.

```bash
# Set environment variables first:
# OPENAI_API_KEY_OCR_ONLY=sk-proj-...
# ENABLE_OCR_AUTOFILL=true

npm run test:ocr ./path/to/your/w9.pdf W9
```

