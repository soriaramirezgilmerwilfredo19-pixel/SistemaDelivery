import { useEffect, useState } from 'react';
import client from '../../api/client';
import Loader from '../../components/Loader';

const ROLE_LABELS = { client: 'Cliente', courier: 'Repartidor', admin: 'Administrador' };

export default function AdminUsers() {
  const [users, setUsers] = useState(null);

  useEffect(() => {
    client.get('/admin/users').then((res) => setUsers(res.data.data));
  }, []);

  if (!users) return <Loader />;

  return (
    <div>
      <h2>Usuarios</h2>
      <div className="card table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Email</th>
              <th>Telefono</th>
              <th>Rol</th>
              <th>Registro</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{u.phone || '—'}</td>
                <td><span className={`badge badge-role-${u.role}`}>{ROLE_LABELS[u.role]}</span></td>
                <td>{new Date(u.created_at).toLocaleDateString('es-ES')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
