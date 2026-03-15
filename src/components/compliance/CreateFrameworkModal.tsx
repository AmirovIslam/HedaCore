"use client";

import React, { useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { trpc } from "@/trpc/client";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateFrameworkModal({ isOpen, onClose, onSuccess }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [controls, setControls] = useState([
    { controlId: "AC-1", title: "Access Control", description: "", checkIds: [] as string[] }
  ]);

  const createMutation = trpc.compliance.createCustomFramework.useMutation({
    onSuccess: () => {
      onSuccess();
      onClose();
    }
  });

  if (!isOpen) return null;

  const addControl = () => {
    setControls([...controls, { controlId: "", title: "", description: "", checkIds: [] }]);
  };

  const removeControl = (index: number) => {
    setControls(controls.filter((_, i) => i !== index));
  };

  const updateControl = (index: number, field: string, value: any) => {
    const newControls = [...controls];
    (newControls[index] as any)[field] = value;
    setControls(newControls);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ name, description, controls });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-surface-900 border border-surface-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="p-6 border-b border-surface-800 flex justify-between items-center bg-surface-950/50">
          <h2 className="text-xl font-bold text-white">New Compliance Framework</h2>
          <button onClick={onClose} className="p-2 hover:bg-surface-800 rounded-lg text-surface-400 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-surface-400 mb-1.5">Framework Name</label>
              <input 
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. SOC2 Type II, Internal Security Standard"
                className="w-full bg-surface-950 border border-surface-800 rounded-xl px-4 py-2.5 text-white placeholder:text-surface-600 focus:outline-none focus:border-brand-500/50 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-400 mb-1.5">Description</label>
              <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Briefly describe the purpose of this framework..."
                className="w-full bg-surface-950 border border-surface-800 rounded-xl px-4 py-2.5 text-white placeholder:text-surface-600 focus:outline-none focus:border-brand-500/50 transition-all h-20 resize-none"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Controls & Mappings</h3>
              <button 
                type="button"
                onClick={addControl}
                className="text-xs font-bold text-brand-400 hover:text-brand-300 flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> ADD CONTROL
              </button>
            </div>

            <div className="space-y-3">
              {controls.map((control, idx) => (
                <div key={idx} className="p-4 bg-surface-950/50 border border-surface-800 rounded-xl relative group">
                  <div className="grid grid-cols-4 gap-4">
                    <div className="col-span-1">
                      <input 
                        required
                        placeholder="ID (e.g. AC-1)"
                        value={control.controlId}
                        onChange={(e) => updateControl(idx, "controlId", e.target.value)}
                        className="w-full bg-surface-900 border border-surface-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500/50"
                      />
                    </div>
                    <div className="col-span-3">
                      <input 
                        required
                        placeholder="Control Title"
                        value={control.title}
                        onChange={(e) => updateControl(idx, "title", e.target.value)}
                        className="w-full bg-surface-900 border border-surface-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500/50"
                      />
                    </div>
                  </div>
                  <div className="mt-2">
                    <input 
                      placeholder="Mapped Check IDs (comma separated)"
                      value={control.checkIds.join(", ")}
                      onChange={(e) => updateControl(idx, "checkIds", e.target.value.split(",").map(s => s.trim()))}
                      className="w-full bg-surface-900 border border-surface-800 rounded-lg px-3 py-2 text-[10px] text-surface-400 focus:outline-none focus:border-brand-500/50"
                    />
                  </div>
                  {controls.length > 1 && (
                    <button 
                      type="button"
                      onClick={() => removeControl(idx)}
                      className="absolute -right-2 -top-2 p-1.5 bg-red-500/10 text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white border border-red-500/20"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </form>

        <div className="p-6 border-t border-surface-800 bg-surface-950/50 flex justify-end gap-3">
          <button 
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-xl text-sm font-medium text-surface-400 hover:bg-surface-800 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit}
            disabled={createMutation.isPending}
            className="px-8 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-brand-600/20"
          >
            {createMutation.isPending ? "Creating..." : "Create Framework"}
          </button>
        </div>
      </div>
    </div>
  );
}
