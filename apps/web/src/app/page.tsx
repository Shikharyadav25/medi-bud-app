import Link from "next/link";
import {
  ArrowUpRight,
  ArrowRight,
  Files,
  MessagesSquare,
  Utensils,
  Activity,
  ShieldCheck,
  HeartPulse,
  Leaf,
  Sparkles,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="home-page">
      <div className="page-eyebrow">
        <span className="status-dot" /> YOUR EVERYDAY HEALTH COMPANION
      </div>
      <section className="welcome-hero">
        <div className="hero-copy">
          <span className="eyebrow">A LITTLE CLARITY GOES A LONG WAY</span>
          <h1>
            Your health.
            <br />A little <em>clearer.</em>
          </h1>
          <p>
            Make sense of your reports, build gentle daily habits, and feel more
            prepared for your next conversation with a doctor.
          </p>
          <div className="hero-actions">
            <Link href="/dashboard" className="primary-button">
              Enter your health space <ArrowRight size={18} />
            </Link>
            <Link href="/reports" className="text-link">
              Explore reports <ArrowUpRight size={17} />
            </Link>
          </div>
          <div className="hero-assurance">
            <ShieldCheck size={17} /> Private by design. Guided by sources.
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="floating-tag tag-top">
            <span className="mint-icon">
              <Files size={21} />
            </span>
            <div>
              <strong>More understanding</strong>
              <small>One report at a time</small>
            </div>
          </div>
          <div className="health-emblem">
            <HeartPulse strokeWidth={1.15} />
            <span>care, with clarity</span>
          </div>
          <div className="floating-tag tag-bottom">
            <span className="peach-icon">
              <Leaf size={22} />
            </span>
            <div>
              <strong>Small steps count</strong>
              <small>Build a routine that feels like you</small>
            </div>
            <Sparkles size={17} />
          </div>
          <div className="art-cross cross-one">+</div>
          <div className="art-cross cross-two">+</div>
        </div>
      </section>
      <section className="section-heading">
        <div>
          <span className="eyebrow">MADE FOR YOUR EVERYDAY</span>
          <h2>A calmer way to care for yourself.</h2>
        </div>
        <span className="subtle-caption">Everything you need, together.</span>
      </section>
      <section className="feature-grid">
        {[
          {
            href: "/reports",
            icon: Files,
            n: "01",
            title: "Your reports, explained",
            text: "Keep your lab reports together. Check extracted values against the original before using them.",
            color: "mint",
          },
          {
            href: "/chat",
            icon: MessagesSquare,
            n: "02",
            title: "A place for your questions",
            text: "Explore health information with visible sources and clear limits on what we know.",
            color: "lilac",
          },
          {
            href: "/plan",
            icon: Utensils,
            n: "03",
            title: "Good food. Simple choices.",
            text: "Discover Indian meal ideas with ingredient filters and transparent nutrition estimates.",
            color: "peach",
          },
        ].map(({ href, icon: Icon, n, title, text, color }) => (
          <Link href={href} key={href} className="feature-card">
            <div className="feature-top">
              <span className={`feature-icon ${color}`}>
                <Icon size={23} />
              </span>
              <span className="feature-number">{n}</span>
            </div>
            <h3>{title}</h3>
            <p>{text}</p>
            <span className="feature-action">
              Take a look <ArrowUpRight size={19} />
            </span>
          </Link>
        ))}
      </section>
      <section className="gentle-banner">
        <span className="mint-icon">
          <Activity size={23} />
        </span>
        <div>
          <h3>Progress begins with paying attention.</h3>
          <p>
            A glass of water, a better night's rest, a question you finally ask.
            Start where you are.
          </p>
        </div>
        <Link href="/dashboard" className="text-link">
          Your daily overview <ArrowRight size={17} />
        </Link>
      </section>
    </div>
  );
}
