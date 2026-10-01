import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Medya dosya adları içerik izli olduğundan boyutlandırılmış sürümler 1 yıl saklanabilir.
    minimumCacheTTL: 31536000,
  },
};

export default nextConfig;
