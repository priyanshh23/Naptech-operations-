"use client";

import { ArrowRight, Boxes, Factory, Gauge, Lock, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";

import { Button, Card } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email"));
    const password = String(formData.get("password"));

    if (email !== "supervisor@naptech.in" || password !== "password") {
      setIsLoading(false);
      setError("Use supervisor@naptech.in and password for this demo.");
      return;
    }

    window.localStorage.setItem("naptech_demo_session", "supervisor");
    router.push("/dashboard");
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f8fbff] text-slate-950">
      <div className="login-grid" />
      <div className="login-aurora login-aurora-one" />
      <div className="login-aurora login-aurora-two" />

      <section className="relative z-10 grid min-h-screen items-center gap-10 px-5 py-8 lg:grid-cols-[1.1fr_0.9fr] lg:px-12 xl:px-20">
        <div className="mx-auto w-full max-w-3xl">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-white/70 px-3 py-2 text-sm font-semibold text-cyan-800 shadow-sm backdrop-blur">
            <Sparkles size={16} />
            Factory OS for Indian automobile SMEs
          </div>

          <h1 className="max-w-3xl text-5xl font-semibold leading-[1.02] tracking-normal text-slate-950 md:text-7xl">
            Run inventory and production from one sharp control room.
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            Monitor stock, workers, delays, and daily movement with a dashboard built for fast factory decisions.
          </p>

          <div className="mt-10 grid max-w-2xl gap-3 sm:grid-cols-3">
            <StatusTile icon={<Boxes size={19} />} label="Stock visibility" value="Live" />
            <StatusTile icon={<Gauge size={19} />} label="Task flow" value="Active" />
            <StatusTile icon={<ShieldCheck size={19} />} label="Role access" value="Secure" />
          </div>

          <div className="motion-strip mt-10 hidden h-24 max-w-2xl overflow-hidden rounded-lg border border-white/70 bg-white/60 p-3 shadow-panel backdrop-blur md:block">
            <div className="motion-track">
              {["Inventory", "Production", "Workers", "Alerts", "Reports", "Inventory", "Production"].map(
                (item, index) => (
                  <span className="motion-pill" key={`${item}-${index}`}>
                    {item}
                  </span>
                ),
              )}
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="login-progress" />
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-md">
          <Card className="relative overflow-hidden border-white/80 bg-white/90 p-6 shadow-[0_24px_70px_rgba(14,23,38,0.14)]">
            <div className="absolute -right-20 -top-20 h-44 w-44 rounded-full bg-cyan-100" />
            <div className="absolute -bottom-24 -left-20 h-52 w-52 rounded-full bg-fuchsia-100" />

            <div className="relative">
              <div className="mb-8 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-950 text-white shadow-lg shadow-cyan-900/20">
                    <Factory size={25} />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-slate-950">Naptech Factory OS</h2>
                    <p className="text-sm text-slate-500">Supervisor workspace</p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  Online
                </span>
              </div>

              <form className="space-y-4" onSubmit={handleSubmit}>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-800">Email</span>
                  <span className="flex h-12 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 shadow-sm transition focus-within:border-cyan-400 focus-within:ring-4 focus-within:ring-cyan-100">
                    <Mail size={18} className="text-cyan-700" />
                    <input
                      className="w-full bg-transparent text-sm outline-none"
                      defaultValue="supervisor@naptech.in"
                      name="email"
                      autoComplete="email"
                      type="email"
                    />
                  </span>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-800">Password</span>
                  <span className="flex h-12 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 shadow-sm transition focus-within:border-cyan-400 focus-within:ring-4 focus-within:ring-cyan-100">
                    <Lock size={18} className="text-cyan-700" />
                    <input
                      className="w-full bg-transparent text-sm outline-none"
                      defaultValue="password"
                      name="password"
                      autoComplete="current-password"
                      type="password"
                    />
                  </span>
                </label>

                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 text-slate-600">
                    <input className="h-4 w-4 accent-cyan-600" defaultChecked type="checkbox" />
                    Remember me
                  </label>
                  <a className="font-semibold text-cyan-700" href="#">
                    Reset
                  </a>
                </div>

                {error ? (
                  <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                    {error}
                  </p>
                ) : null}

                <Button className="group h-12 w-full rounded-lg text-base" disabled={isLoading} type="submit">
                  {isLoading ? "Opening dashboard..." : "Login"}
                  <ArrowRight className="transition group-hover:translate-x-1" size={18} />
                </Button>
              </form>

              <div className="mt-6 grid grid-cols-3 gap-3 border-t border-slate-100 pt-5">
                <MiniMetric label="Low stock" value="2" />
                <MiniMetric label="Active" value="1" />
                <MiniMetric label="Delayed" value="1" />
              </div>
            </div>
          </Card>
        </div>
      </section>
    </main>
  );
}

function StatusTile({
  icon,
  label,
  value,
}: Readonly<{
  icon: ReactNode;
  label: string;
  value: string;
}>) {
  return (
    <div className="rounded-lg border border-white/70 bg-white/70 p-4 shadow-panel backdrop-blur">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
        {icon}
      </div>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function MiniMetric({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-lg bg-slate-50 p-3 text-center">
      <p className="text-lg font-semibold text-slate-950">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{label}</p>
    </div>
  );
}
