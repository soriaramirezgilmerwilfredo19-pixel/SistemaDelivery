import { Navigate } from 'react-router-dom'
import { homeFor, useAuth } from '../context/AuthContext'
import Loader from './Loader'

export default function RequireRole({ roles, children }) {
  const { user, loading } = useAuth()

  if (loading) return <Loader label="Verificando sesión…" />

  if (!user) return <Navigate to="/login" replace />

  if (!roles.includes(user.role)) {
    return <Navigate to={homeFor(user.role)} replace />
  }

  return children
}
