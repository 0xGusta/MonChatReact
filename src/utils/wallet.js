export const SUPPORTED_WALLETS = [
    {
        rdns: 'io.metamask',
        name: 'MetaMask',
        icon: '/images/mm.svg',
        deeplink: 'metamask://'
    },
    {
        rdns: 'io.rabby',
        name: 'Rabby Wallet',
        icon: '/images/rabby.svg',
        deeplink: 'rabby://'
    },
    {
        rdns: 'app.phantom',
        name: 'Phantom',
        icon: '/images/phantom.svg',
        deeplink: 'phantom://'
    },
    {
        rdns: 'app.backpack',
        name: 'Backpack',
        icon: '/images/bpw.svg',
        deeplink: 'backpack://'
    },
    {
        rdns: 'com.okex.wallet',
        name: 'OKX Wallet',
        icon: '/images/okx.svg',
        deeplink: 'okx://wallet'
    }
];

export const getWalletInfoFromProvider = (provider) => {
    for (const wallet of SUPPORTED_WALLETS) {
        if (wallet.rdns === 'io.rabby' && provider.isRabby) return wallet;
        if (wallet.rdns === 'com.okex.wallet' && provider.isOkxWallet) return wallet;
        if (wallet.rdns === 'io.metamask' && provider.isMetaMask && !provider.isRabby) return wallet;
    }
    if (provider.isMetaMask) {
        return SUPPORTED_WALLETS.find(w => w.rdns === 'io.metamask');
    }
    return { rdns: 'unknown.wallet', name: 'Carteira Desconhecida', icon: '' };
};

export const generateDeeplink = (wallet) => {
    const dappUrl = window.location.href.split('?')[0];
    return `${wallet.deeplink}dapp/${dappUrl}`;
};