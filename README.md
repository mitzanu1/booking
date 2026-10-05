# Daylight Booking

Daylight Booking is a hosted appointment widget with a WordPress shortcode and a private dashboard for each business.

## Supabase setup

1. Configure `NEXT_PUBLIC_SUPABASE_URL` and either `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` in local development and Vercel.
2. In the Supabase SQL Editor, run [`supabase/schema.sql`](./supabase/schema.sql). It creates a business profile for each new account, adds owner-scoped booking access, and enables the widget and trial policies.
3. Enable email/password sign-in in Supabase Authentication. If email confirmation is enabled, new users must confirm their address before signing in.
4. Visit `/dashboard` to create an account or sign in.

Existing booking rows from before business accounts were added are left without an owner and are not shown to any business. New bookings require an active business-specific widget.

## Trial and widget customization

Each business gets a seven-day trial. Booking collection and the WordPress widget work during the trial, but customization is locked until a subscription is active. After the trial, new bookings pause until a subscription is activated; existing appointments remain available in the dashboard. The first customization controls are business name, widget heading, intro text, and brand color.

Download the installable plugin ZIP from the website's home page (`/daylight-booking.zip`), then upload it under **WordPress → Plugins → Add New Plugin → Upload Plugin** and activate it. The dashboard provides a shortcode such as:

```text
[daylight_book_now url="https://your-app.vercel.app/widget?wid=your-widget-id"]
```

Install the WordPress plugin from `wordpress-plugin/daylight-booking`, then paste the shortcode into a WordPress page.

## Mock payments

The dashboard's **Test mock payment** button activates a 30-day mock subscription, and **Cancel mock subscription** expires it immediately. No payment is collected. This intentionally simulated RPC is for testing only; replace it with a verified payment-provider webhook before accepting real subscriptions or charging customers.

## Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.
