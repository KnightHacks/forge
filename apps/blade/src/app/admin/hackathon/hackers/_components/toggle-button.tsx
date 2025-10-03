import React from "react";

interface ToggleButtonProps {
  isToggled: boolean;
  onToggle: (value: boolean) => void;
}

const ToggleButton: React.FC<ToggleButtonProps> = ({ isToggled, onToggle }) => {
  return (
    <div className="flex items-center font-semibold">
      <span className="mr-10 text-sm">Repeated Check-in</span>
      <button
        type="button"
        onClick={() => onToggle(!isToggled)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 ${
          isToggled ? "bg-primary" : "bg-gray-400"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-black transition-transform duration-300 ${
            isToggled ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
};

export default ToggleButton;
