"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { Check, ChevronRight, Calendar, Users, BedDouble, MessageSquare } from "lucide-react";

const ROOMS = [
  {
    id: "royal-heritage-suite",
    name: "Royal Heritage Suite",
    price: 1200,
    image: "https://images.unsplash.com/photo-1618221941000-0a47fcca15ae?w=600&q=80",
  },
  {
    id: "jungle-horizon-villa",
    name: "Jungle Horizon Villa",
    price: 950,
    image: "https://images.unsplash.com/photo-1540541338287-41700207dee6?w=600&q=80",
  },
  {
    id: "sacred-lotus-pavilion",
    name: "Sacred Lotus Pavilion",
    price: 750,
    image: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=600&q=80",
  },
];

const STEPS = [
  { id: 1, label: "Suite", icon: BedDouble },
  { id: 2, label: "Dates", icon: Calendar },
  { id: 3, label: "Guests", icon: Users },
  { id: 4, label: "Confirm", icon: Check },
];

type BookingData = {
  roomId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  specialRequests: string;
};

const initialData: BookingData = {
  roomId: "",
  checkIn: "",
  checkOut: "",
  guests: 2,
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  specialRequests: "",
};

export default function BookingEngine() {
  const searchParams = useSearchParams();
  const initialRoom = searchParams.get("room") || "";
  const [step, setStep] = useState(initialRoom ? 2 : 1);
  const [data, setData] = useState<BookingData>({ ...initialData, roomId: initialRoom });
  const [submitted, setSubmitted] = useState(false);

  const selectedRoom = ROOMS.find((r) => r.id === data.roomId);
  const nights =
    data.checkIn && data.checkOut
      ? Math.max(
          0,
          Math.round(
            (new Date(data.checkOut).getTime() - new Date(data.checkIn).getTime()) / 86400000
          )
        )
      : 0;
  const total = selectedRoom ? selectedRoom.price * Math.max(nights, 1) : 0;

  const next = () => setStep((s) => Math.min(s + 1, 4));
  const back = () => setStep((s) => Math.max(s - 1, 1));

  if (submitted) {
    return (
      <section className="min-h-screen flex items-center justify-center px-6 pt-32 pb-24">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-lg"
        >
          <div className="w-20 h-20 bg-heritage-gold rounded-full flex items-center justify-center mx-auto mb-8">
            <Check size={36} className="text-heritage-charcoal" />
          </div>
          <h2 className="text-4xl font-serif text-white mb-4">Request Received</h2>
          <p className="text-white/50 font-light mb-6">
            Our concierge team will confirm your reservation for{" "}
            <span className="text-heritage-gold">{selectedRoom?.name}</span> within 2 hours via email
            and WhatsApp.
          </p>
          <p className="text-heritage-gold text-xs uppercase tracking-widest">
            Confirmation will be sent to {data.email}
          </p>
        </motion.div>
      </section>
    );
  }

  return (
    <section className="min-h-screen px-6 pt-32 pb-24">
      <div className="max-w-5xl mx-auto">
        {/* Page Title */}
        <div className="text-center mb-16">
          <p className="text-heritage-gold uppercase tracking-[0.35em] text-xs font-bold mb-3">
            Bespoke Reservation
          </p>
          <h1 className="text-5xl font-serif text-white">Reserve Your Sanctuary</h1>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-0 mb-16">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isComplete = step > s.id;
            const isActive = step === s.id;
            return (
              <div key={s.id} className="flex items-center">
                <div
                  className={`flex flex-col items-center gap-2 cursor-pointer ${
                    isActive ? "" : "opacity-50"
                  }`}
                  onClick={() => step > s.id && setStep(s.id)}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                      isComplete
                        ? "bg-heritage-gold border-heritage-gold"
                        : isActive
                        ? "border-heritage-gold bg-transparent"
                        : "border-white/20 bg-transparent"
                    }`}
                  >
                    {isComplete ? (
                      <Check size={16} className="text-heritage-charcoal" />
                    ) : (
                      <Icon size={16} className={isActive ? "text-heritage-gold" : "text-white/40"} />
                    )}
                  </div>
                  <span
                    className={`text-[10px] uppercase tracking-widest ${
                      isActive ? "text-heritage-gold" : "text-white/30"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`w-16 md:w-28 h-px mx-2 mb-6 transition-colors duration-300 ${
                      step > s.id ? "bg-heritage-gold" : "bg-white/10"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="md:col-span-2">
            <AnimatePresence mode="wait">
              {/* STEP 1: Choose Suite */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <h3 className="text-2xl font-serif text-white mb-8">Choose Your Suite</h3>
                  <div className="space-y-4">
                    {ROOMS.map((room) => (
                      <div
                        key={room.id}
                        onClick={() => setData((d) => ({ ...d, roomId: room.id }))}
                        className={`flex gap-5 p-5 border cursor-pointer transition-all duration-300 ${
                          data.roomId === room.id
                            ? "border-heritage-gold bg-heritage-gold/5"
                            : "border-white/10 hover:border-white/30 bg-white/3"
                        }`}
                      >
                        <div
                          className="w-24 h-20 flex-shrink-0"
                          style={{
                            backgroundImage: `url('${room.image}')`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                          }}
                        />
                        <div className="flex-1">
                          <h4 className="text-white font-serif text-lg mb-1">{room.name}</h4>
                          <p className="text-heritage-gold text-sm font-light">
                            From ${room.price} / night
                          </p>
                        </div>
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1 transition-colors ${
                            data.roomId === room.id ? "border-heritage-gold bg-heritage-gold" : "border-white/20"
                          }`}
                        >
                          {data.roomId === room.id && <Check size={10} className="text-heritage-charcoal" />}
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={next}
                    disabled={!data.roomId}
                    className="mt-8 w-full bg-heritage-gold text-heritage-charcoal py-4 uppercase tracking-widest text-sm font-bold hover:bg-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Continue — Select Dates
                  </button>
                </motion.div>
              )}

              {/* STEP 2: Dates */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <h3 className="text-2xl font-serif text-white mb-8">Select Your Dates</h3>
                  <div className="grid grid-cols-2 gap-5 mb-8">
                    <div>
                      <label className="text-white/40 text-xs uppercase tracking-widest block mb-3">
                        Check-In
                      </label>
                      <input
                        type="date"
                        value={data.checkIn}
                        onChange={(e) => setData((d) => ({ ...d, checkIn: e.target.value }))}
                        min={new Date().toISOString().split("T")[0]}
                        className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 focus:outline-none focus:border-heritage-gold transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-white/40 text-xs uppercase tracking-widest block mb-3">
                        Check-Out
                      </label>
                      <input
                        type="date"
                        value={data.checkOut}
                        onChange={(e) => setData((d) => ({ ...d, checkOut: e.target.value }))}
                        min={data.checkIn || new Date().toISOString().split("T")[0]}
                        className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 focus:outline-none focus:border-heritage-gold transition-colors"
                      />
                    </div>
                  </div>
                  {nights > 0 && (
                    <div className="bg-heritage-gold/10 border border-heritage-gold/30 px-5 py-4 mb-8">
                      <p className="text-heritage-gold text-sm font-light">
                        {nights} night{nights > 1 ? "s" : ""} selected
                      </p>
                    </div>
                  )}
                  <div className="flex gap-4">
                    <button onClick={back} className="flex-1 border border-white/20 text-white/50 py-4 text-sm uppercase tracking-widest hover:border-white/50 transition-colors">
                      Back
                    </button>
                    <button
                      onClick={next}
                      disabled={!data.checkIn || !data.checkOut}
                      className="flex-1 bg-heritage-gold text-heritage-charcoal py-4 uppercase tracking-widest text-sm font-bold hover:bg-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      Continue
                    </button>
                  </div>
                </motion.div>
              )}

              {/* STEP 3: Guest Details */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <h3 className="text-2xl font-serif text-white mb-8">Your Details</h3>
                  <div className="space-y-5 mb-8">
                    <div className="grid grid-cols-2 gap-5">
                      <div>
                        <label className="text-white/40 text-xs uppercase tracking-widest block mb-3">First Name</label>
                        <input
                          type="text"
                          value={data.firstName}
                          onChange={(e) => setData((d) => ({ ...d, firstName: e.target.value }))}
                          placeholder="Aria"
                          className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 placeholder:text-white/20 focus:outline-none focus:border-heritage-gold transition-colors"
                        />
                      </div>
                      <div>
                        <label className="text-white/40 text-xs uppercase tracking-widest block mb-3">Last Name</label>
                        <input
                          type="text"
                          value={data.lastName}
                          onChange={(e) => setData((d) => ({ ...d, lastName: e.target.value }))}
                          placeholder="Santoso"
                          className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 placeholder:text-white/20 focus:outline-none focus:border-heritage-gold transition-colors"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-white/40 text-xs uppercase tracking-widest block mb-3">Email</label>
                      <input
                        type="email"
                        value={data.email}
                        onChange={(e) => setData((d) => ({ ...d, email: e.target.value }))}
                        placeholder="aria@example.com"
                        className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 placeholder:text-white/20 focus:outline-none focus:border-heritage-gold transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-white/40 text-xs uppercase tracking-widest block mb-3">WhatsApp / Phone</label>
                      <input
                        type="tel"
                        value={data.phone}
                        onChange={(e) => setData((d) => ({ ...d, phone: e.target.value }))}
                        placeholder="+62 812 3456 7890"
                        className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 placeholder:text-white/20 focus:outline-none focus:border-heritage-gold transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-white/40 text-xs uppercase tracking-widest block mb-3">
                        Number of Guests
                      </label>
                      <div className="flex items-center gap-4">
                        {[1, 2, 3, 4].map((n) => (
                          <button
                            key={n}
                            onClick={() => setData((d) => ({ ...d, guests: n }))}
                            className={`w-10 h-10 border text-sm transition-all duration-200 ${
                              data.guests === n
                                ? "border-heritage-gold bg-heritage-gold text-heritage-charcoal font-bold"
                                : "border-white/20 text-white/40 hover:border-white/50"
                            }`}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-white/40 text-xs uppercase tracking-widest block mb-3">
                        Special Requests (Optional)
                      </label>
                      <textarea
                        value={data.specialRequests}
                        onChange={(e) => setData((d) => ({ ...d, specialRequests: e.target.value }))}
                        rows={3}
                        placeholder="Celebration arrangements, dietary needs, mobility requirements..."
                        className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 placeholder:text-white/20 focus:outline-none focus:border-heritage-gold transition-colors resize-none"
                      />
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <button onClick={back} className="flex-1 border border-white/20 text-white/50 py-4 text-sm uppercase tracking-widest hover:border-white/50 transition-colors">
                      Back
                    </button>
                    <button
                      onClick={next}
                      disabled={!data.firstName || !data.email}
                      className="flex-1 bg-heritage-gold text-heritage-charcoal py-4 uppercase tracking-widest text-sm font-bold hover:bg-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      Review Booking
                    </button>
                  </div>
                </motion.div>
              )}

              {/* STEP 4: Confirm */}
              {step === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <h3 className="text-2xl font-serif text-white mb-8">Review & Confirm</h3>
                  <div className="border border-white/10 p-6 space-y-5 mb-8">
                    <Row label="Suite" value={selectedRoom?.name || ""} />
                    <Row label="Check-In" value={data.checkIn} />
                    <Row label="Check-Out" value={data.checkOut} />
                    <Row label="Guests" value={`${data.guests} guest${data.guests > 1 ? "s" : ""}`} />
                    <Row label="Guest Name" value={`${data.firstName} ${data.lastName}`} />
                    <Row label="Email" value={data.email} />
                    {data.phone && <Row label="Phone" value={data.phone} />}
                    {data.specialRequests && (
                      <Row label="Requests" value={data.specialRequests} />
                    )}
                    <div className="border-t border-white/10 pt-5">
                      <div className="flex justify-between">
                        <span className="text-white/40 text-xs uppercase tracking-widest">
                          Estimated Total ({nights} night{nights > 1 ? "s" : ""})
                        </span>
                        <span className="text-heritage-gold text-lg font-serif">
                          ${total.toLocaleString()}
                        </span>
                      </div>
                      <p className="text-white/30 text-xs mt-2">
                        * Final price confirmed by concierge. No payment taken now.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <button onClick={back} className="flex-1 border border-white/20 text-white/50 py-4 text-sm uppercase tracking-widest hover:border-white/50 transition-colors">
                      Edit
                    </button>
                    <button
                      onClick={() => setSubmitted(true)}
                      className="flex-1 bg-heritage-gold text-heritage-charcoal py-4 uppercase tracking-widest text-sm font-bold hover:bg-white transition-colors"
                    >
                      Submit Request
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sidebar Summary */}
          <div className="hidden md:block">
            <div className="sticky top-28 border border-white/10 p-6">
              <p className="text-white/30 text-[10px] uppercase tracking-widest mb-6">Booking Summary</p>
              {selectedRoom ? (
                <>
                  <div
                    className="h-36 mb-5 w-full"
                    style={{
                      backgroundImage: `url('${selectedRoom.image}')`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  />
                  <h4 className="text-white font-serif text-lg mb-1">{selectedRoom.name}</h4>
                  <p className="text-heritage-gold text-xs mb-5">${selectedRoom.price} / night</p>
                  {nights > 0 && (
                    <div className="text-white/40 text-xs space-y-2 border-t border-white/10 pt-5">
                      <div className="flex justify-between">
                        <span>Duration</span>
                        <span className="text-white">{nights} nights</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Guests</span>
                        <span className="text-white">{data.guests}</span>
                      </div>
                      <div className="flex justify-between border-t border-white/10 pt-3 mt-3">
                        <span className="uppercase tracking-wider">Est. Total</span>
                        <span className="text-heritage-gold font-serif text-base">${total.toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-white/20 text-sm font-light italic">Select a suite to see summary</p>
              )}

              <div className="mt-8 pt-6 border-t border-white/10">
                <p className="text-white/30 text-xs mb-3">Need assistance?</p>
                <a
                  href="https://wa.me/6281234567890"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-heritage-gold text-xs hover:text-white transition-colors"
                >
                  <MessageSquare size={14} />
                  WhatsApp Concierge
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-white/30 text-xs uppercase tracking-widest flex-shrink-0">{label}</span>
      <span className="text-white text-sm text-right">{value}</span>
    </div>
  );
}
