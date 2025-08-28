import { getPendingProducts, getUsers } from '@/lib/database';
import { AdminApprovalsClientPage } from './client-page';

// This is now a Server Component
export default async function AdminApprovalsPage() {
  // Fetch data securely on the server
  const pendingProducts = await getPendingProducts();
  const users = await getUsers();

  // Pass the server-fetched data to the client component as props
  return <AdminApprovalsClientPage initialProducts={pendingProducts} initialUsers={users} />;
}
