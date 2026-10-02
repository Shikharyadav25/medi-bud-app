import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'Medi Bud — Understand your reports and build everyday health habits',
  description: 'A college prototype AI health companion for lab report comprehension, cited health Q&A, transparent habit tracking, and 7-day Indian meal plans.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-(--background) text-(--text-primary)">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
        <footer className="border-t border-(--border-subtle) py-6 text-center text-xs text-(--text-muted) px-4">
          <p className="max-w-2xl mx-auto">
            Medi Bud AI Health Companion &copy; 2026. Academic College Prototype.
            Not a clinical platform or medical diagnostic tool. Always consult a certified healthcare professional.
          </p>
        </footer>
      </body>
    </html>
  );
}
