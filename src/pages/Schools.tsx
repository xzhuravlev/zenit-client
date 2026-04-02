import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useOutletContext } from "react-router-dom";
import api from "../api/axios";

const COLS = 3;
const ROWS = 5;
const PAGE_SIZE = COLS * ROWS;

// ─── Types ────────────────────────────────────────────────────────────────────

interface SchoolMedia {
    link: string;
    type: string;
}

interface School {
    id: string;
    name: string;
    description: string | null;
    address: string | null;
    createdAt: string;
    media: SchoolMedia[];
    _count: { members: number; cockpits: number };
    currentUserRole: "OWNER" | "INSTRUCTOR" | "STUDENT" | null;
}

interface SchoolsResponse {
    items: School[];
    total: number;
    page: number;
    totalPages: number;
}

interface SchoolMember {
    id: string;
    role: "OWNER" | "INSTRUCTOR" | "STUDENT";
    user: {
        id: string;
        name: string | null;
        surname: string | null;
        avatar: string | null;
        email: string;
    };
}

interface SchoolDetail extends School {
    address: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    instagram: string | null;
    members: SchoolMember[];
    currentUserRole: "OWNER" | "INSTRUCTOR" | "STUDENT" | null;
}

interface SchoolCockpit {
    id: string;
    name: string;
    manufacturer: string | null;
    hasVfr: boolean;
    hasIfr: boolean;
    hasNight: boolean;
    hasAutopilot: boolean;
    createdAt: string;
    media: { link: string; type: string }[];
}

// ─── Modal Photo Section ──────────────────────────────────────────────────────

const ModalPhotoSection: React.FC<{ media: SchoolMedia[] }> = ({ media }) => {
    const [index, setIndex] = useState(0);
    const [prevIndex, setPrevIndex] = useState<number | null>(null);
    const [direction, setDirection] = useState<"left" | "right">("right");
    const [animKey, setAnimKey] = useState(0);
    const photos = media.filter(m => m.type === "PHOTO" || m.type === "photo");

    const goTo = (next: number) => {
        if (next === index) return;
        setDirection(next > index ? "right" : "left");
        setPrevIndex(index);
        setIndex(next);
        setAnimKey(k => k + 1);
    };

    return (
        <div style={{ position: "relative", width: "100%", height: "100%" }}>
            <style>{`
                @keyframes slideOutLeft  { from { transform: translateX(0); } to { transform: translateX(-100%); } }
                @keyframes slideOutRight { from { transform: translateX(0); } to { transform: translateX(100%); } }
                @keyframes slideInRight  { from { transform: translateX(100%); } to { transform: translateX(0); } }
                @keyframes slideInLeft   { from { transform: translateX(-100%); } to { transform: translateX(0); } }
            `}</style>
            <div style={ms.wrap}>
                {prevIndex !== null && photos[prevIndex]?.link && (
                    <img
                        key={`prev-${animKey}`}
                        src={photos[prevIndex].link}
                        style={{
                            ...ms.photo,
                            position: "absolute",
                            inset: 0,
                            animation: `${direction === "right" ? "slideOutLeft" : "slideOutRight"} 0.35s ease forwards`,
                        }}
                        alt=""
                    />
                )}
                {photos[index]?.link
                    ? <img
                        key={`curr-${animKey}`}
                        src={photos[index].link}
                        style={{
                            ...ms.photo,
                            position: "absolute",
                            inset: 0,
                            animation: prevIndex !== null
                                ? `${direction === "right" ? "slideInRight" : "slideInLeft"} 0.35s ease forwards`
                                : undefined,
                        }}
                        alt=""
                        onAnimationEnd={() => setPrevIndex(null)}
                    />
                    : <div style={ms.empty} />
                }
                {photos.length > 1 && (
                    <div style={ms.arrows}>
                        <button style={ms.arrowBtn} onClick={() => goTo(Math.max(0, index - 1))} disabled={index === 0}>
                            <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none"><path d="M20 12H4M4 12L10 18M4 12L10 6" stroke="#E9FD97" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </button>
                        <button style={ms.arrowBtn} onClick={() => goTo(Math.min(photos.length - 1, index + 1))} disabled={index === photos.length - 1}>
                            <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none"><path d="M4 12H20M20 12L14 6M20 12L14 18" stroke="#E9FD97" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </button>
                    </div>
                )}
            </div>
            {photos.length > 1 && (
                <div style={ms.dots}>
                    {photos.map((_, i) => (
                        <svg key={i} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ cursor: "pointer" }} onClick={() => goTo(i)}>
                            <circle cx="8" cy="8" r="8" fill={i === index ? "#E9FD97" : "#B2B2B2"} />
                        </svg>
                    ))}
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
        overflow: "hidden",
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
    dots: {
        position: "absolute",
        top: 16,
        left: 32,
        display: "flex",
        gap: 16,
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
        width: 40,
        height: 40,
        padding: 8,
        borderRadius: 8,
        background: "rgba(233,253,151,0.18)",
        border: "none",
        cursor: "pointer",
        color: "#E9FD97",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxSizing: "border-box" as const,
    },
};

// ─── Card ─────��─────────────��─────────────────────────────────────────────────

interface CardProps {
    school?: School;
    onOpen?: (school: School) => void;
}

const ROLE_LABEL: Record<string, string> = {
    OWNER: "Owner",
    INSTRUCTOR: "Instructor",
    STUDENT: "Student",
};

const SchoolCard: React.FC<CardProps> = ({ school, onOpen }) => {
    const photo = school?.media[0]?.link;

    return (
        <div
            style={{
                ...s.card,
                background: photo
                    ? `linear-gradient(180deg, #1F201E 0%, rgba(31, 32, 30, 0.00) 32.21%, rgba(31, 32, 30, 0.50) 56.74%, #1F201E 100%), url(${photo}) lightgray 50% / cover no-repeat`
                    : s.card.background,
                cursor: school ? "pointer" : "default",
            }}
            onClick={() => school && onOpen?.(school)}
        >
            {school && (
                <>
                    <div style={s.cardTop} />
                    <div style={s.cardBottom}>
                        <div style={s.cardInfo}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                <span style={s.cardName}>{school.name}</span>
                                {school.address && (
                                    <>
                                        <div style={s.cardDivider} />
                                        <span style={s.cardAddress}>{school.address}</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

// ─── Animated Number ──────────────────────────────────────────────────────────

const AnimatedNumber: React.FC<{ value: number }> = ({ value }) => (
    <span style={{ display: "inline-block", overflow: "hidden", verticalAlign: "bottom" }}>
        <span
            key={value}
            style={{ display: "inline-block", animation: "numIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
        >
            {value}
        </span>
    </span>
);

// ─── Page ──────────────────────────────────────────────────────────────────────

const Schools: React.FC = () => {
    const navigate = useNavigate();
    const { setTitle } = useOutletContext<{ setTitle: (t: string) => void }>();
    const [page, setPage] = useState(0);
    const [search, setSearch] = useState("");
    const [query, setQuery] = useState("");
    const [schools, setSchools] = useState<School[]>([]);
    const [totalPages, setTotalPages] = useState(1);
    const [mySchools, setMySchools] = useState<School[]>([]);
    const [myOffset, setMyOffset] = useState(0);
    const [selected, setSelected] = useState<School | null>(null);
    const [detail, setDetail] = useState<SchoolDetail | null>(null);
    const [schoolCockpits, setSchoolCockpits] = useState<SchoolCockpit[]>([]);
    const [joining, setJoining] = useState(false);

    useEffect(() => {
        setTitle("Schools");
    }, []);

    useEffect(() => {
        api.get<SchoolsResponse>(`/schools?page=1&limit=200`)
            .then(r => {console.log("ALL SCHOOLS:\n", r.data); setMySchools(r.data.items.filter(s => s.currentUserRole !== null))})
            .catch(() => {});
    }, []);

    useEffect(() => {
        if (!selected) { setDetail(null); setSchoolCockpits([]); return; }
        api.get<SchoolDetail>(`/schools/${selected.id}`)
            .then(r => setDetail(r.data))
            .catch(() => setDetail(null));
        api.get<{ items: SchoolCockpit[] }>(`/cockpits?schoolId=${selected.id}&limit=50`)
            .then(r => setSchoolCockpits(r.data.items))
            .catch(() => setSchoolCockpits([]));
    }, [selected]);

    useEffect(() => {
        const doFetch = async () => {
            try {
                const params = new URLSearchParams({
                    page: String(page + 1),
                    limit: String(PAGE_SIZE),
                    ...(query ? { name: query } : {}),
                });
                const r = await api.get<SchoolsResponse>(`/schools?${params}`);
                setSchools(r.data.items);
                setTotalPages(r.data.totalPages);
            } catch {
                setSchools([]);
            }
        };
        doFetch();
    }, [page, query]);

    const handleJoin = async () => {
        if (!detail) return;
        setJoining(true);
        try {
            await api.post(`/schools/${detail.id}/join`);
            setDetail(d => d ? { ...d, currentUserRole: "STUDENT", _count: { ...d._count, members: d._count.members + 1 } } : d);
        } catch { /* ignore */ }
        setJoining(false);
    };

    const handleLeave = async () => {
        if (!detail) return;
        setJoining(true);
        try {
            await api.delete(`/schools/${detail.id}/leave`);
            setDetail(d => d ? { ...d, currentUserRole: null, _count: { ...d._count, members: d._count.members - 1 } } : d);
        } catch { /* ignore */ }
        setJoining(false);
    };

    const slots: Array<School | null> = [...schools];
    if (page === 0) {
        while (slots.length < PAGE_SIZE) slots.push(null);
    }

    const myVisible: Array<School | null> = mySchools.slice(myOffset, myOffset + COLS);
    while (myVisible.length < COLS) myVisible.push(null);

    return (
        <div style={s.container}>
            <div style={{ ...s.section, marginBottom: 40 }}>
                <div style={s.sectionBar}>
                    <h2 style={s.sectionTitle}>My schools</h2>
                    <div style={{ display: "flex", gap: 8 }}>
                        <button style={s.pageBtn} onClick={() => setMyOffset(o => Math.max(0, o - COLS))} disabled={myOffset === 0}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                        <button style={s.pageBtn} onClick={() => setMyOffset(o => Math.min(mySchools.length - COLS, o + COLS))} disabled={myOffset + COLS >= mySchools.length}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                    </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: `repeat(${COLS}, 1fr)`, gap: 32 }}>
                    {myVisible.map((school, i) => (
                        <SchoolCard key={school?.id ?? `my-dummy-${i}`} school={school ?? undefined} onOpen={setSelected} />
                    ))}
                </div>
            </div>
            <div style={s.section}>
                <div style={s.sectionBar}>
                    <h2 style={s.sectionTitle}>Schools</h2>
                    <div style={s.searchWrap}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={s.searchIcon}>
                            <path d="M21 21L16.65 16.65M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z" stroke="#E9FD97" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <input
                            style={s.searchInput}
                            placeholder="Search for school"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") { setQuery(search); setPage(0); } }}
                        />
                    </div>
                </div>
                <div style={s.sectionGrid}>
                    {slots.map((school, i) => (
                        <SchoolCard key={school?.id ?? `dummy-${i}`} school={school ?? undefined} onOpen={setSelected} />
                    ))}
                </div>
                <div style={s.pagination}>
                    <button style={s.pageBtn} onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                    <span style={s.pageInfo}>{page + 1} / {totalPages}</span>
                    <button style={s.pageBtn} onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                </div>
            </div>

            {selected && createPortal(
                <>
                    <style>{`
                        @keyframes backdropIn { from { opacity: 0; } to { opacity: 1; } }
                        @keyframes modalIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
                    `}</style>
                    <div style={{ ...s.backdrop, animation: "backdropIn 0.2s ease" }} onClick={() => setSelected(null)}>
                        <div style={{ ...s.modal, animation: "modalIn 0.2s ease" }} onClick={e => e.stopPropagation()}>
                            <div style={s.modalHeader}>
                                <span style={s.modalTitle}>{detail?.name ?? selected.name}</span>
                                <button style={s.closeBtn} onClick={() => setSelected(null)}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                        <path d="M18 6L6 18M6 6L18 18" stroke="#E9FD97" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </button>
                            </div>

                            <div style={s.modalScroll}>
                            <div style={s.modalBody}>
                                <div style={s.modalPhotos}>
                                    <ModalPhotoSection media={detail?.media ?? []} />
                                </div>
                                <div style={s.modalInfo}>

                                    {/* Description */}
                                    {detail?.description && (
                                        <div style={s.modalSection}>
                                            <span style={s.modalSectionTitle}>Description</span>
                                            <span style={s.modalSectionText}>{detail.description}</span>
                                        </div>
                                    )}

                                    {/* Stats */}
                                    <style>{`@keyframes numIn { from { transform: translateY(14px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
                                    <div style={s.statsRow}>
                                        <div
                                            style={{ ...s.statItem, cursor: detail?.currentUserRole !== "OWNER" ? "pointer" : "default" }}
                                            onClick={detail?.currentUserRole === null ? handleJoin : detail?.currentUserRole !== "OWNER" ? handleLeave : undefined}
                                        >
                                            <span style={s.statValue}><AnimatedNumber value={detail?._count.members ?? selected._count.members} /></span>
                                            <span style={{
                                                ...s.statLabel,
                                                color: !detail ? "rgba(255,255,255,0.5)" : detail.currentUserRole === null ? "#E9FD97" : detail.currentUserRole === "OWNER" ? "rgba(255,255,255,0.5)" : "#C00F0C",
                                            }}>
                                                {!detail || detail.currentUserRole === "OWNER" ? "members" : detail.currentUserRole === null ? "join" : "leave"}
                                            </span>
                                        </div>
                                        <div style={s.statDivider} />
                                        <div
                                            style={{
                                                ...s.statItem,
                                                cursor: detail?.currentUserRole === "OWNER" || detail?.currentUserRole === "INSTRUCTOR" ? "pointer" : "default",
                                            }}
                                            onClick={detail?.currentUserRole === "OWNER" || detail?.currentUserRole === "INSTRUCTOR" ? () => navigate(`/cockpits/create?schoolId=${detail.id}&schoolName=${encodeURIComponent(detail.name)}`) : undefined}
                                        >
                                            <span style={s.statValue}><AnimatedNumber value={detail?._count.cockpits ?? selected._count.cockpits} /></span>
                                            <span style={{
                                                ...s.statLabel,
                                                color: detail?.currentUserRole === "OWNER" || detail?.currentUserRole === "INSTRUCTOR" ? "#E9FD97" : "rgba(255,255,255,0.5)",
                                            }}>
                                                {detail?.currentUserRole === "OWNER" || detail?.currentUserRole === "INSTRUCTOR" ? "add cockpit" : "cockpits"}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Contacts */}
                                    {(detail?.address || detail?.phone || detail?.email || detail?.website || detail?.instagram) && (
                                        <div style={s.modalSection}>
                                            <span style={s.modalSectionTitle}>Contact info</span>
                                            <div style={s.contactList}>
                                                {detail?.phone && (
                                                    <div style={s.contactRow}>
                                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={s.contactIcon}>
                                                            <path d="M22 16.92V19.92C22.0011 20.4835 21.7564 21.0154 21.3354 21.3905C20.9144 21.7656 20.3538 21.9499 19.79 21.9C16.7427 21.5856 13.8186 20.5341 11.26 18.84C8.87784 17.2903 6.87136 15.2838 5.32 12.9C3.61997 10.3303 2.56822 7.39107 2.26 4.32C2.21049 3.75751 2.39374 3.19881 2.76697 2.77815C3.14019 2.3575 3.66943 2.11299 4.23 2.11H7.23C8.26045 2.09956 9.14007 2.81555 9.31 3.83C9.45834 4.80146 9.70814 5.7547 10.06 6.67C10.3296 7.34848 10.1453 8.12042 9.6 8.61L8.29 9.92C9.7383 12.3784 11.7716 14.4117 14.23 15.86L15.54 14.55C16.0296 14.0047 16.8015 13.8204 17.48 14.09C18.3953 14.4419 19.3485 14.6917 20.32 14.84C21.3506 15.0117 22.0699 15.9068 22 16.92Z" stroke="#E9FD97" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                        </svg>
                                                        <span style={s.contactText}>{detail.phone}</span>
                                                    </div>
                                                )}
                                                {detail?.email && (
                                                    <div style={s.contactRow}>
                                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={s.contactIcon}>
                                                            <path d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z" stroke="#E9FD97" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                            <path d="M22 6L12 13L2 6" stroke="#E9FD97" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                        </svg>
                                                        <span style={s.contactText}>{detail.email}</span>
                                                    </div>
                                                )}
                                                {detail?.website && (
                                                    <div style={s.contactRow}>
                                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={s.contactIcon}>
                                                            <circle cx="12" cy="12" r="10" stroke="#E9FD97" strokeWidth="2" />
                                                            <path d="M2 12H22M12 2C9.33333 5.33333 8 8.66667 8 12C8 15.3333 9.33333 18.6667 12 22C14.6667 18.6667 16 15.3333 16 12C16 8.66667 14.6667 5.33333 12 2Z" stroke="#E9FD97" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                        </svg>
                                                        <a href={detail.website} target="_blank" rel="noopener noreferrer" style={s.contactText}>{detail.website}</a>
                                                    </div>
                                                )}
                                                {detail?.address && (
                                                    <div style={s.contactRow}>
                                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={s.contactIcon}>
                                                            <path d="M12 13C13.6569 13 15 11.6569 15 10C15 8.34315 13.6569 7 12 7C10.3431 7 9 8.34315 9 10C9 11.6569 10.3431 13 12 13Z" stroke="#E9FD97" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                            <path d="M12 2C8.13401 2 5 5.13401 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13401 15.866 2 12 2Z" stroke="#E9FD97" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                        </svg>
                                                        <span style={s.contactText}>{detail.address}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Members */}
                                    {detail && detail.members.filter(m => m.role === "OWNER" || m.role === "INSTRUCTOR").length > 0 && (
                                        <div style={s.modalSection}>
                                            <span style={s.modalSectionTitle}>Team</span>
                                            <div style={s.memberList}>
                                                {detail.members.filter(m => m.role === "OWNER" || m.role === "INSTRUCTOR").map(m => (
                                                    <div key={m.id} style={s.memberRow}>
                                                        <div style={s.memberAvatar}>
                                                            {m.user.avatar
                                                                ? <img src={m.user.avatar} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} alt="" />
                                                                : (
                                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                                                        <path d="M20 21C20 19.6044 20 18.9067 19.8278 18.3389C19.44 17.0605 18.4395 16.06 17.1611 15.6722C16.5933 15.5 15.8956 15.5 14.5 15.5H9.5C8.10444 15.5 7.40665 15.5 6.83886 15.6722C5.56045 16.06 4.56004 17.0605 4.17224 18.3389C4 18.9067 4 19.6044 4 21M16.5 7.5C16.5 9.98528 14.4853 12 12 12C9.51472 12 7.5 9.98528 7.5 7.5C7.5 5.01472 9.51472 3 12 3C14.4853 3 16.5 5.01472 16.5 7.5Z" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                                    </svg>
                                                                )
                                                            }
                                                        </div>
                                                        <div style={s.memberInfo}>
                                                            <span style={s.memberName}>
                                                                {[m.user.name, m.user.surname].filter(Boolean).join(" ") || m.user.email}
                                                            </span>
                                                            <span style={s.memberEmail}>{m.user.email}</span>
                                                        </div>
                                                        <span style={{
                                                            ...s.memberRole,
                                                            color: m.role === "OWNER" ? "#E9FD97" : m.role === "INSTRUCTOR" ? "rgba(233,253,151,0.6)" : "rgba(255,255,255,0.4)",
                                                        }}>
                                                            {ROLE_LABEL[m.role]}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Join / Leave */}
                                    {detail && (
                                        detail.currentUserRole === null
                                            ? (
                                                <button style={s.joinBtn} onClick={handleJoin} disabled={joining}>
                                                    {joining ? "Joining..." : "Join school"}
                                                </button>
                                            )
                                            : detail.currentUserRole !== "OWNER" && (
                                                <button style={s.leaveBtn} onClick={handleLeave} disabled={joining}>
                                                    {joining ? "Leaving..." : "Leave school"}
                                                </button>
                                            )
                                    )}
                                </div>
                            </div>

                            {/* Cockpits grid */}
                            {schoolCockpits.length > 0 && (
                                <div style={s.modalCockpits}>
                                    <span style={s.modalSectionTitle}>School Cockpits</span>
                                    <div style={s.cockpitsGrid}>
                                        {schoolCockpits.map(c => {
                                            const photo = c.media.find(m => m.type === "PREVIEW")?.link ?? c.media.find(m => m.type === "preview")?.link ?? c.media[0]?.link;
                                            const tags = [c.hasVfr && "VFR", c.hasIfr && "IFR", c.hasNight && "Night", c.hasAutopilot && "AP"].filter(Boolean) as string[];
                                            return (
                                                <div key={c.id} style={{
                                                    ...s.cockpitCard,
                                                    background: photo
                                                        ? `linear-gradient(180deg, #1F201E 0%, rgba(31,32,30,0) 32%, rgba(31,32,30,0.5) 57%, #1F201E 100%), url(${photo}) center / cover no-repeat`
                                                        : s.cockpitCard.background,
                                                }}>
                                                    <div style={s.cockpitCardBottom}>
                                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                            <span style={s.cockpitCardName}>{c.name}</span>
                                                            {c.manufacturer && <>
                                                                <div style={s.cockpitCardDivider} />
                                                                <span style={s.cockpitCardMfr}>{c.manufacturer}</span>
                                                            </>}
                                                        </div>
                                                        {tags.length > 0 && (
                                                            <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
                                                                {tags.map(t => <span key={t} style={s.cockpitTag}>{t}</span>)}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                            </div>{/* modalScroll */}
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
    section: {},
    sectionBar: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 32,
        fontWeight: 400,
        color: "rgba(255, 255, 255, 0.7)",
        margin: 0,
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
        height: 256,
        overflow: "hidden",
        padding: 16,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
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
    cardName: {
        color: "#fff",
        fontSize: 20,
        fontWeight: 400,
    },
    cardDivider: {
        width: 1,
        height: 25,
        background: "rgba(255,255,255,0.7)",
    },
    cardAddress: {
        color: "rgba(255,255,255,0.7)",
        fontWeight: 400,
        fontSize: 20,
    },
    cardTags: {
        display: "flex",
        gap: 8,
    },
    cardTag: {
        display: "flex",
        alignItems: "center",
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
    pagination: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        marginTop: 20,
    },
    pageBtn: {
        background: "rgba(233, 253, 151, 0.18)",
        border: "none",
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
        height: "85vh",
        border: "1px solid transparent",
        background: "linear-gradient(rgb(18,18,17), rgb(18,18,17)) padding-box, linear-gradient(to bottom, #393A36, #1F201E) border-box",
        borderRadius: 16,
        cursor: "default",
        padding: 32,
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box" as const,
    },
    modalHeader: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky" as const,
        top: 0,
        zIndex: 1,
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
    modalScroll: {
        flex: 1,
        overflowY: "auto" as const,
        maskImage: "linear-gradient(to bottom, transparent 0%, black 4%, black 92%, transparent 100%)",
        WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 4%, black 92%, transparent 100%)",
        paddingBottom: 32,
    },
    modalBody: {
        display: "flex",
        flexShrink: 0,
        height: "calc(85vh - 130px)",
        gap: 32,
        marginTop: 24,
    },
    modalPhotos: {
        flex: "0 0 45%",
        minHeight: 0,
    },
    modalInfo: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        gap: 20,
        overflowY: "auto",
        minHeight: 0,
    },
    modalCockpits: {
        marginTop: 40,
        display: "flex",
        flexDirection: "column",
        gap: 20,
        flexShrink: 0,
    },
    cockpitsGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 16,
    },
    cockpitCard: {
        borderRadius: 16,
        height: 200,
        background: "rgba(255,255,255,0.05)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        padding: "16px",
        boxSizing: "border-box" as const,
        cursor: "pointer",
    },
    cockpitCardBottom: {
        display: "flex",
        flexDirection: "column",
    },
    cockpitCardName: {
        color: "#fff",
        fontSize: 16,
        fontWeight: 400,
    },
    cockpitCardMfr: {
        color: "rgba(255,255,255,0.7)",
        fontSize: 16,
        fontWeight: 400,
    },
    cockpitCardDivider: {
        width: 1,
        height: 16,
        background: "rgba(255,255,255,0.7)",
        flexShrink: 0,
    },
    cockpitTag: {
        borderRadius: 4,
        background: "rgba(70, 71, 67, 0.8)",
        backdropFilter: "blur(2px)",
        padding: "2px 4px",
        color: "rgb(255,255,255)",
        fontSize: 12,
        fontWeight: 600,
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
    contactList: {
        display: "flex",
        flexDirection: "column",
        gap: 16,
    },
    contactRow: {
        display: "flex",
        alignItems: "center",
        gap: 8,
    },
    contactIcon: {
        flexShrink: 0,
    },
    contactText: {
        color: "rgba(255,255,255,0.7)",
        fontSize: 16,
        fontWeight: 400,
        letterSpacing: 0.4,
    },
    statsRow: {
        display: "flex",
        alignItems: "center",
        borderRadius: 12,
        background: "linear-gradient(rgb(18,18,17), rgb(18,18,17)) padding-box, linear-gradient(to bottom, #393A36, #1F201E) border-box",
        border: "1px solid transparent",
        padding: "14px 0",
    },
    statItem: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        gap: 2,
        alignItems: "center",
    },
    statValue: {
        color: "#E9FD97",
        fontSize: 24,
        fontWeight: 400,
    },
    statLabel: {
        color: "rgba(255,255,255,0.5)",
        fontSize: 13,
    },
    statDivider: {
        width: 1,
        height: 52,
        background: "rgba(255,255,255,0.15)",
    },
    memberList: {
        display: "flex",
        flexDirection: "column",
        gap: 8,
    },
    memberRow: {
        display: "flex",
        alignItems: "center",
        gap: 12,
        borderRadius: 12,
        border: "1px solid #393A36",
        padding: "10px 14px",
    },
    memberAvatar: {
        width: 36,
        height: 36,
        borderRadius: "50%",
        background: "rgba(255,255,255,0.08)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        overflow: "hidden",
    },
    memberInfo: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        gap: 2,
        minWidth: 0,
    },
    memberName: {
        color: "#fff",
        fontSize: 15,
        fontWeight: 400,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap" as const,
    },
    memberEmail: {
        color: "rgba(255,255,255,0.4)",
        fontSize: 13,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap" as const,
    },
    memberRole: {
        fontSize: 13,
        fontWeight: 500,
        flexShrink: 0,
    },
    joinBtn: {
        borderRadius: 10,
        background: "#E9FD97",
        border: "none",
        color: "#313C01",
        fontSize: 16,
        fontWeight: 600,
        padding: "12px 24px",
        cursor: "pointer",
        alignSelf: "flex-start",
    },
    leaveBtn: {
        borderRadius: 10,
        background: "rgba(255,255,255,0.08)",
        border: "1px solid #393A36",
        color: "rgba(255,255,255,0.6)",
        fontSize: 16,
        fontWeight: 400,
        padding: "12px 24px",
        cursor: "pointer",
        alignSelf: "flex-start",
    },
};

export default Schools;