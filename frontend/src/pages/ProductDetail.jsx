import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Star, 
  Heart, 
  ShoppingCart, 
  Zap, 
  ShieldCheck, 
  Truck, 
  RotateCcw, 
  Check, 
  Plus, 
  Minus, 
  MapPin, 
  ChevronRight,
  Share2,
  CheckCircle2,
  PackageOpen,
  Sparkles,
  Scale
} from 'lucide-react';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Skeleton from '../components/common/Skeleton';
import ProductCard from '../components/catalog/ProductCard';
import { getProductBySlug, getRelatedProducts } from '../services/productService';
import { getSimilarProducts, getFrequentlyBoughtTogether } from '../services/aiService';
import { formatPrice } from '../utils/formatters';
import { useCart } from '../context/CartContext';
import { useCompare } from '../context/CompareContext';

export const ProductDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addToCart, toggleWishlist, isWishlisted } = useCart();
  const { addToCompare, openCompareModal, isInCompare } = useCompare();

  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [similarProducts, setSimilarProducts] = useState([]);
  const [fbtProducts, setFbtProducts] = useState([]);
  const [selectedBundleItemIds, setSelectedBundleItemIds] = useState([]);
  const [isBundleAdded, setIsBundleAdded] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [pincode, setPincode] = useState('');
  const [pincodeChecked, setPincodeChecked] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDetails = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getProductBySlug(slug);
        setProduct(data);
        if (data.variants && data.variants.length > 0) {
          setSelectedVariant(data.variants[0]);
        }

        // Parallel load related, AI similar, and frequently bought together items
        const [related, similar, fbt] = await Promise.all([
          getRelatedProducts(data.id, 4).catch(() => []),
          getSimilarProducts(data.id, 4).catch(() => []),
          getFrequentlyBoughtTogether(data.id, 2).catch(() => []),
        ]);

        setRelatedProducts(related);
        setSimilarProducts(similar);
        setFbtProducts(fbt);
        // Pre-select main product and complementary items for bundle
        setSelectedBundleItemIds([data.id, ...fbt.map((x) => x.id)]);
      } catch (err) {
        console.error('Failed to load product details:', err);
        setError(err.message || 'Product not found');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetails();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [slug]);

  const toggleBundleItem = (id) => {
    setSelectedBundleItemIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleAddBundleToCart = async () => {
    if (!product) return;
    setIsBundleAdded(true);
    try {
      // Add main product if selected
      if (selectedBundleItemIds.includes(product.id)) {
        await addToCart(product, 1, selectedVariant);
      }
      // Add selected complementary items
      for (const item of fbtProducts) {
        if (selectedBundleItemIds.includes(item.id)) {
          await addToCart(item, 1);
        }
      }
      setTimeout(() => setIsBundleAdded(false), 2500);
    } catch (err) {
      console.error('Failed to add bundle to cart:', err);
      setIsBundleAdded(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <Skeleton height="20px" width="240px" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <Skeleton height="450px" className="w-full rounded-2xl" />
          <div className="space-y-4">
            <Skeleton height="32px" width="80%" />
            <Skeleton height="24px" width="40%" />
            <Skeleton height="100px" width="100%" />
            <Skeleton height="48px" width="50%" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <PackageOpen className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Product Not Found</h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          The product you are looking for does not exist or may have been unlisted.
        </p>
        <Button onClick={() => navigate('/catalog')}>Return to Catalog</Button>
      </div>
    );
  }

  // Determine current active price (with variant override if applicable)
  const currentBasePrice = selectedVariant?.price_override || product.base_price;
  const currentDiscountPrice = selectedVariant?.price_override
    ? null
    : product.discount_price;
  const activePrice = currentDiscountPrice || currentBasePrice;
  const availableStock = selectedVariant ? selectedVariant.stock_quantity : product.total_stock;

  const handleAddToCart = async () => {
    if (availableStock <= 0 || !selectedVariant) return;
    const res = await addToCart(product.id, selectedVariant.id, quantity);
    if (res.success) {
      setIsAdded(true);
      setTimeout(() => setIsAdded(false), 2000);
    }
  };

  const handleBuyNow = async () => {
    if (availableStock <= 0 || !selectedVariant) return;
    const res = await addToCart(product.id, selectedVariant.id, quantity);
    if (res.success) {
      navigate('/checkout');
    }
  };

  const handlePincodeSubmit = (e) => {
    e.preventDefault();
    if (pincode.trim().length === 6) {
      setPincodeChecked(true);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-16">
      {/* Breadcrumb Navigation */}
      <nav className="text-xs font-semibold text-slate-400 flex items-center gap-2 flex-wrap">
        <a href="/" className="hover:text-brand-600 transition-colors">Home</a>
        <ChevronRight className="w-3.5 h-3.5" />
        <a href="/catalog" className="hover:text-brand-600 transition-colors">Catalog</a>
        <ChevronRight className="w-3.5 h-3.5" />
        <a href={`/catalog?category=${product.category_slug}`} className="hover:text-brand-600 transition-colors capitalize">
          {product.category_name}
        </a>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-slate-800 line-clamp-1 max-w-xs">{product.title}</span>
      </nav>

      {/* Main PDP Grid: Gallery (Left) & Purchasing Info (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
        {/* Left Column: Image Gallery */}
        <div className="lg:col-span-6 space-y-4 sticky top-28">
          <div className="relative aspect-square w-full rounded-3xl bg-white border border-slate-200/90 overflow-hidden shadow-sm flex items-center justify-center p-4">
            <img
              src={
                product.images && product.images.length > 0
                  ? product.images[selectedImage]?.image_url
                  : 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80'
              }
              alt={product.title}
              className="w-full h-full object-contain object-center hover:scale-105 transition-transform duration-300"
            />
            {product.discount_percentage > 0 && (
              <span className="absolute top-4 left-4 px-3 py-1 rounded-lg bg-rose-600 text-white text-xs font-bold shadow-md">
                {product.discount_percentage}% SAVINGS
              </span>
            )}
          </div>

          {/* Thumbnails Row */}
          {product.images && product.images.length > 1 && (
            <div className="flex items-center gap-3 overflow-x-auto pb-2">
              {product.images.map((img, idx) => (
                <button
                  key={img.id}
                  onClick={() => setSelectedImage(idx)}
                  className={`relative w-20 h-20 rounded-xl bg-white border-2 overflow-hidden shrink-0 transition-all ${
                    selectedImage === idx
                      ? 'border-brand-600 shadow-md ring-2 ring-brand-500/20'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Buying Specifications */}
        <div className="lg:col-span-6 space-y-6">
          {/* Header & Brand */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-600">
                {product.brand}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleWishlist(product.id)}
                  className={`p-2 rounded-lg border transition-colors ${
                    isWishlisted(product.id)
                      ? 'border-rose-200 bg-rose-50 text-rose-600'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                  title={isWishlisted(product.id) ? 'Remove from Wishlist' : 'Save to Wishlist'}
                >
                  <Heart className={`w-4 h-4 ${isWishlisted(product.id) ? 'fill-rose-600 text-rose-600' : ''}`} />
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(window.location.href);
                    alert('Product link copied to clipboard!');
                  }}
                  className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
                  title="Share"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
              {product.title}
            </h1>

            {/* Rating Stars Bar */}
            <div className="flex items-center gap-3 pt-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-xs font-bold text-amber-800">
                <Star className="w-3.5 h-3.5 fill-current text-amber-500" />
                <span>{Number(product.rating_avg).toFixed(1)}</span>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                {product.rating_count} verified ratings & reviews
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> 100% Genuine
              </span>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Pricing Block */}
          <div className="space-y-1">
            <div className="flex items-baseline gap-3">
              <span className="text-3xl sm:text-4xl font-black text-slate-900">
                {formatPrice(activePrice)}
              </span>
              {currentDiscountPrice && (
                <span className="text-lg text-slate-400 line-through">
                  {formatPrice(currentBasePrice)}
                </span>
              )}
              {product.discount_percentage > 0 && (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Save {formatPrice(currentBasePrice - activePrice)}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">Inclusive of all taxes. Free shipping on this order.</p>
          </div>

          {/* Variants Selector */}
          {product.variants && product.variants.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Select Option: <span className="text-brand-600 font-semibold">{selectedVariant?.title}</span>
                </label>
                <span className="text-xs text-slate-500 font-medium">
                  {availableStock > 0 ? `${availableStock} in stock` : 'Out of Stock'}
                </span>
              </div>

              <div className="flex flex-wrap gap-2.5">
                {product.variants.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => {
                      setSelectedVariant(v);
                      setQuantity(1);
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border ${
                      selectedVariant?.id === v.id
                        ? 'border-brand-600 bg-brand-50 text-brand-700 shadow-sm ring-2 ring-brand-500/20'
                        : 'border-slate-300 hover:border-slate-400 bg-white text-slate-700'
                    } ${!v.in_stock ? 'opacity-50 cursor-not-allowed line-through' : ''}`}
                  >
                    {v.title}
                    {v.price_override && ` (${formatPrice(v.price_override)})`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Stock Status & Quantity Selector */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-4">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Quantity</span>
              <div className="flex items-center border border-slate-300 rounded-xl bg-white shadow-sm">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1 || availableStock <= 0}
                  className="p-2 text-slate-600 hover:text-slate-900 disabled:opacity-40"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="px-4 text-xs font-bold text-slate-900">{quantity}</span>
                <button
                  onClick={() => setQuantity(Math.min(availableStock, quantity + 1))}
                  disabled={quantity >= availableStock || availableStock <= 0}
                  className="p-2 text-slate-600 hover:text-slate-900 disabled:opacity-40"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <span className="text-xs text-slate-400">
                (Max {Math.min(10, availableStock)} per customer)
              </span>
            </div>

            {/* CTAs */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <Button
                size="lg"
                variant="primary"
                onClick={handleAddToCart}
                disabled={availableStock <= 0}
                className="w-full"
                icon={isAdded ? Check : ShoppingCart}
              >
                {isAdded ? 'Added to Cart ✓' : 'Add to Cart'}
              </Button>
              <Button
                size="lg"
                variant="accent"
                onClick={handleBuyNow}
                disabled={availableStock <= 0}
                className="w-full bg-amber-500 hover:bg-amber-600"
                icon={Zap}
              >
                Buy Now
              </Button>
            </div>

            <button
              onClick={() => {
                addToCompare(product);
                openCompareModal();
              }}
              className="w-full py-2.5 rounded-xl border border-slate-300 hover:border-brand-500 bg-white hover:bg-brand-50/50 text-slate-700 hover:text-brand-700 text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-2xs"
            >
              <Scale className="w-4 h-4 text-brand-600" />
              <span>{isInCompare(product.id) ? 'View in Comparison Matrix' : 'Compare with Alternatives'}</span>
            </button>
          </div>

          {/* Postal Code Delivery Checker */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <MapPin className="w-4 h-4 text-brand-600" />
              <span>Delivery & Availability Check</span>
            </div>
            <form onSubmit={handlePincodeSubmit} className="flex gap-2">
              <input
                type="text"
                placeholder="Enter 6-digit PIN code"
                maxLength={6}
                value={pincode}
                onChange={(e) => {
                  setPincode(e.target.value);
                  setPincodeChecked(false);
                }}
                className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <button
                type="submit"
                className="px-4 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                Check
              </button>
            </form>
            {pincodeChecked && (
              <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1.5 pt-1">
                <Check className="w-3.5 h-3.5" />
                Delivery by <strong>Tomorrow, 5:00 PM</strong> to {pincode}
              </p>
            )}
          </div>

          {/* Seller & Trust Guarantees */}
          <div className="grid grid-cols-3 gap-3 pt-2 text-center text-xs text-slate-600">
            <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-1">
              <Truck className="w-5 h-5 mx-auto text-brand-600" />
              <span className="font-bold block text-slate-900">Fast Shipping</span>
              <span className="text-[10px] text-slate-400">Dispatch in 24h</span>
            </div>
            <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-1">
              <RotateCcw className="w-5 h-5 mx-auto text-amber-500" />
              <span className="font-bold block text-slate-900">7-Day Return</span>
              <span className="text-[10px] text-slate-400">Easy replacement</span>
            </div>
            <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-1">
              <ShieldCheck className="w-5 h-5 mx-auto text-emerald-500" />
              <span className="font-bold block text-slate-900">Verified Seller</span>
              <span className="text-[10px] text-slate-400">{product.seller_name}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Description & Technical Specifications */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-8 shadow-sm space-y-6">
        <h3 className="text-xl font-bold text-slate-900">Product Overview & Features</h3>
        <p className="text-sm text-slate-600 leading-relaxed max-w-4xl">
          {product.description}
        </p>

        <div className="pt-4 border-t border-slate-100">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">Specifications Table</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-xs">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-400">Brand</span>
              <span className="font-bold text-slate-800">{product.brand}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-400">Category</span>
              <span className="font-bold text-slate-800">{product.category_name}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-400">Seller</span>
              <span className="font-bold text-slate-800">{product.seller_name}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-400">Warranty</span>
              <span className="font-bold text-slate-800">1 Year Brand Warranty</span>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Reviews Section */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-8 shadow-sm space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Customer Ratings & Reviews</h3>
            <p className="text-xs text-slate-500 mt-1">Verified reviews from authentic customers</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-3xl font-black text-slate-900">{Number(product.rating_avg).toFixed(1)}</div>
            <div>
              <div className="flex text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-current" />
                ))}
              </div>
              <span className="text-xs text-slate-400">{product.rating_count} ratings</span>
            </div>
          </div>
        </div>

        {/* Reviews List */}
        {product.reviews && product.reviews.length > 0 ? (
          <div className="space-y-4">
            {product.reviews.map((rev) => (
              <div key={rev.id} className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900">{rev.user_name}</span>
                    {rev.is_verified && (
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Verified Purchase
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {new Date(rev.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3.5 h-3.5 ${
                        i < rev.rating ? 'fill-current text-amber-400' : 'text-slate-200'
                      }`}
                    />
                  ))}
                </div>
                {rev.title && <h5 className="font-bold text-xs text-slate-800">{rev.title}</h5>}
                <p className="text-xs text-slate-600 leading-relaxed">{rev.comment}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 text-center py-6">
            No customer reviews yet. Be the first to review this product after purchase!
          </p>
        )}
      </div>

      {/* AI Frequently Bought Together Bundle */}
      {fbtProducts && fbtProducts.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Frequently Bought Together</h3>
                <p className="text-xs text-slate-500">Co-purchased combinations recommended by our AI matching engine</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
              5% Extra Bundle Discount
            </span>
          </div>

          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pt-2">
            {/* Thumbnails chain */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Main Product */}
              <div className={`p-3 rounded-2xl border-2 transition-all max-w-[160px] text-center space-y-1.5 ${
                selectedBundleItemIds.includes(product.id) ? 'border-brand-600 bg-brand-50/30' : 'border-slate-200 opacity-60'
              }`}>
                <div className="relative aspect-square w-24 h-24 mx-auto rounded-xl bg-white overflow-hidden p-1">
                  <img
                    src={product.images?.[0]?.image_url || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&q=80'}
                    alt={product.title}
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="text-[11px] font-bold text-slate-800 line-clamp-1 block">This Item</span>
                <span className="text-xs font-black text-brand-600 block">
                  {formatPrice(product.discount_price || product.base_price)}
                </span>
              </div>

              {/* Plus & FBT Items */}
              {fbtProducts.map((item) => (
                <React.Fragment key={item.id}>
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-sm font-black shrink-0">
                    +
                  </div>
                  <div className={`p-3 rounded-2xl border-2 transition-all max-w-[160px] text-center space-y-1.5 ${
                    selectedBundleItemIds.includes(item.id) ? 'border-brand-600 bg-brand-50/30' : 'border-slate-200 opacity-60'
                  }`}>
                    <div className="relative aspect-square w-24 h-24 mx-auto rounded-xl bg-white overflow-hidden p-1">
                      <img
                        src={item.primary_image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&q=80'}
                        alt={item.title}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <a
                      href={`/products/${item.slug}`}
                      className="text-[11px] font-bold text-slate-800 hover:text-brand-600 line-clamp-1 block"
                    >
                      {item.title}
                    </a>
                    <span className="text-xs font-black text-brand-600 block">
                      {formatPrice(item.discount_price || item.base_price)}
                    </span>
                  </div>
                </React.Fragment>
              ))}
            </div>

            {/* Price Total & Bundle CTA */}
            <div className="w-full lg:w-auto p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 min-w-[280px]">
              <div className="space-y-1.5">
                {/* Item checkboxes */}
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedBundleItemIds.includes(product.id)}
                    onChange={() => toggleBundleItem(product.id)}
                    className="w-4 h-4 text-brand-600 rounded focus:ring-brand-500"
                  />
                  <span className="truncate">This item: <strong>{product.title}</strong></span>
                </label>
                {fbtProducts.map((item) => (
                  <label key={item.id} className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedBundleItemIds.includes(item.id)}
                      onChange={() => toggleBundleItem(item.id)}
                      className="w-4 h-4 text-brand-600 rounded focus:ring-brand-500"
                    />
                    <span className="truncate">{item.title}</span>
                  </label>
                ))}
              </div>

              <hr className="border-slate-200" />

              {/* Total Calculation */}
              {(() => {
                const mainPrice = selectedBundleItemIds.includes(product.id)
                  ? Number(product.discount_price || product.base_price)
                  : 0;
                const complementaryPrice = fbtProducts
                  .filter((item) => selectedBundleItemIds.includes(item.id))
                  .reduce((sum, item) => sum + Number(item.discount_price || item.base_price), 0);
                const rawTotal = mainPrice + complementaryPrice;
                const bundleDiscount = selectedBundleItemIds.length >= 2 ? rawTotal * 0.05 : 0;
                const finalBundlePrice = rawTotal - bundleDiscount;

                return (
                  <div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-slate-500">Bundle Price ({selectedBundleItemIds.length} items):</span>
                      <span className="text-lg font-black text-slate-900">{formatPrice(finalBundlePrice)}</span>
                    </div>
                    {bundleDiscount > 0 && (
                      <span className="text-[11px] font-bold text-emerald-600 block text-right">
                        You save {formatPrice(bundleDiscount)} with bundle!
                      </span>
                    )}

                    <button
                      onClick={handleAddBundleToCart}
                      disabled={selectedBundleItemIds.length === 0}
                      className={`w-full mt-3 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm ${
                        isBundleAdded
                          ? 'bg-emerald-600 text-white'
                          : selectedBundleItemIds.length > 0
                          ? 'bg-brand-600 hover:bg-brand-700 text-white active:scale-98'
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {isBundleAdded ? (
                        <>
                          <Check className="w-4 h-4 stroke-[3]" /> All Items Added to Cart!
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="w-4 h-4" /> Add Bundle to Cart
                        </>
                      )}
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* AI Vector Similar Products Rail */}
      {(similarProducts.length > 0 || relatedProducts.length > 0) && (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600">
                <Sparkles className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Similar Products You May Like</h3>
                <p className="text-xs text-slate-500">Vector semantic similarity ranked against active catalog</p>
              </div>
            </div>
            <a href={`/catalog?category=${product.category_slug}`} className="text-xs font-semibold text-brand-600 hover:underline">
              View All in {product.category_name} →
            </a>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {(similarProducts.length > 0 ? similarProducts : relatedProducts).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default ProductDetail;
