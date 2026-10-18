import React from 'react';
import { 
  ShieldCheck, 
  Truck, 
  RotateCcw, 
  Headphones, 
  CreditCard, 
  Mail, 
  ArrowRight,
  ShoppingBag
} from 'lucide-react';
import Button from '../common/Button';

export const Footer = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Value Proposition Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-12 border-b border-slate-800">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-slate-800 text-brand-400 shrink-0">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm">Free & Fast Delivery</h4>
              <p className="text-xs text-slate-400 mt-1">Complimentary express shipping on all eligible orders over ₹499.</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-slate-800 text-emerald-400 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm">100% Secure Checkout</h4>
              <p className="text-xs text-slate-400 mt-1">PCI-DSS compliant payments with bank-grade 256-bit SSL encryption.</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-slate-800 text-amber-400 shrink-0">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm">Hassle-Free Returns</h4>
              <p className="text-xs text-slate-400 mt-1">7-day doorstep replacement or refund guarantee on all verified products.</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-slate-800 text-cyan-400 shrink-0">
              <Headphones className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm">24/7 Dedicated Support</h4>
              <p className="text-xs text-slate-400 mt-1">Our customer concierge and AI shopping assistant are always ready to help.</p>
            </div>
          </div>
        </div>

        {/* Links Navigation Matrix */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 py-12 border-b border-slate-800">
          {/* Brand Info */}
          <div className="col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center text-white">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">
                Shop<span className="text-brand-400">Sphere</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm mb-6">
              ShopSphere is an open, modern e-commerce marketplace platform built for speed, transparency, and seamless discovery. Experience smart shopping elevated by technology.
            </p>
            <div className="flex items-center gap-3 text-slate-400 text-xs">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 text-slate-300">
                <CreditCard className="w-3.5 h-3.5" /> Stripe & Razorpay Ready
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 text-slate-300">
                <ShieldCheck className="w-3.5 h-3.5" /> ISO/IEC Certified
              </span>
            </div>
          </div>

          {/* Column: Categories */}
          <div>
            <h5 className="text-white font-semibold text-xs uppercase tracking-wider mb-4">Popular Categories</h5>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><a href="/catalog?category=electronics" className="hover:text-white transition-colors">Smartphones & Tech</a></li>
              <li><a href="/catalog?category=laptops" className="hover:text-white transition-colors">Laptops & Workstations</a></li>
              <li><a href="/catalog?category=audio" className="hover:text-white transition-colors">Headphones & Audio</a></li>
              <li><a href="/catalog?category=wearables" className="hover:text-white transition-colors">Smart Watches</a></li>
              <li><a href="/catalog?category=fashion" className="hover:text-white transition-colors">Men & Women Apparel</a></li>
            </ul>
          </div>

          {/* Column: Customer Service */}
          <div>
            <h5 className="text-white font-semibold text-xs uppercase tracking-wider mb-4">Customer Care</h5>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><a href="/profile/orders" className="hover:text-white transition-colors">Track Your Order</a></li>
              <li><a href="/returns" className="hover:text-white transition-colors">Shipping & Returns</a></li>
              <li><a href="/faq" className="hover:text-white transition-colors">Help Center / FAQs</a></li>
              <li><a href="/terms" className="hover:text-white transition-colors">Terms of Service</a></li>
              <li><a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a></li>
            </ul>
          </div>

          {/* Column: Merchants & Partners */}
          <div>
            <h5 className="text-white font-semibold text-xs uppercase tracking-wider mb-4">For Partners</h5>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><a href="/seller/register" className="hover:text-white transition-colors text-brand-400 font-medium">Sell on ShopSphere</a></li>
              <li><a href="/seller/login" className="hover:text-white transition-colors">Merchant Portal</a></li>
              <li><a href="/admin" className="hover:text-white transition-colors">Administrator Access</a></li>
              <li><a href="/api/v1/health" target="_blank" className="hover:text-white transition-colors">API Health Check</a></li>
              <li><a href="/docs" target="_blank" className="hover:text-white transition-colors">Swagger API Docs</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom Copyright */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} ShopSphere Inc. All rights reserved. Designed for enterprise e-commerce.</p>
          <div className="flex items-center gap-6">
            <span className="text-slate-400">Engineering: React 18 • FastAPI • PostgreSQL</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
