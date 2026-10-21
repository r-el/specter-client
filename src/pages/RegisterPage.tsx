import { useState } from "react";
import type { FormEvent } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Shield, Check, Eye, EyeOff, LockKeyhole, Mail, UserRound, Loader2 } from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";
import type { CredentialResponse } from "@react-oauth/google";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { REQUIRE_EMAIL_VERIFICATION } from "@/config/auth";
import { verifyCode, resendCode } from "@/services/authService";

type Step = "form" | "verify";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, loginWithGoogle } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<Step>("form");
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [resendStatus, setResendStatus] = useState("");
  const [verificationCode, setVerificationCode] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const username = String(form.get("username") || "").trim();
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");
    const confirmation = String(form.get("confirmation") || "");

    if (!username || !email || !password || !confirmation) {
      setError("Complete all fields to create your account.");
      return;
    }
    if (password.length < 8) {
      setError("Your password must contain at least 8 characters.");
      return;
    }
    if (password !== confirmation) {
      setError("The passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    setRegisteredEmail(email);
    try {
      const res = await register({ name: username, username, email, password });
      if (res.success) {
        if (REQUIRE_EMAIL_VERIFICATION) {
          setStep("verify");
        } else {
          navigate("/");
        }
      } else {
        setError(res.error || "Unable to create your account.");
      }
    } catch (registrationError: unknown) {
      setError((registrationError as Error)?.message || "Unable to create your account.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerify = async () => {
    if (verificationCode.length !== 6) {
      setError("Please enter the full 6-digit code.");
      return;
    }
    setIsSubmitting(true);
    setError("");
    try {
      const res = await verifyCode(registeredEmail, verificationCode);
      if (res.success && res.data) {
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("user", JSON.stringify(res.data.user));
        navigate("/");
      } else {
        setError(res.error || "Invalid verification code.");
      }
    } catch (err: unknown) {
      const serverMsg = axios.isAxiosError(err) ? (err.response?.data as { error?: string })?.error : undefined;
      setError(serverMsg || (err as Error)?.message || "Verification failed. Please check the code.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setResendStatus("");
    try {
      await resendCode(registeredEmail);
      setResendStatus("New 6-digit verification code sent to your email!");
    } catch (err: unknown) {
      const serverMsg = axios.isAxiosError(err) ? (err.response?.data as { error?: string })?.error : undefined;
      setError(serverMsg || (err as Error)?.message || "Failed to resend verification code.");
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
        <section className="relative hidden min-h-[680px] flex-col justify-between overflow-hidden border-r border-white/10 p-10 md:flex lg:p-14">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full border border-cyan-300/20 bg-cyan-300/10 blur-2xl" />
          <div className="relative flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-300 to-cyan-300 text-slate-950 shadow-[0_0_35px_rgba(103,232,249,0.25)]"><Shield className="h-5 w-5" /></span>
            <span className="text-sm font-semibold uppercase tracking-[0.28em] text-white/80">Specter</span>
          </div>
          <div className="relative max-w-md">
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200/75">Join the command center</p>
            <h1 className="text-4xl font-semibold leading-tight text-white lg:text-5xl">Bring every signal into focus.</h1>
            <p className="mt-6 max-w-sm text-base leading-7 text-slate-300">Create your operator profile and keep your team aligned with the live situation.</p>
          </div>
          <div className="relative space-y-3 text-xs text-slate-400">
            <p className="flex items-center gap-3"><Check className="h-4 w-4 text-cyan-300" /> Live incident awareness</p>
            <p className="flex items-center gap-3"><Check className="h-4 w-4 text-cyan-300" /> One focused operations view</p>
          </div>
        </section>

        <section className="flex min-h-[680px] items-center p-6 sm:p-12">
          <div className="w-full max-w-md">
            <div className="mb-9 md:hidden">
              <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-300 to-cyan-300 text-slate-950"><Shield className="h-5 w-5" /></div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200/75">Specter Command Center</p>
            </div>

            {step === "form" ? (
              <>
                <p className="text-sm font-medium text-cyan-200">Get started</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">Create your account</h2>
                <p className="mt-3 text-sm leading-6 text-slate-400">Set up an operator profile to access your live dashboard.</p>

                <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
                  <label className="block space-y-2 text-sm font-medium text-slate-200">
                    Username
                    <div className="relative"><UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><Input name="username" autoComplete="username" placeholder="operator_name" className="h-11 border-white/10 bg-white/[0.06] pl-10 text-white placeholder:text-slate-500" /></div>
                  </label>
                  <label className="block space-y-2 text-sm font-medium text-slate-200">
                    Email
                    <div className="relative"><Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><Input name="email" type="email" autoComplete="email" placeholder="operator@specter.io" className="h-11 border-white/10 bg-white/[0.06] pl-10 text-white placeholder:text-slate-500" /></div>
                  </label>
                  <label className="block space-y-2 text-sm font-medium text-slate-200">
                    Password
                    <div className="relative"><LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><Input name="password" type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="At least 8 characters" className="h-11 border-white/10 bg-white/[0.06] pl-10 pr-11 text-white placeholder:text-slate-500" /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition-colors hover:text-white">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>
                  </label>
                  <label className="block space-y-2 text-sm font-medium text-slate-200">
                    Confirm password
                    <div className="relative"><LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><Input name="confirmation" type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="Repeat your password" className="h-11 border-white/10 bg-white/[0.06] pl-10 text-white placeholder:text-slate-500" /></div>
                  </label>
                  {error && <p className="text-sm text-rose-300" role="alert">{error}</p>}
                  <Button type="submit" disabled={isSubmitting} className="mt-2 h-12 w-full rounded-xl bg-gradient-to-r from-indigo-300 to-cyan-300 font-semibold text-slate-950 hover:from-indigo-200 hover:to-cyan-200">
                    {isSubmitting ? "Creating account..." : "Create account"}
                    {!isSubmitting && <ArrowRight className="h-4 w-4" />}
                  </Button>
                </form>

                {/* Google Sign-In */}
                <div className="relative my-5">
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
                    text="signup_with"
                  />
                </div>

                <p className="mt-7 text-center text-sm text-slate-400">Already have an account? <Link to="/login" className="font-medium text-cyan-200 transition-colors hover:text-white">Sign in</Link></p>
              </>
            ) : (
              /* Email Verification Code Step */
              <>
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-300/15 bg-cyan-300/[0.06] px-3 py-1.5 text-xs font-medium text-cyan-200">
                  <Mail className="h-3.5 w-3.5" />
                  Verification sent
                </div>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">Verify your email</h2>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  We sent a 6-digit code to <strong className="text-white">{registeredEmail || "your email"}</strong>. Enter it below to activate your account.
                </p>

                <div className="mt-8 flex justify-center">
                  <Input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    pattern="[0-9]{6}"
                    value={verificationCode}
                    onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    aria-label="6-digit verification code"
                    className="h-14 max-w-xs text-center text-2xl font-bold tracking-[0.75em] text-white placeholder:text-slate-500"
                  />
                </div>

                {error && <p className="mt-4 text-center text-sm text-rose-300" role="alert">{error}</p>}
                {resendStatus && <p className="mt-4 text-center text-sm text-emerald-400">{resendStatus}</p>}

                <Button
                  onClick={handleVerify}
                  disabled={isSubmitting}
                  className="mt-8 h-12 w-full rounded-xl bg-gradient-to-r from-indigo-300 to-cyan-300 font-semibold text-slate-950 hover:from-indigo-200 hover:to-cyan-200"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      Verify & Continue
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>

                <p className="mt-6 text-center text-sm text-slate-400">
                  Didn't receive the code?{" "}
                  <button
                    type="button"
                    onClick={handleResend}
                    className="font-medium text-cyan-200 transition-colors hover:text-white"
                  >
                    Resend code
                  </button>
                </p>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
