// apps/blade/src/app/tomiwaaluko/page.tsx
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export default function Page() {
  // Typewriter effect states
  const [displayedName, setDisplayedName] = useState("");
  const [displayedRole, setDisplayedRole] = useState("");
  const [showNameCursor, setShowNameCursor] = useState(true);
  const [showRoleCursor, setShowRoleCursor] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // Bio typewriter effect states
  const [displayedBio, setDisplayedBio] = useState("");
  const [showBioCursor, setShowBioCursor] = useState(false);
  const [bioStep, setBioStep] = useState(0);

  const fullName = "Tomiwa Aluko";
  const fullRole = "Knighthacks' Dev Team";
  const fullBio =
    "[SYSTEM INITIALIZED]\nWoah, what am I doing here? I was just in my room working on some code until I pushed an unknown Git command. Now I'm here! In the meantime I might as well drop my information here incase if anyone finds me...";

  useEffect(() => {
    const typewriterEffect = () => {
      // Step 0: Wait a moment before starting
      if (currentStep === 0) {
        setTimeout(() => setCurrentStep(1), 500);
        return;
      }

      // Step 1: Type the name
      if (currentStep === 1) {
        if (displayedName.length < fullName.length) {
          setTimeout(() => {
            setDisplayedName(fullName.slice(0, displayedName.length + 1));
          }, 50);
        } else {
          // Name complete, wait then hide cursor and show role cursor
          setTimeout(() => {
            setShowNameCursor(false);
            setShowRoleCursor(true);
            setCurrentStep(2);
          }, 500);
        }
        return;
      }

      // Step 2: Type the role
      if (currentStep === 2) {
        if (displayedRole.length < fullRole.length) {
          setTimeout(() => {
            setDisplayedRole(fullRole.slice(0, displayedRole.length + 1));
          }, 50);
        } else {
          // Role complete, wait then hide cursor
          setTimeout(() => {
            setShowRoleCursor(false);
          }, 500);
        }
      }
    };

    typewriterEffect();
  }, [
    displayedName,
    displayedRole,
    currentStep,
    fullName,
    fullRole,
    setShowNameCursor,
    setShowRoleCursor,
  ]);

  // Bio typewriter effect
  useEffect(() => {
    const bioTypewriterEffect = () => {
      // Wait for the terminal typewriter to finish before starting bio
      if (bioStep === 0) {
        setTimeout(() => {
          setShowBioCursor(true);
          setBioStep(1);
        }, 4000); // Start after terminal animation completes
        return;
      }

      // Type the bio text
      if (bioStep === 1) {
        if (displayedBio.length < fullBio.length) {
          setTimeout(() => {
            setDisplayedBio(fullBio.slice(0, displayedBio.length + 1));
          }, 80); // Slower typing for dramatic effect
        } else {
          // Bio complete, keep cursor blinking
          setTimeout(() => {
            setShowBioCursor(true);
          }, 100);
        }
      }
    };

    bioTypewriterEffect();
  }, [displayedBio, bioStep, fullBio, setShowBioCursor, setBioStep]);

  const skills = [
    { name: "Java", icon: "java", category: "language" },
    { name: "C", icon: "c", category: "language" },
    { name: "HTML", icon: "html", category: "language" },
    { name: "CSS", icon: "css", category: "language" },
    { name: "JavaScript", icon: "javascript", category: "language" },
    { name: "React", icon: "react", category: "framework" },
    { name: "Next.js", icon: "nextjs", category: "framework" },
    { name: "Tailwind", icon: "tailwind", category: "framework" },
    { name: "Git", icon: "git", category: "tool" },
    { name: "Vercel", icon: "vercel", category: "tool" },
    { name: "Prisma", icon: "prisma", category: "tool" },
    { name: "Supabase", icon: "supabase", category: "tool" },
    { name: "PostgreSQL", icon: "postgresql", category: "database" },
    { name: "REST API", icon: "api", category: "tech" },
    { name: "AI/ML", icon: "ai", category: "tech" },
    { name: "SolidWorks", icon: "solidworks", category: "design" },
  ];

  // Icon component function
  const TronIcon = ({ iconType, name }: { iconType: string; name: string }) => {
    const renderIcon = () => {
      switch (iconType) {
        case "java":
          return (
            <svg viewBox="0 0 24 24" className="skill-icon-svg">
              <path
                d="M8.851 18.56s-.917.534.653.714c1.902.218 2.874.187 4.969-.211 0 0 .552.346 1.321.646-4.699 2.013-10.633-.118-6.943-1.149M8.276 15.933s-1.028.761.542.924c2.032.209 3.636.227 6.413-.308 0 0 .384.389.987.602-5.679 1.661-12.007.13-7.942-1.218M13.116 11.475c1.158 1.333-.304 2.533-.304 2.533s2.939-1.518 1.589-3.418c-1.261-1.772-2.228-2.652 3.007-5.688 0-.001-8.216 2.051-4.292 6.573"
                fill="currentColor"
              />
              <path
                d="M19.33 20.504s.679.559-.747.991c-2.712.822-11.288 1.069-13.669.033-.856-.373.75-.89 1.254-.998.527-.114.828-.093.828-.093-.953-.671-6.156 1.317-2.643 1.887 9.58 1.553 17.462-.7 14.977-1.82M9.292 13.21s-4.362 1.036-1.544 1.412c1.189.159 3.561.123 5.77-.062 1.806-.152 3.618-.477 3.618-.477s-.637.272-1.098.587c-4.429 1.165-12.986.623-10.522-.568 2.082-1.006 3.776-.892 3.776-.892M17.116 17.584c4.503-2.34 2.421-4.589.968-4.285-.355.074-.515.138-.515.138s.132-.207.385-.297c2.875-1.011 5.086 2.981-.928 4.562 0-.001.07-.062.09-.118"
                fill="currentColor"
              />
            </svg>
          );
        case "c":
          return (
            <svg viewBox="0 0 24 24" className="skill-icon-svg">
              <circle
                cx="12"
                cy="12"
                r="10"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />
              <text
                x="12"
                y="16"
                textAnchor="middle"
                className="skill-icon-text"
              >
                C
              </text>
            </svg>
          );
        case "html":
          return (
            <svg viewBox="0 0 24 24" className="skill-icon-svg">
              <path
                d="M1.5 0h21l-1.91 21.563L11.977 24l-8.564-2.438L1.5 0zm7.031 9.75l-.232-2.718 10.059.003.23-2.622L5.412 4.41l.698 8.01h9.126l-.326 3.426-2.91.804-2.955-.81-.188-2.11H6.248l.33 4.171L12 19.351l5.379-1.443.744-8.157H8.531z"
                fill="currentColor"
              />
            </svg>
          );
        case "css":
          return (
            <svg viewBox="0 0 24 24" className="skill-icon-svg">
              <path
                d="M1.5 0h21l-1.91 21.563L11.977 24l-8.565-2.438L1.5 0zm17.09 4.413L5.41 4.41l.213 2.622 10.125.002-.255 2.716h-6.64l.24 2.573h6.182l-.366 3.523-2.91.804-2.956-.81-.188-2.11h-2.61l.29 3.855L12 19.288l5.373-1.53L18.59 4.414z"
                fill="currentColor"
              />
            </svg>
          );
        case "javascript":
          return (
            <svg viewBox="0 0 24 24" className="skill-icon-svg">
              <path
                d="M0 0h24v24H0V0zm22.034 18.276c-.175-1.095-.888-2.015-3.003-2.873-.736-.345-1.554-.585-1.797-1.14-.091-.33-.105-.51-.046-.705.15-.646.915-.84 1.515-.66.39.12.75.42.976.9 1.034-.676 1.034-.676 1.755-1.125-.27-.42-.404-.601-.586-.78-.63-.705-1.469-1.065-2.834-1.034l-.705.089c-.676.165-1.32.525-1.71 1.005-1.14 1.291-.811 3.541.569 4.471 1.365 1.02 3.361 1.244 3.616 2.205.24 1.17-.87 1.545-1.966 1.41-.811-.18-1.26-.586-1.755-1.336l-1.83 1.051c.21.48.45.689.81 1.109 1.74 1.756 6.09 1.666 6.871-1.004.029-.09.24-.705.074-1.65l.046.067zm-8.983-7.245h-2.248c0 1.938-.009 3.864-.009 5.805 0 1.232.063 2.363-.138 2.711-.33.689-1.18.601-1.566.48-.396-.196-.597-.466-.83-.855-.063-.105-.11-.196-.127-.196l-1.825 1.125c.305.63.75 1.172 1.324 1.517.855.51 2.004.675 3.207.405.783-.226 1.458-.691 1.811-1.411.51-.93.402-2.07.397-3.346.012-2.054 0-4.109 0-6.179l.004-.056z"
                fill="currentColor"
              />
            </svg>
          );
        case "react":
          return (
            <svg viewBox="0 0 24 24" className="skill-icon-svg">
              <circle cx="12" cy="12" r="2" fill="currentColor" />
              <path
                d="M12 1c-3.6 0-6.7 1.5-8.2 3.7C2.3 6.9 2 9.4 2 12s.3 5.1 1.8 7.3C5.3 21.5 8.4 23 12 23s6.7-1.5 8.2-3.7C21.7 17.1 22 14.6 22 12s-.3-5.1-1.8-7.3C18.7 2.5 15.6 1 12 1zm5.1 9c.4 0 .9.1 1.3.2-.2-.8-.5-1.5-.9-2.2-.4.1-.8.2-1.2.3-.3.6-.6 1.1-.9 1.7h1.7zm-1.7 2c.3.6.6 1.1.9 1.7.4.1.8.2 1.2.3.4-.7.7-1.4.9-2.2-.4.1-.9.2-1.3.2h-1.7zm-6.8 0H6.9c-.4 0-.9-.1-1.3-.2.2.8.5 1.5.9 2.2.4-.1.8-.2 1.2-.3.3-.6.6-1.1.9-1.7zm0-2c-.3-.6-.6-1.1-.9-1.7-.4-.1-.8-.2-1.2-.3-.4.7-.7 1.4-.9 2.2.4-.1.9-.2 1.3-.2h1.7z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              />
            </svg>
          );
        case "nextjs":
          return (
            <svg viewBox="0 0 24 24" className="skill-icon-svg">
              <circle
                cx="12"
                cy="12"
                r="10"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="M8 8l8 8M16 8l-8 8"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
          );
        case "tailwind":
          return (
            <svg viewBox="0 0 24 24" className="skill-icon-svg">
              <path
                d="M12 6c-2.67 0-4.33 1.33-5 4 1-1.33 2.17-1.83 3.5-1.5.76.19 1.31.74 1.91 1.35.98 1 2.09 2.15 4.59 2.15 2.67 0 4.33-1.33 5-4-1 1.33-2.17 1.83-3.5 1.5-.76-.19-1.31-.74-1.91-1.35C15.61 7.15 14.5 6 12 6zM7 12c-2.67 0-4.33 1.33-5 4 1-1.33 2.17-1.83 3.5-1.5.76.19 1.31.74 1.91 1.35C8.39 16.85 9.5 18 12 18c2.67 0 4.33-1.33 5-4-1 1.33-2.17 1.83-3.5 1.5-.76-.19-1.31-.74-1.91-1.35C10.61 13.15 9.5 12 7 12z"
                fill="currentColor"
              />
            </svg>
          );
        case "git":
          return (
            <svg viewBox="0 0 24 24" className="skill-icon-svg">
              <path
                d="M23.546 10.93L13.067.452c-.604-.603-1.582-.603-2.188 0L8.708 2.627l2.76 2.76c.645-.215 1.379-.07 1.889.441.516.515.658 1.258.438 1.9l2.658 2.66c.645-.223 1.387-.078 1.9.435.721.72.721 1.884 0 2.604-.719.719-1.881.719-2.6 0-.539-.541-.674-1.337-.404-1.996L12.86 8.955v6.525c.176.086.337.203.488.348.713.717.713 1.88 0 2.596-.719.720-1.889.720-2.609 0-.719-.716-.719-1.879 0-2.598.182-.18.387-.316.605-.406V8.835c-.217-.091-.424-.222-.6-.401-.545-.545-.676-1.342-.396-2.009L7.636 3.7.45 10.881c-.6.605-.6 1.584 0 2.189l10.48 10.477c.604.604 1.582.604 2.186 0l10.43-10.43c.605-.603.605-1.582 0-2.187"
                fill="currentColor"
              />
            </svg>
          );
        case "vercel":
          return (
            <svg viewBox="0 0 24 24" className="skill-icon-svg">
              <path d="M12 2L2 19.777h20L12 2z" fill="currentColor" />
            </svg>
          );
        case "prisma":
          return (
            <svg viewBox="0 0 24 24" className="skill-icon-svg">
              <path
                d="M12 2L3 19h18L12 2zm0 3.5L18.5 18h-13L12 5.5z"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />
              <circle cx="12" cy="8" r="1" fill="currentColor" />
            </svg>
          );
        case "supabase":
          return (
            <svg viewBox="0 0 24 24" className="skill-icon-svg">
              <path
                d="M12 2v8l8 6H8l4-6zm0 12v8l-8-6h12l-4 6z"
                fill="currentColor"
              />
            </svg>
          );
        case "postgresql":
          return (
            <svg viewBox="0 0 24 24" className="skill-icon-svg">
              <path
                d="M12 2C9.3 2 7 4.3 7 7v2c0 5.55 3.84 9.74 9 9.74s9-4.19 9-9.74V7c0-2.7-2.3-5-5-5h-8zm0 2h8c1.66 0 3 1.34 3 3v2c0 4.42-3.13 7.74-7 7.74s-7-3.32-7-7.74V7c0-1.66 1.34-3 3-3z"
                fill="currentColor"
              />
              <circle cx="12" cy="9" r="2" fill="currentColor" />
            </svg>
          );
        case "api":
          return (
            <svg viewBox="0 0 24 24" className="skill-icon-svg">
              <path
                d="M3 12h18M9 6l6 6-6 6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />
              <text
                x="12"
                y="8"
                textAnchor="middle"
                className="skill-icon-text-small"
              >
                API
              </text>
            </svg>
          );
        case "ai":
          return (
            <svg viewBox="0 0 24 24" className="skill-icon-svg">
              <circle
                cx="12"
                cy="12"
                r="3"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="M12 1v6M12 17v6M4.22 4.22l4.24 4.24M15.54 15.54l4.24 4.24M1 12h6M17 12h6M4.22 19.78l4.24-4.24M15.54 8.46l4.24-4.24"
                stroke="currentColor"
                strokeWidth="2"
              />
              <text
                x="12"
                y="16"
                textAnchor="middle"
                className="skill-icon-text-small"
              >
                AI
              </text>
            </svg>
          );
        case "solidworks":
          return (
            <svg viewBox="0 0 24 24" className="skill-icon-svg">
              <path
                d="M6 4h12v2H6zM4 8h16v8H4zM6 18h12v2H6z"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path d="M8 10h8v4H8z" fill="currentColor" />
            </svg>
          );
        default:
          return (
            <svg viewBox="0 0 24 24" className="skill-icon-svg">
              <circle
                cx="12"
                cy="12"
                r="8"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />
              <text
                x="12"
                y="16"
                textAnchor="middle"
                className="skill-icon-text"
              >
                {name.slice(0, 2)}
              </text>
            </svg>
          );
      }
    };

    return (
      <div className="skill-icon-container">
        <div className="skill-icon-circle">{renderIcon()}</div>
        <span className="skill-name">{name}</span>
      </div>
    );
  };

  const experiences = [
    {
      title: "Math Evaluator",
      company: "Outlier AI",
      period: "June 2024 – May 2025",
      description:
        "Reviewed and evaluated over 200 AI-generated math solutions across subjects including algebra, geometry, and calculus. Identified and corrected errors in 85%+ of tasks to ensure alignment with academic standards and student comprehension. Applied structured policies across 5+ key performance metrics across 3+ dimensions, including multilingual instruction and instruction-following.",
    },
    {
      title: "Office Assistant",
      company: "First Year Experience",
      period: "March 2023 – November 2024",
      description:
        "Developed a JavaScript automation script that reduced manual data entry time by 60%, streamlining date-time logging for 1,000+ call entries in Google Sheets. Received incoming phone calls and walk-in customers, managed e-mails, chatted with students online, and responded to incoming/outgoing departmental email. Assisted in the facilitation of the Orientation program for all undergraduate students involving approximately 17,500 First Time in College and Transfer students.",
    },
    {
      title: "Recreational Aide",
      company: "Mary Saunders Park",
      period: "May 2024 – August 2024",
      description:
        "Supervised and engaged middle school-aged children in daily recreational activities, fostering a safe, inclusive, and positive environment. Assisted in conflict resolution and behavior management to support youth development and team-building. Communicated effectively with parents, staff, and city officials to coordinate events and provide updates on camper progress.",
    },
    {
      title: "President / Assistant East Area Director / Secretary / Historian",
      company: "Alpha Phi Alpha Fraternity, Inc. - Xi Iota Chapter",
      period: "March 2022 – Present",
      description:
        "Served as the Chief Administrative Officer of the chapter. Actively engaged in community service in the greater Orlando area (e.g., Second Harvest Food Bank, Jones High School). Facilitated NSBE UCF's participation in regional and national conventions, including coordinating voting and conference logistics, advising on organizational procedures, overseeing budgeting, and managing member communications.",
    },
    {
      title: "Senator / Member",
      company: "National Society of Black Engineers (NSBE)",
      period: "August 2021 – Present",
      description:
        "Facilitated NSBE UCF's participation in regional and national conventions, including coordinating voting and conference logistics, advising on organizational procedures, overseeing budgeting, and managing member communications.",
    },
  ];

  const projects = [
    {
      title: "ApplySense",
      subtitle: "Job Application Tracker",
      description:
        "AI-powered tool processing 200+ job postings with intelligent categorization and tracking.",
      tech: ["React", "Node.js", "AI Integration"],
      demoUrl: "http://applysense.vercel.app/",
    },
    {
      title: "DigiConvo",
      subtitle: "Conversation Practice App",
      description:
        "Hackathon-built, AI-powered dialogue app for improving communication skills.",
      tech: ["React", "AI/ML", "Real-time Chat"],
      demoUrl: "https://digiconvo.vercel.app/",
    },
    {
      title: "Xi Iota Chapter Website",
      subtitle: "UCF Alphas",
      description:
        "Responsive chapter website with interactive galleries and member management.",
      tech: ["Next.js", "Tailwind", "CMS"],
      demoUrl: "https://ucfalphas.org/",
    },
  ];

  return (
    <div className="tron-container">
      {/* Enhanced 3D Animated Grid Background */}
      <div className="tron-grid"></div>
      <div className="tron-grid-overlay"></div>

      {/* Circuit Board Background */}
      <div className="circuit-board">
        <div className="circuit-line circuit-line-1"></div>
        <div className="circuit-line circuit-line-2"></div>
        <div className="circuit-line circuit-line-3"></div>
        <div className="circuit-node circuit-node-1"></div>
        <div className="circuit-node circuit-node-2"></div>
        <div className="circuit-node circuit-node-3"></div>
      </div>

      {/* Hexagonal Matrix Overlay */}
      <div className="hex-matrix">
        <div className="hex-pattern"></div>
      </div>

      {/* Hero Section */}
      <section id="hero" className="hero-section">
        <div className="hero-content">
          {/* Terminal Window Frame */}
          <div className="terminal-frame">
            <div className="terminal-header">
              <div className="terminal-controls">
                <span className="terminal-dot terminal-red"></span>
                <span className="terminal-dot terminal-yellow"></span>
                <span className="terminal-dot terminal-green"></span>
              </div>
              <div className="terminal-title">SYSTEM_IDENTITY.exe</div>
            </div>
            <div className="terminal-content">
              <div className="code-line">
                <span className="code-prompt">$</span>
                <span className="code-command">whoami</span>
              </div>
              <div className="code-output">
                <span className="typing-animation">
                  {displayedName}
                  {showNameCursor && <span className="cursor">|</span>}
                </span>
              </div>
              <div className="code-line">
                <span className="code-prompt">$</span>
                <span className="code-command">cat application.txt</span>
              </div>
              <div className="code-output">
                <span className="typing-animation">
                  {displayedRole}
                  {showRoleCursor && <span className="cursor">|</span>}
                </span>
              </div>
            </div>
          </div>

          {/* Enhanced Portrait with Digital Effects */}
          <div className="portrait-container">
            <div className="portrait-frame">
              <div className="portrait-image">
                <Image
                  src="/tron-profile2.png"
                  alt="Tomiwa Aluko - Tron Style Portrait"
                  className="profile-img"
                  width={300}
                  height={300}
                  priority
                />
              </div>
            </div>
          </div>

          {/* Futuristic Title with Glitch Effect */}
          <div className="title-container">
            <h1 className="hero-title tron-title">
              <span className="glow-text glitch-text" data-text="TOMIWA ALUKO">
                TOMIWA ALUKO
              </span>
            </h1>
            <div className="title-underline"></div>
          </div>

          {/* Status Panel */}
          <div className="status-panel">
            <div className="status-item">
              <span className="status-label">STATUS:</span>
              <span className="status-value status-online">ONLINE</span>
            </div>
            <div className="status-item">
              <span className="status-label">ROLE:</span>
              <span className="status-value">COMPUTER ENGINEERING</span>
            </div>
            <div className="status-item">
              <span className="status-label">LOCATION:</span>
              <span className="status-value">THE GRID</span>
            </div>
          </div>

          <p className="hero-bio enhanced-bio">
            <span className="typing-bio">
              {displayedBio.split("\n").map((line, index) => (
                <span key={index}>
                  {index === 0 ? (
                    <span className="bio-highlight">{line}</span>
                  ) : (
                    line
                  )}
                  {index < displayedBio.split("\n").length - 1 && <br />}
                </span>
              ))}
              {showBioCursor && <span className="cursor">|</span>}
            </span>
          </p>
        </div>
      </section>

      {/* Enhanced Resume & Links Section */}
      <section id="resume" className="section resume-section">
        <div className="section-content">
          <h2 className="section-title">
            <span className="glow-text">Access Protocols</span>
          </h2>

          {/* Main Resume Download */}
          <div className="resume-main-card">
            <div className="resume-card-glow"></div>
            <div className="resume-card-content">
              <div className="resume-icon">
                <svg viewBox="0 0 24 24" className="resume-svg">
                  <path
                    d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <path
                    d="M14 2v6h6M16 13H8M16 17H8M10 9H8"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                </svg>
              </div>
              <div className="resume-card-text">
                <h3>System Documentation</h3>
                <p>Complete user manual and specifications</p>
              </div>
              <a
                href="/Olatomiwa_Aluko_Resume.pdf"
                target="_blank"
                rel="noreferrer"
                className="resume-download-btn"
              >
                <span className="btn-glow"></span>
                <span className="btn-text">DOWNLOAD</span>
                <div className="btn-arrow">→</div>
              </a>
            </div>
          </div>

          {/* Network Links Grid */}
          <div className="network-grid">
            <div className="network-header">
              <span className="network-title">External Network Access</span>
              <div className="network-status">
                <span className="status-dot"></span>
                <span>CONNECTED</span>
              </div>
            </div>

            <div className="network-links">
              <a
                href="https://linkedin.com/in/olatomiwaaluko"
                target="_blank"
                rel="noreferrer"
                className="network-link linkedin"
              >
                <div className="link-icon">
                  <svg viewBox="0 0 24 24" className="link-svg">
                    <path
                      d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"
                      fill="currentColor"
                    />
                    <rect
                      x="2"
                      y="9"
                      width="4"
                      height="12"
                      fill="currentColor"
                    />
                    <circle cx="4" cy="4" r="2" fill="currentColor" />
                  </svg>
                </div>
                <div className="link-info">
                  <span className="link-label">Professional Network</span>
                  <span className="link-url">linkedin.com</span>
                </div>
                <div className="link-status">ACTIVE</div>
              </a>

              <a
                href="https://github.com/tomiwaaluko"
                target="_blank"
                rel="noreferrer"
                className="network-link github"
              >
                <div className="link-icon">
                  <svg viewBox="0 0 24 24" className="link-svg">
                    <path
                      d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z"
                      fill="currentColor"
                    />
                  </svg>
                </div>
                <div className="link-info">
                  <span className="link-label">Code Repository</span>
                  <span className="link-url">github.com</span>
                </div>
                <div className="link-status">ACTIVE</div>
              </a>

              <a
                href="https://tomiwaaluko.com"
                target="_blank"
                rel="noreferrer"
                className="network-link portfolio"
              >
                <div className="link-icon">
                  <svg viewBox="0 0 24 24" className="link-svg">
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <path
                      d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <path d="M2 12h20" stroke="currentColor" strokeWidth="2" />
                  </svg>
                </div>
                <div className="link-info">
                  <span className="link-label">Primary Interface</span>
                  <span className="link-url">tomiwaaluko.com</span>
                </div>
                <div className="link-status">ACTIVE</div>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <section id="timeline" className="section">
        <div className="section-content">
          <h2 className="section-title">
            <span className="glow-text">Professional Experience</span>
          </h2>
          <div className="timeline">
            {experiences.map((exp, index) => (
              <div key={index} className="timeline-item">
                <div className="timeline-marker"></div>
                <div className="timeline-content">
                  <h3 className="timeline-title">{exp.title}</h3>
                  <h4 className="timeline-company">{exp.company}</h4>
                  <span className="timeline-period">{exp.period}</span>
                  <p className="timeline-description">{exp.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Skills Section */}
      <section id="skills" className="section">
        <div className="section-content">
          <h2 className="section-title">
            <span className="glow-text">Technical Skills</span>
          </h2>
          <div className="skills-icon-grid">
            {skills.map((skill, index) => (
              <TronIcon key={index} iconType={skill.icon} name={skill.name} />
            ))}
          </div>
        </div>
      </section>

      {/* Projects Section */}
      <section id="projects" className="section">
        <div className="section-content">
          <h2 className="section-title">
            <span className="glow-text">Featured Projects</span>
          </h2>
          <div className="projects-grid">
            {projects.map((project, index) => (
              <div key={index} className="project-card">
                <div className="project-glow"></div>
                <div className="project-content">
                  <h3 className="project-title">{project.title}</h3>
                  <h4 className="project-subtitle">{project.subtitle}</h4>
                  <p className="project-description">{project.description}</p>
                  <div className="project-tech">
                    {project.tech.map((tech, techIndex) => (
                      <span key={techIndex} className="tech-tag">
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="project-demo">
                  <a
                    href={project.demoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="demo-link"
                  >
                    <span className="demo-placeholder">Demo</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
