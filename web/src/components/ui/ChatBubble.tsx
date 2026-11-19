import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

type Props = {
  role: "user" | "guide";
  children: ReactNode;
  className?: string;
};

/** Chat bubble. */
export function ChatBubble({ role, children, className }: Props) {
  const isUser = role === "user";
  return (
    <div
      className={cn(
        "max-w-[85%] rounded-md px-lg py-md text-body-md",
        isUser
          ? "ml-auto bg-accent-selected text-text-primary"
          : "mr-auto bg-surface-raised text-text-primary",
        className,
      )}
    >
      {children}
    </div>
  );
}
