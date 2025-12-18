import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Check, MapPin, User, Briefcase, FileText, ArrowLeft, ArrowRight, Loader2, Wallet } from "lucide-react";
import type { SanatzarCenter, SurveyQuestion, Category } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

// Form Schema
const artisanRegisterSchema = z.object({
    // Step 1: Location
    district: z.string().min(1, "Please select a district"),
    centerId: z.string().min(1, "Please select a Sanatzar center"),
    // Step 2: Work Preference
    workPreference: z.string().min(1, "Please select work preference"),
    availabilityHours: z.string().optional(),
    availableDays: z.array(z.string()).optional(),
    // Step 3: Personal Info
    fullName: z.string().min(2, "Full name is required"),
    email: z.string().email("Valid email is required"),
    phone: z.string().min(10, "Valid phone number is required"),
    cnic: z.string().optional(),
    dateOfBirth: z.string().optional(),
    address: z.string().min(5, "Address is required"),
    city: z.string().min(2, "City is required"),
    bio: z.string().min(20, "Please write a brief bio"),
    education: z.string().optional(),
    languages: z.array(z.string()).optional(),
    // Expertise
    primaryCraft: z.string().min(1, "Please select your primary craft"),
    craftsKnown: z.array(z.string()).optional(),
    skillLevel: z.string().min(1, "Please select skill level"),
    yearsExperience: z.string().optional(),
    // Payment
    paymentMethod: z.string().optional(),
    paymentDetails: z.string().optional(),
    // Survey
    surveyResponses: z.record(z.string()).optional(),
});

type ArtisanRegisterFormData = z.infer<typeof artisanRegisterSchema>;

const steps = [
    { id: 1, title: "Location", icon: MapPin },
    { id: 2, title: "Work Preference", icon: Briefcase },
    { id: 3, title: "Profile", icon: User },
    { id: 4, title: "Payment & Submit", icon: Wallet },
];

const workPreferences = [
    { value: "remote", label: "Remote", desc: "Work from home on assigned tasks" },
    { value: "center", label: "At Center", desc: "Work on-site at Sanatzar center" },
    { value: "both", label: "Both", desc: "Flexible between remote and center" },
    { value: "part-time", label: "Part-time", desc: "Limited hours per week" },
    { value: "full-time", label: "Full-time", desc: "Full working hours" },
];

const crafts = [
    "Blue Pottery", "Camel Skin Art", "Phulkari Embroidery", "Ralli Quilts",
    "Handloom Weaving", "Wood Carving", "Brass Work", "Leather Craft",
    "Ajrak Printing", "Truck Art", "Needlework", "Crochet", "Other"
];

const skillLevels = ["Beginner", "Intermediate", "Advanced", "Master"];
const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const languages = ["Urdu", "Punjabi", "English", "Sindhi", "Pashto", "Saraiki"];

export default function ArtisanRegister() {
    const [currentStep, setCurrentStep] = useState(1);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const { toast } = useToast();

    const form = useForm<ArtisanRegisterFormData>({
        resolver: zodResolver(artisanRegisterSchema),
        defaultValues: {
            district: "",
            centerId: "",
            workPreference: "",
            availabilityHours: "",
            availableDays: [],
            fullName: "",
            email: "",
            phone: "",
            cnic: "",
            dateOfBirth: "",
            address: "",
            city: "",
            bio: "",
            education: "",
            languages: [],
            primaryCraft: "",
            craftsKnown: [],
            skillLevel: "",
            yearsExperience: "",
            paymentMethod: "",
            paymentDetails: "",
            surveyResponses: {},
        },
    });

    const selectedDistrict = form.watch("district");

    // Fetch data
    const { data: centers = [] } = useQuery<SanatzarCenter[]>({
        queryKey: ["/api/sanatzar-centers"],
    });

    const { data: categories = [] } = useQuery<Category[]>({
        queryKey: ["/api/categories"],
    });

    const { data: surveyQuestions = [] } = useQuery<SurveyQuestion[]>({
        queryKey: ["/api/survey-questions", "artisan"],
    });

    // Filter options
    const districts = useMemo(() => {
        // Use categories as source of truth, fallback to centers if empty (for backward compat)
        if (categories.length > 0) {
            return categories.map(c => c.district).sort();
        }
        return Array.from(new Set(centers.map(c => c.district))).sort();
    }, [categories, centers]);

    const filteredCenters = useMemo(() => {
        return centers.filter(c => c.district === selectedDistrict && c.isActive);
    }, [centers, selectedDistrict]);

    // Submit mutation
    const submitMutation = useMutation({
        mutationFn: async (data: ArtisanRegisterFormData) => {
            const res = await apiRequest("POST", "/api/artisan-registrations", data);
            return res.json();
        },
        onSuccess: () => {
            setIsSubmitted(true);
            toast({
                title: "Registration Submitted!",
                description: "Your artisan registration has been submitted. You will be notified once approved.",
            });
        },
        onError: (error: any) => {
            toast({
                title: "Submission Failed",
                description: error.message || "Failed to submit. Please try again.",
                variant: "destructive",
            });
        },
    });

    const onSubmit = (data: ArtisanRegisterFormData) => {
        submitMutation.mutate(data);
    };

    const nextStep = async () => {
        let fieldsToValidate: (keyof ArtisanRegisterFormData)[] = [];

        if (currentStep === 1) {
            fieldsToValidate = ["district", "centerId"];
        } else if (currentStep === 2) {
            fieldsToValidate = ["workPreference"];
        } else if (currentStep === 3) {
            fieldsToValidate = ["fullName", "email", "phone", "address", "city", "bio", "primaryCraft", "skillLevel"];
        }

        const isValid = await form.trigger(fieldsToValidate);
        if (isValid) {
            setCurrentStep(prev => Math.min(prev + 1, steps.length));
        }
    };

    const prevStep = () => {
        setCurrentStep(prev => Math.max(prev - 1, 1));
    };

    if (isSubmitted) {
        return (
            <div className="min-h-screen flex flex-col">
                <Header />
                <main className="flex-1 flex items-center justify-center py-12 px-4">
                    <Card className="max-w-md w-full text-center">
                        <CardHeader>
                            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                                <Check className="w-8 h-8 text-green-600" />
                            </div>
                            <CardTitle>Registration Submitted!</CardTitle>
                            <CardDescription>
                                Thank you for registering as an artisan. We will review your profile and contact you soon with work opportunities.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button asChild className="w-full">
                                <a href="/">Back to Home</a>
                            </Button>
                        </CardContent>
                    </Card>
                </main>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col">
            <Header />

            <main className="flex-1 bg-muted/30">
                {/* Header */}
                <section className="bg-gradient-to-r from-amber-600 to-orange-500 text-white py-8">
                    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                        <h1 className="text-2xl md:text-3xl font-bold mb-2">Register as Artisan</h1>
                        <p className="text-white/90">Join our artisan network and start earning from your craft skills</p>
                    </div>
                </section>

                {/* Steps Indicator */}
                <div className="border-b bg-card">
                    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                        <div className="flex justify-between">
                            {steps.map((step, i) => (
                                <div key={step.id} className="flex items-center">
                                    <div className={`flex items-center gap-2 ${currentStep >= step.id ? "text-primary" : "text-muted-foreground"}`}>
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= step.id ? "bg-primary text-white" : "bg-muted"}`}>
                                            {currentStep > step.id ? <Check className="w-4 h-4" /> : step.id}
                                        </div>
                                        <span className="hidden sm:inline text-sm font-medium">{step.title}</span>
                                    </div>
                                    {i < steps.length - 1 && (
                                        <div className={`w-8 sm:w-16 h-1 mx-2 rounded ${currentStep > step.id ? "bg-primary" : "bg-muted"}`} />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Form */}
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)}>
                            {/* Step 1: Location */}
                            {currentStep === 1 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2"><MapPin className="w-5 h-5" />Select Location</CardTitle>
                                        <CardDescription>Choose your preferred Sanatzar center</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <FormField control={form.control} name="district" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>District *</FormLabel>
                                                <Select onValueChange={(val) => { field.onChange(val); form.setValue("centerId", ""); }} value={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Select your district" /></SelectTrigger></FormControl>
                                                    <SelectContent>{districts.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        {selectedDistrict && (
                                            <FormField control={form.control} name="centerId" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Sanatzar Center *</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl><SelectTrigger><SelectValue placeholder="Select a center" /></SelectTrigger></FormControl>
                                                        <SelectContent>{filteredCenters.map(c => <SelectItem key={c.id} value={c.id}>{c.name} - {c.city}</SelectItem>)}</SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                        )}
                                    </CardContent>
                                </Card>
                            )}

                            {/* Step 2: Work Preference */}
                            {currentStep === 2 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2"><Briefcase className="w-5 h-5" />Work Preference</CardTitle>
                                        <CardDescription>How would you like to work with us?</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <FormField control={form.control} name="workPreference" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Work Type *</FormLabel>
                                                <RadioGroup onValueChange={field.onChange} value={field.value} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {workPreferences.map(wp => (
                                                        <div key={wp.value} className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer hover:bg-muted/50 ${field.value === wp.value ? "border-primary bg-primary/5" : ""}`} onClick={() => field.onChange(wp.value)}>
                                                            <RadioGroupItem value={wp.value} id={wp.value} className="mt-1" />
                                                            <div>
                                                                <span className="font-medium">{wp.label}</span>
                                                                <p className="text-sm text-muted-foreground">{wp.desc}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </RadioGroup>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="availabilityHours" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Hours per Week</FormLabel>
                                                <FormControl><Input type="number" placeholder="e.g., 20" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="availableDays" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Available Days</FormLabel>
                                                <div className="flex flex-wrap gap-2">
                                                    {daysOfWeek.map(day => (
                                                        <Badge key={day} variant={(field.value || []).includes(day) ? "default" : "outline"} className="cursor-pointer" onClick={() => {
                                                            const current = field.value || [];
                                                            field.onChange(current.includes(day) ? current.filter(d => d !== day) : [...current, day]);
                                                        }}>{day.slice(0, 3)}</Badge>
                                                    ))}
                                                </div>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                    </CardContent>
                                </Card>
                            )}

                            {/* Step 3: Profile */}
                            {currentStep === 3 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2"><User className="w-5 h-5" />Profile Information</CardTitle>
                                        <CardDescription>Tell us about yourself and your skills</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <FormField control={form.control} name="fullName" render={({ field }) => (
                                                <FormItem><FormLabel>Full Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                            )} />
                                            <FormField control={form.control} name="phone" render={({ field }) => (
                                                <FormItem><FormLabel>Phone *</FormLabel><FormControl><Input placeholder="03XX-XXXXXXX" {...field} /></FormControl><FormMessage /></FormItem>
                                            )} />
                                        </div>
                                        <FormField control={form.control} name="email" render={({ field }) => (
                                            <FormItem><FormLabel>Email *</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                        <FormField control={form.control} name="address" render={({ field }) => (
                                            <FormItem><FormLabel>Address *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                        <FormField control={form.control} name="city" render={({ field }) => (
                                            <FormItem><FormLabel>City *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                        <FormField control={form.control} name="bio" render={({ field }) => (
                                            <FormItem><FormLabel>Bio *</FormLabel><FormControl><Textarea placeholder="Brief introduction about yourself..." className="min-h-[80px]" {...field} /></FormControl><FormDescription>Min 20 characters</FormDescription><FormMessage /></FormItem>
                                        )} />
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <FormField control={form.control} name="primaryCraft" render={({ field }) => (
                                                <FormItem><FormLabel>Primary Craft *</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl><SelectTrigger><SelectValue placeholder="Select craft" /></SelectTrigger></FormControl>
                                                        <SelectContent>{crafts.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                                                    </Select><FormMessage /></FormItem>
                                            )} />
                                            <FormField control={form.control} name="skillLevel" render={({ field }) => (
                                                <FormItem><FormLabel>Skill Level *</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl><SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger></FormControl>
                                                        <SelectContent>{skillLevels.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                                                    </Select><FormMessage /></FormItem>
                                            )} />
                                        </div>
                                        <FormField control={form.control} name="yearsExperience" render={({ field }) => (
                                            <FormItem><FormLabel>Years of Experience</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                    </CardContent>
                                </Card>
                            )}

                            {/* Step 4: Payment & Submit */}
                            {currentStep === 4 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2"><Wallet className="w-5 h-5" />Payment & Survey</CardTitle>
                                        <CardDescription>Setup payment and complete survey</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <FormField control={form.control} name="paymentMethod" render={({ field }) => (
                                            <FormItem><FormLabel>Payment Method</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="bank">Bank Account</SelectItem>
                                                        <SelectItem value="jazzcash">JazzCash</SelectItem>
                                                        <SelectItem value="easypaisa">EasyPaisa</SelectItem>
                                                    </SelectContent>
                                                </Select><FormMessage /></FormItem>
                                        )} />
                                        <FormField control={form.control} name="paymentDetails" render={({ field }) => (
                                            <FormItem><FormLabel>Account Details</FormLabel><FormControl><Input placeholder="Account number or phone" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                        {surveyQuestions.filter(q => q.isActive).length > 0 && (
                                            <div className="pt-4 border-t">
                                                <h4 className="font-medium mb-4">Survey Questions</h4>
                                                {surveyQuestions.filter(q => q.isActive).map(question => (
                                                    <FormField key={question.id} control={form.control} name={`surveyResponses.${question.id}`} render={({ field }) => (
                                                        <FormItem className="mb-4">
                                                            <FormLabel>{question.question} {question.required && "*"}</FormLabel>
                                                            <FormControl>
                                                                {question.questionType === "textarea" ? <Textarea {...field} /> : <Input {...field} />}
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )} />
                                                ))}
                                            </div>
                                        )}
                                        <p className="text-sm text-muted-foreground">By submitting, you agree to our terms. Your registration will be reviewed.</p>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Navigation */}
                            <div className="flex justify-between mt-6">
                                <Button type="button" variant="outline" onClick={prevStep} disabled={currentStep === 1}>
                                    <ArrowLeft className="w-4 h-4 mr-2" />Previous
                                </Button>
                                {currentStep < steps.length ? (
                                    <Button type="button" onClick={nextStep}>Next<ArrowRight className="w-4 h-4 ml-2" /></Button>
                                ) : (
                                    <Button type="submit" disabled={submitMutation.isPending}>
                                        {submitMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Submit Registration
                                    </Button>
                                )}
                            </div>
                        </form>
                    </Form>
                </div>
            </main>
            <Footer />
        </div>
    );
}
