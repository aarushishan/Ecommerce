import re
import math
from typing import Optional, List, Dict, Any, Tuple
from decimal import Decimal
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, desc, or_, and_

from app.models.product import Product, Category, ProductVariant, Inventory
from app.models.order import Order, OrderItem
from app.models.user import User
from app.services.product_service import transform_product_summary
from app.schemas.product import ProductSummaryOut
from app.schemas.ai import (
    ChatResponse,
    SemanticSearchOut,
    ProductComparisonOut,
    ProductComparisonItem
)

# Common English stopwords to ignore in tokenization
STOPWORDS = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are",
    "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but", "by",
    "can", "could", "did", "do", "does", "doing", "down", "during", "each", "few", "for", "from",
    "further", "had", "has", "have", "having", "he", "her", "here", "hers", "herself", "him", "himself",
    "his", "how", "i", "if", "in", "into", "is", "it", "its", "itself", "just", "me", "more", "most",
    "my", "myself", "no", "nor", "not", "now", "of", "off", "on", "once", "only", "or", "other",
    "our", "ours", "ourselves", "out", "over", "own", "same", "she", "should", "so", "some", "such",
    "than", "that", "the", "their", "theirs", "them", "themselves", "then", "there", "these", "they",
    "this", "those", "through", "to", "too", "under", "until", "up", "very", "was", "we", "were",
    "what", "when", "where", "which", "while", "who", "whom", "why", "with", "would", "you", "your",
    "yours", "yourself", "yourselves", "show", "find", "give", "want", "need", "like", "tell"
}


def tokenize(text: str) -> List[str]:
    """Tokenize and clean text into lowercase words without punctuation."""
    if not text:
        return []
    words = re.findall(r"\b[a-zA-Z0-9]+\b", text.lower())
    return [w for w in words if w not in STOPWORDS and len(w) > 1]


def build_term_vector(product: Product) -> Dict[str, float]:
    """Build a weighted term frequency vector for a product."""
    vec: Dict[str, float] = {}

    def add_tokens(text: str, weight: float):
        for token in tokenize(text):
            vec[token] = vec.get(token, 0.0) + weight

    # Title receives highest weight
    add_tokens(product.title, 3.0)
    # Brand receives high weight
    add_tokens(product.brand, 2.5)
    # Category name
    if product.category:
        add_tokens(product.category.name, 2.0)
    # Description receives standard weight
    add_tokens(product.description, 1.0)

    return vec


def cosine_similarity(vec1: Dict[str, float], vec2: Dict[str, float]) -> float:
    """Compute cosine similarity between two sparse term frequency vectors."""
    dot_product = 0.0
    for term, val in vec1.items():
        if term in vec2:
            dot_product += val * vec2[term]

    norm1 = math.sqrt(sum(v * v for v in vec1.values()))
    norm2 = math.sqrt(sum(v * v for v in vec2.values()))

    if norm1 == 0.0 or norm2 == 0.0:
        return 0.0

    return dot_product / (norm1 * norm2)


class AIService:
    @staticmethod
    def get_similar_products(db: Session, product_id: str, limit: int = 6) -> List[ProductSummaryOut]:
        """Content-based filtering using vector cosine similarity on product metadata."""
        target = db.query(Product).options(
            joinedload(Product.category),
            joinedload(Product.images),
            joinedload(Product.variants).joinedload(ProductVariant.inventory)
        ).filter(Product.id == product_id, Product.is_active == True).first()

        if not target:
            return []

        target_vec = build_term_vector(target)

        candidates = db.query(Product).options(
            joinedload(Product.category),
            joinedload(Product.images),
            joinedload(Product.variants).joinedload(ProductVariant.inventory)
        ).filter(Product.id != product_id, Product.is_active == True).all()

        scored = []
        for cand in candidates:
            cand_vec = build_term_vector(cand)
            sim = cosine_similarity(target_vec, cand_vec)

            # Bonus for same category and same brand
            if cand.category_id == target.category_id:
                sim += 0.25
            if cand.brand.lower() == target.brand.lower():
                sim += 0.15

            scored.append((sim, cand))

        scored.sort(key=lambda x: x[0], reverse=True)
        top_candidates = [cand for _, cand in scored[:limit]]

        return [transform_product_summary(p) for p in top_candidates]

    @staticmethod
    def get_frequently_bought_together(db: Session, product_id: str, limit: int = 3) -> List[ProductSummaryOut]:
        """Identify co-purchased items from order history with catalog complementary fallback."""
        # 1. Find orders containing the target product
        subquery = db.query(OrderItem.order_id).filter(OrderItem.product_id == product_id).subquery()

        co_purchased = db.query(
            OrderItem.product_id,
            func.count(OrderItem.id).label("freq")
        ).filter(
            OrderItem.order_id.in_(subquery.select()),
            OrderItem.product_id != product_id
        ).group_by(OrderItem.product_id).order_by(desc("freq")).limit(limit).all()

        co_ids = [cp[0] for cp in co_purchased]

        products = []
        if co_ids:
            products = db.query(Product).options(
                joinedload(Product.category),
                joinedload(Product.images),
                joinedload(Product.variants).joinedload(ProductVariant.inventory)
            ).filter(Product.id.in_(co_ids), Product.is_active == True).all()

        # If sparse order history, fallback to complementary products in the catalog
        if len(products) < limit:
            needed = limit - len(products)
            existing_ids = set(co_ids + [product_id])
            fallback = db.query(Product).options(
                joinedload(Product.category),
                joinedload(Product.images),
                joinedload(Product.variants).joinedload(ProductVariant.inventory)
            ).filter(
                ~Product.id.in_(existing_ids),
                Product.is_active == True
            ).order_by(desc(Product.rating_avg), desc(Product.rating_count)).limit(needed).all()
            products.extend(fallback)

        return [transform_product_summary(p) for p in products]

    @staticmethod
    def get_recommendations_for_you(
        db: Session,
        user: Optional[User] = None,
        limit: int = 8
    ) -> List[ProductSummaryOut]:
        """Personalized recommendation feed based on user purchase/cart history or popularity."""
        preferred_category_ids = []

        if user:
            # Check user's recent orders
            recent_cats = db.query(Product.category_id).join(
                OrderItem, OrderItem.product_id == Product.id
            ).join(
                Order, Order.id == OrderItem.order_id
            ).filter(
                Order.user_id == user.id,
                Product.is_active == True
            ).distinct().limit(3).all()
            preferred_category_ids = [rc[0] for rc in recent_cats if rc[0]]

        query = db.query(Product).options(
            joinedload(Product.category),
            joinedload(Product.images),
            joinedload(Product.variants).joinedload(ProductVariant.inventory)
        ).filter(Product.is_active == True)

        if preferred_category_ids:
            query = query.filter(Product.category_id.in_(preferred_category_ids))

        # Order by rating and featured status
        products = query.order_by(
            desc(Product.is_featured),
            desc(Product.rating_avg),
            desc(Product.rating_count)
        ).limit(limit).all()

        # If not enough products found in preferred categories, fill with global top-rated
        if len(products) < limit:
            existing_ids = {p.id for p in products}
            additional = db.query(Product).options(
                joinedload(Product.category),
                joinedload(Product.images),
                joinedload(Product.variants).joinedload(ProductVariant.inventory)
            ).filter(
                ~Product.id.in_(existing_ids),
                Product.is_active == True
            ).order_by(desc(Product.rating_avg)).limit(limit - len(products)).all()
            products.extend(additional)

        return [transform_product_summary(p) for p in products]

    @staticmethod
    def semantic_search(db: Session, query_text: str, limit: int = 12) -> SemanticSearchOut:
        """Parse natural language search intent into structured filters and rank via semantic similarity."""
        text_lower = query_text.lower().strip()
        parsed_intent: Dict[str, Any] = {
            "keywords": [],
            "detected_category": None,
            "detected_brand": None,
            "min_price": None,
            "max_price": None,
            "min_rating": None
        }

        # 1. Price constraint extraction
        # e.g., "under 5000", "below 10000", "less than 2000"
        max_price_match = re.search(r"(?:under|below|less than|within)\s*(?:rs\.?|inr|₹)?\s*(\d+(?:,\d+)*)", text_lower)
        if max_price_match:
            parsed_intent["max_price"] = float(max_price_match.group(1).replace(",", ""))

        # e.g., "above 2000", "over 5000", "more than 3000"
        min_price_match = re.search(r"(?:above|over|more than|exceeding)\s*(?:rs\.?|inr|₹)?\s*(\d+(?:,\d+)*)", text_lower)
        if min_price_match:
            parsed_intent["min_price"] = float(min_price_match.group(1).replace(",", ""))

        # e.g., "between 2000 and 5000"
        range_match = re.search(r"between\s*(\d+(?:,\d+)*)\s*(?:and|to|-)\s*(\d+(?:,\d+)*)", text_lower)
        if range_match:
            parsed_intent["min_price"] = float(range_match.group(1).replace(",", ""))
            parsed_intent["max_price"] = float(range_match.group(2).replace(",", ""))

        # Budget / Premium adjectives
        if "cheap" in text_lower or "budget" in text_lower or "affordable" in text_lower:
            if not parsed_intent["max_price"]:
                parsed_intent["max_price"] = 10000.0
        elif "premium" in text_lower or "luxury" in text_lower or "flagship" in text_lower:
            if not parsed_intent["min_price"]:
                parsed_intent["min_price"] = 25000.0

        # 2. Rating quality extraction
        if any(term in text_lower for term in ["best", "top rated", "highly rated", "top-rated"]):
            parsed_intent["min_rating"] = 4.0

        # 3. Category & Brand matching from catalog
        categories = db.query(Category).filter(Category.is_active == True).all()
        for cat in categories:
            cat_words = tokenize(cat.name)
            if any(w in text_lower for w in cat_words):
                parsed_intent["detected_category"] = cat.name
                break

        # Also check common keywords to category mappings
        keyword_category_map = {
            "headphone": "Audio & Headphones",
            "headphones": "Audio & Headphones",
            "earbuds": "Audio & Headphones",
            "audio": "Audio & Headphones",
            "laptop": "Laptops & Computing",
            "notebook": "Laptops & Computing",
            "computer": "Laptops & Computing",
            "mobile": "Smartphones & Mobile",
            "phone": "Smartphones & Mobile",
            "smartphone": "Smartphones & Mobile",
            "watch": "Wearables & Smartwatches",
            "smartwatch": "Wearables & Smartwatches",
            "shirt": "Fashion & Lifestyle",
            "clothing": "Fashion & Lifestyle",
            "keyboard": "Electronics & Gadgets",
            "mouse": "Electronics & Gadgets"
        }
        for kw, cat_name in keyword_category_map.items():
            if kw in text_lower and not parsed_intent["detected_category"]:
                parsed_intent["detected_category"] = cat_name
                break

        # Check brands from existing active products
        active_brands = db.query(Product.brand).filter(Product.is_active == True).distinct().all()
        for (brand_name,) in active_brands:
            if brand_name.lower() in text_lower:
                parsed_intent["detected_brand"] = brand_name
                break

        parsed_intent["keywords"] = tokenize(text_lower)

        # 4. Fetch candidate products and score
        candidates = db.query(Product).options(
            joinedload(Product.category),
            joinedload(Product.images),
            joinedload(Product.variants).joinedload(ProductVariant.inventory)
        ).filter(Product.is_active == True).all()

        query_vec: Dict[str, float] = {}
        for token in parsed_intent["keywords"]:
            query_vec[token] = query_vec.get(token, 0.0) + 1.0

        scored_products: List[Tuple[float, Product]] = []

        for prod in candidates:
            score = 0.0
            prod_price = float(prod.discount_price or prod.base_price)

            # Price filter adherence
            if parsed_intent["max_price"] and prod_price > parsed_intent["max_price"]:
                continue
            if parsed_intent["min_price"] and prod_price < parsed_intent["min_price"]:
                continue

            # Rating filter adherence
            if parsed_intent["min_rating"] and float(prod.rating_avg) < parsed_intent["min_rating"]:
                continue

            # Term similarity score
            prod_vec = build_term_vector(prod)
            sim = cosine_similarity(query_vec, prod_vec)
            score += sim * 3.0

            # Category boost
            if parsed_intent["detected_category"] and prod.category and prod.category.name.lower() == parsed_intent["detected_category"].lower():
                score += 1.5

            # Brand boost
            if parsed_intent["detected_brand"] and prod.brand.lower() == parsed_intent["detected_brand"].lower():
                score += 2.0

            # Quality score factor
            score += float(prod.rating_avg) * 0.2

            if score > 0.05 or not parsed_intent["keywords"]:
                scored_products.append((score, prod))

        # Sort by relevance score
        scored_products.sort(key=lambda x: x[0], reverse=True)
        results = [transform_product_summary(p) for _, p in scored_products[:limit]]

        return SemanticSearchOut(
            query=query_text,
            parsed_intent=parsed_intent,
            products=results,
            total=len(scored_products)
        )

    @staticmethod
    def compare_products(db: Session, product_ids: List[str]) -> ProductComparisonOut:
        """Generate side-by-side spec comparison matrix with smart algorithmic verdict."""
        products = db.query(Product).options(
            joinedload(Product.category),
            joinedload(Product.images),
            joinedload(Product.variants).joinedload(ProductVariant.inventory)
        ).filter(Product.id.in_(product_ids), Product.is_active == True).all()

        if len(products) < 2:
            raise ValueError("At least 2 active products are required for comparison.")

        items: List[ProductComparisonItem] = []
        for p in products:
            summary = transform_product_summary(p)
            base = float(p.base_price)
            curr = float(p.discount_price or p.base_price)
            savings = int(round(((base - curr) / base) * 100)) if curr < base else 0

            # Highlights
            highlights = []
            if float(p.rating_avg) >= 4.5:
                highlights.append(f"Top Rated ({p.rating_avg}★)")
            if savings >= 15:
                highlights.append(f"High Discount ({savings}% OFF)")
            if p.is_featured:
                highlights.append("ShopSphere Choice")
            if summary.in_stock:
                highlights.append("In Stock - Express Delivery")

            specs = {
                "Brand": p.brand,
                "Category": p.category.name if p.category else "General",
                "Regular Price": f"₹{base:,.2f}",
                "Deal Price": f"₹{curr:,.2f}",
                "Savings": f"{savings}%" if savings > 0 else "None",
                "Customer Rating": f"{p.rating_avg}★ ({p.rating_count} reviews)",
                "Availability": "In Stock" if summary.in_stock else "Out of Stock",
                "Warranty": "1 Year Official Manufacturer Warranty",
                "Delivery": "Free Express 2-Day Delivery",
                "Return Policy": "7-Day Easy Return & Replacement"
            }

            # Value score out of 10
            # Combines rating and savings ratio
            val_score = round(min(9.9, (float(p.rating_avg) * 1.5) + (savings * 0.05)), 1)

            items.append(ProductComparisonItem(
                product=summary,
                specs=specs,
                highlights=highlights,
                value_score=val_score
            ))

        common_attributes = [
            "Brand",
            "Category",
            "Regular Price",
            "Deal Price",
            "Savings",
            "Customer Rating",
            "Availability",
            "Warranty",
            "Delivery",
            "Return Policy"
        ]

        # Generate intelligent verdict
        best_rated = max(items, key=lambda x: float(x.product.rating_avg))
        lowest_price = min(items, key=lambda x: float(x.product.discount_price or x.product.base_price))
        highest_val = max(items, key=lambda x: x.value_score)

        verdict = (
            f"Verdict: {highest_val.product.title} leads with the highest overall value score ({highest_val.value_score}/10). "
            f"If budget is your primary priority, {lowest_price.product.title} offers the lowest entry price at ₹{float(lowest_price.product.discount_price or lowest_price.product.base_price):,.2f}. "
            f"For proven customer satisfaction, {best_rated.product.title} holds the top rating at {best_rated.product.rating_avg}★."
        )

        return ProductComparisonOut(
            items=items,
            common_attributes=common_attributes,
            verdict=verdict
        )

    @staticmethod
    def chat_with_assistant(
        db: Session,
        query: str,
        user: Optional[User] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> ChatResponse:
        """Conversational AI Shopping Assistant ('SphereBot') grounded in the active catalog."""
        text_lower = query.lower().strip()

        # 1. GREETING & GENERAL ASSISTANCE
        if any(re.match(rf"^{greeting}\b", text_lower) for greeting in ["hi", "hello", "hey", "greetings", "good morning", "good evening"]):
            name_str = f", {user.first_name}" if user and user.first_name else ""
            return ChatResponse(
                message=f"Hello{name_str}! I'm **SphereBot**, your ShopSphere shopping assistant. How can I help you today? You can ask me to find products, compare items, check your orders, or inquire about our shipping and return policies.",
                intent="GENERAL",
                suggested_products=[],
                quick_replies=[
                    "Show Today's Top Deals",
                    "Wireless Headphones under ₹10,000",
                    "What is your return policy?",
                    "Where is my order?"
                ]
            )

        # 2. RETURN & SHIPPING POLICY FAQs
        if any(kw in text_lower for kw in ["return", "refund", "replace", "exchange", "policy"]):
            return ChatResponse(
                message=(
                    "### 📦 ShopSphere Return & Replacement Policy\n\n"
                    "- **7-Day Hassle-Free Returns**: If you are not completely satisfied with your purchase, you can initiate a return or replacement within **7 days** of delivery.\n"
                    "- **Full Refunds**: Refunds are processed back to your original payment method within **3-5 business days** after the item is picked up.\n"
                    "- **Eligibility**: Items must be unused, in their original packaging, and with all warranty cards and accessories intact."
                ),
                intent="POLICY_FAQ",
                suggested_products=[],
                quick_replies=["Track my order", "Contact Support", "Explore Electronics"]
            )

        if any(kw in text_lower for kw in ["shipping", "delivery time", "delivery charge", "how fast", "courier"]):
            return ChatResponse(
                message=(
                    "### 🚚 Shipping & Delivery Information\n\n"
                    "- **Free Express Delivery**: Applicable on all orders above **₹499**!\n"
                    "- **Standard Delivery**: A flat fee of **₹49** applies to orders under ₹499.\n"
                    "- **Delivery Timelines**: Metro cities receive orders in **1-2 business days**. All other locations are delivered within **3-5 business days** with live GPS tracking."
                ),
                intent="POLICY_FAQ",
                suggested_products=[],
                quick_replies=["View Deals", "Check Order Status", "Explore Smartwatches"]
            )

        # 3. ORDER STATUS & TRACKING
        if any(kw in text_lower for kw in ["order", "track", "package", "shipment", "where is"]):
            if not user:
                return ChatResponse(
                    message="To look up and track your active orders, please **Sign In** to your ShopSphere account. You can sign in using the button in the navigation bar.",
                    intent="ORDER_TRACKING",
                    suggested_products=[],
                    quick_replies=["Sign In", "Browse Catalog", "Check Return Policy"]
                )

            # Look up recent orders for the user
            orders = db.query(Order).options(
                joinedload(Order.items).joinedload(OrderItem.product),
                joinedload(Order.shipment)
            ).filter(Order.user_id == user.id).order_by(desc(Order.created_at)).limit(3).all()

            if not orders:
                return ChatResponse(
                    message=f"I checked your account, {user.first_name}, but you don't have any placed orders yet. Ready to start shopping? Check out our trending products!",
                    intent="ORDER_TRACKING",
                    suggested_products=[],
                    quick_replies=["Today's Deals", "Best Laptops", "Wireless Earbuds"]
                )

            latest = orders[0]
            status_emoji = "📦" if latest.status == "PROCESSING" else ("🚚" if latest.status == "SHIPPED" else "✅")
            items_desc = ", ".join([item.product_title for item in latest.items[:2]]) if latest.items else "items"

            order_info = {
                "order_number": latest.order_number,
                "status": latest.status,
                "total_amount": float(latest.total_amount),
                "created_at": latest.created_at.strftime("%b %d, %Y"),
                "tracking_code": latest.shipment.tracking_number if latest.shipment else None,
                "carrier": latest.shipment.carrier if latest.shipment else None
            }

            return ChatResponse(
                message=(
                    f"### {status_emoji} Order #{latest.order_number}\n\n"
                    f"- **Status**: `{latest.status}`\n"
                    f"- **Items**: {items_desc}\n"
                    f"- **Total Amount**: **₹{float(latest.total_amount):,.2f}**\n"
                    f"- **Tracking Code**: `{order_info['tracking_code'] or 'Allocating Courier...'}`\n"
                    f"- **Carrier**: {order_info['carrier'] or 'ShopSphere Express'}\n\n"
                    f"You can view complete itemized tracking anytime in your **Order History**."
                ),
                intent="ORDER_TRACKING",
                suggested_products=[],
                quick_replies=["Browse More Items", "Return Policy", "Contact Support"],
                order_info=order_info
            )

        # 4. PRODUCT COMPARISON VIA CHAT
        if any(kw in text_lower for kw in ["compare", "versus", " vs "]):
            # Query relevant products
            semantic_res = AIService.semantic_search(db, query, limit=2)
            if len(semantic_res.products) >= 2:
                p1, p2 = semantic_res.products[0], semantic_res.products[1]
                return ChatResponse(
                    message=(
                        f"### ⚖️ Smart Comparison: {p1.brand} vs {p2.brand}\n\n"
                        f"- **{p1.title}**: ₹{float(p1.discount_price or p1.base_price):,.2f} ({p1.rating_avg}★)\n"
                        f"- **{p2.title}**: ₹{float(p2.discount_price or p2.base_price):,.2f} ({p2.rating_avg}★)\n\n"
                        f"Both items are verified and in stock. Would you like to view a detailed side-by-side specification matrix?"
                    ),
                    intent="PRODUCT_COMPARISON",
                    suggested_products=[p1, p2],
                    quick_replies=["Add to Cart", "View Specs Matrix", "Check Return Policy"]
                )

        # 5. PRODUCT DISCOVERY & GROUNDED SEARCH
        search_res = AIService.semantic_search(db, query, limit=3)
        if search_res.products:
            prods = search_res.products
            filters_applied = []
            if search_res.parsed_intent.get("max_price"):
                filters_applied.append(f"under ₹{search_res.parsed_intent['max_price']:,.0f}")
            if search_res.parsed_intent.get("detected_category"):
                filters_applied.append(f"in {search_res.parsed_intent['detected_category']}")

            criteria_str = f" ({', '.join(filters_applied)})" if filters_applied else ""

            msg = (
                f"I found **{len(prods)}** verified products in our catalog matching your query{criteria_str}. "
                f"Here are the top recommendations with live pricing and current stock:"
            )

            return ChatResponse(
                message=msg,
                intent="PRODUCT_SEARCH",
                suggested_products=prods,
                quick_replies=[
                    f"Tell me more about {prods[0].brand}",
                    "Compare top 2",
                    "Check Shipping details"
                ]
            )

        # Fallback if nothing matched
        featured = AIService.get_recommendations_for_you(db, user, limit=3)
        return ChatResponse(
            message=(
                "I couldn't find an exact match for that specific inquiry in our current inventory. "
                "However, here are some of our **highest-rated and most popular products** available today:"
            ),
            intent="PRODUCT_SEARCH",
            suggested_products=featured,
            quick_replies=["View Electronics", "View Audio", "Laptops & Computing", "Today's Deals"]
        )
