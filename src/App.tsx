import { useRef, useState } from "react";

const categories = [
  "All solutions",
  "Learning",
  "Clinical practice",
  "Research",
  "Intelligence",
] as const;
type Category = (typeof categories)[number];
const products: {
  name: string;
  category: Category;
  label: string;
  description: string;
  features: string[];
  url: string;
  cta: string;
  number: string;
  logo: string;
}[] = [
  {
    name: "Bayan",
    category: "Learning",
    label: "Medical education & exam preparation",
    description:
      "A learning space for students, doctors, nurses, and pharmacists. Build clinical reasoning with question practice, explanations, and focused revision.",
    features: [
      "Adaptive question sessions",
      "Board & licensing exam preparation",
      "Flashcards, OSCE & virtual patients",
    ],
    url: "https://www.bayan.edu.om",
    cta: "Explore Bayan",
    number: "01",
    logo: "/brand/bayan.png",
  },
  {
    name: "PreOp",
    category: "Clinical practice",
    label: "Perioperative medicine toolkit",
    description:
      "Bring risk assessment, medication references, and perioperative planning into one practical workflow for healthcare professionals.",
    features: [
      "Clinical risk calculators",
      "Medication & investigation references",
      "Assessment and handoff tools",
    ],
    url: "https://www.bayan.edu.om/preop",
    cta: "Explore PreOp",
    number: "02",
    logo: "/brand/preop.png",
  },
  {
    name: "JournalReady",
    category: "Research",
    label: "From research idea to submission",
    description:
      "Support the work around your research: study planning, statistical interpretation, manuscript preparation, and journal selection.",
    features: [
      "Study design & analysis tools",
      "Manuscript and reference support",
      "Journal selection & submission",
    ],
    url: "https://journalready.ai",
    cta: "Explore JournalReady",
    number: "03",
    logo: "/brand/journalready.png",
  },
  {
    name: "SmartRota",
    category: "Clinical practice",
    label: "Residency rotation planning",
    description:
      "Organize rotations around training requirements, hospital sites, and scheduling constraints.",
    features: [
      "Rotation planning",
      "Training requirements",
      "Multiple hospital sites",
    ],
    url: "https://rota.medresearch-academy.om",
    cta: "Sign in to SmartRota",
    number: "04",
    logo: "/brand/smartrota.png",
  },
  {
    name: "OHealth",
    category: "Intelligence",
    label: "Health data for better questions",
    description:
      "Explore health-system data, capacity, and trends to support analysis and planning in Oman.",
    features: [
      "Health-system indicators",
      "Capacity & trend exploration",
      "National open data",
    ],
    url: "https://ohealth.medresearch-academy.om",
    cta: "Explore OHealth",
    number: "05",
    logo: "/brand/ohealth.png",
  },
  {
    name: "OLearn",
    category: "Intelligence",
    label: "Education data in context",
    description:
      "Explore education trends, geographic patterns, and workforce indicators to inform planning and research.",
    features: [
      "Education trends",
      "Geographic insights",
      "Workforce indicators",
    ],
    url: "https://olearn-sandy.vercel.app",
    cta: "Explore OLearn",
    number: "06",
    logo: "/brand/olearn.svg",
  },
];
const faqs = [
  [
    "What is the difference between Bayan AI and Bayan?",
    "Bayan AI Technologies brings clinical knowledge, research, and software development together. Bayan, at bayan.edu.om, is our medical education solution. Our wider work explores clinical language, perioperative practice, research methods, scheduling, and open data.",
  ],
  [
    "What scientific questions connect the solutions?",
    "Our work explores how people develop clinical reasoning, how Arabic clinical conversations can become structured documentation, and how evidence and data can support research and planning. Each solution addresses a different part of that work.",
  ],
  [
    "Is Medad available for routine clinical deployment?",
    "Medad is an active research and development project for Arabic clinical documentation. Research progress and readiness for routine clinical use are different milestones. We welcome discussion of evaluation methods, clinical language, and research collaboration.",
  ],
  [
    "How can a university or hospital work with Bayan AI?",
    "Start with a research question or a clinical or educational challenge. We welcome discussions about collaborative evaluation, study design, regional language needs, and the responsible application of technology in healthcare.",
  ],
  [
    "How should I interpret the research and solution descriptions?",
    "The descriptions explain areas of work and intended uses; they do not establish clinical efficacy. Research findings should be considered alongside their methods, evaluation setting, and limitations. Visit the relevant project for more detail, or contact us about a specific scientific question.",
  ],
];

function Arrow() {
  return <span aria-hidden="true">↗</span>;
}
function Brand() {
  return (
    <>
      <img
        className="company-logo"
        src="/brand/bayan-ai.png"
        width="76"
        height="76"
        alt="Bayan AI Technologies logo"
      />
      <span className="brand-copy">
        <span className="brand-name">Bayan AI</span>
        <span className="brand-sub">SCIENCE & INNOVATION</span>
      </span>
    </>
  );
}

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [category, setCategory] = useState<Category>("All solutions");
  const menuButton = useRef<HTMLButtonElement>(null);
  const filtered = products.filter(
    (p) => category === "All solutions" || p.category === category,
  );
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-nav">
        <div className="container nav-row">
          <a
            href="#top"
            className="brand"
            aria-label="Bayan AI Technologies home"
          >
            <Brand />
          </a>
          <button
            ref={menuButton}
            className="menu-toggle"
            aria-expanded={menuOpen}
            aria-controls="main-navigation"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? "Close" : "Menu"}{" "}
            <span aria-hidden="true">{menuOpen ? "×" : "+"}</span>
          </button>
          <nav
            id="main-navigation"
            aria-label="Main navigation"
            className={menuOpen ? "nav-links is-open" : "nav-links"}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setMenuOpen(false);
                menuButton.current?.focus();
              }
            }}
          >
            {[
              ["Solutions", "#products"],
              ["Research", "#research"],
              ["Approach", "#approach"],
              ["About", "#about"],
            ].map(([label, href]) => (
              <a key={href} href={href} onClick={() => setMenuOpen(false)}>
                {label}
              </a>
            ))}
            <a
              className="nav-cta"
              href="#contact"
              onClick={() => setMenuOpen(false)}
            >
              Collaborate <Arrow />
            </a>
          </nav>
        </div>
      </header>
      <main id="main">
        <section className="hero" id="top" aria-labelledby="hero-title">
          <img
            className="hero-art"
            src="/artwork/ai-oman.jpg"
            width="1391"
            height="1131"
            alt=""
            fetchPriority="high"
          />
          <div className="container hero-inner">
            <div className="hero-copy">
              <p className="eyebrow">
                <span className="small-line" /> SCIENCE & INNOVATION FROM OMAN
              </p>
              <h1 id="hero-title">
                Scientific curiosity.
                <br />
                Clinical insight.
                <br />
                <em>Meaningful innovation.</em>
              </h1>
              <p className="hero-body">
                We bring medicine, research, and artificial intelligence
                together to explore better ways to learn, understand clinical
                language, and work with evidence. Our ideas begin with questions
                from healthcare and grow through scientific inquiry.
              </p>
              <div className="hero-actions">
                <a className="btn btn-gold" href="#research">
                  Explore our research <Arrow />
                </a>
                <a className="btn btn-outline" href="#products">
                  Discover our solutions <Arrow />
                </a>
              </div>
            </div>
            <div className="hero-foot">
              <span>Healthcare · Education · Research</span>
              <span lang="ar" dir="rtl">
                من عُمان، للمستقبل
              </span>
            </div>
          </div>
        </section>
        <section className="intro-strip" aria-label="Our focus">
          <div className="container">
            <p>
              Shared curiosity.
              <br />
              <strong>Connected disciplines.</strong>
            </p>
            <a href="#products" onClick={() => setCategory("Learning")}>
              Learning sciences <span>01</span>
            </a>
            <a
              href="#products"
              onClick={() => setCategory("Clinical practice")}
            >
              Clinical innovation <span>02</span>
            </a>
            <a href="#research">
              Arabic clinical AI <span>03</span>
            </a>
          </div>
        </section>

        <section
          className="section products-section"
          id="products"
          aria-labelledby="products-title"
        >
          <div className="container">
            <div className="section-heading">
              <div>
                <p className="eyebrow">OUR SOLUTIONS & INITIATIVES</p>
                <h2 id="products-title">
                  Where ideas
                  <br />
                  become applications.
                </h2>
              </div>
              <p>
                A connected body of work across medical education, clinical
                practice, research methods, and open data. Each initiative
                explores a different challenge.
              </p>
            </div>
            <div
              className="filters"
              role="group"
              aria-label="Filter solutions by area"
            >
              {categories.map((c) => (
                <button
                  key={c}
                  aria-pressed={category === c}
                  onClick={() => setCategory(c)}
                >
                  {c}
                </button>
              ))}
            </div>
            <p className="sr-only" role="status">
              Showing {filtered.length} solutions
            </p>
            <div className="product-grid">
              {filtered.map((p) => (
                <article key={p.name} className="product-card">
                  <div className="product-meta">
                    <span>{p.category}</span>
                    <span>{p.number}</span>
                  </div>
                  <img
                    className="solution-logo"
                    src={p.logo}
                    alt={`${p.name} logo`}
                    width="150"
                    height="150"
                    loading="lazy"
                  />
                  <h3>{p.name}</h3>
                  <p className="product-label">{p.label}</p>
                  <p className="product-desc">{p.description}</p>
                  <ul>
                    {p.features.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                  <a
                    className="product-link"
                    href={p.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {p.cta}
                    <Arrow />
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </article>
              ))}
            </div>
            <p className="directory-note">
              Explore each initiative for its scope and current work. Medad’s
              Arabic clinical AI research is introduced below.
            </p>
          </div>
        </section>

        <section
          className="research-section"
          id="research"
          aria-labelledby="research-title"
        >
          <div className="container research-grid">
            <div>
              <p className="eyebrow">
                RESEARCH SPOTLIGHT <span className="status">ACTIVE R&D</span>
              </p>
              <img
                className="research-logo"
                src="/brand/medad.png"
                alt="Medad logo"
                width="150"
                height="150"
                loading="lazy"
              />
              <h2 id="research-title">
                Medad{" "}
                <span lang="ar" dir="rtl">
                  مداد
                </span>
              </h2>
              <h3>
                Clinical conversations.
                <br />
                In the language of care.
              </h3>
              <p>
                Arabic clinical conversations deserve tools built around their
                language and context. Medad explores how speech recognition and
                AI can support structured clinical documentation, with
                clinicians reviewing the output.
              </p>
              <a
                className="btn btn-gold"
                href="mailto:info@bayanai.tech?subject=Medad%20research%20collaboration"
              >
                Discuss Medad research <Arrow />
              </a>
              <a
                className="quiet-link"
                href="https://www.medad.om"
                target="_blank"
                rel="noreferrer"
              >
                Visit the Medad project <Arrow />
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </div>
            <div className="research-workflow">
              <p className="workflow-caption">THE WORKFLOW UNDER DEVELOPMENT</p>
              {[
                [
                  "01",
                  "Listen in context",
                  "Arabic speech recognition shaped around clinical conversations and regional dialects.",
                ],
                [
                  "02",
                  "Structure the information",
                  "Explore the generation of organized clinical notes from transcribed encounters.",
                ],
                [
                  "03",
                  "Keep clinicians in the loop",
                  "Support review and correction before documentation is relied on.",
                ],
              ].map(([n, title, desc]) => (
                <div className="workflow-step" key={n}>
                  <span>{n}</span>
                  <div>
                    <h4>{title}</h4>
                    <p>{desc}</p>
                  </div>
                </div>
              ))}
              <p className="research-note">
                Research and evaluation are ongoing. Deployment and
                data-handling requirements are discussed for each collaboration.
              </p>
            </div>
          </div>
        </section>

        <section className="section approach" id="approach">
          <div className="container">
            <div className="section-heading">
              <div>
                <p className="eyebrow">OUR SCIENTIFIC APPROACH</p>
                <h2>
                  Questions first.
                  <br />
                  Evidence throughout.
                </h2>
              </div>
              <p>
                Our guiding principles connect domain knowledge with careful
                evaluation. We distinguish an idea, a working application, and
                evidence of benefit.
              </p>
            </div>
            <div className="principles">
              {[
                [
                  "Ask a meaningful question",
                  "Start with a clinical, educational, or research challenge. Understand the context before deciding where technology can contribute.",
                ],
                [
                  "Examine the evidence",
                  "Consider sources, methods, and limitations. Bayan’s publication workflow includes review, citation checks, and revision; AI support does not replace professional judgment.",
                ],
                [
                  "Learn through collaboration",
                  "Bring clinical and technical perspectives together. Our Omani roots shape our interest in regional learning needs and Arabic clinical language.",
                ],
              ].map(([title, desc], i) => (
                <article key={title}>
                  <span>0{i + 1}</span>
                  <h3>{title}</h3>
                  <p>{desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section story" id="about">
          <div className="container story-grid">
            <div className="founder-visual">
              <img
                src="/dr-alawi.jpg"
                width="600"
                height="800"
                loading="lazy"
                alt="Dr. Abdullah M. Al Alawi, founder of Bayan AI Technologies"
              />
              <div>
                <span>PHYSICIAN. RESEARCHER. BUILDER.</span>
                <strong>Dr. Abdullah M. Al Alawi</strong>
                <p>Founder & CEO</p>
              </div>
            </div>
            <div className="story-copy">
              <p className="eyebrow">OUR STORY</p>
              <h2>
                Rooted in Oman.
                <br />
                Built around people.
              </h2>
              <p>
                Bayan AI Technologies is a healthcare technology company based
                in Muscat. We bring clinical experience, research, and software
                development together to address the everyday work of healthcare
                and education.
              </p>
              <p>
                Founded by physician and researcher Dr. Abdullah Al Alawi, our
                work connects a simple ambition with practical tools: help
                people learn, work, and create knowledge with greater clarity.
              </p>
              <div className="story-detail">
                <strong>Local knowledge. Shared discovery.</strong>
                <p>
                  We welcome universities, healthcare institutions, and research
                  groups interested in scientific exchange and collaborative
                  evaluation.
                </p>
              </div>
              <div className="text-links">
                <a
                  href="https://orcid.org/0000-0003-2077-7186"
                  target="_blank"
                  rel="noreferrer"
                >
                  Research profile <Arrow />
                </a>
                <a
                  href="https://www.linkedin.com/in/abdullah-al-alawi-4"
                  target="_blank"
                  rel="noreferrer"
                >
                  LinkedIn <Arrow />
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="section faq-section" id="faq">
          <div className="container faq-grid">
            <div>
              <p className="eyebrow">A LITTLE MORE CLARITY</p>
              <h2>
                Good questions.
                <br />
                Clear answers.
              </h2>
              <a className="quiet-link" href="mailto:info@bayanai.tech">
                Ask us something else <Arrow />
              </a>
            </div>
            <div>
              {faqs.map(([q, a]) => (
                <details key={q}>
                  <summary>
                    {q}
                    <span aria-hidden="true">+</span>
                  </summary>
                  <p>{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="contact-section" id="contact">
          <div className="container">
            <p className="eyebrow">RESEARCH & COLLABORATION</p>
            <h2>
              Better questions.
              <br />
              <em>Shared discovery.</em>
            </h2>
            <p>
              Connect with us around a research question, a method, or an idea.
            </p>
            <div className="contact-paths">
              {[
                [
                  "Clinical research",
                  "Explore clinical language, evaluation methods, and healthcare questions.",
                  "Clinical research collaboration",
                ],
                [
                  "Academic collaboration",
                  "Connect around learning sciences, research methods, and open data.",
                  "Academic collaboration",
                ],
                [
                  "Scientific exchange",
                  "Share perspectives and explore interdisciplinary ideas with us.",
                  "Scientific exchange",
                ],
              ].map(([title, desc, subject]) => (
                <a
                  key={title}
                  href={`mailto:info@bayanai.tech?subject=${encodeURIComponent(subject)}`}
                >
                  <h3>
                    {title}
                    <Arrow />
                  </h3>
                  <p>{desc}</p>
                </a>
              ))}
            </div>
            <a className="contact-email" href="mailto:info@bayanai.tech">
              info@bayanai.tech <Arrow />
            </a>
          </div>
        </section>
      </main>
      <footer>
        <div className="container footer-main">
          <img
            className="footer-company-logo"
            src="/brand/bayan-ai.png"
            alt="Bayan AI Technologies logo"
            width="120"
            height="120"
            loading="lazy"
          />
          <p>
            Bayan AI Technologies LLC
            <br />
            Muscat, Sultanate of Oman
          </p>
          <a href="#top">Back to top ↑</a>
        </div>
        <div className="container footer-bottom">
          <span>© {new Date().getFullYear()} Bayan AI Technologies LLC</span>
          <span>Science. Research. Innovation.</span>
        </div>
      </footer>
    </>
  );
}
