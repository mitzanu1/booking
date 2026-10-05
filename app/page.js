import Link from "next/link";

export default function Home() {
  return (
    <main className="page">
      <section className="card">
        <p className="eyebrow">DAYLIGHT BOOKING</p>
        <h1>Your own booking widget</h1>
        <p className="intro">
          Create a business account, get a 7-day trial, and manage your own
          appointments. A mock subscription lets you test paid customization.
        </p>
        <div className="link-list">
          <Link className="button" href="/dashboard">Create account / sign in</Link>
          <Link className="button button-secondary" href="/widget">Widget preview</Link>
        </div>
        <div className="setup-note">
          <strong>WordPress</strong>
          <p>
            After signing in, copy your business-specific shortcode from the
            dashboard and add it to a page with the Daylight Booking plugin installed.
          </p>
        </div>
      </section>
    </main>
  );
}
