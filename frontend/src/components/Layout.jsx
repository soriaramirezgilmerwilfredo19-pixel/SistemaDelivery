import { useCallback, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useConfig } from '../context/ConfigContext';
import { todayHours, formatHM12, DAY_NAMES } from '../utils/schedule';
import client from '../api/client';
import NotificationBell from './NotificationBell';

function useRevealOnScroll() {
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') {
      document.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('is-visible'));
      return undefined;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );
    let frame = 0;
    const observeAll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        document
          .querySelectorAll('[data-reveal]:not(.is-visible)')
          .forEach((el) => io.observe(el));
      });
    };
    observeAll();
    const mo = new MutationObserver(observeAll);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      cancelAnimationFrame(frame);
      io.disconnect();
      mo.disconnect();
    };
  }, []);
}

function readTheme() {
  return localStorage.getItem('theme') || 'light';
}

export default function Layout() {
  const { user, logout, homeFor } = useAuth();
  const { est, status, appName, freeOver } = useConfig();
  const navigate = useNavigate();
  const [cartCount, setCartCount] = useState(0);
  const [theme, setTheme] = useState(readTheme);

  useRevealOnScroll();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  }, []);

  useEffect(() => {
    if (user?.role !== 'client') {
      setCartCount(0);
      return;
    }
    let cancelled = false;
    client
      .get('/cart')
      .then((res) => {
        if (!cancelled) setCartCount(res.data.data.items.length);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user]);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="app">
      <div className="topbar">
        <span className="topbar-item">🚚 Envío <strong>gratis</strong> desde S/ {freeOver.toFixed(2)}</span>
        <span className="topbar-sep">•</span>
        <span className="topbar-item">⚡ Entrega en <strong>25–45 min</strong></span>
        <span className="topbar-sep">•</span>
        <span className="topbar-item">⭐ 4.8 / 5 · +500 pedidos</span>
      </div>
      <header className="header">
        <Link to={user ? homeFor(user.role) : '/login'} className="logo">
          <span className="logo-icon">🛵</span>
          <span className="logo-text">
            Delivery<em>Puyo</em>
          </span>
        </Link>
        <nav className="nav">
          {user?.role === 'client' && (
            <>
              <NavLink to="/"><span className="nav-ico">🍔</span> Catálogo</NavLink>
              <NavLink to="/local"><span className="nav-ico">🏪</span> Nuestro local</NavLink>
              <NavLink to="/pedidos"><span className="nav-ico">🧾</span> Mis pedidos</NavLink>
              <NavLink to="/perfil"><span className="nav-ico">👤</span> Perfil</NavLink>
              <NavLink to="/carrito" className="cart-link">
                <span className="nav-ico">🛒</span> Carrito
                {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
              </NavLink>
            </>
          )}
          {user?.role === 'admin' && (
            <>
              <NavLink to="/admin"><span className="nav-ico">📊</span> Dashboard</NavLink>
              <NavLink to="/admin/pedidos"><span className="nav-ico">🧾</span> Pedidos</NavLink>
              <NavLink to="/admin/productos"><span className="nav-ico">🍽️</span> Productos</NavLink>
              <NavLink to="/admin/local"><span className="nav-ico">🕐</span> Local y horario</NavLink>
              <NavLink to="/admin/usuarios"><span className="nav-ico">👥</span> Usuarios</NavLink>
            </>
          )}
          {user?.role === 'courier' && (
            <NavLink to="/repartidor"><span className="nav-ico">🛵</span> Mis entregas</NavLink>
          )}
        </nav>
        <div className="header-right">
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label="Cambiar tema"
            title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          {user && <NotificationBell />}
          {user ? (
            <>
              <span className="user-chip">
                <span className="avatar">{user.name.charAt(0).toUpperCase()}</span>
                <span className="user-name">{user.name}</span>
              </span>
              <button className="btn btn-outline btn-sm" onClick={handleLogout}>
                Salir
              </button>
            </>
          ) : (
            <Link to="/login" className="btn btn-primary btn-sm">Ingresar</Link>
          )}
        </div>
      </header>
      <main className="main">
        <Outlet context={{ setCartCount }} />
      </main>
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-col footer-brand">
            <span className="logo logo-static">
              <span className="logo-icon">🛵</span>
              <span className="logo-text">
                Delivery<em>Puyo</em>
              </span>
            </span>
            <p>
              {est.banner || 'Tu comida favorita, a tu puerta. Seguimiento en tiempo real, descuentos y reseñas de cada plato.'}
            </p>
            <ul className="footer-contact">
              <li>📍 {est.city || 'Puyo, Pastaza'}</li>
              <li>📞 {est.phone}</li>
              <li>✉️ {est.email}</li>
            </ul>
            {status && (
              <div className={`footer-open ${status.open ? 'fo-open' : 'fo-closed'}`}>
                <span className="live-dot" />
                <div>
                  <strong>{status.title}</strong>
                  <small>{status.text}</small>
                </div>
              </div>
            )}
          </div>

          <div className="footer-col">
            <h4>Catálogo</h4>
            <ul>
              <li><Link to="/">Todos los productos</Link></li>
              <li><Link to="/local">Nuestro local y horario</Link></li>
              <li><Link to="/carrito">Mi carrito</Link></li>
              <li><Link to="/pedidos">Mis pedidos</Link></li>
              <li><Link to="/perfil">Mi cuenta</Link></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Ayuda</h4>
            <ul>
              <li><Link to="/pedidos">Seguir mi pedido</Link></li>
              <li><Link to="/perfil">Direcciones de entrega</Link></li>
              <li><Link to="/login">Iniciar sesión</Link></li>
              <li><Link to="/register">Crear cuenta</Link></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Medios de pago</h4>
            <div className="pay-badges">
              <span className="pay-badge">💵 Efectivo</span>
              <span className="pay-badge">💳 Débito</span>
              <span className="pay-badge">💳 Crédito</span>
            </div>
            <p className="footer-note">🔒 Cifrado SSL · Tus datos nunca se almacenan</p>
            <p className="footer-note">⚡ Envío gratis desde <strong>S/ {freeOver.toFixed(2)}</strong></p>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 {appName} · Proyecto Académico de Seguridad Informática</span>
          <span>Hecho con 🧡 en Puyo, Pastaza</span>
        </div>
      </footer>
    </div>
  );
}
