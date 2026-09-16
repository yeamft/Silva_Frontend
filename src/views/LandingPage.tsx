"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Coins,
  FileCheck2,
  MapPinned,
  ShieldCheck,
  Sprout,
  Users,
} from "lucide-react";

import ThemeToggle from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";

const HERO_IMAGES = [
  {
    src: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=2400&q=80",
    alt: "Tractor working cultivated farmland",
  },
  {
    src: "https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&w=2400&q=80",
    alt: "Farm workers inspecting crop rows",
  },
  {
    src: "https://images.unsplash.com/photo-1464226184884-fa280b87c0b0?auto=format&fit=crop&w=2400&q=80",
    alt: "Active crop rows across estate land",
  },
  {
    src: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=2400&q=80",
    alt: "Rolling farmland ready for field work",
  },
  {
    src: "https://images.unsplash.com/photo-1560493676-04071c5f7500?auto=format&fit=crop&w=2400&q=80",
    alt: "Young crops under field management",
  },
] as const;

const ease = [0.16, 1, 0.3, 1] as const;
const HERO_ROTATE_MS = 7000;

function HeroBackground() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % HERO_IMAGES.length);
    }, HERO_ROTATE_MS);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-[#1a2a22]" />

      {HERO_IMAGES.map((image, index) => (
        <div
          key={image.src}
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-[1400ms] ease-out"
          style={{
            opacity: index === activeIndex ? 1 : 0,
            backgroundImage: `url("${image.src}")`,
          }}
        />
      ))}
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

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* HERO */}
      <section className="relative isolate min-h-[92vh] overflow-hidden bg-[#1a2a22]">
        <HeroBackground />

        {/* Layered overlay — keep lighter so photos remain visible */}
        <div className="absolute inset-0 z-[1] bg-black/35" />
        <div className="absolute inset-0 z-[1] bg-gradient-to-r from-black/70 via-black/35 to-transparent" />
        <div className="absolute inset-0 z-[1] bg-gradient-to-t from-black/65 via-transparent to-black/25" />

        {/* NAVIGATION */}
        <header className="relative z-30 border-b border-white/10">
          <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">
            <Link
              href="/"
              className="flex items-center gap-3 text-white"
              aria-label="Cropfort home"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#C9A86A] shadow-sm">
                <Sprout className="h-5 w-5 text-[#14261C]" />
              </span>

              <div className="leading-none">
                <p className="font-display text-lg font-semibold tracking-tight">
                  Cropfort
                </p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.19em] text-white/50">
                  Farm Operations
                </p>
              </div>
            </Link>

            <div className="flex items-center gap-2">
              <div className="[&_button]:text-white [&_button]:hover:bg-white/10">
                <ThemeToggle />
              </div>

              <Button
                asChild
                className="h-10 rounded-full bg-white px-5 font-medium text-[#17241C] hover:bg-white/90"
              >
                <Link href="/login">
                  Sign in
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </header>

        {/* HERO CONTENT */}
        <div className="relative z-20 mx-auto flex min-h-[calc(92vh-72px)] max-w-7xl items-center px-5 py-20 sm:px-8 lg:px-10">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease }}
            className="max-w-3xl"
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-2 backdrop-blur-md">
              <span className="h-1.5 w-1.5 rounded-full bg-[#D6B875]" />
              <span className="text-xs font-medium uppercase tracking-[0.15em] text-white/75">
                Estate Operations Platform
              </span>
            </div>

            <h1 className="max-w-3xl font-display text-4xl font-semibold leading-[1.08] tracking-[-0.035em] text-white sm:text-5xl lg:text-[68px]">
              Control field operations
              <span className="block text-white/65">from plan to payment.</span>
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-7 text-white/70 sm:text-lg sm:leading-8">
              Cropfort gives estate owners, SPX managers, and delivery
              partners one controlled operating environment for planning,
              work execution, verification, commercial governance, and
              settlement.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="h-12 rounded-full bg-[#C9A86A] px-7 font-medium text-[#132219] hover:bg-[#D8BB82]"
              >
                <Link href="/login">
                  Open Cropfort
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>

              <a
                href="#platform"
                className="inline-flex h-12 items-center justify-center rounded-full border border-white/20 bg-white/5 px-7 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/10"
              >
                Explore the platform
              </a>
            </div>

            {/* TRUST STATEMENT */}
            <div className="mt-12 flex flex-wrap gap-x-8 gap-y-4 border-t border-white/15 pt-6 text-sm text-white/55">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#D6B875]" />
                Controlled approvals
              </span>

              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#D6B875]" />
                Verifiable field delivery
              </span>

              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#D6B875]" />
                Accountable settlement
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* INTRO */}
      <section id="platform" className="border-b border-border bg-background py-20 sm:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:px-10">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease }}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              One operating system
            </p>

            <h2 className="mt-4 max-w-md font-display text-3xl font-semibold tracking-tight sm:text-4xl">
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
              Cropfort connects operational planning with what actually happens
              on the farm. Approved activities become controlled work orders,
              field delivery becomes measurable execution, and verified work
              creates the basis for accountable financial settlement.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ROLES */}
      <section className="bg-muted/25 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Designed around responsibility
            </p>

            <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Clear access for every participant.
            </h2>

            <p className="mt-4 leading-7 text-muted-foreground">
              Each organization works within its responsibilities while sharing
              the same controlled operating record.
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
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-muted">
                    <Icon className="h-5 w-5 text-foreground" />
                  </div>

                  <p className="mt-8 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                    {role.label}
                  </p>

                  <h3 className="mt-2 font-display text-2xl font-semibold tracking-tight">
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

      {/* WORKFLOW */}
      <section className="border-y border-border bg-background py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                Operating workflow
              </p>

              <h2 className="mt-4 max-w-md font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                From approved plan to verified settlement.
              </h2>

              <p className="mt-5 max-w-md leading-7 text-muted-foreground">
                A controlled workflow keeps operational and financial
                accountability connected throughout the season.
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
                      <span className="font-mono text-xs text-muted-foreground">
                        {step.number}
                      </span>

                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                        <Icon className="h-4 w-4" />
                      </div>
                    </div>

                    <h3 className="mt-8 font-display text-xl font-semibold">
                      {step.title}
                    </h3>

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

      {/* GOVERNANCE */}
      <section className="bg-[#17231B] py-20 text-white sm:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-2 lg:items-center lg:px-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#D4B77A]">
              Operational control
            </p>

            <h2 className="mt-4 max-w-xl font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Field execution you can verify before you pay.
            </h2>

            <p className="mt-5 max-w-xl leading-7 text-white/60">
              Cropfort separates work assignment, execution, verification, and
              approval so operational evidence is reviewed before it becomes a
              commercial obligation.
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
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-4"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0 text-[#D4B77A]" />
                <span className="text-sm text-white/75">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-background px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Cropfort
          </p>

          <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
            Bring estate operations into one controlled workflow.
          </h2>

          <p className="mx-auto mt-5 max-w-xl leading-7 text-muted-foreground">
            Access your assigned programs, field operations, approvals, and
            commercial workflows from one workspace.
          </p>

          <Button
            asChild
            size="lg"
            className="mt-8 h-12 rounded-full px-8"
          >
            <Link href="/login">
              Sign in to Cropfort
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border bg-background">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-7 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
          <div className="flex items-center gap-2">
            <Sprout className="h-4 w-4" />
            <span className="font-medium text-foreground">Cropfort</span>
            <span>·</span>
            <span>Farm Operations Platform</span>
          </div>

          <p>Powered by SPX</p>
        </div>
      </footer>
    </main>
  );
}