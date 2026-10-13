export default function ToastStack({ toasts }) {
  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span className="toast-icon">{t.type === 'error' ? '!' : t.type === 'info' ? 'i' : '✓'}</span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  )
}
