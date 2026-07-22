/** @type {import('next').NextConfig} */
const nextConfig = {
   serverExternalPackages: ["@react-pdf/renderer"],
   experimental: {
      serverActions: {
         bodySizeLimit: "10mb",
      },
      useCache: true,
   },
}

export default nextConfig
