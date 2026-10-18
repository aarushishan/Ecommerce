import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Bot, 
  Sparkles, 
  X, 
  Send, 
  RotateCcw, 
  ShoppingCart, 
  Check, 
  Scale, 
  ExternalLink, 
  Package, 
  ChevronDown, 
  ArrowRight,
  ShieldCheck,
  Star,
  MessageSquare
} from 'lucide-react';
import { chatWithSphereBot } from '../../services/aiService';
import { getProductBySlug } from '../../services/productService';
import { useCart } from '../../context/CartContext';
import { useCompare } from '../../context/CompareContext';
import { formatPrice } from '../../utils/formatters';

export const SphereBot = ({ currentProduct = null }) => {
  const location = useLocation();
  const [activeProduct, setActiveProduct] = useState(currentProduct);

  useEffect(() => {
    if (currentProduct) {
      setActiveProduct(currentProduct);
    } else if (location.pathname.startsWith('/products/')) {
      const slug = location.pathname.replace('/products/', '').split('/')[0];
      if (slug) {
        getProductBySlug(slug)
          .then((p) => setActiveProduct(p))
          .catch(() => setActiveProduct(null));
      }
    } else {
      setActiveProduct(null);
    }
  }, [location.pathname, currentProduct]);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 'welcome-1',
      sender: 'bot',
      text: "👋 Hi! I'm **SphereBot**, your ShopSphere shopping assistant grounded in our live verified catalog.\n\nAsk me anything — finding products, comparing specs, checking order statuses, or our return and shipping policies!",
      suggested_products: [],
      quick_replies: [
        "🔥 Show Today's Top Deals",
        "🎧 Wireless Headphones under ₹10,000",
        "📦 Where is my order?",
        "🛡️ What is your return policy?"
      ],
      created_at: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [addedItemIds, setAddedItemIds] = useState([]);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const { addToCart } = useCart();
  const { addToCompare, openCompareModal } = useCompare();

  // Scroll to bottom on new messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, isOpen]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setHasUnread(false);
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen]);

  const handleSendMessage = async (textToSend) => {
    const query = (textToSend || inputValue).trim();
    if (!query) return;

    // Add user message
    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      created_at: new Date()
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    try {
      const context = {};
      if (activeProduct) {
        context.current_product_id = activeProduct.id;
        context.current_product_title = activeProduct.title;
        context.current_category = activeProduct.category_name;
      }

      const response = await chatWithSphereBot(query, context);

      const botMsg = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: response.message,
        intent: response.intent,
        suggested_products: response.suggested_products || [],
        quick_replies: response.quick_replies || [],
        order_info: response.order_info || null,
        created_at: new Date()
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error('SphereBot query error:', err);
      const errorMsg = {
        id: `err-${Date.now()}`,
        sender: 'bot',
        text: "I encountered a brief connection issue communicating with the catalog. Please try again or ask another question!",
        suggested_products: [],
        quick_replies: ["Today's Deals", "Browse Catalog"],
        created_at: new Date()
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleAddToCart = async (product) => {
    try {
      await addToCart(product, 1);
      setAddedItemIds((prev) => [...prev, product.id]);
      setTimeout(() => {
        setAddedItemIds((prev) => prev.filter((id) => id !== product.id));
      }, 2000);
    } catch (err) {
      console.error('Cart add failed:', err);
    }
  };

  const handleCompareTwo = (p1, p2) => {
    if (p1) addToCompare(p1);
    if (p2) addToCompare(p2);
    openCompareModal();
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'bot',
        text: "Conversation cleared. How can I assist your shopping right now?",
        suggested_products: [],
        quick_replies: [
          "🔥 Show Today's Top Deals",
          "🎧 Wireless Headphones under ₹10,000",
          "📦 Where is my order?",
          "🛡️ What is your return policy?"
        ],
        created_at: new Date()
      }
    ]);
  };

  return (
    <>
      {/* Floating Launcher Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 group flex items-center gap-3 p-3.5 sm:px-5 sm:py-3.5 bg-gradient-to-r from-brand-700 via-brand-600 to-blue-600 hover:from-brand-600 hover:to-blue-500 text-white rounded-full shadow-2xl hover:shadow-brand-500/30 transition-all duration-300 hover:scale-105 active:scale-95 border border-white/20"
          aria-label="Open SphereBot Shopping Assistant"
        >
          <div className="relative">
            <div className="w-6 h-6 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full animate-ping"></span>
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full"></span>
          </div>

          <div className="hidden sm:flex flex-col text-left">
            <span className="text-xs font-black tracking-wide leading-none flex items-center gap-1">
              SphereBot <Sparkles className="w-3 h-3 text-amber-300" />
            </span>
            <span className="text-[10px] text-brand-100 font-medium">
              {activeProduct ? 'Ask about this product' : 'AI Shopping Assistant'}
            </span>
          </div>
        </button>
      )}

      {/* Expanded Chat Drawer / Window */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[420px] h-[600px] max-h-[85vh] bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-slate-950 via-brand-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-blue-500 flex items-center justify-center text-white shadow-md">
                <Bot className="w-5 h-5" />
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-slate-900 rounded-full"></span>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold tracking-tight text-white">SphereBot</h3>
                  <span className="px-1.5 py-0.5 rounded bg-brand-500/30 text-[10px] font-bold text-brand-200 border border-brand-400/30">
                    AI
                  </span>
                </div>
                <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Grounded Catalog Engine
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleClearHistory}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Restart Chat"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Minimize"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Context Notice if on PDP */}
          {activeProduct && (
            <div className="px-4 py-2 bg-brand-50 border-b border-brand-100 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2 overflow-hidden">
                <Sparkles className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                <span className="text-[11px] text-brand-900 font-medium truncate">
                  Viewing: <span className="font-bold">{activeProduct.title}</span>
                </span>
              </div>
              <button
                onClick={() => handleSendMessage(`Tell me about ${activeProduct.title}`)}
                className="text-[10px] font-bold text-brand-600 hover:underline shrink-0"
              >
                Ask Details
              </button>
            </div>
          )}

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} space-y-2`}
              >
                {/* Bubble */}
                <div
                  className={`max-w-[88%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-sm ${
                    msg.sender === 'user'
                      ? 'bg-brand-600 text-white rounded-br-sm'
                      : 'bg-white text-slate-800 border border-slate-200/90 rounded-bl-sm'
                  }`}
                >
                  <div className="whitespace-pre-line font-normal space-y-1">
                    {msg.text}
                  </div>

                  {/* Order Tracking Card */}
                  {msg.order_info && (
                    <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between font-bold text-[11px]">
                        <span className="flex items-center gap-1 text-brand-700">
                          <Package className="w-3.5 h-3.5" /> #{msg.order_info.order_number}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px]">
                          {msg.order_info.status}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500">
                        <div>Tracking: <span className="font-mono font-semibold text-slate-700">{msg.order_info.tracking_code || 'Pending Dispatch'}</span></div>
                        <div>Carrier: {msg.order_info.carrier || 'ShopSphere Express'}</div>
                        <div>Total: {formatPrice(msg.order_info.total_amount)}</div>
                      </div>
                    </div>
                  )}

                  {/* Grounded Suggested Products Cards */}
                  {msg.suggested_products && msg.suggested_products.length > 0 && (
                    <div className="mt-3 space-y-2 pt-2 border-t border-slate-100">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Verified Catalog Recommendations:
                      </span>
                      {msg.suggested_products.map((p) => {
                        const isAdded = addedItemIds.includes(p.id);
                        return (
                          <div
                            key={p.id}
                            className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3 hover:border-brand-300 transition-colors"
                          >
                            <img
                              src={p.primary_image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&q=80'}
                              alt={p.title}
                              className="w-11 h-11 rounded-lg object-contain bg-white border border-slate-100 shrink-0"
                            />

                            <div className="flex-1 min-w-0">
                              <a
                                href={`/products/${p.slug}`}
                                className="text-[11px] font-bold text-slate-900 hover:text-brand-600 truncate block"
                                title={p.title}
                              >
                                {p.title}
                              </a>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="font-black text-xs text-slate-900">
                                  {formatPrice(p.discount_price || p.base_price)}
                                </span>
                                <div className="flex items-center text-[10px] text-amber-600 font-bold">
                                  <Star className="w-2.5 h-2.5 fill-current text-amber-500 mr-0.5" />
                                  {Number(p.rating_avg).toFixed(1)}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => addToCompare(p)}
                                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
                                title="Add to comparison"
                              >
                                <Scale className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleAddToCart(p)}
                                disabled={!p.in_stock}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  isAdded
                                    ? 'bg-emerald-600 text-white'
                                    : p.in_stock
                                    ? 'bg-brand-600 hover:bg-brand-700 text-white'
                                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                }`}
                                title={isAdded ? 'Added!' : 'Add to cart'}
                              >
                                {isAdded ? (
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                ) : (
                                  <ShoppingCart className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      {msg.suggested_products.length >= 2 && (
                        <button
                          onClick={() => handleCompareTwo(msg.suggested_products[0], msg.suggested_products[1])}
                          className="w-full mt-2 py-1.5 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 text-[11px] font-bold flex items-center justify-center gap-1 transition-colors"
                        >
                          <Scale className="w-3 h-3 text-brand-600" /> Compare Top 2 Side-by-Side
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Quick Reply Chips below bot message */}
                {msg.sender === 'bot' && msg.quick_replies && msg.quick_replies.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1 pl-1 max-w-[95%]">
                    {msg.quick_replies.map((chip, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(chip)}
                        className="px-2.5 py-1 rounded-full bg-white hover:bg-brand-50 border border-slate-200 hover:border-brand-300 text-slate-700 hover:text-brand-700 text-[11px] font-medium transition-all shadow-2xs text-left"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex items-center gap-2 p-3 rounded-2xl bg-white border border-slate-200 max-w-[120px] shadow-sm">
                <span className="w-2 h-2 rounded-full bg-brand-600 animate-bounce"></span>
                <span className="w-2 h-2 rounded-full bg-brand-600 animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-2 h-2 rounded-full bg-brand-600 animate-bounce [animation-delay:0.4s]"></span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <div className="p-3 bg-white border-t border-slate-200 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask SphereBot (e.g. 'Best audio under ₹5000')..."
                className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 focus:bg-white transition-all"
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isTyping}
                className="p-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-200 text-white disabled:text-slate-400 rounded-xl transition-colors shadow-sm shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default SphereBot;
