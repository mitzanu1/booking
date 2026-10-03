"use client";

import { useState } from "react";
import { isSupabaseConfigured, supabase } from "../../lib/supabase";

function getMinimumDateTime() {
  const date = new Date();
  date.setMinutes(date.getMinutes() + 5);
  date.setSeconds(0, 0);
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function BookingWidget() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function submitBooking(event) {
    event.preventDefault();
    setMessage("");

    if (!supabase) {
      setMessage("Booking is not configured yet. Check the Supabase environment variables.");
      return;
    }

    if (new Date(startsAt) <= new Date()) {
      setMessage("Choose a future date and time.");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("bookings").insert({
        customer_name: name.trim(),
        customer_email: email.trim(),
        starts_at: new Date(startsAt).toISOString(),
      });

      if (error?.code === "23505") {
        setMessage("That time is already booked. Please choose another.");
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
      <section className="card">
        <p className="eyebrow">APPOINTMENT REQUEST</p>
        <h1>Book a consultation</h1>
        <p className="intro">Choose a date and time and we’ll save your request.</p>
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
          <button className="button" disabled={saving || !isSupabaseConfigured} type="submit">
            {saving ? "Booking…" : "Book appointment"}
          </button>
          {!isSupabaseConfigured && (
            <p className="notice" role="alert">Add your Supabase URL and anon key to .env.local.</p>
          )}
          {message && <p className="notice" role="status">{message}</p>}
        </form>
      </section>
    </main>
  );
}
