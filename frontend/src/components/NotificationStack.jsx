import "./NotificationStack.css";

export default function NotificationStack({ notifications = [], onDismiss }) {
  if (!notifications.length) return null;

  return (
    <div className="notification-stack">
      {notifications.map((note) => (
        <div key={note.id} className={`toast ${note.tone || "info"}`}>
          <div className="toast-body">
            <p className="toast-title">
              {note.tone === "danger"
                ? "Attention"
                : note.tone === "success"
                ? "New order"
                : "Status update"}
            </p>
            <p className="toast-text">{note.message}</p>
          </div>
          <button
            className="toast-dismiss"
            aria-label="Dismiss notification"
            onClick={() => onDismiss?.(note.id)}
          >
            x
          </button>
        </div>
      ))}
    </div>
  );
}
