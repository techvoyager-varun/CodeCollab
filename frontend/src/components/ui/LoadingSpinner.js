'use client';
export default function LoadingSpinner({ size = 'md' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' };
  return (
    <div className={`${sizes[size]} border-2 border-brand-border animate-spin`} style={{ borderTopColor: 'var(--accent)' }} />
  );
}
