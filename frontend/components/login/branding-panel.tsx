"use client";

import { motion } from "framer-motion";
import { BarChart3, Boxes, ShieldCheck, Workflow } from "lucide-react";
import Image from "next/image";

const featureCards = [
  {
    icon: Boxes,
    title: "Real-time Inventory",
    description: "Track stock, inward movement, and shortages live across lines.",
  },
  {
    icon: Workflow,
    title: "Production Control",
    description: "Plan, assign, and monitor production with fewer blind spots.",
  },
  {
    icon: BarChart3,
    title: "Operational Insights",
    description: "Turn daily plant activity into faster decisions for supervisors.",
  },
];

export function BrandingPanel() {
  return (
    <motion.section
      animate={{ opacity: 1, y: 0 }}
      className="relative hidden h-full min-h-0 overflow-hidden rounded-[24px] border border-white/8 bg-[#020B14] bg-cover bg-center lg:flex lg:flex-col lg:justify-between"
      initial={{ opacity: 0, y: 18 }}
      style={{ backgroundImage: "url('/factory-login-bg.png')" }}
      transition={{ duration: 0.55, ease: "easeOut" }}
    >
      <Image
        alt="Automobile factory floor"
        className="absolute inset-0 h-full w-full object-cover"
        fill
        priority
        sizes="(min-width: 1024px) 52vw, 0px"
        src="/factory-login-bg.png"
        unoptimized
      />

      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,11,20,0.24)_0%,rgba(2,11,20,0.88)_48%,rgba(2,11,20,0.97)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(163,255,18,0.14),transparent_24%),radial-gradient(circle_at_60%_78%,rgba(25,201,59,0.16),transparent_26%),linear-gradient(120deg,rgba(7,17,26,0.24)_35%,rgba(25,201,59,0.05)_100%)]" />
      <div className="absolute right-[-1px] top-0 hidden h-full w-10 bg-[linear-gradient(180deg,rgba(163,255,18,0.96),rgba(25,201,59,0.98))] [clip-path:polygon(100%_0,0_0,100%_100%)] lg:block" />
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-[radial-gradient(circle_at_50%_100%,rgba(25,201,59,0.28),transparent_58%)]" />

      <div className="relative z-10 flex items-center gap-3 px-5 pt-5 lg:px-6 lg:pt-6 xl:px-8 xl:pt-7">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/12 bg-white/6 shadow-[0_20px_40px_rgba(2,11,20,0.38)] backdrop-blur-md">
          <div className="relative h-10 w-10">
            <Image alt="Naptech logo" className="object-contain" fill priority src="/logo.png" />
          </div>
        </div>
        <div>
          <p className="text-[24px] font-semibold tracking-[0.04em] text-[#19C93B] xl:text-[26px]">NAPTECH</p>
          <p className="text-base text-white/90">Factory OS</p>
        </div>
      </div>

      <div className="relative z-10 flex-1 px-5 pb-5 pt-5 lg:px-6 lg:pb-6 lg:pt-5 xl:px-8 xl:pb-8 xl:pt-6">
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          initial={{ opacity: 0, y: 18 }}
          transition={{ delay: 0.08, duration: 0.48 }}
        >
          <p className="mb-3 inline-flex rounded-full border border-[#19C93B]/25 bg-white/6 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#A3FF12] backdrop-blur-sm xl:text-xs">
            Industrial intelligence for Indian manufacturing
          </p>
          <h1 className="max-w-xl text-[36px] font-semibold leading-[0.98] text-white lg:text-[42px] xl:max-w-2xl xl:text-[58px]">
            Run your factory.
            <span className="mt-2 block bg-[linear-gradient(90deg,#A3FF12_0%,#19C93B_55%,#C9FFD9_100%)] bg-clip-text text-transparent">
              Better. Faster. Smarter.
            </span>
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300 xl:text-[16px]">
            Naptech Factory OS helps Indian automobile SMEs manage inventory, production, workers and operations in one intelligent platform.
          </p>
        </motion.div>

        <div className="mt-5 grid gap-3 lg:max-w-[88%] xl:mt-6">
          {featureCards.map((feature, index) => {
            const Icon = feature.icon;

            return (
              <motion.div
                animate={{ opacity: 1, x: 0 }}
                className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.045] p-3.5 shadow-[0_18px_40px_rgba(2,11,20,0.24)] backdrop-blur-sm"
                initial={{ opacity: 0, x: -16 }}
                key={feature.title}
                transition={{ delay: 0.14 + index * 0.08, duration: 0.42 }}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#19C93B]/14 bg-[rgba(25,201,59,0.12)] text-[#A3FF12] shadow-[0_0_0_1px_rgba(163,255,18,0.08),0_12px_30px_rgba(25,201,59,0.12)]">
                  <Icon size={18} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">{feature.title}</h2>
                  <p className="mt-1 text-sm leading-5 text-slate-300">{feature.description}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="mt-5 flex items-start gap-3 rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-4 shadow-[0_22px_60px_rgba(2,11,20,0.3)] backdrop-blur-md xl:mt-6 xl:max-w-[88%]"
          initial={{ opacity: 0, y: 16 }}
          transition={{ delay: 0.34, duration: 0.48 }}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#19C93B]/12 bg-[rgba(25,201,59,0.12)] text-[#A3FF12]">
            <ShieldCheck size={18} />
          </div>
          <div>
            <p className="text-base font-semibold text-white">Secure. Reliable. Built for Indian Manufacturing.</p>
            <p className="mt-1 text-sm leading-5 text-slate-300">
              Enterprise-grade protection and a stable control layer for modern plant operations.
            </p>
          </div>
        </motion.div>
      </div>
    </motion.section>
  );
}
