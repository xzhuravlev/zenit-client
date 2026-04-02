import React from "react";

// ─── Asset URLs (Figma node 377:1989) ───────────────────────────────────────
const imgZenitLogo       = "https://www.figma.com/api/mcp/asset/901b9253-ddf1-4232-b200-840d795e0f97";
const imgFlyBeyond       = "https://www.figma.com/api/mcp/asset/3d96fec5-a04b-4866-b281-3903ffc474be";
const imgArrowRightHero  = "https://www.figma.com/api/mcp/asset/fc24f43a-cd16-4d65-96a1-a76ec3fc77e4";
const imgArrowRightBrand = "https://www.figma.com/api/mcp/asset/e47a7952-fdf9-4059-962c-ebaa37cd184a";
const imgAppRightPanel   = "https://www.figma.com/api/mcp/asset/e114d841-07ad-464d-8c8a-6bad49d67564";
const imgIconSchool      = "https://www.figma.com/api/mcp/asset/e51835fd-f5eb-48ac-a807-c3485ed43f82";
const imgIconCrown       = "https://www.figma.com/api/mcp/asset/f30ee8f5-fb6e-47a6-ba1d-28197476c14b";
const imgIconTravel      = "https://www.figma.com/api/mcp/asset/06e4231e-a394-46e8-bfd5-b81e2448d829";
const imgIconVilla       = "https://www.figma.com/api/mcp/asset/3636ce32-c6ff-4f96-b1d6-18f9ec40f077";
const imgRolesPlaceholder= "https://www.figma.com/api/mcp/asset/9789597a-5ac9-417e-87b7-5f77408a2d13";
const imgPricingDivider  = "https://www.figma.com/api/mcp/asset/838ccbfe-7132-48d6-a4d6-462891c56a46";
const imgPricingDividerF = "https://www.figma.com/api/mcp/asset/7bf04000-79c2-4adb-8844-321444fbb50a";
const imgPricingArrow    = "https://www.figma.com/api/mcp/asset/8225f1fe-d590-4c62-b95e-e18319653444";
const imgPricingArrowF   = "https://www.figma.com/api/mcp/asset/534c70c0-2563-4df7-afb1-58dd7c93bd52";
const imgFlightSchoolPic = "https://www.figma.com/api/mcp/asset/70b09d57-b288-4029-b425-0da886ae291f";
const imgVoucherIcon     = "https://www.figma.com/api/mcp/asset/2b4abfa9-4a59-4d9c-9cad-990e0692c74c";
const imgCtaIcon         = "https://www.figma.com/api/mcp/asset/0f6dcc3b-2a84-4ccd-8461-31f3fe5f45a4";
const imgFooterLogo      = "https://www.figma.com/api/mcp/asset/09aa5b01-f950-42ca-b665-7098d4855ae4";
const imgFooterFlyBeyond = "https://www.figma.com/api/mcp/asset/dbe01ce6-5672-4b5f-95fa-4f22152830a3";
const imgFooterX         = "https://www.figma.com/api/mcp/asset/917525b8-f726-413a-8b49-f4625bd036bb";
const imgFooterInstagram = "https://www.figma.com/api/mcp/asset/b97bae0e-3754-4a61-b46c-1886f7e3771f";
const imgFooterYoutube   = "https://www.figma.com/api/mcp/asset/1715528b-aea0-44e1-b658-ef198cc3c9e3";
const imgFooterLinkedin  = "https://www.figma.com/api/mcp/asset/23d31302-cfea-4bb3-b682-d18f8ef36761";

// ─── Design tokens (from Figma) ──────────────────────────────────────────────
const C = {
  bgDefault:   "#121211",
  bgSecondary: "#1a1a19",
  bgCard:      "rgba(26,26,25,0.8)",
  bgActive:    "#272725",
  bgBrandSec:  "rgba(233,253,151,0.18)",
  accent:      "#e9fd97",
  accentText:  "#313c01",
  borderCard:  "#7b7b74",
  borderNeutral: "#393a36",
  borderBrand: "#e9fd97",
  textPrimary: "#ffffff",
  textSecondary: "rgba(255,255,255,0.7)",
  textTertiary: "rgba(255,255,255,0.4)",
  textNeutral: "#e3e3e3",
} as const;

// ─── Sub-components ──────────────────────────────────────────────────────────

function BtnPrimary({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <button style={{ ...s.btnPrimary, ...style }}>
      {children}
    </button>
  );
}

function BtnBrandSecondary({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <button style={{ ...s.btnBrandSec, ...style }}>
      {children}
    </button>
  );
}

function BtnSubtle({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <button style={{ ...s.btnSubtle, ...style }}>
      {children}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Welcome() {
  return (
    <div style={s.page}>

      {/* ═══ NAVBAR ═══════════════════════════════════════════════════════════ */}
      <nav style={s.nav}>
        <div style={s.navInner}>
          {/* Logo */}
          <div style={s.navBrand}>
            <img src={imgZenitLogo} alt="ZENIT" style={s.navLogoImg} />
            <img src={imgFlyBeyond} alt="fly beyond" style={s.navTaglineImg} />
          </div>

          {/* Nav links */}
          <div style={s.navLinks}>
            {["How it works", "Why it matters", "Who ZENIT is built for", "Roles and features", "Pricing"].map((label) => (
              <a key={label} href={`#${label.toLowerCase().replace(/\s+/g, "-")}`} style={s.navLink}>
                {label}
              </a>
            ))}
          </div>

          {/* Auth buttons */}
          <div style={s.navActions}>
            <BtnSubtle>Sign up</BtnSubtle>
            <BtnBrandSecondary>Log in</BtnBrandSecondary>
          </div>
        </div>
      </nav>

      {/* ═══ HERO ═════════════════════════════════════════════════════════════ */}
      <section style={s.hero}>
        <div style={s.heroText}>
          <h1 style={s.heroHeading}>
            <span style={{ display: "block" }}>Master your cockpit.</span>
            <span style={{ display: "block" }}>Anywhere, anytime.</span>
          </h1>
          <p style={s.heroSub}>
            Turn your everyday device into an interactive cockpit trainer for
            safer, more confident flights in any aircraft you fly.
          </p>
          <div style={s.heroCtas}>
            <BtnPrimary>
              Start training as a pilot
              <img src={imgArrowRightHero} alt="" style={s.btnIcon} />
            </BtnPrimary>
            <BtnBrandSecondary>For flight schools</BtnBrandSecondary>
          </div>
        </div>
        <div style={s.heroAppWrap}>
          <img src={imgAppRightPanel} alt="ZENIT app" style={s.heroAppImg} />
        </div>
      </section>

      {/* ═══ BENEFITS ═════════════════════════════════════════════════════════ */}
      <section style={s.section}>
        <div style={s.inner}>
          <div style={s.benefitsGrid}>
            {[
              {
                title: "Train real cockpit flows",
                body: "Practice the exact sequence of switches and controls in the cockpit layout you actually fly.\nNo guessing and no paper diagrams.",
              },
              {
                title: "Build true muscle memory",
                body: "Practice the exact sequence of switches and controls in the cockpit layout you actually fly.\nNo guessing and no paper diagrams.",
              },
              {
                title: "Reduce training costs",
                body: "Move a large part of your cockpit practice from the air to the ground.\nRepeat flows as many times as you want.",
              },
            ].map(({ title, body }) => (
              <div key={title} style={s.benefitCard}>
                <p style={s.cardHeading}>{title}</p>
                <div style={s.cardBody}>
                  {body.split("\n").map((line, i) => (
                    <p key={i} style={{ margin: 0, lineHeight: 1.4 }}>{line}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ════════════════════════════════════════════════════ */}
      <section id="how-it-works" style={s.section}>
        <div style={s.inner}>
          <div style={s.howGrid}>
            {/* Left: steps */}
            <div style={s.howLeft}>
              <p style={s.sectionLabel}>How it works</p>
              <h2 style={s.sectionHeading}>Four steps to cockpit mastery</h2>
              <div style={s.stepsCol}>
                {/* Active step */}
                <div style={s.stepActive}>
                  <p style={s.cardHeading}>Choose your aircraft</p>
                  <p style={{ ...s.cardBody, margin: 0 }}>
                    Select a cockpit that matches the aircraft you fly — created by your school, club or other pilots.
                  </p>
                </div>
                {/* Inactive steps */}
                {[
                  { title: "Select a scenario", body: "Normal procedures, abnormal situations or emergency flows." },
                  { title: "Fly the flow", body: "Tap the real cockpit controls in the correct order and receive instant feedback." },
                  { title: "Repeat until it's automatic", body: "Five minutes a day keeps your cockpit flows fresh — so you don't hesitate in the air." },
                ].map(({ title, body }) => (
                  <div key={title} style={s.stepInactive}>
                    <p style={s.cardHeading}>{title}</p>
                    <p style={{ ...s.cardBody, margin: 0 }}>{body}</p>
                  </div>
                ))}
              </div>
            </div>
            {/* Right: app screenshot */}
            <div style={s.howRight}>
              <img src={imgAppRightPanel} alt="ZENIT app interface" style={s.howAppImg} />
            </div>
          </div>
        </div>
      </section>

      {/* ═══ WHY IT MATTERS ══════════════════════════════════════════════════ */}
      <section id="why-it-matters" style={s.sectionDark}>
        <div style={s.inner}>
          <div style={s.whyGrid}>
            <div style={s.whyLeft}>
              <p style={s.sectionLabel}>Why it matters</p>
              <h2 style={s.sectionHeading}>
                Human error is the leading cause of aviation incidents.
              </h2>
              <p style={s.bodyText}>
                Most mistakes happen when pilots don't have procedures memorized — they hesitate,
                skip steps, or act from habit instead of training. ZENIT helps you internalize the
                right flows before you ever leave the ground.
              </p>
              <button style={s.whyCta}>
                Read the research
                <img src={imgArrowRightBrand} alt="" style={s.btnIcon} />
              </button>
            </div>
            <div style={s.whyRight}>
              {[
                { value: "80%", label: "of aviation accidents involve human factors" },
                { value: "3×", label: "faster flow retention versus paper checklists" },
                { value: "5 min", label: "per day keeps your procedures current" },
              ].map(({ value, label }) => (
                <div key={value} style={s.statCard}>
                  <p style={s.statValue}>{value}</p>
                  <p style={s.statLabel}>{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ WHO ZENIT IS BUILT FOR ══════════════════════════════════════════ */}
      <section id="who-zenit-is-built-for" style={s.section}>
        <div style={s.inner}>
          <p style={s.sectionLabel}>Who ZENIT is built for</p>
          <h2 style={s.sectionHeading}>Built for every stage of your flying journey</h2>
          <div style={s.audienceGrid}>
            {[
              {
                icon: imgIconSchool,
                title: "Student pilots",
                body: "Build correct habits from day one. Arrive at each lesson having already practiced the flows — and make the most of every hour in the air.",
              },
              {
                icon: imgIconCrown,
                title: "Private & club pilots",
                body: "Stay sharp between flights. Refresh your flows after a break, transition to a new type, or simply keep your skills from fading.",
              },
              {
                icon: imgIconTravel,
                title: "Professional pilots",
                body: "Maintain recurrency across multiple types. Detailed session logs for every flow you practice, ready for your instructor or examiner.",
              },
              {
                icon: imgIconVilla,
                title: "Flight schools & fleet owners",
                body: "Equip your students with a cockpit they can practice on 24/7. Assign cockpits, track progress, and reduce your fleet's wet time.",
              },
            ].map(({ icon, title, body }) => (
              <div key={title} style={s.audienceCard}>
                <img src={icon} alt="" style={s.audienceIcon} />
                <p style={s.cardHeading}>{title}</p>
                <p style={s.cardBodySmall}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ ROLES AND FEATURES ══════════════════════════════════════════════ */}
      <section id="roles-and-features" style={s.sectionDark}>
        <div style={s.inner}>
          <p style={s.sectionLabel}>Roles and features</p>
          <h2 style={s.sectionHeading}>One platform, every perspective</h2>
          <div style={s.rolesGrid}>
            {[
              {
                role: "Pilot",
                title: "Train on your own terms",
                body: "Access your assigned cockpits, run through flows at your pace, and review every session in detail.",
                features: ["Interactive checklist runner", "Session history & scoring", "Offline mode on any device", "Progress sharing with instructor"],
                accent: false,
              },
              {
                role: "Creator · Instructor",
                title: "Build and assign cockpits",
                body: "Create custom cockpit configurations, upload your SOPs, and assign them to individual students or entire groups.",
                features: ["Cockpit builder", "Student management", "Progress reports & session logs", "Custom flow authoring"],
                accent: true,
              },
              {
                role: "Flight school · Fleet",
                title: "Manage at scale",
                body: "Organisation-level dashboards, multi-aircraft libraries, and billing that scales with your operation.",
                features: ["Fleet cockpit library", "Instructor accounts", "Organisation analytics", "Bulk student enrollment"],
                accent: false,
              },
            ].map(({ role, title, body, features, accent }) => (
              <div key={role} style={accent ? { ...s.roleCard, ...s.roleCardAccent } : s.roleCard}>
                <div style={s.rolesImageWrap}>
                  <img src={imgRolesPlaceholder} alt="" style={s.rolesImage} />
                </div>
                <div style={s.roleContent}>
                  <span style={accent ? s.roleTagAccent : s.roleTag}>{role}</span>
                  <p style={s.cardHeading}>{title}</p>
                  <p style={s.cardBodySmall}>{body}</p>
                  <ul style={s.featureList}>
                    {features.map((f) => (
                      <li key={f} style={s.featureItem}>
                        <span style={s.featureDot} />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ PRICING ═════════════════════════════════════════════════════════ */}
      <section id="pricing" style={s.section}>
        <div style={s.inner}>
          <p style={s.sectionLabel}>Pricing</p>
          <h2 style={s.sectionHeading}>Simple, transparent plans</h2>
          <div style={s.pricingGrid}>
            {/* Occasional pilot */}
            <div style={s.pricingCard}>
              <p style={s.planName}>Occasional pilot</p>
              <p style={s.planPrice}>199 <span style={s.planCurrency}>CZK / mo</span></p>
              <p style={s.planDesc}>For pilots who fly a few times a year and want to stay prepared.</p>
              <img src={imgPricingDivider} alt="" style={s.pricingDivider} />
              <ul style={s.planFeatures}>
                {["Up to 3 cockpits", "Unlimited sessions", "Session history", "Offline mode"].map((f) => (
                  <li key={f} style={s.planFeatureItem}>{f}</li>
                ))}
              </ul>
              <button style={s.pricingCta}>
                Get started
                <img src={imgPricingArrow} alt="" style={s.btnIcon} />
              </button>
            </div>

            {/* Student pilot — featured */}
            <div style={{ ...s.pricingCard, ...s.pricingCardFeatured }}>
              <p style={{ ...s.planName, color: C.accent }}>Student pilot</p>
              <p style={{ ...s.planPrice, color: C.accent }}>399 <span style={{ ...s.planCurrency, color: C.accent }}>CZK / mo</span></p>
              <p style={s.planDesc}>For active students and pilots who fly regularly and want to improve faster.</p>
              <img src={imgPricingDividerF} alt="" style={s.pricingDivider} />
              <ul style={s.planFeatures}>
                {["Unlimited cockpits", "Unlimited sessions", "Session history & scoring", "Offline mode", "Share progress with instructor"].map((f) => (
                  <li key={f} style={s.planFeatureItem}>{f}</li>
                ))}
              </ul>
              <button style={{ ...s.pricingCta, ...s.pricingCtaFeatured }}>
                Get started
                <img src={imgPricingArrowF} alt="" style={s.btnIcon} />
              </button>
            </div>

            {/* Active pilot */}
            <div style={s.pricingCard}>
              <p style={s.planName}>Active pilot</p>
              <p style={s.planPrice}>799 <span style={s.planCurrency}>CZK / mo</span></p>
              <p style={s.planDesc}>For professionals and instructors who need full access and detailed analytics.</p>
              <img src={imgPricingDivider} alt="" style={s.pricingDivider} />
              <ul style={s.planFeatures}>
                {["Unlimited cockpits", "Unlimited sessions", "Full session analytics", "Offline mode", "Instructor tools", "Priority support"].map((f) => (
                  <li key={f} style={s.planFeatureItem}>{f}</li>
                ))}
              </ul>
              <button style={s.pricingCta}>
                Get started
                <img src={imgPricingArrow} alt="" style={s.btnIcon} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FLIGHT SCHOOLS ══════════════════════════════════════════════════ */}
      <section style={s.sectionDark}>
        <div style={s.inner}>
          <div style={s.schoolsGrid}>
            {/* Photo card */}
            <div style={s.schoolCard}>
              <img src={imgFlightSchoolPic} alt="Flight school cockpit" style={s.schoolPhoto} />
              <div style={s.schoolOverlay}>
                <div style={s.schoolIcon}>
                  <img src={imgIconVilla} alt="" style={{ width: 24, height: 24, objectFit: "contain" }} />
                </div>
                <p style={{ ...s.cardHeading, margin: 0 }}>For flight schools & fleet owners</p>
                <p style={s.cardBodySmall}>
                  Equip every student with a cockpit available 24/7. Track their progress,
                  assign aircraft, and cut wet-aircraft costs across your entire operation.
                </p>
                <BtnBrandSecondary>Talk to us</BtnBrandSecondary>
              </div>
            </div>

            {/* Launch special card */}
            <div style={s.launchCard}>
              <span style={s.launchBadge}>Launch special</span>
              <p style={{ ...s.cardHeading, color: C.accent }}>First 3 months free for flight schools</p>
              <p style={s.cardBodySmall}>
                We're in early access. Flight schools and academies that join now get their
                first three months on us — no credit card required.
              </p>
              <BtnPrimary>
                Claim the offer
                <img src={imgArrowRightHero} alt="" style={s.btnIcon} />
              </BtnPrimary>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ VOUCHER BANNER ══════════════════════════════════════════════════ */}
      <section style={s.voucherBanner}>
        <div style={s.inner}>
          <div style={s.voucherInner}>
            <p style={s.voucherText}>
              Not ready to subscribe? We also offer <strong style={{ color: C.accent }}>gift vouchers</strong> — perfect
              for pilots who want to try ZENIT or for those who want to give the gift of safer flying.
            </p>
            <button style={s.voucherBtn}>
              <img src={imgVoucherIcon} alt="" style={s.btnIcon} />
              Get a voucher
            </button>
          </div>
        </div>
      </section>

      {/* ═══ FINAL CTA ═══════════════════════════════════════════════════════ */}
      <section style={s.finalCta}>
        <div style={s.finalCtaInner}>
          <p style={s.sectionLabel}>Start today</p>
          <h2 style={{ ...s.sectionHeading, fontSize: 48, margin: "0 0 16px" }}>
            The safest part of your next flight<br />starts on the ground.
          </h2>
          <p style={{ ...s.bodyText, marginBottom: 40 }}>
            Join pilots and flight schools already training smarter with ZENIT.
          </p>
          <div style={s.heroCtas}>
            <BtnPrimary>
              Start training free
              <img src={imgCtaIcon} alt="" style={s.btnIcon} />
            </BtnPrimary>
            <BtnBrandSecondary>For flight schools</BtnBrandSecondary>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ══════════════════════════════════════════════════════════ */}
      <footer style={s.footer}>
        <div style={s.footerInner}>
          {/* Brand */}
          <div style={s.footerBrand}>
            <img src={imgFooterLogo} alt="ZENIT" style={s.footerLogoImg} />
            <img src={imgFooterFlyBeyond} alt="fly beyond" style={s.footerTaglineImg} />
            <div style={s.socialRow}>
              {[
                { src: imgFooterX,         label: "X / Twitter"  },
                { src: imgFooterInstagram, label: "Instagram"    },
                { src: imgFooterYoutube,   label: "YouTube"      },
                { src: imgFooterLinkedin,  label: "LinkedIn"     },
              ].map(({ src, label }) => (
                <a key={label} href="#" style={s.socialBtn} aria-label={label}>
                  <img src={src} alt={label} style={s.socialIcon} />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          <div style={s.footerCols}>
            <div style={s.footerCol}>
              <p style={s.footerColTitle}>Use cases</p>
              {["Student pilots", "Private pilots", "Professional pilots", "Flight schools"].map((l) => (
                <a key={l} href="#" style={s.footerLink}>{l}</a>
              ))}
            </div>
            <div style={s.footerCol}>
              <p style={s.footerColTitle}>Explore</p>
              {["How it works", "Pricing", "Roles and features", "Sign up", "Log in"].map((l) => (
                <a key={l} href="#" style={s.footerLink}>{l}</a>
              ))}
            </div>
          </div>
        </div>

        <div style={s.footerBottom}>
          <span style={s.footerCopy}>© 2026 ZENIT. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  // Page
  page: {
    backgroundColor: C.bgDefault,
    color: C.textPrimary,
    fontFamily: "'Inter', sans-serif",
    minHeight: "100vh",
    overflowX: "hidden",
  },

  // ── Shared layout ──────────────────────────────────────────────────────────
  inner: {
    maxWidth: 1280,
    margin: "0 auto",
    padding: "0 80px",
  },
  section: {
    padding: "80px 0",
  },
  sectionDark: {
    backgroundColor: C.bgSecondary,
    padding: "80px 0",
  },
  sectionLabel: {
    color: C.accent,
    fontSize: 16,
    fontWeight: 400,
    letterSpacing: "0.02em",
    marginBottom: 16,
    margin: "0 0 16px",
  },
  sectionHeading: {
    fontSize: 32,
    fontWeight: 700,
    lineHeight: 1.2,
    letterSpacing: "-0.64px",
    color: C.textPrimary,
    margin: "0 0 48px",
  },
  bodyText: {
    fontSize: 16,
    lineHeight: 1.4,
    color: C.textNeutral,
    margin: "0 0 24px",
  },

  // ── Buttons ────────────────────────────────────────────────────────────────
  btnPrimary: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.accent,
    color: C.accentText,
    border: `1px solid ${C.accent}`,
    borderRadius: 8,
    padding: "10px 16px",
    fontSize: 16,
    fontWeight: 400,
    cursor: "pointer",
    lineHeight: 1,
    whiteSpace: "nowrap",
  },
  btnBrandSec: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.bgBrandSec,
    color: C.accent,
    border: "none",
    borderRadius: 8,
    padding: "10px 16px",
    fontSize: 16,
    fontWeight: 400,
    cursor: "pointer",
    lineHeight: 1,
    whiteSpace: "nowrap",
  },
  btnSubtle: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    backgroundColor: "transparent",
    color: C.accent,
    border: "none",
    borderRadius: 8,
    padding: "10px 16px",
    fontSize: 16,
    fontWeight: 400,
    cursor: "pointer",
    lineHeight: 1,
    whiteSpace: "nowrap",
  },
  btnIcon: {
    width: 20,
    height: 20,
    objectFit: "contain",
    flexShrink: 0,
  },

  // ── Navbar ─────────────────────────────────────────────────────────────────
  nav: {
    position: "sticky",
    top: 0,
    zIndex: 100,
    backgroundColor: "rgba(18,18,17,0.9)",
    backdropFilter: "blur(20px)",
    borderBottom: `1px solid ${C.borderNeutral}`,
  },
  navInner: {
    maxWidth: 1280,
    margin: "0 auto",
    padding: "16px 80px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 32,
  },
  navBrand: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    flex: "0 0 auto",
  },
  navLogoImg: {
    height: 27,
    objectFit: "contain",
    alignSelf: "flex-start",
  },
  navTaglineImg: {
    height: 23,
    objectFit: "contain",
    alignSelf: "flex-start",
  },
  navLinks: {
    display: "flex",
    gap: 4,
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  navLink: {
    color: C.textPrimary,
    textDecoration: "none",
    fontSize: 16,
    fontWeight: 400,
    padding: "10px 12px",
    borderRadius: 8,
    whiteSpace: "nowrap",
  },
  navActions: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    flex: "0 0 auto",
  },

  // ── Hero ────────────────────────────────────────────────────────────────────
  hero: {
    padding: "80px 80px 0",
    maxWidth: 1280,
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 48,
  },
  heroText: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 24,
    maxWidth: 800,
  },
  heroHeading: {
    fontSize: 72,
    fontWeight: 700,
    lineHeight: 1.2,
    letterSpacing: "-2.16px",
    textAlign: "center",
    color: C.textPrimary,
    margin: 0,
  },
  heroSub: {
    fontSize: 16,
    lineHeight: 1.4,
    color: C.textSecondary,
    textAlign: "center",
    maxWidth: 573,
    margin: 0,
  },
  heroCtas: {
    display: "flex",
    gap: 14,
    alignItems: "center",
  },
  heroAppWrap: {
    width: "100%",
    display: "flex",
    justifyContent: "center",
  },
  heroAppImg: {
    width: "100%",
    maxWidth: 1120,
    borderRadius: 16,
    objectFit: "cover",
    display: "block",
  },

  // ── Benefits ────────────────────────────────────────────────────────────────
  benefitsGrid: {
    display: "flex",
    gap: 32,
  },
  benefitCard: {
    flex: "1 0 0",
    backgroundColor: C.bgCard,
    border: `1px solid ${C.borderCard}`,
    borderRadius: 16,
    padding: 32,
    display: "flex",
    flexDirection: "column",
    gap: 24,
    minWidth: 0,
  },

  // ── Shared card text ────────────────────────────────────────────────────────
  cardHeading: {
    fontSize: 32,
    fontWeight: 700,
    lineHeight: 1.2,
    color: C.textPrimary,
    margin: 0,
  },
  cardBody: {
    fontSize: 16,
    lineHeight: 1.4,
    color: C.textNeutral,
  },
  cardBodySmall: {
    fontSize: 16,
    lineHeight: 1.4,
    color: C.textNeutral,
    margin: 0,
  },

  // ── How it works ────────────────────────────────────────────────────────────
  howGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 64,
    alignItems: "start",
  },
  howLeft: {
    display: "flex",
    flexDirection: "column",
  },
  stepsCol: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  stepActive: {
    backgroundColor: C.bgActive,
    border: `1px solid ${C.borderBrand}`,
    borderRadius: 16,
    padding: 32,
    display: "flex",
    flexDirection: "column",
    gap: 24,
  },
  stepInactive: {
    backgroundColor: C.bgSecondary,
    borderRadius: 16,
    padding: 32,
    display: "flex",
    flexDirection: "column",
    gap: 24,
    opacity: 0.5,
  },
  howRight: {
    position: "sticky",
    top: 80,
  },
  howAppImg: {
    width: "100%",
    borderRadius: 16,
    objectFit: "cover",
    display: "block",
  },

  // ── Why it matters ──────────────────────────────────────────────────────────
  whyGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 80,
    alignItems: "start",
  },
  whyLeft: {
    display: "flex",
    flexDirection: "column",
  },
  whyCta: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    backgroundColor: "transparent",
    color: C.accent,
    border: "none",
    borderRadius: 8,
    padding: 0,
    fontSize: 16,
    fontWeight: 400,
    cursor: "pointer",
    lineHeight: 1,
  },
  whyRight: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  statCard: {
    backgroundColor: C.bgCard,
    border: `1px solid ${C.borderCard}`,
    borderRadius: 16,
    padding: "28px 32px",
  },
  statValue: {
    fontSize: 48,
    fontWeight: 700,
    color: C.accent,
    lineHeight: 1,
    margin: "0 0 8px",
  },
  statLabel: {
    fontSize: 16,
    lineHeight: 1.4,
    color: C.textNeutral,
    margin: 0,
  },

  // ── Who ZENIT is built for ──────────────────────────────────────────────────
  audienceGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 24,
  },
  audienceCard: {
    backgroundColor: C.bgCard,
    border: `1px solid ${C.borderCard}`,
    borderRadius: 16,
    padding: 32,
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  audienceIcon: {
    width: 32,
    height: 32,
    objectFit: "contain",
    flexShrink: 0,
  },

  // ── Roles ────────────────────────────────────────────────────────────────────
  rolesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 24,
  },
  roleCard: {
    backgroundColor: C.bgCard,
    border: `1px solid ${C.borderCard}`,
    borderRadius: 16,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  roleCardAccent: {
    border: `1px solid ${C.borderBrand}`,
    backgroundColor: C.bgActive,
  },
  rolesImageWrap: {
    height: 200,
    overflow: "hidden",
  },
  rolesImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  roleContent: {
    padding: 32,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    flex: 1,
  },
  roleTag: {
    display: "inline-block",
    backgroundColor: "rgba(255,255,255,0.08)",
    color: C.textSecondary,
    fontSize: 14,
    fontWeight: 400,
    padding: "4px 10px",
    borderRadius: 6,
    border: `1px solid ${C.borderNeutral}`,
    alignSelf: "flex-start",
  },
  roleTagAccent: {
    display: "inline-block",
    backgroundColor: C.bgBrandSec,
    color: C.accent,
    fontSize: 14,
    fontWeight: 400,
    padding: "4px 10px",
    borderRadius: 6,
    border: `1px solid ${C.borderBrand}`,
    alignSelf: "flex-start",
  },
  featureList: {
    listStyle: "none",
    margin: "8px 0 0",
    padding: 0,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  featureItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontSize: 16,
    lineHeight: 1.4,
    color: C.textSecondary,
  },
  featureDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    backgroundColor: C.accent,
    flexShrink: 0,
  },

  // ── Pricing ──────────────────────────────────────────────────────────────────
  pricingGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 24,
    alignItems: "start",
  },
  pricingCard: {
    backgroundColor: C.bgCard,
    border: `1px solid ${C.borderCard}`,
    borderRadius: 16,
    padding: 32,
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  pricingCardFeatured: {
    backgroundColor: C.bgActive,
    border: `1px solid ${C.borderBrand}`,
  },
  planName: {
    fontSize: 16,
    fontWeight: 400,
    color: C.textSecondary,
    margin: 0,
  },
  planPrice: {
    fontSize: 40,
    fontWeight: 700,
    lineHeight: 1,
    color: C.textPrimary,
    margin: 0,
  },
  planCurrency: {
    fontSize: 20,
    fontWeight: 400,
  },
  planDesc: {
    fontSize: 16,
    lineHeight: 1.4,
    color: C.textTertiary,
    margin: 0,
  },
  pricingDivider: {
    width: "100%",
    height: 1,
    objectFit: "cover",
  },
  planFeatures: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    flex: 1,
  },
  planFeatureItem: {
    fontSize: 16,
    lineHeight: 1.4,
    color: C.textNeutral,
  },
  pricingCta: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: C.bgBrandSec,
    color: C.accent,
    border: "none",
    borderRadius: 8,
    padding: "10px 16px",
    fontSize: 16,
    fontWeight: 400,
    cursor: "pointer",
    lineHeight: 1,
    width: "100%",
  },
  pricingCtaFeatured: {
    backgroundColor: C.accent,
    color: C.accentText,
  },

  // ── Flight Schools ────────────────────────────────────────────────────────────
  schoolsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 24,
    alignItems: "stretch",
  },
  schoolCard: {
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
    minHeight: 400,
    border: `1px solid ${C.borderCard}`,
  },
  schoolPhoto: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  schoolOverlay: {
    position: "absolute",
    inset: 0,
    background: "linear-gradient(to top, rgba(18,18,17,0.95) 40%, rgba(18,18,17,0.4) 100%)",
    padding: 32,
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-end",
    gap: 16,
  },
  schoolIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: C.bgBrandSec,
    border: `1px solid ${C.borderBrand}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  launchCard: {
    backgroundColor: C.bgActive,
    border: `1px solid ${C.borderBrand}`,
    borderRadius: 16,
    padding: 32,
    display: "flex",
    flexDirection: "column",
    gap: 16,
    justifyContent: "center",
  },
  launchBadge: {
    display: "inline-block",
    backgroundColor: C.bgBrandSec,
    color: C.accent,
    fontSize: 14,
    fontWeight: 400,
    padding: "4px 12px",
    borderRadius: 6,
    border: `1px solid ${C.borderBrand}`,
    alignSelf: "flex-start",
  },

  // ── Voucher banner ────────────────────────────────────────────────────────────
  voucherBanner: {
    borderTop: `1px solid ${C.borderNeutral}`,
    borderBottom: `1px solid ${C.borderNeutral}`,
    padding: "32px 0",
  },
  voucherInner: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 32,
  },
  voucherText: {
    fontSize: 16,
    lineHeight: 1.4,
    color: C.textSecondary,
    margin: 0,
    flex: 1,
  },
  voucherBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.bgBrandSec,
    color: C.accent,
    border: "none",
    borderRadius: 8,
    padding: "10px 16px",
    fontSize: 16,
    fontWeight: 400,
    cursor: "pointer",
    lineHeight: 1,
    flexShrink: 0,
  },

  // ── Final CTA ──────────────────────────────────────────────────────────────
  finalCta: {
    padding: "120px 0",
  },
  finalCtaInner: {
    maxWidth: 1280,
    margin: "0 auto",
    padding: "0 80px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
  },

  // ── Footer ──────────────────────────────────────────────────────────────────
  footer: {
    backgroundColor: C.bgSecondary,
    borderTop: `1px solid ${C.borderNeutral}`,
    padding: "64px 0 32px",
  },
  footerInner: {
    maxWidth: 1280,
    margin: "0 auto 48px",
    padding: "0 80px",
    display: "flex",
    gap: 80,
    alignItems: "flex-start",
  },
  footerBrand: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    flex: "0 0 220px",
  },
  footerLogoImg: {
    height: 27,
    objectFit: "contain",
    alignSelf: "flex-start",
  },
  footerTaglineImg: {
    height: 23,
    objectFit: "contain",
    alignSelf: "flex-start",
  },
  socialRow: {
    display: "flex",
    gap: 8,
    marginTop: 8,
  },
  socialBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.06)",
    border: `1px solid ${C.borderNeutral}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textDecoration: "none",
    flexShrink: 0,
  },
  socialIcon: {
    width: 18,
    height: 18,
    objectFit: "contain",
  },
  footerCols: {
    display: "flex",
    gap: 64,
    flex: 1,
  },
  footerCol: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  footerColTitle: {
    fontSize: 16,
    fontWeight: 400,
    color: C.textPrimary,
    margin: "0 0 4px",
  },
  footerLink: {
    fontSize: 16,
    lineHeight: 1.4,
    color: C.textSecondary,
    textDecoration: "none",
  },
  footerBottom: {
    maxWidth: 1280,
    margin: "0 auto",
    padding: "24px 80px 0",
    borderTop: `1px solid ${C.borderNeutral}`,
  },
  footerCopy: {
    fontSize: 14,
    color: C.textTertiary,
  },
};
