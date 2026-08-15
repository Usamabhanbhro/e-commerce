import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { collections as seedCollections, findProduct, journals as seedJournals, products as seedProducts, type Product } from "./catalog";

export type CartLine = { product: Product; quantity: number; variant?: string };
export type DemoOrder = { id: string; items: CartLine[]; subtotal: number; shipping: number; total: number; paymentMethod: string; paymentStatus: string; referenceId?: string };
type ServerProduct = { id: string; slug: string; name: string; pricePkr: number; stock: number; status: string; category: string; collection: string; description: string; images: string[]; tags: string[]; featured: boolean; availability: Product["availability"] };
type ServerCategory = { id: string; slug: string; name: string; description: string; imageUrl: string; status: string; sortOrder: number };
type ServerPromotion = { id: string; name: string; description: string; discountType: string; discountValue: number; targetType: string; targetValue: string; status: string };
type ServerBanner = { id: string; imageUrl: string; title: string; subtitle: string; ctaText: string; destination: string; status: string; sortOrder: number };

type CommerceContextValue = {
  cart: CartLine[]; wishlist: string[]; lastOrder: DemoOrder | null; products: Product[]; collections: typeof seedCollections; journals: typeof seedJournals; categories: ServerCategory[]; promotions: ServerPromotion[]; banners: ServerBanner[]; catalogLoading: boolean;
  addToCart: (product: Product, quantity?: number, variant?: string) => void; removeFromCart: (productId: string) => void; setQuantity: (productId: string, quantity: number) => void; toggleWishlist: (productId: string) => void; clearCart: () => void; createOrder: (order: DemoOrder) => void; refreshCatalog: () => Promise<void>; cartCount: number; subtotal: number;
};

const CommerceContext = createContext<CommerceContextValue | null>(null);
const read = <T,>(key: string, fallback: T): T => { try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; } catch { return fallback; } };

function mergeServerProduct(item: ServerProduct): Product {
  const fallback = seedProducts.find((product) => product.id === item.id || product.slug === item.slug);
  return { id: item.id, slug: item.slug, name: item.name, price: item.pricePkr, category: item.category, collection: item.collection, description: item.description, details: fallback?.details ?? ["Merchant-managed catalog record", "Availability is controlled from the admin workspace"], images: item.images.length ? item.images : fallback?.images ?? [], variants: fallback?.variants ?? [{ label: "Edition", value: "Standard", available: item.stock > 0 }], tags: item.tags, availability: item.stock <= 0 ? "low-stock" : item.availability === "low-stock" ? "low-stock" : "in-stock" };
}

export function CommerceProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartLine[]>(() => read("usamabhanbhro-cart", []));
  const [wishlist, setWishlist] = useState<string[]>(() => read("usamabhanbhro-wishlist", []));
  const [lastOrder, setLastOrder] = useState<DemoOrder | null>(() => read("usamabhanbhro-order", null));
  const [catalog, setCatalog] = useState<Product[]>(seedProducts); const [categories, setCategories] = useState<ServerCategory[]>([]); const [promotions, setPromotions] = useState<ServerPromotion[]>([]); const [banners, setBanners] = useState<ServerBanner[]>([]); const [catalogLoading, setCatalogLoading] = useState(true);
  const refreshCatalog = async () => { try { const response = await fetch("/api/catalog", { credentials: "include" }); if (!response.ok) throw new Error("catalog unavailable"); const data = await response.json() as { products?: ServerProduct[]; categories?: ServerCategory[]; promotions?: ServerPromotion[]; banners?: ServerBanner[] }; if (data.products?.length) setCatalog(data.products.map(mergeServerProduct)); setCategories(data.categories ?? []); setPromotions(data.promotions ?? []); setBanners(data.banners ?? []); } catch { setCatalog(seedProducts); } finally { setCatalogLoading(false); } };
  useEffect(() => { void refreshCatalog(); }, []);
  useEffect(() => localStorage.setItem("usamabhanbhro-cart", JSON.stringify(cart)), [cart]);
  useEffect(() => localStorage.setItem("usamabhanbhro-wishlist", JSON.stringify(wishlist)), [wishlist]);
  useEffect(() => { if (lastOrder) localStorage.setItem("usamabhanbhro-order", JSON.stringify(lastOrder)); }, [lastOrder]);
  const addToCart = (product: Product, quantity = 1, variant?: string) => setCart((current) => { const found = current.find((line) => line.product.id === product.id && line.variant === variant); return found ? current.map((line) => line === found ? { ...line, quantity: line.quantity + quantity } : line) : [...current, { product, quantity, variant }]; });
  const removeFromCart = (id: string) => setCart((current) => current.filter((line) => line.product.id !== id));
  const setQuantity = (id: string, quantity: number) => setCart((current) => quantity < 1 ? current.filter((line) => line.product.id !== id) : current.map((line) => line.product.id === id ? { ...line, quantity } : line));
  const toggleWishlist = (id: string) => setWishlist((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const subtotal = cart.reduce((sum, line) => sum + line.product.price * line.quantity, 0);
  const value = useMemo(() => ({ cart, wishlist, lastOrder, products: catalog, collections: seedCollections, journals: seedJournals, categories, promotions, banners, catalogLoading, addToCart, removeFromCart, setQuantity, toggleWishlist, clearCart: () => setCart([]), createOrder: setLastOrder, refreshCatalog, cartCount: cart.reduce((sum, line) => sum + line.quantity, 0), subtotal }), [cart, wishlist, lastOrder, catalog, categories, promotions, banners, catalogLoading, subtotal]);
  return <CommerceContext.Provider value={value}>{children}</CommerceContext.Provider>;
}

export const useCommerce = () => { const value = useContext(CommerceContext); if (!value) throw new Error("useCommerce must be used inside CommerceProvider"); return value; };
export const wishlistProducts = (ids: string[], source: Product[] = seedProducts) => ids.map((id) => source.find((product) => product.id === id)).filter(Boolean) as Product[];
export const cartProduct = (slug: string) => findProduct(slug);
