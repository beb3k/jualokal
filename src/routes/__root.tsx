import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import styles from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1.0" },
      {
        name: "description",
        content:
          "Jualokal is a private, hyperlocal marketplace for nearby secondhand handovers.",
      },
      { title: "Jualokal — nearby secondhand handovers" },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Jualokal" },
      {
        property: "og:title",
        content: "Jualokal — nearby secondhand handovers",
      },
      {
        property: "og:description",
        content:
          "A private, hyperlocal marketplace for nearby secondhand handovers.",
      },
      { property: "og:image", content: "/og-image.png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      {
        property: "og:image:alt",
        content:
          "Jualokal — nearby finds and private handovers, illustrated with secondhand goods.",
      },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "twitter:title",
        content: "Jualokal — nearby secondhand handovers",
      },
      {
        name: "twitter:description",
        content:
          "A private, hyperlocal marketplace for nearby secondhand handovers.",
      },
      { name: "twitter:image", content: "/og-image.png" },
      {
        name: "twitter:image:alt",
        content:
          "Jualokal — nearby finds and private handovers, illustrated with secondhand goods.",
      },
    ],
    links: [
      { rel: "stylesheet", href: styles },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "icon", href: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png", sizes: "180x180" },
    ],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
