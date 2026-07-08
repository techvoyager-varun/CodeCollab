'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useTheme } from '@/contexts/ThemeContext';
import ThemeToggle from '@/components/ui/ThemeToggle';

export default function Home() {
  const { theme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState(null);

  const features = [
    { icon: '⌨', title: 'Monaco Editor', desc: 'Industry-grade code editor with syntax highlighting, autocomplete, and multi-language support.' },
    { icon: '⚡', title: 'Real-Time Sync', desc: 'Every keystroke synced via Socket.IO. See cursors, selections, and presence of all collaborators.' },
    { icon: '◆', title: 'AI Assistant', desc: 'RAG-powered Gemini 2.5 Flash. Answers grounded in your actual project code, not generic advice.' },
    { icon: '▤', title: 'File System', desc: 'Full file tree with create, rename, delete. Folder support. Language auto-detection.' },
    { icon: '↻', title: 'Version History', desc: 'Every save creates a snapshot. Rollback to any point. Never lose work.' },
    { icon: '◯', title: 'Live Chat', desc: 'Room-based messaging with code snippets and reply threads. All in real-time.' },
    { icon: '▶', title: 'Code Execution', desc: 'Run JavaScript, Python, and more directly in the browser. Sandboxed with timeout protection.' },
    { icon: '✓', title: 'Code Review', desc: 'AI-powered code review, debugging, optimization, refactoring, and test generation.' },
  ];

  return (
    <main className="flex-1">
      {}
      <header className="sticky top-0 z-50 border-b border-brand-border" style={{ backgroundColor: 'var(--base)' }}>
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 select-none hover:opacity-90 transition-opacity">
            <img src="/logo.png" alt="Logo" className="h-10 w-auto object-contain" />
            <span className="text-base font-bold tracking-wide" style={{ color: 'var(--accent)' }}>
              CodeCollab
            </span>
          </Link>
          
          {}
          <div className="hidden md:flex items-center gap-4">
            <ThemeToggle />
            <Link
              href="/docs"
              className="text-sm text-brand-text2 hover:text-brand-text1 transition-colors"
            >
              Guide
            </Link>
            <Link
              href="/login"
              className="text-sm text-brand-text2 hover:text-brand-text1 transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/register"
              className="text-sm px-4 py-2 border transition-colors"
              style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}
            >
              Sign up
            </Link>
          </div>

          {}
          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="w-8 h-8 flex items-center justify-center border border-brand-border text-brand-text2 hover:text-brand-text1 transition-colors text-sm font-mono"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? '×' : '☰'}
            </button>
          </div>
        </div>

        {}
        {mobileMenuOpen && (
          <div className="border-t border-brand-border bg-brand-surface1 md:hidden animate-fade font-sans">
            <div className="flex flex-col p-4 gap-3">
              <Link
                href="/docs"
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm text-brand-text2 hover:text-brand-text1 transition-colors py-1.5 border-b border-brand-border"
              >
                Guide
              </Link>
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm text-brand-text2 hover:text-brand-text1 transition-colors py-1.5 border-b border-brand-border"
              >
                Log in
              </Link>
              <Link
                href="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm py-2 text-center border transition-colors block"
                style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}
              >
                Sign up
              </Link>
            </div>
          </div>
        )}
      </header>

      {}
      <section className="border-b border-brand-border">
        <div className="max-w-6xl mx-auto px-6 py-24 md:py-32">
          <p className="text-xs font-mono uppercase tracking-widest mb-6" style={{ color: 'var(--accent)' }}>
            Real-time collaborative coding
          </p>
          <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6 max-w-3xl">
            Write code together.
            <br />
            <span style={{ color: 'var(--accent)' }}>Ship faster.</span>
          </h1>
          <p className="text-lg text-brand-text2 max-w-xl mb-10 leading-relaxed">
            A collaborative coding platform with AI assistance powered by RAG.
            Real-time editing, project-aware AI, version control — all in the browser.
          </p>
          <div className="flex gap-3">
            <Link
              href="/register"
              className="px-4 py-2 sm:px-6 sm:py-3 text-xs sm:text-sm font-medium transition-colors"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--base)' }}
            >
              Get started
            </Link>
            <Link
              href="/login"
              className="px-4 py-2 sm:px-6 sm:py-3 text-xs sm:text-sm font-medium border border-brand-border text-brand-text2 hover:text-brand-text1 hover:border-brand-borderActive transition-colors"
            >
              I have an account
            </Link>
          </div>
        </div>
      </section>

      {}
      <section>
        <div className="max-w-6xl mx-auto px-6 py-20">
          <p className="text-xs font-mono uppercase tracking-widest mb-3" style={{ color: 'var(--accent)' }}>
            Features
          </p>
          <h2 className="text-2xl font-bold mb-12">Everything you need to code collaboratively.</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-brand-border">
            {features.map((f, i) => (
              <div
                key={i}
                className="bg-brand-base p-6 hover:bg-brand-surface1 transition-colors group"
              >
                <span className="text-xl mb-4 block" style={{ color: 'var(--accent)' }}>
                  {f.icon}
                </span>
                <h3 className="text-sm font-semibold mb-2">{f.title}</h3>
                <p className="text-xs text-brand-text2 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {}
      <section className="border-t border-brand-border">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <p className="text-xs font-mono uppercase tracking-widest mb-3" style={{ color: 'var(--accent)' }}>
            FAQ
          </p>
          <h2 className="text-2xl font-bold mb-8">Frequently Asked Questions</h2>

          <div className="flex flex-col border border-brand-border divide-y divide-brand-border font-sans">
            {[
              {
                q: 'What is CodeCollab?',
                a: 'CodeCollab is a real-time collaborative development environment that allows developers to write code, execute programs, chat in real-time, and get AI support synchronously in a shared workspace.'
              },
              {
                q: 'How does the AI assistant understand my project?',
                a: 'It uses a RAG (Retrieval-Augmented Generation) pipeline. All code files are parsed, split into segments, embedded as vectors, and indexed in PostgreSQL. When you ask a question, the system retrieves only the relevant code snippets so Gemini answers with full context of your actual files.'
              },
              {
                q: 'Which languages are supported for code execution?',
                a: 'You can execute 17 programming languages directly from the integrated terminal panel, including JavaScript, Python, TypeScript, Go, Ruby, PHP, Shell scripts, C, C++, Java, Rust, Swift, Perl, R, Scala, Haskell, and Dart.'
              },
              {
                q: 'Is it possible to deploy CodeCollab for free?',
                a: 'Absolutely. The platform is designed to stay within the free tier limits.'
              }
            ].map((faq, i) => {
              const isOpen = expandedFaq === i;
              return (
                <div
                  key={i}
                  className="bg-brand-base hover:bg-brand-surface1 transition-colors cursor-pointer"
                  onClick={() => setExpandedFaq(isOpen ? null : i)}
                >
                  <div className="p-5 flex items-center justify-between gap-4 select-none">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <span className="font-mono text-xs" style={{ color: 'var(--accent)' }}>Q:</span> {faq.q}
                    </h3>
                    <span className="font-mono text-[10px] text-brand-text3 transition-transform duration-200" style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                      {isOpen ? '▼' : '▶'}
                    </span>
                  </div>
                  {isOpen && (
                    <div className="px-5 pb-5 animate-fade">
                      <p className="text-xs text-brand-text2 leading-relaxed pl-5 font-normal">
                        {faq.a}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
