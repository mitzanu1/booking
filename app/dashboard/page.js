"use client";

import { useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "../../lib/supabase";

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function Dashboard() {
  const [session, setSession] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [bookings, setBookings] = useState([]);
  const [message, setMessage] = useState("");
  const [loadingBookings, setLoadingBookings] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setCheckingSession(false);
      return undefined;
    }

    supabase.auth.getSession().then(
      ({ data, error }) => {
        if (error) setMessage("Could not check your sign-in session.");
        setSession(data?.session ?? null);
        setCheckingSession(false);
      },
      (error) => {
        console.error("Could not check sign-in session.", error);
        setMessage("Could not check your sign-in session.");
        setCheckingSession(false);
      },
    );

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setMessage("");
    });

    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session || !supabase) {
      setBookings([]);
      return;
    }

    let cancelled = false;
    setLoadingBookings(true);
    supabase
      .from("bookings")
      .select("id, customer_name, customer_email, starts_at, created_at")
      .order("starts_at")
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error("Could not load bookings.", error);
          setMessage("Could not load appointments.");
        } else {
          setBookings(data);
        }
        setLoadingBookings(false);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Could not load bookings.", error);
        setMessage("Could not load appointments.");
        setLoadingBookings(false);
      });

    return () => {
      cancelled = true;
    };
  }, [session]);

  async function signIn(event) {
    event.preventDefault();
    setMessage("");

    if (!supabase) {
      setMessage("Dashboard is not configured yet. Check the Supabase environment variables.");
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMessage("Sign-in failed. Check your email and password.");
      } else {
        setPassword("");
      }
    } catch (error) {
      console.error("Could not sign in.", error);
      setMessage("Sign-in failed. Please try again.");
    }
  }

  async function signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Could not sign out.", error);
        setMessage("Could not sign out. Please try again.");
      }
    } catch (error) {
      console.error("Could not sign out.", error);
      setMessage("Could not sign out. Please try again.");
    }
  }

  if (checkingSession) {
    return <main className="page"><section className="card"><p>Checking sign-in…</p></section></main>;
  }

  return (
    <main className="page">
      <section className="card dashboard-card">
        <p className="eyebrow">PROVIDER</p>
        <h1>Appointments</h1>
        {!session ? (
          <>
            <p className="intro">Sign in to view customer bookings.</p>
            <form className="form" onSubmit={signIn}>
              <label>
                Email
                <input
                  autoComplete="username"
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  type="email"
                  value={email}
                />
              </label>
              <label>
                Password
                <input
                  autoComplete="current-password"
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  type="password"
                  value={password}
                />
              </label>
              <button className="button" disabled={!isSupabaseConfigured} type="submit">Sign in</button>
            </form>
          </>
        ) : (
          <>
            <div className="dashboard-heading">
              <p className="intro">Signed in as {session.user.email}</p>
              <button className="text-button" onClick={signOut} type="button">Sign out</button>
            </div>
            {loadingBookings ? (
              <p className="notice">Loading appointments…</p>
            ) : bookings.length ? (
              <ul className="booking-list">
                {bookings.map((booking) => (
                  <li key={booking.id}>
                    <strong>{booking.customer_name}</strong>
                    <span>{booking.customer_email}</span>
                    <time dateTime={booking.starts_at}>{formatDate(booking.starts_at)}</time>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="notice">No appointments yet.</p>
            )}
          </>
        )}
        {message && <p className="notice" role="status">{message}</p>}
      </section>
    </main>
  );
}
