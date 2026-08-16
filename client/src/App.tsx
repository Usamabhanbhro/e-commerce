import { Route, Router as WouterRouter, Switch, useLocation } from "wouter";
import { CommerceProvider } from "@/lib/commerce";
import { StorefrontLayout } from "@/components/Storefront";
import Home from "@/pages/Home";
import { AboutPage, AccountPage, ArticlePage, CartPage, CheckoutPage, CollectionsPage, ConfirmationPage, ContactPage, JournalPage, NotFoundPage, ProductPage, SearchPage, ShopPage, WishlistPage } from "@/pages/CommercePages";
import { FaqPage, PrivacyPage, ShippingPage, TermsPage } from "@/pages/TrustPages";
import AdminPage from "@/pages/Admin";

const routerBase = import.meta.env.BASE_URL === "/" ? undefined : import.meta.env.BASE_URL.replace(/\/$/, "");

function PublicRoutes() { return <StorefrontLayout><Switch>
  <Route path="/" component={Home} /><Route path="/shop" component={() => <ShopPage />} /><Route path="/collections" component={CollectionsPage} /><Route path="/collections/:slug" component={({ params }) => <ShopPage collectionSlug={params.slug} />} /><Route path="/products/:slug" component={ProductPage} /><Route path="/search" component={SearchPage} /><Route path="/cart" component={CartPage} /><Route path="/checkout" component={CheckoutPage} /><Route path="/order-confirmation" component={ConfirmationPage} /><Route path="/account" component={AccountPage} /><Route path="/wishlist" component={WishlistPage} /><Route path="/journal" component={JournalPage} /><Route path="/journal/:slug" component={ArticlePage} /><Route path="/about" component={AboutPage} /><Route path="/contact" component={ContactPage} /><Route path="/faq" component={FaqPage} /><Route path="/privacy" component={PrivacyPage} /><Route path="/terms" component={TermsPage} /><Route path="/shipping-returns" component={ShippingPage} /><Route component={NotFoundPage} />
</Switch></StorefrontLayout>; }

function RouteContent() { const [location] = useLocation(); return location.startsWith("/admin") ? <Switch><Route path="/admin" component={AdminPage} /><Route path="/admin/:section" component={AdminPage} /></Switch> : <PublicRoutes />; }

function Router() { return <WouterRouter base={routerBase}><RouteContent /></WouterRouter>; }

export default function App() { return <CommerceProvider><Router /></CommerceProvider>; }
