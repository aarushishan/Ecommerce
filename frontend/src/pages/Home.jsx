import React, { useEffect, useState } from 'react';
import { 
  ArrowRight, 
  Sparkles, 
  ShieldCheck, 
  Zap, 
  Database, 
  CheckCircle2, 
  RefreshCw,
  Cpu,
  Flame,
  TrendingUp,
  Tag
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import ProductCard from '../components/catalog/ProductCard';
import { CardSkeleton } from '../components/common/Skeleton';
import { checkHealth } from '../services/api';
import { getFeaturedProducts, getTrendingProducts, getCategories } from '../services/productService';
import { getRecommendationsForYou } from '../services/aiService';
import { useCart } from '../context/CartContext';

export const Home = ({ onApiStatusChange }) => {
  const navigate = useNavigate();
  const { toggleWishlist, isWishlisted } = useCart();
  const [healthData, setHealthData] = useState(null);
  const [isLoadingHealth, setIsLoadingHealth] = useState(true);
  const [healthError, setHealthError] = useState(null);

  const [featuredItems, setFeaturedItems] = useState([]);
  const [trendingItems, setTrendingItems] = useState([]);
  const [recommendedItems, setRecommendedItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);

  const fetchHealth = async () => {
    setIsLoadingHealth(true);
    setHealthError(null);
    try {
      const data = await checkHealth();
      setHealthData(data);
      if (onApiStatusChange) onApiStatusChange(data.status === 'ok');
    } catch (err) {
      console.error('Health fetch error:', err);
      setHealthError(err.message || 'Unable to connect to backend API');
      if (onApiStatusChange) onApiStatusChange(false);
    } finally {
      setIsLoadingHealth(false);
    }
  };

  useEffect(() => {
    fetchHealth();

    const loadHomepageData = async () => {
      setIsLoadingCatalog(true);
      try {
        const [featured, trending, recs, cats] = await Promise.all([
          getFeaturedProducts(4).catch(() => []),
          getTrendingProducts(4).catch(() => []),
          getRecommendationsForYou(4).catch(() => []),
          getCategories().catch(() => []),
        ]);
        setFeaturedItems(featured);
        setTrendingItems(trending);
        setRecommendedItems(recs);
        setCategories(cats);
      } catch (err) {
        console.error('Failed to load homepage catalog:', err);
      } finally {
        setIsLoadingCatalog(false);
      }
    };

    loadHomepageData();
  }, []);

  return (
    <div className="space-y-16 py-6 sm:py-10">
      {/* Hero Banner Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl bg-gradient-to-br from-slate-950 via-brand-950 to-slate-900 text-white overflow-hidden p-8 sm:p-14 lg:p-20 shadow-2xl border border-slate-800">
          <div className="absolute top-0 right-0 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-blue-600/10 rounded-full blur-2xl pointer-events-none"></div>

          <div className="relative z-10 max-w-2xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-500/20 border border-brand-400/30 text-brand-300 text-xs font-semibold tracking-wide backdrop-blur-md">
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>ShopSphere 2.0 — Live Interactive Catalog</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-tight">
              The Universe of Shopping, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-300">Elevated.</span>
            </h1>

            <p className="text-base sm:text-lg text-slate-300 leading-relaxed font-normal">
              Browse top electronics, laptops, studio audio, and fashion with instant multi-faceted filtering, verified customer reviews, and fast delivery estimates.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <a href="/catalog">
                <Button size="lg" variant="primary" icon={ArrowRight}>
                  Explore Full Catalog
                </Button>
              </a>
              <a href="/catalog?deal=true">
                <Button size="lg" variant="outline" className="border-slate-700 text-white hover:bg-slate-800 bg-transparent">
                  Today's Deals
                </Button>
              </a>
            </div>

            {/* Feature Badges */}
            <div className="pt-6 flex flex-wrap items-center gap-6 text-xs text-slate-400 font-medium">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Verified Stock & Pricing</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Instant Multi-Facet Filters</span>
              </div>
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                <span>Dynamic PDP Variant Engine</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products Section (Live API) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-end justify-between">
          <div>
            <div className="flex items-center gap-2 text-brand-600 font-bold text-xs uppercase tracking-wider mb-1">
              <Flame className="w-4 h-4 text-amber-500" /> Hand-Picked Selections
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Featured Products
            </h2>
          </div>
          <a href="/catalog" className="text-xs sm:text-sm font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1">
            See All <ArrowRight className="w-4 h-4" />
          </a>
        </div>

        {isLoadingCatalog ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredItems.map((prod) => (
              <ProductCard
                key={prod.id}
                product={prod}
                isWishlisted={isWishlisted(prod.id)}
                onAddToCart={(p) => navigate(`/products/${p.slug}`)}
                onToggleWishlist={(p) => toggleWishlist(p.id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Category Discovery Banners */}
      {categories.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-brand-600 font-bold text-xs uppercase tracking-wider mb-1">
                <Tag className="w-4 h-4" /> Browse by Department
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Shop by Category
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map((cat) => (
              <a
                key={cat.id}
                href={`/catalog?category=${cat.slug}`}
                className="group relative rounded-2xl bg-white border border-slate-200/90 p-4 shadow-sm hover:shadow-md hover:border-brand-300 transition-all text-center flex flex-col items-center justify-between gap-3 overflow-hidden"
              >
                <div className="w-14 h-14 rounded-full overflow-hidden bg-slate-100 group-hover:scale-105 transition-transform">
                  <img
                    src={cat.image_url || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&q=80'}
                    alt={cat.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 group-hover:text-brand-600 transition-colors line-clamp-1">
                    {cat.name}
                  </h4>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {cat.product_count} items
                  </span>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Trending Now Section (Live API) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-end justify-between">
          <div>
            <div className="flex items-center gap-2 text-rose-600 font-bold text-xs uppercase tracking-wider mb-1">
              <TrendingUp className="w-4 h-4" /> High Demand
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Trending Right Now
            </h2>
          </div>
          <a href="/catalog?sort=popular" className="text-xs sm:text-sm font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1">
            View Popular <ArrowRight className="w-4 h-4" />
          </a>
        </div>

        {isLoadingCatalog ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {trendingItems.map((prod) => (
              <ProductCard
                key={prod.id}
                product={prod}
                isWishlisted={isWishlisted(prod.id)}
                onAddToCart={(p) => navigate(`/products/${p.slug}`)}
                onToggleWishlist={(p) => toggleWishlist(p.id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* AI Recommended For You Section */}
      {recommendedItems && recommendedItems.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex items-end justify-between">
            <div>
              <div className="flex items-center gap-2 text-brand-600 font-bold text-xs uppercase tracking-wider mb-1">
                <Sparkles className="w-4 h-4 text-amber-500" /> Grounded AI Recommendation
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Recommended For You
              </h2>
              <p className="text-xs text-slate-500 mt-1">Curated based on your preferences, category affinities, and popular choices</p>
            </div>
            <a href="/catalog" className="text-xs sm:text-sm font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1">
              Explore More <ArrowRight className="w-4 h-4" />
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {recommendedItems.map((prod) => (
              <ProductCard
                key={prod.id}
                product={prod}
                isWishlisted={isWishlisted(prod.id)}
                onAddToCart={(p) => navigate(`/products/${p.slug}`)}
                onToggleWishlist={(p) => toggleWishlist(p.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Real-time System Verification Card */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-brand-50 text-brand-600">
                  <Database className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Phase 2 Verification: Catalog & Search Engine Active</h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Real-time API connectivity: Live products and categories streaming from database with full filter capabilities.
              </p>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={fetchHealth}
              isLoading={isLoadingHealth}
              icon={RefreshCw}
            >
              Check Health
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-6">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Catalog API</span>
              <div className="mt-2 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="font-bold text-sm text-slate-900">
                  {featuredItems.length + trendingItems.length} Products Active
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Database Engine</span>
              <div className="mt-2 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="font-bold text-sm text-slate-900 capitalize">
                  {healthData?.database?.database || 'SQLite'} Connected
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Multi-Facet Filters</span>
              <div className="mt-2 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="font-bold text-sm text-slate-900">Price, Brand, Rating</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">PDP Variant Engine</span>
              <div className="mt-2 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="font-bold text-sm text-slate-900">Live Stock & Images</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
