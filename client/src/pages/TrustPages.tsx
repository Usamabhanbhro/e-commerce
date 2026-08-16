import { useState } from "react";
import { Link } from "wouter";
import { PageIntro } from "@/components/Storefront";

const faqs = [
  ["How does the showcase checkout work?", "Checkout simulates success, pending, cancelled, and failed provider states locally. No payment credential is collected, charged, or sent to a financial provider."],
  ["How does delivery work?", "The current storefront uses a transparent demo delivery line. A future production storefront would confirm serviceable destinations, delivery timing, and final charges before payment."],
  ["Can I return a piece?", "For this showcase, no physical order is fulfilled. In a production launch, the final return window, exclusions, and refund method would be shown here before checkout."],
  ["How is my information handled?", "The public demo keeps cart, wishlist, and showcase order state in this browser. The contact and newsletter forms record local demo feedback only; no email is sent."],
  ["How can I contact the studio?", "Write to studio@usamabhanbhro.demo or use the contact page. The address is a demonstration contact point, not a staffed production support channel."],
];

function Accordions() {
  const [open, setOpen] = useState(0);
  return <div className="faq-list">{faqs.map(([question, answer], index) => <div className={`faq-item ${open === index ? "faq-item--open" : ""}`} key={question}>
    <h2><button type="button" aria-expanded={open === index} onClick={() => setOpen(open === index ? -1 : index)}>{question}<span aria-hidden="true">{open === index ? "−" : "+"}</span></button></h2>
    {open === index && <p>{answer}</p>}
  </div>)}</div>;
}

export function FaqPage() {
  return <><PageIntro eyebrow="Need to know" title="Questions, answered." body="A clear guide to the current showcase journey, future fulfilment, and how to reach the studio." /><section className="trust-layout"><Accordions /><aside className="trust-aside"><p className="eyebrow">Still curious?</p><h2>Make it a conversation.</h2><p>For a future commerce launch, the studio would confirm availability, delivery, payment, and returns before an order is placed.</p><Link className="button button--dark" href="/contact">Contact the studio</Link></aside></section></>;
}

export function PrivacyPage() {
  return <InfoPage eyebrow="The fine print" title="Privacy policy" body="How this local showcase handles information." sections={[
    ["What is stored", "The demo stores cart items, wishlist selections, and the latest showcase order in local browser storage so the journey survives refresh. Newsletter and contact submissions remain local to the browser and do not send email."],
    ["Analytics and attribution", "If configured, privacy-conscious analytics loads after the page shell and receives anonymous interaction events. Campaign parameters may be retained locally to understand which link brought a visitor to the showcase. No payment credentials are collected."],
    ["Contact", "For questions about this demonstration, use studio@usamabhanbhro.demo or the contact page. This address is a portfolio placeholder and not a promise of production support."],
  ]} />;
}

export function TermsPage() {
  return <InfoPage eyebrow="The fine print" title="Terms & conditions" body="The boundaries of this demonstration storefront." sections={[
    ["Showcase only", "This website is a client-facing commerce concept. Product prices, stock, delivery, payment methods, and order references are illustrative. No product is sold and no payment is processed from this site."],
    ["Use of the site", "You may browse the storefront, try its discovery tools, save pieces, and simulate checkout outcomes. Do not enter real card numbers, wallet credentials, or other financial secrets into the demo."],
    ["Future launch", "A production release would publish final terms, availability, shipping commitments, return rules, support channels, and payment-provider disclosures before accepting orders."],
  ]} />;
}

export function ShippingPage() {
  return <InfoPage eyebrow="Service notes" title="Shipping & returns" body="A transparent outline for the future service boundary." sections={[
    ["Delivery", "The current checkout shows a demo delivery line in PKR and does not create a fulfilment request. A production version would calculate delivery from the confirmed address and display timing before payment."],
    ["Returns", "No physical order is created in showcase mode. A future policy would state the return window, condition requirements, exclusions, exchange process, and refund timing in plain language."],
    ["Payment", "JazzCash, Easypaisa, SadaPay, NayaPay, and cash-on-delivery appear as simulated provider choices. They are not live payment connections in this showcase."],
  ]} />;
}

function InfoPage({ eyebrow, title, body, sections }: { eyebrow: string; title: string; body: string; sections: [string, string][] }) {
  return <><PageIntro eyebrow={eyebrow} title={title} body={body} /><p className="last-updated">Last updated 16 August 2026 · Showcase policy</p><article className="info-page">{sections.map(([heading, copy]) => <section key={heading}><h2>{heading}</h2><p>{copy}</p></section>)}<Link className="text-link" href="/contact">Questions? Contact the studio <span>↗</span></Link></article></>;
}
