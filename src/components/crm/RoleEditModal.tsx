"use client";

import * as React from "react";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { updateEmployeeRoleAction } from "@/app/(crm)/employees/actions";

export function RoleEditModal({
  userId,
  currentRole,
}: {
  userId: string;
  currentRole: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  async function onSubmit(formData: FormData) {
    setLoading(true);
    try {
      const res = await updateEmployeeRoleAction(userId, formData);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Role updated successfully");
        setOpen(false);
      }
    } catch (e: any) {
      toast.error(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:border-indigo-500 transition-colors">
        Change Role
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Employee Role</DialogTitle>
          <DialogDescription>
            Update the role and permissions for this employee.
          </DialogDescription>
        </DialogHeader>
        <form action={onSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">
              Select Role
            </label>
            <select
              name="roleName"
              defaultValue={currentRole}
              className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
            >
              <option value="MEMBER">Member</option>
              <option value="DEPARTMENT_HEAD">Department Head</option>
              <option value="TENANT_ADMIN">Tenant Admin</option>
            </select>
          </div>
          <DialogFooter showCloseButton>
            <Button type="submit" disabled={loading} variant="default" isLoading={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
