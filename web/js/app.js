/* ============================================================
   CavaLocal Web — lógica del catálogo (ES module). Consume el
   backend NestJS vía js/api.js. Sin frameworks.
   ============================================================ */
import { mountCarousel } from './carousel.js';
import { getWines } from './api.js';
import { getUser, getToken, logout, setPendingReturn } from './store.js';
import { openCheckout } from './checkout.js';

(function () {
  'use strict';

  var USER_LOC = { lat: 10.497, lng: -66.854 };

  var CATEGORIES = [
    { label: 'Todos', term: '' },
    { label: 'Tintos', term: 'Tinto' },
    { label: 'Blancos', term: 'Blanco' },
    { label: 'Espumantes', term: 'Espumante' },
    { label: 'Rosados', term: 'Rosado' },
    { label: 'Nacionales', term: 'Venezuela' },
    { label: 'Argentina', term: 'Argentina' },
    { label: 'España', term: 'España' },
    { label: 'Italia', term: 'Italia' },
  ];
  var BESTSELLERS = ['las-moras-malbec','casablanca-sb','santa-rita-120','concha-toro-carmenere','pomar-syrah','pomar-brut','navarro-correas-cab','silk-spice','chianti-classico','prosecco'];
  var PRICES = [
    { key: 'all', label: 'Todos los precios' },
    { key: 'lt15', label: 'Hasta $15' },
    { key: 'mid', label: '$15 a $25' },
    { key: 'gt25', label: 'Más de $25' },
  ];

  var state = {
    raw: [],
    term: '',
    sort: 'cercania',
    mode: 'lista',
    price: 'all',
    token: getToken(),
    user: getUser(),
    loaded: false,
  };

  // ---------- utils ----------
  function $(s, r) { return (r || document).querySelector(s); }
  function rad(d) { return (d * Math.PI) / 180; }
  function haversine(aLat, aLng, bLat, bLng) {
    var dLat = rad(bLat - aLat), dLng = rad(bLng - aLng);
    var h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(rad(aLat)) * Math.cos(rad(bLat));
    return 6371 * 2 * Math.asin(Math.sqrt(h));
  }
  function hash(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }
  function money(n) { return '$' + Number(n).toFixed(2); }
  function round1(n) { return Math.round(n * 10) / 10; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function initials(name) { return name.split(' ').map(function (p) { return p[0]; }).filter(Boolean).slice(0, 2).join('').toUpperCase(); }

  function bottleColor(type) {
    var t = (type || '').toLowerCase();
    if (t === 'blanco') return '#C9B560';
    if (t === 'rosado') return '#E08AA0';
    if (t === 'espumante') return '#D9B45A';
    if (t === 'fortificado') return '#5A1622';
    return '#641E2E'; // tinto / default
  }
  function bottleSVG(type) {
    var c = bottleColor(type);
    return '<svg viewBox="0 0 30 48" aria-hidden="true">' +
      '<path d="M12 1 h6 v9 c0 2 3 4 3 9 v25 c0 2 -1 3 -3 3 h-6 c-2 0 -3 -1 -3 -3 V19 c0 -5 3 -7 3 -9 z" fill="' + c + '"/>' +
      '<rect x="9" y="26" width="12" height="11" rx="1.5" fill="#fff" opacity="0.92"/></svg>';
  }

  // ---------- data ----------
  function transform(w) {
    var parts = (w.origin || '').split(',').map(function (p) { return p.trim(); });
    var country = parts.length > 1 ? parts[parts.length - 1] : '';
    var region = parts.slice(0, Math.max(1, parts.length - 1)).join(', ') || country;
    var offers = (w.availabilities || []).map(function (a) {
      var e = a.establishment || {};
      return {
        storeId: e.id, storeName: e.name, lat: e.lat, lng: e.lng,
        price: Number(a.price), status: a.status,
        dist: round1(haversine(USER_LOC.lat, USER_LOC.lng, e.lat, e.lng)), best: false,
      };
    }).sort(function (x, y) { return x.price - y.price; });
    if (offers.length) offers[0].best = true;
    var nearest = offers.slice().sort(function (x, y) { return x.dist - y.dist; })[0] || null;
    var h = hash(w.id);
    var low = (h % 7) === 0;
    return {
      id: w.id, name: w.name, vintage: w.vintage, winery: w.wineryName,
      country: country, region: region, grape: w.grape, type: w.type,
      denomination: w.denominationOfOrigin || '',
      offers: offers,
      bestPrice: offers.length ? offers[0].price : Number(w.referencePrice),
      storeCount: offers.length,
      nearest: nearest,
      rating: Math.round((4 + (h % 10) / 10) * 10) / 10,
      reviews: 40 + (h % 560),
      stock: low ? { kind: 'ultimas', text: 'Últimas 3', color: '#C2912B' } : { kind: 'disponible', text: 'Disponible', color: '#2E8B57' },
    };
  }

  function matchTerm(w, term) {
    if (!term) return true;
    var hay = (w.name + ' ' + w.grape + ' ' + w.country + ' ' + w.region + ' ' + w.winery + ' ' + w.type).toLowerCase();
    return hay.indexOf(term.toLowerCase()) !== -1;
  }
  function priceOk(p, b) {
    if (b === 'lt15') return p < 15;
    if (b === 'mid') return p >= 15 && p <= 25;
    if (b === 'gt25') return p > 25;
    return true;
  }
  function filtered() {
    var list = state.raw.filter(function (w) { return matchTerm(w, state.term) && priceOk(w.bestPrice, state.price); });
    if (state.sort === 'precio') list.sort(function (a, b) { return a.bestPrice - b.bestPrice; });
    else if (state.sort === 'calificacion') list.sort(function (a, b) { return b.rating - a.rating; });
    else list.sort(function (a, b) { return (a.nearest ? a.nearest.dist : 99) - (b.nearest ? b.nearest.dist : 99); });
    return list;
  }
  function counts(key) {
    var m = {};
    state.raw.forEach(function (w) { var k = w[key]; m[k] = (m[k] || 0) + 1; });
    return Object.keys(m).map(function (k) { return { key: k, count: m[k] }; }).sort(function (a, b) { return b.count - a.count; });
  }

  async function loadWines() {
    try {
      state.raw = (await getWines()).map(transform);
    } catch (e) {
      state.raw = [];
      console.warn('No se pudo cargar el backend:', e);
    }
    state.loaded = true;
  }

  // ---------- render ----------
  function render() {
    renderAccount();
    renderCatbar();
    renderBestsellers();
    renderFilters();
    renderToolbar();
    renderView();
    toggleHome();
  }

  function renderAccount() {
    var el = $('#account');
    var user = getUser();
    if (user) {
      el.innerHTML = '<div class="user-pill" data-logout="1"><div class="avatar">' + esc(initials(user.name)) + '</div><span class="uname">' + esc(user.name.split(' ')[0]) + '</span></div>';
    } else {
      el.innerHTML = '<a class="btn-login" href="login.html">Iniciar sesión</a>';
    }
  }

  function renderCatbar() {
    $('#catbar').innerHTML = CATEGORIES.map(function (c) {
      return '<a href="#" data-cat="' + esc(c.term) + '" class="' + (c.term === state.term ? 'active' : '') + '">' + esc(c.label) + '</a>';
    }).join('');
  }

  function miniCard(w) {
    return '<div class="card mini" data-detail="' + w.id + '">' +
      '<div class="card-img"><span class="top-tag">TOP</span>' + bottleSVG(w.type) + '</div>' +
      '<div class="card-body"><div class="winery">' + esc(w.winery) + '</div>' +
      '<div class="pname">' + esc(w.name) + '</div>' +
      '<div class="rating">★ <b>' + w.rating.toFixed(1) + '</b> <span>(' + w.reviews + ')</span></div>' +
      '<div class="price-row"><span class="from">desde</span><span class="price">' + money(w.bestPrice) + '</span></div></div></div>';
  }
  function renderBestsellers() {
    var byId = {}; state.raw.forEach(function (w) { byId[w.id] = w; });
    var list = BESTSELLERS.map(function (id) { return byId[id]; }).filter(Boolean);
    $('#bestsellers').innerHTML = list.map(miniCard).join('');
  }

  // ---------- carrusel + tiles promocionales (estáticos: se montan una vez) ----------
  var SLIDES = [
    { img: 'img/promo-1.webp', kicker: 'BODEGA DESTACADA', title: 'Pomar, de Carora a tu copa', subtitle: 'El vino venezolano que conquista paladares.', ctaLabel: 'Ver Pomar', ctaAttr: 'data-cat="Pomar"' },
    { img: 'img/promo-4.webp', kicker: 'AL MEJOR PRECIO', title: 'Comparamos por ti', subtitle: 'El mismo vino, el precio más bajo de tu zona.', ctaLabel: 'Comparar precios', ctaAttr: 'data-cat=""' },
    { img: 'img/promo-2.webp', kicker: 'RESERVA ONLINE', title: 'Tu próxima botella te espera', subtitle: 'Elige, reserva con una seña y retira cuando quieras.', ctaLabel: 'Explorar vinos', ctaAttr: 'data-cat=""' },
    { img: 'img/promo-5.webp', kicker: 'HECHO EN VENEZUELA', title: 'Orgullo nacional en tu copa', subtitle: 'Apoya lo local: etiquetas venezolanas seleccionadas.', ctaLabel: 'Ver nacionales', ctaAttr: 'data-cat="Venezuela"' },
  ];
  var TILES = [
    { img: 'img/tile-1.webp', tk: 'TINTOS', title: 'Cuerpo y carácter', attr: 'data-cat="Tinto"' },
    { img: 'img/tile-2.webp', tk: 'ESPUMANTES', title: 'Burbujas para brindar', attr: 'data-cat="Espumante"' },
    { img: 'img/tile-3.webp', tk: 'CERCA DE TI', title: 'Tiendas en tu zona', attr: 'data-cat=""' },
  ];
  var carouselCtl = null;
  function renderCarousel() {
    var root = $('#carousel'); if (!root) return;
    if (carouselCtl) carouselCtl.destroy();
    carouselCtl = mountCarousel(root, SLIDES, { interval: 5000 });
  }
  function renderTiles() {
    var host = $('#promoTiles'); if (!host) return;
    host.innerHTML = TILES.map(function (t) {
      return '<div class="promo-tile" ' + t.attr + '><img src="' + t.img + '" alt="' + esc(t.title) + '" /><div class="tile-overlay"></div><div class="tile-text"><div class="tk">' + esc(t.tk) + '</div><h4>' + esc(t.title) + '</h4></div></div>';
    }).join('');
  }

  function renderFilters() {
    var byType = counts('type'), byWorldRaw = counts('country');
    // Agrupar por "mundo" simple: Local (Venezuela) vs resto (por país)
    var html = '';
    html += '<div class="filter-group"><div class="ftitle">Tipo</div>' + byType.map(function (c) {
      return '<div class="frow ' + (state.term === c.key ? 'active' : '') + '" data-term="' + esc(c.key) + '"><span>' + esc(c.key) + '</span><span class="fcount">' + c.count + '</span></div>';
    }).join('') + '</div>';
    html += '<div class="filter-group"><div class="ftitle">País</div>' + byWorldRaw.map(function (c) {
      return '<div class="frow ' + (state.term === c.key ? 'active' : '') + '" data-term="' + esc(c.key) + '"><span>' + esc(c.key) + '</span><span class="fcount">' + c.count + '</span></div>';
    }).join('') + '</div>';
    html += '<div class="filter-group" style="border-bottom:none"><div class="ftitle">Precio</div>' + PRICES.map(function (p) {
      return '<div class="frow ' + (state.price === p.key ? 'active' : '') + '" data-price="' + p.key + '"><span>' + esc(p.label) + '</span></div>';
    }).join('') + '</div>';
    $('#filters').innerHTML = html;
  }

  function renderToolbar() {
    var list = filtered();
    var cnt = state.mode === 'comparar'
      ? list.filter(function (w) { return w.offers.length > 1; }).length
      : list.length;
    $('#resCount').textContent = cnt;
    document.querySelectorAll('#sortOpts .opt').forEach(function (b) { b.classList.toggle('active', b.dataset.sort === state.sort); });
    document.querySelectorAll('#modes .mode').forEach(function (b) { b.classList.toggle('active', b.dataset.mode === state.mode); });
  }

  function gridCard(w) {
    return '<div class="card" data-detail="' + w.id + '">' +
      '<div class="card-img">' + bottleSVG(w.type) +
        '<button class="wish" title="Favorito"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#641E2E" stroke-width="2"><path d="M12 20s-7-4.4-9.3-8.4C1.2 8.7 2.9 5.5 6.2 5.5c1.9 0 3.2 1 3.8 1.9C10.6 6.5 11.9 5.5 13.8 5.5c3.3 0 5 3.2 3.5 6.1C19 15.6 12 20 12 20z"/></svg></button>' +
        '<div class="stock" style="color:' + w.stock.color + '"><span class="dot" style="background:' + w.stock.color + '"></span>' + w.stock.text + '</div>' +
      '</div>' +
      '<div class="card-body">' +
        '<div class="winery">' + esc(w.winery) + '</div>' +
        '<div class="pname">' + esc(w.name) + (w.vintage ? ' ' + w.vintage : '') + '</div>' +
        '<div class="pchip">' + esc(w.grape) + ' · ' + esc(w.region) + '</div>' +
        '<div class="rating">★ <b>' + w.rating.toFixed(1) + '</b> <span>(' + w.reviews + ')</span></div>' +
        '<div class="price-row"><span class="from">desde</span><span class="price">' + money(w.bestPrice) + '</span></div>' +
        '<div class="stores">en ' + w.storeCount + ' tiendas</div>' +
        '<button class="btn-reserve" data-reserve="' + w.id + '">Reservar</button>' +
      '</div></div>';
  }

  function compareCard(w) {
    var offers = w.offers;
    return '<div class="compare-card">' +
      '<div class="ch"><div class="card-img" style="width:64px;height:64px;border-radius:10px">' + bottleSVG(w.type) + '</div>' +
      '<div><div class="pname" data-detail="' + w.id + '" style="cursor:pointer">' + esc(w.name) + (w.vintage ? ' ' + w.vintage : '') + '</div>' +
      '<div class="winery">' + esc(w.winery) + '</div><div class="rating">★ <b>' + w.rating.toFixed(1) + '</b> <span>(' + w.reviews + ')</span></div></div></div>' +
      '<div style="font-size:13px;color:var(--muted);margin-bottom:8px">Mismo vino en <b>' + offers.length + ' tiendas cercanas</b></div>' +
      offers.map(function (o) {
        return '<div class="offer ' + (o.best ? 'best' : '') + '"><div><span class="oname">' + esc(o.storeName) + '</span>' + (o.best ? '<span class="best-tag">MEJOR PRECIO</span>' : '') + '<div style="font-size:12px;color:var(--muted)">' + o.dist + ' km</div></div><span class="oprice" style="color:' + (o.best ? 'var(--wine)' : 'var(--ink)') + '">' + money(o.price) + '</span></div>';
      }).join('') +
      '<button class="cta" data-reserve="' + w.id + '">Reservar en la más barata · ' + money(offers[0].price) + '</button></div>';
  }

  function renderView() {
    var view = $('#view');
    var list = filtered();
    if (state.mode === 'lista') {
      if (!list.length) { view.innerHTML = emptyState(); return; }
      view.innerHTML = '<div class="grid">' + list.map(gridCard).join('') + '</div>';
    } else if (state.mode === 'comparar') {
      var cmp = list.filter(function (w) { return w.offers.length > 1; }).sort(function (a, b) { return b.offers.length - a.offers.length; });
      if (!cmp.length) { view.innerHTML = emptyState(); return; }
      view.innerHTML = '<div class="compare-wrap">' + cmp.map(compareCard).join('') + '</div>';
    } else {
      view.innerHTML = mapView(list);
    }
  }

  function emptyState() {
    return '<div style="text-align:center;padding:60px 0;color:var(--muted)"><div style="font-size:40px">🍷</div><h3 style="font-family:var(--font-display);color:var(--wine);margin:8px 0">No encontramos vinos</h3><p>Prueba con otra cepa, bodega, país o quita filtros.</p></div>';
  }

  function mapView(list) {
    var stores = {};
    list.forEach(function (w) { w.offers.forEach(function (o) { if (!stores[o.storeId] || o.price < stores[o.storeId].price) stores[o.storeId] = { name: o.storeName, price: o.price, lat: o.lat, lng: o.lng }; }); });
    var arr = Object.keys(stores).map(function (k) { return stores[k]; });
    if (!arr.length) return emptyState();
    var lats = arr.map(function (s) { return s.lat; }), lngs = arr.map(function (s) { return s.lng; });
    var minLat = Math.min.apply(null, lats), maxLat = Math.max.apply(null, lats), minLng = Math.min.apply(null, lngs), maxLng = Math.max.apply(null, lngs);
    var cheapest = arr.reduce(function (m, s) { return s.price < m.price ? s : m; }, arr[0]);
    function spanX(v) { return maxLng === minLng ? 50 : 12 + ((v - minLng) / (maxLng - minLng)) * 76; }
    function spanY(v) { return maxLat === minLat ? 50 : 18 + (1 - (v - minLat) / (maxLat - minLat)) * 64; }
    var pins = arr.map(function (s) {
      return '<div class="map-pin ' + (s === cheapest ? 'hot' : '') + '" style="left:' + spanX(s.lng) + '%;top:' + spanY(s.lat) + '%">' + money(s.price) + '</div>';
    }).join('');
    var nearby = list.slice(0, 6).map(function (w) {
      return '<div class="card" style="flex-direction:row;align-items:center;gap:12px;padding:10px;border:none;box-shadow:var(--shadow-sm)" data-detail="' + w.id + '"><div style="width:44px;height:44px;background:var(--thumb);border-radius:8px;display:flex;align-items:center;justify-content:center">' + bottleSVG(w.type) + '</div><div style="flex:1"><div class="pname" style="min-height:0">' + esc(w.name) + '</div><div style="font-size:12px;color:var(--muted)">' + (w.nearest ? w.nearest.dist + ' km · ' + esc(w.nearest.storeName || (w.nearest && w.nearest.store && w.nearest.store.name) || '') : '') + '</div></div><span class="price" style="color:var(--wine);font-weight:800">' + money(w.bestPrice) + '</span></div>';
    }).join('');
    return '<div class="map-box"><div class="map-canvas">' +
      '<div style="position:absolute;left:120px;top:130px;width:14px;height:14px;border-radius:50%;background:var(--wine)"></div>' + pins +
      '</div><div class="map-list"><b>Más cercanos primero</b>' + nearby + '</div></div>';
  }

  function toggleHome() {
    var showHome = state.term === '' && state.price === 'all' && state.mode === 'lista';
    ['.hero-carousel', '.promo-tiles', '.section'].forEach(function (sel) {
      var el = $(sel); if (el) el.style.display = showHome ? '' : 'none';
    });
  }

  // ---------- reserva (el checkout con seña llega en el Plan 2) ----------
  function reserve(id) {
    if (!getUser()) {
      setPendingReturn('return=reserve:' + id);
      window.location.href = 'login.html';
      return;
    }
    var w = state.raw.filter(function (x) { return x.id === id; })[0];
    if (w) openCheckout(w);
  }

  function toast(msg) {
    var t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#641E2E;color:#fff;padding:14px 22px;border-radius:50px;font-weight:700;box-shadow:0 10px 30px rgba(0,0,0,0.3);z-index:2000';
    document.body.appendChild(t);
    setTimeout(function () { t.style.transition = 'opacity .4s'; t.style.opacity = '0'; setTimeout(function () { t.remove(); }, 400); }, 2200);
  }

  // ---------- events ----------
  function bind() {
    $('#search').addEventListener('input', function (e) { state.term = e.target.value; renderCatbar(); renderFilters(); renderToolbar(); renderView(); toggleHome(); });

    document.addEventListener('click', function (e) {
      var t = e.target.closest('[data-cat],[data-sort],[data-mode],[data-open],[data-reserve],[data-detail],[data-term],[data-price],[data-logout]');
      if (!t) {
        if (e.target.id === 'clearFilters') { state.term = ''; state.price = 'all'; render(); }
        return;
      }
      if (t.id === 'clearFilters') return;
      if (t.hasAttribute('data-cat')) { e.preventDefault(); state.term = t.getAttribute('data-cat'); state.price = 'all'; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
      else if (t.hasAttribute('data-term')) { var v = t.getAttribute('data-term'); state.term = (state.term === v ? '' : v); render(); }
      else if (t.hasAttribute('data-price')) { state.price = t.getAttribute('data-price'); render(); }
      else if (t.hasAttribute('data-sort')) { state.sort = t.getAttribute('data-sort'); renderToolbar(); renderView(); }
      else if (t.hasAttribute('data-mode')) { state.mode = t.getAttribute('data-mode'); if (state.mode === 'comparar') state.sort = 'precio'; renderToolbar(); renderView(); toggleHome(); }
      else if (t.hasAttribute('data-open')) { e.preventDefault(); window.location.href = 'login.html' + (t.getAttribute('data-open') === 'register' ? '?register' : ''); }
      else if (t.hasAttribute('data-reserve')) { e.stopPropagation(); reserve(t.getAttribute('data-reserve')); }
      else if (t.hasAttribute('data-logout')) { logout(); state.token = null; state.user = null; render(); }
      else if (t.hasAttribute('data-detail')) { /* detalle simple: filtrar a ese vino */ }
    });

    // limpiar filtros (id directo)
    document.getElementById('clearFilters').addEventListener('click', function () { state.term = ''; state.price = 'all'; render(); });
  }

  async function init() {
    bind();
    renderCarousel(); renderTiles(); // estáticos: se muestran al instante
    renderAccount(); renderCatbar();
    $('#view').innerHTML = '<div style="text-align:center;padding:60px;color:var(--muted)">Cargando catálogo…</div>';
    await loadWines();
    render();

    var ret = new URLSearchParams(location.search).get('return');
    if (ret && ret.indexOf('reserve:') === 0 && getUser()) {
      var rid = ret.slice('reserve:'.length);
      var w = state.raw.filter(function (x) { return x.id === rid; })[0];
      if (w) openCheckout(w);
      history.replaceState(null, '', 'index.html');
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
