import type { MapNode, MindMapDoc } from "../model/types";

// A Walk-Through is an overview slide (the root + its branches) followed by one
// slide per top-level branch (its subtree). Pure + deterministic so it's unit
// testable; the overlay component just renders these.

export interface Slide {
  heading: string;
  node: MapNode;
  isOverview: boolean;
}

export function presentationSlides(doc: MindMapDoc): Slide[] {
  const overview: Slide = { heading: doc.root.topic, node: doc.root, isOverview: true };
  const branches: Slide[] = doc.root.children.map((child) => ({
    heading: child.topic,
    node: child,
    isOverview: false,
  }));
  return [overview, ...branches];
}
