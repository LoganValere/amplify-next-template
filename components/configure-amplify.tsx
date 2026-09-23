"use client";

import { useEffect } from "react";
import { Amplify } from "aws-amplify";

export function ConfigureAmplify() {
  useEffect(() => {
    void import("@/amplify_outputs.json")
      .then((mod) => {
        const outputs = (mod as { default?: object }).default ?? mod;
        if (outputs && Object.keys(outputs as object).length > 0) {
          Amplify.configure(outputs as Parameters<typeof Amplify.configure>[0], { ssr: true });
        }
      })
      .catch(() => undefined);
  }, []);
  return null;
}
