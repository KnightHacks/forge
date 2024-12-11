import { relations, sql } from "drizzle-orm";
import {
    text,
    integer,
    sqliteTable,
    primaryKey,
    unique,
    uniqueIndex,
} from "drizzle-orm/sqlite-core";

import {
    APPLICATION_STATUSES,
    COUNTRIES,
    LEVELS_OF_STUDY,
    MAJORS,
    SHIRT_SIZES,
    SPONSOR_TIERS,
} from "./../consts";

export const users = sqliteTable(
    "users",
    {
        id: integer("id").primaryKey({ autoIncrement: true }),
        clerkID: text("clerk_id").notNull().unique(),
        email: text("email").notNull().unique(),
        firstName: text("first_name").notNull(),
        lastName: text("last_name").notNull(),
    },
    (t) => ({
        emailIndex: uniqueIndex("email_index").on(t.email),
    })
);

// A user can make multiple hacker applications and have one metadata entry
export const usersRelations = relations(users, ({ many, one }) => {
    return {
        hackers: many(hackers),
        profile: one(userProfiles, {
            fields: [users.id],
            references: [userProfiles.userID],
        }),
    };
});

export const userProfiles = sqliteTable("user_profiles", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userID: integer("user_id")
        .references(() => users.id, {
            onDelete: "cascade", // If the user is deleted, delete the metadata
            onUpdate: "cascade", // If the user is updated, update the metadata
        })
        .notNull(),
    isMember: integer("is_member", { mode: "boolean" }).default(false), // Whether or not they are a dues paying member
    phone: text("phone").notNull().unique(),
    age: integer("age").notNull(),
    shirtSize: text("shirt_size", {
        enum: SHIRT_SIZES,
    }).notNull(),
    gender: text("gender").notNull(),
    ethnicity: text("ethnicity").notNull(),
    discord: text("discord").notNull(),
    major: text("major", { enum: MAJORS }).notNull(),
    school: text("school").notNull(),
    gradYear: text("grad_year").notNull(),
    levelOfStudy: text("level_of_study", {
        enum: LEVELS_OF_STUDY,
    }).default("Undergraduate University (3+ year)"),
    address1: text("address1").notNull(),
    address2: text("address2"),
    city: text("city").notNull(),
    state: text("state").notNull(),
    zip: text("zip").notNull(),
    country: text("country", {
        enum: COUNTRIES,
    }).notNull(),
    github: text("github"),
    personalWebsite: text("personal_website"),
    linkedin: text("linkedin"),
    resume: text("resume"), // Link to resume
});

export const userProfileRelations = relations(userProfiles, ({ one }) => {
    return {
        user: one(users, {
            fields: [userProfiles.userID],
            references: [users.id],
            relationName: "profile",
        }),
    };
});

export const hackers = sqliteTable(
    "hackers",
    {
        id: integer("id").primaryKey({ autoIncrement: true }),
        userID: integer("user_id")
            .references(() => users.id, {
                onDelete: "cascade", // If the user is deleted, delete the hacker
                onUpdate: "cascade", // If the user is updated, update the hacker
            })
            .notNull(),
        hackathonID: integer("hackathon_id")
            .references(() => hackathons.id, {
                onDelete: "cascade", // If the hackathon is deleted, delete the hacker
                onUpdate: "cascade", // If the hackathon is updated, update the hacker
            })
            .notNull(),
        status: text("status", {
            enum: APPLICATION_STATUSES,
        })
            .default("pending")
            .notNull(),
        survey1: text("survey_1").notNull(),
        survey2: text("survey_2").notNull(),
        isFirstTime: integer("is_first_time", { mode: "boolean" }).default(
            false
        ),
        isPlinktern: integer("is_plinktern", { mode: "boolean" }).default(
            false
        ),
        agreesToReceiveEmailsFromMLH: integer(
            "agrees_to_receive_emails_from_mlh",
            {
                mode: "boolean",
            }
        ).default(false),
    },
    (t) => ({
        unq: unique().on(t.userID, t.hackathonID),
    })
);

// Hackers can only have one user
export const hackersRelations = relations(hackers, ({ one }) => {
    return {
        user: one(users, {
            fields: [hackers.userID],
            references: [users.id],
        }),
        hackathon: one(hackathons, {
            fields: [hackers.hackathonID],
            references: [hackathons.id],
        }),
    };
});

export const hackathons = sqliteTable(
    "hackathons",
    {
        id: integer("id").primaryKey({ autoIncrement: true }),
        name: text("name").notNull(),
        startDate: text("start_date").notNull(),
        endDate: text("end_date").notNull(),
        theme: text("theme"),
    },
    (t) => ({
        startDateIndex: uniqueIndex("start_date_index").on(t.startDate),
        endDateIndex: uniqueIndex("end_date_index").on(t.endDate),
    })
);

export const hackathonsRelations = relations(hackathons, ({ many }) => {
    return {
        hackers: many(hackers),
        sponsors: many(sponsors),
    };
});

export const sponsors = sqliteTable("sponsors", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    logo: text("logo").notNull(),
    website: text("website").notNull(),
    tier: text("tier", { enum: SPONSOR_TIERS }).notNull(),
    hackathonID: integer("hackathon_id")
        .references(() => hackathons.id, {
            onDelete: "cascade", // If the hackathon is deleted, delete the hacker
            onUpdate: "cascade", // If the hackathon is updated, update the hacker
        })
        .notNull(),
});

export const sponsorsRelations = relations(sponsors, ({ one }) => {
    return {
        hackathon: one(hackathons, {
            fields: [sponsors.hackathonID],
            references: [hackathons.id],
        }),
    };
});

// EVENTS LOGIC

// Events table
export const events = sqliteTable("events", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    password: text("password").notNull(),
    point_value: integer("point_value").notNull(),
    num_attended: integer("num_attended").notNull().default(0),
});

// One event can have many users that have attended
export const eventsRelations = relations(events, ({ many }) => ({
    usersToEvents: many(usersToEvents),
}));

// Users table
export const eventUsers = sqliteTable("event_users", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    group_id: integer("group_id").notNull(),
    discord_id: text("discord_id").notNull(),
    username: text("username").notNull(),
    points: integer("points").notNull().default(0),
    num_attended: integer("num_attended").notNull().default(1),
});

// One user can attend many events
export const eventUsersRelations = relations(eventUsers, ({ many }) => ({
    usersToEvents: many(usersToEvents),
}));

export const usersToEvents = sqliteTable(
    "user_to_events",
    {
        user_id: integer("user_id")
            .notNull()
            .references(() => eventUsers.id),
        event_id: integer("event_id")
            .notNull()
            .references(() => events.id),
    },
    (t) => ({
        pk: primaryKey({ columns: [t.user_id, t.event_id] }),
    })
);

export const usersToEventsRelations = relations(usersToEvents, ({ one }) => ({
    event: one(events, {
        fields: [usersToEvents.event_id],
        references: [events.id],
    }),
    event_user: one(eventUsers, {
        fields: [usersToEvents.user_id],
        references: [eventUsers.id],
    }),
}));

// GROUP SCHEMA
// Eight groups, each storing the group name, ROLE ID, and many users
export const groups = sqliteTable("groups", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    role_id: text("role_id").notNull(),
    number_of_users: integer("number_of_users").notNull().default(0),
    image: text("image_url"),
});
