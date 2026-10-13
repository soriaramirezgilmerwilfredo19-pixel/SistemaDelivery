import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiError } from '../api/client';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function set(field) {
    return (e) => setForm({ ...form, [field]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form);
      navigate('/');
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <aside className="auth-aside" data-reveal>
        <h2 className="section-title">Crea tu cuenta</h2>
        <p>En menos de un minuto puedes pedir, seguir tu entrega y calificar lo que comiste.</p>
        <ul className="auth-benefits">
          <li>
            <span>🛒</span>
            <div>
              <b>Carrito y pedidos guardados</b>
              <small>Tu historial y tus direcciones quedan siempre disponibles.</small>
            </div>
          </li>
          <li>
            <span>📍</span>
            <div>
              <b>Mapa en cada pedido</b>
              <small>Visualiza dónde está tu entrega con Google Maps integrado.</small>
            </div>
          </li>
          <li>
            <span>🔔</span>
            <div>
              <b>Avisos al instante</b>
              <small>Notificaciones en vivo sin recargar la página.</small>
            </div>
          </li>
        </ul>
      </aside>

      <form className="card auth-card" onSubmit={handleSubmit} data-reveal>
        <div className="auth-brand">
          <span className="logo logo-static">
            <span className="logo-icon">🛵</span>
            <span className="logo-text">
              Delivery<em>Puyo</em>
            </span>
          </span>
          <p>Regístrate para hacer tu primer pedido</p>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <label>
          Nombre
          <input value={form.name} onChange={set('name')} required minLength={2} placeholder="Tu nombre" />
        </label>
        <label>
          Email
          <input type="email" value={form.email} onChange={set('email')} required placeholder="tu@email.com" />
        </label>
        <label>
          Teléfono
          <input value={form.phone} onChange={set('phone')} placeholder="Opcional" />
        </label>
        <label>
          Contraseña (mínimo 6 caracteres)
          <input
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            value={form.password}
            onChange={set('password')}
            required
            minLength={6}
          />
        </label>
        <button className="btn btn-primary btn-block" disabled={loading}>
          {loading ? 'Creando cuenta...' : 'Registrarme'}
        </button>
        <p className="auth-alt">
          ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
        </p>
      </form>
    </div>
  );
}
