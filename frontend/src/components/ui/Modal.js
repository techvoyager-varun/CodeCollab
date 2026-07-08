'use client';
export default function Modal({ children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade" onClick={onClose}>
      <div className="bg-brand-surface1 border border-brand-border p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
