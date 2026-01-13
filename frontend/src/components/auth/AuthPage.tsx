import { FormEvent, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, CalendarDays, CheckCircle2, Hexagon, LoaderCircle } from "lucide-react";
import { useAppStore } from "@/lib/app-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AuthPage({ mode }: { mode: "login" | "register" }) {
  const navigate = useNavigate();
  const { login, register } = useAppStore();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (mode === "register" && password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setSubmitting(true);
    try {
      if (mode === "login") await login(email.trim(), password);
      else await register(displayName.trim(), email.trim(), password);
      await navigate({ to: "/" });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Authentication failed");
    } finally {
      setSubmitting(false);
    }
  }

  const registering = mode === "register";
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_.95fr]">
      <section className="relative hidden overflow-hidden border-r border-border/60 p-12 lg:flex lg:flex-col">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,color-mix(in_oklab,var(--primary)_24%,transparent),transparent_42%)]" />
        <div className="relative flex items-center gap-2">
          <Hexagon className="size-6 text-primary" />
          <span className="font-display text-xl">OmniSpace</span>
        </div>
        <div className="relative my-auto max-w-xl">
          <span className="label-mono">One campus. One schedule.</span>
          <h1 className="mt-5 font-display text-6xl leading-[1.03]">
            Make campus time and space <span className="text-primary">work together.</span>
          </h1>
          <p className="mt-6 max-w-lg text-lg text-muted-foreground">
            See your weekly routine, find an available room, request resources, and keep approvals
            moving.
          </p>
          {/* <div className="mt-10 grid gap-3 text-sm sm:grid-cols-2">
            {[
              "Live classroom availability",
              "Personal weekly schedules",
              "Clear booking status",
              "Role-aware approvals",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 text-foreground/80">
                <CheckCircle2 className="size-4 text-routine" /> {item}
              </div>
            ))}
          </div> */}
        </div>
        <div className="relative label-mono">Campus booking & schedule</div>
      </section>

      <section className="flex items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-10 flex items-center gap-2 lg:hidden">
            <Hexagon className="size-6 text-primary" />
            <span className="font-display text-xl">OmniSpace</span>
          </div>
          <div className="mb-8">
            <div className="flex size-11 items-center justify-center rounded-xl border border-primary/30 bg-primary/15">
              <CalendarDays className="size-5 text-primary" />
            </div>
            <h2 className="mt-5 font-display text-3xl">
              {registering ? "Create your account" : "Welcome back"}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {registering
                ? "Start with a student account. An admin can assign campus roles later."
                : "Sign in with your OmniSpace account to continue."}
            </p>
          </div>

          <form className="space-y-5" onSubmit={submit}>
            {registering && (
              <div className="space-y-2">
                <Label htmlFor="displayName">Full name</Label>
                <Input
                  id="displayName"
                  autoComplete="name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete={registering ? "new-password" : "current-password"}
                minLength={registering ? 8 : undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              {registering && (
                <p className="text-xs text-muted-foreground">Use at least 8 characters.</p>
              )}
            </div>
            {registering && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            )}
            {error && (
              <div
                role="alert"
                className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground"
              >
                {error}
              </div>
            )}
            <Button className="w-full" size="lg" disabled={submitting}>
              {submitting ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <ArrowRight className="size-4" />
              )}
              {submitting ? "Please wait…" : registering ? "Create account" : "Sign in"}
            </Button>
          </form>

          <p className="mt-7 text-center text-sm text-muted-foreground">
            {registering ? "Already have an account?" : "New to OmniSpace?"}{" "}
            <Link
              to={registering ? "/login" : "/register"}
              className="font-medium text-primary hover:underline"
            >
              {registering ? "Sign in" : "Create an account"}
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
