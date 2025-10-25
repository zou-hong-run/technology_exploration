import { defineConfig } from "vite";
import basicSsl from "@vitejs/plugin-basic-ssl";

export default defineConfig({
    server: {
        https: true, // 可选，插件会自动处理
    },
    plugins: [basicSsl()],
});