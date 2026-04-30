import Metrics from "./Metrics";
import Navbar from "@/components/Navbar";
import { getNavbarRole } from "@/components/NavbarAuth";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const role = await getNavbarRole();

  return (
    <>
      <div className="relative z-[100]">
        <Navbar />
      </div>
      <div className="-mt-4 md:-mt-6">
        <Metrics showDashboard={role === "user"} showAdminDashboard={role === "admin"} />
      </div>
    </>
  );
}
