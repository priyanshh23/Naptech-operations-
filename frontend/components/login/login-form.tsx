"use client";

import { motion } from "framer-motion";
import { ArrowRight, EyeOff, Lock, Mail } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { Button, Card } from "@/components/ui";
import { getDashboardSummary, googleLogin, login } from "@/lib/api";

import { LoginInput } from "./login-input";

function GoogleMark() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.31 9.14 5.38 12 5.38z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  useEffect(() => {
    const existingToken = window.localStorage.getItem("naptech_access_token");
    if (existingToken) {
      void (async () => {
        try {
          await getDashboardSummary();
          router.replace("/dashboard");
        } catch {
          window.localStorage.removeItem("naptech_access_token");
          window.localStorage.removeItem("naptech_user");
          window.localStorage.removeItem("naptech_demo_session");
        }
      })();
    }

    if (!googleClientId || document.getElementById("google-identity-script")) return;
    const script = document.createElement("script");
    script.id = "google-identity-script";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }, [googleClientId, router]);

  function storeSession(response: Awaited<ReturnType<typeof login>>) {
    window.localStorage.setItem("naptech_access_token", response.access_token);
    window.localStorage.setItem("naptech_user", JSON.stringify(response.user));
    window.localStorage.setItem("naptech_demo_session", response.user.email);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsLoading(true);
    window.localStorage.removeItem("naptech_access_token");
    window.localStorage.removeItem("naptech_user");
    window.localStorage.removeItem("naptech_demo_session");

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email"));
    const password = String(formData.get("password"));

    try {
      const response = await login(email, password);
      storeSession(response);
      router.replace("/dashboard");
      router.refresh();
    } catch (error) {
      setIsLoading(false);
      const message = error instanceof Error ? error.message : "Login failed";
      const normalized = message.toLowerCase();
      if (
        normalized.includes("backend server is unavailable") ||
        normalized.includes("failed to fetch") ||
        normalized.includes("fetch failed") ||
        normalized.includes("networkerror") ||
        normalized.includes("load failed")
      ) {
        setError("Backend server is not reachable. Start the FastAPI server on port 8000 and try again.");
        return;
      }
      if (normalized.includes("invalid email or password")) {
        setError("Use supervisor@naptech.in, inventory@naptech.in, production@naptech.in, or quality@naptech.in with password.");
        return;
      }
      if (normalized.includes("access denied") || normalized.includes("approved company account")) {
        setError("Access denied. Please sign in with an approved company email.");
        return;
      }
      setError(message);
    }
  }

  async function handleGoogleSignIn() {
    setError("");
    if (!googleClientId) {
      setError("Google login is not configured. Add NEXT_PUBLIC_GOOGLE_CLIENT_ID in frontend and GOOGLE_CLIENT_ID in backend.");
      return;
    }

    const google = (window as typeof window & {
      google?: {
        accounts?: {
          oauth2?: {
            initTokenClient: (options: {
              client_id: string;
              callback: (response: { access_token?: string; error?: string }) => void;
              error_callback?: (error: { type?: string; message?: string }) => void;
              prompt?: string;
              scope: string;
            }) => {
              requestAccessToken: () => void;
            };
          };
        };
      };
    }).google;

    if (!google?.accounts?.oauth2) {
      setError("Google login is still loading. Try again in a moment.");
      return;
    }

    setIsGoogleLoading(true);
    const tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: googleClientId,
      scope: "openid email profile",
      prompt: "select_account",
      error_callback: (googleError) => {
        setIsGoogleLoading(false);
        setError(googleError.message || "Google sign-in popup was closed.");
      },
      callback: (googleResponse) => {
        void (async () => {
          try {
            if (googleResponse.error) {
              throw new Error(googleResponse.error);
            }
            if (!googleResponse.access_token) {
              throw new Error("Google did not return an access token.");
            }
            const response = await googleLogin(googleResponse.access_token, "access_token");
            storeSession(response);
            router.replace("/dashboard");
            router.refresh();
          } catch (error) {
            setIsGoogleLoading(false);
            const message = error instanceof Error ? error.message : "Google login failed.";
            const normalized = message.toLowerCase();
            if (normalized.includes("access denied") || normalized.includes("approved company account")) {
              setError("Access denied. Please sign in with an approved company email.");
              return;
            }
            setError(message);
          }
        })();
      },
    });
    tokenClient.requestAccessToken();
  }

  return (
    <motion.section
      animate={{ opacity: 1, x: 0 }}
      className="relative mx-auto flex h-full w-full max-w-[520px] items-center"
      initial={{ opacity: 0, x: 24 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className="pointer-events-none absolute -left-24 top-20 h-48 w-48 rounded-full bg-[rgba(25,201,59,0.12)] blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-16 h-52 w-52 rounded-full bg-[rgba(163,255,18,0.12)] blur-3xl" />

      <Card className="relative w-full overflow-hidden rounded-[24px] border border-white/80 bg-white/96 p-6 shadow-[0_32px_80px_rgba(7,17,26,0.12)] sm:p-7">
        <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(25,201,59,0.4),transparent)]" />
        <div className="absolute -right-16 top-0 h-40 w-40 rounded-full bg-[rgba(25,201,59,0.08)] blur-2xl" />
        <div className="absolute bottom-0 left-0 h-24 w-24 rounded-tr-[48px] bg-[rgba(163,255,18,0.08)]" />

        <div className="relative">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-[20px] border border-[#19C93B]/15 bg-[#F7F9FB] shadow-[0_18px_35px_rgba(7,17,26,0.08)]">
                <div className="relative h-10 w-10">
                  <Image alt="Naptech logo" className="object-contain" fill priority src="/logo.png" />
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#19C93B]">NAPTECH Factory OS</p>
                <h2 className="mt-2 text-[28px] font-semibold leading-none text-[#111827]">Welcome back</h2>
                <p className="mt-2 text-sm text-[#6B7280]">Sign in to continue to your plant command center.</p>
              </div>
            </div>
            <span className="hidden rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 sm:inline-flex">
              Live
            </span>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <LoginInput
              autoComplete="email"
              defaultValue="supervisor@naptech.in"
              icon={Mail}
              label="Email"
              name="email"
              placeholder="Enter your email"
              type="email"
            />
            <LoginInput
              autoComplete="current-password"
              defaultValue="password"
              icon={Lock}
              label="Password"
              name="password"
              placeholder="Enter your password"
              rightSlot={<EyeOff className="text-slate-400" size={18} />}
              type="password"
            />

            <div className="flex items-center justify-between gap-4 text-sm">
              <label className="flex items-center gap-3 text-[#6B7280]">
                <input className="h-4 w-4 rounded border-slate-300 accent-[#19C93B]" defaultChecked type="checkbox" />
                Remember me
              </label>
              <button className="font-semibold text-[#19C93B] transition hover:text-[#0f9f2d]" type="button">
                Forgot password?
              </button>
            </div>

            {error ? (
              <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </p>
            ) : null}

            <Button
              className="group h-12 w-full rounded-2xl bg-[linear-gradient(135deg,#19C93B_0%,#15b033_100%)] text-base shadow-[0_18px_32px_rgba(25,201,59,0.22)] transition hover:translate-y-[-1px] hover:opacity-100"
              disabled={isLoading}
              type="submit"
            >
              {isLoading ? "Opening dashboard..." : "Sign In"}
              <ArrowRight className="transition group-hover:translate-x-1" size={18} />
            </Button>

            <div className="flex items-center gap-4 py-1">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-sm text-slate-400">or continue with</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <button
              className="flex h-12 w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white text-[15px] font-semibold text-[#111827] shadow-[0_10px_30px_rgba(7,17,26,0.04)] transition hover:border-[#19C93B]/40 hover:bg-[#F7F9FB]"
              disabled={isGoogleLoading}
              onClick={handleGoogleSignIn}
              type="button"
            >
              <GoogleMark />
              {isGoogleLoading ? "Opening Google..." : "Sign in with Google"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-[#6B7280]">
            Need access to the workspace?{" "}
            <button className="font-semibold text-[#19C93B] transition hover:text-[#0f9f2d]" type="button">
              Contact administrator
            </button>
          </p>
        </div>
      </Card>
    </motion.section>
  );
}
