import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "localhost",
    port: 5173,
    // 🔥 Không proxy /auth về chính frontend
    proxy: {
      // Nếu bạn có API thực sự trên backend, ví dụ:
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
