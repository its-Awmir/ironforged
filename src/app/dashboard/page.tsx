"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ToastContainer, showToast } from "@/components/Toast";
import ConfirmModal from "@/components/ConfirmModal";
import Spinner from "@/components/Spinner";
import { SkeletonFullPage, SkeletonCard, SkeletonTableRows, SkeletonChatBubble } from "@/components/Skeleton";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { X, Check, Download } from "lucide-react";
import { useCyberpunkPDF } from "@/hooks/useCyberpunkPDF";
import ThemeToggle from "@/components/ThemeToggle";

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  goal?: string;
}

interface ClassItem {
  id: string;
  title: string;
  coach: string;
  time: string;
  capacity?: number;
  enrolled?: number;
  students: { id: string; name: string; email: string }[];
}

interface Message {
  id: string;
  content: string;
  type: string;
  fromName: string;
  createdAt: string;
}

interface Workout {
  id: string;
  workoutJson: { exercises: string[] };
  date: string;
  classId?: string;
  gymClass?: { className: string };
}

interface ProfileData {
  weight?: number | null;
  height?: number | null;
  age?: number | null;
  goal?: string | null;
}

interface AttendanceRecord {
  id: string;
  classId: string;
  studentId: string;
  status: string;
  date: string;
  savedAt: string;
  gymClass?: { id: string; className: string };
}

interface WeightPoint {
  id: string;
  weight: number;
  date: string;
}

interface MacrosData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastAttendance?: string;
}

interface SubscriptionData {
  id?: string;
  status: string;
  planType?: string;
  hasPrivateCoach?: boolean;
  hasMealPlan?: boolean;
  endDate?: string;
  amount?: number;
}

const MACRO_GOALS = { calories: 2500, protein: 180, carbs: 300, fat: 80 };

function RadialProgress({ value, max, color, label, unit }: { value: number; max: number; color: string; label: string; unit: string }) {
  const pct = Math.min((value / max) * 100, 100);
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-24 h-24">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
          <circle
            cx="50" cy="50" r={radius} fill="none"
            stroke={color} strokeWidth="6" strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={offset}
            style={{ transition: "none" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-black text-white">{Math.round(value)}</span>
          <span className="text-[8px] text-zinc-500 font-bold">{unit}</span>
        </div>
      </div>
      <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{label}</span>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [user, setUser] = useState<UserData | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [profileComplete, setProfileComplete] = useState(true);
  const [profileForm, setProfileForm] = useState({ weight: "", height: "", age: "", goal: "" });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUpdatingMetrics, setIsUpdatingMetrics] = useState(false);

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [individualWorkouts, setIndividualWorkouts] = useState<Workout[]>([]);
  const [groupWorkouts, setGroupWorkouts] = useState<Workout[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);

  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isClassesLoading, setIsClassesLoading] = useState(true);
  const [isMessagesLoading, setIsMessagesLoading] = useState(true);
  const [isWorkoutsLoading, setIsWorkoutsLoading] = useState(true);
  const [isAttendanceLoading, setIsAttendanceLoading] = useState(true);

  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // New feature states
  const [weightHistory, setWeightHistory] = useState<WeightPoint[]>([]);
  const [macros, setMacros] = useState<MacrosData>({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [streak, setStreak] = useState<StreakData>({ currentStreak: 0, longestStreak: 0 });
  const [subscription, setSubscription] = useState<SubscriptionData>({ status: "EXPIRED" });
  const [isWeightLoading, setIsWeightLoading] = useState(true);
  const [isMacrosLoading, setIsMacrosLoading] = useState(true);
  const [isStreakLoading, setIsStreakLoading] = useState(true);
  const [isSubLoading, setIsSubLoading] = useState(true);

  const [showMacrosModal, setShowMacrosModal] = useState(false);
  const [macrosForm, setMacrosForm] = useState({ calories: "", protein: "", carbs: "", fat: "" });
  const [isSavingMacros, setIsSavingMacros] = useState(false);

  const [showWeightModal, setShowWeightModal] = useState(false);
  const [weightInput, setWeightInput] = useState("");
  const [weightDate, setWeightDate] = useState("");
  const [isSavingWeight, setIsSavingWeight] = useState(false);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("MONTHLY");
  const [payHasCoach, setPayHasCoach] = useState(false);
  const [payHasMeal, setPayHasMeal] = useState(false);

  const [giftForm, setGiftForm] = useState({ recipientEmail: "", planType: "MONTHLY", hasPrivateCoach: false, hasMealPlan: false });
  const [isGiftProcessing, setIsGiftProcessing] = useState(false);
  const [recipientValidating, setRecipientValidating] = useState(false);
  const [recipientResult, setRecipientResult] = useState<{ status: "idle" | "valid" | "invalid"; name?: string }>({ status: "idle" });

  const { exportPDF, isGenerating: isPDFGenerating } = useCyberpunkPDF();
  const didInitialFetchRef = useRef(false);

  useEffect(() => {
    setIsMounted(true);
    const raw = localStorage.getItem("currentUser");
    if (raw) {
      try { setUser(JSON.parse(raw) as UserData); } catch { setUser(null); }
    }
    setWeightDate(new Date().toISOString().split("T")[0]);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
    if (!isLoggedIn) {
      router.replace("/login");
      return;
    }

    const role = (user?.role || "").trim().toLowerCase();
    if (role === "admin") { router.replace("/admin-panel"); return; }
    if (role === "coach") { router.replace("/coach-dashboard"); return; }
  }, [router, user]);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/user-profile");
      const json = await res.json();
      if (json.success && json.data) {
        const p = json.data as ProfileData;
        const complete = p.weight != null && p.height != null && p.age != null && p.goal != null && p.goal !== "";
        setProfileComplete(complete);
        setProfileForm({
          weight: p.weight?.toString() || "",
          height: p.height?.toString() || "",
          age: p.age?.toString() || "",
          goal: p.goal || "",
        });
      }
    } catch (err) {
      console.error("Error fetching profile", err);
    }
  }, []);

  const fetchClasses = useCallback(async () => {
    setIsClassesLoading(true);
    try {
      const res = await fetch("/api/classes");
      const json = await res.json();
      setClasses(Array.isArray(json.data) ? json.data : []);
    } catch (err) {
      console.error("Error fetching classes", err);
    } finally {
      setIsClassesLoading(false);
    }
  }, []);

  const fetchMessages = useCallback(async () => {
    setIsMessagesLoading(true);
    try {
      const res = await fetch("/api/messages");
      const json = await res.json();
      setMessages(Array.isArray(json.data) ? json.data : []);
    } catch (err) {
      console.error("Error fetching messages", err);
    } finally {
      setIsMessagesLoading(false);
    }
  }, []);

  const fetchWorkouts = useCallback(async () => {
    setIsWorkoutsLoading(true);
    try {
      const res = await fetch("/api/workouts");
      const json = await res.json();
      if (json.success && json.data) {
        setGroupWorkouts(Array.isArray(json.data.groupWorkouts) ? json.data.groupWorkouts : []);
        setIndividualWorkouts(Array.isArray(json.data.individualWorkouts) ? json.data.individualWorkouts : []);
      }
    } catch (err) {
      console.error("Error fetching workouts", err);
    } finally {
      setIsWorkoutsLoading(false);
    }
  }, []);

  const fetchAttendance = useCallback(async () => {
    setIsAttendanceLoading(true);
    try {
      const res = await fetch("/api/attendance");
      const json = await res.json();
      setAttendanceRecords(Array.isArray(json.data) ? json.data : []);
    } catch (err) {
      console.error("Error fetching attendance", err);
    } finally {
      setIsAttendanceLoading(false);
    }
  }, []);

  const fetchWeightHistory = useCallback(async () => {
    setIsWeightLoading(true);
    try {
      const res = await fetch("/api/progress/weight");
      const json = await res.json();
      setWeightHistory(json.success ? json.data || [] : []);
    } catch { /* */ } finally { setIsWeightLoading(false); }
  }, []);

  const fetchMacros = useCallback(async () => {
    setIsMacrosLoading(true);
    try {
      const res = await fetch("/api/progress/macros");
      const json = await res.json();
      if (json.success && json.data) setMacros(json.data);
    } catch { /* */ } finally { setIsMacrosLoading(false); }
  }, []);

  const fetchStreak = useCallback(async () => {
    setIsStreakLoading(true);
    try {
      const res = await fetch("/api/progress/streak");
      const json = await res.json();
      if (json.success && json.data) setStreak(json.data);
    } catch { /* */ } finally { setIsStreakLoading(false); }
  }, []);

  const fetchSubscription = useCallback(async () => {
    setIsSubLoading(true);
    try {
      const res = await fetch("/api/subscription");
      const json = await res.json();
      if (json.success && json.data) setSubscription(json.data);
    } catch { /* */ } finally { setIsSubLoading(false); }
  }, []);

  useEffect(() => {
    if (!user || didInitialFetchRef.current) return;
    didInitialFetchRef.current = true;
    setIsLoadingData(true);
    Promise.all([
      fetchProfile(), fetchClasses(), fetchMessages(), fetchWorkouts(), fetchAttendance(),
      fetchWeightHistory(), fetchMacros(), fetchStreak(), fetchSubscription(),
    ]).finally(() => setIsLoadingData(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const submitProfile = async () => {
    const { weight, height, age, goal } = profileForm;
    if (!weight || !height || !age || !goal) { showToast("warning", "Please fill in all fields."); return; }
    setIsSavingProfile(true);
    try {
      const res = await fetch("/api/user-profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ weight: parseFloat(weight), height: parseFloat(height), age: parseInt(age), goal }) });
      if (res.ok) {
        const json = await res.json();
        const data = json.data;
        showToast("success", "Profile completed! Welcome aboard.");
        setProfileComplete(true);
        setProfileForm({ weight: data.weight?.toString() || weight, height: data.height?.toString() || height, age: data.age?.toString() || age, goal: data.goal || goal });
        const updated = { ...user!, goal: data.goal || goal };
        setUser(updated);
        localStorage.setItem("currentUser", JSON.stringify(updated));
        fetchAttendance();
      } else {
        const err = await res.json().catch(() => null);
        showToast("error", err?.message || "Failed to save profile.");
      }
    } catch { showToast("error", "Network error."); } finally { setIsSavingProfile(false); }
  };

  const updateMetrics = async () => {
    const { weight, height, age, goal } = profileForm;
    if (!weight || !height || !age || !goal) { showToast("warning", "Please fill in all fields."); return; }
    setIsUpdatingMetrics(true);
    try {
      const res = await fetch("/api/user-profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ weight: parseFloat(weight), height: parseFloat(height), age: parseInt(age), goal }) });
      if (res.ok) {
        const json = await res.json();
        const data = json.data;
        showToast("success", "Metrics updated successfully.");
        setProfileForm({ weight: data.weight?.toString() || weight, height: data.height?.toString() || height, age: data.age?.toString() || age, goal: data.goal || goal });
        const updated = { ...user!, goal: data.goal || goal };
        setUser(updated);
        localStorage.setItem("currentUser", JSON.stringify(updated));
      } else { showToast("error", "Failed to update metrics."); }
    } catch { showToast("error", "Network error."); } finally { setIsUpdatingMetrics(false); }
  };

  const saveWeight = async () => {
    const w = parseFloat(weightInput);
    if (isNaN(w) || w <= 0) { showToast("warning", "Enter a valid weight."); return; }
    setIsSavingWeight(true);
    try {
      const res = await fetch("/api/progress/weight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weight: w, userId: user?.id, date: weightDate }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        showToast("success", "Weight logged!");
        setShowWeightModal(false);
        setWeightInput("");
        setProfileForm((p) => ({ ...p, weight: String(w) }));
        fetchWeightHistory();
      } else {
        showToast("error", json.message || "Failed to log weight.");
      }
    } catch { showToast("error", "Network error. Please try again."); } finally { setIsSavingWeight(false); }
  };

  const saveMacros = async () => {
    setIsSavingMacros(true);
    try {
      const res = await fetch("/api/progress/macros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          calories: parseFloat(macrosForm.calories) || 0,
          protein: parseFloat(macrosForm.protein) || 0,
          carbs: parseFloat(macrosForm.carbs) || 0,
          fat: parseFloat(macrosForm.fat) || 0,
          userId: user?.id,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        showToast("success", "Nutrition updated!");
        setShowMacrosModal(false);
        fetchMacros();
      } else {
        showToast("error", json.message || "Failed to save nutrition.");
      }
    } catch { showToast("error", "Network error."); } finally { setIsSavingMacros(false); }
  };

  const PLAN_PRICES: Record<string, number> = { DAILY: 1.99, WEEKLY: 9.99, MONTHLY: 29.99, SIX_MONTH: 149.99, YEARLY: 249.99 };
  const PLAN_LABELS: Record<string, string> = { DAILY: "Daily Pass", WEEKLY: "Weekly Pass", MONTHLY: "Monthly", SIX_MONTH: "6-Month", YEARLY: "Yearly" };
  const PLAN_DAYS_LABEL: Record<string, string> = { DAILY: "1 day", WEEKLY: "7 days", MONTHLY: "30 days", SIX_MONTH: "180 days", YEARLY: "365 days" };

  const paymentTotal = (PLAN_PRICES[selectedPlan] || 0) + (payHasCoach ? 50 : 0) + (payHasMeal ? 20 : 0);

  const processPayment = async () => {
    setIsProcessingPayment(true);
    try {
      const res = await fetch("/api/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planType: selectedPlan, hasPrivateCoach: payHasCoach, hasMealPlan: payHasMeal, amount: paymentTotal }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        showToast("success", "Payment successful! Membership activated.");
        setShowPaymentModal(false);
        fetchSubscription();
      } else {
        showToast("error", json.message || "Payment failed.");
      }
    } catch { showToast("error", "Network error."); } finally { setIsProcessingPayment(false); }
  };

  const validateRecipientEmail = async (email: string) => {
    if (!email.trim()) { setRecipientResult({ status: "idle" }); return; }
    setRecipientValidating(true);
    try {
      const res = await fetch(`/api/users?email=${encodeURIComponent(email.trim())}`);
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        setRecipientResult({ status: "valid", name: json.data.name });
      } else {
        setRecipientResult({ status: "invalid" });
      }
    } catch {
      setRecipientResult({ status: "invalid" });
    } finally {
      setRecipientValidating(false);
    }
  };

  const processGiftPurchase = async () => {
    if (!giftForm.recipientEmail.trim()) { showToast("warning", "Please enter a recipient email."); return; }
    setIsGiftProcessing(true);
    try {
      const res = await fetch("/api/subscriptions/purchase-gift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientEmail: giftForm.recipientEmail.trim(),
          planType: giftForm.planType,
          hasPrivateCoach: giftForm.hasPrivateCoach,
          hasMealPlan: giftForm.hasMealPlan,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        showToast("success", json.message || "Gift subscription activated successfully! 🎉");
        setGiftForm({ recipientEmail: "", planType: "MONTHLY", hasPrivateCoach: false, hasMealPlan: false });
        setRecipientResult({ status: "idle" });
      } else {
        showToast("error", json.message || "Failed to process gift.");
      }
    } catch { showToast("error", "Network error."); } finally { setIsGiftProcessing(false); }
  };

  const getBMI = (): string => {
    const w = parseFloat(profileForm.weight);
    const h = parseFloat(profileForm.height);
    if (!w || !h || h <= 0) return "N/A";
    const heightM = h > 3 ? h / 100 : h;
    return (w / (heightM * heightM)).toFixed(1);
  };

  const getDisplayHeight = (): string => {
    const h = parseFloat(profileForm.height);
    if (!h || h <= 0) return "\u2014";
    return h > 3 ? String(Math.round(h)) : String(Math.round(h * 100));
  };

  const getBMICategory = (): { label: string; color: string } => {
    const bmi = parseFloat(getBMI());
    if (isNaN(bmi)) return { label: "", color: "" };
    if (bmi < 18.5) return { label: "Underweight", color: "text-amber-400" };
    if (bmi < 25) return { label: "Normal", color: "text-emerald-400" };
    if (bmi < 30) return { label: "Overweight", color: "text-amber-400" };
    return { label: "Obese", color: "text-red-400" };
  };

  const getAttendanceRate = (): string => {
    if (attendanceRecords.length === 0) return "N/A";
    const presentCount = attendanceRecords.filter((r) => r.status === "PRESENT").length;
    return `${Math.round((presentCount / attendanceRecords.length) * 100)}%`;
  };

  const handleLogout = () => setShowLogoutModal(true);

  const confirmLogout = () => {
    setShowLogoutModal(false);
    localStorage.clear();
    document.cookie = "session=; path=/; max-age=0";
    router.replace("/login");
  };

  const firstName = (user?.name || "Athlete").split(" ")[0].toUpperCase();

  const chartData = weightHistory.map((p) => ({
    date: new Date(p.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
    weight: p.weight,
  }));

  const currentWeight = parseFloat(profileForm.weight) || 0;
  const goalWeight = 75;
  const goalProgress = currentWeight > 0 ? Math.min(Math.round((1 - Math.abs(currentWeight - goalWeight) / goalWeight) * 100), 100) : 0;
  const donutData = [
    { name: "Progress", value: Math.max(goalProgress, 5) },
    { name: "Remaining", value: 100 - Math.max(goalProgress, 5) },
  ];

  const subEndDate = subscription.endDate ? new Date(subscription.endDate) : null;
  const [subDaysLeft, setSubDaysLeft] = useState(0);

  useEffect(() => {
    if (subscription.endDate) {
      const end = new Date(subscription.endDate);
      setSubDaysLeft(Math.max(0, Math.ceil((end.getTime() - Date.now()) / 86400000)));
    } else {
      setSubDaysLeft(0);
    }
  }, [subscription.endDate]);

  if (!user) return <SkeletonFullPage message="Loading Dashboard..." />;

  const bmi = getBMI();
  const bmiCat = getBMICategory();
  const attendanceRate = getAttendanceRate();

  const statusConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
    PRESENT: { label: "Present", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
    ABSENT: { label: "Absent", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
    LATE: { label: "Late", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  };

  const allWorkouts = [...individualWorkouts, ...groupWorkouts];

  return (
    <div className="dash-root min-h-screen bg-[var(--dash-bg)] text-[var(--dash-text)] flex font-sans overflow-x-hidden antialiased selection:bg-red-500 selection:text-white relative print-layout">

      <div className="fixed top-[-10%] right-[-10%] w-[500px] h-[500px] bg-red-900/10 rounded-full blur-[160px] pointer-events-none z-0 no-print" />

      {!profileComplete && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-[var(--dash-panel)] border border-[var(--dash-border)] rounded-2xl p-6 lg:p-8 w-full max-w-md space-y-5 animate-fadeIn">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-red-400"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
              </div>
              <h2 className="text-lg font-black text-white uppercase tracking-wider">Complete Your Profile</h2>
              <p className="text-xs text-zinc-500">Please provide your physical metrics to unlock the dashboard.</p>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Weight (kg)</label><input type="number" value={profileForm.weight} onChange={(e) => setProfileForm({ ...profileForm, weight: e.target.value })} className="w-full bg-[var(--dash-field)] border border-[var(--dash-border)] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-red-500" placeholder="75" /></div>
                <div><label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Height (cm)</label><input type="number" value={profileForm.height} onChange={(e) => setProfileForm({ ...profileForm, height: e.target.value })} className="w-full bg-[var(--dash-field)] border border-[var(--dash-border)] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-red-500" placeholder="175" /></div>
              </div>
              <div><label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Age</label><input type="number" value={profileForm.age} onChange={(e) => setProfileForm({ ...profileForm, age: e.target.value })} className="w-full bg-[var(--dash-field)] border border-[var(--dash-border)] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-red-500" placeholder="25" /></div>
              <div><label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Fitness Goal</label>
                <select value={profileForm.goal} onChange={(e) => setProfileForm({ ...profileForm, goal: e.target.value })} className="select-dark w-full bg-[var(--dash-field)] border border-[var(--dash-border)] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-transparent">
                  <option value="">Select your goal</option>
                  <option value="Lose Weight">Lose Weight</option><option value="Build Muscle">Build Muscle</option><option value="Improve Endurance">Improve Endurance</option><option value="General Fitness">General Fitness</option><option value="Athletic Performance">Athletic Performance</option><option value="Rehabilitation">Rehabilitation</option>
                </select>
              </div>
            </div>
            <button onClick={submitProfile} disabled={isSavingProfile} className="w-full px-5 py-3 bg-red-500 hover:bg-red-600 rounded-xl text-sm font-black uppercase text-white tracking-wider transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {isSavingProfile && <Spinner />} {isSavingProfile ? "Saving..." : "Complete Profile & Unlock Dashboard"}
            </button>
          </div>
        </div>
      )}

      {isMobileMenuOpen && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden no-print" onClick={() => setIsMobileMenuOpen(false)} aria-hidden="true" />}

      <aside aria-label="Dashboard navigation" className={`w-64 border-r border-[var(--dash-divider)] bg-[var(--dash-panel)]/95 lg:bg-[var(--dash-panel)]/80 backdrop-blur-xl p-6 flex flex-col justify-between fixed h-screen z-40 lg:z-30 transition-transform duration-300 ease-in-out no-print ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div>
          <div className="mb-10 pl-2 flex items-center justify-between">
            <Link href="/">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/img/logo.svg" alt="IronForged" className="h-9 hover:opacity-80 transition-opacity" />
            </Link>
            <button onClick={() => setIsMobileMenuOpen(false)} aria-label="Close menu" className="lg:hidden text-zinc-400 hover:text-white"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>
          </div>
          <nav className="space-y-1.5">
            {[
              { id: "overview", label: "Overview", icon: "overview" },
              { id: "workouts", label: "Workouts", icon: "workouts" },
              { id: "attendance", label: "Attendance", icon: "attendance" },
              { id: "messages", label: "Messages", icon: "messages" },
            ].map((tab) => (
              <button key={tab.id} onClick={() => { setActiveTab(tab.id); setIsMobileMenuOpen(false); }}
                aria-current={activeTab === tab.id ? "page" : undefined}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all relative ${activeTab === tab.id ? "bg-gradient-to-r from-zinc-900 to-zinc-900/50 text-red-500 border border-[var(--dash-border)] shadow-inner" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/30"}`}>
                {activeTab === tab.id && <span className="absolute left-0 w-[3px] h-5 bg-red-500 rounded-r-full shadow-[0_0_10px_rgba(239,68,68,0.7)]" aria-hidden="true" />}
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  {tab.icon === "overview" && <><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></>}
                  {tab.icon === "workouts" && <><path d="M6.5 6.5 11 11M13 13l4.5 4.5" /><path d="M11 11 8 8a2.83 2.83 0 0 1 0-4l4-4 4 4-4 4" /><path d="m13 13 3 3a2.83 2.83 0 0 1 0 4l-4 4-4-4 4-4" /></>}
                  {tab.icon === "attendance" && <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><polyline points="16 11 18 13 22 9" /></>}
                  {tab.icon === "messages" && <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />}
                </svg>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="border-t border-[var(--dash-divider)] pt-4">
          <button onClick={handleLogout} aria-label="Log out" className="w-full text-left text-zinc-500 hover:text-red-400 font-bold text-[11px] uppercase tracking-wider px-4 py-2 rounded-xl transition-colors">Log Out</button>
        </div>
      </aside>

      <main className="flex-1 w-full lg:pl-64 min-h-screen flex flex-col z-10 relative">
        <header className="px-4 lg:px-8 pt-6 lg:pt-8 pb-4 border-b border-[var(--dash-divider)] no-print">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setIsMobileMenuOpen(true)} aria-label="Open menu" className="lg:hidden p-2 bg-zinc-900 border border-[var(--dash-border)] rounded-xl text-zinc-300 hover:text-white transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
              </button>
              <div>
                <h1 className="text-lg lg:text-2xl font-black uppercase tracking-wider text-white">
                  WELCOME, <span className="text-red-500">{firstName}</span>
                  {!isStreakLoading && streak.currentStreak > 0 && (
                    <span className="ml-3 text-sm lg:text-base text-orange-400" title={`${streak.currentStreak} day streak!`}>
                      🔥 {streak.currentStreak}
                    </span>
                  )}
                </h1>
                <p className="text-[9px] lg:text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">YOUR FITNESS DASHBOARD</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-[8px] lg:text-[9px] font-black tracking-widest text-emerald-400 uppercase px-2.5 py-1.5 rounded-xl">
                ACTIVE
              </div>
            </div>
          </div>
        </header>

        <div className="p-4 lg:p-8 flex-1 space-y-6 print-content">

          {activeTab === "overview" && (
            <div className="space-y-6 animate-fadeIn">
              {profileComplete && (
                <>
                  {isLoadingData ? (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}</div>
                  ) : (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="premium-glow-card rounded-2xl p-4"><div className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Weight</div><div className="text-2xl font-black text-white">{profileForm.weight || "\u2014"} <span className="text-xs text-zinc-500">kg</span></div></div>
                      <div className="premium-glow-card rounded-2xl p-4"><div className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Height</div><div className="text-2xl font-black text-white">{getDisplayHeight()} <span className="text-xs text-zinc-500">cm</span></div></div>
                      <div className="premium-glow-card rounded-2xl p-4"><div className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">BMI</div><div className="text-2xl font-black text-white">{bmi} <span className={`text-xs font-bold ${bmiCat.color}`}>{bmiCat.label}</span></div></div>
                      <div className="premium-glow-card rounded-2xl p-4"><div className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Goal</div><div className="text-sm font-black text-red-400">{profileForm.goal || "General Fitness"}</div></div>
                      <div className="premium-glow-card rounded-2xl p-4"><div className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Enrolled Classes</div><div className="text-2xl font-black text-white">{classes.length}</div></div>
                      <div className="premium-glow-card rounded-2xl p-4"><div className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Attendance Rate</div><div className="text-2xl font-black text-emerald-400">{attendanceRate}</div></div>
                      <div className="premium-glow-card rounded-2xl p-4 cursor-pointer group" onClick={() => setShowWeightModal(true)}>
                        <div className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Workout Streak</div>
                        <div className="text-2xl font-black text-orange-400 group-hover:text-orange-300 transition-colors">
                          {isStreakLoading ? <span className="text-sm text-zinc-500">Loading...</span> : <>{streak.currentStreak} 🔥</>}
                        </div>
                        <div className="text-[9px] text-zinc-600 mt-0.5">Best: {streak.longestStreak} days</div>
                      </div>
                      <div className="premium-glow-card rounded-2xl p-4">
                        <div className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Subscription</div>
                        {isSubLoading ? (
                          <div className="h-5 w-16 bg-zinc-800/60 animate-pulse rounded mt-1" />
                        ) : subscription.status === "ACTIVE" ? (
                          <div>
                            <div className="text-sm font-black text-emerald-400">ACTIVE</div>
                            <div className="text-[9px] text-zinc-500 mt-0.5">{PLAN_LABELS[subscription.planType || "MONTHLY"]} &bull; {subDaysLeft} days left</div>
                            {(subscription.hasPrivateCoach || subscription.hasMealPlan) && (
                              <div className="flex gap-1.5 mt-1.5">
                                {subscription.hasPrivateCoach && <span className="text-[8px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded">Coach</span>}
                                {subscription.hasMealPlan && <span className="text-[8px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">Meal Plan</span>}
                              </div>
                            )}
                          </div>
                        ) : (
                          <button onClick={() => setShowPaymentModal(true)} className="text-[10px] font-black text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-lg hover:bg-red-500/20 transition-colors no-print">Renew</button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Weight Progress Chart + Nutrition wrapper for PDF */}
                  <div id="progress-report-container" className="space-y-6" style={{ backgroundColor: "var(--dash-bg)", color: "var(--dash-text)" }}>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      <div className="lg:col-span-2 premium-glow-card rounded-2xl p-4 lg:p-6 space-y-3">
                        <div className="flex justify-between items-center border-b border-[var(--dash-divider)] pb-3">
                          <h2 className="text-xs font-black text-white uppercase tracking-widest">WEIGHT PROGRESS</h2>
                          <div className="flex items-center gap-2 no-print">
                            <button onClick={() => exportPDF("progress-report-container", { filename: `${(user?.name || "Member").replace(/\s+/g, "-")}-Progress-Report` })} disabled={isPDFGenerating} className="text-[9px] font-black text-purple-400 bg-purple-500/10 border border-purple-500/20 px-3 py-1 rounded-lg hover:bg-purple-500/20 transition-colors flex items-center gap-1.5 disabled:opacity-50">
                              {isPDFGenerating ? <Spinner /> : <Download size={11} />}
                              {isPDFGenerating ? "Exporting..." : "Download PDF"}
                            </button>
                            <button onClick={() => { setWeightInput(profileForm.weight || ""); setWeightDate(new Date().toISOString().split("T")[0]); setShowWeightModal(true); }} className="text-[9px] font-black text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-lg hover:bg-red-500/20 transition-colors">Log Weight</button>
                          </div>
                        </div>
                        {isWeightLoading ? (
                          <div className="h-48 bg-zinc-800/30 animate-pulse rounded-xl" />
                        ) : chartData.length > 1 ? (
                          <div className="h-48">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={chartData}>
                                <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#71717a" }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 9, fill: "#71717a" }} axisLine={false} tickLine={false} domain={["dataMin - 2", "dataMax + 2"]} width={35} />
                                <Tooltip contentStyle={{ backgroundColor: "#121216", border: "1px solid #27272a", borderRadius: 12, fontSize: 11, color: "#f4f4f5" }} labelStyle={{ color: "#a1a1aa" }} />
                                <Line type="monotone" dataKey="weight" stroke="#ef4444" strokeWidth={2.5} dot={{ fill: "#ef4444", r: 3, strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 2, stroke: "#070709" }} isAnimationActive={false} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        ) : (
                          <div className="h-48 flex items-center justify-center text-xs text-zinc-600">Log at least 2 weight entries to see your progress chart.</div>
                        )}
                      </div>

                      <div className="premium-glow-card rounded-2xl p-4 lg:p-6 space-y-3">
                        <h2 className="text-xs font-black text-white uppercase tracking-widest border-b border-[var(--dash-divider)] pb-3">GOAL PROGRESS</h2>
                        {isWeightLoading ? (
                          <div className="h-48 bg-zinc-800/30 animate-pulse rounded-xl" />
                        ) : (
                          <div className="h-48 flex flex-col items-center justify-center">
                            <ResponsiveContainer width={140} height={140}>
                              <PieChart>
                                <Pie data={donutData} cx="50%" cy="50%" innerRadius={42} outerRadius={58} dataKey="value" startAngle={90} endAngle={-270} strokeWidth={0} isAnimationActive={false}>
                                  <Cell fill="#ef4444" />
                                  <Cell fill="#27272a" />
                                </Pie>
                              </PieChart>
                            </ResponsiveContainer>
                            <div className="text-center -mt-2">
                              <div className="text-xl font-black text-white">{goalProgress}%</div>
                              <div className="text-[9px] text-zinc-500 font-bold">to goal ({goalWeight}kg)</div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Daily Nutrition */}
                    <div className="premium-glow-card rounded-2xl p-4 lg:p-6 space-y-4">
                      <div className="flex justify-between items-center border-b border-[var(--dash-divider)] pb-3">
                        <h2 className="text-xs font-black text-white uppercase tracking-widest">DAILY NUTRITION</h2>
                        <button onClick={() => { setMacrosForm({ calories: String(macros.calories || ""), protein: String(macros.protein || ""), carbs: String(macros.carbs || ""), fat: String(macros.fat || "") }); setShowMacrosModal(true); }} className="text-[9px] font-black text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-lg hover:bg-red-500/20 transition-colors no-print">Update</button>
                      </div>
                      {isMacrosLoading ? (
                        <div className="flex justify-center gap-8 py-6">
                          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="w-24 h-24 bg-zinc-800/30 animate-pulse rounded-full" />)}
                        </div>
                      ) : (
                        <div className="flex flex-wrap justify-center gap-6 lg:gap-10">
                          <RadialProgress value={macros.calories} max={MACRO_GOALS.calories} color="#ef4444" label="Calories" unit="kcal" />
                          <RadialProgress value={macros.protein} max={MACRO_GOALS.protein} color="#22d3ee" label="Protein" unit="g" />
                          <RadialProgress value={macros.carbs} max={MACRO_GOALS.carbs} color="#facc15" label="Carbs" unit="g" />
                          <RadialProgress value={macros.fat} max={MACRO_GOALS.fat} color="#a78bfa" label="Fat" unit="g" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Gift a Friend */}
                  <div onMouseMove={(e) => { const c = e.currentTarget; const r = c.getBoundingClientRect(); c.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`); c.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`); }} className="premium-glow-card rounded-2xl p-4 lg:p-6 space-y-4">
                    <h2 className="text-xs font-black text-white uppercase tracking-widest border-b border-[var(--dash-divider)] pb-3">UPDATE PHYSICAL METRICS</h2>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="space-y-1"><label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Weight (kg)</label><input type="number" value={profileForm.weight} onChange={(e) => setProfileForm({ ...profileForm, weight: e.target.value })} className="w-full bg-[var(--dash-field)] border border-[var(--dash-border)] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500" placeholder="75" /></div>
                      <div className="space-y-1"><label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Height (cm)</label><input type="number" value={profileForm.height} onChange={(e) => setProfileForm({ ...profileForm, height: e.target.value })} className="w-full bg-[var(--dash-field)] border border-[var(--dash-border)] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500" placeholder="175" /></div>
                      <div className="space-y-1"><label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Age</label><input type="number" value={profileForm.age} onChange={(e) => setProfileForm({ ...profileForm, age: e.target.value })} className="w-full bg-[var(--dash-field)] border border-[var(--dash-border)] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500" placeholder="25" /></div>
                      <div className="space-y-1"><label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Fitness Goal</label>
                        <select value={profileForm.goal} onChange={(e) => setProfileForm({ ...profileForm, goal: e.target.value })} className="select-dark w-full bg-[var(--dash-field)] border border-[var(--dash-border)] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-transparent">
                          <option value="">Select goal</option>
                          <option value="Lose Weight">Lose Weight</option><option value="Build Muscle">Build Muscle</option><option value="Improve Endurance">Improve Endurance</option><option value="General Fitness">General Fitness</option><option value="Athletic Performance">Athletic Performance</option><option value="Rehabilitation">Rehabilitation</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end pt-1">
                      <button onClick={updateMetrics} disabled={isUpdatingMetrics} className="px-5 py-2 bg-red-500 hover:bg-red-600 rounded-xl text-xs font-black uppercase text-white tracking-wider transition-colors disabled:opacity-50 flex items-center gap-2 no-print">{isUpdatingMetrics && <Spinner />}{isUpdatingMetrics ? "Saving..." : "Update Metrics"}</button>
                    </div>
                  </div>

                  <div className="premium-glow-card rounded-2xl p-4 lg:p-6 space-y-3">
                    <h2 className="text-xs font-black text-white uppercase tracking-widest border-b border-[var(--dash-divider)] pb-3">MY CLASSES</h2>
                    <div className="w-full overflow-x-auto block">
                      <table className="w-full text-left text-xs min-w-[500px]" aria-label="My classes">
                        <thead><tr className="text-[9px] uppercase font-black text-zinc-500 tracking-widest border-b border-zinc-900 pb-3"><th scope="col" className="pb-2">Class</th><th scope="col" className="pb-2">Instructor</th><th scope="col" className="pb-2">Schedule</th><th scope="col" className="pb-2">Status</th></tr></thead>
                        <tbody className="divide-y divide-[var(--dash-divider)] text-zinc-300">
                          {isClassesLoading ? <SkeletonTableRows rows={4} cols={4} /> : classes.length > 0 ? classes.map((c) => (
                            <tr key={c.id} className="hover:bg-zinc-900/10 transition-colors"><td className="py-3 font-black text-white">{c.title}</td><td className="py-3 text-zinc-400">{c.coach}</td><td className="py-3 text-zinc-400">{c.time}</td><td className="py-3"><span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 font-black uppercase tracking-wider">ENROLLED</span></td></tr>
                          )) : <tr><td colSpan={4} className="py-6 text-center text-zinc-600">No classes enrolled yet.</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Gift a Friend */}
                  <div className="premium-glow-card rounded-2xl p-4 lg:p-6 space-y-4">
                    <div className="border-b border-[var(--dash-divider)] pb-3">
                      <h2 className="text-xs font-black text-white uppercase tracking-widest">GIFT A FRIEND</h2>
                      <p className="text-[10px] text-zinc-500 font-bold mt-1">Purchase a subscription plan for another member.</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Left: Recipient + Plan */}
                      <div className="space-y-3">
                        <div>
                          <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Recipient Email</label>
                          <div className="relative">
                            <input
                              type="email"
                              value={giftForm.recipientEmail}
                              onChange={(e) => { setGiftForm(f => ({ ...f, recipientEmail: e.target.value })); setRecipientResult({ status: "idle" }); }}
                              onBlur={(e) => validateRecipientEmail(e.target.value)}
                              placeholder="Enter friend's email address..."
                              disabled={isGiftProcessing}
                              className="w-full bg-[var(--dash-field)] border border-cyan-500/30 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 placeholder:text-zinc-700 disabled:opacity-50 transition-colors"
                            />
                            {recipientValidating && (
                              <div className="absolute right-3 top-1/2 -translate-y-1/2"><Spinner /></div>
                            )}
                            {!recipientValidating && recipientResult.status === "valid" && (
                              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400"><Check size={14} /></div>
                            )}
                            {!recipientValidating && recipientResult.status === "invalid" && (
                              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-400"><X size={14} /></div>
                            )}
                          </div>
                          {recipientResult.status === "valid" && recipientResult.name && (
                            <div className="text-[10px] text-emerald-400 mt-1 font-bold">Found: {recipientResult.name}</div>
                          )}
                          {recipientResult.status === "invalid" && giftForm.recipientEmail.trim() && (
                            <div className="text-[10px] text-red-400 mt-1 font-bold">No account found with this email.</div>
                          )}
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Gift Plan</label>
                          <select
                            value={giftForm.planType}
                            onChange={(e) => setGiftForm(f => ({ ...f, planType: e.target.value }))}
                            disabled={isGiftProcessing}
                            className="select-dark w-full bg-[var(--dash-field)] border border-[var(--dash-border)] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-transparent disabled:opacity-50"
                          >
                            <option value="DAILY">Daily Pass (1 day) — $1.99</option>
                            <option value="WEEKLY">Weekly Pass (7 days) — $9.99</option>
                            <option value="MONTHLY">Monthly (30 days) — $29.99</option>
                            <option value="SIX_MONTH">6-Month (180 days) — $149.99</option>
                            <option value="YEARLY">Yearly (365 days) — $249.99</option>
                          </select>
                        </div>
                      </div>

                      {/* Right: Addons + Total */}
                      <div className="space-y-3">
                        <div>
                          <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-2">Add-ons</label>
                          <div className="space-y-2">
                            <button onClick={() => setGiftForm(f => ({ ...f, hasPrivateCoach: !f.hasPrivateCoach }))} disabled={isGiftProcessing}
                              className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all disabled:opacity-50 ${giftForm.hasPrivateCoach ? "bg-blue-500/10 border-blue-500/50" : "bg-[var(--dash-field)] border-[var(--dash-border)] hover:border-zinc-700"}`}>
                              <div className="text-left">
                                <div className="text-xs font-black text-white">Include Private Coach</div>
                                <div className="text-[10px] text-zinc-500 font-bold">+$50.00</div>
                              </div>
                              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${giftForm.hasPrivateCoach ? "bg-blue-500 border-blue-500" : "border-zinc-700 bg-[var(--dash-field)]"}`}>
                                {giftForm.hasPrivateCoach && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>}
                              </div>
                            </button>
                            <button onClick={() => setGiftForm(f => ({ ...f, hasMealPlan: !f.hasMealPlan }))} disabled={isGiftProcessing}
                              className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all disabled:opacity-50 ${giftForm.hasMealPlan ? "bg-emerald-500/10 border-emerald-500/50" : "bg-[var(--dash-field)] border-[var(--dash-border)] hover:border-zinc-700"}`}>
                              <div className="text-left">
                                <div className="text-xs font-black text-white">Include Custom Meal Plan</div>
                                <div className="text-[10px] text-zinc-500 font-bold">+$20.00</div>
                              </div>
                              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${giftForm.hasMealPlan ? "bg-emerald-500 border-emerald-500" : "border-zinc-700 bg-[var(--dash-field)]"}`}>
                                {giftForm.hasMealPlan && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>}
                              </div>
                            </button>
                          </div>
                        </div>

                        {/* Total */}
                        <div className="bg-[var(--dash-field)] border border-[var(--dash-border)] rounded-xl p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Total</span>
                            <span className="text-lg font-black text-amber-400">
                              ${(PLAN_PRICES[giftForm.planType] || 0) + (giftForm.hasPrivateCoach ? 50 : 0) + (giftForm.hasMealPlan ? 20 : 0)}.00
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={processGiftPurchase}
                          disabled={isGiftProcessing || !giftForm.recipientEmail.trim() || recipientResult.status !== "valid"}
                          className="w-full px-5 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 rounded-xl text-xs font-black uppercase text-white tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
                        >
                          {isGiftProcessing && <Spinner />}
                          {isGiftProcessing ? "Processing..." : "Pay & Gift Subscription"}
                        </button>
                      </div>
                    </div>
                  </div>

                </>
              )}
            </div>
          )}

          {activeTab === "workouts" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fadeIn">
              <div className="premium-glow-card rounded-2xl p-4 lg:p-6 space-y-3">
                <div className="flex justify-between items-center border-b border-[var(--dash-divider)] pb-3">
                  <h2 className="text-xs font-black text-white uppercase tracking-widest">INDIVIDUAL WORKOUTS</h2>
                  {allWorkouts.length > 0 && (
                    <button onClick={() => exportPDF("workout-printable", { filename: `${(user?.name || "Member").replace(/\s+/g, "-")}-Workouts` })} disabled={isPDFGenerating} className="text-[9px] font-black text-purple-400 bg-purple-500/10 border border-purple-500/20 px-3 py-1 rounded-lg hover:bg-purple-500/20 transition-colors flex items-center gap-1.5 disabled:opacity-50 no-print">
                      {isPDFGenerating ? <Spinner /> : <Download size={11} />}
                      {isPDFGenerating ? "Exporting..." : "Download PDF"}
                    </button>
                  )}
                </div>
                <div id="workout-printable" style={{ backgroundColor: "var(--dash-bg)", color: "var(--dash-text)" }}>
                  {isWorkoutsLoading ? (
                    <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="bg-[var(--dash-field)] p-3 rounded-xl border border-[var(--dash-divider)]"><div className="h-3.5 w-3/4 bg-zinc-800/60 animate-pulse rounded mb-2" /><div className="h-2.5 w-1/3 bg-zinc-800/60 animate-pulse rounded" /></div>)}</div>
                  ) : individualWorkouts.length > 0 ? individualWorkouts.map((w) => (
                    <div key={w.id} className="bg-[var(--dash-field)] p-3 rounded-xl border border-[var(--dash-divider)] mb-2">
                      <div className="text-xs font-bold text-white mb-1">{(w.workoutJson as { exercises?: string[] })?.exercises?.join(" | ") || "No exercises"}</div>
                      <div className="text-[10px] text-zinc-500">{new Date(w.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</div>
                    </div>
                  )) : <div className="text-xs text-zinc-600 py-4 text-center">No individual workouts assigned.</div>}
                </div>
              </div>
              <div className="premium-glow-card rounded-2xl p-4 lg:p-6 space-y-3">
                <h2 className="text-xs font-black text-white uppercase tracking-widest border-b border-[var(--dash-divider)] pb-3">CLASS WORKOUTS</h2>
                {isWorkoutsLoading ? (
                  <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="bg-[var(--dash-field)] p-3 rounded-xl border border-[var(--dash-divider)]"><div className="h-3.5 w-3/4 bg-zinc-800/60 animate-pulse rounded mb-2" /><div className="h-2.5 w-1/3 bg-zinc-800/60 animate-pulse rounded" /></div>)}</div>
                ) : groupWorkouts.length > 0 ? groupWorkouts.map((w) => (
                  <div key={w.id} className="bg-[var(--dash-field)] p-3 rounded-xl border border-[var(--dash-divider)]">
                    <div className="flex items-center justify-between"><div className="text-xs font-bold text-white">{w.gymClass?.className || "Class"}</div><span className="text-[9px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded font-black">GROUP</span></div>
                    <div className="text-xs text-zinc-400 mt-1">{(w.workoutJson as { exercises?: string[] })?.exercises?.join(" | ") || "No exercises"}</div>
                    <div className="text-[10px] text-zinc-500 mt-1">{new Date(w.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</div>
                  </div>
                )) : <div className="text-xs text-zinc-600 py-4 text-center">No class workouts yet.</div>}
              </div>
            </div>
          )}

          {activeTab === "attendance" && (
            <div className="premium-glow-card rounded-2xl p-4 lg:p-6 space-y-3 animate-fadeIn">
              <div className="flex justify-between items-center border-b border-[var(--dash-divider)] pb-3">
                <h2 className="text-xs font-black text-white uppercase tracking-widest">ATTENDANCE LOG</h2>
                <span className="text-[10px] bg-zinc-900/80 px-3 py-1 rounded-full font-bold text-zinc-400">{attendanceRecords.length} RECORDS</span>
              </div>
              <div className="w-full overflow-x-auto block">
                <table className="w-full text-left text-xs min-w-[500px]" aria-label="Attendance log">
                  <thead><tr className="text-[9px] uppercase font-black text-zinc-500 tracking-widest border-b border-zinc-900 pb-3"><th scope="col" className="pb-2">Date</th><th scope="col" className="pb-2">Class</th><th scope="col" className="pb-2">Status</th></tr></thead>
                  <tbody className="divide-y divide-[var(--dash-divider)] text-zinc-300">
                    {isAttendanceLoading ? <SkeletonTableRows rows={5} cols={3} /> : attendanceRecords.length > 0 ? attendanceRecords.map((record) => {
                      const cfg = statusConfig[record.status] || statusConfig.ABSENT;
                      return (
                        <tr key={record.id} className="hover:bg-zinc-900/10 transition-colors"><td className="py-3 text-zinc-400">{new Date(record.date).toLocaleDateString("en-GB")}</td><td className="py-3 font-bold text-white">{record.gymClass?.className || "Class"}</td><td className="py-3"><span className={`text-[9px] ${cfg.color} ${cfg.bg} px-2 py-0.5 rounded border ${cfg.border} font-black uppercase tracking-wider`}>{cfg.label}</span></td></tr>
                      );
                    }) : <tr><td colSpan={3} className="py-8 text-center text-zinc-600">No attendance records yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "messages" && (
            <div className="premium-glow-card rounded-2xl p-4 lg:p-6 space-y-3 animate-fadeIn">
              <h2 className="text-xs font-black text-white uppercase tracking-widest border-b border-[var(--dash-divider)] pb-3">INBOX</h2>
              {isMessagesLoading ? <SkeletonChatBubble count={4} /> : (
                <div className="space-y-1 divide-y divide-[var(--dash-divider)]">
                  {messages.length > 0 ? messages.map((m) => (
                    <div key={m.id} className="py-3 flex items-center justify-between hover:bg-zinc-900/10 transition-colors rounded-lg px-2">
                      <div className="flex items-center gap-3">
                        <span className={`text-[8px] font-black uppercase tracking-wider border px-2 py-0.5 rounded-md ${m.type === "PRIVATE" ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-blue-500/10 border-blue-500/20 text-blue-400"}`}>{m.type === "PRIVATE" ? "PRIVATE" : "PUBLIC"}</span>
                        <span className="text-xs text-zinc-500">{m.fromName}</span>
                      </div>
                      <span className="text-xs font-bold text-zinc-200">{m.content}</span>
                    </div>
                  )) : <div className="text-xs text-zinc-600 py-4 text-center">No messages yet.</div>}
                </div>
              )}
            </div>
          )}

        </div>
      </main>

      {/* Weight Log Modal */}
      {showWeightModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn p-4">
          <div className="bg-[var(--dash-panel)] border border-[var(--dash-border)] rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-2xl">
            <h3 className="text-xs font-black text-white uppercase tracking-widest">Log Weight</h3>
            <div className="space-y-1.5">
              <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Date</label>
              <input type="date" value={weightDate} onChange={(e) => setWeightDate(e.target.value)} max={new Date().toISOString().split("T")[0]} className="w-full bg-[var(--dash-field)] border border-[var(--dash-border)] rounded-xl px-3 py-2 text-xs font-bold text-white focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 outline-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Weight (kg)</label>
              <input type="number" step="0.1" value={weightInput} onChange={(e) => setWeightInput(e.target.value)} placeholder="e.g. 78.5" className="w-full bg-[var(--dash-field)] border border-[var(--dash-border)] rounded-xl px-3 py-2 text-xs font-bold text-white focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 outline-none" />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowWeightModal(false)} className="flex-1 py-2 bg-[var(--dash-field)] border border-[var(--dash-border)] rounded-xl font-bold text-[10px] text-zinc-400 hover:text-white transition-colors">Cancel</button>
              <button onClick={saveWeight} disabled={isSavingWeight} className="flex-1 py-2 bg-red-500 rounded-xl font-black text-[10px] uppercase tracking-wider hover:bg-red-600 transition-colors text-white disabled:opacity-50 flex items-center justify-center gap-2">{isSavingWeight && <Spinner />}{isSavingWeight ? "Saving..." : "Save"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Macros Modal */}
      {showMacrosModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn p-4">
          <div className="bg-[var(--dash-panel)] border border-[var(--dash-border)] rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-2xl">
            <h3 className="text-xs font-black text-white uppercase tracking-widest">Update Daily Nutrition</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><label className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Calories</label><input type="number" value={macrosForm.calories} onChange={(e) => setMacrosForm({ ...macrosForm, calories: e.target.value })} placeholder="2500" className="w-full bg-[var(--dash-field)] border border-[var(--dash-border)] rounded-xl px-3 py-2 text-xs font-bold text-white focus:border-red-500/50 outline-none" /></div>
              <div className="space-y-1"><label className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Protein (g)</label><input type="number" value={macrosForm.protein} onChange={(e) => setMacrosForm({ ...macrosForm, protein: e.target.value })} placeholder="180" className="w-full bg-[var(--dash-field)] border border-[var(--dash-border)] rounded-xl px-3 py-2 text-xs font-bold text-white focus:border-red-500/50 outline-none" /></div>
              <div className="space-y-1"><label className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Carbs (g)</label><input type="number" value={macrosForm.carbs} onChange={(e) => setMacrosForm({ ...macrosForm, carbs: e.target.value })} placeholder="300" className="w-full bg-[var(--dash-field)] border border-[var(--dash-border)] rounded-xl px-3 py-2 text-xs font-bold text-white focus:border-red-500/50 outline-none" /></div>
              <div className="space-y-1"><label className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Fat (g)</label><input type="number" value={macrosForm.fat} onChange={(e) => setMacrosForm({ ...macrosForm, fat: e.target.value })} placeholder="80" className="w-full bg-[var(--dash-field)] border border-[var(--dash-border)] rounded-xl px-3 py-2 text-xs font-bold text-white focus:border-red-500/50 outline-none" /></div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowMacrosModal(false)} className="flex-1 py-2 bg-[var(--dash-field)] border border-[var(--dash-border)] rounded-xl font-bold text-[10px] text-zinc-400 hover:text-white transition-colors">Cancel</button>
              <button onClick={saveMacros} disabled={isSavingMacros} className="flex-1 py-2 bg-red-500 rounded-xl font-black text-[10px] uppercase tracking-wider hover:bg-red-600 transition-colors text-white disabled:opacity-50 flex items-center justify-center gap-2">{isSavingMacros && <Spinner />}{isSavingMacros ? "Saving..." : "Save Nutrition"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn p-4">
          <div className="bg-[var(--dash-panel)] border border-[var(--dash-border)] rounded-2xl p-6 w-full max-w-md space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white text-xl font-black tracking-tight font-heading">Checkout</h3>
                <p className="text-zinc-500 text-xs font-semibold mt-0.5">Select your membership plan</p>
              </div>
              <button onClick={() => setShowPaymentModal(false)} className="w-8 h-8 bg-[var(--dash-field)] border border-[var(--dash-border)] rounded-xl flex items-center justify-center text-zinc-500 hover:text-white transition-colors"><X size={14} /></button>
            </div>

            <div className="space-y-2">
              {(["DAILY", "WEEKLY", "MONTHLY", "SIX_MONTH", "YEARLY"] as const).map((plan) => (
                <button key={plan} onClick={() => setSelectedPlan(plan)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${selectedPlan === plan ? "bg-red-500/10 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.1)]" : "bg-[var(--dash-field)] border-[var(--dash-border)] hover:border-zinc-700"}`}>
                  <div className="text-left">
                    <div className={`text-xs font-black tracking-wide ${plan === "YEARLY" ? "text-amber-400" : plan === "SIX_MONTH" ? "text-red-400" : "text-white"}`}>
                      {PLAN_LABELS[plan]} {plan === "YEARLY" && "👑"} {plan === "SIX_MONTH" && "🔥"} {plan === "MONTHLY" && "⚡"}
                    </div>
                    <div className="text-[10px] text-zinc-500 font-bold mt-0.5">{PLAN_DAYS_LABEL[plan]}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-white">${PLAN_PRICES[plan].toFixed(2)}</div>
                    {plan === "YEARLY" && <div className="text-[9px] text-amber-400 font-bold">Best overall</div>}
                    {plan === "MONTHLY" && <div className="text-[9px] text-red-400 font-bold">Most popular</div>}
                  </div>
                </button>
              ))}
            </div>

            <div className="border-t border-[var(--dash-border)] pt-4">
              <p className="text-[10px] font-black text-zinc-500 tracking-wide mb-3">ADD-ONS</p>
              <button onClick={() => setPayHasCoach(!payHasCoach)}
                className={`w-full flex items-center justify-between p-3 rounded-xl border mb-2 transition-all ${payHasCoach ? "bg-blue-500/10 border-blue-500/50" : "bg-[var(--dash-field)] border-[var(--dash-border)] hover:border-zinc-700"}`}>
                <div className="text-left">
                  <div className="text-xs font-black text-white">Private Coach</div>
                  <div className="text-[10px] text-zinc-500 font-bold mt-0.5">1-on-1 dedicated training</div>
                </div>
                <div className="text-right flex items-center gap-2">
                  <span className="text-xs font-black text-blue-400">+$50</span>
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${payHasCoach ? "bg-blue-500 border-blue-500" : "border-zinc-700 bg-[var(--dash-field)]"}`}>
                    {payHasCoach && <Check size={12} className="text-white" />}
                  </div>
                </div>
              </button>
              <button onClick={() => setPayHasMeal(!payHasMeal)}
                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${payHasMeal ? "bg-emerald-500/10 border-emerald-500/50" : "bg-[var(--dash-field)] border-[var(--dash-border)] hover:border-zinc-700"}`}>
                <div className="text-left">
                  <div className="text-xs font-black text-white">Meal Plan</div>
                  <div className="text-[10px] text-zinc-500 font-bold mt-0.5">Custom nutrition & macro guidance</div>
                </div>
                <div className="text-right flex items-center gap-2">
                  <span className="text-xs font-black text-emerald-400">+$20</span>
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${payHasMeal ? "bg-emerald-500 border-emerald-500" : "border-zinc-700 bg-[var(--dash-field)]"}`}>
                    {payHasMeal && <Check size={12} className="text-white" />}
                  </div>
                </div>
              </button>
            </div>

            <div className="bg-[var(--dash-field)] border border-[var(--dash-border)] rounded-xl p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-zinc-500">Plan</span>
                <span className="text-xs font-black text-white">{PLAN_LABELS[selectedPlan]}</span>
              </div>
              {payHasCoach && <div className="flex items-center justify-between mb-1"><span className="text-xs font-bold text-zinc-500">Private Coach</span><span className="text-xs font-black text-blue-400">+$50.00</span></div>}
              {payHasMeal && <div className="flex items-center justify-between mb-1"><span className="text-xs font-bold text-zinc-500">Meal Plan</span><span className="text-xs font-black text-emerald-400">+$20.00</span></div>}
              <div className="border-t border-[var(--dash-border)] mt-2 pt-2 flex items-center justify-between">
                <span className="text-sm font-black text-white">Total</span>
                <span className="text-xl font-black text-white">${paymentTotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowPaymentModal(false)} className="flex-1 py-2.5 bg-[var(--dash-field)] border border-[var(--dash-border)] rounded-xl font-bold text-[10px] text-zinc-400 hover:text-white transition-colors">Cancel</button>
              <button onClick={processPayment} disabled={isProcessingPayment} className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 rounded-xl font-black text-[10px] uppercase tracking-wider transition-colors text-white disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-red-500/20">
                {isProcessingPayment && <Spinner />} {isProcessingPayment ? "Processing..." : `Pay $${paymentTotal.toFixed(2)}`}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal open={showLogoutModal} title="Sign Out" message="Are you sure you want to log out from your dashboard?" confirmLabel="Sign Out" cancelLabel="Stay" variant="danger" onConfirm={confirmLogout} onCancel={() => setShowLogoutModal(false)} />
      <ToastContainer />
    </div>
  );
}
