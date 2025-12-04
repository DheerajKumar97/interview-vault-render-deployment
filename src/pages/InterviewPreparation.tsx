import { useState, useEffect } from "react";
import { getApiEndpoint } from '../config/api';
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Upload, ArrowLeft, FileText, Building2, MessageSquare, Loader2, Key } from "lucide-react";
import Header from "@/components/Header";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";

interface Application {
    id: string;
    job_title: string;
    job_description?: string;
    companies: {
        name: string;
    };
}

const InterviewPreparation = () => {
    const navigate = useNavigate();
    const { t } = useLanguage();
    const [applications, setApplications] = useState<Application[]>([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [resumeText, setResumeText] = useState<string | null>(null);
    const [resumeLoadedAt, setResumeLoadedAt] = useState<Date | null>(null);
    const [generatingQuestions, setGeneratingQuestions] = useState<boolean>(false);
    const [interviewQuestions, setInterviewQuestions] = useState<string | null>(null);
    const [customApiKey, setCustomApiKey] = useState<string>("");
    const [showApiKeyInput, setShowApiKeyInput] = useState<boolean>(false);

    useEffect(() => {
        fetchApplications();
        fetchLatestResume();

        const savedQuestions = localStorage.getItem('interviewQuestions');
        const savedCompanyId = localStorage.getItem('interviewCompanyId');

        if (savedQuestions) setInterviewQuestions(savedQuestions);
        if (savedCompanyId) setSelectedCompanyId(savedCompanyId);
    }, []);

    useEffect(() => {
        if (interviewQuestions) localStorage.setItem('interviewQuestions', interviewQuestions);
        if (selectedCompanyId) localStorage.setItem('interviewCompanyId', selectedCompanyId);
    }, [interviewQuestions, selectedCompanyId]);

    const fetchApplications = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setLoading(false);
                return;
            }

            const { data, error } = await supabase
                .from("applications")
                .select(`
          id,
          job_title,
          job_description,
          companies (
            name
          )
        `)
                .ilike("current_status", "applied")
                .eq("user_id", user.id)
                .order("applied_date", { ascending: false });

            if (error) throw error;

            const typedData = (data as any) as Application[];
            setApplications(typedData || []);
        } catch (error: any) {
            toast.error(t("Failed to fetch applications"));
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchLatestResume = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await (supabase as any)
                .from("resumes")
                .select("resume_text, created_at")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) {
                console.error("Error fetching resume:", error);
                return;
            }

            if (data) {
                setResumeText((data as any).resume_text);
                setResumeLoadedAt(new Date((data as any).created_at));
            }
        } catch (error) {
            console.error("Error fetching resume:", error);
        }
    };

    const handleImportResume = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type !== 'application/pdf') {
            toast.error(t("Please upload a PDF file"));
            e.target.value = '';
            return;
        }

        try {
            toast.info(t("Extracting text from PDF..."));

            const pdfjsLib = await import('pdfjs-dist');
            const pdfWorker = await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url');
            pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker.default;

            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

            let fullText = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items
                    .map((item: any) => item.str)
                    .join(' ');
                fullText += pageText + '\n';
            }

            if (!fullText.trim()) {
                toast.error(t("No text found in PDF"));
                e.target.value = '';
                return;
            }

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                toast.error(t("You must be logged in to upload a resume"));
                return;
            }

            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                toast.error(t("Authentication required"));
                return;
            }

            const { data: existingResumes } = await supabase
                .from("resumes")
                .select("id")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false })
                .limit(1);

            const existingResumeId = existingResumes?.[0]?.id;
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            let response;

            if (existingResumeId) {
                response = await fetch(`${supabaseUrl}/rest/v1/resumes?id=eq.${existingResumeId}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                        'Authorization': `Bearer ${session.access_token}`,
                        'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify({
                        resume_text: fullText.trim(),
                        created_at: new Date().toISOString()
                    })
                });
            } else {
                response = await fetch(`${supabaseUrl}/rest/v1/resumes`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                        'Authorization': `Bearer ${session.access_token}`,
                        'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify({
                        user_id: user.id,
                        resume_text: fullText.trim(),
                        file_url: null
                    })
                });
            }

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Upload error:', errorText);
                throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
            }

            setResumeText(fullText.trim());
            setResumeLoadedAt(new Date());
            toast.success(t("Resume uploaded successfully!"));
            e.target.value = '';
        } catch (error: any) {
            console.error("Error processing PDF:", error);
            toast.error(t("Failed to upload resume"));
            e.target.value = '';
        }
    };

    const generateInterviewQuestions = async () => {
        if (!selectedCompanyId) {
            toast.error(t("Please select a company first"));
            return;
        }

        if (!resumeText) {
            toast.error(t("Please upload your resume first"));
            return;
        }

        setGeneratingQuestions(true);
        try {
            const selectedApp = applications.find(app => app.id === selectedCompanyId);
            if (!selectedApp || !selectedApp.job_description) {
                toast.error(t("No job description available for this company"));
                return;
            }

            toast.info(t("Generating interview questions..."));

            const response = await fetch(getApiEndpoint('generate-interview-questions'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    resumeText: resumeText,
                    jobDescription: selectedApp.job_description,
                    companyName: selectedApp.companies.name,
                    jobTitle: selectedApp.job_title,
                    apiKey: customApiKey
                })
            });

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error("Server endpoint not found. Please restart the backend server (npm run server).");
                }

                const errorData = await response.json().catch(() => ({}));

                if (errorData.requiresKey) {
                    setShowApiKeyInput(true);
                    toast.error(t("API limit reached or key missing. Please enter your own API key."));
                    return;
                }

                throw new Error(errorData.error || 'Failed to generate interview questions');
            }

            const data = await response.json();
            console.log("=== FULL AI RESPONSE ===");
            console.log(data.questions);
            console.log("=== END RESPONSE ===");
            setInterviewQuestions(data.questions);
            toast.success(t("Interview questions generated!"));

            if (customApiKey) {
                try {
                    await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/update-env`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            key: 'GEMINI_API_KEY',
                            value: customApiKey
                        })
                    });
                    toast.success(t("API Key saved for future use"));
                    setShowApiKeyInput(false);
                } catch (err) {
                    console.error("Failed to save API key:", err);
                }
            }

        } catch (error: any) {
            console.error("Error generating questions:", error);
            toast.error(error.message || t("Failed to generate interview questions"));
        } finally {
            setGeneratingQuestions(false);
        }
    };

    const formatDateTime = (date: Date) => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const day = date.getDate();
        const month = months[date.getMonth()];
        const year = date.getFullYear();

        let hours = date.getHours();
        const minutes = date.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;

        const formattedDate = `${day} ${month} ${year}`;
        const formattedTime = `${hours}:${minutes.toString().padStart(2, '0')} ${ampm}`;

        return { date: formattedDate, time: formattedTime };
    };

    const renderInterviewQuestions = (text: string) => {
        if (!text) return null;

        const detectCodeLanguage = (code: string): string => {
            const trimmed = code.trim().toLowerCase();
            const original = code.trim();

            const languagePatterns: Record<string, string[]> = {
                python: ['def ', 'import ', 'print(', 'class ', '__init__', 'self.', 'elif ', 'lambda '],
                java: ['public class', 'private ', 'system.out.println', 'void ', 'static ', 'extends ', 'implements '],
                javascript: ['const ', 'let ', 'var ', 'function ', '=>', 'console.log', 'async ', 'await '],
                typescript: ['interface ', 'type ', ': string', ': number', 'export ', 'import {'],
                go: ['func ', 'package main', 'import "', 'go ', 'defer ', 'chan '],
                rust: ['fn ', 'let mut', 'impl ', 'trait ', 'struct ', 'enum ', 'use '],
                sql: ['select ', 'from ', 'where ', 'insert ', 'update ', 'delete ', 'join ', 'group by'],
                verilog: ['module ', 'always @', 'reg ', 'wire ', 'input ', 'output ', 'assign '],
                systemverilog: ['class ', 'virtual ', 'interface ', 'constraint ', 'randomize', 'covergroup '],
                vhdl: ['entity ', 'architecture ', 'process ', 'signal ', 'port ', 'component '],
                dax: ['evaluate', 'calculate', 'sumx', 'filter(', 'related(', 'earlier('],
                c: ['#include', 'int main', 'printf(', 'malloc(', 'void*', 'struct '],
                cpp: ['#include <iostream>', 'std::', 'class ', 'namespace ', 'template<', 'cout <<'],
                csharp: ['using system', 'namespace ', 'class ', 'public ', 'private ', 'var '],
                ruby: ['def ', 'end', 'puts ', 'require ', 'class ', 'module ', 'do |'],
                php: ['<?php', 'function ', 'echo ', '$_', 'require ', 'namespace '],
                swift: ['func ', 'var ', 'let ', 'import ', 'class ', 'struct ', 'protocol '],
                kotlin: ['fun ', 'val ', 'var ', 'class ', 'data class', 'object ', 'companion '],
                scala: ['def ', 'val ', 'var ', 'object ', 'class ', 'trait ', 'case class'],
                r: ['<- ', 'function(', 'library(', 'data.frame', 'ggplot(', 'summary('],
                matlab: ['function ', 'end', 'disp(', 'plot(', 'matrix(', 'fprintf('],
                shell: ['#!/bin/bash', 'echo ', 'if [', 'fi', 'for ', 'while ', 'do'],
                powershell: ['param(', 'write-host', '$_', 'foreach ', 'get-', 'set-'],
                yaml: ['apiversion:', 'kind:', 'metadata:', 'spec:', '- name:'],
                json: ['{"', '": "', '": {', '": ['],
                xml: ['<?xml', '</', '<!doctype', 'xmlns='],
                html: ['<!doctype html', '<html', '<head', '<body', '<div', '<script'],
                css: ['{', '}', 'display:', 'margin:', 'padding:', 'color:'],
                assembly: ['mov ', 'add ', 'sub ', 'jmp ', 'call ', 'ret', 'push ', 'pop '],
                fortran: ['program ', 'subroutine ', 'function ', 'implicit ', 'real ', 'integer '],
                cobol: ['identification division', 'procedure division', 'working-storage', 'perform '],
                lua: ['function ', 'local ', 'then', 'end', 'require ', 'table.'],
                perl: ['sub ', 'my ', '$_', 'use ', 'print ', 'foreach '],
                haskell: ['data ', 'type ', 'class ', 'instance ', 'where ', '::'],
                elixir: ['defmodule ', 'def ', 'do', 'end', 'defp ', '|>'],
                dart: ['void ', 'class ', 'import ', 'async ', 'await ', 'widget '],
                solidity: ['pragma solidity', 'contract ', 'function ', 'mapping(', 'address ', 'uint'],
            };

            for (const [language, patterns] of Object.entries(languagePatterns)) {
                for (const pattern of patterns) {
                    if (trimmed.includes(pattern)) {
                        return language;
                    }
                }
            }

            const codeIndicators = [
                /\{[\s\S]*\}/,
                /\([\s\S]*\)[\s]*\{/,
                /;[\s]*$/,
                /^\s*(if|for|while|switch|try|catch)\s*\(/,
                /\[\d+\]/,
                /->|=>|::|\.\w+\(/,
            ];

            for (const indicator of codeIndicators) {
                if (indicator.test(original)) {
                    return 'code';
                }
            }

            return 'code';
        };

        // Function to convert **bold** markdown to HTML
        const convertBoldToHtml = (text: string): JSX.Element[] => {
            const parts = text.split(/(\*\*[^*]+\*\*)/g);
            return parts.map((part, idx) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    const boldText = part.slice(2, -2);
                    return <strong key={idx} className="font-bold text-blue-900">{boldText}</strong>;
                }
                return <span key={idx}>{part}</span>;
            });
        };

        // Remove escape characters but preserve **bold** markers
        let cleanedText = text
            .replace(/\\\//g, '')
            .replace(/\\/g, '')
            .trim();

        // Remove any section headers like "--- PART 1: ..." but keep questions
        cleanedText = cleanedText.replace(/^---.*?---$/gm, '').trim();

        // Split by question numbers (1. 2. 3. etc.) or (Question 1:, Question 2:, etc.)
        let questions = cleanedText.split(/(?=^(?:Question\s+)?\d+[\.:]\s+)/gm).filter(Boolean);

        if (questions.length === 0 || questions.length === 1) {
            questions = cleanedText.split(/\n\n+/).filter(Boolean);
        }

        if (questions.length === 0) {
            questions = [cleanedText];
        }

        // Filter out lines that are just "Question" without any content or separator lines
        questions = questions.filter(q => {
            const trimmed = q.trim();
            return trimmed &&
                trimmed.toLowerCase() !== 'question' &&
                trimmed.length > 10 &&
                !trimmed.match(/^question\s*$/i) &&
                !trimmed.match(/^---.*---$/);
        });
        if (questions.length > 20) {
            console.warn(`⚠️ AI generated ${questions.length} questions, limiting to 20`);
            questions = questions.slice(0, 20);
        }
        let questionCounter = 0;

        return questions.map((question, index) => {
            if (index >= 20) return null;
            const cleanQuestion = question.trim();
            if (!cleanQuestion) return null;

            const lines = cleanQuestion.split('\n').filter(line => line.trim());

            let questionLine = '';
            let contentLines: string[] = [];

            if (lines.length > 0) {
                const firstLine = lines[0];
                // Match "Question 1:" or "1." formats
                if (firstLine.match(/^(?:Question\s+)?\d+[\.:]/)) {
                    questionLine = firstLine.trim();
                    contentLines = lines.slice(1);
                    questionCounter++;
                } else if (firstLine.match(/^\d+[\.:]/)) {
                    // Handle case where number is at start
                    questionLine = firstLine.trim();
                    contentLines = lines.slice(1);
                    questionCounter++;
                } else {
                    // If no number found, still increment and add manually
                    questionCounter++;
                    questionLine = `${questionCounter}. ${firstLine}`;
                    contentLines = lines.slice(1);
                }
            }

            // Filter out separator lines from content
            contentLines = contentLines.filter(line =>
                !line.match(/^---.*---$/) &&
                line.trim().length > 0
            );

            // Skip if this is just a standalone "Question" text or has no content
            if (questionLine.match(/^(?:Question\s*)?$/i) || contentLines.length === 0) {
                return null;
            }

            const renderContent = (contentLines: string[]) => {
                const result: JSX.Element[] = [];
                let i = 0;
                let currentParagraph: string[] = [];

                const flushParagraph = () => {
                    if (currentParagraph.length > 0) {
                        let paragraphText = currentParagraph.join(' ').trim();
                        // Remove any trailing --- markers
                        paragraphText = paragraphText.replace(/---+\s*$/, '').trim();
                        if (paragraphText && paragraphText.length > 10) {
                            result.push(
                                <p key={`paragraph-${result.length}`} className="mb-4 text-gray-900 leading-relaxed text-justify">
                                    {convertBoldToHtml(paragraphText)}
                                </p>
                            );
                        }
                        currentParagraph = [];
                    }
                };

                while (i < contentLines.length) {
                    const line = contentLines[i].trim();

                    // Skip empty lines or standalone "Question" text
                    if (!line || line.match(/^question\s*$/i) || line.match(/^---.*---$/)) {
                        flushParagraph();
                        i++;
                        continue;
                    }

                    // Detect code blocks
                    if (line.startsWith('```') ||
                        line.match(/^(def |public class |func |fn |SELECT |WITH |FROM |WHERE |INSERT |UPDATE |DELETE |CREATE |module |EVALUATE |#include|<\?php)/i)) {

                        flushParagraph(); // Flush any pending paragraph before code

                        let codeLines: string[] = [];
                        let language = 'code';

                        if (line.startsWith('```')) {
                            language = line.substring(3).trim() || 'code';
                            i++;
                        } else {
                            codeLines.push(line);
                            i++;
                        }

                        while (i < contentLines.length) {
                            const codeLine = contentLines[i];
                            if (codeLine.trim() === '```') {
                                i++;
                                break;
                            }
                            codeLines.push(codeLine);
                            i++;

                            if (i < contentLines.length) {
                                const nextLine = contentLines[i].trim();
                                if (nextLine && !nextLine.match(/^[\s\{\}\(\)\[\];,\.]/)) {
                                    const boldHeadings = ['Answer:', 'Question:', 'Explanation:', 'Key Points:',
                                        'Follow-up:', 'Example:', 'Technical Details:', 'Best Practice:'];
                                    if (boldHeadings.some(h => nextLine.startsWith(h))) {
                                        break;
                                    }
                                }
                            }
                        }

                        const codeText = codeLines.join('\n').trim();
                        if (codeText) {
                            if (language === 'code') {
                                language = detectCodeLanguage(codeText);
                            }

                            result.push(
                                <div key={`code-${result.length}`} className="my-4 rounded-lg overflow-hidden border-2 border-blue-300 bg-gray-900 shadow-lg">
                                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2 flex items-center justify-between">
                                        <span className="text-white text-xs font-bold uppercase tracking-wide">
                                            {language} Code
                                        </span>
                                    </div>
                                    <pre className="p-4 overflow-x-auto text-sm">
                                        <code className="text-green-400 font-bold leading-relaxed">
                                            {codeText}
                                        </code>
                                    </pre>
                                </div>
                            );
                        }
                        continue;
                    }

                    const cleanLine = line.replace(/[^\w\s\d.,!?;:()\-]/g, ' ').replace(/\s+/g, ' ').trim();
                    if (!cleanLine) {
                        flushParagraph();
                        i++;
                        continue;
                    }

                    // Check for special headings like "Answer:"
                    const boldHeadings = [
                        'Answer:', 'Question:', 'Explanation:', 'Key Points:',
                        'Follow-up:', 'Example:', 'Technical Details:', 'Best Practice:'
                    ];

                    let isHeading = false;
                    for (const heading of boldHeadings) {
                        if (cleanLine.startsWith(heading)) {
                            flushParagraph(); // Flush before heading
                            const content = cleanLine.substring(heading.length).trim();
                            result.push(
                                <div key={`heading-${result.length}`} className="mb-2 mt-4">
                                    <h4 className="text-base font-bold text-blue-900 mb-2">
                                        {heading}
                                    </h4>
                                    {content && content.length > 10 && (
                                        <p className="text-gray-900 leading-relaxed">
                                            {convertBoldToHtml(content)}
                                        </p>
                                    )}
                                </div>
                            );
                            isHeading = true;
                            break;
                        }
                    }

                    if (!isHeading) {
                        // Add to current paragraph
                        currentParagraph.push(cleanLine);
                    }

                    i++;
                }

                // Flush any remaining paragraph
                flushParagraph();

                return result;
            };

            // Determine question type based on content
            const hasCodeBlock = contentLines.some(line =>
                line.trim().startsWith('```') ||
                line.match(/^(def |public |func |fn |SELECT |module |EVALUATE |class |import |package |let |const |var |function )/i)
            );

            const questionType = hasCodeBlock ? 'coding' : 'conceptual';
            const badge = questionType === 'coding' ? '💻 Coding Question' : '💡 Conceptual Question';
            const badgeColor = questionType === 'coding' ? 'bg-purple-100 text-purple-800 border-purple-300' : 'bg-green-100 text-green-800 border-green-300';

            return (
                <div key={index} className="mb-6 last:mb-0 p-6 bg-white rounded-xl border-2 border-gray-200 shadow-md hover:shadow-lg transition-all duration-300">
                    {questionLine && (
                        <div className="mb-5 pb-4 border-b-2 border-gray-200">
                            <div className="flex items-start gap-3 mb-2">
                                <div className="flex-shrink-0 w-10 h-10 bg-[#001f3f] text-white rounded-lg flex items-center justify-center font-bold text-lg shadow-md">
                                    {questionCounter}
                                </div>
                                <h3 className="text-xl font-bold text-[#001f3f] leading-tight flex-1 pt-1">
                                    {questionLine.replace(/^(?:Question\s+)?\d+[\.:]\s*/, '')}
                                </h3>
                            </div>
                            <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full border ${badgeColor} mt-2`}>
                                {badge}
                            </span>
                        </div>
                    )}

                    <div className="text-gray-900 leading-relaxed space-y-2">
                        {renderContent(contentLines)}
                    </div>
                </div>
            );
        }).filter(Boolean);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
            <div className="absolute inset-0 bg-white/60 backdrop-blur-2xl"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.08),transparent_50%),radial-gradient(circle_at_80%_80%,rgba(168,85,247,0.08),transparent_50%)]"></div>

            <LoadingOverlay isLoading={generatingQuestions} message="Generating Interview Questions..." />

            <div className="relative container mx-auto px-4 pb-8 pt-4">
                <div className="mb-6">
                    <Header />
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-2 flex-wrap">
                        <Input
                            type="file"
                            accept=".pdf,application/pdf"
                            className="hidden"
                            id="import-resume"
                            onChange={handleImportResume}
                        />
                        <Button variant="outline" onClick={() => navigate("/applications")} className="glass-card border-gray-200 bg-white/80">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            {t("View Data")}
                        </Button>

                        <Button variant="outline" onClick={() => document.getElementById("import-resume")?.click()} className="glass-card border-gray-200 bg-white/80">
                            <Upload className="h-4 w-4 mr-2" />
                            {t("Import Resume")}
                        </Button>
                    </div>

                    {resumeText && resumeLoadedAt && (
                        <div className="flex flex-col items-end text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg border border-green-200">
                            <div className="flex items-center">
                                <FileText className="h-4 w-4 mr-2" />
                                <span className="font-medium">{t("Resume Loaded")}</span>
                            </div>
                            <div className="text-xs text-green-700 mt-1">
                                {formatDateTime(resumeLoadedAt).date} | {formatDateTime(resumeLoadedAt).time}
                            </div>
                        </div>
                    )}
                </div>

                <Card className="glass-card border-gray-200 bg-white/90 shadow-lg p-6 mb-6">
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col sm:flex-row items-end gap-4">
                            <div className="flex-1 w-full">
                                <label className="text-sm font-semibold text-gray-700 mb-2 block flex items-center gap-2">
                                    <Building2 className="h-4 w-4 text-blue-600" />
                                    Select Company
                                </label>
                                <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Choose a company..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {applications.map((app) => (
                                            <SelectItem key={app.id} value={app.id}>
                                                {app.companies.name} - {app.job_title}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button
                                onClick={generateInterviewQuestions}
                                disabled={!selectedCompanyId || !resumeText || generatingQuestions}
                                className="bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap shadow-md hover:shadow-lg transition-all"
                            >
                                {generatingQuestions ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <MessageSquare className="mr-2 h-4 w-4" />
                                        Generate Questions
                                    </>
                                )}
                            </Button>
                        </div>

                        {showApiKeyInput && (
                            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg animate-in fade-in slide-in-from-top-2">
                                <div className="flex items-center gap-2 text-amber-800 mb-2">
                                    <Key className="h-4 w-4" />
                                    <span className="font-medium text-sm">Enter Gemini API Key</span>
                                </div>
                                <p className="text-xs text-amber-700 mb-3">
                                    The default API key has hit its limit or is invalid. Please enter your own free API key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="underline font-semibold hover:text-amber-900">Google AI Studio</a>.
                                </p>
                                <Input
                                    type="password"
                                    placeholder="Paste your API key here (AIzaSy...)"
                                    value={customApiKey}
                                    onChange={(e) => setCustomApiKey(e.target.value)}
                                    className="bg-white border-amber-300 focus:ring-amber-500"
                                />
                            </div>
                        )}
                    </div>
                </Card>

                <Card className="glass-card border-gray-200 bg-white/90 shadow-lg p-6">
                    {interviewQuestions ? (
                        <div className="space-y-6">
                            <div className="border-b-2 border-gray-200 pb-4">
                                <div className="flex items-center justify-between flex-wrap gap-3">
                                    <div>
                                        <h2 className="text-3xl font-bold text-gray-900 m-0">Interview Questions & Answers</h2>
                                        <p className="text-sm text-gray-600 mt-2">
                                            Based on your resume and the job description
                                        </p>
                                    </div>
                                    <div className="flex gap-3">
                                        <div className="px-4 py-2 bg-green-100 border-2 border-green-300 rounded-lg">
                                            <div className="text-xs text-green-700 font-semibold">Conceptual</div>
                                            <div className="text-2xl font-bold text-green-800">50%</div>
                                        </div>
                                        <div className="px-4 py-2 bg-purple-100 border-2 border-purple-300 rounded-lg">
                                            <div className="text-xs text-purple-700 font-semibold">Coding</div>
                                            <div className="text-2xl font-bold text-purple-800">50%</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4">
                                {renderInterviewQuestions(interviewQuestions)}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold mb-2">No Interview Questions Yet</h3>
                            <p className="text-gray-500 text-sm">
                                Upload your resume, select a company, and click "Generate Questions" to receive AI-powered interview preparation.
                            </p>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
};

export default InterviewPreparation;