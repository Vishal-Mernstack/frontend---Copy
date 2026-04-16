import { useCallback, useState } from "react";
import { Upload, X, FileText, Image, File } from "lucide-react";
import { Button } from "../ui/button";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const DEFAULT_ALLOWED_TYPES = [
  "image/*",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

export default function FileDropZone({
  onFilesSelected,
  multiple = true,
  className = "",
  allowedTypes = DEFAULT_ALLOWED_TYPES,
  description = "Supports: PDF, Images, Word, Text (Max 10MB each)",
  title = "Drop medical files here, or click to browse",
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [errors, setErrors] = useState([]);

  const validateFile = (file) => {
    if (file.size > MAX_FILE_SIZE) {
      return `File "${file.name}" exceeds 10MB limit`;
    }
    return null;
  };

  const processFiles = useCallback((files) => {
    const fileArray = Array.from(files);
    const newErrors = [];
    const validFiles = [];

    fileArray.forEach((file) => {
      const error = validateFile(file);
      if (error) {
        newErrors.push(error);
      } else {
        validFiles.push({
          id: Math.random().toString(36).substring(7),
          file,
          name: file.name,
          size: file.size,
          type: file.type,
          preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
        });
      }
    });

    setErrors(newErrors);

    if (validFiles.length > 0) {
      const updatedFiles = multiple ? [...selectedFiles, ...validFiles] : validFiles;
      setSelectedFiles(updatedFiles);
      onFilesSelected?.(updatedFiles.map((f) => f.file));
    }
  }, [multiple, onFilesSelected, selectedFiles]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    processFiles(e.dataTransfer.files);
  }, [processFiles]);

  const handleFileInput = useCallback((e) => {
    processFiles(e.target.files);
  }, [processFiles]);

  const removeFile = useCallback((id) => {
    const updated = selectedFiles.filter((f) => f.id !== id);
    setSelectedFiles(updated);
    onFilesSelected?.(updated.map((f) => f.file));
  }, [onFilesSelected, selectedFiles]);

  const getFileIcon = (type) => {
    if (type.startsWith("image/")) return <Image className="h-5 w-5 text-sky-500" />;
    if (type.includes("pdf")) return <FileText className="h-5 w-5 text-red-500" />;
    return <File className="h-5 w-5 text-slate-500" />;
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative rounded-lg border-2 border-dashed p-8 text-center transition-colors
          ${isDragOver 
            ? "border-sky-500 bg-sky-50" 
            : "border-slate-300 hover:border-slate-400 bg-white"
          }
        `}
      >
        <input
          type="file"
          multiple={multiple}
          accept={allowedTypes.join(",")}
          onChange={handleFileInput}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
          <div className="flex flex-col items-center gap-2">
            <div className="rounded-full bg-sky-100 p-3">
              <Upload className="h-6 w-6 text-sky-600" />
            </div>
            <p className="text-sm font-medium text-slate-700">
              {title}
            </p>
            <p className="text-xs text-slate-500">
              {description}
            </p>
          </div>
        </div>

      {errors.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          {errors.map((error, i) => (
            <p key={i} className="text-sm text-red-600">{error}</p>
          ))}
        </div>
      )}

      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">
            Selected Files ({selectedFiles.length}):
          </p>
          <div className="max-h-60 overflow-y-auto space-y-2">
            {selectedFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-3 rounded-lg border bg-white p-3"
              >
                {file.preview ? (
                  <img
                    src={file.preview}
                    alt={file.name}
                    className="h-10 w-10 rounded object-cover"
                  />
                ) : (
                  getFileIcon(file.type)
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-slate-500">{formatSize(file.size)}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(file.id)}
                  className="h-8 w-8 p-0 text-slate-500 hover:text-red-500"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
