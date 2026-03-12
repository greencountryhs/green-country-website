import { Suspense } from "react";
import ContactForm from "./ContactForm";

export default function ContactPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ContactForm />
    </Suspense>
  );
}

export const metadata = {
  title: "Contact | Green Country Home Services & Consulting",
  description:
    "Text or message to get started. Based in Tulsa, serving Green Country."
};
