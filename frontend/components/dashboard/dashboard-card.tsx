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
        "rounded-[28px] border border-white bg-white p-5 shadow-[0_20px_60px_rgba(7,17,26,0.08)] transition hover:-translate-y-1 hover:shadow-[0_26px_70px_rgba(7,17,26,0.12)]",
        className,
      )}
      initial={{ opacity: 0, y: 14 }}
      transition={{ delay, duration: 0.42, ease: "easeOut" }}
    >
      {children}
    </motion.section>
  );
}

