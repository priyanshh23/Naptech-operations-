"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function DashboardCard({
  children,
  className,
  delay = 0,
}: Readonly<{
  children: ReactNode;
  className?: string;
  delay?: number;
}>) {
  return (
    <motion.section
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_12px_40px_rgba(7,17,26,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_50px_rgba(7,17,26,0.10)] dark-dashboard:border-white/10 dark-dashboard:bg-white/[0.04]",
        className,
      )}
      initial={{ opacity: 0, y: 14 }}
      transition={{ delay, duration: 0.42, ease: "easeOut" }}
    >
      {children}
    </motion.section>
  );
}
