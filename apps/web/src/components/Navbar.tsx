'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Activity, 
  FileText, 
  MessageSquare, 
  Utensils, 
  ShieldAlert, 
  MapPin, 
  Wifi, 
  WifiOff, 
  RefreshCw,
  Globe
} from 'lucide-react';
import { replayPendingMutations, offlineDb } from '@/lib/offlineDb';

export function Navbar() {
  const pathname = usePathname();
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [locale, setLocale] = useState<'en' | 'hi'>('en');

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const checkPending = async () => {
      try {
        const count = await offlineDb.pendingMutations.count();
        setPendingCount(count);
      } catch {
        // Dexie may not be available on server
      }
    };
    checkPending();
    const interval = setInterval(checkPending, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const handleSyncNow = async () => {
    setIsSyncing(true);
    await replayPendingMutations();
    const count = await offlineDb.pendingMutations.count();
    setPendingCount(count);
    setIsSyncing(false);
  };

  const navLinks = [
    { href: '/dashboard', label: locale === 'hi' ? 'डैशबोर्ड' : 'Dashboard', icon: Activity },
    { href: '/reports', label: locale === 'hi' ? 'रिपोर्ट्स' : 'Reports', icon: FileText },
    { href: '/chat', label: locale === 'hi' ? 'प्रश्नोत्तर' : 'Health Q&A', icon: MessageSquare },
    { href: '/plan', label: locale === 'hi' ? 'भोजन योजना' : 'Meal Plan', icon: Utensils },
    { href: '/symptoms', label: locale === 'hi' ? 'लक्षण गाइड' : 'Symptom Guide', icon: ShieldAlert },
    { href: '/nearby', label: locale === 'hi' ? 'निकटतम केंद्र' : 'Nearby Care', icon: MapPin },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-(--surface) border-b border-(--border-subtle) px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 text-decoration-none">
          <div className="w-9 h-9 rounded-xl bg-(--primary) text-white flex items-center justify-center font-bold text-lg shadow-sm">
            M
          </div>
          <div>
            <span className="font-bold text-base text-(--text-primary) tracking-tight">Medi Bud</span>
            <span className="hidden sm:block text-[11px] text-(--text-muted) leading-none">AI Health Companion</span>
          </div>
        </Link>

        {/* Navigation Links */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-(--primary-surface) text-(--primary)'
                    : 'text-(--text-secondary) hover:text-(--text-primary) hover:bg-(--surface-subtle)'
                }`}
              >
                <Icon size={15} />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>

        {/* Right Actions: Sync, Language, User */}
        <div className="flex items-center gap-2">
          {/* Offline / Sync Pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border border-(--border-subtle) bg-(--surface-subtle)">
            {isOnline ? (
              <Wifi size={13} className="text-emerald-600" />
            ) : (
              <WifiOff size={13} className="text-amber-600" />
            )}
            <span className={isOnline ? 'text-emerald-700' : 'text-amber-700'}>
              {isOnline ? (pendingCount > 0 ? `${pendingCount} pending` : 'Online') : `Offline (${pendingCount})`}
            </span>
            {pendingCount > 0 && isOnline && (
              <button
                onClick={handleSyncNow}
                disabled={isSyncing}
                className="ml-1 p-0.5 hover:text-(--primary) cursor-pointer"
                title="Sync pending outbox"
              >
                <RefreshCw size={11} className={isSyncing ? 'animate-spin' : ''} />
              </button>
            )}
          </div>

          {/* Language Toggle */}
          <button
            onClick={() => setLocale(locale === 'en' ? 'hi' : 'en')}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border border-(--border-subtle) text-(--text-secondary) hover:text-(--text-primary)"
            title="Toggle English / Hindi"
          >
            <Globe size={13} />
            <span>{locale === 'en' ? 'EN' : 'HI'}</span>
          </button>

          {/* Login / Profile */}
          <Link
            href="/login"
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-(--primary) text-white hover:bg-(--primary-hover) transition-colors"
          >
            {locale === 'hi' ? 'खाता' : 'Account'}
          </Link>
        </div>
      </div>
    </nav>
  );
}
