'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useAppStore } from '@/lib/stores/app-store'
import { useAGUIProtocol } from '@/lib/ag-ui-protocol-v2'
import { backendApi } from '@/lib/api/backend-client'
import { cn } from '@/lib/utils'
import {
  Send,
  Paperclip,
  Smile,
  AtSign,
  Bot,
  User,
  Clock,
  CheckCircle,
  AlertCircle,
  Zap,
  Hash,
  Code,
  Image as ImageIcon,
  File,
  Mic,
  Video
} from 'lucide-react'

export interface MentionableAgent {
  id: string
  name: string
  type: 'trading' | 'analysis' | 'risk' | 'strategy' | 'general'
  status: 'online' | 'busy' | 'offline'
  avatar?: string
  description?: string
  capabilities?: string[]
}

export interface ChatMessage {
  id: string
  content: string
  sender: {
    id: string
    name: string
    type: 'user' | 'agent'
    avatar?: string
  }
  timestamp: Date
  mentions?: string[]
  attachments?: Array<{
    id: string
    name: string
    type: 'image' | 'file' | 'code' | 'data'
    url?: string
    size?: number
  }>
  reactions?: Array<{
    emoji: string
    users: string[]
  }>
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed'
  inReplyTo?: string
  metadata?: {
    tradingContext?: any
    marketData?: any
    riskMetrics?: any
  }
}

export interface FancyAreaProps {
  title?: string
  description?: string
  placeholder?: string
  mentionableAgents?: MentionableAgent[]
  messages?: ChatMessage[]
  currentUser?: {
    id: string
    name: string
    avatar?: string
  }
  onSendMessage?: (content: string, mentions: string[], attachments?: File[]) => Promise<void>
  onMentionAgent?: (agentId: string) => void
  onFileUpload?: (files: File[]) => Promise<string[]>
  showTypingIndicator?: boolean
  maxLength?: number
  enableMarkdown?: boolean
  enableCodeBlocks?: boolean
  enableAttachments?: boolean
  className?: string
}

export function FancyArea({
  title = "Agent Communication Hub",
  description = "Chat with AI agents, share data, and collaborate on trading strategies",
  placeholder = "Type a message... Use @agent to mention specific agents",
  mentionableAgents = [],
  messages = [],
  currentUser = { id: 'user', name: 'You' },
  onSendMessage,
  onMentionAgent,
  onFileUpload,
  showTypingIndicator = false,
  maxLength = 2000,
  enableMarkdown = true,
  enableCodeBlocks = true,
  enableAttachments = true,
  className
}: FancyAreaProps) {
  const { mentionableAgents: storeAgents, activeConversations, updateActiveConversations } = useAppStore()
  const { publishEvent, subscribeToEvent } = useAGUIProtocol()
  
  const [content, setContent] = useState('')
  const [showMentionDropdown, setShowMentionDropdown] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 })
  const [selectedMentions, setSelectedMentions] = useState<string[]>([])
  const [isComposing, setIsComposing] = useState(false)
  const [attachments, setAttachments] = useState<File[]>([])
  const [dragOver, setDragOver] = useState(false)
  
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const mentionDropdownRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Combine store agents with props agents
  const allAgents = [...mentionableAgents, ...storeAgents]

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Handle mention detection
  const handleTextareaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setContent(value)
    
    // Detect @ mentions
    const cursorPosition = e.target.selectionStart
    const textBeforeCursor = value.slice(0, cursorPosition)
    const lastAtIndex = textBeforeCursor.lastIndexOf('@')
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1)
      
      // Check if there's a space after @, if so, hide dropdown
      if (textAfterAt.includes(' ')) {
        setShowMentionDropdown(false)
        return
      }
      
      setMentionQuery(textAfterAt.toLowerCase())
      setShowMentionDropdown(true)
      
      // Calculate dropdown position
      const textarea = textareaRef.current
      if (textarea) {
        const rect = textarea.getBoundingClientRect()
        setMentionPosition({
          top: rect.bottom + 5,
          left: rect.left + 10
        })
      }
    } else {
      setShowMentionDropdown(false)
    }
    
    // Publish typing event
    if (value.length > 0 && !isComposing) {
      setIsComposing(true)
      publishEvent('mention.typing_started', {
        userId: currentUser.id,
        content: value.slice(0, 50) + (value.length > 50 ? '...' : '')
      })
    } else if (value.length === 0 && isComposing) {
      setIsComposing(false)
      publishEvent('mention.typing_stopped', {
        userId: currentUser.id
      })
    }
  }, [currentUser.id, isComposing, publishEvent])

  // Filter agents based on mention query
  const filteredAgents = allAgents.filter(agent =>
    agent.name.toLowerCase().includes(mentionQuery) ||
    agent.type.toLowerCase().includes(mentionQuery) ||
    (agent.capabilities && agent.capabilities.some(cap => 
      cap.toLowerCase().includes(mentionQuery)
    ))
  )

  // Handle mention selection
  const selectMention = useCallback((agent: MentionableAgent) => {
    const textarea = textareaRef.current
    if (!textarea) return
    
    const cursorPosition = textarea.selectionStart
    const textBeforeCursor = content.slice(0, cursorPosition)
    const lastAtIndex = textBeforeCursor.lastIndexOf('@')
    
    if (lastAtIndex !== -1) {
      const textAfterCursor = content.slice(cursorPosition)
      const newContent = content.slice(0, lastAtIndex) + `@${agent.name} ` + textAfterCursor
      
      setContent(newContent)
      setSelectedMentions(prev => [...prev, agent.id])
      setShowMentionDropdown(false)
      
      // Focus back to textarea
      setTimeout(() => {
        textarea.focus()
        const newPosition = lastAtIndex + agent.name.length + 2
        textarea.setSelectionRange(newPosition, newPosition)
      }, 0)
      
      // Publish mention event
      publishEvent('mention.agent_tagged', {
        agentId: agent.id,
        agentName: agent.name,
        userId: currentUser.id,
        context: newContent
      })
      
      onMentionAgent?.(agent.id)
    }
  }, [content, currentUser.id, onMentionAgent, publishEvent])

  // Handle file drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0 && enableAttachments) {
      setAttachments(prev => [...prev, ...files])
    }
  }, [enableAttachments])

  // Handle file selection
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      setAttachments(prev => [...prev, ...files])
    }
  }, [])

  // Remove attachment
  const removeAttachment = useCallback((index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }, [])

  // Send message
  const handleSend = useCallback(async () => {
    if (!content.trim() && attachments.length === 0) return
    
    try {
      // Upload attachments if any
      let attachmentUrls: string[] = []
      if (attachments.length > 0 && onFileUpload) {
        attachmentUrls = await onFileUpload(attachments)
      }
      
      // Send message
      await onSendMessage?.(content, selectedMentions, attachments)
      
      // Create conversation record
      const conversationId = `conv_${Date.now()}`
      const newConversation = {
        id: conversationId,
        participants: [currentUser.id, ...selectedMentions],
        lastMessage: content,
        lastActivity: new Date(),
        unreadCount: 0,
        type: 'agent_chat' as const
      }
      
      updateActiveConversations([...activeConversations, newConversation])
      
      // Publish message sent event
      publishEvent('mention.message_sent', {
        conversationId,
        content,
        mentions: selectedMentions,
        attachments: attachmentUrls,
        timestamp: Date.now()
      })
      
      // Clear form
      setContent('')
      setSelectedMentions([])
      setAttachments([])
      setIsComposing(false)
      
    } catch (error) {
      console.error('Failed to send message:', error)
      publishEvent('mention.message_failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }, [content, selectedMentions, attachments, onSendMessage, onFileUpload, currentUser.id, activeConversations, updateActiveConversations, publishEvent])

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSend()
    } else if (e.key === 'Escape') {
      setShowMentionDropdown(false)
    } else if (e.key === 'ArrowDown' && showMentionDropdown) {
      e.preventDefault()
      // Handle dropdown navigation
    }
  }, [handleSend, showMentionDropdown])

  // Subscribe to real-time events
  useEffect(() => {
    const unsubscribes = [
      subscribeToEvent('mention.agent_response', (data) => {
        // Handle agent responses
        console.log('Agent response:', data)
      }),
      
      subscribeToEvent('mention.agent_status_changed', (data) => {
        // Update agent status in real-time
        console.log('Agent status changed:', data)
      })
    ]
    
    return () => unsubscribes.forEach(unsub => unsub())
  }, [subscribeToEvent])

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AtSign className="h-5 w-5" />
              {title}
            </CardTitle>
            {description && (
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {allAgents.length} agents
            </Badge>
            {isComposing && (
              <Badge variant="secondary" className="animate-pulse">
                <Zap className="h-3 w-3 mr-1" />
                Typing...
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Messages Area */}
        {messages.length > 0 && (
          <div className="max-h-80 overflow-y-auto space-y-3 p-4 bg-muted/30 rounded-lg">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} currentUser={currentUser} />
            ))}
            {showTypingIndicator && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span>Agent is typing...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
        
        {/* Composition Area */}
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-4 transition-colors",
            dragOver ? "border-primary bg-primary/5" : "border-muted",
            "relative"
          )}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
        >
          {/* Active Mentions */}
          {selectedMentions.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {selectedMentions.map(agentId => {
                const agent = allAgents.find(a => a.id === agentId)
                return agent ? (
                  <Badge key={agentId} variant="secondary" className="flex items-center gap-1">
                    <Bot className="h-3 w-3" />
                    {agent.name}
                    <button
                      onClick={() => setSelectedMentions(prev => prev.filter(id => id !== agentId))}
                      className="ml-1 hover:text-destructive"
                    >
                      ×
                    </button>
                  </Badge>
                ) : null
              })}
            </div>
          )}
          
          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="mb-3">
              <div className="flex flex-wrap gap-2">
                {attachments.map((file, index) => (
                  <div key={index} className="flex items-center gap-2 bg-muted p-2 rounded">
                    {file.type.startsWith('image/') ? (
                      <ImageIcon className="h-4 w-4" />
                    ) : (
                      <File className="h-4 w-4" />
                    )}
                    <span className="text-sm truncate max-w-32">{file.name}</span>
                    <button
                      onClick={() => removeAttachment(index)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Text Input */}
          <div className="space-y-3">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              maxLength={maxLength}
              rows={4}
              className="w-full resize-none border-0 bg-transparent focus:ring-0 focus:outline-none text-sm"
            />
            
            {/* Toolbar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {enableAttachments && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                  </>
                )}
                
                {enableMarkdown && (
                  <Button variant="ghost" size="sm">
                    <Hash className="h-4 w-4" />
                  </Button>
                )}
                
                {enableCodeBlocks && (
                  <Button variant="ghost" size="sm">
                    <Code className="h-4 w-4" />
                  </Button>
                )}
                
                <Button variant="ghost" size="sm">
                  <Smile className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {content.length}/{maxLength}
                </span>
                <Button
                  onClick={handleSend}
                  disabled={!content.trim() && attachments.length === 0}
                  size="sm"
                >
                  <Send className="h-4 w-4 mr-1" />
                  Send
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Mention Dropdown */}
        {showMentionDropdown && filteredAgents.length > 0 && (
          <div
            ref={mentionDropdownRef}
            className="absolute z-50 bg-background border rounded-lg shadow-lg max-h-48 overflow-y-auto"
            style={{
              top: mentionPosition.top,
              left: mentionPosition.left,
              width: '280px'
            }}
          >
            {filteredAgents.map((agent) => (
              <button
                key={agent.id}
                onClick={() => selectMention(agent)}
                className="w-full p-3 hover:bg-muted text-left flex items-center gap-3"
              >
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center",
                  agent.status === 'online' ? 'bg-green-100 text-green-600' :
                  agent.status === 'busy' ? 'bg-yellow-100 text-yellow-600' :
                  'bg-gray-100 text-gray-600'
                )}>
                  <Bot className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">{agent.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {agent.type} • {agent.status}
                  </div>
                  {agent.description && (
                    <div className="text-xs text-muted-foreground truncate">
                      {agent.description}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
        
        {/* Available Agents */}
        {allAgents.length > 0 && (
          <div className="space-y-2">
            <Separator />
            <div>
              <h4 className="text-sm font-medium mb-2">Available Agents</h4>
              <div className="flex flex-wrap gap-2">
                {allAgents.slice(0, 8).map((agent) => (
                  <Button
                    key={agent.id}
                    variant="outline"
                    size="sm"
                    className="h-auto p-2"
                    onClick={() => {
                      setContent(prev => prev + `@${agent.name} `)
                      setSelectedMentions(prev => [...prev, agent.id])
                      textareaRef.current?.focus()
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        agent.status === 'online' ? 'bg-green-500' :
                        agent.status === 'busy' ? 'bg-yellow-500' :
                        'bg-gray-400'
                      )} />
                      <span className="text-xs">{agent.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {agent.type}
                      </Badge>
                    </div>
                  </Button>
                ))}
                {allAgents.length > 8 && (
                  <span className="text-xs text-muted-foreground self-center">
                    +{allAgents.length - 8} more
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Message Bubble Component
interface MessageBubbleProps {
  message: ChatMessage
  currentUser: { id: string; name: string; avatar?: string }
}

function MessageBubble({ message, currentUser }: MessageBubbleProps) {
  const isOwn = message.sender.id === currentUser.id
  
  return (
    <div className={cn("flex gap-3", isOwn && "flex-row-reverse")}>
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center",
        message.sender.type === 'agent' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
      )}>
        {message.sender.type === 'agent' ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
      </div>
      
      <div className={cn("flex-1 space-y-1", isOwn && "items-end")}>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{message.sender.name}</span>
          <Clock className="h-3 w-3" />
          <span>{message.timestamp.toLocaleTimeString()}</span>
          {message.status === 'read' && <CheckCircle className="h-3 w-3 text-green-500" />}
          {message.status === 'failed' && <AlertCircle className="h-3 w-3 text-red-500" />}
        </div>
        
        <div className={cn(
          "p-3 rounded-lg max-w-md",
          isOwn ? "bg-primary text-primary-foreground ml-auto" : "bg-muted"
        )}>
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-2 space-y-1">
              {message.attachments.map((attachment) => (
                <div key={attachment.id} className="flex items-center gap-2 text-xs">
                  {attachment.type === 'image' ? <ImageIcon className="h-3 w-3" /> : <File className="h-3 w-3" />}
                  <span>{attachment.name}</span>
                </div>
              ))}
            </div>
          )}
          
          {message.mentions && message.mentions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {message.mentions.map((mention) => (
                <Badge key={mention} variant="secondary" className="text-xs">
                  @{mention}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}