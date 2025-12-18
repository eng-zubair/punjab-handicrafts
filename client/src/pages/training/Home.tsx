import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, GraduationCap, MapPin, Users, Award, Clock, Briefcase } from "lucide-react";
import type { SanatzarCenter, TrainingProgram } from "@shared/schema";

export default function TrainingHome() {
    const { data: centers = [], isLoading: centersLoading } = useQuery<SanatzarCenter[]>({
        queryKey: ["/api/sanatzar-centers"],
    });

    const { data: programs = [], isLoading: programsLoading } = useQuery<TrainingProgram[]>({
        queryKey: ["/api/training-programs", { status: "enrolling" }],
    });
    const isLoading = centersLoading || programsLoading;

    return (
        <div className="min-h-screen flex flex-col">
            <Header />

            {/* Hero Section */}
            <section className="relative bg-gradient-to-br from-amber-600 via-orange-500 to-rose-500 text-white py-20 md:py-32">
                <div className="absolute inset-0 bg-black/20" />
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <Badge className="mb-4 bg-white/20 text-white border-white/30 hover:bg-white/30">
                        <GraduationCap className="w-4 h-4 mr-2" />
                        Artisan Training Programs
                    </Badge>
                    <h1 className="text-4xl md:text-6xl font-bold mb-6">
                        Empowering Women Through<br />Traditional Crafts
                    </h1>
                    <p className="text-lg md:text-xl text-white/90 max-w-3xl mx-auto mb-8">
                        Join our on-site training programs at Sanatzar centers across Punjab.
                        Learn traditional handicrafts from master artisans and start earning.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link href="/training/programs">
                            <Button size="lg" className="bg-white text-orange-600 hover:bg-white/90">
                                Explore Programs
                                <ArrowRight className="ml-2 w-5 h-5" />
                            </Button>
                        </Link>
                        <Link href="/artisan/register">
                            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                                Register as Artisan
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section className="py-16 bg-muted/30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                        <div>
                            <div className="text-4xl font-bold text-primary mb-2">44+</div>
                            <div className="text-muted-foreground">Training Centers</div>
                        </div>
                        <div>
                            <div className="text-4xl font-bold text-primary mb-2">20+</div>
                            <div className="text-muted-foreground">Craft Programs</div>
                        </div>
                        <div>
                            <div className="text-4xl font-bold text-primary mb-2">1000+</div>
                            <div className="text-muted-foreground">Trained Artisans</div>
                        </div>
                        <div>
                            <div className="text-4xl font-bold text-primary mb-2">36</div>
                            <div className="text-muted-foreground">Districts Covered</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section className="py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold mb-4">How It Works</h2>
                        <p className="text-muted-foreground max-w-2xl mx-auto">
                            Your journey from trainee to professional artisan in 4 simple steps
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        {[
                            { icon: MapPin, title: "1. Choose Center", desc: "Select a Sanatzar center near you" },
                            { icon: GraduationCap, title: "2. Apply for Training", desc: "Enroll in your preferred craft program" },
                            { icon: Award, title: "3. Complete Training", desc: "Learn from master artisans" },
                            { icon: Briefcase, title: "4. Start Earning", desc: "Register as artisan and get paid work" },
                        ].map((step, i) => (
                            <Card key={i} className="text-center border-2 hover:border-primary/50 transition-colors">
                                <CardHeader>
                                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                                        <step.icon className="w-8 h-8 text-primary" />
                                    </div>
                                    <CardTitle className="text-lg">{step.title}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <CardDescription>{step.desc}</CardDescription>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* Featured Programs */}
            <section className="py-16 bg-muted/30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-3xl font-bold mb-2">Featured Programs</h2>
                            <p className="text-muted-foreground">Currently enrolling for new batches</p>
                        </div>
                        <Link href="/training/programs">
                            <Button variant="ghost">
                                View All
                                <ArrowRight className="ml-2 w-4 h-4" />
                            </Button>
                        </Link>
                    </div>
                    {isLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="h-64 bg-muted/50 rounded-lg animate-pulse" />
                            ))}
                        </div>
                    ) : programs.length === 0 ? (
                        <Card className="p-8 text-center">
                            <CardDescription>No programs currently enrolling. Check back soon!</CardDescription>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {programs.slice(0, 3).map((program) => (
                                <Card key={program.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                                    <div className="h-40 bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                                        <GraduationCap className="w-16 h-16 text-amber-600/50" />
                                    </div>
                                    <CardHeader>
                                        <div className="flex items-center gap-2 mb-2">
                                            <Badge variant="secondary">{program.craft}</Badge>
                                            <Badge variant="outline" className="text-green-600 border-green-600">
                                                Enrolling
                                            </Badge>
                                        </div>
                                        <CardTitle className="text-lg">{program.title}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-4 h-4" />
                                                {program.durationWeeks} weeks
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Users className="w-4 h-4" />
                                                {program.batchSize} seats
                                            </span>
                                        </div>
                                        <Link href={`/training/programs/${program.id}`}>
                                            <Button className="w-full">Apply Now</Button>
                                        </Link>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* Training Centers Overview */}
            <section className="py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-3xl font-bold mb-2">Sanatzar Centers</h2>
                            <p className="text-muted-foreground">Training facilities across Punjab</p>
                        </div>
                        <Link href="/training/centers">
                            <Button variant="ghost">
                                View All Centers
                                <ArrowRight className="ml-2 w-4 h-4" />
                            </Button>
                        </Link>
                    </div>
                    {centersLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="h-32 bg-muted/50 rounded-lg animate-pulse" />
                            ))}
                        </div>
                    ) : centers.length === 0 ? (
                        <Card className="p-8 text-center">
                            <CardDescription>No centers available yet. Coming soon!</CardDescription>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {centers.slice(0, 4).map((center) => (
                                <Link key={center.id} href={`/training/centers/${center.id}`}>
                                    <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-base">{center.name}</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                <MapPin className="w-4 h-4" />
                                                {center.district}, {center.city}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-16 bg-gradient-to-r from-amber-600 to-orange-500 text-white">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-3xl font-bold mb-4">Ready to Start Your Journey?</h2>
                    <p className="text-lg text-white/90 mb-8">
                        Join thousands of women who have transformed their lives through our artisan training programs.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link href="/training/apply">
                            <Button size="lg" className="bg-white text-orange-600 hover:bg-white/90">
                                Apply for Training
                            </Button>
                        </Link>
                        <Link href="/artisan/register">
                            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                                Already Trained? Register to Work
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
}
