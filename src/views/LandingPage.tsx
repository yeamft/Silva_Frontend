"use client";

import {
  FormEvent,
  ReactNode,
  useEffect,
  useState,
} from "react";
import Link from "next/link";
import {
  AnimatePresence,
  MotionConfig,
  motion,
} from "framer-motion";
import {
  ArrowRight,
  ArrowUp,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Coins,
  FileCheck2,
  History,
  KeyRound,
  Loader2,
  MapPinned,
  Menu,
  Scale,
  ShieldCheck,
  Sprout,
  Users,
  Camera,
  UserCheck,
} from "lucide-react";

import { submitContactInquiry } from "@/lib/api/contact";
import { ApiError } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/cropfort/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const HERO_IMAGES = [
  {
    src: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=1800&q=70",
    alt: "Tractor working cultivated farmland",
  },
  {
    src: "https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&w=1800&q=70",
    alt: "Farm workers inspecting crop rows",
  },
  {
    src: "https://images.unsplash.com/photo-1464226184884-fa280b87c0b0?auto=format&fit=crop&w=1800&q=70",
    alt: "Active crop rows across estate land",
  },
  {
    src: "https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?auto=format&fit=crop&w=1800&q=70",
    alt: "Vegetable rows across productive estate land",
  },
] as const;

const ease = [0.16, 1, 0.3, 1] as const;
const HERO_ROTATE_MS = 7000;

const NAV_LINKS = [
  { id: "platform", label: "Platform" },
  { id: "roles", label: "Who it's for" },
  { id: "how-it-works", label: "How it works" },
  { id: "contact", label: "Contact" },
] as const;

const SECTION_IDS = NAV_LINKS.map((link) => link.id);

function useScrolledPast(threshold: number) {
  const [past, setPast] = useState(false);

  useEffect(() => {
    const update = () => setPast(window.scrollY > threshold);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [threshold]);

  return past;
}

/** Tracks which page section sits in the middle band of the viewport. */
function useActiveSection(ids: readonly string[]) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        setActive(ids.find((id) => visible.has(id)) ?? null);
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );

    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [ids]);

  return active;
}

/**
 * Background photos for the hero. Each is preloaded first and only joins the rotation once it
 * has loaded, so the hero never shows an empty frame.
 */
function useHeroSlides() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [ready, setReady] = useState<boolean[]>(() => HERO_IMAGES.map(() => false));

  useEffect(() => {
    let cancelled = false;
    HERO_IMAGES.forEach((image, index) => {
      const img = new window.Image();
      img.decoding = "async";
      img.onload = () => {
        if (cancelled) return;
        setReady((prev) => {
          if (prev[index]) return prev;
          const next = [...prev];
          next[index] = true;
          return next;
        });
      };
      img.src = image.src;
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready.some(Boolean)) return;
    const timer = window.setTimeout(() => {
      setActiveIndex((current) => {
        for (let step = 1; step <= HERO_IMAGES.length; step += 1) {
          const next = (current + step) % HERO_IMAGES.length;
          if (ready[next]) return next;
        }
        return current;
      });
    }, HERO_ROTATE_MS);
    return () => window.clearTimeout(timer);
  }, [ready, activeIndex]);

  // Until the first photo arrives, show whichever one loaded first
  const shown = ready[activeIndex] ? activeIndex : ready.findIndex(Boolean);
  return { activeIndex: shown, ready };
}

function HeroBackground({ activeIndex, ready }: { activeIndex: number; ready: boolean[] }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-[#0B1F0C]" />
      {HERO_IMAGES.map((image, index) => {
        const visible = ready[index] && index === activeIndex;
        return (
          <div
            key={image.src}
            className={cn(
              "absolute inset-0 bg-cover bg-center bg-no-repeat transition-[opacity,transform] duration-[1400ms] ease-out motion-reduce:transition-none",
              visible ? "scale-100 opacity-100" : "scale-105 opacity-0",
            )}
            style={{ backgroundImage: ready[index] ? `url("${image.src}")` : undefined }}
          />
        );
      })}
    </div>
  );
}

function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-[0_10px_24px_-12px_hsl(120_35%_28%/0.35)]",
        className,
      )}
    >
      <Sprout className="h-5 w-5 text-primary-foreground" />
    </span>
  );
}

function SiteHeader() {
  const scrolled = useScrolledPast(24);
  const active = useActiveSection(SECTION_IDS);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b pt-[env(safe-area-inset-top)] transition-[background-color,border-color,box-shadow] duration-300",
        scrolled
          ? "border-white/10 bg-[#0B1F0C]/90 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.6)] backdrop-blur-md"
          : "border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-4 px-5 sm:px-8 lg:px-10">
        <Link href="/" className="flex items-center gap-3 text-white" aria-label="Cropfort home">
          <BrandMark />
          <span className="font-display text-lg font-semibold tracking-tight">Cropfort</span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => {
            const isActive = active === link.id;
            return (
              <a
                key={link.id}
                href={`#${link.id}`}
                aria-current={isActive ? "location" : undefined}
                className={cn(
                  "relative inline-flex h-10 items-center rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B7D4B9]",
                  isActive ? "text-white" : "text-white/70 hover:text-white",
                )}
              >
                {link.label}
                {isActive ? (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-x-3 bottom-1 h-0.5 rounded-full bg-[#B7D4B9]"
                    transition={{ duration: 0.3, ease }}
                  />
                ) : null}
              </a>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Button
            asChild
            className="h-10 rounded-xl bg-primary px-4 font-semibold text-primary-foreground shadow-[0_10px_24px_-12px_hsl(120_35%_28%/0.35)] hover:bg-[hsl(var(--primary-hover))] sm:px-5"
          >
            <Link href="/login">
              Sign in
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>

          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label="Open menu"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B7D4B9] md:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="cf-gold-marketing w-[86vw] max-w-sm bg-background">
              <SheetTitle className="flex items-center gap-3">
                <BrandMark className="h-9 w-9" />
                <span className="font-display text-lg">Cropfort</span>
              </SheetTitle>

              <nav aria-label="Mobile" className="mt-8 flex flex-col gap-1">
                {NAV_LINKS.map((link) => (
                  <a
                    key={link.id}
                    href={`#${link.id}`}
                    onClick={() => setMenuOpen(false)}
                    aria-current={active === link.id ? "location" : undefined}
                    className={cn(
                      "flex h-12 items-center justify-between rounded-xl px-4 text-base font-medium transition-colors",
                      active === link.id
                        ? "bg-secondary text-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {link.label}
                    <ChevronRight className="h-4 w-4 opacity-60" />
                  </a>
                ))}
              </nav>

              <Button asChild size="lg" className="mt-8 h-12 w-full rounded-xl font-semibold">
                <Link href="/login" onClick={() => setMenuOpen(false)}>
                  Sign in to Cropfort
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  const { activeIndex, ready } = useHeroSlides();

  return (
    <section className="relative isolate flex min-h-[100dvh] w-full flex-col bg-[#0B1F0C]">
      <div className="absolute inset-0 overflow-hidden" aria-hidden>
        <HeroBackground activeIndex={activeIndex} ready={ready} />
        <div className="absolute inset-0 z-[1] bg-gradient-to-r from-[#061408]/90 via-[#0B1F0C]/70 to-[#0B1F0C]/40" />
        <div className="absolute inset-0 z-[1] bg-gradient-to-t from-[#061408]/70 via-transparent to-[#061408]/30" />
      </div>

      <div className="relative z-20 mx-auto flex w-full max-w-7xl flex-1 items-center px-5 pb-24 pt-[calc(112px+env(safe-area-inset-top))] sm:px-8 lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease }}
          className="w-full max-w-3xl"
        >
          <h1 className="font-display text-4xl font-semibold leading-[1.06] tracking-[-0.03em] text-white sm:text-5xl lg:text-[64px]">
            Plan, deliver and <span className="text-[#B7D4B9]">verify</span> every hectare of estate work.
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-7 text-white/75 sm:text-lg sm:leading-8">
            Cropfort connects estate owners, program managers and field vendors in one workflow, from the annual
            plan and approved rates to work orders, field evidence and settlement.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              asChild
              size="lg"
              className="h-12 rounded-xl bg-primary px-6 text-base font-semibold text-primary-foreground shadow-[0_14px_30px_-14px_hsl(120_35%_28%/0.6)] hover:bg-[hsl(var(--primary-hover))]"
            >
              <Link href="/login">
                Sign in to Cropfort
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 rounded-xl border-white/25 bg-white/5 px-6 text-base font-semibold text-white backdrop-blur-sm hover:bg-white/10 hover:text-white"
            >
              <a href="#how-it-works">See how it works</a>
            </Button>
          </div>

          <dl className="mt-14 grid gap-5 border-t border-white/10 pt-6 sm:grid-cols-3 sm:gap-8">
            {[
              { term: "Approvals", detail: "Maker-checker on plans, rates and spend", icon: ShieldCheck },
              { term: "Evidence", detail: "Field records before payment", icon: Camera },
              { term: "Audit", detail: "Every decision traceable", icon: History },
            ].map((item) => (
              <div key={item.term} className="flex gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-[#B7D4B9]">
                  <item.icon className="h-4 w-4" aria-hidden />
                </span>
                <div>
                  <dt className="text-sm font-semibold text-white">{item.term}</dt>
                  <dd className="mt-0.5 text-sm leading-5 text-white/60">{item.detail}</dd>
                </div>
              </div>
            ))}
          </dl>
        </motion.div>
      </div>

      <a
        href="#platform"
        aria-label="Scroll to platform overview"
        className="absolute bottom-6 left-1/2 z-20 hidden -translate-x-1/2 flex-col items-center gap-2 text-xs font-medium text-white/60 transition-colors hover:text-white sm:flex"
      >
        Explore
        <span className="flex h-9 w-6 justify-center rounded-full border border-white/30 pt-1.5">
          <span className="h-2 w-1 animate-bounce rounded-full bg-white/70 motion-reduce:animate-none" />
        </span>
      </a>
    </section>
  );
}

const ROLES = [
  {
    label: "Silva",
    title: "Estate owners",
    icon: ShieldCheck,
    copy: "Maintain executive oversight of plans, budgets, verified delivery, liabilities, and estate performance.",
    points: ["Approve programs", "Review financial exposure", "Track verified outcomes"],
  },
  {
    label: "SPX",
    title: "Program managers",
    icon: ClipboardCheck,
    copy: "Coordinate planning, rate governance, work orders, validation, commercial controls, and reporting.",
    points: ["Issue work orders", "Validate execution", "Control rates and approvals"],
  },
  {
    label: "Vendors",
    title: "Field delivery teams",
    icon: Users,
    copy: "Receive assigned work, record field execution, submit evidence, and prepare work for validation.",
    points: ["Receive assignments", "Capture field activity", "Submit completed work"],
  },
] as const;

type RoleLabel = (typeof ROLES)[number]["label"];

const STEPS: ReadonlyArray<{
  number: string;
  title: string;
  description: string;
  output: string;
  owners: readonly RoleLabel[];
  icon: typeof MapPinned;
}> = [
  {
    number: "01",
    title: "Plan",
    description: "Build the annual field program and define estate activities.",
    output: "Annual field program",
    owners: ["SPX"],
    icon: MapPinned,
  },
  {
    number: "02",
    title: "Approve",
    description: "Review budget, scope, rates, and operational requirements.",
    output: "Approved budget, scope and rates",
    owners: ["Silva"],
    icon: FileCheck2,
  },
  {
    number: "03",
    title: "Issue",
    description: "Convert approved activities into accountable work orders.",
    output: "Assigned work orders",
    owners: ["SPX"],
    icon: ClipboardCheck,
  },
  {
    number: "04",
    title: "Execute",
    description: "Field teams record completed work and supporting evidence.",
    output: "Field records and evidence",
    owners: ["Vendors"],
    icon: Sprout,
  },
  {
    number: "05",
    title: "Validate",
    description: "Supervisors verify quantities, rates, and completed delivery.",
    output: "Verified quantities and delivery",
    owners: ["SPX"],
    icon: CheckCircle2,
  },
  {
    number: "06",
    title: "Settle",
    description: "Approved work moves into commercial settlement and reporting.",
    output: "Settlement and reporting",
    owners: ["SPX", "Silva"],
    icon: Coins,
  },
];

const CONTROLS = [
  {
    title: "Role-based access",
    copy: "Each organisation sees and acts only within its responsibilities.",
    icon: KeyRound,
  },
  {
    title: "Maker-checker approvals",
    copy: "Key changes need a second person to approve them.",
    icon: UserCheck,
  },
  {
    title: "Rate governance",
    copy: "Approved rate cards drive every commercial calculation.",
    icon: Scale,
  },
  {
    title: "Field evidence",
    copy: "Completed work is backed by records captured on the ground.",
    icon: Camera,
  },
  {
    title: "Work order control",
    copy: "Only approved activities become work orders.",
    icon: ClipboardCheck,
  },
  {
    title: "Audit history",
    copy: "Every decision stays traceable after the fact.",
    icon: History,
  },
] as const;

function SectionHeading({
  title,
  children,
  className,
}: {
  title: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, ease }}
      className={className}
    >
      <h2 className="max-w-xl font-display text-3xl font-semibold tracking-tight sm:text-4xl">
        {title}
      </h2>
      {children}
    </motion.div>
  );
}

function PlatformSection() {
  return (
    <section
      id="platform"
      className="scroll-mt-[72px] border-b border-border bg-background py-20 sm:py-28"
    >
      <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:px-10">
        <SectionHeading
          title={
            <>
              One source of truth for <span className="text-primary">estate execution</span>.
            </>
          }
        />

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease, delay: 0.1 }}
          className="max-w-2xl lg:pt-8"
        >
          <p className="text-base leading-8 text-muted-foreground sm:text-lg">
            Cropfort connects operational planning with what actually happens on the farm.
            Approved activities become controlled work orders, field delivery becomes measurable
            execution, and verified work creates the basis for accountable financial settlement.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {[
              { icon: MapPinned, label: "Plan", copy: "Programs and budgets" },
              { icon: Sprout, label: "Execute", copy: "Work orders and evidence" },
              { icon: Coins, label: "Settle", copy: "Verified, payable work" },
            ].map(({ icon: Icon, label, copy }) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-4"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{label}</p>
                  <p className="text-xs text-muted-foreground">{copy}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function RolesSection() {
  return (
    <section id="roles" className="scroll-mt-[72px] bg-muted/25 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <SectionHeading
          title={
            <>
              Clear responsibilities for <span className="text-primary">every participant</span>.
            </>
          }
        >
          <p className="mt-4 max-w-2xl leading-7 text-muted-foreground">
            Each organisation works within its own role while sharing the same controlled operating
            record.
          </p>
        </SectionHeading>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {ROLES.map((role, index) => {
            const Icon = role.icon;
            const steps = STEPS.filter((step) => step.owners.includes(role.label));
            return (
              <motion.article
                key={role.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, ease, delay: index * 0.08 }}
                className="flex flex-col rounded-2xl border border-border bg-card p-7"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <Icon className="h-5 w-5" />
                </span>
                <p className="mt-6 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {role.label}
                </p>
                <h3 className="mt-1 font-display text-xl font-semibold tracking-tight">{role.title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{role.copy}</p>
                <ul className="mt-6 space-y-2.5 text-sm">
                  {role.points.map((point) => (
                    <li key={point} className="flex items-start gap-2.5">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      {point}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto flex flex-wrap gap-1.5 border-t border-border pt-5">
                  {steps.map((step) => (
                    <span
                      key={step.title}
                      className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium"
                    >
                      <span className="font-mono text-muted-foreground">{step.number}</span>
                      {step.title}
                    </span>
                  ))}
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function WorkflowSection() {
  return (
    <section id="how-it-works" className="scroll-mt-[72px] border-y border-border bg-background py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <SectionHeading
          title={
            <>
              From approved plan to <span className="text-primary">verified settlement</span>.
            </>
          }
        >
          <p className="mt-4 max-w-2xl leading-7 text-muted-foreground">
            Six controlled steps keep operational and financial accountability connected throughout
            the season.
          </p>
        </SectionHeading>

        <ol className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.li
                key={step.title}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, ease, delay: index * 0.05 }}
                className="flex flex-col bg-card p-7"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-medium text-muted-foreground">{step.number}</span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                </div>
                <h3 className="mt-6 font-display text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.description}</p>
                <dl className="mt-auto grid grid-cols-2 gap-3 pt-6 text-xs">
                  <div>
                    <dt className="font-semibold uppercase tracking-[0.12em] text-muted-foreground">Led by</dt>
                    <dd className="mt-1 font-medium text-foreground">{step.owners.join(" · ")}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold uppercase tracking-[0.12em] text-muted-foreground">Produces</dt>
                    <dd className="mt-1 font-medium text-foreground">{step.output}</dd>
                  </div>
                </dl>
              </motion.li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

function ControlsSection() {
  return (
    <section className="bg-[#E7EFE8] py-20 text-foreground sm:py-28">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:px-10">
        <SectionHeading
          title={
            <>
              Field execution you can <span className="text-primary">verify before you pay</span>.
            </>
          }
        >
          <p className="mt-5 max-w-xl leading-7 text-muted-foreground">
            Cropfort separates work assignment, execution, verification, and approval so
            operational evidence is reviewed before it becomes a commercial obligation.
          </p>
        </SectionHeading>

        <div className="grid gap-3 sm:grid-cols-2">
          {CONTROLS.map(({ title, copy, icon: Icon }, index) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, ease, delay: index * 0.05 }}
              className="group flex items-start gap-3 rounded-xl border border-[#C5D6C8] bg-white/70 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-white hover:shadow-[0_12px_28px_-20px_hsl(114_45%_22%/0.5)]"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <Icon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold">{title}</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{copy}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

type ContactFormState = {
  name: string;
  email: string;
  organization: string;
  message: string;
  website: string;
};

type ContactErrors = Partial<Record<keyof ContactFormState, string>>;

const EMPTY_CONTACT: ContactFormState = {
  name: "",
  email: "",
  organization: "",
  message: "",
  website: "",
};

const MESSAGE_MIN = 10;

function validateContact(values: ContactFormState) {
  const next: ContactErrors = {};
  if (!values.name.trim()) next.name = "Name is required.";
  if (!values.email.trim()) next.email = "Email is required.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    next.email = "Enter a valid email.";
  }
  if (values.message.trim().length < MESSAGE_MIN) {
    next.message = `Message should be at least ${MESSAGE_MIN} characters.`;
  }
  return next;
}

function ContactForm() {
  const [form, setForm] = useState<ContactFormState>(EMPTY_CONTACT);
  const [errors, setErrors] = useState<ContactErrors>({});
  const [touched, setTouched] = useState<Partial<Record<keyof ContactFormState, boolean>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("");

  // Re-validate a field as the user types, but only once they've left it once
  function update(field: keyof ContactFormState, value: string) {
    const next = { ...form, [field]: value };
    setForm(next);
    if (touched[field]) {
      setErrors((prev) => ({ ...prev, [field]: validateContact(next)[field] }));
    }
  }

  function blur(field: keyof ContactFormState) {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setErrors((prev) => ({ ...prev, [field]: validateContact(form)[field] }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateContact(form);
    setErrors(nextErrors);
    setTouched({ name: true, email: true, message: true });
    if (Object.keys(nextErrors).length) {
      const firstInvalid = event.currentTarget.querySelector<HTMLElement>("[aria-invalid='true']");
      firstInvalid?.focus();
      return;
    }

    setSubmitting(true);
    setStatus("idle");
    setStatusMessage("");

    try {
      await submitContactInquiry({
        name: form.name.trim(),
        email: form.email.trim(),
        organization: form.organization.trim() || undefined,
        message: form.message.trim(),
        website: form.website,
      });
      setForm(EMPTY_CONTACT);
      setErrors({});
      setTouched({});
      setStatus("success");
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Something went wrong. Please try again in a moment.";
      setStatus("error");
      setStatusMessage(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (status === "success") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease }}
        role="status"
        className="flex flex-col items-start rounded-2xl border border-primary/25 bg-card p-8"
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-primary">
          <CheckCircle2 className="h-6 w-6" />
        </span>
        <h3 className="mt-5 font-display text-xl font-semibold">Message sent</h3>
        <p className="mt-2 max-w-md leading-7 text-muted-foreground">
          Thanks, we received your message. The SPX team will get back to you soon.
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-6 rounded-full"
          onClick={() => setStatus("idle")}
        >
          Send another message
        </Button>
      </motion.div>
    );
  }

  const messageLength = form.message.trim().length;

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-5 rounded-2xl border border-border bg-card p-6 sm:p-8"
      noValidate
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          label="Name"
          required
          error={errors.name}
          render={(props) => (
            <Input
              {...props}
              name="name"
              autoComplete="name"
              placeholder="Your full name"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              onBlur={() => blur("name")}
              disabled={submitting}
            />
          )}
        />
        <FormField
          label="Email"
          required
          error={errors.email}
          render={(props) => (
            <Input
              {...props}
              type="email"
              name="email"
              autoComplete="email"
              placeholder="you@organisation.com"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              onBlur={() => blur("email")}
              disabled={submitting}
            />
          )}
        />
      </div>

      <FormField
        label="Organization"
        optional
        error={errors.organization}
        render={(props) => (
          <Input
            {...props}
            name="organization"
            autoComplete="organization"
            placeholder="Estate, company or vendor"
            value={form.organization}
            onChange={(e) => update("organization", e.target.value)}
            disabled={submitting}
          />
        )}
      />

      <FormField
        label="Message"
        required
        error={errors.message}
        helper="Tell us whether you're after a demo, a partnership, or help with onboarding."
        render={(props) => (
          <div className="relative">
            <Textarea
              {...props}
              name="message"
              rows={5}
              placeholder="How can we help?"
              value={form.message}
              onChange={(e) => update("message", e.target.value)}
              onBlur={() => blur("message")}
              disabled={submitting}
              className="min-h-[140px] resize-y pb-7"
            />
            <span
              className={cn(
                "pointer-events-none absolute bottom-2 right-3 text-xs tabular-nums",
                messageLength >= MESSAGE_MIN ? "text-primary" : "text-muted-foreground",
              )}
              aria-hidden
            >
              {messageLength >= MESSAGE_MIN ? (
                <CheckCircle2 className="inline h-3.5 w-3.5" />
              ) : (
                `${messageLength}/${MESSAGE_MIN}`
              )}
            </span>
          </div>
        )}
      />

      <div className="absolute -left-[9999px] top-auto h-0 w-0 overflow-hidden" aria-hidden>
        <label htmlFor="contact-website">Website</label>
        <input
          id="contact-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={form.website}
          onChange={(e) => setForm((prev) => ({ ...prev, website: e.target.value }))}
        />
      </div>

      {status === "error" ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          {statusMessage}
        </p>
      ) : null}

      <div>
        <Button type="submit" size="lg" className="h-12 rounded-full px-8" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending…
            </>
          ) : (
            <>
              Send message
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

function ContactSection() {
  return (
    <section
      id="contact"
      className="scroll-mt-[72px] border-t border-border bg-background py-20 sm:py-28"
    >
      <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start lg:px-10">
        <SectionHeading
          title={
            <>
              Talk to us about <span className="text-primary">Cropfort</span>.
            </>
          }
        >
          <p className="mt-5 max-w-md leading-7 text-muted-foreground">
            For partnerships, demos, or onboarding questions, send a message and the SPX team will
            follow up.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-muted-foreground">
            {["Product walkthroughs for estate teams", "Onboarding for new vendors", "Partnership enquiries"].map(
              (item) => (
                <li key={item} className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                  {item}
                </li>
              ),
            )}
          </ul>
          <p className="mt-8 text-sm text-muted-foreground">
            Already have access?{" "}
            <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
              Sign in
            </Link>
          </p>
        </SectionHeading>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease, delay: 0.08 }}
          className="relative"
        >
          <ContactForm />
        </motion.div>
      </div>
    </section>
  );
}

function BackToTop() {
  const visible = useScrolledPast(900);

  return (
    <AnimatePresence>
      {visible ? (
        <motion.button
          type="button"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.2 }}
          onClick={() => window.scrollTo({ top: 0 })}
          aria-label="Back to top"
          className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-5 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_12px_28px_-10px_rgba(0,0,0,0.45)] transition hover:bg-[hsl(var(--primary-hover))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <ArrowUp className="h-5 w-5" />
        </motion.button>
      ) : null}
    </AnimatePresence>
  );
}

export default function LandingPage() {
  return (
    <MotionConfig reducedMotion="user">
      <main className="cf-gold-marketing min-h-screen bg-background text-foreground">
        <SiteHeader />
        <Hero />
        <PlatformSection />
        <RolesSection />
        <WorkflowSection />
        <ControlsSection />
        <ContactSection />

        <footer className="bg-[#0B1F0C] text-white/70">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:px-8 md:grid-cols-[1.5fr_1fr_1fr] lg:px-10">
            <div>
              <div className="flex items-center gap-3 text-white">
                <BrandMark className="h-9 w-9" />
                <span className="font-display text-lg font-semibold">Cropfort</span>
              </div>
              <p className="mt-4 max-w-sm text-sm leading-6">
                The farm operations platform for estate owners, programme managers and delivery
                partners. Powered by SPX.
              </p>
            </div>
            <nav aria-label="Footer · platform" className="text-sm">
              <p className="font-semibold text-white">Platform</p>
              <ul className="mt-4 space-y-2.5">
                {NAV_LINKS.filter((link) => link.id !== "contact").map((link) => (
                  <li key={link.id}>
                    <a href={`#${link.id}`} className="transition hover:text-white">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
            <nav aria-label="Footer · access" className="text-sm">
              <p className="font-semibold text-white">Access</p>
              <ul className="mt-4 space-y-2.5">
                <li>
                  <Link href="/login" className="transition hover:text-white">
                    Sign in
                  </Link>
                </li>
                <li>
                  <a href="#contact" className="transition hover:text-white">
                    Request access
                  </a>
                </li>
                <li>
                  <a href="mailto:noreply@cropfort.com" className="transition hover:text-white">
                    Support
                  </a>
                </li>
              </ul>
            </nav>
          </div>
          <div className="border-t border-white/10">
            <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-5 text-xs sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
              <p>© {new Date().getFullYear()} Cropfort. All rights reserved.</p>
              <p>Built for Silva, SPX and delivery partners.</p>
            </div>
          </div>
        </footer>

        <BackToTop />
      </main>
    </MotionConfig>
  );
}
