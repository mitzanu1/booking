import Link from "next/link";

export default function Home() {
  return (
    <main className="page">
      <section className="card">
        <p className="eyebrow">BOOKING DEMO</p>
        <h1>A simple booking flow</h1>
        <p className="intro">
          Customers book through the hosted widget. The provider signs in to see
          appointments. Both use the same Supabase project.
        </p>
        <div className="link-list">
          <Link className="button" href="/widget">Open booking widget</Link>
          <Link className="button button-secondary" href="/dashboard">Provider dashboard</Link>
        </div>
        <div className="setup-note">
          <strong>WordPress</strong>
          <p>
            Install the plugin in <code>wordpress-plugin/daylight-booking</code>,
            then add{" "}
            <code>
              [daylight_book_now url=&quot;https://your-app.vercel.app/widget&quot;]
            </code>{" "}
            to a page.
          </p>
        </div>
      </section>
    </main>
  );
}
