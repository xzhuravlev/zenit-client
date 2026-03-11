import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { auth } from "../firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";

// ─── Types ────────────────────────────────────────────────────────────────────

type SchoolMemberRole = "OWNER" | "INSTRUCTOR" | "STUDENT";

interface SchoolMedia {
  id: string;
  link: string;
  type: "PHOTO" | "TEXT";
  order: number | null;
}

interface SchoolMember {
  id: string;
  role: SchoolMemberRole;
  user: { id: string; name: string | null; surname: string | null; avatar: string | null; email: string };
}

interface School {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  instagram: string | null;
  createdAt: string;
  media: SchoolMedia[];
  _count: { members: number; cockpits: number };
}

interface SchoolDetail extends School {
  members: SchoolMember[];
  currentUserRole: SchoolMemberRole | null;
}

interface SchoolsResponse {
  items: School[];
  total: number;
  page: number;
  totalPages: number;
}

interface CurrentUser {
  id: string;
  name: string | null;
  surname: string | null;
  role: string;
  avatar: string | null;
}

// ─── SchoolCard ───────────────────────────────────────────────────────────────

interface CardProps {
  school: School;
  onPreview: () => void;
}

const SchoolCard: React.FC<CardProps> = ({ school, onPreview }) => {
  const photo = school.media.find(m => m.type === "PHOTO");

  return (
    <div style={card.wrap}>
      <div style={{ ...card.imgBg, backgroundImage: photo ? `url(${photo.link})` : undefined }}>
        <div style={card.overlay} />

        {/* Arrow button */}
        <button style={card.arrowBtn} onClick={onPreview}>
          <svg style={{ display: "block" }} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M4.1665 9.99935H15.8332M15.8332 9.99935L9.99984 4.16602M15.8332 9.99935L9.99984 15.8327" stroke="#313C01" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Bottom info */}
        <div style={card.bottom}>
          <div style={card.bottomRow}>
            <span style={card.name}>{school.name}</span>
            <div style={card.stats}>
              <span style={card.statItem}>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E9FD97" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>
                {school._count.members}
              </span>
              <span style={card.statItem}>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E9FD97" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 9h6M9 12h6M9 15h4" /></svg>
                {school._count.cockpits}
              </span>
            </div>
          </div>
          {school.address && <span style={card.address}>{school.address}</span>}
        </div>
      </div>
    </div>
  );
};

const card: Record<string, React.CSSProperties> = {
  wrap: {
    borderRadius: 16,
    overflow: "hidden",
    cursor: "pointer",
    flex: "1 0 0",
    minWidth: 0,
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
  },
  overlay: {
    position: "absolute",
    inset: 0,
    background: "linear-gradient(to bottom, rgba(25,25,25,0.05) 20%, rgba(25,25,25,0.88) 100%)",
    pointerEvents: "none",
  },
  bottom: {
    position: "relative",
    zIndex: 1,
    marginTop: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  bottomRow: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  name: {
    color: "#fff",
    fontSize: 20,
    fontWeight: 600,
    letterSpacing: 0.2,
  },
  stats: {
    display: "flex",
    gap: 12,
    alignItems: "center",
  },
  statItem: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    color: "#E9FD97",
    fontSize: 13,
    fontWeight: 500,
  },
  address: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 13,
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
};

// ─── SchoolsPage ──────────────────────────────────────────────────────────────

const SchoolsPage: React.FC = () => {
  const navigate = useNavigate();
  const [authReady, setAuthReady] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeNav] = useState("schools");

  const [schools, setSchools] = useState<School[]>([]);
  const [mySchools, setMySchools] = useState<School[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal
  const [previewSchool, setPreviewSchool] = useState<SchoolDetail | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [modalMounted, setModalMounted] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  const modalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Auth ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) setAuthReady(true);
      else window.location.href = "/auth";
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!authReady) return;
    fetchCurrentUser();
    fetchMySchools();
    fetchSchools();
  }, [authReady]);

  // ─── Data fetching ────────────────────────────────────────────────────────

  const fetchCurrentUser = async () => {
    try {
      const { data } = await api.get<CurrentUser>("/user/me");
      setCurrentUser(data);
    } catch { }
  };

  const fetchSchools = async (p = 1) => {
    setLoading(true);
    try {
      const { data } = await api.get<SchoolsResponse>("/school", {
        params: { page: p, ...(searchQuery ? { name: searchQuery } : {}) },
      });
      setSchools(data.items);
      setTotalPages(data.totalPages);
      setPage(p);
    } catch { } finally {
      setLoading(false);
    }
  };

  const fetchMySchools = async () => {
    try {
      // My schools = schools where I am a member (OWNER/INSTRUCTOR/STUDENT)
      // We filter on client from the full list for now
      const { data } = await api.get<SchoolsResponse>("/school", { params: { page: 1 } });
      // Backend will ideally support ?mySchools=true — for now show all as available
      setMySchools([]);
    } catch { }
  };

  const openPreview = async (schoolId: string) => {
    setPreviewLoading(true);
    setPreviewSchool(null);
    setModalMounted(true);
    setTimeout(() => setModalVisible(true), 10);
    try {
      const { data } = await api.get<SchoolDetail>(`/school/${schoolId}`);
      setPreviewSchool(data);
    } catch { } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    setModalVisible(false);
    if (modalTimerRef.current) clearTimeout(modalTimerRef.current);
    modalTimerRef.current = setTimeout(() => {
      setModalMounted(false);
      setPreviewSchool(null);
    }, 300);
  };

  const handleJoin = async () => {
    if (!previewSchool) return;
    setJoinLoading(true);
    try {
      await api.post(`/school/${previewSchool.id}/join`);
      // Refresh school detail
      const { data } = await api.get<SchoolDetail>(`/school/${previewSchool.id}`);
      setPreviewSchool(data);
      fetchSchools(page);
    } catch { } finally {
      setJoinLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!previewSchool) return;
    setJoinLoading(true);
    try {
      await api.delete(`/school/${previewSchool.id}/leave`);
      const { data } = await api.get<SchoolDetail>(`/school/${previewSchool.id}`);
      setPreviewSchool(data);
      fetchSchools(page);
    } catch { } finally {
      setJoinLoading(false);
    }
  };

  // ─── Nav ──────────────────────────────────────────────────────────────────

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

  if (!authReady) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", backgroundColor: "#111", color: "rgba(255,255,255,0.3)", fontFamily: "'DM Sans', sans-serif" }}>
      Loading...
    </div>
  );

  // ─── Render ───────────────────────────────────────────────────────────────

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
        .modal-backdrop { transition: opacity 0.3s ease, backdrop-filter 0.3s ease; }
        .modal-backdrop.hidden { opacity: 0; pointer-events: none; }
        .modal-backdrop.visible { opacity: 1; }
        .modal-box { transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
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
              onClick={() => navigate(`/${item.id}`)}
            >
              <span style={{
                width: 28, height: 28, borderRadius: 7,
                backgroundColor: activeNav === item.id ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.07)",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                color: activeNav === item.id ? "#E9FD97" : "rgba(255,255,255,0.45)",
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
          <span style={{ width: 28, height: 28, borderRadius: 7, backgroundColor: "rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "rgba(255,255,255,0.45)" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></svg>
          </span>
          {!sidebarCollapsed && <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 14 }}>Settings</span>}
        </button>
      </aside>

      {/* ── Main ── */}
      <main style={{ ...s.main, position: "relative" }}>

        {/* TopBar */}
        <div style={s.topBar}>
          <h1 style={s.pageTitle}>Schools</h1>

          <div style={s.searchWrap}>
            <input
              style={s.searchInput}
              placeholder="Search for cockpits, schools..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && fetchSchools(1)}
            />
            <button style={s.searchBtn} onClick={() => fetchSchools(1)}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M14 14L11.1 11.1M12.6667 7.33333C12.6667 10.2789 10.2789 12.6667 7.33333 12.6667C4.38781 12.6667 2 10.2789 2 7.33333C2 4.38781 4.38781 2 7.33333 2C10.2789 2 12.6667 4.38781 12.6667 7.33333Z" stroke="#E9FD97" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          {/* User info */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: "auto" }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{displayName}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{currentUser?.role}</div>
            </div>
            <div style={{ width: 36, height: 36, borderRadius: "50%", backgroundColor: "#2a2a2a", overflow: "hidden", flexShrink: 0 }}>
              {currentUser?.avatar
                ? <img src={currentUser.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.3)", fontSize: 14 }}>
                  {displayName.charAt(0).toUpperCase()}
                </div>
              }
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={s.content}>

          {/* My schools */}
          {mySchools.length > 0 && (
            <section style={{ ...s.section, alignSelf: "stretch" }}>
              <h2 style={s.sectionTitle}>My schools</h2>
              <div style={s.grid}>
                {mySchools.map(school => (
                  <SchoolCard key={school.id} school={school} onPreview={() => openPreview(school.id)} />
                ))}
              </div>
            </section>
          )}

          {/* Available schools */}
          <section style={{ ...s.section, alignSelf: "stretch" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, alignSelf: "stretch" }}>
              <h2 style={s.sectionTitle}>Available schools</h2>
            </div>

            {loading ? (
              <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 14, padding: "20px 0" }}>Loading...</div>
            ) : schools.length === 0 ? (
              <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 14, padding: "20px 0" }}>No schools found</div>
            ) : (
              <div style={s.grid}>
                {schools.map(school => (
                  <SchoolCard key={school.id} school={school} onPreview={() => openPreview(school.id)} />
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: "flex", gap: 8, marginTop: 24, alignItems: "center" }}>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    style={{
                      width: 32, height: 32, borderRadius: 8, border: "none", cursor: "pointer",
                      backgroundColor: p === page ? "#E9FD97" : "rgba(255,255,255,0.08)",
                      color: p === page ? "#313C01" : "rgba(255,255,255,0.6)",
                      fontSize: 13, fontWeight: 600, fontFamily: "inherit",
                    }}
                    onClick={() => fetchSchools(p)}
                  >{p}</button>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Floating create button */}
        <button style={s.createBtn} onClick={() => navigate("/schools/create")}>
          <svg style={{ transform: "scale(1.5)" }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </main>

      {/* ── Preview Modal ── */}
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
            ) : previewSchool && (
              <>
                {/* Close */}
                <button style={s.modalClose} onClick={closePreview}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M12 4L4 12M4 4l8 8" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </button>

                <h2 style={s.modalTitle}>{previewSchool.name}</h2>

                <div style={s.modalBody}>
                  {/* Left — photo */}
                  <div style={s.modalLeft}>
                    {(() => {
                      const photo = previewSchool.media.find(m => m.type === "PHOTO");
                      return photo ? (
                        <img src={photo.link} alt={previewSchool.name} style={s.modalImage} />
                      ) : (
                        <div style={{ ...s.modalImage, backgroundColor: "#2a2a2a", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 13 }}>No photo</span>
                        </div>
                      );
                    })()}

                    {/* Action buttons */}
                    <div style={s.modalActions}>
                      <button
                        style={s.modalBtnSecondary}
                        onClick={() => { closePreview(); navigate(`/schools/${previewSchool.id}/cockpits`); }}
                      >
                        View cockpits
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" fill="none">
                          <path d="M4.1665 9.99935H15.8332M15.8332 9.99935L9.99984 4.16602M15.8332 9.99935L9.99984 15.8327" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>

                      {previewSchool.currentUserRole === null && (
                        <button style={s.modalBtnPrimary} onClick={handleJoin} disabled={joinLoading}>
                          {joinLoading ? "..." : "Join school"}
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" fill="none">
                            <path d="M4.1665 9.99935H15.8332M15.8332 9.99935L9.99984 4.16602M15.8332 9.99935L9.99984 15.8327" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      )}

                      {previewSchool.currentUserRole === "STUDENT" && (
                        <button style={{ ...s.modalBtnPrimary, backgroundColor: "rgba(255,80,80,0.15)", color: "#ff6b6b" }} onClick={handleLeave} disabled={joinLoading}>
                          {joinLoading ? "..." : "Leave school"}
                        </button>
                      )}

                      {(previewSchool.currentUserRole === "OWNER" || previewSchool.currentUserRole === "INSTRUCTOR") && (
                        <button style={s.modalBtnPrimary} onClick={() => { closePreview(); navigate(`/schools/${previewSchool.id}/manage`); }}>
                          Manage school
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" fill="none">
                            <path d="M4.1665 9.99935H15.8332M15.8332 9.99935L9.99984 4.16602M15.8332 9.99935L9.99984 15.8327" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Right — info */}
                  <div style={s.modalRight}>
                    {/* Role badge */}
                    {previewSchool.currentUserRole && (
                      <div style={s.roleBadge}>
                        {previewSchool.currentUserRole === "OWNER" && "👑 Owner"}
                        {previewSchool.currentUserRole === "INSTRUCTOR" && "✈️ Instructor"}
                        {previewSchool.currentUserRole === "STUDENT" && "🎓 Student"}
                      </div>
                    )}

                    <div>
                      <h3 style={s.modalSectionTitle}>About</h3>
                      <p style={s.modalDescription}>
                        {previewSchool.description || "No description provided."}
                      </p>
                    </div>

                    {/* Contacts */}
                    <div>
                      <h3 style={s.modalSectionTitle}>Contacts</h3>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {previewSchool.address && <InfoRow icon="📍" label={previewSchool.address} />}
                        {previewSchool.phone && <InfoRow icon="📞" label={previewSchool.phone} />}
                        {previewSchool.email && <InfoRow icon="✉️" label={previewSchool.email} />}
                        {previewSchool.website && <InfoRow icon="🌐" label={previewSchool.website} link={previewSchool.website} />}
                        {previewSchool.instagram && <InfoRow icon="📷" label={`@${previewSchool.instagram}`} />}
                        {!previewSchool.address && !previewSchool.phone && !previewSchool.email && !previewSchool.website && (
                          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 13 }}>No contact info</span>
                        )}
                      </div>
                    </div>

                    {/* Stats */}
                    <div style={{ display: "flex", gap: 16 }}>
                      <div style={s.statCard}>
                        <span style={s.statNum}>{previewSchool._count.members}</span>
                        <span style={s.statLabel}>Members</span>
                      </div>
                      <div style={s.statCard}>
                        <span style={s.statNum}>{previewSchool._count.cockpits}</span>
                        <span style={s.statLabel}>Cockpits</span>
                      </div>
                    </div>

                    {/* Instructors */}
                    {previewSchool.members.filter(m => m.role === "INSTRUCTOR" || m.role === "OWNER").length > 0 && (
                      <div>
                        <h3 style={s.modalSectionTitle}>Instructors</h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {previewSchool.members
                            .filter(m => m.role === "INSTRUCTOR" || m.role === "OWNER")
                            .map(m => (
                              <div key={m.id} style={s.memberRow}>
                                <div style={s.memberAvatar}>
                                  {m.user.avatar
                                    ? <img src={m.user.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
                                    : <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
                                      {(m.user.name || m.user.email || "?").charAt(0).toUpperCase()}
                                    </span>
                                  }
                                </div>
                                <div>
                                  <div style={{ fontSize: 13, color: "#fff", fontWeight: 500 }}>
                                    {[m.user.name, m.user.surname].filter(Boolean).join(" ") || m.user.email}
                                  </div>
                                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{m.role}</div>
                                </div>
                              </div>
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

// ─── Helper components ────────────────────────────────────────────────────────

const InfoRow: React.FC<{ icon: string; label: string; link?: string }> = ({ icon, label, link }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    <span style={{ fontSize: 14 }}>{icon}</span>
    {link ? (
      <a href={link} target="_blank" rel="noopener noreferrer" style={{ color: "#E9FD97", fontSize: 13, textDecoration: "none" }}>{label}</a>
    ) : (
      <span style={{ color: "rgba(255,255,255,0.65)", fontSize: 13 }}>{label}</span>
    )}
  </div>
);

// ─── Styles ───────────────────────────────────────────────────────────────────

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
  logoText: { fontSize: 32, fontWeight: 800, letterSpacing: 2, color: "#fff" },
  collapseBtn: {
    width: 40, height: 40, padding: 8, borderRadius: 12,
    backgroundColor: "transparent", border: "none", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  nav: { display: "flex", flexDirection: "column", gap: 4 },
  navItem: {
    display: "flex", alignItems: "center", gap: 10, padding: "9px 10px",
    borderRadius: 8, border: "none", backgroundColor: "transparent",
    cursor: "pointer", width: "100%", textAlign: "left",
  },
  navItemActive: { backgroundColor: "rgba(255,255,255,0.08)" },
  main: {
    flex: 1, display: "flex", flexDirection: "column",
    overflow: "hidden", backgroundColor: "#121211",
  },
  topBar: {
    display: "flex",
    height: 48,
    padding: "0 32px",
    justifyContent: "space-between",
    alignItems: "center",
    flexShrink: 0,
    backgroundColor: "#121211",
  },
  pageTitle: {
    fontSize: 40, fontWeight: 700, color: "#fff",
    margin: 0, letterSpacing: "-0.8px", lineHeight: "120%", flexShrink: 0,
  },
  searchWrap: {
    display: "flex", width: 280, height: 40, padding: "0 16px",
    alignItems: "center", gap: 8, borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.12)", backgroundColor: "#1a1a1a",
    position: "absolute", left: "50%", transform: "translateX(-50%)",
  },
  searchInput: {
    flex: 1, backgroundColor: "transparent", border: "none", outline: "none",
    color: "rgba(255,255,255,0.7)", fontSize: 14, fontFamily: "inherit",
  },
  searchBtn: {
    backgroundColor: "transparent", border: "none", cursor: "pointer",
    padding: 0, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  content: {
    flex: 1, overflowY: "auto", padding: "32px",
    display: "flex", flexDirection: "column", gap: 48, alignItems: "flex-start",
  },
  section: { width: "100%" },
  sectionTitle: {
    fontSize: 28, fontWeight: 700, color: "#fff",
    margin: "0 0 16px 0", letterSpacing: "-0.5px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 16,
  },
  createBtn: {
    position: "absolute", bottom: 28, right: 28,
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: "#E9FD97", border: "none", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    boxShadow: "0 4px 20px rgba(233,253,151,0.3)",
  },
  // Modal
  modalBackdrop: {
    position: "fixed", inset: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    backdropFilter: "blur(6px)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 1000,
  },
  modalBox: {
    position: "relative", width: "66vw", height: "66vh",
    backgroundColor: "#1a1a1a", borderRadius: 20,
    overflow: "hidden", display: "flex", flexDirection: "column",
    padding: 28, gap: 20,
  },
  modalClose: {
    position: "absolute", top: 16, right: 16,
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.08)",
    border: "none", cursor: "pointer", display: "grid", placeItems: "center", zIndex: 1,
  },
  modalTitle: {
    fontSize: 24, fontWeight: 700, color: "#fff",
    margin: 0, letterSpacing: "-0.4px", flexShrink: 0,
  },
  modalBody: { display: "flex", gap: 28, flex: 1, overflow: "hidden", minHeight: 0 },
  modalLeft: { display: "flex", flexDirection: "column", gap: 16, width: "48%", flexShrink: 0 },
  modalImage: { width: "100%", flex: 1, objectFit: "cover", borderRadius: 12, minHeight: 0 },
  modalActions: { display: "flex", gap: 10, flexShrink: 0 },
  modalBtnSecondary: {
    flex: 1, height: 40, display: "flex", alignItems: "center",
    justifyContent: "center", gap: 8,
    backgroundColor: "rgba(255,255,255,0.08)", border: "none",
    borderRadius: 10, color: "#fff", fontSize: 14, fontWeight: 500,
    cursor: "pointer", fontFamily: "inherit",
  },
  modalBtnPrimary: {
    flex: 1, height: 40, display: "flex", alignItems: "center",
    justifyContent: "center", gap: 8,
    backgroundColor: "#E9FD97", border: "none",
    borderRadius: 10, color: "#313C01", fontSize: 14, fontWeight: 600,
    cursor: "pointer", fontFamily: "inherit",
  },
  modalRight: { flex: 1, display: "flex", flexDirection: "column", gap: 20, overflowY: "auto" },
  modalSectionTitle: {
    fontSize: 16, fontWeight: 700, color: "#fff",
    margin: "0 0 8px 0", letterSpacing: "-0.2px",
  },
  modalDescription: {
    fontSize: 14, color: "rgba(255,255,255,0.65)",
    lineHeight: "160%", margin: 0,
  },
  roleBadge: {
    display: "inline-flex", alignItems: "center", gap: 6,
    backgroundColor: "rgba(233,253,151,0.12)",
    color: "#E9FD97", fontSize: 13, fontWeight: 600,
    padding: "6px 12px", borderRadius: 8,
    alignSelf: "flex-start",
  },
  statCard: {
    flex: 1, backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 10, padding: "12px 16px",
    display: "flex", flexDirection: "column", gap: 2,
  },
  statNum: { fontSize: 24, fontWeight: 700, color: "#E9FD97" },
  statLabel: { fontSize: 12, color: "rgba(255,255,255,0.4)" },
  memberRow: { display: "flex", alignItems: "center", gap: 10 },
  memberAvatar: {
    width: 32, height: 32, borderRadius: "50%",
    backgroundColor: "#2a2a2a", flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
  },
};

export default SchoolsPage;