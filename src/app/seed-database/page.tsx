
"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { seedDatabaseClient } from "@/lib/database-client";
import { Loader2 } from "lucide-react";
import { useState } from "react";

export default function SeedDatabasePage() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSeed = async () => {
    setIsLoading(true);
    try {
      const result = await seedDatabaseClient();
      if (result.success) {
        toast({
          title: "Database Seeded!",
          description: result.message,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Seeding Failed",
          description: result.message,
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "An Error Occurred",
        description: error.message || "Failed to seed database.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Database Seeder</CardTitle>
          <CardDescription>
            Click the button below to populate your Firestore database with the
            initial sample data, including products, categories, and the default
            admin user (admin / password you set). This action can only be
            performed once.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleSeed}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Seed Database
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
