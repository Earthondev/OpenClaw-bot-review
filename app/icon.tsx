import { ImageResponse } from "next/og";

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
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b1120",
        }}
      >
        <svg width="32" height="32" viewBox="0 0 64 64" fill="none">
          <rect x="5" y="6" width="54" height="52" rx="16" fill="#17233f" />
          <rect x="7" y="8" width="50" height="48" rx="14" stroke="#d4a72c" strokeWidth="2.5" strokeOpacity="0.85" />
          <path
            d="M10 39 L17 31 L24 31 L28 20 L32 25 L36 20 L40 31 L47 31 L54 39 L47 40 L42 47 L36 44 L32 49 L28 44 L22 47 L17 40 Z"
            fill="#f6cf58"
          />
          <path d="M22 18 L28 13 L31 20 L24 23 Z" fill="#f8e29a" fillOpacity="0.85" />
          <path d="M42 18 L36 13 L33 20 L40 23 Z" fill="#f8e29a" fillOpacity="0.85" />
        </svg>
      </div>
    ),
    {
      ...size,
    },
  );
}
