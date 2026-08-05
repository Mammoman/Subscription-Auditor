import DashboardClient from "@/components/DashboardClient";
import { CurrencyProvider } from "@/components/CurrencyContext";

export default function Page() {
  return (
    <CurrencyProvider>
      <DashboardClient />
    </CurrencyProvider>
  );
}
