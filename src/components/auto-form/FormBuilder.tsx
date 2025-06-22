'use client'

import { useState, useEffect } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { AutoForm, AutoFormSchema, FieldConfig, FieldType } from './AutoForm'
import { useAGUIProtocol } from '@/lib/ag-ui-protocol-v2'
import { cn } from '@/lib/utils'
import {
  Plus,
  Trash2,
  Copy,
  Move,
  Settings,
  Eye,
  Code,
  Save,
  Download,
  Upload,
  GripVertical
} from 'lucide-react'

export interface FormBuilderProps {
  initialSchema?: AutoFormSchema
  onSchemaChange?: (schema: AutoFormSchema) => void
  onSave?: (schema: AutoFormSchema) => void
  className?: string
}

const FIELD_TYPES: Array<{ value: FieldType; label: string; description: string }> = [
  { value: 'text', label: 'Text Input', description: 'Single line text input' },
  { value: 'textarea', label: 'Text Area', description: 'Multi-line text input' },
  { value: 'email', label: 'Email', description: 'Email input with validation' },
  { value: 'password', label: 'Password', description: 'Password input field' },
  { value: 'number', label: 'Number', description: 'Numeric input with validation' },
  { value: 'select', label: 'Select', description: 'Dropdown selection' },
  { value: 'checkbox', label: 'Checkbox', description: 'True/false checkbox' },
  { value: 'switch', label: 'Switch', description: 'Toggle switch' },
  { value: 'date', label: 'Date', description: 'Date picker' },
  { value: 'time', label: 'Time', description: 'Time picker' },
  { value: 'datetime-local', label: 'DateTime', description: 'Date and time picker' },
  { value: 'array', label: 'Array', description: 'Dynamic list of items' },
  { value: 'object', label: 'Object', description: 'Nested object fields' }
]

export function FormBuilder({
  initialSchema,
  onSchemaChange,
  onSave,
  className
}: FormBuilderProps) {
  const { publishEvent } = useAGUIProtocol()
  const [schema, setSchema] = useState<AutoFormSchema>(
    initialSchema || {
      title: 'New Form',
      description: '',
      fields: [],
      submitLabel: 'Submit',
      resetLabel: 'Reset',
      layout: 'vertical'
    }
  )
  const [selectedField, setSelectedField] = useState<FieldConfig | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [showCode, setShowCode] = useState(false)

  // Update parent when schema changes
  useEffect(() => {
    onSchemaChange?.(schema)
  }, [schema, onSchemaChange])

  // Create new field
  const createField = (type: FieldType): FieldConfig => ({
    key: `field_${Date.now()}`,
    label: `New ${type} Field`,
    type,
    required: false,
    placeholder: '',
    description: '',
    defaultValue: type === 'checkbox' || type === 'switch' ? false : '',
    options: type === 'select' ? [{ value: 'option1', label: 'Option 1' }] : undefined
  })

  // Add new field
  const addField = (type: FieldType) => {
    const newField = createField(type)
    setSchema(prev => ({
      ...prev,
      fields: [...prev.fields, newField]
    }))
    setSelectedField(newField)
    
    publishEvent('form.field_added', {
      fieldType: type,
      fieldKey: newField.key
    })
  }

  // Remove field
  const removeField = (index: number) => {
    const field = schema.fields[index]
    setSchema(prev => ({
      ...prev,
      fields: prev.fields.filter((_, i) => i !== index)
    }))
    
    if (selectedField?.key === field.key) {
      setSelectedField(null)
    }
    
    publishEvent('form.field_removed', {
      fieldKey: field.key
    })
  }

  // Update field
  const updateField = (index: number, updates: Partial<FieldConfig>) => {
    setSchema(prev => ({
      ...prev,
      fields: prev.fields.map((field, i) => 
        i === index ? { ...field, ...updates } : field
      )
    }))
    
    if (selectedField && schema.fields[index].key === selectedField.key) {
      setSelectedField({ ...selectedField, ...updates })
    }
  }

  // Duplicate field
  const duplicateField = (index: number) => {
    const originalField = schema.fields[index]
    const duplicatedField = {
      ...originalField,
      key: `${originalField.key}_copy_${Date.now()}`,
      label: `${originalField.label} (Copy)`
    }
    
    setSchema(prev => ({
      ...prev,
      fields: [
        ...prev.fields.slice(0, index + 1),
        duplicatedField,
        ...prev.fields.slice(index + 1)
      ]
    }))
  }

  // Handle drag and drop
  const handleDragEnd = (result: any) => {
    if (!result.destination) return

    const items = Array.from(schema.fields)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    setSchema(prev => ({ ...prev, fields: items }))
  }

  // Export schema as JSON
  const exportSchema = () => {
    const dataStr = JSON.stringify(schema, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${schema.title.toLowerCase().replace(/\s+/g, '-')}-schema.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  // Import schema from JSON
  const importSchema = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string)
        setSchema(imported)
        setSelectedField(null)
      } catch (error) {
        console.error('Failed to import schema:', error)
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className={cn("grid grid-cols-1 lg:grid-cols-3 gap-6", className)}>
      {/* Left Panel - Field Library & Form Settings */}
      <div className="space-y-6">
        {/* Form Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Form Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Form Title</Label>
              <Input
                value={schema.title}
                onChange={(e) => setSchema(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Form title"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={schema.description || ''}
                onChange={(e) => setSchema(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Form description"
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Submit Button</Label>
                <Input
                  value={schema.submitLabel || 'Submit'}
                  onChange={(e) => setSchema(prev => ({ ...prev, submitLabel: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Reset Button</Label>
                <Input
                  value={schema.resetLabel || 'Reset'}
                  onChange={(e) => setSchema(prev => ({ ...prev, resetLabel: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Layout</Label>
              <Select
                value={schema.layout || 'vertical'}
                onValueChange={(value) => setSchema(prev => ({ ...prev, layout: value as any }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vertical">Vertical</SelectItem>
                  <SelectItem value="horizontal">Horizontal</SelectItem>
                  <SelectItem value="grid">Grid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {schema.layout === 'grid' && (
              <div className="space-y-2">
                <Label>Grid Columns</Label>
                <Input
                  type="number"
                  min="1"
                  max="6"
                  value={schema.columns || 2}
                  onChange={(e) => setSchema(prev => ({ ...prev, columns: parseInt(e.target.value) || 2 }))}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Field Library */}
        <Card>
          <CardHeader>
            <CardTitle>Field Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {FIELD_TYPES.map(fieldType => (
                <Button
                  key={fieldType.value}
                  variant="outline"
                  size="sm"
                  className="justify-start h-auto p-3"
                  onClick={() => addField(fieldType.value)}
                >
                  <div className="text-left">
                    <div className="font-medium">{fieldType.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {fieldType.description}
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
                className="flex-1"
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCode(!showCode)}
                className="flex-1"
              >
                <Code className="h-4 w-4 mr-2" />
                Code
              </Button>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={exportSchema}
                className="flex-1"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('import-input')?.click()}
                className="flex-1"
              >
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
            </div>
            
            <input
              id="import-input"
              type="file"
              accept=".json"
              className="hidden"
              onChange={importSchema}
            />
            
            {onSave && (
              <Button
                onClick={() => onSave(schema)}
                className="w-full"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Form
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Center Panel - Form Builder */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Form Builder
              <Badge variant="outline">{schema.fields.length} fields</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="fields">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-2"
                  >
                    {schema.fields.map((field, index) => (
                      <Draggable key={field.key} draggableId={field.key} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={cn(
                              "flex items-center gap-2 p-3 border rounded-lg",
                              snapshot.isDragging && "shadow-lg",
                              selectedField?.key === field.key && "ring-2 ring-primary"
                            )}
                          >
                            <div {...provided.dragHandleProps}>
                              <GripVertical className="h-4 w-4 text-muted-foreground" />
                            </div>
                            
                            <div
                              className="flex-1 cursor-pointer"
                              onClick={() => setSelectedField(field)}
                            >
                              <div className="font-medium">{field.label}</div>
                              <div className="text-xs text-muted-foreground">
                                {field.type} {field.required && '(required)'}
                              </div>
                            </div>
                            
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => duplicateField(index)}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeField(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    
                    {schema.fields.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>No fields added yet.</p>
                        <p className="text-sm">Add fields from the library on the left.</p>
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </CardContent>
        </Card>
        
        {/* Field Editor */}
        {selectedField && (
          <FieldEditor
            field={selectedField}
            onUpdate={(updates) => {
              const index = schema.fields.findIndex(f => f.key === selectedField.key)
              if (index !== -1) {
                updateField(index, updates)
              }
            }}
            onClose={() => setSelectedField(null)}
          />
        )}
      </div>

      {/* Right Panel - Preview */}
      <div className="space-y-6">
        {showPreview && (
          <AutoForm
            schema={schema}
            onSubmit={(data) => console.log('Form submitted:', data)}
            showPreview={true}
          />
        )}
        
        {showCode && (
          <Card>
            <CardHeader>
              <CardTitle>Schema JSON</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto max-h-96">
                {JSON.stringify(schema, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

// Field Editor Component
interface FieldEditorProps {
  field: FieldConfig
  onUpdate: (updates: Partial<FieldConfig>) => void
  onClose: () => void
}

function FieldEditor({ field, onUpdate, onClose }: FieldEditorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Edit Field: {field.label}
          <Button variant="ghost" size="sm" onClick={onClose}>
            ×
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Field Key</Label>
          <Input
            value={field.key}
            onChange={(e) => onUpdate({ key: e.target.value })}
          />
        </div>
        
        <div className="space-y-2">
          <Label>Label</Label>
          <Input
            value={field.label}
            onChange={(e) => onUpdate({ label: e.target.value })}
          />
        </div>
        
        <div className="space-y-2">
          <Label>Placeholder</Label>
          <Input
            value={field.placeholder || ''}
            onChange={(e) => onUpdate({ placeholder: e.target.value })}
          />
        </div>
        
        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea
            value={field.description || ''}
            onChange={(e) => onUpdate({ description: e.target.value })}
            rows={2}
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <Switch
            id="required"
            checked={field.required || false}
            onCheckedChange={(checked) => onUpdate({ required: checked })}
          />
          <Label htmlFor="required">Required</Label>
        </div>
        
        {/* Field-specific options */}
        {field.type === 'select' && (
          <div className="space-y-2">
            <Label>Options</Label>
            <div className="space-y-2">
              {field.options?.map((option, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder="Value"
                    value={option.value}
                    onChange={(e) => {
                      const newOptions = [...(field.options || [])]
                      newOptions[index] = { ...option, value: e.target.value }
                      onUpdate({ options: newOptions })
                    }}
                  />
                  <Input
                    placeholder="Label"
                    value={option.label}
                    onChange={(e) => {
                      const newOptions = [...(field.options || [])]
                      newOptions[index] = { ...option, label: e.target.value }
                      onUpdate({ options: newOptions })
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newOptions = field.options?.filter((_, i) => i !== index)
                      onUpdate({ options: newOptions })
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newOptions = [
                    ...(field.options || []),
                    { value: `option${(field.options?.length || 0) + 1}`, label: `Option ${(field.options?.length || 0) + 1}` }
                  ]
                  onUpdate({ options: newOptions })
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Option
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}