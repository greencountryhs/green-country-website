import "./globals.css";

export const metadata = {
  title: "Green Country Home Services & Consulting",
  description:
    "Home services, aerial imaging, and independent project review based in Tulsa, serving Green Country and beyond."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="shell">
            <div className="topbar">
              <div className="brand">
                Green Country Home Services & Consulting
              </div>

              <nav className="nav">
                <a href="/">Home</a>
                <a href="/aerial-services">Aerial Services</a>
                <a href="/home-services">Home Services</a>
                <a href="/consulting">Consulting</a>
                <a href="/contact">Contact</a>
              </nav>
            </div>
          </div>
        </header>

        <main>{children}</main>

        <footer className="site-footer">
          <div className="shell">
            <div className="footer-inner">
              <div>
                <div className="footer-title">
                  Green Country Home Services & Consulting
                </div>
                <div className="small">
                  Based in Tulsa • Serving Green Country and beyond
                </div>
              </div>

              <div className="footer-right small">
                Owner-operated by Jon • Text preferred:{" "}
                <a className="link" href="sms:+19188846615">
                  (918) 884-6615
                </a>
                <div className="small" style={{ marginTop: ".35rem", display: "flex", gap: "1rem" }}>
                  <span>© {new Date().getFullYear()}</span>
                  <a href="/login" style={{ color: "inherit", textDecoration: "none", opacity: 0.6 }}>Crew Login</a>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
