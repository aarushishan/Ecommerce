# ShopSphere — Technology Stack Specification

---

## 1. Architectural Overview

ShopSphere is engineered with a decoupled, modular architecture adhering to modern micro-monolith principles: a reactive client application communicating over structured REST APIs with a high-throughput Python backend, backed by a relational PostgreSQL database, transactional caching, and a pluggable AI engine.

```
┌────────────────────────────────────────────────────────┐
│                   ShopSphere Frontend                  │
│       React 18 + Vite + Tailwind CSS + Lucide Icons    │
└───────────────────────────┬────────────────────────────┘
                            │ HTTPS / REST JSON + JWT
┌───────────────────────────▼────────────────────────────┐
│                   ShopSphere Backend                   │
│            FastAPI (Python 3.11+) + Pydantic v2        │
└─────────────┬─────────────────────────────┬────────────┘
              │ SQLAlchemy 2.0 (Async/Sync) │ Python AI Service
┌─────────────▼─────────────┐ ┌─────────────▼────────────┐
│      PostgreSQL 15+       │ │ Modular Recommendation & │
│ Relational Data & Indexes │ │ Semantic Search Engine   │
└───────────────────────────┘ └──────────────────────────┘
```

---

## 2. Frontend Technology Stack

| Layer / Library | Technology & Version | Rationale & Selection Criteria |
| :--- | :--- | :--- |
| **Framework & Build** | React 18+ with Vite 5+ | Blazing fast Hot Module Replacement (HMR), optimized Rollup production bundling, and component-based UI. |
| **Styling** | Tailwind CSS 3.4+ | Utility-first CSS providing rapid layout composition, consistent design tokens, dark/light contrast, and zero runtime CSS overhead. |
| **Icons** | Lucide React | Clean, tree-shakeable modern iconography compatible with high-end commerce platforms. |
| **Routing** | React Router DOM v6 | Declarative client-side routing with nested layouts, protected route guards (`RequireAuth`, `RequireRole`), and dynamic URL params. |
| **HTTP Client** | Axios 1.6+ | Interceptors for seamless JWT Bearer token attachment, automatic token refresh handling, and standardized error normalization. |
| **State Management** | Context API + Custom Hooks | Lean, lightweight reactive state management without excessive Redux boilerplate, perfectly partitioned into `AuthContext`, `CartContext`, `WishlistContext`, and `ToastContext`. |
| **Notifications** | Custom Toast System | Non-blocking, beautiful feedback notifications for cart additions, errors, and system events. |

---

## 3. Backend Technology Stack

| Layer / Library | Technology & Version | Rationale & Selection Criteria |
| :--- | :--- | :--- |
| **Language & Engine** | Python 3.11+ | High execution speed, native type hints, rich standard library, and first-class AI/ML library ecosystem. |
| **Web Framework** | FastAPI 0.110+ | Asynchronous capabilities (ASGI), automatic OpenAPI (Swagger) documentation generation at `/docs`, and robust dependency injection. |
| **Validation & Schemas** | Pydantic v2 | Extremely fast Rust-backed schema validation, serialization, and strict type enforcement for requests and responses. |
| **ORM & Database Client** | SQLAlchemy 2.0+ & psycopg2-binary | Declarative mapped classes, transactional integrity, connection pooling, and advanced query constructs. |
| **Database Migrations**| Alembic 1.13+ | Version-controlled schema migrations allowing safe, reproducible schema changes across environments. |
| **Security & Auth** | Passlib (Argon2 / bcrypt) + PyJWT | Industry standard password hashing resisting GPU cracking; cryptographic JSON Web Tokens for stateless session authentication. |
| **CORS & Middleware** | Starlette Middleware | Fine-grained CORS configuration, request timing logging, and standardized exception handling. |

---

## 4. Database & Storage Architecture

| Component | Technology | Rationale |
| :--- | :--- | :--- |
| **Primary Relational DB** | PostgreSQL 15+ | ACID compliance, JSONB support for variant specifications, row-level locking for inventory checkout, and mature indexing (B-Tree, GIN). |
| **Media & Image Storage** | Cloudinary API / Local Static Fallback | Cloud-native image optimization, dynamic transformations, and CDN delivery, with automatic local filesystem fallback for offline development. |
| **Vector / Embeddings** | Python NumPy / Scikit-Learn (pgvector-ready) | Zero-dependency modular cosine similarity engine for semantic search and recommendations, easily upgradable to `pgvector` in PostgreSQL. |

---

## 5. Payments, AI & DevOps

### 5.1 Payment Processing
- **Payment Gateway:** Stripe Test Mode & Razorpay Test Mode with full Mock Mode fallback.
- **Security:** Server-side signature verification, transactional order state updates, and idempotent webhook listeners to eliminate double credits.

### 5.2 AI & Machine Learning Suite
- **Recommendation Engine:** Modular Python algorithm combining content-based feature cosine vectors with user interaction frequency.
- **Shopping Assistant:** Grounded prompt pipeline that parses the live catalog and injects factual product context into conversational answers (OpenAI API / Ollama / Gemini API compatible, with zero-dependency heuristic fallback).

### 5.3 Testing & Quality Assurance
- **Backend:** `pytest`, `pytest-asyncio`, `httpx` for fast API endpoint integration and unit tests.
- **Frontend:** Component isolation and automated browser subagent validation.

### 5.4 Containerization & Deployment
- **Containerization:** Docker multi-stage builds for lightweight frontend (Nginx) and backend (Uvicorn) images.
- **Orchestration:** `docker-compose.yml` defining synchronized services: `frontend`, `backend`, and `db (postgres)`.
- **Environment Management:** Rigorous `.env` files with version-controlled `.env.example`.
