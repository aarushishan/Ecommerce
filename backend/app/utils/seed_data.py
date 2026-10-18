import logging
from decimal import Decimal
from sqlalchemy.orm import Session
from app.models.user import Role, User, Address
from app.models.seller import SellerProfile
from app.models.product import Category, Product, ProductImage, ProductVariant, Inventory
from app.models.review import Review
from app.models.cart import Cart
from app.core.security import get_password_hash

logger = logging.getLogger("shopsphere.seed")


def seed_demo_accounts(db: Session):
    """Seed baseline demo accounts for Customer, Seller, and Admin."""
    customer_role = db.query(Role).filter(Role.name == "CUSTOMER").first()
    seller_role = db.query(Role).filter(Role.name == "SELLER").first()
    admin_role = db.query(Role).filter(Role.name == "ADMIN").first()

    # 1. Demo Customer
    customer_user = db.query(User).filter(User.email == "customer@shopsphere.com").first()
    if not customer_user:
        customer_user = User(
            email="customer@shopsphere.com",
            hashed_password=get_password_hash("Customer123!"),
            first_name="Aarav",
            last_name="Sharma",
            phone_number="+91 9988776655",
            role_id=customer_role.id if customer_role else 1,
            is_active=True,
            is_verified=True
        )
        db.add(customer_user)
        db.flush()

        # Seed Cart
        db.add(Cart(user_id=customer_user.id))

        # Seed default address
        addr = Address(
            user_id=customer_user.id,
            full_name="Aarav Sharma",
            phone_number="+91 9988776655",
            address_line1="402, Highrise Tower, 12th Main Road, Indiranagar",
            address_line2="Near Metro Station",
            city="Bengaluru",
            state="Karnataka",
            postal_code="560038",
            country="India",
            is_default=True
        )
        db.add(addr)

    # 2. Demo Seller
    seller_user = db.query(User).filter(User.email == "seller@shopsphere.com").first()
    if not seller_user:
        seller_user = User(
            email="seller@shopsphere.com",
            hashed_password=get_password_hash("Seller123!"),
            first_name="ShopSphere",
            last_name="Prime Retail",
            phone_number="+91 9876543210",
            role_id=seller_role.id if seller_role else 2,
            is_active=True,
            is_verified=True
        )
        db.add(seller_user)
        db.flush()

    seller_profile = db.query(SellerProfile).filter(SellerProfile.user_id == seller_user.id).first()
    if not seller_profile:
        seller_profile = SellerProfile(
            user_id=seller_user.id,
            store_name="ShopSphere Prime Retail",
            store_slug="shopsphere-prime",
            description="Official flagship merchant store for authentic premium products with 100% genuine warranty.",
            tax_id="GSTIN29AAACS1234A1Z5",
            is_approved=True
        )
        db.add(seller_profile)

    # 3. Demo Admin
    admin_user = db.query(User).filter(User.email == "admin@shopsphere.com").first()
    if not admin_user:
        admin_user = User(
            email="admin@shopsphere.com",
            hashed_password=get_password_hash("Admin123!"),
            first_name="Platform",
            last_name="Administrator",
            phone_number="+91 9999900000",
            role_id=admin_role.id if admin_role else 3,
            is_active=True,
            is_verified=True
        )
        db.add(admin_user)

    db.commit()


def seed_catalog_if_empty(db: Session):
    """
    Seeds initial realistic categories, products, images, variants,
    inventory, and reviews if the database catalog is empty.
    """
    seed_demo_accounts(db)

    if db.query(Product).first():
        logger.info("Catalog already seeded. Skipping initial product seed.")
        return

    logger.info("Seeding rich initial product catalog for ShopSphere...")
    seller_user = db.query(User).filter(User.email == "seller@shopsphere.com").first()
    seller_profile = db.query(SellerProfile).filter(SellerProfile.user_id == seller_user.id).first()

    # 2. Seed Categories
    category_map = {}
    categories_data = [
        {"name": "Electronics & Gadgets", "slug": "electronics", "image_url": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80"},
        {"name": "Audio & Headphones", "slug": "audio", "image_url": "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=600&q=80"},
        {"name": "Laptops & Computing", "slug": "laptops", "image_url": "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&q=80"},
        {"name": "Smartphones & Mobile", "slug": "smartphones", "image_url": "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&q=80"},
        {"name": "Wearables & Smartwatches", "slug": "wearables", "image_url": "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80"},
        {"name": "Fashion & Lifestyle", "slug": "fashion", "image_url": "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=600&q=80"},
    ]

    for c in categories_data:
        cat = db.query(Category).filter(Category.slug == c["slug"]).first()
        if not cat:
            cat = Category(name=c["name"], slug=c["slug"], image_url=c["image_url"], is_active=True)
            db.add(cat)
            db.flush()
        category_map[c["slug"]] = cat.id

    # 3. Seed Realistic Products with Images, Variants, Stock, and Reviews
    products_catalog = [
        {
            "title": "AuraPro Wireless Noise Cancelling Headphones",
            "slug": "aurapro-wireless-noise-cancelling-headphones",
            "category_slug": "audio",
            "brand": "SoundAura",
            "description": "Experience acoustic perfection with AuraPro Studio ANC Headphones. Engineered with 40mm custom planar drivers, 45-hour battery life, hybrid active noise cancellation, and ultra-plush memory foam earcups.",
            "base_price": Decimal("24999.00"),
            "discount_price": Decimal("18999.00"),
            "rating_avg": Decimal("4.80"),
            "rating_count": 142,
            "is_featured": True,
            "images": [
                {"image_url": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80", "alt_text": "AuraPro Black Edition Front View", "sort_order": 0},
                {"image_url": "https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800&q=80", "alt_text": "AuraPro Side Angle", "sort_order": 1},
                {"image_url": "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&q=80", "alt_text": "AuraPro Lifestyle Shot", "sort_order": 2},
            ],
            "variants": [
                {"sku": "AURA-PRO-BLK", "title": "Midnight Black", "stock": 45, "attributes": {"color": "Midnight Black"}},
                {"sku": "AURA-PRO-SLV", "title": "Silver Birch", "stock": 28, "attributes": {"color": "Silver Birch"}},
            ],
            "reviews": [
                {"rating": 5, "title": "Best ANC in this price segment!", "comment": "Soundstage is magnificent, and the ANC rivals pairs that cost twice as much. Battery lasts forever."},
                {"rating": 5, "title": "Premium build quality", "comment": "The memory foam cushions feel like clouds. Very comfortable during long coding sessions."}
            ]
        },
        {
            "title": "Zenith UltraBook 15 Pro — 16GB RAM / 1TB SSD",
            "slug": "zenith-ultrabook-15-pro",
            "category_slug": "laptops",
            "brand": "Zenith",
            "description": "Engineered for creators and software architects. Powered by the latest 10-core high-efficiency processor, breathtaking 120Hz 3K OLED InfinityDisplay, edge-to-edge glass trackpad, and thunderbolt 4 ports.",
            "base_price": Decimal("129999.00"),
            "discount_price": Decimal("114999.00"),
            "rating_avg": Decimal("4.90"),
            "rating_count": 89,
            "is_featured": True,
            "images": [
                {"image_url": "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&q=80", "alt_text": "Zenith UltraBook Front Screen", "sort_order": 0},
                {"image_url": "https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=800&q=80", "alt_text": "Zenith UltraBook Slender Profile", "sort_order": 1},
            ],
            "variants": [
                {"sku": "ZENITH-15-16-1TB", "title": "16GB RAM / 1TB SSD", "stock": 18, "attributes": {"ram": "16GB", "storage": "1TB"}},
                {"sku": "ZENITH-15-32-2TB", "title": "32GB RAM / 2TB SSD", "price_override": Decimal("134999.00"), "stock": 9, "attributes": {"ram": "32GB", "storage": "2TB"}},
            ],
            "reviews": [
                {"rating": 5, "title": "Unmatched speed and thermals", "comment": "Compiling full-stack projects in seconds. OLED screen is sublime."}
            ]
        },
        {
            "title": "SphereWatch Apex Smartwatch & Fitness Monitor",
            "slug": "spherewatch-apex-smartwatch",
            "category_slug": "wearables",
            "brand": "SphereTech",
            "description": "Keep track of your health, workouts, and notifications. Equipped with Sapphire Crystal glass, Titanium bezel, SpO2 sensor, ECG tracking, 50m water resistance, and always-on Retina display.",
            "base_price": Decimal("18999.00"),
            "discount_price": Decimal("14499.00"),
            "rating_avg": Decimal("4.70"),
            "rating_count": 215,
            "is_featured": True,
            "images": [
                {"image_url": "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80", "alt_text": "SphereWatch Apex White Band", "sort_order": 0},
                {"image_url": "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800&q=80", "alt_text": "SphereWatch Apex Display", "sort_order": 1},
            ],
            "variants": [
                {"sku": "SPHERE-WATCH-SLV", "title": "Silver Titanium / White Band", "stock": 30, "attributes": {"color": "Silver"}},
                {"sku": "SPHERE-WATCH-BLK", "title": "Midnight Black / Sport Loop", "stock": 25, "attributes": {"color": "Black"}},
            ],
            "reviews": [
                {"rating": 5, "title": "Super accurate heart rate monitor", "comment": "GPS connects in seconds. Battery easily lasts 3 full days."}
            ]
        },
        {
            "title": "Nova 14 Pro 5G Smartphone — 256GB Titanium",
            "slug": "nova-14-pro-5g-smartphone",
            "category_slug": "smartphones",
            "brand": "NovaMobile",
            "description": "Next-generation camera powerhouse with a 200MP Quad-Bayer optical sensor, 120Hz ProMotion AMOLED screen, Aerospace titanium casing, and lightning-fast 5G connectivity.",
            "base_price": Decimal("84999.00"),
            "discount_price": Decimal("77999.00"),
            "rating_avg": Decimal("4.75"),
            "rating_count": 310,
            "is_featured": True,
            "images": [
                {"image_url": "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80", "alt_text": "Nova 14 Pro Front", "sort_order": 0},
                {"image_url": "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800&q=80", "alt_text": "Nova 14 Pro Triple Camera", "sort_order": 1},
            ],
            "variants": [
                {"sku": "NOVA14-256-GRY", "title": "Natural Titanium / 256GB", "stock": 35, "attributes": {"storage": "256GB", "color": "Titanium"}},
                {"sku": "NOVA14-512-BLU", "title": "Deep Ocean Blue / 512GB", "price_override": Decimal("87999.00"), "stock": 14, "attributes": {"storage": "512GB", "color": "Deep Ocean"}},
            ],
            "reviews": [
                {"rating": 5, "title": "Incredible camera in low light", "comment": "Night mode is miraculous. Battery lasts 1.5 days easily."}
            ]
        },
        {
            "title": "SoundPulse True Wireless Earbuds with Wireless Case",
            "slug": "soundpulse-true-wireless-earbuds",
            "category_slug": "audio",
            "brand": "SoundAura",
            "description": "Compact, featherweight design with studio-tuned bass, environmental noise cancelling microphones, IPX7 sweat resistance, and Qi-compatible fast charging case.",
            "base_price": Decimal("6999.00"),
            "discount_price": Decimal("4499.00"),
            "rating_avg": Decimal("4.60"),
            "rating_count": 98,
            "is_featured": False,
            "images": [
                {"image_url": "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&q=80", "alt_text": "SoundPulse Earbuds in Case", "sort_order": 0},
            ],
            "variants": [
                {"sku": "SOUND-PULSE-WHT", "title": "Glacier White", "stock": 60, "attributes": {"color": "White"}},
                {"sku": "SOUND-PULSE-BLK", "title": "Matte Charcoal", "stock": 42, "attributes": {"color": "Charcoal"}},
            ],
            "reviews": [
                {"rating": 4, "title": "Crisp highs and punchy bass", "comment": "Great fit for gym and running. Doesn't fall out."}
            ]
        },
        {
            "title": "Lumina Mechanical Keyboard — RGB Hot-Swappable",
            "slug": "lumina-mechanical-keyboard-rgb",
            "category_slug": "electronics",
            "brand": "LuminaKey",
            "description": "Custom mechanical typing feel. Features pre-lubed Gateron Yellow switches, sound-dampening silicone foam, PBT double-shot keycaps, and per-key RGB backlighting.",
            "base_price": Decimal("8999.00"),
            "discount_price": Decimal("6499.00"),
            "rating_avg": Decimal("4.85"),
            "rating_count": 174,
            "is_featured": False,
            "images": [
                {"image_url": "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&q=80", "alt_text": "Lumina Mechanical Keyboard Overhead", "sort_order": 0},
            ],
            "variants": [
                {"sku": "LUMINA-65-YEL", "title": "65% Compact / Yellow Switches", "stock": 25, "attributes": {"layout": "65%", "switch": "Yellow"}},
                {"sku": "LUMINA-75-RED", "title": "75% Layout / Red Switches", "stock": 19, "attributes": {"layout": "75%", "switch": "Red"}},
            ],
            "reviews": [
                {"rating": 5, "title": "Creamy typing sound!", "comment": "The factory lubing is so good. Best keyboard under ₹10k by a mile."}
            ]
        },
        {
            "title": "Minimalist Oxford Tailored Cotton Shirt",
            "slug": "minimalist-oxford-tailored-cotton-shirt",
            "category_slug": "fashion",
            "brand": "SphereWear",
            "description": "Crafted from 100% long-staple organic Egyptian cotton. Breathable, wrinkle-resistant weave tailored for all-day comfort and timeless understated elegance.",
            "base_price": Decimal("3499.00"),
            "discount_price": Decimal("2199.00"),
            "rating_avg": Decimal("4.50"),
            "rating_count": 62,
            "is_featured": False,
            "images": [
                {"image_url": "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&q=80", "alt_text": "Oxford Shirt Classic Fit", "sort_order": 0},
            ],
            "variants": [
                {"sku": "SHIRT-OXF-WHT-M", "title": "Crisp White / M", "stock": 35, "attributes": {"size": "M", "color": "White"}},
                {"sku": "SHIRT-OXF-BLU-L", "title": "Sky Blue / L", "stock": 22, "attributes": {"size": "L", "color": "Sky Blue"}},
            ],
            "reviews": [
                {"rating": 5, "title": "Superior fabric quality", "comment": "Fits like a glove and feels luxurious."}
            ]
        },
        {
            "title": "Apex Gaming Precision Wireless Mouse — 26,000 DPI",
            "slug": "apex-gaming-precision-wireless-mouse",
            "category_slug": "electronics",
            "brand": "ApexGear",
            "description": "Ultra-lightweight 58-gram honeycomb frame with optical micro-switches, 0.2ms click response time, and 4K polling wireless receiver.",
            "base_price": Decimal("6999.00"),
            "discount_price": Decimal("4999.00"),
            "rating_avg": Decimal("4.70"),
            "rating_count": 83,
            "is_featured": False,
            "images": [
                {"image_url": "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=800&q=80", "alt_text": "Apex Gaming Mouse Top View", "sort_order": 0},
            ],
            "variants": [
                {"sku": "APEX-MOUSE-WHT", "title": "Chalk White", "stock": 32, "attributes": {"color": "White"}},
                {"sku": "APEX-MOUSE-BLK", "title": "Stealth Black", "stock": 40, "attributes": {"color": "Black"}},
            ],
            "reviews": [
                {"rating": 5, "title": "Glides like ice on glass", "comment": "Sensor tracking is 100% flawless in competitive shooters."}
            ]
        }
    ]

    for p_data in products_catalog:
        cat_id = category_map.get(p_data["category_slug"])
        if not cat_id:
            continue

        product = Product(
            seller_id=seller_profile.id,
            category_id=cat_id,
            title=p_data["title"],
            slug=p_data["slug"],
            brand=p_data["brand"],
            description=p_data["description"],
            base_price=p_data["base_price"],
            discount_price=p_data["discount_price"],
            rating_avg=p_data["rating_avg"],
            rating_count=p_data["rating_count"],
            is_active=True,
            is_featured=p_data.get("is_featured", False)
        )
        db.add(product)
        db.flush()

        # Add Images
        for img_data in p_data.get("images", []):
            img = ProductImage(
                product_id=product.id,
                image_url=img_data["image_url"],
                alt_text=img_data.get("alt_text"),
                sort_order=img_data.get("sort_order", 0)
            )
            db.add(img)

        # Add Variants and Inventory
        for v_data in p_data.get("variants", []):
            variant = ProductVariant(
                product_id=product.id,
                sku=v_data["sku"],
                title=v_data["title"],
                price_override=v_data.get("price_override"),
                attributes=v_data.get("attributes", {})
            )
            db.add(variant)
            db.flush()

            inv = Inventory(
                variant_id=variant.id,
                quantity=v_data.get("stock", 20),
                reserved_qty=0,
                low_stock_threshold=5
            )
            db.add(inv)

        # Add Reviews
        for r_data in p_data.get("reviews", []):
            rev = Review(
                user_id=seller_user.id,
                product_id=product.id,
                rating=r_data["rating"],
                title=r_data["title"],
                comment=r_data["comment"],
                is_verified=True,
                is_approved=True
            )
            db.add(rev)

    db.commit()
    logger.info("Successfully seeded ShopSphere catalog with realistic products.")
