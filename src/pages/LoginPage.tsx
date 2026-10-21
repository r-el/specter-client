import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowRight, Shield, CheckCircle2, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";
import type { CredentialResponse } from "@react-oauth/google";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, loginWithGoogle } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const username = String(form.get("username") || "").trim();
    const password = String(form.get("password") || "");

    if (!username || !password) {
      setError("Enter your username and password to continue.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await login({ username, password });
      if (result.success) {
        navigate("/");
      } else {
        setError(result.error || "Authentication failed. Check your credentials.");
      }
    } catch (err: unknown) {
      setError((err as Error)?.message || "Authentication failed. Check your credentials.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      setError("Failed to retrieve Google credentials.");
      return;
    }
    setIsSubmitting(true);
    setError("");
    try {
      const result = await loginWithGoogle(credentialResponse.credential);
      if (result.success) {
        navigate("/");
      } else {
        setError(result.error || "Google sign-in failed.");
      }
    } catch (err: unknown) {
      setError((err as Error)?.message || "Google sign-in failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12 md:px-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_12%,rgba(129,140,248,0.18),transparent_32%),radial-gradient(circle_at_88%_82%,rgba(45,212,191,0.14),transparent_34%)]" />
      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/55 shadow-[0_30px_100px_rgba(2,6,23,0.5)] backdrop-blur-2xl md:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden min-h-[620px] flex-col justify-between overflow-hidden border-r border-white/10 p-10 md:flex lg:p-14">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full border border-cyan-300/20 bg-cyan-300/10 blur-2xl" />
          <div className="relative flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-300 to-cyan-300 text-slate-950 shadow-[0_0_35px_rgba(103,232,249,0.25)]">
              <Shield className="h-5 w-5" />
            </span>
            <span className="text-sm font-semibold uppercase tracking-[0.28em] text-white/80">Specter</span>
          </div>
          <div className="relative max-w-md">
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200/75">Security intelligence</p>
            <h1 className="text-4xl font-semibold leading-tight text-white lg:text-5xl">A clearer view of what matters now.</h1>
            <p className="mt-6 max-w-sm text-base leading-7 text-slate-300">Monitor incidents, people, and camera activity from one focused command center.</p>
          </div>
          <div className="relative space-y-4">
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(74,222,128,0.8)]" />
              Systems operational
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <ShieldCheck className="h-4 w-4 text-cyan-300/80" />
              Protected operator access
            </div>
          </div>
        </section>

        <section className="flex min-h-[620px] items-center p-6 sm:p-12">
          <div className="w-full max-w-md">
            <div className="mb-10 md:hidden">
              <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-300 to-cyan-300 text-slate-950"><Shield className="h-5 w-5" /></div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200/75">Specter Command Center</p>
            </div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/[0.06] px-3 py-1.5 text-xs font-medium text-emerald-200">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Secure workspace online
            </div>
            <p className="text-sm font-medium text-cyan-200">Welcome back</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">Sign in to Specter</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">Use your operator credentials to continue to the live dashboard.</p>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              <label className="block space-y-2 text-sm font-medium text-slate-200">
                Username
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input required name="username" autoComplete="username" placeholder="operator" className="h-12 border-white/10 bg-white/[0.06] pl-10 text-white placeholder:text-slate-500 focus-visible:border-cyan-300/60 focus-visible:ring-cyan-300/20" />
                </div>
              </label>
              <label className="block space-y-2 text-sm font-medium text-slate-200">
                Password
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input required name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Enter your password" className="h-12 border-white/10 bg-white/[0.06] pl-10 pr-11 text-white placeholder:text-slate-500 focus-visible:border-cyan-300/60 focus-visible:ring-cyan-300/20" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition-colors hover:text-white">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>
              {error && <p className="text-sm text-rose-300" role="alert">{error}</p>}
              <Button type="submit" disabled={isSubmitting} className="h-12 w-full rounded-xl bg-gradient-to-r from-indigo-300 to-cyan-300 font-semibold text-slate-950 shadow-[0_12px_28px_rgba(103,232,249,0.16)] hover:from-indigo-200 hover:to-cyan-200">
                {isSubmitting ? "Opening command center..." : "Continue"}
                {!isSubmitting && <ArrowRight className="h-4 w-4" />}
              </Button>
            </form>

            {/* Google Sign-In */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-slate-950/80 px-3 font-medium text-slate-400">Or continue with</span>
              </div>
            </div>
            <div className="flex w-full justify-center">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError("Google sign-in was unsuccessful. Try again.")}
                theme="filled_black"
                shape="rectangular"
                size="large"
                width="384"
                logo_alignment="left"
              />
            </div>

            <p className="mt-7 text-center text-sm text-slate-400">
              New to Specter?{" "}
              <Link to="/register" className="font-medium text-cyan-200 transition-colors hover:text-white">
                Create an account
              </Link>
            </p>
            <p className="mt-8 text-center text-xs leading-5 text-slate-500">Access is restricted to authorized Specter operators.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
