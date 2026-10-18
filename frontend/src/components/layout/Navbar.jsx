import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ShoppingBag, 
  Search, 
  ShoppingCart, 
  Heart, 
  User, 
  Menu, 
  X, 
  ShieldCheck, 
  Sparkles,
  ChevronDown,
  LogOut,
  MapPin,
  Package,
  Store
} from 'lucide-react';
import Button from '../common/Button';
import Badge from '../common/Badge';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';

export const Navbar = ({ cartCount = 0, wishlistCount = 0, isApiConnected = false }) => {
  const { user, logout } = useAuth();
  const { cart, wishlistCount: contextWishlistCount } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const displayCartCount = cart?.total_items ?? cartCount;
  const displayWishlistCount = contextWishlistCount ?? wishlistCount;

  const handleSearchSubmit = (e, forceSemantic = false) => {
    e?.preventDefault();
    if (searchQuery.trim()) {
      const qLower = searchQuery.toLowerCase();
      const isNatural = forceSemantic || [
        'under', 'below', 'between', 'less than', 'cheap', 'budget', 'best', 'top rated', 'above', 'over'
      ].some((term) => qLower.includes(term));
      const targetUrl = `/catalog?q=${encodeURIComponent(searchQuery.trim())}${isNatural ? '&semantic=true' : ''}`;
      window.location.href = targetUrl;
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 transition-all duration-200">
      {/* Top Banner Alert / Status */}
      <div className="bg-brand-900 text-brand-100 text-xs py-1.5 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span className="font-medium">ShopSphere Launch: Free Express Delivery on orders over ₹499!</span>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isApiConnected ? 'bg-emerald-400' : 'bg-amber-400'} animate-pulse`}></span>
              Backend: {isApiConnected ? 'Connected (v1.0)' : 'Connecting...'}
            </span>
            <span className="text-slate-400">|</span>
            <Link to="/seller" className="hover:text-white transition-colors">
              {user && (user.role?.name === 'SELLER' || user.role?.name === 'ADMIN') ? 'Seller Dashboard' : 'Become a Seller'}
            </Link>
            <span className="text-slate-400">|</span>
            <a href="/catalog" className="hover:text-white transition-colors">Catalog</a>
          </div>
        </div>
      </div>

      {/* Main Nav Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-4">
          {/* Logo & Brand Identity */}
          <div className="flex items-center gap-6">
            <a href="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-700 to-brand-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform duration-200">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 leading-none">
                  Shop<span className="text-brand-600">Sphere</span>
                </span>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">
                  Next-Gen Commerce
                </span>
              </div>
            </a>
          </div>

          {/* Search Bar (Desktop) */}
          <div className="hidden md:flex flex-1 max-w-xl mx-4">
            <form onSubmit={handleSearchSubmit} className="relative w-full">
              <input
                type="text"
                placeholder="Search products, brands, electronics, fashion..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-24 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 transition-all shadow-inner"
              />
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <div className="absolute right-1.5 top-1.5 bottom-1.5 flex items-center gap-1">
                <button
                  type="button"
                  onClick={(e) => handleSearchSubmit(e, true)}
                  className="px-2 py-1 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 border border-brand-200"
                  title="Search using AI Vector Semantic Search"
                >
                  <Sparkles className="w-3.5 h-3.5 text-brand-600" />
                  <span className="hidden sm:inline">AI</span>
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold tracking-wide transition-colors flex items-center gap-1 shadow-sm h-full"
                >
                  Search
                </button>
              </div>
            </form>
          </div>

          {/* User Nav Actions */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Wishlist */}
            <Link
              to="/wishlist"
              className="relative p-2 text-slate-600 hover:text-brand-600 hover:bg-slate-50 rounded-lg transition-colors"
              title="Saved Items"
            >
              <Heart className="w-5 h-5" />
              {displayWishlistCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {displayWishlistCount}
                </span>
              )}
            </Link>

            {/* Cart Button */}
            <Link
              to="/cart"
              className="relative flex items-center gap-2 px-3 py-2 text-slate-700 hover:text-brand-600 hover:bg-slate-50 rounded-lg transition-colors"
            >
              <div className="relative">
                <ShoppingCart className="w-5 h-5" />
                {displayCartCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] bg-brand-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-sm">
                    {displayCartCount}
                  </span>
                )}
              </div>
              <span className="hidden lg:inline text-sm font-semibold">Cart</span>
            </Link>

            {/* Seller Quick Action Shortcut */}
            {user && (user.role?.name === 'SELLER' || user.role?.name === 'ADMIN') && (
              <Link
                to="/seller"
                className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-50 text-brand-700 hover:bg-brand-100 text-xs font-bold border border-brand-200 transition-colors shadow-sm"
                title="Seller Dashboard"
              >
                <Store className="w-4 h-4 text-brand-600" />
                <span>Seller Hub</span>
              </Link>
            )}

            {/* Admin Command Center Quick Action */}
            {user && user.role?.name === 'ADMIN' && (
              <Link
                to="/admin"
                className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-bold border border-purple-200 transition-colors shadow-sm"
                title="Admin Command Center"
              >
                <ShieldCheck className="w-4 h-4 text-purple-600" />
                <span>Admin</span>
              </Link>
            )}

            {/* User Account / Login */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white text-xs font-semibold text-slate-700 shadow-sm transition-all focus:outline-none"
                >
                  <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 font-black flex items-center justify-center text-xs">
                    {user.first_name ? user.first_name[0] : 'U'}
                  </div>
                  <span className="hidden sm:inline">{user.first_name || 'Account'}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {/* User Dropdown Menu */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-fade-in">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-900 line-clamp-1">
                          {user.first_name} {user.last_name}
                        </p>
                        <span className="text-[9px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded bg-brand-50 text-brand-700 font-bold border border-brand-200">
                          {user.role?.name || 'CUSTOMER'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{user.email}</p>
                    </div>

                    <Link
                      to="/profile"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <User className="w-4 h-4 text-brand-600" />
                      <span>My Profile</span>
                    </Link>

                    <Link
                      to="/profile"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <Package className="w-4 h-4 text-amber-500" />
                      <span>My Orders</span>
                    </Link>

                    {/* Role specific links in dropdown */}
                    {(user.role?.name === 'SELLER' || user.role?.name === 'ADMIN') && (
                      <Link
                        to="/seller"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-brand-700 hover:bg-brand-50 transition-colors"
                      >
                        <Store className="w-4 h-4 text-brand-600" />
                        <span>Seller Dashboard</span>
                      </Link>
                    )}

                    {user.role?.name === 'ADMIN' && (
                      <Link
                        to="/admin"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-50 transition-colors"
                      >
                        <ShieldCheck className="w-4 h-4 text-purple-600" />
                        <span>Admin Command</span>
                      </Link>
                    )}

                    {user.role?.name === 'CUSTOMER' && (
                      <Link
                        to="/seller"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50 transition-colors"
                      >
                        <Store className="w-4 h-4 text-emerald-600" />
                        <span>Become a Seller</span>
                      </Link>
                    )}

                    <div className="border-t border-slate-100 my-1"></div>

                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3.5 py-2 text-sm font-semibold text-slate-700 hover:text-brand-600 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="hidden sm:inline-flex"
                >
                  <Button size="sm" variant="primary">
                    Join Free
                  </Button>
                </Link>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              aria-label="Toggle Navigation"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Category Navigation Strip (Desktop) */}
      <div className="hidden md:block border-t border-slate-100 bg-slate-50/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ul className="flex items-center gap-8 py-2 text-xs font-semibold text-slate-600 tracking-wide">
            <li>
              <a href="/catalog?category=all" className="flex items-center gap-1.5 text-brand-700 hover:text-brand-800">
                <Menu className="w-3.5 h-3.5" /> All Categories
              </a>
            </li>
            <li><a href="/catalog?category=electronics" className="hover:text-brand-600 transition-colors">Electronics & Gadgets</a></li>
            <li><a href="/catalog?category=fashion" className="hover:text-brand-600 transition-colors">Fashion & Apparel</a></li>
            <li><a href="/catalog?category=home" className="hover:text-brand-600 transition-colors">Home & Living</a></li>
            <li><a href="/catalog?category=beauty" className="hover:text-brand-600 transition-colors">Beauty & Personal Care</a></li>
            <li><a href="/catalog?deal=true" className="text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1">Today's Deals</a></li>
          </ul>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-4 animate-fade-in shadow-xl">
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm"
            />
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          </form>

          <div className="space-y-1 font-medium text-sm text-slate-700">
            <Link to="/catalog" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-md hover:bg-slate-50">All Products</Link>
            <Link to="/catalog?category=electronics" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-md hover:bg-slate-50">Electronics</Link>
            <Link to="/catalog?category=fashion" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-md hover:bg-slate-50">Fashion</Link>
            <Link to="/catalog?deal=true" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-md text-rose-600 hover:bg-rose-50 font-semibold">Today's Deals</Link>
            <hr className="my-2 border-slate-100" />
            <Link to="/seller" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-md hover:bg-brand-50 text-brand-600 font-semibold">
              {user && (user.role?.name === 'SELLER' || user.role?.name === 'ADMIN') ? 'Seller Dashboard' : 'Become a Seller'}
            </Link>
            {user && user.role?.name === 'ADMIN' && (
              <Link to="/admin" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-md hover:bg-purple-50 text-purple-700 font-semibold">
                Admin Command Center
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
