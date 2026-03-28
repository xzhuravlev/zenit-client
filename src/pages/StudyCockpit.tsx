import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import * as THREE from "three";
import api from "../api/axios";

// ─── Types ────────────────────────────────────────────────────────────────────

type StudyTab = "instruments" | "checklists";

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
    media: CockpitMedia[];
    instruments: Instrument[];
    checklists: Checklist[];
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
        const texture = new THREE.TextureLoader().load(imageUrl, () => { onLoad?.(); });
        scene.add(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ map: texture })));

        const hotspotGroup = new THREE.Group();
        scene.add(hotspotGroup);
        hotspotGroupRef.current = hotspotGroup;

        const animate = () => {
            animFrameRef.current = requestAnimationFrame(animate);

            spherical.current.phi += (targetSpherical.current.phi - spherical.current.phi) * 0.08;
            spherical.current.theta += (targetSpherical.current.theta - spherical.current.theta) * 0.08;

            const { phi, theta } = spherical.current;
            camera.lookAt(new THREE.Vector3(
                Math.sin(phi) * Math.cos(theta),
                Math.cos(phi),
                Math.sin(phi) * Math.sin(theta)
            ));

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

    useEffect(() => {
        const group = hotspotGroupRef.current;
        if (!group) return;
        while (group.children.length) group.remove(group.children[0]);
        instruments.forEach(inst => {
            if (inst.xPos == null || inst.yPos == null) return;
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
            .catch(() => { });
    }, [textMedia?.link]);

    const left = Math.min(screenX + 16, window.innerWidth - 320);
    const top = Math.min(screenY - 20, window.innerHeight - 300);

    return (
        <div style={{
            position: "fixed", left, top, width: 300, zIndex: 200,
            backgroundColor: "rgba(18,18,17,0.9)",
            backdropFilter: "blur(5px)",
            WebkitBackdropFilter: "blur(5px)",
            borderRadius: 16,
            border: "1px solid #393A36",
            padding: 16,
        }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <span style={{ fontSize: 20, fontWeight: 400, color: "#fff" }}>{instrument.name}</span>
                <button
                    onClick={onClose}
                    style={{ background: "rgba(233, 253, 151, 0.18)", border: "none", cursor: "pointer", color: "#E9FD97", width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                </button>
            </div>
            {description && (
                <p style={{ fontSize: 16, fontWeight: 400, color: "rgba(255,255,255,0.7)", margin: "0 0 10px 0", lineHeight: "150%" }}>
                    {description}
                </p>
            )}
            {photo && (
                <img src={photo.link} alt={instrument.name} style={{ width: "100%", borderRadius: 8, objectFit: "cover", maxHeight: 160 }} />
            )}
        </div>
    );
};

// ─── StudyCockpit ─────────────────────────────────────────────────────────────

const StudyCockpit: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [cockpit, setCockpit] = useState<CockpitDetail | null>(null);
    const [panoramaLoaded, setPanoramaLoaded] = useState(false);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<StudyTab>("instruments");

    const [activeHotspot, setActiveHotspot] = useState<{ instrument: Instrument; x: number; y: number } | null>(null);
    const [focusTarget, setFocusTarget] = useState<{ pitch: number; yaw: number } | null>(null);
    const [expandedChecklists, setExpandedChecklists] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!id) return;
        api.get<CockpitDetail>(`/cockpits/${id}`)
            .then(({ data }) => setCockpit(data))
            .catch(() => navigate("/cockpits"))
            .finally(() => setLoading(false));
    }, [id]);

    const panorama = cockpit?.media.find(m => m.type === "PANORAMA");
    const preview = cockpit?.media.find(m => m.type === "PREVIEW") || cockpit?.media[0];

    const handleInstrumentClick = (instrument: Instrument) => {
        if (instrument.xPos != null && instrument.yPos != null) {
            const pitch = (instrument.yPos / 100) * Math.PI;
            const yaw = ((instrument.xPos / 100) - 0.5) * 2 * Math.PI;
            setFocusTarget({ pitch, yaw });
            setActiveHotspot({ instrument, x: window.innerWidth / 2, y: window.innerHeight / 2 });
        }
    };

    if (loading) return (
        <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#121211", color: "rgba(255,255,255,0.3)", fontFamily: "'DM Sans', sans-serif" }}>
            Loading...
        </div>
    );

    if (!cockpit) return null;

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

            {/* Panorama background */}
            <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
                {!panoramaLoaded && panorama && (
                    <div style={{ position: "absolute", inset: 0, backgroundColor: "#121211", overflow: "hidden", zIndex: 1 }}>
                        <style>{`@keyframes shimmer { 0% { transform: translateY(-100%); } 100% { transform: translateY(100%); } }`}</style>
                        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)", animation: "shimmer 2s infinite" }} />
                    </div>
                )}
                {panorama ? (
                    <PanoramaViewer
                        imageUrl={panorama.link}
                        instruments={cockpit.instruments}
                        focusTarget={focusTarget}
                        onHotspotClick={(inst, x, y) => setActiveHotspot({ instrument: inst, x, y })}
                        onDismiss={() => setActiveHotspot(null)}
                        onLoad={() => setPanoramaLoaded(true)}
                    />
                ) : preview ? (
                    <img src={preview.link} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                    <div style={{ width: "100%", height: "100%", backgroundColor: "#1a1a1a" }} />
                )}
            </div>

            {/* Floating side panel */}
            <div style={s.panel}>
                {/* Panel header */}
                <div style={s.panelHeader}>
                    <span style={s.panelTitle}>{cockpit.name}</span>
                    <button style={s.closeBtn} onClick={() => navigate("/cockpits")}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M18 6L6 18M6 6L18 18" stroke="#E9FD97" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                </div>

                {/* Tabs */}
                <div style={s.tabs}>
                    {(["instruments", "checklists"] as StudyTab[]).map(tab => (
                        <button
                            key={tab}
                            style={{ ...s.tab, ...(activeTab === tab ? s.tabActive : {}) }}
                            onClick={() => setActiveTab(tab)}
                        >
                            {tab === "instruments" ? "Instruments" : "Checklists"}
                        </button>
                    ))}
                </div>

                {/* Panel content */}
                <div style={s.panelContent}>

                    {/* ── INSTRUMENTS ── */}
                    {activeTab === "instruments" && (
                        <div style={s.list}>
                            {cockpit.instruments.length === 0 ? (
                                <p style={s.emptyText}>No instruments added</p>
                            ) : (
                                cockpit.instruments.map((inst, i) => (
                                    <button
                                        key={inst.id}
                                        style={s.instrumentRow}
                                        onClick={() => handleInstrumentClick(inst)}
                                    >
                                        <div style={s.instrumentNum}>{i + 1}</div>
                                        <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                                            <div style={s.instrumentName}>{inst.name}</div>
                                            {inst.description && (
                                                <div style={s.instrumentDesc}>{inst.description}</div>
                                            )}
                                        </div>
                                        {inst.xPos != null && (
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#E9FD97" strokeWidth="2" strokeLinecap="round">
                                                <circle cx="12" cy="12" r="3" />
                                                <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                                            </svg>
                                        )}
                                    </button>
                                ))
                            )}
                        </div>
                    )}

                    {/* ── CHECKLISTS ── */}
                    {activeTab === "checklists" && (
                        <div style={s.list}>
                            {cockpit.checklists.length === 0 ? (
                                <p style={s.emptyText}>No checklists available</p>
                            ) : (
                                cockpit.checklists.map(cl => {
                                    const isExpanded = expandedChecklists.has(cl.id);
                                    const toggle = () => setExpandedChecklists(prev => {
                                        const next = new Set(prev);
                                        isExpanded ? next.delete(cl.id) : next.add(cl.id);
                                        return next;
                                    });
                                    return (
                                    <div key={cl.id} style={s.checklistBlock}>
                                        <div style={{ ...s.checklistHeader, cursor: "pointer" }} onClick={toggle}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0, color: isExpanded ? "#E9FD97" : "rgba(255,255,255,0.4)" }}>
                                                    <path d="M20 12.5V6.8C20 5.11984 20 4.27976 19.673 3.63803C19.3854 3.07354 18.9265 2.6146 18.362 2.32698C17.7202 2 16.8802 2 15.2 2H8.8C7.11984 2 6.27976 2 5.63803 2.32698C5.07354 2.6146 4.6146 3.07354 4.32698 3.63803C4 4.27976 4 5.11984 4 6.8V17.2C4 18.8802 4 19.7202 4.32698 20.362C4.6146 20.9265 5.07354 21.3854 5.63803 21.673C6.27976 22 7.11984 22 8.8 22H12M14 11H8M10 15H8M16 7H8M14.5 19L16.5 21L21 16.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                </svg>
                                                <div style={s.checklistName}>{cl.name}</div>
                                            </div>
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0, color: "rgba(255,255,255,0.5)", transition: "transform 0.2s", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}>
                                                <path d="M6 9L12 15L18 9" stroke="#E9FD97" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                            </svg>
                                        </div>
                                        {isExpanded && <div style={s.checklistItems}>
                                            {[...cl.items].sort((a, b) => a.order - b.order).map((item) => (
                                                <div key={item.id} style={s.checklistItem}>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        {item.instrument && (
                                                            <div style={s.checklistInstrumentName}>{item.instrument.name}</div>
                                                        )}
                                                        <div style={s.checklistDesc}>{item.description}</div>
                                                    </div>
                                                    {item.instrument && (
                                                        <button
                                                            style={s.checklistLocateBtn}
                                                            onClick={() => {
                                                                if (!item.instrument) return;
                                                                const full = cockpit.instruments.find(i => i.id === item.instrument!.id);
                                                                if (full) handleInstrumentClick(full);
                                                            }}
                                                        >
                                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                                                <circle cx="12" cy="12" r="3" />
                                                                <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>}
                                    </div>
                                );})
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

// ─── Styles ───────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
    root: {
        position: "fixed",
        inset: 0,
        backgroundColor: "#121211",
        fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
        overflow: "hidden",
        color: "#fff",
    },
    panel: {
        position: "absolute",
        top: 32,
        right: 32,
        bottom: 32,
        width: 412,
        backgroundColor: "rgba(18,18,17,0.90)",
        backdropFilter: "blur(5px)",
        WebkitBackdropFilter: "blur(5px)",
        borderRadius: 16,
        border: "1px solid #393A36",
        display: "flex",
        flexDirection: "column",
        zIndex: 10,
        overflow: "hidden",
    },
    panelHeader: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 16,
    },
    panelTitle: {
        fontSize: 24,
        fontWeight: 400,
        color: "#fff",
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
    tabs: {
        display: "flex",
        padding: "14px 16px",
        gap: 12,
        flexShrink: 0,
    },
    tab: {
        flex: 1,
        padding: "12px",
        borderRadius: 8,
        border: "none",
        backgroundColor: "transparent",
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: 400,
        cursor: "pointer",
    },
    tabActive: {
        border: "none",
        backgroundColor: "#444444",
        color: "#E9FD97",
        fontWeight: 400,
    },
    panelContent: {
        flex: 1,
        overflowY: "auto",
        padding: 16,
    },
    list: {
        display: "flex",
        flexDirection: "column",
        gap: 12,
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
        gap: 16,
        padding: "10px 12px",
        borderRadius: 8,
        background: "rgba(255,255,255,0.05)",
        cursor: "pointer",
        width: "100%",
    },
    instrumentNum: {
        width: 32,
        height: 32,
        borderRadius: 6,
        backgroundColor: "rgba(233,253,151,0.15)",
        color: "#E9FD97",
        fontSize: 16,
        fontWeight: 600,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    },
    instrumentName: {
        fontSize: 16,
        fontWeight: 400,
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
    checklistBlock: {
        background: "rgba(255,255,255,0.05)",
        borderRadius: 8,
        padding: "12px 14px",
        marginBottom: 6,
        display: "flex",
        flexDirection: "column",
        gap: 6,
    },
    checklistHeader: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
    },
    checklistName: {
        fontSize: 20,
        fontWeight: 400,
        color: "#fff",
    },
    checklistItems: {
        display: "flex",
        flexDirection: "column",
        gap: 12,
        marginTop: 8,
    },
    checklistItem: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 12px",
        borderRadius: 8,
        background: "rgba(233,253,151,0.18)",
    },
    checklistInstrumentName: {
        fontSize: 16,
        fontWeight: 600,
        color: "#fff",
        marginBottom: 2,
    },
    checklistDesc: {
        fontSize: 14,
        fontWeight: 400,
        color: "rgba(255,255,255,0.6)",
        lineHeight: "140%",
    },
    checklistLocateBtn: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 40,
        height: 40,
        borderRadius: 8,
        border: "none",
        backgroundColor: "rgba(233,253,151,0.18)",
        color: "#E9FD97",
        cursor: "pointer",
        flexShrink: 0,
        padding: 0,
    },
};

export default StudyCockpit;
