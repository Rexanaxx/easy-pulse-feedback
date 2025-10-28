import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, Users, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface Survey {
  id: string;
  title: string;
  description: string | null;
  status: string;
  created_at: string;
}

interface Question {
  id: string;
  type: string;
  text: string;
  options: string[] | null;
}

interface Answer {
  question_id: string;
  answer_value: string;
}

const COLORS = ['hsl(237, 84%, 57%)', 'hsl(270, 73%, 65%)', 'hsl(142, 76%, 36%)', 'hsl(0, 84%, 60%)', 'hsl(210, 40%, 96%)'];

const SurveyResults = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [responseCount, setResponseCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  const fetchData = async () => {
    try {
      const [surveyRes, questionsRes, responsesRes] = await Promise.all([
        supabase.from("surveys").select("*").eq("id", id).single(),
        supabase.from("questions").select("*").eq("survey_id", id).order("order_index"),
        supabase.from("responses").select("id").eq("survey_id", id),
      ]);

      if (surveyRes.error) throw surveyRes.error;
      if (questionsRes.error) throw questionsRes.error;

      setSurvey(surveyRes.data);
      setQuestions(questionsRes.data as Question[]);
      setResponseCount(responsesRes.data?.length || 0);

      if (responsesRes.data && responsesRes.data.length > 0) {
        const responseIds = responsesRes.data.map((r) => r.id);
        const { data: answersData, error: answersError } = await supabase
          .from("answers")
          .select("question_id, answer_value")
          .in("response_id", responseIds);

        if (answersError) throw answersError;
        setAnswers(answersData);
      }
    } catch (error: any) {
      toast.error("Failed to load survey results");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getQuestionAnalytics = (question: Question) => {
    const questionAnswers = answers.filter((a) => a.question_id === question.id);

    if (question.type === "multiple_choice" || question.type === "dropdown") {
      const counts = questionAnswers.reduce((acc, answer) => {
        acc[answer.answer_value] = (acc[answer.answer_value] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }

    if (question.type === "rating") {
      const ratings = questionAnswers.map((a) => parseInt(a.answer_value));
      const average = ratings.length > 0 ? (ratings.reduce((sum, r) => sum + r, 0) / ratings.length).toFixed(1) : "0";
      return { average, total: ratings.length };
    }

    return questionAnswers.map((a) => a.answer_value);
  };

  const copyLink = () => {
    const link = `${window.location.origin}/survey/${id}`;
    navigator.clipboard.writeText(link);
    toast.success("Survey link copied to clipboard!");
  };

  const exportData = async () => {
    try {
      const csvRows = [];
      csvRows.push(["Survey", survey?.title].join(","));
      csvRows.push(["Total Responses", responseCount].join(","));
      csvRows.push([]);
      
      questions.forEach((question) => {
        csvRows.push([question.text]);
        const analytics = getQuestionAnalytics(question);
        
        if (question.type === "multiple_choice" || question.type === "dropdown") {
          (analytics as any[]).forEach((item) => {
            csvRows.push([item.name, item.value].join(","));
          });
        } else if (question.type === "rating") {
          csvRows.push(["Average Rating", (analytics as any).average].join(","));
        } else {
          (analytics as string[]).forEach((answer) => {
            csvRows.push([`"${answer.replace(/"/g, '""')}"`]);
          });
        }
        csvRows.push([]);
      });

      const csvContent = csvRows.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `survey-results-${id}.csv`;
      a.click();
      toast.success("Results exported successfully!");
    } catch (error) {
      toast.error("Failed to export results");
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate("/")} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <Card className="shadow-medium mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-3xl mb-2">{survey?.title}</CardTitle>
                {survey?.description && <CardDescription className="text-base">{survey.description}</CardDescription>}
              </div>
              <Badge>{survey?.status}</Badge>
            </div>
            <div className="flex items-center gap-4 pt-4">
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4" />
                <span className="font-semibold">{responseCount} responses</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Button onClick={copyLink} variant="outline">
                <LinkIcon className="mr-2 h-4 w-4" />
                Copy Survey Link
              </Button>
              <Button onClick={exportData} variant="outline" disabled={responseCount === 0}>
                <Download className="mr-2 h-4 w-4" />
                Export Results
              </Button>
            </div>
          </CardContent>
        </Card>

        {responseCount === 0 ? (
          <Card className="shadow-soft">
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No responses yet</h3>
              <p className="text-muted-foreground mb-4">Share the survey link to start collecting responses</p>
              <Button onClick={copyLink}>Copy Survey Link</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {questions.map((question, index) => {
              const analytics = getQuestionAnalytics(question);

              return (
                <Card key={question.id} className="shadow-soft">
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Q{index + 1}. {question.text}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(question.type === "multiple_choice" || question.type === "dropdown") && (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={analytics as any[]}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                            {(analytics as any[]).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}

                    {question.type === "rating" && (
                      <div className="text-center py-8">
                        <div className="text-6xl font-bold text-primary mb-2">
                          {(analytics as any).average}
                        </div>
                        <p className="text-muted-foreground">Average Rating (out of 5)</p>
                        <p className="text-sm text-muted-foreground mt-2">
                          Based on {(analytics as any).total} responses
                        </p>
                      </div>
                    )}

                    {(question.type === "short_text" || question.type === "long_text") && (
                      <div className="space-y-3">
                        {(analytics as string[]).map((answer, i) => (
                          <div key={i} className="p-4 bg-muted rounded-lg">
                            <p className="text-sm">{answer}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SurveyResults;
