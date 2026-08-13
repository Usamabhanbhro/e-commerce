// Usamabhanbhro commerce layer: local state mirrors future catalog, order, cart, wishlist, and customer services without pretending to transact.
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { findProduct, products, type Product } from "./catalog";

export type CartLine = { product: Product; quantity: number; variant?: string };
export type DemoOrder = { id: string; items: CartLine[]; subtotal: number; shipping: number; total: number; paymentMethod: string; paymentStatus: string; referenceId?: string };

type CommerceContextValue = {
  cart: CartLine[]; wishlist: string[]; lastOrder: DemoOrder | null;
  addToCart: (product: Product, quantity?: number, variant?: string) => void;
  removeFromCart: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  toggleWishlist: (productId: string) => void;
  clearCart: () => void;
  createOrder: (order: DemoOrder) => void;
  cartCount: number; subtotal: number;
};

const CommerceContext = createContext<CommerceContextValue | null>(null);
const read = <T,>(key: string, fallback: T): T => { try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; } catch { return fallback; } };

export function CommerceProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartLine[]>(() => read("usamabhanbhro-cart", []));
  const [wishlist, setWishlist] = useState<string[]>(() => read("usamabhanbhro-wishlist", []));
  const [lastOrder, setLastOrder] = useState<DemoOrder | null>(() => read("usamabhanbhro-order", null));
  useEffect(() => localStorage.setItem("usamabhanbhro-cart", JSON.stringify(cart)), [cart]);
  useEffect(() => localStorage.setItem("usamabhanbhro-wishlist", JSON.stringify(wishlist)), [wishlist]);
  useEffect(() => { if (lastOrder) localStorage.setItem("usamabhanbhro-order", JSON.stringify(lastOrder)); }, [lastOrder]);
  const addToCart = (product: Product, quantity = 1, variant?: string) => setCart((current) => { const found = current.find((line) => line.product.id === product.id && line.variant === variant); return found ? current.map((line) => line === found ? { ...line, quantity: line.quantity + quantity } : line) : [...current, { product, quantity, variant }]; });
  const removeFromCart = (id: string) => setCart((current) => current.filter((line) => line.product.id !== id));
  const setQuantity = (id: string, quantity: number) => setCart((current) => quantity < 1 ? current.filter((line) => line.product.id !== id) : current.map((line) => line.product.id === id ? { ...line, quantity } : line));
  const toggleWishlist = (id: string) => setWishlist((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const subtotal = cart.reduce((sum, line) => sum + line.product.price * line.quantity, 0);
  const value = useMemo(() => ({ cart, wishlist, lastOrder, addToCart, removeFromCart, setQuantity, toggleWishlist, clearCart: () => setCart([]), createOrder: setLastOrder, cartCount: cart.reduce((sum, line) => sum + line.quantity, 0), subtotal }), [cart, wishlist, lastOrder, subtotal]);
  return <CommerceContext.Provider value={value}>{children}</CommerceContext.Provider>;
}

export const useCommerce = () => { const value = useContext(CommerceContext); if (!value) throw new Error("useCommerce must be used inside CommerceProvider"); return value; };
export const wishlistProducts = (ids: string[]) => ids.map((id) => products.find((product) => product.id === id)).filter(Boolean) as Product[];
export const cartProduct = (slug: string) => findProduct(slug);
