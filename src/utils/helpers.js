export const getFriendlyErrorMessage = (error) => {
    console.error("Erro original recebido:", error);
    if (error.code === 'ACTION_REJECTED') {
        return 'Transação recusada pelo usuário.';
    }
    if (error.reason) {
        return error.reason.charAt(0).toUpperCase() + error.reason.slice(1);
    }
    if (error.code === 'INSUFFICIENT_FUNDS') {
        return 'Você não possui fundos suficientes para realizar esta transação.';
    }
    return 'Ocorreu um erro inesperado ao processar a transação.';
};

export const truncateAddress = (address) => {
    if (!address || address.length < 10) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const linkifyText = (text) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, (url) => `<span class="link-preview" onclick="window.showLinkConfirmation('${url.replace(/'/g, "\\'")}')">${url}</span>`);
};

export const showLinkConfirmation = (url) => {
    if (confirm(`Você irá acessar um link externo:\n${url}\n\nDeseja continuar?`)) {
        window.open(url, '_blank');
    }
};

window.showLinkConfirmation = showLinkConfirmation;

export const sanitizeInput = (input) => {
    if (!input) return '';
    return input.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/\//g, '&#x2F;');
};

export const isMobile = () => /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);