"use client";

import { Input } from "@forge/ui/input";
import { Button } from "@forge/ui/button";
import { Card } from "@forge/ui/card";
import {
  SCHOOLS,
  LEVELS_OF_STUDY,
  SHIRT_SIZES,
  GENDERS,
  RACES_OR_ETHNICITIES,
} from "@forge/consts/knight-hacks";
import { ResponsiveComboBox } from "@forge/ui/responsive-combo-box";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  useForm,
} from "@forge/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@forge/ui/select";



export default function HackerFormPage() {
  const form = useForm({
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phoneNumber: "",
      dob: "",
      gradDate: "",
      githubProfileUrl: "",
      linkedinProfileUrl: "",
      websiteUrl: "",
    },
  });
  

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    alert("Form submitted!");
  };

  return (
    <div className="flex justify-center items-center min-h-screen py-12 px-4">
      <Card className="w-full max-w-xl p-6 shadow-lg">
        <h1 className="text-xl font-bold mb-4 text-center">Hacker Registration</h1>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">

          <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name</FormLabel>
                  <FormControl>
                    <Input type="text" placeholder="Enter your first name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Name</FormLabel>
                  <FormControl>
                    <Input type="text" placeholder="Enter your last name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="Enter your email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />


            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Phone Number
                    <span className="text-gray-400"> &mdash; <i>Optional</i></span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      placeholder="Enter your phone number"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <label htmlFor="dob" className="block text-sm font-medium text-gray-800 dark:text-white">
                Date of Birth
              </label>
              <Input id="dob" type="date" required className="mt-1" />
            </div>

            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Gender
                    <span className="text-gray-400"> &mdash; <i>Optional</i></span>
                  </FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your gender" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {GENDERS.map((gender) => (
                          <SelectItem key={gender} value={gender}>
                            {gender}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="raceOrEthnicity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Race or Ethnicity
                    <span className="text-gray-400"> &mdash; <i>Optional</i></span>
                  </FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your race or ethnicity" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {RACES_OR_ETHNICITIES.map((race) => (
                          <SelectItem key={race} value={race}>
                            {race}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="levelOfStudy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Level of Study</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your level of study" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {LEVELS_OF_STUDY.map((level) => (
                          <SelectItem key={level} value={level}>
                            {level}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="school"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>School</FormLabel>
                  <FormControl>
                    <ResponsiveComboBox
                      items={SCHOOLS}
                      renderItem={(school) => <div>{school}</div>}
                      getItemValue={(school) => school}
                      getItemLabel={(school) => school}
                      onItemSelect={(school) => field.onChange(school)}
                      buttonPlaceholder="Select your school"
                      inputPlaceholder="Search for your school"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <label htmlFor="gradDate" className="block text-sm font-medium text-gray-800 dark:text-white">
                Graduation Date
              </label>
              <Input id="gradDate" type="date" required className="mt-1" />
            </div>

            <FormField
              control={form.control}
              name="shirtSize"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Shirt Size</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your shirt size" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SHIRT_SIZES.map((size) => (
                          <SelectItem key={size} value={size}>
                            {size}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="githubProfileUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    GitHub Profile URL
                    <span className="text-gray-400"> &mdash; <i>Optional</i></span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="https://github.com/yourusername"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="linkedinProfileUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    LinkedIn Profile URL
                    <span className="text-gray-400"> &mdash; <i>Optional</i></span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="https://www.linkedin.com/in/yourname"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="websiteUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Personal Website URL
                    <span className="text-gray-400"> &mdash; <i>Optional</i></span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="https://yourwebsite.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="resumeUpload"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Resume Upload
                    <span className="text-gray-400"> &mdash; <i>Optional</i></span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="file"
                      accept=".pdf"
                      onChange={(event) => {
                        const file = event.target.files?.[0] || undefined;
                        field.onChange(file);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="foodAllergies"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Food Allergies
                    <span className="text-gray-400"> &mdash; <i>Optional</i></span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="Enter any food allergies or dietary restrictions"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-center">
              <Button type="submit" className="w-full">
                Submit
              </Button>
            </div>
          </form>
        </Form>
      </Card>
    </div>
  );
}
