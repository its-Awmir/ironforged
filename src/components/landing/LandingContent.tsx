"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ToastContainer, showToast } from "@/components/Toast";
import ConfirmModal from "@/components/ConfirmModal";
import ThemeToggle from "@/components/ThemeToggle";

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function HomePage() {
  const router = useRouter();

  const [isScrolled, setIsScrolled] = useState<boolean>(false);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [scrollWidth, setScrollWidth] = useState<string>("0%");

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [userFirstName, setUserFirstName] = useState<string>("");
  const [userRole] = useState<string>("Member");

  const [contactName, setContactName] = useState<string>("");
  const [contactEmail, setContactEmail] = useState<string>("");
  const [contactMessage, setContactMessage] = useState<string>("");
  const [isSending, setIsSending] = useState<boolean>(false);

  const [years, setYears] = useState<number>(0);
  const [members, setMembers] = useState<number>(0);
  const [facilities, setFacilities] = useState<number>(0);

  // Logout confirm modal
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    const loggedIn = localStorage.getItem("isLoggedIn") === "true";
    const userRaw = localStorage.getItem("currentUser");
    if (loggedIn && userRaw) {
      try {
        const userData: UserData = JSON.parse(userRaw);
        setIsLoggedIn(true);
        setUserFirstName((userData.name || "Athlete").split(" ")[0].toUpperCase());
      } catch { /* ignore malformed profile */ }
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = docHeight > 0 ? (window.scrollY / docHeight) * 100 : 0;
      setScrollWidth(`${scrollPercent}%`);
    };

    const animateCounters = () => {
      let currentYear = 0;
      let currentMembers = 0;
      let currentFacilities = 0;

      const timer = setInterval(() => {
        if (currentYear < 26) { currentYear += 1; setYears(currentYear); }
        if (currentMembers < 50000) { currentMembers += 1250; setMembers(currentMembers); }
        if (currentFacilities < 150) { currentFacilities += 4; setFacilities(currentFacilities); }

        if (currentYear >= 26 && currentMembers >= 50000 && currentFacilities >= 150) {
          setYears(26);
          setMembers(50000);
          setFacilities(150);
          clearInterval(timer);
        }
      }, 30);
    };

    window.addEventListener("scroll", handleScroll);
    animateCounters();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const getTargetPage = (role: string) => {
    const safeRole = (role || "member").trim().toLowerCase();
    if (safeRole === "admin") return "/admin-panel";
    if (safeRole === "coach") return "/coach-dashboard";
    return "/dashboard";
  };

  const handleGetStarted = () => {
    if (isLoggedIn) {
      router.push(getTargetPage(userRole));
    } else {
      showToast("warning", "Please login to access the Dashboard.");
      router.push("/login");
    }
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    setShowLogoutModal(false);
    localStorage.clear();
    document.cookie = "session=; path=/; max-age=0";
    setIsLoggedIn(false);
    setUserFirstName("");
    router.refresh();
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: contactName, email: contactEmail, message: contactMessage }),
      });

      if (!res.ok) throw new Error("Failed to send");

      showToast("success", "Message Sent! We will get back to you soon.");
      setContactName("");
      setContactEmail("");
      setContactMessage("");
    } catch (err) {
      console.error(err);
      showToast("error", "Could not send message. Make sure the server is running.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-slate-primary font-sans scroll-smooth">

      {/* Skip to content link for keyboard/AT users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[10000] focus:rounded-lg focus:bg-verdigris focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-slate-50"
      >
        Skip to content
      </a>

      {/* Scroll progress bar */}
      <div
        className="fixed top-0 left-0 h-[3px] bg-gradient-to-r from-verdigris to-brass z-[1001] transition-all duration-100 ease-out"
        style={{ width: scrollWidth }}
      />

      {/* Header */}
      <header className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 transition-all duration-300 ${isScrolled ? "bg-bg-deep/90 backdrop-blur-md border-b border-border py-3" : "bg-transparent py-5"}`}>
        <div className="flex items-center">
          <Link href="/">
            <Image
              src="/img/logo.svg"
              alt="MERIDIAN"
              width={36}
              height={36}
              className="h-9 w-auto md:h-10"
              priority
            />
          </Link>
        </div>

        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-expanded={isMenuOpen}
          aria-label="Toggle menu"
          className="block md:hidden text-slate-primary focus:outline-none"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <nav className={`fixed md:relative top-0 ${isMenuOpen ? "right-0" : "-right-full"} md:right-auto w-[280px] md:w-auto h-screen md:h-auto bg-bg-deep/95 md:bg-transparent backdrop-blur-lg md:backdrop-blur-none border-l border-border md:border-0 p-8 md:p-0 flex flex-col md:flex-row items-start md:items-center gap-8 md:gap-10 transition-all duration-300 z-50`}>

          <button onClick={() => setIsMenuOpen(false)} className="md:hidden self-end text-slate-muted hover:text-slate-primary text-2xl font-bold" aria-label="Close menu">&times;</button>

          <ul className="flex flex-col md:flex-row gap-6 md:gap-8 text-sm font-semibold uppercase tracking-wider text-slate-muted">
            <li><a href="#home" onClick={() => setIsMenuOpen(false)} className="hover:text-verdigris-light transition-colors" aria-label="Home">Home</a></li>
            <li><a href="#legacy" onClick={() => setIsMenuOpen(false)} className="hover:text-verdigris-light transition-colors" aria-label="Our Legacy">Our Legacy</a></li>
            <li><a href="#services" onClick={() => setIsMenuOpen(false)} className="hover:text-verdigris-light transition-colors" aria-label="Features">Features</a></li>
            <li><a href="#contact" onClick={() => setIsMenuOpen(false)} className="hover:text-verdigris-light transition-colors" aria-label="Contact">Contact</a></li>
          </ul>

          <div className="w-full md:w-auto pt-6 md:pt-0 border-t border-border md:border-0 flex flex-col md:flex-row gap-4 items-stretch md:items-center">
            <ThemeToggle />
            {isLoggedIn ? (
              <div className="flex items-center gap-4 bg-bg-panel/80 border border-border rounded-xl px-4 py-2">
                <Link href={getTargetPage(userRole)} className="text-xs font-bold text-slate-primary uppercase flex items-center gap-2 tracking-wide hover:text-verdigris-light transition-colors">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                  {userFirstName}
                </Link>
                <button type="button" onClick={handleLogout} className="text-slate-muted hover:text-verdigris-light font-bold text-lg leading-none" title="Logout" aria-label="Log out">&times;</button>
              </div>
            ) : (
              <>
                <Link href="/login" className="text-sm font-semibold uppercase tracking-wider text-slate-muted hover:text-slate-primary text-center py-2 px-4 transition-colors">Login</Link>
                <Link href="/register" className="bg-verdigris hover:bg-verdigris-dark text-slate-50 font-bold text-xs uppercase tracking-wider px-5 py-2.5 rounded-lg text-center shadow-lg shadow-verdigris/10 transition-all">Register</Link>
              </>
            )}
          </div>
        </nav>
      </header>

      <main id="main-content">
      {/* Hero Section */}
      <section
        id="home"
        aria-labelledby="hero-heading"
        className="relative w-full h-screen flex flex-col items-center justify-center text-center px-4 bg-bg-deep bg-cover bg-center overflow-hidden"
        style={{ backgroundImage: "url('/Pic/indexbg.jpeg')" }}
      >
        <div className="absolute inset-0 bg-black/70 z-0 pointer-events-none" aria-hidden="true" />

        <div className="relative z-10 flex flex-col items-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full bg-bg-panel/90 border border-border px-4 py-1.5 text-xs text-slate-muted font-medium tracking-wide mb-6">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            EST. 1998
          </div>

          <h1 id="hero-heading" className="text-5xl md:text-7xl font-bold tracking-tighter text-slate-primary uppercase mb-4 leading-none select-none font-slab">
            BUILT BY <span className="text-verdigris-light drop-shadow-[0_0_35px_rgba(82,152,133,0.4)]">PRECISION</span>
          </h1>

          <p className="max-w-xl text-slate-muted text-base md:text-lg mb-10 font-medium">
            The industrial-grade management system for elite fitness facilities.
          </p>

          <button
            onClick={handleGetStarted}
            className="group inline-flex items-center gap-2 bg-verdigris hover:bg-verdigris-dark text-slate-50 font-bold text-sm tracking-wider uppercase px-10 py-5 rounded-lg shadow-xl shadow-verdigris/20 active:scale-[0.98] transition-all cursor-pointer"
          >
            GET STARTED
            <svg className="transform group-hover:translate-x-1 transition-transform" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>
      </section>

      {/* Our Legacy */}
      <section id="legacy" aria-labelledby="legacy-heading" className="py-24 px-6 md:px-16 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center border-t border-border">
        <div className="overflow-hidden rounded-3xl border border-border shadow-2xl">
          <Image
            src="https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=800"
            alt="Gym History"
            width={800}
            height={600}
            className="w-full h-auto object-cover hover:scale-105 transition-transform duration-500"
          />
        </div>
        <div className="flex flex-col items-start">
          <span className="text-xs font-bold text-verdigris-light uppercase tracking-widest mb-3">OUR LEGACY</span>
          <h2 id="legacy-heading" className="text-3xl md:text-4xl font-black text-slate-primary uppercase tracking-tight mb-4">
            FROM GROUND UP TO A <span className="text-verdigris-light">GLOBAL</span> STANDARD
          </h2>
          <p className="text-slate-muted text-sm leading-relaxed mb-8">From a single training floor to a worldwide standard. MERIDIAN has always been about results and uncompromised precision.</p>

          <div className="grid grid-cols-3 gap-6 md:gap-10 w-full pt-6 border-t border-border">
            <div>
              <div className="text-3xl md:text-4xl font-black text-verdigris-light mb-1">{years.toLocaleString()}</div>
              <div className="text-[10px] font-bold text-slate-subtle uppercase tracking-wider">Years</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-black text-verdigris-light mb-1">{members.toLocaleString()}+</div>
              <div className="text-[10px] font-bold text-slate-subtle uppercase tracking-wider">Members</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-black text-verdigris-light mb-1">{facilities.toLocaleString()}</div>
              <div className="text-[10px] font-bold text-slate-subtle uppercase tracking-wider">Facilities</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="services" aria-labelledby="services-heading" className="py-24 bg-bg-deep px-6 md:px-12 border-t border-border">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 id="services-heading" className="text-3xl md:text-4xl font-black text-slate-primary uppercase tracking-tight">SYSTEM FEATURES</h2>
            <p className="text-slate-subtle text-xs uppercase tracking-widest mt-2">Engineered for absolute performance</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div onClick={handleGetStarted} className="group p-8 rounded-2xl bg-bg-panel/40 border border-border hover:border-verdigris/40 cursor-pointer transition-all hover:-translate-y-1">
              <div className="w-12 h-12 rounded-xl bg-bg-panel flex items-center justify-center text-verdigris-light border border-border mb-6 group-hover:bg-verdigris group-hover:text-white transition-all">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
              </div>
              <h3 className="text-lg font-bold text-slate-primary mb-2">Membership</h3>
              <p className="text-slate-muted text-sm leading-relaxed">Cloud-based member tracking and automated subscription renewals with real-time analytics.</p>
            </div>

            <div onClick={handleGetStarted} className="group p-8 rounded-2xl bg-bg-panel/40 border border-border hover:border-verdigris/40 cursor-pointer transition-all hover:-translate-y-1">
              <div className="w-12 h-12 rounded-xl bg-bg-panel flex items-center justify-center text-verdigris-light border border-border mb-6 group-hover:bg-verdigris group-hover:text-white transition-all">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /><line x1="2" y1="20" x2="22" y2="20" /></svg>
              </div>
              <h3 className="text-lg font-bold text-slate-primary mb-2">Analytics</h3>
              <p className="text-slate-muted text-sm leading-relaxed">Track your gym&apos;s growth and member retention with smart charts and AI-driven insights.</p>
            </div>

            <div onClick={handleGetStarted} className="group p-8 rounded-2xl bg-bg-panel/40 border border-border hover:border-verdigris/40 cursor-pointer transition-all hover:-translate-y-1">
              <div className="w-12 h-12 rounded-xl bg-bg-panel flex items-center justify-center text-verdigris-light border border-border mb-6 group-hover:bg-verdigris group-hover:text-white transition-all">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
              </div>
              <h3 className="text-lg font-bold text-slate-primary mb-2">Security</h3>
              <p className="text-slate-muted text-sm leading-relaxed">High-end encryption for all athlete data and facility access with 24/7 monitoring.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section id="contact" aria-labelledby="contact-heading" className="py-24 max-w-7xl mx-auto px-6 md:px-12">
        <div className="text-center mb-16">
          <h2 id="contact-heading" className="text-3xl md:text-4xl font-black text-slate-primary uppercase tracking-tight">GET IN TOUCH</h2>
          <p className="text-slate-subtle text-xs uppercase tracking-widest mt-2">We are here to answer your questions</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-12 bg-bg-panel border border-border rounded-3xl p-8 md:p-12 shadow-2xl">
          <div className="md:col-span-2 space-y-6 flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-extrabold text-slate-primary uppercase tracking-wider mb-6">CONTACT INFO</h3>
              <div className="space-y-4 text-sm text-slate-muted">
                <p className="flex items-center gap-3">
                  <svg className="text-verdigris-light shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                  1224 Muscle Blvd, Iron City, NY
                </p>
                <p className="flex items-center gap-3">
                  <svg className="text-verdigris-light shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                  +1 (555) 000-1234
                </p>
                <p className="flex items-center gap-3">
                  <svg className="text-verdigris-light shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                  support@meridian.fit
                </p>
              </div>
            </div>

            <div className="flex gap-4 pt-6 md:pt-0">
              {["Facebook", "Instagram", "Twitter"].map((network) => (
                <a key={network} href="#" className="w-11 h-11 rounded-xl border border-border flex items-center justify-center text-slate-muted hover:text-slate-primary hover:border-verdigris/40 transition-all" aria-label={network}>
                  {network === "Facebook" && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>}
                  {network === "Instagram" && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>}
                  {network === "Twitter" && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4l11.733 16h4.267l-11.733 -16zM4 20l6.768 -6.768M17.232 4.768l-6.768 6.768" /></svg>}
                </a>
              ))}
            </div>
          </div>

          <form onSubmit={handleContactSubmit} className="md:col-span-3 space-y-4">
            <div>
              <label htmlFor="contact-name" className="sr-only">Your Name</label>
              <input
                id="contact-name"
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Your Name"
                required
                className="w-full rounded-xl bg-bg-deep/60 border border-border px-4 py-3.5 text-sm text-slate-primary placeholder-slate-subtle focus:border-verdigris focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label htmlFor="contact-email" className="sr-only">Your Email</label>
              <input
                id="contact-email"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="Your Email"
                required
                className="w-full rounded-xl bg-bg-deep/60 border border-border px-4 py-3.5 text-sm text-slate-primary placeholder-slate-subtle focus:border-verdigris focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label htmlFor="contact-message" className="sr-only">Your Message</label>
              <textarea
                id="contact-message"
                rows={5}
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                placeholder="Your Message"
                required
                className="w-full rounded-xl bg-bg-deep/60 border border-border px-4 py-3.5 text-sm text-slate-primary placeholder-slate-subtle focus:border-verdigris focus:outline-none transition-colors resize-none"
              />
            </div>
            <button
              type="submit"
              disabled={isSending}
              className="w-full rounded-xl bg-verdigris py-4 font-bold uppercase text-xs text-white tracking-wider hover:bg-verdigris-dark transition-colors disabled:opacity-50"
            >
              {isSending ? "SENDING..." : "SEND MESSAGE"}
            </button>
          </form>
        </div>
      </section>
      </main>

      {/* Footer */}
      <footer className="bg-bg-deep border-t border-border py-16 px-6 md:px-12 text-xs text-slate-muted">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10 mb-12">
          <div>
            <h3 className="text-slate-primary font-black uppercase tracking-wider mb-4 text-sm">MERIDIAN</h3>
            <p className="leading-relaxed">The precision-built management system for elite fitness facilities.</p>
          </div>
          <div>
            <h3 className="text-slate-primary font-black uppercase tracking-wider mb-4 text-sm">QUICK LINKS</h3>
            <ul className="space-y-2">
              <li><a href="#home" className="hover:text-slate-primary transition-colors">Home</a></li>
              <li><a href="#services" className="hover:text-slate-primary transition-colors">Services</a></li>
              <li><a href="#contact" className="hover:text-slate-primary transition-colors">Contact</a></li>
            </ul>
          </div>
          <div>
            <h3 className="text-slate-primary font-black uppercase tracking-wider mb-4 text-sm">RESOURCES</h3>
            <ul className="space-y-2">
              <li><a href="#contact" className="hover:text-slate-primary transition-colors">Privacy Policy</a></li>
              <li><a href="#contact" className="hover:text-slate-primary transition-colors">Support Center</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto border-t border-border pt-6 text-center">
          <p>&copy; 2026 MERIDIAN. ALL RIGHTS RESERVED.</p>
        </div>
      </footer>

      {/* Logout Confirm Modal */}
      <ConfirmModal
        open={showLogoutModal}
        title="Sign Out"
        message="Are you sure you want to log out from MERIDIAN?"
        confirmLabel="Sign Out"
        cancelLabel="Stay"
        variant="danger"
        onConfirm={confirmLogout}
        onCancel={() => setShowLogoutModal(false)}
      />

      <ToastContainer />
    </div>
  );
}
