import { useEffect, useState } from 'react';
import client, { apiError } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { formatMoney } from '../../utils/orders';
import ProductImage from '../../components/ProductImage';
import Loader from '../../components/Loader';

const EMPTY = {
  name: '',
  description: '',
  price: '',
  discount: '0',
  badge: '',
  featured: false,
  category_id: '',
  image_url: '',
  available: true,
  stock: ''
};

export default function AdminProducts() {
  const toast = useToast();
  const [products, setProducts] = useState(null);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);

  function load() {
    Promise.all([client.get('/products'), client.get('/categories')])
      .then(([pRes, cRes]) => {
        setProducts(pRes.data.data);
        setCategories(cRes.data.data);
      })
      .catch((err) => toast(apiError(err), 'error'))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function set(field) {
    return (e) => setForm({ ...form, [field]: e.target.value });
  }

  function startEdit(p) {
    setEditingId(p.id);
    setForm({
      name: p.name,
      description: p.description || '',
      price: String(p.price),
      discount: String(p.discount || 0),
      badge: p.badge || '',
      featured: Boolean(p.featured),
      category_id: p.category_id || '',
      image_url: p.image_url || '',
      available: p.available,
      stock: p.stock === null || p.stock === undefined ? '' : String(p.stock)
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = {
      name: form.name,
      description: form.description,
      price: Number(form.price),
      discount: Number(form.discount) || 0,
      badge: form.badge || '',
      featured: form.featured === true || form.featured === 'true',
      category_id: form.category_id ? Number(form.category_id) : null,
      image_url: form.image_url || '',
      available: form.available === true || form.available === 'true',
      stock: form.stock === '' || form.stock === null ? null : Number(form.stock)
    };
    try {
      if (editingId) {
        await client.put(`/products/${editingId}`, payload);
        toast('Producto actualizado', 'success');
      } else {
        await client.post('/products', payload);
        toast('Producto creado', 'success');
      }
      cancelEdit();
      load();
    } catch (err) {
      toast(apiError(err), 'error');
    }
  }

  async function toggleAvailable(p) {
    try {
      await client.put(`/products/${p.id}`, {
        name: p.name,
        description: p.description || '',
        price: Number(p.price),
        discount: Number(p.discount) || 0,
        badge: p.badge || '',
        featured: Boolean(p.featured),
        category_id: p.category_id,
        image_url: p.image_url || '',
        available: !p.available,
        stock: p.stock === null || p.stock === undefined ? null : Number(p.stock)
      });
      toast(p.available ? 'Producto deshabilitado' : 'Producto habilitado', 'info');
      load();
    } catch (err) {
      toast(apiError(err), 'error');
    }
  }

  if (loading) return <Loader />;

  return (
    <div className="admin-split">
      <form className="card" onSubmit={handleSubmit}>
        <h3>{editingId ? `Editar producto #${editingId}` : 'Nuevo producto'}</h3>
        <label>
          Nombre
          <input value={form.name} onChange={set('name')} required />
        </label>
        <label>
          Descripcion
          <textarea rows={2} value={form.description} onChange={set('description')} />
        </label>
        <label>
          Precio
          <input type="number" step="0.01" min="0.01" value={form.price} onChange={set('price')} required />
        </label>
        <label>
          Descuento (%)
          <input type="number" step="1" min="0" max="90" value={form.discount} onChange={set('discount')} />
        </label>
        <label>
          Stock (vacío = ilimitado)
          <input type="number" step="1" min="0" value={form.stock} onChange={set('stock')} placeholder="Ej: 25" />
        </label>
        <label>
          Etiqueta visible (opcional)
          <input value={form.badge} onChange={set('badge')} placeholder="Ej: Popular, Nuevo, Promo" />
        </label>
        <label className="switch-line">
          <span>Destacar en el catalogo</span>
          <span className="switch">
            <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} />
            <span className="switch-slider" />
          </span>
        </label>
        <label>
          Categoria
          <select value={form.category_id} onChange={set('category_id')}>
            <option value="">Sin categoria</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
        <label>
          URL de imagen (opcional)
          <input value={form.image_url} onChange={set('image_url')} placeholder="https://..." />
        </label>
        <div className="form-actions">
          <button className="btn btn-primary">{editingId ? 'Guardar cambios' : 'Crear producto'}</button>
          {editingId && (
            <button type="button" className="btn btn-outline" onClick={cancelEdit}>
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div className="card table-wrap">
        <h3>Productos ({products?.length || 0})</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Categoria</th>
              <th>Precio</th>
              <th>Stock</th>
              <th>Etiqueta</th>
              <th>Disponible</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {products?.map((p) => (
              <tr key={p.id} className={p.available ? '' : 'row-disabled'}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ProductImage product={p} className="cart-thumb" />
                    {p.name}
                  </div>
                </td>
                <td>{p.category?.name || '—'}</td>
                <td>{formatMoney(p.price)}</td>
                <td>
                  {p.stock === null || p.stock === undefined ? (
                    <span className="muted">∞</span>
                  ) : p.stock <= 0 ? (
                    <span className="stock-tag stock-tag-out">Agotado</span>
                  ) : p.stock <= 5 ? (
                    <span className="stock-tag stock-tag-low">{p.stock}</span>
                  ) : (
                    p.stock
                  )}
                </td>
                <td>
                  {p.badge && <span className="img-badge static">{p.badge}</span>}
                  {p.featured && <span className="feat-dot">⭐</span>}
                </td>
                <td>{p.available ? 'Si' : 'No'}</td>
                <td className="table-actions">
                  <button className="btn btn-outline btn-sm" onClick={() => startEdit(p)}>Editar</button>
                  <button className="btn btn-danger btn-sm" onClick={() => toggleAvailable(p)}>
                    {p.available ? 'Deshabilitar' : 'Habilitar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
