"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Star, ThumbsUp, MessageSquare } from "lucide-react";

const REVIEWS = [
  { id: 1, guest: "James Whitmore", nationality: "🇺🇸 American", suite: "Royal Heritage Suite", date: "May 2026", rating: 5, title: "Absolute perfection in Bali", body: "Every detail was meticulously curated. The morning mist over the jungle from our terrace was an experience I will carry for the rest of my life. The butler service is unmatched.", helpful: 12, replied: true },
  { id: 2, guest: "Yuki Tanaka", nationality: "🇯🇵 Japanese", suite: "Sacred Lotus Pavilion", date: "Apr 2026", rating: 5, title: "A sanctuary for the soul", body: "The spa treatments were deeply authentic. I felt genuine Balinese healing energy throughout the entire stay. Coming back for a longer retreat next year.", helpful: 8, replied: false },
  { id: 3, guest: "Maria Santos", nationality: "🇧🇷 Brazilian", suite: "Jungle Horizon Villa", date: "Apr 2026", rating: 4, title: "Stunning views, exceptional staff", body: "The views over the rice terraces are truly breathtaking. Minor note: WiFi could be stronger in the outdoor pavilion, but this is a minor quibble in an otherwise flawless stay.", helpful: 5, replied: true },
  { id: 4, guest: "Ravi Mehta", nationality: "🇮🇳 Indian", suite: "Royal Heritage Suite", date: "Mar 2026", rating: 5, title: "Arka Villa redefined luxury for us", body: "We celebrated our anniversary here. The team arranged a private candlelit dinner by the pool with flower arrangements — completely beyond our expectations. Thank you.", helpful: 19, replied: true },
  { id: 5, guest: "Chloe Dupont", nationality: "🇫🇷 French", suite: "Jungle Horizon Villa", date: "Mar 2026", rating: 4, title: "Magnifique — but room for small improvements", body: "The architecture and landscape design are extraordinary. Would love a slightly more extensive wine cellar selection. Otherwise, a near-perfect experience in every dimension.", helpful: 7, replied: false },
];

const AVG = (REVIEWS.reduce((s, r) => s + r.rating, 0) / REVIEWS.length).toFixed(1);

export default function ReviewsPanel() {
  const [filter, setFilter] = useState(0); // 0 = All

  const filtered = filter === 0 ? REVIEWS : REVIEWS.filter((r) => r.rating === filter);

  return (
    <div className="space-y-6">
      {/* Summary Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/3 border border-white/5 p-6 md:col-span-1">
          <p className="text-white/30 text-[10px] uppercase tracking-widest mb-2">Overall Rating</p>
          <p className="text-heritage-gold font-serif text-5xl">{AVG}</p>
          <div className="flex gap-0.5 mt-3">
            {[1,2,3,4,5].map((s) => <Star key={s} size={14} className={Number(AVG) >= s ? "text-heritage-gold fill-heritage-gold" : "text-white/10"} />)}
          </div>
          <p className="text-white/20 text-xs mt-2">{REVIEWS.length} reviews</p>
        </div>
        <div className="bg-white/3 border border-white/5 p-6 col-span-1 md:col-span-3">
          <p className="text-white/30 text-[10px] uppercase tracking-widest mb-4">Rating Distribution</p>
          <div className="space-y-2.5">
            {[5,4,3,2,1].map((star) => {
              const count = REVIEWS.filter((r) => r.rating === star).length;
              const pct = (count / REVIEWS.length) * 100;
              return (
                <button key={star} onClick={() => setFilter(filter === star ? 0 : star)} className="flex items-center gap-3 w-full group">
                  <span className="text-white/40 text-xs w-6 text-right">{star}★</span>
                  <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                    <motion.div className="h-full bg-heritage-gold rounded-full" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.7 }} />
                  </div>
                  <span className="text-white/30 text-xs w-4">{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Platform Ratings */}
      <div className="grid grid-cols-3 gap-4">
        {[["Airbnb", "4.97", "★★★★★"], ["Booking.com", "9.6", "Exceptional"], ["Google", "4.9", "★★★★★"]].map(([p, score, label]) => (
          <div key={p as string} className="bg-white/3 border border-white/5 p-4 text-center">
            <p className="text-white/30 text-[10px] uppercase tracking-widest mb-2">{p}</p>
            <p className="text-heritage-gold font-serif text-2xl">{score}</p>
            <p className="text-white/20 text-[10px] mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-serif text-lg">Guest Reviews {filter > 0 && <span className="text-heritage-gold text-sm">· {filter}★ only</span>}</h3>
          {filter > 0 && <button onClick={() => setFilter(0)} className="text-xs text-white/30 hover:text-white underline">Clear filter</button>}
        </div>
        {filtered.map((r, i) => (
          <motion.div key={r.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            className="bg-white/3 border border-white/5 p-6">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-8 h-8 rounded-full bg-heritage-gold/20 flex items-center justify-center text-heritage-gold text-sm font-serif">{r.guest.charAt(0)}</div>
                  <div>
                    <p className="text-white text-sm font-medium">{r.guest}</p>
                    <p className="text-white/30 text-[10px]">{r.nationality} · {r.suite} · {r.date}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {[1,2,3,4,5].map((s) => <Star key={s} size={13} className={r.rating >= s ? "text-heritage-gold fill-heritage-gold" : "text-white/10"} />)}
              </div>
            </div>
            <h4 className="text-white text-sm font-medium mb-2">"{r.title}"</h4>
            <p className="text-white/50 text-sm font-light leading-relaxed mb-4">{r.body}</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-white/20 text-xs">
                <ThumbsUp size={12} /><span>{r.helpful} found helpful</span>
              </div>
              {r.replied ? (
                <span className="flex items-center gap-1.5 text-emerald-400 text-[10px] uppercase tracking-widest"><MessageSquare size={11} />Replied</span>
              ) : (
                <button className="text-heritage-gold text-[10px] uppercase tracking-widest hover:text-white transition-colors border border-heritage-gold/30 px-3 py-1.5 hover:border-white/40">Reply</button>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
