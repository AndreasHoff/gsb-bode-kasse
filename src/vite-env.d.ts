/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_PROPOSAL_OWNER_EMAIL?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
