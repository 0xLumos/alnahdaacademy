import * as api from "@api";
import { money } from "../lib/format";

// Product cards. Products without a photo get a lettered tile so the grid stays even.
export default function ProductGrid({ products, renderActions }) {
  if (!products.length) return <p className="muted">لا توجد منتجات معروضة حالياً.</p>;
  return (
    <div className="products">
      {products.map((p) => {
        const img = api.productImageUrl(p.image_path);
        return (
          <article key={p.id} className={`product ${p.available ? "" : "is-off"}`}>
            {img
              ? <img className="product-img" src={img} alt={p.name} loading="lazy" />
              : <div className="product-img product-ph" aria-hidden="true">{p.name.split(" ")[0]}</div>}
            <div className="product-body">
              <h3>{p.name}</h3>
              {p.description && <p className="muted">{p.description}</p>}
              <p className="product-price">{money(p.price)}</p>
              {!p.available && <span className="chip chip-off">غير متوفر</span>}
              {renderActions?.(p)}
            </div>
          </article>
        );
      })}
    </div>
  );
}

export const SHOP_NOTE = "الشراء والدفع نقداً عند الاستقبال في الأكاديمية.";
