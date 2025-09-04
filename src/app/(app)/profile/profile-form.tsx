
"use client";

import React, { useTransition, useEffect, useState } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { User, VerificationTemplate } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { countries, statesProvinces } from "@/lib/geography-data";
import { updateUserProfile } from "@/app/user-actions";
import { useAuth } from "@/contexts/auth-context";
import { getVerificationTemplatesClient } from "@/lib/firebase";
import { Checkbox } from "@/components/ui/checkbox";

const profileSchema = z.object({
  name: z.string().min(2, "Name is too short."),
  companyName: z.string().optional(),
  phoneNumber: z.string().optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().optional(),
  }),
  companyDescription: z.string().optional(),
  taxId: z.string().optional(),
  businessType: z
    .enum(["Manufacturer", "Distributor", "Trading Company", "Agent"])
    .optional(),
  exportScope: z.array(z.string()).optional(),
  verificationDetails: z.record(z.string()).optional(), // For dynamic fields
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface ProfileFormProps {
  user: User;
}

const exportScopeItems = [
    { id: 'domestic', label: 'Domestic Exporter' },
    { id: 'international', label: 'International Exporter' },
];

export function ProfileForm({ user }: ProfileFormProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const { firebaseUser } = useAuth();
  const [verificationTemplates, setVerificationTemplates] = useState<VerificationTemplate[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<VerificationTemplate | null>(null);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user.name || "",
      companyName: user.companyName || "",
      phoneNumber: user.phoneNumber || "",
      address: {
        street: user.address?.street || "",
        city: user.address?.city || "",
        state: user.address?.state || "",
        zip: user.address?.zip || "",
        country: user.address?.country || "",
      },
      companyDescription: user.companyDescription || "",
      taxId: user.taxId || "",
      businessType: user.businessType || undefined,
      exportScope: user.exportScope || [],
      verificationDetails: user.verificationDetails || {},
    },
  });

  const watchedCountry = useWatch({
    control: form.control,
    name: 'address.country',
  });

  useEffect(() => {
    async function fetchTemplates() {
      try {
        const templates = await getVerificationTemplatesClient();
        setVerificationTemplates(templates);
      } catch (error) {
        console.error("Failed to fetch verification templates:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not load verification options.",
        });
      }
    }
    fetchTemplates();
  }, [toast]);
  
  useEffect(() => {
    if (watchedCountry) {
        const availableStates = statesProvinces[watchedCountry] || [];
        const currentState = form.getValues('address.state');
        if (!availableStates.some(s => s.value === currentState)) {
            form.setValue('address.state', '');
        }

        const template = verificationTemplates.find(t => t.id === watchedCountry) || null;
        setActiveTemplate(template);
    } else {
        setActiveTemplate(null);
    }
  }, [watchedCountry, form, verificationTemplates]);

  const onSubmit = (values: ProfileFormData) => {
    if (!firebaseUser) {
        toast({
            variant: "destructive",
            title: "Authentication Error",
            description: "You must be logged in to update your profile.",
        });
        return;
    }

    startTransition(async () => {
      const result = await updateUserProfile(firebaseUser.uid, values);

      if (result.success) {
         toast({
            title: "Profile Updated",
            description: "Your information has been successfully saved.",
        });
      } else {
        toast({
            variant: "destructive",
            title: "Update Failed",
            description: result.error || "An unknown error occurred.",
        });
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              Your personal and company contact details.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Jane Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Acme Inc." {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Phone Number</FormLabel>
                  <FormControl>
                    <Input placeholder="+1 (555) 123-4567" {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Business Address</CardTitle>
            <CardDescription>
              Your company's primary physical location.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="address.street"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Street Address</FormLabel>
                  <FormControl>
                    <Input placeholder="123 Industrial Way" {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <FormField
                control={form.control}
                name="address.city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input placeholder="Metropolis" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="address.zip"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ZIP / Postal Code</FormLabel>
                    <FormControl>
                      <Input placeholder="90210" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                  control={form.control}
                  name="address.country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                              <SelectTrigger>
                                  <SelectValue placeholder="Select a country" />
                              </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                              {countries.map(country => (
                                  <SelectItem key={country.value} value={country.value}>
                                      {country.label}
                                  </SelectItem>
                              ))}
                          </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                    control={form.control}
                    name="address.state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State / Province</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={!watchedCountry || (statesProvinces[watchedCountry] || []).length === 0}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a state/province" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {(statesProvinces[watchedCountry] || []).map(state => (
                                    <SelectItem key={state.value} value={state.value}>
                                        {state.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
            </div>
          </CardContent>
        </Card>

        {user.role === "seller" && (
          <Card>
            <CardHeader>
              <CardTitle>Seller Details</CardTitle>
              <CardDescription>
                Information that helps build trust with buyers.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="companyDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe your company, its mission, and what makes it unique."
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="taxId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tax ID / VAT Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your business tax ID" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="businessType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select your business type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Manufacturer">Manufacturer</SelectItem>
                          <SelectItem value="Distributor">Distributor</SelectItem>
                          <SelectItem value="Trading Company">Trading Company</SelectItem>
                          <SelectItem value="Agent">Agent</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

               <FormField
                control={form.control}
                name="exportScope"
                render={() => (
                    <FormItem>
                        <div className="mb-4">
                            <FormLabel className="text-base">Export Scope</FormLabel>
                            <FormDescription>
                                Select the regions you export to.
                            </FormDescription>
                        </div>
                        <div className="flex flex-row items-center gap-x-6 gap-y-2 flex-wrap">
                        {exportScopeItems.map((item) => (
                            <FormField
                                key={item.id}
                                control={form.control}
                                name="exportScope"
                                render={({ field }) => {
                                    return (
                                    <FormItem
                                        key={item.id}
                                        className="flex flex-row items-start space-x-2 space-y-0"
                                    >
                                        <FormControl>
                                        <Checkbox
                                            checked={field.value?.includes(item.id)}
                                            onCheckedChange={(checked) => {
                                                return checked
                                                ? field.onChange([...(field.value || []), item.id])
                                                : field.onChange(
                                                    field.value?.filter(
                                                        (value) => value !== item.id
                                                    )
                                                    )
                                            }}
                                        />
                                        </FormControl>
                                        <FormLabel className="font-normal">
                                        {item.label}
                                        </FormLabel>
                                    </FormItem>
                                    )
                                }}
                                />
                        ))}
                        </div>
                        <FormMessage />
                    </FormItem>
                )}
                />

              {activeTemplate && (
                <div className="space-y-4 pt-4">
                    <Separator />
                     <h3 className="text-md font-medium">
                        Business Verification ({activeTemplate.countryName})
                     </h3>
                    {activeTemplate.fields.map(fieldTemplate => (
                        <FormField
                            key={fieldTemplate.name}
                            control={form.control}
                            name={`verificationDetails.${fieldTemplate.name}` as const}
                            defaultValue={user?.verificationDetails?.[fieldTemplate.name] || ""}
                            rules={{ 
                                required: fieldTemplate.required ? 'This field is required.' : false,
                                pattern: fieldTemplate.validationRegex ? {
                                    value: new RegExp(fieldTemplate.validationRegex),
                                    message: `Please enter a valid ${fieldTemplate.label}.`
                                } : undefined
                            }}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{fieldTemplate.label}</FormLabel>
                                    <FormControl>
                                        <Input 
                                            placeholder={`Enter your ${fieldTemplate.label}`}
                                            {...field}
                                            value={field.value || ''}
                                            onChange={(e) => {
                                                if (fieldTemplate.name === 'gstn') {
                                                    field.onChange(e.target.value.toUpperCase());
                                                } else {
                                                    field.onChange(e);
                                                }
                                            }}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        {fieldTemplate.helperText}
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end">
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </form>
    </Form>
  );
}
