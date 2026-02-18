import { Card, CardTitle } from "@forge/ui/card";

export default function DayInHistory() {
  // TODO: replace with real fetch later
  const dailyImage = {
    src: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1600&q=80",
    alt: "Mountain landscape at sunrise",
    caption: "On this day: a breathtaking sunrise over the mountains (placeholder daily image).",
  };

  return (
    <Card className="overflow-hidden px-4">
        <CardTitle className="text-center">Day in History</CardTitle>
      <div className="">
        <img
          src={dailyImage.src}
          alt={dailyImage.alt}
          className="h-56 w-full object-cover sm:h-64"
          loading="lazy"
        />
      </div>

      <div className="p-4">
        <p className="text-sm text-muted-foreground">{dailyImage.caption}</p>
      </div>
    </Card>
  );
}
