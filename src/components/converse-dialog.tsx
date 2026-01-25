"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, MicOff, Loader2, ChefHat, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { MODEL_KEYS } from "@/lib/ai/models";

interface Recipe {
    id: string;
    title: string;
    cuisineStyle: string[];
    ingredients: { name: string; quantity?: number; unit?: string; available: boolean }[];
    missingIngredients: { name: string; quantity?: number; unit?: string }[];
    instructions: string[];
    cookTime?: string;
    servings?: number;
    imageUrl?: string;
}

interface SearchResult {
    title: string;
    url: string;
    text: string;
}

interface ConverseDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    useSeaLion: boolean;
    onRecipesGenerated: (recipes: Recipe[], searchResults: SearchResult[], modelUsed: string) => void;
}

export function ConverseDialog({ open, onOpenChange, useSeaLion, onRecipesGenerated }: ConverseDialogProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [transcript, setTranscript] = useState("");
    const [audioLevel, setAudioLevel] = useState(0);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [audioDuration, setAudioDuration] = useState<number>(0);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const recordingStartTimeRef = useRef<number>(0);

    useEffect(() => {
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
                mediaRecorderRef.current.stop();
            }
        };
    }, []);

    useEffect(() => {
        if (!open) {
            setTranscript("");
            setIsRecording(false);
            setIsTranscribing(false);
            setIsGenerating(false);
            setAudioLevel(0);
            if (audioUrl) {
                URL.revokeObjectURL(audioUrl);
                setAudioUrl(null);
            }
            setAudioDuration(0);
        }
    }, [open, audioUrl]);

    const updateAudioLevel = useCallback(() => {
        if (!analyserRef.current) return;

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);

        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setAudioLevel(average / 255);

        if (isRecording) {
            animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
        }
    }, [isRecording]);

    const startRecording = async () => {
        try {
            if (audioUrl) {
                URL.revokeObjectURL(audioUrl);
                setAudioUrl(null);
            }
            setAudioDuration(0);

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 16000,
                }
            });

            const audioContext = new AudioContext();
            const source = audioContext.createMediaStreamSource(stream);
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
            analyserRef.current = analyser;

            const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
                ? "audio/webm;codecs=opus"
                : MediaRecorder.isTypeSupported("audio/webm")
                    ? "audio/webm"
                    : "audio/mp4";

            console.log("Using mime type:", mimeType);

            const mediaRecorder = new MediaRecorder(stream, { mimeType });

            audioChunksRef.current = [];
            recordingStartTimeRef.current = Date.now();

            mediaRecorder.ondataavailable = (event) => {
                console.log("Audio chunk received:", event.data.size, "bytes");
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const duration = (Date.now() - recordingStartTimeRef.current) / 1000;
                setAudioDuration(duration);
                console.log("Recording stopped. Duration:", duration, "seconds");
                console.log("Total chunks:", audioChunksRef.current.length);

                stream.getTracks().forEach((track) => track.stop());
                audioContext.close();

                if (animationFrameRef.current) {
                    cancelAnimationFrame(animationFrameRef.current);
                }
                setAudioLevel(0);

                if (audioChunksRef.current.length > 0) {
                    const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
                    console.log("Audio blob size:", audioBlob.size, "bytes");
                    const url = URL.createObjectURL(audioBlob);
                    setAudioUrl(url);

                    await transcribeAudio();
                }
            };

            mediaRecorderRef.current = mediaRecorder;
            mediaRecorder.start(250); 
            setIsRecording(true);

            animationFrameRef.current = requestAnimationFrame(updateAudioLevel);

            toast.success("Recording started - speak clearly");
        } catch (error) {
            console.error("Failed to start recording:", error);
            toast.error("Failed to access microphone. Please allow microphone access.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const transcribeAudio = async () => {
        if (audioChunksRef.current.length === 0) {
            console.log("No audio chunks to transcribe");
            return;
        }

        setIsTranscribing(true);

        try {
            const mimeType = mediaRecorderRef.current?.mimeType || "audio/webm";
            const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

            console.log("Sending audio for transcription:");
            console.log("  - Mime type:", mimeType);
            console.log("  - Blob size:", audioBlob.size, "bytes");
            console.log("  - Chunks count:", audioChunksRef.current.length);

            const extension = mimeType.includes("webm") ? "webm" : "mp4";

            const formData = new FormData();
            formData.append("audio", audioBlob, `recording.${extension}`);

            const response = await fetch("/api/transcribe", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Transcription API error:", errorText);
                throw new Error("Transcription failed");
            }

            const data = await response.json();
            console.log("Transcription result:", data);
            setTranscript(data.transcript || "");

            if (!data.transcript || data.transcript.trim() === "") {
                toast.error("Could not transcribe audio. Please try speaking louder or clearer.");
            } else {
                toast.success("Transcription complete!");
            }
        } catch (error) {
            console.error("Transcription error:", error);
            toast.error("Failed to transcribe audio");
        } finally {
            setIsTranscribing(false);
        }
    };

    const generateRecipes = async () => {
        if (!transcript.trim()) {
            toast.error("Please record a voice message first");
            return;
        }

        setIsGenerating(true);

        try {
            const model = useSeaLion ? MODEL_KEYS.SEA_LION : MODEL_KEYS.GPT;

            const response = await fetch("/api/recipes/converse", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ transcript, model }),
            });

            if (!response.ok || !response.body) {
                throw new Error("Failed to generate recipes");
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            let buffer = "";
            let finalRecipes: Recipe[] = [];
            let finalSearchResults: SearchResult[] = [];
            let modelUsed = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n\n");
                buffer = lines.pop() || "";

                for (const line of lines) {
                    if (!line.trim()) continue;

                    const eventMatch = line.match(/event: (\w+)/);
                    const dataMatch = line.match(/data: ([\s\S]+)/);

                    if (!eventMatch || !dataMatch) continue;

                    const eventType = eventMatch[1];
                    const data = dataMatch[1];

                    switch (eventType) {
                        case "search_results":
                            try {
                                finalSearchResults = JSON.parse(data);
                            } catch {}
                            break;

                        case "chunk":
                            break;

                        case "complete":
                            try {
                                const result = JSON.parse(data);
                                finalRecipes = result.recipes || [];
                                modelUsed = result.modelUsed || "";
                                finalSearchResults = result.searchResults || finalSearchResults;
                            } catch {}
                            break;

                        case "error":
                            throw new Error("Recipe generation failed");
                    }
                }
            }

            if (finalRecipes.length > 0) {
                toast.success(`Generated ${finalRecipes.length} recipes from your request!`);
                onRecipesGenerated(finalRecipes, finalSearchResults, modelUsed);
                onOpenChange(false);
            } else {
                toast.error("No recipes could be generated. Please try again.");
            }
        } catch (error) {
            console.error("Recipe generation error:", error);
            toast.error("Failed to generate recipes");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Volume2 className="w-5 h-5 text-primary" />
                        Voice Recipe Request
                    </DialogTitle>
                    <DialogDescription>
                        Speak to describe what kind of dish you want to cook. Mention ingredients, cuisines, or dietary preferences.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="flex flex-col items-center gap-4">
                        <button
                            onClick={isRecording ? stopRecording : startRecording}
                            disabled={isTranscribing || isGenerating}
                            className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all ${
                                isRecording
                                    ? "bg-red-500 hover:bg-red-600 animate-pulse"
                                    : "bg-primary hover:bg-primary/90"
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            {isRecording ? (
                                <MicOff className="w-10 h-10 text-white" />
                            ) : (
                                <Mic className="w-10 h-10 text-white" />
                            )}

                            {isRecording && (
                                <div
                                    className="absolute inset-0 rounded-full border-4 border-red-300 animate-ping"
                                    style={{
                                        transform: `scale(${1 + audioLevel * 0.5})`,
                                        opacity: 0.5 + audioLevel * 0.5,
                                    }}
                                />
                            )}
                        </button>

                        <p className="text-sm text-muted-foreground">
                            {isRecording
                                ? "Recording... Tap to stop"
                                : isTranscribing
                                ? "Transcribing..."
                                : "Tap to start recording"}
                        </p>
                    </div>

                    {/* Transcribing Indicator */}
                    {isTranscribing && (
                        <div className="flex items-center justify-center gap-2 text-muted-foreground">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-sm">Processing your speech...</span>
                        </div>
                    )}

                    {/* {audioUrl && (
                        <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
                            <CardContent className="p-4">
                                <p className="text-sm font-medium mb-2 text-blue-700 dark:text-blue-300">
                                    Recorded Audio ({audioDuration.toFixed(1)}s)
                                </p>
                                <audio controls src={audioUrl} className="w-full h-10" />
                                <p className="text-xs text-muted-foreground mt-2">
                                    Play this to verify the recording quality
                                </p>
                            </CardContent>
                        </Card>
                    )} */}

                    {transcript && (
                        <Card className="bg-muted/50">
                            <CardContent className="p-4">
                                <p className="text-sm font-medium mb-1">Your request:</p>
                                <p className="text-sm text-foreground">&ldquo;{transcript}&rdquo;</p>
                            </CardContent>
                        </Card>
                    )}

                    {isGenerating && (
                        <Card className="bg-muted/50">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-center gap-2">
                                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                                    <span className="text-sm font-medium">Generating recipes...</span>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
                        Cancel
                    </Button>
                    <Button
                        onClick={generateRecipes}
                        disabled={!transcript.trim() || isRecording || isTranscribing || isGenerating}
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <ChefHat className="w-4 h-4 mr-2" />
                                Generate Recipes
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
