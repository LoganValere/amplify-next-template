const fs = require("fs");
const path = require("path");

const outputsPath = fs.existsSync(path.join(__dirname, "amplify_outputs.json"))
  ? path.join(__dirname, "amplify_outputs.json")
  : path.join(__dirname, "amplify_outputs.example.json");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Route handlers copy this seed database to /tmp before Prisma opens it,
    // so it has to be traced into the server bundle.
    outputFileTracingIncludes: {
      "/api/**/*": ["./prisma/dev.db"],
    },
  },
  webpack: (config) => {
    config.resolve.alias["@/amplify_outputs.json"] = outputsPath;
    return config;
  },
};

module.exports = nextConfig;
