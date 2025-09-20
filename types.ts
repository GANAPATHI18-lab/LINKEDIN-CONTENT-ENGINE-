
export enum Persona {
  GanapathiKakarla = 'ganapathiKakarla',
  // AI & Data Roles
  AIArchitect = 'aiArchitect',
  AIAuditor = 'aiAuditor',
  AIBusinessStrategist = 'aiBusinessStrategist',
  AIEthicist = 'aiEthicist',
  AIGovernanceSpecialist = 'aiGovernanceSpecialist',
  AIInfrastructureEngineer = 'aiInfrastructureEngineer',
  AIProductManager = 'aiProductManager',
  AIQualityAssuranceEngineer = 'aiQualityAssuranceEngineer',
  AIResearcher = 'aiResearcher',
  AIResearchScientist = 'aiResearchScientist',
  AISafetyEngineer = 'aiSafetyEngineer',
  AISolutionsConsultant = 'aiSolutionsConsultant',
  AITrainer = 'aiTrainer',
  AITutor = 'aiTutor',
  AnalyticsEngineer = 'analyticsEngineer',
  BigDataEngineer = 'bigDataEngineer',
  Bioinformatician = 'bioinformatician',
  BusinessIntelligenceAnalyst = 'businessIntelligenceAnalyst',
  BusinessIntelligenceDeveloper = 'businessIntelligenceDeveloper',
  CDAIO = 'cdaio',
  ChiefDataOfficer = 'chiefDataOfficer',
  ChiefInformationSecurityOfficer = 'chiefInformationSecurityOfficer',
  ClinicalDataScientist = 'clinicalDataScientist',
  CloudDataEngineer = 'cloudDataEngineer',
  CloudEngineer = 'cloudEngineer',
  ComputationalLinguist = 'computationalLinguist',
  ComputerVisionEngineer = 'computerVisionEngineer',
  ConversationalAIDeveloper = 'conversationalAIDeveloper',
  DashboardDeveloper = 'dashboardDeveloper',
  DataAnalyst = 'dataAnalyst',
  DataArchitect = 'dataArchitect',
  DataArtist = 'dataArtist',
  DataEngineer = 'dataEngineer',
  DataGovernanceManager = 'dataGovernanceManager',
  DataJournalist = 'dataJournalist',
  DataModeler = 'dataModeler',
  DataPrivacyOfficer = 'dataPrivacyOfficer',
  DataScientist = 'dataScientist',
  DataSteward = 'dataSteward',
  DataVisualizationEngineer = 'dataVisualizationEngineer',
  DataVisualizationSpecialist = 'dataVisualizationSpecialist',
  DatabaseAdministrator = 'databaseAdministrator',
  DeepLearningEngineer = 'deepLearningEngineer',
  DevOpsEngineer = 'devOpsEngineer',
  DirectorOfAI = 'directorOfAI',
  ETLDeveloper = 'etlDeveloper',
  GenerativeAISpecialist = 'generativeAISpecialist',
  HeadOfAI = 'headOfAI',
  HealthInformaticsSpecialist = 'healthInformaticsSpecialist',
  InformationDesigner = 'informationDesigner',
  KnowledgeEngineer = 'knowledgeEngineer',
  MachineLearningEngineer = 'machineLearningEngineer',
  MLOpsEngineer = 'mlOpsEngineer',
  NLPSpecialist = 'nlpSpecialist',
  OperationsResearchAnalyst = 'operationsResearchAnalyst',
  PrincipalDataScientist = 'principalDataScientist',
  PromptEngineer = 'promptEngineer',
  QuantitativeAnalyst = 'quantitativeAnalyst',
  ReinforcementLearningEngineer = 'reinforcementLearningEngineer',
  RoboticsEngineer = 'roboticsEngineer',
  SearchRelevanceEngineer = 'searchRelevanceEngineer',
  SoftwareDeveloper = 'softwareDeveloper',
  SpeechRecognitionEngineer = 'speechRecognitionEngineer',
  Statistician = 'statistician',
  UXDesignerDataProducts = 'uxDesignerDataProducts',
  VPofDataScience = 'vpOfDataScience',
  // Healthcare Roles
  CardiacTechnologist = 'cardiacTechnologist',
  ChiefMedicalInformationOfficer = 'chiefMedicalInformationOfficer',
  HealthcareAdministrator = 'healthcareAdministrator',
  HealthcareInnovator = 'healthcareInnovator',
  MedicalDoctor = 'medicalDoctor',
  MedicalImagingAnalyst = 'medicalImagingAnalyst',
  TelehealthCoordinator = 'telehealthCoordinator',
}

export enum GenerationType {
  Post = 'post',
  Document = 'document',
  ImagePost = 'imagePost',
  Video = 'video',
  ContentIdeas = 'contentIdeas',
  Top10Ideas = 'top10ideas',
  ProfessionalIdeas = 'professionalIdeas',
  MythBusting = 'mythBusting',
  QuickWins = 'quickWins',
  ComparativeAnalysis = 'comparativeAnalysis',
  TutorialOutline = 'tutorialOutline',
  ExamplePost = 'examplePost',
  InterviewQuestions = 'interviewQuestions',
  CvEnhancement = 'cvEnhancement',
  ResumeTailoring = 'resumeTailoring',
  CompanyProspector = 'companyProspector',
  DayWiseContentPlan = 'dayWiseContentPlan',
  WeeklyContentPlan = 'weeklyContentPlan',
}

export enum PostLength {
    Concise = 'concise',
    Medium = 'medium',
    Detailed = 'detailed',
}

export enum DifficultyLevel {
    Beginner = 'beginner',
    Intermediate = 'intermediate',
    Advanced = 'advanced',
}

export enum Tone {
    Formal = 'formal',
    Casual = 'casual',
    Persuasive = 'persuasive',
    Educational = 'educational',
    Inspirational = 'inspirational',
}

export enum ImageStyle {
    Abstract = 'abstract',
    Minimalist = 'minimalist',
    Vibrant = 'vibrant',
    Corporate = 'corporate',
    Futuristic = 'futuristic',
}

export enum ImageAspectRatio {
    Square = '1:1',
    Landscape = '16:9',
    Portrait = '3:4',
}

export enum VideoQuality {
    SD = 'sd',
    HD = 'hd',
}

export enum PdfExportQuality {
    Compact = 'compact',
    Standard = 'standard',
    High = 'high',
}

export type TextOverlayFont = 'Inter' | 'Roboto Slab' | 'Playfair Display';
export type TextOverlayPlacement = 'top' | 'center' | 'bottom';

export interface TextOverlayOptions {
  text: string;
  fontFamily: TextOverlayFont;
  fontSize: number;
  color: string;
  placement: TextOverlayPlacement;
}

export interface GenerationOptions {
  type: GenerationType;
  topic: string;
  pageCount: number;
  postLength: PostLength;
  persona: Persona;
  tone: Tone;
  difficultyLevel: DifficultyLevel;
  company?: string;
  dayNumber?: number;
  imageBackgroundColor?: string;
  imageStyle?: ImageStyle;
  logoImage?: string; // base64 data URL
  imageAspectRatio?: ImageAspectRatio;
  textOverlay?: TextOverlayOptions;
  videoQuality?: VideoQuality;
  pdfExportQuality?: PdfExportQuality;
}

export interface GenerationResult {
    text: string;
    imageUrl?: string;
    sources?: Array<{ uri: string; title: string }>;
}

export interface CompanySuggestion {
    name: string;
    industry: string;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  options: GenerationOptions;
  result: GenerationResult;
}
// FIX: Moved personaDisplayNames here to be shared across components and services.
export const personaDisplayNames: Record<Persona, string> = {
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
