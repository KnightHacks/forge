import { Card, CardTitle } from "@forge/ui/card";

const ALUMNI_PHOTOS: { src: string; caption: string }[] = [
  { src: "/alumni-recap/2019-crowd.jpg", caption: "Crowd at KH III" },
  { src: "/alumni-recap/DSC_0125.JPG", caption: "GuitAR at KH 7" },
  { src: "/alumni-recap/IMG_4699.JPG", caption: "KH Organizers 2017" },
  { src: "/alumni-recap/IMG_6763.JPG", caption: "KH 4 Ops Sweaters" },
  { src: "/alumni-recap/IMG_8131.JPG", caption: "KH 6 Food being Served" },
  { src: "/alumni-recap/KnightHacks.JPG", caption: "KH Crew at Bitcamp" },
  {
    src: "/alumni-recap/ThankYouAllForAttendingYouAllMeanTheWorldToUs.png",
    caption: "KH 8 Organizers",
  },
];

export default function DayInHistory() {
  // TODO: replace with real proc fetch later
  const dailyImage =
    ALUMNI_PHOTOS[Math.floor(Math.random() * ALUMNI_PHOTOS.length)]!;

  return (
    <Card className="overflow-hidden px-4">
        <CardTitle className="text-center">Day in History</CardTitle>
      <div className="">
        <img
          src={dailyImage.src}
          alt={dailyImage.caption}
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
