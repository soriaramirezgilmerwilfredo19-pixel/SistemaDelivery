import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import client, { apiError } from '../api/client';
import { useToast } from '../context/ToastContext';
import { useConfig } from '../context/ConfigContext';
import { useAuth } from '../context/AuthContext';
import ProductImage from '../components/ProductImage';
import QuickView from '../components/QuickView';
import CustomOrderModal from '../components/CustomOrderModal';
import { PriceBlock } from '../components/PriceBlock';
import Stars from '../components/Stars';

const HISTORY_KEY = 'delivery-search-history';

const CAT_EMOJI = {
  hamburguesas: '🍔',
  pizzas: '🍕',
  acompanantes: '🍟',
  snacks: '🍗',
  ensaladas: '🥗',
  combos: '🍱',
  bebidas: '🥤',
  cafes: '☕',
  postres: '🍰',
};

const TESTIMONIALS = [
  {
    name: 'María Fernanda',
    place: 'Barrio El Recreo',
    text: 'Pedí a las 7 de la noche y en 30 minutos tenía mi hamburguesa caliente en la puerta. El seguimiento en vivo es lo máximo.',
  },
  {
    name: 'Andrés Villacís',
    place: 'Centro de Puyo',
    text: 'Pagué con tarjeta y todo salió al instante. Se nota que cuidaron cada detalle, muy profesional.',
  },
  {
    name: 'Daniela Ruiz',
    place: 'Barrio La Merced',
    text: 'El combo familiar rinde muchísimo y llegó completito. Repetiré sin dudarlo, ya es mi app de cabecera.',
  },
  {
    name: 'Jorge Cabrera',
    place: 'Av. Ceslao Marín',
    text: 'Atención de 10 y repartidores muy amables. Además el envío gratis desde cierto monto se agradece.',
  },
];

function readHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch {
    return [];
  }
}

function pushHistory(term) {
  const t = term.trim();
  if (!t) return;
  const list = [t, ...readHistory().filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(0, 6);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
}

function isSoldOut(p) {
  return p?.stock !== null && p?.stock !== undefined && Number(p.stock) <= 0;
}

function stockHint(p) {
  if (p?.stock === null || p?.stock === undefined) return null;
  const s = Number(p.stock);
  if (s <= 0) return 'Producto agotado';
  if (s <= 5) return `¡Solo quedan ${s}!`;
  return null;
}

export default function Catalog() {
  const toast = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { status, eta, freeOver } = useConfig();
  const { setCartCount } = useOutletContext();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(null);
  const [quickView, setQuickView] = useState(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [history, setHistory] = useState(readHistory);
  const [showSuggest, setShowSuggest] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    client.get('/categories').then((res) => setCategories(res.data.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (debounced) pushHistory(debounced);
    setHistory(readHistory());
  }, [debounced]);

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (debounced) params.search = debounced;
    if (category) params.category = category;
    client
      .get('/products', { params })
      .then((res) => setProducts(res.data.data))
      .catch((err) => toast(apiError(err), 'error'))
      .finally(() => setLoading(false));
  }, [debounced, category]);

  useEffect(() => {
    function onClick(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggest(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const suggestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    const fromProducts = q
      ? products.filter((p) => p.name.toLowerCase().includes(q)).map((p) => p.name).slice(0, 4)
      : [];
    const fromHistory = q
      ? history.filter((h) => h.toLowerCase().includes(q)).slice(0, 3)
      : history.slice(0, 5);
    return [...new Set([...fromProducts, ...fromHistory])].slice(0, 6);
  }, [search, products, history]);

  const featured = useMemo(() => products.filter((p) => p.featured), [products]);
  const isBrowsing = category === '' && !debounced;
  const gridProducts = useMemo(
    () => (isBrowsing ? products.filter((p) => !p.featured) : products),
    [products, isBrowsing]
  );

  async function addToCart(product, quantity = 1) {
    setAdding(product.id);
    try {
      const res = await client.post('/cart/items', { product_id: product.id, quantity });
      setCartCount(res.data.data.items.length);
      toast(`${product.name} agregado al carrito`, 'success');
      setQuickView(null);
    } catch (err) {
      toast(apiError(err), 'error');
    } finally {
      setAdding(null);
    }
  }

  function openCustom() {
    if (!user) {
      toast('Inicia sesion para hacer un pedido personalizado', 'info');
      navigate('/login');
      return;
    }
    if (user.role !== 'client') {
      toast('Solo los clientes pueden hacer pedidos', 'info');
      return;
    }
    setCustomOpen(true);
  }

  return (
    <div>
      <section className="hero">
        <div className="hero-blob hero-blob-1" aria-hidden="true" />
        <div className="hero-blob hero-blob-2" aria-hidden="true" />
        <div className="hero-text">
          <span className="hero-tag">🛵 Delivery en Puyo</span>
          <h1>
            Tu comida favorita,
            <br />
            <em>a tu puerta</em>
          </h1>
          <p>
            Pide hamburguesas, pizzas, postres y más. Sigue tu pedido paso a paso
            en tiempo real y paga como prefieras.
          </p>
          <div className="hero-cta">
            <a href="#catalogo" className="btn btn-primary btn-lg">Ver catálogo</a>
            <a href="#pago" className="btn btn-outline btn-lg">¿Cómo pago?</a>
          </div>
          <div className="hero-stats">
            <div className="hstat">
              <strong>{eta}</strong>
              <span>min de entrega</span>
            </div>
            <div className="hstat">
              <strong>S/ {freeOver.toFixed(0)}</strong>
              <span>envío gratis desde</span>
            </div>
            <div className="hstat">
              <strong>4.8★</strong>
              <span>+500 pedidos</span>
            </div>
          </div>
          <ul className="hero-features">
            <li>🛵 Repartidores propios</li>
            <li>📡 Seguimiento en vivo</li>
            <li>🔒 Pago seguro</li>
          </ul>
          {status && (
            <div className={`hero-schedule ${status.open ? 'hs-open' : 'hs-closed'}`}>
              <span className="live-dot" />
              <span>
                <strong>{status.title}</strong> · {status.text}
              </span>
              <Link to="/local" className="hs-link">Ver horario y local →</Link>
            </div>
          )}

          <button className="btn btn-custom-cta" onClick={openCustom}>
            <span className="bcc-icon">🎨</span>
            <span className="bcc-text">
              <strong>Pedido personalizado</strong>
              <small>Cuéntanos lo que se te antoje y lo preparamos para ti</small>
            </span>
            <span className="bcc-arrow">→</span>
          </button>
        </div>
        <div className="hero-art" aria-hidden="true">
          {featured[0] ? (
            <img className="hero-food" src={featured[0].image_url} alt="" loading="lazy" />
          ) : (
            <span className="hero-emoji">🛵</span>
          )}
          <span className="hero-float hero-float-1">🍔</span>
          <span className="hero-float hero-float-2">🍕</span>
          <span className="hero-float hero-float-3">🥤</span>
        </div>
      </section>

      <div className="page-head" id="catalogo">
        <div>
          <h2 className="section-title">Catálogo</h2>
          <p className="hint">Haz clic en un producto para ver el detalle y sus reseñas</p>
        </div>
        <div className="search-wrap" ref={searchRef}>
          <input
            className="search-input"
            placeholder="Buscar productos..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setShowSuggest(true);
            }}
            onFocus={() => setShowSuggest(true)}
          />
          {showSuggest && suggestions.length > 0 && (
            <ul className="suggest-list">
              {suggestions.map((s) => (
                <li
                  key={s}
                  onMouseDown={() => {
                    setSearch(s);
                    setDebounced(s);
                    setShowSuggest(false);
                    pushHistory(s);
                  }}
                >
                  🔍 {s}
                </li>
              ))}
              {history.length > 0 && !search && (
                <li
                  className="suggest-clear"
                  onMouseDown={() => {
                    localStorage.removeItem(HISTORY_KEY);
                    setHistory([]);
                  }}
                >
                  🗑 Limpiar historial
                </li>
              )}
            </ul>
          )}
        </div>
      </div>

      <div className="chips">
        <button className={`chip ${category === '' ? 'chip-active' : ''}`} onClick={() => setCategory('')}>
          Todas
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            className={`chip ${category === c.slug ? 'chip-active' : ''}`}
            onClick={() => setCategory(c.slug)}
          >
            {CAT_EMOJI[c.slug] ? `${CAT_EMOJI[c.slug]} ` : ''}{c.name}
          </button>
        ))}
      </div>

      {!loading && isBrowsing && categories.length > 0 && (
        <section style={{ marginBottom: '1.5rem' }} data-reveal>
          <div className="menu-head">
            <h2 className="section-title">🍽️ Explora por categoría</h2>
            <p className="hint">Elige un antojo y te mostramos solo lo que te provoca</p>
          </div>
          <div className="cat-showcase">
            {categories.map((c) => {
              const count = products.filter((p) => p.category?.slug === c.slug).length;
              return (
                <button
                  key={c.id}
                  type="button"
                  className="cat-tile"
                  onClick={() => {
                    setCategory(c.slug);
                    document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  <span className="cat-tile-arrow">→</span>
                  <span className="cat-tile-emoji">{CAT_EMOJI[c.slug] || '🍴'}</span>
                  <strong>{c.name}</strong>
                  <small>{count} {count === 1 ? 'plato' : 'platos'}</small>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {!loading && isBrowsing && featured.length > 0 && (
        <section className="featured" data-reveal>
          <div>
            <h2 className="section-title">🔥 Lo más pedido</h2>
            <p className="hint">Los favoritos de nuestros clientes, siempre al tope</p>
          </div>
          <div className="feat-row">
            {featured.map((p) => (
              <div
                key={p.id}
                className="feat-card"
                role="button"
                tabIndex={0}
                onClick={() => setQuickView(p)}
                onKeyDown={(e) => e.key === 'Enter' && setQuickView(p)}
              >
                <ProductImage product={p} discount={p.discount} badge={p.badge} out={isSoldOut(p)} />
                <div className="feat-body">
                  <strong>{p.name}</strong>
                  <PriceBlock price={p.price} finalPrice={p.final_price} discount={p.discount} />
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={adding === p.id || !p.available || isSoldOut(p)}
                    onClick={(e) => {
                      e.stopPropagation();
                      addToCart(p);
                    }}
                  >
                    {adding === p.id ? 'Agregando...' : isSoldOut(p) ? 'Agotado' : 'Agregar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {loading ? (
        <div className="product-grid">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card product-card skeleton-card">
              <div className="skeleton skeleton-img" />
              <div className="product-body">
                <div className="skeleton skeleton-line" />
                <div className="skeleton skeleton-line short" />
              </div>
            </div>
          ))}
        </div>
      ) : gridProducts.length === 0 ? (
        <p className="empty">No se encontraron productos.</p>
      ) : (
        <>
          {isBrowsing && (
            <div className="menu-head" data-reveal>
              <h2 className="section-title">🍽️ Menú completo</h2>
              <p className="hint">Todo lo que tenemos para ti, además de lo más pedido</p>
            </div>
          )}
          <div className="product-grid" data-reveal>
          {gridProducts.map((p) => (
            <div
              key={p.id}
              className="card product-card"
              role="button"
              tabIndex={0}
              onClick={() => setQuickView(p)}
              onKeyDown={(e) => e.key === 'Enter' && setQuickView(p)}
            >
              <ProductImage product={p} discount={p.discount} badge={p.badge} out={isSoldOut(p)} quick="👁 Ver detalle y reseñas" />
              <div className="product-body">
                <span className="product-cat">{p.category?.name || 'Sin categoria'}</span>
                <h3>{p.name}</h3>
                <p className="product-desc">{p.description}</p>
                {Number(p.review_count) > 0 && (
                  <div className="product-rating">
                    <Stars value={p.avg_rating} />
                    <small>({p.review_count})</small>
                  </div>
                )}
                {stockHint(p) && (
                  <span className={`stock-hint ${isSoldOut(p) ? 'stock-out' : ''}`}>{stockHint(p)}</span>
                )}
                <div className="product-foot">
                  <PriceBlock price={p.price} finalPrice={p.final_price} discount={p.discount} />
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={adding === p.id || !p.available || isSoldOut(p)}
                    onClick={(e) => {
                      e.stopPropagation();
                      addToCart(p);
                    }}
                  >
                    {adding === p.id ? 'Agregando...' : isSoldOut(p) ? 'Agotado' : 'Agregar'}
                  </button>
                </div>
              </div>
            </div>
          ))}
          </div>
        </>
      )}

      <section className="trust-strip" data-reveal>
        <div className="trust-item">
          <span className="ti-ico">🛵</span>
          <div><strong>Entrega rápida</strong><small>Repartidores propios en toda la ciudad</small></div>
        </div>
        <div className="trust-item">
          <span className="ti-ico">📡</span>
          <div><strong>Seguimiento en vivo</strong><small>Mira tu pedido avanzar en el mapa</small></div>
        </div>
        <div className="trust-item">
          <span className="ti-ico">🔒</span>
          <div><strong>Pago seguro</strong><small>Efectivo o tarjeta, tú decides</small></div>
        </div>
        <div className="trust-item">
          <span className="ti-ico">💬</span>
          <div><strong>Soporte real</strong><small>Resolvemos cualquier novedad contigo</small></div>
        </div>
      </section>

      <section className="testimonials" data-reveal>
        <div className="menu-head">
          <h2 className="section-title">💬 Lo que dicen nuestros clientes</h2>
          <p className="hint">Miles de pedidos entregados con una sonrisa</p>
        </div>
        <div className="testi-grid">
          {TESTIMONIALS.map((t) => (
            <article key={t.name} className="testi-card">
              <div className="testi-stars">★★★★★</div>
              <p className="testi-text">{t.text}</p>
              <div className="testi-who">
                <span className="testi-avatar">{t.name.charAt(0)}</span>
                <div>
                  <strong>{t.name}</strong>
                  <small>{t.place}</small>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="pay-info" id="pago" data-reveal>
        <div className="pay-info-head">
          <h2 className="section-title">¿Cómo puedes pagar?</h2>
          <p className="hint">Elige el método que te quede más cómodo al finalizar tu pedido</p>
        </div>

        <div className="pay-info-grid">
          <article className="pay-info-card">
            <span className="pic-icon">💵</span>
            <h3>Efectivo al recibir</h3>
            <p>Pagas cuando el repartidor te entrega el pedido en la puerta. No se cobra nada por adelantado.</p>
            <ul>
              <li>Indicas con cuánto pagas y te devolvemos el cambio</li>
              <li>No necesitas tarjeta ni datos bancarios</li>
              <li>Ideal si prefieres revisar el pedido primero</li>
            </ul>
            <span className="pic-tag pic-tag-cash">Sin datos bancarios</span>
          </article>

          <article className="pay-info-card">
            <span className="pic-icon">💳</span>
            <h3>Tarjeta (débito o crédito)</h3>
            <p>Simulas el pago al confirmar el pedido: se aprueba al instante y el estado pasa a “Pagado”.</p>
            <ul>
              <li>Escribes número, titular, vencimiento y CVV</li>
              <li>Validamos los datos antes de aceptar el pedido</li>
              <li>Entorno de prueba: <code>4242 4242 4242 4242</code></li>
            </ul>
            <span className="pic-tag pic-tag-card">Aprobación inmediata</span>
          </article>

          <article className="pay-info-card pay-info-steps">
            <span className="pic-icon">🧭</span>
            <h3>Así es el proceso</h3>
            <ol className="mini-steps">
              <li><b>1</b><span>Armas tu carrito y eliges la dirección</span></li>
              <li><b>2</b><span>Escoges efectivo o tarjeta</span></li>
              <li><b>3</b><span>Confirmas y sigues el pedido en vivo</span></li>
              <li><b>4</b><span>El repartidor te entrega 🛵</span></li>
            </ol>
          </article>
        </div>
      </section>

      {quickView && (
        <QuickView
          product={quickView}
          adding={adding === quickView.id}
          onAdd={(qty) => addToCart(quickView, qty)}
          onClose={() => setQuickView(null)}
        />
      )}

      {customOpen && <CustomOrderModal onClose={() => setCustomOpen(false)} />}
    </div>
  );
}
