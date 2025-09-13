
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
import { cn } from "@/lib/utils";

const addressSchema = z.object({
    street: z.string().min(1, 'Street is required'),
    city: z.string().min(1, 'City is required'),
    state: z.string().optional(),
    zip: z.string().min(1, 'ZIP code is required'),
    country: z.string().min(1, 'Country is required'),
}).superRefine((data, ctx) => {
    if (data.country && statesProvinces[data.country] && !data.state) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'State/Province is required for this country.',
            path: ['state'],
        });
    }
});

const profileSchema = z.object({
  name: z.string().min(2, "Name is too short."),
  companyName: z.string().optional(),
  phoneNumber: z.string().optional(),
  shippingAddress: addressSchema.optional(),
  billingAddress: addressSchema.optional(),
  address: addressSchema.optional(),
  // Buyer specific
  jobTitle: z.string().optional(),
  companyWebsite: z.string().optional().refine(val => !val || z.string().url().safeParse(val).success, { message: 'Please enter a valid URL.' }),
  // Seller specific
  companyDescription: z.string().optional(),
  taxId: z.string().optional(),
  businessType: z.enum(["Manufacturer", "Distributor", "Trading Company", "Agent"]).optional(),
  exportScope: z.array(z.string()).optional(),
  verificationDetails: z.record(z.string()).optional(),
});


type ProfileFormData = z.infer<typeof profileSchema>;

interface ProfileFormProps {
  user: User;
}

const exportScopeItems = [
    { id: 'domestic', label: 'Domestic Exporter' },
    { id: 'international', label: 'International Exporter' },
];

const AddressFields: React.FC<{
  fieldName: 'address' | 'shippingAddress' | 'billingAddress',
  control: any,
  disabled?: boolean
}> = ({ fieldName, control, disabled = false }) => {
    const watchedCountry = useWatch({ control, name: `${fieldName}.country` });
    const isStateRequired = watchedCountry && statesProvinces[watchedCountry] && statesProvinces[watchedCountry].length > 0;

    return (
        <div className={cn("space-y-4", disabled && "opacity-50 pointer-events-none")}>
            <FormField
              control={control}
              name={`${fieldName}.street`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Street Address <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input placeholder="123 Industrial Way" {...field} value={field.value || ''} disabled={disabled} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <FormField
                control={control}
                name={`${fieldName}.city`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="Metropolis" {...field} value={field.value || ''} disabled={disabled} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={control}
                name={`${fieldName}.zip`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ZIP / Postal Code <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="90210" {...field} value={field.value || ''} disabled={disabled} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                  control={control}
                  name={`${fieldName}.country`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country <span className="text-destructive">*</span></FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={disabled}>
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
                    control={control}
                    name={`${fieldName}.state`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State / Province {isStateRequired && <span className="text-destructive">*</span>}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''} disabled={disabled || !isStateRequired}>
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
        </div>
    );
};


export function ProfileForm({ user }: ProfileFormProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const { firebaseUser } = useAuth();
  const [verificationTemplates, setVerificationTemplates] = useState<VerificationTemplate[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<VerificationTemplate | null>(null);

  const finalSchema = React.useMemo(() => {
    return profileSchema.superRefine((data, ctx) => {
        if (user.role === 'seller') {
            if (!data.companyName) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Company name is required.", path: ['companyName']});
            if (!data.phoneNumber) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Business phone number is required.", path: ['phoneNumber']});
            if (!data.companyDescription || data.companyDescription.length < 10) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Company description must be at least 10 characters.", path: ['companyDescription']});
            if (!data.taxId) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Tax ID / VAT number is required.", path: ['taxId']});
            if (!data.businessType) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "You must select a business type.", path: ['businessType']});
            if (!data.exportScope || data.exportScope.length === 0) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Please select at least one export scope.", path: ['exportScope']});
            if (!data.address) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Business address is required.", path: ['address'] });
        }
        if (user.role === 'buyer') {
             if (!data.shippingAddress) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Shipping address is required.", path: ['shippingAddress'] });
             if (!data.billingAddress) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Billing address is required.", path: ['billingAddress'] });
        }

        const activeCountry = user.role === 'seller' ? data.address?.country : data.shippingAddress?.country;
        const currentTemplate = verificationTemplates.find(t => t.id === activeCountry);

        if (currentTemplate) {
          currentTemplate.fields.forEach(field => {
            let isRequired = false;
            if (field.required === 'always') {
              isRequired = true;
            } else if (field.required === 'international') {
              isRequired = data.exportScope?.includes('international') ?? false;
            }

            if (isRequired && user.role === 'seller') { // Only enforce for sellers in profile for now
              const value = data.verificationDetails?.[field.name];
              if (!value || value.trim() === "") {
                ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  message: `${field.label} is required.`,
                  path: [`verificationDetails.${field.name}`],
                });
              }
            }
          });
        }
    });
  }, [user.role, verificationTemplates]);


  const form = useForm<ProfileFormData>({
    resolver: zodResolver(finalSchema),
    defaultValues: {
      name: user.name || "",
      companyName: user.companyName || "",
      phoneNumber: user.phoneNumber || "",
      address: user.address,
      shippingAddress: user.shippingAddress,
      billingAddress: user.billingAddress,
      jobTitle: user.jobTitle || "",
      companyWebsite: user.companyWebsite || "",
      companyDescription: user.companyDescription || "",
      taxId: user.taxId || "",
      businessType: user.businessType || undefined,
      exportScope: user.exportScope || [],
      verificationDetails: user.verificationDetails || {},
    },
    mode: "onChange",
  });

  const watchedCountry = useWatch({
    control: form.control,
    name: user.role === 'seller' ? 'address.country' : 'shippingAddress.country',
  });
  
  const watchedExportScope = useWatch({
    control: form.control,
    name: 'exportScope',
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
    const countryCode = watchedCountry;
    if (countryCode) {
        const availableStates = statesProvinces[countryCode] || [];
        const stateFieldName = user.role === 'seller' ? 'address.state' : 'shippingAddress.state';
        const currentState = form.getValues(stateFieldName as 'address.state');
        if (!availableStates.some(s => s.value === currentState)) {
            form.setValue(stateFieldName as 'address.state', '');
        }
        
        const template = verificationTemplates.find(t => t.id === countryCode) || null;
        setActiveTemplate(template);
    } else {
        setActiveTemplate(null);
    }
  }, [watchedCountry, form, verificationTemplates, user.role]);

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
                    <FormLabel>Your Full Name <span className="text-destructive">*</span></FormLabel>
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
                    <FormLabel>Company Name {user.role === 'seller' && <span className="text-destructive">*</span>}</FormLabel>
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
                  <FormLabel>Business Phone Number {user.role === 'seller' && <span className="text-destructive">*</span>}</FormLabel>
                  <FormControl>
                    <Input placeholder="+1 (555) 123-4567" {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             {user.role === 'buyer' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="jobTitle"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Job Title</FormLabel>
                                <FormControl>
                                <Input placeholder="e.g., Procurement Manager" {...field} value={field.value || ''} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="companyWebsite"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Company Website</FormLabel>
                                <FormControl>
                                <Input placeholder="e.g., https://www.acme.com" {...field} value={field.value || ''} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
            )}
          </CardContent>
        </Card>

        {user.role === 'buyer' && (
            <>
                <Card>
                    <CardHeader>
                        <CardTitle>Shipping Address</CardTitle>
                        <CardDescription>Your company's primary delivery location.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <AddressFields fieldName="shippingAddress" control={form.control} />
                    </CardContent>
                </Card>
                
                <Card>
                    <CardHeader>
                        <CardTitle>Billing Address</CardTitle>
                        <CardDescription>The address associated with your payment method.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <AddressFields fieldName="billingAddress" control={form.control} />
                    </CardContent>
                </Card>
            </>
        )}

        {user.role === 'seller' && (
            <Card>
                <CardHeader>
                    <CardTitle>Business Address</CardTitle>
                    <CardDescription>Your company's primary physical location.</CardDescription>
                </CardHeader>
                <CardContent>
                    <AddressFields fieldName="address" control={form.control} />
                </CardContent>
            </Card>
        )}

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
                    <FormLabel>Company Description <span className="text-destructive">*</span></FormLabel>
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
                      <FormLabel>Tax ID / VAT Number <span className="text-destructive">*</span></FormLabel>
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
                      <FormLabel>Business Type <span className="text-destructive">*</span></FormLabel>
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
                            <FormLabel className="text-base">Export Scope <span className="text-destructive">*</span></FormLabel>
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
            </CardContent>
          </Card>
        )}

        {activeTemplate && (
            <Card>
                <CardHeader>
                    <CardTitle>Business Verification ({activeTemplate.countryName})</CardTitle>
                    <CardDescription>This information is required to verify your business identity.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                {activeTemplate.fields.map(fieldTemplate => {
                    let isRequired = false;
                    if (fieldTemplate.required === 'always') {
                        isRequired = true;
                    } else if (fieldTemplate.required === 'international' && user.role === 'seller') {
                        isRequired = watchedExportScope?.includes('international') ?? false;
                    }

                    if (fieldTemplate.required === 'never') return null;

                    return (
                        <FormField
                            key={fieldTemplate.name}
                            control={form.control}
                            name={`verificationDetails.${fieldTemplate.name}` as const}
                            defaultValue={user?.verificationDetails?.[fieldTemplate.name] || ""}
                            rules={{ 
                                required: isRequired ? 'This field is required.' : false,
                                pattern: fieldTemplate.validationRegex ? {
                                    value: new RegExp(fieldTemplate.validationRegex),
                                    message: `Please enter a valid ${fieldTemplate.label}.`
                                } : undefined
                            }}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{fieldTemplate.label} {isRequired && <span className="text-destructive">*</span>}</FormLabel>
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
                    )
                })}
                </CardContent>
            </Card>
        )}

        <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground"><span className="text-destructive">*</span> Indicates a required field.</p>
            <div className="flex-grow"></div>
            <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
            </Button>
        </div>
      </form>
    </Form>
  );
}
