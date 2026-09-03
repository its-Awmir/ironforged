"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { showToast } from "@/components/Toast";

interface LoginResponse {
  id: string;
  name?: string;
  role?: string;
  message?: string;
}

export default function LoginClient() {
  const router = useRouter();

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [loginStatus, setLoginStatus] = useState<{
    success: boolean;
    message: string;
    userName?: string;
    userRole?: string;
  } | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password: password.trim() }),
      });

      const data: LoginResponse = await res.json();

      if (res.ok) {
        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem(
          "currentUser",
          JSON.stringify({
            id: data.id,
            name: data.name || "Athlete",
            email: email,
            role: data.role || "Member",
          })
        );

        setLoginStatus({
          success: true,
          message: "Redirecting...",
          userName: data.name,
          userRole: data.role,
        });

        const getTargetPage = (role: string = "member") => {
          const safeRole = role.trim().toLowerCase();
          if (safeRole === "admin") return "/admin-panel";
          if (safeRole === "coach") return "/coach-dashboard";
          return "/dashboard";
        };

        const targetPage = getTargetPage(data.role);

        setTimeout(() => {
          router.replace(targetPage);
        }, 1500);

      } else {
        setLoading(false);
        showToast("error", data.message || "Invalid Email or Password!");
      }
    } catch (err) {
      setLoading(false);
      console.error("Server Error:", err);
      showToast("error", "Connection Error: Server is not running.");
    }
  };

  return (
    <main
      className="relative flex min-h-screen items-center justify-center bg-bg-deep bg-cover bg-center px-4 font-sans before:absolute before:inset-0 before:bg-black/75 before:backdrop-blur-[1px]"
      style={{ backgroundImage: "url('/Pic/loginbg.jpeg')" }}
    >

      <Link
        href="/"
        aria-label="Back to home"
        className="absolute top-6 left-6 z-10 flex items-center gap-2 rounded-xl bg-black/40 border border-border px-4 py-2 text-sm text-slate-muted hover:text-slate-primary transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
        </svg>
        Back to Home
      </Link>

      <div className="relative z-10 w-full max-w-[430px] rounded-3xl bg-bg-panel/80 p-10 shadow-2xl border border-border/80 backdrop-blur-md">

        <div className="flex flex-col items-center text-center mb-8">
          <div className="mb-4">
            <img src="/img/logo.svg" alt="MERIDIAN" className="h-[52px]" />
          </div>
          <h1 className="text-3xl font-black tracking-wider text-slate-primary uppercase font-slab">
            ATHLETE <span className="text-verdigris-light">LOGIN</span>
          </h1>

          {!loginStatus ? (
            <p className="mt-2 text-sm text-slate-muted">Welcome back, Athlete!</p>
          ) : (
            <div className="mt-3 text-center">
              <span className="text-xl font-bold text-emerald-400">Welcome {loginStatus.userName}!</span>
              <br />
              <small className="text-slate-muted">Role: {loginStatus.userRole}</small>
              <br />
              <span className="text-xs text-verdigris-light animate-pulse">{loginStatus.message}</span>
            </div>
          )}
        </div>

        {!loginStatus && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-5">
              <div className="flex flex-col gap-2">
                <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-slate-muted">Email Address</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="w-full rounded-xl bg-bg-deep/60 border border-border px-4 py-3.5 text-sm text-slate-primary placeholder-slate-subtle focus:border-verdigris focus:outline-none transition-colors"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-slate-muted">Password</label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full rounded-xl bg-bg-deep/60 border border-border px-4 py-3.5 text-sm text-slate-primary placeholder-slate-subtle focus:border-verdigris focus:outline-none transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-verdigris py-4 text-sm font-bold uppercase tracking-wider text-slate-50 transition-all hover:bg-verdigris-dark hover:shadow-lg hover:shadow-verdigris/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Verifying..." : "SIGN IN"}
            </button>
          </form>
        )}

        {!loginStatus && (
          <div className="mt-6 text-center text-xs text-slate-muted">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-verdigris-light hover:underline">
              Create one here
            </Link>
          </div>
        )}

      </div>
    </main>
  );
}
