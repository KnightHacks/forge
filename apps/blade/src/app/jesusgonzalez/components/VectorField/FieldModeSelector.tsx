'use client';

import React from 'react';
import type { FieldMode } from './types';

interface FieldModeSelectorProps {
    mode: FieldMode;
    onModeChange: (mode: FieldMode) => void;
}

const modes: { value: FieldMode; label: string }[] = [
    { value: 'mouse', label: 'Mouse Follow' },
    { value: 'swirl', label: 'Swirl' },
    { value: 'radial', label: 'Radial' },
    { value: 'sink', label: 'Sink' },
];

const FieldModeSelector = ({ mode, onModeChange }: FieldModeSelectorProps) => {
    return (
        <div className="bg-slate-800/50 rounded-lg p-1 flex gap-1">
            {modes.map((m) => (
                <button
                    key={m.value}
                    onClick={() => onModeChange(m.value)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        mode === m.value
                            ? 'bg-violet-500 text-white'
                            : 'text-gray-400 hover:bg-slate-700/50'
                    }`}
                >
                    {m.label}
                </button>
            ))}
        </div>
    );
};

export default FieldModeSelector;
