import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { auth } from "../firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";

// ─── Types ────────────────────────────────────────────────────────────────────

type AircraftCategory = "SEP" | "MEP" | "TMG" | "SET" | "HELICOPTER";
type AircraftPurpose = "TRAINING" | "PRIVATE" | "COMMERCIAL";
type OrderBy = "new" | "old" | "popular";

interface CockpitMedia {
  link: string;
  type: string;
}

interface ChecklistItem {
  id: string;
  description: string;
  order: number;
}

interface Checklist {
  id: string;
  name: string;
  items: ChecklistItem[];
}

interface CockpitDetail extends Cockpit {
  checklists: Checklist[];
  creator: { id: string; name: string | null; surname: string | null; avatar: string | null } | null;
}

interface Cockpit {
  id: string;
  name: string;
  manufacturer: string | null;
  model: string | null;
  registration: string | null;
  category: AircraftCategory | null;
  purpose: AircraftPurpose | null;
  hasVfr: boolean;
  hasIfr: boolean;
  hasNight: boolean;
  hasAutopilot: boolean;
  createdAt: string;
  isFavorite: boolean;
  favoritesCount: number;
  media: CockpitMedia[];
}

interface CurrentUser {
  id: string;
  name: string | null;
  surname: string | null;
  role: string;
  avatar: string | null;
}

interface CockpitsResponse {
  items: Cockpit[];
  total: number;
  page: number;
  pages: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatFavorites(count: number): string {
  if (count < 1000) return String(count);
  if (count < 1_000_000) return (count / 1000).toFixed(1) + "K";
  return (count / 1_000_000).toFixed(1) + "M";
}

function getCockpitTags(cockpit: Cockpit): string[] {
  const tags: string[] = [];
  if (cockpit.hasVfr) tags.push("VFR");
  if (cockpit.hasIfr) tags.push("IFR");
  if (cockpit.hasNight) tags.push("Night");
  if (cockpit.hasAutopilot) tags.push("AP");
  return tags;
}

const categoryLabels: Record<AircraftCategory, string> = {
  SEP: "SEP",
  MEP: "MEP",
  TMG: "TMG",
  SET: "SET",
  HELICOPTER: "Helicopter",
};

const purposeLabels: Record<AircraftPurpose, string> = {
  TRAINING: "Training",
  PRIVATE: "Private",
  COMMERCIAL: "Commercial",
};

// ─── CockpitCard ─────────────────────────────────────────────────────────────

interface CardProps {
  cockpit: Cockpit;
  onToggleFav: () => void;
  favLoading: boolean;
  onPreview: () => void;
}

const CockpitCard: React.FC<CardProps> = ({ cockpit, onToggleFav, favLoading, onPreview }) => {
  const tags = getCockpitTags(cockpit);
  const preview = cockpit.media[0]?.link;

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days < 1) return "today";
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return "more than a month ago";
  };

  return (
    <div style={card.gradientWrapper}>
      <div style={card.wrap}>
        <div style={{ ...card.imgBg, backgroundImage: preview ? `url(${preview})` : undefined }}>
          <div style={card.overlay} />

          {/* Arrow button — absolute bottom right */}
          <button style={card.arrowBtn} onClick={onPreview}>            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M4.1665 9.99935H15.8332M15.8332 9.99935L9.99984 4.16602M15.8332 9.99935L9.99984 15.8327" stroke="#313C01" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {/* Top row */}
          <div style={card.topRow}>
            {/* Left — school badge + favorite */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, position: "relative", zIndex: 2, overflow: "visible" }}>
              <button
                style={{
                  ...card.favBtn,
                  backgroundColor: cockpit.isFavorite ? "#E9FD97" : "rgba(0,0,0,0.45)",
                }}
                onClick={(e) => { e.stopPropagation(); onToggleFav(); }}
                disabled={favLoading}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M13.8936 3.0726C13.5531 2.73193 13.1488 2.46169 12.7038 2.27732C12.2588 2.09295 11.7819 1.99805 11.3002 1.99805C10.8186 1.99805 10.3416 2.09295 9.89667 2.27732C9.4517 2.46169 9.04741 2.73193 8.70691 3.0726L8.00024 3.77926L7.29358 3.0726C6.60578 2.3848 5.67293 1.9984 4.70024 1.9984C3.72755 1.9984 2.7947 2.3848 2.10691 3.0726C1.41911 3.76039 1.03271 4.69324 1.03271 5.66593C1.03271 6.63862 1.41911 7.57147 2.10691 8.25926L8.00024 14.1526L13.8936 8.25926C14.2342 7.91876 14.5045 7.51447 14.6889 7.0695C14.8732 6.62453 14.9681 6.14759 14.9681 5.66593C14.9681 5.18427 14.8732 4.70733 14.6889 4.26236C14.5045 3.81739 14.2342 3.4131 13.8936 3.0726Z" stroke="#E9FD97" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </button>
            </div>

            {/* Right — favorites count with trending icon */}
            <div style={card.trendingBadge}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <g clipPath="url(#clip0_439_2699)">
                  <path d="M15.3332 4L8.99984 10.3333L5.6665 7L0.666504 12M15.3332 4H11.3332M15.3332 4L15.3332 8" stroke="#E9FD97" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </g>
                <defs><clipPath id="clip0_439_2699"><rect width="16" height="16" fill="white" /></clipPath></defs>
              </svg>
              <span style={card.trendingText}>{formatFavorites(cockpit.favoritesCount)}</span>
            </div>
          </div>

          {/* Bottom content */}
          <div style={{ ...card.bottom, marginTop: "auto" }}>
            {/* Name | model */}
            <div style={card.titleRow}>
              <span style={card.name}>{cockpit.name}</span>
              {cockpit.model && (
                <>
                  <span style={card.divider}>|</span>
                  <span style={card.manufacturer}>{cockpit.model}</span>
                </>
              )}
            </div>

            {/* Tags */}
            <div style={card.tags}>
              {tags.map(tag => (
                <span key={tag} style={card.tag}>{tag}</span>
              ))}
            </div>

            {/* Date */}
            <div style={card.dateRow}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <g clipPath="url(#clip0_439_2727)">
                  <path d="M8.00016 4.00065V8.00065L10.6668 9.33398M14.6668 8.00065C14.6668 11.6825 11.6821 14.6673 8.00016 14.6673C4.31826 14.6673 1.3335 11.6825 1.3335 8.00065C1.3335 4.31875 4.31826 1.33398 8.00016 1.33398C11.6821 1.33398 14.6668 4.31875 14.6668 8.00065Z" stroke="#E9FD97" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </g>
                <defs><clipPath id="clip0_439_2727"><rect width="16" height="16" fill="white" /></clipPath></defs>
              </svg>
              <span style={card.dateText}>{timeAgo(cockpit.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const card: Record<string, React.CSSProperties> = {
  gradientWrapper: {
    borderRadius: 16,
    overflow: "hidden",
    flex: "1 0 0",
  },
  wrap: {
    borderRadius: 16,
    overflow: "hidden",
    cursor: "pointer",
  },
  imgBg: {
    position: "relative",
    height: 256,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundColor: "#2a2a2a",
    display: "flex",
    flexDirection: "column",
    padding: 16,
    gap: 16,
  },
  overlay: {
    position: "absolute",
    inset: 0,
    background: "linear-gradient(to bottom, rgba(25,25,25,0.1) 10%, rgb(25,25,25) 100%)",
    pointerEvents: "none",
  },
  topRow: {
    position: "relative",
    zIndex: 2,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    overflow: "visible",
  },
  favBtn: {
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
    backdropFilter: "blur(8px)",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    flexShrink: 0,
    position: "relative",
    zIndex: 1,
  },
  favBtnActive: {
    backgroundColor: "rgba(233,253,151,0.15)",
    border: "none",
  },
  trendingBadge: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.45)",
    backdropFilter: "blur(8px)",
    padding: "6px 12px",
    borderRadius: 8,
  },
  trendingText: {
    color: "#E9FD97",
    fontSize: 13,
    fontWeight: 600,
  },
  bottom: {
    position: "relative",
    zIndex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  titleRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  name: {
    color: "#fff",
    fontSize: 18,
    fontWeight: 600,
    letterSpacing: 0.2,
  },
  divider: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 18,
    fontWeight: 300,
  },
  manufacturer: {
    color: "#fff",
    fontSize: 18,
    fontWeight: 600,
  },
  bottomRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tags: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  tag: {
    backgroundColor: "rgba(255,255,255,0.15)",
    backdropFilter: "blur(6px)",
    color: "#fff",
    fontSize: 13,
    fontWeight: 500,
    padding: "6px 14px",
    borderRadius: 8,
  },
  arrowBtn: {
    position: "absolute",
    bottom: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 16,
    backgroundColor: "#E9FD97",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
    padding: 0,
},
  dateRow: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  dateText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    fontWeight: 400,
  },
};

// ─── Filter Dropdown ──────────────────────────────────────────────────────────

interface FilterDropdownProps {
  label: string;
  options: { value: string; label: string }[];
  selected: string | null;
  onSelect: (value: string | null) => void;
}

const FilterDropdown: React.FC<FilterDropdownProps> = ({ label, options, selected, onSelect }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectedLabel = options.find(o => o.value === selected)?.label;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        style={{
          ...s.filterBtn,
          ...(selected ? s.filterBtnActive : {}),
        }}
        onClick={() => setOpen(p => !p)}
      >
        {selectedLabel || label}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div style={s.dropdown}>
          <button style={s.dropdownItem} onClick={() => { onSelect(null); setOpen(false); }}>
            All
          </button>
          {options.map(opt => (
            <button
              key={opt.value}
              style={{
                ...s.dropdownItem,
                ...(selected === opt.value ? s.dropdownItemActive : {}),
              }}
              onClick={() => { onSelect(opt.value); setOpen(false); }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

import React from "react";

const CockpitsPage: React.FC = () => {
  const navigate = useNavigate();
  const [cockpits, setCockpits] = useState<Cockpit[]>([]);
  const [recentCockpits, setRecentCockpits] = useState<Cockpit[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeNav, setActiveNav] = useState("cockpits");

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [purposeFilter, setPurposeFilter] = useState<string | null>(null);
  const [orderBy, setOrderBy] = useState<OrderBy>("new");

  const [favLoading, setFavLoading] = useState<Record<string, boolean>>({});
  const [previewCockpit, setPreviewCockpit] = useState<CockpitDetail | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMounted, setModalMounted] = useState(false);

  const openPreview = async (cockpitId: string) => {
    setModalMounted(true);
    setPreviewLoading(true);
    setPreviewCockpit(null);
    // Небольшая задержка, чтобы DOM успел смонтировать элемент перед запуском transition
    setTimeout(() => setModalVisible(true), 10);
    try {
      const { data } = await api.get<CockpitDetail>(`/cockpits/${cockpitId}`);
      setPreviewCockpit(data);
    } catch { } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    setModalVisible(false);
    // Ждём окончания анимации (300ms) перед размонтированием
    setTimeout(() => {
      setPreviewCockpit(null);
      setModalMounted(false);
    }, 300);
  };

  const fetchCurrentUser = async () => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      const r = await api.get("/user/me");
      setCurrentUser(r.data);
    } catch { }
  };

  const buildParams = (extra: Record<string, string> = {}) => {
    const params = new URLSearchParams();
    if (searchQuery) params.set("name", searchQuery);
    if (categoryFilter) params.set("category", categoryFilter);
    if (purposeFilter) params.set("purpose", purposeFilter);
    if (orderBy) params.set("orderBy", orderBy);
    Object.entries(extra).forEach(([k, v]) => params.set(k, v));
    return params.toString();
  };

  const fetchCockpits = async () => {
    try {
      setLoading(true);
      const qs = buildParams();
      const r = await api.get<CockpitsResponse>(`/cockpits?${qs}`);
      const items = r.data.items;
      setCockpits(items);
      // Recents = 3 самых новых
      setRecentCockpits([...items].slice(0, 3));
    } catch (err: any) {
      setError(err?.response?.data?.message || "Error loading cockpits");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthReady(true);
      } else {
        window.location.href = "/auth"; // не залогинен — на auth
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!authReady) return;
    fetchCurrentUser();
  }, [authReady]);

  useEffect(() => {
    if (!authReady) return;
    fetchCockpits();
  }, [authReady, categoryFilter, purposeFilter, orderBy]);

  if (!authReady) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", backgroundColor: "#111", color: "rgba(255,255,255,0.3)", fontFamily: "'DM Sans', sans-serif" }}>
      Loading...
    </div>
  );

  const handleSearch = () => fetchCockpits();

  const toggleFavorite = async (cockpitId: string) => {
    setFavLoading(p => ({ ...p, [cockpitId]: true }));
    try {
      const { data } = await api.post<{ isFavorite: boolean }>(`/cockpits/${cockpitId}/favorite`);
      const updateItem = (c: Cockpit) =>
        c.id === cockpitId
          ? { ...c, isFavorite: data.isFavorite, favoritesCount: c.favoritesCount + (data.isFavorite ? 1 : -1) }
          : c;
      setCockpits(p => p.map(updateItem));
      setRecentCockpits(p => p.map(updateItem));
    } finally {
      setFavLoading(p => ({ ...p, [cockpitId]: false }));
    }
  };

  const navItems = [
    {
      id: "cockpits", label: "Cockpits",
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>,
    },
    {
      id: "schools", label: "Schools",
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></svg>,
    },
    {
      id: "users", label: "Users",
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>,
    },
  ];

  const displayName = currentUser
    ? [currentUser.name, currentUser.surname].filter(Boolean).join(" ")
    : "User";

  return (
    <div style={s.root}>
      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
        button { transition: opacity 0.15s; }
        button:hover { opacity: 0.85; }
        input::placeholder { color: rgba(255,255,255,0.3); }
        .modal-backdrop {
          transition: opacity 0.3s ease, backdrop-filter 0.3s ease;
        }
        .modal-backdrop.hidden { opacity: 0; pointer-events: none; }
        .modal-backdrop.visible { opacity: 1; }
        .modal-box {
          transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .modal-box.hidden { opacity: 0; transform: scale(0.92) translateY(16px); }
        .modal-box.visible { opacity: 1; transform: scale(1) translateY(0); }
      `}</style>

      {/* ── Sidebar ── */}
      <aside style={{ ...s.sidebar, width: sidebarCollapsed ? 64 : 200 }}>
        <div style={s.logo}>
          {!sidebarCollapsed && <span style={s.logoText}>ZENIT</span>}
          <button style={s.collapseBtn} onClick={() => setSidebarCollapsed(p => !p)}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M7.5 2.5V17.5M4.16667 2.5H15.8333C16.7538 2.5 17.5 3.24619 17.5 4.16667V15.8333C17.5 16.7538 16.7538 17.5 15.8333 17.5H4.16667C3.24619 17.5 2.5 16.7538 2.5 15.8333V4.16667C2.5 3.24619 3.24619 2.5 4.16667 2.5Z" stroke="#E9FD97" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <nav style={s.nav}>
          {navItems.map(item => (
            <button
              key={item.id}
              style={{
                ...s.navItem,
                ...(activeNav === item.id ? s.navItemActive : {}),
                justifyContent: sidebarCollapsed ? "center" : "flex-start",
              }}
              onClick={() => { setActiveNav(item.id); navigate(`/${item.id}`); }}
            >
              <span style={{
                width: 28, height: 28, borderRadius: 7,
                backgroundColor: activeNav === item.id ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.07)",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                color: activeNav === item.id ? "#fff" : "rgba(255,255,255,0.45)",
              }}>{item.icon}</span>
              {!sidebarCollapsed && (
                <span style={{ color: activeNav === item.id ? "#fff" : "rgba(255,255,255,0.45)", fontSize: 14 }}>
                  {item.label}
                </span>
              )}
            </button>
          ))}
        </nav>

        <button
          style={{ ...s.navItem, marginTop: "auto", justifyContent: sidebarCollapsed ? "center" : "flex-start" }}
          onClick={() => navigate("/settings")}
        >
          <span style={{
            width: 28, height: 28, borderRadius: 7,
            backgroundColor: "rgba(255,255,255,0.07)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            color: "rgba(255,255,255,0.45)",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
          </span>
          {!sidebarCollapsed && <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 14 }}>Settings</span>}
        </button>
      </aside>

      {/* ── Main ── */}
      <main style={s.main}>
        {/* Top bar */}
        <div style={s.topBar}>
          <h1 style={s.pageTitle}>Cockpits</h1>

          <div style={s.searchWrap}>
            <input
              style={s.searchInput}
              placeholder="Search for cockpits, schools..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && fetchCockpits()}
            />
            <button style={s.searchBtn} onClick={fetchCockpits}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M14 14L11.1 11.1M12.6667 7.33333C12.6667 10.2789 10.2789 12.6667 7.33333 12.6667C4.38781 12.6667 2 10.2789 2 7.33333C2 4.38781 4.38781 2 7.33333 2C10.2789 2 12.6667 4.38781 12.6667 7.33333Z" stroke="#E9FD97" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          <div style={s.userInfo}>
            <div style={s.avatar}>
              {currentUser?.avatar
                ? <img src={currentUser.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
                : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
              }
            </div>
            <div>
              <div style={{ color: "#fff", fontSize: 13, fontWeight: 500 }}>{displayName}</div>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, textTransform: "capitalize" }}>
                {currentUser?.role?.toLowerCase() || "Student"}
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div style={s.content}>
          {error && <div style={{ color: "#ff6b6b", fontSize: 13, marginBottom: 16 }}>{error}</div>}

          {/* News */}
          <div style={s.newsBannerWrapper}>
            <div style={s.newsBanner}>
              <div style={s.newsIcon}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                </svg>
              </div>
              <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 14 }}>News from Zenit???</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" style={{ marginLeft: "auto", flexShrink: 0 }}>
                <path d="M9 18l6-6-6-6" />
              </svg>
            </div>
          </div>

          {/* Recents */}
          {recentCockpits.length > 0 && (
            <section style={s.section}>
              <h2 style={s.sectionTitle}>Recents</h2>
              <div style={s.grid}>
                {recentCockpits.map(cockpit => (
                  <CockpitCard
                    key={cockpit.id}
                    cockpit={cockpit}
                    onToggleFav={() => toggleFavorite(cockpit.id)}
                    favLoading={!!favLoading[cockpit.id]}
                    onPreview={() => openPreview(cockpit.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* All cockpits */}
          <section style={s.section}>
            <div style={s.allCockpitsHeader}>
              <h2 style={s.sectionTitle}>All cockpits</h2>

              <div style={s.filterBtns}>
                {/* Category filter */}
                <FilterDropdown
                  label="Category"
                  options={Object.entries(categoryLabels).map(([value, label]) => ({ value, label }))}
                  selected={categoryFilter}
                  onSelect={setCategoryFilter}
                />

                {/* Purpose filter */}
                <FilterDropdown
                  label="Purpose"
                  options={Object.entries(purposeLabels).map(([value, label]) => ({ value, label }))}
                  selected={purposeFilter}
                  onSelect={setPurposeFilter}
                />

                {/* Sort */}
                <FilterDropdown
                  label="Sort: New"
                  options={[
                    { value: "new", label: "Newest" },
                    { value: "old", label: "Oldest" },
                    { value: "popular", label: "Popular" },
                  ]}
                  selected={orderBy}
                  onSelect={v => setOrderBy((v || "new") as OrderBy)}
                />

                {/* Clear filters */}
                {(categoryFilter || purposeFilter) && (
                  <button
                    style={s.clearBtn}
                    onClick={() => { setCategoryFilter(null); setPurposeFilter(null); }}
                  >
                    Clear
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
                  </button>
                )}
              </div>
            </div>

            {loading ? (
              <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 14, padding: "40px 0", textAlign: "center" }}>
                Loading...
              </div>
            ) : cockpits.length === 0 ? (
              <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 14, padding: "40px 0", textAlign: "center" }}>
                No cockpits found
              </div>
            ) : (
              <div style={s.grid}>
                {cockpits.map(cockpit => (
                  <CockpitCard
                    key={cockpit.id}
                    cockpit={cockpit}
                    onToggleFav={() => toggleFavorite(cockpit.id)}
                    favLoading={!!favLoading[cockpit.id]}
                    onPreview={() => openPreview(cockpit.id)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Floating create button */}
        <button style={s.createBtn} onClick={() => navigate("/cockpits/create")}>
          <svg style={{ transform: "scale(1.5)" }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </main>

      {/* Preview Modal */}
      {modalMounted && (
        <div
          className={`modal-backdrop ${modalVisible ? "visible" : "hidden"}`}
          style={s.modalBackdrop}
          onClick={closePreview}
        >
          <div
            className={`modal-box ${modalVisible ? "visible" : "hidden"}`}
            style={s.modalBox}
            onClick={e => e.stopPropagation()}
          >
            {previewLoading ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "rgba(255,255,255,0.4)", fontSize: 14 }}>
                Loading...
              </div>
            ) : previewCockpit && (
              <>
                {/* Close button */}
                <button style={s.modalClose} onClick={closePreview}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M12 4L4 12M4 4l8 8" stroke="#fff" strokeWidth="1.6" strokeLinecap="round"/>
                  </svg>
                </button>

                {/* Title */}
                <h2 style={s.modalTitle}>{previewCockpit.name}</h2>

                <div style={s.modalBody}>
                  {/* Left — image */}
                  <div style={s.modalLeft}>
                    {(() => {
                      const preview = previewCockpit.media.find(m => m.type === "PREVIEW") || previewCockpit.media.find(m => m.type === "PANORAMA") || previewCockpit.media[0];
                      return preview ? (
                        <img src={preview.link} alt={previewCockpit.name} style={s.modalImage} />
                      ) : (
                        <div style={{ ...s.modalImage, backgroundColor: "#2a2a2a", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 13 }}>No image</span>
                        </div>
                      );
                    })()}

                    {/* Bottom buttons */}
                    <div style={s.modalActions}>
                      <button style={s.modalBtnSecondary} onClick={() => { closePreview(); navigate(`/cockpits/${previewCockpit.id}`); }}>
                        Try test
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" fill="none">
                          <path d="M4.1665 9.99935H15.8332M15.8332 9.99935L9.99984 4.16602M15.8332 9.99935L9.99984 15.8327" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                      <button style={s.modalBtnPrimary} onClick={() => { closePreview(); navigate(`/cockpits/${previewCockpit.id}/learn`); }}>
                        Start learning
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" fill="none">
                          <path d="M4.1665 9.99935H15.8332M15.8332 9.99935L9.99984 4.16602M15.8332 9.99935L9.99984 15.8327" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Right — info */}
                  <div style={s.modalRight}>
                    <div>
                      <h3 style={s.modalSectionTitle}>Description</h3>
                      <p style={s.modalDescription}>
                        {previewCockpit.manufacturer || previewCockpit.model
                          ? `${previewCockpit.manufacturer ?? ""} ${previewCockpit.model ?? ""}`.trim()
                          : "No description available."}
                      </p>
                      {previewCockpit.creator && (
                        <p style={s.modalCreatedBy}>
                          Created by: <span style={{ color: "#fff" }}>{[previewCockpit.creator.name, previewCockpit.creator.surname].filter(Boolean).join(" ") || "Unknown"}</span>
                        </p>
                      )}
                    </div>

                    {/* Checklists */}
                    {previewCockpit.checklists?.length > 0 && (
                      <div>
                        <h3 style={s.modalSectionTitle}>Check lists</h3>
                        <div style={s.modalChecklists}>
                          {previewCockpit.checklists.map(cl => (
                            <button
                              key={cl.id}
                              style={s.modalChecklistRow}
                              onClick={() => { closePreview(); navigate(`/cockpits/${previewCockpit.id}/checklist/${cl.id}`); }}
                            >
                              <span style={s.modalChecklistName}>{cl.name}</span>
                              <div style={s.modalChecklistRight}>
                                <div style={s.modalProgressBar}>
                                  <div style={{ ...s.modalProgressFill, width: "0%" }} />
                                </div>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" fill="none">
                                  <path d="M4.1665 9.99935H15.8332M15.8332 9.99935L9.99984 4.16602M15.8332 9.99935L9.99984 15.8327" stroke="#E9FD97" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Page styles ──────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  root: {
    display: "flex",
    width: "100vw",
    height: "100vh",
    backgroundColor: "#111111",
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    overflow: "hidden",
    color: "#fff",
  },
  sidebar: {
    backgroundColor: "#151515",
    borderRight: "1px solid rgba(255,255,255,0.06)",
    display: "flex",
    flexDirection: "column",
    padding: "20px 12px",
    flexShrink: 0,
    transition: "width 0.2s ease",
    overflow: "hidden",
  },
  logo: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 32,
    paddingLeft: 4,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 800,
    letterSpacing: 2,
    color: "#fff",
  },
  collapseBtn: {
    width: 40,
    height: 40,
    padding: 8,
    borderRadius: 12,
    backgroundColor: "transparent",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  nav: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  navItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "9px 10px",
    borderRadius: 8,
    border: "none",
    backgroundColor: "transparent",
    cursor: "pointer",
    width: "100%",
    textAlign: "left",
  },
  navItemActive: {
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    backgroundColor: "#121211",
  },
  topBar: {
    display: "flex",
    alignItems: "center",
    gap: 20,
    padding: "20px 28px",
    flexShrink: 0,
    backgroundColor: "#121211",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
  },
  pageTitle: {
    width: 300,
    fontSize: 40,
    fontWeight: 400,
    color: "#fff",
    margin: 0,
    flexShrink: 0,
    lineHeight: "120%",
    letterSpacing: "0.5px",
  },
  searchWrap: {
    display: "flex",
    width: 280,
    minWidth: 120,
    height: 40,
    padding: "0 16px",
    alignItems: "center",
    gap: 8,
    borderRadius: 8,
    border: "1px solid #787971",
    backgroundColor: "#121211",
    position: "absolute",
    left: "50%",
    transform: "translateX(-50%)",
  },
  searchInput: {
    flex: 1,
    backgroundColor: "transparent",
    border: "none",
    outline: "none",
    color: "rgba(255,255,255,0.4)",
    fontSize: 14,
    fontWeight: 400,
    lineHeight: "100%",
    fontFamily: "inherit",
  },
  searchBtn: {
    backgroundColor: "transparent",
    border: "none",
    cursor: "pointer",
    padding: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  userInfo: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginLeft: "auto",
    flexShrink: 0,
  },
  avatar: {
    width: 34, height: 34,
    borderRadius: "50%",
    backgroundColor: "#2a2a2a",
    border: "1px solid rgba(255,255,255,0.1)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    flexShrink: 0,
  },
  content: {
    flex: 1,
    overflowY: "auto",
    padding: "28px 28px 40px",
  },
  newsBannerWrapper: {
    padding: 1,
    borderRadius: 13,
    background: "linear-gradient(to bottom, #323232, #1e1e1e)",
    marginBottom: 28,
  },
  newsBanner: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: "14px 18px",
    cursor: "pointer",
  },
  newsIcon: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: "rgba(255,255,255,0.07)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  section: {
    marginBottom: 36,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: 600,
    color: "#fff",
    margin: "0 0 16px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 16,
  },
  allCockpitsHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  filterBtns: {
    display: "flex",
    gap: 8,
    alignItems: "center",
  },
  filterBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 12px",
    borderRadius: 8,
    backgroundColor: "#1a1a1a",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
  },
  filterBtnActive: {
    backgroundColor: "rgba(212,240,106,0.12)",
    border: "1px solid rgba(212,240,106,0.3)",
    color: "#d4f06a",
  },
  dropdown: {
    position: "absolute" as const,
    top: "calc(100% + 6px)",
    right: 0,
    backgroundColor: "#1e1e1e",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 10,
    padding: "6px",
    minWidth: 140,
    zIndex: 100,
    boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
  },
  dropdownItem: {
    display: "block",
    width: "100%",
    padding: "8px 12px",
    borderRadius: 7,
    backgroundColor: "transparent",
    border: "none",
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    cursor: "pointer",
    textAlign: "left" as const,
  },
  dropdownItemActive: {
    backgroundColor: "rgba(212,240,106,0.12)",
    color: "#d4f06a",
  },
  clearBtn: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    padding: "6px 10px",
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "rgba(255,255,255,0.4)",
    fontSize: 12,
    cursor: "pointer",
  },
  createBtn: {
    position: "absolute",
    bottom: 28,
    right: 28,
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#d4f06a",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 20px rgba(212,240,106,0.3)",
  },
  modalBackdrop: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    backdropFilter: "blur(6px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modalBox: {
    position: "relative",
    width: "66vw",
    height: "66vh",
    backgroundColor: "#1a1a1a",
    borderRadius: 20,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    padding: 28,
    gap: 20,
  },
  modalClose: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.08)",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
    lineHeight: 0,
    zIndex: 1,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 700,
    color: "#fff",
    margin: 0,
    letterSpacing: "-0.4px",
    flexShrink: 0,
  },
  modalBody: {
    display: "flex",
    gap: 28,
    flex: 1,
    overflow: "hidden",
    minHeight: 0,
  },
  modalLeft: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    width: "48%",
    flexShrink: 0,
  },
  modalImage: {
    width: "100%",
    flex: 1,
    objectFit: "cover" as const,
    borderRadius: 12,
    minHeight: 0,
  },
  modalActions: {
    display: "flex",
    gap: 10,
    flexShrink: 0,
  },
  modalBtnSecondary: {
    flex: 1,
    height: 40,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.08)",
    border: "none",
    borderRadius: 10,
    color: "#fff",
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  modalBtnPrimary: {
    flex: 1,
    height: 40,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#E9FD97",
    border: "none",
    borderRadius: 10,
    color: "#313C01",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  modalRight: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 24,
    overflowY: "auto" as const,
  },
  modalSectionTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: "#fff",
    margin: "0 0 10px 0",
    letterSpacing: "-0.3px",
  },
  modalDescription: {
    fontSize: 14,
    color: "rgba(255,255,255,0.65)",
    lineHeight: "160%",
    margin: "0 0 10px 0",
  },
  modalCreatedBy: {
    fontSize: 13,
    color: "rgba(255,255,255,0.4)",
    margin: 0,
  },
  modalChecklists: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 8,
  },
  modalChecklistRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 10,
    border: "none",
    cursor: "pointer",
    width: "100%",
    fontFamily: "inherit",
  },
  modalChecklistName: {
    color: "#fff",
    fontSize: 14,
    fontWeight: 500,
  },
  modalChecklistRight: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  modalProgressBar: {
    width: 80,
    height: 4,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 2,
    overflow: "hidden",
  },
  modalProgressFill: {
    height: "100%",
    backgroundColor: "#E9FD97",
    borderRadius: 2,
  },
};

export default CockpitsPage;