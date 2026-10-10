// ============================================================
// Test Data — Sample event details for demonstrations and tests
// ============================================================

import type { EventDetails } from "@unidoc/shared";

export const sampleEventDetails: EventDetails = {
  title: "Bengkel AI untuk Pelajar Universiti",
  university: "upm",
  organiser: "Kelab AI UPM",
  objectives: [
    "Mendedahkan pelajar kepada aplikasi AI dalam akademik",
    "Membina kemahiran praktikal dalam penggunaan alat AI",
    "Menggalakkan inovasi dan kreativiti dalam pembelajaran",
  ],
  startDate: "2026-11-15",
  endDate: "2026-11-16",
  venue: "Dewan Seminar, Fakulti Sains Komputer dan Teknologi Maklumat, UPM",
  targetParticipants: 100,
  activities: [
    { time: "08:00 - 09:00", description: "Pendaftaran peserta dan minum pagi", facilitator: "Jawatankuasa Penganjur" },
    { time: "09:00 - 10:00", description: "Ucaptama: AI dalam Pendidikan", facilitator: "Prof. Dr. Ahmad" },
    { time: "10:00 - 12:00", description: "Sesi Amali: Pengenalan ChatGPT dan Prompt Engineering", facilitator: "Dr. Siti" },
    { time: "12:00 - 13:30", description: "Rehat dan makan tengah hari", facilitator: "-" },
    { time: "13:30 - 15:30", description: "Sesi Amali: Pembinaan Aplikasi AI Ringkas", facilitator: "En. Tan" },
    { time: "15:30 - 16:30", description: "Perbincangan panel dan sesi soal jawab", facilitator: "Panel jemputan" },
    { time: "16:30 - 17:00", description: "Penutup dan penyampaian sijil", facilitator: "Pengerusi" },
  ],
  budget: [
    { category: "Makanan", description: "Makan tengah hari (hari 1)", quantity: 100, unitPrice: 15 },
    { category: "Makanan", description: "Makan tengah hari (hari 2)", quantity: 100, unitPrice: 15 },
    { category: "Makanan", description: "Minum pagi dan petang (2 hari)", quantity: 200, unitPrice: 5 },
    { category: "Bahan Cetak", description: "Modul dan bahan kursus", quantity: 100, unitPrice: 10 },
    { category: "Sijil", description: "Sijil penyertaan", quantity: 100, unitPrice: 3 },
    { category: "Penceramah", description: "Honorarium penceramah jemputan", quantity: 3, unitPrice: 500 },
    { category: "Sewa", description: "Sewa dewan seminar (2 hari)", quantity: 2, unitPrice: 300 },
    { category: "Lain-lain", description: "Cenderamata dan barangan utiliti", quantity: 100, unitPrice: 5 },
  ],
  budgetLimit: 5000,
  committee: [
    { position: "Pengerusi", name: "Ahmad bin Ali", studentId: "202345678", faculty: "FSKTM" },
    { position: "Timbalan Pengerusi", name: "Siti binti Hassan", studentId: "202345679", faculty: "FSKTM" },
    { position: "Setiausaha", name: "Tan Wei Ming", studentId: "202345680", faculty: "FSKTM" },
    { position: "Bendahari", name: "Nurul binti Yusof", studentId: "202345681", faculty: "FSKTM" },
  ],
  expectedOutcomes: [
    "Peserta memahami konsep asas AI dan aplikasinya dalam pendidikan",
    "Pesajar dapat menggunakan alat AI untuk meningkatkan produktiviti akademik",
    "Peserta membina sekurang-kurangnya satu aplikasi AI ringkas semasa bengkel",
  ],
};
