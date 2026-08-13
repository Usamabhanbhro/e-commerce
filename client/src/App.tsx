/* Usamabhanbhro route shell: image-led editorial commerce with restrained interaction and explicit demo boundaries. */
// Usamabhanbhro application routing: every visible destination resolves to a client-facing page or a styled 404 state.
import { Route, Switch } from "wouter";
import { CommerceProvider } from "@/lib/commerce";
import { StorefrontLayout } from "@/components/Storefront";
import Home from "@/pages/Home";
import { AboutPage, AccountPage, ArticlePage, CartPage, CheckoutPage, CollectionsPage, ConfirmationPage, ContactPage, JournalPage, NotFoundPage, ProductPage, SearchPage, ShopPage, WishlistPage } from "@/pages/CommercePages";

function Router() { return <Switch>
  <Route path="/" component={Home} /><Route path="/shop" component={() => <ShopPage />} /><Route path="/collections" component={CollectionsPage} /><Route path="/collections/:slug" component={({ params }) => <ShopPage collectionSlug={params.slug} />} /><Route path="/products/:slug" component={ProductPage} /><Route path="/search" component={SearchPage} /><Route path="/cart" component={CartPage} /><Route path="/checkout" component={CheckoutPage} /><Route path="/order-confirmation" component={ConfirmationPage} /><Route path="/account" component={AccountPage} /><Route path="/wishlist" component={WishlistPage} /><Route path="/journal" component={JournalPage} /><Route path="/journal/:slug" component={ArticlePage} /><Route path="/about" component={AboutPage} /><Route path="/contact" component={ContactPage} /><Route component={NotFoundPage} />
</Switch>; }

export default function App() { return <CommerceProvider><StorefrontLayout><Router /></StorefrontLayout></CommerceProvider>; }
