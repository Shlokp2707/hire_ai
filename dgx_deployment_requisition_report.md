# University Project Requisition & Budget Proposal
## Optimized Minimal Deployment: AI-Powered Interviewer & Resume Screening Platform

---

### Executive Summary

| Project Detail | Specification |
| :--- | :--- |
| **Project Title** | CHAYAN AI — Automated AI Interviewer & Intelligent ATS Platform |
| **Target Infrastructure** | University NVIDIA DGX Server (or DGX Cloud Partition) |
| **Target Concurrency** | **Strictly 5 Concurrent Candidate Sessions** |
| **Target LLM Engine** | **Meta Llama-3.1-8B-Instruct** (Self-Hosted, Local Inference) |
| **Data Retention Policy** | **Zero Video Storage** (Client-side MediaPipe analysis; only DB logs & PDF resumes retained) |
| **Container Architecture** | Decoupled Multi-Stage Slim Docker Stack (**~7.2 GB Total Image Footprint**) |

> [!IMPORTANT]
> **Key Requisition Takeaway for DGX Administrators:**  
> This project requires **less than 1/4 of a single DGX GPU** (via an NVIDIA MIG 20GB slice or 1x 24GB card partition) and **under 50 GB NVMe storage**. By performing vision-proctoring in student web browsers and separating the inference engine from the web server, this deployment avoids expensive video storage and maximizes cluster sharing.

---

### 1. Minimal Hardware Requisition Specification

The table below outlines the **absolute minimal resource request** to submit to the university DGX administrator or laboratory head:

| Resource | Minimal Allocation | DGX Implementation Method | Justification |
| :--- | :--- | :--- | :--- |
| **GPU / VRAM** | **16 GB – 24 GB VRAM** | 1x NVIDIA MIG slice (e.g. `3g.20gb` or `4g.24gb` on A100) or 1x dedicated RTX 4090 / A5000 / A10G | Houses `Llama-3.1-8B` (8–16 GB) + 5 concurrent KV caches (2.6 GB) + CUDA runtime (1.5 GB). |
| **CPU Compute** | **6 vCPUs / Cores** | 6 virtual cores pinned to container cluster | Handles 5 concurrent ASGI WebSockets, periodic DeepFace identity checkpoints, and database pooling. |
| **System RAM** | **12 GB – 16 GB** | Host DDR4 / DDR5 ECC memory | Accommodates Daphne ASGI workers (1.2 GB), PostgreSQL (2 GB), Redis broker (0.5 GB), and OS safety buffer. |
| **High-Speed Storage** | **45 GB – 50 GB** | High-performance NVMe SSD partition | 7.2 GB Docker images + 16 GB model weights + 3 GB relational DB + 1 GB resumes + 15 GB OS/Swap/Logs. |
| **Network Uplink** | **15 Mbps – 25 Mbps** | University LAN / 1 Gbps internal interface | Lightweight WebSocket JSON telemetry + real-time audio chunks (no video streams upload to server). |

---

### 2. Engineering Math: Why Each Quantity Is Minimized

```mermaid
flowchart LR
    subgraph VRAM["Total VRAM: ~12.2 GB (FP8) / ~20.2 GB (FP16)"]
        direction TB
        W["Model Weights: 8.0 GB (FP8) / 16.0 GB (FP16)"]
        KV["5-Stream KV Cache: 2.6 GB (4096 Tokens)"]
        CR["CUDA Runtime & Activations: 1.5 GB"]
        W --> KV --> CR
    end

    subgraph Storage["Total Storage: ~40 GB to 48 GB"]
        direction TB
        D["Optimized Docker Stack: ~7.2 GB"]
        M["Llama-3.1 Weights: ~8 to 16 GB"]
        DB["PostgreSQL & PDF Resumes: ~4.0 GB"]
        L["System Logs & OS Buffer: ~15.0 GB"]
        D --> M --> DB --> L
    end
```

#### A. GPU VRAM Mathematical Proof
* **Base Model Footprint:**
  * $\text{FP8 / 4-bit Quantization (AWQ/GPTQ): } 8.03\text{B params} \times 1\text{ byte} \approx \mathbf{8.0\text{ GB}}$
  * $\text{FP16 (Full Precision): } 8.03\text{B params} \times 2\text{ bytes} \approx \mathbf{16.06\text{ GB}}$
* **KV Cache for 5 Active Concurrent Streams:**
  * Llama-3.1-8B uses Grouped-Query Attention (GQA): 32 layers, 8 KV heads, head dimension 128.
  * Context window per interview session: $4{,}096\text{ tokens}$.
  * Memory per user session:
    $$\text{VRAM}_{\text{session}} = 2 \times 32 \times 8 \times 128 \times 4{,}096 \times 2\text{ bytes} \approx 536\text{ MB } (0.52\text{ GB})$$
  * For 5 simultaneous candidates:
    $$\text{VRAM}_{\text{total KV}} = 5 \times 0.52\text{ GB} = \mathbf{2.6\text{ GB}}$$
* **CUDA Runtime & Working Buffer:** $\approx \mathbf{1.5\text{ GB}}$
* **Verdict:** 
  * Quantized (FP8/4-bit) fits in **12.1 GB** (works on any 16GB GPU slice).
  * Unquantized (FP16) fits in **20.2 GB** (fits cleanly on a standard 20GB or 24GB MIG slice).

#### B. Storage Reduction Proof (Zero Video Storage Strategy)
* **Standard Video Archival (Discarded):** Storing 720p 15fps webcam recordings for 5 candidates over 25 minutes consumes $\approx 5 \times 450\text{ MB} = 2.25\text{ GB}$ per exam round ($> 150\text{ GB}$ per semester).
* **Our Edge-Proctoring Strategy:** MediaPipe runs inside the candidate's browser (detecting face pose, multi-face presence, and eye gaze locally).
* **Data Saved to Server:**
  * Only JSON telemetry violations (e.g. `{"timestamp": 124.5, "event": "tab_switch"}`) $\approx \mathbf{50\text{ KB}}$ per session.
  * Extracted text and audio scores in PostgreSQL $\approx \mathbf{200\text{ KB}}$ per candidate.
  * Raw PDF Resumes $\approx \mathbf{250\text{ KB}}$ per candidate.
* **Storage Requirement:** Drops from **150+ GB down to < 5 GB** of active application data.

---

### 3. Budget Analysis: University DGX vs. Cloud Alternatives

This project maximizes the return on investment of the university's existing NVIDIA DGX infrastructure:

```
+---------------------------------------------------------------------------------------------------+
| Scenario A: University NVIDIA DGX Deployment (Recommended)                                         |
| Hardware Cost:                  $0.00 (Allocated from existing DGX server partition)              |
| API Token Cost:                 $0.00 (Local Llama-3.1-8B inference via vLLM)                     |
| Storage Cost:                   $0.00 (45 GB allocated on existing NVMe pool)                     |
| TOTAL INCREMENTAL BUDGET:       $0.00 / Month                                                     |
+---------------------------------------------------------------------------------------------------+
| Scenario B: Commercial Cloud Equivalent (If run outside DGX for comparison)                       |
| 1x Cloud GPU (RTX 4090 / A5000): $0.45/hr x 60 testing hrs/month                = $27.00 / Month  |
| PostgreSQL / Redis Managed DB:   $15.00 / Month                                 = $15.00 / Month  |
| 500 Candidate API Calls (GPT-4o): $0.05 / interview round                       = $25.00 / Month  |
| TOTAL CLOUD BENCHMARK:           ~$67.00 / Month (~$800.00 / Year)                                |
+---------------------------------------------------------------------------------------------------+
```

> [!TIP]
> **Administrative Value:** By hosting `Llama-3.1-8B` locally on the DGX, the university avoids recurring commercial API costs (OpenAI / Anthropic), guarantees **100% data privacy** for student resumes and exam scores, and operates completely offline without external API rate limits.

---

### 4. Optimized Multi-Container Architecture

The platform is decoupled into specialized micro-containers, reducing total image overhead by **60%**:

```mermaid
graph TD
    Client["Student Browser (MediaPipe Edge Proctoring)"]
    
    subgraph DGX_Node["University DGX Server Environment"]
        Nginx["Frontend Nginx Container<br><code>nginx:alpine</code><br><b>Size: 35 MB</b>"]
        Daphne["Django ASGI Backend<br><code>python:3.11-slim</code><br><b>Size: 1.9 GB</b>"]
        Postgres["PostgreSQL 15<br><code>postgres:15-alpine</code><br><b>Size: 130 MB</b>"]
        Redis["Redis Cache & Channels<br><code>redis:alpine</code><br><b>Size: 40 MB</b>"]
        LLM["vLLM / Ollama Engine<br><code>Llama-3.1-8B-Instruct</code><br><b>Size: 5.1 GB</b>"]
        GPU["NVIDIA GPU (MIG Slice / 20-24 GB VRAM)"]
    end

    Client -->|HTTPS :443| Nginx
    Client -->|WSS / WebSocket :8000| Daphne
    Daphne --> Postgres
    Daphne --> Redis
    Daphne -->|Local HTTP :8000| LLM
    LLM --> GPU
```

#### Docker Image Footprint Breakdown:
1. **Frontend Container (`nginx:alpine`):** Multi-stage build copies only compiled Vite static assets (`dist/`). **Size: ~35 MB**.
2. **Backend Container (`python:3.11-slim`):** Strips out GUI modules by utilizing `opencv-python-headless` and purges pip build caches. **Size: ~1.9 GB**.
3. **Database & Broker (`postgres:alpine` & `redis:alpine`):** Ultra-lightweight system layers. **Size: ~170 MB combined**.
4. **LLM Engine (`vllm/vllm-openai` or `ollama`):** Standard container serving optimized inference. **Size: ~5.1 GB**.
5. **Total Image Storage:** **~7.2 GB** (compared to 18 GB for an unoptimized monolithic image).

---

### 5. Production DGX Launch Blueprint

#### A. Strict Memory-Bounded vLLM Execution Command
This command restricts the inference engine to exactly 5 concurrent sequence streams to prevent GPU Out-Of-Memory (OOM) crashes:

```bash
vllm serve meta-llama/Meta-Llama-3.1-8B-Instruct \
  --port 8000 \
  --max-model-len 4096 \
  --max-num-seqs 5 \
  --gpu-memory-utilization 0.88 \
  --enforce-eager
```

#### B. Production Docker Compose Configuration (`docker-compose.prod.yml`)

```yaml
version: '3.8'

services:
  llm:
    image: vllm/vllm-openai:latest
    container_name: chayan_llm
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
    environment:
      - MODEL=meta-llama/Meta-Llama-3.1-8B-Instruct
    command: >
      --model meta-llama/Meta-Llama-3.1-8B-Instruct
      --max-model-len 4096
      --max-num-seqs 5
      --gpu-memory-utilization 0.88
    ports:
      - "8001:8000"
    restart: unless-stopped

  redis:
    image: redis:alpine
    container_name: chayan_redis
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    container_name: chayan_postgres
    environment:
      POSTGRES_DB: ai_interviewer
      POSTGRES_USER: chayan_admin
      POSTGRES_PASSWORD: secure_university_password
    volumes:
      - pgdata:/var/lib/postgresql/data
    restart: unless-stopped

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: chayan_backend
    environment:
      - LLM_PROVIDER=ollama
      - OLLAMA_BASE_URL=http://llm:8000
      - REDIS_URL=redis://redis:6379/0
      - DATABASE_URL=postgres://chayan_admin:secure_university_password@postgres:5432/ai_interviewer
    depends_on:
      - llm
      - redis
      - postgres
    ports:
      - "8000:8000"
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: chayan_frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  pgdata:
```

---

### 6. Project Safety & Fallback Mechanisms

To ensure stability during university evaluations:
1. **Deterministic ATS Fallback:** If the LLM engine undergoes momentary overload during rapid concurrent submissions, the backend's heuristic regex engine calculates ATS match scores deterministically to avoid failing candidate submissions.
2. **Client-Side Eye/Head Proctoring:** MediaPipe executes in browser WebAssembly/WebGL, meaning server CPU usage is immune to candidate head movements or video resolution shifts.
3. **Graceful Connection Recovery:** Django Channels Daphne WebSockets automatically buffer and reconnect interview sessions if network jitter occurs.

---

### Summary Checklist for Requisition Submission

- [x] **Compute Unit:** 1x NVIDIA MIG Slice (`3g.20gb` / `4g.24gb`) or 1x 24GB GPU
- [x] **CPU Cores:** 6 vCPUs
- [x] **Memory:** 16 GB DDR4/DDR5
- [x] **Storage:** 50 GB NVMe partition
- [x] **Target LLM:** Meta Llama-3.1-8B-Instruct
- [x] **Concurrent Capacity:** 5 simultaneous live interviews
- [x] **Video Storage Needed:** 0 GB (No video saved)
- [x] **Total Budget Needed:** **$0.00** (Leverages existing campus DGX infrastructure)
