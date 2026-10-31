"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Input } from "@/src/components/ui/input";

/** A password field with a show/hide toggle, so there is no need to type it twice to be sure. */
export function PasswordInput({ className, ...props }: Omit<React.ComponentProps<typeof Input>, "type">) {
  const [shown, setShown] = useState(false);
  return (
    <div className="relative">
      <Input
        {...props}
        type={shown ? "text" : "password"}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        className={`pr-12 ${className ?? ""}`}
      />
      <button
        type="button"
        onClick={() => setShown((s) => !s)}
        aria-label={shown ? "Hide password" : "Show password"}
        aria-pressed={shown}
        className="pressable absolute top-0 right-0 flex size-11 items-center justify-center rounded-full text-muted-foreground hover:bg-foreground/6 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none"
      >
        {shown ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
      </button>
    </div>
  );
}
