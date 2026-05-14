const tier1Sponsors = [
  { name: "Sponsor A", logo: null },
  { name: "Sponsor B", logo: null },
];

const tier2Sponsors = [
  { name: "Sponsor C", logo: null },
  { name: "Sponsor D", logo: null },
  { name: "Sponsor E", logo: null },
  { name: "Sponsor F", logo: null },
  { name: "Sponsor G", logo: null },
  { name: "Sponsor H", logo: null },
];

const partners = [
  { name: "Partner A", logo: null },
  { name: "Partner B", logo: null },
  { name: "Partner C", logo: null },
];

const Sponsors = () => {
  return (
    <section>
      {/* Sponsors subsection */}
      <h2>Our Sponsors</h2>

      {/* Tier 1: one card per row (most prominent) */}
      <div>
        {tier1Sponsors.map((s) => (
          <div key={s.name}>
            {s.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={s.logo} alt={s.name} />
            ) : (
              <span>LOGO PLACEHOLDER</span>
            )}
          </div>
        ))}
      </div>

      {/* Tier 2: three cards per row */}
      <div>
        {tier2Sponsors.map((s) => (
          <div key={s.name}>
            {s.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={s.logo} alt={s.name} />
            ) : (
              <span>LOGO PLACEHOLDER</span>
            )}
          </div>
        ))}
      </div>

      {/* Partners subsection */}
      <h2>Our Partners</h2>

      {/* Partners: three cards per row */}
      <div>
        {partners.map((p) => (
          <div key={p.name}>
            {p.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.logo} alt={p.name} />
            ) : (
              <span>LOGO PLACEHOLDER</span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

export default Sponsors;
