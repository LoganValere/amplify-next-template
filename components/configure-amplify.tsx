"use client";

import { useEffect } from "react";
import { Amplify } from "aws-amplify";
import { amplifyConfig } from "@/lib/amplify-config";

export function ConfigureAmplify() {
  useEffect(() => {
    Amplify.configure(amplifyConfig as Parameters<typeof Amplify.configure>[0], { ssr: true });
  }, []);
  return null;
}
