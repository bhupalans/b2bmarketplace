
"use client";

import { useEffect, useState } from "react";
import { getActiveCategoriesClient, getProductsClient, getSourcingRequestsClient } from "@/lib/firebase";
import { HomePageClient } from "@/components/home-page-client";
import { Category, Product, SourcingRequest } from "@/lib/types";
import { Loader2 } from "lucide-react";

// Now a Client Component for data fetching
export default function HomePage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [requests, setRequests] = useState<SourcingRequest[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                const [fetchedCategories, fetchedProducts, fetchedRequests] = await Promise.all([
                    getActiveCategoriesClient(),
                    getProductsClient(),
                    getSourcingRequestsClient(),
                ]);

                setCategories(fetchedCategories.filter(c => !c.parentId).slice(0, 6));
                setProducts(fetchedProducts.slice(0, 3));
                setRequests(fetchedRequests.slice(0, 3));

            } catch (error) {
                console.error("Failed to fetch homepage data:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    // This is a placeholder since the parent AppLayout now controls branding
    const branding = {
        headline: "The Global B2B Marketplace",
        subhead: "Connect with verified suppliers, find quality products, or post your sourcing needs to get competitive quotes."
    };

    return (
        <HomePageClient 
            initialBranding={branding}
            initialCategories={categories}
            initialProducts={products}
            initialRequests={requests}
        />
    )
}
