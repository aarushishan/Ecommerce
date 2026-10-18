import React, { useState } from 'react';
import { Star, Heart, ShoppingCart, Check, Zap, Scale } from 'lucide-react';
import { formatPrice } from '../../utils/formatters';
import { useCompare } from '../../context/CompareContext';

export const ProductCard = ({ product, onAddToCart, onToggleWishlist, isWishlisted = false }) => {
  const [isAdded, setIsAdded] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const { isInCompare, addToCompare, removeFromCompare } = useCompare();

  const isCompared = isInCompare(product.id);
  const displayPrice = product.discount_price || product.base_price;
  const hasDiscount = product.discount_price && product.discount_price < product.base_price;

  const handleAddToCartClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!product.in_stock) return;
    setIsAdded(true);
    if (onAddToCart) onAddToCart(product);
    setTimeout(() => setIsAdded(false), 1500);
  };

  const handleWishlistClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onToggleWishlist) onToggleWishlist(product);
  };

  const handleCompareClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isCompared) {
      removeFromCompare(product.id);
    } else {
      addToCompare(product);
    }
  };

  return (
    <div className="group relative bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-brand-200 transition-all duration-300 flex flex-col h-full overflow-hidden">
      {/* Top Media & Badges */}
      <div className="relative aspect-square w-full bg-slate-100 overflow-hidden">
        <a href={`/products/${product.slug}`} className="block w-full h-full">
          <img
            src={product.primary_image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80'}
            alt={product.title}
            className={`w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setImageLoaded(true)}
            loading="lazy"
          />
        </a>

        {/* Floating Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10 pointer-events-none">
          {hasDiscount && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-rose-600 text-white text-[11px] font-bold shadow-sm">
              {product.discount_percentage}% OFF
            </span>
          )}
          {product.is_featured && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500 text-white text-[10px] font-bold shadow-sm">
              <Zap className="w-2.5 h-2.5 fill-current" /> TOP PICK
            </span>
          )}
        </div>

        {/* Floating Action Buttons: Wishlist & Compare */}
        <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-10">
          <button
            onClick={handleWishlistClick}
            className={`p-2 rounded-full backdrop-blur-md transition-all duration-200 ${
              isWishlisted
                ? 'bg-rose-50 text-rose-600 shadow-sm'
                : 'bg-white/80 hover:bg-white text-slate-600 hover:text-rose-600 shadow-sm'
            }`}
            title={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
            aria-label="Wishlist"
          >
            <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current text-rose-600' : ''}`} />
          </button>

          <button
            onClick={handleCompareClick}
            className={`p-2 rounded-full backdrop-blur-md transition-all duration-200 ${
              isCompared
                ? 'bg-brand-50 text-brand-600 shadow-sm ring-1 ring-brand-300'
                : 'bg-white/80 hover:bg-white text-slate-600 hover:text-brand-600 shadow-sm'
            }`}
            title={isCompared ? 'Remove from comparison' : 'Add to compare'}
            aria-label="Compare"
          >
            <Scale className="w-4 h-4" />
          </button>
        </div>

        {/* Out of Stock Overlay */}
        {!product.in_stock && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] flex items-center justify-center z-10 pointer-events-none">
            <span className="px-3 py-1 bg-slate-900 text-white text-xs font-bold rounded-full uppercase tracking-wider shadow">
              Out of Stock
            </span>
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        <div className="space-y-1.5">
          {/* Brand & Category */}
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            <span>{product.brand}</span>
            <span className="text-brand-600">{product.category_name}</span>
          </div>

          {/* Title */}
          <a
            href={`/products/${product.slug}`}
            className="block text-sm font-bold text-slate-900 hover:text-brand-600 transition-colors line-clamp-2 leading-snug"
            title={product.title}
          >
            {product.title}
          </a>

          {/* Star Rating */}
          <div className="flex items-center gap-1.5 pt-1">
            <div className="flex items-center text-amber-400">
              <Star className="w-3.5 h-3.5 fill-current" />
            </div>
            <span className="text-xs font-bold text-slate-800">{Number(product.rating_avg).toFixed(1)}</span>
            <span className="text-xs text-slate-400">({product.rating_count})</span>
          </div>
        </div>

        {/* Pricing & Cart Action */}
        <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-between gap-2">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base sm:text-lg font-black text-slate-900">
                {formatPrice(displayPrice)}
              </span>
              {hasDiscount && (
                <span className="text-xs text-slate-400 line-through">
                  {formatPrice(product.base_price)}
                </span>
              )}
            </div>
            <span className="text-[10px] text-emerald-600 font-semibold block">
              Free Express Delivery
            </span>
          </div>

          <button
            onClick={handleAddToCartClick}
            disabled={!product.in_stock}
            className={`p-2.5 rounded-xl font-medium transition-all duration-200 flex items-center justify-center shrink-0 ${
              isAdded
                ? 'bg-emerald-600 text-white scale-95 shadow-sm'
                : product.in_stock
                ? 'bg-brand-600 hover:bg-brand-700 text-white shadow-sm hover:shadow active:scale-95'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
            title={isAdded ? 'Added to Cart!' : 'Add to Shopping Cart'}
            aria-label="Add to cart"
          >
            {isAdded ? (
              <Check className="w-4 h-4 stroke-[3]" />
            ) : (
              <ShoppingCart className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
