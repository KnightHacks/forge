export default function PipesBackground() {
  return (
    <div className="absolute inset-0 -z-10">
      {/* Solid gray background */}
      <div className="absolute inset-0 bg-gray-800" />
      {/* Pipes SVG overlay */}
      <div className="absolute inset-0 bg-[url('/pipes.svg')] bg-cover bg-center bg-no-repeat opacity-20" />
    </div>
  );
}
