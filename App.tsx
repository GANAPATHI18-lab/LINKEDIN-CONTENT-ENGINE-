
import React, { useState, useCallback, useEffect } from 'react';
import Header from './components/Header';
import Controls from './components/Controls';
import OutputDisplay from './components/OutputDisplay';
import HistoryPanel from './components/HistoryPanel';
import { GenerationType, GenerationOptions, GenerationResult, PostLength, Persona, DifficultyLevel, HistoryItem, ImageStyle, ImageAspectRatio, TextOverlayOptions, Tone, VideoQuality, PdfExportQuality } from './types';
import { generateContent, humanifyText } from './services/geminiService';

const App: React.FC = () => {
    const [generationType, setGenerationType] = useState<GenerationType>(GenerationType.ExamplePost);
    const [topic, setTopic] = useState<string>('');
    const [pageCount, setPageCount] = useState<number>(1);
    const [postLength, setPostLength] = useState<PostLength>(PostLength.Medium);
    const [persona, setPersona] = useState<Persona>(Persona.GanapathiKakarla);
    const [difficultyLevel, setDifficultyLevel] = useState<DifficultyLevel>(DifficultyLevel.Intermediate);
    const [tone, setTone] = useState<Tone>(Tone.Formal);
    const [company, setCompany] = useState<string>('');
    const [dayNumber, setDayNumber] = useState<number>(1);
    const [videoQuality, setVideoQuality] = useState<VideoQuality>(VideoQuality.SD);
    const [pdfExportQuality, setPdfExportQuality] = useState<PdfExportQuality>(PdfExportQuality.Standard);
    const [generationResult, setGenerationResult] = useState<GenerationResult | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Image customization state
    const [imageBackgroundColor, setImageBackgroundColor] = useState<string>('');
    const [imageStyle, setImageStyle] = useState<ImageStyle>(ImageStyle.Abstract);
    const [logoImage, setLogoImage] = useState<string | undefined>(undefined);
    const [imageAspectRatio, setImageAspectRatio] = useState<ImageAspectRatio>(ImageAspectRatio.Square);
    const [textOverlay, setTextOverlay] = useState<TextOverlayOptions>({
        text: '',
        fontFamily: 'Inter',
        fontSize: 48,
        color: '#FFFFFF',
        placement: 'center',
    });

    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [activeTab, setActiveTab] = useState<'controls' | 'history'>('controls');

    useEffect(() => {
        try {
            const savedHistory = localStorage.getItem('generationHistory');
            if (savedHistory) {
                setHistory(JSON.parse(savedHistory));
            }
        } catch (e) {
            console.error("Failed to load history from localStorage:", e);
        }
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem('generationHistory', JSON.stringify(history));
        } catch (e) {
            console.error("Failed to save history to localStorage:", e);
        }
    }, [history]);

    useEffect(() => {
        // Clear company when switching away from career types
         const isCareerType = [
            GenerationType.InterviewQuestions,
            GenerationType.CvEnhancement,
            GenerationType.ResumeTailoring
        ].includes(generationType);

        if (!isCareerType) {
            setCompany('');
        }
    }, [generationType]);

    const handleGenerate = useCallback(async (overrideOptions?: Partial<GenerationOptions>) => {
        const finalTopic = overrideOptions?.topic ?? topic;
        if (!finalTopic.trim()) return;

        setIsLoading(true);
        setError(null);
        setGenerationResult(null);

        const options: GenerationOptions = {
            type: generationType,
            topic: topic,
            pageCount,
            postLength,
            persona,
            tone,
            difficultyLevel,
            company,
            dayNumber,
            videoQuality,
            pdfExportQuality,
            imageBackgroundColor,
            imageStyle,
            logoImage,
            imageAspectRatio,
            textOverlay,
            ...overrideOptions,
        };
        // Ensure the topic used for the actual generation call is the final, effective topic
        options.topic = finalTopic;

        try {
            const result = await generateContent(options);
            setGenerationResult(result);
            const newHistoryItem: HistoryItem = {
                id: crypto.randomUUID(),
                timestamp: Date.now(),
                options,
                result,
            };
            setHistory(prev => [newHistoryItem, ...prev]);
        } catch (e: unknown) {
            if (e instanceof Error) {
                setError(e.message);
            } else {
                setError('An unknown error occurred.');
            }
        } finally {
            setIsLoading(false);
        }
    }, [
        generationType, topic, pageCount, postLength, persona, tone, difficultyLevel, 
        company, dayNumber, videoQuality, pdfExportQuality, imageBackgroundColor, imageStyle, logoImage, imageAspectRatio, textOverlay
    ]);
    
    const handleFollowUpAction = useCallback(async (newType: GenerationType) => {
        if (!topic.trim()) return;

        setGenerationType(newType); 
        window.scrollTo({ top: 0, behavior: 'smooth' });

        handleGenerate({ type: newType });
    }, [topic, handleGenerate]);

    const handleIdeaClick = useCallback((newTopic: string) => {
        const newType = GenerationType.ExamplePost;
        setTopic(newTopic);
        setGenerationType(newType);
        setActiveTab('controls');
        window.scrollTo({ top: 0, behavior: 'smooth' });

        handleGenerate({ topic: newTopic, type: newType });
    }, [handleGenerate]);

    const handleHumanify = useCallback(async () => {
        if (!generationResult?.text) return;

        setIsLoading(true);
        setError(null);
        
        try {
            const humanified = await humanifyText(generationResult.text, persona);
            setGenerationResult(prevResult => ({
                ...(prevResult as GenerationResult),
                text: humanified,
            }));
        } catch (e: unknown) {
            if (e instanceof Error) {
                setError(e.message);
            } else {
                setError('An unknown error occurred while humanifying the text.');
            }
        } finally {
            setIsLoading(false);
        }

    }, [generationResult, persona]);

     const handleLoadFromHistory = (item: HistoryItem) => {
        const defaultTextOverlay: TextOverlayOptions = {
            text: '', fontFamily: 'Inter', fontSize: 48, color: '#FFFFFF', placement: 'center'
        };

        setGenerationType(item.options.type);
        setTopic(item.options.topic);
        setPageCount(item.options.pageCount);
        setPostLength(item.options.postLength);
        setPersona(item.options.persona);
        setDifficultyLevel(item.options.difficultyLevel);
        setTone(item.options.tone || Tone.Formal);
        setCompany(item.options.company || '');
        setDayNumber(item.options.dayNumber || 1);
        setVideoQuality(item.options.videoQuality || VideoQuality.SD);
        setPdfExportQuality(item.options.pdfExportQuality || PdfExportQuality.Standard);
        setImageBackgroundColor(item.options.imageBackgroundColor || '');
        setImageStyle(item.options.imageStyle || ImageStyle.Abstract);
        setImageAspectRatio(item.options.imageAspectRatio || ImageAspectRatio.Square);
        setLogoImage(item.options.logoImage);
        setTextOverlay(item.options.textOverlay || defaultTextOverlay);
        setGenerationResult(item.result);
        setError(null);
        setActiveTab('controls');
    };

    const handleDeleteFromHistory = (id: string) => {
        setHistory(prev => prev.filter(item => item.id !== id));
    };

    const handleClearHistory = () => {
        if (window.confirm("Are you sure you want to delete all history? This action cannot be undone.")) {
            setHistory([]);
        }
    };
    
    return (
        <div className="min-h-screen bg-gray-900 text-white font-sans">
            <Header />
            <main className="pt-24 pb-8 container mx-auto px-4">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1">
                        <div className="flex mb-4 border-b border-gray-700">
                            <button
                                onClick={() => setActiveTab('controls')}
                                className={`px-4 py-2 text-sm font-semibold transition-colors duration-200 ${activeTab === 'controls' ? 'border-b-2 border-blue-500 text-white' : 'text-gray-400 hover:text-white'}`}
                            >
                                Controls
                            </button>
                             <button
                                onClick={() => setActiveTab('history')}
                                className={`px-4 py-2 text-sm font-semibold transition-colors duration-200 ${activeTab === 'history' ? 'border-b-2 border-blue-500 text-white' : 'text-gray-400 hover:text-white'}`}
                            >
                                History ({history.length})
                            </button>
                        </div>

                         {activeTab === 'controls' ? (
                            <Controls
                                generationType={generationType}
                                setGenerationType={setGenerationType}
                                topic={topic}
                                setTopic={setTopic}
                                pageCount={pageCount}
                                setPageCount={setPageCount}
                                postLength={postLength}
                                setPostLength={setPostLength}
                                persona={persona}
                                setPersona={setPersona}
                                tone={tone}
                                setTone={setTone}
                                difficultyLevel={difficultyLevel}
                                setDifficultyLevel={setDifficultyLevel}
                                company={company}
                                setCompany={setCompany}
                                dayNumber={dayNumber}
                                setDayNumber={setDayNumber}
                                onGenerate={() => handleGenerate()}
                                isLoading={isLoading}
                                videoQuality={videoQuality}
                                setVideoQuality={setVideoQuality}
                                pdfExportQuality={pdfExportQuality}
                                setPdfExportQuality={setPdfExportQuality}
                                imageBackgroundColor={imageBackgroundColor}
                                setImageBackgroundColor={setImageBackgroundColor}
                                imageStyle={imageStyle}
                                setImageStyle={setImageStyle}
                                logoImage={logoImage}
                                setLogoImage={setLogoImage}
                                imageAspectRatio={imageAspectRatio}
                                setImageAspectRatio={setImageAspectRatio}
                                textOverlay={textOverlay}
                                setTextOverlay={setTextOverlay}
                            />
                        ) : (
                            <HistoryPanel
                                history={history}
                                onLoad={handleLoadFromHistory}
                                onDelete={handleDeleteFromHistory}
                                onClear={handleClearHistory}
                            />
                        )}
                    </div>
                    <div className="lg:col-span-2 h-[calc(100vh-8rem)]">
                       <OutputDisplay
                            result={generationResult}
                            isLoading={isLoading}
                            error={error}
                            topic={topic}
                            onHumanify={handleHumanify}
                            onFollowUp={handleFollowUpAction}
                            generationType={generationType}
                            pdfExportQuality={pdfExportQuality}
                            textOverlay={textOverlay}
                            onIdeaClick={handleIdeaClick}
                        />
                    </div>
                </div>
            </main>
        </div>
    );
};

export default App;
