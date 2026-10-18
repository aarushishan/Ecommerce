import React, { useState, useEffect } from 'react';
import { 
  Store, 
  Package, 
  TrendingUp, 
  AlertTriangle, 
  Plus, 
  Search, 
  Edit3, 
  Boxes, 
  Truck, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  X
} from 'lucide-react';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Badge from '../components/common/Badge';
import sellerService from '../services/sellerService';
import productService from '../services/productService';
import { formatPrice } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';

export const SellerDashboard = () => {
  const { user } = useAuth();

  const [profile, setProfile] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [categories, setCategories] = useState([]);
  
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'products', 'orders', 'settings'
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionMsg, setActionMsg] = useState({ type: '', text: '' });

  // Onboarding Modal State
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [onboardForm, setOnboardForm] = useState({
    store_name: `${user?.first_name || 'My'}'s Official Store`,
    description: 'Verified seller offering authentic electronics and lifestyle items.',
    tax_id: 'GSTIN-IND-884422'
  });

  // Add Product Modal State
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [isSubmittingProd, setIsSubmittingProd] = useState(false);
  const [newProd, setNewProd] = useState({
    title: '',
    category_id: 1,
    brand: '',
    description: '',
    base_price: '',
    discount_price: '',
    initial_stock: 20,
    image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80'
  });

  // Stock Adjustment Modal State
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [stockQty, setStockQty] = useState(10);
  const [isUpdatingStock, setIsUpdatingStock] = useState(false);

  const showNotification = (type, text) => {
    setActionMsg({ type, text });
    setTimeout(() => setActionMsg({ type: '', text: '' }), 4000);
  };

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const prof = await sellerService.getProfile();
      setProfile(prof);

      const [met, prods, ords, cats] = await Promise.all([
        sellerService.getMetrics(),
        sellerService.getProducts(),
        sellerService.getOrderItems(),
        productService.getCategories()
      ]);

      setMetrics(met);
      setProducts(prods);
      setOrders(ords);
      setCategories(cats);
      if (cats.length > 0 && !newProd.category_id) {
        setNewProd((prev) => ({ ...prev, category_id: cats[0].id }));
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setProfile(null);
      } else {
        console.error('Failed to load seller dashboard data:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleOnboardSubmit = async (e) => {
    e.preventDefault();
    setIsOnboarding(true);
    try {
      const created = await sellerService.onboardSeller(onboardForm);
      setProfile(created);
      showNotification('success', `Storefront '${created.store_name}' activated successfully!`);
      loadDashboardData();
    } catch (err) {
      showNotification('error', err.response?.data?.detail || err.message || 'Onboarding failed.');
    } finally {
      setIsOnboarding(false);
    }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    setIsSubmittingProd(true);
    try {
      await sellerService.createProduct({
        ...newProd,
        base_price: parseFloat(newProd.base_price),
        discount_price: newProd.discount_price ? parseFloat(newProd.discount_price) : null,
        initial_stock: parseInt(newProd.initial_stock, 10)
      });
      setShowAddProductModal(false);
      setNewProd({
        title: '',
        category_id: categories[0]?.id || 1,
        brand: '',
        description: '',
        base_price: '',
        discount_price: '',
        initial_stock: 20,
        image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80'
      });
      showNotification('success', 'New product catalog listing created successfully!');
      loadDashboardData();
    } catch (err) {
      showNotification('error', err.response?.data?.detail || err.message || 'Failed to create product.');
    } finally {
      setIsSubmittingProd(false);
    }
  };

  const handleUpdateStock = async (e) => {
    e.preventDefault();
    if (!selectedVariant) return;
    setIsUpdatingStock(true);
    try {
      await sellerService.updateStock(selectedVariant.id, {
        variant_id: selectedVariant.id,
        quantity: parseInt(stockQty, 10),
      });
      setSelectedVariant(null);
      showNotification('success', 'Inventory stock level adjusted cleanly.');
      loadDashboardData();
    } catch (err) {
      showNotification('error', err.response?.data?.detail || err.message || 'Stock adjustment failed.');
    } finally {
      setIsUpdatingStock(false);
    }
  };

  const filteredProducts = products.filter((p) =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.brand.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-12 h-12 border-4 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-semibold text-slate-600">Loading Seller Command Hub...</p>
      </div>
    );
  }

  // Not yet onboarded as a Seller -> Onboarding Call to Action
  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="bg-white rounded-3xl border border-slate-200/90 p-8 sm:p-12 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-brand-50 border border-brand-200 flex items-center justify-center mx-auto text-brand-600">
            <Store className="w-8 h-8" />
          </div>

          <div className="space-y-2 max-w-lg mx-auto">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Launch Your ShopSphere Storefront
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              Join thousands of verified merchants on ShopSphere. List your products, track real-time revenue, and fulfill consumer orders with zero friction.
            </p>
          </div>

          <form onSubmit={handleOnboardSubmit} className="max-w-md mx-auto space-y-4 text-left pt-2">
            <Input
              label="Storefront Business Name"
              value={onboardForm.store_name}
              onChange={(e) => setOnboardForm({ ...onboardForm, store_name: e.target.value })}
              required
            />
            <Input
              label="Store Description"
              value={onboardForm.description}
              onChange={(e) => setOnboardForm({ ...onboardForm, description: e.target.value })}
            />
            <Input
              label="Tax ID / GSTIN (Sandbox Test Format)"
              value={onboardForm.tax_id}
              onChange={(e) => setOnboardForm({ ...onboardForm, tax_id: e.target.value })}
            />
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isOnboarding}
              className="w-full shadow-lg shadow-brand-500/25 mt-2"
            >
              Activate Merchant Storefront
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-brand-900 rounded-3xl p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-brand-500/30 text-brand-300 border border-brand-400/30">
              ● Verified Merchant Storefront
            </span>
            <span className="text-xs text-slate-400 font-mono">ID: {profile.id.slice(0, 8)}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{profile.store_name}</h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl line-clamp-1">{profile.description}</p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            size="md"
            variant="primary"
            onClick={() => setShowAddProductModal(true)}
            icon={Plus}
          >
            Add New Product
          </Button>
          <Button
            size="md"
            variant="outline"
            onClick={loadDashboardData}
            icon={RefreshCw}
            className="border-white/20 text-white hover:bg-white/10"
          >
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Action Notification Message */}
      {actionMsg.text && (
        <div
          className={`p-4 rounded-2xl text-xs font-semibold flex items-center gap-2.5 animate-fadeIn ${
            actionMsg.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          {actionMsg.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{actionMsg.text}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200">
        {[
          { key: 'overview', label: 'Store Overview', icon: TrendingUp },
          { key: 'products', label: `Catalog (${products.length})`, icon: Package },
          { key: 'orders', label: `Dispatch Queue (${orders.length})`, icon: Truck },
        ].map((tab) => {
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 px-6 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
                activeTab === tab.key
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <TabIcon className="w-4 h-4" /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: Overview & Metrics */}
      {activeTab === 'overview' && (
        <div className="space-y-8 animate-fadeIn">
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                Total Earned Revenue
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl sm:text-3xl font-black text-slate-900">
                  {formatPrice(metrics?.total_revenue || 0)}
                </span>
                <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <DollarSign className="w-5 h-5" />
                </span>
              </div>
              <p className="text-[11px] text-slate-500">From paid & confirmed order line items</p>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                Units Dispatched / Sold
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl sm:text-3xl font-black text-slate-900">
                  {metrics?.total_units_sold || 0}
                </span>
                <span className="p-2 rounded-xl bg-brand-50 text-brand-600">
                  <Package className="w-5 h-5" />
                </span>
              </div>
              <p className="text-[11px] text-slate-500">Across {metrics?.total_orders || 0} separate orders</p>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                Active Catalog Items
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl sm:text-3xl font-black text-slate-900">
                  {metrics?.total_products || 0}
                </span>
                <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <Boxes className="w-5 h-5" />
                </span>
              </div>
              <p className="text-[11px] text-slate-500">Live products listed on platform</p>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                Low Stock Threshold Alerts
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl sm:text-3xl font-black text-slate-900">
                  {metrics?.low_stock_count || 0}
                </span>
                <span className={`p-2 rounded-xl ${metrics?.low_stock_count > 0 ? 'bg-amber-50 text-amber-600 animate-pulse' : 'bg-slate-50 text-slate-400'}`}>
                  <AlertTriangle className="w-5 h-5" />
                </span>
              </div>
              <p className="text-[11px] text-slate-500">Variants with ≤ 5 units in warehouse</p>
            </div>
          </div>

          {/* Quick Fulfillment Banner */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Truck className="w-5 h-5 text-brand-600" /> Dispatch Fulfillment Summary
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
              You have <strong>{orders.length} order lines</strong> assigned to your merchant inventory. Manage dispatch stages, monitor warehouse reserves, and verify shipments.
            </p>
            <div className="pt-2 flex items-center gap-3">
              <Button size="sm" variant="secondary" onClick={() => setActiveTab('orders')}>
                Inspect Dispatch Queue
              </Button>
              <Button size="sm" variant="outline" onClick={() => setActiveTab('products')}>
                Manage Stock & Pricing
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Catalog & Inventory Management */}
      {activeTab === 'products' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm space-y-6 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search products by title or brand..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <Button
              size="sm"
              variant="primary"
              onClick={() => setShowAddProductModal(true)}
              icon={Plus}
            >
              Add Product
            </Button>
          </div>

          {/* Products Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Item</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Base Price</th>
                  <th className="py-3 px-4">Total Stock</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={p.primary_image}
                          alt=""
                          className="w-10 h-10 object-contain rounded-xl border border-slate-100 bg-slate-50 p-1"
                        />
                        <div>
                          <strong className="text-slate-900 block line-clamp-1">{p.title}</strong>
                          <span className="text-slate-400 font-mono text-[11px]">{p.brand}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{p.category_name}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {formatPrice(p.base_price)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`font-mono font-bold ${p.total_stock <= 5 ? 'text-amber-600' : 'text-slate-900'}`}>
                        {p.total_stock} units
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant={p.is_active ? 'success' : 'neutral'} size="sm">
                        {p.is_active ? 'Active' : 'Draft'}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {p.variants.length > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedVariant(p.variants[0]);
                            setStockQty(p.variants[0].stock_quantity);
                          }}
                          icon={Boxes}
                        >
                          Adjust Stock
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Dispatch Queue */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm space-y-6 animate-fadeIn">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">Order Lines Fulfillment Stream</h3>
              <p className="text-xs text-slate-500">Real-time orders assigned to your merchant warehouse</p>
            </div>
            <span className="text-xs font-mono font-bold text-brand-600 bg-brand-50 px-3 py-1 rounded-full border border-brand-200">
              {orders.length} Items Total
            </span>
          </div>

          {orders.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <Package className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-500">No customer orders currently assigned to your store.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Order Ref</th>
                    <th className="py-3 px-4">Item Details</th>
                    <th className="py-3 px-4 text-center">Qty</th>
                    <th className="py-3 px-4">Total</th>
                    <th className="py-3 px-4">Destination</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {ord.order_number}
                        <span className="text-[10px] text-slate-400 block font-normal">
                          {new Date(ord.created_at).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        {ord.product_title}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-900">
                        {ord.quantity}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {formatPrice(ord.total_price)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {ord.shipping_city}
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge
                          variant={
                            ord.order_status === 'DELIVERED'
                              ? 'success'
                              : ord.order_status === 'CANCELLED'
                              ? 'danger'
                              : 'brand'
                          }
                          size="sm"
                        >
                          {ord.order_status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal: Add Product */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-black text-slate-900">Add New Catalog Product</h3>
              <button onClick={() => setShowAddProductModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4 text-left">
              <Input
                label="Product Title"
                placeholder="e.g. Aura Wireless Active Noise Cancelling Headphones"
                value={newProd.title}
                onChange={(e) => setNewProd({ ...newProd, title: e.target.value })}
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Category</label>
                  <select
                    value={newProd.category_id}
                    onChange={(e) => setNewProd({ ...newProd, category_id: parseInt(e.target.value, 10) })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <Input
                  label="Brand Name"
                  placeholder="e.g. AuraAudio"
                  value={newProd.brand}
                  onChange={(e) => setNewProd({ ...newProd, brand: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Detailed Description</label>
                <textarea
                  rows={3}
                  placeholder="Comprehensive specifications and key features..."
                  value={newProd.description}
                  onChange={(e) => setNewProd({ ...newProd, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <Input
                  label="Base Price (₹)"
                  type="number"
                  step="0.01"
                  placeholder="1999.00"
                  value={newProd.base_price}
                  onChange={(e) => setNewProd({ ...newProd, base_price: e.target.value })}
                  required
                />
                <Input
                  label="Discount Price (₹)"
                  type="number"
                  step="0.01"
                  placeholder="1499.00"
                  value={newProd.discount_price}
                  onChange={(e) => setNewProd({ ...newProd, discount_price: e.target.value })}
                />
                <Input
                  label="Initial Stock Qty"
                  type="number"
                  value={newProd.initial_stock}
                  onChange={(e) => setNewProd({ ...newProd, initial_stock: e.target.value })}
                  required
                />
              </div>

              <Input
                label="Product Image URL (CDN/Unsplash)"
                value={newProd.image_url}
                onChange={(e) => setNewProd({ ...newProd, image_url: e.target.value })}
              />

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <Button type="button" variant="ghost" onClick={() => setShowAddProductModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" isLoading={isSubmittingProd}>
                  Publish to Catalog
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Quick Stock Adjustment */}
      {selectedVariant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Adjust Inventory Stock</h3>
              <button onClick={() => setSelectedVariant(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              SKU: <strong className="text-slate-800 font-mono">{selectedVariant.sku}</strong>
            </p>

            <form onSubmit={handleUpdateStock} className="space-y-4">
              <Input
                label="Available Physical Units"
                type="number"
                min="0"
                value={stockQty}
                onChange={(e) => setStockQty(e.target.value)}
                required
              />

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedVariant(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" isLoading={isUpdatingStock}>
                  Save Stock
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerDashboard;
