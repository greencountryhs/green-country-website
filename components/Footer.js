export default function Footer() {
    return (
        <footer className="bg-[var(--primary-dark)] text-white py-12 mt-20">
            <div className="container grid md:grid-cols-3 gap-8 text-center md:text-left">
                <div>
                    <h3 className="text-white mb-4">Green Country</h3>
                    <p className="text-gray-300 text-sm max-w-xs mx-auto md:mx-0">
                        Professional home services, aerial imaging, and independent project review based in Tulsa.
                    </p>
                </div>

                <div>
                    <h4 className="text-lg font-semibold mb-4 text-[var(--accent)]">Services</h4>
                    <ul className="space-y-2 text-sm text-gray-300">
                        <li><a href="/home-services" className="hover:text-white">Home Services</a></li>
                        <li><a href="/aerial-services" className="hover:text-white">Aerial Imaging</a></li>
                        <li><a href="/consulting" className="hover:text-white">Project Consulting</a></li>
                    </ul>
                </div>

                <div>
                    <h4 className="text-lg font-semibold mb-4 text-[var(--accent)]">Contact</h4>
                    <p className="text-sm text-gray-300">
                        Tulsa, OK & Surrounding Areas<br />
                        <a href="sms:+19188846615" className="hover:text-white mt-2 inline-block">
                            (918) 884-6615
                        </a>
                    </p>
                </div>
            </div>

            <div className="container border-t border-gray-700 mt-12 pt-8 text-center text-xs text-gray-400">
                &copy; {new Date().getFullYear()} Green Country Home Services & Consulting. All rights reserved.
            </div>
        </footer>
    );
}
