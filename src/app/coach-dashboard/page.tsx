"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ToastContainer, showToast } from "@/components/Toast";
import ConfirmModal from "@/components/ConfirmModal";
import Spinner from "@/components/Spinner";
import { SkeletonFullPage, SkeletonTableRows, SkeletonChatBubble } from "@/components/Skeleton";

interface User {
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
  coachId: string;
  time: string;
  capacity?: number;
  enrolled?: number;
  students: { id: string; name: string; email: string }[];
}

interface GroupWorkout {
  id: string;
  classId: string;
  date: string;
  workoutJson: unknown;
  gymClass: { id: string; className: string };
}

interface MessageItem {
  id: string;
  content: string;
  type: string;
  fromId: string;
  fromName: string;
  targetId?: string;
  targetName?: string;
  createdAt: string;
}

export default function CoachPanelPage() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<string>("classes");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const classesRef = useRef<ClassItem[]>([]);
  classesRef.current = classes;

  // Loading states
  const [isClassesLoading, setIsClassesLoading] = useState(true);
  const [isWorkoutsLoading, setIsWorkoutsLoading] = useState(true);
  const [isMessagesLoading, setIsMessagesLoading] = useState(true);
  const [isAttendanceLoading, setIsAttendanceLoading] = useState(false);

  // Attendance state
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [attendanceRecords, setAttendanceRecords] = useState<{ studentId: string; status: string }[]>([]);
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);

  // Workout state
  const [workoutClassId, setWorkoutClassId] = useState<string>("");
  const [workoutStudentId, setWorkoutStudentId] = useState<string>("");
  const [workoutType, setWorkoutType] = useState<"group" | "individual">("group");
  const [workoutText, setWorkoutText] = useState("");
  const [isSavingWorkout, setIsSavingWorkout] = useState(false);
  const [groupWorkouts, setGroupWorkouts] = useState<GroupWorkout[]>([]);

  // Messages state
  const [messageClassId, setMessageClassId] = useState<string>("");
  const [messageStudentId, setMessageStudentId] = useState<string>("");
  const [messageText, setMessageText] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [sentMessages, setSentMessages] = useState<MessageItem[]>([]);

  // Logout modal
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
    const currentUserRaw = localStorage.getItem("currentUser");

    if (!isLoggedIn || !currentUserRaw) {
      router.replace("/login");
      return;
    }

    try {
      const user = JSON.parse(currentUserRaw) as User;
      const role = (user.role || "").trim().toLowerCase();
      if (role !== "coach") {
        router.replace(role === "admin" ? "/admin-panel" : "/dashboard");
        return;
      }
      setCurrentUser(user);
    } catch {
      localStorage.clear();
      router.replace("/login");
    }
  }, [router]);

  const loadClasses = useCallback(async () => {
    setIsClassesLoading(true);
    try {
      const res = await fetch("/api/classes");
      const json = await res.json();
      const allClasses = Array.isArray(json.data) ? json.data : [];
      const myClasses = allClasses.filter(
        (c: ClassItem) => c.coachId === currentUser?.id
      );
      setClasses(myClasses);
    } catch (err) {
      console.error("Error loading classes", err);
    } finally {
      setIsClassesLoading(false);
    }
  }, [currentUser?.id]);

  const loadWorkouts = useCallback(async () => {
    setIsWorkoutsLoading(true);
    try {
      const res = await fetch("/api/workouts");
      const json = await res.json();
      if (json.success && json.data?.groupWorkouts) {
        setGroupWorkouts(json.data.groupWorkouts);
      }
    } catch (err) {
      console.error("Error loading workouts", err);
    } finally {
      setIsWorkoutsLoading(false);
    }
  }, []);

  const loadSentMessages = useCallback(async () => {
    setIsMessagesLoading(true);
    try {
      const res = await fetch("/api/messages");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setSentMessages(json.data.filter((m: MessageItem) => m.fromId === currentUser?.id));
      }
    } catch (err) {
      console.error("Error loading messages", err);
    } finally {
      setIsMessagesLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser) return;
    loadClasses();
    loadWorkouts();
    loadSentMessages();
  }, [currentUser, loadClasses, loadWorkouts, loadSentMessages]);

  useEffect(() => {
    if (classes.length > 0 && !selectedClassId) {
      setSelectedClassId(classes[0].id);
    }
  }, [classes, selectedClassId]);

  const showSection = (section: string) => {
    setActiveSection(section);
    setIsMobileMenuOpen(false);
    if (section === "classes") loadClasses();
    if (section === "messages") loadSentMessages();
  };

  // --- ATTENDANCE ---
  const loadAttendanceAndMerge = useCallback(async (classId: string, date: string) => {
    const currentClasses = classesRef.current;
    const cls = currentClasses.find((c) => c.id === classId);
    if (!cls) return;

    setIsAttendanceLoading(true);
    try {
      const res = await fetch(`/api/attendance?classId=${classId}&date=${date}`);
      const json = await res.json();
      const savedRecords: { studentId: string; status: string }[] = json.success ? (json.data || []) : [];

      const statusApiToUi: Record<string, string> = {
        PRESENT: "Present",
        ABSENT: "Absent",
        LATE: "Late",
      };

      const merged = cls.students.map((s) => {
        const saved = savedRecords.find((r) => r.studentId === s.id);
        return {
          studentId: s.id,
          status: saved ? (statusApiToUi[saved.status] || "Present") : "Present",
        };
      });

      setAttendanceRecords(merged);
    } catch (err) {
      console.error("Error loading attendance", err);
      const fallback = cls.students.map((s) => ({ studentId: s.id, status: "Present" }));
      setAttendanceRecords(fallback);
    } finally {
      setIsAttendanceLoading(false);
    }
  }, []);

  const selectedClass = classes.find((c) => c.id === selectedClassId);

  useEffect(() => {
    if (activeSection === "attendance" && selectedClassId && selectedDate) {
      loadAttendanceAndMerge(selectedClassId, selectedDate);
    }
  }, [activeSection, selectedClassId, selectedDate, loadAttendanceAndMerge]);

  const saveAttendance = async () => {
    if (!selectedClassId || attendanceRecords.length === 0) return;
    setIsSavingAttendance(true);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: selectedClassId,
          records: attendanceRecords.map((r) => ({
            studentId: r.studentId,
            status: r.status as "Present" | "Absent" | "Late",
          })),
        }),
      });
      if (res.ok) {
        showToast("success", "Attendance saved successfully.");
        loadAttendanceAndMerge(selectedClassId, selectedDate);
      } else {
        showToast("error", "Failed to save attendance.");
      }
    } catch {
      showToast("error", "Network error.");
    } finally {
      setIsSavingAttendance(false);
    }
  };

  // --- WORKOUTS ---
  const saveWorkout = async () => {
    if (!workoutText.trim()) {
      showToast("warning", "Please enter workout details.");
      return;
    }

    setIsSavingWorkout(true);
    try {
      const payload: Record<string, unknown> = {
        type: workoutType,
        workoutJson: { exercises: workoutText.split("\n").filter((l) => l.trim()) },
      };

      if (workoutType === "group") {
        if (!workoutClassId) {
          showToast("warning", "Please select a class for the group workout.");
          setIsSavingWorkout(false);
          return;
        }
        payload.classId = workoutClassId;
      } else {
        if (!workoutClassId) {
          showToast("warning", "Please select a class for the individual workout.");
          setIsSavingWorkout(false);
          return;
        }
        if (!workoutStudentId) {
          showToast("warning", "Please select a student for the individual workout.");
          setIsSavingWorkout(false);
          return;
        }
        payload.studentId = workoutStudentId;
      }

      const res = await fetch("/api/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast("success", "Workout assigned successfully.");
        setWorkoutText("");
        loadWorkouts();
      } else {
        const data = await res.json();
        showToast("error", data.message || "Failed to assign workout.");
      }
    } catch {
      showToast("error", "Network error.");
    } finally {
      setIsSavingWorkout(false);
    }
  };

  // --- MESSAGES ---
  const selectedWorkoutClass = classes.find((c) => c.id === workoutClassId);
  const selectedMsgClass = classes.find((c) => c.id === messageClassId);

  const sendMessage = async () => {
    if (!messageStudentId) {
      showToast("warning", "Please select a student.");
      return;
    }
    if (!messageText.trim()) {
      showToast("warning", "Please enter a message.");
      return;
    }

    const student = selectedMsgClass?.students.find((s) => s.id === messageStudentId);
    if (!student) {
      showToast("error", "Selected student not found.");
      return;
    }

    setIsSendingMessage(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: messageText.trim(),
          type: "private",
          targetId: student.id,
          targetName: student.name,
        }),
      });

      if (res.ok) {
        showToast("success", `Message sent to ${student.name}.`);
        setMessageText("");
        setMessageStudentId("");
        loadSentMessages();
      } else {
        showToast("error", "Failed to send message.");
      }
    } catch {
      showToast("error", "Network error.");
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleLogout = () => setShowLogoutModal(true);

  const confirmLogout = () => {
    setShowLogoutModal(false);
    localStorage.clear();
    document.cookie = "session=; path=/; max-age=0";
    router.replace("/login");
  };

  if (!currentUser) {
    return <SkeletonFullPage message="Loading Coach Panel..." />;
  }

  return (
    <div className="min-h-screen bg-[#070709] text-[#f4f4f5] flex font-sans overflow-x-hidden antialiased selection:bg-red-500 selection:text-white relative print-layout">

      <div className="fixed top-[-10%] right-[-10%] w-[500px] h-[500px] bg-red-900/10 rounded-full blur-[160px] pointer-events-none z-0 no-print" />

      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden no-print" onClick={() => setIsMobileMenuOpen(false)} aria-hidden="true" />
      )}

      {/* Sidebar */}
      <aside aria-label="Coach navigation" className={`w-64 border-r border-zinc-900/60 bg-[#0b0b0e]/95 lg:bg-[#0b0b0e]/80 backdrop-blur-xl p-6 flex flex-col justify-between fixed h-screen z-40 lg:z-30 transition-transform duration-300 ease-in-out no-print ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div>
          <div className="mb-10 pl-2 flex items-center justify-between">
            <Link href="/"><img src="/img/logo.svg" alt="IronForged" className="h-9 hover:opacity-80 transition-opacity" /></Link>
            <button onClick={() => setIsMobileMenuOpen(false)} aria-label="Close menu" className="lg:hidden text-zinc-400 hover:text-white">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
          <nav className="space-y-1.5">
            {[
              { id: "classes", label: "My Classes", icon: "classes" },
              { id: "attendance", label: "Attendance", icon: "attendance" },
              { id: "workouts", label: "Assign Workouts", icon: "workouts" },
              { id: "messages", label: "Messages", icon: "messages" },
            ].map((tab) => (
              <button key={tab.id} onClick={() => showSection(tab.id)}
                aria-current={activeSection === tab.id ? "page" : undefined}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all relative ${activeSection === tab.id ? "bg-gradient-to-r from-zinc-900 to-zinc-900/50 text-red-500 border border-zinc-800/80 shadow-inner" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/30"}`}>
                {activeSection === tab.id && <span className="absolute left-0 w-[3px] h-5 bg-red-500 rounded-r-full shadow-[0_0_10px_rgba(239,68,68,0.7)]" aria-hidden="true" />}
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  {tab.icon === "classes" && <><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></>}
                  {tab.icon === "attendance" && <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><polyline points="16 11 18 13 22 9" /></>}
                  {tab.icon === "workouts" && <><path d="M6.5 6.5 11 11M13 13l4.5 4.5" /><path d="M11 11 8 8a2.83 2.83 0 0 1 0-4l4-4 4 4-4 4" /><path d="m13 13 3 3a2.83 2.83 0 0 1 0 4l-4 4-4-4 4-4" /></>}
                  {tab.icon === "messages" && <><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></>}
                </svg>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="space-y-2 border-t border-zinc-900/60 pt-4">
          <button onClick={handleLogout} aria-label="Log out" className="w-full flex items-center gap-3 text-zinc-500 hover:text-red-400 font-bold text-[11px] uppercase tracking-wider px-4 py-2 rounded-xl transition-colors text-left cursor-pointer">
            Log Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 w-full lg:pl-64 min-h-screen flex flex-col z-10 relative">
        <header className="px-4 lg:px-8 pt-6 lg:pt-8 pb-4 flex items-center justify-between border-b border-zinc-900/30 lg:border-none no-print">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsMobileMenuOpen(true)} aria-label="Open menu" className="lg:hidden p-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-300 hover:text-white transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
            </button>
            <div>
              <h1 className="text-lg lg:text-2xl font-black uppercase tracking-wider text-white">
                COACH <span className="text-red-500">PANEL</span>
              </h1>
              <p className="text-[9px] lg:text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5 hidden sm:block">MANAGE YOUR CLASSES & ATHLETES</p>
            </div>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-[8px] lg:text-[9px] font-black tracking-widest text-emerald-400 uppercase px-2.5 py-1.5 rounded-xl">
            COACH MODE
          </div>
        </header>

        <div className="p-4 lg:p-8 flex-1">

          {/* MY CLASSES */}
          {activeSection === "classes" && (
            <div onMouseMove={(e) => { const c = e.currentTarget; const r = c.getBoundingClientRect(); c.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`); c.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`); }} className="premium-glow-card rounded-2xl p-4 lg:p-6 space-y-4 animate-fadeIn">
              <div className="flex justify-between items-center border-b border-zinc-900/60 pb-3">
                <h2 className="text-xs font-black text-white uppercase tracking-widest">MY CLASSES</h2>
                <span className="text-[10px] bg-zinc-900/80 px-3 py-1 rounded-full font-bold text-zinc-400">{classes.length} CLASSES</span>
              </div>
              <div className="w-full overflow-x-auto block">
                <table className="w-full text-left text-xs min-w-[650px]" aria-label="My classes">
                  <thead>
                    <tr className="text-[9px] uppercase font-black text-zinc-500 tracking-widest border-b border-zinc-900 pb-3">
                      <th scope="col" className="pb-2">Title</th>
                      <th scope="col" className="pb-2">Schedule</th>
                      <th scope="col" className="pb-2">Enrolled</th>
                      <th scope="col" className="pb-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900/40 text-zinc-300">
                    {isClassesLoading ? (
                      <SkeletonTableRows rows={4} cols={4} />
                    ) : classes.map((c) => (
                      <tr key={c.id} className="hover:bg-zinc-900/10 transition-colors">
                        <td className="py-3 font-black text-white">{c.title}</td>
                        <td className="py-3 text-zinc-400">{c.time}</td>
                        <td className="py-3">
                          <span className="text-emerald-400 font-bold">{c.students?.length || 0}</span>
                          <span className="text-zinc-600"> / {c.capacity || 20}</span>
                        </td>
                        <td className="py-3 text-right">
                          <button onClick={() => { setSelectedClassId(c.id); setActiveSection("attendance"); }} className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-2.5 py-1 rounded-lg font-bold text-[10px] text-zinc-300 transition-colors">
                            Take Attendance
                          </button>
                        </td>
                      </tr>
                    ))}
                    {!isClassesLoading && classes.length === 0 && (
                      <tr><td colSpan={4} className="py-6 text-center text-zinc-600">No classes assigned to you yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ATTENDANCE */}
          {activeSection === "attendance" && (
            <div onMouseMove={(e) => { const c = e.currentTarget; const r = c.getBoundingClientRect(); c.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`); c.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`); }} className="premium-glow-card rounded-2xl p-4 lg:p-6 space-y-4 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-900/60 pb-3">
                <h2 className="text-xs font-black text-white uppercase tracking-widest">MARK ATTENDANCE</h2>
                <div className="flex items-center gap-2">
                  <select value={selectedClassId} onChange={(e) => { setSelectedClassId(e.target.value); setAttendanceRecords([]); }} className="select-dark bg-[#121216] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-transparent">
                    <option value="">Select Class</option>
                    {classes.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                  <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-[#121216] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500" />
                  <button onClick={() => { if (selectedClassId) loadAttendanceAndMerge(selectedClassId, selectedDate); }} className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-3 py-2 rounded-xl text-[10px] font-bold text-zinc-300 transition-colors whitespace-nowrap">
                    Load
                  </button>
                </div>
              </div>

              {isClassesLoading ? (
                <div className="py-8"><SkeletonTableRows rows={4} cols={2} /></div>
              ) : classes.length === 0 ? (
                <div className="text-center text-xs text-zinc-600 py-8">Loading classes...</div>
              ) : isAttendanceLoading ? (
                <div className="py-8"><SkeletonTableRows rows={5} cols={2} /></div>
              ) : selectedClass && attendanceRecords.length > 0 ? (
                <>
                  <div className="w-full overflow-x-auto block">
                    <table className="w-full text-left text-xs min-w-[500px]" aria-label="Attendance roster">
                      <thead>
                        <tr className="text-[9px] uppercase font-black text-zinc-500 tracking-widest border-b border-zinc-900 pb-3">
                          <th scope="col" className="pb-2">Student</th>
                          <th scope="col" className="pb-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-900/40 text-zinc-300">
                        {selectedClass.students.map((student) => {
                          const record = attendanceRecords.find((r) => r.studentId === student.id);
                          return (
                            <tr key={student.id} className="hover:bg-zinc-900/10 transition-colors">
                              <td className="py-3">
                                <div className="font-bold text-white">{student.name}</div>
                                <div className="text-[10px] text-zinc-500">{student.email}</div>
                              </td>
                              <td className="py-3">
                                <div className="flex gap-1.5">
                                  {["Present", "Absent", "Late"].map((status) => (
                                    <button key={status} aria-pressed={record?.status === status} onClick={() => {
                                      setAttendanceRecords((prev) => prev.map((r) => r.studentId === student.id ? { ...r, status } : r));
                                    }}
                                      className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-colors ${record?.status === status ? (status === "Present" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : status === "Late" ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-red-500/20 text-red-400 border-red-500/30") : "bg-zinc-900/50 text-zinc-500 border-zinc-800 hover:text-zinc-300"}`}>
                                      {status}
                                    </button>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex justify-end pt-2">
                    <button onClick={saveAttendance} disabled={isSavingAttendance} className="px-5 py-2 bg-red-500 hover:bg-red-600 rounded-xl text-xs font-black uppercase text-white tracking-wider transition-colors disabled:opacity-50 flex items-center gap-2">
                      {isSavingAttendance && <Spinner />}
                      {isSavingAttendance ? "Saving..." : "Save Attendance"}
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center text-xs text-zinc-600 py-8">
                  {selectedClassId ? "No students enrolled in this class." : "Select a class to begin."}
                </div>
              )}
            </div>
          )}

          {/* ASSIGN WORKOUTS */}
          {activeSection === "workouts" && (
            <div className="space-y-6 animate-fadeIn">
              <div onMouseMove={(e) => { const c = e.currentTarget; const r = c.getBoundingClientRect(); c.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`); c.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`); }} className="premium-glow-card rounded-2xl p-4 lg:p-6 space-y-4">
                <h2 className="text-xs font-black text-white uppercase tracking-widest border-b border-zinc-900/60 pb-3">ASSIGN WORKOUT</h2>

                <div className="flex gap-3">
                  <button onClick={() => setWorkoutType("group")} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-colors ${workoutType === "group" ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-zinc-900/50 text-zinc-500 border-zinc-800 hover:text-zinc-300"}`}>
                    Group (Class)
                  </button>
                  <button onClick={() => setWorkoutType("individual")} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-colors ${workoutType === "individual" ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-zinc-900/50 text-zinc-500 border-zinc-800 hover:text-zinc-300"}`}>
                    Individual (Student)
                  </button>
                </div>

                {workoutType === "group" ? (
                  <select value={workoutClassId} onChange={(e) => setWorkoutClassId(e.target.value)} className="select-dark w-full bg-[#121216] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-transparent">
                    <option value="">Select a Class</option>
                    {classes.map((c) => <option key={c.id} value={c.id}>{c.title} ({c.time})</option>)}
                  </select>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Select Class</label>
                      <select value={workoutClassId} onChange={(e) => { setWorkoutClassId(e.target.value); setWorkoutStudentId(""); }}
                        className="select-dark w-full bg-[#121216] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-transparent">
                        <option value="">Choose a class...</option>
                        {classes.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Select Student</label>
                      <select value={workoutStudentId} onChange={(e) => setWorkoutStudentId(e.target.value)}
                        disabled={!workoutClassId}
                        className="select-dark w-full bg-[#121216] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-transparent disabled:opacity-40 disabled:cursor-not-allowed">
                        <option value="">{workoutClassId ? "Choose a student..." : "Select a class first"}</option>
                        {selectedWorkoutClass?.students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                  </div>
                )}

                <textarea value={workoutText} onChange={(e) => setWorkoutText(e.target.value)} rows={5} placeholder={"Enter workout exercises, one per line:\nBench Press 4x8\nSquat 3x10\nDeadlift 5x5"} className="w-full bg-[#121216] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 resize-none font-mono" />

                <div className="flex justify-end">
                  <button onClick={saveWorkout} disabled={isSavingWorkout} className="px-5 py-2 bg-red-500 hover:bg-red-600 rounded-xl text-xs font-black uppercase text-white tracking-wider transition-colors disabled:opacity-50 flex items-center gap-2">
                    {isSavingWorkout && <Spinner />}
                    {isSavingWorkout ? "Saving..." : "Assign Workout"}
                  </button>
                </div>
              </div>

              {/* Recent Group Workouts */}
              <div onMouseMove={(e) => { const c = e.currentTarget; const r = c.getBoundingClientRect(); c.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`); c.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`); }} className="premium-glow-card rounded-2xl p-4 lg:p-6 space-y-3">
                <div className="flex justify-between items-center border-b border-zinc-900/60 pb-3">
                  <h3 className="text-xs font-black text-white uppercase tracking-widest">RECENT GROUP WORKOUTS</h3>
                  {groupWorkouts.length > 0 && (
                    <button onClick={() => window.print()} className="text-[9px] font-black text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-lg hover:bg-red-500/20 transition-colors">Download PDF</button>
                  )}
                </div>
                <div id="workout-printable">
                {isWorkoutsLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => <div key={i} className="flex items-center justify-between bg-[#121216] p-3 rounded-xl border border-zinc-900/60"><div className="h-3.5 w-24 bg-zinc-800/60 animate-pulse rounded" /><div className="h-5 w-14 bg-zinc-800/60 animate-pulse rounded" /></div>)}
                  </div>
                ) : groupWorkouts.length > 0 ? (
                  <div className="space-y-2">
                    {groupWorkouts.slice(0, 5).map((w) => (
                      <div key={w.id} className="flex items-center justify-between bg-[#121216] p-3 rounded-xl border border-zinc-900/60">
                        <div>
                          <div className="text-xs font-bold text-white">{w.gymClass?.className || "Unknown Class"}</div>
                          <div className="text-[10px] text-zinc-500">{new Date(w.date).toLocaleDateString("en-GB")}</div>
                        </div>
                        <span className="text-[9px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded font-black uppercase">Group</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-zinc-600 py-4 text-center">No group workouts yet.</div>
                )}
                </div>
              </div>
            </div>
          )}

          {/* MESSAGES */}
          {activeSection === "messages" && (
            <div className="space-y-6 animate-fadeIn">
              {/* Compose Message */}
              <div onMouseMove={(e) => { const c = e.currentTarget; const r = c.getBoundingClientRect(); c.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`); c.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`); }} className="premium-glow-card rounded-2xl p-4 lg:p-6 space-y-4">
                <h2 className="text-xs font-black text-white uppercase tracking-widest border-b border-zinc-900/60 pb-3">SEND PRIVATE MESSAGE</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Select Class</label>
                    <select value={messageClassId} onChange={(e) => { setMessageClassId(e.target.value); setMessageStudentId(""); }}
                      className="select-dark w-full bg-[#121216] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-transparent">
                      <option value="">Choose a class...</option>
                      {classes.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Select Student</label>
                    <select value={messageStudentId} onChange={(e) => setMessageStudentId(e.target.value)}
                      disabled={!messageClassId}
                      className="select-dark w-full bg-[#121216] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-transparent disabled:opacity-40 disabled:cursor-not-allowed">
                      <option value="">{messageClassId ? "Choose a student..." : "Select a class first"}</option>
                      {selectedMsgClass?.students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>

                <textarea value={messageText} onChange={(e) => setMessageText(e.target.value)} rows={4}
                  placeholder="Type your message to the student..."
                  className="w-full bg-[#121216] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 resize-none" />

                <div className="flex justify-between items-center">
                  {messageStudentId && selectedMsgClass && (
                    <p className="text-[10px] text-zinc-500">
                      Sending to <span className="text-white font-bold">{selectedMsgClass.students.find((s) => s.id === messageStudentId)?.name}</span>
                      {" "}in <span className="text-white font-bold">{selectedMsgClass.title}</span>
                    </p>
                  )}
                  <div className="flex justify-end flex-1">
                    <button onClick={sendMessage} disabled={isSendingMessage || !messageStudentId || !messageText.trim()}
                      className="px-5 py-2 bg-red-500 hover:bg-red-600 rounded-xl text-xs font-black uppercase text-white tracking-wider transition-colors disabled:opacity-50 flex items-center gap-2">
                      {isSendingMessage && <Spinner />}
                      {isSendingMessage ? "Sending..." : "Send Message"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Sent Messages */}
              <div onMouseMove={(e) => { const c = e.currentTarget; const r = c.getBoundingClientRect(); c.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`); c.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`); }} className="premium-glow-card rounded-2xl p-4 lg:p-6 space-y-3">
                <h3 className="text-xs font-black text-white uppercase tracking-widest border-b border-zinc-900/60 pb-3">SENT MESSAGES</h3>
                {isMessagesLoading ? (
                  <SkeletonChatBubble count={4} />
                ) : (
                  <div className="space-y-2">
                    {sentMessages.length > 0 ? sentMessages.slice(0, 20).map((m) => (
                      <div key={m.id} className="flex items-center justify-between bg-[#121216] p-3 rounded-xl border border-zinc-900/60 hover:bg-zinc-900/20 transition-colors">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <span className="text-[8px] font-black uppercase tracking-wider border px-2 py-0.5 rounded-md bg-red-500/10 border-red-500/20 text-red-400 shrink-0">
                            PRIVATE
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-zinc-500">To:</span>
                              <span className="text-xs font-bold text-white truncate">{m.targetName || "Unknown"}</span>
                            </div>
                            <div className="text-[10px] text-zinc-400 truncate mt-0.5">{m.content}</div>
                          </div>
                        </div>
                        <span className="text-[9px] text-zinc-600 shrink-0 ml-3">{new Date(m.createdAt).toLocaleDateString("en-GB")}</span>
                      </div>
                    )) : (
                      <div className="text-xs text-zinc-600 py-4 text-center">No messages sent yet.</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      <ConfirmModal
        open={showLogoutModal}
        title="Sign Out"
        message="Are you sure you want to log out from your coach panel?"
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
