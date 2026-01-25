'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

export default function ServiceCard({ title, description, href, icon, delay = 0 }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.5 }}
            viewport={{ once: true }}
            className="group relative bg-white p-8 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden"
        >
            <div className="absolute top-0 left-0 w-1 h-full bg-[var(--primary)] transform scale-y-0 group-hover:scale-y-100 transition-transform origin-top duration-300" />

            <div className="mb-6 text-[var(--primary)] bg-[var(--primary)]/10 w-12 h-12 rounded-lg flex items-center justify-center group-hover:bg-[var(--primary)] group-hover:text-white transition-colors">
                {icon}
            </div>

            <h3 className="text-xl font-bold mb-3 text-[var(--primary-dark)]">{title}</h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
                {description}
            </p>

            <Link href={href} className="inline-flex items-center text-[var(--primary)] font-semibold group-hover:gap-2 transition-all">
                Learn more <ArrowRight size={16} className="ml-1" />
            </Link>
        </motion.div>
    );
}
