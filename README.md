# Olympic Air Aegean Airlines Virtual Event Bot

Discord bot for OAV event management, event reminders, staff-up requests, and VATSIM callsign updates.

## Setup

1. Install dependencies with `pnpm install`.
2. Copy `.env.example` to `.env` and add the Discord application and channel IDs for the OAV server.
3. Start the bot with `pnpm dev`.

All event announcements are published to the OAV events channel (`1542153681099694165`); the bot never creates a new channel for an event. Welcome messages are posted in the dedicated welcome channel. Enable the **Server Members Intent** for the bot in the Discord Developer Portal so new-member welcomes can be delivered.

The Olympic Air logo is stored at `assets/oav-logo.png` and attached to every bot embed (author, thumbnail, and footer).

Website: [www.oav.gr](https://www.oav.gr/)
