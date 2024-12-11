import { Client, EmbedBuilder, WebhookClient } from "discord.js";
import he from "he";
import cron from "node-cron";
import fetch from "node-fetch";
import { config } from "../config";

// Google Calendar Props Interface
interface GoogleCalendarProps {
    summary: string;
    items: GoogleCalendarDataProps[];
}

// Return Data Interface
interface GoogleCalendarDataProps {
    htmlLink: string;
    summary: string;
    description: string;
    location: string;
    start: TimeProps;
    end: TimeProps;
    recurrence: string[];
    status: string;
}

// Add field for mapping
interface Messages extends GoogleCalendarDataProps {
    range: "Today" | "Tomorrow" | "Next Week";
}

// Time Interface
interface TimeProps {
    date?: string;
    dateTime?: Date;
}

// Set as a date and time to test the same day function
// a string in the form "YYYY-MM-DDTHH:MM:SS" can be passed to test a specific date and time
// const TEST_DATE = "2024-10-05T16:45:00-04:00";
const TEST_DATE = undefined;

// Google maps API URL
const today = new Date(TEST_DATE ?? new Date().toLocaleDateString());
const nextWeek = new Date(today);
nextWeek.setDate(today.getDate() + 8);
console.log("Today: ", today, "\nNext Week: ", nextWeek);

const url = `https://www.googleapis.com/calendar/v3/calendars/${
    config.GOOGLE_CALENDAR_ID
}/events?key=${
    config.GOOGLE_API_KEY
}&timeMax=${nextWeek.toISOString()}&timeMin=${today.toISOString()}`;
console.log(url);

// Function to fetch all of the events
const fetchEvents = async (url: string) => {
    try {
        const res = await fetch(url);

        if (!res.ok) {
            throw new Error(`Error: ${res.status}`);
        }

        const data = (await res.json()) as GoogleCalendarProps;
        return data;
    } catch (err) {
        console.log(`Error: ${err}`);
        throw err;
    }
};

// Check if two dates are the same day
function isSameDay(date1: Date, date2: Date, event?: string): boolean {
    // Normalize dates to midnight UTC
    const normalizeDate = (date: Date) =>
        new Date(
            Date.UTC(
                date.getUTCFullYear(),
                date.getUTCMonth(),
                date.getUTCDate()
            )
        );

    const d1 = normalizeDate(date1);
    const d2 = normalizeDate(date2);

    const result = d1.getTime() === d2.getTime();

    // console.log(
    //     `Date1: ${d1.toISOString()}`,
    //     `Date2: ${d2.toISOString()}`,
    //     `Event: ${event}`,
    //     `Are the same day? ${result}`
    // );

    return result;
}

// Check if date2 occurs exactly 15 minutes after date1
function isFifteenMinutesApart(
    date1: Date,
    date2: Date,
    event?: string
): boolean {
    // Helper function to format time as HH:MM:SS
    const formatTime = (date: Date) => date.toTimeString().split(" ")[0]; // Extract HH:MM:SS from the full time string

    // Log the times of date1 and date2
    // console.log("15 MINUTE EVENT:", event);
    // console.log("DATE1 TIME:", formatTime(date1));
    // console.log("DATE2 TIME:", formatTime(date2));

    // Get the time difference in milliseconds
    const diff = Math.abs(date2.getTime() - date1.getTime());

    // Convert the time difference to minutes
    const diffMinutes = Math.floor(diff / 60000); // 60000 ms = 1 minute

    // console.log("TIME DIFFERENCE IN MINUTES:", diffMinutes);

    // Return true if the difference is exactly 15 minutes
    return diffMinutes === 15;
}

// remove html tags from a piece of text
// as the returned description from gcal api returns with tags
function removeHTMLTags(str: string) {
    if (str && typeof str === "string") {
        return str.replace(/(<([^>]+)>)/gi, "");
    } else {
        throw new TypeError(
            "The value passed to removeHTMLTags is not a string!"
        );
    }
}

// date obj to string
function dateToString(date: Date) {
    date = new Date(date.toLocaleDateString());
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return month + "/" + day + "/" + year;
}

// Date Interface
interface DateProps {
    start: string;
    end: string;
    date?: string;
}

// Grab the start and end date or time, depending if the event is multi or single day in duration
function getDateProps(
    date1: Date | string,
    date2: Date | string,
    event?: string
) {
    const dateObject: DateProps = {
        start: "",
        end: "",
        date: undefined,
    };

    // add one to month due to a bug that showed the previous month
    // if the root cause of this issue is found, you can take steps to fix it
    const newDate = new Date(date1);
    newDate.setHours(newDate.getHours());
    const startDateString = dateToString(newDate);

    const newDate2 = new Date(date2);
    newDate2.setHours(newDate2.getHours());
    const endDateString = dateToString(newDate2);

    // console.log("CHECKING DATE PROPS:", event, newDate, newDate2);

    // Set start and end to times, and include the date
    if (
        isSameDay(newDate, newDate2, `${event} SAME DAY CHECK FOR DATE FORMAT`)
    ) {
        // console.log("Same day event");
        const hours1 = newDate.getHours();
        const minutes1 = newDate.getMinutes().toString().padStart(2, "0");
        const hours2 = newDate2.getHours();
        const minutes2 = newDate2.getMinutes().toString().padStart(2, "0");

        const period1 = hours1 >= 12 ? "PM" : "AM";
        const period2 = hours2 >= 12 ? "PM" : "AM";

        const formattedHours1 = (hours1 % 12 || 12).toString();
        const formattedHours2 = (hours2 % 12 || 12).toString();

        dateObject.start = formattedHours1 + ":" + minutes1 + " " + period1;
        dateObject.end = formattedHours2 + ":" + minutes2 + " " + period2;
        dateObject.date = startDateString;
    } else {
        // Set start and end to dates
        dateObject.start = startDateString;
        dateObject.end = endDateString;
    }

    return dateObject;
}

async function createDiscordEvents(
    events: GoogleCalendarDataProps[],
    client: Client
) {
    // Filter out operations meetings, as they mess with event creation
    const filteredEvents = events.filter(
        (event) => event.summary !== "Operations Meeting"
    );

    // console.log("ALL EVENTS IN THE CREATE DISCORD EVENTS FUNCTION =========");
    filteredEvents.forEach((event) => {
        console.log(event.summary, event.start.dateTime);
    });

    const guildId = "486628710443778071";
    const guild = client.guilds.cache.get(guildId);

    if (!guild) {
        console.error(`Guild with ID ${guildId} not found`);
        return; // Return early if guild isn't found
    }

    // Fetch existing scheduled events once
    const existingEvents = await guild.scheduledEvents.fetch();

    // console.log("EXISTING EVENTS FETCHED:", existingEvents.size);

    // Use Promise.all to ensure all events are processed concurrently
    await Promise.all(
        filteredEvents.map(async (event) => {
            // console.log("PROCESSING EVENT:", event.summary);

            // Check if the event already exists
            const existingEvent = existingEvents.find(
                (e) => e.name === event.summary
            );

            if (existingEvent) {
                // console.log("EVENT ALREADY EXISTS:", event.summary);
                return; // Skip the event creation if it already exists
            }

            // console.log("CREATING EVENT:", event.summary);

            try {
                await guild.scheduledEvents.create({
                    name: event.summary,
                    scheduledStartTime: new Date(
                        event.start.dateTime ?? event.start.date ?? "6/9/1969"
                    ),
                    scheduledEndTime: new Date(
                        event.end.dateTime ?? event.end.date ?? "6/9/1969"
                    ),
                    privacyLevel: 2, // 2 corresponds to 'GUILD_ONLY'
                    entityType: 3, // 3 corresponds to 'EXTERNAL'
                    entityMetadata: {
                        location: event.location || "No location provided",
                    },
                    description: event.description || "No description provided",
                });
                // console.log("GUILD EVENT CREATED:", event.summary);
            } catch (err) {
                console.error(
                    "ERROR WHILE CREATING EVENT:",
                    event.summary,
                    err
                );
            }
        })
    );

    console.log("ALL EVENTS PROCESSED");
}

// Grab all events that are today, tomorrow, or in a week
async function getValidEvents(data: GoogleCalendarDataProps[]) {
    // sets all consts to a new date with the local timezone.
    const today = new Date(TEST_DATE ?? new Date().toLocaleDateString());

    const validEvents: GoogleCalendarDataProps[] = [];
    // filters out "cancelled" events from the initial data and objects that are recurring, and obj.recurrence is not null
    // remove elements with the same summary, keeping the greatest date
    // this is to prevent duplicate events from being displayed
    const allEvents = data.reduce(
        (acc: GoogleCalendarDataProps[], event: GoogleCalendarDataProps) => {
            const existingEvent = acc.find((e) => e.summary === event.summary);
            if (existingEvent) {
                const existingDate = new Date(
                    existingEvent.start.dateTime ??
                        existingEvent.start.date ??
                        ""
                );
                const currentDate = new Date(
                    event.start.dateTime ?? event.start.date ?? ""
                );
                if (currentDate > existingDate) {
                    acc = acc.filter((e) => e.summary !== event.summary);
                    acc.push(event);
                }
            } else {
                acc.push(event);
            }
            return acc;
        },
        []
    );

    // Print all summaries and start dates
    // allEvents.map((obj: GoogleCalendarDataProps) => {
    //     console.log(obj.summary, obj.start.dateTime);
    // });

    // maps through the filtered events
    allEvents.map((obj: GoogleCalendarDataProps) => {
        // gets the event date based on two fields from the API
        // also sets this to local time zone
        const eventDate = new Date(
            new Date(obj.start.dateTime ?? obj.start.date ?? "TBA")
        );

        if (isFifteenMinutesApart(today, eventDate, obj.summary)) {
            console.log("FIFTEEN MINUTES APART:", obj.summary, eventDate);
            validEvents.push({
                ...obj,
            });
        }
    });

    return validEvents;
}

async function hookLogic(client: Client, webhook: WebhookClient) {
    const data = await fetchEvents(url);

    const allEvents = data.items
        .filter((event) => event.status !== "cancelled")
        .filter((event) => event.recurrence !== null)
        .filter((event) => event.summary !== "Kickstart Meeting");

    // Create event on Discord for the upcoming event
    // createDiscordEvents(allEvents, client);

    console.log("Checking for events...");
    const events = await getValidEvents(allEvents);

    // Print valid events
    // events.map((event) => {
    //     console.log("VALID EVENT: ", event.summary, event.start.dateTime);
    // });

    if (events.length === 0) {
        return;
    } else if (events.length >= 1) {
        let messageDate = today;
        if (TEST_DATE) {
            messageDate = new Date(TEST_DATE);
            messageDate.setDate(messageDate.getDate() + 1);
        } // for some reason its one day behind when using a test date.

        // Get the current time in HH:MM:SS format
        const currentTime = today.toTimeString().split(" ")[0];

        // Convert to AM/PM format
        const hours = parseInt(currentTime.split(":")[0]);
        const minutes = parseInt(currentTime.split(":")[1]);
        const period = hours >= 12 ? "PM" : "AM";
        const formattedHours = (hours % 12 || 12).toString();
        const formattedMinutes = minutes.toString().padStart(2, "0");

        // Construct the final time string
        const timeString = `${formattedHours}:${formattedMinutes} ${period}`;

        webhook.send(
            `Get excited scallywags, it is ${timeString}, and here are some events occurring in the next **FIFTEEN MINUTES!** <@&${config.CALENDAR_ROLE_ID}>`
        );
    }

    events.map((event) => {
        const date = getDateProps(
            event.start.dateTime ?? event.start.date ?? "6/9/1969",
            event.end.dateTime ?? event.end.date ?? "6/9/1969",
            event.summary
        );

        // Conditionally render the fields based off the date
        const fields = [
            {
                name: "Location",
                value: event.location ?? "TBA",
                inline: true,
            },
            {
                name: "Start",
                value: `${date.start}`,
                inline: true,
            },
            {
                name: "End",
                value: `${date.end}`,
                inline: true,
            },
        ];

        // Create the embed
        const eventEmbed = new EmbedBuilder()
            .setColor(0x33e0ff)
            .setTitle(event.summary)
            .setURL(event.htmlLink)
            .setDescription(
                he.decode(removeHTMLTags(event.description ?? "TBA") ?? "TBA")
            )
            .addFields(fields)

            .setFooter({
                text: "We hope to see you there! - the Knight Hacks Crew :)",
            });

        // Send the message
        return webhook.send({
            embeds: [eventEmbed],
        });
    });
}

export async function execute(client: Client) {
    // Create a new Webhook client instance
    const webhook = new WebhookClient({
        url: config.CALENDAR_WEBHOOK_URL,
    });

    try {
        cron.schedule("*/1 * * * *", async () => hookLogic(client, webhook));
    } catch (err: unknown) {
        // silences eslint. type safety with our errors basically
        err instanceof Error
            ? console.error(err.message)
            : console.error("An unknown error occurred: ", err);
    }
}
