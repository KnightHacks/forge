const Stars = () => {
  const stars = Array.from({ length: 100 }).map((_, index) => {
    const top = Math.random() * 100;
    const left = Math.random() * 100;

    return (
      <div
        key={index}
        className="absolute h-1 w-1 rounded-full bg-white"
        style={{
          top: `${top}%`,
          left: `${left}%`,
        }}
      ></div>
    );
  });
  return (
    <div className="absolute z-0 h-full w-full overflow-clip">{stars}</div>
  );
};

export default Stars;
