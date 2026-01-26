import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import {
    Languages,
    Calendar,
    FileX,
    BookOpen,
    ArrowRight,
    Trash2,
    Edit
} from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/lib/utils";

const languageColors: Record<string, string> = {
    english: "bg-blue-100 text-blue-800",
    spanish: "bg-orange-100 text-orange-800",
    french: "bg-purple-100 text-purple-800",
    german: "bg-green-100 text-green-800",
    chinese: "bg-red-100 text-red-800",
    japanese: "bg-pink-100 text-pink-800"
};

interface Document {
    id: string;
    title: string;
    created_date: string | Date;
    language: string;
    subject?: string;
    page_count?: number;
    pages?: number;
    summary?: string;
    content?: string;
    status?: string;
}

interface DocumentGridProps {
    documents: Document[];
    isLoading: boolean;
    onDocumentDelete?: (id: string) => void;
    onDocumentRename?: (id: string, newTitle: string) => void;
}

export default function DocumentGrid({ documents, isLoading, onDocumentDelete, onDocumentRename }: DocumentGridProps) {
    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array(6).fill(0).map((_, i) => (
                    <Card key={i} className="bg-white/80 backdrop-blur-sm">
                        <CardHeader>
                            <Skeleton className="h-6 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-2/3" />
                                <div className="flex gap-2 mt-4">
                                    <Skeleton className="h-8 w-16" />
                                    <Skeleton className="h-8 w-20" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    if (documents.length === 0) {
        return (
            <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-0">
                <CardContent className="p-12 text-center">
                    <FileX className="w-16 h-16 mx-auto mb-4 text-slate-400" />
                    <h3 className="text-xl font-semibold text-slate-800 mb-2">No documents found</h3>
                    <p className="text-slate-600 mb-6">Upload your first PDF document to get started with AI-powered studying.</p>
                </CardContent>
            </Card>
        );
    }

    const handleEditClick = (doc: Document) => {
        if (!onDocumentRename) return;
        const newTitle = prompt("Enter new document name:", doc.title);
        if (newTitle && newTitle.trim() !== "" && newTitle !== doc.title) {
            onDocumentRename(doc.id, newTitle.trim());
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {documents.map((doc) => (
                <Card key={doc.id} className="bg-white/80 backdrop-blur-sm shadow-xl border-0 hover:shadow-2xl transition-all duration-300 group flex flex-col relative">
                    <CardHeader className="pb-3 pr-12">
                        <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                                <CardTitle className="text-lg font-semibold text-slate-800 truncate group-hover:text-blue-700 transition-colors" title={doc.title}>
                                    {doc.title}
                                </CardTitle>
                                <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                                    <Calendar className="w-3 h-3" />
                                    {format(new Date(doc.created_date), "MMM d, yyyy")}
                                </div>
                            </div>
                        </div>
                        {/* Action Buttons */}
                        <div className="absolute top-4 right-4 flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity bg-white/90 rounded-lg p-1 shadow-sm border border-slate-100">
                            {onDocumentRename && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                                    onClick={(e) => { e.preventDefault(); handleEditClick(doc); }}
                                    title="Rename"
                                >
                                    <Edit className="w-4 h-4" />
                                </Button>
                            )}
                            {onDocumentDelete && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-slate-500 hover:text-red-600 hover:bg-red-50"
                                    onClick={(e) => { e.preventDefault(); onDocumentDelete(doc.id); }}
                                    title="Delete"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            )}
                        </div>
                    </CardHeader>

                    <CardContent className="space-y-4 flex-grow">
                        <div className="flex flex-wrap gap-2">
                            <Badge className={languageColors[doc.language.toLowerCase()] || "bg-gray-100 text-gray-800"}>
                                <Languages className="w-3 h-3 mr-1" />
                                {doc.language}
                            </Badge>

                            {doc.subject && (
                                <Badge variant="outline">
                                    <BookOpen className="w-3 h-3 mr-1" />
                                    {doc.subject}
                                </Badge>
                            )}

                            {(doc.pages || doc.page_count) && (
                                <Badge variant="outline">
                                    {doc.pages || doc.page_count} pages
                                </Badge>
                            )}
                        </div>

                        <p className="text-sm text-slate-600 line-clamp-3 flex-grow">
                            {doc.summary || (doc.content ? doc.content.substring(0, 120) + '...' : 'No summary available.')}
                        </p>
                    </CardContent>

                    <div className="p-4 pt-0">
                        <Link to={createPageUrl("Study") + `?doc=${doc.id}`} className="w-full">
                            <Button size="sm" className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 group/button">
                                Open & Study
                                <ArrowRight className="w-4 h-4 ml-2 group-hover/button:translate-x-1 transition-transform" />
                            </Button>
                        </Link>
                    </div>
                </Card>
            ))}
        </div>
    );
}
