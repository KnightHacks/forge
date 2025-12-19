"use client";

import * as React from "react";
import {
    AlignLeft,
    Calendar,
    CheckSquare,
    ChevronDown,
    Circle,
    CircleDot,
    Clock,
    Copy,
    MoreVertical,
    Pilcrow,
    Trash,
    X,
    GripHorizontal,
} from "lucide-react";
const uuidv4 = () => crypto.randomUUID();

import { cn } from "@forge/ui";
import { Button } from "@forge/ui/button";
import { Card } from "@forge/ui/card";
import { Input } from "@forge/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@forge/ui/select";
import { Checkbox } from "@forge/ui/checkbox";
import { Textarea } from "@forge/ui/textarea";

import {
    FormQuestion,
    QuestionOption,
    QuestionType,
} from "~/lib/types/form";

interface QuestionEditCardProps {
    question: FormQuestion;
    isActive: boolean;
    onUpdate: (updatedQuestion: FormQuestion) => void;
    onDelete: (id: string) => void;
    onDuplicate: (question: FormQuestion) => void;
}

const QUESTION_TYPES: {
    value: QuestionType;
    label: string;
    icon: React.ElementType;
}[] = [
        { value: "short_answer", label: "Short answer", icon: AlignLeft },
        { value: "paragraph", label: "Paragraph", icon: Pilcrow },
        { value: "multiple_choice", label: "Multiple choice", icon: CircleDot },
        { value: "checkboxes", label: "Checkboxes", icon: CheckSquare },
        { value: "dropdown", label: "Dropdown", icon: ChevronDown },
        { value: "date", label: "Date", icon: Calendar },
        { value: "time", label: "Time", icon: Clock },
    ];

export function QuestionEditCard({
    question,
    isActive,
    onUpdate,
    onDelete,
    onDuplicate,
}: QuestionEditCardProps) {
    // -- Handlers --

    const handleTitleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onUpdate({ ...question, title: e.target.value });
    };

    const handleTypeChange = (newType: QuestionType) => {
        let updatedQuestion = { ...question, type: newType };

        if (
            ["multiple_choice", "checkboxes", "dropdown"].includes(newType) &&
            (!question.options || question.options.length === 0)
        ) {
            updatedQuestion.options = [{ id: uuidv4(), value: "Option 1", isOther: false }];
        }

        if (["short_answer", "paragraph", "date", "time"].includes(newType)) {
            updatedQuestion.options = undefined;
        }

        onUpdate(updatedQuestion);
    };

    const handleRequiredChange = (checked: boolean) => {
        onUpdate({ ...question, required: checked });
    };

    return (
        <Card
            className={cn(
                "relative flex flex-col gap-4 border-l-4 p-6 transition-all bg-card text-card-foreground",
                isActive ? "border-l-primary shadow-md ring-1 ring-black/5" : "border-l-transparent hover:bg-muted/50"
            )}
            onClick={(e) => {
                e.stopPropagation();
            }}
        >


            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-start">
                <div className="flex-1 bg-muted/50 p-2 rounded-md focus-within:bg-muted focus-within:ring-1 focus-within:ring-primary/20 transition-colors">
                    <Textarea
                        value={question.title}
                        onChange={handleTitleChange}
                        placeholder="Question"
                        className="min-h-[3rem] resize-none overflow-hidden border-none bg-transparent text-lg font-medium placeholder:text-muted-foreground focus-visible:ring-0 px-0 py-0"
                        rows={1}
                        onInput={(e) => {
                            // Auto-resize
                            const target = e.target as HTMLTextAreaElement;
                            target.style.height = "auto";
                            target.style.height = `${target.scrollHeight}px`;
                        }}
                    />
                </div>

                <div className="w-full md:w-[220px]">
                    <Select value={question.type} onValueChange={(val: QuestionType) => handleTypeChange(val)}>
                        <SelectTrigger className="h-12 w-full">
                            <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                            {QUESTION_TYPES.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                    <div className="flex items-center gap-3">
                                        <type.icon className="h-4 w-4" />
                                        <span>{type.label}</span>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Body */}
            <div className="pt-2">
                <QuestionBody question={question} onUpdate={onUpdate} />
            </div>

            {/* Footer */}
            <div className="mt-4 flex items-center justify-between gap-2 border-t pt-4">
                <div className="cursor-move text-gray-300 hover:text-gray-500">
                    <GripHorizontal className="h-5 w-5 rotate-90" />
                </div>
                <div className="flex items-center justify-end gap-2">
                    <div className="mr-4 flex items-center gap-2 border-r pr-4">
                        <Copy
                            className="h-5 w-5 cursor-pointer text-gray-500 hover:text-gray-700"
                            onClick={() => onDuplicate(question)}
                        />
                        <Trash
                            className="h-5 w-5 cursor-pointer text-gray-500 hover:text-red-600"
                            onClick={() => onDelete(question.id)}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Required</span>
                        <Checkbox checked={question.required} onCheckedChange={handleRequiredChange} />
                    </div>

                    <div className="ml-2">
                        <Button variant="ghost" size="icon">
                            <MoreVertical className="h-5 w-5 text-gray-500" />
                        </Button>
                    </div>
                </div>
            </div>
        </Card>
    );
}

// -- Sub-Components --

function QuestionBody({
    question,
    onUpdate,
}: {
    question: FormQuestion;
    onUpdate: (q: FormQuestion) => void;
}) {
    switch (question.type) {
        case "short_answer":
            return (
                <div className="w-1/2 border-b border-dotted border-gray-300 py-2 text-sm text-gray-400">
                    Short answer text
                </div>
            );
        case "paragraph":
            return (
                <div className="w-3/4 border-b border-dotted border-gray-300 py-2 text-sm text-gray-400">
                    Long answer text
                </div>
            );
        case "multiple_choice":
        case "checkboxes":
        case "dropdown":
            return <OptionList question={question} onUpdate={onUpdate} />;
        case "date":
            return (
                <div className="flex items-center gap-2 text-gray-400">
                    <Calendar className="h-5 w-5" />
                    <span>Month, day, year</span>
                </div>
            );
        case "time":
            return (
                <div className="flex items-center gap-2 text-gray-400">
                    <Clock className="h-5 w-5" />
                    <span>Time</span>
                </div>
            );
        default:
            return null;
    }
}

function OptionList({
    question,
    onUpdate,
}: {
    question: FormQuestion;
    onUpdate: (q: FormQuestion) => void;
}) {
    const options = question.options || [];

    const handleOptionChange = (id: string, newValue: string) => {
        const newOptions = options.map((opt) =>
            opt.id === id ? { ...opt, value: newValue } : opt
        );
        onUpdate({ ...question, options: newOptions });
    };

    const addOption = () => {
        const newOption: QuestionOption = {
            id: uuidv4(),
            value: `Option ${options.length + 1}`,
            isOther: false,
        };
        onUpdate({ ...question, options: [...options, newOption] });
    };

    const removeOption = (id: string) => {
        const newOptions = options.filter((opt) => opt.id !== id);
        onUpdate({ ...question, options: newOptions });
    };

    const Icon =
        question.type === "multiple_choice"
            ? Circle
            : question.type === "checkboxes"
                ? CheckSquare
                : Circle;

    return (
        <div className="flex flex-col gap-2">
            {options.map((option, idx) => (
                <div key={option.id} className="group flex items-center gap-2">
                    {question.type === "dropdown" ? (
                        <span className="w-6 text-center text-sm">{idx + 1}.</span>
                    ) : (
                        <Icon className="h-5 w-5 text-gray-300" />
                    )}

                    <Input
                        value={option.value}
                        onChange={(e) => handleOptionChange(option.id, e.target.value)}
                        className="flex-1 border-none hover:border-b hover:border-gray-200 focus:border-b-2 focus:border-blue-500 focus:ring-0 rounded-none px-0"
                        placeholder={`Option ${idx + 1}`}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                addOption();
                            }
                            if (e.key === "Backspace" && option.value === "") {
                                e.preventDefault();
                                removeOption(option.id);
                            }
                        }}
                        autoFocus={idx === options.length - 1 && options.length > 1}
                    />

                    <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeOption(option.id)}
                        tabIndex={-1}
                    >
                        <X className="h-5 w-5 text-gray-500" />
                    </Button>
                </div>
            ))}

            {/* Add Option Button */}
            <div className="flex items-center gap-2 mt-1">
                {question.type === "dropdown" ? (
                    <span className="w-6 text-center text-sm">{options.length + 1}.</span>
                ) : (
                    <Icon className="h-5 w-5 text-transparent" />
                )}

                <div className="flex items-center gap-1 text-sm text-gray-500">
                    <Button
                        variant="ghost"
                        className="h-auto px-0 py-1 text-gray-500 hover:text-gray-800 hover:bg-transparent"
                        onClick={addOption}
                    >
                        Add option
                    </Button>
                </div>
            </div>
        </div>
    );
}
