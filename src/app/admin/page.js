import { checkAdmin } from "@/lib/requireAdmin";
import Nav from "@/components/Nav";
import AdminLoginClient from "./AdminLoginClient";
import AdminDashboardClient from "./AdminDashboardClient";

export default async function AdminPage() {
  const isAdmin = await checkAdmin();

  if (!isAdmin) {
    return (
      <>
        <Nav activePage="admin" ranking={null} isAdmin={false} />
        <AdminLoginClient />
      </>
    );
  }

  return <AdminDashboardClient />;
}
