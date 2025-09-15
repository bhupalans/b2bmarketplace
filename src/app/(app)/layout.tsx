
import { AppLayout as Layout } from "@/components/app-layout";
import { usePathname } from "next/navigation";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Layout>{children}</Layout>;
}
