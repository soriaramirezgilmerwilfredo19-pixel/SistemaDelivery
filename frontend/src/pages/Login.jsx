import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiError } from '../api/client';

export default function Login() {
  const { login, homeFor } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      navigate(homeFor(user.role));
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <aside className="auth-aside" data-reveal>
        <h2 className="section-title">Bienvenido de nuevo</h2>
        <p>Ingresa para ver tus pedidos en vivo, repetir compras anteriores y guardar tus direcciones.</p>
        <ul className="auth-benefits">
          <li>
            <span>🛵</span>
            <div>
              <b>Seguimiento en tiempo real</b>
              <small>Recibe avisos cuando confirman, preparan y salen con tu pedido.</small>
            </div>
          </li>
          <li>
            <span>💳</span>
            <div>
              <b>Paga como prefieras</b>
              <small>Efectivo al recibir o tarjeta con aprobación inmediata.</small>
            </div>
          </li>
          <li>
            <span>⭐</span>
            <div>
              <b>Reseñas y descuentos</b>
              <small>Califica lo que comiste y aprovecha ofertas de hasta -25%.</small>
            </div>
          </li>
        </ul>

        <div className="demo-accounts">
          <strong>Cuentas de prueba</strong>
          <p>Haz clic para rellenar el formulario:</p>
          <div className="demo-list">
            <button
              type="button"
              className="demo-btn"
              onClick={() => setForm({ email: 'cliente@delivery.test', password: 'Cliente123!' })}
            >
              🧑 Cliente
            </button>
            <button
              type="button"
              className="demo-btn"
              onClick={() => setForm({ email: 'repartidor@delivery.test', password: 'Repartidor123!' })}
            >
              🛵 Repartidor
            </button>
            <button
              type="button"
              className="demo-btn"
              onClick={() => setForm({ email: 'admin@delivery.test', password: 'Admin123!' })}
            >
              👑 Admin
            </button>
          </div>
        </div>
      </aside>

      <form className="card auth-card" onSubmit={handleSubmit} data-reveal>
        <div className="auth-brand">
          <span className="logo logo-static">
            <span className="logo-icon">🛵</span>
            <span className="logo-text">
              Delivery<em>Puyo</em>
            </span>
          </span>
          <p>Ingresa a tu cuenta para continuar</p>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <label>
          Email
          <input
            type="email"
            autoComplete="email"
            placeholder="tu@email.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
        </label>
        <label>
          Contraseña
          <input
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
        </label>
        <button className="btn btn-primary btn-block" disabled={loading}>
          {loading ? 'Ingresando...' : 'Ingresar'}
        </button>
        <p className="auth-alt">
          ¿No tienes cuenta? <Link to="/register">Regístrate aquí</Link>
        </p>
      </form>
    </div>
  );
}
