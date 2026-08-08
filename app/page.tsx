import { redirect } from "next/navigation";
import DashboardClient from "@/components/DashboardClient";
import { CurrencyProvider } from "@/components/CurrencyContext";
import { ThemeProvider } from "@/components/ThemeContext";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <ThemeProvider>
      <CurrencyProvider>
        <DashboardClient userEmail={user.email} />
      </CurrencyProvider>
    </ThemeProvider>
  );
}
