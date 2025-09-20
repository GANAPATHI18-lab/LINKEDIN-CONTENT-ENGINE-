import { GoogleGenAI, Type, Modality } from "@google/genai";
import { GenerationOptions, GenerationType, PostLength, GenerationResult, Persona, DifficultyLevel, CompanySuggestion, ImageStyle, ImageAspectRatio, TextOverlayOptions, Tone } from '../types';

// Lazily initialize the AI client to prevent crashing the app on load if the API key is missing.
let ai: GoogleGenAI | null = null;

const getAi = (): GoogleGenAI => {
    if (!ai) {
        // The error thrown here will be caught by the try/catch blocks in App.tsx,
        // allowing for a graceful error message to be displayed to the user.
        if (!process.env.API_KEY) {
            throw new Error("Configuration error: The API_KEY is missing. Please set it up to use the application.");
        }
        ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
    return ai;
};


const handleApiError = (error: unknown, context: string): Error => {
    console.error(`Error during ${context}:`, error);
    if (error instanceof Error) {
        const message = error.message.toLowerCase();
        if (message.includes('api key not valid') || message.includes('permission denied') || message.includes('403')) {
            return new Error("Invalid API Key. Please ensure it is set correctly in your environment variables.");
        }
        if (message.includes('rate limit') || message.includes('429')) {
            return new Error("You've exceeded the API request limit. Please wait a moment and try again.");
        }
        if (message.includes('candidate was blocked') || message.includes('safety policy')) {
            return new Error("The request was blocked due to safety policies. Please try a different topic.");
        }
        if (message.includes('400')) {
             return new Error("The request was malformed or invalid. This can happen with unusual topics.");
        }
        if (message.includes('500') || message.includes('internal error')) {
            return new Error("The AI service is currently experiencing issues. Please try again later.");
        }
        return new Error(`Failed to ${context}. An unexpected error occurred: ${error.message}`);
    }
    return new Error(`An unknown error occurred while trying to ${context}.`);
};

const getPersonaPrompt = (persona: Persona): string => {
    switch (persona) {
        // AI & Data Roles (Alphabetical)
        case Persona.AIArchitect:
            return "Act as an AI Architect. Your tone is strategic, systematic, and focused on high-level design. You design end-to-end, scalable, and robust AI systems. You discuss system components, integration patterns, technology stacks, and trade-offs. Your audience is technical leadership and senior engineering teams.";
        case Persona.AIAuditor:
            return "Act as an AI Auditor. Your tone is meticulous, objective, and investigative. You specialize in evaluating AI systems for fairness, bias, transparency, and compliance with regulations. You discuss audit methodologies, risk assessment frameworks, and model validation techniques. Your audience is compliance officers, regulators, and internal review boards.";
        case Persona.AIBusinessStrategist:
            return "Act as an AI Business Strategist. Your tone is commercial, visionary, and results-oriented. You identify business opportunities where AI can create value, build business cases, and define roadmaps for AI adoption. You focus on ROI, competitive advantage, and market trends. Your audience is C-level executives and business unit leaders.";
        case Persona.AIEthicist:
            return "Act as an AI Ethicist. Your tone is critical, reflective, and principled. You are an expert in the societal and ethical implications of artificial intelligence. You discuss topics like bias, fairness, transparency, accountability, and the long-term impact of AI on society. Your audience is policymakers, researchers, AI developers, and the general public.";
        case Persona.AIGovernanceSpecialist:
            return "Act as an AI Governance Specialist. Your tone is formal, precise, and focused on risk management. You are an expert in creating policies, frameworks, and controls for the responsible and ethical use of AI. You discuss compliance, data privacy, model transparency, and regulatory landscapes. Your audience is legal teams, compliance officers, and senior management.";
        case Persona.AIInfrastructureEngineer:
            return "Act as an AI Infrastructure Engineer. Your tone is deeply technical and focused on performance and reliability. You build and manage the underlying hardware and software platforms for AI development and deployment (e.g., GPU clusters, Kubernetes, data storage). You discuss performance tuning, cost optimization, and automation. Your audience is MLOps engineers and data scientists.";
        case Persona.AIProductManager:
            return "Act as an AI Product Manager. Your tone is strategic, user-centric, and business-savvy. You bridge the gap between technical teams and business goals. You focus on defining the product vision for AI-powered features, prioritizing use cases, and measuring success through KPIs. Your audience is cross-functional, including engineers, designers, marketers, and leadership.";
        case Persona.AIQualityAssuranceEngineer:
            return "Act as an AI Quality Assurance (QA) Engineer. Your tone is meticulous, analytical, and process-driven. You specialize in testing and validating AI models and systems. You discuss test strategies for AI, fairness and bias testing, performance benchmarking, and anomaly detection. Your audience is product managers and ML engineers.";
        case Persona.AIResearcher:
            return "Act as an AI Researcher. Your tone is academic, precise, and focused on theoretical advancements, novel algorithms, and experimental results. You are writing for an audience of fellow researchers and data scientists.";
        case Persona.AIResearchScientist:
            return "Act as an AI Research Scientist. Your tone is academic, theoretical, and forward-looking. You operate at the cutting edge of AI, developing novel algorithms and contributing to fundamental scientific knowledge. You discuss mathematical proofs, experimental results, and publish in top-tier academic conferences. Your audience is the global AI research community.";
        case Persona.AISafetyEngineer:
            return "Act as an AI Safety Engineer. Your tone is cautious, analytical, and focused on risk mitigation. You specialize in identifying and preventing potential catastrophic outcomes from advanced AI systems. You discuss topics like AI alignment, robustness, and long-term safety protocols. Your audience is AI researchers, ethicists, and policymakers.";
        case Persona.AISolutionsConsultant:
            return "Act as an AI Solutions Consultant. Your tone is consultative, client-focused, and pragmatic. You are a trusted advisor who helps businesses understand how AI can solve their specific problems. You bridge the gap between business needs and technical solutions, conduct workshops, and design proof-of-concepts. Your audience is potential clients and business stakeholders.";
        case Persona.AITrainer:
            return "Act as an AI Trainer or Data Curator. Your tone is detail-oriented and focused on data quality. You are an expert in sourcing, cleaning, labeling, and augmenting datasets used to train AI models. You discuss data quality metrics, annotation guidelines, and the impact of data on model performance. Your audience is data scientists and ML engineers.";
        case Persona.AITutor:
            return "Act as an AI Tutor or Educator. Your tone is educational, clear, and patient. You excel at breaking down complex, technical AI concepts into simple, easy-to-understand explanations. You use analogies and relatable examples. Your audience is students, beginners, and non-technical professionals looking to understand AI.";
        case Persona.AnalyticsEngineer:
            return "Act as an Analytics Engineer. Your tone is technical and pragmatic, bridging the gap between data engineering and analysis. You are an expert in data modeling and transformation, primarily using tools like dbt. You focus on building clean, reliable, and well-documented data models that empower data analysts and scientists. Your audience is the entire data team.";
        case Persona.BigDataEngineer:
            return "Act as a Big Data Engineer. Your tone is technical and focused on large-scale data processing. You are an expert in distributed systems like Hadoop and Spark. You discuss data ingestion, processing, and storage strategies for terabyte- and petabyte-scale datasets. Your audience is data architects and other data engineers.";
        case Persona.Bioinformatician:
            return "Act as a Bioinformatician. Your tone is highly technical, scientific, and precise. You specialize in analyzing biological data, particularly genomic and proteomic sequences. You discuss algorithms for sequence alignment, genome assembly, and computational drug discovery. Your audience is biologists, geneticists, and other computational researchers.";
        case Persona.BusinessIntelligenceAnalyst:
            return "Act as a Business Intelligence (BI) Analyst. Your tone is business-focused, clear, and results-oriented. You specialize in creating dashboards (e.g., Tableau, Power BI), generating reports, and tracking Key Performance Indicators (KPIs). You translate complex data into actionable insights for non-technical stakeholders. Your audience is business managers, marketing teams, and operations leaders.";
        case Persona.BusinessIntelligenceDeveloper:
            return "Act as a Business Intelligence (BI) Developer. Your tone is technical and data-driven. You are an expert in the backend development of BI solutions, including data warehousing, ETL processes, and building data models/cubes. You focus on data accuracy and performance. Your audience is BI analysts and data engineers.";
        case Persona.CDAIO:
            return "Act as a Chief Data & AI Officer (CDAIO). Your tone is visionary, transformative, and strategic. You are a C-suite leader driving the integration of data, analytics, and AI into the core business strategy. You focus on building a data-driven culture, scaling AI capabilities to drive innovation and efficiency, and ensuring ethical AI implementation. Your audience is the CEO, board members, investors, and technology leaders.";
        case Persona.ChiefDataOfficer:
            return "Act as a Chief Data Officer (CDO). Your tone is strategic, authoritative, and business-focused. You are a C-suite executive responsible for the organization's enterprise-wide data and information strategy. You focus on data governance, data quality, regulatory compliance, and deriving business value from data assets. Your audience is the board of directors, fellow C-level executives, and business unit leaders.";
        case Persona.ChiefInformationSecurityOfficer:
            return "Act as a Chief Information Security Officer (CISO). Your tone is authoritative, strategic, and risk-focused. You are a C-suite executive responsible for enterprise-wide cybersecurity. You discuss threat intelligence, risk management frameworks (e.g., NIST), data protection, and the security implications of new technologies like AI. Your audience is the board, executives, and IT leadership.";
        case Persona.ClinicalDataScientist:
            return "Act as a Clinical Data Scientist. Your tone is analytical, evidence-based, and deeply rooted in healthcare. You specialize in analyzing complex clinical data from sources like Electronic Health Records (EHRs), clinical trials, and medical imaging. You discuss predictive modeling for patient outcomes, biostatistics, and navigating data privacy regulations like HIPAA. Your audience is clinicians, medical researchers, and hospital administrators.";
        case Persona.CloudDataEngineer:
            return "Act as a Cloud Data Engineer. Your tone is technical and platform-specific. You specialize in designing and building data pipelines on cloud platforms like AWS, GCP, or Azure, using services like Glue, BigQuery, or Data Factory. You discuss serverless architectures and cost management. Your audience is other cloud professionals and data engineers.";
        case Persona.CloudEngineer:
            return "Act as a Cloud Engineer with an AI Specialization. Your tone is technical, hands-on, and focused on scalability and automation. You design and manage cloud infrastructure for AI/ML workloads on platforms like AWS, GCP, or Azure. You discuss Infrastructure as Code (Terraform), container orchestration (Kubernetes), and cost optimization strategies. Your audience is MLOps engineers and software developers.";
        case Persona.ComputationalLinguist:
            return "Act as a Computational Linguist. Your tone is academic, analytical, and deeply theoretical. You study language from a computational perspective, focusing on grammar, syntax, and semantics. You contribute to the foundational models used by NLP specialists. Your audience is other linguists and AI researchers.";
        case Persona.ComputerVisionEngineer:
            return "Act as a Computer Vision Engineer. Your tone is technical and focused on visual data. You are an expert in object detection, image segmentation, and video analysis. You discuss CNN architectures, image processing techniques, and the deployment of vision models for applications in robotics, medical imaging, or autonomous systems. Your audience is other computer vision experts and ML engineers.";
        case Persona.ConversationalAIDeveloper:
            return "Act as a Conversational AI Developer. Your tone is technical and user-experience focused. You specialize in building chatbots, voice assistants, and other interactive AI systems. You discuss intent recognition, dialogue management, entity extraction, and integration with backend services. Your audience is other developers and UX designers.";
        case Persona.DashboardDeveloper:
            return "Act as a Dashboard Developer. Your tone is technical, user-focused, and pragmatic. You are a specialist in building complex, interactive, and high-performance dashboards using BI tools like Tableau, Power BI, or Looker. You focus on data connectivity, performance optimization, and creating intuitive user interfaces for business users. Your audience is BI analysts and business stakeholders.";
        case Persona.DataAnalyst:
            return "Act as a Data Analyst. Your tone is inquisitive, clear, and focused on deriving actionable insights from data. You excel at data visualization, statistical analysis, and storytelling with data. You create dashboards and reports to answer business questions. Your audience is business stakeholders, product managers, and executives.";
        case Persona.DataArchitect:
            return "Act as a Data Architect. Your tone is strategic, technical, and forward-looking. You are a senior-level expert responsible for designing the organization's data architecture, including data warehouses, data lakes, and data governance frameworks. You make high-level design choices that ensure data systems are scalable, secure, and efficient. Your audience is engineering leadership, C-level executives, and senior engineers.";
        case Persona.DataArtist:
            return "Act as a Data Artist. Your tone is creative, evocative, and abstract. You use data as a medium to create beautiful and thought-provoking artistic works. You focus on aesthetics, emotional impact, and novel forms of representation over traditional clarity. Your audience is the general public, gallery visitors, and the creative technology community.";
        case Persona.DataEngineer:
            return "Act as a Data Engineer. Your tone is foundational, systematic, and focused on data infrastructure. You are an expert in building and maintaining robust, scalable data pipelines and architectures (ETL/ELT). You discuss data warehousing, data modeling, and data quality. Your audience is data scientists, analysts, and other engineers who rely on the data infrastructure you build.";
        case Persona.DataGovernanceManager:
            return "Act as a Data Governance Manager. Your tone is process-oriented, authoritative, and collaborative. You are responsible for implementing and overseeing the organization's data governance framework. You discuss data catalogs, data lineage, quality metrics, and ensuring compliance with policies like GDPR and HIPAA. Your audience is data stewards, business unit leaders, and IT teams.";
        case Persona.DataJournalist:
            return "Act as a Data Journalist. Your tone is investigative, narrative-driven, and accessible. You use data analysis and visualization to find and tell compelling stories. You focus on making complex data understandable to the general public. Your audience is news readers and policymakers.";
        case Persona.DataModeler:
            return "Act as a Data Modeler. Your tone is structured, precise, and abstract. You are an expert in designing conceptual, logical, and physical data models. You focus on database schema design, normalization, and ensuring data integrity. Your audience is DBAs, data engineers, and architects.";
        case Persona.DataPrivacyOfficer:
            return "Act as a Data Privacy Officer (DPO). Your tone is legalistic, formal, and authoritative. You are responsible for ensuring the organization's compliance with data protection laws like GDPR. You discuss legal obligations, data subject rights, and privacy-by-design principles. Your audience is legal counsel, executives, and regulators.";
        case Persona.DataScientist:
            return "Act as a Data Scientist. Your tone is technical, analytical, and data-driven. You focus on methodologies, algorithms, data pipelines, and the statistical rigor behind AI models. You enjoy discussing model performance, feature engineering, and MLOps. Your audience is other data scientists, ML engineers, and technical managers.";
        case Persona.DataSteward:
            return "Act as a Data Steward. Your tone is responsible, collaborative, and domain-focused. You are a subject matter expert from a business unit (e.g., Finance, Marketing) responsible for the quality, definition, and usage of a specific subset of data. Your audience is data governance managers and other business users.";
        case Persona.DataVisualizationEngineer:
            return "Act as a Data Visualization Engineer. Your tone is deeply technical, code-centric, and focused on custom solutions. You build bespoke, interactive data visualizations for web applications using libraries like D3.js, Three.js, or ECharts. You focus on performance, interactivity, and integration with front-end frameworks. Your audience is software developers and product managers.";
        case Persona.DataVisualizationSpecialist:
            return "Act as a Data Visualization Specialist. Your tone is creative, user-centric, and design-oriented. You are an expert in visual design principles and tools (like D3.js or Tableau) to create insightful and aesthetically pleasing charts and dashboards. Your audience is anyone who consumes data reports.";
        case Persona.DatabaseAdministrator:
            return "Act as a Database Administrator (DBA). Your tone is meticulous, technical, and focused on stability and performance. You are an expert in managing, securing, and optimizing databases (e.g., SQL, NoSQL). You discuss query optimization, backup strategies, user permissions, and database architecture. Your audience is developers, data engineers, and IT infrastructure teams.";
        case Persona.DeepLearningEngineer:
            return "Act as a Deep Learning Engineer. Your tone is highly technical and research-oriented. You specialize in designing and implementing complex neural network architectures (e.g., Transformers, GANs). You focus on state-of-the-art models and performance optimization. Your audience is other AI researchers and ML engineers.";
        case Persona.DevOpsEngineer:
            return "Act as a DevOps Engineer with an AI/ML Focus. Your tone is technical, focused on automation and CI/CD. You build and maintain the infrastructure that allows for seamless integration, testing, and deployment of software, with a specialty in the unique needs of ML models. Your audience is software and MLOps engineers.";
        case Persona.DirectorOfAI:
            return "Act as a Director of AI. Your tone is that of a senior leader, combining strategic vision with operational excellence. You manage multiple AI teams, set departmental goals, manage budgets, and ensure the successful delivery of AI projects that align with business strategy. Your audience is VPs, C-suite executives, and your own team members.";
        case Persona.ETLDeveloper:
            return "Act as an ETL Developer. Your tone is technical and process-oriented. You specialize in using tools like Informatica or Talend to design, develop, and maintain Extract, Transform, Load processes for moving data into data warehouses. Your audience is data warehouse architects and BI developers.";
        case Persona.GenerativeAISpecialist:
            return "Act as a Generative AI Specialist. Your tone is creative, technical, and on the cutting edge. You have deep expertise in models that create content (e.g., LLMs, diffusion models). You discuss prompt engineering, model fine-tuning, and the application of generative models in art, code, and text creation. Your audience is other AI practitioners and creative professionals.";
        case Persona.HeadOfAI:
            return "Act as the Head of AI. Your tone is executive, authoritative, and visionary. You are the top AI leader in the organization, responsible for the entire AI strategy, innovation, and execution. You report to the CEO or CTO and are focused on long-term competitive advantage through AI. Your audience is the executive board, investors, and industry partners.";
        case Persona.HealthInformaticsSpecialist:
            return "Act as a Health Informatics Specialist. Your tone is systematic, data-focused, and practical. You are an expert in healthcare information systems, including EHR/EMR platforms. You discuss data standards like HL7 and FHIR, clinical terminologies (e.g., SNOMED CT), and the challenges of data interoperability in healthcare. Your audience is hospital administrators, IT staff, and clinical teams.";
        case Persona.InformationDesigner:
            return "Act as an Information Designer. Your tone is methodical, clear, and focused on communication. You blend graphic design principles with data analysis to create static and interactive infographics that tell a clear story, simplify complexity, and guide understanding. Your audience is broad, from executives to the general public.";
        case Persona.KnowledgeEngineer:
            return "Act as a Knowledge Engineer. Your tone is structured, analytical, and semantic. You specialize in representing information in a machine-readable format, building knowledge graphs and ontologies. You discuss data modeling, semantic web technologies (RDF, OWL), and how structured knowledge can enhance AI reasoning. Your audience is data architects and AI researchers.";
        case Persona.MachineLearningEngineer:
            return "Act as a Machine Learning Engineer. Your tone is practical, focused on implementation and scalability. You are an expert in deploying, monitoring, and maintaining machine learning models in production environments. You discuss MLOps, system architecture, performance optimization, and robust coding practices. Your audience is software engineers, DevOps specialists, and other ML engineers.";
        case Persona.MLOpsEngineer:
            return "Act as an MLOps Engineer. Your tone is highly technical, practical, and focused on automation and reliability. You specialize in the operationalization of machine learning models. You discuss CI/CD pipelines for ML, model monitoring, containerization (Docker, Kubernetes), and infrastructure as code (Terraform). Your audience is ML engineers, data scientists, and DevOps teams.";
        case Persona.NLPSpecialist:
            return "Act as a Natural Language Processing (NLP) Specialist. Your tone is highly technical and specialized. You have deep expertise in language models, transformers, sentiment analysis, and text generation. You discuss cutting-edge research in NLP, model fine-tuning, and practical applications like chatbots and translation services. Your audience is other NLP researchers and engineers.";
        case Persona.OperationsResearchAnalyst:
            return "Act as an Operations Research Analyst. Your tone is mathematical, analytical, and optimization-focused. You use techniques like linear programming, simulation, and statistical analysis to solve complex business problems related to logistics, supply chain, and scheduling. Your audience is business leaders and operations managers.";
        case Persona.PrincipalDataScientist:
            return "Act as a Principal Data Scientist. Your tone is that of a deep technical expert, mentor, and thought leader. You are a top-tier individual contributor who tackles the most complex business problems with cutting-edge techniques. You discuss novel research, set technical direction, and mentor other scientists. Your audience is other data scientists, researchers, and technical leadership.";
        case Persona.PromptEngineer:
            return "Act as a Prompt Engineer. Your tone is creative, analytical, and highly empirical. You are a specialist in designing and refining the inputs (prompts) given to large language models to elicit the most accurate, relevant, and creative outputs. You discuss prompt structure, context injection, and iterative testing methodologies. Your audience is developers and users of generative AI.";
        case Persona.QuantitativeAnalyst:
            return "Act as a Quantitative Analyst (Quant). Your tone is extremely mathematical, rigorous, and finance-focused. You develop and implement complex mathematical models for financial markets, pricing derivatives, and managing risk. Your audience is traders, portfolio managers, and other financial experts.";
        case Persona.ReinforcementLearningEngineer:
            return "Act as a Reinforcement Learning (RL) Engineer. Your tone is highly technical and specialized. You build agents that learn optimal behaviors through trial and error. You discuss reward functions, state-action spaces, deep Q-networks, and applications in robotics, game playing, and optimization problems. Your audience is other RL specialists and AI researchers.";
        case Persona.RoboticsEngineer:
            return "Act as a Robotics Engineer with an AI focus. Your tone is a blend of mechanical, electrical, and software engineering. You design and build the AI systems that allow robots to perceive their environment (computer vision), navigate (SLAM), and make decisions. You discuss sensor fusion, control systems, and embodied AI. Your audience is a multidisciplinary engineering team.";
        case Persona.SearchRelevanceEngineer:
            return "Act as a Search & Relevance Engineer. Your tone is technical and focused on information retrieval. You build and optimize search engines, focusing on ranking algorithms, query understanding, and measuring search quality. Your audience is other search engineers and product managers.";
        case Persona.SoftwareDeveloper:
            return "Act as a Software Developer with an AI/ML focus. Your tone is practical, code-centric, and implementation-focused. You are an expert in integrating AI models into applications via APIs and SDKs. You discuss software architecture for AI-powered features, performance considerations, and building user-friendly interfaces for AI tools. Your audience is other software developers and product managers.";
        case Persona.SpeechRecognitionEngineer:
            return "Act as a Speech Recognition Engineer. Your tone is technical and focused on audio data. You are an expert in acoustic modeling, phonetics, and signal processing. You build systems that convert spoken language into text. Your audience is other audio and NLP engineers.";
        case Persona.Statistician:
            return "Act as a Statistician. Your tone is rigorous, precise, and deeply rooted in mathematical theory. You focus on experimental design, hypothesis testing, and statistical modeling. You emphasize uncertainty, confidence intervals, and the theoretical guarantees behind methods. Your audience is researchers, data scientists, and analysts.";
        case Persona.UXDesignerDataProducts:
            return "Act as a UX Designer for Data Products. Your tone is user-centric, empathetic, and analytical. You specialize in the user experience of data-heavy applications, dashboards, and analytics tools. You discuss user research, wireframing, information architecture, and making complex data tools intuitive and efficient. Your audience is product managers and engineers.";
        case Persona.VPofDataScience:
            return "Act as a VP of Data Science. Your tone is executive, strategic, and focused on business impact. You are a senior leader responsible for building and leading a high-performing data science organization. You discuss team building, ROI of data initiatives, cross-functional collaboration, and aligning AI strategy with company goals. Your audience is C-level executives, board members, and department heads.";
        // Healthcare Roles
        case Persona.CardiacTechnologist:
            return "Act as a Cardiac Technologist. Your tone is technical, precise, and clinically-focused. You specialize in cardiac care and cardiovascular technology, including medical devices, diagnostics like ECG and echocardiography, and patient monitoring systems. Your audience includes cardiologists, fellow technologists, biomedical engineers, and clinical staff.";
        case Persona.ChiefMedicalInformationOfficer:
            return "Act as a Chief Medical Information Officer (CMIO). Your tone is a strategic blend of clinical expertise and technological vision. You are an executive leader (often a physician) who bridges the gap between the medical staff and IT. You focus on optimizing clinical workflows with technology, ensuring the usability of EHRs, and driving digital health strategy. Your audience is physicians, C-suite executives, and IT leadership.";
        case Persona.HealthcareAdministrator:
            return "Act as a Healthcare Administrator. Your tone is strategic, operational, and focused on efficiency and policy. You are concerned with cost-effectiveness, regulatory compliance (like HIPAA), workflow optimization, and the large-scale implementation of technology in a hospital setting. Your audience is hospital management, policy makers, and healthcare IT staff.";
        case Persona.HealthcareInnovator:
            return "Act as a Healthcare Innovator. Your tone is forward-thinking, practical, and business-oriented. You focus on the application of technology to solve real-world clinical challenges, improve patient outcomes, and streamline hospital operations. Your audience includes clinicians, hospital administrators, and health-tech investors.";
        case Persona.MedicalDoctor:
            return "Act as a Medical Doctor (MD). Your tone is clinical, evidence-based, and patient-centric. You communicate complex medical topics clearly and authoritatively, focusing on clinical relevance, patient safety, and the practical application of AI in diagnosis and treatment. Your audience is fellow healthcare professionals and the educated public.";
        case Persona.MedicalImagingAnalyst:
            return "Act as a Medical Imaging Analyst. Your tone is detail-oriented, visual, and clinical. You are an expert in analyzing medical images like X-rays, CT scans, and MRIs. You discuss image acquisition protocols, the DICOM standard, and the process of annotating images for training computer vision models. Your audience is radiologists, medical physicists, and AI engineers.";
        case Persona.TelehealthCoordinator:
            return "Act as a Telehealth Coordinator. Your tone is operational, patient-focused, and organized. You are responsible for the implementation and day-to-day management of virtual care services. You discuss telehealth platforms, remote patient monitoring devices, patient scheduling, and ensuring a seamless virtual experience. Your audience is patients, clinicians, and healthcare administrators.";
        // Default
        case Persona.GanapathiKakarla:
        default:
            return "Act as Ganapathi Kakarla, an expert with a PGDM in AI & Data Science, specializing in Healthcare. Your tone is professional, insightful, and engaging for a LinkedIn audience.";
    }
};

const getTonePrompt = (tone: Tone): string => {
    switch (tone) {
        case Tone.Formal:
            return "Adopt a formal writing style. Your language should be professional, objective, and precise. Use well-structured sentences and avoid colloquialisms, slang, or overly casual phrasing.";
        case Tone.Casual:
            return "Adopt a casual, conversational writing style. Use a friendly and approachable voice. Feel free to use contractions, simpler language, and a more personal, direct tone.";
        case Tone.Persuasive:
            return "Adopt a persuasive and compelling writing style. Your goal is to convince the reader. Use strong, active verbs, rhetorical questions, and a confident tone. Appeal to logic and emotion where appropriate.";
        case Tone.Educational:
            return "Adopt an educational and informative writing style. Your primary goal is to teach the reader. Break down complex topics into clear, easy-to-understand parts. Use analogies, simple explanations, and a structured, logical flow.";
        case Tone.Inspirational:
            return "Adopt an inspirational and motivational writing style. Your aim is to uplift and encourage the reader. Use positive language, storytelling, and a visionary tone. Focus on possibilities, growth, and empowerment.";
        default:
            return "Adopt a professional and engaging writing style.";
    }
};

const incorporateLogo = async (baseImageDataUrl: string, logoDataUrl: string): Promise<string> => {
    // Helper to extract base64 data and mimeType
    const getParts = (dataUrl: string) => {
        const match = dataUrl.match(/^data:(image\/\w+);base64,(.*)$/);
        if (!match) throw new Error("Invalid data URL");
        return { mimeType: match[1], data: match[2] };
    };

    const baseImageParts = getParts(baseImageDataUrl);
    const logoParts = getParts(logoDataUrl);

    const prompt = 'Seamlessly and subtly incorporate the second image (a logo) onto the first, larger image. Place it in a conventional location like a corner, ensuring it is small, unobtrusive, and looks professionally integrated. Do not alter the main subject or style of the primary image.';

    try {
        const response = await getAi().models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: {
                parts: [
                    { inlineData: { mimeType: baseImageParts.mimeType, data: baseImageParts.data } },
                    { inlineData: { mimeType: logoParts.mimeType, data: logoParts.data } },
                    { text: prompt },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                const mimeType = part.inlineData.mimeType;
                const base64ImageBytes = part.inlineData.data;
                return `data:${mimeType};base64,${base64ImageBytes}`;
            }
        }
        throw new Error("No image was returned from the logo incorporation process.");

    } catch (error) {
        throw handleApiError(error, "incorporate logo");
    }
};

const generateImageForPost = async (topic: string, backgroundColor?: string, style?: ImageStyle, aspectRatio?: ImageAspectRatio, textOverlay?: TextOverlayOptions): Promise<string> => {
    let styleInstruction = "The image must be abstract and conceptual, visually representing the core ideas as it relates to technology, data, and healthcare.";
    if (style) {
        switch (style) {
            case ImageStyle.Minimalist:
                styleInstruction = "The image must have a minimalist, clean aesthetic with plenty of negative space.";
                break;
            case ImageStyle.Vibrant:
                styleInstruction = "The image must be vibrant and colorful, with dynamic shapes and a high-energy feel.";
                break;
            case ImageStyle.Corporate:
                styleInstruction = "The image should have a professional, corporate look, using geometric shapes and a polished finish.";
                break;
            case ImageStyle.Futuristic:
                styleInstruction = "The image should have a futuristic, high-tech look, with glowing elements, circuit patterns, or holographic effects.";
                break;
            case ImageStyle.Abstract:
            default:
                 // Keep the default instruction
                break;
        }
    }

    let colorInstruction = "Maintain a modern, clean aesthetic, primarily using a sophisticated blue and white color palette.";
    if (backgroundColor && backgroundColor.trim() !== '') {
        colorInstruction = `The color palette should be dominated by shades of ${backgroundColor}, creating a modern and clean aesthetic.`;
    }

    let compositionInstruction = '';
    if (textOverlay && textOverlay.text.trim() !== '') {
        switch (textOverlay.placement) {
            case 'top':
                compositionInstruction = 'Critically, compose the image so that the top third has less visual detail and clutter, creating negative space suitable for a text overlay.';
                break;
            case 'center':
                compositionInstruction = 'Critically, compose the image with a visually simpler central area, ensuring key elements are positioned away from the absolute center to allow for a text overlay.';
                break;
            case 'bottom':
                compositionInstruction = 'Critically, compose the image so that the bottom third has less visual detail and clutter, creating negative space suitable for a text overlay.';
                break;
        }
    }

    const prompt = `
        Create a professional and visually appealing image for a LinkedIn post. The central theme of the post is "${topic}".
        ${styleInstruction}
        ${colorInstruction}
        ${compositionInstruction}
        Important constraints: Do not include any text or human figures in the image.
    `;
    try {
        const response = await getAi().models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: {
              numberOfImages: 1,
              outputMimeType: 'image/jpeg',
              aspectRatio: aspectRatio || '1:1',
            },
        });

        if (response.generatedImages && response.generatedImages.length > 0) {
            const base64ImageBytes = response.generatedImages[0].image.imageBytes;
            return `data:image/jpeg;base64,${base64ImageBytes}`;
        }
        throw new Error("No image was generated by the API.");

    } catch (error) {
        throw handleApiError(error, "generate image");
    }
};

const generateGroundedContent = async (prompt: string, context: string): Promise<GenerationResult> => {
    try {
        const response = await getAi().models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                tools: [{googleSearch: {}}],
            },
        });

        const text = response.text;
        let sources: Array<{ uri: string; title: string }> = [];

        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (groundingChunks) {
            sources = groundingChunks
                .filter(chunk => chunk.web && chunk.web.uri && chunk.web.title)
                .map(chunk => ({
                    uri: chunk.web.uri as string,
                    title: chunk.web.title as string,
                }));
        }

        return { text, sources };
    } catch (error) {
        throw handleApiError(error, context);
    }
};


const generateLinkedInPost = (topic: string, postLength: PostLength, persona: Persona, tone: Tone): Promise<GenerationResult> => {
    let lengthInstruction = '';
    switch(postLength) {
        case PostLength.Concise:
            lengthInstruction = 'The post should be concise, around 100-150 words.';
            break;
        case PostLength.Medium:
            lengthInstruction = 'The post should be of medium length, around 200-250 words.';
            break;
        case PostLength.Detailed:
            lengthInstruction = 'The post should be detailed and in-depth, around 300-400 words, possibly using a list format.';
            break;
    }
    
    const personaInstruction = getPersonaPrompt(persona);
    const toneInstruction = getTonePrompt(tone);

    const prompt = `
        ${personaInstruction}
        ${toneInstruction}
        
        Generate a LinkedIn post about the following topic: '${topic}'.
        
        ${lengthInstruction}

        Use Google Search to find recent, factual information to make the post credible and up-to-date.
        
        The post should be well-structured, use emojis appropriately to enhance readability, and must include at least 5 relevant hashtags like #AI, #DataScience, #HealthcareAI, #MachineLearning, #DigitalHealth. If the persona is Ganapathi Kakarla, also include #GanapathiKakarla.
    `;

    return generateGroundedContent(prompt, "generate LinkedIn post");
};

const generateDocument = (topic: string, pageCount: number, persona: Persona, difficultyLevel: DifficultyLevel, tone: Tone): Promise<GenerationResult> => {
    const personaInstruction = getPersonaPrompt(persona);
    const toneInstruction = getTonePrompt(tone);
    const prompt = `
        ${personaInstruction}
        ${toneInstruction}

        Generate a comprehensive document of approximately ${pageCount} page(s) on the topic: '${topic}'. A standard page has about 500 words.

        The document must be well-structured with a clear hierarchy using Markdown for formatting. It must include:
        1.  A main title (using #).
        2.  An introduction section.
        3.  Several detailed chapters covering different aspects of the topic (using ## for chapter titles).
        4.  Sub-sections within chapters where appropriate (using ###).
        5.  Use lists, bold text, and italics to improve readability.
        6.  A concluding summary section.

        Crucially, adjust the content's complexity, technical depth, and vocabulary to be appropriate for a ${difficultyLevel} audience.
        - For 'beginner', explain concepts simply and avoid jargon.
        - For 'intermediate', assume some foundational knowledge.
        - For 'advanced', use technical terminology and delve into complex details.
        
        Use Google Search to gather factual, up-to-date information to ensure the document is accurate and reliable.
        
        Ensure the content is detailed, accurate, and reflects deep expertise in the specified persona's field.
    `;
    
    return generateGroundedContent(prompt, "generate document");
};

const generateWeeklyContentPlan = (topic: string, persona: Persona, tone: Tone): Promise<GenerationResult> => {
    const personaInstruction = getPersonaPrompt(persona);
    const toneInstruction = getTonePrompt(tone);
    const prompt = `
        ${personaInstruction}
        ${toneInstruction}
        You are an expert LinkedIn Content Strategist. Your task is to create a complete, ready-to-execute 7-day content plan based on the overarching theme: '${topic}'.

        The goal is to build authority and engagement by exploring this topic from multiple angles throughout the week. Use Google Search to ensure the ideas and information are current and relevant.

        Generate a detailed plan for Day 1 through Day 7. For each day, you must provide the following in well-formatted Markdown:
        
        1.  **Day & Theme 🗓️**: (e.g., "Monday: Foundational Concept", "Tuesday: Technical Deep-Dive").
        2.  **Post Headline ✍️**: A compelling, attention-grabbing headline for the post.
        3.  **Key Talking Points 🎯**: 2-3 bullet points outlining the core message of the post. This should be a mini-brief for the content.
        4.  **Suggested Format 🖼️**: The best format for the post (e.g., Text-only, Poll, Image + Text, Carousel, Quick Video Script).
        5.  **Hashtags #️⃣**: A list of 5-7 relevant hashtags.

        Structure the output clearly for each day.
    `;
    return generateGroundedContent(prompt, "generate weekly content plan");
};

const generateContentIdeas = async (topic: string, persona: Persona): Promise<GenerationResult> => {
    const personaInstruction = getPersonaPrompt(persona);
    const prompt = `
        ${personaInstruction} Your tone is professional, insightful, and strategic.

        Generate a list of 5-7 high-impact, creative, and diverse LinkedIn content ideas based on the topic: '${topic}'.

        For each idea, provide:
        1.  A catchy title/headline.
        2.  A brief description of the content.
        3.  The recommended format (e.g., Mini explainer, Infographic, Code snippet, Slide deck, Poster-style image, Carousel, etc.).

        Structure the output in well-formatted Markdown. Use emojis to make it engaging.

        Here are some categories and examples of great content to inspire you:

        ---
        **INSPIRATION & EXAMPLES**

        🧠 **Knowledge & Thought Leadership**
        - Mini explainers: AI concepts applied to healthcare (e.g., “How CNNs detect diabetic retinopathy”)
        - Infographics: Visual breakdowns of healthcare datasets (e.g., NFHS, WHO, NHM)
        - Opinion posts: Your take on ethical AI in diagnostics, data privacy, or bias in algorithms
        - Flashcards: Bilingual technical terms (Telugu-English) for healthcare AI

        📊 **Projects & Case Studies**
        - Before/after dashboards: Tableau or Python visualizations of patient data, risk scores, etc.
        - Code snippets: Modular Python functions for BMI, health risk prediction, or OOP banking logic
        - Slide decks: Interactive PowerPoint presentations on AI in cardiac care, hospital workflows, etc.
        - GitHub links: Share repositories with clean documentation and healthcare-focused scripts

        📸 **Visual & Creative Posts**
        - Mood boards: Color palettes and design inspiration for healthcare presentations
        - Poster-style images: “AI x Healthcare” trends, neural network diagrams, or anatomy overlays
        - Behind-the-scenes: Your workspace setup, study routine, or presentation prep
        - Flashcard carousels: Swipeable bilingual terms or visual guides

        📚 **Learning & Resources**
        - Book summaries: Key takeaways from AI, healthcare economics, or policy books
        - Course reviews: Your experience with specific modules, certifications, or workshops
        - Cheat sheets: Python, ML, or healthcare metrics in one-page formats
        - Quiz challenges: Invite followers to solve healthcare data science questions

        🧬 **Healthcare Insights**
        - Comparative posts: India vs global healthcare infrastructure, policy, or delivery models
        - Data stories: NFHS insights turned into compelling narratives
        - Patient-centric AI: How tech can improve outcomes, reduce costs, or empower clinicians
        - Policy breakdowns: Simplified summaries of Ayushman Bharat, ABDM, HIPAA, etc.

        💼 **Career & Personal Branding**
        - Milestone updates: Certifications, internships, presentations, or awards
        - Reflection posts: What you learned from a project, failure, or mentor
        - Networking shoutouts: Tag peers, professors, or collaborators
        - Vision statements: Your mission in healthcare AI and how you plan to impact lives
        ---
    `;

    try {
        const response = await getAi().models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return { text: response.text };
    } catch (error) {
        throw handleApiError(error, "generate content ideas");
    }
};

const generateTop10Ideas = async (topic: string, persona: Persona): Promise<GenerationResult> => {
    const personaInstruction = getPersonaPrompt(persona);
    const prompt = `
        ${personaInstruction}, advising a student or junior colleague on content strategy.

        Generate a list of exactly 10 high-impact, actionable LinkedIn post ideas tailored to the specific topic: '${topic}'.

        The ideas should be diverse and cover different content formats. Structure the output as a numbered list in well-formatted Markdown. Use emojis to make it engaging.

        Each idea must be a concrete, specific post suggestion that a student could create based on the topic.

        Use the following categories and examples as a framework and inspiration for the types of ideas to generate. Ensure the generated ideas are specific to '${topic}'.

        ---
        **FRAMEWORK & INSPIRATION**

        1.  **📊 Project Highlight:** A post about a specific project. (e.g., Health risk prediction model, Tableau dashboard).
        2.  **🧠 AI Concept Explainer:** A post breaking down a technical concept. (e.g., Explainers of CNNs, ethical AI, NLP).
        3.  **📸 Visual Content:** An idea for a visual post. (e.g., Infographics, flashcards, slide decks).
        4.  **📚 Learning Resource:** A post sharing knowledge or resources. (e.g., Cheat sheets, book summaries, course reviews).
        5.  **💡 Thought Leadership:** A post sharing a unique opinion or perspective. (e.g., Take on a policy like ABDM, India vs global health tech).
        6.  **💼 Career Milestone:** A post about professional development. (e.g., Internship experience, certifications, presentation).
        7.  **🧬 Data Story:** A post that turns data into a narrative. (e.g., NFHS insights, patient-centric use cases).
        8.  **🧰 Code Snippet:** A post sharing a piece of code. (e.g., BMI calculator, health scoring function).
        9.  **🎯 Interactive Post:** An idea for an engaging post. (e.g., Quiz, poll, carousel guide).
        10. **🌟 Personal Branding:** A post that builds a personal brand. (e.g., "Day in the life", study hacks, networking shoutout).
        ---
    `;

    try {
        const response = await getAi().models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return { text: response.text };
    } catch (error) {
        throw handleApiError(error, "generate top 10 ideas");
    }
};

const generateProfessionalIdeas = async (topic: string, persona: Persona): Promise<GenerationResult> => {
    const personaInstruction = getPersonaPrompt(persona);
    const prompt = `
        ${personaInstruction}. Your goal is to brainstorm a list of professional, high-impact LinkedIn content ideas for another professional in the field.

        The ideas must be tailored to the specific topic: '${topic}'.

        Generate a list of 5-8 content ideas based on the following professional categories. For each idea, provide a compelling headline and a brief description of the content.

        Structure the output as a list in well-formatted Markdown, using emojis to enhance readability.

        ---
        **INSPIRATION FRAMEWORK**

        📌 **1. Domain-Specific Case Studies:** Focus on real-world applications and problem-solving.
        *   Examples: "How AI can reduce diagnostic delays in [specific area like cardiac care]", "Predictive modeling for [specific metric like hospital readmission rates]".

        📌 **2. Industry Trend Analysis:** Provide insights into the future of the field.
        *   Examples: "Top AI trends transforming [specific sector like Indian healthcare]", "Comparing [policy like ABDM] with global frameworks".

        📌 **3. Policy & Ethics Commentary:** Offer a thoughtful perspective on important regulations and ethical questions.
        *   Examples: "What [policy like Ayushman Bharat Digital Mission] means for AI startups", "Bias in healthcare algorithms: A case for inclusive datasets".

        📌 **4. Professional Templates & Tools:** Share practical, reusable resources.
        *   Examples: "My Python template for [task like health risk scoring]", "A PowerPoint layout for presenting AI models to clinicians".

        📌 **5. Collaboration & Networking Posts:** Create opportunities for engagement and partnership.
        *   Examples: "Looking to collaborate on [project like a bilingual AI glossary]", "Seeking mentors in [field like health tech product design]".

        📌 **6. Internship & Project Reflections:** Share personal learnings and experiences.
        *   Examples: "What I learned from building a [specific model like cardiac triage model]", "My experience working with [dataset like hospital EHR data]".

        📌 **7. Professional Development Updates:** Showcase continuous learning and achievements.
        *   Examples: "Completed a certification in [specific area like Healthcare Analytics]", "Key takeaways from a webinar on [topic like AI in medical imaging]".

        📌 **8. Infographics & Visual Explainers:** Simplify complex topics visually.
        *   Examples: "How [algorithm like CNNs] detect anomalies in X-rays", "Visual guide to [architecture like ABDM]".
        ---
    `;

    try {
        const response = await getAi().models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return { text: response.text };
    } catch (error) {
        throw handleApiError(error, "generate professional ideas");
    }
};

const generateMythBustingContent = (topic: string, persona: Persona, tone: Tone): Promise<GenerationResult> => {
    const personaInstruction = getPersonaPrompt(persona);
    const toneInstruction = getTonePrompt(tone);
    const prompt = `
        ${personaInstruction}
        ${toneInstruction}
        Your goal is to create content that debunks common misconceptions and clarifies complex topics for a professional audience.

        For the topic '${topic}', identify 3-5 common myths and generate "Myth vs. Reality" post ideas. Use Google Search to find factual information to support the "Reality" section and ensure it is accurate.

        For each idea, provide:
        1.  **The Myth 🧐**: A clear, one-sentence statement of the misconception.
        2.  **The Reality ✅**: A concise, factual explanation that corrects the myth, based on search results.
        3.  **Post Angle 📝**: A suggestion for how to frame the LinkedIn post to be engaging (e.g., "Start with a question," "Use a simple visual comparison," "Share a personal anecdote").

        Structure the output in well-formatted Markdown.
    `;
    return generateGroundedContent(prompt, "generate myth-busting content");
};

const generateQuickWinsContent = async (topic: string, persona: Persona): Promise<GenerationResult> => {
    const personaInstruction = getPersonaPrompt(persona);
    const prompt = `
        ${personaInstruction}. Your goal is to brainstorm quick, high-engagement LinkedIn posts that can be created in minutes.

        For the topic '${topic}', generate a list of 5-7 "Quick Win" content ideas. These should be designed to maximize interaction (likes, comments, shares) with minimal effort.

        Include a mix of the following formats:
        - **Polls 📊**: A multiple-choice question to spark debate. Provide the question and 2-4 options.
        - **Provocative Questions ❓**: An open-ended question to encourage detailed comments.
        - **Quick Tips 💡**: A single, actionable piece of advice or a useful fact.
        - **"Fill in the Blank" ⚫**: A sentence for the audience to complete with their own thoughts.
        - **One-Liner Insight 💬**: A single, powerful sentence that summarizes a key idea about the topic.

        Structure the output as a list in well-formatted Markdown.
    `;

    try {
        const response = await getAi().models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return { text: response.text };
    } catch (error) {
        throw handleApiError(error, "generate quick wins content");
    }
};

const generateComparativeAnalysisContent = (topic: string, persona: Persona, tone: Tone): Promise<GenerationResult> => {
    const personaInstruction = getPersonaPrompt(persona);
    const toneInstruction = getTonePrompt(tone);
    const prompt = `
        ${personaInstruction}
        ${toneInstruction}
        Your goal is to create content that provides deep, comparative insights for a professional audience.

        For the topic '${topic}', generate 3-5 ideas for a "Compare & Contrast" LinkedIn post. Use Google Search to find up-to-date, factual points for the comparison.

        For each idea, provide:
        1.  **Comparison Title ⚔️**: A catchy title for the post (e.g., "Python vs. R for Health Data Science: The Ultimate Showdown").
        2.  **Entities to Compare 🆚**: Clearly state the two technologies, frameworks, policies, or concepts being compared.
        3.  **Key Comparison Points 🎯**: List 3-4 critical points of comparison (e.g., Performance, Ease of Use, Community Support, Use Cases in Healthcare), supported by facts from search.
        4.  **Expert Takeaway 💡**: A concluding sentence that summarizes your recommendation or key insight.

        Structure the output in well-formatted Markdown.
    `;
    return generateGroundedContent(prompt, "generate comparative analysis content");
};

const generateTutorialOutlineContent = async (topic: string, persona: Persona, difficultyLevel: DifficultyLevel, tone: Tone): Promise<GenerationResult> => {
    const personaInstruction = getPersonaPrompt(persona);
    const toneInstruction = getTonePrompt(tone);
    const prompt = `
        ${personaInstruction}
        ${toneInstruction}
        Your goal is to create a practical, step-by-step tutorial outline to help others build skills.

        For the topic '${topic}', generate a detailed tutorial outline for a LinkedIn carousel or a short blog post.

        The tutorial should be suitable for a ${difficultyLevel} audience.
        - For 'beginner', assume no prior knowledge and keep steps simple.
        - For 'intermediate', assume basic familiarity with core concepts.
        - For 'advanced', target experienced practitioners with complex steps and prerequisites.

        The outline must include:
        1.  **Tutorial Title 🛠️**: A clear and compelling title.
        2.  **Target Audience 👨‍💻**: Who is this tutorial for? (e.g., "Aspiring Data Scientists," "Healthcare Analysts"). This should align with the ${difficultyLevel} level.
        3.  **Prerequisites ✅**: What skills or tools are needed before starting? (e.g., "Basic Python knowledge," "Familiarity with Pandas").
        4.  **Step-by-Step Outline 📝**: A numbered list of 5-7 clear, actionable steps. Each step should have a brief description.
        5.  **Learning Outcomes 🏆**: What will the reader be able to do after completing the tutorial?

        Structure the output in well-formatted Markdown.
    `;

    try {
        const response = await getAi().models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return { text: response.text };
    } catch (error) {
        throw handleApiError(error, "generate tutorial outline content");
    }
};

const generateExamplePostContent = (topic: string, persona: Persona, tone: Tone): Promise<GenerationResult> => {
    const personaInstruction = getPersonaPrompt(persona);
    const toneInstruction = getTonePrompt(tone);
    const prompt = `
        ${personaInstruction}
        ${toneInstruction}
        Your task is to craft an exemplary, high-quality LinkedIn post on the topic: '${topic}'.
        This post will serve as a gold-standard example for others to follow.

        The post must exhibit the following qualities:
        1.  **Strong Hook:** An engaging opening sentence that grabs the reader's attention.
        2.  **Clear Structure:** Well-organized content, possibly using bullet points or a numbered list to break down complex information.
        3.  **Value-Driven Content:** Provide genuine insights, data points, or a unique perspective.
        4.  **Professional Tone:** Maintain the specified persona's voice throughout.
        5.  **Call to Action (CTA):** End with a question or a prompt to encourage discussion and engagement.
        6.  **Strategic Hashtags:** Include at least 5 highly relevant hashtags.

        Use Google Search to ensure the information is current and factual. The post should be approximately 200-300 words.
    `;
    return generateGroundedContent(prompt, "generate example post");
};

const generateDayWiseContent = async (topic: string, persona: Persona, dayNumber: number, tone: Tone): Promise<GenerationResult> => {
    const personaInstruction = getPersonaPrompt(persona);
    const toneInstruction = getTonePrompt(tone);
    const prompt = `
        ${personaInstruction}
        ${toneInstruction}

        You are executing a 10-day LinkedIn content plan centered around the theme: '${topic}'.
        Here is the strategic framework for the 10-day plan:

        - **Day 1: Foundational Concept 🧠**: Break down a core concept of the main topic simply and clearly.
        - **Day 2: Project Spotlight 📊**: Detail a relevant project or a case study related to the topic.
        - **Day 3: Technical Deep Dive 💻**: Share a practical code snippet, a configuration, or a specific technical tip.
        - **Day 4: Industry Analysis 📈**: Discuss a recent trend, a new research paper, or an important news item.
        - **Day 5: Myth Busting 🧐**: Address and debunk a common misconception or myth surrounding the topic.
        - **Day 6: Tool/Resource Share 📚**: Recommend and briefly review a valuable tool, library, book, or course.
        - **Day 7: Interactive Post 💬**: Ask an engaging open-ended question or create a poll to spark community discussion.
        - **Day 8: Career Journey 🚀**: Share a personal story, a key lesson learned, or actionable career advice related to the topic.
        - **Day 9: Behind the Scenes 📸**: Offer a glimpse into your work process, your setup, or a "day in the life" perspective.
        - **Day 10: Future Forward 🔮**: Make a bold prediction or share your long-term vision for the future of the topic.

        Your task is to generate a complete, high-quality, ready-to-publish LinkedIn post ONLY for Day ${dayNumber} of this plan.

        The post for Day ${dayNumber} must:
        1.  Strictly adhere to the specific theme for that day as described in the framework.
        2.  Be well-structured, engaging, and approximately 200-300 words long.
        3.  Directly relate to the overarching theme of '${topic}'.
        4.  Use appropriate emojis to enhance readability.
        5.  Include at least 5 relevant hashtags.
        6.  End with a compelling question or a call to action to encourage engagement.
    `;
    try {
        const response = await getAi().models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return { text: response.text };
    } catch (error) {
        throw handleApiError(error, "generate day-wise content");
    }
};


const generateInterviewQuestions = (topic: string, persona: Persona, company?: string): Promise<GenerationResult> => {
    const personaInstruction = getPersonaPrompt(persona);
    const companyContext = company ? ` The questions should be tailored for a position at a company like ${company}.` : '';
    const prompt = `
        ${personaInstruction}. Your role is a hiring manager preparing for an interview.

        Generate a list of 10-15 insightful and challenging interview questions for a candidate applying for a role related to '${topic}'.${companyContext}

        The questions should cover a range of topics, including:
        - Technical proficiency and core concepts.
        - Problem-solving and analytical skills.
        - Behavioral questions to assess cultural fit and soft skills.
        - Project experience and practical application of skills.
        - Industry awareness and future trends.

        Structure the output in well-formatted Markdown, categorized by question type (e.g., Technical, Behavioral).
    `;
    return generateGroundedContent(prompt, "generate interview questions");
};

const generateCvEnhancement = (topic: string, persona: Persona, company: string | undefined, tone: Tone): Promise<GenerationResult> => {
    const personaInstruction = getPersonaPrompt(persona);
    const toneInstruction = getTonePrompt(tone);
    const companyContext = company ? ` The suggestions should be tailored to appeal to a company like ${company}.` : '';
    const prompt = `
        ${personaInstruction}
        ${toneInstruction}
        You are a professional career coach reviewing a client's CV.

        The client is targeting a role related to '${topic}'.${companyContext}

        Provide a list of 5-7 specific, actionable suggestions to enhance their CV. For each suggestion, explain *why* it's important. The advice should be modern and impactful.

        Focus on:
        - **Keywords and Phrasing:** Suggest specific terms to include that will pass through Applicant Tracking Systems (ATS).
        - **Quantifiable Achievements:** Give examples of how to turn responsibilities into measurable results (e.g., "Increased efficiency by X%" instead of "Responsible for task Y").
        - **Project Highlights:** Recommend how to best showcase relevant projects.
        - **Skills Section:** Advise on which technical and soft skills to emphasize for this role.

        Structure the output as a list in well-formatted Markdown.
    `;
    return generateGroundedContent(prompt, "generate CV enhancement suggestions");
};

const generateResumeTailoring = (topic: string, persona: Persona, company: string, tone: Tone): Promise<GenerationResult> => {
    const personaInstruction = getPersonaPrompt(persona);
    const toneInstruction = getTonePrompt(tone);
    const prompt = `
        ${personaInstruction}
        ${toneInstruction}
        Your task is to act as a career advisor, providing hyper-specific advice for tailoring a resume.

        The target role is '${topic}'.
        The target company is '${company}'.

        Use Google Search to learn about ${company}'s values, recent projects, and the technologies they use.

        Generate a list of 5-7 concrete, actionable steps to tailor a resume specifically for this role at this company.

        For each step, provide:
        1.  **The Action:** A clear instruction (e.g., "Mirror Keywords from the Job Description," "Highlight a Project with X Technology").
        2.  **The Rationale:** Explain *why* this action is critical for this specific company, referencing their culture or tech stack found via search.
        3.  **An Example:** Provide a short "Before" and "After" snippet to illustrate the change.

        Structure the output in well-formatted Markdown.
    `;
    return generateGroundedContent(prompt, "generate resume tailoring advice");
};

const generateCompanyProspector = async (topic: string, persona: Persona): Promise<GenerationResult> => {
    const personaInstruction = getPersonaPrompt(persona);
    const prompt = `
        ${personaInstruction}. Your role is a strategic career advisor.

        Based on the skills and interests related to '${topic}', identify and profile 5-7 promising companies that would be excellent prospects for a job applicant.

        Use Google Search to find relevant companies and information.

        For each company, provide a profile in Markdown that includes:
        - **Company Name:**
        - **Industry/Niche:**
        - **Why They're a Good Fit:** A brief explanation connecting the company's work to the '${topic}' skills.
        - **Recent News or Projects:** A relevant, recent piece of information (e.g., a new product launch, a research paper, a major partnership) that an applicant could mention in a cover letter or interview.

        Ensure the list is diverse, including established leaders and innovative startups if possible.
    `;
    return generateGroundedContent(prompt, "prospect companies");
};

export const getTopicSuggestions = async (type: GenerationType, persona: Persona, existingSuggestions: string[], currentTopic: string): Promise<string[]> => {
    const personaInstruction = getPersonaPrompt(persona);
    const existingList = existingSuggestions.map(s => `- ${s}`).join('\n');
    const topicContext = currentTopic.trim() ? `The user's current topic is '${currentTopic}'. The new suggestions should be related but distinct.` : `The user has not entered a topic yet. The suggestions should be general and inspiring for this category.`;

    const prompt = `
        ${personaInstruction}. You are an AI assistant tasked with brainstorming content topics.
        The user wants to generate content of type '${type}'.
        ${topicContext}

        Here are some suggestions that have already been shown to the user:
        ${existingList}

        Please generate a list of 5 *new and unique* topic ideas that are distinct from the ones already listed. The topics should be specific, engaging, and suitable for the selected content type and persona.

        Return *only* a JSON array of strings in your response, like this:
        ["Topic Idea 1", "Topic Idea 2", "Topic Idea 3", "Topic Idea 4", "Topic Idea 5"]
    `;

    try {
        const response = await getAi().models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: 'application/json' },
        });

        const text = response.text.trim();
        const json = JSON.parse(text);

        if (Array.isArray(json) && json.every(item => typeof item === 'string')) {
            return json;
        }
        throw new Error("Response was not a valid JSON array of strings.");

    } catch (error) {
        throw handleApiError(error, "get topic suggestions");
    }
};


export const getCompanySuggestions = async (role: string, existingSuggestions: CompanySuggestion[]): Promise<CompanySuggestion[]> => {
    const existingList = existingSuggestions.map(s => `- ${s.name} (${s.industry})`).join('\n');
    const prompt = `
        You are a career advisor AI. A user is looking for companies hiring for a role related to '${role}'.

        Here are some companies already suggested:
        ${existingList}

        Brainstorm a list of 5 *new and unique* companies that are likely to hire for this role. For each company, identify its primary industry from this list: 'Big Tech', 'Healthcare', 'Consulting', or 'Other'.

        Return *only* a JSON array of objects in your response, with the format:
        [
            {"name": "Company Name 1", "industry": "Industry 1"},
            {"name": "Company Name 2", "industry": "Industry 2"}
        ]
    `;

    try {
        const response = await getAi().models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            industry: { type: Type.STRING },
                        },
                    },
                },
            },
        });
        const text = response.text.trim();
        const json = JSON.parse(text);
        
        if (Array.isArray(json) && json.every(item => typeof item === 'object' && 'name' in item && 'industry' in item)) {
            return json;
        }
        throw new Error("Response was not a valid JSON array of company objects.");

    } catch (error) {
        throw handleApiError(error, "get company suggestions");
    }
};

export const humanifyText = async (textToHumanify: string, persona: Persona): Promise<string> => {
    const personaInstruction = getPersonaPrompt(persona);
    const prompt = `
        ${personaInstruction}
        Review the following text. Your task is to rewrite it to sound more natural, engaging, and less like it was generated by an AI.

        Focus on:
        - Improving the flow and rhythm.
        - Using more varied and dynamic vocabulary.
        - Breaking up long sentences.
        - Injecting more of the specified persona's voice and style.
        - Correcting any awkward phrasing.

        Do not change the core message or factual information. Only enhance the delivery.

        Original Text:
        ---
        ${textToHumanify}
        ---

        Return only the rewritten text.
    `;
     try {
        const response = await getAi().models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text;
    } catch (error) {
        throw handleApiError(error, "humanify text");
    }
};

export const generateContent = async (options: GenerationOptions): Promise<GenerationResult> => {
    const tone = options.tone || Tone.Formal; // Default for safety

    switch (options.type) {
        case GenerationType.Post:
            return generateLinkedInPost(options.topic, options.postLength, options.persona, tone);
        case GenerationType.ImagePost: {
            const textPromise = generateLinkedInPost(options.topic, options.postLength, options.persona, tone);
            const baseImagePromise = generateImageForPost(options.topic, options.imageBackgroundColor, options.imageStyle, options.imageAspectRatio, options.textOverlay);
            
            const [textResult, baseImageUrl] = await Promise.all([textPromise, baseImagePromise]);

            let finalImageUrl = baseImageUrl;
            if (options.logoImage && baseImageUrl) {
                try {
                    finalImageUrl = await incorporateLogo(baseImageUrl, options.logoImage);
                } catch (logoError) {
                    console.error("Failed to incorporate logo, using base image instead:", logoError);
                }
            }
            
            return {
                ...textResult,
                imageUrl: finalImageUrl,
            };
        }
        case GenerationType.Document:
            return generateDocument(options.topic, options.pageCount, options.persona, options.difficultyLevel, tone);
        case GenerationType.WeeklyContentPlan:
             return generateWeeklyContentPlan(options.topic, options.persona, tone);
        case GenerationType.ContentIdeas:
            return generateContentIdeas(options.topic, options.persona);
        case GenerationType.Top10Ideas:
            return generateTop10Ideas(options.topic, options.persona);
        case GenerationType.ProfessionalIdeas:
            return generateProfessionalIdeas(options.topic, options.persona);
        case GenerationType.MythBusting:
            return generateMythBustingContent(options.topic, options.persona, tone);
        case GenerationType.QuickWins:
            return generateQuickWinsContent(options.topic, options.persona);
        case GenerationType.ComparativeAnalysis:
            return generateComparativeAnalysisContent(options.topic, options.persona, tone);
        case GenerationType.TutorialOutline:
            return generateTutorialOutlineContent(options.topic, options.persona, options.difficultyLevel, tone);
        case GenerationType.ExamplePost:
            return generateExamplePostContent(options.topic, options.persona, tone);
        case GenerationType.DayWiseContentPlan:
            if (!options.dayNumber) throw new Error("A day number is required for the Day-Wise Content Plan.");
            return generateDayWiseContent(options.topic, options.persona, options.dayNumber, tone);
        case GenerationType.InterviewQuestions:
            return generateInterviewQuestions(options.topic, options.persona, options.company);
        case GenerationType.CvEnhancement:
            return generateCvEnhancement(options.topic, options.persona, options.company, tone);
        case GenerationType.ResumeTailoring:
             if (!options.company) throw new Error("A company name is required for Resume Tailoring.");
            return generateResumeTailoring(options.topic, options.persona, options.company, tone);
        case GenerationType.CompanyProspector:
            return generateCompanyProspector(options.topic, options.persona);
        default:
            throw new Error(`Unsupported generation type: ${options.type}`);
    }
};