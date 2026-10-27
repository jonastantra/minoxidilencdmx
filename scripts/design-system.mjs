/** Visual layer appended after the existing structural stylesheet. No remote assets. */
export const designCss = `
.site-footer .footer-bottom p{color:#c5d0c7}
.guide-wa-link,.guide-wa-link:visited{color:#196342}.guide-wa-link:hover{color:#104d32}
.mc-visit .sidebar-box{color:#1d2421}.mc-visit .sidebar-box p{color:#48514a}.mc-proof{grid-template-columns:repeat(2,minmax(0,1fr))!important;}
:root {
  --brand:#765b22; --brand-hover:#59431a; --brand-light:#f1e9d5; --brand-light-border:#d7c79f;
  --dark-slate:#1d2421; --dark-surface:#293630; --dark-card:#25302a;
  --bg-page:#f5f2ea; --bg-card:#fff; --bg-subtle:#ece8dd;
  --text-main:#1d2421; --text-secondary:#48514a; --text-muted:#5d655f;
  --border:#dcded4; --border-subtle:#e9e8df;
  --wa-green:#196342; --wa-green-hover:#104d32; --wa-green-dark:#104d32;
  --gold:#b89a52; --radius-sm:8px; --radius-md:14px; --radius-lg:22px;
  --shadow-sm:0 3px 12px #1d242105; --shadow-md:0 10px 32px #1d24210a;
  --shadow-lg:0 20px 60px #1d242112;
}
html { scroll-padding-top:100px; }
body { font-size:16px; line-height:1.65; overflow-x:visible; -webkit-font-smoothing:antialiased; }
main { min-width:0; }
.container { width:min(1240px,calc(100% - 40px)); }
h1,h2,h3,h4 { text-wrap:balance; }
h1,h2 { letter-spacing:-.045em; }
a,button,input,summary { -webkit-tap-highlight-color:transparent; }
a { text-underline-offset:4px; }
a:focus-visible,button:focus-visible,input:focus-visible,summary:focus-visible { outline:3px solid #926f22; outline-offset:4px; }
button,input,select,textarea { font:inherit; }
p { overflow-wrap:break-word; }
img,iframe { max-width:100%; }
.section { padding:clamp(44px,6vw,88px) 0; }
.top-announcement { display:block; background:#1d2421; font-size:16px; padding:7px 0; }
.top-announcement-inner { justify-content:center; gap:8px 24px; text-align:center; line-height:1.5; }
.site-header { background:#fcfbf7; box-shadow:none; border-bottom:1px solid var(--border); }
.nav-wrap { min-height:78px; gap:20px; }
.brand { min-width:0; flex-shrink:0; }
.brand-logo-img { max-width:205px; height:41px; border-radius:3px; }
.nav-menu { gap:20px; font-size:16px; font-weight:650; }
.nav-menu > a { min-height:44px; display:flex; align-items:center; }
.nav-menu > a:not(.nav-btn):hover { color:var(--brand); text-decoration:underline; }
.nav-btn { background:var(--wa-green)!important; font-size:16px; box-shadow:none; padding:10px 16px; border-radius:8px; }
.nav-btn:hover { background:var(--wa-green-hover)!important; }
.menu-toggle { width:46px; height:46px; align-items:center; justify-content:center; padding:12px; }
.btn { min-height:48px; font-size:16px; padding:13px 21px; border-radius:8px; font-weight:750; transition:background-color .15s,border-color .15s,color .15s; box-shadow:none; }
.btn-large { min-height:54px; font-size:16px; padding:16px 25px; }
.btn-sm { min-height:44px; font-size:16px; }
.btn-gold { background:#b89a52; color:#1d2421; border-color:#b89a52; }
.btn-gold:hover { background:#d0b676; color:#1d2421; border-color:#d0b676; }
.btn-outline,.btn-secondary { border-color:#9baba0; background:transparent; color:#1d2421; }
.btn-outline:hover,.btn-secondary:hover { background:#e9e8df; border-color:#1d2421; color:#1d2421; }
.btn-primary { background:var(--wa-green); color:#fff; }
.btn-primary:hover { background:var(--wa-green-hover); }
.btn-wa-sm { min-width:44px; min-height:44px; background:var(--wa-green); color:#fff; display:inline-flex; align-items:center; justify-content:center; border-radius:8px; }
.section-tag,.eyebrow-tag,.mc-eyebrow { font-size:16px; font-weight:750; letter-spacing:.1em; line-height:1.5; text-transform:uppercase; }
.section-tag { color:var(--brand); }
.section-header,.section-header-row { margin-bottom:32px; }
.section-header h2,.section-header-row h2,.mc-section-head h2 { font-size:clamp(30px,3.4vw,44px); line-height:1.13; font-weight:750; margin:0 0 12px; }
.section-header p { color:var(--text-secondary); font-size:18px; }
.mc-hero { padding:clamp(36px,5vw,76px) 0 42px; background:#f5f2ea; }
.mc-hero-grid { display:grid; grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr); align-items:center; gap:clamp(32px,6vw,84px); }
.mc-eyebrow { display:block; color:var(--brand); margin:0 0 20px; }
.mc-hero-copy { min-width:0; }
.mc-hero-copy h1 { font-size:clamp(38px,5.2vw,68px); line-height:1.04; font-weight:760; margin:0 0 24px; max-width:760px; }
.mc-hero-copy h1 span { color:#42624d; }
.mc-hero-copy > p { font-size:clamp(18px,1.6vw,21px); line-height:1.65; color:var(--text-secondary); max-width:610px; margin:0 0 26px; }
.mc-hero-copy .hero-ctas { gap:12px; margin:0 0 22px; }
.mc-mini-note { font-size:16px!important; color:var(--text-muted); margin:16px 0 0; }
.mc-hero-media { min-width:0; position:relative; border:1px solid #ded9cc; background:#ebe5d7; border-radius:24px; padding:clamp(16px,3vw,36px); }
.mc-hero-product { width:100%; height:auto; max-height:490px; aspect-ratio:1/1; object-fit:contain; border-radius:16px; background:#fff; }
.mc-hero-media > p,.mc-hero-media figcaption { font-size:16px; color:#48514a; margin:16px 0 0; }
.mc-hero-media > .badge { position:absolute; top:22px; left:22px; }
.mc-proof { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:20px; padding:26px 0; margin-top:36px; border-top:1px solid #d5d7cb; border-bottom:1px solid #d5d7cb; }
.mc-proof > * { margin:0; padding:0 22px; border-left:1px solid #d5d7cb; }
.mc-proof > :first-child { border-left:0; padding-left:0; }
.mc-proof strong { display:block; color:var(--text-main); font-size:18px; line-height:1.4; margin-bottom:4px; }
.mc-proof span,.mc-proof p { font-size:16px; color:var(--text-secondary); margin:0; }
.mc-section-head { display:flex; gap:24px; justify-content:space-between; align-items:end; margin-bottom:30px; }
.mc-section-head > div { max-width:760px; }
.mc-section-head p { color:var(--text-secondary); margin:0; max-width:680px; }
.mc-section-head > a { flex-shrink:0; }
.mc-category-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:20px; }
.mc-category { display:flex; flex-direction:column; align-items:flex-start; background:#fff; border:1px solid var(--border); border-radius:16px; padding:28px; min-width:0; }
.mc-category h3 { font-size:24px; line-height:1.25; margin:0 0 12px; letter-spacing:-.03em; }
.mc-category p { color:var(--text-secondary); margin:0 0 20px; flex:1; }
.mc-category > span,.mc-category > a { font-weight:750; color:var(--brand); min-height:44px; display:inline-flex; align-items:center; }
.mc-category:hover { border-color:var(--gold); }
.mc-visit { background:#1d2421; color:#fff; }
.mc-visit-grid { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:clamp(28px,5vw,70px); align-items:center; }
.mc-visit .mc-eyebrow,.mc-visit .section-tag { color:#d4bd83; }
.mc-visit h2 { color:#fff; font-size:clamp(30px,4vw,48px); line-height:1.12; margin:0 0 22px; }
.mc-visit p,.mc-visit address { color:#d6dcd5; font-style:normal; }
.mc-visit img { width:100%; max-height:420px; aspect-ratio:4/3; object-fit:cover; border-radius:16px; }
.mc-visit .btn-outline,.mc-visit .btn-secondary { color:#fff; border-color:#bcc6ba; }
.mc-visit .btn-outline:hover,.mc-visit .btn-secondary:hover { background:#354238; color:#fff; }
.hero-section { background:var(--bg-page); }
.hero-headline { font-weight:750; letter-spacing:-.045em; }
.hero-eyebrow { font-size:16px; border-radius:6px; }
.hero-card-frame { box-shadow:none; }
.hero-card-badge { color:#1d512d; background:#e9f0e5; font-size:16px; }
.hero-card-desc,.hero-card-link,.hero-trust-list,.intent-card p,.intent-action { font-size:16px; }
.intent-grid { margin-top:0; }
.intent-card,.auth-point,.pricing-card,.product-card,.guide-card-full,.guide-preview-card,.timeline-stage-card { box-shadow:none; }
.intent-card:hover,.auth-point:hover,.pricing-card:hover,.product-card:hover,.guide-card-full:hover,.guide-preview-card:hover { transform:none; border-color:#a9b49f; box-shadow:var(--shadow-md); }
.product-grid { grid-template-columns:repeat(4,minmax(0,1fr)); gap:20px; }
.product-card { border-radius:14px; }
.product-img-link { padding:30px 20px 18px; background:#fff; border-bottom:1px solid #efefe9; }
.product-img-link img { width:100%; height:100%; object-fit:contain; }
.product-card:hover .product-img-link img { transform:none; }
.product-info { padding:20px; gap:8px; }
.product-title { font-size:18px; line-height:1.4; letter-spacing:-.02em; font-weight:700; }
.product-title a { display:block; min-height:44px; }
.product-cat,.badge,.price-val,.guide-badge,.read-more { font-size:16px; }
.badge { border-radius:5px; font-weight:650; padding:3px 8px; }
.badge-kirkland { color:#264c33; background:#e8efe6; }
.product-price-row { gap:12px; flex-wrap:wrap; margin-top:auto; }
.price-val { color:#1d2421; font-weight:750; font-size:20px; }
.page-title-banner { background:#eae7dc; color:#1d2421; text-align:left; padding:clamp(32px,5vw,64px) 0; }
.page-title-banner h1 { font-size:clamp(34px,4vw,54px); line-height:1.1; font-weight:750; max-width:900px; margin:12px 0 18px; }
.page-title-banner p { color:var(--text-secondary); max-width:790px; margin:0; font-size:18px; }
.page-title-banner .eyebrow-tag { color:var(--brand); }
.shop-layout { grid-template-columns:240px minmax(0,1fr); gap:32px; }
.shop-layout .product-grid { grid-template-columns:repeat(3,minmax(0,1fr)); }
.sidebar-box { border-radius:12px; padding:22px; }
.cat-pill,.cat-count,.search-input,.sidebar-help p,.sidebar-help h4 { font-size:16px; }
.cat-pill { min-height:48px; gap:12px; }
.sidebar-help { background:#e9efe5; border-color:#d6e1d0; }
.sidebar-help p,.sidebar-help h4 { color:#274f35; }
.search-input { min-height:48px; border-color:#a3afa1; width:min(390px,100%); }
.product-detail-grid { grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:clamp(28px,5vw,70px); }
.main-image-wrap { padding:clamp(20px,4vw,52px); border-radius:20px; }
.detail-title { font-size:clamp(30px,3.5vw,46px); font-weight:750; letter-spacing:-.04em; }
.detail-price-box { border:0; border-top:1px solid var(--border); border-bottom:1px solid var(--border); border-radius:0; background:transparent; padding:20px 0; }
.stock-status,.secure-buy-info,.breadcrumb-trail { font-size:16px; }
.stock-status { color:#23603c; }
.article-page-wrap { background:#fcfbf7; }
.article-header { background:#eae7dc; color:#1d2421; padding:clamp(36px,5vw,70px) 0; }
.article-header-inner { max-width:1080px; }
.article-title { font-size:clamp(34px,4.5vw,58px); font-weight:740; line-height:1.08; max-width:1000px; margin:0 0 22px; }
.article-cat-badge { color:var(--brand); background:#f7f3e8; border-color:#cfc3a7; border-radius:5px; font-size:16px; letter-spacing:.04em; margin-bottom:20px; }
.article-meta-row,.guide-summary-lead { color:#48514a; font-size:18px; }
.guide-summary-lead { max-width:860px; }
.article-layout { grid-template-columns:minmax(0,760px) minmax(0,300px); gap:60px; padding:48px 0 72px; }
.article-main-content,.article-sidebar,.shop-main { min-width:0; }
.article-prose { font-size:18px; line-height:1.85; color:#38443b; }
.article-prose h2 { font-size:clamp(26px,3vw,34px); font-weight:750; letter-spacing:-.035em; margin-top:44px; scroll-margin-top:100px; }
.article-prose h3 { font-size:23px; line-height:1.35; letter-spacing:-.02em; scroll-margin-top:100px; }
.article-prose a:not(.btn) { color:#6b511e; text-decoration:underline; text-decoration-thickness:1px; }
.article-prose ul,.article-prose ol { padding-left:24px; }
.article-prose img { height:auto; border-radius:12px; margin:24px auto; }
.article-prose table { display:block; overflow-x:auto; max-width:100%; border-collapse:collapse; font-size:16px; }
.article-prose th,.article-prose td { border:1px solid #cbd2c8; padding:12px; min-width:120px; text-align:left; }
.article-prose th { background:#e9ecdf; color:#1d2421; }
.article-body-wrap { max-width:900px; }
.article-featured-image { background:#fff; }
.article-featured-image img { max-height:500px; object-fit:contain; }
.article-featured-image figcaption { font-size:16px; text-align:left; padding:14px 18px; }
.article-toc,.toc,.guide-toc { border:1px solid #d0d7c9; padding:22px; border-radius:12px; background:#f0f1e8; margin:0 0 32px; }
.article-toc a,.toc a,.guide-toc a { min-height:44px; display:inline-flex; align-items:center; text-decoration:underline; }
.editorial-note,.medical-note,.safety-disclaimer { border:1px solid #d4c69f; border-left:4px solid var(--gold); background:#f7f1e2; padding:22px; border-radius:8px; font-size:16px; }
.safety-disclaimer p,.safety-disclaimer strong { color:#59461f; font-size:16px; }
.local-cdmx-callout { background:#eaf0e5; border:1px solid #cddcc3; padding:24px; }
.local-cdmx-callout h3,.local-cdmx-callout p { color:#294731; }
.cdmx-badge { font-size:16px; background:#2a5536; }
.guide-sources-box { border-top:1px solid var(--border); margin-top:32px; padding-top:24px; overflow-wrap:anywhere; }
.guide-sources-box li { margin-bottom:12px; }
.guide-index { display:block; }
.guide-index-heading { flex-wrap:wrap; gap:8px; }
.guide-index-heading a,.guide-index li a,.guide-buy-box p,.sidebar-prod-item strong,.sidebar-prod-price,.guide-sequence-link span,.guide-sequence-link strong,.guide-sequence-index { font-size:16px; }
.guide-index li a { grid-template-columns:25px minmax(0,1fr); padding:11px 5px; min-height:44px; line-height:1.45; }
.guide-index li a[aria-current="page"] span { color:#dcc797; }
.sticky-sidebar { top:100px; }
.guide-sequence-nav { grid-template-columns:minmax(0,1fr) minmax(0,1fr); }
.guide-sequence-index { grid-column:1/-1; order:3; min-height:44px; }
.guide-card-full:hover .guide-card-img img { transform:none; }
.guide-card-topic { font-size:16px; background:#1d2421; backdrop-filter:none; text-transform:none; letter-spacing:0; }
.guide-card-body { padding:26px; }
.guide-read-time,.guide-card-desc,.guide-wa-link,.guide-preview-content p { font-size:16px; }
.guide-card-title { font-size:25px; letter-spacing:-.035em; line-height:1.25; }
.guide-card-footer { align-items:center; }
.guide-wa-link,.read-more { display:inline-flex; min-height:44px; align-items:center; }
.guide-journey-nav span { font-size:16px; }
.guides-preview-grid { gap:20px; }
.faq-item { padding:0 24px; border-radius:12px; box-shadow:none; }
.faq-item summary { padding:20px 0; min-height:64px; font-size:18px; font-weight:700; line-height:1.5; }
.faq-item p { font-size:16px; margin:0 0 22px; }
.faq-item[open] { border-color:#a8b69f; }
.location-box { box-shadow:none; border-radius:20px; }
.location-details { background:#fff; }
.loc-item p,.loc-item strong,.loc-item span,.contact-card p,.contact-time,.contact-link { font-size:16px; }
.loc-actions { gap:12px; }
.location-map iframe { width:100%; min-height:380px; }
.contact-card { box-shadow:none; padding:28px; }
.contact-link { min-height:44px; display:flex; justify-content:center; align-items:center; overflow-wrap:anywhere; }
.final-cta-box { background:#1d2421; box-shadow:none; padding:clamp(28px,5vw,64px); border-radius:20px; }
.final-cta-box h2 { font-weight:750; }
.final-cta-box p { color:#d6dcd5; }
.site-footer { background:#1d2421; padding-top:56px; padding-bottom:24px; }
.footer-grid { gap:36px; grid-template-columns:1.35fr 1fr 1fr 1fr; }
.footer-col p,.footer-col a,.footer-col li,.footer-guarantee,.footer-bottom-inner { font-size:16px; }
.footer-links a { min-height:44px; display:inline-flex; align-items:center; }
.footer-guarantee { color:#dfc892; }
.footer-col a:hover { color:#dfc892; }
.footer-logo-img { filter:none; border-radius:4px; }
.wa-float { background:#196342; bottom:20px; right:20px; min-width:52px; min-height:52px; box-shadow:0 5px 18px #1d242126; animation:none; }
.wa-float-text { font-size:16px; }
.wa-pulse { animation:none; }
@media (max-width:1100px) {
  .nav-menu { gap:12px; }
  .nav-btn { padding:10px 12px; }
  .brand-logo-img { max-width:180px; }
  .shop-layout .product-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
  .article-layout { gap:32px; grid-template-columns:minmax(0,1fr) minmax(0,280px); }
}
@media (max-width:960px) {
  .nav-wrap { min-height:70px; }
  .menu-toggle { display:flex; }
  .nav-menu { display:none; position:absolute; top:70px; left:0; right:0; padding:20px; background:#fcfbf7; border-bottom:1px solid var(--border); box-shadow:var(--shadow-md); flex-direction:column; align-items:stretch; gap:4px; max-height:calc(100dvh - 90px); overflow-y:auto; }
  .nav-menu.open { display:flex; }
  .nav-menu > a { padding:8px 12px; }
  .nav-menu .nav-btn { justify-content:center; margin-top:8px; }
  .mc-hero-grid { gap:32px; }
  .mc-hero-copy h1 { font-size:clamp(38px,5.5vw,52px); }
  .product-grid { grid-template-columns:repeat(3,minmax(0,1fr)); }
  .mc-category-grid { gap:14px; }
  .mc-category { padding:22px; }
  .shop-layout { grid-template-columns:1fr; }
  .shop-sidebar { gap:20px; }
  .cat-pill-list { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); }
  .article-layout { grid-template-columns:minmax(0,1fr); max-width:820px; }
  .sticky-sidebar { position:static; }
  .guide-index { display:block; }
  .guide-index ol { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; }
  .footer-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
}
@media (max-width:700px) {
  .container { width:calc(100% - 32px); }
  .top-announcement-inner { gap:3px; justify-content:flex-start; text-align:left; }
  .mc-hero { padding:32px 0; }
  .mc-hero-grid,.mc-visit-grid { grid-template-columns:minmax(0,1fr); gap:28px; }
  .mc-hero-copy h1 { font-size:clamp(37px,8.4vw,50px); }
  .mc-hero-copy > p { font-size:18px; }
  .mc-hero-copy .hero-ctas { gap:10px; }
  .mc-hero-copy .hero-ctas .btn { flex:1 1 220px; }
  .mc-hero-media { padding:20px; border-radius:20px; }
  .mc-hero-product { max-height:360px; aspect-ratio:4/3; }
  .mc-proof { grid-template-columns:1fr; gap:16px; margin-top:24px; padding:24px 0; }
  .mc-proof > * { border-left:0; padding:0; }
  .mc-proof strong { display:inline; margin-right:6px; }
  .mc-section-head { flex-direction:column; align-items:flex-start; gap:18px; }
  .mc-category-grid { grid-template-columns:minmax(0,1fr); }
  .mc-category { padding:24px; }
  .mc-category p { margin-bottom:12px; }
  .product-grid,.shop-layout .product-grid { grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; }
  .product-img-link { padding:34px 12px 12px; }
  .product-badge-wrap { top:8px; left:8px; right:8px; }
  .product-badge-wrap .badge { font-size:16px; white-space:normal; line-height:1.25; }
  .product-info { padding:14px; gap:8px; }
  .product-title { font-size:17px; line-height:1.4; }
  .product-cat { font-size:16px; line-height:1.4; }
  .product-price-row { align-items:flex-start; }
  .price-val { font-size:18px; }
  .product-detail-grid { grid-template-columns:minmax(0,1fr); gap:28px; }
  .detail-title { font-size:34px; }
  .article-title { font-size:clamp(32px,7vw,44px); }
  .article-prose { font-size:18px; line-height:1.8; }
  .article-layout { padding:32px 0 48px; }
  .article-share-wa { padding:24px; }
  .guide-index ol { grid-template-columns:minmax(0,1fr); }
  .guide-sequence-nav { grid-template-columns:minmax(0,1fr); gap:12px; }
  .guide-sequence-next { text-align:left; }
  .guide-sequence-link { min-height:92px; }
  .guide-sequence-spacer { display:block; }
  .guides-main-grid { gap:20px; }
  .guide-card-body { padding:22px; }
  .guide-card-title { font-size:24px; }
  .faq-item { padding:0 18px; }
  .faq-item summary { font-size:17px; }
  .location-details { padding:24px; }
  .location-map iframe { min-height:300px; }
  .footer-grid { grid-template-columns:minmax(0,1fr); gap:28px; margin-bottom:28px; }
  .footer-col h3 { margin-bottom:10px; }
  .footer-bottom-inner { align-items:flex-start; text-align:left; gap:12px; }
  .site-footer { padding-bottom:84px; }
  .wa-float { right:16px; bottom:16px; }
}
@media (max-width:360px) {
  .container { width:calc(100% - 28px); }
  .brand-logo-img { max-width:175px; }
  .mc-hero-copy h1 { font-size:36px; }
  .product-grid,.shop-layout .product-grid { grid-template-columns:minmax(0,1fr); }
  .product-img-link { aspect-ratio:4/3; }
  .cat-pill-list { grid-template-columns:minmax(0,1fr); }
  .mc-hero-media { padding:14px; }
}
@media (prefers-reduced-motion:reduce) {
  html { scroll-behavior:auto; }
  *,*::before,*::after { animation:none!important; transition:none!important; }
}
`;
