import { STATUS_LABELS } from '../utils/orders';

export default function StatusBadge({ status, label }) {
  return (
    <span className={`badge badge-${status}`}>
      {label || STATUS_LABELS[status] || status}
    </span>
  );
}
