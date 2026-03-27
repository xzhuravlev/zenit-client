import { useState } from "react";
import { signInWithPopup, sendSignInLinkToEmail } from "firebase/auth";
import { auth, googleProvider } from "../firebase/firebase";

const PLANE_IMAGE = "/media/plane.png";
const WORLD_MAP_IMAGE = "/media/map.svg";

const translations = {
    English: {
        cardTitle: "Fly with Zenit",
        cardDesc:
            "Lorem ipsum dolor sit amet consectetur. Vitae urna vitae mauris convallis enim orci pellentesque. Velit sed pulvinar dolor risus donec. Est ut ultricies et ultrices. Est donec enim ipsum mattis et mattis tortor fusce pretium.",
        emailLabel: "E-mail",
        emailPlaceholder: "Enter your e-mail",
        nameLabel: "Name",
        namePlaceholder: "Enter your name",
        surnameLabel: "Surname",
        surnamePlaceholder: "Enter your surname",
        rememberMe: "Remember me",
        login: "Log in",
        register: "Create account",
        google: "Continue with Google",
        noAccount: "Don't have an account?",
        hasAccount: "Already have an account?",
        signUp: "Sign up",
        signIn: "Sign in",
        signUpTitle: "Create account",
        signInTitle: "Welcome back",
        emailSentTitle: "Check your inbox",
        emailSentDesc: "We sent a login link to",
        emailSentSub: "Click the link in the email to continue.",
        backToLogin: "Back to login",
        notRegistered: "No account found. Please sign up.",
    },
    Русский: {
        cardTitle: "Летайте с Zenit",
        cardDesc:
            "Lorem ipsum dolor sit amet consectetur. Vitae urna vitae mauris convallis enim orci pellentesque. Velit sed pulvinar dolor risus donec. Est ut ultricies et ultrices. Est donec enim ipsum mattis et mattis tortor fusce pretium.",
        emailLabel: "Эл. почта",
        emailPlaceholder: "Введите вашу почту",
        nameLabel: "Имя",
        namePlaceholder: "Введите ваше имя",
        surnameLabel: "Фамилия",
        surnamePlaceholder: "Введите вашу фамилию",
        rememberMe: "Запомнить меня",
        login: "Войти",
        register: "Создать аккаунт",
        google: "Продолжить через Google",
        noAccount: "Нет аккаунта?",
        hasAccount: "Уже есть аккаунт?",
        signUp: "Зарегистрироваться",
        signIn: "Войти",
        signUpTitle: "Создать аккаунт",
        signInTitle: "С возвращением",
        emailSentTitle: "Проверьте почту",
        emailSentDesc: "Мы отправили ссылку для входа на",
        emailSentSub: "Нажмите на ссылку в письме для продолжения.",
        backToLogin: "Назад",
        notRegistered: "Аккаунт не найден. Пожалуйста, зарегистрируйтесь.",
    },
    Deutsch: {
        cardTitle: "Fliegen mit Zenit",
        cardDesc:
            "Lorem ipsum dolor sit amet consectetur. Vitae urna vitae mauris convallis enim orci pellentesque. Velit sed pulvinar dolor risus donec. Est ut ultricies et ultrices. Est donec enim ipsum mattis et mattis tortor fusce pretium.",
        emailLabel: "E-Mail",
        emailPlaceholder: "E-Mail eingeben",
        nameLabel: "Vorname",
        namePlaceholder: "Vorname eingeben",
        surnameLabel: "Nachname",
        surnamePlaceholder: "Nachname eingeben",
        rememberMe: "Angemeldet bleiben",
        login: "Anmelden",
        register: "Konto erstellen",
        google: "Mit Google fortfahren",
        noAccount: "Noch kein Konto?",
        hasAccount: "Schon ein Konto?",
        signUp: "Registrieren",
        signIn: "Anmelden",
        signUpTitle: "Konto erstellen",
        signInTitle: "Willkommen zurück",
        emailSentTitle: "Posteingang prüfen",
        emailSentDesc: "Wir haben einen Login-Link an",
        emailSentSub: "Klicken Sie auf den Link in der E-Mail.",
        backToLogin: "Zurück",
        notRegistered: "Kein Konto gefunden. Bitte registrieren.",
    },
    Čeština: {
        cardTitle: "Leťte se Zenit",
        cardDesc:
            "Lorem ipsum dolor sit amet consectetur. Vitae urna vitae mauris convallis enim orci pellentesque. Velit sed pulvinar dolor risus donec. Est ut ultricies et ultrices. Est donec enim ipsum mattis et mattis tortor fusce pretium.",
        emailLabel: "E-mail",
        emailPlaceholder: "Zadejte váš e-mail",
        nameLabel: "Jméno",
        namePlaceholder: "Zadejte jméno",
        surnameLabel: "Příjmení",
        surnamePlaceholder: "Zadejte příjmení",
        rememberMe: "Zapamatovat si mě",
        login: "Přihlásit se",
        register: "Vytvořit účet",
        google: "Pokračovat přes Google",
        noAccount: "Nemáte účet?",
        hasAccount: "Již máte účet?",
        signUp: "Registrovat se",
        signIn: "Přihlásit se",
        signUpTitle: "Vytvořit účet",
        signInTitle: "Vítejte zpět",
        emailSentTitle: "Zkontrolujte e-mail",
        emailSentDesc: "Odeslali jsme přihlašovací odkaz na",
        emailSentSub: "Klikněte na odkaz v e-mailu.",
        backToLogin: "Zpět",
        notRegistered: "Účet nenalezen. Prosím zaregistrujte se.",
    },
} as const;

type Lang = keyof typeof translations;
type Mode = "login" | "signup" | "email-sent";

export default function AuthPage() {
    const [email, setEmail] = useState("");
    const [name, setName] = useState("");
    const [surname, setSurname] = useState("");
    const [rememberMe, setRememberMe] = useState(true);
    const [language, setLanguage] = useState<Lang>("English");
    const [mode, setMode] = useState<Mode>("login");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [animating, setAnimating] = useState(false);
    const t = translations[language];

    const switchMode = (toMode: Mode) => {
        if (animating) return;
        setAnimating(true);
        setError(null);
        setTimeout(() => {
            setMode(toMode);
            setName("");
            setSurname("");
            setAnimating(false);
        }, 200);
    };

    const handleLoginSubmit = async () => {
        if (!email) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("http://localhost:3000/auth/check-email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });
            const data = await res.json();
            if (data.exists) {
                // await sendSignInLinkToEmail(auth, email, {
                //   url: window.location.href,
                //   handleCodeInApp: true,
                // });
                await sendSignInLinkToEmail(auth, email, {
                    url: `${window.location.origin}/auth/callback`,
                    handleCodeInApp: true,
                });
                if (rememberMe) localStorage.setItem("emailForSignIn", email);
                switchMode("email-sent");
            } else {
                setError(t.notRegistered);
                switchMode("signup");
            }
        } catch {
            setError("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleSignUp = async () => {
        if (!email || !name || !surname) return;
        setLoading(true);
        setError(null);
        try {
            // await sendSignInLinkToEmail(auth, email, {
            //     url: `${window.location.origin}/auth/callback?name=${encodeURIComponent(name)}&surname=${encodeURIComponent(surname)}`,
            //     handleCodeInApp: true,
            // });
            const callbackUrl = `${window.location.origin}/auth/callback`;
            console.log("Sending magic link with URL:", callbackUrl);
            await sendSignInLinkToEmail(auth, email, {
                url: callbackUrl,
                handleCodeInApp: true,
            });
            localStorage.setItem("emailForSignIn", email);
            localStorage.setItem("signUpName", name);
            localStorage.setItem("signUpSurname", surname);
            switchMode("email-sent");
        } catch {
            setError("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleGoogle = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const token = await result.user.getIdToken();
            await fetch(`${import.meta.env.VITE_API_URL}/auth/google`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
            });
            window.location.href = "/cockpits"; // ← добавить это
        } catch {
            setError("Google authorization error");
        } finally {
            setLoading(false);
        }
    };

    const inputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
        e.target.style.borderColor = "#c8e26a";
    };
    const inputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        e.target.style.borderColor = "rgba(255,255,255,0.15)";
    };

    return (
        <div style={styles.root}>
            <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

            {/* Language Selector */}
            <div style={styles.languageWrapper}>
                <select
                    style={styles.languageSelect}
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as Lang)}
                >
                    <option>English</option>
                    <option>Русский</option>
                    <option>Deutsch</option>
                    <option>Čeština</option>
                </select>
            </div>

            {/* Left Panel */}
            <div style={styles.leftPanel}>
                <div style={styles.imageCardWrapper}>
                    <div style={styles.imageCard}>
                        <img src={PLANE_IMAGE} alt="Airplane in clouds" style={styles.planeImage} />
                        <div style={styles.imageOverlay} />
                        <div style={styles.cardText}>
                            <h1 style={styles.cardTitle}>{t.cardTitle}</h1>
                            <p style={styles.cardDesc}>{t.cardDesc}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Panel */}
            <div style={styles.rightPanel}>
                {WORLD_MAP_IMAGE && (
                    <img src={WORLD_MAP_IMAGE} alt="" style={styles.worldMap} />
                )}

                <div style={styles.formCardWrapper}>
                    <div
                        style={{
                            ...styles.formCard,
                            opacity: animating ? 0 : 1,
                            transform: animating ? "translateY(10px)" : "translateY(0)",
                            transition: "opacity 0.2s ease, transform 0.2s ease",
                        }}
                    >
                        {mode === "email-sent" ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center", textAlign: "center", padding: "8px 0" }}>
                                <div style={{ fontSize: 36 }}>✉️</div>
                                <div style={styles.formTitle}>{t.emailSentTitle}</div>
                                <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, lineHeight: 1.6 }}>
                                    {t.emailSentDesc} <span style={{ color: "#fff", fontWeight: 600 }}>{email}</span>.<br />
                                    {t.emailSentSub}
                                </div>
                                <button style={styles.loginButton} onClick={() => switchMode("login")}>
                                    {t.backToLogin}
                                </button>
                            </div>
                        ) : (
                            <>
                                <div style={styles.formTitle}>
                                    {mode === "signup" ? t.signUpTitle : t.signInTitle}
                                </div>

                                <div style={styles.formGroup}>
                                    <label style={styles.label}>{t.emailLabel}</label>
                                    <input
                                        type="email"
                                        placeholder={t.emailPlaceholder}
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        style={styles.input}
                                        onFocus={inputFocus}
                                        onBlur={inputBlur}
                                        onKeyDown={(e) => e.key === "Enter" && mode === "login" && handleLoginSubmit()}
                                    />
                                </div>

                                {mode === "signup" && (
                                    <>
                                        <div style={styles.formGroup}>
                                            <label style={styles.label}>{t.nameLabel}</label>
                                            <input
                                                type="text"
                                                placeholder={t.namePlaceholder}
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                style={styles.input}
                                                onFocus={inputFocus}
                                                onBlur={inputBlur}
                                            />
                                        </div>
                                        <div style={styles.formGroup}>
                                            <label style={styles.label}>{t.surnameLabel}</label>
                                            <input
                                                type="text"
                                                placeholder={t.surnamePlaceholder}
                                                value={surname}
                                                onChange={(e) => setSurname(e.target.value)}
                                                style={styles.input}
                                                onFocus={inputFocus}
                                                onBlur={inputBlur}
                                            />
                                        </div>
                                    </>
                                )}

                                {mode === "login" && (
                                    <label style={styles.checkboxLabel}>
                                        <div
                                            style={{
                                                ...styles.checkbox,
                                                backgroundColor: rememberMe ? "#c8e26a" : "transparent",
                                                borderColor: rememberMe ? "#c8e26a" : "rgba(255,255,255,0.3)",
                                            }}
                                            onClick={() => setRememberMe(!rememberMe)}
                                        >
                                            {rememberMe && (
                                                <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
                                                    <path d="M1 4L4.5 7.5L11 1" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            )}
                                        </div>
                                        <span style={styles.checkboxText}>{t.rememberMe}</span>
                                    </label>
                                )}

                                {error && <div style={styles.errorText}>{error}</div>}

                                <button
                                    style={{ ...styles.loginButton, opacity: loading ? 0.6 : 1 }}
                                    onClick={mode === "signup" ? handleSignUp : handleLoginSubmit}
                                    disabled={loading}
                                >
                                    {loading ? "..." : mode === "signup" ? t.register : t.login}
                                </button>

                                {mode === "login" && (
                                    <button
                                        style={{ ...styles.googleButton, opacity: loading ? 0.6 : 1 }}
                                        onClick={handleGoogle}
                                        disabled={loading}
                                    >
                                        <svg width="24" height="24" viewBox="0 0 24 24" style={{ marginRight: 8 }} fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M12 8C9.79086 8 8 9.79086 8 12C8 14.2091 9.79086 16 12 16C14.2091 16 16 14.2091 16 12C16 9.79086 14.2091 8 12 8ZM12 8H21.17M3.95 6.06L8.54 14M10.88 21.94L15.46 14M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                        </svg>
                                        {t.google}
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {mode !== "email-sent" && (
                    <div style={styles.signupRow}>
                        <span style={styles.signupText}>
                            {mode === "signup" ? t.hasAccount : t.noAccount}
                        </span>
                        <a
                            href="#"
                            style={styles.signupLink}
                            onClick={(e) => { e.preventDefault(); switchMode(mode === "signup" ? "login" : "signup"); }}
                        >
                            {mode === "signup" ? t.signIn : t.signUp}
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    root: {
        display: "flex",
        width: "100vw",
        height: "100vh",
        backgroundColor: "#141414",
        fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
        overflow: "hidden",
        position: "relative",
    },
    languageWrapper: {
        position: "absolute",
        top: 24,
        right: 32,
        zIndex: 10,
    },
    languageSelect: {
        backgroundColor: "transparent",
        color: "#fff",
        border: "1px solid rgba(255,255,255,0.25)",
        borderRadius: 8,
        padding: "8px 32px 8px 14px",
        fontSize: 14,
        cursor: "pointer",
        appearance: "none",
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='white' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 10px center",
        outline: "none",
    },
    leftPanel: {
        width: "46%",
        padding: "28px 0px 28px 28px",
        display: "flex",
        alignItems: "stretch",
    },
    imageCardWrapper: {
        flex: 1,
        padding: 1,
        borderRadius: 21,
        background: "linear-gradient(to bottom, #323232, #1e1e1e)",
    },
    imageCard: {
        height: "100%",
        borderRadius: 20,
        overflow: "hidden",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
    },
    planeImage: {
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "cover",
    },
    imageOverlay: {
        position: "absolute",
        inset: 0,
        background: "linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.85) 100%)",
    },
    cardText: {
        position: "relative",
        zIndex: 1,
        padding: "0 28px 32px",
    },
    cardTitle: {
        color: "#fff",
        fontSize: 36,
        fontWeight: 700,
        margin: "0 0 14px",
        lineHeight: 1.1,
    },
    cardDesc: {
        color: "rgba(255,255,255,0.75)",
        fontSize: 14,
        lineHeight: 1.65,
        margin: 0,
    },
    rightPanel: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
    },
    worldMap: {
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "cover",
        opacity: 1,
        pointerEvents: "none",
    },
    formCardWrapper: {
        position: "relative",
        zIndex: 2,
        padding: 1,
        borderRadius: 17,
        background: "linear-gradient(to bottom, #323232, #1e1e1e)",
        boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
    },
    formCard: {
        backgroundColor: "#1e1e1e",
        borderRadius: 16,
        padding: "22px 22px",
        width: 380,
        display: "flex",
        flexDirection: "column",
        gap: 16,
    },
    formTitle: {
        color: "#fff",
        fontSize: 20,
        fontWeight: 700,
        marginBottom: 2,
    },
    formGroup: {
        display: "flex",
        flexDirection: "column",
        gap: 8,
    },
    label: {
        color: "#fff",
        fontSize: 14,
        fontWeight: 500,
    },
    input: {
        backgroundColor: "transparent",
        border: "1px solid rgba(255,255,255,0.15)",
        borderRadius: 8,
        padding: "12px 14px",
        color: "#fff",
        fontSize: 14,
        transition: "border-color 0.2s",
        outline: "none",
    },
    checkboxLabel: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        cursor: "pointer",
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 5,
        border: "1.5px solid",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        transition: "all 0.15s",
        cursor: "pointer",
    },
    checkboxText: {
        color: "#fff",
        fontSize: 14,
    },
    loginButton: {
        backgroundColor: "#d4f06a",
        color: "#1a1a1a",
        border: "none",
        borderRadius: 10,
        padding: "15px",
        fontSize: 15,
        fontWeight: 600,
        cursor: "pointer",
        transition: "opacity 0.2s",
        letterSpacing: 0.3,
    },
    errorText: {
        color: "#ff6b6b",
        fontSize: 13,
        textAlign: "center" as const,
    },
    googleButton: {
        backgroundColor: "#3a3d2e",
        color: "#c8e26a",
        border: "none",
        borderRadius: 10,
        padding: "15px",
        fontSize: 15,
        fontWeight: 500,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "opacity 0.2s",
    },
    signupRow: {
        position: "relative",
        zIndex: 2,
        marginTop: 24,
        display: "flex",
        gap: 8,
        alignItems: "center",
    },
    signupText: {
        color: "rgba(255,255,255,0.5)",
        fontSize: 14,
    },
    signupLink: {
        color: "#fff",
        fontSize: 14,
        fontWeight: 600,
        textDecoration: "underline",
        textUnderlineOffset: 3,
        cursor: "pointer",
    },
};