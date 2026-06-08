import React from "react";
import GT from "@/components/GlossaryTerm";
import { withGlossary } from "@/lib/withGlossary";

function processNode(node: React.ReactNode): React.ReactNode {
  // Plain text — apply glossary substitution
  if (typeof node === "string") {
    return withGlossary(node);
  }

  // Primitives / null — pass through
  if (typeof node === "number" || typeof node === "boolean" || node == null) {
    return node;
  }

  // Arrays — recurse each child
  if (Array.isArray(node)) {
    return node.map((child) => processNode(child));
  }

  if (React.isValidElement(node)) {
    const el = node as React.ReactElement<Record<string, unknown>>;

    // Already a GT wrapper — don't recurse (avoid double-wrapping)
    if (el.type === GT) return node;

    // Skip elements that embed raw HTML or code
    if (el.props["dangerouslySetInnerHTML"]) return node;
    if (typeof el.type === "string" && ["script", "style", "code", "pre"].includes(el.type)) {
      return node;
    }

    // No children to process
    if (el.props["children"] == null) return node;

    return React.cloneElement(el, {
      children: processNode(el.props["children"] as React.ReactNode),
    } as Partial<typeof el.props>);
  }

  return node;
}

/**
 * Wraps any JSX subtree and automatically injects GlossaryTerm tooltips
 * around every glossary key found in string text nodes.
 */
export function WithGlossaryDeep({ children }: { children: React.ReactNode }) {
  return <>{processNode(children)}</>;
}
