import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as THREE from "three";
import api from "../api/axios";
import { auth } from "../firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";

// ─── Types ────────────────────────────────────────────────────────────────────

type AircraftCategory = "SEP" | "MEP" | "TMG" | "SET" | "HELICOPTER";
type AircraftPurpose = "TRAINING" | "PRIVATE" | "COMMERCIAL";
type Tab = "info" | "instruments" | "checklists";

interface Instrument {
    localId: number;
    name: string;
    description: string;
    x: number; // процент 0-100
    y: number; // процент 0-100
    pitch: number; // Three.js угол
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

// ─── Panorama Viewer (Three.js) ───────────────────────────────────────────────

interface PanoramaViewerProps {
    imageUrl: string;
    instruments: Instrument[];
    addingMode: boolean;
    onAddInstrument: (pitch: number, yaw: number, x: number, y: number) => void;
}

const PanoramaViewer: React.FC<PanoramaViewerProps> = ({
    imageUrl, instruments, addingMode, onAddInstrument,
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

    useEffect(() => {
        if (!mountRef.current) return;
        const container = mountRef.current;
        const w = container.offsetWidth || 800;
        const h = container.offsetHeight || 600;

        // Scene
        const scene = new THREE.Scene();
        sceneRef.current = scene;

        // Camera
        const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
        camera.position.set(0, 0, 0.01);
        cameraRef.current = camera;

        // Renderer
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

        // Sphere
        const geometry = new THREE.SphereGeometry(500, 60, 40);
        geometry.scale(-1, 1, 1); // инвертируем чтобы смотреть изнутри
        const texture = new THREE.TextureLoader().load(imageUrl);
        const material = new THREE.MeshBasicMaterial({ map: texture });
        const sphere = new THREE.Mesh(geometry, material);
        scene.add(sphere);

        // Hotspot group
        const hotspotGroup = new THREE.Group();
        scene.add(hotspotGroup);
        hotspotGroupRef.current = hotspotGroup;

        // Animate
        const animate = () => {
            animFrameRef.current = requestAnimationFrame(animate);
            const { phi, theta } = spherical.current;
            camera.lookAt(
                Math.sin(phi) * Math.cos(theta),
                Math.cos(phi),
                Math.sin(phi) * Math.sin(theta)
            );
            renderer.render(scene, camera);
        };
        animate();

        // Resize
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

    // Обновляем hotspot'ы при изменении инструментов
    useEffect(() => {
        if (!hotspotGroupRef.current || !sceneRef.current) return;
        const group = hotspotGroupRef.current;
        while (group.children.length) group.remove(group.children[0]);

        instruments.forEach(inst => {
            const geometry = new THREE.SphereGeometry(4, 16, 16);
            const material = new THREE.MeshBasicMaterial({ color: 0xd4f06a });
            const hotspot = new THREE.Mesh(geometry, material);

            const r = 498;
            hotspot.position.set(
                r * Math.sin(inst.pitch) * Math.cos(inst.yaw),
                r * Math.cos(inst.pitch),
                r * Math.sin(inst.pitch) * Math.sin(inst.yaw)
            );
            group.add(hotspot);
        });
    }, [instruments]);

    // Mouse events
    const handleMouseDown = (e: React.MouseEvent) => {
        isDragging.current = false;
        lastMouse.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (e.buttons !== 1) return;
        const dx = e.clientX - lastMouse.current.x;
        const dy = e.clientY - lastMouse.current.y;
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) isDragging.current = true;
        lastMouse.current = { x: e.clientX, y: e.clientY };

        // sensitivity зависит от FOV — чем меньше FOV, тем медленнее
        const fov = cameraRef.current?.fov ?? 20;
        const sensitivity = (fov / 20) * 0.0004;
        

        spherical.current.theta -= dx * sensitivity;
        spherical.current.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.current.phi - dy * sensitivity));
    };

    const handleClick = (e: React.MouseEvent) => {
        if (!addingMode || isDragging.current || !mountRef.current || !cameraRef.current) return;

        const rect = mountRef.current.getBoundingClientRect();
        const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(nx, ny), cameraRef.current);

        const dir = raycaster.ray.direction.normalize().multiplyScalar(498);
        const pitch = Math.acos(dir.y / 498);
        const yaw = Math.atan2(dir.z, dir.x);

        // Конвертируем в проценты для хранения в БД
        const xPct = ((yaw / (2 * Math.PI)) + 0.5) * 100;
        const yPct = (pitch / Math.PI) * 100;

        onAddInstrument(pitch, yaw, xPct, yPct);
    };

    const handleWheel = (e: React.WheelEvent) => {
        if (!cameraRef.current || !mountRef.current) return;
    
        const camera = cameraRef.current;
        const oldFov = camera.fov;
        const newFov = Math.max(20, Math.min(75, oldFov + e.deltaY * 0.05));
    
        const rect = mountRef.current.getBoundingClientRect();
        const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(nx, ny), camera);
        const mouseDir = raycaster.ray.direction.normalize();
    
        const { phi, theta } = spherical.current;
        const camDir = new THREE.Vector3(
            Math.sin(phi) * Math.cos(theta),
            Math.cos(phi),
            Math.sin(phi) * Math.sin(theta)
        ).normalize();
    
        const zoomFactor = (oldFov - newFov) / oldFov * 0.5;
        const newDir = camDir.clone().lerp(mouseDir, zoomFactor).normalize();
    
        spherical.current.phi = Math.acos(Math.max(-1, Math.min(1, newDir.y)));
        spherical.current.theta = Math.atan2(newDir.z, newDir.x);
    
        camera.fov = newFov;
        camera.updateProjectionMatrix();
    };

    return (
        <div
            ref={mountRef}
            style={{
                width: "100%",
                height: "100%",
                cursor: addingMode ? "crosshair" : "grab",
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onClick={handleClick}
            onWheel={handleWheel}
        />
    );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const CreateCockpitPage: React.FC = () => {
    const navigate = useNavigate();
    const [authReady, setAuthReady] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>("info");
    const [uploading, setUploading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Panorama
    const [panoramaFile, setPanoramaFile] = useState<File | null>(null);
    const [panoramaUrl, setPanoramaUrl] = useState<string | null>(null);

    // Cockpit info
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

    // Checklists
    const [checklists, setChecklists] = useState<Checklist[]>([]);

    // Auth
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (user) => {
            if (user) setAuthReady(true);
            else navigate("/auth");
        });
        return () => unsub();
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setPanoramaFile(file);
        setPanoramaUrl(URL.createObjectURL(file));
    };

    const handleAddInstrument = (pitch: number, yaw: number, x: number, y: number) => {
        setInstruments(prev => [...prev, {
            localId: Date.now(),
            name: "",
            description: "",
            x, y, pitch, yaw,
        }]);
        setAddingMode(false);
        setActiveTab("instruments");
    };

    const handleRemoveInstrument = (localId: number) => {
        setInstruments(prev => prev.filter(i => i.localId !== localId));
        setChecklists(prev => prev.map(cl => ({
            ...cl,
            items: cl.items.filter(item => item.instrumentLocalId !== localId),
        })));
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
            // 1. Загрузка панорамы в GCS
            const formData = new FormData();
            formData.append("file", panoramaFile);
            const { data: uploadData } = await api.post("/storage/upload/panorama", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            const panoramaGcsUrl = uploadData.url;

            // 2. Загрузка описаний инструментов
            const instrumentsPayload = await Promise.all(
                instruments.map(async (inst) => {
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
                })
            );

            // 3. Форматируем чеклисты
            const checklistsPayload = checklists.map(cl => ({
                name: cl.name,
                items: cl.items.map(item => {
                    const instIndex = instruments.findIndex(i => i.localId === item.instrumentLocalId);
                    return {
                        description: item.description,
                        order: item.order,
                        instrumentIndex: instIndex,
                    };
                }),
            }));

            // 4. Создаём кокпит
            await api.post("/cockpits", {
                name,
                manufacturer: manufacturer || undefined,
                model: model || undefined,
                category: category || undefined,
                purpose: purpose || undefined,
                hasVfr,
                hasIfr,
                hasNight,
                hasAutopilot,
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

    if (!authReady) return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", backgroundColor: "#111", color: "rgba(255,255,255,0.3)", fontFamily: "'DM Sans', sans-serif" }}>
            Loading...
        </div>
    );

    return (
        <div style={s.root}>
            <style>{`
        * { box-sizing: border-box; }
        input, select, textarea { outline: none; }
        input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.25); }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
        button { transition: opacity 0.15s; }
        button:hover { opacity: 0.85; }
      `}</style>

            {/* ── Left — Panorama ── */}
            <div style={s.leftPane}>
                {panoramaUrl ? (
                    <>
                        <PanoramaViewer
                            imageUrl={panoramaUrl}
                            instruments={instruments}
                            addingMode={addingMode}
                            onAddInstrument={handleAddInstrument}
                        />
                        {/* Overlay hint */}
                        {addingMode && (
                            <div style={s.addingHint}>
                                Click on the panorama to place instrument
                                <button style={s.cancelBtn} onClick={() => setAddingMode(false)}>Cancel</button>
                            </div>
                        )}
                        {/* Replace panorama button */}
                        <button style={s.replacePanoBtn} onClick={() => fileInputRef.current?.click()}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                            Replace panorama
                        </button>
                    </>
                ) : (
                    <div style={s.uploadArea} onClick={() => fileInputRef.current?.click()}>
                        <div style={s.uploadIcon}>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5">
                                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                                <polyline points="17 8 12 3 7 8" />
                                <line x1="12" y1="3" x2="12" y2="15" />
                            </svg>
                        </div>
                        <div style={s.uploadTitle}>Upload panorama</div>
                        <div style={s.uploadSub}>Equirectangular image (JPG, PNG)</div>
                    </div>
                )}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={handleFileSelect}
                />
            </div>

            {/* ── Right — Panel ── */}
            <div style={s.rightPane}>
                {/* Header */}
                <div style={s.panelHeader}>
                    <button style={s.backBtn} onClick={() => navigate("/cockpits")}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
                    </button>
                    <div>
                        <div style={s.panelTitle}>{name || "New Cockpit"}</div>
                        <div style={s.panelSub}>Creating new cockpit</div>
                    </div>
                </div>

                {/* Tabs */}
                <div style={s.tabs}>
                    {(["info", "instruments", "checklists"] as Tab[]).map(tab => (
                        <button
                            key={tab}
                            style={{ ...s.tab, ...(activeTab === tab ? s.tabActive : {}) }}
                            onClick={() => setActiveTab(tab)}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            {tab === "instruments" && instruments.length > 0 && (
                                <span style={s.badge}>{instruments.length}</span>
                            )}
                            {tab === "checklists" && checklists.length > 0 && (
                                <span style={s.badge}>{checklists.length}</span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Tab content */}
                <div style={s.tabContent}>

                    {/* ── INFO TAB ── */}
                    {activeTab === "info" && (
                        <div style={s.form}>
                            <Field label="Name" value={name} onChange={setName} placeholder="Cockpit name" />
                            <Field label="Manufacturer" value={manufacturer} onChange={setManufacturer} placeholder="Aircraft manufacturer" />
                            <Field label="Model" value={model} onChange={setModel} placeholder="Aircraft model" />

                            <div style={s.fieldGroup}>
                                <label style={s.label}>Category</label>
                                <select
                                    style={s.select}
                                    value={category}
                                    onChange={e => setCategory(e.target.value as AircraftCategory | "")}
                                >
                                    <option value="">— Select —</option>
                                    <option value="SEP">SEP — Single Engine Piston</option>
                                    <option value="MEP">MEP — Multi Engine Piston</option>
                                    <option value="TMG">TMG — Touring Motor Glider</option>
                                    <option value="SET">SET — Single Engine Turbine</option>
                                    <option value="HELICOPTER">Helicopter</option>
                                </select>
                            </div>

                            <div style={s.fieldGroup}>
                                <label style={s.label}>Purpose</label>
                                <select
                                    style={s.select}
                                    value={purpose}
                                    onChange={e => setPurpose(e.target.value as AircraftPurpose | "")}
                                >
                                    <option value="">— Select —</option>
                                    <option value="TRAINING">Training</option>
                                    <option value="PRIVATE">Private</option>
                                    <option value="COMMERCIAL">Commercial</option>
                                </select>
                            </div>

                            <div style={s.fieldGroup}>
                                <label style={s.label}>Equipment</label>
                                <div style={s.togglesGrid}>
                                    <Toggle label="VFR" value={hasVfr} onChange={setHasVfr} />
                                    <Toggle label="IFR" value={hasIfr} onChange={setHasIfr} />
                                    <Toggle label="Night" value={hasNight} onChange={setHasNight} />
                                    <Toggle label="AP" value={hasAutopilot} onChange={setHasAutopilot} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── INSTRUMENTS TAB ── */}
                    {activeTab === "instruments" && (
                        <div style={s.form}>
                            {!panoramaUrl && (
                                <div style={s.notice}>Upload a panorama first to place instruments</div>
                            )}

                            {instruments.length === 0 ? (
                                <div style={s.emptyState}>
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5"><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg>
                                    <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, marginTop: 8 }}>No instruments yet</div>
                                </div>
                            ) : (
                                instruments.map((inst, idx) => (
                                    <div key={inst.localId} style={s.instrumentCard}>
                                        <div style={s.instrumentCardHeader}>
                                            <span style={s.instrumentNum}>#{idx + 1}</span>
                                            <button style={s.removeBtn} onClick={() => handleRemoveInstrument(inst.localId)}>
                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
                                            </button>
                                        </div>
                                        <Field
                                            label="Name *"
                                            value={inst.name}
                                            onChange={v => setInstruments(prev => prev.map(i => i.localId === inst.localId ? { ...i, name: v } : i))}
                                            placeholder="Altimeter"
                                        />
                                        <div style={s.fieldGroup}>
                                            <label style={s.label}>Description</label>
                                            <textarea
                                                style={s.textarea}
                                                value={inst.description}
                                                placeholder="Instrument description..."
                                                onChange={e => setInstruments(prev => prev.map(i => i.localId === inst.localId ? { ...i, description: e.target.value } : i))}
                                                rows={2}
                                            />
                                        </div>
                                    </div>
                                ))
                            )}

                            <button
                                style={{ ...s.addBtn, opacity: panoramaUrl ? 1 : 0.4 }}
                                disabled={!panoramaUrl}
                                onClick={() => { setAddingMode(true); }}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
                                Place instrument on panorama
                            </button>
                        </div>
                    )}

                    {/* ── CHECKLISTS TAB ── */}
                    {activeTab === "checklists" && (
                        <div style={s.form}>
                            {instruments.length === 0 && (
                                <div style={s.notice}>Add instruments first before creating checklists</div>
                            )}

                            {checklists.map((cl, clIdx) => (
                                <div key={cl.localId} style={s.checklistCard}>
                                    <div style={s.checklistCardHeader}>
                                        <input
                                            style={s.checklistNameInput}
                                            value={cl.name}
                                            placeholder="Checklist name..."
                                            onChange={e => setChecklists(prev => prev.map(c => c.localId === cl.localId ? { ...c, name: e.target.value } : c))}
                                        />
                                        <button style={s.removeBtn} onClick={() => setChecklists(prev => prev.filter(c => c.localId !== cl.localId))}>
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
                                        </button>
                                    </div>

                                    {cl.items.map((item, itemIdx) => (
                                        <div key={item.localId} style={s.checklistItemCard}>
                                            <div style={s.checklistItemRow}>
                                                <span style={s.stepNum}>{itemIdx + 1}</span>
                                                <select
                                                    style={{ ...s.select, flex: 1 }}
                                                    value={item.instrumentLocalId}
                                                    onChange={e => setChecklists(prev => prev.map(c => c.localId === cl.localId ? {
                                                        ...c,
                                                        items: c.items.map(it => it.localId === item.localId ? { ...it, instrumentLocalId: Number(e.target.value) } : it)
                                                    } : c))}
                                                >
                                                    {instruments.map(inst => (
                                                        <option key={inst.localId} value={inst.localId}>
                                                            {inst.name || `Instrument ${inst.localId}`}
                                                        </option>
                                                    ))}
                                                </select>
                                                <button style={s.removeBtn} onClick={() => setChecklists(prev => prev.map(c => c.localId === cl.localId ? {
                                                    ...c, items: c.items.filter(it => it.localId !== item.localId)
                                                } : c))}>
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
                                                </button>
                                            </div>
                                            <input
                                                style={{ ...s.input, marginTop: 6 }}
                                                value={item.description}
                                                placeholder="Step description..."
                                                onChange={e => setChecklists(prev => prev.map(c => c.localId === cl.localId ? {
                                                    ...c,
                                                    items: c.items.map(it => it.localId === item.localId ? { ...it, description: e.target.value } : it)
                                                } : c))}
                                            />
                                        </div>
                                    ))}

                                    <button
                                        style={s.addStepBtn}
                                        disabled={instruments.length === 0}
                                        onClick={() => setChecklists(prev => prev.map(c => c.localId === cl.localId ? {
                                            ...c,
                                            items: [...c.items, {
                                                localId: Date.now(),
                                                description: "",
                                                order: (c.items.length + 1) * 10,
                                                instrumentLocalId: instruments[0]?.localId ?? 0,
                                            }]
                                        } : c))}
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
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
                                Add checklist
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={s.panelFooter}>
                    {error && <div style={s.errorMsg}>{error}</div>}
                    <button
                        style={{ ...s.createBtn, opacity: submitting ? 0.6 : 1 }}
                        disabled={submitting}
                        onClick={handleSubmit}
                    >
                        {submitting ? "Creating..." : "Create Cockpit →"}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Small reusable components ────────────────────────────────────────────────

const Field: React.FC<{ label: string; value: string; onChange: (v: string) => void; placeholder?: string }> = ({ label, value, onChange, placeholder }) => (
    <div style={s.fieldGroup}>
        <label style={s.label}>{label}</label>
        <input
            style={s.input}
            value={value}
            placeholder={placeholder}
            onChange={e => onChange(e.target.value)}
        />
    </div>
);

const Toggle: React.FC<{ label: string; value: boolean; onChange: (v: boolean) => void }> = ({ label, value, onChange }) => (
    <button
        style={{ ...s.toggle, ...(value ? s.toggleActive : {}) }}
        onClick={() => onChange(!value)}
    >
        {label}
    </button>
);

// ─── Styles ───────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
    root: {
        display: "flex",
        width: "100vw",
        height: "100vh",
        backgroundColor: "#111",
        fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
        overflow: "hidden",
        color: "#fff",
    },
    leftPane: {
        flex: 1,
        position: "relative",
        backgroundColor: "#0e0e0e",
        overflow: "hidden",
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
        border: "1px dashed rgba(255,255,255,0.15)",
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
    addingHint: {
        position: "absolute",
        top: 16,
        left: "50%",
        transform: "translateX(-50%)",
        backgroundColor: "rgba(212,240,106,0.15)",
        border: "1px solid rgba(212,240,106,0.4)",
        color: "#d4f06a",
        padding: "10px 16px",
        borderRadius: 10,
        fontSize: 13,
        display: "flex",
        alignItems: "center",
        gap: 12,
        backdropFilter: "blur(8px)",
        zIndex: 10,
    },
    cancelBtn: {
        backgroundColor: "rgba(255,255,255,0.1)",
        border: "none",
        color: "#fff",
        padding: "4px 10px",
        borderRadius: 6,
        fontSize: 12,
        cursor: "pointer",
    },
    replacePanoBtn: {
        position: "absolute",
        bottom: 16,
        left: 16,
        display: "flex",
        alignItems: "center",
        gap: 6,
        backgroundColor: "rgba(0,0,0,0.6)",
        border: "1px solid rgba(255,255,255,0.12)",
        color: "rgba(255,255,255,0.6)",
        padding: "8px 14px",
        borderRadius: 8,
        fontSize: 13,
        cursor: "pointer",
        backdropFilter: "blur(8px)",
    },
    rightPane: {
        width: 360,
        flexShrink: 0,
        backgroundColor: "#151515",
        borderLeft: "1px solid rgba(255,255,255,0.06)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
    },
    panelHeader: {
        padding: "20px 20px 16px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex",
        alignItems: "center",
        gap: 12,
        flexShrink: 0,
    },
    backBtn: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: "rgba(255,255,255,0.07)",
        border: "none",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "rgba(255,255,255,0.6)",
        flexShrink: 0,
    },
    panelTitle: {
        fontSize: 16,
        fontWeight: 600,
        color: "#fff",
    },
    panelSub: {
        fontSize: 12,
        color: "rgba(255,255,255,0.35)",
        marginTop: 2,
    },
    tabs: {
        display: "flex",
        padding: "0 20px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        flexShrink: 0,
    },
    tab: {
        flex: 1,
        padding: "12px 0",
        backgroundColor: "transparent",
        border: "none",
        color: "rgba(255,255,255,0.4)",
        fontSize: 13,
        fontWeight: 500,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        borderBottom: "2px solid transparent",
        marginBottom: -1,
    },
    tabActive: {
        color: "#fff",
        borderBottom: "2px solid #d4f06a",
    },
    badge: {
        backgroundColor: "#d4f06a",
        color: "#1a1a1a",
        fontSize: 10,
        fontWeight: 700,
        padding: "1px 6px",
        borderRadius: 10,
    },
    tabContent: {
        flex: 1,
        overflowY: "auto",
    },
    form: {
        padding: "16px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
    },
    fieldGroup: {
        display: "flex",
        flexDirection: "column",
        gap: 6,
    },
    label: {
        fontSize: 12,
        color: "rgba(255,255,255,0.45)",
        fontWeight: 500,
        textTransform: "uppercase" as const,
        letterSpacing: 0.5,
    },
    input: {
        backgroundColor: "#1e1e1e",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 8,
        padding: "10px 12px",
        color: "#fff",
        fontSize: 14,
        width: "100%",
    },
    select: {
        backgroundColor: "#1e1e1e",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 8,
        padding: "10px 12px",
        color: "#fff",
        fontSize: 14,
        width: "100%",
        cursor: "pointer",
    },
    textarea: {
        backgroundColor: "#1e1e1e",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 8,
        padding: "10px 12px",
        color: "#fff",
        fontSize: 14,
        width: "100%",
        resize: "vertical" as const,
        fontFamily: "inherit",
    },
    togglesGrid: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 8,
    },
    toggle: {
        padding: "10px",
        borderRadius: 8,
        backgroundColor: "#1e1e1e",
        border: "1px solid rgba(255,255,255,0.08)",
        color: "rgba(255,255,255,0.5)",
        fontSize: 13,
        fontWeight: 500,
        cursor: "pointer",
    },
    toggleActive: {
        backgroundColor: "rgba(212,240,106,0.12)",
        border: "1px solid rgba(212,240,106,0.3)",
        color: "#d4f06a",
    },
    notice: {
        backgroundColor: "rgba(255,200,100,0.08)",
        border: "1px solid rgba(255,200,100,0.2)",
        color: "rgba(255,200,100,0.8)",
        padding: "10px 12px",
        borderRadius: 8,
        fontSize: 13,
    },
    emptyState: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "32px 0",
    },
    instrumentCard: {
        backgroundColor: "#1a1a1a",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 10,
        padding: "12px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
    },
    instrumentCardHeader: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
    },
    instrumentNum: {
        fontSize: 12,
        color: "rgba(255,255,255,0.3)",
        fontWeight: 600,
    },
    removeBtn: {
        width: 24,
        height: 24,
        borderRadius: 6,
        backgroundColor: "rgba(255,100,100,0.1)",
        border: "none",
        color: "rgba(255,100,100,0.7)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    },
    addBtn: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: "12px",
        borderRadius: 8,
        backgroundColor: "rgba(212,240,106,0.08)",
        border: "1px dashed rgba(212,240,106,0.3)",
        color: "#d4f06a",
        fontSize: 13,
        fontWeight: 500,
        cursor: "pointer",
    },
    checklistCard: {
        backgroundColor: "#1a1a1a",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 10,
        padding: "12px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
    },
    checklistCardHeader: {
        display: "flex",
        alignItems: "center",
        gap: 8,
    },
    checklistNameInput: {
        flex: 1,
        backgroundColor: "transparent",
        border: "none",
        borderBottom: "1px solid rgba(255,255,255,0.1)",
        color: "#fff",
        fontSize: 14,
        fontWeight: 600,
        padding: "4px 0",
    },
    checklistItemCard: {
        backgroundColor: "rgba(255,255,255,0.03)",
        borderRadius: 8,
        padding: "10px",
    },
    checklistItemRow: {
        display: "flex",
        alignItems: "center",
        gap: 8,
    },
    stepNum: {
        fontSize: 11,
        color: "rgba(255,255,255,0.3)",
        fontWeight: 700,
        width: 18,
        flexShrink: 0,
    },
    addStepBtn: {
        backgroundColor: "transparent",
        border: "none",
        color: "rgba(255,255,255,0.35)",
        fontSize: 12,
        cursor: "pointer",
        padding: "4px 0",
        textAlign: "left" as const,
    },
    panelFooter: {
        padding: "16px 20px",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        gap: 10,
    },
    errorMsg: {
        color: "#ff6b6b",
        fontSize: 13,
        textAlign: "center" as const,
    },
    createBtn: {
        width: "100%",
        padding: "14px",
        borderRadius: 10,
        backgroundColor: "#d4f06a",
        border: "none",
        color: "#1a1a1a",
        fontSize: 15,
        fontWeight: 700,
        cursor: "pointer",
    },
};

export default CreateCockpitPage;