'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function DocsPage() {
  const [expandedStep, setExpandedStep] = useState(null);

  const steps = [
    {
      num: '01',
      title: 'Authentication & Profile Setup',
      desc: 'Start by registering a new account. Every user gets assigned a unique avatar color so teammates can easily identify your cursor actions, edits, and chat messages in the shared coding rooms.'
    },
    {
      num: '02',
      title: 'Creating a Project Workspace',
      desc: 'From your central dashboard, click "+ New Project". Enter a name, write an optional description, select your primary coding language, and hit "Create". A default room named "Main" is automatically created for your workspace.'
    },
    {
      num: '03',
      title: 'Real-Time Collaborative Coding',
      desc: 'Open the project workspace. To collaborate, simply add users as members to your project via the settings or share the room link. When teammates join, you will see their cursors blink in real-time on your Monaco Editor workspace.'
    },
    {
      num: '04',
      title: 'Managing the Workspace File System',
      desc: 'Use the left sidebar tree to add, rename, or delete files and folders. Creating files with standard extensions (like .js, .py, .go) automatically configures Monaco Editor syntax highlighting, linting, and autocomplete.'
    },
    {
      num: '05',
      title: 'Executing Code & Output Logs',
      desc: 'Write code in the editor, then click the "▶ Run" button in the toolbar. A sandboxed terminal execution panel will automatically pop up from the bottom, displaying stdout, stderr logs, execution times, and exit codes.'
    },
    {
      num: '06',
      title: 'Leveraging Project-Aware RAG AI',
      desc: 'Switch the right sidebar drawer to the "AI" panel. You can ask standard questions about your project code. Our system uses Retrieval-Augmented Generation (RAG) to embed and locate contextually relevant files, feeding them directly to Gemini 2.5 Flash for accurate responses.'
    },
    {
      num: '07',
      title: 'Using AI Code Tools',
      desc: 'Need code explanation, debugging help, optimization, refactor logic, reviews, test generation, or documentation? Select code, switch your AI panel mode, and run specific assistant workflows.'
    },
    {
      num: '08',
      title: 'Tracking Snapshots & Version Rollover',
      desc: 'Press "Ctrl+S" or click "Save" in the toolbar to record snapshots of your files. Open the "History" panel to see a chronological timeline of previous saves. Click "Restore" to rollback any file state safely.'
    }
  ];

  return (
    <main className="flex-1">
      {}
      <header className="sticky top-0 z-50 border-b border-brand-border" style={{ backgroundColor: 'var(--base)' }}>
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="text-xs text-brand-text2 hover:text-brand-text1 transition-colors font-mono">
            ← Back
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-xs px-3 py-1.5 border border-brand-border hover:border-brand-borderActive transition-colors font-mono"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      {}
      <section className="border-b border-brand-border">
        <div className="max-w-4xl mx-auto px-6 py-16 text-left">
          <p className="text-xs font-mono uppercase tracking-widest mb-3" style={{ color: 'var(--accent)' }}>
            User Guide
          </p>
          <h1 className="text-3xl md:text-5xl font-bold mb-4">Getting Started with CodeCollab</h1>
          <p className="text-base text-brand-text2 max-w-2xl leading-relaxed">
            Follow this manual to start creating workspaces, collaborating with team members in real-time, executing scripts, and using the RAG AI companion.
          </p>
        </div>
      </section>

      {}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex flex-col border border-brand-border divide-y divide-brand-border">
            {steps.map((s, i) => {
              const isOpen = expandedStep === i;
              return (
                <div
                  key={i}
                  className="bg-brand-base hover:bg-brand-surface1 transition-colors cursor-pointer"
                  onClick={() => setExpandedStep(isOpen ? null : i)}
                >
                  <div className="p-6 flex gap-4 items-center justify-between select-none">
                    <div className="flex gap-4 items-center min-w-0">
                      <span className="font-mono text-xl font-bold leading-none shrink-0" style={{ color: 'var(--accent)' }}>
                        {s.num}
                      </span>
                      <h3 className="text-base font-bold font-sans text-brand-text1">{s.title}</h3>
                    </div>
                    <span className="font-mono text-[10px] text-brand-text3 transition-transform duration-200" style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                      {isOpen ? '▼' : '▶'}
                    </span>
                  </div>
                  {isOpen && (
                    <div className="px-6 pb-6 pl-14 animate-fade">
                      <p className="text-xs text-brand-text2 leading-relaxed font-normal">
                        {s.desc}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {}
      <section className="border-t border-brand-border py-16 bg-brand-surface1">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-xl font-bold mb-4">Ready to start collaborating?</h2>
          <div className="flex justify-center gap-3">
            <Link
              href="/register"
              className="px-6 py-3 text-sm font-medium transition-colors"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--base)' }}
            >
              Register Now
            </Link>
            <Link
              href="/login"
              className="px-6 py-3 text-sm font-medium border border-brand-border text-brand-text2 hover:text-brand-text1 hover:border-brand-borderActive transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
