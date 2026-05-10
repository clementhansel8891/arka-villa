import Dashboard from "@/components/admin/Dashboard";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Dashboard | Arka Villa",
  description: "CEO-level analytics dashboard for Arka Villa villa operations.",
};

export default function AdminPage() {
  return <Dashboard />;
}
