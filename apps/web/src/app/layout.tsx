import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
export const metadata: Metadata = {
  title: "Medi Bud — A little clarity for your health",
  description:
    "Organize health reports, explore source-based answers, and build everyday habits.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <main id="main-content" className="app-main">
          {children}
        </main>
        <footer className="app-footer">
          <span>© 2026 Medi Bud · Care, with clarity.</span>
          <span>
            Wellness information only. For medical decisions, speak with a
            qualified clinician.
          </span>
        </footer>
      </body>
    </html>
  );
}
