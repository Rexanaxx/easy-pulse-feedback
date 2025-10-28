-- Create surveys table
CREATE TABLE public.surveys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'closed', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE
);

-- Create questions table
CREATE TABLE public.questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('multiple_choice', 'rating', 'short_text', 'long_text', 'dropdown')),
  text TEXT NOT NULL,
  options JSONB,
  required BOOLEAN NOT NULL DEFAULT false,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create responses table
CREATE TABLE public.responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create answers table
CREATE TABLE public.answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  response_id UUID NOT NULL REFERENCES public.responses(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  answer_value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create survey templates table
CREATE TABLE public.survey_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  template_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_templates ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (no auth required)
CREATE POLICY "Anyone can view published surveys" 
ON public.surveys 
FOR SELECT 
USING (status = 'published');

CREATE POLICY "Anyone can view questions for published surveys"
ON public.questions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.surveys
    WHERE surveys.id = questions.survey_id
    AND surveys.status = 'published'
  )
);

CREATE POLICY "Anyone can submit responses"
ON public.responses
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can submit answers"
ON public.answers
FOR INSERT
WITH CHECK (true);

-- Admin access policies (allow all operations for now since no auth)
CREATE POLICY "Allow all operations on surveys"
ON public.surveys
FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all operations on questions"
ON public.questions
FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all operations on responses"
ON public.responses
FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all operations on answers"
ON public.answers
FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Anyone can view templates"
ON public.survey_templates
FOR SELECT
USING (true);

CREATE POLICY "Allow all operations on templates"
ON public.survey_templates
FOR ALL
USING (true)
WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_surveys_updated_at
BEFORE UPDATE ON public.surveys
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_questions_survey_id ON public.questions(survey_id);
CREATE INDEX idx_questions_order ON public.questions(survey_id, order_index);
CREATE INDEX idx_responses_survey_id ON public.responses(survey_id);
CREATE INDEX idx_answers_response_id ON public.answers(response_id);
CREATE INDEX idx_answers_question_id ON public.answers(question_id);
CREATE INDEX idx_surveys_status ON public.surveys(status);

-- Insert default templates
INSERT INTO public.survey_templates (name, description, template_data) VALUES
('Employee Satisfaction', 'Measure overall employee satisfaction and engagement', 
'{"questions": [
  {"type": "rating", "text": "How satisfied are you with your current role?", "required": true, "order_index": 0},
  {"type": "rating", "text": "How would you rate work-life balance?", "required": true, "order_index": 1},
  {"type": "multiple_choice", "text": "What do you value most about working here?", "options": ["Career Growth", "Team Culture", "Compensation", "Work-Life Balance", "Management"], "required": true, "order_index": 2},
  {"type": "long_text", "text": "What improvements would you suggest?", "required": false, "order_index": 3}
]}'),

('Workplace Culture', 'Assess company culture and team dynamics',
'{"questions": [
  {"type": "rating", "text": "How well does our company live up to its values?", "required": true, "order_index": 0},
  {"type": "multiple_choice", "text": "How would you describe our workplace culture?", "options": ["Collaborative", "Innovative", "Fast-paced", "Supportive", "Competitive"], "required": true, "order_index": 1},
  {"type": "rating", "text": "How comfortable do you feel sharing your opinions?", "required": true, "order_index": 2},
  {"type": "long_text", "text": "What makes you proud to work here?", "required": false, "order_index": 3}
]}'),

('Team Collaboration', 'Evaluate team communication and collaboration',
'{"questions": [
  {"type": "rating", "text": "How effective is communication within your team?", "required": true, "order_index": 0},
  {"type": "rating", "text": "How well does your team collaborate on projects?", "required": true, "order_index": 1},
  {"type": "multiple_choice", "text": "What tools help your team collaborate best?", "options": ["Video Calls", "Chat Tools", "Project Management Software", "In-person Meetings", "Email"], "required": true, "order_index": 2},
  {"type": "short_text", "text": "What would improve team collaboration?", "required": false, "order_index": 3}
]}');