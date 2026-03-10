import Image from "next/image";

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
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor(
    (now.getTime() - startOfYear.getTime()) / 86_400_000,
  );
  const dailyImage = ALUMNI_PHOTOS[dayOfYear % ALUMNI_PHOTOS.length] ?? {
    src: "/alumni-recap/2019-crowd.jpg",
    caption: "Crowd at KH III",
  };

  return (
    <Card className="overflow-hidden px-4">
      <CardTitle className="text-center">Day in History</CardTitle>
      <div className="">
        <Image
          src={dailyImage.src}
          alt={dailyImage.caption}
          width={800}
          height={400}
          className="h-56 w-full object-cover sm:h-64"
        />
      </div>

      <div className="p-4">
        <p className="text-sm text-muted-foreground">{dailyImage.caption}</p>
      </div>
    </Card>
  );
}
