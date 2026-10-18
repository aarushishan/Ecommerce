import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShoppingBag, Mail, Lock, User, Phone, Eye, EyeOff, AlertCircle, ArrowRight, Store } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Button from '../components/common/Button';
import Input from '../components/common/Input';

export const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    phone_number: '',
    role: 'CUSTOMER',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrorMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (formData.password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);
    try {
      await register(formData);
      navigate('/', { replace: true });
    } catch (err) {
      console.error('Registration error:', err);
      setErrorMessage(err.message || 'Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-lg space-y-8 bg-white p-8 sm:p-10 rounded-3xl border border-slate-200/90 shadow-xl">
        {/* Header */}
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-700 to-brand-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              Shop<span className="text-brand-600">Sphere</span>
            </span>
          </Link>
          <h2 className="text-xl font-extrabold text-slate-900 pt-2">Create Your Account</h2>
          <p className="text-xs text-slate-500">
            Join thousands of shoppers and verified merchants on ShopSphere.
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2 animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Account Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              I want to register as
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, role: 'CUSTOMER' })}
                className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  formData.role === 'CUSTOMER'
                    ? 'border-brand-600 bg-brand-50 text-brand-700 shadow-sm ring-1 ring-brand-500'
                    : 'border-slate-200 hover:border-slate-300 text-slate-600'
                }`}
              >
                <User className="w-4 h-4" />
                <span>Customer</span>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, role: 'SELLER' })}
                className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  formData.role === 'SELLER'
                    ? 'border-brand-600 bg-brand-50 text-brand-700 shadow-sm ring-1 ring-brand-500'
                    : 'border-slate-200 hover:border-slate-300 text-slate-600'
                }`}
              >
                <Store className="w-4 h-4" />
                <span>Merchant Seller</span>
              </button>
            </div>
          </div>

          {/* Names */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="First Name"
              name="first_name"
              placeholder="e.g. Aarav"
              value={formData.first_name}
              onChange={handleChange}
              icon={User}
              required
            />
            <Input
              label="Last Name"
              name="last_name"
              placeholder="e.g. Sharma"
              value={formData.last_name}
              onChange={handleChange}
              required
            />
          </div>

          <Input
            label="Email Address"
            name="email"
            type="email"
            placeholder="you@example.com"
            value={formData.email}
            onChange={handleChange}
            icon={Mail}
            required
          />

          <Input
            label="Phone Number"
            name="phone_number"
            type="tel"
            placeholder="+91 9876543210"
            value={formData.phone_number}
            onChange={handleChange}
            icon={Phone}
          />

          <div className="relative">
            <Input
              label="Password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Minimum 6 characters"
              value={formData.password}
              onChange={handleChange}
              icon={Lock}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-8 text-slate-400 hover:text-slate-600"
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <p className="text-[11px] text-slate-400 leading-normal">
            By signing up, you agree to ShopSphere's <a href="/terms" className="text-brand-600 hover:underline">Terms of Service</a> and <a href="/privacy" className="text-brand-600 hover:underline">Privacy Policy</a>.
          </p>

          <Button
            type="submit"
            size="lg"
            variant="primary"
            className="w-full"
            isLoading={isLoading}
            icon={ArrowRight}
          >
            Create My Account
          </Button>
        </form>

        {/* Link to Login */}
        <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-600 font-bold hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
