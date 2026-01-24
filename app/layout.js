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
          <div className="container nav">
            <div className="brand">
              Green Country Home Services & Consulting
            </div>
            <nav>
              <a href="/">Home</a>
              <a href="/aerial-services">Aerial Services</a>
              <a href="/home-services">Home Services</a>
              <a href="/consulting">Consulting</a>
              <a href="/contact">Contact</a>
            </nav>
          </div>
        </header>

        <main>{children}</main>

        <footer className="site-footer">
          <div className="container">
            <p>
              Based in Tulsa • Serving Green Country and beyond<br />
              © {new Date().getFullYear()} Green Country Home Services & Consulting
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
