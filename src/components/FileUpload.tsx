import React, { useCallback, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  isLoading?: boolean;
  error?: string | null;
}

const ACCEPTED_TYPES = [
  'text/csv',
  'application/json',
  'text/tab-separated-values',
];

const ACCEPTED_EXTENSIONS = ['.csv', '.json', '.tsv'];

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, isLoading = false, error = null }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const validateFile = (file: File): boolean => {
    const extension = '.' + (file.name.split('.').pop() || '').toLowerCase();
    const extOk = ACCEPTED_EXTENSIONS.includes(extension);
    const typeOk = ACCEPTED_TYPES.includes(file.type);
    return extOk || typeOk;
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
        Promise.resolve().then(() => onFileSelect(file));
      }
    }
  }, [onFileSelect]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
        Promise.resolve().then(() => onFileSelect(file));
      }
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        {!selectedFile ? (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={cn(
              "relative border-2 border-dashed rounded-xl p-8 transition-all duration-300",
              isDragging
                ? "border-primary bg-primary/5 scale-[1.02]"
                : "border-border hover:border-primary/50 hover:bg-muted/30"
            )}
          >
            <input
              ref={inputRef}
              id="file-input-hidden"
              type="file"
              accept=".csv,.json,.tsv"
              onChange={handleFileInput}
              className="hidden"
              disabled={isLoading}
            />

            <div className="flex flex-col items-center justify-center gap-4 text-center">
              <motion.div
                animate={{ y: isDragging ? -5 : 0 }}
                className={cn(
                  "p-4 rounded-full transition-colors",
                  isDragging ? "bg-primary/20" : "bg-muted"
                )}
              >
                <Upload className={cn(
                  "h-8 w-8 transition-colors",
                  isDragging ? "text-primary" : "text-muted-foreground"
                )} />
              </motion.div>

              <div>
                <p className="text-lg font-medium">
                  {isDragging ? "Drop your file here" : "Drag & drop your file"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">or choose a file</p>
              </div>

              <div className="mt-2">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => inputRef.current?.click()}
                  className="px-4 py-2 rounded-md bg-primary text-white hover:bg-primary/90 disabled:opacity-50"
                >
                  Choose File
                </button>
              </div>

              <div className="flex flex-wrap gap-2 justify-center mt-2">
                {['CSV', 'JSON', 'TSV'].map((type) => (
                  <span
                    key={type}
                    className="px-2 py-1 text-xs font-medium bg-muted rounded-md text-muted-foreground"
                  >
                    {type}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="file-preview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="border border-border rounded-xl p-4 bg-card"
          >
            <div className="flex items-center gap-4">
              <div className={cn(
                "p-3 rounded-lg",
                isLoading ? "bg-primary/20" : error ? "bg-destructive/20" : "bg-success/20"
              )}>
                {isLoading ? (
                  <Loader2 className="h-6 w-6 text-primary animate-spin" />
                ) : error ? (
                  <AlertCircle className="h-6 w-6 text-destructive" />
                ) : (
                  <CheckCircle2 className="h-6 w-6 text-success" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{selectedFile?.name}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedFile ? formatFileSize(selectedFile.size) : ''}
                  {isLoading && ' • Analyzing...'}
                </p>
              </div>

              {!isLoading && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={clearFile}
                  className="shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg"
              >
                <p className="text-sm text-destructive">{error}</p>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FileUpload;