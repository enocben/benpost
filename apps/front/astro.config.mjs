// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react'
import node from '@astrojs/node';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, fontProviders, envField } from 'astro/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://astro.build/config
export default defineConfig({
	site: 'https://blog.benenoc.com',
	output: 'server',
	adapter: node({ mode: 'standalone' }),
	integrations: [mdx(), sitemap(), react()],
	security: {
		checkOrigin: true,
		allowedDomains: [
			{
				hostname: 'blog.benenoc.com',
				protocol: 'https',
			},
			{
				hostname: 'api-blog.benenoc.com',
				protocol: 'https',
			}
		],
	},
	env: {
		schema: {
			PUBLIC_API_URL: envField.string({ context: 'client', access: "public", default: "https://api-blog.benenoc.com" }),
			HOST: envField.string({ context: "server", access: "public", default: "localhost" }),
			PORT: envField.number({ context: "server", access: "public", default: 4321 }),
			WEBHOOK_SECRET: envField.string({ context: "server", access: "secret" }),
		}
	},
	vite: {
		plugins: [tailwindcss()],
		resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
	},
	fonts: [
		{
			provider: fontProviders.local(),
			name: 'Atkinson',
			cssVariable: '--font-atkinson',
			fallbacks: ['sans-serif'],
			options: {
				variants: [
					{
						src: ['./src/assets/fonts/atkinson-regular.woff'],
						weight: 400,
						style: 'normal',
						display: 'swap',
					},
					{
						src: ['./src/assets/fonts/atkinson-bold.woff'],
						weight: 700,
						style: 'normal',
						display: 'swap',
					},
				],
			},
		},
	],
});
