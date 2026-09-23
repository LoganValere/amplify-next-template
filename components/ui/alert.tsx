import { HTMLAttributes } from "react";
import { cn } from "./utils";

type AlertTone = "info" | "success" | "warning" | "danger";

const tones: Record<AlertTone, string> = {
  info: "border-blue-200 bg-blue-50 text-blue-900",
  success: "border-green-200 bg-green-50 text-green-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  danger: "border-red-200 bg-red-50 text-red-900",
};

export function Alert({
  tone = "info",
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & { tone?: AlertTone }) {
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn("rounded-lg border px-4 py-3 text-sm", tones[tone], className)}
      {...props}
    />
  );
}

export function Toast(props: HTMLAttributes<HTMLDivElement> & { tone?: AlertTone }) {
  const { className, ...rest } = props;
  return <Alert className={cn("fixed bottom-5 right-5 z-50 max-w-sm shadow-lg", className)} {...rest} />;
}
