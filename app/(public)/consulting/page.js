export default function Consulting() {
  return (
    <div className="page">
      <h1>Project Review & Independent Consulting</h1>

      <p>
        Independent second opinions for construction/remodel projects, documentation,
        workflows, and plans already in motion. When clarity and follow-through
        matter, I'm your guy.
      </p>

      <div className="cta-row" style={{ justifyContent: "flex-start" }}>
        <a className="cta" href="sms:+19188846615">
          Text Jon to discuss a review
        </a>
        <a className="cta secondary" href="/contact">
          Prefer not to text? Use the form
        </a>
      </div>

      <p className="small">
        I also take this kind of work through platforms like Upwork, but you can
        contact me directly here.
      </p>

      <h2>Common reasons clients reach out</h2>
      <ul>
        <li>Something feels off but isn’t obvious</li>
        <li>Documentation, scope, or handoffs feel fragile</li>
        <li>They want fewer surprises before committing money or time</li>
        <li>Work has grown organically without clear structure</li>
      </ul>

      <h2>What I review</h2>
      <ul>
        <li>Construction scopes, bids, and proposals</li>
        <li>Project documentation, SOPs, and workflows</li>
        <li>Plans, reports, and decision-critical materials</li>
      </ul>

      <h2>From messy inputs to clear outputs</h2>
      <p>
        I can take messy files, notes, screenshots, receipts, and partial
        documents and turn them into organized summaries, reports, and
        decision-ready plans. I deliver clear, documented and defensible next steps.
      </p>

      <h2>How this is different</h2>
      <ul>
        <li>Grounded in real-world execution, not buzzwords</li>
        <li>Practical clarity that reduces rework and surprises</li>
        <li>Direct communication and clear deliverables</li>
      </ul>

      <h2>Some samples of what I can work with and deliver</h2>
      <div className="gallery">
        <div className="tile">
          <div className="media">
            <img
              src="/images/document-review.jpg"
              alt="Document and scope review"
            />
          </div>
          <div className="caption">Document and scope review</div>
        </div>

        <div className="tile">
          <div className="media">
            <img
              src="/images/process-memo.jpg"
              alt="Process findings memo"
            />
          </div>
          <div className="caption">Findings memo / gap analysis</div>
        </div>

        <div className="tile">
          <div className="media">
            <img
              src="/images/project-plan.jpg"
              alt="Project plan and action list"
            />
          </div>
          <div className="caption">Project plan & action list</div>
        </div>
      </div>

      <div className="callout">
        <p style={{ margin: 0 }}>
          <strong>Best first message:</strong> what you’re trying to decide +
          what you have (notes/docs/photos/receipts) + timeline. I’ll listen to you, tell you
          what’s feasible and what a useful deliverable looks like.
        </p>
      </div>
    </div>
  );
}
export const metadata = {
  title: "Project Review & Independent Consulting | Tulsa",
  description:
    "Second-opinion project review, documentation QA, and clarity from messy inputs to decision-ready outputs."
};
