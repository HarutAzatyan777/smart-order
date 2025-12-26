import "./FloatingContact.css";

export default function FloatingContact() {
  return (
    <div className="floating-contact" aria-label="Contact Smart Order">
      <div className="floating-label">Need a demo?</div>
      <div className="floating-actions">
        <a className="floating-btn call" href="tel:+37496454503" aria-label="Call Smart Order at +374 96 454 503">
          Call
        </a>
        <a
          className="floating-btn whatsapp"
          href="https://wa.me/37496454503"
          target="_blank"
          rel="noreferrer"
          aria-label="Chat on WhatsApp"
        >
          WhatsApp
        </a>
      </div>
    </div>
  );
}
