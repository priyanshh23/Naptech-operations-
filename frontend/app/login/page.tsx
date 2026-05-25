import { Factory, Lock, Mail } from "lucide-react";

import { Button, Card } from "@/components/ui";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <Card className="w-full max-w-md border-white/10 bg-white">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
            <Factory size={26} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-950">Naptech Factory OS</h1>
            <p className="text-sm text-muted-foreground">Sign in to continue</p>
          </div>
        </div>

        <form className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-800">Email</span>
            <span className="flex h-11 items-center gap-2 rounded-md border border-border bg-white px-3">
              <Mail size={18} className="text-muted-foreground" />
              <input
                className="w-full outline-none"
                defaultValue="supervisor@naptech.in"
                name="email"
                type="email"
              />
            </span>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-800">Password</span>
            <span className="flex h-11 items-center gap-2 rounded-md border border-border bg-white px-3">
              <Lock size={18} className="text-muted-foreground" />
              <input className="w-full outline-none" defaultValue="password" name="password" type="password" />
            </span>
          </label>

          <Button className="w-full" type="submit">
            Login
          </Button>
        </form>
      </Card>
    </main>
  );
}

