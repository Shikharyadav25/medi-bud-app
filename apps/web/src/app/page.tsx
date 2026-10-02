import Link from 'next/link';
import { 
  FileText, 
  MessageSquare, 
  Activity, 
  Utensils, 
  ShieldAlert, 
  MapPin, 
  ArrowRight, 
  ShieldCheck 
} from 'lucide-react';

export default function HomePage() {
  const features = [
    {
      title: 'Lab Report Verification',
      desc: 'Upload CBC, Lipid, or Glucose reports. Review and confirm extracted values with stated intervals.',
      icon: FileText,
      href: '/reports',
    },
    {
      title: 'Source-Grounded Q&A',
      desc: 'Ask questions about your confirmed tests with direct citations from your reports and approved wellness guides.',
      icon: MessageSquare,
      href: '/chat',
    },
    {
      title: 'Daily Habit Tracking',
      desc: 'Log water intake, sleep, and physical activity with offline sync and a transparent completion counter.',
      icon: Activity,
      href: '/dashboard',
    },
    {
      title: '7-Day Indian Meal Planner',
      desc: 'Deterministic meal plans with declared allergen filters, IFCT macro estimates, and downloadable PDF export.',
      icon: Utensils,
      href: '/plan',
    },
    {
      title: 'Symptom Guidance',
      desc: 'Structured red-flag evaluation questionnaire with immediate access to verified 112 / 108 emergency helplines.',
      icon: ShieldAlert,
      href: '/symptoms',
    },
    {
      title: 'Nearby Care Discovery',
      desc: 'Locate local hospitals, clinics, and pharmacies using OpenStreetMap data with direct navigation links.',
      icon: MapPin,
      href: '/nearby',
    },
  ];

  return (
    <div className="space-y-12 py-4 sm:py-8">
      {/* Hero Section */}
      <section className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-(--primary-surface) text-(--primary) border border-(--primary-light)">
          <ShieldCheck size={14} />
          <span>College Prototype — Information & Habit Companion</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-(--text-primary) tracking-tight">
          Understand your reports and build everyday health habits.
        </h1>
        <p className="text-sm sm:text-base text-(--text-secondary) max-w-2xl mx-auto">
          Medi Bud helps you organize personal health reports, verify extracted observations,
          ask questions with transparent source citations, and plan balanced Indian meals.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm bg-(--primary) text-white hover:bg-(--primary-hover) shadow-sm transition-colors"
          >
            <span>Open Dashboard</span>
            <ArrowRight size={16} />
          </Link>
          <Link
            href="/reports"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm border border-(--border-medium) bg-(--surface) text-(--text-primary) hover:bg-(--surface-subtle) transition-colors"
          >
            <span>Upload Lab Report</span>
          </Link>
        </div>
      </section>

      {/* Feature Cards Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {features.map(({ title, desc, icon: Icon, href }) => (
          <Link
            key={title}
            href={href}
            className="p-5 rounded-2xl border border-(--border-subtle) bg-(--surface) hover:border-(--primary) hover:shadow-sm transition-all text-decoration-none group flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-(--primary-surface) text-(--primary) flex items-center justify-center">
                <Icon size={20} />
              </div>
              <h3 className="font-semibold text-base text-(--text-primary) group-hover:text-(--primary) transition-colors">
                {title}
              </h3>
              <p className="text-xs text-(--text-secondary) leading-relaxed">
                {desc}
              </p>
            </div>
            <div className="pt-4 flex items-center gap-1 text-xs font-medium text-(--primary)">
              <span>Explore</span>
              <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        ))}
      </section>

      {/* Disclaimer Alert */}
      <section className="p-4 rounded-xl border border-(--border-subtle) bg-(--surface-subtle) text-xs text-(--text-secondary) space-y-1">
        <p className="font-semibold text-(--text-primary)">
          Important Academic Prototype Notice:
        </p>
        <p>
          Medi Bud is developed for academic demonstration. It does not provide medical diagnoses, treatment plans,
          or clinical prescriptions. Numerical values and meal plans are estimates based on ICMR-NIN IFCT tables.
          Always consult a licensed medical practitioner for health decisions.
        </p>
      </section>
    </div>
  );
}
