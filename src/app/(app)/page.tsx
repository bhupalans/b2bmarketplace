
import { getBrandingSettings } from "@/lib/database";
import { getActiveCategoriesClient, getProductsClient, getSourcingRequestsClient } from "@/lib/firebase";
import { HomePageClient } from "@/components/home-page-client";

// Server Component for data fetching
export default async function HomePage() {
    const [branding, categories, products, requests] = await Promise.all([
        getBrandingSettings(),
        getActiveCategoriesClient(),
        getProductsClient(),
        getSourcingRequestsClient(),
    ]);

    const initialBranding = {
        headline: branding.headline || "The Global B2B Marketplace",
        subhead: branding.subhead || "Connect with verified suppliers, find quality products, or post your sourcing needs to get competitive quotes."
    };
    
    const initialCategories = categories.filter(c => !c.parentId).slice(0, 6);
    const initialProducts = products.slice(0, 3);
    const initialRequests = requests.slice(0, 3);

    return (
        <HomePageClient 
            initialBranding={initialBranding}
            initialCategories={initialCategories}
            initialProducts={initialProducts}
            initialRequests={initialRequests}
        />
    )
}
