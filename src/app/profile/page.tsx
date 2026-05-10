"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import StaffProfile from "@/components/profile/StaffProfile";
import GuestProfile from "@/components/profile/GuestProfile";

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-heritage-charcoal flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-heritage-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const isStaff = user.role === "admin" || user.role === "staff";

  return (
    <main className="min-h-screen bg-heritage-charcoal">
      <Navbar />
      {isStaff ? <StaffProfile /> : <GuestProfile />}
      <Footer />
    </main>
  );
}
