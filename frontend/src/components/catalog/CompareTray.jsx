import React from 'react';
import { Scale, X, ArrowRight, Sparkles } from 'lucide-react';
import { useCompare } from '../../context/CompareContext';
import { formatPrice } from '../../utils/formatters';

export const CompareTray = () => {
  const { compareItems, removeFromCompare, clearCompare, openCompareModal } = useCompare();

  if (!compareItems || compareItems.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-full max-w-2xl px-4 animate-in slide-in-from-bottom duration-300">
      <div className="bg-slate-900/95 backdrop-blur-md text-white rounded-2xl shadow-2xl border border-slate-700/80 p-3 sm:p-4 flex items-center justify-between gap-4">
        {/* Left: Indicator & Thumbnails */}
        <div className="flex items-center gap-3 overflow-x-auto">
          <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center text-white shrink-0 shadow-sm">
            <Scale className="w-4 h-4" />
          </div>

          <div className="flex items-center gap-2">
            {compareItems.map((item) => (
              <div
                key={item.id}
                className="relative group w-12 h-12 rounded-xl bg-white border border-slate-700 overflow-hidden shrink-0"
              >
                <img
                  src={item.primary_image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&q=80'}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => removeFromCompare(item.id)}
                  className="absolute inset-0 bg-slate-950/70 text-rose-400 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                  title="Remove"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            {compareItems.length < 4 && (
              <div className="w-12 h-12 rounded-xl border-2 border-dashed border-slate-700 flex items-center justify-center text-slate-500 text-xs font-bold shrink-0">
                +{4 - compareItems.length}
              </div>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={clearCompare}
            className="text-xs text-slate-400 hover:text-white px-2 py-1 transition-colors"
          >
            Clear
          </button>

          <button
            onClick={openCompareModal}
            disabled={compareItems.length < 2}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md ${
              compareItems.length >= 2
                ? 'bg-gradient-to-r from-brand-600 to-blue-600 hover:from-brand-500 hover:to-blue-500 text-white cursor-pointer active:scale-95'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Compare ({compareItems.length}/4)</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompareTray;
