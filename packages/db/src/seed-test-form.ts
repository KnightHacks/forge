/**
 * Test seed script for creating a sample form with responses
 * This is for development/testing purposes only
 */

import type { JSONSchema7 } from "json-schema";
import type { FormType, ValidatorOptions } from "@forge/consts/knight-hacks";

import { db } from "./client";
import { FormsSchemas, FormResponse } from "./schemas/knight-hacks";
import { User } from "./schemas/auth";

// Copy of generateJsonSchema to avoid importing utils.ts (which has resend dependency)
type OptionalSchema =
  | { success: true; schema: JSONSchema7 }
  | { success: false; msg: string };

function createJsonSchemaValidator({
  optional,
  type,
  options,
  min,
  max,
}: ValidatorOptions): OptionalSchema {
  const schema: JSONSchema7 = {};

  switch (type) {
    case "SHORT_ANSWER":
    case "PARAGRAPH":
      schema.type = "string";
      break;
    case "EMAIL":
      schema.type = "string";
      schema.format = "email";
      break;
    case "PHONE":
      schema.type = "string";
      schema.pattern = "^\\+?\\d{7,15}$";
      break;
    case "DATE":
      schema.type = "string";
      schema.format = "date";
      break;
    case "TIME":
      schema.type = "string";
      schema.pattern = "^([01]\\d|2[0-3]):([0-5]\\d)$";
      break;
    case "NUMBER":
    case "LINEAR_SCALE":
      schema.type = "number";
      break;
    case "MULTIPLE_CHOICE":
    case "DROPDOWN":
      if (!options?.length)
        return {
          success: false,
          msg: "Options are required for multiple choice / dropdown",
        };
      schema.type = "string";
      schema.enum = options;
      break;
    case "CHECKBOXES":
      if (!options?.length)
        return { success: false, msg: "Options required for checkboxes" };
      schema.type = "array";
      schema.items = { type: "string", enum: options };
      break;
    default:
      schema.type = "string";
  }

  if (min !== undefined) {
    if (schema.type === "string") schema.minLength = min;
    if (schema.type === "array") schema.minItems = min;
    if (schema.type === "number") schema.minimum = min;
  } else {
    if (schema.type === "array" && !optional) schema.minItems = 1;
  }

  if (max !== undefined) {
    if (schema.type === "string") schema.maxLength = max;
    if (schema.type === "array") schema.maxItems = max;
    if (schema.type === "number") schema.maximum = max;
  }

  return { success: true, schema };
}

function generateJsonSchema(form: FormType): OptionalSchema {
  const schema: JSONSchema7 = {
    type: "object",
    properties: {},
    required: [],
    additionalProperties: false,
  };

  const properties: Record<string, JSONSchema7> = {};
  const required: string[] = [];

  for (const formQuestion of form.questions) {
    const { question, optional, ...rest } = formQuestion;
    const convert = createJsonSchemaValidator({ optional, ...rest });
    if (convert.success) properties[question] = convert.schema;
    else return convert;

    if (!optional) {
      required.push(question);
    }
  }

  schema.properties = properties;
  if (required.length > 0) {
    schema.required = required;
  }

  return { success: true, schema };
}

async function seedTestForm() {
  console.log("🌱 Seeding test form data...");

  // Define a test form
  const testForm = {
    name: "test-survey",
    description: "A test survey for development",
    questions: [
      {
        question: "What is your favorite programming language?",
        type: "MULTIPLE_CHOICE" as const,
        options: ["JavaScript", "TypeScript", "Python", "Rust", "Go"],
        optional: false,
      },
      {
        question: "How many years of experience do you have?",
        type: "LINEAR_SCALE" as const,
        min: 0,
        max: 10,
        optional: false,
      },
      {
        question: "What do you like about Knight Hacks?",
        type: "PARAGRAPH" as const,
        optional: true,
      },
    ],
  };

  // Generate JSON schema for validation
  const jsonSchema = generateJsonSchema(testForm);

  if (!jsonSchema.success) {
    console.error("❌ Failed to generate JSON schema:", jsonSchema.msg);
    return;
  }

  // Insert the form schema
  await db
    .insert(FormsSchemas)
    .values({
      name: testForm.name,
      formData: testForm,
      formValidatorJson: jsonSchema.schema,
    })
    .onConflictDoUpdate({
      target: FormsSchemas.name,
      set: {
        formData: testForm,
        formValidatorJson: jsonSchema.schema,
      },
    });

  console.log("✅ Created test form:", testForm.name);

  // Get some user IDs to create responses for
  const users = await db.select({ id: User.id }).from(User).limit(5);

  if (users.length === 0) {
    console.log("⚠️  No users found in database. Skipping response creation.");
    console.log("   Create some users first, then run this script again.");
    return;
  }

  console.log(`📝 Found ${users.length} users, creating test responses...`);

  // Create some test responses
  const sampleResponses = [
    {
      "What is your favorite programming language?": "TypeScript",
      "How many years of experience do you have?": 3,
      "What do you like about Knight Hacks?": "Great community and learning opportunities!",
    },
    {
      "What is your favorite programming language?": "Python",
      "How many years of experience do you have?": 5,
      "What do you like about Knight Hacks?": "The hackathons are amazing!",
    },
    {
      "What is your favorite programming language?": "JavaScript",
      "How many years of experience do you have?": 2,
      "What do you like about Knight Hacks?": "",
    },
    {
      "What is your favorite programming language?": "Rust",
      "How many years of experience do you have?": 7,
      "What do you like about Knight Hacks?": "Love the technical workshops and mentorship.",
    },
    {
      "What is your favorite programming language?": "Go",
      "How many years of experience do you have?": 4,
      "What do you like about Knight Hacks?": "The collaborative environment is fantastic.",
    },
  ];

  // Insert responses for each user
  for (let i = 0; i < Math.min(users.length, sampleResponses.length); i++) {
    await db
      .insert(FormResponse)
      .values({
        form: testForm.name,
        userId: users[i]!.id,
        responseData: sampleResponses[i],
      })
      .onConflictDoUpdate({
        target: [FormResponse.form, FormResponse.userId],
        set: {
          responseData: sampleResponses[i],
        },
      });
  }

  console.log(`✅ Created ${Math.min(users.length, sampleResponses.length)} test responses`);
  console.log("\n🎉 Seeding complete!");
  console.log(`\n📊 View responses at: /admin/forms/${testForm.name}/responses`);
}

seedTestForm()
  .catch((error) => {
    console.error("❌ Error seeding test form:", error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
