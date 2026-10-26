"use client";

import {
  FormEvent,
  KeyboardEvent,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useInView,
  useReducedMotion,
} from "framer-motion";
import {
  ArrowRight,
  ArrowUp,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Coins,
  FileCheck2,
  History,
  KeyRound,
  Loader2,
  MapPinned,
  Menu,
  Pause,
  Play,
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
    src: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=1600&q=65",
    alt: "Tractor working cultivated farmland",
  },
  {
    src: "https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&w=1600&q=65",
    alt: "Farm workers inspecting crop rows",
  },
  {
    src: "https://images.unsplash.com/photo-1464226184884-fa280b87c0b0?auto=format&fit=crop&w=1600&q=65",
    alt: "Active crop rows across estate land",
  },
  {
    src: "https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?auto=format&fit=crop&w=1600&q=65",
    alt: "Vegetable rows across productive estate land",
  },
] as const;

const ease = [0.16, 1, 0.3, 1] as const;
const HERO_ROTATE_MS = 8000;
const STEP_ROTATE_MS = 4500;

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

function useHeroSlides() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [ready, setReady] = useState<boolean[]>(() => HERO_IMAGES.map(() => false));

  useEffect(() => {
    let cancelled = false;
    const markReady = (index: number, ok: boolean) => {
      if (cancelled || !ok) return;
      setReady((prev) => {
        if (prev[index]) return prev;
        const next = [...prev];
        next[index] = true;
        return next;
      });
    };

    const load = (index: number) =>
      new Promise<void>((resolve) => {
        const img = new window.Image();
        img.decoding = "async";
        img.onload = () => {
          markReady(index, true);
          resolve();
        };
        img.onerror = () => {
          // Keep this slide out of rotation — never show an empty frame
          markReady(index, false);
          resolve();
        };
        img.src = HERO_IMAGES[index].src;
      });

    const preload = document.createElement("link");
    preload.rel = "preload";
    preload.as = "image";
    preload.href = HERO_IMAGES[0].src;
    document.head.appendChild(preload);

    void (async () => {
      await load(0);
      for (let i = 1; i < HERO_IMAGES.length; i += 1) {
        if (cancelled) return;
        await load(i);
      }
    })();

    return () => {
      cancelled = true;
      preload.remove();
    };
  }, []);

  // Restarts on every change so a manual pick gets a full interval before rotating on
  useEffect(() => {
    if (!ready[0]) return;

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

  const goTo = useCallback(
    (index: number) => {
      if (ready[index]) setActiveIndex(index);
    },
    [ready],
  );

  return { activeIndex, ready, goTo };
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
              "absolute inset-0 bg-cover bg-center bg-no-repeat transition-[opacity,transform] duration-[1200ms] ease-out motion-reduce:transition-none",
              visible ? "scale-100" : "scale-105",
            )}
            style={{
              opacity: visible ? 1 : 0,
              backgroundImage: ready[index] ? `url("${image.src}")` : undefined,
            }}
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
  const { activeIndex, ready, goTo } = useHeroSlides();

  return (
    <section className="relative isolate flex h-[100dvh] min-h-[560px] w-full flex-col bg-[#0B1F0C] shadow-[0_28px_64px_-12px_rgba(6,20,8,0.45),0_12px_28px_-8px_rgba(0,0,0,0.28)]">
      <div className="absolute inset-0 overflow-hidden" aria-hidden>
        <HeroBackground activeIndex={activeIndex} ready={ready} />

        {/* Soft green wash — keep photo readable */}
        <div className="absolute inset-0 z-[1] bg-[#061408]/28" />
        <div className="absolute inset-0 z-[1] bg-gradient-to-r from-[#061408]/55 via-[#0B1F0C]/20 to-transparent" />
        <div className="absolute inset-0 z-[1] bg-gradient-to-t from-[#061408]/50 via-transparent to-[#061408]/25" />
      </div>

      <div className="relative z-20 mx-auto flex w-full max-w-7xl flex-1 items-center px-5 pb-20 pt-[calc(72px+env(safe-area-inset-top))] sm:px-8 lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease }}
          className="max-w-3xl"
        >
          <h1 className="max-w-3xl font-display text-3xl font-semibold leading-[1.1] tracking-[-0.03em] text-white [text-shadow:0_2px_10px_rgba(0,0,0,0.55)] sm:text-4xl lg:text-[52px]">
            Control field operations
            <span className="mt-2 block text-[#B7D4B9]">from plan to payment.</span>
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-7 text-white/90 [text-shadow:0_1px_6px_rgba(0,0,0,0.65)] sm:text-lg sm:leading-8">
            One controlled environment where estate owners, SPX managers, and delivery partners
            handle planning, execution, verification, and settlement.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="group h-12 rounded-xl bg-primary px-7 font-semibold text-primary-foreground shadow-[0_8px_24px_-8px_rgba(0,0,0,0.55)] hover:bg-[hsl(var(--primary-hover))]"
            >
              <Link href="/login">
                Open Cropfort
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>

            <a
              href="#how-it-works"
              className="inline-flex h-12 items-center justify-center rounded-xl border border-[#B7D4B9]/45 bg-black/25 px-7 text-sm font-medium text-white [text-shadow:0_1px_5px_rgba(0,0,0,0.55)] shadow-[0_6px_18px_-8px_rgba(0,0,0,0.55)] backdrop-blur-sm transition hover:border-[#B7D4B9]/70 hover:bg-black/35"
            >
              See how it works
            </a>
          </div>

          <p className="mt-6 text-sm text-white/75 [text-shadow:0_1px_5px_rgba(0,0,0,0.65)]">
            Invited organisations sign in with their Cropfort account.{" "}
            <a href="#contact" className="text-[#B7D4B9] underline-offset-2 hover:underline">
              Request access
            </a>
            .
          </p>
        </motion.div>
      </div>

      <div className="relative z-20 mx-auto flex w-full max-w-7xl items-center justify-between px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:px-8 lg:px-10">
        <div className="flex items-center gap-2" role="group" aria-label="Background images">
          {HERO_IMAGES.map((image, index) => (
            <button
              key={image.src}
              type="button"
              onClick={() => goTo(index)}
              disabled={!ready[index]}
              aria-label={`Show image ${index + 1}: ${image.alt}`}
              aria-pressed={index === activeIndex}
              className="group flex h-6 items-center disabled:cursor-default"
            >
              <span
                className={cn(
                  "block h-1.5 rounded-full transition-all duration-300",
                  index === activeIndex
                    ? "w-8 bg-white"
                    : "w-4 bg-white/40 group-hover:bg-white/70 group-disabled:bg-white/20",
                )}
              />
            </button>
          ))}
        </div>

        <a
          href="#platform"
          className="group inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-white/70 transition hover:text-white"
        >
          Scroll
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/25 transition group-hover:border-white/50">
            <ChevronDown className="h-4 w-4 animate-bounce motion-reduce:animate-none" />
          </span>
        </a>
      </div>
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
  eyebrow,
  title,
  children,
  className,
}: {
  eyebrow: string;
  title: string;
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
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{eyebrow}</p>
      <h2 className="mt-3 max-w-xl font-display text-3xl font-semibold tracking-tight sm:text-4xl">
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
        <SectionHeading eyebrow="Platform" title="One source of truth for estate execution." />

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
  const [activeRole, setActiveRole] = useState(0);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const role = ROLES[activeRole];
  const RoleIcon = role.icon;
  const roleSteps = STEPS.filter((step) => step.owners.includes(role.label));

  function onTabKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const keys: Record<string, number> = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
    let next: number | null = null;
    if (event.key in keys) next = (activeRole + keys[event.key] + ROLES.length) % ROLES.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = ROLES.length - 1;
    if (next === null) return;
    event.preventDefault();
    setActiveRole(next);
    tabRefs.current[next]?.focus();
  }

  return (
    <section id="roles" className="scroll-mt-[72px] bg-muted/25 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <SectionHeading eyebrow="Who it's for" title="Clear access for every participant.">
          <p className="mt-4 max-w-2xl leading-7 text-muted-foreground">
            Each organisation works within its responsibilities while sharing the same controlled
            operating record. Pick a role to see where it fits.
          </p>
        </SectionHeading>

        <div className="mt-12 grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
          <div role="tablist" aria-label="Participants" aria-orientation="vertical" className="grid gap-3">
            {ROLES.map((item, index) => {
              const Icon = item.icon;
              const selected = index === activeRole;
              return (
                <button
                  key={item.label}
                  ref={(el) => {
                    tabRefs.current[index] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`role-tab-${index}`}
                  aria-selected={selected}
                  aria-controls="role-panel"
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setActiveRole(index)}
                  onKeyDown={onTabKeyDown}
                  className={cn(
                    "group flex w-full items-center gap-4 rounded-2xl border p-5 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    selected
                      ? "border-primary/40 bg-card shadow-[0_14px_32px_-20px_hsl(114_45%_22%/0.45)]"
                      : "border-border bg-card/60 hover:border-primary/25 hover:bg-card",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-colors",
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-primary/20 bg-accent text-primary",
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {item.label}
                    </span>
                    <span className="mt-0.5 block font-display text-lg font-semibold tracking-tight">
                      {item.title}
                    </span>
                  </span>
                  <ChevronRight
                    className={cn(
                      "h-5 w-5 shrink-0 transition-all",
                      selected
                        ? "translate-x-0 text-primary"
                        : "-translate-x-1 text-muted-foreground/50 group-hover:translate-x-0",
                    )}
                  />
                </button>
              );
            })}
          </div>

          <div
            id="role-panel"
            role="tabpanel"
            aria-labelledby={`role-tab-${activeRole}`}
            className="relative overflow-hidden rounded-2xl border border-border bg-card p-7 sm:p-9"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={role.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease }}
              >
                <div className="flex items-center gap-3">
                  <RoleIcon className="h-5 w-5 text-primary" />
                  <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
                    {role.label}
                  </span>
                </div>

                <h3 className="mt-6 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                  {role.title}
                </h3>
                <p className="mt-4 max-w-xl leading-7 text-muted-foreground">{role.copy}</p>

                <ul className="mt-7 grid gap-3 sm:grid-cols-3">
                  {role.points.map((point) => (
                    <li
                      key={point}
                      className="flex items-start gap-2.5 rounded-xl bg-muted/50 p-3.5 text-sm"
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      {point}
                    </li>
                  ))}
                </ul>

                <div className="mt-7 border-t border-border pt-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Leads these workflow steps
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {roleSteps.map((step) => (
                      <a
                        key={step.title}
                        href="#how-it-works"
                        className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm transition hover:border-primary/40 hover:bg-accent"
                      >
                        <span className="font-mono text-xs text-muted-foreground">{step.number}</span>
                        {step.title}
                      </a>
                    ))}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}

function WorkflowSection() {
  const [activeStep, setActiveStep] = useState(0);
  const [autoplay, setAutoplay] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const inView = useInView(containerRef, { amount: 0.35 });
  const reduceMotion = useReducedMotion();
  const playing = autoplay && inView && !reduceMotion;
  const step = STEPS[activeStep];
  const StepIcon = step.icon;

  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(
      () => setActiveStep((current) => (current + 1) % STEPS.length),
      STEP_ROTATE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [playing, activeStep]);

  // Any manual choice stops the tour so the content doesn't move under the reader
  function selectStep(index: number) {
    setAutoplay(false);
    setActiveStep((index + STEPS.length) % STEPS.length);
  }

  return (
    <section
      id="how-it-works"
      className="scroll-mt-[72px] border-y border-border bg-background py-20 sm:py-28"
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr]">
          <SectionHeading eyebrow="How it works" title="From approved plan to verified settlement.">
            <p className="mt-5 max-w-md leading-7 text-muted-foreground">
              A controlled workflow keeps operational and financial accountability connected
              throughout the season. Select a step to see who leads it and what it produces.
            </p>

            {!reduceMotion ? (
              <button
                type="button"
                onClick={() => setAutoplay((value) => !value)}
                className="mt-6 inline-flex h-9 items-center gap-2 rounded-full border border-border px-4 text-sm font-medium text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
              >
                {autoplay ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                {autoplay ? "Pause walkthrough" : "Play walkthrough"}
              </button>
            ) : null}
          </SectionHeading>

          <div ref={containerRef}>
            <ol className="grid grid-cols-3 gap-2 sm:gap-3" aria-label="Workflow steps">
              {STEPS.map((item, index) => {
                const Icon = item.icon;
                const selected = index === activeStep;
                const done = index < activeStep;
                return (
                  <li key={item.title}>
                    <button
                      type="button"
                      onClick={() => selectStep(index)}
                      aria-current={selected ? "step" : undefined}
                      className={cn(
                        "relative flex w-full flex-col items-start overflow-hidden rounded-xl border p-3 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:p-5",
                        selected
                          ? "border-primary/40 bg-card shadow-[0_14px_32px_-22px_hsl(114_45%_22%/0.5)]"
                          : "border-border bg-card/60 hover:border-primary/25 hover:bg-card",
                      )}
                    >
                      <div className="flex w-full items-center justify-between">
                        <span className="font-mono text-xs text-muted-foreground">{item.number}</span>
                        <span
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-lg transition-colors sm:h-9 sm:w-9",
                            selected
                              ? "bg-primary text-primary-foreground"
                              : done
                                ? "bg-secondary text-primary"
                                : "bg-accent text-primary",
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                      </div>
                      <span className="mt-4 font-display text-base font-semibold sm:mt-6 sm:text-lg">
                        {item.title}
                      </span>

                      {selected && playing ? (
                        <motion.span
                          key={`progress-${activeStep}`}
                          className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-primary"
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: 1 }}
                          transition={{ duration: STEP_ROTATE_MS / 1000, ease: "linear" }}
                        />
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ol>

            <div
              className="mt-4 rounded-2xl border border-border bg-muted/30 p-6 sm:p-7"
              aria-live={playing ? "off" : "polite"}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.25, ease }}
                  className="flex flex-col gap-5 sm:flex-row sm:items-start"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                    <StepIcon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-muted-foreground">
                      Step {activeStep + 1} of {STEPS.length}
                    </p>
                    <h3 className="mt-1 font-display text-xl font-semibold">{step.title}</h3>
                    <p className="mt-2 leading-7 text-muted-foreground">{step.description}</p>

                    <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                          Led by
                        </dt>
                        <dd className="mt-1.5 flex flex-wrap gap-1.5">
                          {step.owners.map((owner) => (
                            <span
                              key={owner}
                              className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold"
                            >
                              {owner}
                            </span>
                          ))}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                          Produces
                        </dt>
                        <dd className="mt-1.5 font-medium">{step.output}</dd>
                      </div>
                    </dl>
                  </div>
                </motion.div>
              </AnimatePresence>

              <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => selectStep(activeStep - 1)}
                  className="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => selectStep(activeStep + 1)}
                  className="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-sm font-medium text-primary transition hover:bg-accent"
                >
                  {activeStep === STEPS.length - 1 ? "Start over" : "Next step"}
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ControlsSection() {
  return (
    <section className="bg-[#E7EFE8] py-20 text-foreground sm:py-28">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:px-10">
        <SectionHeading eyebrow="Built-in controls" title="Field execution you can verify before you pay.">
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
        <SectionHeading eyebrow="Contact" title="Talk to us about Cropfort.">
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

        <footer className="border-t border-border bg-background">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-7 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
            <div className="flex items-center gap-2">
              <Sprout className="h-4 w-4" />
              <span className="font-medium text-foreground">Cropfort</span>
              <span>·</span>
              <span>Farm Operations Platform</span>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <a href="#contact" className="hover:text-foreground">
                Contact
              </a>
              <a href="mailto:noreply@cropfort.com" className="hover:text-foreground">
                Support
              </a>
              <Link href="/login" className="hover:text-foreground">
                Sign in
              </Link>
              <p>Powered by SPX</p>
            </div>
          </div>
        </footer>

        <BackToTop />
      </main>
    </MotionConfig>
  );
}
