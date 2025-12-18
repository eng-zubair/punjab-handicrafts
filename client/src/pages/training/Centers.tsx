import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Phone, Mail, Users, GraduationCap } from "lucide-react";
import type { SanatzarCenter } from "@shared/schema";

export default function TrainingCenters() {
    const { data: centers = [], isLoading } = useQuery<SanatzarCenter[]>({
        queryKey: ["/api/sanatzar-centers"],
    });

    // Group centers by district
    const centersByDistrict = centers.reduce((acc, center) => {
        if (!acc[center.district]) {
            acc[center.district] = [];
        }
        acc[center.district].push(center);
        return acc;
    }, {} as Record<string, SanatzarCenter[]>);

    const districts = Object.keys(centersByDistrict).sort();

    return (
        <div className="min-h-screen flex flex-col">
            <Header />

            <main className="flex-1">
                {/* Page Header */}
                <section className="bg-gradient-to-r from-amber-600 to-orange-500 text-white py-12">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <h1 className="text-3xl md:text-4xl font-bold mb-4">Sanatzar Training Centers</h1>
                        <p className="text-lg text-white/90">
                            44+ training facilities across Punjab districts
                        </p>
                    </div>
                </section>

                {/* Centers by District */}
                <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {isLoading ? (
                        <div className="space-y-8">
                            {[1, 2, 3].map((i) => (
                                <div key={i}>
                                    <div className="h-8 w-48 bg-muted/50 rounded mb-4 animate-pulse" />
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {[1, 2, 3].map((j) => (
                                            <div key={j} className="h-48 bg-muted/50 rounded-lg animate-pulse" />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : centers.length === 0 ? (
                        <Card className="p-12 text-center">
                            <MapPin className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                            <CardTitle className="mb-2">No Centers Available</CardTitle>
                            <CardDescription>
                                Training centers coming soon. Check back later!
                            </CardDescription>
                        </Card>
                    ) : (
                        <div className="space-y-12">
                            {districts.map((district) => (
                                <div key={district}>
                                    <div className="flex items-center gap-2 mb-6">
                                        <h2 className="text-2xl font-bold">{district}</h2>
                                        <Badge variant="secondary">{centersByDistrict[district].length} center(s)</Badge>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {centersByDistrict[district].map((center) => (
                                            <Card key={center.id} className="hover:shadow-lg transition-shadow">
                                                <CardHeader>
                                                    <div className="flex items-start justify-between">
                                                        <div>
                                                            <CardTitle className="text-lg">{center.name}</CardTitle>
                                                            <CardDescription className="flex items-center gap-1 mt-1">
                                                                <MapPin className="w-4 h-4" />
                                                                {center.city}
                                                            </CardDescription>
                                                        </div>
                                                        {center.isActive ? (
                                                            <Badge className="bg-green-100 text-green-700">Active</Badge>
                                                        ) : (
                                                            <Badge variant="secondary">Inactive</Badge>
                                                        )}
                                                    </div>
                                                </CardHeader>
                                                <CardContent>
                                                    {center.description && (
                                                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                                                            {center.description}
                                                        </p>
                                                    )}
                                                    <div className="space-y-2 text-sm">
                                                        {center.capacity && (
                                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                                <Users className="w-4 h-4" />
                                                                Capacity: {center.capacity} trainees
                                                            </div>
                                                        )}
                                                        {center.phone && (
                                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                                <Phone className="w-4 h-4" />
                                                                {center.phone}
                                                            </div>
                                                        )}
                                                        {center.email && (
                                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                                <Mail className="w-4 h-4" />
                                                                {center.email}
                                                            </div>
                                                        )}
                                                    </div>
                                                    {center.facilities && center.facilities.length > 0 && (
                                                        <div className="flex flex-wrap gap-1 mt-4">
                                                            {center.facilities.slice(0, 3).map((facility, i) => (
                                                                <Badge key={i} variant="outline" className="text-xs">
                                                                    {facility}
                                                                </Badge>
                                                            ))}
                                                            {center.facilities.length > 3 && (
                                                                <Badge variant="outline" className="text-xs">
                                                                    +{center.facilities.length - 3} more
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    )}
                                                    <Link href={`/training/centers/${center.id}`}>
                                                        <Button variant="outline" className="w-full mt-4">
                                                            <GraduationCap className="w-4 h-4 mr-2" />
                                                            View Programs
                                                        </Button>
                                                    </Link>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </main>

            <Footer />
        </div>
    );
}
