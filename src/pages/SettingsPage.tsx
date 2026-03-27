import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useOutletContext } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase/firebase";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CurrentUser {
    id: string;
    name: string | null;
    surname: string | null;
    role: string;
    avatar: string | null;
}

// ─── SchoolsPage ──────────────────────────────────────────────────────────────

const SettingsPage: React.FC = () => {
    const navigate = useNavigate();
    const { currentUser } = useOutletContext<{ currentUser: CurrentUser | null }>();
    const [photoIndex, setPhotoIndex] = useState(0);

    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(false);


    // ─── Auth ─────────────────────────────────────────────────────────────────

    const handleLogout = async () => {
        await signOut(auth);
        window.location.href = "/auth";
    };

    // ─── Data fetching ────────────────────────────────────────────────────────

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
                    <h1 style={s.pageTitle}>Settings</h1>

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

                {/* Settings */}
                <div style={s.content}>
                    <div style={s.content}>
                        <button
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                padding: "10px 20px",
                                borderRadius: 10,
                                border: "1px solid rgba(255,100,100,0.2)",
                                backgroundColor: "rgba(255,100,100,0.08)",
                                color: "rgba(255,120,120,0.9)",
                                fontSize: 14,
                                fontWeight: 500,
                                cursor: "pointer",
                                fontFamily: "inherit",
                            }}
                            onClick={handleLogout}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
                            </svg>
                            Sign out
                        </button>
                    </div>
                </div>

            </main>
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
        // borderBottom: "1px solid #787971",
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
        justifyContent: "space-between",  // ← input слева, лупа справа
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
        alignSelf: "stretch",   // ← вместо width: "100%"
        height: "100%",
        padding: "0px 32px",
    },
    section: {
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 12,
        alignSelf: "stretch",
        width: "100%"
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
    allSchoolsHeader: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        position: "relative",
    },
    grid: {
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

export default SettingsPage;