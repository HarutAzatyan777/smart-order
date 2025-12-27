import { useState } from "react";
import "./FloatingContact.css";

function PhoneIcon() {
  return (
    <svg className="floating-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M2.75 5.5a2.25 2.25 0 0 1 2.25-2.25H7a2.25 2.25 0 0 1 2.25 2.25v2.5a1 1 0 0 1-.293.707L7.73 9.934a.75.75 0 0 0-.097.95 12.1 12.1 0 0 0 5.483 5.483.75.75 0 0 0 .95-.097l1.227-1.227a1 1 0 0 1 .707-.293H18.8A2.45 2.45 0 0 1 21.25 17.25v1.75A2.25 2.25 0 0 1 19 21.25H17c-8.56 0-14.25-5.69-14.25-14.25Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg className="floating-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M5 6.25A3.25 3.25 0 0 1 8.25 3h7.5A3.25 3.25 0 0 1 19 6.25v5.5A3.25 3.25 0 0 1 15.75 15H12l-3.5 3.5V15H8.25A3.25 3.25 0 0 1 5 11.75Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="9.5" cy="9.25" r="1" fill="currentColor" />
      <circle cx="12" cy="9.25" r="1" fill="currentColor" />
      <circle cx="14.5" cy="9.25" r="1" fill="currentColor" />
    </svg>
  );
}

export default function FloatingContact() {
  const [isOpen, setIsOpen] = useState(false);

  const togglePanel = () => setIsOpen((open) => !open);
  const closePanel = () => setIsOpen(false);

  return (
    <div className={`floating-contact${isOpen ? " is-open" : ""}`} aria-label="Contact Smart Order">
      {isOpen && (
        <div className="floating-panel" id="floating-contact-panel">
          <div className="floating-label">Need a demo?</div>
          <div className="floating-actions" role="group" aria-label="Contact options">
            <a
              className="floating-btn call"
              href="tel:+37496454503"
              aria-label="Call Smart Order at +374 96 454 503"
              title="Call Smart Order"
              onClick={closePanel}
            >
              <span className="floating-btn-icon">
                <PhoneIcon />
              </span>
              <span className="floating-btn-label">Call</span>
            </a>
            <a
              className="floating-btn whatsapp"
              href="https://wa.me/37496454503"
              target="_blank"
              rel="noreferrer"
              aria-label="Chat on WhatsApp"
              title="Chat on WhatsApp"
              onClick={closePanel}
            >
              <span className="floating-btn-icon">
                <ChatIcon />
              </span>
              <span className="floating-btn-label">WhatsApp</span>
            </a>
          </div>
        </div>
      )}

      <button
        type="button"
        className="floating-toggle"
        onClick={togglePanel}
        aria-expanded={isOpen}
        aria-controls="floating-contact-panel"
        title={isOpen ? "Hide contact options" : "Contact Smart Order"}
      >
        <span className="floating-btn-icon">
          <ChatIcon />
        </span>
        <span className="floating-btn-label">Contact</span>
      </button>
    </div>
  );
}
