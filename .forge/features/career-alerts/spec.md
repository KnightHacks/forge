# Career Job Alerts and Digests Spec

Status: Accepted for #650

## Purpose

Knight Hacks members can choose which individual Career job posts ping them and
which daily Career digests they receive. The two settings are independent.

## Member behavior

- A signed-in member with a member profile can see, add, edit, and remove their
  own ping preferences. Each preference belongs to either internship or new grad.
- Members can choose a company, U.S. city, U.S. remote, or **Other** for a custom
  company or location. Keep the member's original custom wording for display.
- Each preference is independent. For example, a member who follows Google
  internships and Orlando internships matches a Google internship in Seattle
  and an internship at another company in Orlando. A post that matches both
  preferences pings the member once. New-grad jobs require new-grad preferences.
  A member with no matching preferences receives no targeted ping.
- A member can subscribe to each track's daily digest separately. Both start
  off. If Discord cannot update the role right away, the saved choice remains
  effective in Blade and the role can be repaired later.

## Scope

This work delivers the shared backend services and their tests for
[#650](https://github.com/KnightHacks/forge/issues/650). Separate issues own the
member API ([#651](https://github.com/KnightHacks/forge/issues/651)), Blade
controls ([#656](https://github.com/KnightHacks/forge/issues/656)), and scheduled
Discord delivery ([#654](https://github.com/KnightHacks/forge/issues/654)).
First-release location choices follow the merged input contract. A dedicated
statewide preference is deferred.

## Rollout decision

Before member opt-ins or scheduled repair can update Discord, officers confirm
that internship and new-grad digests use distinct roles dedicated to this
feature and carry no Discord permissions. Repair removes manual grants when the
corresponding saved opt-in is off.
