import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, Clock, Calendar, MessageSquare, Zap, 
    Settings, Plus, Trash2, AlertCircle, CheckCircle
} from 'lucide-react';
import { useTaskStore } from '../../store/useTaskStore';
import { CreateScheduledTaskOptions, TaskInputField, TaskOutputFormat } from '../../../shared/alephnet-types';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';

interface CreateTaskDialogProps {
    isOpen: boolean;
    onClose: () => void;
    parentConversationId: string;
    initialPrompt?: string;
}

// Common cron presets
const CRON_PRESETS = [
    { label: 'Every minute', value: '* * * * *' },
    { label: 'Every 5 minutes', value: '*/5 * * * *' },
    { label: 'Every hour', value: '0 * * * *' },
    { label: 'Every day at 9am', value: '0 9 * * *' },
    { label: 'Every day at 9am and 5pm', value: '0 9,17 * * *' },
    { label: 'Every Monday at 9am', value: '0 9 * * 1' },
    { label: 'Every weekday at 9am', value: '0 9 * * 1-5' },
    { label: 'First of month at 9am', value: '0 9 1 * *' },
];

export const CreateTaskDialog: React.FC<CreateTaskDialogProps> = ({
    isOpen,
    onClose,
    parentConversationId,
    initialPrompt = ''
}) => {
    const { createTask, parseTaskRequest, loading } = useTaskStore();
    
    // Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [cronSchedule, setCronSchedule] = useState('0 9 * * *');
    const [drivingPrompt, setDrivingPrompt] = useState(initialPrompt);
    const [systemPrompt, setSystemPrompt] = useState('');
    const [inputFields, setInputFields] = useState<TaskInputField[]>([]);
    const [outputFormat, setOutputFormat] = useState<TaskOutputFormat>({ type: 'text' });
    
    // UI state
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [parseResult, setParseResult] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Parse natural language to task config
    const handleParsePrompt = async () => {
        if (!drivingPrompt.trim()) return;
        
        setError(null);
        const result = await parseTaskRequest({
            userMessage: drivingPrompt
        });
        
        if (result?.success && result.suggestedTask) {
            setTitle(result.suggestedTask.title);
            setDescription(result.suggestedTask.description || '');
            setCronSchedule(result.suggestedTask.cronSchedule);
            setDrivingPrompt(result.suggestedTask.drivingPrompt);
            setSystemPrompt(result.suggestedTask.systemPrompt || '');
            setInputFields(result.suggestedTask.inputFields || []);
            setOutputFormat(result.suggestedTask.outputFormat || { type: 'text' });
            setParseResult('Task configuration generated from your prompt!');
        } else if (result?.clarificationNeeded) {
            setParseResult(result.clarificationNeeded);
        } else if (result?.validationErrors) {
            setError(result.validationErrors.join(', '));
        }
    };

    // Add input field
    const addInputField = () => {
        setInputFields([
            ...inputFields,
            {
                name: '',
                type: 'string',
                description: '',
                required: false
            }
        ]);
    };

    // Update input field
    const updateInputField = (index: number, updates: Partial<TaskInputField>) => {
        const newFields = [...inputFields];
        newFields[index] = { ...newFields[index], ...updates };
        setInputFields(newFields);
    };

    // Remove input field
    const removeInputField = (index: number) => {
        setInputFields(inputFields.filter((_, i) => i !== index));
    };

    // Submit form
    const handleSubmit = async () => {
        if (!title.trim() || !drivingPrompt.trim() || !cronSchedule.trim()) {
            setError('Title, prompt, and schedule are required');
            return;
        }

        setError(null);
        
        const options: CreateScheduledTaskOptions = {
            title,
            description: description || undefined,
            parentConversationId,
            cronSchedule,
            drivingPrompt,
            systemPrompt: systemPrompt || undefined,
            inputFields: inputFields.filter(f => f.name.trim()),
            outputFormat
        };

        const task = await createTask(options);
        
        if (task) {
            onClose();
            // Reset form
            setTitle('');
            setDescription('');
            setDrivingPrompt('');
            setSystemPrompt('');
            setInputFields([]);
            setParseResult(null);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    onClick={onClose}
                />
                
                {/* Dialog */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-gray-900 border border-white/10 rounded-xl shadow-2xl"
                >
                    {/* Header */}
                    <div className="sticky top-0 flex items-center justify-between p-4 border-b border-white/10 bg-gray-900/95 backdrop-blur-sm z-10">
                        <div className="flex items-center gap-2">
                            <Clock size={20} className="text-blue-400" />
                            <h2 className="text-lg font-bold text-white">Create Scheduled Task</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-4 space-y-4">
                        {/* Natural Language Input */}
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                                <Zap size={14} className="text-blue-400" />
                                <span className="text-xs font-medium text-blue-400">AI Assistant</span>
                            </div>
                            <p className="text-xs text-gray-400 mb-2">
                                Describe your task in plain language and I'll help configure it:
                            </p>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="e.g., 'Send me a daily news summary every morning at 9am'"
                                    value={drivingPrompt}
                                    onChange={(e) => setDrivingPrompt(e.target.value)}
                                    className="flex-1 text-sm"
                                />
                                <Button
                                    onClick={handleParsePrompt}
                                    disabled={loading || !drivingPrompt.trim()}
                                    size="sm"
                                >
                                    Generate
                                </Button>
                            </div>
                            {parseResult && (
                                <div className="mt-2 flex items-center gap-2 text-xs text-green-400">
                                    <CheckCircle size={12} />
                                    {parseResult}
                                </div>
                            )}
                        </div>

                        {/* Error display */}
                        {error && (
                            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                <AlertCircle size={14} className="text-red-400" />
                                <span className="text-sm text-red-400">{error}</span>
                            </div>
                        )}

                        {/* Title */}
                        <div className="space-y-1.5">
                            <Label>Task Title</Label>
                            <Input
                                placeholder="e.g., Daily News Summary"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                        </div>

                        {/* Description */}
                        <div className="space-y-1.5">
                            <Label>Description (optional)</Label>
                            <Input
                                placeholder="Brief description of what this task does"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>

                        {/* Schedule */}
                        <div className="space-y-1.5">
                            <Label className="flex items-center gap-2">
                                <Calendar size={14} />
                                Schedule (Cron)
                            </Label>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="0 9 * * *"
                                    value={cronSchedule}
                                    onChange={(e) => setCronSchedule(e.target.value)}
                                    className="font-mono flex-1"
                                />
                                <select
                                    className="px-3 py-2 rounded-md bg-gray-800 border border-white/10 text-sm text-gray-300"
                                    onChange={(e) => setCronSchedule(e.target.value)}
                                    value=""
                                >
                                    <option value="" disabled>Presets...</option>
                                    {CRON_PRESETS.map(preset => (
                                        <option key={preset.value} value={preset.value}>
                                            {preset.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <p className="text-xs text-gray-500">
                                Format: minute hour day-of-month month day-of-week
                            </p>
                        </div>

                        {/* Driving Prompt */}
                        <div className="space-y-1.5">
                            <Label className="flex items-center gap-2">
                                <MessageSquare size={14} />
                                Driving Prompt
                            </Label>
                            <Textarea
                                placeholder="The prompt that will be executed on each scheduled run..."
                                value={drivingPrompt}
                                onChange={(e) => setDrivingPrompt(e.target.value)}
                                rows={4}
                            />
                            <p className="text-xs text-gray-500">
                                Use {'{{variableName}}'} to insert input field values
                            </p>
                        </div>

                        {/* Advanced Settings */}
                        <div className="border border-white/10 rounded-lg overflow-hidden">
                            <button
                                onClick={() => setShowAdvanced(!showAdvanced)}
                                className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    <Settings size={14} className="text-gray-400" />
                                    <span className="text-sm text-gray-300">Advanced Settings</span>
                                </div>
                                <motion.div
                                    animate={{ rotate: showAdvanced ? 180 : 0 }}
                                >
                                    <X size={14} className="text-gray-400 rotate-45" />
                                </motion.div>
                            </button>

                            <AnimatePresence>
                                {showAdvanced && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="border-t border-white/10"
                                    >
                                        <div className="p-3 space-y-4">
                                            {/* System Prompt */}
                                            <div className="space-y-1.5">
                                                <Label>System Prompt (optional)</Label>
                                                <Textarea
                                                    placeholder="Optional system context for the AI..."
                                                    value={systemPrompt}
                                                    onChange={(e) => setSystemPrompt(e.target.value)}
                                                    rows={2}
                                                />
                                            </div>

                                            {/* Output Format */}
                                            <div className="space-y-1.5">
                                                <Label>Output Format</Label>
                                                <select
                                                    className="w-full px-3 py-2 rounded-md bg-gray-800 border border-white/10 text-sm text-gray-300"
                                                    value={outputFormat.type}
                                                    onChange={(e) => setOutputFormat({ type: e.target.value as any })}
                                                >
                                                    <option value="text">Plain Text</option>
                                                    <option value="markdown">Markdown</option>
                                                    <option value="json">JSON</option>
                                                    <option value="html">HTML</option>
                                                </select>
                                            </div>

                                            {/* Input Fields */}
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <Label>Input Fields</Label>
                                                    <button
                                                        onClick={addInputField}
                                                        className="flex items-center gap-1 px-2 py-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                                                    >
                                                        <Plus size={12} />
                                                        Add Field
                                                    </button>
                                                </div>
                                                
                                                {inputFields.map((field, index) => (
                                                    <div key={index} className="flex items-start gap-2 p-2 bg-black/20 rounded-lg">
                                                        <Input
                                                            placeholder="Field name"
                                                            value={field.name}
                                                            onChange={(e) => updateInputField(index, { name: e.target.value })}
                                                            className="flex-1"
                                                        />
                                                        <select
                                                            className="px-2 py-2 rounded-md bg-gray-800 border border-white/10 text-sm text-gray-300"
                                                            value={field.type}
                                                            onChange={(e) => updateInputField(index, { type: e.target.value as any })}
                                                        >
                                                            <option value="string">Text</option>
                                                            <option value="number">Number</option>
                                                            <option value="boolean">Boolean</option>
                                                        </select>
                                                        <button
                                                            onClick={() => removeInputField(index)}
                                                            className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="sticky bottom-0 flex items-center justify-end gap-2 p-4 border-t border-white/10 bg-gray-900/95 backdrop-blur-sm">
                        <Button variant="ghost" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={loading || !title.trim() || !drivingPrompt.trim()}
                        >
                            Create Task
                        </Button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default CreateTaskDialog;
