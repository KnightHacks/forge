# Acceptance checks

- Officer reads/saves/clears channel and optional role for the selected hackathon; other hackathons remain unchanged; non-officers are denied.
- Channel/role IDs are trimmed 17–20 digit snowflakes or null; pasted mentions/URLs are rejected.
- Valid participant report sends original text with server-derived event/reporter and only the configured role may ping. Empty role sends with no mentions.
- Missing session/application, missing channel, delivery failure, and rate limit fail without submitted:true; draft survives.
- Retrying the same draft reuses the submission key and Discord nonce.
- Blade renders configuration, blocks invalid input, and exposes loading/retry states. Desktop/mobile screenshots must be checked.
- Migration applies to existing and empty databases without configuring a destination by default.
