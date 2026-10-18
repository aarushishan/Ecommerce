# ShopSphere — Engineering Rules & Operational Guidelines

---

## 1. Core Engineering Principles

1. **Zero Client Trust (Security Invariant #1):**
   - The backend MUST never trust prices, discounts, coupons, shipping costs, or total calculations sent from the frontend.
   - All monetary amounts, line-item subtotals, taxes, and final payable amounts MUST be recalculated from the database inside an active transaction.

2. **Concurrency & Inventory Integrity (Security Invariant #2):**
   - In order creation and checkout, inventory quantities MUST be checked and updated using row-level transactional locking (e.g., `SELECT ... FOR UPDATE` in PostgreSQL).
   - Never allow stock to fall below zero. Race conditions between concurrent buyers for low-stock items must fail gracefully with an informative user error.

3. **Strict Role-Based Access Control (RBAC):**
   - Every API route that exposes mutation or private data MUST enforce JWT authentication and check user roles:
     - `CUSTOMER`: Can access personal profile, addresses, orders, cart, wishlist, and eligible reviews.
     - `SELLER`: Can only access and manipulate products and order items owned by their seller ID.
     - `ADMIN`: Has platform-wide supervisory access (all users, products, categories, reviews, audit logs).

4. **Cryptographic & Secret Protection:**
   - Passwords must be hashed using Argon2 or bcrypt with high work factors. Raw passwords must NEVER appear in logs, response payloads, or temporary files.
   - Secrets, tokens, and database credentials MUST reside strictly in `.env` files. Never commit `.env` to version control; provide `.env.example` with documented defaults.

5. **Idempotency & Safe Payment Handlers:**
   - Webhook listeners and payment callbacks must verify cryptographic signatures.
   - Webhooks must be idempotent: processing the same payment ID twice must not result in duplicate order fulfillment or inventory decrement.

---

## 2. Frontend & UI/UX Standards

1. **Brand Identity & Aesthetics:**
   - Maintain a crisp, professional palette:
     - Backgrounds: Clean whites (`#FFFFFF`), light surfaces (`#F8FAFC`, `#F1F5F9`).
     - Primary Brand Accent: Trustworthy enterprise blue (`#1E40AF` / `#2563EB`).
     - Supporting Tones: Slate grays (`#0F172A`, `#334155`, `#64748B`), Emerald green for in-stock/success (`#10B981`), Amber for warnings/stars (`#F59E0B`), Crimson for errors/discounts (`#EF4444`).
   - Use modern typography with high legibility (Inter / Outfit / sans-serif stack).

2. **No Dead Buttons or Simulated UI:**
   - Every button, dropdown, search bar, and link MUST perform a real, working action or display an informative status.
   - Do not display mock metrics or fake charts with hardcoded values in seller/admin dashboards; bind all metrics to real API endpoints.

3. **Responsive & Adaptive:**
   - Mobile-first architecture: Ensure zero horizontal overflow and full touch ergonomics on screen widths from 375px up to 4K displays.
   - Use responsive grid layouts (`grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4`).

4. **Feedback & Micro-Interactions:**
   - Provide skeleton loaders or spinners for asynchronous states.
   - Display toast notifications for key events (e.g., "Added to Cart", "Item removed", "Address saved").
   - Require confirmation dialogs before destructive actions (e.g., deleting a product, cancelling an order).

---

## 3. Code Quality & Modularity

1. **Backend Layering:**
   - **Routers (`/api/v1/`):** Handle HTTP status codes, request parsing, and dependency injection.
   - **Schemas (`/schemas/`):** Pydantic models for request validation and response serialization.
   - **Services (`/services/`):** Pure business logic, pricing math, order orchestration, and payment interfacing.
   - **Models (`/models/`):** SQLAlchemy ORM models with explicit column types, constraints, relationships, and foreign keys.
   - **Database (`/database/`):** Session factory, engine configuration, and base declarative classes.

2. **Frontend Layering:**
   - **Pages (`/pages/`):** Route-level containers representing full screen views.
   - **Components (`/components/`):** Reusable UI blocks separated into `common/`, `layout/`, `catalog/`, `checkout/`, `dashboard/`.
   - **Context (`/context/`):** Shared reactive global state (Auth, Cart, Wishlist, Toast).
   - **Services (`/services/`):** Axios API wrappers organized by domain (`api.js`, `productService.js`, `orderService.js`).

3. **Incremental Development Protocol:**
   - Build phase by phase.
   - Explain the purpose and architecture of every file created.
   - Provide complete, robust, ready-to-execute code (NO placeholders, NO `// TODO: implement later` in core paths).
   - Test and verify each phase before moving forward.
   - Keep the project runnable and stable at the end of every phase.
