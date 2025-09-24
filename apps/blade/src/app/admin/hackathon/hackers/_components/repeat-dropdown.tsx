import React, { useState } from "react";

const RepeatDropdown = () => {
  const [selectedOption, setSelectedOption] = useState("none");

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedOption(event.target.value);
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <label htmlFor="repeat">Allow Repeat Check-Ins:</label>
      <select
        id="repeat"
        value={selectedOption}
        onChange={handleChange}
        className="rounded border p-2 dark:bg-black dark:text-white"
      >
        <option value="none">None</option>
        <option value="allclasses">All classes</option>
        <option value="operators">Operators</option>
        <option value="machinist">Machinist</option>
        <option value="sentinels">Sentinels</option>
        <option value="harbinger">Harbinger</option>
        <option value="beastkeeper">Beastkeeper</option>
        <option value="alchemist">Alchemist</option>
      </select>
    </div>
  );
};

export default RepeatDropdown;
