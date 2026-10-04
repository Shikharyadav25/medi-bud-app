'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ShieldCheck, LogIn, UserPlus, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert('Account created! Please sign in.');
        setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push('/dashboard');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Authentication failed';
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSignIn = () => {
    // Generate/store demo session token for offline or local preview
    localStorage.setItem('medi_bud_demo_token', 'demo_jwt_token');
    localStorage.setItem('medi_bud_demo_user', '00000000-0000-0000-0000-000000000001');
    router.push('/dashboard');
  };

  return (
    <div className="max-w-md mx-auto py-8">
      <div className="p-6 sm:p-8 rounded-2xl border border-(--border-subtle) bg-(--surface) shadow-sm space-y-6">
        <div className="text-center space-y-1">
          <div className="w-12 h-12 rounded-2xl bg-(--primary-surface) text-(--primary) flex items-center justify-center mx-auto mb-3">
            <ShieldCheck size={28} />
          </div>
          <h2 className="text-xl font-bold text-(--text-primary)">
            {isSignUp ? 'Create Medi Bud Account' : 'Sign in to Medi Bud'}
          </h2>
          <p className="text-xs text-(--text-muted)">
            Secure Supabase Auth with Row-Level Security
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-(--text-secondary) mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full px-3 py-2 text-xs rounded-xl border border-(--border-medium) bg-(--surface) focus:outline-none focus:border-(--primary)"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-(--text-secondary) mb-1">
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 text-xs rounded-xl border border-(--border-medium) bg-(--surface) focus:outline-none focus:border-(--primary)"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl font-medium text-xs bg-(--primary) text-white hover:bg-(--primary-hover) transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isSignUp ? <UserPlus size={14} /> : <LogIn size={14} />}
            <span>{loading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Sign In')}</span>
          </button>
        </form>

        <div className="relative flex items-center justify-center my-4">
          <div className="border-t border-(--border-subtle) w-full"></div>
          <span className="bg-(--surface) px-2 text-[10px] text-(--text-muted) uppercase tracking-wider absolute">
            Or Quick Demo
          </span>
        </div>

        {/* Demo Fast-Track */}
        <button
          onClick={handleDemoSignIn}
          type="button"
          className="w-full py-2 rounded-xl border border-(--primary) text-(--primary) bg-(--primary-surface) hover:bg-emerald-100 transition-colors text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Sparkles size={14} />
          <span>Launch Demonstration Account</span>
        </button>

        <div className="text-center pt-2">
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-xs text-(--text-secondary) hover:text-(--primary) transition-colors cursor-pointer"
          >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
}
