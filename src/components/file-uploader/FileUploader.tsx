'use client'

import { useState, useRef, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAppStore } from '@/lib/stores/app-store'
import { useAGUIProtocol } from '@/lib/ag-ui-protocol-v2'
import { backendApi } from '@/lib/api/backend-client'
import { cn } from '@/lib/utils'
import {
  Upload,
  File,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FileCode,
  FileSpreadsheet,
  Archive,
  X,
  Download,
  Eye,
  Trash2,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  Folder,
  Link,
  Share
} from 'lucide-react'

export interface UploadedFile {
  id: string
  file: File
  name: string
  size: number
  type: string
  category: FileCategory
  url?: string
  uploadProgress: number
  status: 'pending' | 'uploading' | 'completed' | 'failed' | 'processing'
  error?: string
  metadata?: {
    lastModified: number
    encoding?: string
    virus_scan?: 'clean' | 'infected' | 'scanning'
    thumbnailUrl?: string
    duration?: number // for video/audio files
    pages?: number // for PDF files
  }
  tags?: string[]
  description?: string
}

export type FileCategory = 
  | 'document' 
  | 'image' 
  | 'video' 
  | 'audio' 
  | 'code' 
  | 'spreadsheet' 
  | 'archive' 
  | 'other'

export interface FileUploaderProps {
  title?: string
  description?: string
  accept?: string
  maxFiles?: number
  maxSize?: number // bytes
  allowedTypes?: string[]
  allowedCategories?: FileCategory[]
  autoUpload?: boolean
  multiple?: boolean
  enableVirusScanning?: boolean
  enableMetadataExtraction?: boolean
  enableThumbnails?: boolean
  showFileList?: boolean
  className?: string
  onUpload?: (files: UploadedFile[]) => Promise<void>
  onRemove?: (fileId: string) => void
  onPreview?: (file: UploadedFile) => void
  onShare?: (file: UploadedFile) => void
  children?: React.ReactNode
}

// File type to category mapping
const FILE_TYPE_CATEGORIES: Record<string, FileCategory> = {
  'application/pdf': 'document',
  'application/msword': 'document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'document',
  'text/plain': 'document',
  'text/csv': 'spreadsheet',
  'application/vnd.ms-excel': 'spreadsheet',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'spreadsheet',
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/gif': 'image',
  'image/webp': 'image',
  'image/svg+xml': 'image',
  'video/mp4': 'video',
  'video/avi': 'video',
  'video/quicktime': 'video',
  'video/webm': 'video',
  'audio/mp3': 'audio',
  'audio/wav': 'audio',
  'audio/ogg': 'audio',
  'audio/mpeg': 'audio',
  'text/javascript': 'code',
  'text/typescript': 'code',
  'text/html': 'code',
  'text/css': 'code',
  'application/json': 'code',
  'application/xml': 'code',
  'application/zip': 'archive',
  'application/x-rar-compressed': 'archive',
  'application/x-7z-compressed': 'archive'
}

// File category icons
const CATEGORY_ICONS = {
  document: FileText,
  image: FileImage,
  video: FileVideo,
  audio: FileAudio,
  code: FileCode,
  spreadsheet: FileSpreadsheet,
  archive: Archive,
  other: File
}

// File category colors
const CATEGORY_COLORS = {
  document: 'text-blue-500',
  image: 'text-green-500',
  video: 'text-purple-500',
  audio: 'text-yellow-500',
  code: 'text-orange-500',
  spreadsheet: 'text-emerald-500',
  archive: 'text-gray-500',
  other: 'text-muted-foreground'
}

export function FileUploader({
  title = "File Upload",
  description = "Drag & drop files or click to browse",
  accept = "*/*",
  maxFiles = 20,
  maxSize = 50 * 1024 * 1024, // 50MB
  allowedTypes = [],
  allowedCategories = [],
  autoUpload = true,
  multiple = true,
  enableVirusScanning = true,
  enableMetadataExtraction = true,
  enableThumbnails = true,
  showFileList = true,
  className,
  onUpload,
  onRemove,
  onPreview,
  onShare,
  children
}: FileUploaderProps) {
  const { uploadQueue, updateUploadQueue } = useAppStore()
  const { publishEvent } = useAGUIProtocol()
  
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [filterCategory, setFilterCategory] = useState<FileCategory | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  // Determine file category
  const getFileCategory = useCallback((type: string): FileCategory => {
    return FILE_TYPE_CATEGORIES[type] || 'other'
  }, [])

  // Handle file selection
  const handleFileSelect = useCallback((fileList: FileList | File[]) => {
    const fileArray = Array.from(fileList)
    
    // Validate files
    const validFiles = fileArray.filter(file => {
      // Check allowed types
      if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
        console.warn(`File ${file.name} has invalid type: ${file.type}`)
        return false
      }
      
      // Check allowed categories
      const category = getFileCategory(file.type)
      if (allowedCategories.length > 0 && !allowedCategories.includes(category)) {
        console.warn(`File ${file.name} has invalid category: ${category}`)
        return false
      }
      
      // Check file size
      if (file.size > maxSize) {
        console.warn(`File ${file.name} is too large: ${file.size} bytes`)
        return false
      }
      
      return true
    })
    
    // Check max files limit
    if (files.length + validFiles.length > maxFiles) {
      console.warn(`Cannot upload ${validFiles.length} files. Maximum ${maxFiles} files allowed.`)
      validFiles.splice(maxFiles - files.length)
    }
    
    // Process files
    processFiles(validFiles)
  }, [files.length, maxFiles, maxSize, allowedTypes, allowedCategories, getFileCategory])

  // Process selected files
  const processFiles = useCallback(async (fileList: File[]) => {
    const newFiles: UploadedFile[] = []
    
    for (const file of fileList) {
      const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const category = getFileCategory(file.type)
      
      const uploadedFile: UploadedFile = {
        id: fileId,
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        category,
        uploadProgress: 0,
        status: 'pending',
        metadata: {
          lastModified: file.lastModified,
          virus_scan: enableVirusScanning ? 'scanning' : 'clean'
        }
      }
      
      newFiles.push(uploadedFile)
      
      // Add to upload queue
      const queueItem = {
        id: fileId,
        file,
        type: 'file' as const,
        status: 'pending' as const,
        progress: 0,
        metadata: {
          originalName: file.name,
          size: file.size,
          type: file.type,
          category
        }
      }
      
      updateUploadQueue([...uploadQueue, queueItem])
      
      publishEvent('upload.started', {
        uploadId: fileId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        category
      })
    }
    
    setFiles(prev => [...prev, ...newFiles])
    
    if (autoUpload) {
      uploadFiles(newFiles)
    }
  }, [uploadQueue, updateUploadQueue, publishEvent, autoUpload, getFileCategory, enableVirusScanning])

  // Upload files
  const uploadFiles = useCallback(async (filesToUpload: UploadedFile[]) => {
    setUploading(true)
    
    for (const file of filesToUpload) {
      try {
        // Update status to uploading
        setFiles(prev => prev.map(f => 
          f.id === file.id 
            ? { ...f, status: 'uploading' as const }
            : f
        ))
        
        // Simulate virus scanning
        if (enableVirusScanning) {
          await new Promise(resolve => setTimeout(resolve, 1000))
          
          setFiles(prev => prev.map(f => 
            f.id === file.id 
              ? { 
                  ...f, 
                  metadata: { 
                    ...f.metadata, 
                    virus_scan: Math.random() > 0.95 ? 'infected' : 'clean' 
                  }
                }
              : f
          ))
          
          // If infected, mark as failed
          const updatedFile = files.find(f => f.id === file.id)
          if (updatedFile?.metadata?.virus_scan === 'infected') {
            setFiles(prev => prev.map(f => 
              f.id === file.id 
                ? { ...f, status: 'failed' as const, error: 'Virus detected' }
                : f
            ))
            continue
          }
        }
        
        // Simulate upload progress
        for (let progress = 0; progress <= 100; progress += 10) {
          await new Promise(resolve => setTimeout(resolve, 100))
          
          setFiles(prev => prev.map(f => 
            f.id === file.id 
              ? { ...f, uploadProgress: progress }
              : f
          ))
          
          updateUploadQueue(
            uploadQueue.map(item => 
              item.id === file.id 
                ? { ...item, progress, status: progress === 100 ? 'completed' : 'uploading' }
                : item
            )
          )
        }
        
        // Simulate API upload
        const uploadResponse = await simulateUpload(file.file)
        
        // Extract metadata if enabled
        let metadata = file.metadata
        if (enableMetadataExtraction) {
          metadata = {
            ...metadata,
            ...await extractMetadata(file.file)
          }
        }
        
        setFiles(prev => prev.map(f => 
          f.id === file.id 
            ? { 
                ...f, 
                status: 'completed' as const,
                uploadProgress: 100,
                url: uploadResponse.url,
                metadata
              }
            : f
        ))
        
        publishEvent('upload.completed', {
          uploadId: file.id,
          fileName: file.name,
          fileUrl: uploadResponse.url,
          category: file.category
        })
        
      } catch (error) {
        setFiles(prev => prev.map(f => 
          f.id === file.id 
            ? { 
                ...f, 
                status: 'failed' as const,
                error: error instanceof Error ? error.message : 'Upload failed'
              }
            : f
        ))
        
        updateUploadQueue(
          uploadQueue.map(item => 
            item.id === file.id 
              ? { ...item, status: 'failed', error: 'Upload failed' }
              : item
          )
        )
        
        publishEvent('upload.failed', {
          uploadId: file.id,
          fileName: file.name,
          error: error instanceof Error ? error.message : 'Upload failed'
        })
      }
    }
    
    setUploading(false)
    
    if (onUpload) {
      const completedFiles = files.filter(f => f.status === 'completed')
      await onUpload(completedFiles)
    }
  }, [files, uploadQueue, updateUploadQueue, publishEvent, onUpload, enableVirusScanning, enableMetadataExtraction])

  // Simulate upload API call
  const simulateUpload = async (file: File): Promise<{ url: string }> => {
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    return {
      url: URL.createObjectURL(file)
    }
  }

  // Extract file metadata
  const extractMetadata = async (file: File): Promise<any> => {
    const metadata: any = {}
    
    // For images, extract dimensions
    if (file.type.startsWith('image/')) {
      const dimensions = await getImageDimensions(file)
      metadata.width = dimensions.width
      metadata.height = dimensions.height
      
      if (enableThumbnails) {
        metadata.thumbnailUrl = URL.createObjectURL(file)
      }
    }
    
    // For videos, extract duration (simulated)
    if (file.type.startsWith('video/')) {
      metadata.duration = Math.floor(Math.random() * 3600) // Random duration
    }
    
    // For audio, extract duration (simulated)
    if (file.type.startsWith('audio/')) {
      metadata.duration = Math.floor(Math.random() * 600) // Random duration
    }
    
    return metadata
  }

  // Get image dimensions
  const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight })
        URL.revokeObjectURL(img.src)
      }
      img.onerror = () => {
        resolve({ width: 0, height: 0 })
        URL.revokeObjectURL(img.src)
      }
      img.src = URL.createObjectURL(file)
    })
  }

  // Handle drag and drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    
    const droppedFiles = e.dataTransfer.files
    if (droppedFiles.length > 0) {
      handleFileSelect(droppedFiles)
    }
  }, [handleFileSelect])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }, [])

  // Remove file
  const removeFile = useCallback((fileId: string) => {
    const file = files.find(f => f.id === fileId)
    if (file?.url) {
      URL.revokeObjectURL(file.url)
    }
    if (file?.metadata?.thumbnailUrl) {
      URL.revokeObjectURL(file.metadata.thumbnailUrl)
    }
    
    setFiles(prev => prev.filter(f => f.id !== fileId))
    updateUploadQueue(uploadQueue.filter(item => item.id !== fileId))
    onRemove?.(fileId)
    
    publishEvent('upload.removed', {
      uploadId: fileId
    })
  }, [files, uploadQueue, updateUploadQueue, onRemove, publishEvent])

  // Filter files
  const filteredFiles = files.filter(file => {
    const matchesCategory = filterCategory === 'all' || file.category === filterCategory
    const matchesSearch = searchQuery === '' || 
      file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      file.description?.toLowerCase().includes(searchQuery.toLowerCase())
    
    return matchesCategory && matchesSearch
  })

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Format duration
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              {title}
            </CardTitle>
            {description && (
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {files.length}/{maxFiles}
            </Badge>
            {uploading && (
              <Badge variant="secondary" className="animate-pulse">
                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                Uploading...
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Drop Zone */}
        <div
          ref={dropZoneRef}
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
            dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25",
            "hover:border-primary hover:bg-primary/5"
          )}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="space-y-4">
            <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center">
              {dragOver ? (
                <Download className="h-6 w-6 text-primary" />
              ) : (
                <Upload className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            
            {children || (
              <div className="space-y-2">
                <p className="text-lg font-medium">
                  {dragOver ? 'Drop files here' : 'Upload files'}
                </p>
                <p className="text-sm text-muted-foreground">
                  Drag & drop or click to browse
                </p>
                <p className="text-xs text-muted-foreground">
                  Max {maxFiles} files, {formatFileSize(maxSize)} each
                </p>
              </div>
            )}
            
            <Button variant="outline" size="sm">
              <Folder className="h-4 w-4 mr-2" />
              Browse Files
            </Button>
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            multiple={multiple}
            className="hidden"
            onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
          />
        </div>
        
        {/* File List */}
        {showFileList && files.length > 0 && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <Select value={filterCategory} onValueChange={(value) => setFilterCategory(value as any)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Files</SelectItem>
                  <SelectItem value="document">Documents</SelectItem>
                  <SelectItem value="image">Images</SelectItem>
                  <SelectItem value="video">Videos</SelectItem>
                  <SelectItem value="audio">Audio</SelectItem>
                  <SelectItem value="code">Code</SelectItem>
                  <SelectItem value="spreadsheet">Spreadsheets</SelectItem>
                  <SelectItem value="archive">Archives</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              
              {!autoUpload && (
                <Button
                  onClick={() => uploadFiles(files.filter(f => f.status === 'pending'))}
                  disabled={uploading || files.every(f => f.status !== 'pending')}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload All
                </Button>
              )}
            </div>
            
            {/* File Grid */}
            <div className="space-y-2">
              {filteredFiles.map((file) => {
                const IconComponent = CATEGORY_ICONS[file.category]
                const colorClass = CATEGORY_COLORS[file.category]
                
                return (
                  <div key={file.id} className="flex items-center gap-4 p-4 border rounded-lg">
                    {/* File Icon */}
                    <div className="flex-shrink-0">
                      <IconComponent className={cn("h-8 w-8", colorClass)} />
                    </div>
                    
                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{file.name}</p>
                        <Badge variant="outline" className="text-xs">
                          {file.category}
                        </Badge>
                        {file.metadata?.virus_scan === 'infected' && (
                          <Badge variant="destructive" className="text-xs">
                            Virus Detected
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span>{formatFileSize(file.size)}</span>
                        {file.metadata?.width && file.metadata?.height && (
                          <span>{file.metadata.width}×{file.metadata.height}</span>
                        )}
                        {file.metadata?.duration && (
                          <span>{formatDuration(file.metadata.duration)}</span>
                        )}
                        <span>{new Date(file.metadata?.lastModified || 0).toLocaleDateString()}</span>
                      </div>
                      
                      {/* Progress Bar */}
                      {file.status === 'uploading' && (
                        <div className="mt-2">
                          <Progress value={file.uploadProgress} className="h-2" />
                        </div>
                      )}
                      
                      {/* Error Message */}
                      {file.error && (
                        <p className="text-sm text-red-500 mt-1">{file.error}</p>
                      )}
                    </div>
                    
                    {/* Status */}
                    <div className="flex-shrink-0">
                      {file.status === 'pending' && <Clock className="h-5 w-5 text-gray-400" />}
                      {file.status === 'uploading' && <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />}
                      {file.status === 'completed' && <CheckCircle className="h-5 w-5 text-green-500" />}
                      {file.status === 'failed' && <AlertCircle className="h-5 w-5 text-red-500" />}
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {file.status === 'completed' && onPreview && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onPreview(file)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {file.status === 'completed' && onShare && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onShare(file)}
                        >
                          <Share className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {file.url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                        >
                          <a href={file.url} download={file.name}>
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(file.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
            
            {filteredFiles.length === 0 && files.length > 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <File className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No files match your filter criteria</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}