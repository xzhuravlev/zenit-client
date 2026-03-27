import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useOutletContext } from "react-router-dom";
import api from "../api/axios";

const COLS = 3;
const ROWS = 5;
const PAGE_SIZE = COLS * ROWS;

// ─── Types ───���────────────────────────────────────────────────────────────────

interface CockpitMedia {
    link: string;
    type: string;
}

interface Cockpit {
    id: string;
    name: string;
    manufacturer: string | null;
    model: string | null;
    registration: string | null;
    category: string | null;
    purpose: string | null;
    hasVfr: boolean;
    hasIfr: boolean;
    hasNight: boolean;
    hasAutopilot: boolean;
    createdAt: string;
    isFavorite: boolean;
    favoritesCount: number;
    media: CockpitMedia[];
}

interface CockpitsResponse {
    items: Cockpit[];
    total: number;
    page: number;
    pages: number;
}

interface CockpitDetail extends Cockpit {
    instruments: { id: string; name: string; media: CockpitMedia[] }[];
    checklists: {
        id: string;
        name: string;
        items: { id: string; description: string; order: number }[];
    }[];
    creator: { id: string; name: string | null; surname: string | null; avatar: string | null } | null;
}

// ─── Modal Photo Section ──────────────────────────────────────────────────────

const ModalPhotoSection: React.FC<{ media: CockpitMedia[] }> = ({ media }) => {
    const [index, setIndex] = useState(0);
    const filtered = media.filter(m => m.type?.toUpperCase() !== "PANORAMA");
    const photos = filtered.filter(m => m.type?.toLowerCase() === "image").length > 0
        ? filtered.filter(m => m.type?.toLowerCase() === "image")
        : filtered;
    const current = photos[index]?.link;

    return (
        <div style={ms.wrap}>
            {current
                ? <img src={current} style={ms.photo} alt="" />
                : <div style={ms.empty} />
            }
            {photos.length > 1 && (
                <div style={ms.arrows}>
                    <button style={ms.arrowBtn} onClick={() => setIndex(i => Math.max(0, i - 1))} disabled={index === 0}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </button>
                    <button style={ms.arrowBtn} onClick={() => setIndex(i => Math.min(photos.length - 1, i + 1))} disabled={index === photos.length - 1}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </button>
                </div>
            )}
        </div>
    );
};

const ms: Record<string, React.CSSProperties> = {
    wrap: {
        position: "relative",
        width: "100%",
        height: "100%",
        background: "rgba(255,255,255,0.05)",
        borderRadius: 12,
        maskImage: "linear-gradient(to bottom, transparent 0%, black 8%, black 80%, transparent 100%)",
        WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 8%, black 80%, transparent 100%)",
    },
    photo: {
        width: "100%",
        height: "100%",
        objectFit: "cover",
    },
    empty: {
        width: "100%",
        height: "100%",
        background: "rgba(255,255,255,0.05)",
    },
    arrows: {
        position: "absolute",
        top: "50%",
        left: 0,
        right: 0,
        transform: "translateY(-50%)",
        display: "flex",
        justifyContent: "space-between",
        padding: "0 12px",
        pointerEvents: "none",
    },
    arrowBtn: {
        pointerEvents: "all",
        width: 36,
        height: 36,
        borderRadius: 8,
        background: "rgba(18,18,17,0.7)",
        border: "none",
        cursor: "pointer",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },
};

// ─── Card ─────────────────────────────────────────────────────────────────────

interface CardProps {
    cockpit?: Cockpit;
    onOpen?: (cockpit: Cockpit) => void;
}

const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days < 1) return "today";
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return "more than a month ago";
};

const CockpitCard: React.FC<CardProps> = ({ cockpit, onOpen }) => {
    const navigate = useNavigate();
    const [liked, setLiked] = useState(cockpit?.isFavorite ?? false);
    const photo = cockpit?.media.find(m => m.type === "image")?.link ?? cockpit?.media[0]?.link;

    const handleLike = async () => {
        if (!cockpit) return;
        setLiked(v => !v);
        try {
            await api.post(`/cockpits/${cockpit.id}/favorite`);
        } catch {
            setLiked(v => !v);
        }
    };

    const tags = cockpit ? [
        cockpit.hasVfr && "VFR",
        cockpit.hasIfr && "IFR",
        cockpit.hasNight && "Night",
        cockpit.hasAutopilot && "AP",
    ].filter(Boolean) as string[] : [];

    return (
        <div
            style={{
                ...s.card,
                background: photo
                    ? `linear-gradient(180deg, #1F201E 0%, rgba(31, 32, 30, 0.00) 32.21%, rgba(31, 32, 30, 0.50) 56.74%, #1F201E 100%), url(${photo}) lightgray 50% / cover no-repeat`
                    : s.card.background,
                cursor: cockpit ? "pointer" : "default",
            }}
            onClick={() => cockpit && onOpen?.(cockpit)}
        >
            {cockpit && (<>
                <div style={s.cardTop}>
                    <button
                        style={{
                            ...s.likeBtn,
                            background: liked ? "#E9FD97" : s.likeBtn.background,
                        }}
                        onClick={e => { e.stopPropagation(); handleLike(); }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 16 16" fill="none">
                            <g clipPath="url(#clip0_664_1286)">
                                <path d="M13.8933 3.07357C13.5528 2.73291 13.1485 2.46267 12.7036 2.2783C12.2586 2.09392 11.7817 1.99902 11.3 1.99902C10.8183 1.99902 10.3414 2.09392 9.89643 2.2783C9.45146 2.46267 9.04717 2.73291 8.70667 3.07357L8 3.78024L7.29333 3.07357C6.60554 2.38578 5.67269 1.99938 4.7 1.99938C3.72731 1.99938 2.79446 2.38578 2.10666 3.07357C1.41887 3.76137 1.03247 4.69422 1.03247 5.66691C1.03247 6.6396 1.41887 7.57245 2.10666 8.26024L8 14.1536L13.8933 8.26024C14.234 7.91974 14.5042 7.51545 14.6886 7.07048C14.873 6.6255 14.9679 6.14857 14.9679 5.66691C14.9679 5.18525 14.873 4.70831 14.6886 4.26334C14.5042 3.81836 14.234 3.41408 13.8933 3.07357Z" stroke={liked ? "#313C01" : "#E9FD97"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            </g>
                            <defs>
                                <clipPath id="clip0_664_1286">
                                    <rect width="16" height="16" fill="white" />
                                </clipPath>
                            </defs>
                        </svg>
                    </button>
                </div>

                <div style={s.cardBottom}>
                    <div style={s.cardInfo}>
                        <div style={s.cardTitleRow}>
                            <span style={s.cardName}>{cockpit.name}</span>
                            {cockpit.manufacturer && <>
                                <div style={s.cardDivider} />
                                <span style={s.cardManufacturer}>{cockpit.manufacturer}</span>
                            </>}
                        </div>
                        {tags.length > 0 && (
                            <div style={s.cardTags}>
                                {tags.map(tag => (
                                    <span key={tag} style={s.cardTag}>{tag}</span>
                                ))}
                            </div>
                        )}
                        <div style={s.cardTime}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 6V12L16 14M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" stroke="#E9FD97" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <span>{timeAgo(cockpit.createdAt)}</span>
                        </div>
                    </div>

                    <button style={s.openBtn} onClick={e => { e.stopPropagation(); if (cockpit) navigate(`/new/cockpits/${cockpit.id}/learn`); }}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M20 14V16.8C20 17.9201 20 18.4802 19.782 18.908C19.5903 19.2843 19.2843 19.5903 18.908 19.782C18.4802 20 17.9201 20 16.8 20H14M10 4H7.2C6.0799 4 5.51984 4 5.09202 4.21799C4.71569 4.40973 4.40973 4.71569 4.21799 5.09202C4 5.51984 4 6.07989 4 7.2V10M15 9L21 3M21 3H15M21 3V9M9 15L3 21M3 21H9M3 21L3 15" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                </div>
            </>)}
        </div>
    );
};

// ─── Filter Dropdown ──────────────────────────────────────────────────────────

const CATEGORIES = ["SEP", "MEP", "TMG", "SET", "HELICOPTER"] as const;
type AircraftCategory = typeof CATEGORIES[number];

const FEATURES = [
    { key: "hasVfr",      label: "VFR" },
    { key: "hasIfr",      label: "IFR" },
    { key: "hasNight",    label: "Night" },
    { key: "hasAutopilot", label: "Autopilot" },
] as const;

const FilterDropdown: React.FC<{
    label: string;
    items: { key: string; label: string }[];
    selected: string[];
    onToggle: (key: string) => void;
}> = ({ label, items, selected, onToggle }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    return (
        <div ref={ref} style={{ position: "relative" }}>
            <button style={cs.trigger} onClick={() => setOpen(v => !v)}>
                <span>{label}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ transition: "transform 0.2s ease", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>
                    <path d="M6 9L12 15L18 9" stroke="#E9FD97" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
            </button>
            <div style={{
                ...cs.menu,
                opacity: open ? 1 : 0,
                transform: open ? "translateY(0)" : "translateY(-6px)",
                pointerEvents: open ? "all" : "none",
                transition: "opacity 0.18s ease, transform 0.18s ease",
            }}>
                {items.map(item => (
                    <div
                        key={item.key}
                        style={{ ...cs.menuItem, color: selected.includes(item.key) ? "#E9FD97" : "#fff", fontWeight: selected.includes(item.key) ? 600 : 400 }}
                        onClick={() => onToggle(item.key)}
                    >
                        {item.label}
                    </div>
                ))}
            </div>
        </div>
    );
};

const cs: Record<string, React.CSSProperties> = {
    trigger: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        borderRadius: 8,
        border: "1px solid #787971",
        background: "#121211",
        color: "#fff",
        padding: "12px 16px",
        fontSize: 16,
        fontWeight: 400,
        cursor: "pointer",
        whiteSpace: "nowrap" as const,
    },
    menu: {
        position: "absolute",
        top: "calc(100% + 6px)",
        left: 0,
        minWidth: "100%",
        background: "#1A1A19",
        border: "1px solid #393A36",
        borderRadius: 8,
        overflow: "hidden",
        zIndex: 10,
    },
    menuItem: {
        padding: "10px 16px",
        fontSize: 15,
        cursor: "pointer",
        transition: "background 0.15s",
    },
};

// ─── Page ──────────────────────────────────────────────────────────────────────

const Cockpits: React.FC = () => {
    const navigate = useNavigate();
    const { setTitle } = useOutletContext<{ setTitle: (t: string) => void }>();
    const [page, setPage] = useState(0);
    const [search, setSearch] = useState("");
    const [query, setQuery] = useState("");
    const [categories, setCategories] = useState<AircraftCategory[]>([]);
    const [features, setFeatures] = useState<string[]>([]);
    const [cockpits, setCockpits] = useState<Cockpit[]>([]);
    const [totalPages, setTotalPages] = useState(1);
    const [selected, setSelected] = useState<Cockpit | null>(null);
    const [detail, setDetail] = useState<CockpitDetail | null>(null);

    useEffect(() => {
        if (!selected) { setDetail(null); return; }
        api.get<CockpitDetail>(`/cockpits/${selected.id}`)
            .then(r => { console.log("detail:", r.data); setDetail(r.data); })
            .catch(() => setDetail(null));
    }, [selected]);

    useEffect(() => {
        setTitle("Cockpits");
    }, []);


    useEffect(() => {
        const fetch = async () => {
            try {
                const params = new URLSearchParams({
                    page: String(page + 1),
                    limit: String(PAGE_SIZE),
                    orderBy: "new",
                    ...(query ? { name: query } : {}),
                });
                categories.forEach(cat => params.append("category", cat));
                features.forEach(f => params.append(f, "true"));
                const r = await api.get<CockpitsResponse>(`/cockpits?${params}`);
                setCockpits(r.data.items);
                setTotalPages(r.data.pages);
            } catch {
                setCockpits([]);
            }
        };
        fetch();
    }, [page, query, categories, features]);

    const toggleCategory = (cat: string) => {
        setCategories(prev =>
            prev.includes(cat as AircraftCategory) ? prev.filter(c => c !== cat) : [...prev, cat as AircraftCategory]
        );
        setPage(0);
    };

    const toggleFeature = (key: string) => {
        setFeatures(prev =>
            prev.includes(key) ? prev.filter(f => f !== key) : [...prev, key]
        );
        setPage(0);
    };

    // На первой странице заполняем недостающие слоты dummy-карточками
    const slots: Array<Cockpit | null> = [...cockpits];
    if (page === 0) {
        while (slots.length < PAGE_SIZE) slots.push(null);
    }

    return (
        <div style={s.container}>
            <div style={s.section}>
                <div style={s.sectionBar}>
                    <h2 style={s.sectionTitle}>What others fly</h2>
                    <div style={{ display: "flex", gap: 12 }}>
                        <div style={s.searchWrap}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={s.searchIcon}>
                                <path d="M21 21L16.65 16.65M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z" stroke="#E9FD97" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            <input
                                style={s.searchInput}
                                placeholder="Search for cockpit"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                onKeyDown={e => { if (e.key === "Enter") { setQuery(search); setPage(0); } }}
                            />
                        </div>
                        <FilterDropdown
                            label="Category"
                            items={CATEGORIES.map(c => ({ key: c, label: c }))}
                            selected={categories}
                            onToggle={toggleCategory}
                        />
                        <FilterDropdown
                            label="Features"
                            items={FEATURES.map(f => ({ key: f.key, label: f.label }))}
                            selected={features}
                            onToggle={toggleFeature}
                        />
                    </div>
                </div>
                {(categories.length > 0 || features.length > 0) && (
                    <div style={s.categoryTags}>
                        {categories.map(cat => (
                            <div key={cat} style={s.categoryTag}>
                                <span style={s.categoryTagLabel}>{cat}</span>
                                <button style={s.categoryTagRemove} onClick={() => toggleCategory(cat)}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                        <path d="M17 7L7 17M7 7L17 17" stroke="#E9FD97" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </button>
                            </div>
                        ))}
                        {features.map(key => {
                            const label = FEATURES.find(f => f.key === key)?.label ?? key;
                            return (
                                <div key={key} style={s.categoryTag}>
                                    <span style={s.categoryTagLabel}>{label}</span>
                                    <button style={s.categoryTagRemove} onClick={() => toggleFeature(key)}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                            <path d="M17 7L7 17M7 7L17 17" stroke="#E9FD97" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
                <div style={s.sectionGrid}>
                    {slots.map((cockpit, i) => (
                        <CockpitCard key={cockpit?.id ?? `dummy-${i}`} cockpit={cockpit ?? undefined} onOpen={setSelected} />
                    ))}
                </div>
                <div style={s.pagination}>
                    <button style={s.pageBtn} onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                    <span style={s.pageInfo}>{page + 1} / {totalPages}</span>
                    <button style={s.pageBtn} onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                </div>
            </div>

            {selected && createPortal(
                <>
                    <style>{`
                        @keyframes backdropIn {
                            from { opacity: 0; }
                            to   { opacity: 1; }
                        }
                        @keyframes modalIn {
                            from { opacity: 0; transform: scale(0.95); }
                            to   { opacity: 1; transform: scale(1); }
                        }
                    `}</style>
                    <div style={{ ...s.backdrop, animation: "backdropIn 0.2s ease" }} onClick={() => setSelected(null)}>
                        <div style={{ ...s.modal, animation: "modalIn 0.2s ease" }} onClick={e => e.stopPropagation()}>
                            <div style={s.modalHeader}>
                                <span style={s.modalTitle}>{detail?.name ?? selected.name}</span>
                                <button style={s.closeBtn} onClick={() => setSelected(null)}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M18 6L6 18M6 6L18 18" stroke="#E9FD97" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </button>
                            </div>

                            <div style={s.modalBody}>
                                <div style={s.modalPhotos}>
                                    <ModalPhotoSection media={detail?.media ?? []} />
                                </div>
                                <div style={s.modalInfo}>
                                    <div style={s.modalSection}>
                                        <span style={s.modalSectionTitle}>Description</span>
                                        <span style={s.modalSectionText}>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Lorem ipsum dolor sit amet, consectetur adipiscing elit.</span>
                                        {detail?.creator && (
                                            <div style={s.modalAuthor}>
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: "#E9FD97", flexShrink: 0 }}>
                                                    <path d="M20 21C20 19.6044 20 18.9067 19.8278 18.3389C19.44 17.0605 18.4395 16.06 17.1611 15.6722C16.5933 15.5 15.8956 15.5 14.5 15.5H9.5C8.10444 15.5 7.40665 15.5 6.83886 15.6722C5.56045 16.06 4.56004 17.0605 4.17224 18.3389C4 18.9067 4 19.6044 4 21M16.5 7.5C16.5 9.98528 14.4853 12 12 12C9.51472 12 7.5 9.98528 7.5 7.5C7.5 5.01472 9.51472 3 12 3C14.4853 3 16.5 5.01472 16.5 7.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                </svg>
                                                <span style={s.modalAuthorName}>
                                                    {[detail.creator.name].filter(Boolean).join(" ") || "Unknown"}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div style={s.modalSection}>
                                        <span style={s.modalSectionTitle}>Checklists</span>
                                        <div style={s.checklistList}>
                                            {(detail?.checklists ?? []).map(cl => {
                                                const pct = 0; // placeholder
                                                const attempts = 0; // placeholder
                                                const color = pct <= 20 ? "#C00F0C" : pct <= 50 ? "#E8B931" : "#008043";
                                                return (
                                                    <div key={cl.id} style={{ ...s.checklistRow, cursor: "pointer" }} onClick={() => navigate(`/new/cockpits/${selected?.id}/checklist`)}>
                                                        <span style={s.checklistName}>{cl.name}</span>
                                                        <div style={s.checklistDivider} />
                                                        <span style={{ ...s.checklistPct, color }}>{pct}%</span>
                                                        <div style={{ ...s.progressTrack, background: `${color}40` }}>
                                                            <div style={{ ...s.progressFill, width: `${pct}%`, background: color }} />
                                                        </div>
                                                        <span style={s.checklistAttempts}>{attempts} tries</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>,
                document.body
            )}
        </div>
    );
};

const s: Record<string, React.CSSProperties> = {
    container: {
        overflowY: "auto",
        height: "100%",
        maskImage: "linear-gradient(to bottom, transparent 0%, black 4%, black 88%, transparent 100%)",
        WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 4%, black 88%, transparent 100%)",
        paddingTop: 32,
        paddingBottom: 128,
        boxSizing: "border-box",
    },
    section: {
    },
    sectionBar: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 20,
    },
    categoryTags: {
        display: "flex",
        flexWrap: "wrap" as const,
        gap: 8,
        marginBottom: 20,
    },
    categoryTag: {
        display: "flex",
        alignItems: "center",
        gap: 6,
        borderRadius: 8,
        background: "#464743",
        padding: "6px 10px",
    },
    categoryTagLabel: {
        color: "#fff",
        fontSize: 16,
        fontWeight: 400,
    },
    categoryTagRemove: {
        background: "none",
        border: "none",
        padding: 0,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },
    searchWrap: {
        position: "relative",
        display: "flex",
        alignItems: "center",
        width: 280,
        minWidth: 120,
    },
    searchIcon: {
        position: "absolute",
        right: 10,
        pointerEvents: "none",
        flexShrink: 0,
    },
    searchInput: {
        width: "100%",
        borderRadius: 8,
        border: "1px solid #787971",
        background: "#121211",
        color: "#fff",
        padding: "12px 38px 12px 16px",
        fontSize: 16,
        fontWeight: 400,
        outline: "none",
        boxSizing: "border-box" as const,
    },
    sectionTitle: {
        fontSize: 32,
        fontWeight: 400,
        color: "rgba(255, 255, 255, 0.7)",
        margin: 0,
    },
    pagination: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        marginTop: 20,
    },
    pageBtn: {
        // background: "rgba(255,255,255,0.1)",
        // border: "1px solid rgba(255,255,255,0.2)",
        background: "rgba(233, 253, 151, 0.18)",
        border: "none",
        // color: "#fff",
        color: "#E9FD97",
        borderRadius: 6,
        width: 32,
        height: 32,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 0,
    },
    pageInfo: {
        color: "rgba(255,255,255,0.7)",
        fontSize: 14,
    },
    sectionGrid: {
        display: "grid",
        gridTemplateColumns: `repeat(${COLS}, 1fr)`,
        gridTemplateRows: `repeat(${ROWS}, 1fr)`,
        gap: 32,
    },
    card: {
        background: "rgba(255,255,255,0.07)",
        border: "1px solid #393A36",
        borderRadius: 16,
        // aspectRatio: "16/9",
        height: 256,
        overflow: "hidden",
        padding: 16,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
    },
    likeBtn: {
        borderRadius: 8,
        background: "rgba(70, 71, 67, 0.8)",
        backdropFilter: "blur(2px)",
        padding: 8,
        border: "none",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#E9FD97",
    },
    cardTop: {
        display: "flex",
        alignItems: "flex-start",
    },
    cardBottom: {
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
    },
    cardInfo: {
        display: "flex",
        flexDirection: "column",
        gap: 10,
    },
    cardTitleRow: {
        display: "flex",
        alignItems: "center",
        gap: 12,
    },
    cardName: {
        color: "#fff",
        fontSize: 20,
        fontWeight: 400,
    },
    cardDivider: {
        width: 2,
        height: 25,
        background: "rgba(255,255,255,0.4)",
    },
    cardManufacturer: {
        color: "rgb(255,255,255)",
        fontWeight: 400,
        fontSize: 20,
    },
    cardTags: {
        display: "flex",
        gap: 8,
    },
    cardTag: {
        borderRadius: 8,
        background: "rgba(70, 71, 67, 0.8)",
        backdropFilter: "blur(2px)",
        padding: "4px 8px",
        color: "rgb(255,255,255)",
        fontSize: 16,
        fontWeight: 400,
    },
    cardTime: {
        display: "flex",
        alignItems: "center",
        gap: 5,
        color: "rgba(255,255,255,0.7)",
        fontSize: 16,
        fontWeight: 400,
    },
    openBtn: {
        width: 40,
        height: 40,
        padding: 8,
        borderRadius: 8,
        background: "#E9FD97",
        color: "#313C01",
        border: "none",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxSizing: "border-box",
    },
    backdrop: {
        position: "fixed",
        inset: 0,
        background: "rgba(18, 18, 17, 0.65)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
    },
    modal: {
        width: "70%",
        height: "70%",
        // background: "rgb(18, 18, 17)",
        // border: "1px solid #393A36",
        border: "1px solid transparent",
        background: "linear-gradient(rgb(18,18,17), rgb(18,18,17)) padding-box, linear-gradient(to bottom, #393A36, #1F201E) border-box",
        borderRadius: 16,
        cursor: "default",
        padding: 32,
        display: "flex",
        flexDirection: "column",
    },
    modalHeader: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
    },
    modalTitle: {
        color: "rgba(255, 255, 255, 1)",
        fontSize: 28,
        fontWeight: 500,
    },
    closeBtn: {
        width: 40,
        height: 40,
        borderRadius: 8,
        background: "rgba(233, 253, 151, 0.18)",
        border: "none",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        padding: 8,
    },
    modalBody: {
        display: "flex",
        flex: 1,
        gap: 32,
        marginTop: 24,
        minHeight: 0,
    },
    modalPhotos: {
        flex: "0 0 55%",
        minHeight: 0,
    },
    modalInfo: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        gap: 24,
        overflowY: "auto",
    },
    modalSection: {
        display: "flex",
        flexDirection: "column",
        gap: 10,
    },
    modalSectionTitle: {
        color: "rgba(255, 255, 255, 1)",
        fontSize: 32,
        fontWeight: 400,
    },
    modalSectionText: {
        color: "rgba(255, 255, 255, 0.7)",
        fontSize: 16,
        fontWeight: 400,
        lineHeight: 1.6,
    },
    modalAuthor: {
        display: "flex",
        alignItems: "center",
        gap: 8,
    },
    modalAuthorName: {
        color: "rgba(255,255,255,0.7)",
        fontSize: 14,
        fontWeight: 500,
    },
    checklistList: {
        display: "flex",
        flexDirection: "column",
        gap: 12,
    },
    checklistRow: {
        display: "flex",
        alignItems: "center",
        gap: 12,
        borderRadius: 16,
        border: "1px solid transparent",
        background: "linear-gradient(rgb(18,18,17), rgb(18,18,17)) padding-box, linear-gradient(to bottom, #393A36, #1F201E) border-box",
        backdropFilter: "blur(5px)",
        padding: "12px 16px",
    },
    checklistName: {
        color: "#fff",
        fontSize: 20,
        fontWeight: 400,
        whiteSpace: "nowrap" as const,
        overflow: "hidden",
        textOverflow: "ellipsis",
        width: 160,
        flexShrink: 0,
    },
    checklistDivider: {
        width: 1,
        height: 18,
        background: "rgba(255,255,255,0.4)",
        flexShrink: 0,
    },
    checklistPct: {
        fontSize: 16,
        fontWeight: 400,
        flexShrink: 0,
        width: 40,
        textAlign: "center" as const,
    },
    progressTrack: {
        flex: 1,
        height: 6,
        borderRadius: 999,
        overflow: "hidden",
    },
    progressFill: {
        height: "100%",
        borderRadius: 999,
        transition: "width 0.3s ease",
    },
    checklistAttempts: {
        color: "rgba(255,255,255,0.4)",
        fontSize: 16,
        fontWeight: 400,
        flexShrink: 0,
        width: 52,
        textAlign: "center" as const,
    },
};

export default Cockpits;
