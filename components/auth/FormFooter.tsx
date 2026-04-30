"use client";

import React from "react";

export default function FormFooter({ children }: { children?: React.ReactNode }) {
  return (
    <div className="mt-6 text-sm text-white/50">
      <div>{children}</div>
    </div>
  );
}
