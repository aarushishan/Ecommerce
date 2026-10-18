export const formatPrice = (amount) => {
  if (amount === null || amount === undefined) return '₹0';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
};

export const calculateDiscount = (basePrice, discountPrice) => {
  if (!discountPrice || discountPrice >= basePrice) return 0;
  return Math.round(((basePrice - discountPrice) / basePrice) * 100);
};
