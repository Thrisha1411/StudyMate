import React from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Upload, FileText, Sparkles, Languages } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface UploadZoneProps {
    onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
    dragActive: boolean;
    onDrag: (event: React.DragEvent<HTMLDivElement>) => void;
    onDrop: (event: React.DragEvent<HTMLDivElement>) => void;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    selectedLanguage?: string;
    onLanguageChange?: (value: string) => void;
}

export default function UploadZone({
    onFileSelect,
    dragActive,
    onDrag,
    onDrop,
    fileInputRef,
    selectedLanguage = "english",
    onLanguageChange
}: UploadZoneProps) {
    return (
        <Card className={`bg-white/80 backdrop-blur-sm shadow-xl border-2 border-dashed transition-all duration-300 ${dragActive ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-blue-300'
            }`}>
            <CardContent
                className="p-12"
                onDragEnter={onDrag}
                onDragLeave={onDrag}
                onDragOver={onDrag}
                onDrop={onDrop}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    onChange={onFileSelect}
                    className="hidden"
                />

                <div className="text-center space-y-6">
                    <div className="mx-auto w-24 h-24 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full flex items-center justify-center">
                        <Upload className="w-12 h-12 text-blue-600" />
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-2xl font-bold text-slate-800">Upload Your Study Materials</h3>
                        <p className="text-slate-600 max-w-md mx-auto">
                            Drag and drop PDF files or images here, or click browse to select files. Our AI will automatically extract, analyze, and summarize the content.
                        </p>
                    </div>

                    <div className="flex flex-col items-center gap-4">
                        <div className="flex flex-wrap justify-center gap-4">
                            <Button
                                onClick={() => fileInputRef.current?.click()}
                                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                                size="lg"
                            >
                                <FileText className="w-5 h-5 mr-2" />
                                Browse Files
                            </Button>
                        </div>

                        {/* Language Selection */}
                        <div className="flex items-center gap-3">
                            <Languages className="w-5 h-5 text-slate-500" />
                            <div className="w-40">
                                <Select value={selectedLanguage} onValueChange={onLanguageChange}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Language" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="english">English</SelectItem>
                                        <SelectItem value="spanish">Spanish</SelectItem>
                                        <SelectItem value="french">French</SelectItem>
                                        <SelectItem value="german">German</SelectItem>
                                        <SelectItem value="italian">Italian</SelectItem>
                                        <SelectItem value="portuguese">Portuguese</SelectItem>
                                        <SelectItem value="chinese">Chinese</SelectItem>
                                        <SelectItem value="japanese">Japanese</SelectItem>
                                        <SelectItem value="korean">Korean</SelectItem>
                                        <SelectItem value="arabic">Arabic</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                        <Sparkles className="w-4 h-4" />
                        <span>AI-powered content extraction, analysis & auto-summarization</span>
                    </div>

                    <div className="text-xs text-slate-400">
                        Supported formats: PDF, JPG, PNG, WEBP • Max size: 10MB per file
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
