import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Plus,
    ArrowLeft,
    Save,
    Trash2,
    GripVertical,
    ClipboardCheck,
    Type,
    ListTodo,
    X,
    MessageSquarePlus
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { surveyApi } from "@/lib/surveyApi";
import { Loader2 } from "lucide-react";

interface Question {
    id: string;
    text: string;
    type: string;
    options: string;
}

interface SurveyBuilderProps {
    onBack: () => void;
}

export function SurveyBuilder({ onBack }: SurveyBuilderProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [duration, setDuration] = useState(5);
    const [status, setStatus] = useState("ACTIVE");
    const [action, setAction] = useState("SUBMIT_FEEDBACK");
    const [param, setParam] = useState("CASE_CLOSE");
    const [questions, setQuestions] = useState<Question[]>([
        {
            id: '1',
            text: 'Overall, how satisfied were you with this service experience?',
            type: 'Options',
            options: 'Poor-1, Unsatisfactory-2, Fair-3, Satisfactory-4, Good-5, Very Good-6, Excellent-7'
        }
    ]);

    const [newQuestion, setNewQuestion] = useState({
        text: "",
        type: "Options",
        options: ""
    });

    const handleAddQuestion = () => {
        if (!newQuestion.text) {
            toast({
                title: "Validation Error",
                description: "Question text is required.",
                variant: "destructive",
            });
            return;
        }

        const question: Question = {
            id: Math.random().toString(36).substr(2, 9),
            ...newQuestion
        };

        setQuestions([...questions, question]);
        setNewQuestion({ text: "", type: "Options", options: "" });

        toast({
            title: "Question Added",
            description: "The question has been added to your survey.",
        });
    };

    const handleRemoveQuestion = (id: string) => {
        setQuestions(questions.filter(q => q.id !== id));
    };

    const registerMutation = useMutation({
        mutationFn: (data: any) => surveyApi.registerSurvey(data),
        onSuccess: (response) => {
            if (response.status === 'SUCCESS' || response.statusCode === 200) {
                toast({
                    title: "Survey Created",
                    description: response.statusMessage || "Your survey has been successfully created and saved.",
                });
                queryClient.invalidateQueries({ queryKey: ['/itsm/survey'] });
                onBack();
            } else {
                toast({
                    title: "Error",
                    description: response.statusMessage || "Failed to create survey.",
                    variant: "destructive",
                });
            }
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "An unexpected error occurred.",
                variant: "destructive",
            });
        }
    });

    const handleCreateSurvey = () => {
        if (!title) {
            toast({
                title: "Title Required",
                description: "Please enter a title for the survey.",
                variant: "destructive",
            });
            return;
        }

        if (questions.length === 0) {
            toast({
                title: "Questions Required",
                description: "Please add at least one question to your survey.",
                variant: "destructive",
            });
            return;
        }

        const surveyData = {
            name: title,
            scrType: "SURVEY",
            status: status,
            description: description,
            duration: duration,
            action: action,
            parm: param,
            arcInd: 0,
            embedFunc: null,
            embedParm: null,
            branchInd: 0,
            scrOriginator2user: null, // As per requirements, though usually this would be dynamic
            sNextS2callScript: null,
            cstype2entityElm: 1,
            csstatus2entityElm: 1
        };

        registerMutation.mutate(surveyData);
    };

    const handleClear = () => {
        setTitle("");
        setDescription("");
        setDuration(5);
        setQuestions([]);
        setNewQuestion({ text: "", type: "Options", options: "" });
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Area */}
            <Card className="bg-gradient-to-r from-azam-blue to-blue-800 text-white shadow-lg border-0 mb-2">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onBack}
                                className="hover:bg-white/20 text-white transition-colors h-9 w-9"
                            >
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                            <div className="flex items-center gap-3">
                                <div className="bg-white/10 p-2 rounded-lg">
                                    <ClipboardCheck className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-white">Survey Form</h1>
                                    <p className="text-blue-100 text-xs mt-0.5">
                                        Design and configure your survey questionnaire
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={handleClear} className="h-9 bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white transition-all shadow-none">
                                <X className="w-4 h-4 mr-2" />
                                Clear Form
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleCreateSurvey}
                                className="bg-white text-azam-blue hover:bg-blue-50 h-9 transition-all shadow-sm"
                                disabled={registerMutation.isPending}
                            >
                                {registerMutation.isPending ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4 mr-2" />
                                        Save Survey
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Survey Details */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="border-slate-200 shadow-sm overflow-hidden">
                        <CardHeader className="bg-slate-50/50 border-b p-4">
                            <div className="flex items-center gap-2">
                                <ClipboardCheck className="w-4 h-4 text-azam-blue" />
                                <CardTitle className="text-sm font-bold uppercase tracking-wider">Survey Configuration</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-700 uppercase tracking-tight flex items-center gap-2">
                                    <Type className="w-3 h-3 text-azam-blue" />
                                    Survey Title <span className="text-red-500 font-bold">*</span>
                                </label>
                                <Input
                                    placeholder="e.g., Customer Satisfaction Survey (CSAT) - 2026"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="focus:ring-2 focus:ring-blue-100 border-slate-200"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-tight flex items-center gap-2">
                                        Description
                                    </label>
                                    <Input
                                        placeholder="e.g., Feedback form triggered after case closure"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className="focus:ring-2 focus:ring-blue-100 border-slate-200"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-tight flex items-center gap-2">
                                        Duration (Mins)
                                    </label>
                                    <Input
                                        type="number"
                                        value={duration}
                                        onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
                                        className="focus:ring-2 focus:ring-blue-100 border-slate-200"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-tight">Status</label>
                                    <Select value={status} onValueChange={setStatus}>
                                        <SelectTrigger className="bg-white border-slate-200">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ACTIVE">Active</SelectItem>
                                            <SelectItem value="INACTIVE">Inactive</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-tight">Action</label>
                                    <Input
                                        value={action}
                                        onChange={(e) => setAction(e.target.value)}
                                        className="focus:ring-2 focus:ring-blue-100 border-slate-200"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-tight">Parameter</label>
                                    <Input
                                        value={param}
                                        onChange={(e) => setParam(e.target.value)}
                                        className="focus:ring-2 focus:ring-blue-100 border-slate-200"
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-tight flex items-center gap-2">
                                        <ListTodo className="w-3 h-3 text-azam-blue" />
                                        Configured Questions ({questions.length})
                                    </label>
                                </div>

                                <div className="border rounded-lg overflow-hidden border-slate-200 bg-white">
                                    <Table>
                                        <TableHeader className="bg-slate-50">
                                            <TableRow className="hover:bg-transparent">
                                                <TableHead className="w-[50px]"></TableHead>
                                                <TableHead className="text-xs font-bold uppercase py-2">Question</TableHead>
                                                <TableHead className="text-xs font-bold uppercase py-2 w-[120px]">Type</TableHead>
                                                <TableHead className="text-xs font-bold uppercase py-2">Options</TableHead>
                                                <TableHead className="w-[50px]"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {questions.length > 0 ? (
                                                questions.map((q, idx) => (
                                                    <TableRow key={q.id} className="group hover:bg-slate-50/50 transition-colors">
                                                        <TableCell className="p-3">
                                                            <GripVertical className="h-4 w-4 text-slate-300 group-hover:text-slate-400 cursor-grab" />
                                                        </TableCell>
                                                        <TableCell className="p-3 align-top font-medium text-slate-800 text-sm">
                                                            {q.text}
                                                        </TableCell>
                                                        <TableCell className="p-3 align-top">
                                                            <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-md">
                                                                {q.type}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="p-3 align-top text-xs text-slate-500 italic max-w-[200px] truncate">
                                                            {q.options || "—"}
                                                        </TableCell>
                                                        <TableCell className="p-3 align-top">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleRemoveQuestion(q.id)}
                                                                className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="h-24 text-center text-slate-400 text-sm bg-slate-50/30">
                                                        No questions added yet. Use the form on the right to start building your survey.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Add Questions */}
                <div className="space-y-6">
                    <Card className="border-slate-200 shadow-md ring-1 ring-blue-500/5 overflow-hidden">
                        <CardHeader className="bg-gradient-to-r from-azam-blue/5 to-transparent border-b p-4">
                            <div className="flex items-center gap-2">
                                <MessageSquarePlus className="w-4 h-4 text-azam-blue" />
                                <CardTitle className="text-sm font-bold uppercase tracking-wider">Add Question</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="p-5 space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">Question Text</label>
                                <Input
                                    placeholder="Type your question here..."
                                    value={newQuestion.text}
                                    onChange={(e) => setNewQuestion({ ...newQuestion, text: e.target.value })}
                                    className="bg-white border-slate-200"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">Response Type</label>
                                <Select
                                    value={newQuestion.type}
                                    onValueChange={(value) => setNewQuestion({ ...newQuestion, type: value })}
                                >
                                    <SelectTrigger className="bg-white border-slate-200">
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Options">Scale / Options</SelectItem>
                                        <SelectItem value="Text">Open Text</SelectItem>
                                        <SelectItem value="Yes/No">Yes / No</SelectItem>
                                        <SelectItem value="Single Choice">Single Choice</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {newQuestion.type === "Options" && (
                                <div className="space-y-1.5 animate-in fade-in zoom-in-95 duration-200">
                                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">Scale Options (Comma separated)</label>
                                    <Input
                                        placeholder="e.g., Poor-1, Fair-2, Good-3..."
                                        value={newQuestion.options}
                                        onChange={(e) => setNewQuestion({ ...newQuestion, options: e.target.value })}
                                        className="bg-white border-slate-200 shadow-inner"
                                    />
                                    <p className="text-[10px] text-slate-400 italic">Example: Poor-1, Fair-2, Good-3, Excellent-4</p>
                                </div>
                            )}

                            <Button
                                onClick={handleAddQuestion}
                                className="w-full mt-2 bg-azam-blue hover:bg-blue-700 shadow-md shadow-blue-200/50 py-5 transition-all active:scale-95"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Add to Survey
                            </Button>
                        </CardContent>
                    </Card>

                    <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100 flex items-start gap-3">
                        <div className="bg-azam-blue/10 p-2 rounded-lg mt-0.5">
                            <ClipboardCheck className="w-4 h-4 text-azam-blue" />
                        </div>
                        <div>
                            <h4 className="text-[12px] font-bold text-azam-blue uppercase tracking-tight">Survey Tips</h4>
                            <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                                Keep questions concise and avoid leading language. Use clear scales to ensure high-quality feedback data.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
