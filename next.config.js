const fs = require("fs");
const path = require("path");

const outputsPath = fs.existsSync(path.join(__dirname, "amplify_outputs.json"))
  ? path.join(__dirname, "amplify_outputs.json")
  : path.join(__dirname, "amplify_outputs.example.json");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.alias["@/amplify_outputs.json"] = outputsPath;
    return config;
  },
};

module.exports = nextConfig;
