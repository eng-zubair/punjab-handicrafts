import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress as ProgressBar } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
import { useLocation, useParams, Link } from "wouter";

type Application = {
  id: string;
  programId: string;
  status: string;
  createdAt: string;
  acceptedAt?: string | null;
  enrolledAt?: string | null;
  completedAt?: string | null;
};

type Program = {
  id: string;
  title: string;
  durationWeeks: number;
};

type TraineeProgress = {
  id: string;
  applicationId: string;
  milestones?: any;
  completionPercent: number;
  attendancePercent: number;
  grade?: string | null;
  updatedAt: string;
};

export default function TrainingProgress() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/training/apply");
    }
  }, [isAuthenticated, setLocation]);

  const { data: applications = [] } = useQuery<Application[]>({
    queryKey: ["/api/training/applications/me"],
    enabled: isAuthenticated,
  });

  const { data: programs = [] } = useQuery<Program[]>({
    queryKey: ["/api/training/programs"],
    enabled: isAuthenticated,
  });

  const { data: progress, isLoading, isError } = useQuery<TraineeProgress | null>({
    queryKey: [`/api/training/progress/${id}`],
    enabled: isAuthenticated && !!id,
  });

  const application = applications.find(a => a.id === id);
  const program = application ? programs.find(p => p.id === application.programId) : undefined;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-muted/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Training Progress</h1>
              <p className="text-muted-foreground">
                Track your training completion and attendance for this application
              </p>
            </div>
            <Link href="/trainee/dashboard">
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
          </div>

          {isLoading && (
            <Card>
              <CardContent className="py-8">
                <p className="text-muted-foreground text-center">Loading progress...</p>
              </CardContent>
            </Card>
          )}

          {(!id || isError || (!isLoading && !progress)) && !isLoading && (
            <Card>
              <CardContent className="py-8 space-y-4 text-center">
                <p className="text-muted-foreground">
                  Progress data is not available for this application.
                </p>
                <Link href="/trainee/dashboard">
                  <Button>Back to Dashboard</Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {progress && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {program?.title || "Training Program"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Completion</span>
                        <span className="text-sm font-semibold">
                          {progress.completionPercent}%
                        </span>
                      </div>
                      <ProgressBar value={progress.completionPercent} />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Attendance</span>
                        <span className="text-sm font-semibold">
                          {progress.attendancePercent}%
                        </span>
                      </div>
                      <ProgressBar value={progress.attendancePercent} />
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <div className="text-sm text-muted-foreground">Status</div>
                      <div className="text-sm font-medium capitalize">
                        {application?.status || "unknown"}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Grade</div>
                      <div className="text-sm font-medium">
                        {progress.grade || "Not graded yet"}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Last updated on{" "}
                    {new Date(progress.updatedAt).toLocaleString()}
                  </div>
                </CardContent>
              </Card>

              {Array.isArray(progress.milestones) && progress.milestones.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Milestones</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    {progress.milestones.map((m: any, index: number) => (
                      <div
                        key={index}
                        className="flex items-start justify-between gap-3 border rounded-md p-3"
                      >
                        <div>
                          <div className="font-medium">
                            {m.title || `Milestone ${index + 1}`}
                          </div>
                          {m.description && (
                            <div className="text-muted-foreground">
                              {m.description}
                            </div>
                          )}
                        </div>
                        {typeof m.completed === "boolean" && (
                          <div className="text-xs font-medium">
                            {m.completed ? "Completed" : "Pending"}
                          </div>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

