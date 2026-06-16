// @ts-nocheck
import React, { useState } from "react";
import { useUser } from "@/redux/slices/authSlice";
import {
  useGetReportsQuery,
  useGetReportStatsQuery,
  useUpdateReportStatusMutation,
} from "@/redux/api/admin/reportsApi";
import { formatDistanceToNow } from "date-fns";
import DashboardLayout from "@/components/admin/DashboardLayout";

const STATUS_COLORS = {
  pending:   "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30",
  reviewed:  "bg-blue-500/20   text-blue-300   border border-blue-500/30",
  resolved:  "bg-green-500/20  text-green-300  border border-green-500/30",
  dismissed: "bg-gray-500/20   text-gray-400   border border-gray-500/30",
};

const ACTION_OPTIONS = [
  { value: "none",              label: "No action" },
  { value: "warning",          label: "Warning issued" },
  { value: "temporary_ban",    label: "Temporary ban" },
  { value: "permanent_ban",    label: "Permanent ban" },
  { value: "content_removed",  label: "Content removed" },
];

export default function ReportsDashboard(): JSX.Element {
  const { user }: any = useUser({});
  const role: string = user?.role || "";
  const isDeveloper = role === "developer";
  const isAdmin     = ["admin", "superadmin"].includes(role);

  const [statusFilter, setStatusFilter]   = useState("");
  const [page, setPage]                   = useState(1);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [resolution, setResolution]       = useState("");
  const [actionTaken, setActionTaken]     = useState("none");
  const [newStatus, setNewStatus]         = useState("reviewed");

  const { data, isLoading, isFetching } = useGetReportsQuery(
    { status: statusFilter || undefined, page, limit: 15 },
    { refetchOnMountOrArgChange: true }
  );
  const { data: stats } = useGetReportStatsQuery(undefined);
  const [updateStatus, { isLoading: isUpdating }] = useUpdateReportStatusMutation();

  const reports      = data?.reports      || [];
  const totalPages   = data?.totalPages   || 1;
  const totalReports = data?.totalReports || 0;

  const handleUpdateStatus = async () => {
    if (!selectedReport) return;
    try {
      await updateStatus({
        reportId:   selectedReport._id,
        status:     newStatus,
        resolution: resolution.trim(),
        actionTaken,
      }).unwrap();
      setSelectedReport(null);
      setResolution("");
      setActionTaken("none");
    } catch (err: any) {
      console.error("Failed to update report:", err);
    }
  };

  const title = isDeveloper ? "Software Issue Reports" : "User Reports";
  const subtitle = isDeveloper
    ? "Bug reports and technical issues submitted by users"
    : "Misbehaviour and community violation reports";

  return (
    // <DashboardLayout type="admin">
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">{title}</h1>
          <p className="text-gray-400 text-sm mt-1">{subtitle}</p>
        </div>

        {/* Stats bar */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(stats.byStatus || {}).map(([status, count]: any) => (
              <div key={status} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                <p className="text-xs text-gray-400 capitalize">{status}</p>
                <p className="text-2xl font-bold text-white mt-1">{count}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <select
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="reviewed">Reviewed</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </select>
          <span className="text-gray-500 text-sm">{totalReports} total</span>
        </div>

        {/* Table */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
          {isLoading || isFetching ? (
            <div className="p-12 text-center text-gray-500">Loading reports…</div>
          ) : reports.length === 0 ? (
            <div className="p-12 text-center text-gray-500">No reports found.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-800/60 border-b border-gray-700">
                <tr>
                  <th className="text-left px-5 py-3 text-gray-400 font-medium">Reporter</th>
                  <th className="text-left px-5 py-3 text-gray-400 font-medium">Reason</th>
                  <th className="text-left px-5 py-3 text-gray-400 font-medium">Details</th>
                  <th className="text-left px-5 py-3 text-gray-400 font-medium">Status</th>
                  <th className="text-left px-5 py-3 text-gray-400 font-medium">Submitted</th>
                   <th className="text-left px-5 py-3 text-gray-400 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {reports.map((report: any) => (
                  <tr key={report._id} className="hover:bg-gray-800/40 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <img
                          src={report.reporter?.image || "/images/avatar/default-avatar.svg"}
                          className="w-7 h-7 rounded-full object-cover"
                          alt=""
                        />
                        <span className="text-gray-200">{report.reporter?.name || "Unknown"}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="capitalize text-gray-300">{report.reason}</span>
                    </td>
                    <td className="px-5 py-4 max-w-xs">
                      <p className="text-gray-400 truncate">{report.details || "—"}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[report.status]}`}>
                        {report.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-gray-500 text-xs whitespace-nowrap">
                      {formatDistanceToNow(new Date(report.createdAt), { addSuffix: true })}
                    </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => {
                            setSelectedReport(report);
                            setNewStatus(report.status === "pending" ? "reviewed" : report.status);
                            setResolution(report.resolution || "");
                            setActionTaken(report.actionTaken || "none");
                          }}
                          className="text-blue-400 hover:text-blue-300 text-xs underline"
                        >
                          Review
                        </button>
                      </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 disabled:opacity-40 hover:bg-gray-700 text-sm"
            >
              ← Prev
            </button>
            <span className="px-4 py-2 text-gray-400 text-sm">
              {page} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 disabled:opacity-40 hover:bg-gray-700 text-sm"
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* Review modal — admin only */}
      { selectedReport && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">Review Report</h2>

            <div className="space-y-1 text-sm text-gray-400">
              <p><span className="text-gray-300">Reporter:</span> {selectedReport.reporter?.name}</p>
              <p><span className="text-gray-300">Reason:</span> <span className="capitalize">{selectedReport.reason}</span></p>
              {selectedReport.details && (
                <p><span className="text-gray-300">Details:</span> {selectedReport.details}</p>
              )}
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Status</label>
              <select
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
              >
                <option value="reviewed">Reviewed</option>
                <option value="resolved">Resolved</option>
                <option value="dismissed">Dismissed</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Action taken</label>
              <select
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200"
                value={actionTaken}
                onChange={(e) => setActionTaken(e.target.value)}
              >
                {ACTION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Resolution note (optional)</label>
              <textarea
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 resize-none"
                rows={3}
                placeholder="Add a note about how this was resolved…"
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                maxLength={500}
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setSelectedReport(null)}
                className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateStatus}
                disabled={isUpdating}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 text-sm disabled:opacity-50"
              >
                {isUpdating ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    // </DashboardLayout>
  );
}
