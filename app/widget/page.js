"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { isSupabaseConfigured, supabase } from "../../lib/supabase";

const DEFAULT_SETTINGS = {
  business_name: "Daylight Booking",
  widget_title: "Book a consultation",
  widget_intro: "Choose a date and time and we’ll save your request.",
  brand_color: "#28453a",
};

function getMinimumDateTime() {
  const date = new Date();
  date.setMinutes(date.getMinutes() + 5);
  date.setSeconds(0, 0);
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function BookingWidget() {
  const [business, setBusiness] = useState(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [hasWidgetKey, setHasWidgetKey] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadWidget() {
      if (!supabase) {
        setLoading(false);
        setMessage("Booking is not configured yet. Check the Supabase environment variables.");
        return;
      }

      const widgetKey = new URLSearchParams(window.location.search).get("wid");
      if (!widgetKey) {
        setHasWidgetKey(false);
        setLoading(false);
        setMessage("This is a widget preview. Create an account to connect a booking widget to your business.");
        return;
      }
      setHasWidgetKey(true);

      try {
        const { data, error } = await supabase
          .from("businesses")
          .select("id, business_name, widget_title, widget_intro, brand_color")
          .eq("widget_key", widgetKey)
          .maybeSingle();
        if (error) throw error;
        if (!data) {
          setMessage("This booking widget is unavailable. It may have expired or the link may be incorrect.");
        } else if (!cancelled) {
          setBusiness(data);
          setSettings({
            business_name: data.business_name,
            widget_title: data.widget_title,
            widget_intro: data.widget_intro,
            brand_color: data.brand_color,
          });
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Could not load booking widget.", error);
          setMessage("Could not load this booking widget. Please try again later.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadWidget();
    return () => {
      cancelled = true;
    };
  }, []);

  async function submitBooking(event) {
    event.preventDefault();
    setMessage("");

    if (!supabase || !business) {
      setMessage("This widget is not connected to a business.");
      return;
    }

    if (new Date(startsAt) <= new Date()) {
      setMessage("Choose a future date and time.");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("bookings").insert({
        business_id: business.id,
        customer_name: name.trim(),
        customer_email: email.trim(),
        starts_at: new Date(startsAt).toISOString(),
      });

      if (error?.code === "23505") {
        setMessage("That time is already booked for this business. Please choose another.");
      } else if (error) {
        console.error("Could not create booking.", error);
        setMessage("The booking could not be saved. Please try again.");
      } else {
        setName("");
        setEmail("");
        setStartsAt("");
        setMessage("Your appointment request has been booked.");
      }
    } catch (error) {
      console.error("Could not create booking.", error);
      setMessage("The booking could not be saved. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="page">
      <section className="card widget-card" style={{ "--widget-brand": settings.brand_color }}>
        <p className="eyebrow">{settings.business_name}</p>
        <h1>{settings.widget_title}</h1>
        <p className="intro">{settings.widget_intro}</p>
        {loading ? (
          <p className="notice">Loading booking form…</p>
        ) : business ? (
          <form className="form" onSubmit={submitBooking}>
            <label>
              Your name
              <input
                autoComplete="name"
                maxLength={100}
                onChange={(event) => setName(event.target.value)}
                required
                value={name}
              />
            </label>
            <label>
              Email
              <input
                autoComplete="email"
                maxLength={254}
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                value={email}
              />
            </label>
            <label>
              Date and time
              <input
                min={getMinimumDateTime()}
                onChange={(event) => setStartsAt(event.target.value)}
                required
                type="datetime-local"
                value={startsAt}
              />
            </label>
            <button className="button widget-button" disabled={saving || !isSupabaseConfigured} type="submit">
              {saving ? "Booking…" : "Book appointment"}
            </button>
          </form>
        ) : (
          <p className="notice widget-status">
            {message}
            {!hasWidgetKey && (
              <> <Link href="/dashboard">Create your business account</Link>.</>
            )}
          </p>
        )}
        {message && business && <p className="notice" role="status">{message}</p>}
      </section>
    </main>
  );
}
