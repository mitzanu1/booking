"use client";

import { useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "../../lib/supabase";

const DEFAULT_SETTINGS = {
  business_name: "My business",
  widget_title: "Book a consultation",
  widget_intro: "Choose a date and time and we’ll save your request.",
  brand_color: "#28453a",
};

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getDaysRemaining(value) {
  return Math.max(0, Math.ceil((new Date(value).getTime() - Date.now()) / 86400000));
}

export default function Dashboard() {
  const [session, setSession] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [loadingAccount, setLoadingAccount] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [business, setBusiness] = useState(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [bookings, setBookings] = useState([]);
  const [message, setMessage] = useState("");
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [appUrl, setAppUrl] = useState("");

  useEffect(() => {
    setAppUrl(window.location.origin);
  }, []);

  useEffect(() => {
    if (!supabase) {
      setCheckingSession(false);
      return undefined;
    }

    supabase.auth.getSession().then(
      ({ data, error }) => {
        if (error) {
          console.error("Could not check your sign-in session.", error);
          setMessage("Could not check your sign-in session.");
        }
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
      if (!nextSession) {
        setBusiness(null);
        setBookings([]);
      }
    });

    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session || !supabase) return undefined;

    let cancelled = false;
    async function loadAccount() {
      setLoadingAccount(true);
      setLoadingBookings(true);
      setMessage("");

      try {
        const { data: businessId, error: ensureError } = await supabase.rpc("ensure_business_profile");
        if (ensureError) throw ensureError;

        const [{ data: businessData, error: businessError }, { data: bookingData, error: bookingError }] =
          await Promise.all([
            supabase
              .from("businesses")
              .select("id, widget_key, business_name, widget_title, widget_intro, brand_color, trial_ends_at, paid_until")
              .eq("id", businessId)
              .single(),
            supabase
              .from("bookings")
              .select("id, customer_name, customer_email, starts_at, created_at")
              .eq("business_id", businessId)
              .order("starts_at"),
          ]);

        if (businessError) throw businessError;
        if (bookingError) throw bookingError;
        if (cancelled) return;

        setBusiness(businessData);
        setSettings({
          business_name: businessData.business_name,
          widget_title: businessData.widget_title,
          widget_intro: businessData.widget_intro,
          brand_color: businessData.brand_color,
        });
        setBookings(bookingData ?? []);
      } catch (error) {
        if (cancelled) return;
        console.error("Could not load the business dashboard.", error);
        setMessage("Could not load your business dashboard. Check that the Supabase setup has been applied.");
      } finally {
        if (!cancelled) {
          setLoadingAccount(false);
          setLoadingBookings(false);
        }
      }
    }

    loadAccount();
    return () => {
      cancelled = true;
    };
  }, [session]);

  const isPaid = Boolean(business?.paid_until && new Date(business.paid_until) > new Date());
  const trialDaysRemaining = business ? getDaysRemaining(business.trial_ends_at) : 0;
  const widgetUrl = business ? `${appUrl}/widget?wid=${business.widget_key}` : "";
  const shortcode = widgetUrl ? `[daylight_book_now url="${widgetUrl}"]` : "";

  async function signIn(event) {
    event.preventDefault();
    setMessage("");
    if (!supabase) {
      setMessage("Dashboard is not configured yet. Check the Supabase environment variables.");
      return;
    }
    setAuthBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) setMessage("Sign-in failed. Check your email and password.");
      else setPassword("");
    } catch (error) {
      console.error("Could not sign in.", error);
      setMessage("Sign-in failed. Please try again.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function signUp(event) {
    event.preventDefault();
    setMessage("");
    if (!supabase) {
      setMessage("Dashboard is not configured yet. Check the Supabase environment variables.");
      return;
    }
    setAuthBusy(true);
    try {
      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
      if (error) {
        console.error("Could not create account.", error);
        setMessage(error.message);
      } else if (!data.session) {
        setMessage("Check your email to confirm your account, then sign in to open your dashboard.");
      } else {
        setPassword("");
      }
    } catch (error) {
      console.error("Could not create account.", error);
      setMessage("Could not create your account. Please try again.");
    } finally {
      setAuthBusy(false);
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

  async function saveSettings(event) {
    event.preventDefault();
    if (!business || !isPaid || !supabase) return;
    setSavingSettings(true);
    setMessage("");
    try {
      const { data, error } = await supabase
        .from("businesses")
        .update(settings)
        .eq("id", business.id)
        .select("id, widget_key, business_name, widget_title, widget_intro, brand_color, trial_ends_at, paid_until")
        .single();
      if (error) throw error;
      setBusiness(data);
      setSettings({
        business_name: data.business_name,
        widget_title: data.widget_title,
        widget_intro: data.widget_intro,
        brand_color: data.brand_color,
      });
      setMessage("Widget settings saved.");
    } catch (error) {
      console.error("Could not save widget settings.", error);
      setMessage("Could not save widget settings. Please try again.");
    } finally {
      setSavingSettings(false);
    }
  }

  async function setMockSubscription(enabled) {
    if (!supabase) return;
    setProcessingPayment(true);
    setMessage("");
    try {
      const { error } = await supabase.rpc("set_mock_subscription", { p_enabled: enabled });
      if (error) throw error;
      const { data, error: refreshError } = await supabase
        .from("businesses")
        .select("id, widget_key, business_name, widget_title, widget_intro, brand_color, trial_ends_at, paid_until")
        .eq("id", business.id)
        .single();
      if (refreshError) throw refreshError;
      setBusiness(data);
      setMessage(enabled
        ? "Mock payment approved. Customization is unlocked for 30 days."
        : "Mock subscription cancelled. Customization is locked again.");
    } catch (error) {
      console.error("Mock payment action failed.", error);
      setMessage("Could not update the mock subscription. Apply the latest Supabase setup and try again.");
    } finally {
      setProcessingPayment(false);
    }
  }

  async function copyShortcode() {
    try {
      await navigator.clipboard.writeText(shortcode);
      setMessage("WordPress shortcode copied.");
    } catch (error) {
      console.error("Could not copy WordPress shortcode.", error);
      setMessage("Could not copy the shortcode. Select and copy it manually.");
    }
  }

  if (checkingSession) {
    return <main className="page"><section className="card"><p>Checking sign-in…</p></section></main>;
  }

  return (
    <main className="page">
      <section className="card dashboard-card">
        <p className="eyebrow">DAYLIGHT BOOKING</p>
        <h1>{session ? "Your dashboard" : "Your booking business"}</h1>
        {!session ? (
          <>
            <p className="intro">Create an account to get your own booking widget and private appointments dashboard.</p>
            <form className="form" onSubmit={isSignUpMode ? signUp : signIn}>
              <label>
                Email
                <input
                  autoComplete="email"
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  type="email"
                  value={email}
                />
              </label>
              <label>
                Password
                <input
                  autoComplete={isSignUpMode ? "new-password" : "current-password"}
                  minLength={6}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  type="password"
                  value={password}
                />
              </label>
              <button className="button" disabled={!isSupabaseConfigured || authBusy} type="submit">
                {authBusy ? "Please wait…" : isSignUpMode ? "Create account" : "Sign in"}
              </button>
              <button
                className="text-button auth-switch"
                disabled={authBusy}
                onClick={() => setIsSignUpMode((value) => !value)}
                type="button"
              >
                {isSignUpMode ? "Already have an account? Sign in" : "New here? Create an account"}
              </button>
            </form>
            {!isSupabaseConfigured && (
              <p className="notice" role="alert">Add your Supabase URL and publishable/anon key to the app environment.</p>
            )}
          </>
        ) : (
          <>
            <div className="dashboard-heading">
              <p className="intro">Signed in as {session.user.email}</p>
              <button className="text-button" onClick={signOut} type="button">Sign out</button>
            </div>

            {loadingAccount ? <p className="notice">Loading your business…</p> : business && (
              <>
                <section className={`plan-card${isPaid ? " plan-card-paid" : ""}`} aria-live="polite">
                  <div>
                    <p className="eyebrow">{isPaid ? "MOCK PAID PLAN" : trialDaysRemaining ? "7-DAY FREE TRIAL" : "TRIAL ENDED"}</p>
                    <p className="plan-description">
                      {isPaid
                        ? `Mock subscription active until ${formatDate(business.paid_until)}.`
                        : trialDaysRemaining
                          ? `${trialDaysRemaining} day${trialDaysRemaining === 1 ? "" : "s"} remaining. Your bookings stay active; widget customization is locked until subscribed.`
                          : "Your trial has ended. New bookings are paused until you subscribe; existing appointments remain visible."}
                    </p>
                  </div>
                  <button
                    className={isPaid ? "button button-secondary" : "button"}
                    disabled={processingPayment}
                    onClick={() => setMockSubscription(!isPaid)}
                    type="button"
                  >
                    {processingPayment ? "Processing…" : isPaid ? "Cancel mock subscription" : "Test mock payment"}
                  </button>
                  <p className="mock-notice">Testing only — no real payment is collected. This mock action unlocks customization for 30 days.</p>
                </section>

                <section className="dashboard-section">
                  <h2>Your WordPress widget</h2>
                  <p className="section-intro">Use this shortcode on a WordPress page to show your own booking widget.</p>
                  <div className="copy-row">
                    <code>{shortcode}</code>
                    <button className="button button-secondary" onClick={copyShortcode} type="button">Copy</button>
                  </div>
                </section>

                <section className="dashboard-section">
                  <h2>Widget customization</h2>
                  {isPaid ? (
                    <form className="form settings-form" onSubmit={saveSettings}>
                      <label>
                        Business name
                        <input
                          maxLength={80}
                          onChange={(event) => setSettings({ ...settings, business_name: event.target.value })}
                          required
                          value={settings.business_name}
                        />
                      </label>
                      <label>
                        Widget heading
                        <input
                          maxLength={80}
                          onChange={(event) => setSettings({ ...settings, widget_title: event.target.value })}
                          required
                          value={settings.widget_title}
                        />
                      </label>
                      <label>
                        Intro text
                        <input
                          maxLength={180}
                          onChange={(event) => setSettings({ ...settings, widget_intro: event.target.value })}
                          required
                          value={settings.widget_intro}
                        />
                      </label>
                      <label className="color-label">
                        Brand color
                        <input
                          aria-label="Brand color"
                          onChange={(event) => setSettings({ ...settings, brand_color: event.target.value })}
                          type="color"
                          value={settings.brand_color}
                        />
                      </label>
                      <div className="widget-preview" style={{ "--widget-brand": settings.brand_color }}>
                        <p className="eyebrow">{settings.business_name || "Business name"}</p>
                        <strong>{settings.widget_title || "Widget heading"}</strong>
                        <p>{settings.widget_intro || "Widget introduction"}</p>
                        <span>Book appointment</span>
                      </div>
                      <button className="button" disabled={savingSettings} type="submit">
                        {savingSettings ? "Saving…" : "Save widget"}
                      </button>
                    </form>
                  ) : (
                    <p className="locked-note">Business name, heading, intro and brand color can be changed after a subscription is active.</p>
                  )}
                </section>

                <section className="dashboard-section">
                  <h2>Appointments</h2>
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
                </section>
              </>
            )}
          </>
        )}
        {message && <p className="notice" role="status">{message}</p>}
      </section>
    </main>
  );
}
