import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, ShoppingCart, Trash2, ArrowRight, ShieldCheck } from 'lucide-react';
import Button from '../components/common/Button';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { formatPrice } from '../utils/formatters';

export const Wishlist = () => {
  const navigate = useNavigate();
  const { wishlist, toggleWishlist, addToCart } = useCart();
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-md mx-auto bg-white rounded-3xl border border-slate-200/90 p-8 text-center shadow-sm space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
            <Heart className="w-8 h-8 fill-current" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Your Wishlist Awaits</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Please log in to your ShopSphere account to view and synchronize your saved items across devices.
          </p>
          <div className="flex flex-col gap-2 pt-2">
            <Button size="md" variant="primary" onClick={() => navigate('/login')} className="w-full">
              Sign In
            </Button>
            <Button size="md" variant="outline" onClick={() => navigate('/catalog')} className="w-full">
              Explore Products
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (wishlist.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-md mx-auto bg-white rounded-3xl border border-slate-200/90 p-8 text-center shadow-sm space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Heart className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Your Wishlist is Empty</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Tap the heart icon on any product to save your favorite items for later!
          </p>
          <Button
            size="md"
            variant="primary"
            onClick={() => navigate('/catalog')}
            className="w-full"
            icon={ArrowRight}
          >
            Explore Catalog
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            My Wishlist
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-rose-100 text-rose-700">
              {wishlist.length} {wishlist.length === 1 ? 'item' : 'items'}
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">Products you’ve saved for later</p>
        </div>
      </div>

      {/* Grid of Wishlist items */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {wishlist.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="relative aspect-square w-full rounded-xl bg-slate-50 overflow-hidden p-2 flex items-center justify-center">
                <Link to={`/products/${item.product_slug}`}>
                  <img
                    src={item.image_url || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80'}
                    alt={item.product_title}
                    className="w-full h-full object-contain hover:scale-105 transition-transform"
                  />
                </Link>
                <button
                  onClick={() => toggleWishlist(item.product_id)}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 text-rose-600 hover:bg-rose-50 shadow-sm transition-colors"
                  title="Remove from Wishlist"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-600">
                  {item.brand}
                </span>
                <Link
                  to={`/products/${item.product_slug}`}
                  className="block text-xs font-bold text-slate-900 hover:text-brand-600 transition-colors line-clamp-2 mt-0.5"
                >
                  {item.product_title}
                </Link>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-sm font-black text-slate-900">
                    {formatPrice(item.discount_price || item.base_price)}
                  </span>
                  {item.discount_price && item.discount_price < item.base_price && (
                    <span className="text-xs text-slate-400 line-through">
                      {formatPrice(item.base_price)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-4 mt-3 border-t border-slate-100 flex items-center gap-2">
              <Link to={`/products/${item.product_slug}`} className="w-full">
                <Button size="sm" variant="primary" className="w-full" icon={ShoppingCart}>
                  View & Order
                </Button>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Wishlist;
