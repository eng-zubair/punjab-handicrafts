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
import { useToast } from "@/hooks/use-toast";
import { Check, MapPin, GraduationCap, User, FileText, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import type { SanatzarCenter, TrainingProgram, SurveyQuestion, Category } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

// Form Schema
const trainingApplySchema = z.object({
    // Step 1: Location
    district: z.string().min(1, "Please select a district"),
    centerId: z.string().min(1, "Please select a Sanatzar center"),
    programId: z.string().min(1, "Please select a training program"),
    // Step 2: Personal Info
    fullName: z.string().min(2, "Full name is required"),
    email: z.string().email("Valid email is required"),
    phone: z.string().min(10, "Valid phone number is required"),
    cnic: z.string().optional(),
    dateOfBirth: z.string().optional(),
    address: z.string().min(5, "Address is required"),
    city: z.string().min(2, "City is required"),
    education: z.string().optional(),
    priorCraftExperience: z.string().optional(),
    motivation: z.string().min(20, "Please describe your motivation"),
    // Step 3: Survey (dynamic)
    surveyResponses: z.record(z.string()).optional(),
});

type TrainingApplyFormData = z.infer<typeof trainingApplySchema>;

const steps = [
    { id: 1, title: "Select Program", icon: MapPin },
    { id: 2, title: "Personal Info", icon: User },
    { id: 3, title: "Survey & Submit", icon: FileText },
];

export default function TrainingApply() {
    const [currentStep, setCurrentStep] = useState(1);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const { toast } = useToast();

    const form = useForm<TrainingApplyFormData>({
        resolver: zodResolver(trainingApplySchema),
        defaultValues: {
            district: "",
            centerId: "",
            programId: "",
            fullName: "",
            email: "",
            phone: "",
            cnic: "",
            dateOfBirth: "",
            address: "",
            city: "",
            education: "",
            priorCraftExperience: "",
            motivation: "",
            surveyResponses: {},
        },
    });

    const selectedDistrict = form.watch("district");
    const selectedCenterId = form.watch("centerId");

    // Fetch data
    const { data: centers = [] } = useQuery<SanatzarCenter[]>({
        queryKey: ["/api/sanatzar-centers"],
    });

    const { data: categories = [] } = useQuery<Category[]>({
        queryKey: ["/api/categories"],
    });

    const { data: programs = [] } = useQuery<TrainingProgram[]>({
        queryKey: ["/api/training-programs"],
    });

    const { data: surveyQuestions = [] } = useQuery<SurveyQuestion[]>({
        queryKey: ["/api/survey-questions", "training"],
    });

    // Filter options based on selection
    const districts = useMemo(() => {
        if (categories.length > 0) {
            return categories.map(c => c.district).sort();
        }
        return Array.from(new Set(centers.map(c => c.district))).sort();
    }, [categories, centers]);

    const filteredCenters = useMemo(() => {
        return centers.filter(c => c.district === selectedDistrict && c.isActive);
    }, [centers, selectedDistrict]);

    const filteredPrograms = useMemo(() => {
        return programs.filter(p => p.centerId === selectedCenterId && (p.status === "enrolling" || p.status === "upcoming"));
    }, [programs, selectedCenterId]);

    // Submit mutation
    const submitMutation = useMutation({
        mutationFn: async (data: TrainingApplyFormData) => {
            const res = await apiRequest("POST", "/api/training/applications", data);
            return res.json();
        },
        onSuccess: () => {
            setIsSubmitted(true);
            toast({
                title: "Application Submitted!",
                description: "Your training application has been submitted successfully. You will be notified once reviewed.",
            });
        },
        onError: (error: any) => {
            toast({
                title: "Submission Failed",
                description: error.message || "Failed to submit application. Please try again.",
                variant: "destructive",
            });
        },
    });

    const onSubmit = (data: TrainingApplyFormData) => {
        submitMutation.mutate(data);
    };

    const nextStep = async () => {
        let fieldsToValidate: (keyof TrainingApplyFormData)[] = [];

        if (currentStep === 1) {
            fieldsToValidate = ["district", "centerId", "programId"];
        } else if (currentStep === 2) {
            fieldsToValidate = ["fullName", "email", "phone", "address", "city", "motivation"];
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
                            <CardTitle>Application Submitted!</CardTitle>
                            <CardDescription>
                                Thank you for applying for training. We will review your application and contact you soon.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button asChild className="w-full">
                                <a href="/training">Back to Training Home</a>
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
                        <h1 className="text-2xl md:text-3xl font-bold mb-2">Apply for Training</h1>
                        <p className="text-white/90">Join our artisan training program and start your journey</p>
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
                                        <div className={`w-12 sm:w-24 h-1 mx-2 rounded ${currentStep > step.id ? "bg-primary" : "bg-muted"}`} />
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
                            {/* Step 1: Select Program */}
                            {currentStep === 1 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <MapPin className="w-5 h-5" />
                                            Select Training Program
                                        </CardTitle>
                                        <CardDescription>
                                            Choose your district, Sanatzar center, and desired training program
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <FormField
                                            control={form.control}
                                            name="district"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>District *</FormLabel>
                                                    <Select onValueChange={(val) => { field.onChange(val); form.setValue("centerId", ""); form.setValue("programId", ""); }} value={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select your district" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {districts.map(d => (
                                                                <SelectItem key={d} value={d}>{d}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        {selectedDistrict && (
                                            <FormField
                                                control={form.control}
                                                name="centerId"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Sanatzar Center *</FormLabel>
                                                        <Select onValueChange={(val) => { field.onChange(val); form.setValue("programId", ""); }} value={field.value}>
                                                            <FormControl>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Select a center" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                {filteredCenters.map(c => (
                                                                    <SelectItem key={c.id} value={c.id}>{c.name} - {c.city}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        )}

                                        {selectedCenterId && (
                                            <FormField
                                                control={form.control}
                                                name="programId"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Training Program *</FormLabel>
                                                        {filteredPrograms.length === 0 ? (
                                                            <p className="text-sm text-muted-foreground">No programs currently available at this center.</p>
                                                        ) : (
                                                            <RadioGroup onValueChange={field.onChange} value={field.value} className="grid gap-4">
                                                                {filteredPrograms.map(p => (
                                                                    <div key={p.id} className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer hover:bg-muted/50 ${field.value === p.id ? "border-primary bg-primary/5" : ""}`} onClick={() => field.onChange(p.id)}>
                                                                        <RadioGroupItem value={p.id} id={p.id} />
                                                                        <div className="flex-1">
                                                                            <div className="flex items-center gap-2 mb-1">
                                                                                <span className="font-medium">{p.title}</span>
                                                                                <Badge variant="secondary">{p.craft}</Badge>
                                                                                <Badge variant="outline" className="text-green-600">{p.status}</Badge>
                                                                            </div>
                                                                            <p className="text-sm text-muted-foreground">
                                                                                {p.durationWeeks} weeks • {p.skillLevel} level
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </RadioGroup>
                                                        )}
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        )}
                                    </CardContent>
                                </Card>
                            )}

                            {/* Step 2: Personal Info */}
                            {currentStep === 2 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <User className="w-5 h-5" />
                                            Personal Information
                                        </CardTitle>
                                        <CardDescription>
                                            Tell us about yourself
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <FormField control={form.control} name="fullName" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Full Name *</FormLabel>
                                                    <FormControl><Input placeholder="Your full name" {...field} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                            <FormField control={form.control} name="phone" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Phone *</FormLabel>
                                                    <FormControl><Input placeholder="03XX-XXXXXXX" {...field} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                        </div>
                                        <FormField control={form.control} name="email" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Email *</FormLabel>
                                                <FormControl><Input type="email" placeholder="your@email.com" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <FormField control={form.control} name="cnic" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>CNIC (Optional)</FormLabel>
                                                    <FormControl><Input placeholder="XXXXX-XXXXXXX-X" {...field} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                            <FormField control={form.control} name="dateOfBirth" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Date of Birth (Optional)</FormLabel>
                                                    <FormControl><Input type="date" {...field} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                        </div>
                                        <FormField control={form.control} name="address" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Address *</FormLabel>
                                                <FormControl><Input placeholder="Your complete address" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="city" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>City *</FormLabel>
                                                <FormControl><Input placeholder="Your city" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="education" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Education</FormLabel>
                                                <FormControl><Input placeholder="Your education level" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="priorCraftExperience" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Prior Craft Experience</FormLabel>
                                                <FormControl><Textarea placeholder="Any prior experience with handicrafts..." {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="motivation" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Motivation *</FormLabel>
                                                <FormControl><Textarea placeholder="Why do you want to join this training program?" className="min-h-[100px]" {...field} /></FormControl>
                                                <FormDescription>Minimum 20 characters</FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                    </CardContent>
                                </Card>
                            )}

                            {/* Step 3: Survey */}
                            {currentStep === 3 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <FileText className="w-5 h-5" />
                                            Survey & Submit
                                        </CardTitle>
                                        <CardDescription>
                                            Please answer these questions to help us understand you better
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {surveyQuestions.filter(q => q.isActive).map(question => (
                                            <FormField
                                                key={question.id}
                                                control={form.control}
                                                name={`surveyResponses.${question.id}`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>{question.question} {question.required && "*"}</FormLabel>
                                                        <FormControl>
                                                            {question.questionType === "textarea" ? (
                                                                <Textarea {...field} />
                                                            ) : question.questionType === "select" || question.questionType === "radio" ? (
                                                                <Select onValueChange={field.onChange} value={field.value}>
                                                                    <SelectTrigger>
                                                                        <SelectValue placeholder="Select an option" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        {(question.options as string[] || []).map((opt: string) => (
                                                                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            ) : (
                                                                <Input {...field} />
                                                            )}
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        ))}
                                        {surveyQuestions.length === 0 && (
                                            <p className="text-muted-foreground text-center py-4">No survey questions configured.</p>
                                        )}
                                        <div className="pt-4 border-t">
                                            <p className="text-sm text-muted-foreground mb-4">
                                                By submitting this application, you agree to our terms and conditions. Your application will be reviewed and you will receive a notification once processed.
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Navigation */}
                            <div className="flex justify-between mt-6">
                                <Button type="button" variant="outline" onClick={prevStep} disabled={currentStep === 1}>
                                    <ArrowLeft className="w-4 h-4 mr-2" />
                                    Previous
                                </Button>
                                {currentStep < steps.length ? (
                                    <Button type="button" onClick={nextStep}>
                                        Next
                                        <ArrowRight className="w-4 h-4 ml-2" />
                                    </Button>
                                ) : (
                                    <Button type="submit" disabled={submitMutation.isPending}>
                                        {submitMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                        Submit Application
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
