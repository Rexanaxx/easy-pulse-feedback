import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, ArrowLeft, Save, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface Question {
  type: string;
  text: string;
  options?: string[];
  required: boolean;
  order_index: number;
}

const CreateSurvey = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<Question[]>([
    { type: "multiple_choice", text: "", options: [""], required: true, order_index: 0 },
  ]);
  const [saving, setSaving] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const addQuestion = () => {
    setQuestions([
      ...questions,
      { type: "multiple_choice", text: "", options: [""], required: false, order_index: questions.length },
    ]);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const addOption = (questionIndex: number) => {
    const updated = [...questions];
    updated[questionIndex].options = [...(updated[questionIndex].options || []), ""];
    setQuestions(updated);
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    const updated = [...questions];
    updated[questionIndex].options![optionIndex] = value;
    setQuestions(updated);
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const updated = [...questions];
    updated[questionIndex].options = updated[questionIndex].options!.filter((_, i) => i !== optionIndex);
    setQuestions(updated);
  };

  const generateWithAI = async () => {
    if (!aiPrompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-survey", {
        body: { prompt: aiPrompt },
      });

      if (error) throw error;

      if (data?.questions) {
        const generatedQuestions = data.questions.map((q: any, index: number) => ({
          ...q,
          order_index: index,
        }));
        setQuestions(generatedQuestions);
        toast.success("Questions generated successfully!");
        setIsAiDialogOpen(false);
        setAiPrompt("");
      }
    } catch (error: any) {
      console.error("AI generation error:", error);
      toast.error(error.message || "Failed to generate questions");
    } finally {
      setIsGenerating(false);
    }
  };

  const saveSurvey = async (status: "draft" | "published") => {
    if (!title.trim()) {
      toast.error("Please enter a survey title");
      return;
    }

    if (questions.some((q) => !q.text.trim())) {
      toast.error("All questions must have text");
      return;
    }

    setSaving(true);
    try {
      const { data: survey, error: surveyError } = await supabase
        .from("surveys")
        .insert({ title, description, status })
        .select()
        .single();

      if (surveyError) throw surveyError;

      const questionsToInsert = questions.map((q) => ({
        survey_id: survey.id,
        type: q.type,
        text: q.text,
        options: q.options && q.options.length > 0 ? q.options : null,
        required: q.required,
        order_index: q.order_index,
      }));

      const { error: questionsError } = await supabase
        .from("questions")
        .insert(questionsToInsert);

      if (questionsError) throw questionsError;

      toast.success(`Survey ${status === "draft" ? "saved as draft" : "published"} successfully!`);
      navigate("/");
    } catch (error: any) {
      toast.error("Failed to save survey");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button variant="ghost" onClick={() => navigate("/")} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <Card className="shadow-medium mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">Create New Survey</CardTitle>
                <CardDescription>Build your employee feedback survey</CardDescription>
              </div>
              <Dialog open={isAiDialogOpen} onOpenChange={setIsAiDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Sparkles className="h-4 w-4" />
                    Create with AI
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Generate Survey with AI</DialogTitle>
                    <DialogDescription>
                      Describe what kind of survey you want to create and AI will generate questions for you.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label htmlFor="ai-prompt">Survey Description</Label>
                      <Textarea
                        id="ai-prompt"
                        placeholder="e.g., Create a survey about employee satisfaction with work-life balance and remote work policies"
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        className="mt-2"
                        rows={4}
                      />
                    </div>
                    <Button
                      onClick={generateWithAI}
                      disabled={isGenerating}
                      className="w-full"
                    >
                      {isGenerating ? "Generating..." : "Generate Questions"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="title">Survey Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Q1 Employee Satisfaction Survey"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the purpose of this survey..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-2"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4 mb-6">
          {questions.map((question, qIndex) => (
            <Card key={qIndex} className="shadow-soft">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Question {qIndex + 1}</CardTitle>
                  {questions.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeQuestion(qIndex)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Question Type</Label>
                  <Select
                    value={question.type}
                    onValueChange={(value) => updateQuestion(qIndex, "type", value)}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                      <SelectItem value="rating">Rating (1-5)</SelectItem>
                      <SelectItem value="short_text">Short Text</SelectItem>
                      <SelectItem value="long_text">Long Text</SelectItem>
                      <SelectItem value="dropdown">Dropdown</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Question Text *</Label>
                  <Input
                    placeholder="Enter your question..."
                    value={question.text}
                    onChange={(e) => updateQuestion(qIndex, "text", e.target.value)}
                    className="mt-2"
                  />
                </div>

                {(question.type === "multiple_choice" || question.type === "dropdown") && (
                  <div>
                    <Label>Options</Label>
                    <div className="space-y-2 mt-2">
                      {question.options?.map((option, oIndex) => (
                        <div key={oIndex} className="flex gap-2">
                          <Input
                            placeholder={`Option ${oIndex + 1}`}
                            value={option}
                            onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                          />
                          {question.options!.length > 1 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeOption(qIndex, oIndex)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addOption(qIndex)}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Option
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`required-${qIndex}`}
                    checked={question.required}
                    onCheckedChange={(checked) =>
                      updateQuestion(qIndex, "required", checked)
                    }
                  />
                  <Label htmlFor={`required-${qIndex}`} className="text-sm font-normal">
                    Required question
                  </Label>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Button onClick={addQuestion} variant="outline" className="w-full mb-6">
          <Plus className="mr-2 h-4 w-4" />
          Add Question
        </Button>

        <div className="flex gap-4">
          <Button
            onClick={() => saveSurvey("draft")}
            disabled={saving}
            variant="outline"
            className="flex-1"
          >
            <Save className="mr-2 h-4 w-4" />
            Save as Draft
          </Button>
          <Button
            onClick={() => saveSurvey("published")}
            disabled={saving}
            className="flex-1 bg-gradient-primary"
          >
            {saving ? "Publishing..." : "Publish Survey"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreateSurvey;
