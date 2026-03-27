import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useOutletContext } from "react-router-dom";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SchoolMedia {
    id: string;
    link: string;
    type: "PHOTO" | "TEXT";
    order: number | null;
}

type SchoolMemberRole = "OWNER" | "INSTRUCTOR" | "STUDENT";

interface SchoolMember {
    id: string;
    role: SchoolMemberRole;
    user: { id: string; name: string | null; surname: string | null; avatar: string | null; email: string };
}

interface SchoolsResponse {
    items: School[];
    total: number;
    page: number;
    totalPages: number;
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
    cockpits?: SchoolCockpit[];
}

interface SchoolCockpit {
    id: string;
    name: string;
    model: string | null;
    registration: string | null;
    hasVfr: boolean;
    hasIfr: boolean;
    hasNight: boolean;
    hasAutopilot: boolean;
    media: { link: string; type: string }[];
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
        <div style={card.wrapper}>
            <div style={{ ...card.imgBg, backgroundImage: photo ? `url(${photo.link})` : undefined }}>
                <div style={card.overlay} />

                <button style={card.cardExpandBtn} onClick={onPreview}>
                    <svg width="25" height="25" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M4 12H20M20 12L14 6M20 12L14 18" stroke="#313C01" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
                <div style={card.stats}>
                    <div style={card.tag}>
                        <span style={card.statItem}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M22 21V19C22 17.1362 20.7252 15.5701 19 15.126M15.5 3.29076C16.9659 3.88415 18 5.32131 18 7C18 8.67869 16.9659 10.1159 15.5 10.7092M17 21C17 19.1362 17 18.2044 16.6955 17.4693C16.2895 16.4892 15.5108 15.7105 14.5307 15.3045C13.7956 15 12.8638 15 11 15H8C6.13623 15 5.20435 15 4.46927 15.3045C3.48915 15.7105 2.71046 16.4892 2.30448 17.4693C2 18.2044 2 19.1362 2 21M13.5 7C13.5 9.20914 11.7091 11 9.5 11C7.29086 11 5.5 9.20914 5.5 7C5.5 4.79086 7.29086 3 9.5 3C11.7091 3 13.5 4.79086 13.5 7Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
                            <div style={{ color: "rgba(255,255,255,1)" }}>{school._count.members}</div>
                        </span>
                    </div>
                    <div style={card.tag}>
                        <span style={card.statItem}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M17.7448 2.81298C18.7095 1.8165 20.3036 1.80361 21.2843 2.78436C22.2382 3.73823 22.2559 5.27921 21.3243 6.25481L18.5456 9.16457C18.3278 9.39265 18.219 9.50668 18.1518 9.64024C18.0924 9.75847 18.0571 9.88732 18.0478 10.0193C18.0374 10.1684 18.0728 10.3221 18.1438 10.6293L19.8717 18.1169C19.9444 18.4323 19.9808 18.59 19.9691 18.7426C19.9587 18.8776 19.921 19.0091 19.8582 19.1291C19.7873 19.2647 19.6729 19.3792 19.444 19.608L19.0732 19.9788C18.4671 20.585 18.164 20.888 17.8538 20.9429C17.583 20.9908 17.3043 20.925 17.0835 20.761C16.8306 20.5733 16.695 20.1666 16.424 19.3534L14.4142 13.3241L11.0689 16.6695C10.8692 16.8691 10.7694 16.969 10.7026 17.0866C10.6434 17.1907 10.6034 17.3047 10.5846 17.423C10.5633 17.5565 10.5789 17.6968 10.61 17.9775L10.7937 19.6309C10.8249 19.9116 10.8405 20.0519 10.8192 20.1854C10.8004 20.3037 10.7604 20.4177 10.7012 20.5219C10.6344 20.6394 10.5346 20.7393 10.3349 20.939L10.1374 21.1365C9.66434 21.6095 9.42781 21.8461 9.16496 21.9146C8.93442 21.9746 8.68999 21.9504 8.47571 21.8463C8.2314 21.7276 8.04585 21.4493 7.67475 20.8926L6.10643 18.5401C6.04013 18.4407 6.00698 18.391 5.96849 18.3459C5.9343 18.3058 5.89701 18.2685 5.85694 18.2343C5.81184 18.1958 5.76212 18.1627 5.66267 18.0964L3.31018 16.5281C2.75354 16.157 2.47521 15.9714 2.35649 15.7271C2.25236 15.5128 2.22816 15.2684 2.28824 15.0378C2.35674 14.775 2.59327 14.5385 3.06633 14.0654L3.26384 13.8679C3.46352 13.6682 3.56337 13.5684 3.68095 13.5016C3.78511 13.4424 3.89906 13.4024 4.01736 13.3836C4.15089 13.3623 4.29123 13.3779 4.5719 13.4091L6.22529 13.5928C6.50596 13.6239 6.6463 13.6395 6.77983 13.6182C6.89813 13.5994 7.01208 13.5594 7.11624 13.5002C7.23382 13.4334 7.33366 13.3336 7.53335 13.1339L10.8787 9.7886L4.84939 7.77884C4.03616 7.50776 3.62955 7.37222 3.44176 7.11932C3.27777 6.89848 3.212 6.61984 3.2599 6.34898C3.31477 6.03879 3.61784 5.73572 4.22399 5.12957L4.59476 4.7588C4.82365 4.52991 4.9381 4.41546 5.07369 4.34457C5.1937 4.28183 5.3252 4.24411 5.46023 4.23371C5.61278 4.22197 5.77049 4.25836 6.0859 4.33115L13.545 6.05249C13.855 6.12401 14.01 6.15978 14.1596 6.14914C14.3041 6.13886 14.4446 6.09733 14.5714 6.02742C14.7028 5.95501 14.8134 5.84074 15.0347 5.6122L17.7448 2.81298Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
                            <div style={{ color: "rgba(255,255,255,1)" }}>{school._count.cockpits}</div>
                        </span>
                    </div>
                </div>

                <div style={card.bottom}>
                    <div style={card.bottomRow}>
                        <span style={card.name}>{school.name}</span>
                    </div>

                    {school.address && (
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 13C13.6569 13 15 11.6569 15 10C15 8.34315 13.6569 7 12 7C10.3431 7 9 8.34315 9 10C9 11.6569 10.3431 13 12 13Z" stroke="#E9FD97" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M12 22C16 18 20 14.4183 20 10C20 5.58172 16.4183 2 12 2C7.58172 2 4 5.58172 4 10C4 14.4183 8 18 12 22Z" stroke="#E9FD97" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <span style={card.address}>{school.address}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

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
    },

    overlay: {
        position: "absolute",
        inset: 0,
        background: "linear-gradient(to bottom, rgba(25,25,25,0.1) 20%, rgba(25, 25, 25, 0.95) 100%)",
        pointerEvents: "none",
    },
    cardExpandBtn: {
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
        // flexShrink: 0,
        zIndex: 2,
        padding: 0,

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
    tag: {
        padding: "8px 16px",
        background: "rgba(70, 71, 67, 0.9)",
        backdropFilter: "blur(2px)",
        borderRadius: 8,
        justifyContent: "center",
        alignItems: "center",
    },
    stats: {
        display: "flex",
        gap: 20,
        alignItems: "center",
    },
    statItem: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        color: "#E9FD97",
        fontSize: 20,
        fontWeight: 600,
        lineHeight: "100%",
    },
    address: {
        color: "rgba(255,255,255,0.7)",
        fontSize: 16,
    }
};

// ─── SchoolsPage ──────────────────────────────────────────────────────────────

const SchoolsPage: React.FC = () => {
    const navigate = useNavigate();
    const { currentUser } = useOutletContext<{ currentUser: CurrentUser | null }>();
    const [photoIndex, setPhotoIndex] = useState(0);

    const [schools, setSchools] = useState<School[]>([]);
    const [mySchools, setMySchools] = useState<School[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const [previewSchool, setPreviewSchool] = useState<SchoolDetail | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [modalMounted, setModalMounted] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);

    // ─── Auth ─────────────────────────────────────────────────────────────────

    useEffect(() => {
        fetchMySchools();
        fetchSchools();
    }, []);

    // ─── Data fetching ────────────────────────────────────────────────────────

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
        setPhotoIndex(0);
        try {
            const { data } = await api.get<SchoolDetail>(`/school/${schoolId}`);
            setPreviewSchool(data);
        } catch { } finally {
            setPreviewLoading(false);
        }
    };

    const closePreview = () => {
        setModalVisible(false);
        setTimeout(() => {
            setModalMounted(false);
            setPreviewSchool(null);
        }, 300); // ждём пока анимация исчезновения отыграет
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
                ::-webkit-scrollbar { width: 6px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { 
                    background: rgba(233, 253, 151, 0.2); 
                    border-radius: 3px; 
                }
                ::-webkit-scrollbar-thumb:hover { 
                    background: rgba(233, 253, 151, 0.4); 
                }
            `}</style>

            {/* Main */}
            <main style={s.main}>
                {/* TopBar */}
                <header style={s.topBar}>
                    <h1 style={s.pageTitle}>Schools</h1>

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

                {/* Schools */}
                <div style={s.content}>
                    {error && <div style={{ color: "#ff6b6b", fontSize: 13, marginBottom: 16 }}>{error}</div>}

                    {/* My schools
                    {mySchools.length > 0 && (
                        <section style={{ ...s.section, alignSelf: "stretch" }}>
                            <h2 style={s.sectionTitle}>My schools</h2>
                            <div style={s.grid}>
                                {mySchools.map(school => (
                                    <SchoolCard key={school.id} school={school} onPreview={() => openPreview(school.id)} />
                                ))}
                            </div>
                        </section>
                    )} */}


                    {/* All schools */}
                    <section style={{ ...s.section, alignSelf: "stretch" }}>
                        <div style={s.allSchoolsHeader}>
                            <h2 style={s.sectionTitle}>All schools</h2>

                            <label style={s.searchWrap}>
                                <input
                                    style={s.searchInput}
                                    placeholder="Search for schools..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    onKeyDown={e => e.key === "Enter" && fetchSchools(1)}
                                />
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M21 21L16.65 16.65M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z" stroke="#E9FD97" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
                                </svg>
                            </label>
                        </div>
                        {loading ? (
                            <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 14, padding: "40px 0", textAlign: "center" }}>Loading...</div>
                        ) : schools.length === 0 ? (
                            <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 14, padding: "40px 0", textAlign: "center" }}>No schools found</div>
                        ) : (
                            <div style={s.grid}>
                                {schools.map(school => (
                                    <SchoolCard key={school.id} school={school} onPreview={() => openPreview(school.id)} />
                                ))}
                            </div>
                        )}
                    </section>
                </div>

                {/* Floating create button */}
                <button style={s.createBtn} onClick={() => navigate("/schools/create")}>
                    <svg style={{ transform: "scale(2)" }} width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 5V19M5 12H19" stroke="#313C01" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
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
                            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>Loading...</div>
                        ) : previewSchool && (
                            <div>
                                {previewLoading ? (
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "rgba(255,255,255,0.4)", fontSize: 14 }}>
                                        Loading...
                                    </div>
                                ) : previewSchool && (
                                    <>
                                        {/* Close button */}
                                        <button style={s.modalClose} onClick={closePreview}>
                                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                <path d="M12 4L4 12M4 4l8 8" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
                                            </svg>
                                        </button>

                                        {/* Scrollable content */}
                                        <div style={s.modalScroll}>

                                            {/* Title row */}
                                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                                                <h2 style={s.modalTitle}>{previewSchool.name}</h2>
                                                {previewSchool.currentUserRole === "OWNER" && (
                                                    <button style={s.editBtn} onClick={() => { closePreview(); navigate(`/schools/${previewSchool.id}/edit`); }}>
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                                        Edit
                                                    </button>
                                                )}
                                            </div>

                                            {/* Top section: photo + info */}
                                            <div style={s.modalTop}>

                                                {/* Photo slider */}
                                                {(() => {
                                                    const photos = previewSchool.media.filter(m => m.type === "PHOTO");
                                                    return (
                                                        <div style={s.sliderWrap}>
                                                            {/* Dots */}
                                                            {photos.length > 1 && (
                                                                <div style={s.sliderDots}>
                                                                    {photos.map((_, i) => (
                                                                        <div
                                                                            key={i}
                                                                            style={{ ...s.dot, ...(i === photoIndex ? s.dotActive : {}) }}
                                                                            onClick={() => setPhotoIndex(i)}
                                                                        />
                                                                    ))}
                                                                </div>
                                                            )}

                                                            {/* Image */}
                                                            <div style={s.sliderImg}>
                                                                {photos.length > 0 ? (
                                                                    <img src={photos[photoIndex]?.link} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 12 }} />
                                                                ) : (
                                                                    <div style={{ width: "100%", height: "100%", backgroundColor: "#2a2a2a", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                                        <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 13 }}>No photos</span>
                                                                    </div>
                                                                )}

                                                                {/* Prev / Next */}
                                                                {photos.length > 1 && (
                                                                    <>
                                                                        <button style={{ ...s.sliderBtn, left: 12 }} onClick={() => setPhotoIndex(i => (i - 1 + photos.length) % photos.length)}>
                                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E9FD97" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" /></svg>
                                                                        </button>
                                                                        <button style={{ ...s.sliderBtn, right: 12 }} onClick={() => setPhotoIndex(i => (i + 1) % photos.length)}>
                                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E9FD97" strokeWidth="2.5"><path d="M9 18l6-6-6-6" /></svg>
                                                                        </button>
                                                                    </>
                                                                )}
                                                            </div>

                                                            {/* Add pictures — owner/instructor only */}
                                                            {(previewSchool.currentUserRole === "OWNER" || previewSchool.currentUserRole === "INSTRUCTOR") && (
                                                                <button style={s.addPicsBtn}>
                                                                    Add pictures +
                                                                </button>
                                                            )}
                                                        </div>
                                                    );
                                                })()}

                                                {/* Info */}
                                                <div style={s.modalInfo}>
                                                    {previewSchool.description && (
                                                        <div>
                                                            <h3 style={s.modalSectionTitle}>Description</h3>
                                                            <p style={s.modalDescription}>{previewSchool.description}</p>
                                                        </div>
                                                    )}

                                                    <div>
                                                        <h3 style={s.modalSectionTitle}>Contact info</h3>
                                                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                                            {previewSchool.phone && (
                                                                <div style={s.contactRow}>
                                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8.38028 8.85335C9.07627 10.303 10.0251 11.6616 11.2266 12.8632C12.4282 14.0648 13.7869 15.0136 15.2365 15.7096C15.3612 15.7694 15.4235 15.7994 15.5024 15.8224C15.7828 15.9041 16.127 15.8454 16.3644 15.6754C16.4313 15.6275 16.4884 15.5704 16.6027 15.4561C16.9523 15.1064 17.1271 14.9316 17.3029 14.8174C17.9658 14.3864 18.8204 14.3864 19.4833 14.8174C19.6591 14.9316 19.8339 15.1064 20.1835 15.4561L20.3783 15.6509C20.9098 16.1824 21.1755 16.4481 21.3198 16.7335C21.6069 17.301 21.6069 17.9713 21.3198 18.5389C21.1755 18.8242 20.9098 19.09 20.3783 19.6214L20.2207 19.779C19.6911 20.3087 19.4263 20.5735 19.0662 20.7757C18.6667 21.0001 18.0462 21.1615 17.588 21.1601C17.1751 21.1589 16.8928 21.0788 16.3284 20.9186C13.295 20.0576 10.4326 18.4332 8.04466 16.0452C5.65668 13.6572 4.03221 10.7948 3.17124 7.76144C3.01103 7.19699 2.93092 6.91477 2.9297 6.50182C2.92833 6.0436 3.08969 5.42311 3.31411 5.0236C3.51636 4.66357 3.78117 4.39876 4.3108 3.86913L4.46843 3.7115C4.99987 3.18006 5.2656 2.91433 5.55098 2.76999C6.11854 2.48292 6.7888 2.48292 7.35636 2.76999C7.64174 2.91433 7.90747 3.18006 8.43891 3.7115L8.63378 3.90637C8.98338 4.25597 9.15819 4.43078 9.27247 4.60655C9.70347 5.26945 9.70347 6.12403 9.27247 6.78692C9.15819 6.96269 8.98338 7.1375 8.63378 7.4871C8.51947 7.60142 8.46231 7.65857 8.41447 7.72538C8.24446 7.96281 8.18576 8.30707 8.26748 8.58743C8.29048 8.66632 8.32041 8.72866 8.38028 8.85335Z" stroke="#E9FD97" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
                                                                    <span style={s.contactText}>{previewSchool.phone}</span>
                                                                </div>
                                                            )}
                                                            {previewSchool.email && (
                                                                <div style={s.contactRow}>
                                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 7L10.1649 12.7154C10.8261 13.1783 11.1567 13.4097 11.5163 13.4993C11.8339 13.5785 12.1661 13.5785 12.4837 13.4993C12.8433 13.4097 13.1739 13.1783 13.8351 12.7154L22 7M6.8 20H17.2C18.8802 20 19.7202 20 20.362 19.673C20.9265 19.3854 21.3854 18.9265 21.673 18.362C22 17.7202 22 16.8802 22 15.2V8.8C22 7.11984 22 6.27976 21.673 5.63803C21.3854 5.07354 20.9265 4.6146 20.362 4.32698C19.7202 4 18.8802 4 17.2 4H6.8C5.11984 4 4.27976 4 3.63803 4.32698C3.07354 4.6146 2.6146 5.07354 2.32698 5.63803C2 6.27976 2 7.11984 2 8.8V15.2C2 16.8802 2 17.7202 2.32698 18.362C2.6146 18.9265 3.07354 19.3854 3.63803 19.673C4.27976 20 5.11984 20 6.8 20Z" stroke="#E9FD97" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
                                                                    <span style={s.contactText}>{previewSchool.email}</span>
                                                                </div>
                                                            )}
                                                            {previewSchool.address && (
                                                                <div style={s.contactRow}>
                                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 13C13.6569 13 15 11.6569 15 10C15 8.34315 13.6569 7 12 7C10.3431 7 9 8.34315 9 10C9 11.6569 10.3431 13 12 13Z" stroke="#E9FD97" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M12 22C16 18 20 14.4183 20 10C20 5.58172 16.4183 2 12 2C7.58172 2 4 5.58172 4 10C4 14.4183 8 18 12 22Z" stroke="#E9FD97" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                                                    <span style={s.contactText}>{previewSchool.address}</span>
                                                                </div>
                                                            )}
                                                            {previewSchool.website && (
                                                                <div style={s.contactRow}>
                                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12.7076 18.3639L11.2933 19.7781C9.34072 21.7308 6.1749 21.7308 4.22228 19.7781C2.26966 17.8255 2.26966 14.6597 4.22228 12.7071L5.63649 11.2929M18.3644 12.7071L19.7786 11.2929C21.7312 9.34024 21.7312 6.17441 19.7786 4.22179C17.826 2.26917 14.6602 2.26917 12.7076 4.22179L11.2933 5.636M8.50045 15.4999L15.5005 8.49994" stroke="#E9FD97" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
                                                                    <a href={previewSchool.website} target="_blank" rel="noopener noreferrer" style={{ ...s.contactText, color: "#E9FD97", textDecoration: "none" }}>{previewSchool.website}</a>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Cockpits section */}
                                            <div style={{ marginTop: 32 }}>
                                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                                                    <h3 style={{ ...s.modalSectionTitle, fontSize: 28, fontWeight: 700, color: "#fff", margin: 0 }}>Cockpits</h3>
                                                    {(previewSchool.currentUserRole === "OWNER" || previewSchool.currentUserRole === "INSTRUCTOR") && (
                                                        <button style={s.addCockpitBtn} onClick={() => { closePreview(); navigate(`/cockpits/create?schoolId=${previewSchool.id}`); }}>
                                                            + Add cockpit
                                                        </button>
                                                    )}
                                                </div>

                                                {previewSchool.cockpits && previewSchool.cockpits.length > 0 ? (
                                                    <div style={s.cockpitGrid}>
                                                        {previewSchool.cockpits.map(cockpit => {
                                                            const preview = cockpit.media.find(m => m.type === "PREVIEW") || cockpit.media.find(m => m.type === "PANORAMA") || cockpit.media[0];
                                                            return (
                                                                <div key={cockpit.id} style={s.cockpitCard}>
                                                                    <div style={{ ...s.cockpitImg, backgroundImage: preview ? `url(${preview.link})` : undefined }}>
                                                                        <div style={s.cockpitOverlay} />
                                                                        <button style={s.cockpitArrow} onClick={() => { closePreview(); navigate(`/cockpits/${cockpit.id}`); }}>
                                                                            <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M4.167 10h11.666M15.833 10L10 4.167M15.833 10L10 15.833" stroke="#313C01" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                                                        </button>
                                                                        <div style={s.cockpitBottom}>
                                                                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                                                <span style={s.cockpitName}>{cockpit.name}</span>
                                                                                {cockpit.registration && <><span style={{ color: "rgba(255,255,255,0.3)" }}>|</span><span style={s.cockpitReg}>{cockpit.registration}</span></>}
                                                                            </div>
                                                                            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                                                                                {cockpit.hasVfr && <span style={s.cockpitTag}>VFR</span>}
                                                                                {cockpit.hasNight && <span style={s.cockpitTag}>Night</span>}
                                                                                {cockpit.hasAutopilot && <span style={s.cockpitTag}>AP</span>}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 14 }}>No cockpits yet</div>
                                                )}
                                            </div>

                                            {/* Join button */}
                                            {previewSchool.currentUserRole === null && (
                                                <div style={{ display: "flex", justifyContent: "center", marginTop: 32 }}>
                                                    <button style={s.joinBtn} onClick={() => { /* handleJoin */ }}>
                                                        Join the school →
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
    root: {
        display: "flex",       // sidebar и main встают рядом горизонтально
        width: "100vw",        // занимает весь экран по ширине
        height: "100vh",       // занимает весь экран по высоте
        overflow: "hidden",    // убирает глобальный скролл страницы
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
        margin: "0 auto",  // центрирует внутри средней колонки
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
    allSchoolsHeader: {
        display: "grid",
        gridTemplateColumns: "1fr auto 1fr",  // три колонки: левая, центр, правая
        alignItems: "center",
        width: "100%",
    },
    grid: {
        marginTop: "20px",
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 16,
        width: "100%"
    },
    createBtn: {
        position: "absolute",
        bottom: 28,
        right: 28,
        width: 52,
        height: 52,
        borderRadius: 22,
        backgroundColor: " #E9FD97",
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
        width: "66vw",
        height: "66vh",
        backgroundColor: "#1a1a1a",
        borderRadius: 20,
        padding: 28,
        position: "relative",
        overflow: "hidden",
    },
    modalClose: {
        position: "absolute", top: 16, right: 16,
        width: 36, height: 36, borderRadius: "50%",
        backgroundColor: "rgba(255,255,255,0.1)",
        border: "none", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 2, flexShrink: 0,
    },
    modalScroll: {
        height: "100%",
        overflowY: "auto",
        paddingRight: 4,
    },
    modalTitle: {
        fontSize: 28, fontWeight: 700, color: "#fff",
        margin: 0, letterSpacing: "-0.5px",
    },
    modalTop: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 28,
        alignItems: "flex-start",
    },
    sliderWrap: {
        display: "flex", flexDirection: "column", gap: 10, position: "relative",
    },
    sliderDots: {
        display: "flex", gap: 6, alignItems: "center",
    },
    dot: {
        width: 8, height: 8, borderRadius: "50%",
        backgroundColor: "rgba(255,255,255,0.3)", cursor: "pointer", flexShrink: 0,
    },
    dotActive: {
        backgroundColor: "#E9FD97",
    },
    sliderImg: {
        position: "relative", width: "100%", height: 280, borderRadius: 12, overflow: "hidden",
    },
    sliderBtn: {
        position: "absolute", top: "50%", transform: "translateY(-50%)",
        width: 36, height: 36, borderRadius: "50%",
        backgroundColor: "rgba(0,0,0,0.5)",
        border: "none", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1,
    },
    addPicsBtn: {
        alignSelf: "flex-end",
        backgroundColor: "rgba(233,253,151,0.1)",
        border: "1px solid rgba(233,253,151,0.3)",
        borderRadius: 8, color: "#E9FD97",
        fontSize: 13, fontWeight: 500,
        padding: "6px 14px", cursor: "pointer", fontFamily: "inherit",
    },
    editBtn: {
        display: "flex", alignItems: "center", gap: 6,
        backgroundColor: "rgba(255,255,255,0.08)",
        border: "none", borderRadius: 8,
        color: "rgba(255,255,255,0.7)", fontSize: 13,
        padding: "7px 14px", cursor: "pointer", fontFamily: "inherit",
    },
    modalInfo: {
        display: "flex", flexDirection: "column", gap: 24,
    },
    modalSectionTitle: {
        fontSize: 20, fontWeight: 700, color: "#fff",
        margin: "0 0 12px 0",
    },
    modalDescription: {
        fontSize: 14, color: "rgba(255,255,255,0.65)",
        lineHeight: "160%", margin: 0,
    },
    contactRow: {
        display: "flex", alignItems: "center", gap: 10,
    },
    contactText: {
        fontSize: 14, color: "rgba(255,255,255,0.7)",
    },
    cockpitGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 12,
    },
    cockpitCard: {
        borderRadius: 12, overflow: "hidden",
    },
    cockpitImg: {
        position: "relative", height: 160,
        backgroundSize: "cover", backgroundPosition: "center",
        backgroundColor: "#2a2a2a",
    },
    cockpitOverlay: {
        position: "absolute", inset: 0,
        background: "linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.85) 100%)",
        pointerEvents: "none",
    },
    cockpitArrow: {
        position: "absolute", bottom: 10, right: 10,
        width: 32, height: 32, borderRadius: 10,
        backgroundColor: "#E9FD97", border: "none",
        cursor: "pointer", display: "flex",
        alignItems: "center", justifyContent: "center",
        zIndex: 1,
    },
    cockpitBottom: {
        position: "absolute", bottom: 10, left: 12, right: 52, zIndex: 1,
    },
    cockpitName: {
        fontSize: 13, fontWeight: 600, color: "#fff",
    },
    cockpitReg: {
        fontSize: 13, color: "rgba(255,255,255,0.5)",
    },
    cockpitTag: {
        backgroundColor: "rgba(255,255,255,0.12)",
        borderRadius: 6, padding: "2px 7px",
        fontSize: 11, color: "rgba(255,255,255,0.7)",
    },
    joinBtn: {
        backgroundColor: "#E9FD97", border: "none",
        borderRadius: 12, color: "#313C01",
        fontSize: 15, fontWeight: 600,
        padding: "12px 32px", cursor: "pointer", fontFamily: "inherit",
    },
    addCockpitBtn: {
        backgroundColor: "rgba(233,253,151,0.1)",
        border: "1px solid rgba(233,253,151,0.3)",
        borderRadius: 8, color: "#E9FD97",
        fontSize: 13, fontWeight: 500,
        padding: "6px 14px", cursor: "pointer", fontFamily: "inherit",
    },
};

export default SchoolsPage;