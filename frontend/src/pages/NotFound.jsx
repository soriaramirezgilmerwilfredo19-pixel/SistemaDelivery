import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="empty-state">
      <h2>404 — Pagina no encontrada</h2>
      <Link to="/" className="btn btn-primary">Volver al inicio</Link>
    </div>
  );
}
