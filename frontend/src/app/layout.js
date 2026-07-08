import './globals.css';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { SpeedInsights } from '@vercel/speed-insights/next';

export const metadata = {
  title: 'CodeCollab — Real-Time Collaborative AI Coding',
  description: 'A real-time collaborative coding platform with AI-powered assistance, Monaco Editor, and Socket.IO synchronization. Built by Varun.',
  keywords: 'code editor, collaboration, AI coding, real-time, Monaco editor',
  icons: {
    icon: '/faviconlogo.png',
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/faviconlogo.png" />
      </head>
      <body className="min-h-screen bg-brand-base text-brand-text1 antialiased">
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              <div className="flex flex-col min-h-screen">
                {children}
                <SpeedInsights />
                <footer className="border-t border-brand-border py-4 px-6 text-center text-xs text-brand-text3">
                  © 2026 Varun. All rights reserved. Created by Varun.
                </footer>
              </div>
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
