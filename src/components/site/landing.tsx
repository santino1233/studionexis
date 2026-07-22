"use client";

import { useEffect, useRef, useState } from "react";
import {
  Menu, X, Check, Zap, Sparkles, ArrowRight,
  LayoutDashboard, CalendarDays, Ticket, Users, ShoppingBag, Wallet, BarChart3, MessageSquare,
  CreditCard, Bell, Smartphone, TrendingUp, Store, Repeat, Mail, Star, Globe, Lock, Clock, Heart, Megaphone,
  CalendarPlus, CalendarCheck, MessageCircle, CheckCircle2, RefreshCw, Rocket, Gauge, PiggyBank, Plug,
} from "lucide-react";
import { AppLogo } from "@/components/apps/app-logos";
import { BASE_DOMAIN } from "@/lib/config";
import "./landing.css";

// Studio Nexis — marketing landing page, served on the apex host. Everything
// is CSS-drawn (no stock photos); the "product tour" recreates the real v2
// admin surfaces so the site shows the actual system, not mockup fluff.

const APP = `https://app.${BASE_DOMAIN}`;
const SIGNUP = `${APP}/signup`;
const LOGIN = `${APP}/login`;

function XLogo() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M18.9 2H22l-6.8 7.8L23.3 22h-6.3l-4.9-6.4L6.5 22H3.4l7.3-8.3L1 2h6.5l4.4 5.9L18.9 2zm-1.1 18h1.7L7.6 3.9H5.8L17.8 20z" /></svg>
  );
}
function IgLogo() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden><rect x="2" y="2" width="20" height="20" rx="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>
  );
}
function InLogo() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4V9h4v1.5A6 6 0 0 1 16 8z" /><rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" /></svg>
  );
}

// ── product-tour screens (recreations of real v2 admin pages) ──────────────
function Av({ c, children }: { c: string; children: React.ReactNode }) {
  return <i className="av" style={{ background: c }}>{children}</i>;
}

const TOUR = [
  {
    id: "dashboard", label: "Dashboard", icon: LayoutDashboard,
    render: () => (
      <>
        <div className="c-head"><div className="c-title">Good morning, Maya</div><span className="c-sub">Today · Reformer Studio</span></div>
        <div className="kpis">
          <div className="kpi"><small>Revenue · wk</small><b>$8,240</b><em>+12%</em></div>
          <div className="kpi"><small>Bookings</small><b>312</b><em>+8%</em></div>
          <div className="kpi"><small>Occupancy</small><b>87%</b><em>+4%</em></div>
          <div className="kpi"><small>New clients</small><b>24</b><em>+19%</em></div>
        </div>
        <div className="cols">
          <div className="pane"><h6>Revenue · this week</h6>
            <div className="bars">
              <i className="mut" style={{ height: "38%" }} /><i style={{ height: "54%" }} /><i className="mut" style={{ height: "46%" }} /><i style={{ height: "68%" }} /><i style={{ height: "58%" }} /><i style={{ height: "82%" }} /><i style={{ height: "96%" }} />
            </div>
          </div>
          <div className="pane"><h6>Next up today</h6>
            <div className="row"><span className="av" style={{ background: "var(--or)", fontSize: 8 }}>07</span> Group Reformer <span className="pill g">Full</span></div>
            <div className="row"><span className="av" style={{ background: "var(--purple)", fontSize: 8 }}>09</span> Mat Pilates <span className="pill o">10/12</span></div>
            <div className="row"><span className="av" style={{ background: "var(--blue)", fontSize: 8 }}>17</span> Yoga Flow <span className="pill n">13/14</span></div>
          </div>
        </div>
      </>
    ),
  },
  {
    id: "schedule", label: "Schedule", icon: CalendarDays,
    render: () => (
      <>
        <div className="c-head"><div className="c-title">Schedule</div><span className="c-sub">Week of Mar 9 · drag to reschedule</span></div>
        <div className="cal" style={{ marginBottom: 12 }}>
          <b>Mon</b><b>Tue</b><b>Wed</b><b>Thu</b><b>Fri</b><b>Sat</b><b>Sun</b>
          <i className="e" /><i /><i className="e2" /><i className="e" /><i /><i className="e" /><i />
          <i className="e2" /><i className="e" /><i /><i className="e" /><i className="e2" /><i className="e" /><i />
          <i className="e" /><i className="e2" /><i className="e" /><i /><i className="e" /><i className="e2" /><i />
        </div>
        <div className="pane">
          <div className="row"><span className="pill o">07:00</span> Group Reformer · Jane D. <span className="pill g">8/8</span></div>
          <div className="row"><span className="pill o">09:30</span> Mat Pilates · Marco R. <span className="pill n">10/12</span></div>
          <div className="row"><span className="pill o">12:00</span> Private — Anna <span className="pill g">1/1</span></div>
          <div className="row"><span className="pill o">17:30</span> Yoga Flow · Emma S. <span className="pill p">Waitlist 2</span></div>
        </div>
      </>
    ),
  },
  {
    id: "booking", label: "Booking", icon: Ticket,
    render: () => (
      <>
        <div className="c-head"><div className="c-title">Group Reformer · 09:30</div><span className="c-sub">8 of 12 booked · 2 waitlisted</span></div>
        <div className="pane" style={{ marginBottom: 10 }}>
          <div className="row"><Av c="var(--or)">AL</Av> Anna Lee <span className="pill g">Booked</span></div>
          <div className="row"><Av c="var(--purple)">JK</Av> James Kim <span className="pill g">Booked</span></div>
          <div className="row"><Av c="var(--blue)">SM</Av> Sarah Meyer <span className="pill p">Waitlist</span></div>
          <div className="row"><Av c="var(--green)">TP</Av> Tom Park <span className="pill g">Booked</span></div>
          <div className="row"><Av c="#eab308">EW</Av> Emma Wu <span className="pill o">Reserved</span></div>
        </div>
        <div className="bar"><i style={{ width: "66%" }} /></div>
        <span className="c-sub">Capacity 66% — waitlist auto-promotes the moment a spot frees up.</span>
      </>
    ),
  },
  {
    id: "clients", label: "Clients", icon: Users,
    render: () => (
      <>
        <div className="c-head"><div className="c-title">Anna Lee</div><span className="c-sub">Client since 2024 · VIP</span></div>
        <div className="kpis">
          <div className="kpi"><small>Visits</small><b>148</b></div>
          <div className="kpi"><small>Credits</small><b>7</b></div>
          <div className="kpi"><small>Lifetime</small><b>$3,480</b></div>
          <div className="kpi"><small>Last seen</small><b>2d</b></div>
        </div>
        <div className="pane"><h6>Activity timeline</h6>
          <div className="row"><Av c="var(--or)">✓</Av> Checked in — Group Reformer <span className="pill n">Today</span></div>
          <div className="row"><Av c="var(--green)">$</Av> Bought 10-Class Pack <span className="pill g">Mon</span></div>
          <div className="row"><Av c="var(--purple)">✦</Av> Birthday reward sent <span className="pill o">Mar 2</span></div>
        </div>
      </>
    ),
  },
  {
    id: "pos", label: "Point of sale", icon: ShoppingBag,
    render: () => (
      <>
        <div className="c-head"><div className="c-title">Checkout</div><span className="c-sub">Front desk · card & cash ready</span></div>
        <div className="cols">
          <div className="pane"><h6>Cart</h6>
            <div className="money"><span>10-Class Pack</span><span>$200.00</span></div>
            <div className="money"><span>Grip socks × 2</span><span>$24.00</span></div>
            <div className="money"><span>Gift card</span><span>$50.00</span></div>
            <div className="money"><span>Total</span><span style={{ color: "var(--or-ink)" }}>$274.00</span></div>
          </div>
          <div className="pane"><h6>Pay with</h6>
            <div className="row"><Av c="var(--or)"><CreditCard size={11} /></Av> Card · Stripe <span className="pill g">1-tap</span></div>
            <div className="row"><Av c="var(--blue)"><Smartphone size={11} /></Av> Terminal <span className="pill n">Tap</span></div>
            <div className="row"><Av c="var(--green)"><Wallet size={11} /></Av> Cash <span className="pill n">Drawer</span></div>
          </div>
        </div>
      </>
    ),
  },
  {
    id: "finance", label: "Finance", icon: Wallet,
    render: () => (
      <>
        <div className="c-head"><div className="c-title">March P&amp;L</div><span className="c-sub">Auto-categorized · cash basis</span></div>
        <div className="kpis">
          <div className="kpi"><small>Revenue</small><b>$48.2k</b><em>+12%</em></div>
          <div className="kpi"><small>Expenses</small><b>$17.9k</b></div>
          <div className="kpi"><small>Payroll</small><b>$9.4k</b></div>
          <div className="kpi"><small>Net profit</small><b>$20.9k</b><em>+18%</em></div>
        </div>
        <div className="pane"><h6>Instructor commissions</h6>
          <div className="row"><Av c="var(--or)">JD</Av> Jane D. · 42 classes <span className="pill g">$2,140</span></div>
          <div className="row"><Av c="var(--purple)">MR</Av> Marco R. · 36 classes <span className="pill g">$1,890</span></div>
          <div className="row"><Av c="var(--blue)">ES</Av> Emma S. · 28 classes <span className="pill o">$1,410</span></div>
        </div>
      </>
    ),
  },
  {
    id: "analytics", label: "Analytics", icon: BarChart3,
    render: () => (
      <>
        <div className="c-head"><div className="c-title">Growth</div><span className="c-sub">Trailing 12 months</span></div>
        <div className="cols">
          <div className="pane"><h6>Member retention</h6>
            <div className="bars" style={{ height: 108 }}>
              <i className="mut" style={{ height: "40%" }} /><i style={{ height: "52%" }} /><i className="mut" style={{ height: "47%" }} /><i style={{ height: "64%" }} /><i style={{ height: "58%" }} /><i style={{ height: "72%" }} /><i style={{ height: "70%" }} /><i style={{ height: "81%" }} /><i style={{ height: "92%" }} />
            </div>
          </div>
          <div className="pane"><h6>Class popularity</h6>
            <div className="money"><span>Group Reformer</span><span>96%</span></div><div className="bar"><i style={{ width: "96%" }} /></div>
            <div className="money"><span>Mat Pilates</span><span>84%</span></div><div className="bar"><i style={{ width: "84%" }} /></div>
            <div className="money"><span>Yoga Flow</span><span>71%</span></div><div className="bar"><i style={{ width: "71%" }} /></div>
          </div>
        </div>
      </>
    ),
  },
];

const SIDE_NAV: { icon: typeof LayoutDashboard; label: string; id: string }[] = [
  { icon: LayoutDashboard, label: "Dashboard", id: "dashboard" },
  { icon: CalendarDays, label: "Schedule", id: "schedule" },
  { icon: Ticket, label: "Bookings", id: "booking" },
  { icon: Users, label: "Clients", id: "clients" },
  { icon: ShoppingBag, label: "Point of sale", id: "pos" },
  { icon: Wallet, label: "Finance", id: "finance" },
  { icon: BarChart3, label: "Analytics", id: "analytics" },
];

const PLANS = [
  {
    id: "starter", name: "Starter", monthly: 36, for: "Everything a growing studio needs to run the day.",
    feats: ["Up to 500 active clients", "Up to 10 staff & instructors", "Online payments with Stripe", "Booking site & client portal", "POS, packages & vouchers", "Analytics, expenses & P&L"],
    hi: false,
  },
  {
    id: "growth", name: "Growth", monthly: 49, for: "For busy studios that live on their schedule.",
    feats: ["Everything in Starter", "Up to 1,500 active clients", "Up to 20 staff & instructors", "SMS reminders & waitlist texts", "Marketing automation", "Priority email support"],
    hi: true,
  },
  {
    id: "scale", name: "Scale", monthly: 75, for: "No ceilings — for multi-room & multi-team studios.",
    feats: ["Everything in Growth", "Unlimited clients", "Unlimited staff & instructors", "Unlimited bookings", "Multi-location & franchise", "Priority support"],
    hi: false,
  },
];

export default function Landing() {
  const [menu, setMenu] = useState(false);
  const [tab, setTab] = useState(0);
  const [annual, setAnnual] = useState(true);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const els = rootRef.current?.querySelectorAll(".rv");
    if (!els) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }),
      { threshold: 0.12 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const Active = TOUR[tab];

  return (
    <div className="nxs" ref={rootRef}>
      {/* ── nav ── */}
      <nav className="nxs-nav">
        <div className="nav-in">
          <a className="logo" href="/"><span className="logo-mark"><Sparkles /></span>Studio&nbsp;Nexis</a>
          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#tour">Product</a>
            <a href="#integrations">Integrations</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
          </div>
          <div className="nav-right">
            <a className="nav-login" href={LOGIN}>Log in</a>
            <a className="btn btn-primary" href={SIGNUP}>Start free<ArrowRight /></a>
            <button className="burger" aria-label="Menu" onClick={() => setMenu((m) => !m)}>{menu ? <X /> : <Menu />}</button>
          </div>
        </div>
      </nav>
      <div className={`nxs-mobile${menu ? " open" : ""}`}>
        <a href="#features" onClick={() => setMenu(false)}>Features</a>
        <a href="#tour" onClick={() => setMenu(false)}>Product</a>
        <a href="#integrations" onClick={() => setMenu(false)}>Integrations</a>
        <a href="#pricing" onClick={() => setMenu(false)}>Pricing</a>
        <a href="#faq" onClick={() => setMenu(false)}>FAQ</a>
        <a href={LOGIN}>Log in</a>
        <a href={SIGNUP}>Start free trial →</a>
      </div>

      {/* ── hero ── */}
      <header className="nxs-hero">
        <div className="bg-grid" />
        <div className="glow glow-a" /><div className="glow glow-b" />
        <div className="wrap hero-in">
          <span className="eyebrow"><Sparkles />The studio operating system</span>
          <h1>Run your whole studio<br />from <span className="em">one calm place</span></h1>
          <p className="lead">Booking, payments, memberships, staff, finance and marketing — the seven tools your pilates or yoga studio used to juggle, designed to work as one.</p>
          <div className="acts">
            <a className="btn btn-primary btn-lg" href={SIGNUP}>Start your free trial<ArrowRight /></a>
            <a className="btn btn-ghost btn-lg" href="#tour">Take the tour</a>
          </div>
          <div className="note">
            <span><Check />7-day free trial</span>
            <span><Check />No credit card</span>
            <span><Check />Set up in 10 minutes</span>
          </div>

          {/* live ticker */}
          <div className="nxs-ticker">
            <div className="ticker-track">
              {[...TICKER, ...TICKER].map((t, i) => (
                <span className="tk" key={i}><span className="dot" style={{ background: t.bg, color: t.fg }}>{t.icon}</span>{t.text}</span>
              ))}
            </div>
          </div>
        </div>

        {/* product window */}
        <div className="wrap">
          <div className="nxs-stage rv">
            <div className="chip float chip-tl"><span className="ci" style={{ background: "var(--green-bg)", color: "var(--green)" }}><TrendingUp /></span><div>+42% revenue<small>vs last month</small></div></div>
            <div className="chip float2 chip-br"><span className="ci" style={{ background: "var(--or-bg)", color: "var(--or-ink)" }}><Repeat /></span><div>Membership renewed<small>Unlimited · Sarah M.</small></div></div>
            <div className="win">
              <div className="win-bar"><i /><i /><i /><span className="win-url"><Lock />app.{BASE_DOMAIN}/dashboard</span></div>
              <div className="app">
                <aside className="app-side">
                  <div className="app-brand"><span className="m"><Sparkles /></span>Nexis</div>
                  {SIDE_NAV.map((n, i) => {
                    const Icon = n.icon;
                    return <button key={n.id} className={`nav-i${TOUR[tab].id === n.id ? " on" : ""}`} onClick={() => setTab(i)}><Icon />{n.label}</button>;
                  })}
                </aside>
                <div className="app-canvas">{Active.render()}</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── logo marquee ── */}
      <section className="nxs-logos rv">
        <div className="wrap">
          <p>Trusted by studios that would rather teach than do admin</p>
          <div className="logo-row">
            {["Reform House", "Flow Studio", "Core Society", "The Mat Club", "Studio North", "Elevate Pilates"].map((n) => (
              <span className="tlogo" key={n}><Sparkles />{n}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── features bento ── */}
      <section className="nxs-features" id="features">
        <div className="wrap">
          <div className="center rv">
            <span className="eyebrow"><Zap />The platform</span>
            <h2 className="h2">Everything your studio needs.<br /><em>Nothing it doesn&apos;t.</em></h2>
            <p className="lead">Seven products that used to be seven subscriptions — built together, so your schedule, payments and clients are finally one source of truth.</p>
          </div>

          <div className="bento">
            <div className="bcard w3 rv">
              <span className="bic"><CalendarDays /></span>
              <h3>Smart scheduling</h3>
              <p>A beautiful calendar with waitlists, recurring classes, room and instructor management — and online booking that fills your empty spots for you.</p>
              <div className="bmock">
                <div className="cal">
                  <b>M</b><b>T</b><b>W</b><b>T</b><b>F</b><b>S</b><b>S</b>
                  <i className="e" /><i /><i className="e2" /><i className="e" /><i /><i className="e" /><i />
                  <i /><i className="e2" /><i className="e" /><i /><i className="e" /><i className="e2" /><i />
                </div>
              </div>
              <div className="tags"><span>Waitlists</span><span>Recurring</span><span>Rooms</span><span>Check-in</span></div>
            </div>

            <div className="bcard w3 rv">
              <span className="bic"><ShoppingBag /></span>
              <h3>Payments &amp; POS</h3>
              <p>Sell packages, memberships, retail and gift cards with Stripe built in — one-tap checkout at the front desk, credits deducted automatically.</p>
              <div className="bmock">
                <div className="money"><span>10-Class Pack</span><span>$200.00</span></div>
                <div className="money"><span>Grip socks × 2</span><span>$24.00</span></div>
                <div className="money"><span>Total</span><span style={{ color: "var(--or-ink)" }}>$224.00</span></div>
              </div>
              <div className="tags"><span>Stripe</span><span>Gift cards</span><span>Retail</span><span>Vouchers</span></div>
            </div>

            <div className="bcard rv">
              <span className="bic"><Users /></span>
              <h3>Client CRM</h3>
              <p>Profiles with attendance, balances, notes, tags and a full timeline.</p>
              <div className="bmock">
                <div className="row"><Av c="var(--or)">AL</Av> Anna Lee <span className="pill g">VIP</span></div>
                <div className="row" style={{ borderBottom: "none" }}><span style={{ color: "var(--muted)" }}>Credits left</span><span className="pill o">7 left</span></div>
                <div className="bar"><i style={{ width: "70%" }} /></div>
              </div>
            </div>

            <div className="bcard rv">
              <span className="bic"><Wallet /></span>
              <h3>Finance</h3>
              <p>Revenue, P&amp;L, expenses, payroll and instructor commissions.</p>
              <div className="bmock">
                <div className="money"><span>Revenue</span><span style={{ color: "var(--green)" }}>$48,200</span></div>
                <div className="money"><span>Expenses</span><span>$17,900</span></div>
                <div className="money"><span>Net profit</span><span style={{ color: "var(--or-ink)" }}>$30,300</span></div>
              </div>
            </div>

            <div className="bcard rv">
              <span className="bic"><Repeat /></span>
              <h3>Memberships</h3>
              <p>Unlimited plans, credit packs, freezes and auto-renewals.</p>
              <div className="bmock">
                <div className="row"><span>Unlimited</span><span className="pill g">Active</span></div>
                <div className="row"><span>8 / month</span><span className="pill o">Renews 6d</span></div>
                <div className="row"><span>10 Pack</span><span className="pill n">Frozen</span></div>
              </div>
            </div>

            <div className="bcard rv">
              <span className="bic"><Megaphone /></span>
              <h3>Marketing</h3>
              <p>Email &amp; SMS campaigns, win-backs, birthday rewards and reviews.</p>
              <div className="bmock">
                <div className="row"><Av c="var(--blue)"><Mail size={11} /></Av> Win-back <span className="pill n">34 sent</span></div>
                <div className="row"><Av c="var(--or)"><Heart size={11} /></Av> Birthday reward <span className="pill o">scheduled</span></div>
                <div className="row"><Av c="var(--green)"><Star size={11} /></Av> Review request <span className="pill g">4.9 avg</span></div>
              </div>
            </div>

            <div className="bcard rv">
              <span className="bic"><BarChart3 /></span>
              <h3>Analytics</h3>
              <p>Occupancy, retention, lifetime value and instructor performance.</p>
              <div className="bmock">
                <div className="spark"><i style={{ height: "30%" }} /><i style={{ height: "46%" }} /><i style={{ height: "38%" }} /><i style={{ height: "60%" }} /><i style={{ height: "52%" }} /><i style={{ height: "74%" }} /><i className="hi" style={{ height: "92%" }} /></div>
              </div>
            </div>

            <div className="bcard rv">
              <span className="bic"><Store /></span>
              <h3>Your own website</h3>
              <p>A booking site on your domain, plus an app store of integrations.</p>
              <div className="bmock">
                <div className="row"><Av c="var(--purple)"><Globe size={11} /></Av> yourstudio.com <span className="pill g">Live</span></div>
                <div className="row" style={{ borderBottom: "none" }}><Av c="var(--or)"><Zap size={11} /></Av> Zapier · Meta · GA4 <span className="pill o">Connected</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── product tour ── */}
      <section className="nxs-why" id="tour">
        <div className="wrap">
          <div className="center rv">
            <span className="eyebrow"><LayoutDashboard />See it in action</span>
            <h2 className="h2">One product. <em>Every screen</em> your studio runs on.</h2>
            <p className="lead">Click through the actual admin surfaces — the same ones you&apos;ll use every day.</p>
          </div>
          <div className="nxs-tabs rv">
            {TOUR.map((t, i) => {
              const Icon = t.icon;
              return <button key={t.id} className={`tab${i === tab ? " on" : ""}`} onClick={() => setTab(i)}><Icon />{t.label}</button>;
            })}
          </div>
          <div className="nxs-stage rv" style={{ marginTop: 4 }}>
            <div className="win">
              <div className="win-bar"><i /><i /><i /><span className="win-url"><Lock />app.{BASE_DOMAIN}/{Active.id === "pos" ? "checkout" : Active.id}</span></div>
              <div className="app">
                <aside className="app-side">
                  <div className="app-brand"><span className="m"><Sparkles /></span>Nexis</div>
                  {SIDE_NAV.map((n, i) => {
                    const Icon = n.icon;
                    return <button key={n.id} className={`nav-i${TOUR[tab].id === n.id ? " on" : ""}`} onClick={() => setTab(i)}><Icon />{n.label}</button>;
                  })}
                </aside>
                <div className="app-canvas">{Active.render()}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── why grid ── */}
      <section className="nxs-features">
        <div className="wrap">
          <div className="center rv">
            <span className="eyebrow"><Heart />Why owners switch</span>
            <h2 className="h2">One login. One platform.<br /><em>Zero headaches.</em></h2>
          </div>
          <div className="why-grid">
            {WHY.map((w) => (
              <div className="wcard rv" key={w.t}><span className="bic">{w.icon}</span><h4>{w.t}</h4><p>{w.d}</p></div>
            ))}
          </div>
        </div>
      </section>

      {/* ── integrations (logo wall) ── */}
      <section className="nxs-integrations" id="integrations">
        <div className="wrap">
          <div className="center rv">
            <span className="eyebrow"><Plug />Integrations</span>
            <h2 className="h2">Works with the tools <em>you already use.</em></h2>
            <p className="lead">Take payments, text your clients, fire alerts to your team and feed your ad platforms — connected in a few clicks, no developer needed.</p>
          </div>
          <div className="intg-grid">
            {INTEGRATIONS.map((i) => (
              <div className="intg rv" key={i.id}>
                <AppLogo id={i.id} className="mark" />
                <b>{i.name}</b>
              </div>
            ))}
          </div>
          <p className="intg-note">
            …plus a REST API and signed webhooks for anything custom. <a href="/developers">Read the developer docs →</a>
          </p>
        </div>
      </section>

      {/* ── automation (dark) ── */}
      <section className="nxs-auto">
        <div className="wrap">
          <div className="center rv">
            <span className="eyebrow"><Zap />Automation</span>
            <h2 className="h2">Your studio, <em>on autopilot.</em></h2>
            <p className="lead" style={{ margin: "0 auto" }}>One booking sets off a chain of perfectly-timed touchpoints — no human required.</p>
          </div>
          <div className="flow">
            {FLOW.map((f, i) => (
              <div key={f.t}>
                <div className="fnode rv"><span className="ci">{f.icon}</span><div><b>{f.t}</b><small>{f.d}</small></div>{f.auto && <span className="ac">Auto</span>}</div>
                {i < FLOW.length - 1 && <div className="fline" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── mobile experience ── */}
      <section className="nxs-mob">
        <div className="wrap mob-grid">
          <div className="rv">
            <span className="eyebrow"><Smartphone />Client experience</span>
            <h2 className="h2">A booking flow your clients <em>actually enjoy.</em></h2>
            <p className="lead">Every studio gets a fast, installable mobile experience out of the box — booking, credits and check-in, always in sync.</p>
            <div className="mob-list">
              {MOB.map((m) => (
                <div className="mli" key={m.t}><span className="bic">{m.icon}</span><div><b>{m.t}</b><p>{m.d}</p></div></div>
              ))}
            </div>
          </div>
          <div className="phones rv">
            <div className="phone p1"><div className="ph-in">
              <div className="ph-head"><b>Book a class</b><p>Tuesday, March 12</p></div>
              <div className="ph-body">
                <div className="ph-card"><b>07:00 · Group Reformer</b><small>Jane D. · 2 spots left</small></div>
                <div className="ph-card" style={{ borderColor: "var(--or-bg2)", background: "var(--or-bg)" }}><b>09:30 · Mat Pilates</b><small>Marco R. · 4 spots left</small></div>
                <div className="ph-card"><b>17:30 · Yoga Flow</b><small>Emma S. · Waitlist</small></div>
                <div className="ph-btn">Book 09:30 →</div>
              </div>
            </div></div>
            <div className="phone p2"><div className="ph-in">
              <div className="ph-head"><b>My membership</b><p>Anna Lee</p></div>
              <div className="ph-body">
                <div className="ph-card"><div className="occ"><span className="ring" style={{ background: "conic-gradient(var(--or) 0 70%, #f2e9dc 70%)" }}><i>7/10</i></span><div><b>10-Class Pack</b><small>Valid until Jun 30</small></div></div></div>
                <div className="ph-card"><b>Next: Group Reformer</b><small>Tomorrow · 07:00</small></div>
                <div className="ph-btn" style={{ background: "#191512" }}>Show check-in card</div>
              </div>
            </div></div>
          </div>
        </div>
      </section>

      {/* ── testimonials ── */}
      <section className="nxs-testi">
        <div className="wrap">
          <div className="center rv">
            <span className="eyebrow"><Star />Loved by owners</span>
            <h2 className="h2">Studios simply run better on Nexis.</h2>
          </div>
          <div className="tgrid">
            {TESTI.map((t) => (
              <div className="tcard rv" key={t.who}>
                <div className="tstat">{t.stat}<small>{t.statSub}</small></div>
                <div className="stars">{[0, 1, 2, 3, 4].map((s) => <Star key={s} />)}</div>
                <p>&ldquo;{t.quote}&rdquo;</p>
                <div className="twho"><span className="tava" style={{ background: t.grad }}>{t.initials}</span><div><b>{t.who}</b><small>{t.role}</small></div></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── pricing ── */}
      <section className="nxs-pricing" id="pricing">
        <div className="wrap">
          <div className="center rv">
            <span className="eyebrow"><CreditCard />Pricing</span>
            <h2 className="h2">Simple pricing that <em>grows with you.</em></h2>
            <p className="lead">Every plan is a flat monthly subscription — no booking fees, no per-transaction platform cut, ever.</p>
            <div className="toggle">
              <button className={annual ? "" : "on"} onClick={() => setAnnual(false)}>Monthly</button>
              <button className={annual ? "on" : ""} onClick={() => setAnnual(true)}>Annual<span className="save">−20%</span></button>
            </div>
          </div>
          <div className="pgrid">
            {PLANS.map((p) => {
              const price = annual ? Math.round(p.monthly * 0.8) : p.monthly;
              return (
                <div className={`pcard rv${p.hi ? " hi" : ""}`} key={p.id}>
                  {p.hi && <span className="pop">Most popular</span>}
                  <div className="pname">{p.name}</div>
                  <div className="pfor">{p.for}</div>
                  <div className="pprice">${price}<small>/mo</small></div>
                  <div className="pnote">{annual ? `Billed $${price * 12}/year` : "Billed monthly"}</div>
                  <div className="pfeats">
                    {p.feats.map((f) => <span key={f}><Check />{f}</span>)}
                  </div>
                  <a className={`btn ${p.hi ? "btn-primary" : "btn-ghost"}`} href={SIGNUP}>Start free trial</a>
                </div>
              );
            })}
          </div>
          <p className="price-foot">All plans include a 7-day free trial · Bring your own Stripe · Cancel anytime</p>
        </div>
      </section>

      {/* ── faq ── */}
      <section className="nxs-faq" id="faq">
        <div className="wrap">
          <div className="center rv">
            <span className="eyebrow"><MessageSquare />FAQ</span>
            <h2 className="h2">Questions, answered.</h2>
          </div>
          <div className="faq-list rv">
            {FAQ.map((q) => (
              <details className="qa" key={q.q}><summary>{q.q}</summary><p>{q.a}</p></details>
            ))}
          </div>
        </div>
      </section>

      {/* ── final cta ── */}
      <section className="nxs-final">
        <div className="wrap">
          <div className="cta-box rv">
            <h2>Your studio deserves <em>better software.</em></h2>
            <p>Spend less time running your business, and more time growing it.</p>
            <div className="acts">
              <a className="btn btn-primary btn-lg" href={SIGNUP}>Start your free trial<ArrowRight /></a>
              <a className="btn btn-ghost btn-lg" href="#tour">Take the tour</a>
            </div>
            <div className="note"><span><Check />7-day free trial</span><span><Check />No credit card</span><span><Check />Cancel anytime</span></div>
          </div>
        </div>
      </section>

      {/* ── footer ── */}
      <footer className="nxs-foot">
        <div className="wrap">
          <div className="fgrid">
            <div className="fcol">
              <a className="logo" href="/" style={{ marginBottom: 14 }}><span className="logo-mark"><Sparkles /></span>Studio&nbsp;Nexis</a>
              <p>The all-in-one operating system for modern pilates &amp; yoga studios.</p>
            </div>
            <div className="fcol"><h5>Product</h5><a href="#features">Features</a><a href="#tour">Product tour</a><a href="#pricing">Pricing</a><a href="/developers">API &amp; developers</a></div>
            <div className="fcol"><h5>Resources</h5><a href="#faq">FAQ</a><a href={LOGIN}>Log in</a><a href={SIGNUP}>Start free trial</a></div>
            <div className="fcol"><h5>Company</h5><a href={SIGNUP}>About</a><a href={SIGNUP}>Contact</a><a href={SIGNUP}>Privacy</a><a href={SIGNUP}>Terms</a></div>
          </div>
          <div className="fbot">
            <span>© {new Date().getFullYear()} Studio Nexis. All rights reserved.</span>
            <div className="socials">
              <a href="#" aria-label="Instagram"><IgLogo /></a>
              <a href="#" aria-label="X"><XLogo /></a>
              <a href="#" aria-label="LinkedIn"><InLogo /></a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ── content data ───────────────────────────────────────────────────────────
// Integration logo wall. Ids map to the official brand marks in
// components/apps/app-logos.tsx (the same ones the in-app App Store uses).
const INTEGRATIONS = [
  { id: "stripe", name: "Stripe" },
  { id: "twilio", name: "Twilio SMS" },
  { id: "zapier", name: "Zapier" },
  { id: "make", name: "Make" },
  { id: "slack", name: "Slack" },
  { id: "discord", name: "Discord" },
  { id: "telegram", name: "Telegram" },
  { id: "teams", name: "Microsoft Teams" },
  { id: "googlechat", name: "Google Chat" },
  { id: "calendar", name: "Calendar feed" },
  { id: "ga4", name: "Google Analytics" },
  { id: "gtm", name: "Tag Manager" },
  { id: "meta", name: "Meta Pixel" },
  { id: "tiktok", name: "TikTok Pixel" },
  { id: "pinterest", name: "Pinterest" },
  { id: "snapchat", name: "Snapchat" },
  { id: "clarity", name: "Microsoft Clarity" },
  { id: "zalo", name: "Zalo" },
];

const TICKER = [
  { icon: <CalendarPlus size={13} />, text: <><b>Ava</b> booked Reformer Flow</>, bg: "var(--or-bg)", fg: "var(--or-ink)" },
  { icon: <CreditCard size={13} />, text: <><b>+$220</b> · 10-Class Pack</>, bg: "var(--green-bg)", fg: "var(--green)" },
  { icon: <Repeat size={13} />, text: <>Membership renewed</>, bg: "#efeafd", fg: "var(--purple)" },
  { icon: <Star size={13} />, text: <><b>5.0</b> review left</>, bg: "var(--or-bg)", fg: "var(--or-ink)" },
  { icon: <Users size={13} />, text: <>New client · <b>Leo</b></>, bg: "#e7f0fe", fg: "var(--blue)" },
  { icon: <CheckCircle2 size={13} />, text: <>Waitlist promoted</>, bg: "var(--green-bg)", fg: "var(--green)" },
];

const WHY = [
  { icon: <Clock />, t: "Save hours every week", d: "Admin that used to eat your evenings now takes minutes." },
  { icon: <TrendingUp />, t: "Fill more classes", d: "Online booking and auto-promoting waitlists fill every spot." },
  { icon: <Heart />, t: "Keep clients longer", d: "Win-backs, birthday rewards and VIP perks built right in." },
  { icon: <Gauge />, t: "Decide with data", d: "Occupancy, LTV and margins — clear at a glance." },
  { icon: <Zap />, t: "Automate the busywork", d: "From check-in to review request, hands-free." },
  { icon: <PiggyBank />, t: "Grow revenue", d: "Packages and memberships that quietly sell themselves." },
  { icon: <Lock />, t: "One secure login", d: "Owners, staff and clients each get the right access." },
  { icon: <Smartphone />, t: "Beautiful on mobile", d: "Your studio in your clients' pocket, always in sync." },
];

const FLOW = [
  { icon: <CalendarCheck />, t: "Booking", d: "Client books Group Reformer, 09:30", auto: false },
  { icon: <Mail />, t: "Confirmation email", d: "Instant and on-brand", auto: true },
  { icon: <MessageCircle />, t: "SMS reminder", d: "24 hours before class", auto: true },
  { icon: <CheckCircle2 />, t: "Check-in", d: "One tap at the front desk", auto: false },
  { icon: <CreditCard />, t: "Payment", d: "Credit deducted or card charged", auto: true },
  { icon: <RefreshCw />, t: "CRM updated", d: "Attendance, balance & LTV refreshed", auto: true },
  { icon: <Star />, t: "Review request", d: "Sent to your happy regulars", auto: true },
  { icon: <Rocket />, t: "Win-back & upsell", d: "Fired exactly when it matters", auto: true },
];

const MOB = [
  { icon: <CalendarDays />, t: "Book classes & join waitlists", d: "Two taps from phone to mat." },
  { icon: <CreditCard />, t: "Buy packages & check credits", d: "Balances update in real time." },
  { icon: <Ticket />, t: "Digital check-in card", d: "Check in with a tap — no plastic." },
  { icon: <Bell />, t: "Push notifications", d: "Reminders, waitlist spots and studio news." },
];

const TESTI = [
  { stat: "18 hrs", statSub: "saved every week", quote: "I used to spend Sundays on spreadsheets and chasing payments. Nexis gave me my weekends back — it just happens.", who: "Lena Moreau", role: "Founder, Reform House", initials: "LM", grad: "linear-gradient(135deg,#fb923c,#ea580c)" },
  { stat: "+37%", statSub: "more bookings", quote: "Online booking with waitlists changed everything. Classes fill themselves, and the win-back emails bring quiet clients back.", who: "Daniel Kim", role: "Owner, Core Society", initials: "DK", grad: "linear-gradient(135deg,#7c5cf0,#6d28d9)" },
  { stat: "−70%", statSub: "front-desk admin", quote: "Check-ins, payments and credits are one screen now. New staff learn the whole thing in a single afternoon.", who: "Ava Sørensen", role: "Director, Studio North", initials: "AS", grad: "linear-gradient(135deg,#2f7ef0,#0369a1)" },
];

const FAQ = [
  { q: "Can I migrate from Mindbody or another platform?", a: "Yes. Onboarding takes about 10 minutes, and we help move your clients, packages and schedule from Mindbody, Momence, WellnessLiving and most other systems." },
  { q: "Can I import my existing clients?", a: "Absolutely — bring clients with their contact details, notes, package balances and attendance history so nothing is lost in the move." },
  { q: "Does it handle memberships and credit packs?", a: "Yes — unlimited memberships, monthly plans, class packs, freezes, upgrades, downgrades and automatic renewals are all built in." },
  { q: "Can my instructors and staff have their own logins?", a: "Yes. Owners, managers, reception and instructors each get their own login with the right permissions, schedules and payroll." },
  { q: "Do you charge booking fees?", a: "Never. You pay one flat monthly subscription — every booking, client and class is included with zero per-transaction platform fees." },
  { q: "Can I use my own Stripe account?", a: "Yes — connect your own Stripe and payments settle directly to you. You can start taking bookings before payments are even connected." },
];
