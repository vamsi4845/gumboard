import React from "react";
import { ImageResponse } from "next/og";
import G from "./g.svg";

export const size = {
  width: 32,
  height: 32,
};
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "transparent",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <G width={24} height={24} />
      </div>
    ),
    {
      ...size,
    }
  );
}
