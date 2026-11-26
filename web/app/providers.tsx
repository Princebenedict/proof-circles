"use client";
import { RainbowKitProvider, getDefaultConfig, lightTheme } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, http } from "wagmi";
import { chain } from "@/lib/chain";

const rpc =
  process.env.NEXT_PUBLIC_RPC_URL ||
  (chain.id === 97 ? "https://bsc-testnet-rpc.publicnode.com" : "https://bsc-rpc.publicnode.com");

const config = getDefaultConfig({
  appName: "Proof Circles",
  projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID || "missing-project-id",
  chains: [chain],
  transports: { [chain.id]: http(rpc) } as any,
  ssr: true,
});
const queryClient = new QueryClient();

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={lightTheme({ accentColor: "#1A3C2B", accentColorForeground: "#F7F7F5", borderRadius: "none", fontStack: "system" })}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}