'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RequestQuoteDialog } from '@/components/request-quote-dialog';
import { QuestionForm } from '@/components/question-form';
import { QuestionItem } from '@/components/question-item';
import { Product, User, Question, EntityReview } from '@/lib/types';
import { useCurrency } from '@/contexts/currency-context';
import { convertPrice } from '@/lib/currency';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import {
  toggleBookmarkClient,
  isBookmarkedClient,
  getEntityReviewsClient,
  upsertEntityReviewClient,
  createEntityReportClient,
} from '@/lib/firebase';
import { CheckCircle, Globe, Package, Clock, Tag, Gem, Share2, Bookmark, Star, Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';


interface ProductDetailsClientProps {
  product: Product;
  seller: User | null;
}

const toDateValue = (value: unknown): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (
    typeof value === "object" &&
    "toDate" in (value as Record<string, unknown>) &&
    typeof (value as { toDate?: () => unknown }).toDate === "function"
  ) {
    const maybeDate = (value as { toDate: () => unknown }).toDate();
    if (maybeDate instanceof Date && !Number.isNaN(maybeDate.getTime())) {
      return maybeDate;
    }
  }
  return null;
};

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
  const { user } = useAuth();
  const { toast } = useToast();
  const [bookmarked, setBookmarked] = useState(false);
  const [reviews, setReviews] = useState<EntityReview[]>([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reportReason, setReportReason] = useState('');

  useEffect(() => {
    async function loadMeta() {
      const reviewData = await getEntityReviewsClient('product', product.id);
      setReviews(reviewData);
      if (user?.uid) {
        const isSaved = await isBookmarkedClient(user.uid, 'product', product.id);
        setBookmarked(isSaved);
      }
    }
    loadMeta();
  }, [product.id, user?.uid]);

  const averageRating = useMemo(() => {
    if (!reviews.length) return 0;
    return reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  }, [reviews]);

  const handleToggleBookmark = async () => {
    if (!user?.uid) return toast({ variant: 'destructive', title: 'Login required', description: 'Please login to bookmark.' });
    const next = await toggleBookmarkClient(user.uid, 'product', product.id);
    setBookmarked(next);
    toast({ title: next ? 'Bookmarked' : 'Bookmark removed' });
  };

  const handleSubmitReview = async () => {
    if (!user?.uid) return toast({ variant: 'destructive', title: 'Login required', description: 'Please login to review.' });
    await upsertEntityReviewClient({ entityType: 'product', entityId: product.id, reviewerId: user.uid, reviewerName: user.name || user.email || 'User', rating, comment });
    const reviewData = await getEntityReviewsClient('product', product.id);
    setReviews(reviewData);
    setComment('');
    toast({ title: 'Thanks!', description: 'Your review has been saved.' });
  };

  const handleReport = async (targetType: 'product' | 'seller') => {
    if (!user?.uid) return toast({ variant: 'destructive', title: 'Login required', description: 'Please login to report.' });
    if (!reportReason.trim()) return toast({ variant: 'destructive', title: 'Reason required', description: 'Please add a report reason.' });
    await createEntityReportClient({ reporterId: user.uid, targetType, targetId: targetType === 'product' ? product.id : (seller?.id || ''), reason: reportReason.trim() });
    setReportReason('');
    toast({ title: 'Report submitted', description: 'Thank you for helping us keep quality high.' });
  };


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

  const sellerSubscriptionExpiryDate = toDateValue(seller?.subscriptionExpiryDate);
  const isFeaturedSeller =
    !!seller?.subscriptionPlan?.isFeatured &&
    !!sellerSubscriptionExpiryDate &&
    sellerSubscriptionExpiryDate > new Date();

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
          <div className="flex flex-wrap gap-2">
            <Button variant={bookmarked ? 'default' : 'outline'} onClick={handleToggleBookmark}><Bookmark className="h-4 w-4 mr-2" />{bookmarked ? 'Bookmarked' : 'Bookmark'}</Button>
            <Button variant="outline" onClick={() => handleReport('product')}><Flag className="h-4 w-4 mr-2" />Report Product</Button>
            <Button variant="outline" onClick={() => handleReport('seller')} disabled={!seller}><Flag className="h-4 w-4 mr-2" />Report Seller</Button>
          </div>
          <Input placeholder="Report reason (optional until submit)" value={reportReason} onChange={(e) => setReportReason(e.target.value)} />
          <p className="text-muted-foreground whitespace-pre-wrap">{product.description}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ratings & Reviews</CardTitle>
          <CardDescription>
            <span className="inline-flex items-center gap-1 font-medium text-foreground"><Star className="h-4 w-4 text-yellow-500" /> {averageRating.toFixed(1)} / 5</span> ({reviews.length} reviews)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input type="number" min={1} max={5} value={rating} onChange={(e) => setRating(Math.max(1, Math.min(5, Number(e.target.value))))} className="w-24" />
            <Textarea placeholder="Write your review" value={comment} onChange={(e) => setComment(e.target.value)} />
            <Button onClick={handleSubmitReview}>Submit</Button>
          </div>
          <div className="space-y-2">
            {reviews.slice(0, 5).map((review) => (
              <div key={review.id} className="rounded-md border p-3">
                <p className="text-sm font-medium">{review.reviewerName} · {review.rating}/5</p>
                <p className="text-sm text-muted-foreground">{review.comment || 'No comment provided.'}</p>
              </div>
            ))}
            {reviews.length === 0 && <p className="text-sm text-muted-foreground">No reviews yet.</p>}
          </div>
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


