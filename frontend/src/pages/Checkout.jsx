import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  MapPin, 
  CreditCard, 
  Truck, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  Plus,
  Lock,
  Package,
  QrCode,
  Smartphone,
  Banknote,
  Sparkles,
  Info
} from 'lucide-react';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import authService from '../services/authService';
import cartService from '../services/cartService';
import { formatPrice } from '../utils/formatters';

export const Checkout = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { cart, fetchCart } = useCart();

  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('MOCK'); // MOCK, STRIPE, RAZORPAY, COD
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Stripe Card form state
  const [cardData, setCardData] = useState({
    name: user ? `${user.first_name} ${user.last_name}` : 'Demo Shopper',
    number: '4242 4242 4242 4242',
    expiry: '12/28',
    cvc: '123'
  });

  // Razorpay UPI state
  const [upiId, setUpiId] = useState('shopper@okaxis');
  const [upiMode, setUpiMode] = useState('vpa'); // 'vpa' or 'qr'

  // New address state
  const [newAddress, setNewAddress] = useState({
    full_name: user ? `${user.first_name} ${user.last_name}` : '',
    phone_number: '',
    address_line1: '',
    address_line2: '',
    city: 'Bengaluru',
    state: 'Karnataka',
    postal_code: '560038',
    country: 'India',
    is_default: true,
  });

  // Redirect to login if unauthenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login?redirect=/checkout');
    }
  }, [isAuthenticated, navigate]);

  // Load addresses
  useEffect(() => {
    const loadAddresses = async () => {
      try {
        const data = await authService.getAddresses();
        setAddresses(data);
        if (data.length > 0) {
          const defaultAddr = data.find((a) => a.is_default) || data[0];
          setSelectedAddressId(defaultAddr.id);
        } else {
          setShowNewAddressForm(true);
        }
      } catch (err) {
        console.error('Failed to load user addresses:', err);
      }
    };

    if (isAuthenticated) {
      loadAddresses();
    }
  }, [isAuthenticated]);

  const handleCreateAddress = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    try {
      const created = await authService.createAddress(newAddress);
      setAddresses([...addresses, created]);
      setSelectedAddressId(created.id);
      setShowNewAddressForm(false);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to save shipping address');
    }
  };

  const handlePlaceOrder = async () => {
    setErrorMessage('');
    if (!selectedAddressId) {
      setErrorMessage('Please select or create a valid shipping delivery address.');
      return;
    }

    if (!cart.items || cart.items.length === 0) {
      setErrorMessage('Your shopping cart is currently empty.');
      return;
    }

    setIsPlacingOrder(true);
    try {
      // 1. Create order on the backend with selected payment method
      const order = await cartService.createOrder({
        shipping_address_id: selectedAddressId,
        payment_method: paymentMethod,
        delivery_notes: deliveryNotes,
      });

      // 2. If Stripe or Razorpay, handle the payment authorization step
      if (paymentMethod === 'STRIPE') {
        const last4 = cardData.number.replace(/\s+/g, '').slice(-4);
        
        // Initiate Stripe intent
        const initRes = await cartService.initiatePayment({
          order_id: order.id,
          provider: 'STRIPE',
        });

        // Verify with card information
        const verifyRes = await cartService.verifyPayment({
          order_id: order.id,
          provider: 'STRIPE',
          transaction_id: initRes.transaction_id,
          card_last4: last4,
        });

        if (!verifyRes.success) {
          throw new Error(verifyRes.message || 'Stripe test payment authorization failed.');
        }
      } else if (paymentMethod === 'RAZORPAY') {
        // Initiate Razorpay order
        const initRes = await cartService.initiatePayment({
          order_id: order.id,
          provider: 'RAZORPAY',
        });

        // Verify Razorpay transaction
        const verifyRes = await cartService.verifyPayment({
          order_id: order.id,
          provider: 'RAZORPAY',
          transaction_id: initRes.transaction_id,
          razorpay_payment_id: `pay_${Date.now()}`,
          razorpay_signature: 'valid_mock_signature',
        });

        if (!verifyRes.success) {
          throw new Error(verifyRes.message || 'Razorpay sandbox payment verification failed.');
        }
      }

      // Clear local cart state in context
      await fetchCart();

      // Navigate to order confirmation and tracking page
      navigate(`/orders/${order.id}`);
    } catch (err) {
      console.error('Checkout failed:', err);
      setErrorMessage(
        err.response?.data?.detail || err.message || 'Failed to process order. Please verify details.'
      );
    } finally {
      setIsPlacingOrder(false);
    }
  };

  if (!cart.items || cart.items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center space-y-4">
        <h2 className="text-2xl font-black text-slate-900">Your Cart is Empty</h2>
        <p className="text-sm text-slate-500">Please add items to your cart before proceeding to checkout.</p>
        <Link to="/catalog">
          <Button variant="primary">Browse Catalog</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200">
        <div className="flex items-center gap-2 text-xs font-bold text-brand-600 uppercase tracking-widest mb-1">
          <Lock className="w-3.5 h-3.5" /> Secure 256-Bit SSL Checkout
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Review & Place Your Order
        </h1>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2.5 animate-fadeIn">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main Checkout Form Left Column */}
        <div className="lg:col-span-8 space-y-8">
          {/* Step 1: Delivery Address */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-brand-600 text-white font-black text-sm flex items-center justify-center">
                  1
                </div>
                <h3 className="text-lg font-black text-slate-900">Delivery Address</h3>
              </div>
              {!showNewAddressForm && (
                <button
                  type="button"
                  onClick={() => setShowNewAddressForm(true)}
                  className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add New Address
                </button>
              )}
            </div>

            {/* Address Selection List */}
            {!showNewAddressForm && addresses.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {addresses.map((addr) => (
                  <div
                    key={addr.id}
                    onClick={() => setSelectedAddressId(addr.id)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                      selectedAddressId === addr.id
                        ? 'border-brand-600 bg-brand-50/50 ring-2 ring-brand-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-xs text-slate-900">{addr.full_name}</span>
                      {selectedAddressId === addr.id && (
                        <CheckCircle2 className="w-4 h-4 text-brand-600" />
                      )}
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-2">{addr.address_line1}</p>
                    {addr.address_line2 && (
                      <p className="text-xs text-slate-600 line-clamp-1">{addr.address_line2}</p>
                    )}
                    <p className="text-xs text-slate-500 mt-1">
                      {addr.city}, {addr.state} - {addr.postal_code}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1 font-mono">📱 {addr.phone_number}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Inline Add Address Form */}
            {showNewAddressForm && (
              <form onSubmit={handleCreateAddress} className="space-y-4 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Full Name"
                    required
                    value={newAddress.full_name}
                    onChange={(e) => setNewAddress({ ...newAddress, full_name: e.target.value })}
                  />
                  <Input
                    label="Phone Number"
                    required
                    placeholder="+91 9876543210"
                    value={newAddress.phone_number}
                    onChange={(e) => setNewAddress({ ...newAddress, phone_number: e.target.value })}
                  />
                </div>
                <Input
                  label="Street Address / Flat / Floor"
                  required
                  placeholder="e.g. 402, Lotus Heights, Indiranagar"
                  value={newAddress.address_line1}
                  onChange={(e) => setNewAddress({ ...newAddress, address_line1: e.target.value })}
                />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input
                    label="City"
                    required
                    value={newAddress.city}
                    onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                  />
                  <Input
                    label="State"
                    required
                    value={newAddress.state}
                    onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                  />
                  <Input
                    label="Postal PIN Code"
                    required
                    maxLength={6}
                    value={newAddress.postal_code}
                    onChange={(e) => setNewAddress({ ...newAddress, postal_code: e.target.value })}
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <Button type="submit" size="sm" variant="primary">
                    Save and Deliver Here
                  </Button>
                  {addresses.length > 0 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowNewAddressForm(false)}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
            )}
          </div>

          {/* Step 2: Order Review */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm space-y-4">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="w-8 h-8 rounded-full bg-brand-600 text-white font-black text-sm flex items-center justify-center">
                2
              </div>
              <h3 className="text-lg font-black text-slate-900">Items in Your Shipment</h3>
            </div>

            <div className="divide-y divide-slate-100">
              {cart.items.map((item) => (
                <div key={item.id} className="py-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <img
                      src={item.image_url || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=100&q=80'}
                      alt=""
                      className="w-12 h-12 object-contain rounded-xl border border-slate-100 p-1 bg-slate-50"
                    />
                    <div>
                      <span className="font-bold text-slate-900 line-clamp-1">{item.product_title}</span>
                      <span className="text-slate-400">Variant: {item.variant_title} × {item.quantity}</span>
                    </div>
                  </div>
                  <span className="font-black text-slate-900">{formatPrice(item.total_price)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Step 3: Payment Gateway & Method Selection */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-brand-600 text-white font-black text-sm flex items-center justify-center">
                  3
                </div>
                <h3 className="text-lg font-black text-slate-900">Payment Gateway</h3>
              </div>
              <span className="text-[11px] font-mono text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 font-bold">
                ● Test Gateways Active
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Option 1: Mock Instant Pre-Approved Sandbox */}
              <div
                onClick={() => setPaymentMethod('MOCK')}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  paymentMethod === 'MOCK'
                    ? 'border-brand-600 bg-brand-50/50 ring-2 ring-brand-500/20 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-brand-600" />
                    <span className="font-bold text-xs text-slate-900">Instant Sandbox</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-100 text-emerald-800">
                    Recommended
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Fastest 1-click test checkout. Simulates immediate bank approval and inventory reservation.
                </p>
              </div>

              {/* Option 2: Stripe Test Mode (Card) */}
              <div
                onClick={() => setPaymentMethod('STRIPE')}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  paymentMethod === 'STRIPE'
                    ? 'border-brand-600 bg-brand-50/50 ring-2 ring-brand-500/20 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-indigo-600" />
                    <span className="font-bold text-xs text-slate-900">Stripe Card (Test)</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    Visa / MC
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Test card charges with real Stripe PaymentIntent client-secret validation and decline simulations.
                </p>
              </div>

              {/* Option 3: Razorpay Sandbox (UPI & QR) */}
              <div
                onClick={() => setPaymentMethod('RAZORPAY')}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  paymentMethod === 'RAZORPAY'
                    ? 'border-brand-600 bg-brand-50/50 ring-2 ring-brand-500/20 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-blue-600" />
                    <span className="font-bold text-xs text-slate-900">Razorpay / UPI</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    UPI / QR
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Simulate BHIM, Google Pay, PhonePe, or dynamic UPI QR scan with cryptographic HMAC verification.
                </p>
              </div>

              {/* Option 4: Cash on Delivery (COD) */}
              <div
                onClick={() => setPaymentMethod('COD')}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  paymentMethod === 'COD'
                    ? 'border-brand-600 bg-brand-50/50 ring-2 ring-brand-500/20 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Banknote className="w-4 h-4 text-emerald-600" />
                    <span className="font-bold text-xs text-slate-900">Cash on Delivery</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                    Pay on Arrival
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Pay with cash or UPI directly to the delivery executive upon package handover.
                </p>
              </div>
            </div>

            {/* Dynamic Payment Detail Form */}
            {paymentMethod === 'STRIPE' && (
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <CreditCard className="w-4 h-4 text-indigo-600" />
                    <span>Enter Stripe Sandbox Card Details</span>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCardData({ ...cardData, number: '4242 4242 4242 4242' })}
                      className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition-colors"
                      title="Use passing test card"
                    >
                      ✓ Autofill Success
                    </button>
                    <button
                      type="button"
                      onClick={() => setCardData({ ...cardData, number: '4000 0000 0000 0002' })}
                      className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 hover:bg-rose-200 transition-colors"
                      title="Simulate declined card"
                    >
                      ✕ Autofill Decline
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <Input
                    label="Cardholder Full Name"
                    value={cardData.name}
                    onChange={(e) => setCardData({ ...cardData, name: e.target.value })}
                  />
                  <Input
                    label="Card Number (Test Mode)"
                    value={cardData.number}
                    onChange={(e) => setCardData({ ...cardData, number: e.target.value })}
                    placeholder="4242 4242 4242 4242"
                    icon={CreditCard}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Expiry (MM/YY)"
                      value={cardData.expiry}
                      onChange={(e) => setCardData({ ...cardData, expiry: e.target.value })}
                      placeholder="12/28"
                    />
                    <Input
                      label="CVC / CVV"
                      value={cardData.cvc}
                      onChange={(e) => setCardData({ ...cardData, cvc: e.target.value })}
                      placeholder="123"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  Stripe Test Mode enabled. No real financial charges will ever be made.
                </p>
              </div>
            )}

            {paymentMethod === 'RAZORPAY' && (
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <Smartphone className="w-4 h-4 text-blue-600" />
                    <span>Razorpay UPI Sandbox</span>
                  </div>
                  <div className="flex rounded-lg bg-slate-200 p-0.5 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setUpiMode('vpa')}
                      className={`px-2.5 py-1 rounded-md transition-all ${
                        upiMode === 'vpa' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                      }`}
                    >
                      UPI ID
                    </button>
                    <button
                      type="button"
                      onClick={() => setUpiMode('qr')}
                      className={`px-2.5 py-1 rounded-md transition-all ${
                        upiMode === 'qr' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                      }`}
                    >
                      QR Code
                    </button>
                  </div>
                </div>

                {upiMode === 'vpa' ? (
                  <div className="space-y-3">
                    <Input
                      label="Virtual Payment Address (VPA / UPI ID)"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="customer@okaxis"
                      icon={Smartphone}
                    />
                    <div className="flex gap-2">
                      {['shopper@okaxis', 'demo@paytm', 'merchant@okhdfcbank'].map((id) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setUpiId(id)}
                          className="px-2 py-1 rounded-lg text-[10px] font-mono bg-white border border-slate-200 text-slate-700 hover:border-brand-500"
                        >
                          {id}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-white rounded-xl border border-slate-200 flex flex-col items-center text-center space-y-2">
                    <div className="w-28 h-28 bg-slate-100 rounded-xl p-2 flex items-center justify-center border border-slate-200">
                      <QrCode className="w-20 h-20 text-slate-800" />
                    </div>
                    <span className="text-xs font-bold text-slate-900">Scan via any UPI App</span>
                    <span className="text-[11px] font-mono text-slate-500">ShopSphere Merchant QR • Amount: {formatPrice(cart.total_amount)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Delivery Instructions */}
            <div className="pt-2">
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Delivery Instructions (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Ring bell twice or leave package with front desk security"
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>
        </div>

        {/* Right Sidebar: Order Summary */}
        <div className="lg:col-span-4 space-y-6 sticky top-28">
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-5">
            <h3 className="text-lg font-black text-slate-900 pb-3 border-b border-slate-100">
              Payment Summary
            </h3>

            <div className="space-y-3 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Items Subtotal</span>
                <span className="font-bold text-slate-900">{formatPrice(cart.subtotal)}</span>
              </div>

              {cart.discount_amount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Product Savings</span>
                  <span className="font-bold">-{formatPrice(cart.discount_amount)}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span>Shipping Fee</span>
                <span className="font-bold">
                  {cart.shipping_fee === 0 || cart.eligible_for_free_shipping ? (
                    <span className="text-emerald-600 uppercase font-black">FREE</span>
                  ) : (
                    formatPrice(cart.shipping_fee)
                  )}
                </span>
              </div>

              <div className="flex justify-between">
                <span>Estimated GST (5%)</span>
                <span className="font-bold text-slate-900">{formatPrice(cart.tax_amount)}</span>
              </div>

              <div className="border-t border-slate-200 pt-3 flex justify-between items-baseline">
                <div>
                  <span className="text-base font-black text-slate-900 block">Total Due</span>
                  <span className="text-[10px] text-slate-400">Tax inclusive</span>
                </div>
                <span className="text-2xl font-black text-slate-900">
                  {formatPrice(cart.total_amount)}
                </span>
              </div>
            </div>

            <Button
              size="lg"
              variant="primary"
              onClick={handlePlaceOrder}
              disabled={isPlacingOrder || !selectedAddressId}
              className="w-full shadow-lg shadow-brand-500/25 py-3.5"
              icon={isPlacingOrder ? undefined : ArrowRight}
            >
              {isPlacingOrder ? 'Authorizing & Securing Order...' : `Pay ${formatPrice(cart.total_amount)} & Place Order`}
            </Button>

            <div className="pt-3 border-t border-slate-100 space-y-2 text-[11px] text-slate-500">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Zero Double-Booking Row-Lock Protected</span>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-brand-600 shrink-0" />
                <span>Express dispatch via ShopSphere Logistics</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
