
import { AppLayout as Layout } from "@/components/app-layout";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Layout>{children}</Layout>;
}
