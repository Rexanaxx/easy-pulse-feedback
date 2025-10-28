import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, BarChart3, FileText, Users, Clock } from "lucide-react";
import { toast } from "sonner";

interface Survey {
  id: string;
  title: string;
  description: string | null;
  status: string;
  created_at: string;
  response_count?: number;
}

const Dashboard = () => {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, published: 0, responses: 0 });

  useEffect(() => {
    fetchSurveys();
    fetchStats();
  }, []);

  const fetchSurveys = async () => {
    try {
      const { data, error } = await supabase
        .from("surveys")
        .select(`
          *,
          responses(count)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const surveysWithCount = data.map((survey: any) => ({
        ...survey,
        response_count: survey.responses[0]?.count || 0,
      }));

      setSurveys(surveysWithCount);
    } catch (error: any) {
      toast.error("Failed to load surveys");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const [surveysData, responsesData] = await Promise.all([
        supabase.from("surveys").select("status", { count: "exact" }),
        supabase.from("responses").select("*", { count: "exact" }),
      ]);

      const published = surveysData.data?.filter((s) => s.status === "published").length || 0;

      setStats({
        total: surveysData.count || 0,
        published,
        responses: responsesData.count || 0,
      });
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      draft: "secondary",
      published: "default",
      closed: "outline",
      archived: "destructive",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
            Survey Dashboard
          </h1>
          <p className="text-muted-foreground">
            Create, manage, and analyze employee feedback surveys
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="shadow-soft hover:shadow-medium transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Surveys</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card className="shadow-soft hover:shadow-medium transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Published</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{stats.published}</div>
            </CardContent>
          </Card>

          <Card className="shadow-soft hover:shadow-medium transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Responses</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-accent">{stats.responses}</div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-4 mb-8">
          <Link to="/create">
            <Button className="bg-gradient-primary hover:opacity-90 transition-opacity">
              <Plus className="mr-2 h-4 w-4" />
              Create Survey
            </Button>
          </Link>
        </div>

        {/* Surveys List */}
        <Card className="shadow-medium">
          <CardHeader>
            <CardTitle>Recent Surveys</CardTitle>
            <CardDescription>Manage and view all your surveys</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : surveys.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No surveys yet</h3>
                <p className="text-muted-foreground mb-4">Create your first survey to get started</p>
                <Link to="/create">
                  <Button>Create Survey</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {surveys.map((survey) => (
                  <Link
                    key={survey.id}
                    to={`/survey/${survey.id}/results`}
                    className="block"
                  >
                    <div className="border rounded-lg p-4 hover:bg-accent/5 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-1">{survey.title}</h3>
                          {survey.description && (
                            <p className="text-sm text-muted-foreground mb-2">
                              {survey.description}
                            </p>
                          )}
                        </div>
                        {getStatusBadge(survey.status)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {survey.response_count} responses
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {new Date(survey.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
