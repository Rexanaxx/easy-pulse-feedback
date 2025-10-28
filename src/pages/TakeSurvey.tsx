import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Star } from "lucide-react";
import { toast } from "sonner";

interface Question {
  id: string;
  type: string;
  text: string;
  options: string[] | null;
  required: boolean;
  order_index: number;
}

interface Survey {
  id: string;
  title: string;
  description: string | null;
}

const TakeSurvey = () => {
  const { id } = useParams();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [ratingHover, setRatingHover] = useState<Record<string, number>>({});

  useEffect(() => {
    if (id) {
      fetchSurvey();
    }
  }, [id]);

  const fetchSurvey = async () => {
    try {
      const [{ data: surveyData, error: surveyError }, { data: questionsData, error: questionsError }] =
        await Promise.all([
          supabase.from("surveys").select("*").eq("id", id).eq("status", "published").single(),
          supabase.from("questions").select("*").eq("survey_id", id).order("order_index"),
        ]);

      if (surveyError) throw surveyError;
      if (questionsError) throw questionsError;

      setSurvey(surveyData);
      setQuestions(questionsData as Question[]);
    } catch (error: any) {
      toast.error("Survey not found or unavailable");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    const requiredQuestions = questions.filter((q) => q.required);
    const missingAnswers = requiredQuestions.filter((q) => !answers[q.id]);

    if (missingAnswers.length > 0) {
      toast.error("Please answer all required questions");
      return;
    }

    setSubmitting(true);
    try {
      const { data: response, error: responseError } = await supabase
        .from("responses")
        .insert({ survey_id: id })
        .select()
        .single();

      if (responseError) throw responseError;

      const answersToInsert = Object.entries(answers).map(([questionId, answer]) => ({
        response_id: response.id,
        question_id: questionId,
        answer_value: answer,
      }));

      const { error: answersError } = await supabase.from("answers").insert(answersToInsert);

      if (answersError) throw answersError;

      setSubmitted(true);
      toast.success("Survey submitted successfully!");
    } catch (error: any) {
      toast.error("Failed to submit survey");
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const renderQuestion = (question: Question) => {
    switch (question.type) {
      case "multiple_choice":
        return (
          <RadioGroup
            value={answers[question.id] || ""}
            onValueChange={(value) => setAnswers({ ...answers, [question.id]: value })}
          >
            {question.options?.map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`${question.id}-${index}`} />
                <Label htmlFor={`${question.id}-${index}`} className="font-normal cursor-pointer">
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        );

      case "rating":
        return (
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                type="button"
                onClick={() => setAnswers({ ...answers, [question.id]: rating.toString() })}
                onMouseEnter={() => setRatingHover({ ...ratingHover, [question.id]: rating })}
                onMouseLeave={() => {
                  const newHover = { ...ratingHover };
                  delete newHover[question.id];
                  setRatingHover(newHover);
                }}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className={`h-8 w-8 ${
                    (ratingHover[question.id] || parseInt(answers[question.id]) || 0) >= rating
                      ? "fill-primary text-primary"
                      : "text-muted-foreground"
                  }`}
                />
              </button>
            ))}
          </div>
        );

      case "dropdown":
        return (
          <Select
            value={answers[question.id] || ""}
            onValueChange={(value) => setAnswers({ ...answers, [question.id]: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select an option..." />
            </SelectTrigger>
            <SelectContent>
              {question.options?.map((option, index) => (
                <SelectItem key={index} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "short_text":
        return (
          <Input
            value={answers[question.id] || ""}
            onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })}
            placeholder="Your answer..."
          />
        );

      case "long_text":
        return (
          <Textarea
            value={answers[question.id] || ""}
            onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })}
            placeholder="Your answer..."
            rows={4}
          />
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-medium text-center">
          <CardContent className="pt-8 pb-8">
            <CheckCircle2 className="h-16 w-16 text-success mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Thank You!</h2>
            <p className="text-muted-foreground">
              Your responses have been submitted successfully. Your feedback is anonymous and will help us improve.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const progress = (Object.keys(answers).length / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Card className="shadow-medium mb-6">
          <CardHeader>
            <CardTitle className="text-3xl">{survey?.title}</CardTitle>
            {survey?.description && <CardDescription className="text-base">{survey.description}</CardDescription>}
            <div className="pt-4">
              <div className="flex justify-between text-sm text-muted-foreground mb-2">
                <span>Progress</span>
                <span>
                  {Object.keys(answers).length} / {questions.length}
                </span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </CardHeader>
        </Card>

        <div className="space-y-6 mb-8">
          {questions.map((question, index) => (
            <Card key={question.id} className="shadow-soft">
              <CardHeader>
                <CardTitle className="text-lg flex items-start gap-2">
                  <span className="text-primary">Q{index + 1}.</span>
                  <span className="flex-1">
                    {question.text}
                    {question.required && <span className="text-destructive ml-1">*</span>}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>{renderQuestion(question)}</CardContent>
            </Card>
          ))}
        </div>

        <div className="bg-card border rounded-lg p-4 mb-6">
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Your responses are completely anonymous and confidential.
          </p>
        </div>

        <Button onClick={handleSubmit} disabled={submitting} className="w-full bg-gradient-primary" size="lg">
          {submitting ? "Submitting..." : "Submit Survey"}
        </Button>
      </div>
    </div>
  );
};

export default TakeSurvey;
