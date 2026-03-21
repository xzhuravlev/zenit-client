import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import * as THREE from "three";
import api from "../api/axios";

// ─── Types ────────────────────────────────────────────────────────────────────

type StudyTab = "info" | "instruments" | "checklists";

interface InstrumentMedia {
    id: string;
    link: string;
    type: string;
}

interface Instrument {
    id: string;
    name: string;
    description: string | null;
    xPos: number | null;
    yPos: number | null;
    media: InstrumentMedia[];
}

interface ChecklistItem {
    id: string;
    description: string;
    order: number;
    instrument: Instrument | null;
}

interface Checklist {
    id: string;
    name: string;
    items: ChecklistItem[];
}

interface CockpitMedia {
    id: string;
    link: string;
    type: string;
}

interface CockpitDetail {
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
    media: CockpitMedia[];
    instruments: Instrument[];
    checklists: Checklist[];
    creator: { name: string | null; surname: string | null; avatar: string | null } | null;
}

// ─── Panorama Viewer ──────────────────────────────────────────────────────────

interface PanoramaProps {
    imageUrl: string;
    instruments: Instrument[];
    focusTarget: { pitch: number; yaw: number } | null;
    onHotspotClick: (instrument: Instrument, screenX: number, screenY: number) => void;
    onDismiss: () => void;
    onLoad?: () => void;
}

const PanoramaViewer: React.FC<PanoramaProps> = ({
    imageUrl, instruments, focusTarget, onHotspotClick, onDismiss, onLoad,
}) => {
    const mountRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const spherical = useRef({ phi: Math.PI / 2, theta: 0 });
    const targetSpherical = useRef({ phi: Math.PI / 2, theta: 0 });
    const isDragging = useRef(false);
    const lastMouse = useRef({ x: 0, y: 0 });
    const animFrameRef = useRef<number>(0);
    const hotspotGroupRef = useRef<THREE.Group | null>(null);
    const mouseNDC = useRef({ x: 0, y: 0 });

    useEffect(() => {
        if (!mountRef.current) return;
        const container = mountRef.current;
        const w = container.offsetWidth || 800;
        const h = container.offsetHeight || 600;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
        camera.position.set(0, 0, 0.01);
        cameraRef.current = camera;

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(w, h);
        renderer.setPixelRatio(window.devicePixelRatio);
        Object.assign(renderer.domElement.style, {
            width: "100%", height: "100%", position: "absolute", top: "0", left: "0",
        });
        container.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        const geometry = new THREE.SphereGeometry(500, 60, 40);
        geometry.scale(-1, 1, 1);
        const texture = new THREE.TextureLoader().load(imageUrl, () => {
            onLoad?.();
        });
        scene.add(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ map: texture })));

        const hotspotGroup = new THREE.Group();
        scene.add(hotspotGroup);
        hotspotGroupRef.current = hotspotGroup;

        const animate = () => {
            animFrameRef.current = requestAnimationFrame(animate);

            // Smooth camera interpolation
            spherical.current.phi += (targetSpherical.current.phi - spherical.current.phi) * 0.03;
            spherical.current.theta += (targetSpherical.current.theta - spherical.current.theta) * 0.06;

            const { phi, theta } = spherical.current;
            camera.lookAt(new THREE.Vector3(
                Math.sin(phi) * Math.cos(theta),
                Math.cos(phi),
                Math.sin(phi) * Math.sin(theta)
            ));

            // Hotspot proximity opacity
            if (hotspotGroup.children.length > 0) {
                const raycaster = new THREE.Raycaster();
                raycaster.setFromCamera(new THREE.Vector2(mouseNDC.current.x, mouseNDC.current.y), camera);
                const mouseDir = raycaster.ray.direction.normalize();
                hotspotGroup.children.forEach(child => {
                    const mesh = child as THREE.Mesh;
                    if (!mesh.userData?.isHotspot) return;
                    const dot = mouseDir.dot(mesh.position.clone().normalize());
                    const angleDeg = Math.acos(Math.max(-1, Math.min(1, dot))) * (180 / Math.PI);
                    const t = Math.max(0, Math.min(1, (angleDeg - 3) / 12));
                    (mesh.material as THREE.MeshBasicMaterial).opacity = 0.15 + t * 0.65;
                });
            }

            renderer.render(scene, camera);
        };
        animate();

        const handleResize = () => {
            if (!mountRef.current) return;
            const w = mountRef.current.clientWidth;
            const h = mountRef.current.clientHeight;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        };
        window.addEventListener("resize", handleResize);

        return () => {
            cancelAnimationFrame(animFrameRef.current);
            window.removeEventListener("resize", handleResize);
            renderer.dispose();
            if (mountRef.current?.contains(renderer.domElement)) {
                mountRef.current.removeChild(renderer.domElement);
            }
        };
    }, [imageUrl]);

    // Update hotspots
    useEffect(() => {
        const group = hotspotGroupRef.current;
        if (!group) return;
        while (group.children.length) group.remove(group.children[0]);

        instruments.forEach(inst => {
            if (inst.xPos == null || inst.yPos == null) return;
        
            // Пересчёт xPos/yPos → pitch/yaw
            const pitch = (inst.yPos / 100) * Math.PI;
            const yaw = ((inst.xPos / 100) - 0.5) * 2 * Math.PI;
        
            const mesh = new THREE.Mesh(
                new THREE.SphereGeometry(4, 16, 16),
                new THREE.MeshBasicMaterial({ color: 0xE9FD97, transparent: true, opacity: 0.5 })
            );
            mesh.userData = { isHotspot: true, instrumentId: inst.id };
            const r = 498;
            mesh.position.set(
                r * Math.sin(pitch) * Math.cos(yaw),
                r * Math.cos(pitch),
                r * Math.sin(pitch) * Math.sin(yaw)
            );
            group.add(mesh);
        });
    }, [instruments]);

    // Focus camera on target
    useEffect(() => {
        if (!focusTarget) return;
        targetSpherical.current = { phi: focusTarget.pitch, theta: focusTarget.yaw };
    }, [focusTarget]);

    const handleMouseDown = (e: React.MouseEvent) => {
        isDragging.current = false;
        lastMouse.current = { x: e.clientX, y: e.clientY };
        onDismiss();
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (mountRef.current) {
            const rect = mountRef.current.getBoundingClientRect();
            mouseNDC.current = {
                x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
                y: -((e.clientY - rect.top) / rect.height) * 2 + 1,
            };
        }
        if (e.buttons !== 1) return;
        const dx = e.clientX - lastMouse.current.x;
        const dy = e.clientY - lastMouse.current.y;
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) isDragging.current = true;
        lastMouse.current = { x: e.clientX, y: e.clientY };
        const fov = cameraRef.current?.fov ?? 75;
        const sensitivity = (fov / 75) * 0.0015;
        targetSpherical.current.theta -= dx * sensitivity;
        targetSpherical.current.phi = Math.max(0.1, Math.min(Math.PI - 0.1, targetSpherical.current.phi - dy * sensitivity));

        spherical.current.theta = targetSpherical.current.theta;
        spherical.current.phi = targetSpherical.current.phi;
    };

    const handleClick = (e: React.MouseEvent) => {
        if (isDragging.current || !mountRef.current || !cameraRef.current || !hotspotGroupRef.current) return;
        const rect = mountRef.current.getBoundingClientRect();
        const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(nx, ny), cameraRef.current);
        const hits = raycaster.intersectObjects(hotspotGroupRef.current.children);
        const hit = hits.find(h => h.object.userData?.isHotspot);
        if (hit) {
            const inst = instruments.find(i => i.id === hit.object.userData.instrumentId);
            if (inst) onHotspotClick(inst, e.clientX, e.clientY);
        }
    };

    const handleWheel = (e: React.WheelEvent) => {
        const camera = cameraRef.current;
        if (!camera) return;
        camera.fov = Math.max(20, Math.min(75, camera.fov + e.deltaY * 0.05));
        camera.updateProjectionMatrix();
    };

    return (
        <div
            ref={mountRef}
            style={{ width: "100%", height: "100%", cursor: "grab" }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onClick={handleClick}
            onWheel={handleWheel}
        />
    );
};

// ─── Hotspot Popup ────────────────────────────────────────────────────────────

interface HotspotPopupProps {
    instrument: Instrument;
    screenX: number;
    screenY: number;
    onClose: () => void;
}

const HotspotPopup: React.FC<HotspotPopupProps> = ({ instrument, screenX, screenY, onClose }) => {
    const photo = instrument.media.find(m => m.type === "PHOTO");
    const textMedia = instrument.media.find(m => m.type === "TEXT");
    const [description, setDescription] = useState<string | null>(null);

    useEffect(() => {
        if (!textMedia) return;
        fetch(textMedia.link)
            .then(r => r.text())
            .then(text => setDescription(text))
            .catch(() => {});
    }, [textMedia?.link]);

    // Keep popup inside viewport
    const left = Math.min(screenX + 16, window.innerWidth - 320);
    const top = Math.min(screenY - 20, window.innerHeight - 300);

    return (
        <div style={{
            position: "fixed",
            left,
            top,
            width: 300,
            backgroundColor: "rgba(20,20,20,0.85)",
            backdropFilter: "blur(12px)",
            borderRadius: 16,
            border: "1px solid rgba(255,255,255,0.1)",
            padding: 16,
            zIndex: 100,
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>{instrument.name}</span>
                <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.5)", fontSize: 18, padding: 0, lineHeight: 1 }}>×</button>
            </div>
            {description && (
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.65)" }}>
                    {description}
                </p>
            )}
            {photo && (
                <img src={photo.link} alt={instrument.name} style={{ width: "100%", borderRadius: 10, objectFit: "cover", maxHeight: 160 }} />
            )}
        </div>
    );
};

// ─── StudyCockpitPage ─────────────────────────────────────────────────────────

const StudyCockpitPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [cockpit, setCockpit] = useState<CockpitDetail | null>(null);
    const [panoramaLoaded, setPanoramaLoaded] = useState(false);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<StudyTab>("info");

    // Hotspot popup
    const [activeHotspot, setActiveHotspot] = useState<{ instrument: Instrument; x: number; y: number } | null>(null);

    // Camera focus
    const [focusTarget, setFocusTarget] = useState<{ pitch: number; yaw: number } | null>(null);

    useEffect(() => {
        if (!id) return;
        api.get<CockpitDetail>(`/cockpits/${id}`)
            .then(({ data }) => setCockpit(data))
            .catch(() => navigate("/cockpits"))
            .finally(() => setLoading(false));
    }, [id]);

    const panorama = cockpit?.media.find(m => m.type === "PANORAMA");
    const preview = cockpit?.media.find(m => m.type === "PREVIEW") || cockpit?.media[0];

    const handleHotspotClick = (instrument: Instrument, screenX: number, screenY: number) => {
        setActiveHotspot({ instrument, x: screenX, y: screenY });
    };

    const handleInstrumentListClick = (instrument: Instrument) => {
        if (instrument.xPos != null && instrument.yPos != null) {
            const pitch = (instrument.yPos / 100) * Math.PI;
            const yaw = ((instrument.xPos / 100) - 0.5) * 2 * Math.PI;
            setFocusTarget({ pitch, yaw });
            setActiveHotspot({ instrument, x: window.innerWidth / 2, y: window.innerHeight / 2 });
        }
    };

    if (loading) return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", backgroundColor: "#111", color: "rgba(255,255,255,0.3)", fontFamily: "'DM Sans', sans-serif" }}>
            Loading...
        </div>
    );

    if (!cockpit) return null;

    const tags = [
        cockpit.hasVfr && "VFR",
        cockpit.hasIfr && "IFR",
        cockpit.hasNight && "Night",
        cockpit.hasAutopilot && "Autopilot",
    ].filter(Boolean) as string[];

    return (
        <div style={s.root}>
            <style>{`
                * { box-sizing: border-box; }
                ::-webkit-scrollbar { width: 4px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 2px; }
                button { font-family: inherit; transition: opacity 0.15s; }
                button:hover { opacity: 0.85; }
            `}</style>

            {/* Panorama — full screen background */}
            <div style={s.panoramaWrap}>
                {!panoramaLoaded && (
                    <div style={s.skeleton}>
                        <style>{`
                            @keyframes shimmer {
                                0% { transform: translateY(-100%); }
                                100% { transform: translateY(100%); }
                            }
                        `}</style>
                        <div style={s.shimmer} />
                    </div>
                )}
                {panorama ? (
                    <PanoramaViewer
                        imageUrl={panorama.link}
                        instruments={cockpit.instruments}
                        focusTarget={focusTarget}
                        onHotspotClick={handleHotspotClick}
                        onDismiss={() => setActiveHotspot(null)}
                        onLoad={() => setPanoramaLoaded(true)}
                    />
                ) : preview ? (
                    <img src={preview.link} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                    <div style={{ width: "100%", height: "100%", backgroundColor: "#1a1a1a" }} />
                )}
            </div>

            {/* Top bar */}
            <div style={s.topBar}>
                <button style={s.backBtn} onClick={() => navigate(-1)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M19 12H5M5 12l7-7M5 12l7 7" />
                    </svg>
                </button>
                <span style={s.topBarTitle}>{cockpit.name}</span>
            </div>

            {/* Floating side panel */}
            <div style={s.panel}>
                {/* Tabs */}
                <div style={s.tabs}>
                    {(["info", "instruments", "checklists"] as StudyTab[]).map(tab => (
                        <button
                            key={tab}
                            style={{ ...s.tab, ...(activeTab === tab ? s.tabActive : {}) }}
                            onClick={() => setActiveTab(tab)}
                        >
                            {tab === "info" ? "Info" : tab === "instruments" ? "Instruments" : "Checklists"}
                        </button>
                    ))}
                </div>

                {/* Panel content */}
                <div style={s.panelContent}>

                    {/* ── INFO TAB ── */}
                    {activeTab === "info" && (
                        <div style={s.infoTab}>
                            <div style={s.infoHeader}>
                                <h2 style={s.infoTitle}>{cockpit.name}</h2>
                                {cockpit.manufacturer && cockpit.model && (
                                    <p style={s.infoSubtitle}>{cockpit.manufacturer} · {cockpit.model}</p>
                                )}
                                {cockpit.registration && (
                                    <span style={s.regBadge}>{cockpit.registration}</span>
                                )}
                            </div>

                            {tags.length > 0 && (
                                <div style={s.tagRow}>
                                    {tags.map(tag => (
                                        <span key={tag} style={s.tag}>{tag}</span>
                                    ))}
                                </div>
                            )}

                            <div style={s.infoGrid}>
                                {cockpit.category && <InfoField label="Category" value={cockpit.category} />}
                                {cockpit.purpose && <InfoField label="Purpose" value={cockpit.purpose} />}
                            </div>

                            {cockpit.creator && (
                                <div style={s.creatorRow}>
                                    <div style={s.creatorAvatar}>
                                        {cockpit.creator.avatar
                                            ? <img src={cockpit.creator.avatar} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
                                            : <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                                                {(cockpit.creator.name || "?").charAt(0)}
                                            </span>
                                        }
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 2 }}>Created by</div>
                                        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)" }}>
                                            {[cockpit.creator.name, cockpit.creator.surname].filter(Boolean).join(" ")}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── INSTRUMENTS TAB ── */}
                    {activeTab === "instruments" && (
                        <div style={s.listTab}>
                            {cockpit.instruments.length === 0 ? (
                                <p style={s.emptyText}>No instruments added</p>
                            ) : (
                                cockpit.instruments.map((inst, i) => (
                                    <button
                                        key={inst.id}
                                        style={s.instrumentRow}
                                        onClick={() => handleInstrumentListClick(inst)}
                                    >
                                        <div style={s.instrumentNum}>{i + 1}</div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={s.instrumentName}>{inst.name}</div>
                                            {inst.description && (
                                                <div style={s.instrumentDesc}>{inst.description}</div>
                                            )}
                                        </div>
                                        {inst.xPos != null && (
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E9FD97" strokeWidth="2">
                                                <circle cx="12" cy="12" r="3" />
                                                <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                                            </svg>
                                        )}
                                    </button>
                                ))
                            )}
                        </div>
                    )}

                    {/* ── CHECKLISTS TAB ── */}
                    {activeTab === "checklists" && (
                        <div style={s.listTab}>
                            {cockpit.checklists.length === 0 ? (
                                <p style={s.emptyText}>No checklists available</p>
                            ) : (
                                cockpit.checklists.map(cl => (
                                    <div key={cl.id} style={s.checklistBlock}>
                                        <h3 style={s.checklistName}>{cl.name}</h3>
                                        <div style={s.checklistItems}>
                                            {cl.items.sort((a, b) => a.order - b.order).map((item, idx) => (
                                                <div key={item.id} style={s.checklistItem}>
                                                    <div style={s.checklistStep}>{idx + 1}</div>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={s.checklistDesc}>{item.description}</div>
                                                        {item.instrument && (
                                                            <button
                                                                style={s.checklistInstrumentBtn}
                                                                onClick={() => item.instrument && handleInstrumentListClick(item.instrument)}
                                                            >
                                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                    <circle cx="12" cy="12" r="3" />
                                                                    <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                                                                </svg>
                                                                {item.instrument.name}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Hotspot popup */}
            {activeHotspot && (
                <HotspotPopup
                    instrument={activeHotspot.instrument}
                    screenX={activeHotspot.x}
                    screenY={activeHotspot.y}
                    onClose={() => setActiveHotspot(null)}
                />
            )}
        </div>
    );
};

// ─── Helper ───────────────────────────────────────────────────────────────────

const InfoField: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</span>
        <span style={{ fontSize: 14, color: "#fff", fontWeight: 500 }}>{value}</span>
    </div>
);

// ─── Styles ───────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
    root: {
        position: "relative",
        width: "100vw",
        height: "100vh",
        backgroundColor: "#111",
        fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
        overflow: "hidden",
        color: "#fff",
    },
    panoramaWrap: {
        position: "absolute",
        inset: 0,
        zIndex: 0,
    },
    skeleton: {
        position: "absolute",
        inset: 0,
        backgroundColor: "#1a1a1a",
        overflow: "hidden",
        zIndex: 1,
    },
    shimmer: {
        position: "absolute",
        inset: 0,
        background: "linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)",
        animation: "shimmer 2s infinite",
        backgroundSize: "100% 200%",
    },
    topBar: {
        position: "absolute",
        top: 20,
        left: 20,
        display: "flex",
        alignItems: "center",
        gap: 12,
        zIndex: 10,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(8px)",
        border: "1px solid rgba(255,255,255,0.1)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
    },
    topBarTitle: {
        fontSize: 18,
        fontWeight: 700,
        color: "#fff",
        textShadow: "0 1px 8px rgba(0,0,0,0.8)",
        letterSpacing: "-0.3px",
    },
    panel: {
        position: "absolute",
        top: 20,
        right: 20,
        bottom: 20,
        width: 300,
        backgroundColor: "rgba(15,15,15,0.75)",
        backdropFilter: "blur(20px)",
        borderRadius: 20,
        border: "1px solid rgba(255,255,255,0.08)",
        display: "flex",
        flexDirection: "column",
        zIndex: 10,
        overflow: "hidden",
    },
    tabs: {
        display: "flex",
        padding: "12px 12px 0",
        gap: 4,
        flexShrink: 0,
    },
    tab: {
        flex: 1,
        padding: "8px 4px",
        borderRadius: 10,
        border: "none",
        backgroundColor: "transparent",
        color: "rgba(255,255,255,0.4)",
        fontSize: 13,
        fontWeight: 500,
        cursor: "pointer",
    },
    tabActive: {
        backgroundColor: "rgba(255,255,255,0.1)",
        color: "#fff",
    },
    panelContent: {
        flex: 1,
        overflowY: "auto",
        padding: 16,
    },
    // Info tab
    infoTab: {
        display: "flex",
        flexDirection: "column",
        gap: 20,
    },
    infoHeader: {
        display: "flex",
        flexDirection: "column",
        gap: 4,
    },
    infoTitle: {
        fontSize: 22,
        fontWeight: 700,
        color: "#fff",
        margin: 0,
        letterSpacing: "-0.4px",
    },
    infoSubtitle: {
        fontSize: 13,
        color: "rgba(255,255,255,0.5)",
        margin: 0,
    },
    regBadge: {
        display: "inline-block",
        backgroundColor: "rgba(233,253,151,0.12)",
        color: "#E9FD97",
        fontSize: 12,
        fontWeight: 600,
        padding: "3px 10px",
        borderRadius: 6,
        marginTop: 4,
    },
    tagRow: {
        display: "flex",
        flexWrap: "wrap",
        gap: 6,
    },
    tag: {
        backgroundColor: "rgba(255,255,255,0.08)",
        color: "rgba(255,255,255,0.7)",
        fontSize: 12,
        padding: "4px 10px",
        borderRadius: 6,
    },
    infoGrid: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 16,
    },
    creatorRow: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "12px",
        backgroundColor: "rgba(255,255,255,0.05)",
        borderRadius: 12,
    },
    creatorAvatar: {
        width: 36,
        height: 36,
        borderRadius: "50%",
        backgroundColor: "rgba(255,255,255,0.1)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        flexShrink: 0,
    },
    // Instruments & Checklists shared
    listTab: {
        display: "flex",
        flexDirection: "column",
        gap: 6,
    },
    emptyText: {
        color: "rgba(255,255,255,0.3)",
        fontSize: 14,
        margin: 0,
        textAlign: "center",
        paddingTop: 32,
    },
    instrumentRow: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        borderRadius: 10,
        backgroundColor: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.06)",
        cursor: "pointer",
        width: "100%",
        textAlign: "left",
    },
    instrumentNum: {
        width: 24,
        height: 24,
        borderRadius: 6,
        backgroundColor: "rgba(233,253,151,0.12)",
        color: "#E9FD97",
        fontSize: 12,
        fontWeight: 700,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    },
    instrumentName: {
        fontSize: 13,
        fontWeight: 600,
        color: "#fff",
    },
    instrumentDesc: {
        fontSize: 11,
        color: "rgba(255,255,255,0.4)",
        marginTop: 2,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
    },
    // Checklists
    checklistBlock: {
        backgroundColor: "rgba(255,255,255,0.04)",
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
    },
    checklistName: {
        fontSize: 14,
        fontWeight: 700,
        color: "#E9FD97",
        margin: "0 0 10px 0",
    },
    checklistItems: {
        display: "flex",
        flexDirection: "column",
        gap: 8,
    },
    checklistItem: {
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
    },
    checklistStep: {
        width: 20,
        height: 20,
        borderRadius: 5,
        backgroundColor: "rgba(255,255,255,0.1)",
        color: "rgba(255,255,255,0.5)",
        fontSize: 11,
        fontWeight: 700,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        marginTop: 1,
    },
    checklistDesc: {
        fontSize: 13,
        color: "rgba(255,255,255,0.8)",
        lineHeight: "150%",
    },
    checklistInstrumentBtn: {
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        marginTop: 4,
        backgroundColor: "rgba(255,255,255,0.07)",
        border: "none",
        borderRadius: 5,
        color: "rgba(255,255,255,0.5)",
        fontSize: 11,
        padding: "3px 7px",
        cursor: "pointer",
    },
};

export default StudyCockpitPage;