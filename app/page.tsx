import DashboardClient from "@/components/DashboardClient";
import { CurrencyProvider } from "@/components/CurrencyContext";
import { ThemeProvider } from "@/components/ThemeContext";

export default function Page() {
  return (
    <ThemeProvider>
      <CurrencyProvider>
        <DashboardClient />
      </CurrencyProvider>
    </ThemeProvider>
  );
}
