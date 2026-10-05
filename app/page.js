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
          <a className="button button-secondary" download href="/daylight-booking.zip">
            Download WordPress plugin
          </a>
        </div>
        <div className="setup-note">
          <strong>WordPress</strong>
          <p>
            Download and install the plugin ZIP, then sign in and copy your
            business-specific shortcode into a WordPress Shortcode block.
          </p>
        </div>
      </section>
    </main>
  );
}
