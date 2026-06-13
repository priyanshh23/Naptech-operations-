"use client";

import { useEffect } from "react";

import { BrandingPanel } from "@/components/login/branding-panel";
import { LoginForm } from "@/components/login/login-form";

export default function LoginPage() {
  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#F7F9FB] text-[#111827]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgba(25,201,59,0.08),transparent_20%),radial-gradient(circle_at_0%_100%,rgba(163,255,18,0.08),transparent_20%),linear-gradient(180deg,#ffffff_0%,#F7F9FB_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(7,17,26,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(7,17,26,0.03)_1px,transparent_1px)] bg-[size:72px_72px]" />
      <div className="pointer-events-none absolute right-[-7rem] top-[-5rem] h-72 w-72 rounded-full border-[28px] border-[#19C93B]/10" />
      <div className="pointer-events-none absolute bottom-[-6rem] left-[-6rem] h-64 w-64 rounded-full border-[24px] border-[#19C93B]/10" />

      <section className="relative z-10 mx-auto grid min-h-screen max-w-[1600px] items-center gap-4 px-3 py-3 md:px-4 md:py-4 lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.92fr)] lg:gap-5 xl:gap-6 xl:px-6 xl:py-6">
        <BrandingPanel />
        <LoginForm />
      </section>
    </main>
  );
}
