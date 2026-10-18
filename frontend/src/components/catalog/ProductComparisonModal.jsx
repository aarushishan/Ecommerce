import React, { useEffect, useState } from 'react';
import { 
  X, 
  Sparkles, 
  Scale, 
  Check, 
  ShoppingCart, 
  Trash2, 
  Star, 
  ShieldCheck, 
  Truck, 
  RotateCcw, 
  Award,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { useCompare } from '../../context/CompareContext';
import { useCart } from '../../context/CartContext';
import { compareProducts } from '../../services/aiService';
import { formatPrice } from '../../utils/formatters';

export const ProductComparisonModal = () => {
  const { compareItems, removeFromCompare, clearCompare, isCompareModalOpen, closeCompareModal } = useCompare();
  const { addToCart } = useCart();

  const [comparisonData, setComparisonData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [addedItemIds, setAddedItemIds] = useState([]);

  useEffect(() => {
    if (!isCompareModalOpen || compareItems.length < 2) {
      setComparisonData(null);
      return;
    }

    const fetchComparison = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const ids = compareItems.map((p) => p.id);
        const data = await compareProducts(ids);
        setComparisonData(data);
      } catch (err) {
        console.error('Comparison error:', err);
        setError(err.response?.data?.detail || 'Failed to generate product comparison.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchComparison();
  }, [isCompareModalOpen, compareItems]);

  if (!isCompareModalOpen) return null;

  const handleAddToCart = async (product) => {
    try {
      await addToCart(product, 1);
      setAddedItemIds((prev) => [...prev, product.id]);
      setTimeout(() => {
        setAddedItemIds((prev) => prev.filter((id) => id !== product.id));
      }, 2000);
    } catch (err) {
      console.error('Failed to add compared item to cart:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-brand-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/20 border border-brand-400/30 flex items-center justify-center text-brand-300">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                  Smart Product Comparison Matrix
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-brand-500/30 border border-brand-400/30 text-brand-200 text-xs font-semibold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-300" /> AI Grounded
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Side-by-side algorithmic specification analysis and value breakdown
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={clearCompare}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            >
              Clear All
            </button>
            <button
              onClick={closeCompareModal}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto p-6 space-y-6 flex-1">
          {isLoading && (
            <div className="py-20 flex flex-col items-center justify-center space-y-4">
              <div className="w-12 h-12 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin"></div>
              <div className="text-center">
                <h4 className="text-sm font-bold text-slate-800">Generating AI Specification Matrix...</h4>
                <p className="text-xs text-slate-500 mt-1">Evaluating specifications, pricing, ratings, and calculating value scores</p>
              </div>
            </div>
          )}

          {error && !isLoading && (
            <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-800">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
              <div>
                <h4 className="text-sm font-bold">Unable to compare products</h4>
                <p className="text-xs text-rose-600 mt-1">{error}</p>
                <button
                  onClick={closeCompareModal}
                  className="mt-3 px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold"
                >
                  Close & Select Other Items
                </button>
              </div>
            </div>
          )}

          {!isLoading && comparisonData && (
            <>
              {/* Algorithmic Verdict Callout */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-brand-50 via-blue-50 to-indigo-50 border border-brand-200/80 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-brand-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                    <Sparkles className="w-4 h-4 text-amber-300" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-brand-900 flex items-center gap-1.5">
                      SphereBot Algorithmic Verdict
                    </h4>
                    <p className="text-sm text-slate-700 font-medium leading-relaxed mt-1">
                      {comparisonData.verdict}
                    </p>
                  </div>
                </div>
              </div>

              {/* Side-by-Side Comparison Table Grid */}
              <div className="overflow-x-auto pb-4">
                <div className={`grid gap-4 min-w-[700px] ${
                  comparisonData.items.length === 2 ? 'grid-cols-2' :
                  comparisonData.items.length === 3 ? 'grid-cols-3' : 'grid-cols-4'
                }`}>
                  {comparisonData.items.map(({ product, specs, highlights, value_score }) => {
                    const isAdded = addedItemIds.includes(product.id);
                    return (
                      <div
                        key={product.id}
                        className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 flex flex-col justify-between hover:border-brand-300 transition-all"
                      >
                        {/* Top Card Details */}
                        <div className="space-y-3">
                          {/* Image & Remove */}
                          <div className="relative aspect-square w-full rounded-xl bg-slate-50 border border-slate-100 overflow-hidden flex items-center justify-center p-2">
                            <img
                              src={product.primary_image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80'}
                              alt={product.title}
                              className="w-full h-full object-contain"
                            />
                            <button
                              onClick={() => removeFromCompare(product.id)}
                              className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/90 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shadow-sm"
                              title="Remove from comparison"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            {product.discount_percentage > 0 && (
                              <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-bold">
                                {product.discount_percentage}% OFF
                              </span>
                            )}
                          </div>

                          {/* Brand & Title */}
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-600">
                              {product.brand}
                            </span>
                            <a
                              href={`/products/${product.slug}`}
                              target="_blank"
                              rel="noreferrer"
                              className="block text-xs font-bold text-slate-900 hover:text-brand-600 transition-colors line-clamp-2 mt-0.5"
                            >
                              {product.title} <ExternalLink className="w-2.5 h-2.5 inline text-slate-400" />
                            </a>
                          </div>

                          {/* Price & Rating */}
                          <div className="flex items-baseline justify-between pt-1">
                            <div>
                              <div className="text-base font-black text-slate-900">
                                {formatPrice(product.discount_price || product.base_price)}
                              </div>
                              {product.discount_price && (
                                <div className="text-[11px] text-slate-400 line-through">
                                  {formatPrice(product.base_price)}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
                              <Star className="w-3 h-3 fill-current text-amber-500" />
                              <span>{Number(product.rating_avg).toFixed(1)}</span>
                            </div>
                          </div>

                          {/* AI Value Score Gauge */}
                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-slate-600 flex items-center gap-1">
                                <Award className="w-3.5 h-3.5 text-brand-600" /> Value Score
                              </span>
                              <span className="font-black text-slate-900 text-sm">
                                {value_score} <span className="text-xs text-slate-400 font-normal">/ 10</span>
                              </span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  value_score >= 8.5 ? 'bg-emerald-500' :
                                  value_score >= 7.0 ? 'bg-brand-500' : 'bg-amber-500'
                                }`}
                                style={{ width: `${Math.min(100, (value_score / 10) * 100)}%` }}
                              ></div>
                            </div>
                          </div>

                          {/* Differentiator Highlights */}
                          {highlights && highlights.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {highlights.map((h, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 text-[10px] font-bold border border-brand-100"
                                >
                                  {h}
                                </span>
                              ))}
                            </div>
                          )}

                          <hr className="border-slate-100 my-2" />

                          {/* Spec Matrix List */}
                          <div className="space-y-2 text-xs">
                            {comparisonData.common_attributes.map((attr) => (
                              <div key={attr} className="py-1 border-b border-slate-50 flex flex-col gap-0.5">
                                <span className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">
                                  {attr}
                                </span>
                                <span className="font-medium text-slate-800">
                                  {specs[attr] || '—'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Add to Cart CTA */}
                        <div className="pt-4 mt-4 border-t border-slate-100">
                          <button
                            onClick={() => handleAddToCart(product)}
                            disabled={!product.in_stock}
                            className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm ${
                              isAdded
                                ? 'bg-emerald-600 text-white'
                                : product.in_stock
                                ? 'bg-brand-600 hover:bg-brand-700 text-white active:scale-98'
                                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            }`}
                          >
                            {isAdded ? (
                              <>
                                <Check className="w-3.5 h-3.5 stroke-[3]" /> Added to Cart!
                              </>
                            ) : product.in_stock ? (
                              <>
                                <ShoppingCart className="w-3.5 h-3.5" /> Add to Cart
                              </>
                            ) : (
                              'Out of Stock'
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductComparisonModal;
