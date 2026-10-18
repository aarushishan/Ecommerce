import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ShoppingBag, 
  Trash2, 
  Plus, 
  Minus, 
  ArrowRight, 
  ShieldCheck, 
  Truck, 
  Tag, 
  Sparkles,
  ArrowLeft
} from 'lucide-react';
import Button from '../components/common/Button';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../utils/formatters';

export const Cart = () => {
  const navigate = useNavigate();
  const { cart, updateQuantity, removeItem, clearCart, loading } = useCart();
  const [couponCode, setCouponCode] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponError, setCouponError] = useState('');

  const {
    items = [],
    total_items = 0,
    subtotal = 0,
    discount_amount = 0,
    shipping_fee = 0,
    tax_amount = 0,
    total_amount = 0,
    eligible_for_free_shipping = false,
    free_shipping_threshold = 499,
  } = cart || {};

  const amountNeededForFreeShipping = Math.max(0, free_shipping_threshold - subtotal);
  const progressPercent = Math.min(100, Math.round((subtotal / free_shipping_threshold) * 100));

  const handleApplyCoupon = (e) => {
    e.preventDefault();
    setCouponError('');
    if (!couponCode.trim()) return;

    if (couponCode.trim().toUpperCase() === 'SPHERE10' || couponCode.trim().toUpperCase() === 'WELCOME10') {
      setCouponApplied(true);
    } else {
      setCouponError('Invalid coupon code. Try SPHERE10 for demo discounts.');
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-lg mx-auto bg-white rounded-3xl border border-slate-200/90 p-10 text-center shadow-sm space-y-6">
          <div className="w-20 h-20 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto shadow-inner">
            <ShoppingBag className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Your Cart is Empty</h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              Looks like you haven't added anything to your cart yet. Explore thousands of hand-picked top products with unbeatable offers!
            </p>
          </div>
          <Button
            size="lg"
            variant="primary"
            onClick={() => navigate('/catalog')}
            className="w-full"
            icon={ArrowRight}
          >
            Start Shopping Now
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Page Title & Back */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            Shopping Cart
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-brand-100 text-brand-800">
              {total_items} {total_items === 1 ? 'item' : 'items'}
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">Review your selected items and proceed to secure checkout</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="outline"
            onClick={clearCart}
            icon={Trash2}
            className="text-rose-600 border-rose-200 hover:bg-rose-50"
          >
            Clear Cart
          </Button>
          <Link to="/catalog">
            <Button size="sm" variant="ghost" icon={ArrowLeft}>
              Continue Shopping
            </Button>
          </Link>
        </div>
      </div>

      {/* Free Shipping Tracker Bar */}
      <div className="bg-gradient-to-r from-brand-50 via-white to-amber-50 rounded-2xl border border-brand-200/80 p-4 sm:p-5 shadow-sm space-y-2.5">
        <div className="flex items-center justify-between text-xs sm:text-sm font-semibold">
          <div className="flex items-center gap-2 text-slate-800">
            <Truck className="w-4 h-4 text-brand-600" />
            {eligible_for_free_shipping ? (
              <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                Congratulations! You qualified for FREE Express Delivery!
              </span>
            ) : (
              <span>
                Add <strong className="text-brand-700">{formatPrice(amountNeededForFreeShipping)}</strong> more to unlock <strong className="text-emerald-600">FREE Express Delivery</strong>!
              </span>
            )}
          </div>
          <span className="text-xs font-bold text-slate-500">{progressPercent}%</span>
        </div>
        <div className="w-full bg-slate-200/80 rounded-full h-2.5 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              eligible_for_free_shipping
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                : 'bg-gradient-to-r from-brand-600 to-amber-500'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* 2-Column Layout: Items List & Order Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Cart Items List */}
        <div className="lg:col-span-8 space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col sm:flex-row gap-5 items-start sm:items-center justify-between"
            >
              {/* Product Thumbnail & Details */}
              <div className="flex items-center gap-4 flex-1">
                <Link
                  to={`/products/${item.product_slug}`}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-slate-50 border border-slate-100 p-2 shrink-0 overflow-hidden flex items-center justify-center hover:opacity-90"
                >
                  <img
                    src={item.image_url || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&q=80'}
                    alt={item.product_title}
                    className="w-full h-full object-contain"
                  />
                </Link>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand-600">
                    {item.brand}
                  </span>
                  <Link
                    to={`/products/${item.product_slug}`}
                    className="block text-sm font-bold text-slate-900 hover:text-brand-600 transition-colors line-clamp-1"
                  >
                    {item.product_title}
                  </Link>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md font-medium">
                      Variant: {item.variant_title}
                    </span>
                    {item.in_stock ? (
                      <span className="text-[10px] text-emerald-600 font-bold">In Stock</span>
                    ) : (
                      <span className="text-[10px] text-rose-600 font-bold">Out of Stock</span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-2 pt-0.5">
                    <span className="text-sm font-black text-slate-900">
                      {formatPrice(item.unit_price)}
                    </span>
                    {item.base_price > item.unit_price && (
                      <span className="text-xs text-slate-400 line-through">
                        {formatPrice(item.base_price)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Quantity Stepper & Line Price */}
              <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                <div className="text-right hidden sm:block">
                  <span className="text-base font-black text-slate-900">
                    {formatPrice(item.total_price)}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {/* Stepper */}
                  <div className="flex items-center border border-slate-300 rounded-xl bg-white shadow-sm">
                    <button
                      onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                      disabled={item.quantity <= 1 || loading}
                      className="p-1.5 text-slate-600 hover:text-slate-900 disabled:opacity-40"
                      title="Decrease quantity"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-3 text-xs font-bold text-slate-900">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      disabled={item.quantity >= item.max_stock || loading}
                      className="p-1.5 text-slate-600 hover:text-slate-900 disabled:opacity-40"
                      title="Increase quantity"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => removeItem(item.id)}
                    disabled={loading}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Mobile Line Total */}
                <div className="sm:hidden font-black text-sm text-slate-900">
                  {formatPrice(item.total_price)}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Right Column: Authoritative Order Summary */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-5 sticky top-28">
            <h3 className="text-lg font-black text-slate-900 pb-3 border-b border-slate-100">
              Order Summary
            </h3>

            {/* Price Calculations */}
            <div className="space-y-3 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Items Subtotal ({total_items} items)</span>
                <span className="font-bold text-slate-900">{formatPrice(subtotal)}</span>
              </div>

              {discount_amount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Product Discounts</span>
                  <span className="font-bold">-{formatPrice(discount_amount)}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span>Shipping Fee</span>
                <span className="font-bold">
                  {shipping_fee === 0 || eligible_for_free_shipping ? (
                    <span className="text-emerald-600 uppercase font-black">FREE</span>
                  ) : (
                    formatPrice(shipping_fee)
                  )}
                </span>
              </div>

              <div className="flex justify-between">
                <span>Estimated GST Tax (5%)</span>
                <span className="font-bold text-slate-900">{formatPrice(tax_amount)}</span>
              </div>

              {couponApplied && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Promo Code (SPHERE10)</span>
                  <span>-10% Applied at Checkout</span>
                </div>
              )}

              <div className="border-t border-slate-200 pt-3 flex justify-between items-baseline">
                <div>
                  <span className="text-base font-black text-slate-900 block">Total Amount</span>
                  <span className="text-[10px] text-slate-400">Inclusive of all taxes</span>
                </div>
                <span className="text-2xl font-black text-slate-900">
                  {formatPrice(total_amount)}
                </span>
              </div>
            </div>

            {/* Coupon Code Section */}
            <form onSubmit={handleApplyCoupon} className="space-y-2 pt-2 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-brand-600" /> Apply Promo Code
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. SPHERE10"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs uppercase font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
                >
                  Apply
                </button>
              </div>
              {couponApplied && (
                <p className="text-xs text-emerald-600 font-semibold">Promo code SPHERE10 verified!</p>
              )}
              {couponError && (
                <p className="text-xs text-rose-600 font-semibold">{couponError}</p>
              )}
            </form>

            {/* Checkout CTA */}
            <Button
              size="lg"
              variant="primary"
              onClick={() => navigate('/checkout')}
              className="w-full shadow-lg shadow-brand-500/20 py-3.5"
              icon={ArrowRight}
            >
              Proceed to Checkout
            </Button>

            {/* Trust Badges */}
            <div className="pt-3 border-t border-slate-100 space-y-2 text-[11px] text-slate-500">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>256-Bit SSL Encrypted & Bank-Grade Security</span>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-brand-600 shrink-0" />
                <span>Zero Delivery Fee on Orders Above ₹499</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
