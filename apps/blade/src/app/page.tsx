export default function HomePage() {
  return (
    <main
      style={{ margin: "0 auto", maxWidth: "48rem", padding: "4rem 1.5rem" }}
    >
      <p style={{ color: "#a78bfa", fontWeight: 700, letterSpacing: "0.08em" }}>
        BLADE REFORGE
      </p>
      <h1 style={{ fontSize: "3rem", lineHeight: 1, margin: "1rem 0" }}>
        Platform scaffold is ready.
      </h1>
      <p style={{ color: "#cbd5e1", fontSize: "1.125rem", lineHeight: 1.7 }}>
        Legacy Blade and API code has been moved under <code>legacy/</code> for
        reference. This app is intentionally minimal until Reforge specs and
        SRDs define the next platform slice.
      </p>
    </main>
  );
}
