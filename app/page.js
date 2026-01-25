export default function Home() {
  return (
    <div className="page">
      <section className="hero center">
        <h1>Home Services, Aerial Imaging & Independent Project Review</h1>

        <p>
          Practical, experience-driven services for homeowners, builders, and
          organizations that need work done correctly, safely, and without
          unnecessary friction.
        </p>

        <div className="cta-row">
          <a className="cta" href="sms:+19188846615">
            Text Jon directly for a fast response
          </a>
          <a className="cta secondary" href="/contact">
            Prefer not to text? Use the form
          </a>
        </div>

        <p className="small" style={{ marginTop: "0.85rem" }}>
          You’ll be communicating with me, the owner and operator, not an AI
          chatbot or call center. Calls are welcome if needed, but texting 
          often ensures a quicker response.
        </p>

        <div className="badge-row" aria-label="Credibility highlights">
          <span className="badge">Based in Tulsa</span>
          <span className="badge">Serving Green Country and beyond</span>
          <span className="badge">Commercially licensed & insured</span>
        </div>
      </section>

      <h2>How I can help</h2>
           <div className="cards">
        <div className="card">
          <h3>Home Services, Repairs & Remodels</h3>
          <p>
            Quick-response fixes, ongoing maintenance, and complex residential
            problems that require careful diagnosis and execution.
          </p>
          <a href="/home-services">Learn more →</a>
        </div>

        <div className="card">
          <h3>Aerial Services</h3>
          <p>
            Professional drone operations for real estate, construction,
            industrial documentation, and data capture - with speed, reliability,
            and compliance.
          </p>
          <a href="/aerial-services">Learn more →</a>
        </div>

        <div className="card">
          <h3>Project Review & Consulting</h3>
          <p>
            Independent second opinions on scopes, plans, documentation, and
            work already in motion - including turning messy inputs into clear
            outputs.
          </p>
          <a href="/consulting">Learn more →</a>
        </div>
      </div>

      <div className="callout">
        <p style={{ margin: 0 }}>
          <strong>Fastest way to start:</strong> text a couple photos and a short
          description to{" "}
          <a className="link" href="sms:+19188846615">
            (918) 884-6615
          </a>
            , to talk to Jon directly.
        </p>
      </div>
    </div>
  );
}
export const metadata = {
  title: "Green Country Home Services & Consulting | Tulsa",
  description:
    "Home services, aerial imaging, and independent project review based in Tulsa, serving Green Country and beyond. Text for a fast response."
};
