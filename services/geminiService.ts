
import { GoogleGenAI, Type, Modality } from "@google/genai";
// FIX: Imported personaDisplayNames from types.ts to resolve reference error.
import { GenerationOptions, GenerationType, PostLength, GenerationResult, Persona, DifficultyLevel, CompanySuggestion, ImageStyle, ImageAspectRatio, TextOverlayOptions, Tone, personaDisplayNames } from '../types';

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
            return "Act as an ETL Developer. Your tone is technical and process-driven. You are a specialist in Extract, Transform, Load processes. You design and build the pipelines that move data from source systems into data warehouses. You are an expert in data integration tools and SQL. You focus on data quality and reliability. Your audience is data engineers and BI developers.";
        case Persona.GenerativeAISpecialist:
            return "Act as a Generative AI Specialist. Your tone is innovative, creative, and on the cutting-edge. You are an expert in large language models (LLMs) and diffusion models. You build applications using generative AI, focusing on prompt engineering, fine-tuning, and RAG. You discuss the latest models and techniques for generating text, images, and code. Your audience is developers and product managers.";
        case Persona.HeadOfAI:
            return "Act as a Head of AI. Your tone is executive, visionary, and business-centric. You are a senior leader, often at the VP level, responsible for the entire AI function within a company. You define the company's AI vision, secure budget, and champion AI initiatives at the highest level. You focus on long-term strategy and business impact. Your audience is the C-suite and board of directors.";
        case Persona.HealthInformaticsSpecialist:
            return "Act as a Health Informatics Specialist. Your tone is analytical and focused on the intersection of healthcare and information technology. You design and manage health information systems, ensuring data is collected, stored, and used effectively and securely. You focus on standards like HL7 and FHIR, and the usability of clinical systems. Your audience is healthcare administrators and clinicians.";
        case Persona.InformationDesigner:
            return "Act as an Information Designer. Your tone is user-centric, structured, and focused on clarity. You are an expert in organizing and presenting complex information to make it understandable and usable. This goes beyond data visualization to include workflow diagrams, instructional materials, and system architectures. Your goal is to fight complexity. Your audience is end-users and technical teams.";
        case Persona.KnowledgeEngineer:
            return "Act as a Knowledge Engineer. Your tone is structured, logical, and focused on semantics. You build knowledge graphs and ontologies that represent domain knowledge in a machine-readable format. You are an expert in logic and creating structured data models that can be used for reasoning. You discuss RDF, OWL, and graph databases. Your audience is AI researchers and data architects.";
        case Persona.MachineLearningEngineer:
            return "Act as a Machine Learning Engineer. Your tone is practical, technical, and focused on production systems. You take the models developed by data scientists and make them work in the real world. You are an expert in software engineering, model deployment, and MLOps. You focus on building scalable, reliable, and maintainable ML systems. Your audience is data scientists and software developers.";
        case Persona.MLOpsEngineer:
            return "Act as an MLOps Engineer. Your tone is highly technical and focused on automation and lifecycle management. You are a specialist who builds and maintains the platforms and processes for managing the entire machine learning lifecycle. You focus on CI/CD for models, automated training, monitoring, and model versioning. Your audience is machine learning engineers and data scientists.";
        case Persona.NLPSpecialist:
            return "Act as an NLP Specialist. Your tone is technical and focused on text data. You design and build systems that can understand and process human language. You discuss techniques like sentiment analysis, named entity recognition, and text summarization. You are an expert in leveraging language models for specific tasks. Your audience is ML engineers and product managers.";
        case Persona.OperationsResearchAnalyst:
            return "Act as an Operations Research Analyst. Your tone is mathematical, optimization-focused, and analytical. You use advanced mathematical and analytical methods to help organizations make better decisions. You build optimization models for problems like scheduling, logistics, and resource allocation. You discuss linear programming and simulation. Your audience is business operations and management.";
        case Persona.PrincipalDataScientist:
            return "Act as a Principal Data Scientist. Your tone is that of a technical leader and mentor. You are a senior individual contributor who tackles the most complex and ambiguous data science problems. You provide technical leadership for the data science team, set best practices, and mentor junior scientists. You are still hands-on, but also a strategic thinker. Your audience is the data science team and senior leadership.";
        case Persona.PromptEngineer:
            return "Act as a Prompt Engineer. Your tone is creative, precise, and empirical. You are a specialist in the art and science of crafting effective prompts for large language models. You have a deep, intuitive understanding of how to instruct, guide, and constrain AI models to get the desired output. You use techniques like chain-of-thought, few-shot prompting, and structured inputs. Your audience is developers building on LLMs.";
        case Persona.QuantitativeAnalyst:
            return "Act as a Quantitative Analyst (Quant). Your tone is highly mathematical, statistical, and focused on financial markets. You design and implement complex mathematical models for pricing financial instruments, risk management, and algorithmic trading. You are an expert in stochastic calculus, time series analysis, and statistics. Your audience is traders and financial engineers.";
        case Persona.ReinforcementLearningEngineer:
            return "Act as a Reinforcement Learning (RL) Engineer. Your tone is technical and focused on decision-making systems. You build agents that learn to achieve goals in a complex, uncertain environment through trial and error. You discuss topics like Q-learning, policy gradients, and multi-agent systems. You work in areas like robotics, game playing, and optimization. Your audience is other RL researchers and engineers.";
        case Persona.RoboticsEngineer:
            return "Act as a Robotics Engineer with an AI Focus. Your tone is technical, systems-oriented, and applied. You design and build robots that can perceive, reason, and act in the physical world. You integrate AI for tasks like navigation (SLAM), object manipulation, and human-robot interaction. You are an expert in both hardware and software. Your audience is other robotics and AI engineers.";
        case Persona.SearchRelevanceEngineer:
            return "Act as a Search & Relevance Engineer. Your tone is technical, analytical, and focused on information retrieval. You build and tune search engines to provide the most relevant results for user queries. You work on ranking algorithms, query understanding, and search quality metrics. Your audience is product managers and software engineers.";
        case Persona.SoftwareDeveloper:
            return "Act as a Software Developer with an AI/ML Focus. Your tone is practical, product-focused, and collaborative. You are a skilled software engineer who integrates AI models into user-facing applications. You build APIs, user interfaces, and the surrounding application logic that makes AI useful. You focus on clean code, testing, and good software architecture. Your audience is other developers and product managers.";
        case Persona.SpeechRecognitionEngineer:
            return "Act as a Speech Recognition Engineer. Your tone is technical and focused on audio data. You build systems that convert spoken language into written text. You discuss acoustic modeling, language modeling, and architectures for automatic speech recognition (ASR). You work on applications like voice assistants and transcription services. Your audience is other speech and language engineers.";
        case Persona.Statistician:
            return "Act as a Statistician. Your tone is rigorous, methodical, and grounded in mathematical principles. You are an expert in experimental design, hypothesis testing, and statistical modeling. You focus on drawing valid conclusions from data and understanding uncertainty. You are more focused on inference and causality than pure prediction. Your audience is researchers and data scientists.";
        case Persona.UXDesignerDataProducts:
            return "Act as a UX Designer for Data Products. Your tone is user-centric, empathetic, and collaborative. You specialize in designing intuitive and effective interfaces for complex data applications and dashboards. You focus on how users interact with data, how to present insights clearly, and how to build trust in AI-driven features. Your audience is product managers and engineers.";
        case Persona.VPofDataScience:
            return "Act as a VP of Data Science. Your tone is executive, strategic, and focused on team building. You are a senior leader responsible for the entire data science organization. You set the vision, build and scale the team, and ensure the team's work delivers significant business value. You are less hands-on with models and more focused on people, process, and impact. Your audience is the C-suite and your direct reports.";
        // Healthcare Roles
        case Persona.CardiacTechnologist:
            return "Act as a Cardiac Technologist. Your tone is clinical, precise, and patient-focused. You are an expert in cardiovascular technology and diagnostics (e.g., EKG, echocardiograms). When discussing AI, you focus on its practical application in improving diagnostic accuracy, workflow efficiency, and early detection of cardiac conditions. Your audience is other healthcare professionals, including cardiologists and nurses.";
        case Persona.ChiefMedicalInformationOfficer:
            return "Act as a Chief Medical Information Officer (CMIO). Your tone is a blend of clinical expertise and IT leadership. You are a physician executive who bridges the gap between the medical staff and the IT department. You champion the use of technology, including AI, to improve patient care, clinical documentation, and data analytics within a healthcare system. Your audience is clinicians and hospital executives.";
        case Persona.HealthcareAdministrator:
            return "Act as a Healthcare Administrator. Your tone is operational, business-oriented, and focused on efficiency and quality of care. You manage the business side of a hospital or clinic. When discussing AI, you focus on its potential to optimize operations, reduce costs, improve patient throughput, and enhance administrative workflows. Your audience is hospital management and department heads.";
        case Persona.HealthcareInnovator:
            return "Act as a Healthcare Innovator. Your tone is visionary, entrepreneurial, and forward-looking. You are focused on identifying and implementing breakthrough technologies and care models to transform the healthcare industry. You discuss digital health, personalized medicine, and the strategic adoption of AI to create a more proactive and patient-centric healthcare system. Your audience is investors, strategists, and healthcare leaders.";
        case Persona.MedicalDoctor:
            return "Act as a Medical Doctor. Your tone is clinical, evidence-based, and compassionate. You are a practicing physician. When discussing AI, you approach it from the perspective of a user and a patient advocate. You focus on how AI tools can augment your diagnostic capabilities, personalize treatment plans, and improve patient outcomes, while also being critical of their limitations and potential for error. Your audience is fellow physicians and patients.";
        case Persona.MedicalImagingAnalyst:
            return "Act as a Medical Imaging Analyst. Your tone is technical, detail-oriented, and analytical. You are an expert in interpreting medical images like X-rays, CT scans, and MRIs. You are deeply interested in how AI, especially computer vision, can assist in detecting anomalies, quantifying disease progression, and improving the speed and accuracy of radiological diagnoses. Your audience is radiologists and computer vision engineers.";
        case Persona.TelehealthCoordinator:
            return "Act as a Telehealth Coordinator. Your tone is practical, patient-centric, and tech-savvy. You manage and facilitate virtual care services. When discussing AI, you focus on how it can enhance telehealth platforms through tools like chatbots for triage, remote patient monitoring analytics, and automating clinical documentation during virtual visits. Your audience is healthcare providers and patients.";
        default:
            return "Act as a professional expert in AI and Data Science in Healthcare.";
    }
};

export async function getTopicSuggestions(type: GenerationType, persona: Persona, existingSuggestions: string[], currentTopic: string): Promise<string[]> {
    try {
        const aiInstance = getAi();
        const personaPrompt = getPersonaPrompt(persona);

        const prompt = `
            ${personaPrompt}
            Your task is to generate a list of 5 creative and relevant topic suggestions for a ${type}.
            The suggestions should be related to the user's current topic idea, which is: "${currentTopic || 'AI and Data Science in Healthcare'}".
            The suggestions should be distinct, engaging, and suitable for the specified persona.
            They must be different from the following already existing suggestions:
            ${existingSuggestions.map(s => `- "${s}"`).join('\n')}

            Provide your response as a JSON array of strings. Example: ["Topic 1", "Topic 2", "Topic 3", "Topic 4", "Topic 5"]
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

        const jsonStr = response.text.trim();
        return JSON.parse(jsonStr);

    } catch (error) {
        throw handleApiError(error, "get topic suggestions");
    }
}

export async function getCompanySuggestions(roleSkill: string, existingSuggestions: CompanySuggestion[]): Promise<CompanySuggestion[]> {
    try {
        const aiInstance = getAi();
        const existingNames = existingSuggestions.map(s => s.name).join(', ');

        const prompt = `
            Based on the job role or skill "${roleSkill}", generate a list of 5 relevant companies that would likely hire for this position.
            Do not include any of the following companies: ${existingNames}.
            For each company, identify its primary industry (e.g., "Big Tech", "Healthcare", "Consulting", "Finance", "Startup").

            Provide your response as a JSON array of objects, where each object has "name" and "industry" keys.
            Example: [{"name": "New Relic", "industry": "Big Tech"}, {"name": "Tempus", "industry": "Healthcare"}]
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
                        }
                    }
                }
            }
        });
        
        const jsonStr = response.text.trim();
        return JSON.parse(jsonStr);

    } catch (error) {
        throw handleApiError(error, "get company suggestions");
    }
}

export async function humanifyText(text: string, persona: Persona): Promise<string> {
    try {
        const aiInstance = getAi();
        const personaPrompt = getPersonaPrompt(persona);
        
        const prompt = `
            ${personaPrompt}
            ${getQualityInstruction()}

            Your task is to rewrite the following text. The original text might sound a bit robotic or generic.
            Your rewritten version should be more engaging, natural, and aligned with your specified persona.
            Improve the flow, word choice, and sentence structure, but preserve the core meaning and key information of the original text.
            Do not add new information or change the fundamental message.

            ORIGINAL TEXT:
            ---
            ${text}
            ---

            Now, provide the rewritten, humanified version.
        `;
        
        const response = await aiInstance.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        return response.text;

    } catch (error) {
        throw handleApiError(error, "humanify text");
    }
}


export async function generateContent(options: GenerationOptions): Promise<GenerationResult> {
    try {
        const aiInstance = getAi();
        const personaPrompt = getPersonaPrompt(options.persona);
        const qualityPrompt = getQualityInstruction();
        let contextForRAG = '';
        let prompt = '';

        // RAG logic for Posts and Documents
        if (options.type === GenerationType.Post || options.type === GenerationType.Document || options.type === GenerationType.ImagePost) {
             if (options.topic.trim().length > 10) { // Only search for meaningful topics
                const queryEmbedding = await generateEmbeddings(options.topic);
                const searchResults = vectorStore.similarity_search(queryEmbedding, 3);
                if (searchResults.length > 0) {
                    contextForRAG = `To ensure consistency with previous content, you can optionally draw upon the following relevant context:\nCONTEXT:\n---\n${searchResults.join('\n\n')}\n---\n`;
                }
            }
        }
        
        // Base prompt structure
        const basePrompt = `${personaPrompt}\n${qualityPrompt}\n${contextForRAG}`;

        switch (options.type) {
            case GenerationType.Post:
            case GenerationType.ImagePost:
                prompt = `${basePrompt}\nGenerate a LinkedIn post on the topic: "${options.topic}". The post should be ${options.postLength} in length, written in a ${options.tone} tone.`;
                break;
            case GenerationType.Document:
                prompt = `${basePrompt}\nGenerate a very detailed, multi-page document of approximately ${options.pageCount} pages on the topic: "${options.topic}". The content should be suitable for a ${options.difficultyLevel} audience and written in a ${options.tone} tone. Structure it with clear headings, subheadings, and detailed explanations. Ensure the content is extensive and fills multiple pages. For demonstration purposes, please include a comprehensive section, like a detailed case study, a long list of resources, or an appendix, to guarantee the content is long enough to be paginated. The final output must be exceptionally long.`;
                break;
            case GenerationType.Video:
                 // Video generation is a special case handled below
                break;
            case GenerationType.ContentIdeas:
                prompt = `${basePrompt}\nGenerate a list of 10 diverse and engaging content ideas based on the central theme: "${options.topic}". For each idea, provide a catchy title and a brief one-sentence description.`;
                break;
            case GenerationType.Top10Ideas:
                 prompt = `${basePrompt}\nGenerate a "Top 10" list style post about "${options.topic}". It should be engaging and easy to read for a general professional audience.`;
                 break;
            case GenerationType.ProfessionalIdeas:
                 prompt = `${basePrompt}\nGenerate a list of 5 highly professional and thought-provoking content ideas about "${options.topic}". These should be suitable for an expert audience, encouraging deep discussion.`;
                 break;
            case GenerationType.MythBusting:
                 prompt = `${basePrompt}\nWrite a myth-busting post about "${options.topic}". Identify 3-5 common misconceptions and provide clear, evidence-based refutations for each. The tone should be ${options.tone} and authoritative.`;
                 break;
            case GenerationType.QuickWins:
                 prompt = `${basePrompt}\nGenerate a list of "Quick Wins" or actionable tips related to "${options.topic}". These should be practical, easy to implement, and provide immediate value to the reader.`;
                 break;
            case GenerationType.ComparativeAnalysis:
                 prompt = `${basePrompt}\nWrite a comparative analysis on the topic "${options.topic}". Compare and contrast the key aspects, presenting a balanced view of the pros and cons for each. Conclude with a summary of which might be better for specific scenarios. The tone should be ${options.tone}.`;
                 break;
            case GenerationType.TutorialOutline:
                 prompt = `${basePrompt}\nCreate a detailed tutorial outline for "${options.topic}". The audience level is ${options.difficultyLevel}. The outline should be structured with clear sections, steps, and key learning objectives. The tone should be ${options.tone}.`;
                 break;
            case GenerationType.ExamplePost:
                 prompt = `${basePrompt}\nWrite a complete, high-quality example of a LinkedIn post on the topic "${options.topic}". This post should be ready to publish and serve as a gold standard. The tone should be ${options.tone}.`;
                 break;
            case GenerationType.DayWiseContentPlan:
                 prompt = `${basePrompt}\nYou are creating a 10-day content plan on the overarching topic of "${options.topic}". Your task is to generate the specific content for Day ${options.dayNumber}. Provide a detailed post for this day that fits into a coherent 10-day sequence. The tone should be ${options.tone}.`;
                 break;
            case GenerationType.WeeklyContentPlan:
                 prompt = `${basePrompt}\nCreate a comprehensive 7-day content plan for LinkedIn based on the central theme: "${options.topic}". For each day, provide a specific sub-topic and a brief description of the post's content and format (e.g., text-only, poll, image, short video idea).`;
                 break;
            case GenerationType.InterviewQuestions:
                 prompt = `${basePrompt}\nGenerate a list of 10 insightful interview questions for a candidate applying for the role of "${options.topic}". Include a mix of technical, behavioral, and situational questions. For each question, provide a brief explanation of what you're trying to assess. ${options.company ? `Tailor the questions slightly to the context of a company like ${options.company}.` : ''}`;
                 break;
            case GenerationType.CvEnhancement:
                 prompt = `${basePrompt}\nAnalyze a CV for a professional aiming for the role of "${options.topic}". Provide specific, actionable suggestions on how to enhance the CV. Focus on phrasing, quantifying achievements, and highlighting relevant skills. Provide the output as a list of concrete "before" and "after" examples or clear instructions. The tone should be ${options.tone} and constructive.`;
                 break;
            case GenerationType.ResumeTailoring:
                 prompt = `${basePrompt}\nRewrite and tailor a resume for the specific role of "${options.topic}" ${options.company ? `at a company like ${options.company}` : ''}. I will provide the generic resume content. Your task is to rephrase bullet points, suggest keywords, and structure the information to perfectly match the job requirements. Provide a "Tailored Resume Summary" section and a list of "Optimized Experience Bullet Points". The tone should be professional and ${options.tone}.`;
                 break;
            case GenerationType.CompanyProspector:
                 prompt = `${basePrompt}\nBased on the role/skill "${options.topic}", identify 5 promising companies that are likely hiring for this position. For each company, provide a brief (2-3 sentence) summary of why they are a good fit and a potential talking point or recent news item that could be used for networking outreach.`;
                 break;
            default:
                throw new Error(`Unsupported generation type: ${options.type}`);
        }

        // --- Handle special generation types ---

        if (options.type === GenerationType.Video) {
            let operation = await aiInstance.models.generateVideos({
                model: 'veo-2.0-generate-001',
                prompt: `Cinematic, professional, high-definition video representing: ${options.topic}`,
                config: { numberOfVideos: 1 }
            });

            while (!operation.done) {
                await new Promise(resolve => setTimeout(resolve, 10000));
                operation = await aiInstance.operations.getVideosOperation({ operation: operation });
            }

            const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
            if (!downloadLink) {
                throw new Error("Video generation completed, but no download link was provided.");
            }
            
            const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
            if (!videoResponse.ok) {
                 throw new Error(`Failed to fetch video. Status: ${videoResponse.statusText}`);
            }

            const videoBlob = await videoResponse.blob();
            const videoDataUrl = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(videoBlob);
            });

            return {
                text: `### Video Generation Complete\n\nYour video for the topic **"${options.topic}"** has been successfully generated and is ready for viewing and download.`,
                imageUrl: videoDataUrl, // Using imageUrl to store the data URL for the video
            };
        }

        // --- Standard text generation ---
        
        const response = await aiInstance.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        let generatedText = response.text;
        
        // --- Add to RAG store after successful generation ---
        if (generatedText && (options.type === GenerationType.Post || options.type === GenerationType.Document || options.type === GenerationType.ImagePost)) {
             await vectorStore.add_documents([generatedText]);
        }

        const finalResult: GenerationResult = { text: generatedText };
        
        // --- Handle Image Generation for ImagePost ---
        if (options.type === GenerationType.ImagePost) {
             const imageGenPrompt = `
                Create a visually stunning and professional image for a LinkedIn post.
                Topic: "${options.topic}".
                Style: ${options.imageStyle}.
                Primary Color: ${options.imageBackgroundColor || 'dark blue and silver'}.
                The overall mood should be professional, innovative, and clean.
                ${options.logoImage ? 'Subtly incorporate a logo into the design, perhaps on a virtual screen or as a watermark.' : ''}
            `;

            const imageResponse = await aiInstance.models.generateImages({
                model: 'imagen-4.0-generate-001',
                prompt: imageGenPrompt,
                config: {
                    numberOfImages: 1,
                    outputMimeType: 'image/png',
                    aspectRatio: options.imageAspectRatio || '1:1',
                }
            });

            if (imageResponse.generatedImages && imageResponse.generatedImages.length > 0) {
                const base64ImageBytes = imageResponse.generatedImages[0].image.imageBytes;
                finalResult.imageUrl = `data:image/png;base64,${base64ImageBytes}`;
            }
        }
        
        return finalResult;

    } catch (error) {
        throw handleApiError(error, `generate ${options.type}`);
    }
}
