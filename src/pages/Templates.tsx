import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText } from "lucide-react";
import { toast } from "sonner";

interface Template {
  id: string;
  name: string;
  description: string | null;
  template_data: {
    questions: Array<{
      type: string;
      text: string;
      options?: string[];
      required: boolean;
      order_index: number;
    }>;
  };
}

const Templates = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from("survey_templates")
        .select("*")
        .order("created_at");

      if (error) throw error;
      setTemplates(data as unknown as Template[]);
    } catch (error: any) {
      toast.error("Failed to load templates");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const useTemplate = async (template: Template) => {
    try {
      const { data: survey, error: surveyError } = await supabase
        .from("surveys")
        .insert({
          title: template.name,
          description: template.description,
          status: "draft",
        })
        .select()
        .single();

      if (surveyError) throw surveyError;

      const questionsToInsert = template.template_data.questions.map((q) => ({
        survey_id: survey.id,
        type: q.type,
        text: q.text,
        options: q.options || null,
        required: q.required,
        order_index: q.order_index,
      }));

      const { error: questionsError } = await supabase
        .from("questions")
        .insert(questionsToInsert);

      if (questionsError) throw questionsError;

      toast.success("Survey created from template!");
      navigate("/");
    } catch (error: any) {
      toast.error("Failed to create survey from template");
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Button variant="ghost" onClick={() => navigate("/")} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
            Survey Templates
          </h1>
          <p className="text-muted-foreground">
            Start with a pre-built template and customize to your needs
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <Card key={template.id} className="shadow-soft hover:shadow-medium transition-shadow">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>{template.name}</CardTitle>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground mb-4">
                    {template.template_data.questions.length} questions included
                  </div>
                  <Button
                    onClick={() => useTemplate(template)}
                    className="w-full"
                    variant="outline"
                  >
                    Use Template
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Templates;
