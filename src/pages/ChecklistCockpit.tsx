import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import * as THREE from "three";
import api from "../api/axios";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Instrument {
    id: string;
    name: string;
    description: string | null;
    xPos: number | null;
    yPos: number | null;
    media: { id: string; link: string; type: string }[];
}

interface ChecklistItem {
    id: string;
    description: string;
    order: number;
    instrumentId: string;
}

interface ChecklistDetail {
    id: string;
    name: string;
    items: ChecklistItem[];
    cockpit: {
        id: string;
        name: string;
        media: { id: string; link: string; type: string }[];
        instruments: Instrument[];
    };
}

// ─── Panorama Viewer ──────────────────────────────────────────────────────────

interface PanoramaProps {
    imageUrl: string;
    instruments: Instrument[];
    assignedInstrumentIds: Set<string>;
    awaitingAssignment: boolean;
    focusTarget: { pitch: number; yaw: number } | null;
    onHotspotClick: (instrument: Instrument) => void;
    onLoad?: () => void;
}

const PanoramaViewer: React.FC<PanoramaProps> = ({
    imageUrl, instruments, assignedInstrumentIds, awaitingAssignment, focusTarget, onHotspotClick, onLoad,
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

    // Update hotspot colors based on assignment state
    useEffect(() => {
        const group = hotspotGroupRef.current;
        if (!group) return;
        while (group.children.length) group.remove(group.children[0]);
        instruments.forEach(inst => {
            if (inst.xPos == null || inst.yPos == null) return;
            const pitch = (inst.yPos / 100) * Math.PI;
            const yaw = ((inst.xPos / 100) - 0.5) * 2 * Math.PI;
            const isAssigned = assignedInstrumentIds.has(inst.id);
            const mesh = new THREE.Mesh(
                new THREE.SphereGeometry(4, 16, 16),
                new THREE.MeshBasicMaterial({
                    color: isAssigned ? 0x4ade80 : 0xE9FD97,
                    transparent: true,
                    opacity: 0.5,
                })
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
    }, [instruments, assignedInstrumentIds]);

    useEffect(() => {
        if (!focusTarget) return;
        targetSpherical.current = { phi: focusTarget.pitch, theta: focusTarget.yaw };
    }, [focusTarget]);

    const handleMouseDown = (e: React.MouseEvent) => {
        isDragging.current = false;
        lastMouse.current = { x: e.clientX, y: e.clientY };
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
        if (isDragging.current || !awaitingAssignment || !mountRef.current || !cameraRef.current || !hotspotGroupRef.current) return;
        const rect = mountRef.current.getBoundingClientRect();
        const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(nx, ny), cameraRef.current);
        const hits = raycaster.intersectObjects(hotspotGroupRef.current.children);
        const hit = hits.find(h => h.object.userData?.isHotspot);
        if (hit) {
            const inst = instruments.find(i => i.id === hit.object.userData.instrumentId);
            if (inst) onHotspotClick(inst);
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
            style={{ width: "100%", height: "100%", cursor: awaitingAssignment ? "crosshair" : "grab" }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onClick={handleClick}
            onWheel={handleWheel}
        />
    );
};

// ─── ChecklistCockpit ─────────────────────────────────────────────────────────

const ChecklistCockpit: React.FC = () => {
    const { checklistId } = useParams<{ cockpitId: string; checklistId: string }>();
    const navigate = useNavigate();

    const [checklist, setChecklist] = useState<ChecklistDetail | null>(null);
    const [panoramaLoaded, setPanoramaLoaded] = useState(false);
    const [loading, setLoading] = useState(true);

    const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
    // stepId → instrumentId
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [submitted, setSubmitted] = useState(false);
    const [result, setResult] = useState<{ attempt: number; percent: number } | null>(null);
    const [focusTarget, setFocusTarget] = useState<{ pitch: number; yaw: number } | null>(null);

    useEffect(() => {
        if (!checklistId) return;
        api.get<ChecklistDetail>(`/checklists/${checklistId}`)
            .then(({ data }) => { console.log(data); setChecklist(data); })
            .catch(() => navigate("/cockpits"))
            .finally(() => setLoading(false));
    }, [checklistId]);

    const panorama = checklist?.cockpit.media[0];
    const instruments = checklist?.cockpit.instruments ?? [];
    const steps = checklist ? [...checklist.items].sort((a, b) => a.order - b.order) : [];

    const handleStepClick = (stepId: string) => {
        if (submitted) return;
        setSelectedStepId(prev => prev === stepId ? null : stepId);
    };

    const handleHotspotClick = (instrument: Instrument) => {
        if (!selectedStepId || submitted) return;
        setAnswers(prev => ({ ...prev, [selectedStepId]: instrument.id }));
        setSelectedStepId(null);
        if (instrument.xPos != null && instrument.yPos != null) {
            setFocusTarget({
                pitch: (instrument.yPos / 100) * Math.PI,
                yaw: ((instrument.xPos / 100) - 0.5) * 2 * Math.PI,
            });
        }
    };

    const clearAnswer = (stepId: string) => {
        setAnswers(prev => { const next = { ...prev }; delete next[stepId]; return next; });
    };

    const allAnswered = steps.length > 0 && steps.every(s => answers[s.id]);

    const handleSubmit = async () => {
        if (!checklistId || !allAnswered) return;
        // Send instrumentIds in step order
        const selectedInstrumentIds = steps.map(s => answers[s.id]);
        console.log("SUBMIT:");
        console.log(selectedInstrumentIds);
        const { data } = await api.post<{ attempt: number; percent: number }>(
            `/checklists/${checklistId}/complete`,
            { selectedInstrumentIds }
        );
        setResult(data);
        setSubmitted(true);
    };

    const handleReset = () => {
        setAnswers({});
        setSubmitted(false);
        setResult(null);
        setSelectedStepId(null);
    };

    const getStepResult = (step: ChecklistItem): "correct" | "wrong" | null => {
        if (!submitted) return null;
        return answers[step.id] === step.instrumentId ? "correct" : "wrong";
    };

    if (loading) return (
        <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#121211", color: "rgba(255,255,255,0.3)", fontFamily: "'DM Sans', sans-serif" }}>
            Loading...
        </div>
    );

    if (!checklist) return null;

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
                        instruments={instruments}
                        assignedInstrumentIds={new Set(Object.values(answers))}
                        awaitingAssignment={!!selectedStepId && !submitted}
                        focusTarget={focusTarget}
                        onHotspotClick={handleHotspotClick}
                        onLoad={() => setPanoramaLoaded(true)}
                    />
                ) : (
                    <div style={{ width: "100%", height: "100%", backgroundColor: "#1a1a1a" }} />
                )}
            </div>

            {/* Hint toast when awaiting assignment */}
            {selectedStepId && !submitted && (
                <div style={s.hint}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                    </svg>
                    Click a hotspot on the panorama
                </div>
            )}

            {/* Floating side panel */}
            <div style={s.panel}>
                {/* Header */}
                <div style={s.panelHeader}>
                    <span style={s.panelTitle}>{checklist.cockpit.name}</span>
                    <button style={s.closeBtn} onClick={() => navigate("/cockpits")}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 6L6 18M6 6L18 18" />
                        </svg>
                    </button>
                </div>

                {/* Checklist name */}
                <div style={s.clTitle}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E9FD97" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 12.5V6.8C20 5.11984 20 4.27976 19.673 3.63803C19.3854 3.07354 18.9265 2.6146 18.362 2.32698C17.7202 2 16.8802 2 15.2 2H8.8C7.11984 2 6.27976 2 5.63803 2.32698C5.07354 2.6146 4.6146 3.07354 4.32698 3.63803C4 4.27976 4 5.11984 4 6.8V17.2C4 18.8802 4 19.7202 4.32698 20.362C4.6146 20.9265 5.07354 21.3854 5.63803 21.673C6.27976 22 7.11984 22 8.8 22H12M14 11H8M10 15H8M16 7H8M14.5 19L16.5 21L21 16.5" />
                    </svg>
                    {checklist.name}
                </div>

                {/* Steps */}
                <div style={s.panelContent}>
                    {steps.length === 0 ? (
                        <p style={s.emptyText}>No steps in this checklist</p>
                    ) : (
                        <div style={s.stepList}>
                            {steps.map((step, idx) => {
                                const result = getStepResult(step);
                                const isSelected = selectedStepId === step.id;
                                const assignedInst = answers[step.id]
                                    ? instruments.find(i => i.id === answers[step.id])
                                    : null;

                                return (
                                    <div
                                        key={step.id}
                                        style={{
                                            ...s.stepCard,
                                            ...(isSelected ? s.stepCardSelected : {}),
                                            ...(result === "correct" ? s.stepCardCorrect : {}),
                                            ...(result === "wrong" ? s.stepCardWrong : {}),
                                        }}
                                        onClick={() => handleStepClick(step.id)}
                                    >
                                        <div style={s.stepNum}>{idx + 1}</div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={s.stepDesc}>{step.description}</div>
                                            {assignedInst ? (
                                                <div style={s.stepAssigned}>
                                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                                        <circle cx="12" cy="12" r="3" />
                                                        <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                                                    </svg>
                                                    {assignedInst.name}
                                                </div>
                                            ) : (
                                                <div style={s.stepPlaceholder}>
                                                    {isSelected ? "Click a hotspot..." : "Tap to select"}
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0 }}>
                                            {result === "correct" && (
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M20 6L9 17l-5-5" />
                                                </svg>
                                            )}
                                            {result === "wrong" && (
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M18 6L6 18M6 6L18 18" />
                                                </svg>
                                            )}
                                            {!submitted && assignedInst && (
                                                <button
                                                    style={s.clearBtn}
                                                    onClick={e => { e.stopPropagation(); clearAnswer(step.id); }}
                                                >
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M18 6L6 18M6 6L18 18" />
                                                    </svg>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={s.footer}>
                    {!submitted ? (
                        <button
                            style={{ ...s.submitBtn, ...(!allAnswered ? s.submitBtnDisabled : {}) }}
                            disabled={!allAnswered}
                            onClick={handleSubmit}
                        >
                            Submit answers
                        </button>
                    ) : (
                        <div style={s.resultRow}>
                            <div style={s.scoreText}>
                                {result?.percent ?? 0}% correct
                            </div>
                            <button style={s.retryBtn} onClick={handleReset}>
                                Try again
                            </button>
                        </div>
                    )}
                </div>
            </div>
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
    hint: {
        position: "absolute",
        bottom: 40,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 20,
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 18px",
        borderRadius: 12,
        backgroundColor: "rgba(18,18,17,0.9)",
        backdropFilter: "blur(5px)",
        WebkitBackdropFilter: "blur(5px)",
        border: "1px solid #393A36",
        color: "#E9FD97",
        fontSize: 13,
        fontWeight: 500,
        pointerEvents: "none",
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
        padding: "20px 20px 0",
        flexShrink: 0,
    },
    panelTitle: {
        fontSize: 18,
        fontWeight: 700,
        color: "#fff",
        letterSpacing: "-0.3px",
    },
    closeBtn: {
        display: "flex",
        width: 36,
        height: 36,
        padding: 0,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 8,
        border: "none",
        cursor: "pointer",
        backgroundColor: "rgba(233,253,151,0.18)",
        color: "#E9FD97",
        flexShrink: 0,
    },
    clSelector: {
        display: "flex",
        padding: "14px 16px 0",
        gap: 4,
        flexShrink: 0,
        flexWrap: "wrap",
    },
    clTab: {
        padding: "6px 12px",
        borderRadius: 8,
        border: "none",
        backgroundColor: "transparent",
        color: "rgba(255,255,255,0.4)",
        fontSize: 12,
        fontWeight: 500,
        cursor: "pointer",
    },
    clTabActive: {
        backgroundColor: "rgba(233,253,151,0.12)",
        color: "#E9FD97",
        fontWeight: 600,
    },
    clTitle: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "14px 20px 0",
        flexShrink: 0,
        fontSize: 14,
        fontWeight: 600,
        color: "#E9FD97",
    },
    panelContent: {
        flex: 1,
        overflowY: "auto",
        padding: 16,
    },
    emptyText: {
        color: "rgba(255,255,255,0.3)",
        fontSize: 14,
        margin: 0,
        textAlign: "center",
        paddingTop: 32,
    },
    stepList: {
        display: "flex",
        flexDirection: "column",
        gap: 8,
    },
    stepCard: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "12px 12px",
        borderRadius: 10,
        backgroundColor: "rgba(255,255,255,0.05)",
        border: "1px solid transparent",
        cursor: "pointer",
        transition: "border-color 0.15s, background 0.15s",
    },
    stepCardSelected: {
        backgroundColor: "rgba(233,253,151,0.08)",
        border: "1px solid rgba(233,253,151,0.4)",
    },
    stepCardCorrect: {
        backgroundColor: "rgba(74,222,128,0.08)",
        border: "1px solid rgba(74,222,128,0.3)",
        cursor: "default",
    },
    stepCardWrong: {
        backgroundColor: "rgba(248,113,113,0.08)",
        border: "1px solid rgba(248,113,113,0.3)",
        cursor: "default",
    },
    stepNum: {
        width: 28,
        height: 28,
        borderRadius: 7,
        backgroundColor: "rgba(233,253,151,0.12)",
        color: "#E9FD97",
        fontSize: 13,
        fontWeight: 700,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    },
    stepDesc: {
        fontSize: 13,
        fontWeight: 500,
        color: "#fff",
        lineHeight: "140%",
    },
    stepAssigned: {
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        marginTop: 4,
        color: "#E9FD97",
        fontSize: 11,
        fontWeight: 500,
    },
    stepPlaceholder: {
        marginTop: 3,
        fontSize: 11,
        color: "rgba(255,255,255,0.25)",
    },
    clearBtn: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 22,
        height: 22,
        borderRadius: 5,
        border: "none",
        backgroundColor: "rgba(255,255,255,0.08)",
        color: "rgba(255,255,255,0.4)",
        cursor: "pointer",
        padding: 0,
    },
    footer: {
        padding: "12px 16px 16px",
        flexShrink: 0,
        borderTop: "1px solid rgba(255,255,255,0.06)",
    },
    submitBtn: {
        width: "100%",
        padding: "12px",
        borderRadius: 10,
        border: "none",
        backgroundColor: "#E9FD97",
        color: "#1a1a1a",
        fontSize: 14,
        fontWeight: 700,
        cursor: "pointer",
    },
    submitBtnDisabled: {
        backgroundColor: "rgba(233,253,151,0.2)",
        color: "rgba(255,255,255,0.3)",
        cursor: "not-allowed",
    },
    resultRow: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
    },
    scoreText: {
        fontSize: 16,
        fontWeight: 700,
        color: "#E9FD97",
    },
    retryBtn: {
        padding: "10px 20px",
        borderRadius: 10,
        border: "1px solid rgba(233,253,151,0.3)",
        backgroundColor: "transparent",
        color: "#E9FD97",
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
    },
};

export default ChecklistCockpit;
