export default function HomeServices() {
  return (
    <div className="page">
      <h1>Home Services, Repairs & Remodels</h1>

      <p>
        Hands-on residential work ranging from quick-response fixes to medium
        repairs and larger remodels, including messy or recurring problems that
        need to be solved correctly the first time.
      </p>

      <div className="cta-row" style={{ justifyContent: "flex-start" }}>
        <a className="cta" href="sms:+19188846615">
          Text Jon directly to get started
        </a>
        <a className="cta secondary" href="/contact">
          Prefer not to text? Use the form
        </a>
      </div>

      <p className="small">
        Texting helps because photos + a short description usually get you a
        faster, clearer answer than a phone call, but calls are welcome if prefered.
      </p>

      <h2>Quick-turn services </h2>
      <ul>
        <li>Power washing</li>
        <li>Toilet replacement & fixture swaps/repair</li>
        <li>Gutter cleaning and minor repairs</li>
        <li>Eco-friendly mosquito control (low-impact yard comfort)</li>
        <li>Punch lists and turnover work</li>
      </ul>

      <p className="small">
        Some services may qualify for bundled or retainer pricing — ask if
        applicable.
      </p>

      <h2>Repairs, remodels & problem jobs</h2>
      <p>
        Medium repairs, partial remodels, water intrusion and drainage issues,
        recurring failures, and work that requires diagnosis, sequencing, and
        judgment - not guesswork.
      </p>

      <h2>Approach</h2>
      <ul>
        <li>Evaluations when useful </li>
        <li>Realistic estimates, not photo-based promises</li>
        <li>Focus on fixing the actual cause, not just symptoms</li>
      </ul>

      <h2>Custom design & fabrication</h2>
      <p>
        One-off, built-to-fit solutions when off-the-shelf options don’t work.
        Fabricated in-shop or on-site, focused on function and durability.
      </p>

      <h2>Recent Projects</h2>
      <p className="small">
              </p>

      <div className="gallery">
        <div className="tile">
          <div className="media">
            <img src="/images/remodel-detail.jpg" alt="Remodel and repair work" />
          </div>
          <div className="caption">Remodel and repair work</div>
        </div>

        <div className="tile">
          <div className="media">
            <img src="/images/powerwashing.jpg" alt="Power washing" />
          </div>
          <div className="caption">Power washing</div>
        </div>

        <div className="tile">
          <div className="media">
            <img src="/images/fabrication.jpg" alt="Custom fabrication" />
          </div>
          <div className="caption">Custom design & fabrication</div>
        </div>
      </div>

      <div className="callout">
        <p style={{ margin: 0 }}>
          <strong>Best first message:</strong> your area/nearest cross streets +
          a couple photos + what your project goals are. You’ll be texting Jon, not a
          bot.
        </p>
      </div>
    </div>
  );
}
