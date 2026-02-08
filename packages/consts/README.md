# @forge/consts

The `consts` package is, obviously, where we store constant variables. Before you add to this, you must ask yourself: "does this need to be used between two separate apps". If the answer is yes, find a good place to put it. If the answer is no, then we probably don't want to put it here.

Some types of data kind of go against this would be, for example, a named Discord channel that we need to remember. Storing it at the top of the file that it is used in makes no sense. Just some food for thought.

Note: please do not use `misc.ts`. This is a placeholder until we can migrate the rest. Thanks for understanding.


Got it 👍 Here’s a clean, explicit list of **everything Dylan asked MILLION to change**, distilled from the chat and mapped to where things *should* live.

---

## ✅ Requested Changes (by target area)

### **Minio**

Move the following into **minio**:

* KH bucket
* PFP extensions
* Minio endpoint → QR path

*(Dylan said these should be guild or minio, but explicitly “probably minio”)*

---

### **Forms**

Move into **forms**:

* `term_to_date`
  *(Reason: only used with graduation date, which is forms-only)*

---

### **Guild**

Move into **guild**:

* Guild tag
* Member profile icon

---

### **Club**

Move into a **club** file:

* Membership price
* Dues payment
* `clear_dues_message`
* Caution

---

### **Permissions**

Move into a **permissions** file:

* Permission object
* Permission index

---

### **Events**

Move into **events**:

* Time zone
* Calendar ID
* Personify email
* Weekday order *(this was the only forms/events correction Dylan called out later)*

---

## ❌ Explicitly Not Requested

* No review of other ~80 files
* Everything else assumed mapped correctly
* Forms/events mostly fine aside from weekday order
* Validation likely moving to `@forge/utils` later, not part of this task

---

If you want, I can:

* Turn this into a **task checklist**
* Propose an **ideal folder tree**
* Or map each item to **exact filenames** based on your current `consts` layout
