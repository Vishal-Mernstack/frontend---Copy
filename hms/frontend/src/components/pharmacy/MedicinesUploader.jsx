import { useState, useRef } from "react";
import { Upload, File, X, CheckCircle, AlertCircle, Save, Eye, EyeOff } from "lucide-react";
import { medicinesApi } from "../../services/medicinesApi";

export default function MedicinesUploader({ onSuccess }) {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [inserting, setInserting] = useState(false);
  const [result, setResult] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [insertResult, setInsertResult] = useState(null);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    processFiles(droppedFiles);
  };

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    processFiles(selectedFiles);
  };

  const processFiles = (newFiles) => {
    const validTypes = [".csv", ".xlsx", ".xls"];
    const validFiles = newFiles.filter((file) => {
      const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
      return validTypes.includes(ext);
    });
    setFiles((prev) => [...prev, ...validFiles]);
    setError(null);
    setResult(null);
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    
    setUploading(true);
    setError(null);
    setResult(null);
    setPreviewData(null);
    setInsertResult(null);

    try {
      const response = await medicinesApi.upload(files);
      const data = response.data.data;
      setResult(data);
      setPreviewData(data);
      setFiles([]);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleBulkInsert = async () => {
    if (!previewData?.extractedMedicines || previewData.extractedMedicines.length === 0) return;
    
    setInserting(true);
    setError(null);

    try {
      const response = await medicinesApi.bulkInsert(previewData.extractedMedicines);
      setInsertResult(response.data.data);
      setPreviewData(null);
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Insert failed");
    } finally {
      setInserting(false);
    }
  };

  return (
    <div className="p-4 border-2 border-dashed rounded-lg">
      <div
        className={`p-8 text-center cursor-pointer transition-colors ${
          isDragging
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-gray-400"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm text-gray-600">
          Drag and drop CSV or Excel files here
        </p>
        <p className="text-xs text-gray-500">or click to browse</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {files.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-medium mb-2">Selected files:</p>
          <ul className="space-y-2">
            {files.map((file, index) => (
              <li
                key={index}
                className="flex items-center justify-between p-2 bg-gray-50 rounded"
              >
                <div className="flex items-center gap-2">
                  <File className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">{file.name}</span>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>

          <button
            onClick={handleUpload}
            disabled={uploading || files.length === 0}
            className="mt-4 w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? "Uploading..." : `Upload ${files.length} file(s)`}
          </button>
        </div>
      )}

      {result && (
        <div className="mt-4 p-3 bg-green-50 text-green-700 rounded-lg flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          <span>{result.message}</span>
        </div>
      )}

      {previewData && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium">
              Extracted: {previewData.stats?.total || 0} medicines
              <span className="ml-2 text-xs text-gray-500">
                (Valid: {previewData.stats?.valid || 0}, 
                Duplicates: {previewData.stats?.duplicates || 0}, 
                Invalid: {previewData.stats?.invalid || 0})
              </span>
            </p>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showPreview ? "Hide" : "Show"} Preview
            </button>
          </div>
          
          {showPreview && previewData.extractedMedicines && previewData.extractedMedicines.length > 0 && (
            <div className="max-h-60 overflow-y-auto border rounded-lg mb-3">
              <table className="min-w-full text-xs">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-2 py-1 text-left">Name</th>
                    <th className="px-2 py-1 text-left">Manufacturer</th>
                    <th className="px-2 py-1 text-right">Price</th>
                    <th className="px-2 py-1 text-right">Stock</th>
                    <th className="px-2 py-1 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {previewData.extractedMedicines.slice(0, 50).map((med, idx) => (
                    <tr key={idx} className={med.errors?.length > 0 ? "bg-red-50" : med.isDuplicate ? "bg-yellow-50" : ""}>
                      <td className="px-2 py-1">{med.medicine_name}</td>
                      <td className="px-2 py-1">{med.manufacturer}</td>
                      <td className="px-2 py-1 text-right">${med.price}</td>
                      <td className="px-2 py-1 text-right">{med.stock}</td>
                      <td className="px-2 py-1 text-center">
                        {med.errors?.length > 0 ? (
                          <span className="text-red-500 text-xs">Invalid</span>
                        ) : med.isDuplicate ? (
                          <span className="text-yellow-600 text-xs">Update</span>
                        ) : (
                          <span className="text-green-600 text-xs">New</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {previewData.extractedMedicines.length > 50 && (
                <p className="text-xs text-gray-500 p-2 text-center">
                  Showing 50 of {previewData.extractedMedicines.length} medicines
                </p>
              )}
            </div>
          )}
          
          <button
            onClick={handleBulkInsert}
            disabled={inserting || !previewData?.stats?.valid}
            className="w-full py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Save className="h-4 w-4" />
            {inserting ? "Inserting..." : `Insert ${previewData.stats?.valid || 0} Medicines`}
          </button>
        </div>
      )}

      {insertResult && (
        <div className="mt-4 p-3 bg-green-50 text-green-700 rounded-lg flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          <span>
            Added {insertResult.added} new, updated {insertResult.updated} existing, {insertResult.failed} failed
          </span>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
