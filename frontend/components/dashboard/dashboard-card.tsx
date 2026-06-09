"use client";

import { motion } from "framer-motion";
import { memo } from "react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

function DashboardCardComponent({
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
        "rounded-2xl border border-slate-200/70 bg-white p-4 shadow-[0_12px_40px_rgba(7,17,26,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_50px_rgba(7,17,26,0.10)] dark:border-white/10 dark:bg-white/[0.04] sm:p-5",
        className,
      )}
      initial={{ opacity: 0, y: 14 }}
      transition={{ delay, duration: 0.3, ease: "easeOut" }}
    >
      {children}
    </motion.section>
  );
}

export const DashboardCard = memo(DashboardCardComponent);
