"use client";

import React, { useState, useRef } from "react";
import { uploadDocumentAction } from "@/modules/crm/document/document.actions";
import { Button } from "@/components/ui/button";
import { UploadCloud, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function DocumentUploader({
  customerId,
  taskId,
  onUploadSuccess,
  className,
}: {
  customerId?: string;
  taskId?: string;
  onUploadSuccess?: () => void;
  className?: string;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    if (customerId) formData.append("customerId", customerId);
    if (taskId) formData.append("taskId", taskId);

    try {
      const result = await uploadDocumentAction(formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Document uploaded successfully");
        if (onUploadSuccess) onUploadSuccess();
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred during upload.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
        disabled={isUploading}
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.jpeg,.png,.webp"
      />
      <Button
        variant="secondary"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="flex items-center gap-2"
      >
        {isUploading ? (
          <Loader2 className="w-4 h-4 animate-spin text-[#8891B0]" />
        ) : (
          <UploadCloud className="w-4 h-4 text-violet-400" />
        )}
        {isUploading ? "Uploading..." : "Upload File"}
      </Button>
    </div>
  );
}
