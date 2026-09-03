"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { showToast } from "@/components/Toast";

export default function RegisterPage() {
  const router = useRouter();

  const [fullname, setFullname] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [goal, setGoal] = useState<string>("Muscle Building");

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
    <div
      className="relative flex min-h-screen items-center justify-center bg-cover bg-center px-4 py-10 font-sans before:absolute before:inset-0 before:bg-black/75 before:backdrop-blur-[1px]"
      style={{ backgroundImage: "url('/Pic/loginbg.jpeg')" }}
    >

      <Link
        href="/"
        className="absolute top-6 left-6 z-10 flex items-center gap-2 rounded-xl bg-black/40 border border-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:text-white transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
        </svg>
        Back to Home
      </Link>

      <div className="relative z-10 w-full max-w-[550px] rounded-3xl bg-zinc-950/80 p-8 md:p-10 shadow-2xl border border-zinc-800/80 backdrop-blur-md">

        <div className="flex flex-col items-center text-center mb-8">
          <div className="mb-4">
            <img src="/img/logo.svg" alt="IronForged" className="h-[52px]" />
          </div>
          <h1 className="text-3xl font-black tracking-wider text-white uppercase">
            JOIN THE <span className="text-red-500">LEGACY</span>
          </h1>
          <p className="mt-2 text-sm text-zinc-400">Create your athlete profile today</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Full Name</label>
              <input
                type="text"
                value={fullname}
                onChange={(e) => setFullname(e.target.value)}
                placeholder="John Doe"
                required
                className="w-full rounded-xl bg-zinc-900/60 border border-zinc-800 px-4 py-3 text-sm text-white placeholder-zinc-600 focus:border-red-500 focus:outline-none transition-colors"
              />
              {errors.name && <div className="text-xs text-red-500 font-medium">Please enter your name.</div>}
            </div>

            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
                required
                className="w-full rounded-xl bg-zinc-900/60 border border-zinc-800 px-4 py-3 text-sm text-white placeholder-zinc-600 focus:border-red-500 focus:outline-none transition-colors"
              />
              {errors.emailTake && <div className="text-xs text-red-500 font-medium">This email is already registered.</div>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 8 chars"
                required
                className="w-full rounded-xl bg-zinc-900/60 border border-zinc-800 px-4 py-3 text-sm text-white placeholder-zinc-600 focus:border-red-500 focus:outline-none transition-colors"
              />
              {errors.passwordLength && <div className="text-xs text-red-500 font-medium">Password must be at least 8 characters.</div>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
                required
                className="w-full rounded-xl bg-zinc-900/60 border border-zinc-800 px-4 py-3 text-sm text-white placeholder-zinc-600 focus:border-red-500 focus:outline-none transition-colors"
              />
              {errors.passwordMatch && <div className="text-xs text-red-500 font-medium">Passwords do not match.</div>}
            </div>

            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Primary Fitness Goal</label>
              <select
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className="select-dark w-full rounded-xl bg-zinc-900/60 border border-zinc-800 px-4 py-3 text-sm text-white focus:border-red-500 focus:outline-none transition-colors cursor-pointer"
              >
                <option value="Muscle Building" className="bg-zinc-900 text-white">Muscle Building</option>
                <option value="Weight Loss" className="bg-zinc-900 text-white">Weight Loss</option>
                <option value="Endurance" className="bg-zinc-900 text-white">Endurance Training</option>
                <option value="General" className="bg-zinc-900 text-white">General Fitness</option>
              </select>
            </div>

          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-red-500 py-4 mt-2 text-sm font-bold uppercase tracking-wider text-white transition-all hover:bg-red-600 hover:shadow-lg hover:shadow-red-500/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "CREATING..." : "CREATE ACCOUNT"}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-zinc-400">
          Already a member?{" "}
          <Link href="/login" className="text-red-500 hover:underline">
            Login here
          </Link>
        </div>

      </div>
    </div>
  );
}
