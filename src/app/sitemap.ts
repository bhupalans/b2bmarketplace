import { MetadataRoute } from 'next';
import { adminDb } from '@/lib/firebase-admin';
import { Product, User, Category, SourcingRequest } from '@/lib/types';
import { Timestamp } from 'firebase-admin/firestore';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://vbuysell.com';

// Helper function to serialize Firestore Timestamps
function serializeTimestamps(data: any): any {
  if (data instanceof Timestamp) {
    return data.toDate().toISOString();
  }
  if (Array.isArray(data)) {
    return data.map(serializeTimestamps);
  }
  if (data && typeof data === 'object') {
    const res: { [key: string]: any } = {};
    for (const key in data) {
      res[key] = serializeTimestamps(data[key]);
    }
    return res;
  }
  return data;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = [
    '/',
    '/products',
    '/categories',
    '/sourcing',
    '/terms',
    '/privacy',
    '/contact',
    '/shipping',
    '/returns',
  ].map((route) => ({
    url: `${BASE_URL}${route}`,
    lastModified: new Date().toISOString(),
  }));

  // Fetch approved products
  const productsSnapshot = await adminDb.collection('products').where('status', '==', 'approved').get();
  const products = productsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...serializeTimestamps(doc.data()),
  })) as Product[];

  const productRoutes = products.map((product) => ({
    url: `${BASE_URL}/products/${product.id}`,
    lastModified: product.updatedAt ? new Date(product.updatedAt as string).toISOString() : new Date().toISOString(),
  }));

  // Fetch all users to create seller and buyer profile URLs
  const usersSnapshot = await adminDb.collection('users').get();
  const users = usersSnapshot.docs.map(doc => ({
    id: doc.id,
    ...serializeTimestamps(doc.data()),
  })) as User[];

  const sellerRoutes = users
    .filter(user => user.role === 'seller')
    .map((seller) => ({
      url: `${BASE_URL}/sellers/${seller.id}`,
      lastModified: new Date().toISOString(), // User profiles don't have an `updatedAt` field yet
    }));

  const buyerRoutes = users
    .filter(user => user.role === 'buyer')
    .map((buyer) => ({
      url: `${BASE_URL}/buyers/${buyer.id}`,
      lastModified: new Date().toISOString(),
    }));

  // Fetch active categories
  const categoriesSnapshot = await adminDb.collection('categories').where('status', '==', 'active').get();
  const categories = categoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Category[];

  const categoryRoutes = categories.map((category) => ({
    url: `${BASE_URL}/products?category=${category.id}`, // Categories link to a filtered product list
    lastModified: new Date().toISOString(),
  }));

  // Fetch active sourcing requests
  const requestsSnapshot = await adminDb.collection('sourcingRequests').where('status', '==', 'active').get();
  const sourcingRequests = requestsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...serializeTimestamps(doc.data()),
  })) as SourcingRequest[];

  const sourcingRequestRoutes = sourcingRequests.map((request) => ({
    url: `${BASE_URL}/sourcing/${request.id}`,
    lastModified: request.createdAt ? new Date(request.createdAt as string).toISOString() : new Date().toISOString(),
  }));

  return [
    ...staticRoutes,
    ...productRoutes,
    ...sellerRoutes,
    ...buyerRoutes,
    ...categoryRoutes,
    ...sourcingRequestRoutes,
  ];
}
