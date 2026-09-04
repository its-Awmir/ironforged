"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { showToast } from "@/components/Toast";
import { Eye, EyeOff } from "lucide-react";

export default function RegisterClient() {
  const router = useRouter();

  const [fullname, setFullname] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [goal, setGoal] = useState<string>("Muscle Building");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

  const [errors, setErrors] = useState({
    name: false,
    passwordLength: false,
    passwordMatch: false,
    emailTake: false,
  });

  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setErrors({ name: false, passwordLength: false, passwordMatch: false, emailTake: false });

    let hasError = false;
    const currentErrors = { name: false, passwordLength: false, passwordMatch: false, emailTake: false };

    if (fullname.trim() === "") {
      currentErrors.name = true;
      hasError = true;
    }
    if (password.length < 8) {
      currentErrors.passwordLength = true;
      hasError = true;
    }
    if (password !== confirmPassword) {
      currentErrors.passwordMatch = true;
      hasError = true;
    }

    if (hasError) {
      setErrors(currentErrors);
      return;
    }

    setLoading(true);
    const userData = { name: fullname.trim(), email: email.trim(), password, goal };

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });

      const text = await res.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        json = null;
      }

      if (res.ok) {
        showToast("success", "Account created successfully!");
        router.push("/login");
      } else {
        setLoading(false);
        const message = json?.message || text || "Registration failed.";
        if (message.toLowerCase().includes("email")) {
          setErrors((prev) => ({ ...prev, emailTake: true }));
        } else {
          showToast("error", message);
        }
      }
    } catch (err) {
      setLoading(false);
      console.error("Register Error:", err);
      showToast("error", "Error: Make sure the server is running!");
    }
  };

  return (
    <main
      className="relative flex min-h-screen items-center justify-center bg-bg-deep bg-cover bg-center px-4 py-10 font-sans before:absolute before:inset-0 before:bg-black/75 before:backdrop-blur-[1px]"
      style={{ backgroundImage: "url('/Pic/loginbg.jpeg')" }}
    >

      <Link
        href="/"
        aria-label="Back to home"
        className="absolute top-6 left-6 z-10 flex items-center gap-2 rounded-xl bg-black/40 border border-border px-4 py-2 text-sm text-slate-muted hover:text-slate-primary transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
        </svg>
        Back to Home
      </Link>

      <div className="relative z-10 w-full max-w-[550px] rounded-3xl bg-bg-panel/80 p-8 md:p-10 shadow-2xl border border-border/80 backdrop-blur-md">

        <div className="flex flex-col items-center text-center mb-8">
          <div className="mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/logo.svg" alt="MERIDIAN" className="h-[52px]" />
          </div>
          <h1 className="text-3xl font-black tracking-wider text-slate-primary uppercase font-slab">
            JOIN THE <span className="text-verdigris-light">LEGACY</span>
          </h1>
          <p className="mt-2 text-sm text-slate-muted">Create your athlete profile today</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label htmlFor="reg-fullname" className="text-xs font-semibold uppercase tracking-wider text-slate-muted">Full Name</label>
              <input
                id="reg-fullname"
                type="text"
                value={fullname}
                onChange={(e) => setFullname(e.target.value)}
                placeholder="John Doe"
                required
                aria-invalid={errors.name || undefined}
                className="w-full rounded-xl bg-bg-deep/60 border border-border px-4 py-3 text-sm text-slate-primary placeholder-slate-subtle focus:border-verdigris focus:outline-none transition-colors"
              />
              {errors.name && <div id="reg-name-error" className="text-xs text-brass-light font-medium" role="alert">Please enter your name.</div>}
            </div>

            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label htmlFor="reg-email" className="text-xs font-semibold uppercase tracking-wider text-slate-muted">Email Address</label>
              <input
                id="reg-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
                required
                aria-invalid={errors.emailTake || undefined}
                className="w-full rounded-xl bg-bg-deep/60 border border-border px-4 py-3 text-sm text-slate-primary placeholder-slate-subtle focus:border-verdigris focus:outline-none transition-colors"
              />
              {errors.emailTake && <div id="reg-email-error" className="text-xs text-brass-light font-medium" role="alert">This email is already registered.</div>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="reg-password" className="text-xs font-semibold uppercase tracking-wider text-slate-muted">Password</label>
              <div className="relative">
                <input
                  id="reg-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 chars"
                  required
                  aria-invalid={errors.passwordLength || undefined}
                  className="w-full rounded-xl bg-bg-deep/60 border border-border px-4 py-3 pr-12 text-sm text-slate-primary placeholder-slate-subtle focus:border-verdigris focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-muted hover:text-slate-primary transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.passwordLength && <div id="reg-password-error" className="text-xs text-brass-light font-medium" role="alert">Password must be at least 8 characters.</div>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="reg-confirm" className="text-xs font-semibold uppercase tracking-wider text-slate-muted">Confirm Password</label>
              <div className="relative">
                <input
                  id="reg-confirm"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                  required
                  aria-invalid={errors.passwordMatch || undefined}
                  className="w-full rounded-xl bg-bg-deep/60 border border-border px-4 py-3 pr-12 text-sm text-slate-primary placeholder-slate-subtle focus:border-verdigris focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  aria-pressed={showConfirmPassword}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-muted hover:text-slate-primary transition-colors"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.passwordMatch && <div id="reg-confirm-error" className="text-xs text-brass-light font-medium" role="alert">Passwords do not match.</div>}
            </div>

            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label htmlFor="reg-goal" className="text-xs font-semibold uppercase tracking-wider text-slate-muted">Primary Fitness Goal</label>
              <select
                id="reg-goal"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className="select-dark meridian-select w-full rounded-xl bg-bg-deep/60 border border-border px-4 py-3 text-sm text-slate-primary focus:border-verdigris focus:outline-none transition-colors cursor-pointer"
              >
                <option value="Muscle Building" className="bg-bg-deep text-slate-primary">Muscle Building</option>
                <option value="Weight Loss" className="bg-bg-deep text-slate-primary">Weight Loss</option>
                <option value="Endurance" className="bg-bg-deep text-slate-primary">Endurance Training</option>
                <option value="General" className="bg-bg-deep text-slate-primary">General Fitness</option>
              </select>
            </div>

          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-verdigris py-4 mt-2 text-sm font-bold uppercase tracking-wider text-slate-50 transition-all hover:bg-verdigris-dark hover:shadow-lg hover:shadow-verdigris/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "CREATING..." : "CREATE ACCOUNT"}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-muted">
          Already a member?{" "}
          <Link href="/login" className="text-verdigris-light hover:underline">
            Login here
          </Link>
        </div>

      </div>
    </main>
  );
}
