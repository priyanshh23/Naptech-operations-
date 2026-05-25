import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export function Card({
  children,
  className,
}: Readonly<{
  children: ReactNode;
  className?: string;
}>) {
  return (
    <section className={cn("rounded-lg border border-border bg-white p-5 shadow-panel", className)}>
      {children}
    </section>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: Readonly<{
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}>) {
  const toneClass = {
    neutral: "bg-slate-100 text-slate-700",
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
    danger: "bg-red-50 text-red-700",
    info: "bg-cyan-50 text-cyan-700",
  }[tone];

  return (
    <span className={cn("inline-flex rounded-md px-2 py-1 text-xs font-semibold", toneClass)}>
      {children}
    </span>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: Readonly<{
  title: string;
  description: string;
  action?: ReactNode;
}>) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal text-slate-950">{title}</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function Button({
  children,
  className,
  type = "button",
  ...props
}: Readonly<
  {
    children: ReactNode;
    className?: string;
    type?: "button" | "submit";
  } & ButtonHTMLAttributes<HTMLButtonElement>
>) {
  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90",
        className,
      )}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}
