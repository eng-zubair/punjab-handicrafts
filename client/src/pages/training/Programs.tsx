import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { GraduationCap, Clock, Users, MapPin, Calendar } from "lucide-react";
import type { TrainingProgram, SanatzarCenter } from "@shared/schema";

export default function TrainingPrograms() {
    const [districtFilter, setDistrictFilter] = useState<string>("all");
    const [craftFilter, setCraftFilter] = useState<string>("all");
    const [statusFilter, setStatusFilter] = useState<string>("all");

    const { data: programs = [], isLoading } = useQuery<TrainingProgram[]>({
        queryKey: ["/api/training-programs"],
    });

    const { data: centers = [] } = useQuery<SanatzarCenter[]>({
        queryKey: ["/api/sanatzar-centers"],
    });
    // Get unique values for filters
    const districts = Array.from(new Set(centers.map(c => c.district))).sort();
    const crafts = Array.from(new Set(programs.map(p => p.craft))).sort();
    const statuses = ["upcoming", "enrolling", "ongoing", "completed"];

    // Filter programs
    const filteredPrograms = programs.filter(program => {
        const center = centers.find(c => c.id === program.centerId);
        if (districtFilter !== "all" && center?.district !== districtFilter) return false;
        if (craftFilter !== "all" && program.craft !== craftFilter) return false;
        if (statusFilter !== "all" && program.status !== statusFilter) return false;
        return true;
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case "enrolling": return "text-green-600 border-green-600";
            case "upcoming": return "text-blue-600 border-blue-600";
            case "ongoing": return "text-orange-600 border-orange-600";
            case "completed": return "text-gray-500 border-gray-500";
            default: return "";
        }
    };

    return (
        <div className="min-h-screen flex flex-col">
            <Header />

            <main className="flex-1">
                {/* Page Header */}
                <section className="bg-gradient-to-r from-amber-600 to-orange-500 text-white py-12">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <h1 className="text-3xl md:text-4xl font-bold mb-4">Training Programs</h1>
                        <p className="text-lg text-white/90">
                            Browse all available training programs across Sanatzar centers
                        </p>
                    </div>
                </section>

                {/* Filters */}
                <section className="border-b bg-card">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                        <div className="flex flex-wrap gap-4">
                            <Select value={districtFilter} onValueChange={setDistrictFilter}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="District" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Districts</SelectItem>
                                    {districts.map(d => (
                                        <SelectItem key={d} value={d}>{d}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={craftFilter} onValueChange={setCraftFilter}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Craft Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Crafts</SelectItem>
                                    {crafts.map(c => (
                                        <SelectItem key={c} value={c}>{c}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    {statuses.map(s => (
                                        <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </section>

                {/* Programs Grid */}
                <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {isLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <div key={i} className="h-72 bg-muted/50 rounded-lg animate-pulse" />
                            ))}
                        </div>
                    ) : filteredPrograms.length === 0 ? (
                        <Card className="p-12 text-center">
                            <GraduationCap className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                            <CardTitle className="mb-2">No Programs Found</CardTitle>
                            <CardDescription>
                                {programs.length === 0
                                    ? "No training programs available yet. Check back soon!"
                                    : "Try adjusting your filters to see more programs."}
                            </CardDescription>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredPrograms.map((program) => {
                                const center = centers.find(c => c.id === program.centerId);
                                return (
                                    <Card key={program.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                                        <div className="h-32 bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                                            <GraduationCap className="w-12 h-12 text-amber-600/50" />
                                        </div>
                                        <CardHeader className="pb-2">
                                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                <Badge variant="secondary">{program.craft}</Badge>
                                                <Badge variant="outline" className={getStatusColor(program.status)}>
                                                    {program.status}
                                                </Badge>
                                                <Badge variant="outline">{program.skillLevel}</Badge>
                                            </div>
                                            <CardTitle className="text-lg line-clamp-2">{program.title}</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            {center && (
                                                <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                                                    <MapPin className="w-4 h-4" />
                                                    {center.name}, {center.district}
                                                </div>
                                            )}
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
                                            {program.startDate && (
                                                <div className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
                                                    <Calendar className="w-4 h-4" />
                                                    Starts: {new Date(program.startDate).toLocaleDateString()}
                                                </div>
                                            )}
                                            <Link href={`/training/programs/${program.id}`}>
                                                <Button className="w-full" variant={program.status === "enrolling" ? "default" : "outline"}>
                                                    {program.status === "enrolling" ? "Apply Now" : "View Details"}
                                                </Button>
                                            </Link>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </section>
            </main>

            <Footer />
        </div>
    );
}
