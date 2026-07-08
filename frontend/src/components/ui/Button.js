'use client';
export default function Button({ children, variant = 'primary', className = '', ...props }) {
  const base = 'px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50';
  const variants = {
    primary: '',
    secondary: 'border border-brand-border text-brand-text2 hover:text-brand-text1 hover:border-brand-borderActive',
    danger: 'text-brand-error border border-brand-error hover:bg-brand-error hover:text-brand-base',
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${className}`}
      style={variant === 'primary' ? { backgroundColor: 'var(--accent)', color: 'var(--base)' } : {}}
      {...props}
    >
      {children}
    </button>
  );
}
