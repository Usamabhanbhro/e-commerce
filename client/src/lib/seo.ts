import type { Product } from "./catalog";

type SeoInput = {
  path: string;
  product?: Product;
  title?: string;
  description?: string;
  image?: string;
};

const DEFAULT_TITLE = "Usamabhanbhro — Considered objects, made for use";
const DEFAULT_DESCRIPTION = "Usamabhanbhro is an original premium fashion and objects commerce showcase with a local demo checkout.";
const DEFAULT_IMAGE = "https://images.pexels.com/photos/994523/pexels-photo-994523.jpeg?auto=compress&cs=tinysrgb&w=2000";

function setMeta(attribute: "name" | "property", key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
}

function setLink(rel: string, href: string) {
  let element = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement("link");
    element.rel = rel;
    document.head.appendChild(element);
  }
  element.href = href;
}

export function applySeo({ path, product, title, description, image }: SeoInput) {
  if (typeof document === "undefined" || typeof window === "undefined") return;
  const cleanPath = path.split("?")[0] || "/";
  const basePath = import.meta.env.BASE_URL === "/" ? "" : import.meta.env.BASE_URL.replace(/\/$/, "");
  const canonicalUrl = `${window.location.origin}${basePath}${cleanPath === "/" ? "/" : cleanPath}`;
  const finalTitle = title ?? (product ? `${product.name} — Usamabhanbhro` : DEFAULT_TITLE);
  const finalDescription = description ?? product?.description ?? DEFAULT_DESCRIPTION;
  const finalImage = image ?? product?.images[0] ?? DEFAULT_IMAGE;
  const isSearch = cleanPath === "/search";

  document.title = finalTitle;
  setMeta("name", "description", finalDescription);
  setMeta("name", "robots", isSearch ? "noindex,follow" : "index,follow");
  setMeta("property", "og:title", finalTitle);
  setMeta("property", "og:description", finalDescription);
  setMeta("property", "og:type", product ? "product" : "website");
  setMeta("property", "og:image", finalImage);
  setMeta("property", "og:url", canonicalUrl);
  setMeta("name", "twitter:card", "summary_large_image");
  setMeta("name", "twitter:title", finalTitle);
  setMeta("name", "twitter:description", finalDescription);
  setMeta("name", "twitter:image", finalImage);
  setLink("canonical", canonicalUrl);

  const existing = document.getElementById("storefront-jsonld");
  existing?.remove();
  const script = document.createElement("script");
  script.id = "storefront-jsonld";
  script.type = "application/ld+json";
  script.textContent = JSON.stringify(product ? {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.images,
    sku: product.id,
    offers: {
      "@type": "Offer",
      priceCurrency: "PKR",
      price: product.price,
      availability: product.availability === "in-stock" ? "https://schema.org/InStock" : "https://schema.org/LimitedAvailability",
      url: canonicalUrl,
    },
  } : {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Usamabhanbhro",
    url: `${window.location.origin}${basePath}/`,
    potentialAction: { "@type": "SearchAction", target: `${window.location.origin}${basePath}/search?query={search_term_string}`, "query-input": "required name=search_term_string" },
  });
  document.head.appendChild(script);
}
