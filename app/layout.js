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
        {children}
      </body>
    </html>
  );
}
