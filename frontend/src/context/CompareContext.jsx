import React, { createContext, useContext, useState, useEffect } from 'react';

const CompareContext = createContext();

export const CompareProvider = ({ children }) => {
  const [compareItems, setCompareItems] = useState(() => {
    try {
      const saved = localStorage.getItem('shopsphere_compare_items');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('shopsphere_compare_items', JSON.stringify(compareItems));
    } catch (e) {
      console.error('Failed to persist compare items:', e);
    }
  }, [compareItems]);

  const addToCompare = (product) => {
    if (!product || !product.id) return false;

    // Check if already in comparison
    if (compareItems.some((item) => item.id === product.id)) {
      return true;
    }

    // Maximum 4 products allowed for side-by-side comparison
    if (compareItems.length >= 4) {
      alert('You can compare a maximum of 4 products at a time. Please remove an item first.');
      return false;
    }

    setCompareItems((prev) => [...prev, product]);
    return true;
  };

  const removeFromCompare = (productId) => {
    setCompareItems((prev) => prev.filter((item) => item.id !== productId));
  };

  const clearCompare = () => {
    setCompareItems([]);
    setIsCompareModalOpen(false);
  };

  const isInCompare = (productId) => {
    return compareItems.some((item) => item.id === productId);
  };

  const openCompareModal = () => {
    if (compareItems.length < 2) {
      alert('Please select at least 2 products to compare.');
      return;
    }
    setIsCompareModalOpen(true);
  };

  const closeCompareModal = () => {
    setIsCompareModalOpen(false);
  };

  return (
    <CompareContext.Provider
      value={{
        compareItems,
        addToCompare,
        removeFromCompare,
        clearCompare,
        isInCompare,
        isCompareModalOpen,
        openCompareModal,
        closeCompareModal,
      }}
    >
      {children}
    </CompareContext.Provider>
  );
};

export const useCompare = () => {
  const context = useContext(CompareContext);
  if (!context) {
    throw new Error('useCompare must be used within a CompareProvider');
  }
  return context;
};

export default CompareContext;
