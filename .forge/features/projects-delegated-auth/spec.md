# Projects delegated authentication

Projects users can sign in through Blade without an event registration, Member record, or Hacker profile. P1 supplies the backend protocol only. Projects uses the existing global logout behavior.

Projects credentials must never grant access to hacker APIs, including anonymous event reads and participant uploads. Existing event sign-in, refresh, and logout behavior remains compatible.

Browser integration, SDK extraction, case-study APIs, editorial permissions, client registration, and deployment are outside P1.
