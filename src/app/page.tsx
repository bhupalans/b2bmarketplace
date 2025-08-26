import AuthenticatedAppLayout from "./(app)/layout";
import ProductsPage from "./(app)/page";

export default function Home() {
  return (
    <AuthenticatedAppLayout>
      <ProductsPage />
    </AuthenticatedAppLayout>
  );
}
