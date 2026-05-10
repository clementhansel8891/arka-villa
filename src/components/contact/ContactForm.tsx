"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Phone, Mail, Send, Check } from "lucide-react";

const CONTACT_DETAILS = [
  {
    icon: MapPin,
    label: "Address",
    value: "Jl. Raya Ubud No. 1, Ubud, Gianyar, Bali 80571, Indonesia",
  },
  {
    icon: Phone,
    label: "WhatsApp Concierge",
    value: "+62 812 3456 7890",
    href: "https://wa.me/6281234567890?text=Hello%2C%20I%27d%20like%20to%20enquire%20about%20Arka%20Villa.",
  },
  {
    icon: Mail,
    label: "Email",
    value: "concierge@arkavilla.com",
    href: "mailto:concierge@arkavilla.com",
  },
];

type FormData = {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
};

export default function ContactForm() {
  const [form, setForm] = useState<FormData>({
    name: "",
    email: "",
    phone: "",
    subject: "General Enquiry",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate async submission
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    setSubmitted(true);
  };

  const inputClass =
    "w-full bg-white/5 border border-white/10 text-white px-4 py-3.5 placeholder:text-white/20 focus:outline-none focus:border-heritage-gold transition-colors duration-200 text-sm";

  return (
    <section className="pt-32 pb-24 px-6 bg-heritage-charcoal min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-center mb-20"
        >
          <p className="text-heritage-gold uppercase tracking-[0.35em] text-xs font-bold mb-4">
            Get in Touch
          </p>
          <h1 className="text-5xl md:text-6xl font-serif text-white mb-6">
            Our Concierge Awaits
          </h1>
          <p className="text-white/40 font-light max-w-xl mx-auto leading-relaxed">
            Whether you are planning your first visit or a return to paradise, our team is available
            around the clock to curate your perfect stay.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-5 gap-12 items-start">
          {/* Contact Info Panel */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="md:col-span-2 space-y-8"
          >
            {/* Embedded Map Placeholder */}
            <div className="w-full h-56 relative overflow-hidden border border-white/10">
              <img
                src="https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=600&q=80"
                alt="Ubud, Bali location"
                className="w-full h-full object-cover opacity-60"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-heritage-gold text-heritage-charcoal px-4 py-2 text-xs uppercase tracking-widest font-bold flex items-center gap-2">
                  <MapPin size={12} />
                  Ubud, Bali
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-6">
              {CONTACT_DETAILS.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="flex gap-4">
                    <div className="w-10 h-10 border border-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon size={16} className="text-heritage-gold" />
                    </div>
                    <div>
                      <p className="text-white/30 text-[10px] uppercase tracking-widest mb-1">
                        {item.label}
                      </p>
                      {item.href ? (
                        <a
                          href={item.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-white/80 text-sm hover:text-heritage-gold transition-colors"
                        >
                          {item.value}
                        </a>
                      ) : (
                        <p className="text-white/80 text-sm">{item.value}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Availability badge */}
            <div className="border border-heritage-gold/20 bg-heritage-gold/5 p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-400 text-xs uppercase tracking-widest">
                  Concierge Online
                </span>
              </div>
              <p className="text-white/40 text-xs font-light">
                Average response time: <span className="text-white/60">under 2 hours</span>. WhatsApp
                preferred for urgent enquiries.
              </p>
            </div>
          </motion.div>

          {/* Form */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="md:col-span-3"
          >
            {submitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-24 text-center border border-white/10 px-8"
              >
                <div className="w-16 h-16 rounded-full bg-heritage-gold flex items-center justify-center mb-6">
                  <Check size={28} className="text-heritage-charcoal" />
                </div>
                <h3 className="text-3xl font-serif text-white mb-3">Message Received</h3>
                <p className="text-white/40 font-light max-w-sm mx-auto">
                  Thank you, <span className="text-heritage-gold">{form.name}</span>. Our concierge
                  will reach you at <span className="text-heritage-gold">{form.email}</span> within 2
                  hours.
                </p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="text-white/30 text-[10px] uppercase tracking-widest block mb-2.5">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Aria Santoso"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="text-white/30 text-[10px] uppercase tracking-widest block mb-2.5">
                      Email *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="aria@example.com"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="text-white/30 text-[10px] uppercase tracking-widest block mb-2.5">
                      Phone / WhatsApp
                    </label>
                    <input
                      type="tel"
                      placeholder="+62 812 3456 7890"
                      value={form.phone}
                      onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="text-white/30 text-[10px] uppercase tracking-widest block mb-2.5">
                      Subject
                    </label>
                    <select
                      value={form.subject}
                      onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                      className={`${inputClass} cursor-pointer`}
                    >
                      <option value="General Enquiry">General Enquiry</option>
                      <option value="Reservation Request">Reservation Request</option>
                      <option value="Special Occasion">Special Occasion</option>
                      <option value="Group Booking">Group Booking</option>
                      <option value="Corporate Event">Corporate Event</option>
                      <option value="Press / Media">Press / Media</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-white/30 text-[10px] uppercase tracking-widest block mb-2.5">
                    Message *
                  </label>
                  <textarea
                    required
                    rows={5}
                    placeholder="Tell us how we can curate your perfect Arka Villa experience..."
                    value={form.message}
                    onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                    className={`${inputClass} resize-none`}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-heritage-gold text-heritage-charcoal py-4 uppercase tracking-widest text-sm font-bold hover:bg-white transition-colors duration-300 flex items-center justify-center gap-3 disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-heritage-charcoal border-t-transparent rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send size={15} />
                      Send Message
                    </>
                  )}
                </button>

                <p className="text-white/20 text-xs text-center font-light">
                  By submitting, you agree to our privacy policy. We never share your data.
                </p>
              </form>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
