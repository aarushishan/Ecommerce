import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Users, 
  DollarSign, 
  Package, 
  Store, 
  AlertTriangle, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Star, 
  FolderTree, 
  History, 
  RefreshCw, 
  Plus, 
  ExternalLink,
  Sliders,
  Eye,
  EyeOff
} from 'lucide-react';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Badge from '../components/common/Badge';
import adminService from '../services/adminService';
import productService from '../services/productService';
import { formatPrice } from '../utils/formatters';

export const AdminDashboard = () => {
  const [kpis, setKpis] = useState(null);
  const [users, setUsers] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  const [activeTab, setActiveTab] = useState('kpis'); // 'kpis', 'users', 'sellers', 'catalog', 'reviews', 'audit'
  const [loading, setLoading] = useState(true);
  const [userSearch, setUserSearch] = useState('');
  const [actionMsg, setActionMsg] = useState({ type: '', text: '' });

  // Add Category State
  const [showAddCatModal, setShowAddCatModal] = useState(false);
  const [newCat, setNewCat] = useState({ name: '', image_url: '' });
  const [isSubmittingCat, setIsSubmittingCat] = useState(false);

  const showNotification = (type, text) => {
    setActionMsg({ type, text });
    setTimeout(() => setActionMsg({ type: '', text: '' }), 4000);
  };

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [kpiData, usersData, sellersData, catsData, prodsData, revsData, logsData] = await Promise.all([
        adminService.getKpis(),
        adminService.getUsers(),
        adminService.getSellers(),
        productService.getCategories(),
        productService.getProducts({ limit: 50 }),
        adminService.getReviews(),
        adminService.getAuditLogs({ limit: 50 })
      ]);

      setKpis(kpiData);
      setUsers(usersData);
      setSellers(sellersData);
      setCategories(catsData);
      setProducts(prodsData.items || []);
      setReviews(revsData);
      setAuditLogs(logsData);
    } catch (err) {
      console.error('Failed to load admin supervisory data:', err);
      showNotification('error', 'Failed to retrieve administrative platform records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleRoleChange = async (userId, newRole) => {
    try {
      await adminService.updateUserRoleAndStatus(userId, { role_name: newRole });
      showNotification('success', `User role elevated to ${newRole} cleanly. Audit log saved.`);
      loadAdminData();
    } catch (err) {
      showNotification('error', err.response?.data?.detail || 'Failed to update user role.');
    }
  };

  const handleToggleUserActive = async (userId, currentActive) => {
    try {
      await adminService.updateUserRoleAndStatus(userId, { is_active: !currentActive });
      showNotification('success', `User account status updated. Audit log recorded.`);
      loadAdminData();
    } catch (err) {
      showNotification('error', err.response?.data?.detail || 'Failed to update account status.');
    }
  };

  const handleSellerApproval = async (sellerId, isApproved) => {
    try {
      await adminService.updateSellerApproval(sellerId, isApproved);
      showNotification('success', `Seller store approval set to ${isApproved}.`);
      loadAdminData();
    } catch (err) {
      showNotification('error', err.response?.data?.detail || 'Failed to update seller approval.');
    }
  };

  const handleToggleProduct = async (productId, currentActive, isFeatured) => {
    try {
      await adminService.toggleProductVisibility(productId, {
        is_active: !currentActive,
        is_featured: isFeatured
      });
      showNotification('success', 'Product platform visibility updated.');
      loadAdminData();
    } catch (err) {
      showNotification('error', err.response?.data?.detail || 'Failed to update visibility.');
    }
  };

  const handleToggleFeatured = async (productId, isActive, currentFeatured) => {
    try {
      await adminService.toggleProductVisibility(productId, {
        is_active: isActive,
        is_featured: !currentFeatured
      });
      showNotification('success', 'Product homepage featured status updated.');
      loadAdminData();
    } catch (err) {
      showNotification('error', err.response?.data?.detail || 'Failed to update featured flag.');
    }
  };

  const handleReviewModeration = async (reviewId, isApproved) => {
    try {
      await adminService.moderateReview(reviewId, isApproved);
      showNotification('success', `Review ${isApproved ? 'approved' : 'rejected'} successfully.`);
      loadAdminData();
    } catch (err) {
      showNotification('error', err.response?.data?.detail || 'Failed to moderate review.');
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    setIsSubmittingCat(true);
    try {
      await adminService.createCategory(newCat);
      setShowAddCatModal(false);
      setNewCat({ name: '', image_url: '' });
      showNotification('success', 'New category created successfully.');
      loadAdminData();
    } catch (err) {
      showNotification('error', err.response?.data?.detail || 'Failed to create category.');
    } finally {
      setIsSubmittingCat(false);
    }
  };

  const filteredUsers = users.filter((u) =>
    u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
    `${u.first_name} ${u.last_name}`.toLowerCase().includes(userSearch.toLowerCase())
  );

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-12 h-12 border-4 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-semibold text-slate-600">Accessing Platform Supervisory Command Hub...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-indigo-500/30 text-indigo-300 border border-indigo-400/30">
              ● Platform Administrator Command Portal
            </span>
            <span className="text-xs text-slate-400 font-mono">RBAC Invariant Level 3</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Enterprise Governance Hub</h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
            Live supervisory control: Monitor GMV, elevate user roles, approve merchant storefronts, moderate reviews, and inspect immutable audit logs.
          </p>
        </div>

        <Button
          size="md"
          variant="outline"
          onClick={loadAdminData}
          icon={RefreshCw}
          className="border-white/20 text-white hover:bg-white/10 shrink-0"
        >
          Refresh All Records
        </Button>
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
      <div className="flex border-b border-slate-200 overflow-x-auto">
        {[
          { key: 'kpis', label: 'Platform KPIs', icon: DollarSign },
          { key: 'users', label: `Users (${users.length})`, icon: Users },
          { key: 'sellers', label: `Merchants (${sellers.length})`, icon: Store },
          { key: 'catalog', label: `Catalog (${products.length})`, icon: Package },
          { key: 'reviews', label: `Reviews (${reviews.length})`, icon: Star },
          { key: 'audit', label: `Audit Trail (${auditLogs.length})`, icon: History },
        ].map((tab) => {
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 px-5 text-sm font-bold flex items-center gap-2 border-b-2 whitespace-nowrap transition-all ${
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

      {/* TAB 1: Platform KPIs */}
      {activeTab === 'kpis' && (
        <div className="space-y-8 animate-fadeIn">
          {/* Key Metric Blocks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                Platform GMV (Paid Volume)
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl sm:text-3xl font-black text-slate-900">
                  {formatPrice(kpis?.gmv || 0)}
                </span>
                <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <DollarSign className="w-5 h-5" />
                </span>
              </div>
              <p className="text-[11px] text-slate-500">Total gross merchandise revenue</p>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                Total Orders Created
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl sm:text-3xl font-black text-slate-900">
                  {kpis?.total_orders || 0}
                </span>
                <span className="p-2 rounded-xl bg-brand-50 text-brand-600">
                  <Package className="w-5 h-5" />
                </span>
              </div>
              <p className="text-[11px] text-slate-500">Across all platform consumers</p>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                Registered Users & Merchants
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl sm:text-3xl font-black text-slate-900">
                  {kpis?.total_users || 0}
                </span>
                <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <Users className="w-5 h-5" />
                </span>
              </div>
              <p className="text-[11px] text-slate-500">{kpis?.active_sellers || 0} active merchant storefronts</p>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                Low Stock Warehouse Alerts
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl sm:text-3xl font-black text-slate-900">
                  {kpis?.low_stock_alerts || 0}
                </span>
                <span className="p-2 rounded-xl bg-amber-50 text-amber-600">
                  <AlertTriangle className="w-5 h-5" />
                </span>
              </div>
              <p className="text-[11px] text-slate-500">SKUs below safety stock ceiling</p>
            </div>
          </div>

          {/* 7-Day Revenue Trend Table */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-brand-600" /> Recent Daily Sales Performance (Last 7 Days)
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-7 gap-3 pt-2">
              {(kpis?.recent_sales_trend || []).map((day, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center space-y-1">
                  <span className="text-[11px] font-mono text-slate-400 block">{day.date}</span>
                  <strong className="text-sm font-black text-slate-900 block">{formatPrice(day.amount)}</strong>
                  <span className="text-[10px] text-slate-500 font-mono block">{day.count} orders</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: User Governance & Role Elevation */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm space-y-6 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <span className="text-xs text-slate-500">Showing {filteredUsers.length} user accounts</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Role Permission</th>
                  <th className="py-3 px-4 text-center">Orders</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {u.first_name} {u.last_name}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">{u.email}</td>
                    <td className="py-3.5 px-4">
                      <select
                        value={u.role_name}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                      >
                        <option value="CUSTOMER">CUSTOMER</option>
                        <option value="SELLER">SELLER</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-700">
                      {u.orders_count}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant={u.is_active ? 'success' : 'danger'} size="sm">
                        {u.is_active ? 'Active' : 'Suspended'}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleToggleUserActive(u.id, u.is_active)}
                        className={`text-xs font-bold hover:underline ${u.is_active ? 'text-rose-600' : 'text-emerald-600'}`}
                      >
                        {u.is_active ? 'Suspend Account' : 'Activate Account'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Seller Approvals Queue */}
      {activeTab === 'sellers' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm space-y-6 animate-fadeIn">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">Merchant Storefront Directory</h3>
              <p className="text-xs text-slate-500">Approve or suspend merchant store privileges</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Store Name</th>
                  <th className="py-3 px-4">Owner</th>
                  <th className="py-3 px-4">Tax / GSTIN</th>
                  <th className="py-3 px-4 text-center">Products Listed</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Moderation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sellers.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {s.store_name}
                      <span className="text-[10px] text-slate-400 block font-mono">/{s.store_slug}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{s.owner_name} ({s.user_email})</td>
                    <td className="py-3.5 px-4 font-mono text-slate-500">{s.tax_id || 'N/A'}</td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-800">{s.products_count}</td>
                    <td className="py-3.5 px-4">
                      <Badge variant={s.is_approved ? 'success' : 'warning'} size="sm">
                        {s.is_approved ? 'Approved' : 'Pending Review'}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        size="sm"
                        variant={s.is_approved ? 'danger' : 'primary'}
                        onClick={() => handleSellerApproval(s.id, !s.is_approved)}
                      >
                        {s.is_approved ? 'Suspend Store' : 'Approve Merchant'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Catalog & Category Supervision */}
      {activeTab === 'catalog' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Categories Overview */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FolderTree className="w-5 h-5 text-brand-600" /> Category Taxonomy Tree
              </h3>
              <Button size="sm" variant="outline" onClick={() => setShowAddCatModal(true)} icon={Plus}>
                Add Category
              </Button>
            </div>

            <div className="flex flex-wrap gap-2.5">
              {categories.map((c) => (
                <div key={c.id} className="px-3.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 flex items-center gap-2">
                  <span>{c.name}</span>
                  <span className="text-[10px] text-slate-400 font-mono font-normal">({c.product_count || 0})</span>
                </div>
              ))}
            </div>
          </div>

          {/* Product Visibility & Feature Supervision Table */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-100">
              Product Catalog Moderation ({products.length})
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Product Title</th>
                    <th className="py-3 px-4">Brand</th>
                    <th className="py-3 px-4">Price</th>
                    <th className="py-3 px-4">Active</th>
                    <th className="py-3 px-4">Featured</th>
                    <th className="py-3 px-4 text-right">Visibility Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {products.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900 line-clamp-1">{p.title}</td>
                      <td className="py-3 px-4 text-slate-600">{p.brand}</td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{formatPrice(p.base_price)}</td>
                      <td className="py-3 px-4">
                        <Badge variant={p.is_active ? 'success' : 'danger'} size="sm">
                          {p.is_active ? 'Active' : 'Hidden'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleToggleFeatured(p.id, p.is_active, p.is_featured)}
                          className={`text-xs font-bold px-2 py-0.5 rounded-md border ${
                            p.is_featured
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-slate-50 text-slate-400 border-slate-200'
                          }`}
                        >
                          {p.is_featured ? '★ Featured' : '☆ Standard'}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleToggleProduct(p.id, p.is_active, p.is_featured)}
                          className={`text-xs font-bold hover:underline ${p.is_active ? 'text-rose-600' : 'text-emerald-600'}`}
                        >
                          {p.is_active ? 'Hide from Catalog' : 'Publish to Catalog'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: Review Moderation Queue */}
      {activeTab === 'reviews' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm space-y-6 animate-fadeIn">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">Product Review Moderation Queue</h3>
              <p className="text-xs text-slate-500">Combat spam, false ratings, and maintain verified reviews</p>
            </div>
          </div>

          {reviews.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500">
              No product reviews currently submitted for moderation.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {reviews.map((rev) => (
                <div key={rev.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                  <div className="space-y-1 max-w-2xl">
                    <div className="flex items-center gap-2">
                      <div className="flex text-amber-500 font-bold">
                        {'★'.repeat(rev.rating)}{'☆'.repeat(5 - rev.rating)}
                      </div>
                      <strong className="text-slate-900">{rev.product_title}</strong>
                      {rev.is_verified && (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                          ✓ Verified Buyer
                        </span>
                      )}
                    </div>
                    <p className="text-slate-700 leading-relaxed italic">"{rev.comment}"</p>
                    <p className="text-[11px] text-slate-400 font-mono">
                      By {rev.user_name} ({rev.user_email}) on {new Date(rev.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant={rev.is_approved ? 'success' : 'warning'} size="sm">
                      {rev.is_approved ? 'Approved' : 'Pending'}
                    </Badge>
                    <Button
                      size="sm"
                      variant={rev.is_approved ? 'outline' : 'primary'}
                      onClick={() => handleReviewModeration(rev.id, !rev.is_approved)}
                    >
                      {rev.is_approved ? 'Unpublish' : 'Approve Review'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 6: Immutable Audit Trail */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm space-y-6 animate-fadeIn">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <History className="w-5 h-5 text-brand-600" /> Platform Security & Modification Audit Trail
              </h3>
              <p className="text-xs text-slate-500">Immutable record of sensitive mutations across user roles, seller approvals, and categories</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Target Entity</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Diff / Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 text-slate-500">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-indigo-700">
                      {log.action}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">
                      {log.target_entity} ({log.target_id.slice(0, 8)})
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {log.user_email || 'System / Admin'}
                    </td>
                    <td className="py-3.5 px-4 text-[11px] text-slate-500 max-w-xs truncate">
                      {log.new_value ? JSON.stringify(log.new_value) : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Add Category */}
      {showAddCatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900">Add Product Category</h3>
            <form onSubmit={handleCreateCategory} className="space-y-3.5">
              <Input
                label="Category Name"
                placeholder="e.g. Smart Wearables"
                value={newCat.name}
                onChange={(e) => setNewCat({ ...newCat, name: e.target.value })}
                required
              />
              <Input
                label="Cover Image URL (Optional)"
                placeholder="https://..."
                value={newCat.image_url}
                onChange={(e) => setNewCat({ ...newCat, image_url: e.target.value })}
              />

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddCatModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" isLoading={isSubmittingCat}>
                  Create Category
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
