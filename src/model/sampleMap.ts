import type { MindMapDoc } from "./types";

const leaf = (id: string, topic: string) => ({ id, topic, children: [] });

// A relatable retail sample so the spike screenshot looks like a real map.
export const sampleDoc: MindMapDoc = {
  schemaVersion: 1,
  id: "sample",
  title: "Q3 Retail Plan",
  root: {
    id: "root",
    topic: "Q3 Retail Plan",
    children: [
      {
        id: "merch",
        topic: "Merchandising",
        children: [
          leaf("m1", "Autumn drop"),
          leaf("m2", "Markdown cadence"),
          leaf("m3", "Range width −8%"),
        ],
      },
      {
        id: "ecom",
        topic: "E-commerce",
        children: [
          leaf("e1", "PDP redesign"),
          leaf("e2", "Checkout A/B"),
          leaf("e3", "App push"),
        ],
      },
      {
        id: "stores",
        topic: "Stores",
        children: [leaf("s1", "Nordics refit"), leaf("s2", "Staff training")],
      },
      {
        id: "supply",
        topic: "Supply Chain",
        children: [leaf("sc1", "Lead-time −2wk"), leaf("sc2", "DC automation")],
      },
      {
        id: "people",
        topic: "People",
        children: [leaf("p1", "Seasonal hiring"), leaf("p2", "Retention plan")],
      },
    ],
  },
  meta: { source: "sample" },
};
