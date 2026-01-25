export default function Contact() {
  return (
    <div className="page">
      <h1>Get in touch</h1>
import { useSearchParams } from "next/navigation";

export default function Contact() {
  const params = useSearchParams();
  const sent = params.get("sent") === "1";

  return (
    <div className="page">
      <h1>Get in touch</h1>

      {sent && (
        <div className="callout" style={{ marginBottom: "1rem" }}>
          <p style={{ margin: 0 }}>
            <strong>Message sent.</strong> Thanks — I’ve received your note.
            If timing matters, texting photos/details to{" "}
            <a className="link" href="sms:+19188846615">
              (918) 884-6615
            </a>{" "}
            usually gets the fastest response.
          </p>
        </div>
      )}

      <p>
        Fastest path is texting a couple details (and photos if relevant). You’ll
        be talking with me directly, not a bot or call center. Serving Tulsa, Broken Arrow, Jenks, Bixby, Owasso, Green Country, and beyond.
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
}export const metadata = {
  title: "Contact | Green Country Home Services & Consulting",
  description:
    "Text or message to get started. Based in Tulsa, serving Green Country."
};

