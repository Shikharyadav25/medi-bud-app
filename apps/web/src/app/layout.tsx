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
          {process.env.NODE_ENV === "production" &&
            (!process.env.NEXT_PUBLIC_API_URL ||
              !process.env.NEXT_PUBLIC_SUPABASE_URL ||
              !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) && (
              <aside
                role="status"
                className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"
              >
                <strong>Frontend preview — services not connected.</strong>{" "}
                Account registration, saved health data and live AI are
                unavailable until the backend and authentication services are
                configured. Do not enter real health information here yet.
              </aside>
            )}
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
