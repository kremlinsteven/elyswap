import Link from "next/link";

export default function NotFound() {
  return (
    <section className="es-wrap grid min-h-[70vh] content-center gap-6 py-[120px]">
      <span className="es-pill w-fit">404</span>
      <h1 className="es-h1">No route to this page.</h1>
      <p className="es-lead">The link points nowhere. Your HYPE is not affected: this site never holds it.</p>
      <div className="flex flex-wrap gap-3">
        <Link href="/" className="es-btn">
          Back home
        </Link>
        <Link href="/routes" className="es-btn ghost">
          Compare routes
        </Link>
      </div>
    </section>
  );
}
