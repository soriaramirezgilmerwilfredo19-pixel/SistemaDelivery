import { useCallback } from 'react';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import useOrderEvents from '../hooks/useOrderEvents';
import { STATUS_LABELS } from '../utils/orders';

export default function OrderEventBridge({ onEvent }) {
  const toast = useToast();
  const { user } = useAuth();

  const handle = useCallback(
    (data) => {
      if (!user) return;

      if (data.type === 'created' && user.role === 'admin') {
        toast(`Nuevo pedido #${data.orderId}`, 'success');
      } else if (data.type === 'assigned' && user.role === 'courier') {
        toast(`Te han asignado el pedido #${data.orderId}`, 'success');
      } else if (data.type === 'status_changed') {
        if (user.role === 'client' && data.userId === user.id) {
          toast(`Tu pedido #${data.orderId}: ${STATUS_LABELS[data.status] || data.status}`, 'info');
        } else if (user.role === 'admin') {
          toast(`Pedido #${data.orderId} → ${STATUS_LABELS[data.status] || data.status}`, 'info');
        }
      }

      onEvent?.(data);
    },
    [user, toast, onEvent]
  );

  useOrderEvents(handle);
  return null;
}
