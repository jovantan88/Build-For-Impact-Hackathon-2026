"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Camera, Image as ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function UploadPage() {
    const router = useRouter();
    const [image, setImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [dragActive, setDragActive] = useState(false);

    const handleFile = useCallback((file: File) => {
        if (!file.type.startsWith("image/")) {
            toast.error("Please upload an image file");
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            setImage(e.target?.result as string);
        };
        reader.readAsDataURL(file);
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setDragActive(false);
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file);
        },
        [handleFile],
    );

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragActive(true);
    }, []);

    const handleDragLeave = useCallback(() => {
        setDragActive(false);
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
    };

    const handleUpload = async () => {
        if (!image) {
            toast.error("Please select an image first");
            return;
        }

        setLoading(true);

        try {
            const res = await fetch("/api/receipts/parse", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ image }),
            });

            const data = await res.json();

            if (!res.ok) {
                toast.error(data.error || "Failed to parse receipt");
                return;
            }

            // Store parsed data in sessionStorage for the review page
            sessionStorage.setItem("parsedReceipt", JSON.stringify(data));
            toast.success("Receipt parsed successfully!");
            router.push("/review");
        } catch {
            toast.error("Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Upload Receipt</h1>
                <p className="text-muted-foreground">Take a photo or upload your grocery receipt</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Receipt Photo</CardTitle>
                    <CardDescription>Our AI will extract ingredients from your receipt</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {!image ? (
                        <div
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                                dragActive ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                            }`}
                        >
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                                    <Upload className="w-8 h-8 text-primary" />
                                </div>
                                <div>
                                    <p className="font-medium">Drag and drop your receipt here</p>
                                    <p className="text-sm text-muted-foreground">or click to browse</p>
                                </div>
                                <div className="flex gap-3">
                                    <label>
                                        <input type="file" accept="image/*" onChange={handleInputChange} className="hidden" />
                                        <Button variant="outline" asChild>
                                            <span>
                                                <ImageIcon className="w-4 h-4 mr-2" />
                                                Browse Files
                                            </span>
                                        </Button>
                                    </label>
                                    <label>
                                        <input type="file" accept="image/*" capture="environment" onChange={handleInputChange} className="hidden" />
                                        <Button variant="outline" asChild>
                                            <span>
                                                <Camera className="w-4 h-4 mr-2" />
                                                Take Photo
                                            </span>
                                        </Button>
                                    </label>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="relative rounded-xl overflow-hidden border">
                                <img src={image} alt="Receipt preview" className="w-full max-h-96 object-contain bg-muted" />
                            </div>
                            <div className="flex gap-3">
                                <Button variant="outline" onClick={() => setImage(null)} disabled={loading}>
                                    Choose Different Image
                                </Button>
                                <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={handleUpload} disabled={loading}>
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Analyzing Receipt...
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="w-4 h-4 mr-2" />
                                            Extract Ingredients
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="bg-primary/5 border-primary/30">
                <CardContent className="pt-6">
                    <h3 className="font-medium text-primary mb-2">Tips for best results:</h3>
                    <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Make sure the receipt is flat and well-lit</li>
                        <li>• Include all items in the frame</li>
                        <li>• Avoid shadows and glare</li>
                        <li>• Text should be clearly readable</li>
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
}
