/** Top of an inner page, in the home hero's pattern: pill, large heading, lead text. */
export function PageHead({ eyebrow, title, children, aside }: { eyebrow: string; title: string; children?: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="es-wrap pb-10 pt-16 md:pb-14 md:pt-24">
      <span className="es-pill">{eyebrow}</span>
      <h1 className="es-h2 mt-6 max-w-[820px]" style={{ fontSize: "clamp(38px, 6.4vw, 60px)", letterSpacing: "-0.045em" }}>
        {title}
      </h1>
      {children ? <div className="es-lead mt-5">{children}</div> : null}
      {aside ? <div className="mt-6">{aside}</div> : null}
    </section>
  );
}
