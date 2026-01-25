'use client';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

export default function Hero() {
    return (
        <section className="relative min-h-[85vh] flex items-center overflow-hidden bg-[var(--primary-dark)]">
            {/* Abstract Background */}
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,_var(--accent),_transparent_50%)]" />
            <div className="absolute inset-0 opacity-10 bg-[url('https://images.unsplash.com/photo-1600607686527-6fb886090705?q=80&w=2700&auto=format&fit=crop')] bg-cover bg-center mix-blend-overlay" />

            <div className="container relative z-10 text-white pt-20">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="max-w-3xl"
                >
                    <span className="text-[var(--accent)] font-semibold tracking-wider uppercase text-sm mb-4 block">
                        Tulsa & Green Country
                    </span>
                    <h1 className="text-5xl md:text-7xl mb-6 leading-tight text-white">
                        Precision in <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-300">
                            Every Project.
                        </span>
                    </h1>
                    <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-2xl leading-relaxed">
                        From aerial imaging to home repairs and project consulting.
                        We do the work correctly, safely, and without friction.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4">
                        <a href="sms:+19188846615" className="btn bg-[var(--accent)] text-[var(--primary-dark)] hover:bg-white">
                            Get a Fast Quote
                        </a>
                        <a href="/home-services" className="btn border border-white/30 hover:bg-white/10 text-white">
                            Explore Services <ArrowRight size={18} />
                        </a>
                    </div>
                </motion.div>
            </div>

            {/* Decorative Bottom Fade */}
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[var(--background)] to-transparent" />
        </section>
    );
}
