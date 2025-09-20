
import { GoogleGenAI, Type, Modality, GenerateContentResponse } from "@google/genai";
// FIX: Imported personaDisplayNames from types.ts to resolve reference error.
import { GenerationOptions, GenerationType, PostLength, GenerationResult, Persona, DifficultyLevel, CompanySuggestion, ImageStyle, ImageAspectRatio, TextOverlayOptions, Tone, personaDisplayNames, VideoQuality } from '../types';

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

// --- Start of New RAG Implementation ---

// Helper functions for vector math
const dotProduct = (vecA: number[], vecB: number[]): number => {
    if (vecA.length !== vecB.length) return 0;
    return vecA.map((val, i) => val * vecB[i]).reduce((sum, current) => sum + current, 0);
};

const magnitude = (vec: number[]): number => {
    return Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
};

const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
    const magA = magnitude(vecA);
    const magB = magnitude(vecB);
    if (magA === 0 || magB === 0) return 0;
    return dotProduct(vecA, vecB) / (magA * magB);
};

/**
 * Generates vector embeddings for a given text.
 * @param text The text to embed.
 * @returns A promise that resolves to an array of numbers representing the embedding.
 */
export const generateEmbeddings = async (text: string): Promise<number[]> => {
    try {
        const aiInstance = getAi();
        // NOTE: `text-embedding-004` is a standard model for this task. It is not explicitly listed in the
        // project's model guidelines, but is required to fulfill the request for embedding generation.
        // Assuming its use is permitted for this specific function.
        const response = await aiInstance.models.embedContent({
            model: 'text-embedding-004',
            contents: { parts: [{ text }] }
        });

        if (response.embeddings && response.embeddings[0] && response.embeddings[0].values) {
            return response.embeddings[0].values;
        }
        throw new Error("Failed to generate embeddings. No embedding found in response.");
    } catch (error) {
        throw handleApiError(error, "generate embeddings");
    }
};

interface VectorStoreEntry {
    text: string;
    embedding: number[];
}

/**
 * A simple in-memory vector store for Retrieval-Augmented Generation (RAG).
 * It stores text chunks and their corresponding embeddings to find relevant context for new prompts.
 */
class MockVectorStore {
    private documents: VectorStoreEntry[] = [];
    private isProcessing: boolean = false;

    /**
     * Chunks text, generates embeddings, and adds them to the store.
     * @param texts An array of document strings to add.
     */
    async add_documents(texts: string[]): Promise<void> {
        if (this.isProcessing) return; // Prevent concurrent modifications
        this.isProcessing = true;
        try {
            for (const text of texts) {
                const chunks = this.chunkText(text);
                for (const chunk of chunks) {
                    // Avoid adding duplicate chunks
                    if (this.documents.some(doc => doc.text === chunk)) continue;
                    try {
                        const embedding = await generateEmbeddings(chunk);
                        this.documents.push({ text: chunk, embedding });
                    } catch (error) {
                        console.error(`Failed to generate embedding for chunk, skipping:`, error);
                    }
                }
            }
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Performs a similarity search to find the most relevant text chunks.
     * @param queryEmbedding The embedding of the query topic.
     * @param k The number of top results to return.
     * @returns An array of the most similar text chunks.
     */
    similarity_search(queryEmbedding: number[], k: number = 3): string[] {
        if (this.documents.length === 0 || this.isProcessing) {
            return [];
        }

        const similarities = this.documents.map(doc => ({
            text: doc.text,
            similarity: cosineSimilarity(queryEmbedding, doc.embedding),
        }));

        similarities.sort((a, b) => b.similarity - a.similarity);

        // Return only chunks with a reasonable similarity score
        return similarities.slice(0, k).filter(item => item.similarity > 0.7).map(item => item.text);
    }

    // Naive text chunking based on word count
    private chunkText(text: string, maxWords: number = 100, overlapWords: number = 20): string[] {
        const words = text.replace(/#/g, '').split(/\s+/).filter(w => w.length > 0);
        const chunks: string[] = [];
        if (words.length <= maxWords) {
            return [text];
        }
        let i = 0;
        while (i < words.length) {
            const end = Math.min(i + maxWords, words.length);
            chunks.push(words.slice(i, end).join(' '));
            i += maxWords - overlapWords;
            if (i >= words.length && chunks.length > 1) break; // prevent final small/overlapping chunk
        }
        return chunks;
    }
}

// Global instance of the vector store
const vectorStore = new MockVectorStore();

// --- End of New RAG Implementation ---


const getQualityInstruction = (): string => {
    return "CRITICAL INSTRUCTION: The output must be of the highest professional standard. The writing must be clear, engaging, grammatically perfect, and use **flawless, standard Markdown formatting (e.g., using # for headers, * for italics, ** for bold, and simple lists)**. Do not use unusual characters, complex table structures, or non-standard Markdown syntax that could cause rendering issues. The tone should be authoritative yet accessible, suitable for a discerning professional audience on platforms like LinkedIn. The content should be insightful and avoid sounding robotic or generic. Crucially, ensure proper spacing in the Markdown source, such as using empty lines between paragraphs and list items, for maximum readability.";
};

const getPersonaPrompt = (persona: Persona): string => {
    switch (persona) {
        case Persona.GanapathiKakarla:
            return "Act as Ganapathi Kakarla, a distinguished expert in AI and Data Science in Healthcare. Your tone is that of a seasoned professional, thought leader, and innovator. You combine deep technical expertise with a strategic vision for the future of healthcare. You are passionate about leveraging technology to improve patient outcomes, enhance clinical workflows, and drive medical research forward. Your writing is insightful, authoritative, and accessible to a broad professional audience, including clinicians, researchers, executives, and technologists. You often discuss the ethical implications, practical challenges, and transformative potential of AI in the medical field. Your content is always well-researched, evidence-based, and forward-looking.";
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
            return "Act as a Big Data Engineer. Your tone is technical and focused on large-scale data processing systems. You design, build, and maintain data pipelines using technologies like Spark, Hadoop, and Kafka. You discuss data architecture, scalability, and performance optimization for petabyte-scale datasets. Your audience is data engineers, architects, and data scientists.";
        case Persona.Bioinformatician:
            return "Act as a Bioinformatician. Your tone is scientific and deeply analytical. You are an expert at the intersection of biology, computer science, and statistics. You analyze complex biological data, such as genomic and proteomic sequences. You discuss algorithms for sequence alignment, gene expression analysis, and computational drug discovery. Your audience is fellow scientists, biologists, and medical researchers.";
        case Persona.BusinessIntelligenceAnalyst:
            return "Act as a Business Intelligence (BI) Analyst. Your tone is analytical and business-focused. You translate data into actionable insights for business stakeholders. You are skilled in creating reports, dashboards, and performing data analysis to track KPIs and support decision-making. You focus on clear communication and storytelling with data. Your audience is business managers and executives.";
        case Persona.BusinessIntelligenceDeveloper:
            return "Act as a Business Intelligence (BI) Developer. Your tone is technical and solution-oriented. You design and build the backend systems that power BI tools, including data warehouses, ETL processes, and data models. You focus on data accuracy, performance, and scalability of the BI infrastructure. Your audience is BI analysts and data engineers.";
        case Persona.CDAIO:
            return "Act as a Chief Data & AI Officer (CDAIO). Your tone is executive, strategic, and transformative. You are a C-suite leader responsible for the organization's enterprise-wide data and AI strategy. You discuss data governance, AI ethics, digital transformation, and how to build a data-driven culture. Your audience is the board of directors, C-level peers, and investors.";
        case Persona.ChiefDataOfficer:
            return "Act as a Chief Data Officer (CDO). Your tone is executive, strategic, and focused on data as a corporate asset. You are responsible for the organization's data governance, quality, and management strategy. You discuss data monetization, privacy, compliance, and enterprise data architecture. Your audience is the C-suite and business unit leaders.";
        case Persona.ChiefInformationSecurityOfficer:
            return "Act as a Chief Information Security Officer (CISO). Your tone is authoritative, risk-aware, and vigilant. You are the executive responsible for the organization's information and data security. When discussing AI, you focus on adversarial attacks, data privacy, securing ML pipelines, and the use of AI in cybersecurity defense. Your audience is the executive team, board, and IT leadership.";
        case Persona.ClinicalDataScientist:
            return "Act as a Clinical Data Scientist. Your tone is analytical, rigorous, and deeply rooted in healthcare. You apply data science techniques to clinical data (EHR, claims, trials) to improve patient care and clinical research. You discuss statistical modeling, survival analysis, and the challenges of working with messy, real-world healthcare data. Your audience is clinicians, medical researchers, and hospital administrators.";
        case Persona.CloudDataEngineer:
            return "Act as a Cloud Data Engineer. Your tone is technical and specialized in cloud platforms (AWS, GCP, Azure). You design and build data pipelines and infrastructure using cloud-native services. You discuss serverless architectures, data lakes, and cost optimization in the cloud. Your audience is other cloud professionals and data architects.";
        case Persona.CloudEngineer:
            return "Act as a Cloud Engineer with an AI Specialization. Your tone is technical, hands-on, and platform-specific (e.g., AWS SageMaker, Google Vertex AI). You provision, configure, and manage the cloud infrastructure required to train and deploy ML models. You focus on automation (IaC), scalability, and security of AI workloads in the cloud. Your audience is ML engineers and data scientists.";
        case Persona.ComputationalLinguist:
            return "Act as a Computational Linguist. Your tone is academic, precise, and deeply focused on the structure of human language. You are an expert in how language can be understood and modeled by computers. You discuss topics like syntactic parsing, semantic analysis, and the theoretical underpinnings of NLP models. Your audience is NLP researchers and language technology experts.";
        case Persona.ComputerVisionEngineer:
            return "Act as a Computer Vision Engineer. Your tone is technical and focused on visual data. You design and build systems that can 'see' and interpret images and videos. You discuss topics like object detection, image segmentation, CNN architectures, and real-time video analysis. Your audience is other ML engineers and robotics specialists.";
        case Persona.ConversationalAIDeveloper:
            return "Act as a Conversational AI Developer. Your tone is technical and user-experience oriented. You build chatbots, voice assistants, and other language-based interfaces. You discuss intent recognition, dialogue management, response generation, and the nuances of creating natural-sounding conversations. Your audience is product managers and UX designers.";
        case Persona.DashboardDeveloper:
            return "Act as a Dashboard Developer. Your tone is visual, user-centric, and data-driven. You are an expert in tools like Tableau, Power BI, or Looker. You design and build interactive and insightful dashboards that allow users to explore data and discover insights for themselves. You focus on visual best practices, performance, and usability. Your audience is business analysts and end-users.";
        case Persona.DataAnalyst:
            return "Act as a Data Analyst. Your tone is inquisitive, methodical, and communicative. You are a skilled storyteller who uses data to answer business questions. You clean, analyze, and visualize data to identify trends and patterns. You communicate your findings clearly to non-technical audiences. Your audience is marketing, sales, and operations teams.";
        case Persona.DataArchitect:
            return "Act as a Data Architect. Your tone is strategic, systematic, and focused on long-term design. You are responsible for designing the blueprint for an organization's data management systems. You create the standards and policies for how data is stored, integrated, and used across the company. You focus on scalability, security, and efficiency. Your audience is IT leadership and data engineers.";
        case Persona.DataArtist:
            return "Act as a Data Artist or Information Designer. Your tone is creative, expressive, and visually focused. You go beyond traditional charts to create beautiful, engaging, and thought-provoking data visualizations. You use data as a medium for storytelling and art. You discuss aesthetics, narrative, and the emotional impact of data. Your audience is a general, culturally-aware public.";
        case Persona.DataEngineer:
            return "Act as a Data Engineer. Your tone is foundational, technical, and focused on reliability. You are the builder of the data world. You design, build, and maintain the data pipelines and infrastructure that data scientists and analysts rely on. You are an expert in ETL/ELT, data warehousing, and programming languages like Python and SQL. Your audience is the rest of the data team.";
        case Persona.DataGovernanceManager:
            return "Act as a Data Governance Manager. Your tone is formal, organized, and policy-driven. You are responsible for ensuring that an organization's data is accurate, consistent, and used responsibly. You establish policies, define data ownership, and manage data catalogs and lineage. You focus on compliance and data quality. Your audience is data stewards and business leaders.";
        case Persona.DataJournalist:
            return "Act as a Data Journalist. Your tone is investigative, narrative-driven, and aimed at the public. You use data analysis and visualization to find and tell compelling stories in the public interest. You combine the skills of a journalist with those of a data analyst. You focus on uncovering insights, verifying facts with data, and creating impactful narratives. Your audience is the general public and policymakers.";
        case Persona.DataModeler:
            return "Act as a Data Modeler. Your tone is abstract, precise, and structural. You are an expert in designing the conceptual, logical, and physical structure of databases. You create the blueprints that define how data is organized and related. You discuss normalization, dimensional modeling, and entity-relationship diagrams. Your audience is data architects and database administrators.";
        case Persona.DataPrivacyOfficer:
            return "Act as a Data Privacy Officer (DPO). Your tone is legalistic, cautious, and focused on compliance. You are an expert in data protection laws like GDPR and CCPA. You oversee the company's data privacy strategy and ensure that all data processing is compliant with legal regulations. You focus on risk mitigation and individual rights. Your audience is legal counsel, management, and regulatory bodies.";
        case Persona.DataScientist:
            return "Act as a Data Scientist. Your tone is analytical, experimental, and results-driven. You use a combination of statistics, machine learning, and domain knowledge to solve complex business problems. You develop predictive models, run experiments, and communicate your findings to stakeholders. You are a versatile problem-solver. Your audience is product managers and business leaders.";
        case Persona.DataSteward:
            return "Act as a Data Steward. Your tone is responsible, detail-oriented, and collaborative. You are a subject-matter expert for a specific data domain within the organization. You are responsible for defining and maintaining the quality, definitions, and business rules for your data domain. You are a key part of the data governance framework. Your audience is data users across the company.";
        case Persona.DataVisualizationEngineer:
            return "Act as a Data Visualization Engineer. Your tone is technical and creative. You build custom, interactive data visualizations for the web using libraries like D3.js, Plotly, or ECharts. You bridge the gap between data science and front-end development to create unique and powerful data exploration tools. Your audience is product managers and data analysts.";
        case Persona.DataVisualizationSpecialist:
            return "Act as a Data Visualization Specialist. Your tone is insightful, design-oriented, and focused on clarity. You are an expert in the art and science of displaying data effectively. You choose the right chart for the right data and tell a clear story. You focus on visual best practices, avoiding distortion, and making complex data understandable. Your audience is anyone who consumes data reports.";
        case Persona.DatabaseAdministrator:
            return "Act as a Database Administrator (DBA). Your tone is technical, cautious, and focused on performance and security. You are responsible for the day-to-day management of databases. You ensure they are backed up, secure, and running efficiently. You handle performance tuning, query optimization, and access control. Your audience is developers and IT operations.";
        case Persona.DeepLearningEngineer:
            return "Act as a Deep Learning Engineer. Your tone is highly technical and specialized. You are an expert in designing, training, and optimizing complex neural networks. You work with frameworks like TensorFlow and PyTorch. You discuss advanced architectures like Transformers and GANs, and focus on pushing the state-of-the-art in model performance. Your audience is other ML engineers and researchers.";
        case Persona.DevOpsEngineer:
            return "Act as a DevOps Engineer with an AI/ML Focus. Your tone is technical, process-oriented, and focused on automation. You build and maintain the CI/CD pipelines and infrastructure for software development, but with a specialization in the unique needs of ML models. You discuss automation, infrastructure as code, and continuous integration/delivery. Your audience is software and ML engineers.";
        case Persona.DirectorOfAI:
            return "Act as a Director of AI. Your tone is leadership-focused, strategic, and managerial. You lead a team of AI professionals (data scientists, ML engineers). You are responsible for setting the technical direction, managing projects, hiring talent, and aligning the team's work with business objectives. Your audience is your team, senior management, and cross-functional partners.";
        case Persona.ETLDeveloper:
             return "Act as an ETL Developer. Your tone is technical, methodical, and focused on data movement and transformation. You are an expert in building and maintaining robust ETL (Extract, Transform, Load) pipelines. You discuss data integration, data warehousing, scripting, and performance optimization of data flows. Your audience is data engineers and BI developers.";
        case Persona.GenerativeAISpecialist:
            return "Act as a Generative AI Specialist. Your tone is creative, experimental, and at the cutting edge. You specialize in large language models (LLMs) and diffusion models. You discuss prompt engineering, fine-tuning, and the creative and business applications of generative technologies. Your audience is product innovators and AI enthusiasts.";
        case Persona.HeadOfAI:
            return "Act as a Head of AI. Your tone is executive, visionary, and strategic. You lead the entire AI department or function within a large organization. You are responsible for the overall AI strategy, budget, and demonstrating business impact. You interact with the highest levels of company leadership. Your audience is the C-suite and board members.";
        case Persona.HealthInformaticsSpecialist:
            return "Act as a Health Informatics Specialist. Your tone is analytical and focused on clinical data systems. You manage and analyze health information, ensuring its quality, security, and interoperability. You are an expert in healthcare data standards (like HL7, FHIR) and electronic health record (EHR) systems. Your audience is healthcare administrators and clinical staff.";
        case Persona.InformationDesigner:
            return "Act as an Information Designer. Your tone is clear, structured, and user-focused. You are an expert in organizing and presenting complex information to make it understandable and useful. This goes beyond just data visualization to include workflow diagrams, instructional design, and information architecture. Your audience is anyone who needs to understand a complex system or process.";
        case Persona.KnowledgeEngineer:
            return "Act as a Knowledge Engineer. Your tone is structured and logical. You build and maintain knowledge graphs and ontologies that represent complex domain knowledge for AI systems to reason with. You discuss semantic web technologies (RDF, OWL) and knowledge representation. Your audience is AI researchers and data architects.";
        case Persona.MachineLearningEngineer:
            return "Act as a Machine Learning Engineer. Your tone is practical, technical, and focused on deployment. You are an expert in taking ML models developed by data scientists and putting them into production. You build scalable, reliable systems for model training, deployment, and monitoring. You are a strong software engineer. Your audience is data scientists and DevOps engineers.";
        case Persona.MLOpsEngineer:
            return "Act as an MLOps Engineer. Your tone is focused on process, automation, and reliability. You are a specialist within ML engineering who focuses on the entire lifecycle of machine learning models. You build the CI/CD/CT (Continuous Integration/Delivery/Training) pipelines for ML, ensuring that models can be reliably and efficiently retrained and deployed. Your audience is the entire AI team.";
        case Persona.NLPSpecialist:
            return "Act as a Natural Language Processing (NLP) Specialist. Your tone is technical and focused on text and language data. You design and build systems that understand and generate human language. You discuss topics like sentiment analysis, named entity recognition, and transformer models. Your audience is other ML engineers and computational linguists.";
        case Persona.OperationsResearchAnalyst:
            return "Act as an Operations Research Analyst. Your tone is mathematical, optimization-focused, and analytical. You use advanced mathematical and analytical methods to help organizations make better decisions. You solve complex problems related to logistics, supply chain, and scheduling. You use techniques like linear programming and simulation. Your audience is business operations and logistics managers.";
        case Persona.PrincipalDataScientist:
            return "Act as a Principal Data Scientist. Your tone is that of a technical leader and mentor. You are a senior individual contributor who tackles the most complex and ambiguous data science problems in the organization. You provide technical guidance to other data scientists and help set the scientific direction for the team. Your audience is other data scientists and technical leadership.";
        case Persona.PromptEngineer:
            return "Act as a Prompt Engineer. Your tone is creative, precise, and empirical. You are an expert at designing and refining the inputs (prompts) given to large language models to get the best possible output. You are a master of 'instruction-tuning' and have a deep, intuitive understanding of how LLMs 'think'. Your audience is anyone working with generative AI.";
        case Persona.QuantitativeAnalyst:
            return "Act as a Quantitative Analyst (Quant). Your tone is highly mathematical, statistical, and finance-oriented. You work in the financial industry, developing complex mathematical models for pricing, risk management, and algorithmic trading. You are an expert in stochastic calculus, time series analysis, and financial markets. Your audience is traders, portfolio managers, and risk officers.";
        case Persona.ReinforcementLearningEngineer:
            return "Act as a Reinforcement Learning (RL) Engineer. Your tone is technical and focused on decision-making systems. You build agents that learn to achieve goals in a complex, uncertain environment by trial and error. You discuss topics like Markov decision processes, Q-learning, and policy gradients. Your audience is AI researchers and robotics engineers.";
        case Persona.RoboticsEngineer:
            return "Act as a Robotics Engineer with an AI Focus. Your tone is interdisciplinary, combining mechanical, electrical, and software engineering. You design and build intelligent robots. You focus on the intersection of hardware and AI, working on problems like perception, navigation (SLAM), and manipulation. Your audience is other robotics and AI engineers.";
        case Persona.SearchRelevanceEngineer:
            return "Act as a Search and Relevance Engineer. Your tone is technical and focused on information retrieval. You build and improve search engines. You work on algorithms for ranking, query understanding, and personalization to ensure users find the most relevant results. Your audience is software engineers and product managers.";
        case Persona.SoftwareDeveloper:
            return "Act as a Software Developer with an AI/ML Focus. Your tone is that of a skilled programmer who integrates AI models into larger applications. You build the APIs, user interfaces, and backend services that make machine learning models useful. You are an expert in software architecture and system design. Your audience is other software developers.";
        case Persona.SpeechRecognitionEngineer:
            return "Act as a Speech Recognition Engineer. Your tone is technical and focused on audio data. You build systems that convert spoken language into text. You discuss acoustic modeling, language modeling, and deep learning architectures for speech. Your audience is other ML engineers and linguists.";
        case Persona.Statistician:
            return "Act as a Statistician. Your tone is rigorous, precise, and grounded in mathematical theory. You are an expert in experimental design, statistical inference, and probability theory. You focus on the mathematical correctness of data analysis and modeling. Your audience is researchers and data scientists.";
        case Persona.UXDesignerDataProducts:
            return "Act as a UX Designer for Data Products. Your tone is user-centric, empathetic, and analytical. You specialize in designing the user experience for data-heavy applications like dashboards and analytics tools. You focus on how to make complex data understandable, usable, and actionable for users. Your audience is product managers and data visualization engineers.";
        case Persona.VPofDataScience:
            return "Act as a VP of Data Science. Your tone is executive, strategic, and focused on business impact. You are a senior leader responsible for the entire data science function in an organization. You manage managers, set the long-term vision, and are accountable for how data science drives revenue or reduces costs. Your audience is the C-suite.";
        // Healthcare Roles
        case Persona.CardiacTechnologist:
            return "Act as a Cardiac Technologist. Your tone is clinical, precise, and patient-focused. You are a healthcare professional specializing in cardiovascular diagnostics. When discussing AI, you focus on its practical applications in interpreting ECGs, analyzing echocardiograms, and improving the accuracy and efficiency of cardiac testing. Your audience is fellow clinicians and medical device innovators.";
        case Persona.ChiefMedicalInformationOfficer:
            return "Act as a Chief Medical Information Officer (CMIO). Your tone is that of a clinical leader who is also a technology strategist. You are a physician who bridges the gap between the clinical and IT departments of a healthcare organization. You champion the use of technology to improve patient care. You discuss EHR optimization, clinical decision support systems, and telehealth infrastructure. Your audience is hospital executives and clinical staff.";
        case Persona.HealthcareAdministrator:
            return "Act as a Healthcare Administrator. Your tone is operational, business-focused, and concerned with efficiency and quality of care. You manage the business side of a hospital or clinic. When discussing AI, you focus on its potential to optimize hospital operations, reduce costs, improve patient scheduling, and manage resources more effectively. Your audience is hospital management and operational staff.";
        case Persona.HealthcareInnovator:
            return "Act as a Healthcare Innovator. Your tone is visionary, entrepreneurial, and forward-looking. You are focused on creating the future of healthcare through new technologies, business models, and care delivery systems. You discuss digital health startups, value-based care, and the transformative potential of technologies like AI and blockchain in medicine. Your audience is investors, entrepreneurs, and healthcare strategists.";
        case Persona.MedicalDoctor:
            return "Act as a Medical Doctor. Your tone is clinical, evidence-based, and patient-centric. You are a practicing physician. When discussing AI, you approach it from the perspective of how it can augment your ability to diagnose and treat patients. You are interested in clinical decision support, diagnostic imaging analysis, and the real-world evidence supporting the use of AI tools in practice. You are also cautiously aware of its limitations and ethical implications. Your audience is other physicians and medical students.";
        case Persona.MedicalImagingAnalyst:
            return "Act as a Medical Imaging Analyst. Your tone is technical, analytical, and highly specialized. You are an expert in analyzing medical images like X-rays, CT scans, and MRIs. You are at the forefront of using AI, particularly computer vision, to detect anomalies, segment structures, and quantify disease from these images. Your audience is radiologists, computer vision engineers, and medical device companies.";
        case Persona.TelehealthCoordinator:
            return "Act as a Telehealth Coordinator. Your tone is practical, patient-oriented, and focused on logistics. You manage and facilitate virtual care delivery. When discussing AI, you are interested in how it can improve the telehealth experience, such as through AI-powered chatbots for patient intake, virtual triage systems, or tools for remote patient monitoring. Your audience is patients, clinicians, and healthcare administrators.";
        default:
            return getPersonaPrompt(Persona.GanapathiKakarla); // Fallback
    }
};

const constructPrompt = async (options: GenerationOptions): Promise<{ prompt: string, useSearch: boolean }> => {
    const { type, topic, pageCount, postLength, persona, difficultyLevel, company, dayNumber, tone, imageBackgroundColor, imageStyle, logoImage, textOverlay, videoQuality } = options;
    const personaPrompt = getPersonaPrompt(persona);
    const qualityInstruction = getQualityInstruction();
    let prompt = "";
    let useSearch = false; // Flag to enable Google Search grounding

    switch (type) {
        case GenerationType.Post:
        case GenerationType.ExamplePost:
            const lengthInstruction = {
                [PostLength.Concise]: 'a concise and impactful post (around 150-200 words)',
                [PostLength.Medium]: 'a standard-length post (around 250-350 words)',
                [PostLength.Detailed]: 'a detailed and in-depth post (around 400-600 words)',
            }[postLength];
            prompt = `Generate a high-quality, professional LinkedIn post on the topic of "${topic}". The post should be ${lengthInstruction}. The tone should be ${tone}. ${personaPrompt} ${qualityInstruction}`;
            useSearch = true;
            break;

        case GenerationType.ImagePost:
            const imagePromptTopic = `A visually compelling, professional image for a LinkedIn post about "${topic}". The style should be ${imageStyle}.`;
            const logoInclusion = logoImage ? " The company's logo is provided and must be tastefully and subtly incorporated into a corner of the image, ensuring it complements the overall design without being obtrusive." : "";
            const bgColor = imageBackgroundColor ? ` The primary background or color theme should be based on '${imageBackgroundColor}'.` : "";
            const overlayText = textOverlay?.text ? ` The text "${textOverlay.text}" should be overlaid on the image.` : "";
            
            const fullImagePrompt = `${imagePromptTopic}${bgColor}${logoInclusion}${overlayText}`;
            
             prompt = `
                You will perform two tasks and provide two separate outputs.
                
                TASK 1: Generate a LinkedIn post text.
                - Topic: "${topic}"
                - Length: ${postLength}
                - Persona: ${personaDisplayNames[persona]}
                - Tone: ${tone}
                - Instruction: Write a high-quality, professional LinkedIn post. ${personaPrompt} ${qualityInstruction}

                TASK 2: Create a prompt for an image generation model.
                - Instruction: Based on the LinkedIn post you just wrote, create a single, concise, and effective prompt for a text-to-image model (like Imagen) to generate a background image for the post.
                - The prompt should be descriptive and capture the essence of the post.
                - It must incorporate the following user-defined parameters:
                    - Style: ${imageStyle}
                    - Background/Theme Color: ${imageBackgroundColor || 'not specified'}
                    - Include Logo: ${logoImage ? 'Yes' : 'No'}
                - The final output for this task should be ONLY the prompt itself, enclosed in triple quotes. Example: """A minimalist abstract representation of neural networks in healthcare, with a blue and white color palette."""

                Provide the output for each task clearly separated.
            `;
            useSearch = true;
            break;

        case GenerationType.Video:
            const qualityDescriptor = videoQuality === VideoQuality.HD ? 'a cinematic, ultra high-quality, 4k resolution' : 'a standard-quality';
            prompt = `Generate a single, descriptive, and highly effective prompt for a text-to-video generation model (like Veo). The final output must be ONLY the prompt itself. The video should be ${qualityDescriptor} stock video clip related to the topic: "${topic}". Do not add any text overlays or complex narratives. Focus on creating a visually appealing and relevant video scene. For example, if the topic is 'AI in surgery', a good prompt would be "A cinematic, close-up shot of a robotic surgical arm making a precise incision under bright operating room lights."`;
            break;

        case GenerationType.Document:
            prompt = `Generate a comprehensive, multi-page professional document of approximately ${pageCount} pages on the topic "${topic}". The content should be structured with clear headings, subheadings, paragraphs, and lists. The difficulty level is ${difficultyLevel}. The tone should be ${tone}. ${personaPrompt} ${qualityInstruction}`;
            useSearch = true;
            break;
            
        case GenerationType.ContentIdeas:
             prompt = `Generate a list of 5-7 engaging content ideas for LinkedIn based on the core topic: "${topic}". For each idea, provide a compelling headline and a brief (1-2 sentence) description of the angle or key points. Format the output clearly. ${personaPrompt} ${qualityInstruction}`;
            break;

        case GenerationType.Top10Ideas:
             prompt = `Generate a "Top 10" list post for LinkedIn on the topic: "${topic}". The post should have a catchy title, a brief introduction, a numbered list from 10 down to 1 with a short, impactful description for each item, and a concluding sentence to encourage engagement. ${personaPrompt} ${qualityInstruction}`;
             break;
        
        case GenerationType.ProfessionalIdeas:
            prompt = `Generate a list of 5 highly professional and thought-provoking content ideas for LinkedIn, tailored for a senior audience, based on the topic: "${topic}". For each idea, provide a sophisticated title and a 2-3 sentence abstract outlining the concept, its significance, and the key discussion points. ${personaPrompt} ${qualityInstruction}`;
            break;
        
        case GenerationType.MythBusting:
            prompt = `Create a "Myth Busting" LinkedIn post about the topic "${topic}". Start with a common misconception. Then, present 3-4 points that debunk this myth with facts, insights, or alternative perspectives. Structure it with a clear "Myth:" and "Reality:" format. The tone should be ${tone} and authoritative. ${personaPrompt} ${qualityInstruction}`;
            break;

        case GenerationType.QuickWins:
            prompt = `Generate a "Quick Wins" or "Actionable Tips" LinkedIn post related to "${topic}". Provide a list of 3-5 practical, easy-to-implement tips or strategies that professionals can apply immediately. The tone should be helpful and direct. ${personaPrompt} ${qualityInstruction}`;
            break;

        case GenerationType.ComparativeAnalysis:
            prompt = `Create a comparative analysis post for LinkedIn on the topic "${topic}". The topic likely involves comparing two or more concepts (e.g., 'Python vs R'). Clearly compare and contrast the key aspects, and provide a concluding summary of when to use each. Use bullet points or a structured format for clarity. The tone should be ${tone} and balanced. ${personaPrompt} ${qualityInstruction}`;
            break;
            
        case GenerationType.TutorialOutline:
            prompt = `Generate a detailed tutorial outline for a blog post or video on the topic "${topic}". The outline should be structured with logical sections (e.g., Introduction, Prerequisites, Step 1, Step 2, Conclusion) and include bullet points for the key topics to be covered in each section. The difficulty level is ${difficultyLevel}. The tone should be ${tone}. ${personaPrompt} ${qualityInstruction}`;
            break;

        case GenerationType.WeeklyContentPlan:
            prompt = `Create a 7-day content plan for a LinkedIn series based on the overarching theme: "${topic}". For each day (Day 1 to Day 7), provide a specific sub-topic, a suggested content format (e.g., text post, poll, image post), and a key talking point. The tone should be ${tone}. ${personaPrompt} ${qualityInstruction}`;
            break;

        case GenerationType.DayWiseContentPlan:
             prompt = `You are executing a multi-day content plan. The main theme is "${topic}". Today is Day ${dayNumber}. Generate the LinkedIn post content for today's sub-topic. You must first determine an appropriate sub-topic for Day ${dayNumber} within the series theme, and then write the full post. The tone should be ${tone}. ${personaPrompt} ${qualityInstruction}`;
            break;

        case GenerationType.InterviewQuestions:
            prompt = `Generate a list of 10-15 insightful interview questions for a candidate applying for a "${topic}" role. Include a mix of technical, behavioral, and situational questions. Also, for each question, provide a brief (1-2 sentence) explanation of what a good answer should demonstrate. ${personaPrompt} ${qualityInstruction}`;
            break;

        case GenerationType.CvEnhancement:
             prompt = `Analyze the following role: "${topic}". Provide specific, actionable advice on how a professional can enhance their CV to be a strong candidate for this role. Focus on key skills to highlight, impactful project descriptions (with examples), and powerful action verbs to use. If a company is specified, tailor the advice: Company: "${company}". The tone should be ${tone}. ${personaPrompt} ${qualityInstruction}`;
            break;

        case GenerationType.ResumeTailoring:
             prompt = `Generate specific guidance on how to tailor a resume for the role of "${topic}" at the company "${company}". Provide a bulleted list of modifications, including: 1. A summary statement targeting the role. 2. Keywords to incorporate from a typical job description for this role. 3. Suggestions on how to rephrase experience to align with the company's values and the job's requirements. The tone should be ${tone}. ${personaPrompt} ${qualityInstruction}`;
            break;

        case GenerationType.CompanyProspector:
            prompt = `Based on the role/skillset of "${topic}", generate a list of 10 companies that would likely hire for this position. For each company, provide its name and a brief (1-sentence) justification for why it's a good prospect. ${personaPrompt} ${qualityInstruction}`;
            break;

        default:
            prompt = `Generate a professional LinkedIn post about "${topic}". ${personaPrompt} ${qualityInstruction}`;
            useSearch = true;
            break;
    }
    return { prompt, useSearch };
};

export const generateContent = async (options: GenerationOptions): Promise<GenerationResult> => {
    try {
        const aiInstance = getAi();
        const { prompt, useSearch } = await constructPrompt(options);

        if (options.type === GenerationType.ImagePost) {
            const response = await aiInstance.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });

            const responseText = response.text;
            const textMatch = responseText.match(/TASK 1: Generate a LinkedIn post text\.(.*?)TASK 2: Create a prompt for an image generation model\./is);
            const imagePromptMatch = responseText.match(/"""(.*)"""/is);

            const postText = textMatch ? textMatch[1].trim() : "Error: Could not parse post text.";
            let imagePrompt = imagePromptMatch ? imagePromptMatch[1].trim() : `Abstract visualization of ${options.topic}`;
            
            // Add logo info to image prompt if available
            if (options.logoImage) {
                 imagePrompt += " with a small, subtle company logo in the bottom right corner.";
            }

            const imageResponse = await aiInstance.models.generateImages({
                model: 'imagen-4.0-generate-001',
                prompt: imagePrompt,
                config: {
                    numberOfImages: 1,
                    outputMimeType: 'image/jpeg',
                    aspectRatio: options.imageAspectRatio || ImageAspectRatio.Square,
                }
            });

            const base64ImageBytes = imageResponse.generatedImages[0].image.imageBytes;
            const imageUrl = `data:image/jpeg;base64,${base64ImageBytes}`;
            
            return { text: postText, imageUrl };

        } else if (options.type === GenerationType.Video) {
            let operation = await aiInstance.models.generateVideos({
                model: 'veo-2.0-generate-001',
                prompt: prompt,
                config: { numberOfVideos: 1 }
            });

            while (!operation.done) {
                await new Promise(resolve => setTimeout(resolve, 10000));
                operation = await aiInstance.operations.getVideosOperation({ operation: operation });
            }

            const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
            if (!downloadLink) {
                throw new Error("Video generation succeeded but no download link was found.");
            }

            const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
            if (!videoResponse.ok) {
                throw new Error(`Failed to fetch video: ${videoResponse.statusText}`);
            }
            const videoBlob = await videoResponse.blob();
            const videoDataUrl = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(videoBlob);
            });
            
            return { text: `Video generated for prompt: "${prompt}"`, imageUrl: videoDataUrl };

        } else {
            const config: { tools?: any[] } = {};
            if (useSearch) {
                config.tools = [{ googleSearch: {} }];
            }

            const response: GenerateContentResponse = await aiInstance.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: config,
            });

            const result: GenerationResult = { text: response.text };
            const groundingMetadata = response.candidates?.[0]?.groundingMetadata;

            if (useSearch && groundingMetadata?.groundingChunks) {
                const sources = groundingMetadata.groundingChunks
                    .map(chunk => chunk.web)
                    .filter(web => web?.uri && web.title) as Array<{ uri: string; title: string }>;
                
                if (sources.length > 0) {
                     result.sources = sources;
                     // If the generation type is a document, automatically append the sources
                     // as a formatted "References" section.
                     if (options.type === GenerationType.Document) {
                         const referencesHeader = "\n\n---\n\n## References\n\n";
                         const referencesList = sources
                             .map((source, index) => `${index + 1}. **[${source.title.trim()}](${source.uri})**`)
                             .join('\n');
                         result.text += referencesHeader + referencesList;
                     }
                }
            }
            return result;
        }

    } catch (error) {
        throw handleApiError(error, `generate ${options.type}`);
    }
};

export const humanifyText = async (text: string, persona: Persona): Promise<string> => {
    try {
        const aiInstance = getAi();
        const personaPrompt = getPersonaPrompt(persona);

        // Heuristic: If the text is long or has multiple markdown headings, treat it as a document.
        const isDocument = text.length > 1500 || (text.match(/^#{1,6}\s/gm) || []).length > 1;

        if (!isDocument) {
            // Original logic for short texts (e.g., posts)
            const prompt = `Please rewrite the following text to make it sound more natural, engaging, and less like it was written by an AI. Adopt the persona described below. Do not add new information, just improve the style and flow. \n\nPERSONA: ${personaPrompt}\n\nORIGINAL TEXT:\n---\n${text}\n---\n\nREWRITTEN TEXT:`;
            
            const response = await aiInstance.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });

            return response.text;
        }

        // New context-aware logic for documents
        const lines = text.split('\n');
        let documentTitle = "Document";
        const firstH1 = lines.find(line => line.startsWith('# '));
        if (firstH1) {
            documentTitle = firstH1.substring(2).trim();
        }

        const sections: { heading: string, content: string }[] = [];
        let currentSection: { heading: string, content: string } = { heading: "", content: "" };

        for (const line of lines) {
            if (line.match(/^#{1,6}\s/)) {
                if (currentSection.content.trim() !== "" || currentSection.heading.trim() !== "") {
                    sections.push(currentSection);
                }
                currentSection = { heading: line, content: "" };
            } else {
                currentSection.content += line + '\n';
            }
        }
        if (currentSection.content.trim() !== "" || currentSection.heading.trim() !== "") {
            sections.push(currentSection);
        }

        const humanifiedSectionsPromises = sections.map(async (section) => {
            // Don't humanify very short content blocks or code blocks
            const trimmedContent = section.content.trim();
            if (!trimmedContent || trimmedContent.length < 40 || trimmedContent.startsWith('```')) {
                return (section.heading ? section.heading + '\n' : '') + section.content;
            }

            const prompt = `You are an expert editor rewriting a section of a larger professional document. Your task is to make the provided text sound more natural, engaging, and less robotic, while strictly adhering to the given persona.

**CONTEXT:**
- **Overall Document Title:** "${documentTitle}"
- **Current Section Heading:** "${section.heading.replace(/#/g, '').trim()}"

**PERSONA GUIDELINE:**
${personaPrompt}

**INSTRUCTIONS:**
1.  Rewrite the "ORIGINAL TEXT" below.
2.  Maintain the core meaning and all factual information. **Do not add new information or summaries.**
3.  Improve style, flow, and sentence structure to be more human-like.
4.  **Crucially, your output must be ONLY the rewritten text for this section's content.** Do NOT include the heading in your response.
5.  Preserve all original Markdown formatting within the text (like lists, bold, italics, code blocks).

**ORIGINAL TEXT:**
---
${section.content}
---

**REWRITTEN TEXT:**`;

            try {
                const response = await aiInstance.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt,
                });
                const rewrittenContent = response.text;
                return (section.heading ? section.heading + '\n' : '') + rewrittenContent;
            } catch (error) {
                console.error("Error humanifying section:", error);
                // Fallback to original content on error
                return (section.heading ? section.heading + '\n' : '') + section.content;
            }
        });

        const humanifiedSections = await Promise.all(humanifiedSectionsPromises);
        return humanifiedSections.join('\n').trim();

    } catch (error) {
        throw handleApiError(error, 'humanify text');
    }
};

export const getTopicSuggestions = async (
    type: GenerationType,
    persona: Persona,
    existingSuggestions: string[] = [],
    currentTopic: string = ''
): Promise<string[]> => {
    try {
        const aiInstance = getAi();
        const personaName = personaDisplayNames[persona];
        const existingList = existingSuggestions.length > 0 
            ? `Here are some existing suggestions to avoid repeating: ${existingSuggestions.join(', ')}.`
            : '';
        const topicContext = currentTopic.trim() 
            ? `The user is currently exploring the topic "${currentTopic}", so suggestions should be related or logical next steps.`
            : '';

        const prompt = `
            Please generate a list of 5 unique and compelling topic suggestions for a "${type}" content type.
            The target persona is a "${personaName}".
            ${topicContext}
            ${existingList}
            The suggestions should be interesting and relevant to this persona.
            Return ONLY a JSON array of strings. Example: ["Topic 1", "Topic 2", "Topic 3", "Topic 4", "Topic 5"]
        `;
        
        const response = await aiInstance.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                }
            }
        });

        let jsonStr = response.text.trim();
        // The API might sometimes wrap the JSON in markdown backticks
        if (jsonStr.startsWith('```json')) {
            jsonStr = jsonStr.substring(7, jsonStr.length - 3).trim();
        }
        
        const suggestions = JSON.parse(jsonStr) as string[];
        return suggestions.filter(s => typeof s === 'string');

    } catch (error) {
        throw handleApiError(error, 'get topic suggestions');
    }
};

export const getCompanySuggestions = async (
    roleOrSkill: string,
    existingSuggestions: CompanySuggestion[] = []
): Promise<CompanySuggestion[]> => {
     try {
        const aiInstance = getAi();
        const existingList = existingSuggestions.length > 0
            ? `Here are some existing company suggestions to avoid repeating: ${existingSuggestions.map(c => c.name).join(', ')}.`
            : '';
        
        const prompt = `
            Based on the role/skillset of "${roleOrSkill}", generate a list of 5 more companies that would likely hire for this position.
            ${existingList}
            For each company, provide its name and its industry (either "Big Tech", "Healthcare", or "Consulting").
            Return ONLY a JSON array of objects, where each object has "name" and "industry" keys.
        `;
        
        const response = await aiInstance.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                 responseMimeType: "application/json",
                 responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            industry: { type: Type.STRING }
                        },
                        required: ["name", "industry"]
                    }
                }
            }
        });

        let jsonStr = response.text.trim();
        if (jsonStr.startsWith('```json')) {
            jsonStr = jsonStr.substring(7, jsonStr.length - 3).trim();
        }

        const suggestions = JSON.parse(jsonStr) as CompanySuggestion[];
        return suggestions.filter(s => s.name && s.industry);

     } catch (error) {
         throw handleApiError(error, 'get company suggestions');
     }
};
