import { useEffect, useState } from 'react';
import client, { apiError } from '../api/client';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import Loader from '../components/Loader';

const EMPTY = { label: 'Casa', line1: '', line2: '', city: '', postal_code: '', notes: '' };

export default function Profile() {
  const toast = useToast();
  const { user } = useAuth();
  const [profile, setProfile] = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [addresses, setAddresses] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);

  function load() {
    client
      .get('/addresses')
      .then((res) => setAddresses(res.data.data))
      .catch((err) => toast(apiError(err), 'error'))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function saveProfile(e) {
    e.preventDefault();
    try {
      await client.put('/users/me', profile);
      toast('Perfil actualizado', 'success');
    } catch (err) {
      toast(apiError(err), 'error');
    }
  }

  async function saveAddress(e) {
    e.preventDefault();
    try {
      await client.post('/addresses', { ...form, is_default: addresses.length === 0 });
      setForm(EMPTY);
      toast('Direccion agregada', 'success');
      load();
    } catch (err) {
      toast(apiError(err), 'error');
    }
  }

  async function removeAddress(id) {
    if (!window.confirm('¿Eliminar esta direccion?')) return;
    try {
      await client.delete(`/addresses/${id}`);
      toast('Direccion eliminada', 'info');
      load();
    } catch (err) {
      toast(apiError(err), 'error');
    }
  }

  async function setDefault(id) {
    const addr = addresses.find((a) => a.id === id);
    try {
      await client.put(`/addresses/${id}`, { ...addr, is_default: true });
      toast('Direccion principal actualizada', 'success');
      load();
    } catch (err) {
      toast(apiError(err), 'error');
    }
  }

  function set(field) {
    return (e) => setForm({ ...form, [field]: e.target.value });
  }

  if (loading) return <Loader />;

  return (
    <div className="profile-grid">
      <form className="card" onSubmit={saveProfile}>
        <h2>Mi perfil</h2>
        <label>
          Nombre
          <input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} required />
        </label>
        <label>
          Telefono
          <input value={profile.phone || ''} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
        </label>
        <button className="btn btn-primary">Guardar cambios</button>
      </form>

      <div className="card">
        <h2>Mis direcciones</h2>
        {addresses.map((a) => (
          <div key={a.id} className="address-row">
            <div>
              <strong>{a.label}</strong> {a.is_default && <span className="chip chip-active">Principal</span>}
              <p className="muted">{a.line1}{a.line2 ? `, ${a.line2}` : ''}, {a.city}</p>
            </div>
            <div className="address-actions">
              {!a.is_default && (
                <button className="btn btn-outline btn-sm" onClick={() => setDefault(a.id)}>Principal</button>
              )}
              <button className="btn btn-danger btn-sm" onClick={() => removeAddress(a.id)}>Eliminar</button>
            </div>
          </div>
        ))}

        <h3>Agregar direccion</h3>
        <form className="subform" onSubmit={saveAddress}>
          <input placeholder="Etiqueta" value={form.label} onChange={set('label')} required />
          <input placeholder="Direccion" value={form.line1} onChange={set('line1')} required />
          <input placeholder="Linea 2 (opcional)" value={form.line2} onChange={set('line2')} />
          <input placeholder="Ciudad" value={form.city} onChange={set('city')} required />
          <input placeholder="Codigo postal (opcional)" value={form.postal_code} onChange={set('postal_code')} />
          <button className="btn btn-primary btn-sm">Agregar</button>
        </form>
      </div>
    </div>
  );
}
