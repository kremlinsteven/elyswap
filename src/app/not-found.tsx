import Link from "next/link";

export default function NotFound() {
  return (
    <section className="wrap grid min-h-[70vh] content-center gap-6 pt-[120px]">
      <span className="eyebrow">[ 404 ]</span>
      <h1 className="h-giant">
        Out of range<span className="adot" aria-hidden="true" />
      </h1>
      <p className="lede">This page does not exist. The price may have moved; the link did not.</p>
      <div>
        <Link href="/" className="es-btn ghost">
          Back home
        </Link>
      </div>
    </section>
  );
}
