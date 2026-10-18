import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Search, 
  X, 
  RotateCcw, 
  PackageOpen, 
  ChevronLeft, 
  ChevronRight,
  SlidersHorizontal,
  Sparkles
} from 'lucide-react';
import ProductCard from '../components/catalog/ProductCard';
import FilterSidebar from '../components/catalog/FilterSidebar';
import SortBar from '../components/catalog/SortBar';
import { CardSkeleton } from '../components/common/Skeleton';
import Button from '../components/common/Button';
import { getProducts, getCategories } from '../services/productService';
import { semanticSearch } from '../services/aiService';
import { useCart } from '../context/CartContext';

export const Catalog = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toggleWishlist, isWishlisted } = useCart();

  // State from URL parameters
  const searchQuery = searchParams.get('q') || '';
  const isSemanticParam = searchParams.get('semantic') === 'true';
  const categoryParam = searchParams.get('category') || 'all';
  const brandParam = searchParams.get('brand') || '';
  const minPriceParam = searchParams.get('min_price') ? Number(searchParams.get('min_price')) : null;
  const maxPriceParam = searchParams.get('max_price') ? Number(searchParams.get('max_price')) : null;
  const ratingParam = searchParams.get('min_rating') ? Number(searchParams.get('min_rating')) : null;
  const inStockParam = searchParams.get('in_stock') === 'true';
  const sortParam = searchParams.get('sort') || 'featured';
  const pageParam = searchParams.get('page') ? Number(searchParams.get('page')) : 1;

  // Local Data State
  const [productsData, setProductsData] = useState({
    items: [],
    total: 0,
    page: 1,
    limit: 12,
    total_pages: 1,
    available_brands: [],
  });
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [semanticData, setSemanticData] = useState(null);

  // Load Categories once on mount
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const cats = await getCategories();
        setCategories(cats);
      } catch (err) {
        console.error('Failed to load categories:', err);
      }
    };
    loadCategories();
  }, []);

  // Fetch Products whenever URL query parameters change
  useEffect(() => {
    const fetchCatalog = async () => {
      setIsLoading(true);
      try {
        if (isSemanticParam && searchQuery.trim()) {
          const semRes = await semanticSearch(searchQuery.trim(), 16);
          setSemanticData(semRes);
          setProductsData({
            items: semRes.products || [],
            total: semRes.total || 0,
            page: 1,
            limit: 16,
            total_pages: 1,
            available_brands: [],
          });
        } else {
          setSemanticData(null);
          const data = await getProducts({
            page: pageParam,
            limit: 12,
            search: searchQuery,
            category: categoryParam,
            brand: brandParam,
            minPrice: minPriceParam,
            maxPrice: maxPriceParam,
            minRating: ratingParam,
            inStock: inStockParam,
            sort: sortParam,
          });
          setProductsData(data);
        }
      } catch (err) {
        console.error('Failed to fetch catalog:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCatalog();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [
    searchQuery,
    isSemanticParam,
    categoryParam,
    brandParam,
    minPriceParam,
    maxPriceParam,
    ratingParam,
    inStockParam,
    sortParam,
    pageParam,
  ]);

  // URL Query Sync Helpers
  const updateQueryParam = (newParams) => {
    const current = Object.fromEntries(searchParams.entries());
    const merged = { ...current, ...newParams, page: 1 }; // Reset to page 1 on filter change

    // Clean empty values
    Object.keys(merged).forEach((key) => {
      if (merged[key] === null || merged[key] === undefined || merged[key] === '' || merged[key] === 'all') {
        delete merged[key];
      }
    });

    setSearchParams(merged);
  };

  const handlePageChange = (newPage) => {
    const current = Object.fromEntries(searchParams.entries());
    setSearchParams({ ...current, page: newPage });
  };

  const handleCategoryChange = (slug) => {
    updateQueryParam({ category: slug });
  };

  const handleBrandToggle = (brandName) => {
    const currentBrands = brandParam ? brandParam.split(',').filter(Boolean) : [];
    let updated;
    if (currentBrands.includes(brandName)) {
      updated = currentBrands.filter((b) => b !== brandName);
    } else {
      updated = [...currentBrands, brandName];
    }
    updateQueryParam({ brand: updated.join(',') });
  };

  const handlePriceChange = (min, max) => {
    updateQueryParam({ min_price: min, max_price: max });
  };

  const handleRatingChange = (rating) => {
    updateQueryParam({ min_rating: rating });
  };

  const handleInStockToggle = (val) => {
    updateQueryParam({ in_stock: val ? 'true' : null });
  };

  const handleSortChange = (sortVal) => {
    updateQueryParam({ sort: sortVal });
  };

  const handleResetFilters = () => {
    setSearchParams(searchQuery ? { q: searchQuery } : {});
  };

  const selectedBrandsList = brandParam ? brandParam.split(',').filter(Boolean) : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Breadcrumb & Search Header */}
      <div className="space-y-2">
        <nav className="text-xs font-semibold text-slate-400 flex items-center gap-2">
          <a href="/" className="hover:text-brand-600 transition-colors">Home</a>
          <span>/</span>
          <span className="text-slate-800">Product Catalog</span>
          {categoryParam && categoryParam !== 'all' && (
            <>
              <span>/</span>
              <span className="text-brand-600 capitalize">{categoryParam}</span>
            </>
          )}
        </nav>

        {searchQuery ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Results for <span className="text-brand-600">"{searchQuery}"</span>
              </h1>
              <button
                onClick={() => updateQueryParam({ q: null, semantic: null })}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                title="Clear Search"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <button
              onClick={() => updateQueryParam({ semantic: isSemanticParam ? null : 'true' })}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm shrink-0 ${
                isSemanticParam
                  ? 'bg-gradient-to-r from-brand-600 to-blue-600 text-white shadow-brand-500/20'
                  : 'bg-white text-slate-700 border border-slate-300 hover:border-brand-500 hover:text-brand-600'
              }`}
            >
              <Sparkles className={`w-3.5 h-3.5 ${isSemanticParam ? 'text-amber-300' : 'text-brand-600'}`} />
              <span>{isSemanticParam ? 'Semantic AI Search Active' : 'Enable AI Semantic Search'}</span>
            </button>
          </div>
        ) : (
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Discover Products
          </h1>
        )}
      </div>

      {/* Semantic Intent Breakdown Banner */}
      {isSemanticParam && semanticData && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-brand-50 via-sky-50 to-indigo-50 border border-brand-200/90 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-brand-900">
                AI Natural Language Query Breakdown
              </span>
            </div>
            <span className="text-xs font-bold text-brand-700">
              {semanticData.total} Vector Matches
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            {semanticData.parsed_intent?.detected_category && (
              <span className="px-2.5 py-1 rounded-lg bg-white border border-brand-200 text-brand-800 font-semibold shadow-2xs">
                🏷️ Category: <strong>{semanticData.parsed_intent.detected_category}</strong>
              </span>
            )}
            {semanticData.parsed_intent?.detected_brand && (
              <span className="px-2.5 py-1 rounded-lg bg-white border border-brand-200 text-brand-800 font-semibold shadow-2xs">
                🏢 Brand: <strong>{semanticData.parsed_intent.detected_brand}</strong>
              </span>
            )}
            {semanticData.parsed_intent?.max_price && (
              <span className="px-2.5 py-1 rounded-lg bg-white border border-brand-200 text-brand-800 font-semibold shadow-2xs">
                💰 Under <strong>₹{semanticData.parsed_intent.max_price.toLocaleString()}</strong>
              </span>
            )}
            {semanticData.parsed_intent?.min_price && (
              <span className="px-2.5 py-1 rounded-lg bg-white border border-brand-200 text-brand-800 font-semibold shadow-2xs">
                💰 Above <strong>₹{semanticData.parsed_intent.min_price.toLocaleString()}</strong>
              </span>
            )}
            {semanticData.parsed_intent?.min_rating && (
              <span className="px-2.5 py-1 rounded-lg bg-white border border-brand-200 text-brand-800 font-semibold shadow-2xs">
                ⭐ Top Rated (<strong>{semanticData.parsed_intent.min_rating}★+</strong>)
              </span>
            )}
            {semanticData.parsed_intent?.keywords && semanticData.parsed_intent.keywords.length > 0 && (
              <span className="px-2.5 py-1 rounded-lg bg-white/70 border border-slate-200 text-slate-600 font-medium">
                Keywords: {semanticData.parsed_intent.keywords.join(', ')}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Active Filter Chips */}
      {(categoryParam !== 'all' || selectedBrandsList.length > 0 || minPriceParam || maxPriceParam || ratingParam || inStockParam) && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Active:</span>

          {categoryParam !== 'all' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-brand-50 text-brand-700 text-xs font-semibold border border-brand-200">
              Category: {categoryParam}
              <button onClick={() => handleCategoryChange('all')}><X className="w-3 h-3 hover:text-brand-900" /></button>
            </span>
          )}

          {selectedBrandsList.map((b) => (
            <span key={b} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs font-semibold border border-slate-200">
              Brand: {b}
              <button onClick={() => handleBrandToggle(b)}><X className="w-3 h-3 hover:text-rose-600" /></button>
            </span>
          ))}

          {(minPriceParam || maxPriceParam) && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs font-semibold border border-slate-200">
              Price: ₹{minPriceParam || 0} - ₹{maxPriceParam || 'Max'}
              <button onClick={() => handlePriceChange(null, null)}><X className="w-3 h-3 hover:text-rose-600" /></button>
            </span>
          )}

          {ratingParam && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 text-xs font-semibold border border-amber-200">
              Rating: {ratingParam}★ & up
              <button onClick={() => handleRatingChange(null)}><X className="w-3 h-3 hover:text-amber-900" /></button>
            </span>
          )}

          {inStockParam && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200">
              In Stock Only
              <button onClick={() => handleInStockToggle(false)}><X className="w-3 h-3 hover:text-emerald-900" /></button>
            </span>
          )}

          <button
            onClick={handleResetFilters}
            className="text-xs font-semibold text-rose-600 hover:text-rose-800 ml-2 hover:underline"
          >
            Clear All
          </button>
        </div>
      )}

      {/* Main Grid & Sidebar Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Desktop Filter Sidebar */}
        <div className="hidden lg:block lg:col-span-1 sticky top-28">
          <FilterSidebar
            categories={categories}
            availableBrands={productsData.available_brands}
            selectedCategory={categoryParam}
            selectedBrands={selectedBrandsList}
            minPrice={minPriceParam}
            maxPrice={maxPriceParam}
            selectedRating={ratingParam}
            inStockOnly={inStockParam}
            onCategoryChange={handleCategoryChange}
            onBrandToggle={handleBrandToggle}
            onPriceChange={handlePriceChange}
            onRatingChange={handleRatingChange}
            onInStockToggle={handleInStockToggle}
            onResetFilters={handleResetFilters}
          />
        </div>

        {/* Catalog Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Sort & View Bar */}
          <SortBar
            totalItems={productsData.total}
            currentSort={sortParam}
            onSortChange={handleSortChange}
            onOpenMobileFilters={() => setMobileFilterOpen(true)}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />

          {/* Product Grid Area */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : productsData.items.length > 0 ? (
            <div
              className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6'
                  : 'flex flex-col gap-4'
              }
            >
              {productsData.items.map((prod) => (
                <ProductCard
                  key={prod.id}
                  product={prod}
                  isWishlisted={isWishlisted(prod.id)}
                  onAddToCart={(p) => navigate(`/products/${p.slug}`)}
                  onToggleWishlist={(p) => toggleWishlist(p.id)}
                />
              ))}
            </div>
          ) : (
            /* Empty State */
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4 shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto">
                <PackageOpen className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">No matching products found</h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                We couldn't find any products matching your current filters. Try relaxing your price bounds or searching for broader terms.
              </p>
              <Button size="sm" variant="outline" onClick={handleResetFilters} icon={RotateCcw}>
                Reset All Filters
              </Button>
            </div>
          )}

          {/* Pagination Controls */}
          {productsData.total_pages > 1 && (
            <div className="pt-8 flex items-center justify-center gap-2">
              <button
                onClick={() => handlePageChange(Math.max(1, pageParam - 1))}
                disabled={pageParam <= 1}
                className="p-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {[...Array(productsData.total_pages)].map((_, i) => {
                const p = i + 1;
                return (
                  <button
                    key={p}
                    onClick={() => handlePageChange(p)}
                    className={`w-9 h-9 rounded-lg text-xs font-bold transition-colors ${
                      pageParam === p
                        ? 'bg-brand-600 text-white shadow-sm'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}

              <button
                onClick={() => handlePageChange(Math.min(productsData.total_pages, pageParam + 1))}
                disabled={pageParam >= productsData.total_pages}
                className="p-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Filters Slide-over / Modal */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setMobileFilterOpen(false)} />
          <div className="relative ml-auto w-full max-w-xs bg-white h-full shadow-2xl p-6 overflow-y-auto">
            <FilterSidebar
              categories={categories}
              availableBrands={productsData.available_brands}
              selectedCategory={categoryParam}
              selectedBrands={selectedBrandsList}
              minPrice={minPriceParam}
              maxPrice={maxPriceParam}
              selectedRating={ratingParam}
              inStockOnly={inStockParam}
              onCategoryChange={(cat) => { handleCategoryChange(cat); setMobileFilterOpen(false); }}
              onBrandToggle={handleBrandToggle}
              onPriceChange={(min, max) => { handlePriceChange(min, max); setMobileFilterOpen(false); }}
              onRatingChange={(r) => { handleRatingChange(r); setMobileFilterOpen(false); }}
              onInStockToggle={handleInStockToggle}
              onResetFilters={() => { handleResetFilters(); setMobileFilterOpen(false); }}
              onCloseMobile={() => setMobileFilterOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Catalog;
