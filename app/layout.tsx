import "./globals.css";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

export const metadata = {
  title: "Trade Journal",
  description: "Your personal trading dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen bg-gray-50 text-gray-900">
        <SidebarProvider>
          <AppSidebar />
          <main className="flex-1 p-4">
            <SidebarTrigger className="md:hidden mb-4" />
            {children}
          </main>
        </SidebarProvider>
      </body>
    </html>
  );
}
