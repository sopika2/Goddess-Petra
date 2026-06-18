/** @type {import('next').NextConfig} */
const nextConfig = {
  // Uploaded media is served via the /media route, so no remote image domains
  // need configuring here.
  reactStrictMode: true,
  // Keep the native-ish DB driver out of the bundle; load it at runtime.
  serverExternalPackages: ["mysql2"],
  // Hide the little dev-tools indicator (the "N") during development.
  devIndicators: false,
};

export default nextConfig;
