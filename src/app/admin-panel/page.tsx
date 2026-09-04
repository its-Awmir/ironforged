"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ToastContainer, showToast } from "@/components/Toast";
import ConfirmModal from "@/components/ConfirmModal";
import EditRoleModal from "@/components/EditRoleModal";
import Spinner from "@/components/Spinner";
import { SkeletonTableRows } from "@/components/Skeleton";
import ThemeToggle from "@/components/ThemeToggle";

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
  coachId?: string;
  time: string;
  capacity?: number;
  enrolled?: number;
  students?: ClassStudent[];
}

interface ClassStudent {
  id: string;
  name: string;
  email: string;
}

interface SysInfo {
  status?: string;
  uptime?: string;
  memory?: string;
  cpu?: string;
  platform?: string;
  nodeVersion?: string;
  users?: number;
  revenue?: number;
  memoryUsedMB?: number;
  memoryTotalMB?: number;
}

interface EquipmentItem {
  id: string;
  name: string;
  status: string;
  lastCheck?: string;
}

interface SubscriptionItem {
  userId: string;
  name: string;
  email: string;
  role: string;
  subscription: {
    id: string;
    status: string;
    planType: string;
    hasPrivateCoach: boolean;
    hasMealPlan: boolean;
    startDate: string;
    endDate: string;
    amount: number;
  } | null;
}

const LOG_SKELETON_WIDTHS = ["82%", "64%", "90%", "58%", "75%", "68%"];
const SYS_SKELETON_WIDTHS = ["80%", "62%", "70%", "58%"];

export default function AdminPanelPage() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<string>("members");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Data States
  const [users, setUsers] = useState<User[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [sysInfo, setSysInfo] = useState<SysInfo | null>(null);
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);

  // Loading states
  const [isMembersLoading, setIsMembersLoading] = useState(true);
  const [isClassesLoading, setIsClassesLoading] = useState(false);
  const [isEquipmentLoading, setIsEquipmentLoading] = useState(false);
  const [isLogsLoading, setIsLogsLoading] = useState(false);
  const [isSubscriptionsLoading, setIsSubscriptionsLoading] = useState(false);

  // Modals States
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isEquipModalOpen, setIsEquipModalOpen] = useState(false);
  const [isEditClassModalOpen, setIsEditClassModalOpen] = useState(false);

  // Form States
  const [newClass, setNewClass] = useState({ title: "", coachId: "", time: "" });
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
  const [newEquip, setNewEquip] = useState({ name: "", status: "Operational" });

  // Class Students Management
  const [isStudentsModalOpen, setIsStudentsModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);
  const [studentSearch, setStudentSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Coaches list for dropdown
  const [coaches, setCoaches] = useState<User[]>([]);

  // Loading states for double-submission prevention
  const [isCreatingClass, setIsCreatingClass] = useState(false);
  const [isEditingClass, setIsEditingClass] = useState(false);
  const [isCreatingEquipment, setIsCreatingEquipment] = useState(false);
  const [isEnrollingStudent, setIsEnrollingStudent] = useState(false);

  // Custom confirm modals state
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    variant: "danger" | "warning";
    action: () => void;
  }>({ open: false, title: "", message: "", confirmLabel: "Confirm", variant: "danger", action: () => {} });

  // Edit role modal state
  const [editRoleState, setEditRoleState] = useState<{
    open: boolean;
    userId: string;
    userName: string;
    currentRole: string;
  }>({ open: false, userId: "", userName: "", currentRole: "" });

  // Search & Filter state for Members
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState("all");

  // Edit equipment modal state
  const [editEquipState, setEditEquipState] = useState<{
    open: boolean;
    id: string;
    name: string;
    status: string;
  }>({ open: false, id: "", name: "", status: "Operational" });

  // Manage subscription modal state
  const [manageSubState, setManageSubState] = useState<{
    open: boolean;
    user: SubscriptionItem | null;
  }>({ open: false, user: null });
  const [manageSubForm, setManageSubForm] = useState({
    planType: "MONTHLY",
    hasPrivateCoach: false,
    hasMealPlan: false,
    giftDays: "",
  });
  const [isSavingSub, setIsSavingSub] = useState(false);

  // Grant Gift Subscription form state
  const [grantForm, setGrantForm] = useState({
    searchQuery: "",
    selectedUserId: "",
    selectedUserName: "",
    planType: "MONTHLY",
    startDate: new Date().toISOString().split("T")[0],
    hasPrivateCoach: false,
    hasMealPlan: false,
  });
  const [isGranting, setIsGranting] = useState(false);

  // --- MEMBERS API ---
  const loadMembers = useCallback(async () => {
    setIsMembersLoading(true);
    try {
      const res = await fetch("/api/users");
      const json = await res.json();
      setUsers(Array.isArray(json.data) ? json.data : []);
    } catch (err) {
      console.error("Error loading users", err);
    } finally {
      setIsMembersLoading(false);
    }
  }, []);

  const loadCoaches = useCallback(async () => {
    try {
      const res = await fetch("/api/users");
      const json = await res.json();
      const allUsers = Array.isArray(json.data) ? json.data : [];
      setCoaches(allUsers.filter((u: User) => u.role.toLowerCase() === "coach"));
    } catch (err) {
      console.error("Error loading coaches", err);
    }
  }, []);

  useEffect(() => {
    const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
    const currentUserRaw = localStorage.getItem("currentUser");

    if (!isLoggedIn || !currentUserRaw) {
      router.replace("/login");
      return;
    }

    try {
      const user = JSON.parse(currentUserRaw);
      if ((user.role || "").trim().toLowerCase() !== "admin") {
        router.replace("/dashboard");
      }
    } catch {
      localStorage.clear();
      router.replace("/login");
    }
  }, [router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadMembers();
    loadCoaches();
  }, [loadMembers, loadCoaches]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    card.style.setProperty("--mx", `${x}%`);
    card.style.setProperty("--my", `${y}%`);
  };

  const safeGetStudents = (classItem: ClassItem | null): ClassStudent[] => {
    if (!classItem || !classItem.students) return [];
    if (Array.isArray(classItem.students)) return classItem.students;
    if (typeof classItem.students === "string") {
      try {
        const parsed = JSON.parse(classItem.students);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const showSection = (section: string) => {
    setActiveSection(section);
    setIsMobileMenuOpen(false);
    if (section === "members") loadMembers();
    if (section === "classes") loadClasses();
    if (section === "subscriptions") loadSubscriptions();
    if (section === "equipment") loadEquipment();
    if (section === "server") {
      fetchLogs();
      fetchSystemInfo();
    }
  };

  const filteredStudents = users.filter((u) => {
    if (!studentSearch.trim()) return false;
    const q = studentSearch.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  });

  const editUserRole = (userId: string, currentRole: string, userName: string) => {
    setEditRoleState({ open: true, userId, userName, currentRole });
  };

  const handleRoleConfirm = async (newRole: string) => {
    const { userId, currentRole } = editRoleState;
    setEditRoleState((s) => ({ ...s, open: false }));

    if (!newRole || newRole.toLowerCase() === currentRole.toLowerCase()) return;
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId, newRole })
      });
      if (res.ok) {
        showToast("success", "Role updated successfully.");
        loadMembers();
      } else {
        showToast("error", "Failed to update role.");
      }
    } catch {
      showToast("error", "Network error. Please try again.");
    }
  };

  const confirmDeleteUser = (userId: string, userName: string) => {
    setConfirmState({
      open: true,
      title: "Confirm Delete",
      message: `Delete "${userName}"? This action cannot be undone and will permanently remove this user.`,
      confirmLabel: "Yes, Delete",
      variant: "danger",
      action: async () => {
        setConfirmState((s) => ({ ...s, open: false }));
        try {
          const res = await fetch("/api/users", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: userId })
          });
          if (res.ok) {
            showToast("success", "User removed successfully.");
            loadMembers();
          } else {
            showToast("error", "Failed to delete user.");
          }
        } catch {
          showToast("error", "Network error. Please try again.");
        }
      }
    });
  };

  // --- CLASSES API ---
  const loadClasses = async () => {
    setIsClassesLoading(true);
    try {
      const res = await fetch("/api/classes");
      const json = await res.json();
      setClasses(Array.isArray(json.data) ? json.data : []);
    } catch (err) {
      console.error("Error loading classes", err);
    } finally {
      setIsClassesLoading(false);
    }
  };

  const saveNewClass = async () => {
    if (!newClass.title || !newClass.coachId) {
      showToast("warning", "Title and Coach are required.");
      return;
    }
    setIsCreatingClass(true);
    try {
      const selectedCoach = coaches.find((c) => c.id === newClass.coachId);
      const res = await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newClass.title,
          coach: selectedCoach?.name || "",
          coachId: newClass.coachId,
          time: newClass.time
        })
      });
      if (res.ok) {
        showToast("success", "Class created successfully.");
        setIsClassModalOpen(false);
        setNewClass({ title: "", coachId: "", time: "" });
        loadClasses();
      } else {
        showToast("error", "Failed to create class.");
      }
    } catch {
      showToast("error", "Network error. Please try again.");
    } finally {
      setIsCreatingClass(false);
    }
  };

  const saveEditClass = async () => {
    if (!editingClass) return;
    setIsEditingClass(true);
    try {
      const selectedCoach = coaches.find((c) => c.id === editingClass.coachId);
      const res = await fetch(`/api/classes/${editingClass.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editingClass.title,
          coach: selectedCoach?.name || editingClass.coach,
          coachId: editingClass.coachId,
          time: editingClass.time
        })
      });
      if (res.ok) {
        showToast("success", "Class updated successfully.");
        setIsEditClassModalOpen(false);
        loadClasses();
      } else {
        showToast("error", "Failed to update class.");
      }
    } catch {
      showToast("error", "Network error. Please try again.");
    } finally {
      setIsEditingClass(false);
    }
  };

  const confirmDeleteClass = (classId: string, title: string) => {
    setConfirmState({
      open: true,
      title: "Delete Class",
      message: `Are you sure you want to delete "${title}"? This cannot be undone.`,
      confirmLabel: "Delete Class",
      variant: "danger",
      action: async () => {
        setConfirmState((s) => ({ ...s, open: false }));
        try {
          const res = await fetch(`/api/classes/${classId}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" }
          });
          if (res.ok) {
            showToast("success", "Class removed successfully.");
            loadClasses();
          } else {
            showToast("error", "Failed to delete class.");
          }
        } catch {
          showToast("error", "Network error. Please try again.");
        }
      }
    });
  };

  // --- MANAGE CLASS STUDENTS ---
  const openManageStudentsModal = (classItem: ClassItem) => {
    setSelectedClass(classItem);
    setIsStudentsModalOpen(true);
  };

  const addStudentToClass = async (email: string) => {
    if (!selectedClass || !email.trim()) return;
    setIsEnrollingStudent(true);
    try {
      const res = await fetch(`/api/classes/${selectedClass.id}/enrollments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() })
      });
      if (res.ok) {
        showToast("success", "Member added to class.");
        setStudentSearch("");
        setShowSuggestions(false);
        setIsStudentsModalOpen(false);
        loadClasses();
      } else {
        showToast("error", "User not found or already enrolled.");
      }
    } catch {
      showToast("error", "Network error. Please try again.");
    } finally {
      setIsEnrollingStudent(false);
    }
  };

  const removeStudentFromClass = async (studentId: string) => {
    if (!selectedClass) return;
    try {
      const res = await fetch(`/api/classes/${selectedClass.id}/enrollments`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId })
      });
      if (res.ok) {
        showToast("success", "Member removed from class.");
        setIsStudentsModalOpen(false);
        loadClasses();
      } else {
        showToast("error", "Failed to remove member.");
      }
    } catch {
      showToast("error", "Network error. Please try again.");
    }
  };

  // --- EQUIPMENT API ---
  const loadEquipment = async () => {
    setIsEquipmentLoading(true);
    try {
      const res = await fetch("/api/equipment");
      const json = await res.json();
      setEquipment(Array.isArray(json.data) ? json.data : []);
    } catch {
      console.error("Error loading equipment");
    } finally {
      setIsEquipmentLoading(false);
    }
  };

  // --- SUBSCRIPTIONS API ---
  const loadSubscriptions = async () => {
    setIsSubscriptionsLoading(true);
    try {
      const res = await fetch("/api/admin/subscriptions");
      const json = await res.json();
      setSubscriptions(Array.isArray(json.data) ? json.data : []);
    } catch (err) {
      console.error("Error loading subscriptions", err);
    } finally {
      setIsSubscriptionsLoading(false);
    }
  };

  const openManageSubscription = (subItem: SubscriptionItem) => {
    setManageSubState({ open: true, user: subItem });
    setManageSubForm({
      planType: subItem.subscription?.planType || "MONTHLY",
      hasPrivateCoach: subItem.subscription?.hasPrivateCoach || false,
      hasMealPlan: subItem.subscription?.hasMealPlan || false,
      giftDays: "",
    });
  };

  const saveManagedSubscription = async () => {
    if (!manageSubState.user) return;
    setIsSavingSub(true);
    try {
      const payload: { userId: string; planType: string; hasPrivateCoach: boolean; hasMealPlan: boolean; customDays?: number } = {
        userId: manageSubState.user.userId,
        planType: manageSubForm.planType,
        hasPrivateCoach: manageSubForm.hasPrivateCoach,
        hasMealPlan: manageSubForm.hasMealPlan,
      };

      if (manageSubForm.giftDays && parseInt(manageSubForm.giftDays) > 0) {
        payload.customDays = parseInt(manageSubForm.giftDays);
      }

      const res = await fetch("/api/admin/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        showToast("success", `Subscription updated for ${manageSubState.user.name}.`);
        setManageSubState({ open: false, user: null });
        loadSubscriptions();
      } else {
        showToast("error", json.message || "Failed to update subscription.");
      }
    } catch {
      showToast("error", "Network error. Please try again.");
    } finally {
      setIsSavingSub(false);
    }
  };

  // --- GRANT GIFT SUBSCRIPTION ---
  const grantSearchResults = users.filter((u) => {
    if (!grantForm.searchQuery.trim() || grantForm.selectedUserId) return false;
    const q = grantForm.searchQuery.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  const grantSubscription = async () => {
    if (!grantForm.selectedUserId) {
      showToast("warning", "Please select a user first.");
      return;
    }
    setIsGranting(true);
    try {
      const res = await fetch("/api/admin/grant-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: grantForm.selectedUserId,
          planType: grantForm.planType,
          startDate: grantForm.startDate || undefined,
          hasPrivateCoach: grantForm.hasPrivateCoach,
          hasMealPlan: grantForm.hasMealPlan,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        showToast("success", json.message || "Gift subscription granted successfully!");
        setGrantForm({
          searchQuery: "",
          selectedUserId: "",
          selectedUserName: "",
          planType: "MONTHLY",
          startDate: new Date().toISOString().split("T")[0],
          hasPrivateCoach: false,
          hasMealPlan: false,
        });
        loadSubscriptions();
      } else {
        showToast("error", json.message || "Failed to grant subscription.");
      }
    } catch {
      showToast("error", "Network error. Please try again.");
    } finally {
      setIsGranting(false);
    }
  };

  const saveNewEquipment = async () => {
    if (!newEquip.name) return;
    setIsCreatingEquipment(true);
    try {
      const res = await fetch("/api/equipment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEquip)
      });
      if (res.ok) {
        showToast("success", "Equipment added successfully.");
        setIsEquipModalOpen(false);
        setNewEquip({ name: "", status: "Operational" });
        loadEquipment();
      } else {
        showToast("error", "Failed to add equipment.");
      }
    } catch {
      showToast("error", "Network error. Please try again.");
    } finally {
      setIsCreatingEquipment(false);
    }
  };

  const editEquipment = (id: string, name: string, status: string) => {
    setEditEquipState({ open: true, id, name, status });
  };

  const handleEditEquipConfirm = async () => {
    const { id, name, status } = editEquipState;
    setEditEquipState((s) => ({ ...s, open: false }));
    if (!name.trim()) return;
    try {
      const res = await fetch(`/api/equipment/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), status })
      });
      if (res.ok) {
        showToast("success", "Equipment updated successfully.");
        loadEquipment();
      } else {
        showToast("error", "Failed to update equipment.");
      }
    } catch {
      showToast("error", "Network error. Please try again.");
    }
  };

  const confirmDeleteEquipment = (id: string, name: string) => {
    setConfirmState({
      open: true,
      title: "Delete Equipment",
      message: `Delete "${name}"? This action cannot be undone.`,
      confirmLabel: "Delete",
      variant: "danger",
      action: async () => {
        setConfirmState((s) => ({ ...s, open: false }));
        try {
          const res = await fetch(`/api/equipment/${id}`, { method: "DELETE" });
          if (res.ok) {
            showToast("success", "Equipment removed successfully.");
            loadEquipment();
          } else {
            showToast("error", "Failed to delete equipment.");
          }
        } catch {
          showToast("error", "Network error. Please try again.");
        }
      }
    });
  };

  // --- SERVER CONSOLE API ---
  const fetchLogs = async () => {
    setIsLogsLoading(true);
    try {
      const res = await fetch("/api/logs");
      const json = await res.json();
      setLogs(json.data || []);
    } catch {
      setLogs(["Failed to load server logs."]);
    } finally {
      setIsLogsLoading(false);
    }
  };

  const [isSysInfoLoading, setIsSysInfoLoading] = useState(true);

  const fetchSystemInfo = async () => {
    setIsSysInfoLoading(true);
    try {
      const res = await fetch("/api/dashboard/stats");
      const json = await res.json();
      setSysInfo(json.data || null);
    } catch {
      setSysInfo(null);
    } finally {
      setIsSysInfoLoading(false);
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const handleLogout = () => {
    localStorage.clear();
    document.cookie = "session=; path=/; max-age=0";
    router.replace("/login");
  };

  const filteredMembers = users.filter((member) => {
    const matchesSearch =
      member.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole =
      selectedRole === "all" ||
      member.role?.toLowerCase() === selectedRole.toLowerCase();
    return matchesSearch && matchesRole;
  });

  return (
    <div className="dash-root min-h-screen bg-[var(--dash-bg)] text-[var(--dash-text)] flex font-sans overflow-x-hidden antialiased selection:bg-red-500 selection:text-white relative">

      <div className="fixed top-[-10%] right-[-10%] w-[500px] h-[500px] bg-red-900/10 rounded-full blur-[160px] pointer-events-none z-0" />

      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden" onClick={() => setIsMobileMenuOpen(false)} aria-hidden="true" />
      )}

      {/* Sidebar */}
      <aside aria-label="Admin navigation" className={`w-64 border-r border-[var(--dash-divider)] bg-[var(--dash-panel)]/95 lg:bg-[var(--dash-panel)]/80 backdrop-blur-xl p-6 flex flex-col justify-between fixed h-screen z-40 lg:z-30 transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div>
          <div className="mb-10 pl-2 flex items-center justify-between">
            <Link href="/">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/img/logo.svg" alt="IronForged" className="h-9 hover:opacity-80 transition-opacity" />
            </Link>
            <button onClick={() => setIsMobileMenuOpen(false)} aria-label="Close menu" className="lg:hidden text-zinc-400 hover:text-white">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>

          <nav className="space-y-1.5">
            {[
              { id: "members", label: "Members", icon: "members" },
              { id: "classes", label: "Classes", icon: "classes" },
              { id: "subscriptions", label: "Subscriptions", icon: "subscriptions" },
              { id: "equipment", label: "Equipment", icon: "equipment" },
              { id: "server", label: "Server Logs", icon: "server" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => showSection(tab.id)}
                aria-current={activeSection === tab.id ? "page" : undefined}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all relative ${activeSection === tab.id ? "bg-gradient-to-r from-zinc-900 to-zinc-900/50 text-red-500 border border-[var(--dash-border)] shadow-inner" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/30"}`}
              >
                {activeSection === tab.id && (
                  <span className="absolute left-0 w-[3px] h-5 bg-red-500 rounded-r-full shadow-[0_0_10px_rgba(239,68,68,0.7)]" aria-hidden="true"></span>
                )}
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  {tab.icon === "members" && <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></>}
                  {tab.icon === "classes" && <><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></>}
                  {tab.icon === "subscriptions" && <><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></>}
                  {tab.icon === "equipment" && <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />}
                  {tab.icon === "server" && <><rect x="2" y="2" width="20" height="8" rx="2" ry="2" /><rect x="2" y="14" width="20" height="8" rx="2" ry="2" /></>}
                </svg>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="space-y-2 border-t border-[var(--dash-divider)] pt-4">
          <button onClick={handleLogout} aria-label="Log out" className="w-full flex items-center gap-3 text-zinc-500 hover:text-red-400 font-bold text-[11px] uppercase tracking-wider px-4 py-2 rounded-xl transition-colors text-left cursor-pointer">
            Log Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 w-full lg:pl-64 min-h-screen flex flex-col z-10 relative">
        <header className="px-4 lg:px-8 pt-6 lg:pt-8 pb-4 flex items-center justify-between border-b border-[var(--dash-divider)] lg:border-none">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsMobileMenuOpen(true)} aria-label="Open menu" className="lg:hidden p-2 bg-zinc-900 border border-[var(--dash-border)] rounded-xl text-zinc-300 hover:text-white transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
            </button>
            <div>
              <h1 className="text-lg lg:text-2xl font-black uppercase tracking-wider text-white">
                ADMIN <span className="text-red-500">PANEL</span>
              </h1>
              <p className="text-[9px] lg:text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5 hidden sm:block">SYSTEM MONITOR & MANAGEMENT</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-[8px] lg:text-[9px] font-black tracking-widest text-emerald-400 uppercase px-2.5 py-1.5 rounded-xl">
              SYSTEM ONLINE
            </div>
          </div>
        </header>

        <div className="p-4 lg:p-8 flex-1">

          {/* 1. MEMBERS SECTION */}
          {activeSection === "members" && (
            <div onMouseMove={handleMouseMove} className="premium-glow-card rounded-2xl p-4 lg:p-6 space-y-4 animate-fadeIn">
              <div className="flex justify-between items-center border-b border-[var(--dash-divider)] pb-3">
                <h2 className="text-xs font-black text-white uppercase tracking-widest">MANAGE MEMBERS</h2>
                <span className="text-[10px] bg-zinc-900/80 px-3 py-1 rounded-full font-bold text-zinc-400">{filteredMembers.length} / {users.length}</span>
              </div>

              {/* Search & Filter Bar */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search members by name or email..."
                    className="w-full bg-zinc-900/50 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs font-bold text-white placeholder:text-zinc-600 focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 outline-none transition-all"
                  />
                </div>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="select-dark bg-zinc-900/50 border border-slate-800 rounded-xl px-3 py-2.5 text-xs font-bold text-white focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 outline-none transition-all sm:w-44"
                >
                  <option value="all">All Roles</option>
                  <option value="member">Members</option>
                  <option value="coach">Coaches</option>
                  <option value="admin">Admins</option>
                </select>
              </div>

              <div className="w-full overflow-x-auto block">
                <table className="w-full text-left text-xs min-w-[600px]" aria-label="Members">
                  <thead>
                    <tr className="text-[9px] uppercase font-black text-zinc-500 tracking-widest border-b border-[var(--dash-divider)] pb-3">
                      <th scope="col" className="pb-2">Name</th>
                      <th scope="col" className="pb-2">Email</th>
                      <th scope="col" className="pb-2">Role</th>
                      <th scope="col" className="pb-2">Goal</th>
                      <th scope="col" className="pb-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--dash-divider)] text-zinc-300">
                    {isMembersLoading ? (
                      <SkeletonTableRows rows={6} cols={5} />
                    ) : filteredMembers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <svg className="text-zinc-700" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="11" cy="11" r="8" />
                              <line x1="21" y1="21" x2="16.65" y2="16.65" />
                              <line x1="8" y1="11" x2="14" y2="11" />
                            </svg>
                            <span className="text-zinc-600 font-bold text-[11px]">No members found matching your search.</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredMembers.map((u) => (
                      <tr key={u.id} className="hover:bg-zinc-900/10 transition-colors">
                        <td className="py-3 font-black text-white">{u.name}</td>
                        <td className="py-3 text-zinc-400">{u.email}</td>
                        <td className="py-3">
                          <span className={`text-[9px] px-2.5 py-0.5 rounded border font-black uppercase tracking-wider ${u.role === 'admin' ? 'bg-red-500/10 text-red-400 border-red-500/20' : u.role === 'coach' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>{u.role}</span>
                        </td>
                        <td className="py-3 text-zinc-500">{u.goal || "General"}</td>
                        <td className="py-3 text-right space-x-2">
                          <button onClick={() => editUserRole(u.id, u.role, u.name)} className="bg-zinc-900 hover:bg-zinc-800 border border-[var(--dash-border)] px-2.5 py-1 rounded-lg font-bold text-[10px] text-zinc-300 transition-colors">Edit Role</button>
                          <button onClick={() => confirmDeleteUser(u.id, u.name)} className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 px-2.5 py-1 rounded-lg font-bold text-[10px] text-red-400 transition-colors">Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 2. CLASSES SECTION */}
          {activeSection === "classes" && (
            <div onMouseMove={handleMouseMove} className="premium-glow-card rounded-2xl p-4 lg:p-6 space-y-4 animate-fadeIn">
              <div className="flex justify-between items-center border-b border-[var(--dash-divider)] pb-3">
                <h2 className="text-xs font-black text-white uppercase tracking-widest">MANAGE CLASSES</h2>
                <button onClick={() => setIsClassModalOpen(true)} className="bg-red-500 hover:bg-red-600 text-white font-black text-[10px] uppercase tracking-widest px-4 py-2 rounded-xl transition-all shadow-lg shadow-red-500/10">+ Add Class</button>
              </div>
              <div className="w-full overflow-x-auto block">
                <table className="w-full text-left text-xs min-w-[650px]" aria-label="Classes">
                  <thead>
                    <tr className="text-[9px] uppercase font-black text-zinc-500 tracking-widest border-b border-[var(--dash-divider)] pb-3">
                      <th scope="col" className="pb-2">Title</th>
                      <th scope="col" className="pb-2">Coach</th>
                      <th scope="col" className="pb-2">Schedule</th>
                      <th scope="col" className="pb-2">Students Count</th>
                      <th scope="col" className="pb-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--dash-divider)] text-zinc-300">
                    {isClassesLoading ? (
                      <SkeletonTableRows rows={5} cols={5} />
                    ) : classes.map((c) => {
                      const enrolledCount = safeGetStudents(c).length;
                      return (
                        <tr key={c.id} className="hover:bg-zinc-900/10 transition-colors">
                          <td className="py-3 font-black text-white">{c.title}</td>
                          <td className="py-3 text-zinc-400">{c.coach}</td>
                          <td className="py-3 text-zinc-400">{c.time}</td>
                          <td className="py-3">
                            <button onClick={() => openManageStudentsModal(c)} className="text-left text-red-400 hover:text-red-500 hover:underline font-black flex items-center gap-1">
                              <span>&#9679;</span> {enrolledCount} Enrolled (Manage)
                            </button>
                          </td>
                          <td className="py-3 text-right space-x-2">
                            <button onClick={() => { setEditingClass(c); setIsEditClassModalOpen(true); }} className="bg-zinc-900 hover:bg-zinc-800 border border-[var(--dash-border)] px-2.5 py-1 rounded-lg font-bold text-[10px] text-zinc-300 transition-colors">Edit</button>
                            <button onClick={() => confirmDeleteClass(c.id, c.title)} className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 px-2.5 py-1 rounded-lg font-bold text-[10px] text-red-400 transition-colors">Delete</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3. EQUIPMENT SECTION */}
          {activeSection === "equipment" && (
            <div onMouseMove={handleMouseMove} className="premium-glow-card rounded-2xl p-4 lg:p-6 space-y-4 animate-fadeIn">
              <div className="flex justify-between items-center border-b border-[var(--dash-divider)] pb-3">
                <h2 className="text-xs font-black text-white uppercase tracking-widest">MANAGE EQUIPMENT</h2>
                <button onClick={() => setIsEquipModalOpen(true)} className="bg-red-500 hover:bg-red-600 text-white font-black text-[10px] uppercase tracking-widest px-4 py-2 rounded-xl transition-all shadow-lg shadow-red-500/10">+ Add Equipment</button>
              </div>
              <div className="w-full overflow-x-auto block">
                <table className="w-full text-left text-xs min-w-[550px]" aria-label="Equipment">
                  <thead>
                    <tr className="text-[9px] uppercase font-black text-zinc-500 tracking-widest border-b border-[var(--dash-divider)] pb-3">
                      <th scope="col" className="pb-2">Name</th>
                      <th scope="col" className="pb-2">Status</th>
                      <th scope="col" className="pb-2">Last Check</th>
                      <th scope="col" className="pb-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--dash-divider)] text-zinc-300">
                    {isEquipmentLoading ? (
                      <SkeletonTableRows rows={4} cols={4} />
                    ) : equipment.map((e) => (
                      <tr key={e.id} className="hover:bg-zinc-900/10 transition-colors">
                        <td className="py-3 font-black text-white">{e.name}</td>
                        <td className="py-3">
                          <span className={`text-[9px] px-2.5 py-0.5 rounded border font-black uppercase tracking-wider ${e.status === 'Operational' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : e.status === 'Under Repair' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>{e.status}</span>
                        </td>
                        <td className="py-3 text-zinc-500">{e.lastCheck || "N/A"}</td>
                        <td className="py-3 text-right space-x-2">
                          <button onClick={() => editEquipment(e.id, e.name, e.status)} className="bg-zinc-900 hover:bg-zinc-800 border border-[var(--dash-border)] px-2.5 py-1 rounded-lg font-bold text-[10px] text-zinc-300 transition-colors">Edit</button>
                          <button onClick={() => confirmDeleteEquipment(e.id, e.name)} className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 px-2.5 py-1 rounded-lg font-bold text-[10px] text-red-400 transition-colors">Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 4. SUBSCRIPTIONS SECTION */}
          {activeSection === "subscriptions" && (
            <div onMouseMove={handleMouseMove} className="premium-glow-card rounded-2xl p-4 lg:p-6 space-y-4 animate-fadeIn">
              <div className="flex justify-between items-center border-b border-[var(--dash-divider)] pb-3">
                <h2 className="text-xs font-black text-white uppercase tracking-widest">SUBSCRIPTION MANAGEMENT</h2>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] bg-zinc-900/80 px-3 py-1 rounded-full font-bold text-zinc-400">{subscriptions.filter(s => s.subscription?.status === "ACTIVE").length} Active</span>
                  <button onClick={loadSubscriptions} className="text-[10px] text-zinc-400 hover:text-white font-bold">Refresh</button>
                </div>
              </div>
              <div className="w-full overflow-x-auto block">
                <table className="w-full text-left text-xs min-w-[700px]" aria-label="Subscriptions">
                  <thead>
                    <tr className="text-[9px] uppercase font-black text-zinc-500 tracking-widest border-b border-[var(--dash-divider)] pb-3">
                      <th scope="col" className="pb-2">Member</th>
                      <th scope="col" className="pb-2">Plan</th>
                      <th scope="col" className="pb-2">Status</th>
                      <th scope="col" className="pb-2">Expiry</th>
                      <th scope="col" className="pb-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--dash-divider)] text-zinc-300">
                    {isSubscriptionsLoading ? (
                      <SkeletonTableRows rows={5} cols={5} />
                    ) : subscriptions.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <span className="text-zinc-600 font-bold text-[11px]">No members found.</span>
                          </div>
                        </td>
                      </tr>
                    ) : subscriptions.map((s) => {
                      const sub = s.subscription;
                      const isActive = sub?.status === "ACTIVE";
                      const endDate = sub?.endDate ? new Date(sub.endDate) : null;
                      const now = new Date();
                      const daysLeft = endDate ? Math.ceil((endDate.getTime() - now.getTime()) / 86400000) : 0;
                      const daysAgo = endDate && !isActive ? Math.abs(daysLeft) : 0;

                      const PLAN_LABELS: Record<string, string> = { DAILY: "Daily", WEEKLY: "Weekly", MONTHLY: "Monthly", SIX_MONTH: "6-Month", YEARLY: "Yearly" };

                      return (
                        <tr key={s.userId} className="hover:bg-zinc-900/10 transition-colors">
                          <td className="py-3">
                            <div className="font-black text-white">{s.name}</div>
                            <div className="text-[10px] text-zinc-500">{s.email}</div>
                          </td>
                          <td className="py-3">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[9px] px-2 py-0.5 rounded border font-black uppercase tracking-wider ${isActive ? "bg-zinc-800 text-white border-zinc-700" : "bg-zinc-900/50 text-zinc-500 border-[var(--dash-border)]"}`}>
                                {PLAN_LABELS[sub?.planType || "MONTHLY"] || sub?.planType || "None"}
                              </span>
                            </div>
                            <div className="flex gap-1 mt-1">
                              {sub?.hasPrivateCoach && <span className="text-[8px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded">Coach</span>}
                              {sub?.hasMealPlan && <span className="text-[8px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">Meal</span>}
                            </div>
                          </td>
                          <td className="py-3">
                            {isActive ? (
                              <span className="text-[9px] px-2.5 py-0.5 rounded border font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Active</span>
                            ) : (
                              <span className="text-[9px] px-2.5 py-0.5 rounded border font-black uppercase tracking-wider bg-red-500/10 text-red-400 border-red-500/20">Expired</span>
                            )}
                          </td>
                          <td className="py-3">
                            {endDate ? (
                              <div>
                                <div className="text-zinc-400">{endDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</div>
                                <div className={`text-[10px] font-bold ${isActive ? (daysLeft <= 7 ? "text-amber-400" : "text-zinc-500") : "text-red-400"}`}>
                                  {isActive ? (daysLeft <= 0 ? "Expires today" : `${daysLeft} days left`) : `Expired ${daysAgo}d ago`}
                                </div>
                              </div>
                            ) : (
                              <span className="text-zinc-600">N/A</span>
                            )}
                          </td>
                          <td className="py-3 text-right">
                            <button onClick={() => openManageSubscription(s)} className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 px-2.5 py-1 rounded-lg font-bold text-[10px] text-red-400 transition-colors">Manage</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 4b. GRANT GIFT SUBSCRIPTION CARD (inside subscriptions section) */}
          {activeSection === "subscriptions" && (
            <div onMouseMove={handleMouseMove} className="premium-glow-card rounded-2xl p-4 lg:p-6 space-y-4 animate-fadeIn mt-6">
              <div className="border-b border-[var(--dash-divider)] pb-3">
                <h2 className="text-xs font-black text-white uppercase tracking-widest">GRANT GIFT SUBSCRIPTION</h2>
                <p className="text-[10px] text-zinc-500 font-bold mt-1">Search for a member and gift them a subscription plan.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Left: User Search */}
                <div className="space-y-3">
                  <div className="relative">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Search Member</label>
                    {grantForm.selectedUserId ? (
                      <div className="flex items-center justify-between bg-[var(--dash-field)] border border-emerald-500/30 rounded-xl px-3 py-2.5">
                        <div>
                          <div className="text-xs font-black text-white">{grantForm.selectedUserName}</div>
                          <div className="text-[10px] text-zinc-500">{users.find(u => u.id === grantForm.selectedUserId)?.email}</div>
                        </div>
                        <button onClick={() => setGrantForm(f => ({ ...f, selectedUserId: "", selectedUserName: "", searchQuery: "" }))} className="text-[10px] text-red-400 hover:text-red-500 font-bold px-2 py-1 bg-red-500/10 border border-red-500/20 rounded-lg transition-colors">Clear</button>
                      </div>
                    ) : (
                      <>
                        <input type="text" value={grantForm.searchQuery} onChange={e => setGrantForm(f => ({ ...f, searchQuery: e.target.value, selectedUserId: "", selectedUserName: "" }))} placeholder="Type name or email..." className="w-full bg-[var(--dash-field)] border border-[var(--dash-border)] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-red-500 placeholder:text-zinc-700" />
                        {grantForm.searchQuery.trim() && grantSearchResults.length > 0 && (
                          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-[var(--dash-field)] border border-[var(--dash-border)] rounded-xl max-h-40 overflow-y-auto shadow-xl">
                            {grantSearchResults.slice(0, 8).map((u) => (
                              <button key={u.id} onClick={() => setGrantForm(f => ({ ...f, selectedUserId: u.id, selectedUserName: u.name, searchQuery: "" }))} className="w-full text-left px-3 py-2 text-xs hover:bg-zinc-800/60 transition-colors flex items-center gap-2 border-b border-[var(--dash-divider)] last:border-0">
                                <div>
                                  <div className="font-bold text-white">{u.name}</div>
                                  <div className="text-[10px] text-zinc-500">{u.email}</div>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                        {grantForm.searchQuery.trim() && grantSearchResults.length === 0 && (
                          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-[var(--dash-field)] border border-[var(--dash-border)] rounded-xl px-3 py-3 text-xs text-zinc-500 shadow-xl">
                            No members found matching &quot;{grantForm.searchQuery}&quot;
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Start Date</label>
                    <input type="date" value={grantForm.startDate} onChange={e => setGrantForm(f => ({ ...f, startDate: e.target.value }))} disabled={isGranting} className="w-full bg-[var(--dash-field)] border border-[var(--dash-border)] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-red-500 disabled:opacity-50" />
                  </div>
                </div>

                {/* Right: Plan + Addons */}
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Gift Plan</label>
                    <select value={grantForm.planType} onChange={e => setGrantForm(f => ({ ...f, planType: e.target.value }))} disabled={isGranting} className="select-dark w-full bg-[var(--dash-field)] border border-[var(--dash-border)] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-transparent disabled:opacity-50">
                      <option value="DAILY">Gift Daily (1 day)</option>
                      <option value="WEEKLY">Gift Weekly (7 days)</option>
                      <option value="MONTHLY">Gift Monthly (30 days)</option>
                      <option value="SIX_MONTH">Gift 6-Months (180 days)</option>
                      <option value="YEARLY">Gift Yearly (365 days)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-2">Add-ons</label>
                    <div className="space-y-2">
                      <button onClick={() => setGrantForm(f => ({ ...f, hasPrivateCoach: !f.hasPrivateCoach }))} disabled={isGranting}
                        className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all disabled:opacity-50 ${grantForm.hasPrivateCoach ? "bg-blue-500/10 border-blue-500/50" : "bg-[var(--dash-field)] border-[var(--dash-border)] hover:border-zinc-700"}`}>
                        <div className="text-left">
                          <div className="text-xs font-black text-white">Include Private Coach</div>
                          <div className="text-[10px] text-zinc-500 font-bold">1-on-1 dedicated training</div>
                        </div>
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${grantForm.hasPrivateCoach ? "bg-blue-500 border-blue-500" : "border-zinc-700 bg-[var(--dash-field)]"}`}>
                          {grantForm.hasPrivateCoach && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>}
                        </div>
                      </button>
                      <button onClick={() => setGrantForm(f => ({ ...f, hasMealPlan: !f.hasMealPlan }))} disabled={isGranting}
                        className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all disabled:opacity-50 ${grantForm.hasMealPlan ? "bg-emerald-500/10 border-emerald-500/50" : "bg-[var(--dash-field)] border-[var(--dash-border)] hover:border-zinc-700"}`}>
                        <div className="text-left">
                          <div className="text-xs font-black text-white">Include Custom Meal Plan</div>
                          <div className="text-[10px] text-zinc-500 font-bold">Nutrition & macro guidance</div>
                        </div>
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${grantForm.hasMealPlan ? "bg-emerald-500 border-emerald-500" : "border-zinc-700 bg-[var(--dash-field)]"}`}>
                          {grantForm.hasMealPlan && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>}
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-[var(--dash-divider)]">
                <button onClick={grantSubscription} disabled={isGranting || !grantForm.selectedUserId}
                  className="px-6 py-2.5 bg-red-500 hover:bg-red-600 rounded-xl text-xs font-black uppercase text-white tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-red-500/20">
                  {isGranting && <Spinner />}
                  {isGranting ? "Granting..." : "Confirm & Gift Subscription"}
                </button>
              </div>
            </div>
          )}
          {activeSection === "server" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
              <div onMouseMove={handleMouseMove} className="premium-glow-card rounded-2xl p-4 lg:p-6 space-y-3">
                <div className="flex justify-between items-center border-b border-[var(--dash-divider)] pb-2">
                  <h3 className="text-xs font-black text-white uppercase tracking-widest">SERVER LOGS</h3>
                  <div className="space-x-2">
                    <button onClick={fetchLogs} className="text-[10px] text-zinc-400 hover:text-white font-bold">Refresh</button>
                    <button onClick={clearLogs} className="text-[10px] text-red-400 hover:text-red-500 font-bold">Clear</button>
                  </div>
                </div>
                <div className="bg-[#040406] border border-[var(--dash-divider)] rounded-xl p-4 font-mono text-[11px] text-zinc-400 h-64 overflow-y-auto space-y-1">
                  {isLogsLoading ? (
                    <div className="space-y-2">
                      {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-3.5 bg-zinc-800/60 animate-pulse rounded" style={{ width: LOG_SKELETON_WIDTHS[i % LOG_SKELETON_WIDTHS.length] }} />)}
                    </div>
                  ) : logs.length === 0 ? (
                    <div className="text-zinc-600">No logs to display.</div>
                  ) : (
                    logs.map((l, idx) => (
                      <div key={idx} className={`border-l-2 pl-2 py-0.5 ${
                        l.includes("[LOGIN]") ? "border-emerald-500/60 text-emerald-400/80" :
                        l.includes("[REGISTER]") ? "border-blue-500/60 text-blue-400/80" :
                        l.includes("[ROLE_UPDATE]") ? "border-amber-500/60 text-amber-400/80" :
                        l.includes("[CLASS_MGMT]") ? "border-purple-500/60 text-purple-400/80" :
                        l.includes("[EQUIPMENT]") ? "border-orange-500/60 text-orange-400/80" :
                        "border-zinc-700"
                      }`}>{l}</div>
                    ))
                  )}
                </div>
              </div>

              <div onMouseMove={handleMouseMove} className="premium-glow-card rounded-2xl p-4 lg:p-6 space-y-3">
                <div className="flex justify-between items-center border-b border-[var(--dash-divider)] pb-2">
                  <h3 className="text-xs font-black text-white uppercase tracking-widest">SYSTEM INFO</h3>
                  <button onClick={fetchSystemInfo} className="text-[10px] text-zinc-400 hover:text-white font-bold">Refresh</button>
                </div>
                <div className="bg-[#040406] border border-[var(--dash-divider)] rounded-xl p-4 font-mono text-[11px] text-zinc-400 h-64 space-y-2">
                  {isSysInfoLoading ? (
                    <div className="space-y-2 py-2">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-3.5 bg-zinc-800/60 animate-pulse rounded" style={{ width: SYS_SKELETON_WIDTHS[i % SYS_SKELETON_WIDTHS.length] }} />
                      ))}
                    </div>
                  ) : sysInfo ? (
                    <>
                      <div>Status: <span className="text-emerald-400 font-bold">{sysInfo.status || "Online"}</span></div>
                      <div>Uptime: <span className="text-zinc-200">{sysInfo.uptime || "N/A"}</span></div>
                      <div>Memory: <span className="text-zinc-200">{sysInfo.memory || "N/A"}</span></div>
                      <div>Total Users: <span className="text-zinc-200">{sysInfo.users ?? 0}</span></div>
                      <div>Revenue: <span className="text-emerald-400 font-bold">${(sysInfo.revenue ?? 0).toFixed(2)}</span></div>
                      {sysInfo.memoryUsedMB != null && sysInfo.memoryTotalMB != null && (
                        <div>Memory Bar:
                          <div className="mt-1 h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${Math.min((sysInfo.memoryUsedMB / sysInfo.memoryTotalMB) * 100, 100)}%` }} />
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-zinc-600 py-4 text-center">Failed to load system info.</div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* --- ADD CLASS MODAL --- */}
      {isClassModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--dash-panel)] border border-[var(--dash-border)] rounded-2xl p-5 lg:p-6 w-full max-w-sm space-y-4 animate-fadeIn">
            <h3 className="text-sm font-black text-white uppercase tracking-wider">Add New Class</h3>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Class Title</label>
                <input type="text" value={newClass.title} onChange={e => setNewClass({ ...newClass, title: e.target.value })} disabled={isCreatingClass} className="w-full bg-[var(--dash-field)] border border-[var(--dash-border)] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 disabled:opacity-50 disabled:cursor-not-allowed" placeholder="e.g. Iron Pump" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Instructor</label>
                <select value={newClass.coachId} onChange={e => setNewClass({ ...newClass, coachId: e.target.value })} disabled={isCreatingClass} className="select-dark w-full bg-[var(--dash-field)] border border-[var(--dash-border)] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed">
                  <option value="">-- Select Coach --</option>
                  {coaches.map((coach) => (<option key={coach.id} value={coach.id}>{coach.name}</option>))}
                </select>
                {coaches.length === 0 && (<p className="text-[10px] text-amber-500 mt-1">No coaches found. Assign the Coach role to a user first.</p>)}
              </div>
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Schedule</label>
                <input type="text" value={newClass.time} onChange={e => setNewClass({ ...newClass, time: e.target.value })} disabled={isCreatingClass} className="w-full bg-[var(--dash-field)] border border-[var(--dash-border)] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 disabled:opacity-50 disabled:cursor-not-allowed" placeholder="e.g. Mon/Wed 6-7PM" />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button onClick={() => setIsClassModalOpen(false)} disabled={isCreatingClass} className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 rounded-xl text-xs font-bold text-zinc-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Cancel</button>
              <button onClick={saveNewClass} disabled={isCreatingClass} className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-xl text-xs font-black uppercase text-white tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                {isCreatingClass && <Spinner />}
                {isCreatingClass ? "Creating..." : "Create Class"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- EDIT CLASS MODAL --- */}
      {isEditClassModalOpen && editingClass && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--dash-panel)] border border-[var(--dash-border)] rounded-2xl p-5 lg:p-6 w-full max-w-sm space-y-4 animate-fadeIn">
            <h3 className="text-sm font-black text-white uppercase tracking-wider">Edit Class</h3>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Class Title</label>
                <input type="text" value={editingClass.title} onChange={e => setEditingClass({ ...editingClass, title: e.target.value })} disabled={isEditingClass} className="w-full bg-[var(--dash-field)] border border-[var(--dash-border)] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 disabled:opacity-50 disabled:cursor-not-allowed" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Instructor</label>
                <select value={editingClass.coachId || ""} onChange={e => setEditingClass({ ...editingClass, coachId: e.target.value })} disabled={isEditingClass} className="select-dark w-full bg-[var(--dash-field)] border border-[var(--dash-border)] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed">
                  <option value="">-- Select Coach --</option>
                  {coaches.map((coach) => (<option key={coach.id} value={coach.id}>{coach.name}</option>))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Schedule</label>
                <input type="text" value={editingClass.time} onChange={e => setEditingClass({ ...editingClass, time: e.target.value })} disabled={isEditingClass} className="w-full bg-[var(--dash-field)] border border-[var(--dash-border)] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 disabled:opacity-50 disabled:cursor-not-allowed" />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button onClick={() => setIsEditClassModalOpen(false)} disabled={isEditingClass} className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 rounded-xl text-xs font-bold text-zinc-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Cancel</button>
              <button onClick={saveEditClass} disabled={isEditingClass} className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-xl text-xs font-black uppercase text-white tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                {isEditingClass && <Spinner />}
                {isEditingClass ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- ADD EQUIPMENT MODAL --- */}
      {isEquipModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--dash-panel)] border border-[var(--dash-border)] rounded-2xl p-5 lg:p-6 w-full max-w-sm space-y-4 animate-fadeIn">
            <h3 className="text-sm font-black text-white uppercase tracking-wider">Add Equipment</h3>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Equipment Name</label>
                <input type="text" value={newEquip.name} onChange={e => setNewEquip({ ...newEquip, name: e.target.value })} disabled={isCreatingEquipment} className="w-full bg-[var(--dash-field)] border border-[var(--dash-border)] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 disabled:opacity-50 disabled:cursor-not-allowed" placeholder="e.g. Treadmill #4" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Status</label>
                <select value={newEquip.status} onChange={e => setNewEquip({ ...newEquip, status: e.target.value })} disabled={isCreatingEquipment} className="select-dark w-full bg-[var(--dash-field)] border border-[var(--dash-border)] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed">
                  <option value="Operational">Operational</option>
                  <option value="Under Repair">Under Repair</option>
                  <option value="Out of Order">Out of Order</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button onClick={() => setIsEquipModalOpen(false)} disabled={isCreatingEquipment} className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 rounded-xl text-xs font-bold text-zinc-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Cancel</button>
              <button onClick={saveNewEquipment} disabled={isCreatingEquipment} className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-xl text-xs font-black uppercase text-white tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                {isCreatingEquipment && <Spinner />}
                {isCreatingEquipment ? "Adding..." : "Add Equipment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MANAGE CLASS STUDENTS MODAL --- */}
      {isStudentsModalOpen && selectedClass && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowSuggestions(false)}>
          <div className="bg-[var(--dash-panel)] border border-[var(--dash-border)] rounded-2xl p-5 lg:p-6 w-full max-w-md space-y-4 animate-fadeIn" onClick={e => e.stopPropagation()}>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Manage Members: {selectedClass.title}</h3>
              <p className="text-[10px] text-zinc-500 font-bold uppercase mt-0.5">Add or remove members from this class</p>
            </div>

            <div className="max-h-40 overflow-y-auto space-y-1.5 border-y border-[var(--dash-divider)] py-3 pr-1">
              {safeGetStudents(selectedClass).length > 0 ? (
                safeGetStudents(selectedClass).map((student) => (
                  <div key={student.id} className="flex justify-between items-center bg-[var(--dash-field)] p-2.5 rounded-xl border border-[var(--dash-divider)]">
                    <div className="text-xs">
                      <div className="font-bold text-white">{student.name || "Unknown"}</div>
                      <div className="text-[10px] text-zinc-500">{student.email}</div>
                    </div>
                    <button onClick={() => removeStudentFromClass(student.id)} className="text-[10px] text-red-400 hover:text-red-500 font-black px-2 py-1 bg-red-500/5 border border-red-500/10 rounded-lg transition-colors">Remove</button>
                  </div>
                ))
              ) : (
                <div className="text-center text-xs text-zinc-600 py-4">No members registered in this class.</div>
              )}
            </div>

            <div className="space-y-2 relative">
              <label className="text-[10px] font-bold text-zinc-500 uppercase block">Search Member (Name or Email)</label>
              <div className="flex gap-2">
                <input type="text" value={studentSearch} onChange={e => { setStudentSearch(e.target.value); setShowSuggestions(true); }} onFocus={() => setShowSuggestions(true)} disabled={isEnrollingStudent} className="flex-1 bg-[var(--dash-field)] border border-[var(--dash-border)] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 disabled:opacity-50 disabled:cursor-not-allowed" placeholder="Type name or email..." />
              </div>
              {showSuggestions && studentSearch.trim() && filteredStudents.length > 0 && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-[var(--dash-field)] border border-[var(--dash-border)] rounded-xl max-h-40 overflow-y-auto shadow-xl">
                  {filteredStudents.slice(0, 8).map((u) => (
                    <button key={u.id} onClick={() => { addStudentToClass(u.email); }} disabled={isEnrollingStudent} className="w-full text-left px-3 py-2 text-xs hover:bg-zinc-800/60 transition-colors flex items-center gap-2 border-b border-[var(--dash-divider)] last:border-0 disabled:opacity-50 disabled:cursor-not-allowed">
                      <div>
                        <div className="font-bold text-white">{u.name}</div>
                        <div className="text-[10px] text-zinc-500">{u.email}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {showSuggestions && studentSearch.trim() && filteredStudents.length === 0 && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-[var(--dash-field)] border border-[var(--dash-border)] rounded-xl px-3 py-3 text-xs text-zinc-500 shadow-xl">
                  No members found matching &quot;{studentSearch}&quot;
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button onClick={() => { setIsStudentsModalOpen(false); setSelectedClass(null); setStudentSearch(""); setShowSuggestions(false); }} disabled={isEnrollingStudent} className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 rounded-xl text-xs font-bold text-zinc-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* --- EDIT EQUIPMENT MODAL (replaces Swal) --- */}
      {editEquipState.open && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--dash-panel)] border border-[var(--dash-border)] rounded-2xl p-5 lg:p-6 w-full max-w-sm space-y-4 animate-fadeIn">
            <h3 className="text-sm font-black text-white uppercase tracking-wider">Edit Equipment</h3>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Equipment Name</label>
                <input type="text" value={editEquipState.name} onChange={e => setEditEquipState(s => ({ ...s, name: e.target.value }))} className="w-full bg-[var(--dash-field)] border border-[var(--dash-border)] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Status</label>
                <select value={editEquipState.status} onChange={e => setEditEquipState(s => ({ ...s, status: e.target.value }))} className="select-dark w-full bg-[var(--dash-field)] border border-[var(--dash-border)] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-transparent">
                  <option value="Operational">Operational</option>
                  <option value="Under Repair">Under Repair</option>
                  <option value="Out of Order">Out of Order</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button onClick={() => setEditEquipState(s => ({ ...s, open: false }))} className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 rounded-xl text-xs font-bold text-zinc-400 transition-colors">Cancel</button>
              <button onClick={handleEditEquipConfirm} className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-xl text-xs font-black uppercase text-white tracking-wider transition-colors">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* --- MANAGE SUBSCRIPTION MODAL --- */}
      {manageSubState.open && manageSubState.user && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--dash-panel)] border border-[var(--dash-border)] rounded-2xl p-5 lg:p-6 w-full max-w-md space-y-5 animate-fadeIn max-h-[90vh] overflow-y-auto">
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Manage Subscription</h3>
              <p className="text-[10px] text-zinc-500 font-bold mt-0.5">{manageSubState.user.name} &bull; {manageSubState.user.email}</p>
            </div>

            {manageSubState.user.subscription && (
              <div className="bg-[var(--dash-field)] border border-[var(--dash-border)] rounded-xl p-3 space-y-1.5">
                <div className="flex justify-between text-[10px]">
                  <span className="text-zinc-500">Current Plan</span>
                  <span className="text-white font-bold">{manageSubState.user.subscription.planType}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-zinc-500">Status</span>
                  <span className={`font-bold ${manageSubState.user.subscription.status === "ACTIVE" ? "text-emerald-400" : "text-red-400"}`}>{manageSubState.user.subscription.status}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-zinc-500">End Date</span>
                  <span className="text-white font-bold">{new Date(manageSubState.user.subscription.endDate).toLocaleDateString("en-GB")}</span>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Plan Type</label>
                <select value={manageSubForm.planType} onChange={e => setManageSubForm(f => ({ ...f, planType: e.target.value }))} disabled={isSavingSub} className="select-dark w-full bg-[var(--dash-field)] border border-[var(--dash-border)] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-transparent disabled:opacity-50">
                  <option value="DAILY">Daily Pass (1 day)</option>
                  <option value="WEEKLY">Weekly Pass (7 days)</option>
                  <option value="MONTHLY">Monthly (30 days)</option>
                  <option value="SIX_MONTH">6-Month (180 days)</option>
                  <option value="YEARLY">Yearly (365 days)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-2">Add-ons</label>
                <div className="space-y-2">
                  <button onClick={() => setManageSubForm(f => ({ ...f, hasPrivateCoach: !f.hasPrivateCoach }))} disabled={isSavingSub}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all disabled:opacity-50 ${manageSubForm.hasPrivateCoach ? "bg-blue-500/10 border-blue-500/50" : "bg-[var(--dash-field)] border-[var(--dash-border)] hover:border-zinc-700"}`}>
                    <div className="text-left">
                      <div className="text-xs font-black text-white">Private Coach</div>
                      <div className="text-[10px] text-zinc-500 font-bold">1-on-1 dedicated training</div>
                    </div>
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${manageSubForm.hasPrivateCoach ? "bg-blue-500 border-blue-500" : "border-zinc-700 bg-[var(--dash-field)]"}`}>
                      {manageSubForm.hasPrivateCoach && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>}
                    </div>
                  </button>
                  <button onClick={() => setManageSubForm(f => ({ ...f, hasMealPlan: !f.hasMealPlan }))} disabled={isSavingSub}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all disabled:opacity-50 ${manageSubForm.hasMealPlan ? "bg-emerald-500/10 border-emerald-500/50" : "bg-[var(--dash-field)] border-[var(--dash-border)] hover:border-zinc-700"}`}>
                    <div className="text-left">
                      <div className="text-xs font-black text-white">Meal Plan</div>
                      <div className="text-[10px] text-zinc-500 font-bold">Custom nutrition & macro guidance</div>
                    </div>
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${manageSubForm.hasMealPlan ? "bg-emerald-500 border-emerald-500" : "border-zinc-700 bg-[var(--dash-field)]"}`}>
                      {manageSubForm.hasMealPlan && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>}
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Custom Gift Extension</label>
                <div className="flex gap-2">
                  <input type="number" min="1" max="365" value={manageSubForm.giftDays} onChange={e => setManageSubForm(f => ({ ...f, giftDays: e.target.value }))} disabled={isSavingSub} placeholder="e.g. 10" className="flex-1 bg-[var(--dash-field)] border border-[var(--dash-border)] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 disabled:opacity-50" />
                  <span className="text-[10px] text-zinc-500 font-bold self-center">days</span>
                </div>
                <p className="text-[9px] text-zinc-600 mt-1">Extends the user&apos;s current end date by this many days.</p>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t border-[var(--dash-divider)]">
              <button onClick={() => setManageSubState({ open: false, user: null })} disabled={isSavingSub} className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 rounded-xl text-xs font-bold text-zinc-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Cancel</button>
              <button onClick={saveManagedSubscription} disabled={isSavingSub} className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-xl text-xs font-black uppercase text-white tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                {isSavingSub && <Spinner />}
                {isSavingSub ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- UNIFIED CONFIRM MODAL --- */}
      <ConfirmModal
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        confirmLabel={confirmState.confirmLabel}
        variant={confirmState.variant}
        onConfirm={confirmState.action}
        onCancel={() => setConfirmState(s => ({ ...s, open: false }))}
      />

      {/* --- EDIT ROLE MODAL --- */}
      <EditRoleModal
        key={`${editRoleState.userName}-${editRoleState.currentRole}`}
        open={editRoleState.open}
        userName={editRoleState.userName}
        currentRole={editRoleState.currentRole}
        onConfirm={handleRoleConfirm}
        onCancel={() => setEditRoleState(s => ({ ...s, open: false }))}
      />

      <ToastContainer />
    </div>
  );
}
