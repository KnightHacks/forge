interface TimelineItemProps {
  year: string;
  title: string;
  duration: string;
  details: string;
}

function TimeLineItem({ year, title, duration, details }: TimelineItemProps) {
  return (
    <ol className="relative flex flex-col border-l border-stone-200 dark:border-stone-700 md:flex-row">
      <li className="mb-10 ml-4">
        <div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border border-white bg-stone-200 dark:border-stone-900 dark:bg-stone-700"></div>
        <div className="flex flex-row flex-wrap items-center justify-start gap-4 text-xs md:text-sm">
          <span className="inline-block rounded-md bg-stone-900 px-2 py-1 font-semibold text-white dark:bg-white dark:text-stone-900">
            {year}
          </span>
          <div className="text-lg font-semibold text-stone-900 dark:text-white">
            {title}
          </div>
          <div className="my01 text-sm font-normal leading-none text-stone-400">
            {duration}
          </div>
        </div>
        <p className="my-2 text-base font-normal text-stone-500">{details}</p>
      </li>
    </ol>
  );
}

export default TimeLineItem;
