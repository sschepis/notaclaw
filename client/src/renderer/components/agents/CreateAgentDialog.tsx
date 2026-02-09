import React, { useState } from 'react';
import { 
  Bot, 
  Plus,
  Trash2
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Slider } from '../ui/slider';
import { useAlephStore } from '../../store/useAlephStore';

interface CreateAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DEFAULT_GOALS = [
  { name: 'accuracy', weight: 0.8 },
  { name: 'speed', weight: 0.5 },
  { name: 'creativity', weight: 0.3 },
  { name: 'safety', weight: 0.9 },
];

export const CreateAgentDialog: React.FC<CreateAgentDialogProps> = ({ open, onOpenChange }) => {
  const { createAgent } = useAlephStore();
  const [name, setName] = useState('');
  const [template, setTemplate] = useState('general-assistant');
  const [goals, setGoals] = useState(DEFAULT_GOALS);
  const [newGoalName, setNewGoalName] = useState('');

  const handleCreate = async () => {
    if (!name.trim()) return;

    // Note: API update needed to accept goalPriors on create
    // For now we just create, updates would happen after
    await createAgent(name, template);
    
    onOpenChange(false);
    setName('');
    setGoals(DEFAULT_GOALS);
  };

  const updateGoalWeight = (index: number, weight: number) => {
    const newGoals = [...goals];
    newGoals[index].weight = weight;
    setGoals(newGoals);
  };

  const removeGoal = (index: number) => {
    setGoals(goals.filter((_, i) => i !== index));
  };

  const addGoal = () => {
    if (!newGoalName.trim()) return;
    setGoals([...goals, { name: newGoalName.trim(), weight: 0.5 }]);
    setNewGoalName('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-gray-950 border-gray-800 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-purple-400" />
            Create SRIA Agent
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Basic Info */}
          <div className="space-y-3">
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Identity</label>
            <div className="space-y-2">
              <Input
                placeholder="Agent Name (e.g., Research Assistant)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-gray-900 border-gray-800"
              />
              <Select value={template} onValueChange={setTemplate}>
                <SelectTrigger className="bg-gray-900 border-gray-800">
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-800">
                  <SelectItem value="general-assistant">General Assistant</SelectItem>
                  <SelectItem value="researcher">Researcher (High Accuracy)</SelectItem>
                  <SelectItem value="creative-writer">Creative Writer (High Entropy)</SelectItem>
                  <SelectItem value="coder">Code Expert (High Precision)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Goal Priors */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Goal Priors</label>
              <span className="text-[10px] text-gray-500">Weight (0-1)</span>
            </div>
            
            <div className="space-y-3 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
              {goals.map((goal, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-24 text-xs text-gray-300 truncate" title={goal.name}>
                    {goal.name}
                  </div>
                  <div className="flex-1">
                    <Slider
                      value={[goal.weight]}
                      max={1}
                      step={0.05}
                      onValueChange={([val]) => updateGoalWeight(i, val)}
                      className="py-1"
                    />
                  </div>
                  <div className="w-8 text-right text-xs font-mono text-gray-400">
                    {goal.weight.toFixed(2)}
                  </div>
                  <button 
                    onClick={() => removeGoal(i)}
                    className="text-gray-600 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-2 border-t border-white/5">
              <Input
                placeholder="New goal..."
                value={newGoalName}
                onChange={(e) => setNewGoalName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addGoal()}
                className="h-8 text-xs bg-gray-900 border-gray-800"
              />
              <Button size="sm" variant="secondary" onClick={addGoal} className="h-8 px-2">
                <Plus size={14} />
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!name.trim()} className="bg-purple-600 hover:bg-purple-700">
            Create Agent
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};