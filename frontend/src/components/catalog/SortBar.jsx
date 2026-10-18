import React from 'react';
import { SlidersHorizontal, ArrowUpDown, LayoutGrid, List } from 'lucide-react';

export const SortBar = ({
  totalItems = 0,
  currentSort = 'featured',
  onSortChange,
  onOpenMobileFilters,
  viewMode = 'grid',
  onViewModeChange
}) => {
  const sortOptions = [
    { value: 'featured', label: 'Featured Items' },
    { value: 'price_asc', label: 'Price: Low to High' },
    { value: 'price_desc', label: 'Price: High to Low' },
    { value: 'rating_desc', label: 'Customer Rating' },
    { value: 'popular', label: 'Most Popular' },
    { value: 'newest', label: 'Newest Arrivals' },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 px-4 py-3 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
      {/* Result Count & Mobile Filter Trigger */}
      <div className="flex items-center justify-between w-full sm:w-auto gap-3">
        <button
          onClick={onOpenMobileFilters}
          className="lg:hidden inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Filters</span>
        </button>

        <span className="text-xs text-slate-500 font-medium">
          Showing <strong className="text-slate-900 font-bold">{totalItems}</strong> {totalItems === 1 ? 'product' : 'products'}
        </span>
      </div>

      {/* Sort Select & View Mode */}
      <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
        <div className="flex items-center gap-2">
          <label htmlFor="sort-select" className="text-xs font-semibold text-slate-500 shrink-0">
            Sort by:
          </label>
          <div className="relative">
            <select
              id="sort-select"
              value={currentSort}
              onChange={(e) => onSortChange(e.target.value)}
              className="appearance-none bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 py-1.5 pl-3 pr-8 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer"
            >
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2 pointer-events-none" />
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="hidden sm:flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
          <button
            onClick={() => onViewModeChange('grid')}
            className={`p-1.5 rounded-md transition-colors ${
              viewMode === 'grid' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Grid View"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => onViewModeChange('list')}
            className={`p-1.5 rounded-md transition-colors ${
              viewMode === 'list' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
            title="List View"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SortBar;
