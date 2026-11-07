import * as api from "@api";
import { useLoad } from "../lib/auth";
import ProductGrid, { SHOP_NOTE } from "../components/ProductGrid";
import { ErrorNote, Loading, Ropes } from "../components/ui";
import { SiteHeader } from "./Landing";

// Public shop page. Students also see the same grid inside the portal.
export default function Shop() {
  const { data, error, reload } = useLoad(() => api.listProducts());
  return (
    <div className="site">
      <SiteHeader home={false} />
      <main className="site-main shop-main">
        <section className="site-sec">
          <h1 className="shop-title">متجر الأكاديمية</h1>
          <p className="muted">{SHOP_NOTE}</p>
        </section>
        {error ? <ErrorNote error={error} onRetry={reload} /> : !data ? <Loading /> : <ProductGrid products={data} />}
      </main>
      <footer className="site-foot"><Ropes /></footer>
    </div>
  );
}

export function PortalShop() {
  const { data, error, reload } = useLoad(() => api.listProducts());
  return (
    <div className="stack">
      <div className="page-title"><h1>المتجر</h1></div>
      <p className="muted">{SHOP_NOTE}</p>
      {error ? <ErrorNote error={error} onRetry={reload} /> : !data ? <Loading /> : <ProductGrid products={data} />}
    </div>
  );
}
