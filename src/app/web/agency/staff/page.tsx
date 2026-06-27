"use client";

import StaffPanel from "@/components/dashboard/agency/StaffPanel";
import type { StaffMember } from "@/components/dashboard/agency/StaffPanel";

/**
 * Agency Staff Management Page — populated with mock data.
 */

const MOCK_STAFF: StaffMember[] = [
  { id: "s1", name: "Ketut Sastra", villaName: "Arka Villa", roles: ["front_desk", "management"], attendanceStatus: "present", tasksCompleted: 7, tasksTotal: 8, clockIn: "07:00", clockOut: undefined },
  { id: "s2", name: "Made Ariani", villaName: "Arka Villa", roles: ["housekeeping"], attendanceStatus: "present", tasksCompleted: 5, tasksTotal: 6, clockIn: "06:30", clockOut: undefined },
  { id: "s3", name: "Nyoman Wijaya", villaName: "Villa Serenity", roles: ["management"], attendanceStatus: "present", tasksCompleted: 4, tasksTotal: 4, clockIn: "08:00", clockOut: undefined },
  { id: "s4", name: "Wayan Sudarsana", villaName: "Villa Harmony", roles: ["front_desk"], attendanceStatus: "late", tasksCompleted: 3, tasksTotal: 5, clockIn: "09:15", clockOut: undefined },
  { id: "s5", name: "Kadek Rina", villaName: "Villa Tropicana", roles: ["housekeeping", "maintenance"], attendanceStatus: "present", tasksCompleted: 6, tasksTotal: 7, clockIn: "06:45", clockOut: undefined },
  { id: "s6", name: "Putu Agung", villaName: "Villa Coral", roles: ["maintenance"], attendanceStatus: "present", tasksCompleted: 8, tasksTotal: 8, clockIn: "07:30", clockOut: undefined },
  { id: "s7", name: "Gede Surya", villaName: "Villa Jade", roles: ["front_desk", "housekeeping"], attendanceStatus: "present", tasksCompleted: 4, tasksTotal: 6, clockIn: "07:00", clockOut: undefined },
  { id: "s8", name: "Komang Dewi", villaName: "Arka Villa", roles: ["housekeeping"], attendanceStatus: "absent", tasksCompleted: 0, tasksTotal: 5, clockIn: undefined, clockOut: undefined },
  { id: "s9", name: "Iluh Mertasari", villaName: "Villa Serenity", roles: ["housekeeping"], attendanceStatus: "present", tasksCompleted: 5, tasksTotal: 5, clockIn: "06:00", clockOut: undefined },
  { id: "s10", name: "Dewa Putra", villaName: "Villa Tropicana", roles: ["maintenance"], attendanceStatus: "present", tasksCompleted: 3, tasksTotal: 4, clockIn: "07:00", clockOut: undefined },
  { id: "s11", name: "Ni Luh Ayu", villaName: "Villa Coral", roles: ["front_desk"], attendanceStatus: "late", tasksCompleted: 2, tasksTotal: 4, clockIn: "08:45", clockOut: undefined },
  { id: "s12", name: "I Made Bagus", villaName: "Villa Harmony", roles: ["maintenance", "housekeeping"], attendanceStatus: "present", tasksCompleted: 6, tasksTotal: 6, clockIn: "06:30", clockOut: undefined },
  { id: "s13", name: "Wayan Ari", villaName: "Arka Villa", roles: ["management", "front_desk"], attendanceStatus: "present", tasksCompleted: 9, tasksTotal: 10, clockIn: "06:00", clockOut: undefined },
  { id: "s14", name: "Ketut Darma", villaName: "Villa Jade", roles: ["maintenance"], attendanceStatus: "absent", tasksCompleted: 0, tasksTotal: 3, clockIn: undefined, clockOut: undefined },
];

export default function AgencyStaffPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-serif text-white font-bold">
          Staff Management
        </h1>
        <p className="text-sm text-white/40 mt-1">
          Monitor employees, assignments, and attendance across all villas
        </p>
      </header>

      <StaffPanel staff={MOCK_STAFF} />
    </div>
  );
}
