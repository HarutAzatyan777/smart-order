import "./Privacy.css";

export default function Privacy() {
  return (
    <div className="privacy-page">
      <div className="privacy-container">
        <h1>Privacy Policy</h1>
        
        <section>
          <h2>Introduction</h2>
          <p>
            Welcome to Smart Order. We are committed to protecting your privacy and ensuring you 
            have a positive experience on our website and in our services.
          </p>
        </section>

        <section>
          <h2>Information We Collect</h2>
          <p>
            We collect information you voluntarily provide to us, such as your name, email address, 
            and any other information you submit through our website or services.
          </p>
        </section>

        <section>
          <h2>How We Use Your Information</h2>
          <p>
            We use the information we collect to:
          </p>
          <ul>
            <li>Provide and improve our services</li>
            <li>Communicate with you about your account and orders</li>
            <li>Analyze usage patterns and trends</li>
            <li>Personalize your experience</li>
          </ul>
        </section>

        <section>
          <h2>Cookies</h2>
          <p>
            We use cookies to enhance your experience on our website. Cookies are small files stored 
            on your device that help us remember your preferences and track your usage patterns.
          </p>
        </section>

        <section>
          <h2>Third-Party Services</h2>
          <p>
            We use Google Analytics and other third-party services to understand how you interact 
            with our platform. These services may collect information about your visits to our website.
          </p>
        </section>

        <section>
          <h2>Data Security</h2>
          <p>
            We implement appropriate security measures to protect your personal information from 
            unauthorized access, alteration, disclosure, or destruction.
          </p>
        </section>

        <section>
          <h2>Your Rights</h2>
          <p>
            You have the right to access, update, or delete your personal information. Please contact 
            us if you would like to exercise any of these rights.
          </p>
        </section>

        <section>
          <h2>Contact Us</h2>
          <p>
            If you have any questions about our privacy policy, please contact us through our contact page.
          </p>
        </section>

        <section className="privacy-last-updated">
          <p>Last updated: January 14, 2026</p>
        </section>
      </div>
    </div>
  );
}
