export default function Contact() {
  return (
    <div className="page">
      <h1>Get in touch</h1>

      <p>
        Fastest path is texting a couple details (and photos if relevant). You’ll
        be talking with me directly, not a bot or call center.
      </p>

      <div className="cta-row" style={{ justifyContent: "flex-start" }}>
        <a className="cta" href="sms:+19188846615">
          Text Jon for a fast response
        </a>
      </div>

      <h2>Prefer not to text? Use the form</h2>

      <p className="small">
        Location is recommended. For drone work, a nearest intersection or
        address helps me pre-check airspace and constraints.
      </p>

           <form
        className="card"
        action="https://formspree.io/f/xwvljeya"                         	method="post"
      >
        <label className="small">
          Name
          <br />
          <input
            name="name"
            type="text"
            style={{ width: "100%", padding: ".6rem", marginTop: ".35rem" }}
          />
        </label>

        <div style={{ height: ".8rem" }} />

        <label className="small">
          Best contact (email or phone)
          <br />
          <input
            name="contact"
            type="text"
            style={{ width: "100%", padding: ".6rem", marginTop: ".35rem" }}
          />
        </label>

        <div style={{ height: ".8rem" }} />

        <label className="small">
          Location (recommended)
          <br />
          <input
            name="location"
            type="text"
            placeholder="Neighborhood, city, or nearest intersection"
            style={{ width: "100%", padding: ".6rem", marginTop: ".35rem" }}
          />
        </label>

        <div style={{ height: ".8rem" }} />

        <label className="small">
          What do you need help with?
          <br />
          <textarea
            name="message"
            rows={6}
            style={{ width: "100%", padding: ".6rem", marginTop: ".35rem" }}
            placeholder="Aerial / Home services / Consulting / Custom Builds… include timing and any constraints."
          />
        </label>

        <div style={{ height: "1rem" }} />

        <button
          type="submit"
          className="cta"
          style={{ border: "none", cursor: "pointer" }}
        >
          Send message
        </button>

        <p className="small" style={{ marginTop: "0.75rem" }}>
          If you don’t want to use email, texting is usually faster:
          {" "}
          <a className="link" href="sms:+19188846615">
            (918) 884-6615
          </a>
          .
        </p>
      </form>

      <div className="callout">
        <p style={{ margin: 0 }}>
          <strong>Calling is OK if preferred</strong>, but most people get the best
          results by texting details/photos.
        </p>
      </div>
    </div>
  );
}
