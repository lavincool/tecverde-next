import { exportReportsCsv } from "@/features/reports/staff-queries";
import { dashboard } from "@/messages/es-MX/dashboard";
import { StaffAccessError } from "@/server/auth/guards";

export async function GET() {
  try {
    const csv = await exportReportsCsv();
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${dashboard.reports.csvFilename}"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof StaffAccessError) {
      return new Response(null, { status: error.status, headers: { "Cache-Control": "no-store" } });
    }
    throw error;
  }
}
