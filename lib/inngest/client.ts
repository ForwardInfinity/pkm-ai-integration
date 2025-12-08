import { EventSchemas, Inngest } from "inngest";
import type { InngestEvents } from "./events";

// Create Inngest client with typed events
export const inngest = new Inngest({
  id: "refinery",
  name: "Refinery",
  schemas: new EventSchemas().fromRecord<InngestEvents>(),
});
