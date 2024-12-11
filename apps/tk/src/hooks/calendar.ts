import {
    WebhookClient,
    EmbedBuilder,
    Client,
} from "discord.js";
import fetch from "node-fetch";
import cron from "node-cron";
import { config } from "../config";
import he from "he";

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

// Set as a date to test the same day function
// a string in the form "YYYY-MM-DD" can be passed to test a specific date
const TEST_DATE = undefined;

// Google maps API URL
const today = new Date(TEST_DATE ?? new Date().toLocaleDateString());
const nextWeek = new Date(today);
let operationsDate: Date | undefined = undefined; // to pass into the hook
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
        new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

    const d1 = normalizeDate(date1);
    const d2 = normalizeDate(date2);

    const result = d1.getTime() === d2.getTime();

    console.log(
        `Date1: ${d1.toISOString()}`,
        `Date2: ${d2.toISOString()}`,
        `Event: ${event}`,
        `Are the same day? ${result}`
    );

    return result;
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

    console.log("CHECKING DATE PROPS:", event, newDate, newDate2);

    // Set start and end to times, and include the date
    if (
        isSameDay(newDate, newDate2, `${event} SAME DAY CHECK FOR DATE FORMAT`)
    ) {
        console.log("Same day event");
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

// Function to create discord event
async function createDiscordEvents(
    events: GoogleCalendarDataProps[], 
    client: Client) {

    // filter out operations meetings, as they mess with event creation
    const filteredEvents = events
                    .filter((event) => event.summary !== "Operations Meeting");

    // Iterate through the next week events
    filteredEvents.map(async (event) => {
        console.log(event.summary);
        // Create a guild event for each event using the discord client
        for (const guild of client.guilds.cache.values()) {
            try {
                if (guild.id != "486628710443778071") {
                    continue;
                }
                // Check if the event already exists
                const existingEvents = await guild.scheduledEvents.fetch();

                // If the event already exists, skip
                if (existingEvents.some((e) => e.name === event.summary)) {
                    console.log(
                        `Event "${event.summary}" already exists in guild "${guild.name}". Skipping creation.`
                    );
                    continue;
                }

                await guild.scheduledEvents.create({
                    name: event.summary,
                    scheduledStartTime: new Date(
                        event.start.dateTime ?? event.start.date ?? "6/9/1969"
                    ),
                    scheduledEndTime: new Date(
                        event.end.dateTime ?? event.end.date ?? "6/9/1969"
                    ),
                    privacyLevel: 2, // 2 corresponds to 'GUILD_ONLY' (visible only to guild members)
                    entityType: 3, // 3 corresponds to 'EXTERNAL' (for external events)
                    entityMetadata: {
                        location: event.location,
                    },
                    description: event.description,
                });
            } catch (err) {
                console.error(err);
            }
        }
    });
}

// Grab all events that are today, tomorrow, or in a week
async function getValidEvents(data: GoogleCalendarDataProps[]) {
    // sets all consts to a new date with the local timezone.
    const today = new Date(TEST_DATE ?? new Date().toLocaleDateString());
    const tomorrow = new Date(today);
    const nextWeek = new Date(today);

    // offsets tomorrow and nextweek appropriately (you can do this to add days to a date)
    tomorrow.setDate(today.getDate() + 1);
    nextWeek.setDate(today.getDate() + 7);

    const validEvents: Messages[] = [];
    // filters out "cancelled" events from the initial data and objects that are recurring, and obj.recurrence is not null
    // remove elements with the same summary, keeping the greatest date
    // this is to prevent duplicate events from being displayed
    const allEvents = data.reduce(
            (
                acc: GoogleCalendarDataProps[],
                event: GoogleCalendarDataProps
            ) => {
                const existingEvent = acc.find(
                    (e) => e.summary === event.summary
                );
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
    allEvents.map((obj: GoogleCalendarDataProps) => {
        console.log(obj.summary, obj.start.dateTime);
    });

    // maps through the filtered events
    allEvents.map((obj: GoogleCalendarDataProps) => {
        // gets the event date based on two fields from the API
        // also sets this to local time zone
        let eventDate = new Date(
            new Date(
                obj.start.dateTime ?? obj.start.date ?? "TBA"
            ).toLocaleDateString()
        );

        // the ops meeting event caused so many issues.
        // we decided to hardcode it, and so,
        // this sets the ops meeting's date to the monday within 
        // the next 7 days (or today if today's the meeting).
        if(obj.summary.includes("Operations Meeting")) {
            if (today.getDay() == 1) {
                eventDate = today;
                operationsDate = eventDate;
            } else {
                const daysOfWeek = today.getDay() + 1;
                const daysUntilMonday = (8 - daysOfWeek) % 7;
                eventDate = new Date(today);
                eventDate.setDate(today.getDate() + daysUntilMonday);
                operationsDate = eventDate;
            }
        }

        console.log(today, tomorrow, nextWeek);
        if (isSameDay(today, eventDate, `${obj.summary} TODAY`)) {
            validEvents.push({
                ...obj,
                range: "Today",
            });
        } else if (isSameDay(tomorrow, eventDate, `${obj.summary} TOMORROW`)) {
            validEvents.push({
                ...obj,
                range: "Tomorrow",
            });
        } else if (isSameDay(nextWeek, eventDate, `${obj.summary} NEXT WEEK`)) {
            validEvents.push({
                ...obj,
                range: "Next Week",
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
    createDiscordEvents(allEvents, client);

    console.log("Checking for events...");
    const events = await getValidEvents(allEvents);

    if (events.length === 0) {
        return;
    } else if (events.length >= 1) {
        let messageDate = today;
        if (TEST_DATE) {
            messageDate = new Date(TEST_DATE);
            messageDate.setDate(messageDate.getDate() + 1);
        } // for some reason its one day behind when using a test date.

        webhook.send(
            `Hey <@&${config.CALENDAR_ROLE_ID}>, it's ${dateToString(messageDate)}, here are some reminders about our upcoming events!\n`
        );
    }

    // Sort events by today, then tomorrow, then next week
    events.sort((a, b) => {
        if (a.range === "Today") {
            return -1;
        } else if (b.range === "Today") {
            return 1;
        } else if (a.range === "Tomorrow") {
            return -1;
        } else if (b.range === "Tomorrow") {
            return 1;
        } else if (a.range === "Next Week") {
            return -1;
        } else {
            return 1;
        }
    });

    events.map((event) => {
        const prefix = event.range;
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
                inline: date ? true : false,
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

        if (date.date) {
            fields.splice(1, 0, {
                name: "Date",
                value: `${
                    operationsDate ? dateToString(operationsDate) : date.date
                }`, // if date is an ops meeting, set it to that specific date
                inline: false,
            });
        }

        // Create the embed
        const eventEmbed = new EmbedBuilder()
            .setColor(0x33e0ff)
            .setTitle(event.summary)
            .setURL(event.htmlLink)
            .setAuthor({
                name: `${prefix}!`,
                iconURL: "https://i.imgur.com/0BR5rSn.png",
            })
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

    // Create a new Webhook client instance
    const preWebhook = new WebhookClient({
        url: config.PRE_CALENDAR_WEBHOOK_URL,
    });

    try {
        // Check events on a schedule
        cron.schedule("0 8 * * *", async () => hookLogic(client, preWebhook));
        // cron.schedule("0 12 * * *", async () => hookLogic(client, webhook));
        // Catch any errors
    } catch (err: unknown) {
        // silences eslint. type safety with our errors basically
        err instanceof Error
            ? console.error(err.message)
            : console.error("An unknown error occurred: ", err);
    }
}
