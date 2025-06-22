'use client'

import { useState, useRef, useCallback } from 'react'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { useAppStore } from '@/lib/stores/app-store'
import { useAGUIProtocol } from '@/lib/ag-ui-protocol-v2'
import { backendApi } from '@/lib/api/backend-client'
import { cn } from '@/lib/utils'
import {
  Upload,
  Image as ImageIcon,
  X,
  Download,
  Eye,
  Crop,
  RotateCw,
  Maximize2,
  Camera,
  Folder,
  CheckCircle,
  AlertCircle,
  File,
  Trash2
} from 'lucide-react'

export interface UploadedImage {
  id: string
  file: File
  url: string
  thumbnailUrl?: string
  name: string
  size: number
  type: string
  dimensions?: {
    width: number
    height: number
  }
  uploadProgress: number
  status: 'uploading' | 'completed' | 'failed' | 'processing'
  error?: string
  metadata?: {
    exif?: any
    colors?: string[]
    tags?: string[]
  }
}

export interface ImageUploadProps {
  title?: string
  description?: string
  accept?: string
  maxFiles?: number
  maxSize?: number // bytes
  allowedTypes?: string[]
  enableCrop?: boolean
  enableResize?: boolean
  enableMetadata?: boolean
  autoUpload?: boolean
  multiple?: boolean
  className?: string
  onUpload?: (images: UploadedImage[]) => Promise<void>
  onRemove?: (imageId: string) => void
  onPreview?: (image: UploadedImage) => void
  children?: React.ReactNode
}

export function ImageUpload({
  title = "Image Upload",
  description = "Drag & drop images or click to browse",
  accept = "image/*",
  maxFiles = 10,
  maxSize = 10 * 1024 * 1024, // 10MB
  allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  enableCrop = true,
  enableResize = true,
  enableMetadata = true,
  autoUpload = true,
  multiple = true,
  className,
  onUpload,
  onRemove,
  onPreview,
  children
}: ImageUploadProps) {
  const { uploadQueue, updateUploadQueue } = useAppStore()
  const { publishEvent } = useAGUIProtocol()
  
  const [images, setImages] = useState<UploadedImage[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedImage, setSelectedImage] = useState<UploadedImage | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  // Handle file selection
  const handleFileSelect = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files)
    
    // Validate files
    const validFiles = fileArray.filter(file => {
      // Check file type
      if (!allowedTypes.includes(file.type)) {
        console.warn(`File ${file.name} has invalid type: ${file.type}`)
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
    if (images.length + validFiles.length > maxFiles) {
      console.warn(`Cannot upload ${validFiles.length} files. Maximum ${maxFiles} files allowed.`)
      validFiles.splice(maxFiles - images.length)
    }
    
    // Process files
    processFiles(validFiles)
  }, [images.length, maxFiles, maxSize, allowedTypes])

  // Process selected files
  const processFiles = useCallback(async (files: File[]) => {
    const newImages: UploadedImage[] = []
    
    for (const file of files) {
      const imageId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      // Create preview URL
      const url = URL.createObjectURL(file)
      
      // Get image dimensions
      const dimensions = await getImageDimensions(file)
      
      const uploadedImage: UploadedImage = {
        id: imageId,
        file,
        url,
        name: file.name,
        size: file.size,
        type: file.type,
        dimensions,
        uploadProgress: 0,
        status: 'uploading',
        metadata: enableMetadata ? await extractMetadata(file) : undefined
      }
      
      newImages.push(uploadedImage)
      
      // Add to upload queue
      const queueItem = {
        id: imageId,
        file,
        type: 'image' as const,
        status: 'pending' as const,
        progress: 0,
        metadata: {
          originalName: file.name,
          size: file.size,
          type: file.type
        }
      }
      
      updateUploadQueue([...uploadQueue, queueItem])
      
      publishEvent('upload.started', {
        uploadId: imageId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      })
    }
    
    setImages(prev => [...prev, ...newImages])
    
    if (autoUpload) {
      uploadImages(newImages)
    }
  }, [uploadQueue, updateUploadQueue, publishEvent, autoUpload, enableMetadata])

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

  // Extract image metadata
  const extractMetadata = async (file: File): Promise<any> => {
    // This would typically use a library like exif-js or similar
    // For now, return basic metadata
    return {
      lastModified: file.lastModified,
      size: file.size,
      type: file.type
    }
  }

  // Upload images
  const uploadImages = useCallback(async (imagesToUpload: UploadedImage[]) => {
    setUploading(true)
    
    for (const image of imagesToUpload) {
      try {
        // Update status to uploading
        setImages(prev => prev.map(img => 
          img.id === image.id 
            ? { ...img, status: 'uploading' as const }
            : img
        ))
        
        // Simulate upload progress
        for (let progress = 0; progress <= 100; progress += 10) {
          await new Promise(resolve => setTimeout(resolve, 100))
          
          setImages(prev => prev.map(img => 
            img.id === image.id 
              ? { ...img, uploadProgress: progress }
              : img
          ))
          
          updateUploadQueue(
            uploadQueue.map(item => 
              item.id === image.id 
                ? { ...item, progress, status: progress === 100 ? 'completed' : 'uploading' }
                : item
            )
          )
        }
        
        // Simulate API upload (replace with actual API call)
        const uploadResponse = await simulateUpload(image.file)
        
        setImages(prev => prev.map(img => 
          img.id === image.id 
            ? { 
                ...img, 
                status: 'completed' as const,
                uploadProgress: 100,
                url: uploadResponse.url,
                thumbnailUrl: uploadResponse.thumbnailUrl
              }
            : img
        ))
        
        publishEvent('upload.completed', {
          uploadId: image.id,
          fileName: image.name,
          fileUrl: uploadResponse.url
        })
        
      } catch (error) {
        setImages(prev => prev.map(img => 
          img.id === image.id 
            ? { 
                ...img, 
                status: 'failed' as const,
                error: error instanceof Error ? error.message : 'Upload failed'
              }
            : img
        ))
        
        updateUploadQueue(
          uploadQueue.map(item => 
            item.id === image.id 
              ? { ...item, status: 'failed', error: 'Upload failed' }
              : item
          )
        )
        
        publishEvent('upload.failed', {
          uploadId: image.id,
          fileName: image.name,
          error: error instanceof Error ? error.message : 'Upload failed'
        })
      }
    }
    
    setUploading(false)
    
    if (onUpload) {
      const completedImages = images.filter(img => img.status === 'completed')
      await onUpload(completedImages)
    }
  }, [images, uploadQueue, updateUploadQueue, publishEvent, onUpload])

  // Simulate upload API call
  const simulateUpload = async (file: File): Promise<{ url: string; thumbnailUrl: string }> => {
    // In a real app, this would upload to your backend/cloud storage
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    return {
      url: URL.createObjectURL(file),
      thumbnailUrl: URL.createObjectURL(file)
    }
  }

  // Handle drag and drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileSelect(files)
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

  // Remove image
  const removeImage = useCallback((imageId: string) => {
    const image = images.find(img => img.id === imageId)
    if (image) {
      URL.revokeObjectURL(image.url)
      if (image.thumbnailUrl) {
        URL.revokeObjectURL(image.thumbnailUrl)
      }
    }
    
    setImages(prev => prev.filter(img => img.id !== imageId))
    updateUploadQueue(uploadQueue.filter(item => item.id !== imageId))
    onRemove?.(imageId)
    
    publishEvent('upload.removed', {
      uploadId: imageId
    })
  }, [images, uploadQueue, updateUploadQueue, onRemove, publishEvent])

  // Preview image
  const previewImage = useCallback((image: UploadedImage) => {
    setSelectedImage(image)
    onPreview?.(image)
  }, [onPreview])

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              {title}
            </CardTitle>
            {description && (
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {images.length}/{maxFiles}
            </Badge>
            {uploading && (
              <Badge variant="secondary" className="animate-pulse">
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
                  {dragOver ? 'Drop images here' : 'Upload images'}
                </p>
                <p className="text-sm text-muted-foreground">
                  Drag & drop or click to browse
                </p>
                <p className="text-xs text-muted-foreground">
                  Max {maxFiles} files, {formatFileSize(maxSize)} each
                </p>
              </div>
            )}
            
            <div className="flex items-center justify-center gap-4">
              <Button variant="outline" size="sm">
                <Folder className="h-4 w-4 mr-2" />
                Browse Files
              </Button>
              {navigator.mediaDevices && (
                <Button variant="outline" size="sm">
                  <Camera className="h-4 w-4 mr-2" />
                  Take Photo
                </Button>
              )}
            </div>
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
        
        {/* Uploaded Images Grid */}
        {images.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Uploaded Images</h3>
              <div className="flex gap-2">
                {!autoUpload && (
                  <Button
                    onClick={() => uploadImages(images.filter(img => img.status === 'uploading'))}
                    disabled={uploading || images.every(img => img.status !== 'uploading')}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload All
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => {
                    images.forEach(img => removeImage(img.id))
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {images.map((image) => (
                <div key={image.id} className="relative group">
                  <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                    <Image
                      src={image.thumbnailUrl || image.url}
                      alt={image.name}
                      width={200}
                      height={200}
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => previewImage(image)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {enableCrop && (
                          <Button
                            variant="secondary"
                            size="sm"
                          >
                            <Crop className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => removeImage(image.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Status Indicator */}
                    <div className="absolute top-2 right-2">
                      {image.status === 'uploading' && (
                        <Badge variant="secondary" className="text-xs">
                          {image.uploadProgress}%
                        </Badge>
                      )}
                      {image.status === 'completed' && (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      )}
                      {image.status === 'failed' && (
                        <AlertCircle className="h-5 w-5 text-red-500" />
                      )}
                    </div>
                    
                    {/* Progress Bar */}
                    {image.status === 'uploading' && (
                      <div className="absolute bottom-0 left-0 right-0">
                        <Progress value={image.uploadProgress} className="h-1" />
                      </div>
                    )}
                  </div>
                  
                  {/* Image Info */}
                  <div className="mt-2 space-y-1">
                    <p className="text-sm font-medium truncate">{image.name}</p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{formatFileSize(image.size)}</span>
                      {image.dimensions && (
                        <span>{image.dimensions.width}×{image.dimensions.height}</span>
                      )}
                    </div>
                    {image.error && (
                      <p className="text-xs text-red-500">{image.error}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Image Preview Modal */}
        {selectedImage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
            <div className="relative max-w-4xl max-h-screen p-4">
              <Image
                src={selectedImage.url}
                alt={selectedImage.name}
                width={800}
                height={600}
                className="max-w-full max-h-full object-contain"
              />
              <Button
                variant="secondary"
                size="sm"
                className="absolute top-4 right-4"
                onClick={() => setSelectedImage(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}