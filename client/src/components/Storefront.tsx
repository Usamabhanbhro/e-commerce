import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useCommerce } from "@/lib/commerce";
import { findCollection, findJournal } from "@/lib/catalog";
import { captureAttribution, trackEvent } from "@/lib/analytics";
import { applySeo } from "@/lib/seo";

const nav = [{ label: "Shop", href: "/shop" }, { label: "Collections", href: "/collections" }, { label: "Journal", href: "/journal" }, { label: "About", href: "/about" }];

function RouteMeta() {
  const [location] = useLocation();
  const { products } = useCommerce();
  useEffect(() => {
    const path = location.split("?")[0];
    const product = path.startsWith("/products/") ? products.find((item) => item.slug === path.split("/")[2]) : undefined;
    const collection = path.startsWith("/collections/") ? findCollection(path.split("/")[2]) : undefined;
    const journal = path.startsWith("/journal/") ? findJournal(path.split("/")[2]) : undefined;
    const descriptors: Record<string, { title: string; description: string }> = {
      "/": { title: "Usamabhanbhro — Considered objects, made for use", description: "A material-led edit of considered fashion and objects, with a transparent local showcase checkout." },
      "/shop": { title: "Shop the edit — Usamabhanbhro", description: "Browse the complete Usamabhanbhro edit by category, collection, and price." },
      "/collections": { title: "Collections — Usamabhanbhro", description: "Explore Usamabhanbhro collections shaped by material, mood, and daily use." },
      "/search": { title: "Search the catalog — Usamabhanbhro", description: "Find a Usamabhanbhro piece by name, category, collection, or material." },
      "/cart": { title: "Your shopping bag — Usamabhanbhro", description: "Review your saved Usamabhanbhro pieces before the local showcase checkout." },
      "/checkout": { title: "Demo checkout — Usamabhanbhro", description: "Complete a transparent local checkout demonstration. No payment is processed." },
      "/account": { title: "Your studio — Usamabhanbhro", description: "Review your local showcase profile, order state, and saved pieces." },
      "/wishlist": { title: "Wishlist — Usamabhanbhro", description: "Keep considered Usamabhanbhro pieces close for later." },
      "/journal": { title: "The journal — Usamabhanbhro", description: "Notes on use, form, feeling, and the materials behind the edit." },
      "/about": { title: "About the studio — Usamabhanbhro", description: "Discover the point of view behind Usamabhanbhro and its considered objects." },
      "/contact": { title: "Contact the studio — Usamabhanbhro", description: "Start a conversation with the Usamabhanbhro studio." },
      "/faq": { title: "FAQ — Usamabhanbhro", description: "Questions about the showcase checkout, delivery, returns, privacy, and support." },
      "/privacy": { title: "Privacy policy — Usamabhanbhro", description: "How the Usamabhanbhro local showcase handles browser state, analytics, and contact information." },
      "/terms": { title: "Terms & conditions — Usamabhanbhro", description: "The boundaries and demo-only terms of the Usamabhanbhro storefront." },
      "/shipping-returns": { title: "Shipping & returns — Usamabhanbhro", description: "Transparent delivery, returns, and payment notes for the future service boundary." },
    };
    const descriptor = descriptors[path];
    applySeo({ path: location, product, title: product ? `${product.name} — Usamabhanbhro` : collection ? `${collection.name} — Usamabhanbhro` : journal ? `${journal.title} — Usamabhanbhro` : descriptor?.title, description: product?.description ?? collection?.description ?? journal?.excerpt ?? descriptor?.description });
    captureAttribution(window.location.search);
    trackEvent("page_view", { path });
  }, [location, products]);
  return null;
}

function CatalogStatus() {
  const { catalogLoading, catalogError, refreshCatalog } = useCommerce();
  if (catalogLoading) return <div className="catalog-status catalog-status--loading" role="status" aria-live="polite"><span className="loading-dot" aria-hidden="true" />Updating the catalog…</div>;
  if (!catalogError) return null;
  return <div className="catalog-status catalog-status--error" role="alert"><span>Showing the saved showcase catalog.</span><button type="button" onClick={() => void refreshCatalog()}>Retry catalog ↗</button></div>;
}

function CookieBanner() {
  const [visible, setVisible] = useState(() => { try { return localStorage.getItem("usamabhanbhro-cookie-choice") !== "seen"; } catch { return false; } });
  if (!visible) return null;
  const dismiss = () => { try { localStorage.setItem("usamabhanbhro-cookie-choice", "seen"); } catch { /* optional */ } setVisible(false); };
  return <aside className="cookie-banner" role="region" aria-label="Privacy notice"><div><strong>A quiet note on privacy</strong><p>This showcase uses local browser storage for your bag, wishlist, and demo order. Optional analytics only loads when configured.</p></div><div className="cookie-banner__actions"><Link className="plain-link" href="/privacy" onClick={dismiss}>Read privacy</Link><button className="button button--dark" type="button" onClick={dismiss}>Continue</button></div></aside>;
}

function BackToTop() {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const onScroll = () => setVisible(window.scrollY > 700); window.addEventListener("scroll", onScroll, { passive: true }); return () => window.removeEventListener("scroll", onScroll); }, []);
  if (!visible) return null;
  return <button className="back-to-top" type="button" aria-label="Back to top" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>↑ <span>Top</span></button>;
}

function ScrollProgress() {
  useEffect(() => { const update = () => { const max = document.documentElement.scrollHeight - window.innerHeight; document.documentElement.style.setProperty("--scroll-progress", `${max > 0 ? (window.scrollY / max) * 100 : 0}%`); }; update(); window.addEventListener("scroll", update, { passive: true }); window.addEventListener("resize", update); return () => { window.removeEventListener("scroll", update); window.removeEventListener("resize", update); }; }, []);
  return <div className="scroll-progress" aria-hidden="true" />;
}

export function Header() {
  const [menu, setMenu] = useState(false); const [scrolled, setScrolled] = useState(false); const [, navigate] = useLocation(); const { cartCount, wishlist } = useCommerce();
  useEffect(() => { const onScroll = () => setScrolled(window.scrollY > 12); window.addEventListener("scroll", onScroll, { passive: true }); return () => window.removeEventListener("scroll", onScroll); }, []);
  useEffect(() => { document.body.classList.toggle("menu-open", menu); return () => document.body.classList.remove("menu-open"); }, [menu]);
  return <>
    <div className="demo-ribbon"><span>USAMABHANBHRO SHOWCASE</span><span>DEMO MODE · NO REAL TRANSACTIONS</span></div>
    <header className={`site-header ${scrolled ? "site-header--scrolled" : ""}`}>
      <div className="header-main">
        <button className="mobile-menu-button" aria-label="Open menu" aria-expanded={menu} aria-controls="mobile-navigation" onClick={() => setMenu(true)}>☰</button>
        <nav className="desktop-nav" aria-label="Primary">{nav.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}</nav>
        <Link className="wordmark" href="/">USAMABHANBHRO</Link>
        <div className="utility-nav"><Link href="/search">Search</Link><Link href="/account">Account</Link><Link href="/wishlist">Wishlist ({wishlist.length})</Link><Link href="/cart">Bag ({cartCount})</Link></div>
        <button className="mobile-bag-button" aria-label={`Open bag with ${cartCount} ${cartCount === 1 ? "item" : "items"}`} onClick={() => navigate("/cart")}>Bag ({cartCount})</button>
      </div>
      <div className="header-subline"><span>Hand-finished objects for considered living</span><span>Karachi · Lahore · Everywhere</span></div>
    </header>
    <div id="mobile-navigation" className={`mobile-drawer ${menu ? "mobile-drawer--open" : ""}`} aria-hidden={!menu}>
      <div className="mobile-drawer__top"><Link tabIndex={menu ? 0 : -1} className="wordmark wordmark--drawer" href="/" onClick={() => setMenu(false)}>USAMABHANBHRO</Link><button tabIndex={menu ? 0 : -1} onClick={() => setMenu(false)} aria-label="Close menu">Close ×</button></div>
      <nav aria-label="Mobile primary">{[...nav, { label: "Search", href: "/search" }, { label: "Account", href: "/account" }, { label: "Bag", href: "/cart" }].map((item) => <Link tabIndex={menu ? 0 : -1} key={item.href} href={item.href} onClick={() => setMenu(false)}>{item.label}</Link>)}</nav>
      <div className="mobile-drawer__footer"><span>Demo storefront</span><Link tabIndex={menu ? 0 : -1} href="/contact" onClick={() => setMenu(false)}>Contact</Link></div>
    </div>
  </>;
}

export function Footer() {
  const [email, setEmail] = useState(""); const [message, setMessage] = useState(""); const [open, setOpen] = useState<string | null>(null);
  const submit = (event: React.FormEvent) => { event.preventDefault(); if (!/^\S+@\S+\.\S+$/.test(email)) return setMessage("Enter a valid email address to join the list."); setMessage("You are on the list — demo signup recorded locally."); trackEvent("newsletter_signup"); setEmail(""); };
  const groups = [
    { title: "Explore", links: [["Shop", "/shop"], ["Collections", "/collections"], ["Journal", "/journal"]] },
    { title: "Service", links: [["Contact", "/contact"], ["FAQ", "/faq"], ["Shipping & returns", "/shipping-returns"]] },
    { title: "The studio", links: [["About", "/about"], ["Privacy", "/privacy"], ["Terms", "/terms"]] },
  ];
  return <footer className="site-footer"><section className="newsletter"><div><p className="eyebrow eyebrow--light">The Usamabhanbhro letter</p><h2>BE THE FIRST<br />TO KNOW.</h2></div><div className="newsletter__form-wrap"><p>New objects, studio notes, and considered edits. This form is a local showcase interaction — no email service is connected.</p><form onSubmit={submit}><label className="sr-only" htmlFor="newsletter-email">Email address</label><input id="newsletter-email" required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email address" aria-describedby="newsletter-message" /><button type="submit" aria-label="Subscribe">↗</button></form><span id="newsletter-message" className="form-message" role="status" aria-live="polite">{message}</span></div></section>
    <div className="footer-main"><Link className="footer-wordmark" href="/">USAMABHANBHRO</Link><div className="footer-groups">{groups.map((group) => <div className={`footer-group ${open === group.title ? "footer-group--open" : ""}`} key={group.title}><button type="button" aria-expanded={open === group.title} onClick={() => setOpen(open === group.title ? null : group.title)}>{group.title}<span className="footer-group__toggle" aria-hidden="true">+</span></button><ul>{group.links.map(([label, href]) => <li key={href + label}><Link href={href}>{label}</Link></li>)}</ul></div>)}</div></div>
    <div className="footer-bottom"><span>© Usamabhanbhro 2025 · Demo showcase</span><div><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/contact">Support</Link></div></div>
  </footer>;
}

export function StorefrontLayout({ children }: { children: React.ReactNode }) { return <div className="storefront"><a className="skip-link" href="#main-content">Skip to content</a><ScrollProgress /><RouteMeta /><Header /><CatalogStatus /><main id="main-content" tabIndex={-1}>{children}</main><Footer /><CookieBanner /><BackToTop /></div>; }

export const PageIntro = ({ eyebrow, title, body }: { eyebrow: string; title: string; body?: string }) => <section className="page-intro"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{body && <p>{body}</p>}</section>;
