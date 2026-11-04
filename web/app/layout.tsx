import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Curtain — privacy gate that proves itself",
  description: "Mask personal data in images, then prove nothing survived with a second model.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
