import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { auth } from "../firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SchoolForm {
  name: string;
  description: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  instagram: string;
}

// ─── CreateSchoolPage ─────────────────────────────────────────────────────────

const CreateSchoolPage: React.FC = () => {
  const navigate = useNavigate();
  const [authReady, setAuthReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Photos
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<SchoolForm>({
    name: "",
    description: "",
    address: "",
    phone: "",
    email: "",
    website: "",
    instagram: "",
  });

  // ─── Auth ────────────────────────────────────────────────────────────────

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) setAuthReady(true);
      else window.location.href = "/auth";
    });
    return () => unsub();
  }, []);

  // ─── Handlers ────────────────────────────────────────────────────────────

  const setField = (key: keyof SchoolForm, value: string) =>
    setForm(p => ({ ...p, [key]: value }));

  const handlePhotoAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setPhotos(p => [...p, ...files]);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => setPhotoPreviews(p => [...p, ev.target?.result as string]);
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const removePhoto = (idx: number) => {
    setPhotos(p => p.filter((_, i) => i !== idx));
    setPhotoPreviews(p => p.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError("School name is required"); return; }

    setSubmitting(true);
    setError(null);

    try {
      // 1. Create school
      const { data: school } = await api.post<{ id: string }>("/school", {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        address: form.address.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        website: form.website.trim() || undefined,
        instagram: form.instagram.trim() || undefined,
      });

      // 2. Upload photos
      for (const file of photos) {
        const fd = new FormData();
        fd.append("file", file);
        const { data: uploadData } = await api.post<{ url: string }>("/storage/upload", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        // Save media link to school (POST /school/:id/media)
        await api.post(`/school/${school.id}/media`, {
          link: uploadData.url,
          type: "PHOTO",
        });
      }

      navigate(`/schools/${school.id}`);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  if (!authReady) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", backgroundColor: "#111", color: "rgba(255,255,255,0.3)", fontFamily: "'DM Sans', sans-serif" }}>
      Loading...
    </div>
  );

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={s.root}>
      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
        input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.25); }
        button { transition: opacity 0.15s; }
        button:hover { opacity: 0.85; }
      `}</style>

      {/* ── Header ── */}
      <div style={s.header}>
        <button style={s.backBtn} onClick={() => navigate("/schools")}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8L10 4" stroke="#E9FD97" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back
        </button>
        <h1 style={s.headerTitle}>Create school</h1>
        <div style={{ flex: 1 }} />
        <button
          style={{ ...s.submitBtn, opacity: submitting ? 0.6 : 1 }}
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? "Creating..." : "Create school"}
          {!submitting && (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" fill="none">
              <path d="M4.1665 9.99935H15.8332M15.8332 9.99935L9.99984 4.16602M15.8332 9.99935L9.99984 15.8327" stroke="#313C01" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      </div>

      {/* ── Content ── */}
      <div style={s.content}>

        {/* Left column — photos */}
        <div style={s.leftCol}>
          <div style={s.sectionLabel}>School photos</div>

          {/* Photo grid */}
          <div style={s.photoGrid}>
            {photoPreviews.map((src, idx) => (
              <div key={idx} style={s.photoThumb}>
                <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <button style={s.photoRemove} onClick={() => removePhoto(idx)}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}

            {/* Add photo button */}
            <button style={s.photoAdd} onClick={() => photoInputRef.current?.click()}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5">
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, marginTop: 4 }}>Add photo</span>
            </button>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: "none" }}
              onChange={handlePhotoAdd}
            />
          </div>

          {/* Preview of first photo */}
          {photoPreviews.length > 0 && (
            <div style={s.mainPhotoPreview}>
              <img src={photoPreviews[0]} alt="Main" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <div style={s.mainPhotoLabel}>Card preview</div>
            </div>
          )}

          {photoPreviews.length === 0 && (
            <div style={s.photoPlaceholder}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
              <span style={{ color: "rgba(255,255,255,0.15)", fontSize: 13, marginTop: 12 }}>
                No photos yet
              </span>
            </div>
          )}
        </div>

        {/* Right column — form */}
        <div style={s.rightCol}>

          {/* Basic info */}
          <div style={s.section}>
            <div style={s.sectionLabel}>Basic information</div>
            <div style={s.form}>
              <Field label="School name *">
                <input
                  style={s.input}
                  value={form.name}
                  onChange={e => setField("name", e.target.value)}
                  placeholder="Fly Czech Academy"
                />
              </Field>
              <Field label="Description">
                <textarea
                  style={s.textarea}
                  value={form.description}
                  onChange={e => setField("description", e.target.value)}
                  placeholder="Tell students about your school, aircraft fleet, training programs..."
                  rows={4}
                />
              </Field>
            </div>
          </div>

          {/* Location */}
          <div style={s.section}>
            <div style={s.sectionLabel}>Location</div>
            <div style={s.form}>
              <Field label="Address">
                <input
                  style={s.input}
                  value={form.address}
                  onChange={e => setField("address", e.target.value)}
                  placeholder="Prague, Czech Republic"
                />
              </Field>
            </div>
          </div>

          {/* Contacts */}
          <div style={s.section}>
            <div style={s.sectionLabel}>Contacts</div>
            <div style={s.form}>
              <div style={s.row}>
                <Field label="Phone">
                  <input
                    style={s.input}
                    value={form.phone}
                    onChange={e => setField("phone", e.target.value)}
                    placeholder="+420 123 456 789"
                  />
                </Field>
                <Field label="Email">
                  <input
                    style={s.input}
                    type="email"
                    value={form.email}
                    onChange={e => setField("email", e.target.value)}
                    placeholder="info@flyschool.cz"
                  />
                </Field>
              </div>
              <div style={s.row}>
                <Field label="Website">
                  <input
                    style={s.input}
                    value={form.website}
                    onChange={e => setField("website", e.target.value)}
                    placeholder="https://flyschool.cz"
                  />
                </Field>
                <Field label="Instagram">
                  <div style={s.inputWithPrefix}>
                    <span style={s.inputPrefix}>@</span>
                    <input
                      style={{ ...s.input, borderRadius: "0 8px 8px 0", borderLeft: "none" }}
                      value={form.instagram}
                      onChange={e => setField("instagram", e.target.value)}
                      placeholder="flyschool"
                    />
                  </div>
                </Field>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={s.errorMsg}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
              </svg>
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Field wrapper ────────────────────────────────────────────────────────────

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
    <label style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontWeight: 500, letterSpacing: "0.5px", textTransform: "uppercase" as const }}>
      {label}
    </label>
    {children}
  </div>
);

// ─── Styles ───────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  root: {
    display: "flex",
    flexDirection: "column",
    width: "100vw",
    height: "100vh",
    backgroundColor: "#111111",
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    color: "#fff",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    padding: "0 32px",
    height: 64,
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    flexShrink: 0,
    backgroundColor: "#151515",
  },
  backBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    backgroundColor: "transparent",
    border: "none",
    color: "#E9FD97",
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
    padding: "6px 10px",
    borderRadius: 8,
    fontFamily: "inherit",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: "#fff",
    margin: 0,
    letterSpacing: "-0.3px",
  },
  submitBtn: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#E9FD97",
    border: "none",
    borderRadius: 10,
    color: "#313C01",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    padding: "10px 20px",
    fontFamily: "inherit",
  },
  content: {
    flex: 1,
    display: "flex",
    gap: 0,
    overflow: "hidden",
  },
  leftCol: {
    width: 280,
    flexShrink: 0,
    padding: 28,
    borderRight: "1px solid rgba(255,255,255,0.06)",
    display: "flex",
    flexDirection: "column",
    gap: 16,
    overflowY: "auto",
    backgroundColor: "#141414",
  },
  rightCol: {
    flex: 1,
    padding: 32,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 32,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: "rgba(255,255,255,0.35)",
    letterSpacing: "1px",
    textTransform: "uppercase",
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  row: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
  },
  input: {
    backgroundColor: "#1e1e1e",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 8,
    padding: "10px 14px",
    color: "#fff",
    fontSize: 14,
    width: "100%",
    fontFamily: "inherit",
    outline: "none",
  },
  textarea: {
    backgroundColor: "#1e1e1e",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 8,
    padding: "10px 14px",
    color: "#fff",
    fontSize: 14,
    width: "100%",
    resize: "vertical" as const,
    fontFamily: "inherit",
    outline: "none",
  },
  inputWithPrefix: {
    display: "flex",
    alignItems: "stretch",
  },
  inputPrefix: {
    backgroundColor: "#1e1e1e",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRight: "none",
    borderRadius: "8px 0 0 8px",
    padding: "10px 10px 10px 14px",
    color: "rgba(255,255,255,0.4)",
    fontSize: 14,
    display: "flex",
    alignItems: "center",
  },
  photoGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
  },
  photoThumb: {
    position: "relative",
    width: "100%",
    paddingBottom: "100%",
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#1e1e1e",
  },
  photoRemove: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: "rgba(0,0,0,0.6)",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    zIndex: 1,
  },
  photoAdd: {
    width: "100%",
    paddingBottom: "100%",
    position: "relative",
    borderRadius: 8,
    border: "1px dashed rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.02)",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  mainPhotoPreview: {
    position: "relative",
    width: "100%",
    height: 160,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#1e1e1e",
    flexShrink: 0,
  },
  mainPhotoLabel: {
    position: "absolute",
    bottom: 8,
    left: 8,
    fontSize: 11,
    color: "rgba(255,255,255,0.5)",
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: "3px 8px",
    borderRadius: 4,
  },
  photoPlaceholder: {
    width: "100%",
    height: 160,
    borderRadius: 12,
    border: "1px dashed rgba(255,255,255,0.06)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  errorMsg: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,100,100,0.08)",
    border: "1px solid rgba(255,100,100,0.2)",
    borderRadius: 8,
    padding: "10px 14px",
    color: "rgba(255,120,120,0.9)",
    fontSize: 13,
  },
};

export default CreateSchoolPage;