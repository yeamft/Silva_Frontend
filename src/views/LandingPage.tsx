"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Coins,
  FileCheck2,
  Loader2,
  MapPinned,
  ShieldCheck,
  Sprout,
  Users,
} from "lucide-react";

import { submitContactInquiry } from "@/lib/api/contact";
import { ApiError } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/cropfort/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

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

function HeroBackground() {
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

  useEffect(() => {
    if (!ready[0]) return;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => {
        for (let step = 1; step <= HERO_IMAGES.length; step += 1) {
          const next = (current + step) % HERO_IMAGES.length;
          if (ready[next]) return next;
        }
        return current;
      });
    }, HERO_ROTATE_MS);

    return () => window.clearInterval(timer);
  }, [ready]);

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-[#0B1F0C]" />

      {HERO_IMAGES.map((image, index) => {
        const visible = ready[index] && index === activeIndex;
        return (
          <div
            key={image.src}
            className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-700 ease-out"
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

const STEPS = [
  {
    number: "01",
    title: "Plan",
    description: "Build the annual field program and define estate activities.",
    icon: MapPinned,
  },
  {
    number: "02",
    title: "Approve",
    description: "Review budget, scope, rates, and operational requirements.",
    icon: FileCheck2,
  },
  {
    number: "03",
    title: "Issue",
    description: "Convert approved activities into accountable work orders.",
    icon: ClipboardCheck,
  },
  {
    number: "04",
    title: "Execute",
    description: "Field teams record completed work and supporting evidence.",
    icon: Sprout,
  },
  {
    number: "05",
    title: "Validate",
    description: "Supervisors verify quantities, rates, and completed delivery.",
    icon: CheckCircle2,
  },
  {
    number: "06",
    title: "Settle",
    description: "Approved work moves into commercial settlement and reporting.",
    icon: Coins,
  },
] as const;

type ContactFormState = {
  name: string;
  email: string;
  organization: string;
  message: string;
  website: string;
};

const EMPTY_CONTACT: ContactFormState = {
  name: "",
  email: "",
  organization: "",
  message: "",
  website: "",
};

function ContactForm() {
  const [form, setForm] = useState<ContactFormState>(EMPTY_CONTACT);
  const [errors, setErrors] = useState<Partial<Record<keyof ContactFormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("");

  function validateLocal(values: ContactFormState) {
    const next: Partial<Record<keyof ContactFormState, string>> = {};
    if (!values.name.trim()) next.name = "Name is required.";
    if (!values.email.trim()) next.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
      next.email = "Enter a valid email.";
    }
    if (values.message.trim().length < 10) {
      next.message = "Message should be at least 10 characters.";
    }
    return next;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateLocal(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

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
      setStatus("success");
      setStatusMessage("Thanks — we received your message and will get back to you.");
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

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
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
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
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
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
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
            value={form.organization}
            onChange={(e) => setForm((prev) => ({ ...prev, organization: e.target.value }))}
            disabled={submitting}
          />
        )}
      />

      <FormField
        label="Message"
        required
        error={errors.message}
        render={(props) => (
          <Textarea
            {...props}
            name="message"
            rows={5}
            value={form.message}
            onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
            disabled={submitting}
            className="min-h-[140px] resize-y"
          />
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

      {status !== "idle" ? (
        <p
          role="status"
          className={
            status === "success" ? "text-sm text-primary" : "text-sm text-destructive"
          }
        >
          {statusMessage}
        </p>
      ) : null}

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
    </form>
  );
}

export default function LandingPage() {
  return (
    <main className="cf-gold-marketing min-h-screen bg-background text-foreground">
      <section className="relative isolate flex h-[100dvh] min-h-[100svh] w-full flex-col bg-[#0B1F0C] shadow-[0_28px_64px_-12px_rgba(6,20,8,0.45),0_12px_28px_-8px_rgba(0,0,0,0.28)]">
        <div className="absolute inset-0 overflow-hidden rounded-none" aria-hidden>
          <HeroBackground />

          {/* Soft Upwork-green wash — keep photo readable */}
          <div className="absolute inset-0 z-[1] bg-[#061408]/28" />
          <div className="absolute inset-0 z-[1] bg-gradient-to-r from-[#061408]/50 via-[#0B1F0C]/20 to-transparent" />
          <div className="absolute inset-0 z-[1] bg-gradient-to-t from-[#061408]/45 via-transparent to-[#061408]/10" />
        </div>

        <header className="relative z-30 shrink-0 border-b border-white/10">
          <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">
            <Link
              href="/"
              className="flex items-center gap-3 text-white"
              aria-label="Cropfort home"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-[0_10px_24px_-12px_hsl(120_35%_28%/0.35)]">
                <Sprout className="h-5 w-5 text-primary-foreground" />
              </span>

              <div className="leading-none">
                <p className="font-display text-lg font-semibold tracking-tight">Cropfort</p>
                
              </div>
            </Link>

            <div className="flex items-center gap-2 sm:gap-3">
              <a
                href="#platform"
                className="hidden h-10 items-center px-3 text-sm font-medium text-white/75 transition hover:text-[#C8DFC9] sm:inline-flex"
              >
                Platform
              </a>
              <a
                href="#how-it-works"
                className="hidden h-10 items-center px-3 text-sm font-medium text-white/75 transition hover:text-[#C8DFC9] md:inline-flex"
              >
                How it works
              </a>
              <a
                href="#contact"
                className="hidden h-10 items-center px-3 text-sm font-medium text-white/75 transition hover:text-[#C8DFC9] sm:inline-flex"
              >
                Contact
              </a>
              <Button
                asChild
                className="h-10 rounded-xl bg-primary px-5 font-semibold text-primary-foreground shadow-[0_10px_24px_-12px_hsl(120_35%_28%/0.35)] hover:bg-[hsl(var(--primary-hover))]"
              >
                <Link href="/login">
                  Sign in
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </header>

        <div className="relative z-20 mx-auto flex w-full max-w-7xl flex-1 items-center px-5 py-10 sm:px-8 sm:py-16 lg:px-10">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease }}
            className="max-w-3xl"
          >
         

            <h1 className="mt-8 max-w-3xl font-display text-3xl font-semibold leading-[1.1] tracking-[-0.03em] text-white sm:text-4xl lg:text-[52px]">
              Control field operations
              <span className="block text-[#B7D4B9]">from plan to payment.</span>
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-7 text-white/80 sm:text-lg sm:leading-8">
              One controlled environment for estate owners, SPX managers, and delivery partners
              planning, execution, verification, and settlement.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="h-12 rounded-xl bg-primary px-7 font-semibold text-primary-foreground shadow-[0_14px_30px_-14px_hsl(120_35%_28%/0.4)] hover:bg-[hsl(var(--primary-hover))]"
              >
                <Link href="/login">
                  Open Cropfort
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>

              <a
                href="#platform"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-[#B7D4B9]/35 bg-black/15 px-7 text-sm font-medium text-white backdrop-blur-sm transition hover:border-[#B7D4B9]/55 hover:bg-black/25"
              >
                Explore the platform
              </a>
            </div>

            <p className="mt-6 text-sm text-white/55">
              Invited organisations sign in with their Cropfort account.{" "}
              <a href="#contact" className="text-[#B7D4B9] underline-offset-2 hover:underline">
                Request access
              </a>
              .
            </p>
          </motion.div>
        </div>
      </section>

      <section id="platform" className="border-b border-border bg-background py-20 sm:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:px-10">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease }}
          >
            <h2 className="max-w-md font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              One source of truth for estate execution.
            </h2>
          </motion.div>

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
          </motion.div>
        </div>
      </section>

      <section className="bg-muted/25 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Clear access for every participant.
            </h2>

            <p className="mt-4 leading-7 text-muted-foreground">
              Each organization works within its responsibilities while sharing the same controlled
              operating record.
            </p>
          </div>

          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {ROLES.map((role, index) => {
              const Icon = role.icon;

              return (
                <motion.article
                  key={role.label}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{
                    duration: 0.45,
                    ease,
                    delay: index * 0.07,
                  }}
                  className="group rounded-2xl border border-border bg-card p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/20 bg-accent">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>

                  <h3 className="mt-8 font-display text-2xl font-semibold tracking-tight">
                    {role.title}
                  </h3>

                  <p className="mt-4 min-h-[84px] text-sm leading-7 text-muted-foreground">
                    {role.copy}
                  </p>

                  <div className="mt-7 border-t border-border pt-6">
                    <ul className="space-y-3">
                      {role.points.map((point) => (
                        <li
                          key={point}
                          className="flex items-center gap-3 text-sm text-muted-foreground"
                        >
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="border-y border-border bg-background py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr]">
            <div>
              <h2 className="max-w-md font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                From approved plan to verified settlement.
              </h2>

              <p className="mt-5 max-w-md leading-7 text-muted-foreground">
                A controlled workflow keeps operational and financial accountability connected
                throughout the season.
              </p>
            </div>

            <ol className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2">
              {STEPS.map((step, index) => {
                const Icon = step.icon;

                return (
                  <motion.li
                    key={step.title}
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{
                      duration: 0.4,
                      delay: index * 0.05,
                    }}
                    className="bg-card p-6 sm:p-7"
                  >
                    <div className="flex items-start justify-between">
                      <span className="font-mono text-xs text-muted-foreground">{step.number}</span>

                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-primary">
                        <Icon className="h-4 w-4" />
                      </div>
                    </div>

                    <h3 className="mt-8 font-display text-xl font-semibold">{step.title}</h3>

                    <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                      {step.description}
                    </p>
                  </motion.li>
                );
              })}
            </ol>
          </div>
        </div>
      </section>

      <section className="bg-[#E7EFE8] py-20 text-foreground sm:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-2 lg:items-center lg:px-10">
          <div>
            <h2 className="max-w-xl font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Field execution you can verify before you pay.
            </h2>

            <p className="mt-5 max-w-xl leading-7 text-muted-foreground">
              Cropfort separates work assignment, execution, verification, and approval so
              operational evidence is reviewed before it becomes a commercial obligation.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              "Role-based access",
              "Maker-checker approvals",
              "Rate governance",
              "Field evidence",
              "Work order control",
              "Audit history",
            ].map((item) => (
              <div
                key={item}
                className="flex items-center gap-3 rounded-xl border border-[#C5D6C8] bg-white/70 p-4"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                <span className="text-sm text-foreground/85">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="contact" className="border-t border-border bg-background py-20 sm:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start lg:px-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease }}
          >
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Talk to us about Cropfort.
            </h2>
            <p className="mt-5 max-w-md leading-7 text-muted-foreground">
              For partnerships, demos, or onboarding questions, send a message and the SPX team will
              follow up.
            </p>
            <p className="mt-8 text-sm text-muted-foreground">
              Already have access?{" "}
              <Link
                href="/login"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Sign in
              </Link>
            </p>
          </motion.div>

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
    </main>
  );
}
