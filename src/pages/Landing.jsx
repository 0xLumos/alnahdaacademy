import { useState } from "react";
import { Link } from "react-router-dom";
import * as api from "@api";
import { useAuth, useLoad } from "../lib/auth";
import { money } from "../lib/format";
import { SITE, isPlaceholder } from "../content";
import { Ropes } from "../components/ui";
import logo from "../assets/logo.jpg";

// Renders content text, outlining placeholders so they are obvious before launch.
const T = ({ children }) =>
  isPlaceholder(children) ? <span className="ph" title="نص مؤقت: عدّله في src/content.js">{children}</span> : children;

export function PortalButton({ className = "" }) {
  const { me } = useAuth();
  const to = me?.role === "admin" ? "/admin" : "/portal";
  return <Link className={`btn btn-red ${className}`} to={to}>{me ? "بوابتي" : "بوابة المقاتلين"}</Link>;
}

// Media lives in public/media and is referenced by path, so it is not inlined into the JS bundle.
const media = (f) => `${import.meta.env.BASE_URL}media/${f}`;
const reducedMotion = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

// Muted 16-second loop of the gym; the button swaps in the full tour with sound and controls.
function GymTour() {
  const [full, setFull] = useState(false);
  return (
    <figure className="tour">
      <video
        key={full ? "full" : "loop"}
        className="tour-video"
        src={media(full ? "tour-full.mp4" : "tour-loop.mp4")}
        poster={media("tour-poster.jpg")}
        playsInline
        preload="metadata"
        {...(full
          ? { controls: true, autoPlay: true }
          : { muted: true, loop: true, autoPlay: !reducedMotion, controls: reducedMotion })}
        aria-label="جولة مصورة داخل أكاديمية النهضة الرياضية"
      />
      {!full && (
        <button className="btn btn-ghost btn-sm tour-btn" onClick={() => setFull(true)}>
          شاهد الجولة كاملة بالصوت
        </button>
      )}
    </figure>
  );
}

const IG = (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
  </svg>
);
const TT = (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="currentColor">
    <path d="M16.6 3c.4 2.1 1.7 3.6 3.9 3.9v3.1c-1.4 0-2.7-.4-3.9-1.1v6.3c0 3.4-2.6 5.8-5.8 5.8S5 18.6 5 15.4c0-3.4 2.9-6 6.4-5.6v3.2c-1.6-.4-3.2.7-3.2 2.4 0 1.4 1.1 2.5 2.5 2.5s2.6-1 2.6-2.7V3h3.3z" />
  </svg>
);

// Instagram and TikTok buttons; each hides itself when its link in content.js is empty.
function SocialLinks() {
  return (
    <>
      {SITE.instagram && (
        <a className="btn btn-ghost social" href={SITE.instagram} target="_blank" rel="noopener noreferrer">{IG}<span>إنستغرام</span></a>
      )}
      {SITE.tiktok && (
        <a className="btn btn-ghost social" href={SITE.tiktok} target="_blank" rel="noopener noreferrer">{TT}<span>تيك توك</span></a>
      )}
    </>
  );
}

// Shared by the home page and the shop page. On the home page the links jump to sections.
export function SiteHeader({ home = true }) {
  return (
    <header className="site-head">
      {home
        ? <a className="brand" href="#top"><img src={logo} alt="" width="44" height="44" /><div><strong>أكاديمية النهضة</strong><span>الرياضية</span></div></a>
        : <Link className="brand" to="/"><img src={logo} alt="" width="44" height="44" /><div><strong>أكاديمية النهضة</strong><span>الرياضية</span></div></Link>}
      <nav className="site-nav" aria-label="أقسام الموقع">
        {home ? (
          <>
            <a href="#programs">البرامج والأسعار</a>
            <a href="#location">الموقع</a>
            <a href="#join">التسجيل</a>
          </>
        ) : <Link to="/">الرئيسية</Link>}
        <Link to="/shop">المتجر</Link>
      </nav>
      <PortalButton className="btn-sm" />
    </header>
  );
}

// Monthly prices come from the database so the admin can change them without touching code.
function Programs() {
  const { data, error } = useLoad(() => api.listCategories());
  if (error) return <p className="muted">تعذّر تحميل الأسعار. اتصل بنا للاستفسار.</p>;
  if (!data) return <p className="muted">جارٍ تحميل الأسعار…</p>;
  return (
    <div className="programs">
      {data.map((c) => (
        <article key={c.key} className="program">
          <h3>{c.label}</h3>
          {c.description && <p>{c.description}</p>}
          <p className="program-price"><b>{money(c.monthly_price)}</b> <span className="muted">شهرياً</span></p>
        </article>
      ))}
    </div>
  );
}

export default function Landing() {
  return (
    <div className="site">
      <SiteHeader />

      <section className="hero" id="top">
        <div className="hero-text">
          <h1>{SITE.name}</h1>
          <p className="hero-tag"><T>{SITE.tagline}</T></p>
          <div className="hero-cta">
            <a className="btn btn-ghost" href="#join">كيف أسجّل</a>
            <PortalButton />
          </div>
        </div>
        <img className="hero-crest" src={logo} alt="شعار أكاديمية النهضة الرياضية" width="420" height="420" />
      </section>
      <Ropes className="hero-ropes" />

      <main className="site-main">
        <section className="site-sec about">
          <div className="about-text">
            <h2>من داخل الأكاديمية</h2>
            <p><T>{SITE.about}</T></p>
            <p className="muted">صالة مجهزة بصفوف من أكياس اللكم المعلقة، وأرضية مطاطية، ومرايا على طول الجدار.</p>
          </div>
          <GymTour />
        </section>

        <section className="site-sec" id="programs">
          <h2>البرامج والأسعار</h2>
          <Programs />
          <p className="muted">الدفع نقداً عند الاستقبال. المواعيد الأسبوعية لكل حصة تظهر للطلاب داخل بوابة المقاتلين.</p>
        </section>

        <section className="shop-band">
          <div>
            <h2>متجر الأكاديمية</h2>
            <p className="muted">قفازات، واقيات أسنان، رباطات، وبكجات ملابس الأكاديمية. الشراء نقداً عند الاستقبال.</p>
          </div>
          <Link className="btn btn-ghost" to="/shop">تصفّح المتجر</Link>
        </section>

        <div className="site-split">
          <section className="site-sec" id="hours">
            <h2>أوقات الدوام</h2>
            {SITE.hours.length === 0
              ? <p className="muted">سيتم نشر أوقات الدوام قريباً. للاستفسار اتصل بنا.</p>
              : (
                <dl className="hours">
                  {SITE.hours.map((h) => (
                    <div key={h.days}><dt><T>{h.days}</T></dt><dd><T>{h.time}</T></dd></div>
                  ))}
                </dl>
              )}
          </section>

          <section className="site-sec" id="location">
            <h2>الموقع</h2>
            <address className="address"><T>{SITE.address}</T></address>
            <div className="contact-row">
              {SITE.mapUrl && <a className="btn btn-ghost" href={SITE.mapUrl} target="_blank" rel="noopener noreferrer">الاتجاهات على الخريطة</a>}
              {SITE.phones.map((ph) => (
                <a key={ph} className="btn btn-ghost" href={`tel:${ph.replace(/\s/g, "")}`} dir="ltr">{ph}</a>
              ))}
              {SITE.whatsapp && <a className="btn btn-ghost" href={`https://wa.me/${SITE.whatsapp}`} target="_blank" rel="noopener noreferrer">واتساب</a>}
              <SocialLinks />
            </div>
          </section>
        </div>

        <section className="site-sec" id="join">
          <h2>التسجيل</h2>
          <p>التسجيل والدفع يتمّان في الأكاديمية. بعدها تحصل على حسابك في بوابة المقاتلين.</p>
          <ol className="steps">
            <li><b>زُر الأكاديمية</b><span>تعرّف على المدربين واختر الحصص المناسبة لك.</span></li>
            <li><b>اختر اشتراكك وادفع عند الاستقبال</b><span>شهري أو لعدة أشهر.</span></li>
            <li><b>استلم اسم المستخدم وكلمة المرور</b><span>ادخل بها إلى بوابة المقاتلين من هاتفك.</span></li>
          </ol>
        </section>

        <section className="portal-band">
          <div>
            <h2>بوابة المقاتلين</h2>
            <ul>
              <li>جدول حصصك الأسبوعي وحصتك القادمة</li>
              <li>حالة اشتراكك وعدد الأيام المتبقية</li>
              <li>إعلانات الأكاديمية ومدربيك</li>
              <li>محادثة مباشرة مع الإدارة</li>
            </ul>
          </div>
          <PortalButton />
        </section>
      </main>

      <footer className="site-foot">
        <Ropes />
        <p>{SITE.name}</p>
        <p className="muted"><T>{SITE.address}</T></p>
        <div className="foot-social"><SocialLinks /></div>
      </footer>
    </div>
  );
}
