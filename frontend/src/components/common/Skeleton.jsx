import React from 'react';

export const Skeleton = ({
  className = '',
  variant = 'rectangular',
  width,
  height,
}) => {
  const variantStyles = {
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
    text: 'rounded h-4 my-1',
  };

  const style = {
    width: width || undefined,
    height: height || undefined,
  };

  return (
    <div
      style={style}
      className={`animate-pulse bg-slate-200 ${variantStyles[variant] || 'rounded-lg'} ${className}`}
    />
  );
};

export const CardSkeleton = () => (
  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
    <Skeleton height="180px" className="w-full" />
    <Skeleton variant="text" className="w-3/4" />
    <Skeleton variant="text" className="w-1/2" />
    <div className="flex justify-between items-center pt-2">
      <Skeleton width="80px" height="24px" />
      <Skeleton width="90px" height="32px" />
    </div>
  </div>
);

export default Skeleton;
