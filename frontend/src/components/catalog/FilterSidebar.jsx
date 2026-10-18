import React, { useState } from 'react';
import { Filter, Star, X, Check, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import Button from '../common/Button';
import { formatPrice } from '../../utils/formatters';

export const FilterSidebar = ({
  categories = [],
  availableBrands = [],
  selectedCategory,
  selectedBrands = [],
  minPrice,
  maxPrice,
  selectedRating,
  inStockOnly,
  onCategoryChange,
  onBrandToggle,
  onPriceChange,
  onRatingChange,
  onInStockToggle,
  onResetFilters,
  onCloseMobile
}) => {
  const [localMin, setLocalMin] = useState(minPrice || '');
  const [localMax, setLocalMax] = useState(maxPrice || '');

  const handlePriceApply = (e) => {
    e.preventDefault();
    onPriceChange(localMin ? Number(localMin) : null, localMax ? Number(localMax) : null);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
          <Filter className="w-4 h-4 text-brand-600" />
          <span>Filters & Refinements</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onResetFilters}
            className="text-xs text-brand-600 hover:text-brand-800 font-semibold flex items-center gap-1 hover:underline"
            title="Reset All"
          >
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
          {onCloseMobile && (
            <button onClick={onCloseMobile} className="lg:hidden p-1 text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* 1. Category Filter */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Categories</h4>
        <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
          <button
            onClick={() => onCategoryChange('all')}
            className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-between ${
              !selectedCategory || selectedCategory === 'all'
                ? 'bg-brand-50 text-brand-700 font-bold'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span>All Categories</span>
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onCategoryChange(cat.slug)}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-between ${
                selectedCategory === cat.slug
                  ? 'bg-brand-50 text-brand-700 font-bold'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>{cat.name}</span>
              {cat.product_count !== undefined && (
                <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                  {cat.product_count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Price Range Filter */}
      <div className="space-y-3 pt-4 border-t border-slate-100">
        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Price Range (₹)</h4>
        <form onSubmit={handlePriceApply} className="space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase">Min</span>
              <input
                type="number"
                placeholder="0"
                value={localMin}
                onChange={(e) => setLocalMin(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase">Max</span>
              <input
                type="number"
                placeholder="200000"
                value={localMax}
                onChange={(e) => setLocalMax(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold tracking-wide transition-colors"
          >
            Apply Price
          </button>
        </form>
      </div>

      {/* 3. Star Rating Filter */}
      <div className="space-y-3 pt-4 border-t border-slate-100">
        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Customer Rating</h4>
        <div className="space-y-1.5">
          {[4, 3].map((stars) => (
            <button
              key={stars}
              onClick={() => onRatingChange(selectedRating === stars ? null : stars)}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                selectedRating === stars ? 'bg-amber-50 text-amber-900 font-bold' : 'hover:bg-slate-50 text-slate-600'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <div className="flex items-center text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3.5 h-3.5 ${
                        i < stars ? 'fill-current text-amber-400' : 'text-slate-200'
                      }`}
                    />
                  ))}
                </div>
                <span>{stars}★ & above</span>
              </div>
              {selectedRating === stars && <Check className="w-3.5 h-3.5 text-amber-600" />}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Brand Filter */}
      {availableBrands.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-slate-100">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Brands</h4>
          <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
            {availableBrands.map((brandName) => {
              const isChecked = selectedBrands.includes(brandName);
              return (
                <label
                  key={brandName}
                  className="flex items-center gap-2.5 text-xs text-slate-700 hover:text-slate-900 cursor-pointer select-none"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => onBrandToggle(brandName)}
                    className="w-3.5 h-3.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span>{brandName}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. In-Stock Availability Toggle */}
      <div className="pt-4 border-t border-slate-100">
        <label className="flex items-center justify-between text-xs font-medium text-slate-700 cursor-pointer select-none">
          <span>In Stock Only</span>
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(e) => onInStockToggle(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          />
        </label>
      </div>
    </div>
  );
};

export default FilterSidebar;
