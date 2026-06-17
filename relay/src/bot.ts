/**
 * m-relay/src/bot.ts
 *
 * Bot Framework bot handler.  Receives activity from Teams, routes the text
 * to the connected Scout desktop client via the relay, waits for the response,
 * then posts it back to Teams.
 *
 * Keep protocol types in sync with electron/teams-relay.ts in the host repo.
 */

import {
  ActivityHandler,
  type BotFrameworkAdapter,
  type ConversationReference,
  TurnContext,
  type Activity,
} from "botbuilder";

import type { RelayServer } from "./relay.js";

export class ScoutBot extends ActivityHandler {
  private readonly relay: RelayServer;
  /** Conversation references keyed by Teams userId (AAD OID). */
  private readonly conversationRefs = new Map<string, Partial<ConversationReference>>();

  constructor(relay: RelayServer) {
    super();
    this.relay = relay;

    this.onMessage(async (context: TurnContext) => {
      const userId = context.activity.from.id;
      // Persist the conversation reference so we can send proactive messages later.
      this.conversationRefs.set(
        userId,
        TurnContext.getConversationReference(context.activity),
      );

      if (!this.relay.isDesktopConnected()) {
        await context.sendActivity(
          "Microsoft Scout is not connected. Open Scout desktop and connect from the Integrations panel.",
        );
        return;
      }

      const requestId = crypto.randomUUID();
      const text = (context.activity.text ?? "").trim();

      if (!text) return;

      // Forward to Scout desktop and wait for the response.
      const response = await this.relay.sendMessage(requestId, text, userId);

      // The relay-side bot drops empty bodies before posting to Teams
      // (`if (response) await sendReply(...)` in m-relay/src/bot.ts), so this
      // never produces a duplicate message — it just lets the relay close the
      // request cleanly.
      if (response) await this.sendReply(context, response);
    });

    this.onMembersAdded(async (context: TurnContext) => {
      for (const member of context.activity.membersAdded ?? []) {
        if (member.id !== context.activity.recipient.id) {
          await context.sendActivity(
            "Hello! I am Microsoft Scout. Connect Scout desktop from the Integrations panel, then chat with me here.",
          );
        }
      }
    });
  }

  private async sendReply(context: TurnContext, text: string): Promise<void> {
    await context.sendActivity({ type: "message", text } as Partial<Activity>);
  }

  /**
   * Send a proactive message to a Teams user who has previously chatted with the bot.
   */
  async sendProactive(
    adapter: BotFrameworkAdapter,
    userId: string,
    text: string,
  ): Promise<void> {
    const ref = this.conversationRefs.get(userId);
    if (!ref) throw new Error(`No conversation reference for userId: ${userId}`);
    await adapter.continueConversation(ref, async (context: TurnContext) => {
      await context.sendActivity({ type: "message", text } as Partial<Activity>);
    });
  }

  hasConversationRef(userId: string): boolean {
    return this.conversationRefs.has(userId);
  }
}
