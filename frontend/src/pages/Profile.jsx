import React, { useState, useEffect } from 'react';
import { 
  User, 
  MapPin, 
  Package, 
  ShieldCheck, 
  Lock, 
  Plus, 
  Trash2, 
  Check, 
  LogOut, 
  AlertCircle,
  CheckCircle2,
  Phone,
  Mail,
  Home as HomeIcon
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Badge from '../components/common/Badge';
import { 
  getAddressesApi, 
  createAddressApi, 
  deleteAddressApi, 
  setDefaultAddressApi,
  changePasswordApi
} from '../services/authService';
import cartService from '../services/cartService';
import { formatPrice } from '../utils/formatters';

export const Profile = () => {
  const { user, logout, updateProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('profile'); // 'profile', 'addresses', 'orders'

  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    phone_number: user?.phone_number || '',
  });
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');

  // Password Change State
  const [pwdForm, setPwdForm] = useState({ current_password: '', new_password: '' });
  const [isUpdatingPwd, setIsUpdatingPwd] = useState(false);
  const [pwdMsg, setPwdMsg] = useState({ type: '', text: '' });

  // Address Book State
  const [addresses, setAddresses] = useState([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [showAddAddressModal, setShowAddAddressModal] = useState(false);
  const [newAddress, setNewAddress] = useState({
    full_name: '',
    phone_number: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'India',
    is_default: false,
  });
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [addressError, setAddressError] = useState('');

  // Load Addresses
  const loadAddresses = async () => {
    setIsLoadingAddresses(true);
    try {
      const data = await getAddressesApi();
      setAddresses(data);
    } catch (err) {
      console.error('Failed to load addresses:', err);
    } finally {
      setIsLoadingAddresses(false);
    }
  };

  // Orders State
  const [orders, setOrders] = useState([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  const loadOrders = async () => {
    setIsLoadingOrders(true);
    try {
      const data = await cartService.getUserOrders();
      setOrders(data);
    } catch (err) {
      console.error('Failed to load user orders:', err);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'addresses') {
      loadAddresses();
    } else if (activeTab === 'orders') {
      loadOrders();
    }
  }, [activeTab]);

  // Handle Profile Update
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    setProfileSuccessMsg('');
    try {
      await updateProfile(profileForm);
      setProfileSuccessMsg('Profile updated successfully!');
      setTimeout(() => setProfileSuccessMsg(''), 3000);
    } catch (err) {
      console.error('Profile update failed:', err);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // Handle Password Change
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setIsUpdatingPwd(true);
    setPwdMsg({ type: '', text: '' });
    try {
      await changePasswordApi(pwdForm);
      setPwdMsg({ type: 'success', text: 'Password changed successfully!' });
      setPwdForm({ current_password: '', new_password: '' });
      setTimeout(() => setPwdMsg({ type: '', text: '' }), 3000);
    } catch (err) {
      setPwdMsg({ type: 'error', text: err.message || 'Incorrect current password.' });
    } finally {
      setIsUpdatingPwd(false);
    }
  };

  // Handle Create Address
  const handleCreateAddress = async (e) => {
    e.preventDefault();
    setIsSavingAddress(true);
    setAddressError('');
    try {
      await createAddressApi(newAddress);
      setShowAddAddressModal(false);
      setNewAddress({
        full_name: '',
        phone_number: '',
        address_line1: '',
        address_line2: '',
        city: '',
        state: '',
        postal_code: '',
        country: 'India',
        is_default: false,
      });
      loadAddresses();
    } catch (err) {
      setAddressError(err.message || 'Failed to add address.');
    } finally {
      setIsSavingAddress(false);
    }
  };

  // Handle Set Default Address
  const handleSetDefaultAddress = async (id) => {
    try {
      await setDefaultAddressApi(id);
      loadAddresses();
    } catch (err) {
      console.error('Failed to set default address:', err);
    }
  };

  // Handle Delete Address
  const handleDeleteAddress = async (id) => {
    if (window.confirm('Are you sure you want to delete this address?')) {
      try {
        await deleteAddressApi(id);
        loadAddresses();
      } catch (err) {
        console.error('Failed to delete address:', err);
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Profile Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-700 to-brand-500 text-white font-black text-2xl flex items-center justify-center shadow-md shadow-brand-500/20">
            {user?.first_name ? user.first_name[0] : 'U'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                {user?.first_name} {user?.last_name}
              </h1>
              <Badge variant={user?.role?.name === 'SELLER' ? 'warning' : 'brand'}>
                {user?.role?.name || 'CUSTOMER'}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
              <Mail className="w-3.5 h-3.5" /> {user?.email}
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={logout}
          icon={LogOut}
          className="text-rose-600 border-rose-200 hover:bg-rose-50"
        >
          Sign Out
        </Button>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'profile'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <User className="w-4 h-4" /> Personal Details & Security
        </button>

        <button
          onClick={() => setActiveTab('addresses')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'addresses'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <MapPin className="w-4 h-4" /> Saved Addresses ({addresses.length})
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'orders'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Package className="w-4 h-4" /> Order History
        </button>
      </div>

      {/* Tab 1: Profile & Password */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Edit Profile */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm space-y-6">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <User className="w-4 h-4 text-brand-600" /> Personal Information
            </h3>

            {profileSuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>{profileSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="First Name"
                  value={profileForm.first_name}
                  onChange={(e) => setProfileForm({ ...profileForm, first_name: e.target.value })}
                  required
                />
                <Input
                  label="Last Name"
                  value={profileForm.last_name}
                  onChange={(e) => setProfileForm({ ...profileForm, last_name: e.target.value })}
                  required
                />
              </div>

              <Input
                label="Phone Number"
                value={profileForm.phone_number}
                onChange={(e) => setProfileForm({ ...profileForm, phone_number: e.target.value })}
                icon={Phone}
              />

              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isUpdatingProfile}
                className="w-full"
              >
                Save Profile Changes
              </Button>
            </form>
          </div>

          {/* Change Password */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm space-y-6">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Lock className="w-4 h-4 text-brand-600" /> Update Password
            </h3>

            {pwdMsg.text && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                  pwdMsg.type === 'success'
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                    : 'bg-rose-50 border border-rose-200 text-rose-700'
                }`}
              >
                <AlertCircle className="w-4 h-4" />
                <span>{pwdMsg.text}</span>
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <Input
                label="Current Password"
                type="password"
                placeholder="••••••••"
                value={pwdForm.current_password}
                onChange={(e) => setPwdForm({ ...pwdForm, current_password: e.target.value })}
                required
              />

              <Input
                label="New Password"
                type="password"
                placeholder="Minimum 6 characters"
                value={pwdForm.new_password}
                onChange={(e) => setPwdForm({ ...pwdForm, new_password: e.target.value })}
                required
              />

              <Button
                type="submit"
                variant="outline"
                size="md"
                isLoading={isUpdatingPwd}
                className="w-full"
              >
                Change Password
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Tab 2: Saved Addresses */}
      {activeTab === 'addresses' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Your Shipping Addresses</h3>
              <p className="text-xs text-slate-500">Manage addresses for faster checkout deliveries.</p>
            </div>
            <Button
              size="sm"
              variant="primary"
              onClick={() => setShowAddAddressModal(true)}
              icon={Plus}
            >
              Add New Address
            </Button>
          </div>

          {isLoadingAddresses ? (
            <p className="text-xs text-slate-400">Loading your address book...</p>
          ) : addresses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {addresses.map((addr) => (
                <div
                  key={addr.id}
                  className={`rounded-2xl border p-5 shadow-sm space-y-3 relative bg-white ${
                    addr.is_default ? 'border-brand-600 ring-2 ring-brand-500/10' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900">{addr.full_name}</span>
                    {addr.is_default && (
                      <span className="px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200 text-[10px] font-bold">
                        Default
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {addr.address_line1}
                    {addr.address_line2 && `, ${addr.address_line2}`}
                    <br />
                    {addr.city}, {addr.state} — {addr.postal_code}
                    <br />
                    {addr.country}
                  </p>

                  <p className="text-xs text-slate-500 font-medium">
                    Phone: {addr.phone_number}
                  </p>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold">
                    {!addr.is_default && (
                      <button
                        onClick={() => handleSetDefaultAddress(addr.id)}
                        className="text-brand-600 hover:text-brand-800"
                      >
                        Set as Default
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteAddress(addr.id)}
                      className="text-rose-600 hover:text-rose-800 ml-auto flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
              <MapPin className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="font-bold text-slate-800">No Saved Addresses</h4>
              <p className="text-xs text-slate-400">Add an address to speed up your checkout.</p>
              <Button size="sm" onClick={() => setShowAddAddressModal(true)} icon={Plus}>
                Add Shipping Address
              </Button>
            </div>
          )}

          {/* Add Address Modal */}
          {showAddAddressModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
              <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-lg font-bold text-slate-900">Add New Shipping Address</h3>
                  <button onClick={() => setShowAddAddressModal(false)} className="text-slate-400 hover:text-slate-600 font-bold text-sm">
                    ✕
                  </button>
                </div>

                {addressError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                    {addressError}
                  </div>
                )}

                <form onSubmit={handleCreateAddress} className="space-y-3.5 text-left">
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Recipient Full Name"
                      placeholder="e.g. Aarav Sharma"
                      value={newAddress.full_name}
                      onChange={(e) => setNewAddress({ ...newAddress, full_name: e.target.value })}
                      required
                    />
                    <Input
                      label="Phone Number"
                      placeholder="+91 9876543210"
                      value={newAddress.phone_number}
                      onChange={(e) => setNewAddress({ ...newAddress, phone_number: e.target.value })}
                      required
                    />
                  </div>

                  <Input
                    label="Address Line 1"
                    placeholder="House / Flat / Block No, Street"
                    value={newAddress.address_line1}
                    onChange={(e) => setNewAddress({ ...newAddress, address_line1: e.target.value })}
                    required
                  />

                  <Input
                    label="Address Line 2 (Optional)"
                    placeholder="Apartment, Landmark, Suite"
                    value={newAddress.address_line2}
                    onChange={(e) => setNewAddress({ ...newAddress, address_line2: e.target.value })}
                  />

                  <div className="grid grid-cols-3 gap-3">
                    <Input
                      label="City"
                      placeholder="Bengaluru"
                      value={newAddress.city}
                      onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                      required
                    />
                    <Input
                      label="State"
                      placeholder="Karnataka"
                      value={newAddress.state}
                      onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                      required
                    />
                    <Input
                      label="PIN Code"
                      placeholder="560038"
                      value={newAddress.postal_code}
                      onChange={(e) => setNewAddress({ ...newAddress, postal_code: e.target.value })}
                      required
                    />
                  </div>

                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer pt-2">
                    <input
                      type="checkbox"
                      checked={newAddress.is_default}
                      onChange={(e) => setNewAddress({ ...newAddress, is_default: e.target.checked })}
                      className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                    <span>Make this my default shipping address</span>
                  </label>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <Button type="button" variant="ghost" onClick={() => setShowAddAddressModal(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" variant="primary" isLoading={isSavingAddress}>
                      Save Address
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Orders History */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Your Orders ({orders.length})</h3>
            <span className="text-xs text-slate-500">Live order tracking and invoice access</span>
          </div>

          {isLoadingOrders ? (
            <div className="bg-white rounded-3xl border border-slate-200/90 p-12 text-center">
              <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-500 mt-2">Loading your orders...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200/90 p-12 text-center space-y-4 shadow-sm">
              <Package className="w-12 h-12 text-slate-400 mx-auto" />
              <h3 className="text-lg font-bold text-slate-900">No Past Orders Yet</h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                You haven't placed any orders yet. Discover our latest collections and start shopping!
              </p>
              <Link to="/catalog">
                <Button size="sm" variant="primary">Explore Catalog</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((o) => (
                <div
                  key={o.id}
                  className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm space-y-4 hover:border-brand-200 transition-colors"
                >
                  {/* Order Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-900">{o.order_number}</span>
                        <Badge
                          variant={
                            o.status === 'DELIVERED'
                              ? 'success'
                              : o.status === 'CANCELLED'
                              ? 'danger'
                              : o.status === 'SHIPPED' || o.status === 'OUT_FOR_DELIVERY'
                              ? 'warning'
                              : 'brand'
                          }
                          size="sm"
                        >
                          {o.status}
                        </Badge>
                        <Badge
                          variant={o.payment_status === 'PAID' ? 'success' : o.payment_status === 'REFUNDED' ? 'neutral' : 'warning'}
                          size="sm"
                        >
                          {o.payment?.provider ? `${o.payment.provider} • ${o.payment_status}` : o.payment_status}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Placed on {new Date(o.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        {o.shipment?.tracking_number && (
                          <span className="ml-2 font-mono text-slate-500">
                            • Track ID: {o.shipment.tracking_number}
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="text-left sm:text-right">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Total Amount</span>
                      <span className="text-sm font-black text-slate-900">{formatPrice(o.total_amount)}</span>
                    </div>
                  </div>

                  {/* Items in this order */}
                  <div className="space-y-2">
                    {o.items.map((it) => (
                      <div key={it.id} className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-slate-800 line-clamp-1">
                          {it.product_title} × {it.quantity}
                        </span>
                        <span className="font-bold text-slate-900 shrink-0 ml-4 font-mono">
                          {formatPrice(it.total_price)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Footer CTA */}
                  <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                    <span className="text-slate-500">
                      Destination: <strong className="text-slate-800">{o.shipping_address?.city || 'Standard Address'}</strong>
                      {o.shipment?.carrier && ` via ${o.shipment.carrier}`}
                    </span>
                    <div className="flex items-center gap-2">
                      <Link to={`/orders/${o.id}`}>
                        <Button size="sm" variant="primary">
                          Track Package & Details
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Profile;
