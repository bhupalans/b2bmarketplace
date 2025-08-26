
import { notFound } from "next/navigation";
import { mockUsers, mockProducts } from "@/lib/mock-data";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ProductCard } from "@/components/product-card";
import { Badge } from "@/components/ui/badge";

async function getSellerData(id: string) {
  const seller = mockUsers[id];
  if (!seller) {
    return null;
  }
  const products = mockProducts.filter((p) => p.sellerId === id);
  return { seller, products };
}

export default async function SellerProfilePage({
  params,
}: {
  params: { id: string };
}) {
  const data = await getSellerData(params.id);

  if (!data) {
    notFound();
  }

  const { seller, products } = data;

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
          <Avatar className="h-24 w-24 border text-4xl">
            <AvatarImage src={seller.avatar} alt={seller.name} />
            <AvatarFallback>{seller.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <CardTitle className="text-3xl">{seller.name}</CardTitle>
            <p className="text-muted-foreground">{seller.email}</p>
            <Badge variant="secondary" className="capitalize">
              {seller.role}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight">
          Products from {seller.name} ({products.length})
        </h2>
        {products.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-6">
              <p className="text-muted-foreground">
                This seller has not listed any products yet.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
