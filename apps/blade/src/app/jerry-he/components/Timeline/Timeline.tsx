import Title from "../Title";
import timeline from "./timelineData";
import TimeLineItem from "./TimelineItem";

function Timeline() {
  return (
    <div className="my-20 w-full md:w-7/12 md:flex-row">
      <div>
        <Title>Dev Timeline</Title>
        {timeline.map((item) => (
          <TimeLineItem
            year={item.year}
            title={item.title}
            duration={item.duration}
            details={item.details}
          />
        ))}
      </div>
    </div>
  );
}

export default Timeline;
