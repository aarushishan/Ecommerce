# ShopSphere — Full-Stack E-Commerce Platform

ShopSphere is an enterprise-grade, high-performance, full-stack e-commerce web application inspired by the shopping mechanics of Amazon and Flipkart. It features a distinctive visual brand identity, modern UX aesthetics, transactional integrity with database row locks, multi-vendor merchant portal, platform command center, and a modular AI intelligence suite.

---

## 📚 Project Specifications & Blueprints

All architectural blueprints and engineering standards are documented in detail:

| Document | Purpose |
| :--- | :--- |
| 📄 [PRD.md](file:///c:/Users/hp/Desktop/Ecommerce/PRD.md) | **Product Requirements Document**: User personas, scope, buying journeys, seller/admin workflows, and AI suite specifications. |
| ⚙️ [TECH_STACK.md](file:///c:/Users/hp/Desktop/Ecommerce/TECH_STACK.md) | **Technology Stack**: React 18, Vite, Tailwind CSS, FastAPI, SQLAlchemy 2.0, Pydantic v2, PostgreSQL, Docker, and Pytest. |
| 🎯 [GOALS.md](file:///c:/Users/hp/Desktop/Ecommerce/GOALS.md) | **Goals & 8-Phase Roadmap**: Milestones, phase-by-phase deliverables, and acceptance criteria. |
| 🛡️ [RULES.md](file:///c:/Users/hp/Desktop/Ecommerce/RULES.md) | **Engineering Standards**: Security invariants, price verification, inventory locking, RBAC, and UI design rules. |
| 🏛️ [ARCHITECTURE.md](file:///c:/Users/hp/Desktop/Ecommerce/ARCHITECTURE.md) | **System Architecture**: Data flow diagrams, repository directory layout, and API route index. |
| 🗄️ [DATABASE_SCHEMA.md](file:///c:/Users/hp/Desktop/Ecommerce/DATABASE_SCHEMA.md) | **Database Schema**: 20+ normalized relational tables, ER diagram, foreign keys, indexes, and constraints. |
| 🔐 [.env.example](file:///c:/Users/hp/Desktop/Ecommerce/.env.example) | **Environment Variables**: Documented template for ports, database URLs, JWT keys, and mock payment flags. |

---

## 🚀 8-Phase Incremental Roadmap

1. **Phase 1: Architecture, Setup, Database & Design System** ✅ *(Completed & Verified)*
2. **Phase 2: Catalog Discovery, PDP, Search, Filters & Sorting** ✅ *(Completed & Verified)*
3. **Phase 3: Authentication, Authorization & User Management** ✅ *(Completed & Verified)*
4. **Phase 4: Shopping Cart, Wishlist, Checkout & Inventory Locking** ✅ *(Completed & Verified)*
5. **Phase 5: Payment Gateway Integration (Test/Mock) & Order Tracking** ✅ *(Completed & Verified)*
6. **Phase 6: Seller & Admin Dashboards** ✅ *(Completed & Verified)*
7. **Phase 7: Modular AI Recommendations, Assistant & Semantic Search** ✅ *(Completed & Verified)*
8. **Phase 8: Automated Testing, Security Hardening & Docker Deployment** ✅ *(Completed & Verified)*

---

## 🤖 Phase 7: Modular AI Intelligence Suite

ShopSphere features a completely catalog-grounded, zero-hallucination AI system:

- **Conversational Shopping Assistant ("SphereBot"):**
  - Persistent, floating assistant with interactive quick replies and micro-animations.
  - Context-aware: Automatically detects when a shopper is viewing a product and offers tailored questions and comparisons.
  - Grounded answers: Queries live catalog prices, stock availability, and verified reviews.
  - Live Order Tracking Cards: Look up order status, shipment carrier, and tracking numbers directly in the chat.
- **Smart Product Comparison Matrix:**
  - Compare 2 to 4 products side-by-side.
  - Algorithmic Value Score gauge (combining ratings and discount ratios).
  - SphereBot automated verdict highlighting best overall value, budget option, and top customer-rated pick.
  - Persistent comparison tray docked at the bottom of the viewport with 1-click launch.
- **AI Recommendation Engine:**
  - Content-based vector cosine similarity across titles, brands, categories, and descriptions.
  - "Frequently Bought Together" bundles on PDP with bundle discount calculation and single-click bundle checkout.
  - "Recommended For You" personalized feed on the homepage.
- **Natural Language Semantic Search:**
  - Natural query intent parser extracting price bounds (e.g. *"headphones under ₹10,000"*), category mappings, and quality criteria.
  - Intent breakdown banner in the catalog displaying detected criteria and vector similarity scores.

---

## 🛡️ Phase 8: Security Hardening & Production Reliability

- **Security Headers Middleware:** Automatically applies `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy`.
- **Sliding-Window Rate Limiting:** In-memory, thread-safe token bucket rate limiter protecting sensitive authentication, checkout, and payment endpoints against brute-force attacks (`429 Too Many Requests`).
- **SQLi & XSS Resilience:** Parametrized ORM queries with zero string concatenation, verified against aggressive SQL injection vectors.
- **Transactional Row Locking:** SQL `SELECT ... FOR UPDATE` row locks during checkout to prevent double-selling of inventory.
- **Multi-Stage Docker Orchestration:**
  - `backend/Dockerfile`: Lightweight Python 3.11 Slim container with Uvicorn server.
  - `frontend/Dockerfile` & `nginx.conf`: Multi-stage build running Nginx with Gzip compression, client-side SPA routing, and upstream `/api/` reverse proxying.
  - `docker-compose.yml`: Coordinates PostgreSQL, FastAPI backend, and Nginx frontend with healthchecks and restart policies.
- **100% Automated Test Pass Rate:** 46 pytest integration and security tests validating the entire application lifecycle.

---

## 💻 Tech Stack

- **Frontend:** React 18, Vite 5, Tailwind CSS, React Router v6, Axios, Lucide React
- **Backend:** Python 3.11+, FastAPI, Uvicorn, Pydantic v2, SQLAlchemy 2.0, Jose JWT, Passlib Argon2
- **Database:** PostgreSQL 15+ (Production) / SQLite fallback (Local Dev)
- **Deployment:** Docker, Docker Compose, Nginx Reverse Proxy
- **Testing:** Pytest, Starlette TestClient

---

## 🛠️ How to Run Locally

### 1. Backend Service
```bash
# Navigate to backend directory
cd backend

# Install dependencies
pip install -r requirements.txt

# Start FastAPI server on port 8000
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
- API Root: `http://127.0.0.1:8000/`
- Interactive Swagger Docs: `http://127.0.0.1:8000/docs`
- Health Endpoint: `http://127.0.0.1:8000/api/v1/health`

### 2. Frontend Application
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start Vite dev server on port 5173
npm run dev
```
- Web Application: `http://localhost:5173/`

### 3. Automated Test Suite
```bash
# Run all 46 automated integration, AI, and security tests from the root
pytest -v
```

### 4. Docker Compose (Full Stack Deployment)
```bash
# Build and boot all containers (PostgreSQL + FastAPI + Nginx Frontend)
docker compose up --build
```
- Frontend Web App: `http://localhost:5173` (or `http://localhost:80`)
- Backend API Docs: `http://localhost:8000/docs`
