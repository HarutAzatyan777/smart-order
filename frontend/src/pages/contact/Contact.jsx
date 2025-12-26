import "./Contact.css";

export default function Contact() {
  return (
    <div className="contact-page">
      <div className="contact-shell">
        <section className="contact-hero">
          <p className="pill soft">Talk to Smart Order</p>
          <h1>Contact &amp; ordering</h1>
          <p className="contact-lead">
            Reach our team directly to book a demo, get pricing, or start your Smart Order setup. No long forms — just a quick conversation.
          </p>
          <div className="contact-actions">
            <a href="tel:+37496454503" className="btn primary">
              Call +374 96 454 503
            </a>
            <a href="https://wa.me/37496454503" target="_blank" rel="noreferrer" className="btn ghost">
              Chat on WhatsApp
            </a>
          </div>
          <div className="trust-row">
            <span>Free demo — no obligation</span>
            <span>Fast setup &amp; onboarding</span>
            <span>Designed for real restaurant workflows</span>
          </div>
        </section>

        <section className="contact-form-card">
          <div className="contact-form-header">
            <h3>Prefer we call you?</h3>
            <p>Share a couple quick details. We will reach out the same day to align on your menu and service flow.</p>
          </div>
          <form className="contact-form" onSubmit={(e) => e.preventDefault()}>
            <label>
              <span>Restaurant name</span>
              <input type="text" name="restaurantName" placeholder="ex: Blue Oak Bistro" />
            </label>
            <label>
              <span>City</span>
              <input type="text" name="city" placeholder="ex: Yerevan" />
            </label>
            <label>
              <span>Phone number (required)</span>
              <input type="tel" name="phone" placeholder="+374 96 454 503" required />
            </label>
            <label>
              <span>Optional message</span>
              <textarea name="message" rows="3" placeholder="What do you want to optimize first?"></textarea>
            </label>
          </form>
          <div className="contact-actions">
            <a href="tel:+37496454503" className="btn primary">
              Call to confirm
            </a>
            <a href="https://wa.me/37496454503" target="_blank" rel="noreferrer" className="btn ghost">
              Send via WhatsApp
            </a>
          </div>
          <p className="contact-note">We respond fast during service hours. Prefer SMS or Viber? Mention it in the message box.</p>
        </section>
      </div>
    </div>
  );
}
