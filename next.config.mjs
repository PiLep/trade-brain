/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  serverExternalPackages: ["better-sqlite3"],
  async redirects() {
    return [
      // Space management moved under the settings shell. The old path is
      // linked from invitation e-mails and may be bookmarked, so keep it
      // working - as a real 308 so the address bar updates too.
      {
        source: "/tenants",
        destination: "/settings/spaces",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
