import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as THREE from "three";
import api from "../api/axios";

// ─── Types ────────────────────────────────────────────────────────────────────

type AircraftCategory = "SEP" | "MEP" | "TMG" | "SET" | "HELICOPTER";
type AircraftPurpose = "TRAINING" | "PRIVATE" | "COMMERCIAL";
type Step = 1 | 2 | 3;

interface Instrument {
    localId: number;
    name: string;
    description: string;
    x: number;
    y: number;
    pitch: number;
    yaw: number;
}

interface ChecklistItem {
    localId: number;
    description: string;
    order: number;
    instrumentLocalId: number;
}

interface Checklist {
    localId: number;
    name: string;
    items: ChecklistItem[];
}

// ─── Panorama Viewer ──────────────────────────────────────────────────────────

interface PanoramaViewerProps {
    imageUrl: string;
    instruments: Instrument[];
    addingMode: boolean;
    onAddInstrument: (pitch: number, yaw: number, x: number, y: number) => void;
    onHotspotClick: (instrument: Instrument, screenX: number, screenY: number) => void;
    onDismissTooltip: () => void;
}

const PanoramaViewer: React.FC<PanoramaViewerProps> = ({
    imageUrl, instruments, addingMode, onAddInstrument, onHotspotClick, onDismissTooltip,
}) => {
    const mountRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const isDragging = useRef(false);
    const lastMouse = useRef({ x: 0, y: 0 });
    const spherical = useRef({ phi: Math.PI / 2, theta: 0 });
    const animFrameRef = useRef<number>(0);
    const hotspotGroupRef = useRef<THREE.Group | null>(null);
    const mouseNDC = useRef({ x: 0, y: 0 });

    useEffect(() => {
        if (!mountRef.current) return;
        const container = mountRef.current;
        const w = container.offsetWidth || 800;
        const h = container.offsetHeight || 600;

        const scene = new THREE.Scene();
        sceneRef.current = scene;

        const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
        camera.position.set(0, 0, 0.01);
        cameraRef.current = camera;

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.domElement.style.width = "100%";
        renderer.domElement.style.height = "100%";
        renderer.domElement.style.position = "absolute";
        renderer.domElement.style.top = "0";
        renderer.domElement.style.left = "0";
        renderer.setSize(w, h);
        renderer.setPixelRatio(window.devicePixelRatio);
        mountRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        const geometry = new THREE.SphereGeometry(500, 60, 40);
        geometry.scale(-1, 1, 1);
        const texture = new THREE.TextureLoader().load(imageUrl);
        const material = new THREE.MeshBasicMaterial({ map: texture });
        scene.add(new THREE.Mesh(geometry, material));

        const hotspotGroup = new THREE.Group();
        scene.add(hotspotGroup);
        hotspotGroupRef.current = hotspotGroup;

        const animate = () => {
            animFrameRef.current = requestAnimationFrame(animate);
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
                    (mesh.material as THREE.MeshBasicMaterial).opacity = 0.05 + t * 0.7;
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
            if (mountRef.current && renderer.domElement.parentNode === mountRef.current) {
                mountRef.current.removeChild(renderer.domElement);
            }
        };
    }, [imageUrl]);

    useEffect(() => {
        if (!hotspotGroupRef.current) return;
        const group = hotspotGroupRef.current;
        while (group.children.length) group.remove(group.children[0]);
        instruments.forEach(inst => {
            const geo = new THREE.SphereGeometry(4, 16, 16);
            const mat = new THREE.MeshBasicMaterial({ color: 0xe9fd97, transparent: true, opacity: 0.5 });
            const hotspot = new THREE.Mesh(geo, mat);
            hotspot.userData = { isHotspot: true, instrumentLocalId: inst.localId };
            const r = 498;
            hotspot.position.set(
                r * Math.sin(inst.pitch) * Math.cos(inst.yaw),
                r * Math.cos(inst.pitch),
                r * Math.sin(inst.pitch) * Math.sin(inst.yaw)
            );
            group.add(hotspot);
        });
    }, [instruments]);

    const handleMouseDown = (e: React.MouseEvent) => {
        isDragging.current = false;
        lastMouse.current = { x: e.clientX, y: e.clientY };
        onDismissTooltip();
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
        const sensitivity = (fov / 20) * 0.0004;
        spherical.current.theta -= dx * sensitivity;
        spherical.current.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.current.phi - dy * sensitivity));
    };

    const handleClick = (e: React.MouseEvent) => {
        if (isDragging.current || !mountRef.current || !cameraRef.current) return;
        const rect = mountRef.current.getBoundingClientRect();
        const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(nx, ny), cameraRef.current);

        if (hotspotGroupRef.current) {
            const hits = raycaster.intersectObjects(hotspotGroupRef.current.children);
            const hit = hits.find(h => h.object.userData?.isHotspot);
            if (hit) {
                const inst = instruments.find(i => i.localId === hit.object.userData.instrumentLocalId);
                if (inst) { onHotspotClick(inst, e.clientX, e.clientY); return; }
            }
        }

        if (!addingMode) return;
        const dir = raycaster.ray.direction.normalize().multiplyScalar(498);
        const pitch = Math.acos(dir.y / 498);
        const yaw = Math.atan2(dir.z, dir.x);
        onAddInstrument(pitch, yaw, ((yaw / (2 * Math.PI)) + 0.5) * 100, (pitch / Math.PI) * 100);
    };

    const handleWheel = (e: React.WheelEvent) => {
        if (!cameraRef.current) return;
        const camera = cameraRef.current;
        camera.fov = Math.max(20, Math.min(75, camera.fov + e.deltaY * 0.05));
        camera.updateProjectionMatrix();
    };

    return (
        <div
            ref={mountRef}
            style={{ width: "100%", height: "100%", cursor: addingMode ? "crosshair" : "grab" }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onClick={handleClick}
            onWheel={handleWheel}
        />
    );
};

// ─── Custom Select ────────────────────────────────────────────────────────────

const Select: React.FC<{
    value: string;
    onChange: (v: string) => void;
    options: { value: string; label: string }[];
    placeholder?: string;
    triggerStyle?: React.CSSProperties;
}> = ({ value, onChange, options, placeholder, triggerStyle }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const selected = options.find(o => o.value === value);

    return (
        <div ref={ref} style={{ position: "relative" }}>
            <button style={{ ...sf.selectTrigger, ...triggerStyle }} onClick={() => setOpen(v => !v)}>
                <span style={{ color: selected ? "#fff" : "rgba(255,255,255,0.25)", flex: 1, textAlign: "left" }}>
                    {selected ? selected.label : placeholder}
                </span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{
                    flexShrink: 0,
                    transition: "transform 0.2s ease",
                    transform: open ? "rotate(180deg)" : "rotate(0deg)",
                }}>
                    <path d="M6 9L12 15L18 9" stroke="#E9FD97" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>
            <div style={{
                ...sf.selectMenu,
                opacity: open ? 1 : 0,
                transform: open ? "translateY(0)" : "translateY(-6px)",
                pointerEvents: open ? "all" : "none",
                transition: "opacity 0.18s ease, transform 0.18s ease",
            }}>
                {options.map(o => (
                    <div
                        key={o.value}
                        style={{
                            ...sf.selectMenuItem,
                            color: o.value === value ? "#E9FD97" : "#fff",
                            fontWeight: o.value === value ? 600 : 400,
                        }}
                        onClick={() => { onChange(o.value); setOpen(false); }}
                    >
                        {o.label}
                    </div>
                ))}
            </div>
        </div>
    );
};

// ─── Step Indicator ───────────────────────────────────────────────────────────

const STEPS: { label: string }[] = [
    { label: "Aircraft" },
    { label: "Instruments" },
    { label: "Checklists" },
];

const StepIndicator: React.FC<{ step: Step }> = ({ step }) => (
    <div style={sf.stepper}>
        <div style={{ display: "flex", alignItems: "center", width: "100%", marginBottom: 8 }}>
            {STEPS.map((s, i) => {
                const num = (i + 1) as Step;
                const active = num === step;
                const done = num < step;
                return (
                    <div key={i} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : 0 }}>
                        {/* Square with label absolutely below */}
                        <div style={{ position: "relative" }}>
                            <div style={{
                                ...sf.stepSquare,
                                background: active ? "#E9FD97" : "#444444",
                                border: "2px solid #E9FD97",
                                color: "#FFFFFF",
                            }}>
                                {done ? (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                        <path d="M20 6L9 17L4 12" stroke="#E9FD97" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                ) : <span style={{ color: active ? "#313C01" : "#E9FD97" }}>{num}</span>}
                            </div>
                            <span style={{
                                position: "absolute",
                                top: "calc(100% + 6px)",
                                left: "50%",
                                transform: "translateX(-50%)",
                                fontSize: 14,
                                fontWeight: 400,
                                color: "rgba(255, 255, 255, 0.7)",
                                whiteSpace: "nowrap",
                            }}>{s.label}</span>
                        </div>
                        {i < STEPS.length - 1 && (
                            <div style={{ flex: 1, height: 1, background: "#787971", margin: "0 8px" }} />
                        )}
                    </div>
                );
            })}
        </div>
    </div>
);

// ─── Page ─────────────────────────────────────────────────────────────────────

const CreateCockpit: React.FC = () => {
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [step, setStep] = useState<Step>(1);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Panorama
    const [panoramaFile, setPanoramaFile] = useState<File | null>(null);
    const [panoramaUrl, setPanoramaUrl] = useState<string | null>(null);

    // Aircraft info
    const [name, setName] = useState("");
    const [manufacturer, setManufacturer] = useState("");
    const [model, setModel] = useState("");
    const [category, setCategory] = useState<AircraftCategory | "">("");
    const [purpose, setPurpose] = useState<AircraftPurpose | "">("");
    const [hasVfr, setHasVfr] = useState(true);
    const [hasIfr, setHasIfr] = useState(false);
    const [hasNight, setHasNight] = useState(false);
    const [hasAutopilot, setHasAutopilot] = useState(false);

    // Instruments
    const [instruments, setInstruments] = useState<Instrument[]>([]);
    const [addingMode, setAddingMode] = useState(false);
    const [repositioningId, setRepositioningId] = useState<number | null>(null);
    const [tooltip, setTooltip] = useState<{ instrument: Instrument; x: number; y: number } | null>(null);

    // Checklists
    const [checklists, setChecklists] = useState<Checklist[]>([]);
    const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

    const toggleItemExpand = (localId: number) => {
        setExpandedItems(prev => {
            const next = new Set(prev);
            next.has(localId) ? next.delete(localId) : next.add(localId);
            return next;
        });
    };

    const canGoToStep2 = name.trim() !== "" && panoramaUrl !== null;
    const canGoToStep3 = instruments.length > 0;

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setPanoramaFile(file);
        setPanoramaUrl(URL.createObjectURL(file));
    };

    const handleAddInstrument = (pitch: number, yaw: number, x: number, y: number) => {
        if (repositioningId !== null) {
            setInstruments(prev => prev.map(i => i.localId === repositioningId ? { ...i, x, y, pitch, yaw } : i));
            setRepositioningId(null);
        } else {
            setInstruments(prev => [...prev, { localId: Date.now(), name: "", description: "", x, y, pitch, yaw }]);
        }
        setAddingMode(false);
    };

    const handleRemoveInstrument = (localId: number) => {
        setInstruments(prev => prev.filter(i => i.localId !== localId));
        setChecklists(prev => prev.map(cl => ({
            ...cl,
            items: cl.items.filter(item => item.instrumentLocalId !== localId),
        })));
    };

    const handleNext = () => {
        if (step === 1) {
            if (!name.trim()) { setError("Enter cockpit name"); return; }
            if (!panoramaUrl) { setError("Upload panorama first"); return; }
            setError(null);
            setStep(2);
        } else if (step === 2) {
            setError(null);
            setStep(3);
        }
    };

    const handleSubmit = async () => {
        if (!name) { setError("Enter cockpit name"); return; }
        if (!panoramaFile) { setError("Upload panorama"); return; }
        for (const inst of instruments) {
            if (!inst.name) { setError("Fill all instrument names"); return; }
        }
        setSubmitting(true);
        setError(null);
        try {
            const formData = new FormData();
            formData.append("file", panoramaFile);
            const { data: uploadData } = await api.post("/storage/upload/panorama", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            const instrumentsPayload = await Promise.all(instruments.map(async (inst) => {
                let textUrl: string | null = null;
                if (inst.description) {
                    const { data } = await api.post("/storage/upload/text", { text: inst.description });
                    textUrl = data.url;
                }
                return {
                    name: inst.name,
                    xPos: inst.x,
                    yPos: inst.y,
                    media: textUrl ? [{ link: textUrl, type: "TEXT" }] : [],
                };
            }));

            const checklistsPayload = checklists.map(cl => ({
                name: cl.name,
                items: cl.items.map(item => ({
                    description: item.description,
                    order: item.order,
                    instrumentIndex: instruments.findIndex(i => i.localId === item.instrumentLocalId),
                })),
            }));

            await api.post("/cockpits", {
                name,
                manufacturer: manufacturer || undefined,
                model: model || undefined,
                category: category || undefined,
                purpose: purpose || undefined,
                hasVfr, hasIfr, hasNight, hasAutopilot,
                media: [
                    { link: uploadData.originalUrl, type: "PANORAMA" },
                    { link: uploadData.previewUrl, type: "PREVIEW" },
                ],
                instruments: instrumentsPayload,
                checklists: checklistsPayload.length > 0 ? checklistsPayload : undefined,
            });

            navigate("/cockpits");
        } catch (err: any) {
            setError(err?.response?.data?.message || "Error creating cockpit");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={s.root}>
            <style>{`
                * { box-sizing: border-box; }
                input, select, textarea { outline: none; font-family: inherit; }
                input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.25); }
                ::-webkit-scrollbar { width: 4px; }
                ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
                select option { background: #1a1a19; color: #fff; }
            `}</style>

            {/* Background */}
            <div style={s.bg}>
                {panoramaUrl ? (
                    <>
                        <PanoramaViewer
                            imageUrl={panoramaUrl}
                            instruments={instruments}
                            addingMode={addingMode}
                            onAddInstrument={handleAddInstrument}
                            onHotspotClick={(inst, x, y) => setTooltip({ instrument: inst, x, y })}
                            onDismissTooltip={() => setTooltip(null)}
                        />
                        {tooltip && (
                            <div style={{
                                position: "fixed",
                                left: tooltip.x + 14,
                                top: tooltip.y - 14,
                                background: "#1a1a19",
                                border: "1px solid rgba(233,253,151,0.3)",
                                borderRadius: 10,
                                padding: "10px 14px",
                                zIndex: 50,
                                pointerEvents: "none",
                                boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                                minWidth: 140,
                            }}>
                                <div style={{ fontSize: 15, fontWeight: 600, color: "#fff" }}>{tooltip.instrument.name || "Unnamed"}</div>
                                {tooltip.instrument.description && (
                                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>{tooltip.instrument.description}</div>
                                )}
                            </div>
                        )}
                        {addingMode && (
                            <div style={s.addingHint}>
                                {repositioningId !== null ? "Click to reposition instrument" : "Click on the panorama to place instrument"}
                                <button style={s.cancelAddBtn} onClick={() => { setAddingMode(false); setRepositioningId(null); }}>Cancel</button>
                            </div>
                        )}
                        <button style={s.replaceBtn} onClick={() => fileInputRef.current?.click()}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                <path d="M21 15V16.2C21 17.8802 21 18.7202 20.673 19.362C20.3854 19.9265 19.9265 20.3854 19.362 20.673C18.7202 21 17.8802 21 16.2 21H7.8C6.11984 21 5.27976 21 4.63803 20.673C4.07354 20.3854 3.6146 19.9265 3.32698 19.362C3 18.7202 3 17.8802 3 16.2V15M17 8L12 3M12 3L7 8M12 3V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            Replace panorama
                        </button>
                    </>
                ) : (
                    <div style={s.uploadArea} onClick={() => fileInputRef.current?.click()}>
                        <div style={s.uploadIcon}>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                                <path d="M21 15V16.2C21 17.8802 21 18.7202 20.673 19.362C20.3854 19.9265 19.9265 20.3854 19.362 20.673C18.7202 21 17.8802 21 16.2 21H7.8C6.11984 21 5.27976 21 4.63803 20.673C4.07354 20.3854 3.6146 19.9265 3.32698 19.362C3 18.7202 3 17.8802 3 16.2V15M17 8L12 3M12 3L7 8M12 3V15" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <div style={s.uploadTitle}>Upload panorama</div>
                        <div style={s.uploadSub}>Equirectangular image (JPG, PNG)</div>
                    </div>
                )}
            </div>

            {/* Floating side panel */}
            <div style={s.sidePanel}>
                {/* Header */}
                <div style={s.panelHeader}>
                    <span style={s.panelTitle}>New cockpit</span>
                    <button style={s.closeBtn} onClick={() => navigate("/cockpits")}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M18 6L6 18M6 6L18 18" stroke="#E9FD97" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                </div>

                {/* Step indicator */}
                <StepIndicator step={step} />

                {/* Scrollable content */}
                <div style={s.panelContent}>

                    {/* ── Step 1: Aircraft ── */}
                    {step === 1 && (
                        <div style={s.form}>
                            <div style={s.fieldGroup}>
                                <label style={s.label}>Name</label>
                                <input
                                    style={sf.input}
                                    value={name}
                                    placeholder="Cockpit name"
                                    onChange={e => setName(e.target.value)}
                                />
                            </div>
                            <div style={s.fieldGroup}>
                                <label style={s.label}>Manufacturer</label>
                                <input
                                    style={sf.input}
                                    value={manufacturer}
                                    placeholder="Aircraft manufacturer"
                                    onChange={e => setManufacturer(e.target.value)}
                                />
                            </div>
                            <div style={s.fieldGroup}>
                                <label style={s.label}>Model</label>
                                <input
                                    style={sf.input}
                                    value={model}
                                    placeholder="Aircraft model"
                                    onChange={e => setModel(e.target.value)}
                                />
                            </div>
                            <div style={s.fieldGroup}>
                                <label style={s.label}>Category</label>
                                <Select
                                    value={category}
                                    onChange={v => setCategory(v as AircraftCategory | "")}
                                    placeholder="— Select category —"
                                    options={[
                                        { value: "SEP", label: "SEP — Single Engine Piston" },
                                        { value: "MEP", label: "MEP — Multi Engine Piston" },
                                        { value: "TMG", label: "TMG — Touring Motor Glider" },
                                        { value: "SET", label: "SET — Single Engine Turbine" },
                                        { value: "HELICOPTER", label: "Helicopter" },
                                    ]}
                                />
                            </div>
                            <div style={s.fieldGroup}>
                                <label style={s.label}>Purpose</label>
                                <Select
                                    value={purpose}
                                    onChange={v => setPurpose(v as AircraftPurpose | "")}
                                    placeholder="— Select purpose —"
                                    options={[
                                        { value: "TRAINING", label: "Training" },
                                        { value: "PRIVATE", label: "Private" },
                                        { value: "COMMERCIAL", label: "Commercial" },
                                    ]}
                                />
                            </div>
                            <div style={s.fieldGroup}>
                                <label style={s.label}>Equipment</label>
                                <div style={s.togglesRow}>
                                    {([
                                        { key: "hasVfr", label: "VFR", value: hasVfr, set: setHasVfr },
                                        { key: "hasIfr", label: "IFR", value: hasIfr, set: setHasIfr },
                                        { key: "hasNight", label: "Night", value: hasNight, set: setHasNight },
                                        { key: "hasAutopilot", label: "AP", value: hasAutopilot, set: setHasAutopilot },
                                    ] as const).map(t => (
                                        <button
                                            key={t.key}
                                            style={{ ...sf.toggle, ...(t.value ? sf.toggleActive : {}) }}
                                            onClick={() => t.set(!t.value)}
                                        >
                                            {t.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {!panoramaUrl && (
                                <div style={s.notice}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
                                        <circle cx="12" cy="12" r="10" stroke="rgba(233,253,151,0.5)" strokeWidth="1.5" />
                                        <path d="M12 8v4M12 16h.01" stroke="rgba(233,253,151,0.5)" strokeWidth="2" strokeLinecap="round" />
                                    </svg>
                                    Upload a panorama to proceed to instruments
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Step 2: Instruments ── */}
                    {step === 2 && (
                        <div style={s.form}>
                            {instruments.length === 0 ? (
                                <div style={s.emptyState}>
                                    <svg width="44" height="44" viewBox="0 0 24 24" fill="none">
                                        <circle cx="12" cy="12" r="3" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" />
                                        <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" />
                                    </svg>
                                    <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 16, fontWeight: 600, marginTop: 8 }}>No instruments yet</div>
                                    <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, fontWeight: 600 }}>Click the button below, then click on the panorama</div>
                                </div>
                            ) : (
                                instruments.map((inst) => (
                                    <div key={inst.localId} style={s.instrumentCard}>
                                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                            <input
                                                style={{ ...sf.input, flex: 1, background: "rgba(18, 18, 17, 0.7)" }}
                                                value={inst.name}
                                                placeholder="Name instrument"
                                                onChange={e => setInstruments(prev => prev.map(i => i.localId === inst.localId ? { ...i, name: e.target.value } : i))}
                                            />
                                            <button style={s.instLocateBtn} onClick={() => { setRepositioningId(inst.localId); setAddingMode(true); }}>
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                                    <circle cx="12" cy="12" r="3" stroke="#E9FD97" strokeWidth="1.5" />
                                                    <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="#E9FD97" strokeWidth="1.5" strokeLinecap="round" />
                                                </svg>
                                            </button>
                                            <button style={s.instRemoveBtn} onClick={() => handleRemoveInstrument(inst.localId)}>
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                                    <path d="M9 3H15M3 6H21M19 6L18.2987 16.5193C18.1935 18.0975 18.1409 18.8867 17.8 19.485C17.4999 20.0118 17.0472 20.4353 16.5017 20.6997C15.882 21 15.0911 21 13.5093 21H10.4907C8.90891 21 8.11803 21 7.49834 20.6997C6.95276 20.4353 6.50009 20.0118 6.19998 19.485C5.85911 18.8867 5.8065 18.0975 5.70129 16.5193L5 6M10 10.5V15.5M14 10.5V15.5" stroke="#C00F0C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                </svg>
                                            </button>
                                        </div>
                                        <textarea
                                            style={sf.textarea}
                                            value={inst.description}
                                            placeholder="Description"
                                            rows={2}
                                            onChange={e => setInstruments(prev => prev.map(i => i.localId === inst.localId ? { ...i, description: e.target.value } : i))}
                                        />
                                    </div>
                                ))
                            )}
                            <button style={s.addBtn} onClick={() => setAddingMode(true)}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 5V19M5 12H19" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
                                </svg>
                                Place instrument on panorama
                            </button>
                        </div>
                    )}

                    {/* ── Step 3: Checklists ── */}
                    {step === 3 && (
                        <div style={s.form}>
                            {instruments.length === 0 && (
                                <div style={s.emptyState}>
                                    <svg width="44" height="44" viewBox="0 0 24 24" fill="none">
                                        <circle cx="12" cy="12" r="3" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" />
                                        <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" />
                                    </svg>
                                    <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 16, fontWeight: 600, marginTop: 8 }}>No instruments yet</div>
                                    <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, fontWeight: 600 }}>Add instruments first before creating checklists</div>
                                </div>
                            )}
                            {instruments.length > 0 && checklists.length === 0 && (
                                <div style={s.emptyState}>
                                    <svg width="44" height="44" viewBox="0 0 24 24" fill="none">
                                        <path d="M20 12.5V6.8C20 5.11984 20 4.27976 19.673 3.63803C19.3854 3.07354 18.9265 2.6146 18.362 2.32698C17.7202 2 16.8802 2 15.2 2H8.8C7.11984 2 6.27976 2 5.63803 2.32698C5.07354 2.6146 4.6146 3.07354 4.32698 3.63803C4 4.27976 4 5.11984 4 6.8V17.2C4 18.8802 4 19.7202 4.32698 20.362C4.6146 20.9265 5.07354 21.3854 5.63803 21.673C6.27976 22 7.11984 22 8.8 22H12M14 11H8M10 15H8M16 7H8M14.5 19L16.5 21L21 16.5" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 16, fontWeight: 600, marginTop: 8 }}>No checklists yet</div>
                                    <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, fontWeight: 600 }}>Add your first checklist below</div>
                                </div>
                            )}
                            {checklists.map((cl) => (
                                <div key={cl.localId} style={s.instrumentCard}>
                                    {/* Checklist name row */}
                                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                        <input
                                            style={{ ...sf.input, flex: 1 }}
                                            value={cl.name}
                                            placeholder="Checklist name"
                                            onChange={e => setChecklists(prev => prev.map(c => c.localId === cl.localId ? { ...c, name: e.target.value } : c))}
                                        />
                                        <button style={s.instRemoveBtn} onClick={() => setChecklists(prev => prev.filter(c => c.localId !== cl.localId))}>
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                                <path d="M9 3H15M3 6H21M19 6L18.2987 16.5193C18.1935 18.0975 18.1409 18.8867 17.8 19.485C17.4999 20.0118 17.0472 20.4353 16.5017 20.6997C15.882 21 15.0911 21 13.5093 21H10.4907C8.90891 21 8.11803 21 7.49834 20.6997C6.95276 20.4353 6.50009 20.0118 6.19998 19.485C5.85911 18.8867 5.8065 18.0975 5.70129 16.5193L5 6M10 10.5V15.5M14 10.5V15.5" stroke="#C00F0C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                            </svg>
                                        </button>
                                    </div>
                                    {/* Checklist steps */}
                                    {cl.items.map((item) => {
                                        const isExpanded = expandedItems.has(item.localId);
                                        const instName = instruments.find(i => i.localId === item.instrumentLocalId)?.name || "Instrument";
                                        return (
                                            <div key={item.localId} style={{
                                                background: "rgba(233, 253, 151, 0.18)",
                                                borderRadius: 8,
                                                overflow: "hidden",
                                            }}>
                                                {/* Collapsed header — always visible */}
                                                <div
                                                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 10px 10px 12px", cursor: "pointer" }}
                                                    onClick={() => toggleItemExpand(item.localId)}
                                                >
                                                    <span style={{ flex: 1, fontSize: 14, color: "#E9FD97", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                        {instName}{item.description ? ` — ${item.description}` : ""}
                                                    </span>
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, transition: "transform 0.2s", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}>
                                                        <path d="M6 9L12 15L18 9" stroke="#E9FD97" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                </div>
                                                {/* Expanded content */}
                                                {isExpanded && (
                                                    <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "0 10px 10px" }}>
                                                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                                            <div style={{ flex: 1 }}>
                                                                <Select
                                                                    value={String(item.instrumentLocalId)}
                                                                    onChange={v => setChecklists(prev => prev.map(c => c.localId === cl.localId ? {
                                                                        ...c,
                                                                        items: c.items.map(it => it.localId === item.localId ? { ...it, instrumentLocalId: Number(v) } : it)
                                                                    } : c))}
                                                                    options={instruments.map(inst => ({ value: String(inst.localId), label: inst.name || `Instrument ${inst.localId}` }))}
                                                                    triggerStyle={{ background: "rgba(18, 18, 17, 0.7)" }}
                                                                />
                                                            </div>
                                                            <button style={{ ...s.instRemoveBtn, background: "#E9FD97", }} onClick={() => setChecklists(prev => prev.map(c => c.localId === cl.localId ? {
                                                                ...c, items: c.items.filter(it => it.localId !== item.localId)
                                                            } : c))}>
                                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                                                    <path d="M9 3H15M3 6H21M19 6L18.2987 16.5193C18.1935 18.0975 18.1409 18.8867 17.8 19.485C17.4999 20.0118 17.0472 20.4353 16.5017 20.6997C15.882 21 15.0911 21 13.5093 21H10.4907C8.90891 21 8.11803 21 7.49834 20.6997C6.95276 20.4353 6.50009 20.0118 6.19998 19.485C5.85911 18.8867 5.8065 18.0975 5.70129 16.5193L5 6M10 10.5V15.5M14 10.5V15.5" stroke="#313C01" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                                </svg>
                                                            </button>
                                                        </div>
                                                        <textarea
                                                            style={{ ...sf.textarea, background: "rgba(18, 18, 17, 0.7)" }}
                                                            value={item.description}
                                                            placeholder="Step description"
                                                            rows={2}
                                                            onChange={e => setChecklists(prev => prev.map(c => c.localId === cl.localId ? {
                                                                ...c,
                                                                items: c.items.map(it => it.localId === item.localId ? { ...it, description: e.target.value } : it)
                                                            } : c))}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                    <button
                                        style={s.addBtn}
                                        onClick={() => {
                                            const newId = Date.now();
                                            setChecklists(prev => prev.map(c => c.localId === cl.localId ? {
                                                ...c,
                                                items: [...c.items, {
                                                    localId: newId,
                                                    description: "",
                                                    order: (c.items.length + 1) * 10,
                                                    instrumentLocalId: instruments[0]?.localId ?? 0,
                                                }]
                                            } : c));
                                            setExpandedItems(prev => new Set(prev).add(newId));
                                        }}
                                    >
                                        + Add step
                                    </button>
                                </div>
                            ))}
                            <button
                                style={{ ...s.addBtn, opacity: instruments.length > 0 ? 1 : 0.4 }}
                                disabled={instruments.length === 0}
                                onClick={() => setChecklists(prev => [...prev, { localId: Date.now(), name: "", items: [] }])}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 5V19M5 12H19" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
                                </svg>
                                Add checklist
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={s.panelFooter}>
                    {error && <div style={s.errorMsg}>{error}</div>}
                    <div style={s.footerRow}>
                        {step === 1 ? (
                            <button style={s.cancelBtn} onClick={() => navigate("/cockpits")}>
                                Cancel
                            </button>
                        ) : (
                            <button style={s.cancelBtn} onClick={() => setStep(s => (s - 1) as Step)}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M20 12H4M4 12L10 18M4 12L10 6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
                                </svg>
                                Previous step
                            </button>
                        )}
                        {step < 3 ? (
                            <button
                                style={{
                                    ...s.nextBtn,
                                    opacity: (step === 1 ? canGoToStep2 : canGoToStep3) ? 1 : 0.4,
                                }}
                                onClick={handleNext}
                            >
                                Next step
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M4 12H20M20 12L14 6M20 12L14 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
                                </svg>
                            </button>
                        ) : (
                            <button
                                style={{ ...s.nextBtn, opacity: submitting ? 0.6 : 1 }}
                                disabled={submitting}
                                onClick={handleSubmit}
                            >
                                {submitting ? "Creating..." : "Create"}
                                {!submitting && (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M4 12H20M20 12L14 6M20 12L14 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
                                    </svg>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleFile}
            />
        </div>
    );
};

// ─── Shared field styles ──────────────────────────────────────────────────────

const sf: Record<string, React.CSSProperties> = {
    input: {
        width: "100%",
        background: "#121211",
        border: "1px solid #787971",
        borderRadius: 8,
        color: "#fff",
        fontSize: 14,
        padding: "10px 12px",
    },
    textarea: {
        width: "100%",
        background: "rgba(18, 18, 17, 0.7)",
        border: "1px solid #787971",
        borderRadius: 8,
        color: "#fff",
        fontSize: 14,
        padding: "10px 12px",
        resize: "vertical" as const,
    },
    selectTrigger: {
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 8,
        background: "#121211",
        border: "1px solid #787971",
        borderRadius: 8,
        color: "#fff",
        fontSize: 14,
        padding: "10px 12px",
        cursor: "pointer",
        textAlign: "left" as const,
    },
    selectMenu: {
        position: "absolute" as const,
        top: "calc(100% + 4px)",
        left: 0,
        right: 0,
        background: "#1A1A19",
        border: "1px solid #393A36",
        borderRadius: 8,
        overflow: "hidden",
        zIndex: 20,
    },
    selectMenuItem: {
        padding: "10px 14px",
        fontSize: 14,
        cursor: "pointer",
    },
    toggle: {
        flex: 1,
        padding: "7px 0",
        borderRadius: 8,
        border: "1px solid #393A36",
        background: "transparent",
        color: "rgba(255,255,255,0.4)",
        fontSize: 13,
        cursor: "pointer",
    },
    toggleActive: {
        background: "rgba(233,253,151,0.1)",
        border: "1px solid rgba(233,253,151,0.4)",
        color: "#E9FD97",
    },
    stepper: {
        display: "flex",
        alignItems: "center",
        padding: "0px 16px 16px",
        width: "100%",
        margin: "12px 0px",
    },
    stepRow: {
        display: "flex",
        alignItems: "center",
        flex: 1,
        minWidth: 0,
    },
    stepSquare: {
        width: 28,
        height: 28,
        padding: 4,
        borderRadius: 8,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 16,
        fontWeight: 600,
        flexShrink: 0,
        marginLeft: 16,
        marginRight: 16,
    },
    stepLine: {
        flex: 1,
        height: 1,
        margin: "0 8px",
    },
};

// ─── Page styles ──────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
    root: {
        position: "fixed",
        inset: 0,
        overflow: "hidden",
        fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
        color: "#fff",
    },
    bg: {
        position: "absolute",
        inset: 0,
        backgroundColor: "#0e0e0e",
    },
    uploadArea: {
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        gap: 12,
    },
    uploadIcon: {
        width: 72,
        height: 72,
        borderRadius: 20,
        backgroundColor: "rgba(255,255,255,0.05)",
        border: "2px dashed rgba(255,255,255,0.15)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },
    uploadTitle: {
        fontSize: 16,
        fontWeight: 600,
        color: "rgba(255,255,255,0.7)",
    },
    uploadSub: {
        fontSize: 13,
        color: "rgba(255,255,255,0.3)",
    },
    replaceBtn: {
        position: "absolute",
        bottom: 32,
        left: 32,
        display: "flex",
        alignItems: "center",
        gap: 8,
        background: "rgba(18,18,17,0.8)",
        border: "1px solid #393A36",
        borderRadius: 8,
        color: "rgba(255,255,255,0.7)",
        fontSize: 13,
        padding: "8px 14px",
        cursor: "pointer",
    },
    addingHint: {
        position: "absolute",
        top: 16,
        left: "50%",
        transform: "translateX(-50%)",
        background: "rgba(18,18,17,0.9)",
        border: "1px solid rgba(233,253,151,0.3)",
        borderRadius: 10,
        padding: "10px 16px",
        fontSize: 13,
        color: "rgba(255,255,255,0.8)",
        display: "flex",
        alignItems: "center",
        gap: 12,
        zIndex: 10,
        whiteSpace: "nowrap",
    },
    cancelAddBtn: {
        background: "transparent",
        border: "1px solid #393A36",
        borderRadius: 6,
        color: "rgba(255,255,255,0.5)",
        fontSize: 12,
        padding: "4px 10px",
        cursor: "pointer",
    },
    sidePanel: {
        position: "absolute",
        top: 32,
        right: 32,
        bottom: 32,
        width: 412,
        borderRadius: 16,
        border: "1px solid #393A36",
        background: "rgba(18, 18, 17, 0.90)",
        backdropFilter: "blur(5px)",
        WebkitBackdropFilter: "blur(5px)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
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
    panelContent: {
        flex: 1,
        overflowY: "auto",
        padding: "0 16px",
    },
    form: {
        display: "flex",
        flexDirection: "column",
        gap: 14,
        paddingBottom: 16,
    },
    fieldGroup: {
        display: "flex",
        flexDirection: "column",
        gap: 4,
    },
    label: {
        fontSize: 16,
        fontWeight: 400,
        color: "#FFFFFF",
    },
    togglesRow: {
        display: "flex",
        gap: 8,
    },
    notice: {
        display: "flex",
        alignItems: "flex-start",
        gap: 8,
        fontSize: 12,
        color: "rgba(233,253,151,0.6)",
        background: "rgba(233,253,151,0.05)",
        border: "1px solid rgba(233,253,151,0.15)",
        borderRadius: 8,
        padding: "10px 12px",
    },
    emptyState: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "32px 0",
        gap: 4,
    },
    instrumentCard: {
        background: "rgba(255,255,255,0.05)",
        border: "none",
        borderRadius: 8,
        padding: 12,
        display: "flex",
        flexDirection: "column",
        gap: 12,
    },
    instrumentCardHeader: {
        display: "flex",
        justifyContent: "flex-end",
    },
    instrumentNum: {
        fontSize: 11,
        color: "rgba(255,255,255,0.3)",
        fontWeight: 500,
    },
    removeBtn: {
        width: 32,
        height: 32,
        borderRadius: 6,
        background: "rgba(192, 15, 12, 0.2)",
        border: "none",
        cursor: "pointer",
        color: "#C00F0C",// rgba(192, 15, 12, 0.25)
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        padding: 0,
    },

    // removeBtn: {
    //     width: 32,
    //     height: 32,
    //     borderRadius: 6,
    //     background: "rgba(192, 15, 12, 0.2)",
    //     border: "none",
    //     cursor: "pointer",
    //     color: "#C00F0C",// rgba(192, 15, 12, 0.25)
    //     display: "flex",
    //     alignItems: "center",
    //     justifyContent: "center",
    //     flexShrink: 0,
    //     padding: 0,
    // },
    instLocateBtn: {
        width: 32,
        height: 32,
        aspectRatio: "1",
        borderRadius: 8,
        background: "rgba(233, 253, 151, 0.18)",
        border: "none",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        padding: 0,
    },
    instRemoveBtn: {
        width: 32,
        height: 32,
        aspectRatio: "1",
        borderRadius: 8,
        background: "rgba(192, 15, 12, 0.18)",
        border: "none",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        padding: 0,
    },
    addBtn: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: "12px 0",
        borderRadius: 8,
        border: "2px dashed rgba(233, 253, 151, 0.4)",
        background: "transparent",
        color: "#E9FD97",
        fontSize: 16,
        fontWeight: 600,
        cursor: "pointer",
        width: "100%",
    },
    checklistItem: {
        display: "flex",
        alignItems: "flex-start",
        gap: 8,
        paddingTop: 4,
    },
    panelFooter: {
        padding: 16,
        borderTop: "1px solid #2a2a28",
        display: "flex",
        flexDirection: "column",
        gap: 10,
    },
    errorMsg: {
        fontSize: 12,
        color: "#ff6b6b",
        padding: "8px 12px",
        background: "rgba(255,107,107,0.1)",
        borderRadius: 8,
        border: "1px solid rgba(255,107,107,0.2)",
    },
    footerRow: {
        display: "flex",
        gap: 8,
        alignItems: "center",
    },
    cancelBtn: {
        flex: 1,
        padding: "10px 0",
        borderRadius: 8,
        border: "1px solid #393A36",
        background: "transparent",
        color: "rgba(255,255,255,0.5)",
        fontSize: 16,
        fontWeight: 400,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
    },
    draftBtn: {
        flex: 1.5,
        padding: "10px 0",
        borderRadius: 8,
        border: "1px solid #393A36",
        background: "rgba(255,255,255,0.05)",
        color: "rgba(255,255,255,0.7)",
        fontSize: 14,
        cursor: "pointer",
    },
    nextBtn: {
        flex: 1.5,
        padding: "10px 0",
        borderRadius: 8,
        border: "none",
        background: "#E9FD97",
        color: "#1a1f00",
        fontSize: 16,
        fontWeight: 400,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
    },
};

export default CreateCockpit;
