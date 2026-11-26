"use client";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export default function WalletButton() {
  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
        if (!mounted) return <span className="btn btn-solid opacity-0">Connect</span>;
        if (!account || !chain) return <button onClick={openConnectModal} className="btn btn-solid">Connect wallet</button>;
        if (chain.unsupported) return <button onClick={openChainModal} className="btn border-coral bg-coral text-forest">Wrong network</button>;
        return <button onClick={openAccountModal} className="btn btn-ghost">{account.displayName}</button>;
      }}
    </ConnectButton.Custom>
  );
}
