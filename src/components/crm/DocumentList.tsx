"use client";

import React, { useState, useMemo } from "react";
import { deleteDocumentAction } from "@/modules/crm/document/document.actions";
import {
  FileText,
  FileImage,
  FileCode,
  File,
  Download,
  Trash2,
  MoreVertical,
  FileSpreadsheet,
  Loader2,
  Search,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";

export interface DocumentInfo {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: Date;
  uploadedBy?: { email: string; firstName?: string; lastName?: string };
}

export function DocumentList({
  documents,
  customerId,
  taskId,
}: {
  documents: DocumentInfo[];
  customerId?: string;
  taskId?: string;
}) {
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;

    setIsDeleting(id);

    try {
      const result = await deleteDocumentAction(id, customerId, taskId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Document deleted successfully");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to delete document");
    } finally {
      setIsDeleting(null);
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/"))
      return <FileImage className="w-8 h-8 text-blue-400" strokeWidth={1.5} />;
    if (mimeType.includes("pdf"))
      return <FileText className="w-8 h-8 text-red-400" strokeWidth={1.5} />;
    if (
      mimeType.includes("spreadsheet") ||
      mimeType.includes("csv") ||
      mimeType.includes("excel")
    )
      return (
        <FileSpreadsheet
          className="w-8 h-8 text-emerald-400"
          strokeWidth={1.5}
        />
      );
    return <File className="w-8 h-8 text-slate-400" strokeWidth={1.5} />;
  };

  const filteredDocs = useMemo(() => {
    if (!searchQuery) return documents || [];
    const lowerQ = searchQuery.toLowerCase();
    return (documents || []).filter((doc) =>
      doc.fileName.toLowerCase().includes(lowerQ),
    );
  }, [documents, searchQuery]);

  if (!documents || documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 border border-white/[.04] rounded-xl bg-[#0D1326]/40 border-dashed">
        <div className="w-12 h-12 rounded-full bg-white/[.02] flex items-center justify-center mb-3">
          <File className="w-6 h-6 text-[#8891B0]/50" />
        </div>
        <p className="text-sm font-medium text-[#E7EAF5]">No documents</p>
        <p className="text-xs text-[#8891B0] mt-1 text-center max-w-[250px]">
          Upload files to attach them to this record.
        </p>
      </div>
    );
  }

  const totalSize = documents.reduce((acc, doc) => acc + doc.sizeBytes, 0);

  return (
    <div className="flex flex-col border border-white/[.08] rounded-xl bg-[#0D1326]/40 overflow-hidden">
      {/* Header / Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border-b border-white/[.04] bg-white/[.01] gap-3">
        <div className="text-xs text-[#8891B0] font-medium pl-2">
          {documents.length} files • {formatSize(totalSize)}
        </div>
        <div className="relative w-full sm:max-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8891B0]/70" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black/20 border border-white/[.08] rounded-lg py-1.5 pl-9 pr-3 text-sm text-white placeholder:text-[#8891B0]/50 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 transition-all h-8"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex flex-col">
        {filteredDocs.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#8891B0]">
            No documents match "{searchQuery}"
          </div>
        ) : (
          filteredDocs.map((doc, idx) => (
            <div
              key={doc.id}
              className={`group flex items-center justify-between p-4 hover:bg-white/[.02] transition-colors ${
                idx !== filteredDocs.length - 1
                  ? "border-b border-white/[.04]"
                  : ""
              }`}
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-white/[.02] border border-white/[.04]">
                  {getFileIcon(doc.mimeType)}
                </div>

                <div className="flex flex-col min-w-0">
                  <span
                    className="text-sm font-medium text-[#E7EAF5] truncate"
                    title={doc.fileName}
                  >
                    {doc.fileName}
                  </span>
                  <div className="flex items-center gap-2 text-xs text-[#8891B0] mt-0.5">
                    <span>{formatSize(doc.sizeBytes)}</span>
                    <span>•</span>
                    <span title={format(new Date(doc.createdAt), "PPpp")}>
                      Uploaded{" "}
                      {formatDistanceToNow(new Date(doc.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                    {doc.uploadedBy && (
                      <>
                        <span className="hidden sm:inline">•</span>
                        <span className="hidden sm:inline truncate max-w-[150px]">
                          by{" "}
                          {doc.uploadedBy.firstName ||
                            doc.uploadedBy.email.split("@")[0]}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0 ml-4">
                <a
                  href={`/api/documents/${doc.id}/download`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-[#8891B0] hover:text-white hover:bg-white/10 rounded-md transition-colors"
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                </a>
                <button
                  onClick={() => handleDelete(doc.id)}
                  disabled={isDeleting === doc.id}
                  className="p-2 text-[#8891B0] hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors disabled:opacity-50"
                  title="Delete"
                >
                  {isDeleting === doc.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
