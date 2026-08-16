/* Material Quiet commerce card: tactile image treatment, rust saved state, and restrained object-study metadata. */
import { Link } from "wouter";
import { useCommerce } from "@/lib/commerce";
import { money, type Product } from "@/lib/catalog";
import { trackEvent } from "@/lib/analytics";

export function ProductCard({ product }: { product: Product }) {
  const { wishlist, toggleWishlist } = useCommerce();
  const saved = wishlist.includes(product.id);
  return <article className="catalog-card">
    <div className="catalog-card__media">
      <Link href={`/products/${product.slug}`}>
        <img className="material-image" src={product.images[0]} alt={`${product.name} in ${product.variants[0]?.value ?? "studio colour"}`} loading="lazy" />
        <img className="catalog-card__hover material-image" src={product.images[1]} alt="" loading="lazy" />
      </Link>
      <span className="material-mark" aria-hidden="true">Material study</span>
      <button className={`wishlist-button ${saved ? "is-saved" : ""}`} onClick={() => { toggleWishlist(product.id); trackEvent(saved ? "wishlist_remove" : "wishlist_add", { product_id: product.id }); }} aria-pressed={saved} aria-label={saved ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}>{saved ? "♥" : "♡"}</button>
      <Link className="catalog-card__quick" href={`/products/${product.slug}`}>View piece ↗</Link>
    </div>
    <div className="catalog-card__meta"><div><p className="eyebrow eyebrow--rust">{product.category} · {product.collection}</p><h3><Link href={`/products/${product.slug}`}>{product.name}</Link></h3><span className={`catalog-card__availability catalog-card__availability--${product.availability}`}>{product.availability === "low-stock" ? "Low stock" : "Available"}</span></div><div className="catalog-card__price"><strong>{money(product.price)}</strong>{product.compareAtPrice && product.compareAtPrice > product.price && <del>{money(product.compareAtPrice)}</del>}</div></div>
  </article>;
}

export function ProductGrid({ items }: { items: Product[] }) { return <div className="catalog-grid">{items.map((product) => <ProductCard key={product.id} product={product} />)}</div>; }
