import AdminProductManagementPanel from "@/components/admin/AdminProductManagementPanel";

export default function AdminProducts() {
  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h1 className="font-display text-2xl text-foreground">Product Management</h1>
      </div>
      <AdminProductManagementPanel />
    </div>
  );
}
