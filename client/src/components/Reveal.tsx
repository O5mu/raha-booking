import type { ReactNode } from "react";
import { motion } from "motion/react";

// The entrance for the parts of a section: each part rises 24px and fades in
// once, when it scrolls into view. Pass `order` to stagger the parts of one
// section (heading 0, text 1, picture 2...), 80ms apart. Motion's
// reducedMotion="user" (in main.tsx) turns the travel off for people who ask.
export function Reveal({ children, order = 0, className, as = "div" }: { children: ReactNode; order?: number; className?: string; as?: "div" | "li" }) {
  const Tag = as === "li" ? motion.li : motion.div;
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      // Starts once the top edge is 10% up the screen. (A share of the element,
      // like amount: 0.2, never comes true for a part taller than five screens,
      // such as the rate sheet on a phone.)
      viewport={{ once: true, amount: 0, margin: "0px 0px -10% 0px" }}
      transition={{ type: "spring", bounce: 0, duration: 0.7, delay: order * 0.08 }}
    >
      {children}
    </Tag>
  );
}
