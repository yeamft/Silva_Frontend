"use client";

import { FormEvent, ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import {
  ArrowRight,
  CalendarRange,
  CheckCircle2,
  ChevronRight,
  FileCheck2,
  History,
  Loader2,
  MapPinned,
  Menu,
  Radio,
  Send,
  ShieldCheck,
  Sprout,
  Users,
} from "lucide-react";

import { submitContactInquiry } from "@/lib/api/contact";
import { ApiError } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/cropfort/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

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
  { id: "how-it-works", label: "How it works" },
  { id: "roles", label: "Who it's for" },
  { id: "contact", label: "Contact" },
] as const;

type PanelId = (typeof NAV_LINKS)[number]["id"];

/**
 * Background photos for the hero. Each is preloaded first and only joins the rotation once it
 * has loaded, so the hero never shows an empty frame.
 */
function useHeroSlides() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [ready, setReady] = useState<boolean[]>(() =>
    HERO_IMAGES.map(() => false),
  );

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

function HeroBackground({
  activeIndex,
  ready,
}: {
  activeIndex: number;
  ready: boolean[];
}) {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      aria-hidden
    >
      <div className="absolute inset-0 bg-[#0B1F0C]" />
      {HERO_IMAGES.map((image, index) => {
        const visible = ready[index] && index === activeIndex;
        return (
          <motion.div
            key={image.src}
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: ready[index] ? `url("${image.src}")` : undefined,
            }}
            initial={false}
            // Fade in, then drift in slowly for as long as the photo is shown
            animate={visible ? { opacity: 1, scale: 1.08 } : { opacity: 0, scale: 1 }}
            transition={{
              opacity: { duration: 1.4, ease: "easeOut" },
              scale: visible ? { duration: HERO_ROTATE_MS / 1000 + 1.4, ease: "linear" } : { duration: 1.4 },
            }}
          />
        );
      })}
    </div>
  );
}

/** Words fade and rise in one after another. */
function RevealWords({ text, delay = 0 }: { text: string; delay?: number }) {
  return (
    <>
      {text.split(" ").map((word, i) => (
        <motion.span
          key={`${word}-${i}`}
          className="inline-block whitespace-pre"
          initial={{ opacity: 0, y: "0.45em", filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ delay: delay + i * 0.06, duration: 0.5, ease }}
        >
          {i < text.split(" ").length - 1 ? `${word} ` : word}
        </motion.span>
      ))}
    </>
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

function SiteHeader({
  active,
  onOpen,
}: {
  active: PanelId | null;
  onOpen: (id: PanelId | null) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [hovered, setHovered] = useState<PanelId | null>(null);

  return (
    <header
      className={cn(
        "absolute inset-x-0 top-0 z-50 pt-[env(safe-area-inset-top)]",
      )}
    >
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-4 px-5 sm:px-8 lg:px-10">
        <Link
          href="/"
          onClick={() => onOpen(null)}
          className="flex items-center gap-3 text-white"
          aria-label="Cropfort home"
        >
          <BrandMark />
          <span className="font-display text-lg font-semibold tracking-tight">
            Cropfort
          </span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex" onMouseLeave={() => setHovered(null)}>
          {NAV_LINKS.map((link) => {
            const isActive = active === link.id;
            return (
              <button
                type="button"
                key={link.id}
                onClick={() => onOpen(link.id)}
                onMouseEnter={() => setHovered(link.id)}
                onFocus={() => setHovered(link.id)}
                aria-haspopup="dialog"
                className={cn(
                  "relative isolate inline-flex h-10 items-center rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B7D4B9]",
                  isActive ? "text-white" : "text-white/70 hover:text-white",
                )}
              >
                {hovered === link.id ? (
                  <motion.span
                    layoutId="nav-hover"
                    className="absolute inset-0 -z-10 rounded-lg bg-white/10"
                    transition={{ duration: 0.25, ease }}
                  />
                ) : null}
                {link.label}
                {isActive ? (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-x-3 bottom-1 h-0.5 rounded-full bg-[#B7D4B9]"
                    transition={{ duration: 0.3, ease }}
                  />
                ) : null}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Button
            asChild
            className="group h-10 rounded-xl bg-primary px-4 font-semibold text-primary-foreground shadow-[0_10px_24px_-12px_hsl(120_35%_28%/0.35)] hover:bg-[hsl(var(--primary-hover))] sm:px-5"
          >
            <Link href="/login">
              Sign in
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
            <SheetContent
              side="right"
              className="cf-gold-marketing w-[86vw] max-w-sm bg-background"
            >
              <SheetTitle className="flex items-center gap-3">
                <BrandMark className="h-9 w-9" />
                <span className="font-display text-lg">Cropfort</span>
              </SheetTitle>

              <nav aria-label="Mobile" className="mt-8 flex flex-col gap-1">
                {NAV_LINKS.map((link) => (
                  <button
                    type="button"
                    key={link.id}
                    onClick={() => {
                      setMenuOpen(false);
                      onOpen(link.id);
                    }}
                    className={cn(
                      "flex h-12 items-center justify-between rounded-xl px-4 text-base font-medium transition-colors",
                      active === link.id
                        ? "bg-secondary text-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {link.label}
                    <ChevronRight className="h-4 w-4 opacity-60" />
                  </button>
                ))}
              </nav>

              <Button
                asChild
                size="lg"
                className="mt-8 h-12 w-full rounded-xl font-semibold"
              >
                <Link href="/login" onClick={() => setMenuOpen(false)}>
                  Sign in to Cropfort
                </Link>
              </Button>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

function Hero({
  panel,
  onOpen,
}: {
  panel: PanelId | null;
  onOpen: (id: PanelId | null) => void;
}) {
  const { activeIndex, ready } = useHeroSlides();

  return (
    <section className="relative isolate flex h-full w-full cursor-pointer flex-col bg-[#0B1F0C]">
      <div className="absolute inset-0 overflow-hidden" aria-hidden>
        <HeroBackground activeIndex={activeIndex} ready={ready} />
        <div className="absolute inset-0 z-[1] bg-gradient-to-r from-[#061408]/90 via-[#0B1F0C]/70 to-[#0B1F0C]/40" />
        <div className="absolute inset-0 z-[1] bg-gradient-to-t from-[#061408]/70 via-transparent to-[#061408]/30" />
      </div>

      <div className="relative z-20 mx-auto grid w-full max-w-7xl flex-1 min-h-0 items-center gap-12 px-5 pb-6 pt-[calc(80px+env(safe-area-inset-top))] sm:px-8 lg:px-10">
        <div className="relative w-full max-w-3xl">
          <AnimatePresence mode="wait" initial={false}>
            {panel ? (
              <HeroPanel key={panel} panel={panel} />
            ) : (
              <motion.div
                key="intro"
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.4, ease }}
                className="w-full"
              >
                <h1 className="font-display text-[32px] font-semibold leading-[1.06] tracking-[-0.03em] text-white sm:text-5xl lg:text-[56px] [@media(max-height:700px)]:lg:text-5xl">
                  <RevealWords text="Plan the season. Approve the work." />{" "}
                  <span className="relative inline-block text-[#B7D4B9]">
                    <RevealWords text="Verify every job." delay={0.42} />
                    <motion.span
                      aria-hidden
                      className="absolute -bottom-1 left-0 h-[3px] w-full origin-left rounded-full bg-[#B7D4B9]/70"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ delay: 0.85, duration: 0.7, ease }}
                    />
                  </span>
                </h1>

                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6, duration: 0.5, ease }}
                  className="mt-5 max-w-2xl text-base leading-7 text-white/75 sm:text-lg sm:leading-8"
                >
                  Cropfort takes estate work from the annual plan to work
                  orders and verified delivery with each team seeing only
                  what&apos;s waiting on them.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.75, duration: 0.5, ease }}
                  className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
                >
                  <Button
                    asChild
                    size="lg"
                    className="group relative h-12 overflow-hidden rounded-xl bg-primary px-6 text-base font-semibold text-primary-foreground shadow-[0_14px_30px_-14px_hsl(120_35%_28%/0.6)] hover:bg-[hsl(var(--primary-hover))]"
                  >
                    <Link href="/login">
                      <motion.span
                        aria-hidden
                        className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 skew-x-[-20deg] bg-gradient-to-r from-transparent via-white/35 to-transparent"
                        initial={{ x: "0%" }}
                        animate={{ x: "450%" }}
                        transition={{ duration: 1.1, ease: "easeInOut", repeat: Infinity, repeatDelay: 3.5, delay: 1.4 }}
                      />
                      Sign in to Cropfort
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="h-12 rounded-xl border-white/25 bg-white/5 px-6 text-base font-semibold text-white backdrop-blur-sm hover:bg-white/10 hover:text-white"
                  >
                    <button
                      type="button"
                      onClick={() => onOpen("how-it-works")}
                    >
                      See how it works
                    </button>
                  </Button>
                </motion.div>

                <dl className="mt-10 hidden gap-5 border-t border-white/10 pt-6 sm:grid sm:grid-cols-3 sm:gap-8 [@media(max-height:720px)]:hidden">
                  {[
                    {
                      term: "Two-step approvals",
                      detail: "Plans and work orders signed off",
                      icon: ShieldCheck,
                    },
                    {
                      term: "Live updates",
                      detail: "Screens refresh the moment work moves",
                      icon: Radio,
                    },
                    {
                      term: "Full audit trail",
                      detail: "Every decision traceable",
                      icon: History,
                    },
                  ].map((item, i) => (
                    <motion.div
                      key={item.term}
                      className="flex gap-3"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.95 + i * 0.12, duration: 0.45, ease }}
                    >
                      <motion.span
                        className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-[#B7D4B9]"
                        initial={{ scale: 0.6 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.95 + i * 0.12, type: "spring", stiffness: 380, damping: 18 }}
                      >
                        {item.icon === Radio ? (
                          <motion.span
                            aria-hidden
                            className="absolute inset-0 rounded-lg border border-[#B7D4B9]/60"
                            animate={{ scale: [1, 1.55], opacity: [0.7, 0] }}
                            transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
                          />
                        ) : null}
                        <item.icon className="h-4 w-4" aria-hidden />
                      </motion.span>
                      <div>
                        <dt className="text-sm font-semibold text-white">
                          {item.term}
                        </dt>
                        <dd className="mt-0.5 text-sm leading-5 text-white/60">
                          {item.detail}
                        </dd>
                      </div>
                    </motion.div>
                  ))}
                </dl>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>

      <footer className="relative z-20 border-t border-white/10 bg-[#061408]/60 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-xs text-white/60 sm:px-8 lg:px-10">
          <p>© {new Date().getFullYear()} Cropfort</p>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => onOpen("contact")}
              className="transition hover:text-white"
            >
              Request access
            </button>
            <a
              href="mailto:noreply@cropfort.com"
              className="transition hover:text-white"
            >
              Support
            </a>
          </div>
        </div>
      </footer>
    </section>
  );
}

const ROLES = [
  {
    title: "Asset owners",
    copy: "Approve plans and work orders.",
    icon: ShieldCheck,
  },
  { title: "Vendors", copy: "Do the work and mark it done.", icon: Users },
] as const;

const STEPS = [
  { title: "Plan", copy: "Build the season plan.", icon: MapPinned },
  { title: "Approve", copy: "The asset owner signs it off.", icon: FileCheck2 },
  {
    title: "Work orders",
    copy: "Each month's work is approved first.",
    icon: CalendarRange,
  },
  { title: "Activate", copy: "Work orders go to vendors.", icon: Send },
] as const;

/** Staggered list used by the hero panels. */
const listMotion = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};
const itemMotion = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease } },
};

function StepsBody() {
  return (
    <motion.ol
      variants={listMotion}
      initial="hidden"
      animate="show"
      className="grid gap-2.5 sm:grid-cols-2"
    >
      {STEPS.map((step, index) => (
        <motion.li
          key={step.title}
          variants={itemMotion}
          className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-3 backdrop-blur-sm transition-colors hover:bg-white/[0.1]"
        >
          <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#B7D4B9]/15 text-[#B7D4B9]">
            <step.icon className="h-4 w-4" aria-hidden />
            <span className="absolute -left-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {index + 1}
            </span>
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-white">
              {step.title}
            </span>
            <span className="block text-[13px] text-white/60">{step.copy}</span>
          </span>
        </motion.li>
      ))}
    </motion.ol>
  );
}

function RolesBody() {
  return (
    <>
      <motion.ul
        variants={listMotion}
        initial="hidden"
        animate="show"
        className="space-y-2.5"
      >
        {ROLES.map((role) => (
          <motion.li
            key={role.title}
            variants={itemMotion}
            className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-sm transition-colors hover:bg-white/[0.1]"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <role.icon className="h-5 w-5" aria-hidden />
            </span>
            <span>
              <span className="block text-base font-semibold text-white">
                {role.title}
              </span>
              <span className="block text-sm text-white/60">{role.copy}</span>
            </span>
          </motion.li>
        ))}
      </motion.ul>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
      >
        <Button
          asChild
          size="lg"
          className="mt-6 h-12 rounded-xl px-6 text-base font-semibold"
        >
          <Link href="/login">
            Sign in to Cropfort
          </Link>
        </Button>
      </motion.div>
    </>
  );
}

function ContactBody() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease, delay: 0.1 }}
      className="max-w-md rounded-2xl bg-background p-5 text-foreground shadow-[0_30px_60px_-30px_rgba(0,0,0,0.7)]"
    >
      <ContactForm />
    </motion.div>
  );
}

const PANELS: Record<
  PanelId,
  { title: string; copy: string; body: () => ReactNode }
> = {
  "how-it-works": {
    title: "How it works",
    copy: "Four simple steps, from plan to work orders.",
    body: () => <StepsBody />,
  },
  roles: {
    title: "Who it's for",
    copy: "Each team sees only its own work.",
    body: () => <RolesBody />,
  },
  contact: {
    title: "Contact us",
    copy: "Ask for a demo or access — we'll reply soon.",
    body: () => <ContactBody />,
  },
};

/** Replaces the hero intro in place: a short title and the panel's content. */
function HeroPanel({ panel }: { panel: PanelId }) {
  const { title, copy, body } = PANELS[panel];
  return (
    <motion.section
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={{ duration: 0.4, ease }}
      aria-labelledby="hero-panel-title"
      className="w-full"
    >
      <h2
        id="hero-panel-title"
        className="font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl"
      >
        {title}
      </h2>
      <p className="mt-2 text-base text-white/70">{copy}</p>
      <div className="mt-6">{body()}</div>
    </motion.section>
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
  const [touched, setTouched] = useState<
    Partial<Record<keyof ContactFormState, boolean>>
  >({});
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
      const firstInvalid = event.currentTarget.querySelector<HTMLElement>(
        "[aria-invalid='true']",
      );
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
        className="flex flex-col items-center py-4 text-center"
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-primary">
          <CheckCircle2 className="h-6 w-6" />
        </span>
        <h3 className="mt-4 font-display text-lg font-semibold">
          Message sent
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          We&apos;ll get back to you soon.
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-5 rounded-full"
          onClick={() => setStatus("idle")}
        >
          Send another message
        </Button>
      </motion.div>
    );
  }

  const messageLength = form.message.trim().length;

  return (
    <form onSubmit={onSubmit} className="space-y-3" noValidate>
      <div className="grid gap-3 sm:grid-cols-2">
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
        label="Message"
        required
        error={errors.message}
        render={(props) => (
          <div className="relative">
            <Textarea
              {...props}
              name="message"
              rows={3}
              placeholder="How can we help?"
              value={form.message}
              onChange={(e) => update("message", e.target.value)}
              onBlur={() => blur("message")}
              disabled={submitting}
              className="min-h-[88px] resize-none pb-7"
            />
            <span
              className={cn(
                "pointer-events-none absolute bottom-2 right-3 text-xs tabular-nums",
                messageLength >= MESSAGE_MIN
                  ? "text-primary"
                  : "text-muted-foreground",
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

      <div
        className="absolute -left-[9999px] top-auto h-0 w-0 overflow-hidden"
        aria-hidden
      >
        <label htmlFor="contact-website">Website</label>
        <input
          id="contact-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={form.website}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, website: e.target.value }))
          }
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
        <Button
          type="submit"
          className="h-10 w-full rounded-xl"
          disabled={submitting}
        >
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

/** One screen, no page scroll: the header links swap the hero's content in place. */
export default function LandingPage() {
  const [panel, setPanel] = useState<PanelId | null>(null);
  // Clicking the open link again goes back to the intro
  const open = (id: PanelId | null) =>
    setPanel((current) => (id === null || current === id ? null : id));

  useEffect(() => {
    if (!panel) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPanel(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panel]);

  return (
    <MotionConfig reducedMotion="user">
      <main className="cf-gold-marketing relative h-[100dvh] overflow-hidden bg-[#0B1F0C] text-foreground">
        <SiteHeader active={panel} onOpen={open} />
        <Hero panel={panel} onOpen={open} />
      </main>
    </MotionConfig>
  );
}
