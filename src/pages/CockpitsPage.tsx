import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase/firebase";

const WORLD_MAP_IMAGE = "/media/map.svg";

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
    const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
    const [authReady, setAuthReady] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const [searchQuery, setSearchQuery] = useState("");
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [activeNav] = useState("cockpits");

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

    // ─── Auth ─────────────────────────────────────────────────────────────────

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setAuthReady(true);
            } else {
                window.location.href = "/auth";
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

    // ─── Data fetching ────────────────────────────────────────────────────────

    const fetchCurrentUser = async () => {
        try {
            const { data } = await api.get<CurrentUser>("/user/me");
            setCurrentUser(data);
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

    const navItems = [
        {
            id: "cockpits", label: "Cockpits",
            icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M17.7448 2.81298C18.7095 1.8165 20.3036 1.80361 21.2843 2.78436C22.2382 3.73823 22.2559 5.27921 21.3243 6.25481L18.5456 9.16457C18.3278 9.39265 18.219 9.50668 18.1518 9.64024C18.0924 9.75847 18.0571 9.88732 18.0478 10.0193C18.0374 10.1684 18.0728 10.3221 18.1438 10.6293L19.8717 18.1169C19.9444 18.4323 19.9808 18.59 19.9691 18.7426C19.9587 18.8776 19.921 19.0091 19.8582 19.1291C19.7873 19.2647 19.6729 19.3792 19.444 19.608L19.0732 19.9788C18.4671 20.585 18.164 20.888 17.8538 20.9429C17.583 20.9908 17.3043 20.925 17.0835 20.761C16.8306 20.5733 16.695 20.1666 16.424 19.3534L14.4142 13.3241L11.0689 16.6695C10.8692 16.8691 10.7694 16.969 10.7026 17.0866C10.6434 17.1907 10.6034 17.3047 10.5846 17.423C10.5633 17.5565 10.5789 17.6968 10.61 17.9775L10.7937 19.6309C10.8249 19.9116 10.8405 20.0519 10.8192 20.1854C10.8004 20.3037 10.7604 20.4177 10.7012 20.5219C10.6344 20.6394 10.5346 20.7393 10.3349 20.939L10.1374 21.1365C9.66434 21.6095 9.42781 21.8461 9.16496 21.9146C8.93442 21.9746 8.68999 21.9504 8.47571 21.8463C8.2314 21.7276 8.04585 21.4493 7.67475 20.8926L6.10643 18.5401C6.04013 18.4407 6.00698 18.391 5.96849 18.3459C5.9343 18.3058 5.89701 18.2685 5.85694 18.2343C5.81184 18.1958 5.76212 18.1627 5.66267 18.0964L3.31018 16.5281C2.75354 16.157 2.47521 15.9714 2.35649 15.7271C2.25236 15.5128 2.22816 15.2684 2.28824 15.0378C2.35674 14.775 2.59327 14.5385 3.06633 14.0654L3.26384 13.8679C3.46352 13.6682 3.56337 13.5684 3.68095 13.5016C3.78511 13.4424 3.89906 13.4024 4.01736 13.3836C4.15089 13.3623 4.29123 13.3779 4.5719 13.4091L6.22529 13.5928C6.50596 13.6239 6.6463 13.6395 6.77983 13.6182C6.89813 13.5994 7.01208 13.5594 7.11624 13.5002C7.23382 13.4334 7.33366 13.3336 7.53335 13.1339L10.8787 9.7886L4.84939 7.77884C4.03616 7.50776 3.62955 7.37222 3.44176 7.11932C3.27777 6.89848 3.212 6.61984 3.2599 6.34898C3.31477 6.03879 3.61784 5.73572 4.22399 5.12957L4.59476 4.7588C4.82365 4.52991 4.9381 4.41546 5.07369 4.34457C5.1937 4.28183 5.3252 4.24411 5.46023 4.23371C5.61278 4.22197 5.77049 4.25836 6.0859 4.33115L13.545 6.05249C13.855 6.12401 14.01 6.15978 14.1596 6.14914C14.3041 6.13886 14.4446 6.09733 14.5714 6.02742C14.7028 5.95501 14.8134 5.84074 15.0347 5.6122L17.7448 2.81298Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        },
        {
            id: "schools", label: "Schools",
            icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M17 14.5001V11.4945C17 11.315 17 11.2253 16.9727 11.146C16.9485 11.076 16.9091 11.0122 16.8572 10.9592C16.7986 10.8993 16.7183 10.8592 16.5578 10.779L12 8.50006M4 9.50006V16.3067C4 16.6786 4 16.8645 4.05802 17.0274C4.10931 17.1713 4.1929 17.3016 4.30238 17.4082C4.42622 17.5287 4.59527 17.6062 4.93335 17.7612L11.3334 20.6945C11.5786 20.8069 11.7012 20.8631 11.8289 20.8853C11.9421 20.9049 12.0579 20.9049 12.1711 20.8853C12.2988 20.8631 12.4214 20.8069 12.6666 20.6945L19.0666 17.7612C19.4047 17.6062 19.5738 17.5287 19.6976 17.4082C19.8071 17.3016 19.8907 17.1713 19.942 17.0274C20 16.8645 20 16.6786 20 16.3067V9.50006M2 8.50006L11.6422 3.67895C11.7734 3.61336 11.839 3.58056 11.9078 3.56766C11.9687 3.55622 12.0313 3.55622 12.0922 3.56766C12.161 3.58056 12.2266 3.61336 12.3578 3.67895L22 8.50006L12.3578 13.3212C12.2266 13.3868 12.161 13.4196 12.0922 13.4325C12.0313 13.4439 11.9687 13.4439 11.9078 13.4325C11.839 13.4196 11.7734 13.3868 11.6422 13.3212L2 8.50006Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        },
        {
            id: "settings", label: "Settings",
            icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M18.7273 14.7273C18.6063 15.0015 18.5702 15.3056 18.6236 15.6005C18.6771 15.8954 18.8177 16.1676 19.0273 16.3818L19.0818 16.4364C19.2509 16.6052 19.385 16.8057 19.4765 17.0265C19.568 17.2472 19.6151 17.4838 19.6151 17.7227C19.6151 17.9617 19.568 18.1983 19.4765 18.419C19.385 18.6397 19.2509 18.8402 19.0818 19.0091C18.913 19.1781 18.7124 19.3122 18.4917 19.4037C18.271 19.4952 18.0344 19.5423 17.7955 19.5423C17.5565 19.5423 17.3199 19.4952 17.0992 19.4037C16.8785 19.3122 16.678 19.1781 16.5091 19.0091L16.4545 18.9545C16.2403 18.745 15.9682 18.6044 15.6733 18.5509C15.3784 18.4974 15.0742 18.5335 14.8 18.6545C14.5311 18.7698 14.3018 18.9611 14.1403 19.205C13.9788 19.4489 13.8921 19.7347 13.8909 20.0273V20.1818C13.8909 20.664 13.6994 21.1265 13.3584 21.4675C13.0174 21.8084 12.5549 22 12.0727 22C11.5905 22 11.1281 21.8084 10.7871 21.4675C10.4461 21.1265 10.2545 20.664 10.2545 20.1818V20.1C10.2475 19.7991 10.1501 19.5073 9.97501 19.2625C9.79991 19.0176 9.55521 18.8312 9.27273 18.7273C8.99853 18.6063 8.69437 18.5702 8.39947 18.6236C8.10456 18.6771 7.83244 18.8177 7.61818 19.0273L7.56364 19.0818C7.39478 19.2509 7.19425 19.385 6.97353 19.4765C6.7528 19.568 6.51621 19.6151 6.27727 19.6151C6.03834 19.6151 5.80174 19.568 5.58102 19.4765C5.36029 19.385 5.15977 19.2509 4.99091 19.0818C4.82186 18.913 4.68775 18.7124 4.59626 18.4917C4.50476 18.271 4.45766 18.0344 4.45766 17.7955C4.45766 17.5565 4.50476 17.3199 4.59626 17.0992C4.68775 16.8785 4.82186 16.678 4.99091 16.5091L5.04545 16.4545C5.25503 16.2403 5.39562 15.9682 5.4491 15.6733C5.50257 15.3784 5.46647 15.0742 5.34545 14.8C5.23022 14.5311 5.03887 14.3018 4.79497 14.1403C4.55107 13.9788 4.26526 13.8921 3.97273 13.8909H3.81818C3.33597 13.8909 2.87351 13.6994 2.53253 13.3584C2.19156 13.0174 2 12.5549 2 12.0727C2 11.5905 2.19156 11.1281 2.53253 10.7871C2.87351 10.4461 3.33597 10.2545 3.81818 10.2545H3.9C4.2009 10.2475 4.49273 10.1501 4.73754 9.97501C4.98236 9.79991 5.16883 9.55521 5.27273 9.27273C5.39374 8.99853 5.42984 8.69437 5.37637 8.39947C5.3229 8.10456 5.18231 7.83244 4.97273 7.61818L4.91818 7.56364C4.74913 7.39478 4.61503 7.19425 4.52353 6.97353C4.43203 6.7528 4.38493 6.51621 4.38493 6.27727C4.38493 6.03834 4.43203 5.80174 4.52353 5.58102C4.61503 5.36029 4.74913 5.15977 4.91818 4.99091C5.08704 4.82186 5.28757 4.68775 5.50829 4.59626C5.72901 4.50476 5.96561 4.45766 6.20455 4.45766C6.44348 4.45766 6.68008 4.50476 6.9008 4.59626C7.12152 4.68775 7.32205 4.82186 7.49091 4.99091L7.54545 5.04545C7.75971 5.25503 8.03183 5.39562 8.32674 5.4491C8.62164 5.50257 8.9258 5.46647 9.2 5.34545H9.27273C9.54161 5.23022 9.77093 5.03887 9.93245 4.79497C10.094 4.55107 10.1807 4.26526 10.1818 3.97273V3.81818C10.1818 3.33597 10.3734 2.87351 10.7144 2.53253C11.0553 2.19156 11.5178 2 12 2C12.4822 2 12.9447 2.19156 13.2856 2.53253C13.6266 2.87351 13.8182 3.33597 13.8182 3.81818V3.9C13.8193 4.19253 13.906 4.47834 14.0676 4.72224C14.2291 4.96614 14.4584 5.15749 14.7273 5.27273C15.0015 5.39374 15.3056 5.42984 15.6005 5.37637C15.8954 5.3229 16.1676 5.18231 16.3818 4.97273L16.4364 4.91818C16.6052 4.74913 16.8057 4.61503 17.0265 4.52353C17.2472 4.43203 17.4838 4.38493 17.7227 4.38493C17.9617 4.38493 18.1983 4.43203 18.419 4.52353C18.6397 4.61503 18.8402 4.74913 19.0091 4.91818C19.1781 5.08704 19.3122 5.28757 19.4037 5.50829C19.4952 5.72901 19.5423 5.96561 19.5423 6.20455C19.5423 6.44348 19.4952 6.68008 19.4037 6.9008C19.3122 7.12152 19.1781 7.32205 19.0091 7.49091L18.9545 7.54545C18.745 7.75971 18.6044 8.03183 18.5509 8.32674C18.4974 8.62164 18.5335 8.9258 18.6545 9.2V9.27273C18.7698 9.54161 18.9611 9.77093 19.205 9.93245C19.4489 10.094 19.7347 10.1807 20.0273 10.1818H20.1818C20.664 10.1818 21.1265 10.3734 21.4675 10.7144C21.8084 11.0553 22 11.5178 22 12C22 12.4822 21.8084 12.9447 21.4675 13.2856C21.1265 13.6266 20.664 13.8182 20.1818 13.8182H20.1C19.8075 13.8193 19.5217 13.906 19.2778 14.0676C19.0339 14.2291 18.8425 14.4584 18.7273 14.7273Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        }
    ];

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

            {WORLD_MAP_IMAGE && (<img src={WORLD_MAP_IMAGE} style={s.worldMap} />)}

            {/* Sidebar */}
            <aside style={{ ...s.sidebar, width: sidebarCollapsed ? 64 : 200 }}>
                <div style={s.logo}>
                    {!sidebarCollapsed && <span>ZENIT</span>}
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
                                width: 32, height: 32, borderRadius: 12,
                                backgroundColor: activeNav === item.id ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.07)",
                                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                                color: activeNav === item.id ? "#E9FD97" : "rgba(255,255,255,0.45)",
                            }}>{item.icon}</span>
                            {!sidebarCollapsed && (
                                <span style={{ color: activeNav === item.id ? "#fff" : "rgba(255,255,255,0.45)", fontSize: 18 }}>
                                    {item.label}
                                </span>
                            )}
                        </button>
                    ))}
                </nav>
            </aside>

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
                    <section style={s.section}>
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
    worldMap: {
        position: "fixed",
        width: "100%",
        height: "100%",
        objectFit: "cover",
        pointerEvents: "none",
        opacity: 0.4,
        zIndex: 0,
    },
    sidebar: {
        display: "flex",
        flexDirection: "column",
        gap: 32,
        alignSelf: "stretch",
        padding: 32,
        borderRight: "1px solid #787971",
        backgroundColor: "#121211",
        zIndex: 1,
    },
    logo: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 48,
        fontWeight: 800,
        letterSpacing: 2,
        color: "#ffffff",
        pointerEvents: "none",
        WebkitUserSelect: "none",
        msUserSelect: "none",
        userSelect: "none",
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
        margin: 0,
    },
    grid: {
        marginTop: "20px",
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 16,
        width: "100%",
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