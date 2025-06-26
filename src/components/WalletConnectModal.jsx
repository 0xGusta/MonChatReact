import React from 'react';
import { SUPPORTED_WALLETS } from '../utils/wallet';
import { isMobile } from '../utils/helpers';

export default function WalletConnectModal({ isOpen, onClose, availableWallets, onConnect }) {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <button className="close-button" onClick={onClose}>×</button>
                <h2 className="text-xl font-bold mb-6 text-center">Conectar Carteira</h2>
                <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 styled-scrollbar">
                    {SUPPORTED_WALLETS.map((wallet) => {
                        const installedWallet = availableWallets.find(aw => aw.info.rdns === wallet.rdns);
                        const isMetaMask = wallet.rdns === 'io.metamask';

                        if (isMobile() && !isMetaMask) {
                            return (
                                <div key={wallet.rdns} className="btn btn-secondary w-full justify-start text-lg p-4 opacity-50 cursor-not-allowed">
                                    <img src={wallet.icon} alt={wallet.name} className="w-8 h-8 mr-4" />
                                    <div className="flex flex-col items-start leading-tight">
                                        <span>{wallet.name}</span>
                                        <span className="text-xs text-gray-400 font-normal">Apenas desktop</span>
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <button
                                key={wallet.rdns}
                                onClick={() => onConnect(installedWallet?.provider, wallet)}
                                disabled={!isMobile() && !installedWallet}
                                className="btn btn-secondary w-full justify-start text-lg p-4 disabled:opacity-50 disabled:cursor-not-allowed"
                                title={!isMobile() && !installedWallet ? `${wallet.name} não detectada` : `Conectar com ${wallet.name}`}
                            >
                                <img src={wallet.icon} alt={wallet.name} className="w-8 h-8 mr-4" />
                                {wallet.name}
                                {!isMobile() && !installedWallet && (
                                    <span className="text-xs text-gray-400 ml-auto">(Não instalada)</span>
                                )}
                            </button>
                        );
                    })}
                </div>
                {isMobile() && (
                    <p className="text-center text-xs mt-4 text-yellow-300">
                        POR FAVOR, COPIE O LINK DO SITE E ABRA NO NAVEGADOR DA METAMASK. INFELIZMENTE NÃO É POSSÍVEL CONECTAR-SE DIRETAMENTE PELO NAVEGADOR NO CELULAR.
                    </p>
                )}
            </div>
        </div>
    );
}