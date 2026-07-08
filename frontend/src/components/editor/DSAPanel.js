'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

export default function DSAPanel({ activeFile, terminalOutput, onRunCode }) {
  const [customInput, setCustomInput] = useState('');
  const [expectedOutput, setExpectedOutput] = useState('');
  const [lastOutput, setLastOutput] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submission, setSubmission] = useState(null);

  const toast = useToast();

  
  useEffect(() => {
    if (terminalOutput && !terminalOutput.running) {
      setLastOutput({
        stdout: terminalOutput.stdout || '',
        stderr: terminalOutput.stderr || '',
        exitCode: terminalOutput.exitCode,
        executionTime: terminalOutput.executionTime,
        memoryUsage: terminalOutput.memoryUsage
      });
    }
  }, [terminalOutput]);

  const handleRun = () => {
    if (!activeFile) {
      toast.error('Please open a file first.');
      return;
    }
    setLastOutput(null);
    setSubmission(null);
    onRunCode(customInput);
    toast.info('Running custom test case...');
  };

  const handleSubmit = async () => {
    if (!activeFile) {
      toast.error('Please open a file first.');
      return;
    }

    setSubmitting(true);
    setSubmission(null);
    setLastOutput(null);

    try {
      
      const response = await api.post('/api/ai/ask', {
        question: `Grade this program as a competitive programming (DSA) submission. 
Evaluate edge cases, correctness, time complexity, and space complexity. 
Structure your feedback clearly in this EXACT format:
---
### Submission Status: [Accepted | Wrong Answer | Time Limit Exceeded | Runtime Error]
### Metrics: Time: O(...), Space: O(...)
### Edge Cases:
- [List edge cases evaluated]
### Code Review:
- [Feedback on performance and style]
---

Code:
${activeFile.content}`,
        projectId: activeFile.project_id
      });

      setSubmission(response.answer);
      toast.success('Submission evaluation completed');
    } catch (err) {
      toast.error('Submission failed: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  
  const runMatchesExpected = lastOutput && expectedOutput.trim() && 
    lastOutput.stdout.trim() === expectedOutput.trim();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {}
      <div className="h-8 px-3 flex items-center border-b border-brand-border shrink-0" style={{ backgroundColor: 'var(--surface-1)' }}>
        <span className="text-[10px] font-mono uppercase tracking-widest text-brand-text3">🏆 DSA Arena</span>
      </div>

      {}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            overflowY: 'auto',
            padding: '12px',
          }}
          className="space-y-4 font-mono text-xs"
        >
          {}
          <div className="space-y-2">
            <div>
              <label className="block text-[10px] uppercase text-brand-text3 mb-1">Custom Stdin Input</label>
              <textarea
                rows="3"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="e.g. 5&#10;1 2 3 4 5"
                className="w-full p-2 border border-brand-border text-[11px] text-brand-text1 bg-brand-surface2 placeholder:text-brand-text3 focus:outline-none resize-y"
                style={{ backgroundColor: 'var(--surface-2)', fontFamily: 'var(--font-mono)' }}
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase text-brand-text3 mb-1">Expected Output (Optional)</label>
              <textarea
                rows="2"
                value={expectedOutput}
                onChange={(e) => setExpectedOutput(e.target.value)}
                placeholder="e.g. 15"
                className="w-full p-2 border border-brand-border text-[11px] text-brand-text1 bg-brand-surface2 placeholder:text-brand-text3 focus:outline-none resize-y"
                style={{ backgroundColor: 'var(--surface-2)', fontFamily: 'var(--font-mono)' }}
              />
            </div>
          </div>

          {}
          <div className="flex gap-2">
            <button
              onClick={handleRun}
              className="flex-1 py-1.5 border border-brand-border hover:border-brand-accent transition-colors font-medium rounded-sm cursor-pointer"
            >
              ▶ Run Code
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 py-1.5 font-medium rounded-sm transition-opacity cursor-pointer disabled:opacity-50 text-white"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--base)' }}
            >
              {submitting ? 'Evaluating...' : '🚀 Submit Solution'}
            </button>
          </div>

          {}
          {lastOutput && (
            <div className="border border-brand-border rounded p-3 bg-brand-surface1 space-y-2" style={{ backgroundColor: 'var(--surface-1)' }}>
              <div className="font-semibold text-brand-text1 text-[11px] uppercase tracking-wider border-b border-brand-border pb-1">
                Execution Results
              </div>
              <div className="grid grid-cols-3 gap-1 text-[10px] text-brand-text3">
                <div>Time: <span className="text-brand-text1 font-bold">{lastOutput.executionTime}ms</span></div>
                <div>Mem: <span className="text-brand-text1 font-bold">{lastOutput.memoryUsage ? (lastOutput.memoryUsage / 1024 / 1024).toFixed(2) : '0.00'} MB</span></div>
                <div>Exit: <span className={lastOutput.exitCode === 0 ? 'text-brand-success font-bold' : 'text-brand-error font-bold'} style={lastOutput.exitCode === 0 ? { color: 'var(--success)' } : { color: 'var(--error)' }}>{lastOutput.exitCode}</span></div>
              </div>

              {lastOutput.stderr ? (
                <div className="mt-2">
                  <span className="text-[10px] text-brand-error uppercase block" style={{ color: 'var(--error)' }}>Runtime Error:</span>
                  <pre className="p-2 bg-brand-base border border-brand-border text-[10px] text-brand-error whitespace-pre-wrap overflow-x-auto rounded-sm mt-1" style={{ backgroundColor: 'var(--base)', color: 'var(--error)' }}>
                    {lastOutput.stderr}
                  </pre>
                </div>
              ) : (
                <div className="mt-2">
                  <span className="text-[10px] text-brand-text3 uppercase block">Program Output:</span>
                  <pre className="p-2 bg-brand-base border border-brand-border text-[10px] text-brand-text1 whitespace-pre-wrap overflow-x-auto rounded-sm mt-1" style={{ backgroundColor: 'var(--base)' }}>
                    {lastOutput.stdout || '[No Output]'}
                  </pre>
                </div>
              )}

              {}
              {expectedOutput.trim() && !lastOutput.stderr && (
                <div className="mt-2 pt-2 border-t border-brand-border flex items-center justify-between">
                  <span className="text-[10px] text-brand-text3 uppercase">Verification:</span>
                  <span className={`text-[11px] font-bold ${runMatchesExpected ? 'text-brand-success' : 'text-brand-error'}`} style={runMatchesExpected ? { color: 'var(--success)' } : { color: 'var(--error)' }}>
                    {runMatchesExpected ? '✅ Passed Test Case' : '❌ Wrong Answer'}
                  </span>
                </div>
              )}
            </div>
          )}

          {}
          {submission && (
            <div className="border border-brand-border rounded p-3 bg-brand-surface1 space-y-2" style={{ backgroundColor: 'var(--surface-1)' }}>
              <div className="font-semibold text-brand-accent text-[11px] uppercase tracking-wider border-b border-brand-border pb-1" style={{ color: 'var(--accent)' }}>
                Submission Report
              </div>
              <div className="text-[11px] leading-relaxed text-brand-text2 space-y-2 whitespace-pre-wrap">
                {submission}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
