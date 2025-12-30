/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    transpilePackages: ["@repo/ui"],
    typescript: {
        ignoreBuildErrors: true,
    },
};

module.exports = nextConfig;
