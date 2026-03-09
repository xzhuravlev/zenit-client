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
}

const CockpitCard: React.FC<CardProps> = ({ cockpit, onToggleFav, favLoading }) => {
  const navigate = useNavigate();
  const tags = getCockpitTags(cockpit);
  const previewUrl = cockpit.media[0]?.link;

  return (
    <div style={card.gradientWrapper}>
      <div style={card.wrap}>
        <div
          style={{
            ...card.imgBg,
            backgroundImage: previewUrl ? `url(${previewUrl})` : undefined,
          }}
        >
          <div style={card.overlay} />

          {/* Top row — date + favorite */}
          <div style={card.topRow}>
            <div style={card.dateBadge}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
              <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>
                {new Date(cockpit.createdAt).toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric", year: "numeric" })}
              </span>
            </div>

            <button
              style={{ ...card.favBtn, ...(cockpit.isFavorite ? card.favBtnActive : {}) }}
              onClick={(e) => { e.stopPropagation(); onToggleFav(); }}
              disabled={favLoading}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill={cockpit.isFavorite ? "#1a1a1a" : "none"} stroke={cockpit.isFavorite ? "#1a1a1a" : "rgba(255,255,255,0.7)"} strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
              </svg>
              <span style={{ fontSize: 12, fontWeight: 500, color: cockpit.isFavorite ? "#1a1a1a" : "rgba(255,255,255,0.7)" }}>
                {formatFavorites(cockpit.favoritesCount)}
              </span>
            </button>
          </div>

          {/* Bottom content */}
          <div style={card.bottom}>
            {/* Name row */}
            <div style={card.titleRow}>
              <span style={card.name}>{cockpit.name}</span>
              {cockpit.registration && (
                <>
                  <span style={card.divider}>|</span>
                  <span style={card.registration}>{cockpit.registration}</span>
                </>
              )}
            </div>

            {/* Tags + arrow */}
            <div style={card.bottomRow}>
              <div style={card.tags}>
                {tags.map(tag => (
                  <span key={tag} style={card.tag}>{tag}</span>
                ))}
              </div>
              <button
                style={card.arrowBtn}
                onClick={() => navigate(`/cockpits/${cockpit.id}`)}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const card: Record<string, React.CSSProperties> = {
  gradientWrapper: {
    padding: 1,
    borderRadius: 17,
    background: "linear-gradient(to bottom, #323232, #1e1e1e)",
  },
  wrap: {
    borderRadius: 16,
    overflow: "hidden",
    cursor: "pointer",
  },
  imgBg: {
    position: "relative",
    height: 220,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundColor: "#1e1e1e",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    padding: "14px 14px 14px",
  },
  overlay: {
    position: "absolute",
    inset: 0,
    background: "linear-gradient(to bottom, rgba(15,15,15,0.15) 0%, rgba(15,15,15,0.92) 100%)",
    pointerEvents: "none",
  },
  topRow: {
    position: "relative",
    zIndex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateBadge: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(0,0,0,0.35)",
    backdropFilter: "blur(8px)",
    padding: "5px 10px",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.08)",
  },
  favBtn: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(0,0,0,0.35)",
    backdropFilter: "blur(8px)",
    padding: "5px 10px",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.08)",
    cursor: "pointer",
  },
  favBtnActive: {
    backgroundColor: "#d4f06a",
    border: "1px solid #d4f06a",
  },
  bottom: {
    position: "relative",
    zIndex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  titleRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  name: {
    color: "#fff",
    fontSize: 17,
    fontWeight: 600,
    letterSpacing: 0.1,
  },
  divider: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 17,
    fontWeight: 300,
  },
  registration: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 17,
    fontWeight: 500,
  },
  bottomRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tags: {
    display: "flex",
    gap: 6,
    flexWrap: "wrap",
  },
  tag: {
    backgroundColor: "rgba(255,255,255,0.14)",
    backdropFilter: "blur(6px)",
    color: "#fff",
    fontSize: 12,
    fontWeight: 500,
    padding: "5px 12px",
    borderRadius: 7,
    border: "1px solid rgba(255,255,255,0.1)",
  },
  arrowBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#d4f06a",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
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
      `}</style>

      {/* ── Sidebar ── */}
      <aside style={{ ...s.sidebar, width: sidebarCollapsed ? 64 : 200 }}>
        <div style={s.logo}>
          {!sidebarCollapsed && <span style={s.logoText}>ZENIT</span>}
          <button style={s.collapseBtn} onClick={() => setSidebarCollapsed(p => !p)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2">
              {sidebarCollapsed ? <path d="M9 18l6-6-6-6" /> : <path d="M15 18l-6-6 6-6" />}
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
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              style={s.searchInput}
              placeholder="Search cockpits..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
            />
            {searchQuery && (
              <button style={s.searchClear} onClick={() => { setSearchQuery(""); fetchCockpits(); }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            )}
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
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
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
    width: 28, height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.08)",
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
    fontSize: 24,
    fontWeight: 700,
    color: "#fff",
    margin: 0,
    flexShrink: 0,
  },
  searchWrap: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#1a1a1a",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 10,
    padding: "0 12px",
    flex: 1,
    maxWidth: 360,
    height: 38,
  },
  searchInput: {
    flex: 1,
    backgroundColor: "transparent",
    border: "none",
    outline: "none",
    color: "#fff",
    fontSize: 13,
  },
  searchClear: {
    backgroundColor: "transparent",
    border: "none",
    cursor: "pointer",
    padding: 0,
    display: "flex",
    alignItems: "center",
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
};

export default CockpitsPage;