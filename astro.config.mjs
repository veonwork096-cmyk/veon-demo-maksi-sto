// VEON demo base: technical setup only. Visual design comes from design/concept.md of each client.
import { defineConfig } from "astro/config";

export default defineConfig({
  build: { inlineStylesheets: "auto" },
  compressHTML: true,
  devToolbar: { enabled: false },
});
