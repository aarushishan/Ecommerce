# ShopSphere — Project Goals & Roadmap

---

## 1. Primary Objectives

1. **Production-Grade Completeness:** Deliver a fully integrated, full-stack e-commerce platform that functions end-to-end without fake mocks, dead buttons, or simulated client-side math.
2. **Enterprise Reliability:** Guarantee transactional integrity during checkout, preventing overselling of inventory and ensuring zero price tampering.
3. **Distinct Brand & Aesthetic Excellence:** Establish an original visual identity ("ShopSphere") characterized by clean white surfaces, professional blue accents (`#1E40AF` / `#2563EB`), crisp slate typography, modern layout grids, and interactive micro-animations.
4. **Multi-Role Governance:** Provide distinct, secure experiences for Customers, Verified Sellers, and Platform Administrators.
5. **Practical AI Utility:** Provide modular AI enhancements (smart recommendations, semantic search, side-by-side comparison, conversational assistant) that solve real customer problems without adding brittle dependencies.

---

## 2. Phased Development Roadmap

```mermaid
gantt
    title ShopSphere Engineering Roadmap
    dateFormat  YYYY-MM-DD
    section Core Foundation
    Phase 1: Project Setup & Design System       :p1, 2026-10-15, 2d
    Phase 2: Catalog, PDP, Search & Filters     :p2, after p1, 3d
    section Commerce Core
    Phase 3: Auth, RBAC & Profile Management     :p3, after p2, 2d
    Phase 4: Cart, Wishlist, Orders & Inventory :p4, after p3, 3d
    Phase 5: Payments (Test Mode) & Tracking    :p5, after p4, 2d
    section Portals & AI
    Phase 6: Seller & Admin Dashboards          :p6, after p5, 3d
    Phase 7: Modular AI Recommendations & Bot   :p7, after p6, 2d
    section Hardening
    Phase 8: Testing, Security & Deployment     :p8, after p7, 2d
```

---

### Phase 1: Architecture, Setup, Database & Design System
- **Deliverables:**
  - Standardized directory layout (`frontend/`, `backend/`, `database/`, `tests/`, `docker/`).
  - FastAPI backend initialization with CORS, health-check endpoints, and database connection.
  - PostgreSQL container setup via Docker Compose and SQLAlchemy base models.
  - React + Vite + Tailwind CSS frontend scaffolding with customized color tokens and fonts.
  - Design system primitives: Buttons, Inputs, Badges, Modals, Skeleton Loaders, and Header/Footer layouts.
- **Success Criteria:**
  - `GET /api/v1/health` returns status `200 OK` with database connection verified.
  - Frontend renders responsive header, footer, and empty-state layout with no console errors.

---

### Phase 2: Catalog Discovery, PDP, Search, Filters & Sorting
- **Deliverables:**
  - Database schema & seed script for categories, products, images, and inventory.
  - Product APIs: List products with pagination, search, category filter, price filter, rating filter, and sorting.
  - Responsive homepage with Hero Carousel, Featured Categories, Flash Deals, and Trending Items.
  - Search and Filter catalog page with multi-facet sidebar and dynamic URL query synchronization.
  - Product Detail Page (PDP) with image gallery, variant selectors, spec table, stock indicator, and review summaries.
- **Success Criteria:**
  - Instant filtering across 20+ realistic seed items without page reload.
  - PDP dynamically updates pricing and SKU availability when selecting variants.

---

### Phase 3: Authentication, Authorization & User Management
- **Deliverables:**
  - Argon2 password hashing pipeline and JWT access/refresh token generation.
  - Registration, Login, Logout, Profile update, and Password change endpoints.
  - Role-Based Access Control (RBAC) middleware verifying roles: `CUSTOMER`, `SELLER`, `ADMIN`.
  - Frontend `AuthContext`, login/register modals or pages, protected route wrappers, and address book manager.
- **Success Criteria:**
  - Secure login persists tokens; unauthorized attempts to access protected endpoints return `401/403`.
  - Users can create, edit, and set default shipping addresses.

---

### Phase 4: Shopping Cart, Wishlist, Checkout & Inventory Locking
- **Deliverables:**
  - Persistent shopping cart supporting guest-to-user cart merging.
  - Wishlist toggle on all product cards and PDP.
  - Server-side checkout calculation engine (subtotal, shipping, tax, discounts).
  - Transactional inventory reservation using SQL row locks (`SELECT FOR UPDATE`) during order placement.
- **Success Criteria:**
  - Attempting to buy more items than available in stock triggers a clear, protective validation error.
  - Subtotal and total match backend recalculation with 100% precision.

---

### Phase 5: Payment Gateway Integration & Order Tracking
- **Deliverables:**
  - Stripe and Razorpay Test Mode integration with a robust Mock Payment option for zero-friction local testing.
  - Secure payment verification and idempotent webhook listener.
  - Order lifecycle state engine: `PENDING` ➔ `CONFIRMED` ➔ `PROCESSING` ➔ `SHIPPED` ➔ `DELIVERED`.
  - Visual timeline order tracking page with delivery estimates and itemized receipts.
- **Success Criteria:**
  - Completed mock/test payment immediately updates order status and decrements confirmed inventory.
  - Webhook simulation verifies cryptographic signatures and rejects tampered payloads.

---

### Phase 6: Seller & Admin Dashboards
- **Deliverables:**
  - **Seller Portal:** Product management (CRUD), image uploader, variant creator, inventory adjuster, and seller order dispatcher.
  - **Admin Portal:** Platform KPI dashboard (GMV, order volume, user growth), category management, seller approvals, review moderation queue, and audit log viewer.
  - Data tables with search, sorting, filtering, and export capabilities.
- **Success Criteria:**
  - Sellers can only access and modify their own catalog items and assigned order lines.
  - Admin can update user roles, toggle product visibility, and review real-time audit logs.

---

### Phase 7: Modular AI Recommendations, Assistant & Semantic Search ✅ *(Completed & Verified)*
- **Deliverables:**
  - Recommendation engine generating "Similar Items" and "Recommended for You" based on catalog metadata.
  - Side-by-side Smart Product Comparison modal highlighting key specification differences.
  - Conversational AI Shopping Assistant ("SphereBot") grounded in the active product catalog.
  - Semantic search parser using vector cosine similarity for natural language intent queries.
- **Success Criteria:**
  - Chatbot responds with accurate product titles, prices, and features directly pulled from the database without fabricating hallucinations.
  - Semantic search correctly returns relevant products for fuzzy/meaning queries.

---

### Phase 8: Testing, Security Audit, Optimization & Deployment ✅ *(Completed & Verified)*
- **Deliverables:**
  - Automated test suite: 46 Backend API tests with `pytest` covering auth, inventory locking, payment workflows, AI suite, and security boundaries.
  - Comprehensive security hardening: Rate limiting middleware, security headers (CSP/HSTS/nosniff), input validation, CORS enforcement, and SQLi prevention checks.
  - Full Docker Compose deployment orchestrating frontend (Nginx SPA + reverse proxy), backend (Uvicorn), and PostgreSQL containers.
  - Production README with step-by-step setup, configuration reference, and operational guidelines.
- **Success Criteria:**
  - Entire application builds cleanly and boots with `docker compose up --build`.
  - All 46 automated test suites execute with 100% pass rate.
