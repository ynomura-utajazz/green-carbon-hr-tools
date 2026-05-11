import { DEMO_EMPLOYEES } from "@/lib/demo/employees";
import { DEMO_WIKI_PAGES } from "@/lib/demo/wiki";
import { WikiClient } from "./wiki-client";

export const dynamic = "force-dynamic";

export default async function WikiPage() {
  return <WikiClient pages={DEMO_WIKI_PAGES} employees={DEMO_EMPLOYEES} />;
}
