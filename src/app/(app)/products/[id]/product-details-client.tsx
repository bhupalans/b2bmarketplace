
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RequestQuoteDialog } from '@/components/request-quote-dialog';
import { QuestionForm } from '@/components/question-form';
import { QuestionItem } from '@/components/question-item';
import { Product, User, Question } from '@/lib/types';
import { useCurrency } from '@/contexts/currency-context';
import { convertPrice } from '@/lib/currency';
import { useAuth } from '@/contexts/auth-context';
import { CheckCircle, Globe, Package, Clock, Tag, Gem } from 'lucide-react';
import { Share2 } from "lucide-react";


interface ProductDetailsClientProps {
  product: Product;
  seller: User | null;
}

export function ProductDetailsClient({ product, seller }: ProductDetailsClientProps) {
	
const handleShare = async () => {
  const url = window.location.href;

  try {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: product.title,
          text: "Check this product on VBuySell",
          url,
        });
      } catch (err) {
        // If share fails (like on desktop), fallback to copy
        await navigator.clipboard.writeText(url);
        alert("Link copied to clipboard");
      }
    } else {
      await navigator.clipboard.writeText(url);
      alert("Link copied to clipboard");
    }
  } catch (error) {
    console.error("Share failed:", error);
    }
};



  const { currency, rates } = useCurrency();


  const formattedPrice = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currency,
  }).format(convertPrice(product.price, currency, rates));

  const getStockLabel = (stock?: string) => {
    switch (stock) {
      case 'in_stock':
        return 'In Stock';
      case 'out_of_stock':
        return 'Out of Stock';
      case 'made_to_order':
        return 'Made to Order';
      default:
        return 'N/A';
    }
  };

  const isFeaturedSeller =
    seller?.subscriptionPlan?.isFeatured &&
    seller?.subscriptionExpiryDate &&
    new Date(seller.subscriptionExpiryDate) > new Date();

  return (
    <>
      <Card>
        <CardHeader>
	<div className="flex items-start justify-between gap-4">
          <h1 className="text-3xl font-bold leading-snug">{product.title}</h1>
		  <button onClick={handleShare}
    			title="Share this product"
    			className="flex-shrink-0 p-2 rounded-full border border-gray-200 hover:bg-gray-100 transition"
  		  >
    			<Share2 className="w-5 h-5 text-gray-700" />
  		  </button>
	</div>
          <CardDescription className="pt-2">
            <p className="text-3xl font-bold text-primary">{formattedPrice}</p>
            <p className="text-sm text-muted-foreground mt-1">per {product.moqUnit}</p>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 text-sm">
            <div className="flex items-center text-muted-foreground">
              <Tag className="mr-2 h-4 w-4" />
              Minimum Order: <span className="font-semibold text-foreground ml-1">{product.moq} {product.moqUnit}</span>
            </div>
            <div className="flex items-center text-muted-foreground">
              <Package className="mr-2 h-4 w-4" />
              Availability:
              <Badge variant={product.stockAvailability === 'in_stock' ? 'default' : 'secondary'} className="ml-1">
                {getStockLabel(product.stockAvailability)}
              </Badge>
            </div>
            <div className="flex items-center text-muted-foreground">
              <Clock className="mr-2 h-4 w-4" />
              Lead Time: <span className="font-semibold text-foreground ml-1">{product.leadTime}</span>
            </div>
            <div className="flex items-center text-muted-foreground">
              <Globe className="mr-2 h-4 w-4" />
              Country of Origin: <span className="font-semibold text-foreground ml-1">{product.countryOfOrigin}</span>
            </div>
            {product.sku && (
              <div className="flex items-center text-muted-foreground">
                SKU: <span className="font-semibold text-foreground ml-1">{product.sku}</span>
              </div>
            )}
          </div>
          <Separator />
          <p className="text-muted-foreground whitespace-pre-wrap">{product.description}</p>
        </CardContent>
      </Card>
      {seller && (
        <Card>
          <CardHeader className="flex flex-row items-center gap-4 space-y-0">
            <Avatar className="h-12 w-12 border">
              <AvatarImage src={seller.avatar} alt={seller.name} />
              <AvatarFallback>{seller.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-base">Sold By</CardTitle>
              <CardDescription>
                <Link href={`/sellers/${seller.id}`} className="text-lg font-semibold text-foreground hover:underline">
                  {seller.name}
                </Link>
                {isFeaturedSeller && (
                  <Badge variant="secondary" className="ml-2 border-yellow-600/50 text-yellow-700">
                    <Gem className="h-3 w-3 mr-1" />
                    Featured Seller
                  </Badge>
                )}
                {seller.verificationStatus === 'verified' && (
                  <Badge variant="secondary" className="ml-2 border-green-600/50 text-green-700">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Verified Seller
                  </Badge>
                )}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <RequestQuoteDialog product={product} seller={seller} />
          </CardContent>
        </Card>
      )}
    </>
  );
}

export function QuestionArea({ initialQuestions, product }: { initialQuestions: Question[], product: Product }) {
  const [questions, setQuestions] = useState(initialQuestions);
  const { user } = useAuth();

  const onQuestionSubmitted = (newQuestion: Question) => {
    setQuestions((prev) => [newQuestion, ...prev]);
  };

  const onAnswerSubmitted = (answeredQuestion: Question) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === answeredQuestion.id ? answeredQuestion : q))
    );
  };

  return (
    <>
      <QuestionForm
        productId={product.id}
        onQuestionSubmitted={onQuestionSubmitted}
      />
      <Separator />
      <div className="space-y-4">
        {questions.length > 0 ? (
          questions.map((q) => (
            <QuestionItem
              key={q.id}
              question={q}
              onAnswerSubmitted={onAnswerSubmitted}
              currentSellerId={product.sellerId}
            />
          ))
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No questions have been asked yet. Be the first!
          </p>
        )}
      </div>
    </>
  );
}
