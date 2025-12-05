import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2, Maximize2, Minimize2, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import axios from 'axios';
import { supabase } from '@/integrations/supabase/client';

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'bot';
    timestamp: Date;
}

export default function ChatBot() {
    const [isOpen, setIsOpen] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);
    const [userName, setUserName] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [userMessageCount, setUserMessageCount] = useState(0);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // LocalStorage helper functions
    const getChatStorageKey = (userId: string | null) => `interview_vault_chat_${userId || 'guest'}`;

    const saveChatToStorage = (userId: string | null, msgs: Message[]) => {
        try {
            const key = getChatStorageKey(userId);
            localStorage.setItem(key, JSON.stringify(msgs));
        } catch (error) {
            console.error('Error saving chat to localStorage:', error);
        }
    };

    const loadChatFromStorage = (userId: string | null): Message[] | null => {
        try {
            const key = getChatStorageKey(userId);
            const stored = localStorage.getItem(key);
            if (stored) {
                const parsed = JSON.parse(stored);
                // Convert timestamp strings back to Date objects
                return parsed.map((msg: any) => ({
                    ...msg,
                    timestamp: new Date(msg.timestamp)
                }));
            }
        } catch (error) {
            console.error('Error loading chat from localStorage:', error);
        }
        return null;
    };

    const clearChatStorage = (userId: string | null) => {
        try {
            const key = getChatStorageKey(userId);
            localStorage.removeItem(key);
        } catch (error) {
            console.error('Error clearing chat from localStorage:', error);
        }
    };

    // Clear chat history handler
    const handleClearHistory = async () => {
        if (window.confirm('Are you sure you want to clear the chat history? This cannot be undone.')) {
            const { data: { user } } = await supabase.auth.getUser();
            const userId = user?.id || null;

            // Clear from localStorage
            clearChatStorage(userId);

            // Reset chat with new greeting
            await initializeChat(user, true);
        }
    };

    // Helper function to initialize/reset chat with appropriate greeting
    const initializeChat = async (user: any, forceReset: boolean = false) => {
        const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || null;
        const userId = user?.id || null;
        setUserName(name);

        // Try to load existing chat history from localStorage (unless forced reset)
        if (!forceReset) {
            const savedMessages = loadChatFromStorage(userId);
            if (savedMessages && savedMessages.length > 0) {
                setMessages(savedMessages);
                // Count user messages for greeting prefix logic
                const userMsgCount = savedMessages.filter(m => m.sender === 'user').length;
                setUserMessageCount(userMsgCount);
                return;
            }
        }

        // No saved messages or force reset - create welcome greeting
        setUserMessageCount(0);

        const greeting = name
            ? `Hello, **${name}**! 👋 I'm the Interview Vault AI assistant. I can help you with questions about your applications, job statistics, features, policies, or anything else. How can I assist you today?`
            : `Hello! 👋 I'm the Interview Vault AI assistant. I can help you with questions about the app, features, policies, or general inquiries. Please log in to access your personalized job application data. How can I assist you today?`;

        const initialMessages: Message[] = [{
            id: '1',
            text: greeting,
            sender: 'bot',
            timestamp: new Date(),
        }];

        setMessages(initialMessages);
        saveChatToStorage(userId, initialMessages);
    };

    // Initialize chat on mount and listen for auth changes
    useEffect(() => {
        // Initial load
        const loadUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            await initializeChat(user);
        };
        loadUser();

        // Listen for auth state changes (login/logout)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (event === 'SIGNED_IN') {
                    // Load chat history for the newly signed-in user
                    await initializeChat(session?.user);
                } else if (event === 'SIGNED_OUT') {
                    // Clear guest chat and show generic greeting
                    clearChatStorage(null);
                    await initializeChat(null, true);
                }
            }
        );

        // Cleanup subscription on unmount
        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    const formatMessage = (text: string) => {
        // Remove horizontal separators (---, ___, ===, etc.) but not table separators
        let formatted = text.replace(/^[-_=]{3,}$/gm, '');

        // Remove multiple consecutive blank lines (keep only single blank line)
        formatted = formatted.replace(/\n{3,}/g, '\n\n');

        // Convert markdown tables to HTML tables
        const tableRegex = /\|(.+)\|\n\|[-:\s|]+\|\n((?:\|.+\|\n?)+)/g;
        formatted = formatted.replace(tableRegex, (match, headerRow, bodyRows) => {
            // Parse header
            const headers = headerRow.split('|').map((h: string) => h.trim()).filter((h: string) => h);

            // Parse body rows
            const rows = bodyRows.trim().split('\n').map((row: string) => {
                return row.split('|').map((cell: string) => cell.trim()).filter((cell: string) => cell);
            });

            // Build HTML table
            let tableHtml = '<div class="overflow-x-auto my-3"><table class="w-full border-collapse text-sm">';

            // Header
            tableHtml += '<thead><tr class="bg-purple-600 text-white">';
            headers.forEach((header: string) => {
                tableHtml += `<th class="px-3 py-2 text-left font-semibold border border-purple-500">${header}</th>`;
            });
            tableHtml += '</tr></thead>';

            // Body
            tableHtml += '<tbody>';
            rows.forEach((row: string[], index: number) => {
                const bgClass = index % 2 === 0 ? 'bg-purple-50 dark:bg-purple-900/20' : 'bg-white dark:bg-gray-800';
                tableHtml += `<tr class="${bgClass}">`;
                row.forEach((cell: string, cellIndex: number) => {
                    // Make the score column bold and add color based on score
                    let cellContent = cell;
                    if (cellIndex === row.length - 1 && cell.includes('%')) {
                        const score = parseInt(cell);
                        let colorClass = 'text-gray-600';
                        if (score >= 80) colorClass = 'text-green-600 font-bold';
                        else if (score >= 60) colorClass = 'text-yellow-600 font-bold';
                        else colorClass = 'text-red-500 font-bold';
                        cellContent = `<span class="${colorClass}">${cell}</span>`;
                    }
                    // Make first column (rank) bold
                    if (cellIndex === 0) {
                        cellContent = `<strong>${cell}</strong>`;
                    }
                    tableHtml += `<td class="px-3 py-2 border border-purple-200 dark:border-purple-700">${cellContent}</td>`;
                });
                tableHtml += '</tr>';
            });
            tableHtml += '</tbody></table></div>';

            return tableHtml;
        });

        // Convert markdown headers (### and ##) to bold text
        formatted = formatted.replace(/^###\s*(.+)$/gm, '<strong>$1</strong>');
        formatted = formatted.replace(/^##\s*(.+)$/gm, '<strong>$1</strong>');

        // Convert markdown-style bold (**text**) to HTML
        formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        // Make common labels bold (Email:, Phone:, Address:, etc.)
        formatted = formatted.replace(/^- ((?:Support Email|Alternate Email|Email|Phone|Fax|Address|Website|Contact Person|HR Contact Name|HR Contact Phone|HR Contact Email|Position|Status|Applied on|LinkedIn|GitHub|Medium|Portfolio Website|Portfolio):)/gm, '- <strong>$1</strong>');

        // Convert URLs to links BEFORE converting newlines (to prevent <br> in URLs)
        formatted = formatted.replace(
            /(https?:\/\/[^\s<>"\n]+)/g,
            '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-primary underline">$1</a>'
        );

        // Convert newlines to <br>
        formatted = formatted.replace(/\n/g, '<br>');

        // Remove excessive <br> tags (more than 2 consecutive)
        formatted = formatted.replace(/(<br>){3,}/g, '<br><br>');

        return formatted;
    };

    const handleSendMessage = async () => {
        if (!inputMessage.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            text: inputMessage,
            sender: 'user',
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInputMessage('');
        setIsLoading(true);

        try {
            // Get current user
            const { data: { user } } = await supabase.auth.getUser();

            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
            const response = await axios.post(`${API_URL}/chat`, {
                message: inputMessage,
                conversationHistory: messages.map((m) => ({
                    role: m.sender === 'user' ? 'user' : 'assistant',
                    content: m.text,
                })),
                user: user ? {
                    id: user.id,
                    email: user.email,
                    name: user.user_metadata?.full_name || user.email?.split('@')[0],
                    isAuthenticated: true,
                    messageCount: userMessageCount
                } : {
                    isAuthenticated: false,
                    messageCount: userMessageCount
                }
            });

            // Increment user message count after sending
            setUserMessageCount(prev => prev + 1);

            const botMessage: Message = {
                id: (Date.now() + 1).toString(),
                text: response.data.response,
                sender: 'bot',
                timestamp: new Date(),
            };

            setMessages((prev) => {
                const updatedMessages = [...prev, botMessage];
                // Save to localStorage
                saveChatToStorage(user?.id || null, updatedMessages);
                return updatedMessages;
            });
        } catch (error) {
            console.error('Error sending message:', error);
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                text: "I'm sorry, I encountered an error. Please try again or contact support at interviewvault.2026@gmail.com",
                sender: 'bot',
                timestamp: new Date(),
            };
            setMessages((prev) => {
                const updatedMessages = [...prev, errorMessage];
                // Save error message to localStorage too
                saveChatToStorage(null, updatedMessages);
                return updatedMessages;
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    return (
        <>
            {/* Floating Chat Button */}
            {!isOpen && (
                <Button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 transition-all duration-300 hover:scale-110 z-50"
                    aria-label="Open chat"
                >
                    <MessageCircle className="h-6 w-6" />
                </Button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <Card
                    className={`fixed shadow-2xl flex flex-col z-50 border-2 border-purple-200 dark:border-purple-800 animate-in slide-in-from-bottom-4 duration-300 transition-all ${isMaximized
                        ? 'inset-[12.5%] w-[75vw] h-[75vh]'
                        : 'bottom-6 right-6 w-[450px] h-[600px]'
                        }`}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-t-lg">
                        <div className="flex items-center gap-2">
                            <MessageCircle className="h-5 w-5" />
                            <h3 className="font-semibold text-lg">Chat With Interview Vault</h3>
                        </div>
                        <div className="flex items-center gap-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleClearHistory}
                                className="h-8 w-8 text-white hover:bg-purple-800"
                                aria-label="Clear chat history"
                                title="Clear chat history"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsMaximized(!isMaximized)}
                                className="h-8 w-8 text-white hover:bg-purple-800"
                                aria-label={isMaximized ? 'Minimize chat' : 'Maximize chat'}
                            >
                                {isMaximized ? (
                                    <Minimize2 className="h-4 w-4" />
                                ) : (
                                    <Maximize2 className="h-4 w-4" />
                                )}
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsOpen(false)}
                                className="h-8 w-8 text-white hover:bg-purple-800"
                                aria-label="Close chat"
                            >
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>

                    {/* Messages */}
                    <ScrollArea className="flex-1 p-4">
                        <div className="space-y-4">
                            {messages.map((message) => (
                                <div
                                    key={message.id}
                                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'
                                        }`}
                                >
                                    <div
                                        className={`max-w-[80%] rounded-lg px-4 py-2 ${message.sender === 'user'
                                            ? 'bg-purple-600 text-white'
                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                                            }`}
                                    >
                                        <div
                                            className="text-sm leading-relaxed"
                                            dangerouslySetInnerHTML={{
                                                __html: formatMessage(message.text),
                                            }}
                                        />
                                        <div
                                            className={`text-xs mt-1 ${message.sender === 'user'
                                                ? 'text-purple-200'
                                                : 'text-gray-500 dark:text-gray-400'
                                                }`}
                                        >
                                            {message.timestamp.toLocaleTimeString([], {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-2">
                                        <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    </ScrollArea>

                    {/* Input */}
                    <div className="p-4 border-t bg-gray-50 dark:bg-gray-900">
                        <div className="flex gap-2">
                            <Input
                                ref={inputRef}
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Type your message..."
                                disabled={isLoading}
                                className="flex-1"
                            />
                            <Button
                                onClick={handleSendMessage}
                                disabled={!inputMessage.trim() || isLoading}
                                className="bg-purple-600 hover:bg-purple-700"
                                size="icon"
                            >
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                            Powered by Interview Vault AI
                        </p>
                    </div>
                </Card>
            )}
        </>
    );
}
