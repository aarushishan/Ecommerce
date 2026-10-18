import React, { useEffect, useState } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { 
  CheckCircle2, 
  Package, 
  Truck, 
  MapPin, 
  CreditCard, 
  ArrowRight, 
  Printer, 
  Clock, 
  Copy,
  Check,
  RotateCcw,
  AlertCircle,
  Sparkles,
  ShieldAlert,
  Send,
  Boxes,
  Home
} from 'lucide-react';
import Button from '../components/common/Button';
import cartService from '../services/cartService';
import { formatPrice } from '../utils/formatters';

const LIFECYCLE_STEPS = [
  { key: 'CONFIRMED', label: 'Order Placed', icon: CheckCircle2 },
  { key: 'PROCESSING', label: 'Packed & Ready', icon: Boxes },
  { key: 'SHIPPED', label: 'In Transit', icon: Truck },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', icon: Send },
  { key: 'DELIVERED', label: 'Delivered', icon: Home },
];

const STEP_ORDER = ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'];

export const OrderConfirmation = () => {
  const { orderId } = useParams();
  const location = useLocation();

  const [order, setOrder] = useState(location.state?.orderData || null);
  const [loading, setLoading] = useState(!order);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('tracking'); // 'tracking' or 'invoice'
  const [copiedTracking, setCopiedTracking] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simMessage, setSimMessage] = useState({ type: '', text: '' });
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('Ordered by mistake');

  const fetchOrder = async () => {
    if (!orderId) return;
    try {
      const data = await cartService.getOrderDetail(orderId);
      setOrder(data);
    } catch (err) {
      console.error('Failed to load order:', err);
      setError(err.message || 'Order not found');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const copyTracking = () => {
    if (order?.shipment?.tracking_number) {
      navigator.clipboard.writeText(order.shipment.tracking_number);
      setCopiedTracking(true);
      setTimeout(() => setCopiedTracking(false), 2000);
    }
  };

  const handleSimulateStatus = async (targetStatus) => {
    setIsSimulating(true);
    setSimMessage({ type: '', text: '' });
    try {
      const updated = await cartService.updateOrderStatus(order.id, {
        status: targetStatus,
        notes: `Simulated lifecycle transition to ${targetStatus}`,
      });
      setOrder(updated);
      setSimMessage({
        type: 'success',
        text: `Order status advanced to ${targetStatus} and tracking timeline updated.`,
      });
      setTimeout(() => setSimMessage({ type: '', text: '' }), 4000);
    } catch (err) {
      setSimMessage({
        type: 'error',
        text: err.response?.data?.detail || err.message || 'Failed to update order status.',
      });
    } finally {
      setIsSimulating(false);
    }
  };

  const handleSimulateWebhook = async () => {
    setIsSimulating(true);
    setSimMessage({ type: '', text: '' });
    try {
      const res = await cartService.simulateWebhook({
        provider: order.payment?.provider || 'STRIPE',
        order_id: order.id,
        event_type: 'payment_intent.succeeded',
        tamper_signature: false,
      });
      await fetchOrder();
      setSimMessage({
        type: 'success',
        text: `Cryptographic Webhook verified with HMAC-SHA256: ${res.status} (Idempotent: ${res.idempotent})`,
      });
      setTimeout(() => setSimMessage({ type: '', text: '' }), 4000);
    } catch (err) {
      setSimMessage({
        type: 'error',
        text: err.response?.data?.detail || err.message || 'Webhook verification failed.',
      });
    } finally {
      setIsSimulating(false);
    }
  };

  const handleCancelOrder = async () => {
    setIsSimulating(true);
    setShowCancelModal(false);
    setSimMessage({ type: '', text: '' });
    try {
      const updated = await cartService.cancelOrder(order.id, cancelReason);
      setOrder(updated);
      setSimMessage({
        type: 'success',
        text: 'Order cancelled successfully. Physical inventory restored and refund initiated.',
      });
      setTimeout(() => setSimMessage({ type: '', text: '' }), 4000);
    } catch (err) {
      setSimMessage({
        type: 'error',
        text: err.response?.data?.detail || err.message || 'Cancellation failed.',
      });
    } finally {
      setIsSimulating(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center space-y-4">
        <div className="w-12 h-12 border-4 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-semibold text-slate-600">Retrieving order & logistics timeline...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-900">Order Not Found</h2>
        <p className="text-xs text-slate-500">We could not locate this order in your account history.</p>
        <Link to="/catalog">
          <Button variant="primary">Return to Catalog</Button>
        </Link>
      </div>
    );
  }

  const currentStepIndex = STEP_ORDER.indexOf(order.status);
  const isCancelled = order.status === 'CANCELLED';

  const getStatusHeroGradient = () => {
    if (isCancelled) return 'from-rose-700 to-slate-900';
    if (order.status === 'DELIVERED') return 'from-emerald-600 to-teal-800';
    if (order.status === 'SHIPPED' || order.status === 'OUT_FOR_DELIVERY') return 'from-brand-600 to-indigo-800';
    return 'from-emerald-600 to-teal-700';
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Confirmation Hero Card */}
      <div className={`bg-gradient-to-br ${getStatusHeroGradient()} rounded-3xl p-8 sm:p-10 text-white shadow-xl relative overflow-hidden transition-all duration-500`}>
        <div className="relative z-10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
              {isCancelled ? (
                <ShieldAlert className="w-8 h-8 text-white" />
              ) : (
                <CheckCircle2 className="w-8 h-8 text-white" />
              )}
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-white/20 backdrop-blur-md uppercase tracking-wider">
              {order.payment_status === 'PAID' ? '● Payment Verified' : `● ${order.payment_status}`}
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-xs font-black uppercase tracking-widest text-emerald-200">
              {isCancelled ? 'Order Cancellation Confirmed' : 'Order Lifecycle State Engine'}
            </span>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight">
              {isCancelled ? 'Order Has Been Cancelled' : 'Thank You for Your Order!'}
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100 max-w-xl leading-relaxed">
              {isCancelled
                ? 'Your order cancellation was processed cleanly. Reserved inventory units have been restored to available stock.'
                : 'Your payment has been authorized and our fulfillment team is tracking your package through our live state engine.'}
            </p>
          </div>

          <div className="pt-4 flex flex-wrap items-center gap-3 text-xs font-mono">
            <div className="bg-black/25 px-3.5 py-1.5 rounded-xl border border-white/10">
              <span className="text-white/60 block text-[10px]">ORDER REF</span>
              <strong className="text-white text-sm">{order.order_number}</strong>
            </div>
            <div className="bg-black/25 px-3.5 py-1.5 rounded-xl border border-white/10">
              <span className="text-white/60 block text-[10px]">CURRENT STATE</span>
              <strong className="text-white text-sm">{order.status}</strong>
            </div>
            <div className="bg-black/25 px-3.5 py-1.5 rounded-xl border border-white/10">
              <span className="text-white/60 block text-[10px]">PAYMENT METHOD</span>
              <strong className="text-emerald-300 text-sm">
                {order.payment?.provider || 'MOCK_SANDBOX'} ({order.payment_status})
              </strong>
            </div>
            {order.payment?.transaction_id && (
              <div className="bg-black/25 px-3.5 py-1.5 rounded-xl border border-white/10">
                <span className="text-white/60 block text-[10px]">TRANSACTION ID</span>
                <span className="text-white/90 text-xs font-mono">{order.payment.transaction_id}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Simulator Message Alert */}
      {simMessage.text && (
        <div
          className={`p-4 rounded-2xl text-xs font-semibold flex items-center gap-2.5 animate-fadeIn ${
            simMessage.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          {simMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{simMessage.text}</span>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('tracking')}
          className={`pb-3 px-6 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'tracking'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Truck className="w-4 h-4" /> Live Tracking & State Engine
        </button>
        <button
          onClick={() => setActiveTab('invoice')}
          className={`pb-3 px-6 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'invoice'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Printer className="w-4 h-4" /> Official Tax Invoice & Receipt
        </button>
      </div>

      {/* Tab 1: Live Tracking & State Engine */}
      {activeTab === 'tracking' && (
        <div className="space-y-8 animate-fadeIn">
          {/* Interactive Stepper Bar */}
          {!isCancelled && (
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm space-y-6">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Truck className="w-5 h-5 text-brand-600" />
                Delivery Milestones Progress
              </h3>

              <div className="relative pt-2 pb-4">
                {/* Connecting Line */}
                <div className="hidden sm:block absolute top-7 left-8 right-8 h-1 bg-slate-100 -z-0">
                  <div
                    className="h-1 bg-brand-600 transition-all duration-700"
                    style={{
                      width: `${Math.max(0, (currentStepIndex / (STEP_ORDER.length - 1)) * 100)}%`,
                    }}
                  />
                </div>

                {/* Steps */}
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 relative z-10">
                  {LIFECYCLE_STEPS.map((step, idx) => {
                    const isCompleted = currentStepIndex >= idx;
                    const isCurrent = currentStepIndex === idx;
                    const StepIcon = step.icon;

                    return (
                      <div key={step.key} className="flex sm:flex-col items-center sm:text-center gap-3 sm:gap-2">
                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                            isCurrent
                              ? 'bg-brand-600 text-white ring-4 ring-brand-500/20 shadow-md scale-105'
                              : isCompleted
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          <StepIcon className="w-5 h-5" />
                        </div>
                        <div className="space-y-0.5">
                          <p className={`text-xs font-bold ${isCurrent ? 'text-brand-600' : isCompleted ? 'text-slate-900' : 'text-slate-400'}`}>
                            {step.label}
                          </p>
                          <span className="text-[10px] text-slate-400 font-mono block">
                            {isCurrent ? 'Current Phase' : isCompleted ? 'Completed' : 'Upcoming'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Carrier & Tracking Meta Info Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Courier Carrier & Tracking Number */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-3">
              <span className="text-[11px] font-black uppercase tracking-wider text-brand-600 block">
                Carrier & Logistics Partner
              </span>
              <p className="text-base font-bold text-slate-900">
                {order.shipment?.carrier || 'ShopSphere Express'}
              </p>
              {order.shipment?.tracking_number && (
                <div className="pt-2 flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-400 font-mono uppercase block">Tracking ID</span>
                    <strong className="text-xs font-mono text-slate-800">{order.shipment.tracking_number}</strong>
                  </div>
                  <button
                    onClick={copyTracking}
                    className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors"
                    title="Copy tracking number"
                  >
                    {copiedTracking ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              )}
            </div>

            {/* Current Hub Location */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-3">
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-600 block">
                Current Hub Location
              </span>
              <div className="flex items-start gap-2.5">
                <MapPin className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-slate-900">
                    {order.shipment?.current_location || 'Central Fulfillment Center, Bengaluru'}
                  </p>
                  <span className="text-[11px] text-slate-500 mt-0.5 block">
                    Updated {new Date(order.shipment?.updated_at || order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>

            {/* Estimated Delivery */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-3">
              <span className="text-[11px] font-black uppercase tracking-wider text-indigo-600 block">
                Target Estimated Delivery
              </span>
              <div className="flex items-start gap-2.5">
                <Clock className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-slate-900">
                    {order.shipment?.estimated_delivery
                      ? new Date(order.shipment.estimated_delivery).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : 'Within 48 Hours'}
                  </p>
                  <span className="text-[11px] text-slate-500 mt-0.5 block">
                    Doorstep Delivery Guarantee
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive State Engine Simulator Box */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-lg space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/10 gap-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-brand-400" />
                  <h3 className="text-sm font-black uppercase tracking-wider text-brand-400">
                    Phase 5 State Engine Simulator
                  </h3>
                </div>
                <p className="text-xs text-slate-400">
                  Simulate state transitions, test cryptographic webhooks, and trigger inventory replenishment in real time.
                </p>
              </div>
              <span className="text-[11px] font-mono bg-white/10 px-3 py-1 rounded-full text-slate-300">
                Current: <strong className="text-white">{order.status}</strong>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {order.status === 'CONFIRMED' && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => handleSimulateStatus('PROCESSING')}
                  disabled={isSimulating}
                >
                  Advance to "Processing"
                </Button>
              )}
              {order.status === 'PROCESSING' && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => handleSimulateStatus('SHIPPED')}
                  disabled={isSimulating}
                >
                  Advance to "Shipped"
                </Button>
              )}
              {order.status === 'SHIPPED' && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => handleSimulateStatus('OUT_FOR_DELIVERY')}
                  disabled={isSimulating}
                >
                  Advance to "Out for Delivery"
                </Button>
              )}
              {order.status === 'OUT_FOR_DELIVERY' && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => handleSimulateStatus('DELIVERED')}
                  disabled={isSimulating}
                >
                  Mark as "Delivered"
                </Button>
              )}

              {/* Webhook trigger */}
              <button
                type="button"
                onClick={handleSimulateWebhook}
                disabled={isSimulating}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/10 flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Simulate Signed Webhook
              </button>

              {/* Cancel order button if not terminal */}
              {!['SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'].includes(order.status) && (
                <button
                  type="button"
                  onClick={() => setShowCancelModal(true)}
                  disabled={isSimulating}
                  className="px-3 py-2 rounded-xl text-xs font-bold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 transition-colors border border-rose-500/30 flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Cancel Order & Restock
                </button>
              )}
            </div>
          </div>

          {/* Chronological Milestones Timeline Log */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm space-y-6">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 pb-4 border-b border-slate-100">
              <Clock className="w-5 h-5 text-brand-600" />
              Detailed Logistics Audit Trail
            </h3>

            <div className="space-y-6 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {(order.shipment?.timeline || []).slice().reverse().map((event, idx) => (
                <div key={idx} className="relative flex items-start gap-4 pl-10">
                  <div className="absolute left-2.5 top-1 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-brand-600 ring-4 ring-white" />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{event.title}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-600 font-bold">
                        {event.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{event.description}</p>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono pt-0.5">
                      <span>{new Date(event.timestamp).toLocaleString()}</span>
                      {event.location && (
                        <>
                          <span>•</span>
                          <span>{event.location}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Itemized Tax Invoice & Receipt */}
      {activeTab === 'invoice' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-8 sm:p-12 shadow-sm space-y-8 animate-fadeIn printable-invoice">
          {/* Invoice Header */}
          <div className="flex flex-col sm:flex-row justify-between pb-8 border-b border-slate-200 gap-4">
            <div className="space-y-1">
              <span className="text-2xl font-black tracking-tight text-slate-900">ShopSphere</span>
              <p className="text-xs text-slate-500">Enterprise E-Commerce Platforms Inc.</p>
              <p className="text-xs text-slate-400">GSTIN: 29AAAAA0000A1Z5 • CIN: U72200KA2026PTC000000</p>
              <p className="text-xs text-slate-400">Central Logistics Hub, Whitefield, Bengaluru - 560066</p>
            </div>

            <div className="sm:text-right space-y-1">
              <span className="text-xs font-mono font-bold text-brand-600 uppercase tracking-widest block">
                Official Tax Invoice / Receipt
              </span>
              <p className="text-sm font-mono font-bold text-slate-900">{order.order_number}</p>
              <p className="text-xs text-slate-500">
                Date: {new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
              </p>
              <p className="text-xs text-slate-500">Payment: <strong className="text-emerald-700">{order.payment_status}</strong></p>
            </div>
          </div>

          {/* Customer & Shipping Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 py-4">
            <div className="space-y-1.5 text-xs text-slate-600">
              <span className="font-bold text-slate-900 uppercase tracking-wider block text-[11px]">
                Delivered To:
              </span>
              <p className="font-bold text-slate-800 text-sm">{order.shipping_address?.full_name}</p>
              <p>{order.shipping_address?.address_line1}</p>
              {order.shipping_address?.address_line2 && <p>{order.shipping_address.address_line2}</p>}
              <p>{order.shipping_address?.city}, {order.shipping_address?.state} - {order.shipping_address?.postal_code}</p>
              <p className="text-slate-400 font-mono">Contact: {order.shipping_address?.phone_number}</p>
            </div>

            <div className="space-y-1.5 text-xs text-slate-600">
              <span className="font-bold text-slate-900 uppercase tracking-wider block text-[11px]">
                Payment Transaction Details:
              </span>
              <p><strong className="text-slate-800">Gateway Provider:</strong> {order.payment?.provider || 'MOCK'}</p>
              <p><strong className="text-slate-800">Transaction ID:</strong> <span className="font-mono">{order.payment?.transaction_id || 'N/A'}</span></p>
              <p><strong className="text-slate-800">Payment Status:</strong> <span className="text-emerald-600 font-bold">{order.payment_status}</span></p>
              <p><strong className="text-slate-800">Carrier:</strong> {order.shipment?.carrier || 'ShopSphere Express'}</p>
            </div>
          </div>

          {/* Itemized Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-center">Qty</th>
                  <th className="py-3 px-4 text-right">Unit Price</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {item.product_title}
                    </td>
                    <td className="py-3.5 px-4 text-center text-slate-600">
                      {item.quantity}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-600 font-mono">
                      {formatPrice(item.unit_price)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-slate-900 font-mono">
                      {formatPrice(item.total_price)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pricing Math */}
          <div className="flex justify-end pt-2">
            <div className="w-full sm:w-72 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-semibold text-slate-900">{formatPrice(order.subtotal)}</span>
              </div>
              {order.discount_amount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Product Savings:</span>
                  <span className="font-bold">-{formatPrice(order.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Shipping Fee:</span>
                <span className="font-semibold text-emerald-600">
                  {order.shipping_fee === 0 ? 'FREE' : formatPrice(order.shipping_fee)}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Tax (5% GST):</span>
                <span className="font-semibold text-slate-900">{formatPrice(order.tax_amount)}</span>
              </div>
              <div className="flex justify-between pt-3 border-t border-slate-200 text-sm font-black text-slate-900">
                <span>Total Amount Paid:</span>
                <span className="text-base text-brand-600">{formatPrice(order.total_amount)}</span>
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-200">
            <Button
              size="md"
              variant="outline"
              onClick={() => window.print()}
              icon={Printer}
            >
              Print Official Tax Invoice
            </Button>

            <div className="flex items-center gap-3">
              <Link to="/profile">
                <Button size="md" variant="secondary">
                  View All Orders
                </Button>
              </Link>
              <Link to="/catalog">
                <Button size="md" variant="primary" icon={ArrowRight}>
                  Continue Shopping
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Order Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-600">
              <ShieldAlert className="w-6 h-6" />
              <h3 className="text-lg font-black text-slate-900">Cancel This Order?</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Cancelling this order will release all locked items back into physical stock for other customers, and your payment will be marked as refunded.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">Reason for Cancellation:</label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="Ordered by mistake">Ordered by mistake</option>
                <option value="Need to change shipping address">Need to change shipping address</option>
                <option value="Found alternative item">Found alternative item</option>
                <option value="Delivery time too long">Delivery time too long</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowCancelModal(false)}
              >
                Keep Order
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={handleCancelOrder}
                className="bg-rose-600 hover:bg-rose-700 text-white"
              >
                Confirm Cancellation
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderConfirmation;
