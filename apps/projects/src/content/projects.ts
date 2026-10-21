export type ProjectArtworkKind = "signal" | "relay" | "margin" | "chord";

export interface ArchitectureNode {
  label: string;
  detail: string;
}

export interface CaseStudySection {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
  quote?: string;
  code?: {
    language: string;
    source: string;
  };
  architecture?: ArchitectureNode[];
}

export interface ProjectFixture {
  slug: string;
  title: string;
  category: string;
  dek: string;
  summary: string;
  technologies: string[];
  artwork: ProjectArtworkKind;
  featured?: boolean;
  readMinutes: number;
  teamLabel: string;
  provenance: string;
  demoUrl: string;
  repositoryUrl: string;
  introduction: string;
  sections: CaseStudySection[];
}

/** Illustrative records for layout and interaction testing, not real KH work. */
export const projectFixtures: ProjectFixture[] = [
  {
    slug: "signal-garden",
    title: "Signal Garden",
    category: "Civic technology",
    dek: "A neighborhood flood map designed to keep working when the network doesn’t.",
    summary:
      "An offline-first reporting flow pairs small, verified observations with a map that still opens on a weak signal.",
    technologies: ["TypeScript", "MapLibre", "IndexedDB", "PostgreSQL"],
    artwork: "signal",
    featured: true,
    readMinutes: 8,
    teamLabel: "Illustrative team · contributor names intentionally omitted",
    provenance:
      "Fictional case-study fixture created to demonstrate the Projects archive. It is not an actual Knight Hacks submission or award record.",
    demoUrl: "https://example.com/signal-garden-demo",
    repositoryUrl: "https://example.com/signal-garden-repository",
    introduction:
      "The interesting constraint was not how to draw a map. It was how to make a useful report possible at the exact moment a phone connection becomes unreliable. Signal Garden is an illustrative study in treating the network as an unreliable dependency instead of an assumption.",
    sections: [
      {
        id: "problem",
        title: "Start with the moment the map fails",
        paragraphs: [
          "A street-level flood report is only useful if someone can make it while standing near the problem. That is also where mobile coverage, battery, and patience are least predictable. A form that blocks on a remote request turns a brief observation into a failed interaction.",
          "The fixture imagines a neighborhood tool where a person can note a blocked crossing, standing water, or a clear route. The map helps readers orient themselves, but the report itself must remain small, understandable, and recoverable.",
        ],
        quote:
          "The map is the view. The queue is the product: a report should survive the walk back into coverage.",
      },
      {
        id: "architecture",
        title: "Let the report travel in stages",
        paragraphs: [
          "The client stores a compact draft in IndexedDB before attempting synchronization. Each observation receives a stable client-generated identifier, so retrying a request cannot create a second report. The server validates the schema and returns a durable acknowledgement only after the database transaction commits.",
          "Map tiles are treated differently from user input. They improve context, but they are cacheable and disposable. If a tile is missing, the report form still works; if a report cannot sync, the interface says it is queued instead of claiming it was published.",
        ],
        architecture: [
          { label: "Observation", detail: "Small validated form" },
          { label: "Local queue", detail: "IndexedDB + stable ID" },
          { label: "Sync worker", detail: "Retry with backoff" },
          { label: "Map API", detail: "PostgreSQL projection" },
        ],
      },
      {
        id: "implementation",
        title: "Make synchronization idempotent",
        paragraphs: [
          "A retry is normal on an unreliable network. The server therefore treats the client identifier as an idempotency key scoped to the submitting browser session. Validation happens before insertion, and a conflict returns the existing observation rather than manufacturing another row.",
          "The client queue stores only the fields required to finish the report. It does not keep a full response body or a second copy of map data. Once the server acknowledges the identifier, the local entry is removed and the UI updates the report state.",
        ],
        code: {
          language: "TypeScript",
          source: `type PendingReport = {
  id: string;
  kind: "blocked-route" | "standing-water" | "clear-route";
  point: { latitude: number; longitude: number };
  createdAt: string;
};

async function submitWhenOnline(report: PendingReport) {
  await localQueue.put(report);
  if (!navigator.onLine) return "queued";

  const result = await api.reports.create({
    ...report,
    idempotencyKey: report.id,
  });
  await localQueue.delete(result.id);
  return "synced";
}`,
        },
      },
      {
        id: "tradeoffs",
        title: "Keep confidence separate from color",
        paragraphs: [
          "A map marker cannot carry every detail. This concept gives each report a short status label, a timestamp, and a source note alongside its color. The same information remains available to screen readers and in the list view, so a hue is never the only clue.",
          "The fixture also avoids drawing a precise heat map from a handful of reports. Sparse data can look more certain than it is. A cluster count and an explicit “few reports” state are more honest than a smooth surface that suggests a complete picture.",
        ],
        bullets: [
          "Queued reports remain visibly local until acknowledged.",
          "Old observations expire from the live view but remain in the author’s local history until cleared.",
          "A missing basemap never blocks reading or submitting a report.",
        ],
      },
      {
        id: "lessons",
        title: "What the constraint changed",
        paragraphs: [
          "Starting offline-first changed the shape of the form. It made the team decide what information was essential, which states needed names, and how duplicate submissions would be prevented before the API existed. Those are product decisions expressed through architecture.",
          "A real implementation would need field research, moderation rules, location privacy review, and careful agreements about who maintains the map data. This fixture intentionally makes no claim that those questions have been solved.",
        ],
      },
    ],
  },
  {
    slug: "relay-room",
    title: "Relay Room",
    category: "Developer tools",
    dek: "A local-first incident notebook for teams that need a shared timeline without a wall of chat.",
    summary:
      "A small event log turns scattered notes into a searchable incident timeline, with explicit ownership and a calm handoff.",
    technologies: ["Rust", "SQLite", "WebAssembly", "React"],
    artwork: "relay",
    featured: true,
    readMinutes: 6,
    teamLabel: "Illustrative team · contributor names intentionally omitted",
    provenance:
      "Fictional case-study fixture created to demonstrate the Projects archive. No real team, event, or incident is represented.",
    demoUrl: "https://example.com/relay-room-demo",
    repositoryUrl: "https://example.com/relay-room-repository",
    introduction:
      "Incident response often creates more messages than shared understanding. Relay Room is a fictional tool concept that starts with a local event log, then makes the timeline easy to read, export, and hand to another person.",
    sections: [
      {
        id: "problem",
        title: "A timeline needs ownership",
        paragraphs: [
          "During an incident, updates arrive in chat, notes, dashboards, and someone’s memory. The hard part is not collecting every message. It is keeping the current facts, next action, and accountable person visible without making the room noisier.",
          "Relay Room models each update as a small event: what changed, who owns the next step, and when the note was added. The goal is a handoff that can be understood without replaying the whole conversation.",
        ],
      },
      {
        id: "architecture",
        title: "A local core with a thin view",
        paragraphs: [
          "The Rust core owns validation and event ordering. A SQLite file keeps the notebook available without a hosted account, while a WebAssembly boundary lets the React interface call the same rules in browser tests and the packaged app.",
        ],
        architecture: [
          { label: "React view", detail: "Timeline + handoff" },
          { label: "WASM bridge", detail: "Typed commands" },
          { label: "Rust core", detail: "Rules + ordering" },
          { label: "SQLite", detail: "Local event log" },
        ],
        bullets: [
          "Events are append-only within a local incident notebook.",
          "Exports are plain JSON so a handoff does not depend on the app remaining installed.",
          "The user can mark an event as a correction without erasing the original note.",
        ],
      },
      {
        id: "tradeoffs",
        title: "Treat corrections as part of the record",
        paragraphs: [
          "Editing an old event in place makes the latest screen look clean, but removes the context someone may have acted on. Relay Room records a correction that points to the original entry. The reader sees the current statement first and can inspect the history when needed.",
          "This choice costs more storage and requires a clear display for superseded notes. For a compact incident log, that trade is reasonable: clarity should not depend on pretending an earlier observation never happened.",
        ],
        quote:
          "A handoff is a product surface. The log is only useful if the next person can tell what changed.",
      },
      {
        id: "lessons",
        title: "What remains unresolved",
        paragraphs: [
          "A local-first notebook is not automatically collaborative. Multi-device merge, identity, access control, and conflict resolution need their own design. This concept keeps those questions visible rather than slipping in a cloud sync service to make the demo look complete.",
        ],
      },
    ],
  },
  {
    slug: "margin-notes",
    title: "Margin Notes",
    category: "Learning tools",
    dek: "A reading companion that helps a study group compare questions without copying the page.",
    summary:
      "Readers attach private prompts to a chapter outline, then share only the question that starts a useful discussion.",
    technologies: ["React", "Web Storage", "TypeScript", "Accessibility"],
    artwork: "margin",
    featured: true,
    readMinutes: 4,
    teamLabel: "Illustrative team · contributor names intentionally omitted",
    provenance:
      "Fictional case-study fixture created to demonstrate the Projects archive. It does not describe a real student team or classroom.",
    demoUrl: "https://example.com/margin-notes-demo",
    repositoryUrl: "https://example.com/margin-notes-repository",
    introduction:
      "Margin Notes explores a small learning interaction: turning a private question into a useful prompt for a study group, while keeping personal annotations on the reader’s own device.",
    sections: [
      {
        id: "problem",
        title: "Share the question, not the page",
        paragraphs: [
          "A useful reading group does not need another shared document full of copied passages. It needs a way to say, “I got stuck here,” and bring the group to the same idea without republishing someone else’s material.",
        ],
      },
      {
        id: "design",
        title: "Keep private notes private by default",
        paragraphs: [
          "The outline gives the group a shared set of anchors, while annotations stay local. A reader can share a prompt tied to an anchor, but the application never uploads the surrounding text. If a shared prompt outlives its reference, it remains readable as a question instead of becoming a broken highlight.",
          "Keyboard users can move through chapters and annotations in document order. Color marks are paired with short labels, and the interface does not depend on selecting a tiny target inside a dense paragraph.",
        ],
        architecture: [
          { label: "Chapter anchor", detail: "Shared outline" },
          { label: "Local note", detail: "Stored on device" },
          { label: "Prompt", detail: "Explicitly shared" },
          { label: "Group view", detail: "Question only" },
        ],
      },
      {
        id: "lessons",
        title: "A boundary is a feature",
        paragraphs: [
          "The fixture’s main engineering choice is also its product promise: private notes do not silently become group data. That removes automatic cross-device sync and means a lost device can mean lost notes. A real product would need to make that limitation clear before adding a backup path.",
        ],
      },
    ],
  },
  {
    slug: "chord-lab",
    title: "Chord Lab",
    category: "Creative computing",
    dek: "A browser instrument that turns simple timing patterns into a shared, accessible sound sketch.",
    summary:
      "A Web Audio experiment explores how people can shape rhythm with sound, text, and keyboard controls together.",
    technologies: ["Web Audio", "React", "Canvas", "Keyboard UX"],
    artwork: "chord",
    readMinutes: 5,
    teamLabel: "Illustrative team · contributor names intentionally omitted",
    provenance:
      "Fictional case-study fixture created to demonstrate the Projects archive. No real performance or contributor is represented.",
    demoUrl: "https://example.com/chord-lab-demo",
    repositoryUrl: "https://example.com/chord-lab-repository",
    introduction:
      "Chord Lab is an illustrative browser instrument for exploring timing patterns. Its central engineering question is how to make a visual rhythm sketch work for people who listen, watch, or navigate without a pointer.",
    sections: [
      {
        id: "problem",
        title: "Make timing legible in more than one way",
        paragraphs: [
          "A sequencer can look intuitive while hiding its timing model behind color and position. This concept gives every step a text label, announces playback changes, and keeps the same order in the keyboard interaction as in the visual grid.",
        ],
      },
      {
        id: "architecture",
        title: "Schedule ahead, render now",
        paragraphs: [
          "The Web Audio clock schedules events slightly ahead of the playhead. React owns the editable pattern, but it does not drive individual audio ticks. A small scheduler checks the current audio time and queues the next note window, keeping UI rendering separate from sound timing.",
        ],
        architecture: [
          { label: "Pattern state", detail: "Accessible controls" },
          { label: "Scheduler", detail: "Audio clock window" },
          { label: "Voice nodes", detail: "Oscillator + envelope" },
          { label: "Status text", detail: "Playhead + tempo" },
        ],
        code: {
          language: "TypeScript",
          source: `const lookAheadSeconds = 0.12;

function scheduleStep(step: Step, audioTime: number) {
  const voice = audioContext.createOscillator();
  const envelope = audioContext.createGain();

  voice.frequency.value = step.frequency;
  envelope.gain.setValueAtTime(0, audioTime);
  envelope.gain.linearRampToValueAtTime(0.2, audioTime + 0.01);
  envelope.gain.exponentialRampToValueAtTime(0.001, audioTime + 0.18);
  voice.connect(envelope).connect(audioContext.destination);
  voice.start(audioTime);
  voice.stop(audioTime + 0.2);
}`,
        },
      },
      {
        id: "lessons",
        title: "Keep the experiment honest",
        paragraphs: [
          "Browser timing varies with device load and audio output. The interface avoids claiming studio-grade synchronization and exposes tempo as an explicit control. A future version would need user testing with assistive technology and more careful audio session handling before it could promise a complete instrument experience.",
        ],
      },
    ],
  },
];

export const featuredProjects = projectFixtures.filter(
  (project) => project.featured,
);

export const allTechnologies = Array.from(
  new Set(projectFixtures.flatMap((project) => project.technologies)),
).sort((first, second) => first.localeCompare(second));

export function findProject(slug: string) {
  return projectFixtures.find((project) => project.slug === slug);
}

export function getRelatedProjects(project: ProjectFixture) {
  return projectFixtures
    .filter((candidate) => candidate.slug !== project.slug)
    .map((candidate) => ({
      project: candidate,
      overlap: candidate.technologies.filter((technology) =>
        project.technologies.includes(technology),
      ).length,
    }))
    .sort((first, second) => second.overlap - first.overlap)
    .slice(0, 2)
    .map(({ project: candidate }) => candidate);
}
