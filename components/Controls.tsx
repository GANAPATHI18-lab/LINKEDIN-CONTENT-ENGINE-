import React, { useState, useEffect } from 'react';
import { GenerationType, PostLength, Persona, DifficultyLevel, CompanySuggestion, ImageStyle, ImageAspectRatio, TextOverlayOptions, TextOverlayFont, TextOverlayPlacement, Tone } from '../types';
import { getTopicSuggestions, getCompanySuggestions } from '../services/geminiService';

interface ControlsProps {
    generationType: GenerationType;
    setGenerationType: (type: GenerationType) => void;
    topic: string;
    setTopic: (topic: string) => void;
    pageCount: number;
    setPageCount: (count: number) => void;
    postLength: PostLength;
    setPostLength: (length: PostLength) => void;
    persona: Persona;
    setPersona: (persona: Persona) => void;
    tone: Tone;
    setTone: (tone: Tone) => void;
    difficultyLevel: DifficultyLevel;
    setDifficultyLevel: (level: DifficultyLevel) => void;
    company: string;
    setCompany: (company: string) => void;
    dayNumber: number;
    setDayNumber: (day: number) => void;
    onGenerate: () => void;
    isLoading: boolean;
    imageBackgroundColor: string;
    setImageBackgroundColor: (color: string) => void;
    imageStyle: ImageStyle;
    setImageStyle: (style: ImageStyle) => void;
    logoImage?: string;
    setLogoImage: (dataUrl?: string) => void;
    imageAspectRatio: ImageAspectRatio;
    setImageAspectRatio: (ratio: ImageAspectRatio) => void;
    textOverlay: TextOverlayOptions;
    setTextOverlay: (options: TextOverlayOptions) => void;
}

const personaDisplayNames: Record<Persona, string> = {
    [Persona.GanapathiKakarla]: 'Ganapathi Kakarla (Expert)',
    // AI & Data Roles (Alphabetical)
    [Persona.AIArchitect]: 'AI Architect',
    [Persona.AIAuditor]: 'AI Auditor',
    [Persona.AIBusinessStrategist]: 'AI Business Strategist',
    [Persona.AIEthicist]: 'AI Ethicist',
    [Persona.AIGovernanceSpecialist]: 'AI Governance Specialist',
    [Persona.AIInfrastructureEngineer]: 'AI Infrastructure Engineer',
    [Persona.AIProductManager]: 'AI Product Manager',
    [Persona.AIQualityAssuranceEngineer]: 'AI QA Engineer',
    [Persona.AIResearcher]: 'AI Researcher',
    [Persona.AIResearchScientist]: 'AI Research Scientist',
    [Persona.AISafetyEngineer]: 'AI Safety Engineer',
    [Persona.AISolutionsConsultant]: 'AI Solutions Consultant',
    [Persona.AITrainer]: 'AI Trainer / Data Curator',
    [Persona.AITutor]: 'AI Tutor / Educator',
    [Persona.AnalyticsEngineer]: 'Analytics Engineer',
    [Persona.BigDataEngineer]: 'Big Data Engineer',
    [Persona.Bioinformatician]: 'Bioinformatician',
    [Persona.BusinessIntelligenceAnalyst]: 'BI Analyst',
    [Persona.BusinessIntelligenceDeveloper]: 'BI Developer',
    [Persona.CDAIO]: 'Chief Data & AI Officer (CDAIO)',
    [Persona.ChiefDataOfficer]: 'Chief Data Officer (CDO)',
    [Persona.ChiefInformationSecurityOfficer]: 'Chief Information Security Officer (CISO)',
    [Persona.ClinicalDataScientist]: 'Clinical Data Scientist',
    [Persona.CloudDataEngineer]: 'Cloud Data Engineer',
    [Persona.CloudEngineer]: 'Cloud Engineer (AI Specialization)',
    [Persona.ComputationalLinguist]: 'Computational Linguist',
    [Persona.ComputerVisionEngineer]: 'Computer Vision Engineer',
    [Persona.ConversationalAIDeveloper]: 'Conversational AI Developer',
    [Persona.DashboardDeveloper]: 'Dashboard Developer',
    [Persona.DataAnalyst]: 'Data Analyst',
    [Persona.DataArchitect]: 'Data Architect',
    [Persona.DataArtist]: 'Data Artist',
    [Persona.DataEngineer]: 'Data Engineer',
    [Persona.DataGovernanceManager]: 'Data Governance Manager',
    [Persona.DataJournalist]: 'Data Journalist',
    [Persona.DataModeler]: 'Data Modeler',
    [Persona.DataPrivacyOfficer]: 'Data Privacy Officer',
    [Persona.DataScientist]: 'Data Scientist',
    [Persona.DataSteward]: 'Data Steward',
    [Persona.DataVisualizationEngineer]: 'Data Visualization Engineer',
    [Persona.DataVisualizationSpecialist]: 'Data Visualization Specialist',
    [Persona.DatabaseAdministrator]: 'Database Administrator (DBA)',
    [Persona.DeepLearningEngineer]: 'Deep Learning Engineer',
    [Persona.DevOpsEngineer]: 'DevOps Engineer (AI/ML Focus)',
    [Persona.DirectorOfAI]: 'Director of AI',
    [Persona.ETLDeveloper]: 'ETL Developer',
    [Persona.GenerativeAISpecialist]: 'Generative AI Specialist',
    [Persona.HeadOfAI]: 'Head of AI',
    [Persona.HealthInformaticsSpecialist]: 'Health Informatics Specialist',
    [Persona.InformationDesigner]: 'Information Designer',
    [Persona.KnowledgeEngineer]: 'Knowledge Engineer',
    [Persona.MachineLearningEngineer]: 'Machine Learning Engineer',
    [Persona.MLOpsEngineer]: 'MLOps Engineer',
    [Persona.NLPSpecialist]: 'NLP Specialist',
    [Persona.OperationsResearchAnalyst]: 'Operations Research Analyst',
    [Persona.PrincipalDataScientist]: 'Principal Data Scientist',
    [Persona.PromptEngineer]: 'Prompt Engineer',
    [Persona.QuantitativeAnalyst]: 'Quantitative Analyst (Quant)',
    [Persona.ReinforcementLearningEngineer]: 'Reinforcement Learning Engineer',
    [Persona.RoboticsEngineer]: 'Robotics Engineer (AI Focus)',
    [Persona.SearchRelevanceEngineer]: 'Search & Relevance Engineer',
    [Persona.SoftwareDeveloper]: 'Software Developer (AI/ML Focus)',
    [Persona.SpeechRecognitionEngineer]: 'Speech Recognition Engineer',
    [Persona.Statistician]: 'Statistician',
    [Persona.UXDesignerDataProducts]: 'UX Designer (Data Products)',
    [Persona.VPofDataScience]: 'VP of Data Science',
    // Healthcare Roles
    [Persona.CardiacTechnologist]: 'Cardiac Technologist',
    [Persona.ChiefMedicalInformationOfficer]: 'Chief Medical Information Officer (CMIO)',
    [Persona.HealthcareAdministrator]: 'Healthcare Administrator',
    [Persona.HealthcareInnovator]: 'Healthcare Innovator',
    [Persona.MedicalDoctor]: 'Medical Doctor',
    [Persona.MedicalImagingAnalyst]: 'Medical Imaging Analyst',
    [Persona.TelehealthCoordinator]: 'Telehealth Coordinator',
};

const topicPlaceholders: Record<GenerationType, string> = {
    [GenerationType.Post]: "e.g., 'AI in Medical Diagnosis'",
    [GenerationType.ImagePost]: "e.g., 'The Future of Telemedicine'",
    [GenerationType.Document]: "e.g., 'A Deep Dive into Federated Learning'",
    [GenerationType.ContentIdeas]: "e.g., 'Patient Data Privacy'",
    [GenerationType.Top10Ideas]: "e.g., 'AI for Drug Discovery'",
    [GenerationType.ProfessionalIdeas]: "e.g., 'Machine Learning in Genomics'",
    [GenerationType.MythBusting]: "e.g., 'AI Replacing Doctors'",
    [GenerationType.QuickWins]: "e.g., 'The Ethics of AI in Healthcare'",
    [GenerationType.ComparativeAnalysis]: "e.g., 'Python vs R for Health Data'",
    [GenerationType.TutorialOutline]: "e.g., 'Building a Pneumonia Detection CNN'",
    [GenerationType.ExamplePost]: "e.g., 'How AI is Revolutionizing Cardiac Care'",
    [GenerationType.DayWiseContentPlan]: "e.g., 'My 10-Day Content Strategy on MLOps'",
    [GenerationType.WeeklyContentPlan]: "e.g., 'Theme for a 7-day content series'",
    [GenerationType.InterviewQuestions]: "e.g., 'AI Engineer Role' or 'Data Scientist Position'",
    [GenerationType.CvEnhancement]: "e.g., 'AI/ML Engineer Role' or 'Data Scientist Position'",
    [GenerationType.ResumeTailoring]: "e.g., 'Healthcare Data Analyst Role' or 'Clinical NLP Specialist Position'",
    [GenerationType.CompanyProspector]: "e.g., 'AI Research Scientist Role' or 'ML Ops Position'",
};

enum Industry {
    BigTech = 'Big Tech',
    Healthcare = 'Healthcare',
    Consulting = 'Consulting',
}

const predefinedCompanies: CompanySuggestion[] = [
    { name: 'Google', industry: Industry.BigTech }, { name: 'Microsoft', industry: Industry.BigTech },
    { name: 'Amazon', industry: Industry.BigTech }, { name: 'Apple', industry: Industry.BigTech },
    { name: 'Meta', industry: Industry.BigTech }, { name: 'NVIDIA', industry: Industry.BigTech },
    { name: 'Oracle', industry: Industry.BigTech }, { name: 'IBM', industry: Industry.BigTech },
    { name: 'Intel', industry: Industry.BigTech }, { name: 'Salesforce', industry: Industry.BigTech },
    { name: 'Adobe', industry: Industry.BigTech }, { name: 'SAP', industry: Industry.BigTech },
    { name: 'UnitedHealth Group', industry: Industry.Healthcare }, { name: 'CVS Health', industry: Industry.Healthcare },
    { name: 'Johnson & Johnson', industry: Industry.Healthcare }, { name: 'Pfizer', industry: Industry.Healthcare },
    { name: 'Siemens Healthineers', industry: Industry.Healthcare }, { name: 'GE Healthcare', industry: Industry.Healthcare },
    { name: 'Philips Healthcare', industry: Industry.Healthcare }, { name: 'Accenture', industry: Industry.Consulting },
    { name: 'Deloitte', industry: Industry.Consulting }, { name: 'PwC', industry: Industry.Consulting },
    { name: 'KPMG', industry: Industry.Consulting }, { name: 'EY', industry: Industry.Consulting },
];

const availableFonts: { name: TextOverlayFont; class: string }[] = [
    { name: 'Inter', class: 'font-inter' },
    { name: 'Roboto Slab', class: 'font-roboto-slab' },
    { name: 'Playfair Display', class: 'font-playfair-display' },
];


const Controls: React.FC<ControlsProps> = ({
    generationType,
    setGenerationType,
    topic,
    setTopic,
    pageCount,
    setPageCount,
    postLength,
    setPostLength,
    persona,
    setPersona,
    tone,
    setTone,
    difficultyLevel,
    setDifficultyLevel,
    company,
    setCompany,
    dayNumber,
    setDayNumber,
    onGenerate,
    isLoading,
    imageBackgroundColor,
    setImageBackgroundColor,
    imageStyle,
    setImageStyle,
    logoImage,
    setLogoImage,
    imageAspectRatio,
    setImageAspectRatio,
    textOverlay,
    setTextOverlay,
}) => {
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [suggestionsLoading, setSuggestionsLoading] = useState<boolean>(false);
    const [moreSuggestionsLoading, setMoreSuggestionsLoading] = useState<boolean>(false);
    const [suggestionsVisible, setSuggestionsVisible] = useState<boolean>(false);
    const [fetchedConfig, setFetchedConfig] = useState<{type: GenerationType, persona: Persona} | null>(null);
    const [suggestionsError, setSuggestionsError] = useState<string | null>(null);
    
    const [companySuggestions, setCompanySuggestions] = useState<CompanySuggestion[]>([]);
    const [moreCompanySuggestionsLoading, setMoreCompanySuggestionsLoading] = useState<boolean>(false);
    const [companySuggestionsVisible, setCompanySuggestionsVisible] = useState<boolean>(false);
    const [companySuggestionsError, setCompanySuggestionsError] = useState<string | null>(null);
    const [activeIndustryFilter, setActiveIndustryFilter] = useState<Industry | 'All'>('All');


    useEffect(() => {
        setSuggestions([]);
        setFetchedConfig(null);
    }, [generationType, persona]);


    const handleTopicFocus = async () => {
        setSuggestionsVisible(true);
        setSuggestionsError(null);

        const currentConfig = { type: generationType, persona };
        if (fetchedConfig && fetchedConfig.type === currentConfig.type && fetchedConfig.persona === currentConfig.persona && suggestions.length > 0) {
            return;
        }

        setSuggestionsLoading(true);
        setSuggestions([]);
        try {
            const typeForSuggestion = generationType === GenerationType.ImagePost 
                ? GenerationType.Post 
                : generationType;

            const suggestionsPromise = getTopicSuggestions(typeForSuggestion, persona, [], topic);
            
            const timeoutPromise = new Promise<string[]>((_, reject) => 
                setTimeout(() => reject(new Error("Request timed out after 30 seconds.")), 30000)
            );

            const newSuggestions = await Promise.race([suggestionsPromise, timeoutPromise]);
            
            setSuggestions(newSuggestions);
            setFetchedConfig(currentConfig);

        } catch (error) {
             if (error instanceof Error) {
                console.error("Error fetching suggestions:", error);
                setSuggestionsError(error.message || "Failed to load suggestions.");
             }
             setSuggestions([]);
        } finally {
            setSuggestionsLoading(false);
        }
    };

    const handleSuggestMore = async () => {
        setMoreSuggestionsLoading(true);
        setSuggestionsError(null);
        try {
            const typeForSuggestion = generationType === GenerationType.ImagePost 
                ? GenerationType.Post 
                : generationType;

            const suggestionsPromise = getTopicSuggestions(typeForSuggestion, persona, suggestions, topic);
            
            const timeoutPromise = new Promise<string[]>((_, reject) => 
                setTimeout(() => reject(new Error("Request timed out after 30 seconds.")), 30000)
            );

            const newSuggestions = await Promise.race([suggestionsPromise, timeoutPromise]);
            
            const uniqueNewSuggestions = newSuggestions.filter(s => !suggestions.includes(s));
            
            if (uniqueNewSuggestions.length > 0) {
                setSuggestions(prev => [...prev, ...uniqueNewSuggestions]);
            } else {
                setSuggestionsError("No new suggestions found. Please try changing the topic.");
            }
        } catch (error) {
             if (error instanceof Error) {
                console.error("Error fetching more suggestions:", error);
                setSuggestionsError(error.message || "Failed to load suggestions. Please try again.");
             } else {
                setSuggestionsError("An unknown error occurred.");
             }
        } finally {
            setMoreSuggestionsLoading(false);
        }
    };
    
    const handleCompanyFocus = () => {
        setCompanySuggestionsVisible(true);
        setCompanySuggestionsError(null);
        if (companySuggestions.length === 0) {
            setCompanySuggestions(predefinedCompanies);
        }
    };

    const handleSuggestMoreCompanies = async () => {
        setMoreCompanySuggestionsLoading(true);
        setCompanySuggestionsError(null);
        try {
            const suggestionsPromise = getCompanySuggestions(topic, companySuggestions);

            const timeoutPromise = new Promise<CompanySuggestion[]>((_, reject) => 
                setTimeout(() => reject(new Error("Request timed out after 30 seconds.")), 30000)
            );

            const newSuggestions = await Promise.race([suggestionsPromise, timeoutPromise]);
            
            const existingNames = new Set(companySuggestions.map(s => s.name));
            const uniqueNewSuggestions = newSuggestions.filter(s => !existingNames.has(s.name));

            if (uniqueNewSuggestions.length > 0) {
                setCompanySuggestions(prev => [...prev, ...uniqueNewSuggestions]);
            } else {
                setCompanySuggestionsError("No new company suggestions found. Please try refining the role/skill.");
            }
        } catch (error) {
             if (error instanceof Error) {
                console.error("Error fetching more company suggestions:", error);
                setCompanySuggestionsError(error.message || "Failed to load companies. Please try again.");
             } else {
                setCompanySuggestionsError("An unknown error occurred.");
             }
        } finally {
            setMoreCompanySuggestionsLoading(false);
        }
    };

    const isCareerTopicType = [
        GenerationType.InterviewQuestions,
        GenerationType.CvEnhancement,
        GenerationType.ResumeTailoring,
        GenerationType.CompanyProspector
    ].includes(generationType);

    const isCareerInputType = [
        GenerationType.InterviewQuestions,
        GenerationType.CvEnhancement,
        GenerationType.ResumeTailoring
    ].includes(generationType);

    const showToneSelector = [
        GenerationType.Post,
        GenerationType.ImagePost,
        GenerationType.Document,
        GenerationType.ExamplePost,
        GenerationType.DayWiseContentPlan,
        GenerationType.WeeklyContentPlan,
        GenerationType.MythBusting,
        GenerationType.ComparativeAnalysis,
        GenerationType.TutorialOutline,
        GenerationType.CvEnhancement,
        GenerationType.ResumeTailoring,
    ].includes(generationType);

    const filteredCompanies = companySuggestions.filter(suggestion => {
        const industryMatch = activeIndustryFilter === 'All' || suggestion.industry === activeIndustryFilter;
        if (!industryMatch) {
            return false;
        }
        return suggestion.name.toLowerCase().includes(company.toLowerCase());
    });
    
    const filterButtonBase = 'px-3 py-1 text-xs font-semibold rounded-full transition-all duration-200 focus:outline-none';
    const filterButtonActive = 'bg-blue-600 text-white ring-2 ring-offset-2 ring-offset-gray-700 ring-blue-500 shadow-lg';
    const filterButtonInactive = 'bg-gray-600 text-gray-300 hover:bg-gray-500';

    const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogoImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleTextOverlayChange = (field: keyof TextOverlayOptions, value: any) => {
        setTextOverlay({ ...textOverlay, [field]: value });
    };

    return (
        <div className="bg-gray-800 p-6 rounded-2xl shadow-lg space-y-6">
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Content Type</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-2 bg-gray-700 p-1 rounded-lg">
                    <button onClick={() => setGenerationType(GenerationType.Post)} className={`px-2 py-2 text-sm font-semibold rounded-md transition-colors duration-200 ${generationType === GenerationType.Post ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}>Post</button>
                    <button onClick={() => setGenerationType(GenerationType.ImagePost)} className={`px-2 py-2 text-sm font-semibold rounded-md transition-colors duration-200 ${generationType === GenerationType.ImagePost ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}>Post + Image</button>
                    <button onClick={() => setGenerationType(GenerationType.Document)} className={`px-2 py-2 text-sm font-semibold rounded-md transition-colors duration-200 ${generationType === GenerationType.Document ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}>Document</button>
                    <button onClick={() => setGenerationType(GenerationType.WeeklyContentPlan)} className={`px-2 py-2 text-sm font-semibold rounded-md transition-colors duration-200 ${generationType === GenerationType.WeeklyContentPlan ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}>Weekly Plan</button>
                    <button onClick={() => setGenerationType(GenerationType.ContentIdeas)} className={`px-2 py-2 text-sm font-semibold rounded-md transition-colors duration-200 ${generationType === GenerationType.ContentIdeas ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}>Content Ideas</button>
                    <button onClick={() => setGenerationType(GenerationType.Top10Ideas)} className={`px-2 py-2 text-sm font-semibold rounded-md transition-colors duration-200 ${generationType === GenerationType.Top10Ideas ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}>Top 10 Ideas</button>
                    <button onClick={() => setGenerationType(GenerationType.ProfessionalIdeas)} className={`px-2 py-2 text-sm font-semibold rounded-md transition-colors duration-200 ${generationType === GenerationType.ProfessionalIdeas ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}>Professional Ideas</button>
                    <button onClick={() => setGenerationType(GenerationType.MythBusting)} className={`px-2 py-2 text-sm font-semibold rounded-md transition-colors duration-200 ${generationType === GenerationType.MythBusting ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}>Myth Busting</button>
                    <button onClick={() => setGenerationType(GenerationType.QuickWins)} className={`px-2 py-2 text-sm font-semibold rounded-md transition-colors duration-200 ${generationType === GenerationType.QuickWins ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}>Quick Wins</button>
                    <button onClick={() => setGenerationType(GenerationType.ComparativeAnalysis)} className={`px-2 py-2 text-sm font-semibold rounded-md transition-colors duration-200 ${generationType === GenerationType.ComparativeAnalysis ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}>Compare/Contrast</button>
                    <button onClick={() => setGenerationType(GenerationType.TutorialOutline)} className={`px-2 py-2 text-sm font-semibold rounded-md transition-colors duration-200 ${generationType === GenerationType.TutorialOutline ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}>Tutorial Outline</button>
                    <button onClick={() => setGenerationType(GenerationType.ExamplePost)} className={`px-2 py-2 text-sm font-semibold rounded-md transition-colors duration-200 ${generationType === GenerationType.ExamplePost ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}>Example Post</button>
                    <button onClick={() => setGenerationType(GenerationType.DayWiseContentPlan)} className={`px-2 py-2 text-sm font-semibold rounded-md transition-colors duration-200 ${generationType === GenerationType.DayWiseContentPlan ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}>Day-wise Plan</button>
                    <button onClick={() => setGenerationType(GenerationType.InterviewQuestions)} className={`px-2 py-2 text-sm font-semibold rounded-md transition-colors duration-200 ${generationType === GenerationType.InterviewQuestions ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}>Interview Qs</button>
                    <button onClick={() => setGenerationType(GenerationType.CvEnhancement)} className={`px-2 py-2 text-sm font-semibold rounded-md transition-colors duration-200 ${generationType === GenerationType.CvEnhancement ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}>CV Enhancement</button>
                    <button onClick={() => setGenerationType(GenerationType.ResumeTailoring)} className={`px-2 py-2 text-sm font-semibold rounded-md transition-colors duration-200 ${generationType === GenerationType.ResumeTailoring ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}>Resume Tailoring</button>
                    <button onClick={() => setGenerationType(GenerationType.CompanyProspector)} className={`px-2 py-2 text-sm font-semibold rounded-md transition-colors duration-200 ${generationType === GenerationType.CompanyProspector ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}>Prospect Companies</button>
                </div>
            </div>

            {(generationType === GenerationType.Post || generationType === GenerationType.ImagePost) && (
                 <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Post Length</label>
                    <div className="grid grid-cols-3 gap-2 bg-gray-700 p-1 rounded-lg">
                        {(Object.keys(PostLength) as Array<keyof typeof PostLength>).map((key) => (
                            <button
                                key={key}
                                onClick={() => setPostLength(PostLength[key])}
                                className={`capitalize px-4 py-2 text-sm font-semibold rounded-md transition-colors duration-200 ${postLength === PostLength[key] ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}
                            >
                                {PostLength[key]}
                            </button>
                        ))}
                    </div>
                </div>
            )}
            
            {generationType === GenerationType.DayWiseContentPlan && (
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Select Day</label>
                    <div className="grid grid-cols-5 gap-2 bg-gray-700 p-1 rounded-lg">
                        {Array.from({ length: 10 }, (_, i) => i + 1).map(day => (
                            <button
                                key={day}
                                onClick={() => setDayNumber(day)}
                                className={`aspect-square text-sm font-semibold rounded-md transition-colors duration-200 ${dayNumber === day ? 'bg-blue-600 text-white ring-2 ring-offset-2 ring-offset-gray-800 ring-blue-500' : 'text-gray-300 bg-gray-600/50 hover:bg-gray-600'}`}
                            >
                                {day}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {generationType === GenerationType.ImagePost && (
                <>
                <div className="space-y-4 p-4 border border-gray-700 rounded-lg bg-gray-900/30">
                    <h3 className="text-md font-semibold text-gray-200 border-b border-gray-600 pb-2">Image Customization</h3>
                    <div>
                        <label htmlFor="bgColor" className="block text-sm font-medium text-gray-300 mb-2">Background Color</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="color"
                                value={imageBackgroundColor || '#1F2937'}
                                onChange={(e) => setImageBackgroundColor(e.target.value)}
                                className="p-1 h-10 w-10 block bg-gray-700 border border-gray-600 cursor-pointer rounded-lg"
                                title="Select a color"
                            />
                            <input
                                type="text"
                                id="bgColor"
                                value={imageBackgroundColor}
                                onChange={(e) => setImageBackgroundColor(e.target.value)}
                                placeholder="e.g., #1a2b3c or 'dark blue'"
                                className="w-full bg-gray-700 text-white rounded-lg border border-gray-600 px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Image Style</label>
                        <div className="grid grid-cols-3 gap-2">
                            {Object.values(ImageStyle).map((style) => (
                                <button
                                    key={style}
                                    onClick={() => setImageStyle(style)}
                                    className={`capitalize px-3 py-2 text-xs font-semibold rounded-md transition-colors duration-200 ${imageStyle === style ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                                >
                                    {style}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Aspect Ratio</label>
                        <div className="grid grid-cols-3 gap-2">
                            <button
                                onClick={() => setImageAspectRatio(ImageAspectRatio.Square)}
                                className={`px-3 py-2 text-xs font-semibold rounded-md transition-colors duration-200 ${imageAspectRatio === ImageAspectRatio.Square ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                            >
                                Square (1:1)
                            </button>
                            <button
                                onClick={() => setImageAspectRatio(ImageAspectRatio.Landscape)}
                                className={`px-3 py-2 text-xs font-semibold rounded-md transition-colors duration-200 ${imageAspectRatio === ImageAspectRatio.Landscape ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                            >
                                Landscape (16:9)
                            </button>
                            <button
                                onClick={() => setImageAspectRatio(ImageAspectRatio.Portrait)}
                                className={`px-3 py-2 text-xs font-semibold rounded-md transition-colors duration-200 ${imageAspectRatio === ImageAspectRatio.Portrait ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                            >
                                Portrait (3:4)
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Incorporate Logo (Optional)</label>
                        <div className="mt-1 flex items-center gap-4">
                            {logoImage ? (
                                <div className="flex items-center gap-2 p-2 bg-gray-700 rounded-lg">
                                    <img src={logoImage} alt="Logo preview" className="h-10 w-10 object-contain rounded bg-white p-1" />
                                    <button onClick={() => setLogoImage(undefined)} className="text-xs text-red-400 hover:text-red-300 font-semibold pr-2">Remove</button>
                                </div>
                            ) : (
                                <label htmlFor="logo-upload" className="cursor-pointer bg-gray-700 hover:bg-gray-600 text-white text-sm font-semibold py-2 px-4 rounded-lg transition-colors">
                                    Upload Logo
                                </label>
                            )}
                            <input id="logo-upload" name="logo-upload" type="file" className="sr-only" accept="image/png, image/jpeg, image/svg+xml" onChange={handleLogoUpload} />
                        </div>
                    </div>
                </div>
                <div className="space-y-4 p-4 border border-gray-700 rounded-lg bg-gray-900/30">
                     <h3 className="text-md font-semibold text-gray-200 border-b border-gray-600 pb-2">Text Overlay</h3>
                    <div>
                        <label htmlFor="overlayText" className="block text-sm font-medium text-gray-300 mb-2">Overlay Text</label>
                        <textarea
                            id="overlayText"
                            value={textOverlay.text}
                            onChange={(e) => handleTextOverlayChange('text', e.target.value)}
                            placeholder="Add text to your image..."
                            rows={2}
                            className="w-full bg-gray-700 text-white rounded-lg border border-gray-600 px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Font Family</label>
                            <div className="grid grid-cols-3 gap-1 bg-gray-700 p-1 rounded-lg">
                                {availableFonts.map(font => (
                                    <button
                                        key={font.name}
                                        onClick={() => handleTextOverlayChange('fontFamily', font.name)}
                                        className={`px-2 py-1 text-xs rounded-md transition-colors duration-200 ${textOverlay.fontFamily === font.name ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}
                                    >
                                        <span className={font.class}>{font.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Placement</label>
                            <div className="grid grid-cols-3 gap-1 bg-gray-700 p-1 rounded-lg">
                                {(['top', 'center', 'bottom'] as TextOverlayPlacement[]).map(pos => (
                                    <button
                                        key={pos}
                                        onClick={() => handleTextOverlayChange('placement', pos)}
                                        className={`capitalize px-2 py-1 text-xs rounded-md transition-colors duration-200 ${textOverlay.placement === pos ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}
                                    >
                                        {pos}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="fontSize" className="block text-sm font-medium text-gray-300 mb-2">Font Size ({textOverlay.fontSize}px)</label>
                             <input
                                type="range"
                                id="fontSize"
                                min="16"
                                max="128"
                                value={textOverlay.fontSize}
                                onChange={(e) => handleTextOverlayChange('fontSize', parseInt(e.target.value, 10))}
                                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                            />
                        </div>
                         <div>
                            <label htmlFor="fontColor" className="block text-sm font-medium text-gray-300 mb-2">Font Color</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="color"
                                    value={textOverlay.color}
                                    onChange={(e) => handleTextOverlayChange('color', e.target.value)}
                                    className="p-1 h-10 w-10 block bg-gray-700 border border-gray-600 cursor-pointer rounded-lg"
                                    title="Select text color"
                                />
                                <input
                                    type="text"
                                    value={textOverlay.color}
                                    onChange={(e) => handleTextOverlayChange('color', e.target.value)}
                                    className="w-full bg-gray-700 text-white rounded-lg border border-gray-600 px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                />
                            </div>
                        </div>
                    </div>
                </div>
                </>
            )}

            {(generationType === GenerationType.Document || generationType === GenerationType.TutorialOutline) && (
                 <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Difficulty Level</label>
                    <div className="grid grid-cols-3 gap-2 bg-gray-700 p-1 rounded-lg">
                        {(Object.keys(DifficultyLevel) as Array<keyof typeof DifficultyLevel>).map((key) => (
                            <button
                                key={key}
                                onClick={() => setDifficultyLevel(DifficultyLevel[key])}
                                className={`capitalize px-4 py-2 text-sm font-semibold rounded-md transition-colors duration-200 ${difficultyLevel === DifficultyLevel[key] ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}
                            >
                                {DifficultyLevel[key]}
                            </button>
                        ))}
                    </div>
                </div>
            )}
            
            <div>
                <label htmlFor="persona" className="block text-sm font-medium text-gray-300 mb-2">
                    AI Persona
                </label>
                <select
                    id="persona"
                    value={persona}
                    onChange={(e) => setPersona(e.target.value as Persona)}
                    className="w-full bg-gray-700 text-white rounded-lg border border-gray-600 px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                    {Object.values(Persona).map((p) => (
                        <option key={p} value={p}>
                            {personaDisplayNames[p]}
                        </option>
                    ))}
                </select>
            </div>

            {showToneSelector && (
                 <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Writing Tone</label>
                    <div className="grid grid-cols-3 gap-2 bg-gray-700 p-1 rounded-lg">
                        {(Object.values(Tone) as Tone[]).map((t) => (
                            <button
                                key={t}
                                onClick={() => setTone(t)}
                                className={`capitalize px-2 py-2 text-sm font-semibold rounded-md transition-colors duration-200 ${tone === t ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="relative">
                <label htmlFor="topic" className="block text-sm font-medium text-gray-300 mb-2">
                    {isCareerTopicType ? 'Role / Skill' : 'Topic'}
                </label>
                <input
                    type="text"
                    id="topic"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    onFocus={handleTopicFocus}
                    onBlur={() => setTimeout(() => setSuggestionsVisible(false), 200)}
                    placeholder={topicPlaceholders[generationType] || "Enter a topic"}
                    className="w-full bg-gray-700 text-white rounded-lg border border-gray-600 px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    autoComplete="off"
                />
                {suggestionsVisible && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-gray-700 border border-gray-600 rounded-lg shadow-xl z-30 max-h-60 flex flex-col">
                        {suggestionsLoading ? (
                            <div className="p-3 text-center text-sm text-gray-400">Loading suggestions...</div>
                        ) : suggestions.length > 0 ? (
                             <>
                                <ul className="divide-y divide-gray-600 overflow-y-auto">
                                    {suggestions.map((suggestion, index) => (
                                        <li key={index}>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setTopic(suggestion);
                                                    setSuggestionsVisible(false);
                                                }}
                                                className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-600 transition-colors duration-150"
                                            >
                                                {suggestion}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                                <div className="p-2 border-t border-gray-600 mt-auto">
                                    <button
                                        type="button"
                                        onClick={handleSuggestMore}
                                        disabled={moreSuggestionsLoading}
                                        className="w-full text-center px-4 py-2 text-sm font-semibold rounded-md text-blue-300 hover:bg-gray-600 transition-colors duration-150 disabled:opacity-50 disabled:cursor-wait flex items-center justify-center gap-2"
                                    >
                                        {moreSuggestionsLoading ? (
                                            <>
                                                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 80 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                <span>Loading...</span>
                                            </>
                                        ) : 'Suggest More Topics'}
                                    </button>
                                    {suggestionsError && (
                                        <p className="text-xs text-red-400 text-center pt-2">{suggestionsError}</p>
                                    )}
                                </div>
                            </>
                        ) : (
                             <div className="p-3 text-center text-sm text-gray-400">{suggestionsError || 'No suggestions available.'}</div>
                        )}
                    </div>
                )}
            </div>
            
            {isCareerInputType && (
                 <div className="relative">
                    <label htmlFor="company" className="block text-sm font-medium text-gray-300 mb-2">
                        Company Name (Optional)
                    </label>
                    <input
                        type="text"
                        id="company"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        onFocus={handleCompanyFocus}
                        onBlur={() => setTimeout(() => setCompanySuggestionsVisible(false), 200)}
                        placeholder="e.g., 'Google', 'Microsoft'"
                        className="w-full bg-gray-700 text-white rounded-lg border border-gray-600 px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        autoComplete="off"
                    />
                     {companySuggestionsVisible && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-gray-700 border border-gray-600 rounded-lg shadow-xl z-20 max-h-80 flex flex-col">
                            <div className="p-2 border-b border-gray-600 flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-semibold text-gray-400 mr-2">Filter:</span>
                                <button
                                    onClick={() => setActiveIndustryFilter('All')}
                                    className={`${filterButtonBase} ${activeIndustryFilter === 'All' ? filterButtonActive : filterButtonInactive}`}
                                >
                                    All
                                </button>
                                {Object.values(Industry).map(industry => (
                                    <button
                                        key={industry}
                                        onClick={() => setActiveIndustryFilter(industry)}
                                        className={`${filterButtonBase} ${activeIndustryFilter === industry ? filterButtonActive : filterButtonInactive}`}
                                    >
                                        {industry}
                                    </button>
                                ))}
                            </div>
                            <div className="p-2 border-b border-gray-600">
                                <div className="relative">
                                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    <input
                                        type="text"
                                        placeholder="Search companies..."
                                        value={company}
                                        onChange={(e) => setCompany(e.target.value)}
                                        className="w-full bg-gray-600 text-white rounded-md border-transparent pl-9 pr-3 py-1.5 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                                    />
                                </div>
                            </div>
                            {filteredCompanies.length > 0 ? (
                                <>
                                    <ul className="divide-y divide-gray-600 overflow-y-auto">
                                        {filteredCompanies.map((suggestion, index) => (
                                            <li key={index}>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setCompany(suggestion.name);
                                                        setCompanySuggestionsVisible(false);
                                                    }}
                                                    className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-600 transition-colors duration-150"
                                                >
                                                    {suggestion.name}
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                    <div className="p-2 border-t border-gray-600 mt-auto">
                                        <button
                                            type="button"
                                            onClick={handleSuggestMoreCompanies}
                                            disabled={moreCompanySuggestionsLoading || !topic.trim()}
                                            className="w-full text-center px-4 py-2 text-sm font-semibold rounded-md text-blue-300 hover:bg-gray-600 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                            title={!topic.trim() ? "Please enter a Role/Skill first to get suggestions" : "Suggest more companies"}
                                        >
                                            {moreCompanySuggestionsLoading ? (
                                                <>
                                                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                    <span>Loading...</span>
                                                </>
                                            ) : 'Suggest More Companies'}
                                        </button>
                                        {companySuggestionsError && (
                                            <p className="text-xs text-red-400 text-center pt-2">{companySuggestionsError}</p>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="p-3 text-center text-sm text-gray-400">
                                    {companySuggestions.length > 0 ? 'No companies match this filter.' : 'No suggestions available.'}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {generationType === GenerationType.Document && (
                <div>
                    <label htmlFor="pageCount" className="block text-sm font-medium text-gray-300 mb-2">
                        Number of Pages ({pageCount})
                    </label>
                    <input
                        type="range"
                        id="pageCount"
                        min="1"
                        max="50"
                        value={pageCount}
                        onChange={(e) => setPageCount(Number(e.target.value))}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                </div>
            )}

            <button
                onClick={onGenerate}
                disabled={isLoading || !topic.trim()}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold py-3 px-4 rounded-lg hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center"
            >
                {isLoading ? (
                    <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Generating...
                    </>
                ) : (
                    'Generate Content'
                )}
            </button>
        </div>
    );
};

export default Controls;