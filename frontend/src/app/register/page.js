'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import ThemeToggle from '@/components/ui/ThemeToggle';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const toast = useToast();
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await register(username, email, password);
      toast.success('Account created successfully');
      router.push('/dashboard');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex-1 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-10">
          <Link href="/" className="text-xs text-brand-text2 hover:text-brand-text1 transition-colors font-mono">
            ← Back
          </Link>
        </div>

        <h1 className="text-2xl font-bold mb-1">Create account</h1>
        <p className="text-sm text-brand-text2 mb-8">Start collaborating in seconds.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="username" className="block text-xs text-brand-text2 mb-1.5 font-mono uppercase tracking-wider">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full px-3 py-2.5 bg-brand-surface1 border border-brand-border text-sm text-brand-text1 placeholder:text-brand-text3 focus:outline-none transition-colors"
              style={{ backgroundColor: 'var(--surface-1)' }}
              placeholder="varun"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-xs text-brand-text2 mb-1.5 font-mono uppercase tracking-wider">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2.5 bg-brand-surface1 border border-brand-border text-sm text-brand-text1 placeholder:text-brand-text3 focus:outline-none transition-colors"
              style={{ backgroundColor: 'var(--surface-1)' }}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs text-brand-text2 mb-1.5 font-mono uppercase tracking-wider">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-3 py-2.5 bg-brand-surface1 border border-brand-border text-sm text-brand-text1 placeholder:text-brand-text3 focus:outline-none transition-colors"
              style={{ backgroundColor: 'var(--surface-1)' }}
              placeholder="Min 6 characters"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--base)' }}
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="text-sm text-brand-text2 mt-6 text-center">
          Already have an account?{' '}
          <Link href="/login" style={{ color: 'var(--accent)' }}>Log in</Link>
        </p>
      </div>
    </main>
  );
}
