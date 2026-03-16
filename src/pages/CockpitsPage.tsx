import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useOutletContext } from "react-router-dom";

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

// ─── CockpitCard ──────────────────────────────────────────────────────────────

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
        <div style={card.wrapper}>
            <div style={{ ...card.imgBg, backgroundImage: preview ? `url(${preview})` : undefined }}>
                <div style={card.overlay} />

                {/* Arrow button */}
                <button style={card.arrowBtn} onClick={onPreview}>
                    <svg width="25" height="25" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M14 10L21 3M21 3H15M21 3V9M10 14L3 21M3 21H9M3 21L3 15" stroke="#313C01" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>

                {/* Top row */}
                <div style={card.topRow}>
                    <button
                        style={{
                            ...card.favBtn,
                            ...(cockpit.isFavorite ? { background: "#E9FD97" } : {}),
                        }}
                        onClick={(e) => { e.stopPropagation(); onToggleFav(); }}
                        disabled={favLoading}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill={cockpit.isFavorite ? "#313C01" : "none"} xmlns="http://www.w3.org/2000/svg">
                            <path fillRule="evenodd" clipRule="evenodd" d="M11.9932 5.13581C9.9938 2.7984 6.65975 2.16964 4.15469 4.31001C1.64964 6.45038 1.29697 10.029 3.2642 12.5604C4.89982 14.6651 9.84977 19.1041 11.4721 20.5408C11.6536 20.7016 11.7444 20.7819 11.8502 20.8135C11.9426 20.8411 12.0437 20.8411 12.1361 20.8135C12.2419 20.7819 12.3327 20.7016 12.5142 20.5408C14.1365 19.1041 19.0865 14.6651 20.7221 12.5604C22.6893 10.029 22.3797 6.42787 19.8316 4.31001C17.2835 2.19216 13.9925 2.7984 11.9932 5.13581Z"
                                stroke={cockpit.isFavorite ? "#313C01" : "#E9FD97"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span style={{ color: cockpit.isFavorite ? "#313C01" : "#FFFFFF", fontSize: 20, fontWeight: 600, lineHeight: "100%" }}>
                            {formatFavorites(cockpit.favoritesCount)}
                        </span>
                    </button>

                    <div style={card.trendingBadge}>
                        <svg style={{ transform: "scale(1.1)" }} width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M22 7L14.1314 14.8686C13.7354 15.2646 13.5373 15.4627 13.309 15.5368C13.1082 15.6021 12.8918 15.6021 12.691 15.5368C12.4627 15.4627 12.2646 15.2646 11.8686 14.8686L9.13137 12.1314C8.73535 11.7354 8.53735 11.5373 8.30902 11.4632C8.10817 11.3979 7.89183 11.3979 7.69098 11.4632C7.46265 11.5373 7.26465 11.7354 6.86863 12.1314L2 17M22 7H15M22 7V14" stroke="#E9FD97" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                        </svg>
                        <span style={card.trendingText}>{formatFavorites(cockpit.favoritesCount)}</span>
                    </div>
                </div>

                {/* Bottom content */}
                <div style={{ ...card.bottom, marginTop: "auto" }}>
                    <div style={card.titleRow}>
                        <span style={card.name}>{cockpit.name}</span>
                        {cockpit.model && (
                            <>
                                <span style={card.divider}>|</span>
                                <span style={card.model}>{cockpit.model}</span>
                            </>
                        )}
                    </div>

                    <div style={card.tags}>
                        {tags.map(tag => (
                            <span key={tag} style={card.tag}>{tag}</span>
                        ))}
                    </div>

                    <div style={card.dateRow}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 6V12L16 14M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" stroke="#E9FD97" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                        </svg>
                        <span style={card.dateText}>{timeAgo(cockpit.createdAt)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const card: Record<string, React.CSSProperties> = {
    wrapper: {
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
        background: "linear-gradient(to bottom, rgba(25,25,25,0.1) 20%, rgba(25, 25, 25, 0.95) 100%)",
        pointerEvents: "none",
    },
    topRow: {
        position: "relative",
        zIndex: 2,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
    },
    favBtn: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 16px",
        background: "rgba(70, 71, 67, 0.9)",
        backdropFilter: "blur(2px)",
        border: "none",
        borderRadius: 8,
        cursor: "pointer",
        flexShrink: 0,
    },
    trendingBadge: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 16px",
        background: "rgba(70, 71, 67, 0.9)",
        backdropFilter: "blur(2px)",
        borderRadius: 8,
    },
    trendingText: {
        color: "#FFFFFF",
        fontSize: 20,
        fontWeight: 600,
        lineHeight: "100%",
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
    model: {
        color: "#fff",
        fontSize: 18,
        fontWeight: 600,
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

// ─── CockpitsPage ─────────────────────────────────────────────────────────────

import React from "react";

const CockpitsPage: React.FC = () => {
    const navigate = useNavigate();
    const [cockpits, setCockpits] = useState<Cockpit[]>([]);
    const [recentCockpits, setRecentCockpits] = useState<Cockpit[]>([]);
    const { currentUser } = useOutletContext<{ currentUser: CurrentUser | null }>();
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const [searchQuery, setSearchQuery] = useState("");

    // Filters
    const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
    const [purposeFilter, setPurposeFilter] = useState<string | null>(null);
    const [orderBy, setOrderBy] = useState<OrderBy>("new");

    const [favLoading, setFavLoading] = useState<Record<string, boolean>>({});
    const [previewCockpit, setPreviewCockpit] = useState<CockpitDetail | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [modalMounted, setModalMounted] = useState(false);

    // ─── Modal ────────────────────────────────────────────────────────────────

    const openPreview = async (cockpitId: string) => {
        setModalMounted(true);
        setPreviewLoading(true);
        setPreviewCockpit(null);
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
        setTimeout(() => {
            setPreviewCockpit(null);
            setModalMounted(false);
        }, 300);
    };

    // ─── Data fetching ────────────────────────────────────────────────────────

    useEffect(() => {
        fetchCockpits();
    }, [categoryFilter, purposeFilter, orderBy]);

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
            setRecentCockpits([...items].slice(0, 3));
        } catch (err: any) {
            setError(err?.response?.data?.message || "Error loading cockpits");
        } finally {
            setLoading(false);
        }
    };

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

    // ─── Nav ──────────────────────────────────────────────────────────────────

    const displayName = currentUser ? [currentUser.name, currentUser.surname].filter(Boolean).join(" ") : "User";

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <div style={s.root}>
            <style>{`
                .modal-backdrop { transition: opacity 0.3s ease; }
                .modal-backdrop.hidden { opacity: 0; pointer-events: none; }
                .modal-backdrop.visible { opacity: 1; }
                .modal-box { transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
                .modal-box.hidden { opacity: 0; transform: scale(0.92) translateY(16px); }
                .modal-box.visible { opacity: 1; transform: scale(1) translateY(0); }
            `}</style>

            {/* Main */}
            <main style={s.main}>
                {/* TopBar */}
                <header style={s.topBar}>
                    <h1 style={s.pageTitle}>Cockpits</h1>

                    <div style={s.userInfo}>
                        <div style={s.userAvatar}>
                            {currentUser?.avatar ? (
                                <img src={currentUser.avatar} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            ) : (
                                <svg width="60%" height="60%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M20 21C20 19.6044 20 18.9067 19.8278 18.3389C19.44 17.0605 18.4395 16.06 17.1611 15.6722C16.5933 15.5 15.8956 15.5 14.5 15.5H9.5C8.10444 15.5 7.40665 15.5 6.83886 15.6722C5.56045 16.06 4.56004 17.0605 4.17224 18.3389C4 18.9067 4 19.6044 4 21M16.5 7.5C16.5 9.98528 14.4853 12 12 12C9.51472 12 7.5 9.98528 7.5 7.5C7.5 5.01472 9.51472 3 12 3C14.4853 3 16.5 5.01472 16.5 7.5Z" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            )}
                        </div>
                        <div style={s.userData}>
                            <div style={s.userName}>{displayName}</div>
                        </div>
                    </div>
                </header>

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
                                        onPreview={() => openPreview(cockpit.id)}
                                    />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* All cockpits */}
                    <section style={{ ...s.section, alignSelf: "stretch" }}>
                        <div style={s.allCockpitsHeader}>
                            <h2 style={s.sectionTitle}>All cockpits</h2>

                            <label style={s.searchWrap}>
                                <input
                                    style={s.searchInput}
                                    placeholder="Search for cockpits..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    onKeyDown={e => e.key === "Enter" && fetchCockpits()}
                                />
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M21 21L16.65 16.65M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z" stroke="#E9FD97" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </label>

                            <div style={s.filterBtns}>
                                <FilterDropdown
                                    label="Category"
                                    options={Object.entries(categoryLabels).map(([value, label]) => ({ value, label }))}
                                    selected={categoryFilter}
                                    onSelect={setCategoryFilter}
                                />
                                <FilterDropdown
                                    label="Purpose"
                                    options={Object.entries(purposeLabels).map(([value, label]) => ({ value, label }))}
                                    selected={purposeFilter}
                                    onSelect={setPurposeFilter}
                                />
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
                    <svg style={{ transform: "scale(2)" }} width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 5V19M5 12H19" stroke="#313C01" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
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
                                        <path d="M12 4L4 12M4 4l8 8" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
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

                                        <div style={s.modalActions}>
                                            <button style={s.modalBtnSecondary} onClick={() => { closePreview(); navigate(`/cockpits/${previewCockpit.id}`); }}>
                                                Try test
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" fill="none">
                                                    <path d="M4.1665 9.99935H15.8332M15.8332 9.99935L9.99984 4.16602M15.8332 9.99935L9.99984 15.8327" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            </button>
                                            <button style={s.modalBtnPrimary} onClick={() => { closePreview(); navigate(`/cockpits/${previewCockpit.id}/learn`); }}>
                                                Start learning
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" fill="none">
                                                    <path d="M4.1665 9.99935H15.8332M15.8332 9.99935L9.99984 4.16602M15.8332 9.99935L9.99984 15.8327" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
                                                                    <path d="M4.1665 9.99935H15.8332M15.8332 9.99935L9.99984 4.16602M15.8332 9.99935L9.99984 15.8327" stroke="#E9FD97" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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

// ─── Styles ───────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
    root: {
        display: "flex",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        backgroundColor: "#121211",
    },
    main: {
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start",
        alignItems: "flex-start",
        alignSelf: "stretch",
        gap: 48,
        flex: "1 0 0",
        minWidth: 0,         // ← добавить
        overflow: "hidden",  // ← добавить
        position: "relative",
        zIndex: 1,
    },
    topBar: {
        display: "flex",
        height: 48,
        justifyContent: "space-between",
        alignItems: "center",
        alignSelf: "stretch",
        backgroundColor: "#121211",
        padding: "32px 32px",
    },
    pageTitle: {
        fontSize: 40,
        fontWeight: 400,
        color: "#fff",
        margin: 0,
        flexShrink: 0,
        lineHeight: "120%",
        letterSpacing: "0.5px",
    },
    userInfo: {
        display: "flex",
        width: "300px",
        justifyContent: "flex-end",
        alignItems: "center",
        gap: 12,
    },
    userAvatar: {
        width: 40,
        height: 40,
        borderRadius: 8,
        backgroundColor: "rgba(255,255,255,0.08)",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    },
    userData: {
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: "2px",
    },
    userName: {
        color: "rgba(255,255,255,0.7)",
        fontSize: 16,
        fontWeight: 600,
        lineHeight: "140%",
        alignSelf: "stretch",
    },
    content: {
        display: "flex",
        flexDirection: "column",
        alignSelf: "stretch",   // ← вместо width: "100%"
        height: "100%",
        padding: "0px 32px",
        overflowY: "auto",
        gap: 36,
        boxSizing: "border-box", // ← добавить, чтобы padding не добавлял ширину
    },
    section: {
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 12,
        alignSelf: "stretch",
        width: "100%",
    },
    sectionTitle: {
        fontSize: 32,
        fontWeight: 400,
        fontStyle: "normal",
        lineHeight: "120%",
        color: "#FFFFFF",
        alignSelf: "stretch",
        margin: 0,
    },
    searchWrap: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: 280,
        height: 40,
        padding: "0 16px",
        borderRadius: 8,
        border: "1px solid #787971",
        backgroundColor: "#121211",
        cursor: "text",
        position: "absolute",   // ← добавить
        left: "50%",            // ← добавить
        transform: "translateX(-50%)",  // ← добавить
    },
    searchInput: {
        flex: 1,
        backgroundColor: "transparent",
        border: "none",
        outline: "none",
        color: "rgba(255,255,255,0.6)",
        fontSize: 14,
        fontFamily: "inherit",
    },
    allCockpitsHeader: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
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
        height: 40,
        padding: "0 16px",
        borderRadius: 8,
        backgroundColor: "#121211",
        border: "1px solid #787971",
        color: "rgba(255,255,255,0.6)",
        fontSize: 14,
        cursor: "pointer",
        whiteSpace: "nowrap" as const,
        fontFamily: "inherit",
    },
    filterBtnActive: {
        border: "1px solid #E9FD97",
        color: "#E9FD97",
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
    grid: {
        marginTop: "20px",
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 16,
        width: "100%",
    },
    createBtn: {
        position: "absolute",
        bottom: 28,
        right: 28,
        width: 52,
        height: 52,
        borderRadius: 22,
        backgroundColor: "#E9FD97",
        border: "none",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 0px 20px rgba(233,253,151,0.9)",
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