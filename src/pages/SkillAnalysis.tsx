import { useState, useEffect } from "react";
import { getApiEndpoint } from '../config/api';
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Upload, ArrowLeft, FileText, Building2, Lightbulb, Loader2, Key, MessageSquare } from "lucide-react";
import Header from "@/components/Header";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { FuzzyLogicMatcher } from "@/utils/fuzzyMatcher";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";

interface Application {
    id: string;
    job_title: string;
    job_description?: string;
    companies: {
        name: string;
    };
}

interface SkillAnalysisResult {
    existingSkills: string[];
    missingSkills: string[];
    extraSkills: string[];
    priorityMissingSkills: string[];
}

const SkillAnalysis = () => {
    const navigate = useNavigate();
    const { t } = useLanguage();
    const [searchParams] = useSearchParams();
    const [applications, setApplications] = useState<Application[]>([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [analyzing, setAnalyzing] = useState(false);
    const [resumeText, setResumeText] = useState<string | null>(null);
    const [resumeLoadedAt, setResumeLoadedAt] = useState<Date | null>(null);
    const [skillAnalysis, setSkillAnalysis] = useState<SkillAnalysisResult | null>(null);

    // Project Suggestions state
    const [activeTab, setActiveTab] = useState<string>("skill-analysis");
    const [generatingProjects, setGeneratingProjects] = useState<boolean>(false);
    const [projectSuggestions, setProjectSuggestions] = useState<string | null>(null);
    const [customApiKey, setCustomApiKey] = useState<string>("");
    const [showApiKeyInput, setShowApiKeyInput] = useState<boolean>(false);

    useEffect(() => {
        fetchApplications();
        fetchLatestResume();

        // Check URL parameter for tab selection (takes priority)
        const tabParam = searchParams.get('tab');
        if (tabParam === 'skills' || tabParam === 'skill-analysis') {
            setActiveTab('skill-analysis');
        } else if (tabParam === 'projects' || tabParam === 'project-suggestions') {
            setActiveTab('project-suggestions');
        } else {
            // Load saved state from localStorage (to survive page reloads)
            const savedSuggestions = localStorage.getItem('projectSuggestions');
            const savedCompanyId = localStorage.getItem('selectedCompanyId');
            const savedTab = localStorage.getItem('activeTab');

            if (savedSuggestions) setProjectSuggestions(savedSuggestions);
            if (savedCompanyId) setSelectedCompanyId(savedCompanyId);
            if (savedTab) setActiveTab(savedTab);
        }
    }, [searchParams]);

    // Save state to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('activeTab', activeTab);
        if (projectSuggestions) localStorage.setItem('projectSuggestions', projectSuggestions);
        if (selectedCompanyId) localStorage.setItem('selectedCompanyId', selectedCompanyId);
    }, [activeTab, projectSuggestions, selectedCompanyId]);

    useEffect(() => {
        if (selectedCompanyId && resumeText) {
            performSkillAnalysis();
        } else {
            setSkillAnalysis(null);
        }
    }, [selectedCompanyId, resumeText]);

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

    const performSkillAnalysis = async () => {
        if (!resumeText || !selectedCompanyId) return;

        setAnalyzing(true);
        try {
            const selectedApp = applications.find(app => app.id === selectedCompanyId);
            if (!selectedApp || !selectedApp.job_description) {
                toast.error(t("No job description available for this company"));
                setSkillAnalysis(null);
                return;
            }

            const matcher = new FuzzyLogicMatcher();
            const result = matcher.calculateScore(resumeText, selectedApp.job_description);

            // Extract all skills from both resume and JD
            const resumeData = matcher.extractSkillsFromText(resumeText);
            const jdData = matcher.extractRequirementsFromText(selectedApp.job_description);

            // Combine skills and tools
            const allResumeSkills = [...resumeData.skills, ...resumeData.tools];
            const allJDSkills = [...jdData.required_skills, ...jdData.required_tools];

            // Calculate existing skills (skills in both resume and JD)
            const existingSkills = [...result.skillsMatched, ...result.toolsMatched];

            // Calculate missing skills (skills in JD but not in resume)
            const baseMissingSkills = [...result.skillsMissing, ...result.toolsMissing];

            // Extract additional missing skills from job description text
            const additionalMissingSkills = extractAdditionalSkillsFromJD(
                selectedApp.job_description,
                resumeText,
                matcher
            );

            // Combine and deduplicate missing skills
            const allMissingSkills = [...new Set([...baseMissingSkills, ...additionalMissingSkills])];

            // Calculate extra skills (skills in resume but not in JD)
            const extraSkills = allResumeSkills.filter(skill =>
                !allJDSkills.some(jdSkill =>
                    matcher.fuzzyStringMatch(skill, jdSkill)
                )
            );

            // Priority missing skills - intelligent selection based on importance
            const priorityMissingSkills = calculatePriorityMissingSkills(
                allMissingSkills,
                selectedApp.job_description
            );

            setSkillAnalysis({
                existingSkills,
                missingSkills: allMissingSkills,
                extraSkills,
                priorityMissingSkills
            });

            toast.success(t("Skill analysis completed!"));
        } catch (error: any) {
            console.error("Error analyzing skills:", error);
            toast.error(t("Failed to analyze skills"));
        } finally {
            setAnalyzing(false);
        }
    };

    // Extract additional skills from job description that aren't in the predefined dictionary
    const extractAdditionalSkillsFromJD = (jobDescription: string, resumeText: string, matcher: FuzzyLogicMatcher): string[] => {
        const additionalSkills: string[] = [];
        const jdLower = jobDescription.toLowerCase();
        const resumeLower = resumeText.toLowerCase();

        // Common skill-related patterns in job descriptions
        const skillPatterns = [
            // "Experience with X" or "Experience in X"
            /experience (?:with|in) ([a-z0-9\s.+#-]{2,30})(?:\s|,|\.|\)|;)/gi,
            // "Knowledge of X"
            /knowledge of ([a-z0-9\s.+#-]{2,30})(?:\s|,|\.|\)|;)/gi,
            // "Proficiency in X" or "Proficient in X"
            /proficien(?:cy|t) in ([a-z0-9\s.+#-]{2,30})(?:\s|,|\.|\)|;)/gi,
            // "Strong X skills"
            /strong ([a-z0-9\s.+#-]{2,30}) skills/gi,
            // "Expert in X" or "Expertise in X"
            /expert(?:ise)? in ([a-z0-9\s.+#-]{2,30})(?:\s|,|\.|\)|;)/gi,
            // "Familiar with X" or "Familiarity with X"
            /familiar(?:ity)? with ([a-z0-9\s.+#-]{2,30})(?:\s|,|\.|\)|;)/gi,
            // "Working knowledge of X"
            /working knowledge of ([a-z0-9\s.+#-]{2,30})(?:\s|,|\.|\)|;)/gi,
            // "Must have X" or "Required: X"
            /(?:must have|required:?) ([a-z0-9\s.+#-]{2,30})(?:\s|,|\.|\)|;)/gi,
            // "Understanding of X"
            /understanding of ([a-z0-9\s.+#-]{2,30})(?:\s|,|\.|\)|;)/gi,
        ];

        // Extract skills using patterns
        skillPatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(jobDescription)) !== null) {
                const skill = match[1].trim();

                // Clean up the skill name
                const cleanedSkill = skill
                    .replace(/\s+/g, ' ')
                    .replace(/\band\b.*$/, '') // Remove "and ..." part
                    .replace(/\bor\b.*$/, '') // Remove "or ..." part
                    .trim();

                // Validate skill (should be reasonable length and format)
                if (cleanedSkill.length >= 2 && cleanedSkill.length <= 30) {
                    // Capitalize first letter of each word
                    const formattedSkill = cleanedSkill
                        .split(' ')
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(' ');

                    // Check if skill is NOT in resume
                    if (!resumeLower.includes(cleanedSkill.toLowerCase()) &&
                        !matcher.fuzzyStringMatch(resumeText, formattedSkill)) {
                        additionalSkills.push(formattedSkill);
                    }
                }
            }
        });

        // Look for bullet points with skills (common in JD requirements sections)
        const bulletPatterns = [
            /[•●○-]\s*([A-Z][a-z0-9\s.+#-]{2,30})(?:\s|,|\.|\n)/g,
            /^\s*\d+\.\s*([A-Z][a-z0-9\s.+#-]{2,30})(?:\s|,|\.|\n)/gm,
        ];

        bulletPatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(jobDescription)) !== null) {
                const skill = match[1].trim();
                if (skill.length >= 3 && skill.length <= 30 &&
                    !resumeLower.includes(skill.toLowerCase())) {
                    additionalSkills.push(skill);
                }
            }
        });

        // Remove duplicates and common non-skill words
        const stopWords = ['experience', 'knowledge', 'skills', 'ability', 'understanding', 'years', 'work', 'team', 'strong', 'good', 'excellent'];
        const uniqueSkills = [...new Set(additionalSkills)]
            .filter(skill => {
                const skillLower = skill.toLowerCase();
                return !stopWords.some(word => skillLower === word || skillLower.startsWith(word + ' '));
            })
            .slice(0, 20); // Limit to top 20 additional skills

        return uniqueSkills;
    };

    // Calculate priority missing skills based on importance and frequency
    const calculatePriorityMissingSkills = (missingSkills: string[], jobDescription: string): string[] => {
        if (missingSkills.length === 0) return [];

        const jdLower = jobDescription.toLowerCase();

        // Define skill categories with importance weights
        const coreLanguages = ['JavaScript', 'TypeScript', 'Python', 'Java', 'C#', 'Go', 'Rust', 'SQL'];
        const coreFrameworks = ['React', 'Angular', 'Vue', 'Next.js', 'Node.js', 'Express', 'Django', 'Flask', 'Spring'];
        const coreDatabases = ['PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch'];
        const coreCloud = ['AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes'];
        const coreDevOps = ['CI/CD', 'Jenkins', 'GitHub Actions', 'GitLab CI', 'Terraform'];

        // Score each missing skill
        const scoredSkills = missingSkills.map(skill => {
            let score = 0;
            const skillLower = skill.toLowerCase();

            // Count occurrences in JD (higher frequency = more important)
            const occurrences = (jdLower.match(new RegExp(skillLower, 'g')) || []).length;
            score += occurrences * 10;

            // Bonus points for core technologies
            if (coreLanguages.some(lang => lang.toLowerCase() === skillLower)) score += 50;
            if (coreFrameworks.some(fw => fw.toLowerCase() === skillLower)) score += 40;
            if (coreDatabases.some(db => db.toLowerCase() === skillLower)) score += 35;
            if (coreCloud.some(cloud => cloud.toLowerCase() === skillLower)) score += 30;
            if (coreDevOps.some(devops => devops.toLowerCase() === skillLower)) score += 25;

            // Bonus for keywords indicating importance
            if (jdLower.includes(`required ${skillLower}`) || jdLower.includes(`must have ${skillLower}`)) score += 30;
            if (jdLower.includes(`strong ${skillLower}`) || jdLower.includes(`expert ${skillLower}`)) score += 20;
            if (jdLower.includes(`proficient ${skillLower}`) || jdLower.includes(`experience with ${skillLower}`)) score += 15;

            return { skill, score };
        });

        // Sort by score (descending) and return top 8 skills
        return scoredSkills
            .sort((a, b) => b.score - a.score)
            .slice(0, 8)
            .map(item => item.skill);
    };

    // Generate project suggestions using Gemini AI
    const generateProjectSuggestions = async () => {
        if (!selectedCompanyId) {
            toast.error(t("Please select a company first"));
            return;
        }

        setGeneratingProjects(true);
        try {
            const selectedApp = applications.find(app => app.id === selectedCompanyId);
            if (!selectedApp || !selectedApp.job_description) {
                toast.error(t("No job description available for this company"));
                return;
            }

            toast.info(t("Generating project suggestions..."));

            const response = await fetch(getApiEndpoint('generate-projects'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    jobDescription: selectedApp.job_description,
                    companyName: selectedApp.companies.name,
                    jobTitle: selectedApp.job_title,
                    apiKey: customApiKey
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));

                if (errorData.requiresKey) {
                    setShowApiKeyInput(true);
                    toast.error(t("API limit reached or key missing. Please enter your own API key."));
                    return;
                }

                throw new Error(errorData.error || 'Failed to generate project suggestions');
            }

            const data = await response.json();
            setProjectSuggestions(data.suggestions);
            toast.success(t("Project suggestions generated!"));

            // If custom key was used successfully, save it to backend
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
                    setShowApiKeyInput(false); // Hide input since it's now saved
                } catch (err) {
                    console.error("Failed to save API key:", err);
                }
            }

        } catch (error: any) {
            console.error("Error generating projects:", error);
            toast.error(error.message || t("Failed to generate project suggestions"));
        } finally {
            setGeneratingProjects(false);
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

    const renderSkillSection = (title: string, skills: string[], badgeColor: string, borderColor: string, iconColor: string) => {
        return (
            <Card className={`bg-white p-6 shadow-lg rounded-xl border-2 ${borderColor}`}>
                <h3 className={`text-xl font-bold mb-4 flex items-center gap-2 ${iconColor}`}>
                    <div className={`w-3 h-3 rounded-full ${badgeColor}`}></div>
                    {title}
                </h3>
                {skills.length === 0 ? (
                    <p className="text-sm text-gray-500">No skills in this category</p>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {skills.map((skill, index) => (
                            <span
                                key={index}
                                className={`px-3 py-1.5 ${badgeColor} text-white rounded-full text-sm font-medium shadow-sm hover:shadow-md transition-shadow`}
                            >
                                {skill}
                            </span>
                        ))}
                    </div>
                )}
                <div className={`mt-4 pt-4 border-t border-gray-200`}>
                    <p className={`text-sm font-semibold ${iconColor}`}>Total: {skills.length}</p>
                </div>
            </Card>
        );
    };

    // Custom renderer for project suggestions with clean formatting and bold headings
    const renderProjectSuggestions = (text: string) => {
        if (!text) return null;

        // First, clean up ALL escaped characters and markdown artifacts
        let cleanedText = text
            .replace(/\\\*/g, '')      // Remove escaped asterisks \*
            .replace(/\*\*/g, '')      // Remove double asterisks **
            .replace(/\*/g, '')        // Remove single asterisks *
            .replace(/\\\//g, '')      // Remove escaped forward slashes \/
            .replace(/\\/g, '')        // Remove any remaining backslashes
            .trim();

        // Split by numbered list (e.g., "1. ", "2. ", "3. ")
        let projects = cleanedText.split(/(?=\d+\.\s+)/g).filter(Boolean);

        // If no proper split, try by double newlines
        if (projects.length === 0 || projects.length === 1) {
            projects = cleanedText.split(/\n\n+/).filter(Boolean);
        }

        // If still no proper split, return as single block
        if (projects.length === 0) {
            projects = [cleanedText];
        }

        return projects.map((project, index) => {
            const cleanProject = project.trim();
            if (!cleanProject) return null;

            // Parse the project to extract title and content
            const lines = cleanProject.split('\n').filter(line => line.trim());

            // Find the title line (usually first line with number)
            let titleLine = '';
            let contentLines: string[] = [];

            if (lines.length > 0) {
                const firstLine = lines[0];
                // Match patterns like "1. Project Title: Name"
                if (firstLine.match(/^\d+\./)) {
                    titleLine = firstLine.trim();
                    contentLines = lines.slice(1);
                } else {
                    contentLines = lines;
                }
            }

            // Function to render a line with potential bold headings
            const renderLine = (line: string, lineIndex: number) => {
                const trimmedLine = line.trim();
                if (!trimmedLine) return null;

                // Check if line starts with specific headings that should be bold
                const boldHeadings = [
                    'Project Description:',
                    'Key Technologies/Skills Used:',
                    'Why it\'s impressive for this role:',
                    'Why its impressive for this role:',
                    'Technologies:',
                    'Skills:',
                    'Description:'
                ];

                // Check if this line starts with any of the bold headings
                for (const heading of boldHeadings) {
                    if (trimmedLine.startsWith(heading)) {
                        const content = trimmedLine.substring(heading.length).trim();
                        return (
                            <p key={lineIndex} className="mb-2">
                                <strong className="font-bold text-gray-900">{heading}</strong>
                                {content && ` ${content}`}
                            </p>
                        );
                    }
                }

                // Regular line without bold heading
                return <p key={lineIndex} className="mb-2">{trimmedLine}</p>;
            };

            return (
                <div key={index} className="mb-6 last:mb-0 p-5 bg-gradient-to-br from-purple-50 to-white rounded-lg border border-purple-200 shadow-sm hover:shadow-md transition-all duration-200">
                    {/* Project Title - Bold on One Line */}
                    {titleLine && (
                        <div className="mb-4 pb-3 border-b border-purple-100">
                            <h3 className="text-lg font-bold text-purple-900 leading-tight">
                                {titleLine}
                            </h3>
                        </div>
                    )}

                    {/* Project Content */}
                    <div className="text-gray-700 leading-relaxed space-y-2">
                        {contentLines.map((line, lineIndex) => renderLine(line, lineIndex))}
                    </div>
                </div>
            );
        });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
            <div className="absolute inset-0 bg-white/60 backdrop-blur-2xl"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.08),transparent_50%),radial-gradient(circle_at_80%_80%,rgba(168,85,247,0.08),transparent_50%)]"></div>

            <LoadingOverlay
                isLoading={analyzing || generatingProjects}
                message={analyzing ? "Analyzing Skills..." : "Generating Project Suggestions..."}
            />

            <div className="relative container mx-auto px-4 pb-8 pt-4">
                <div className="mb-6">
                    <Header />
                </div>

                {/* Top Action Bar */}
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
                        <Button onClick={() => navigate("/interview-preparation")} className="bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg hover:from-purple-700 hover:to-pink-700">
                            <MessageSquare className="h-4 w-4 mr-2" />
                            {t("Prepare for Interview")}
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

                {/* Unified Company Selection */}
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

                            {activeTab === 'project-suggestions' && (
                                <Button
                                    onClick={generateProjectSuggestions}
                                    disabled={!selectedCompanyId || generatingProjects}
                                    className="bg-purple-600 hover:bg-purple-700 text-white whitespace-nowrap shadow-md hover:shadow-lg transition-all"
                                >
                                    {generatingProjects ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Generating...
                                        </>
                                    ) : (
                                        <>
                                            <Lightbulb className="mr-2 h-4 w-4" />
                                            Get Suggestions
                                        </>
                                    )}
                                </Button>
                            )}
                        </div>

                        {showApiKeyInput && activeTab === 'project-suggestions' && (
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

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-8 bg-gray-100/50 p-1 rounded-full">
                        <TabsTrigger
                            value="skill-analysis"
                            className="rounded-full data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm transition-all duration-200 font-medium py-2.5"
                        >
                            Skill Analysis
                        </TabsTrigger>
                        <TabsTrigger
                            value="project-suggestions"
                            className="rounded-full data-[state=active]:bg-white data-[state=active]:text-purple-600 data-[state=active]:shadow-sm transition-all duration-200 font-medium py-2.5"
                        >
                            Project Suggestions
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="skill-analysis" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {!selectedCompanyId ? (
                            <div className="text-center py-12 bg-white/50 rounded-xl border-2 border-dashed border-gray-200">
                                <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-500 font-medium">Select a company to analyze skills</p>
                            </div>
                        ) : !skillAnalysis ? (
                            <div className="text-center py-12 bg-white/50 rounded-xl border-2 border-dashed border-gray-200">
                                <Loader2 className="h-12 w-12 text-blue-300 mx-auto mb-3 animate-spin" />
                                <p className="text-gray-500 font-medium">Analyzing skills...</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {renderSkillSection(
                                    "Missing Skills",
                                    skillAnalysis.missingSkills,
                                    "bg-red-500",
                                    "border-red-100",
                                    "text-red-600"
                                )}
                                {renderSkillSection(
                                    "Priority to Learn",
                                    skillAnalysis.priorityMissingSkills,
                                    "bg-orange-500",
                                    "border-orange-100",
                                    "text-orange-600"
                                )}
                                {renderSkillSection(
                                    "Existing Skills",
                                    skillAnalysis.existingSkills,
                                    "bg-green-500",
                                    "border-green-100",
                                    "text-green-600"
                                )}
                                {renderSkillSection(
                                    "Extra Skills",
                                    skillAnalysis.extraSkills,
                                    "bg-blue-500",
                                    "border-blue-100",
                                    "text-blue-600"
                                )}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="project-suggestions" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {!projectSuggestions ? (
                            <div className="text-center py-16 bg-white/50 rounded-xl border-2 border-dashed border-gray-200">
                                <Lightbulb className="h-16 w-16 text-purple-200 mx-auto mb-4" />
                                <h3 className="text-xl font-semibold text-gray-700 mb-2">No Project Suggestions Yet</h3>
                                <p className="text-gray-500 max-w-md mx-auto mb-6">
                                    Select a company and click "Get Suggestions" to generate tailored project ideas based on the job description.
                                </p>
                                <Button
                                    onClick={generateProjectSuggestions}
                                    disabled={!selectedCompanyId || generatingProjects}
                                    className="bg-purple-600 hover:bg-purple-700 text-white shadow-md hover:shadow-lg transition-all"
                                >
                                    {generatingProjects ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Generating...
                                        </>
                                    ) : (
                                        <>
                                            <Lightbulb className="mr-2 h-4 w-4" />
                                            Get Suggestions
                                        </>
                                    )}
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {renderProjectSuggestions(projectSuggestions)}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
};

export default SkillAnalysis;
