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