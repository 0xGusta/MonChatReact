import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { ethers } from 'ethers';

import Popup from './components/Popup';
import AboutModal from './components/AboutModal';
import WalletConnectModal from './components/WalletConnectModal';
import ProfileModal from './components/ProfileModal';
import EditProfileModal from './components/EditProfileModal';
import SendMONModal from './components/SendMONModal';
import ModerationModal from './components/ModerationModal';
import GifPicker from './components/GifPicker';

import { CONTRACT_ADDRESS, ABI, MONAD_TESTNET, EMOJIS, userProfilesCache } from './utils/constants';
import { getWalletInfoFromProvider, SUPPORTED_WALLETS, generateDeeplink } from './utils/wallet';
import { uploadToIPFS, getIPFSUrl } from './utils/ipfs';
import { truncateAddress, linkifyText, getFriendlyErrorMessage, showLinkConfirmation } from './utils/helpers';
import { isMobile } from './utils/helpers';

export default function ChatApp() {
    const [isConnected, setIsConnected] = useState(false);
    const [account, setAccount] = useState('');
    const [contract, setContract] = useState(null);
    const [provider, setProvider] = useState(null);
    const [signer, setSigner] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [userProfile, setUserProfile] = useState(null);
    const [balance, setBalance] = useState('0');
    const [popup, setPopup] = useState(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [replyingTo, setReplyingTo] = useState(null);
    const [editingMessage, setEditingMessage] = useState(null);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [selectedUserProfile, setSelectedUserProfile] = useState(null);
    const [selectedUserAddress, setSelectedUserAddress] = useState('');
    const [showEditProfileModal, setShowEditProfileModal] = useState(false);
    const [showSendMONModal, setShowSendMONModal] = useState(false);
    const [showAboutModal, setShowAboutModal] = useState(false);
    const [showModerationModal, setShowModerationModal] = useState(false);
    const [moderationAction, setModerationAction] = useState('');
    const [isOwner, setIsOwner] = useState(false);
    const [isModerator, setIsModerator] = useState(false);
    const [showScrollButton, setShowScrollButton] = useState(false);
    const [unseenMessages, setUnseenMessages] = useState(0);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMoreMessages, setHasMoreMessages] = useState(false);
    const [isForcedAboutModal, setIsForcedAboutModal] = useState(false); 
    const [showWalletConnectModal, setShowWalletConnectModal] = useState(false);
    const [availableWallets, setAvailableWallets] = useState([]);
    const [isAppLoading, setIsAppLoading] = useState(true);
    const [showGifPicker, setShowGifPicker] = useState(false);
    const [selectedGifUrl, setSelectedGifUrl] = useState(null);
    const [isWrongNetwork, setIsWrongNetwork] = useState(false);

    const messagesContainerRef = useRef(null);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const emojiPickerRef = useRef(null);
    const pollingIntervalRef = useRef(null);
    const emojiButtonRef = useRef(null);
    const scrollAnchorRef = useRef(null);
    const textareaRef = useRef(null);
    const isFetchingNewerMessages = useRef(false);
    const hasAttemptedAutoConnect = useRef(false);
    const lastMessageCountRef = useRef(0);

    const handlePaste = (event) => {

        const items = event.clipboardData.items;
        if (!items) {
            
            return;
        }

        for (let i = 0; i < items.length; i++) {
            
            if (items[i].type.indexOf('image') !== -1) {

                event.preventDefault();

                const file = items[i].getAsFile();
                
                setSelectedImage(file);
                setSelectedGifUrl(null);
                showPopup('Imagem colada da área de transferência!', 'success');
                break; 
            }
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        setUnseenMessages(0);
    };

    const showPopup = (message, type = 'info', isLoading = false) => {
        setPopup({ message, type, isLoading, isExiting: false });
    };

    const hidePopup = () => {
        setPopup(p => p ? { ...p, isExiting: true } : null);
    };


   
    const loadNewerMessages = async (contractInstance) => {
        if (isFetchingNewerMessages.current) {
            return;
        }

        try {
            isFetchingNewerMessages.current = true;

            const totalMessages = await contractInstance.contadorMensagens();
            const latestIdInState = lastMessageCountRef.current;

            if (Number(totalMessages) > latestIdInState) {
                const newMessages = [];
                for (let i = latestIdInState + 1; i <= Number(totalMessages); i++) {
                    const msg = await contractInstance.obterMensagem(i);
                    let senderProfile = userProfilesCache.get(msg.remetente.toLowerCase());

                    if (!senderProfile && msg.remetente !== CONTRACT_ADDRESS) {
                        try {
                            const [profile, role] = await Promise.all([
                                contractInstance.obterPerfilUsuario(msg.remetente),
                                contractInstance.obterRoleUsuario(msg.remetente)
                            ]);
                            if (profile.exists) {
                                senderProfile = { 
                                    username: profile.username, 
                                    profilePicHash: profile.profilePicHash, 
                                    exists: profile.exists,
                                    role: Number(role)
                                };
                                userProfilesCache.set(msg.remetente.toLowerCase(), senderProfile);
                            }
                        } catch (e) { console.error("Erro ao buscar perfil:", e); }
                    }
                    
                    const formattedMessage = { 
                        id: i, 
                        remetente: msg.remetente, 
                        usuario: msg.usuario, 
                        conteudo: msg.conteudo, 
                        imageHash: msg.imageHash,
                        timestamp: Number(msg.timestamp), 
                        excluida: msg.excluida, 
                        respondeA: Number(msg.respondeA), 
                        senderProfile 
                    };

                    newMessages.push(formattedMessage);
                }
                
                if (newMessages.length > 0) {
                    setMessages(prevMessages => [...prevMessages, ...newMessages]);
                }
            }
        } catch (error) {
            console.error('Erro ao carregar mensagens mais recentes:', error);
        } finally {
            isFetchingNewerMessages.current = false;
        }
    };

    const loadUserProfile = async (contract, address) => {
        try {
            const [profileData, roleData] = await Promise.all([
                contract.obterPerfilUsuario(address),
                contract.obterRoleUsuario(address)
            ]);

            if (profileData.exists) {
                const userProfileData = {
                    username: profileData.username,
                    profilePicHash: profileData.profilePicHash,
                    exists: profileData.exists,
                    role: Number(roleData)
                };
                
                if (address.toLowerCase() === account.toLowerCase()) {
                    setUserProfile(userProfileData);
                }

                userProfilesCache.set(address.toLowerCase(), userProfileData);
            }
            
            return { ...profileData, role: Number(roleData) };
        } catch (error) {
            console.error('Erro ao carregar perfil do usuário:', error);
            
            return { exists: false, role: 0 };
        }
    };

    const loadMessages = async (contractInstance) => {
        try {
            const totalMessages = await contractInstance.contadorMensagens();
            const messagesToLoad = Math.min(Number(totalMessages), 20);
            setHasMoreMessages(Number(totalMessages) > messagesToLoad);
            if (messagesToLoad === 0) {
                setMessages([]);
                setHasMoreMessages(false);
                return;
            }
            const formattedMessages = [];
            for (let i = Number(totalMessages); i > Number(totalMessages) - messagesToLoad && i > 0; i--) {
                const msg = await contractInstance.obterMensagem(i);
                let senderProfile = userProfilesCache.get(msg.remetente.toLowerCase());
                    if (!senderProfile && msg.remetente !== CONTRACT_ADDRESS) {
                        try {
                            
                            const [profile, role] = await Promise.all([
                                contractInstance.obterPerfilUsuario(msg.remetente),
                                contractInstance.obterRoleUsuario(msg.remetente)
                            ]);
                            if (profile.exists) {
                                senderProfile = { 
                                    username: profile.username, 
                                    profilePicHash: profile.profilePicHash, 
                                    exists: profile.exists,
                                    role: Number(role) 
                                };
                                userProfilesCache.set(msg.remetente.toLowerCase(), senderProfile);
                            }
                        } catch (e) { console.error("Erro ao buscar perfil:", e); }
                    }
                formattedMessages.unshift({ 
                    id: i, 
                    remetente: msg.remetente, 
                    usuario: msg.usuario, 
                    conteudo: msg.conteudo, 
                    imageHash: msg.imageHash, 
                    timestamp: Number(msg.timestamp), 
                    excluida: msg.excluida, 
                    respondeA: Number(msg.respondeA), 
                    senderProfile 
                });
            }
            setMessages(formattedMessages);
        } catch (error) {
            console.error('Erro ao carregar mensagens:', error);
        }
    };


    const loadMoreMessages = async () => {
        if (isLoadingMore || !hasMoreMessages) return;

        if (messagesContainerRef.current) {
            scrollAnchorRef.current = { scrollHeight: messagesContainerRef.current.scrollHeight };
        }
        setIsLoadingMore(true);

        try {
            let contractToUse = contract;
            if (!contractToUse) {
                const publicProvider = new ethers.JsonRpcProvider(MONAD_TESTNET.rpcUrls[0]);
                contractToUse = new ethers.Contract(CONTRACT_ADDRESS, ABI, publicProvider);
            }

            const oldestMessageId = messages[0]?.id;
            if (!oldestMessageId || oldestMessageId <= 1) {
                setHasMoreMessages(false);
                setIsLoadingMore(false);
                return;
            }

            const batchSize = 25;
            const newMessages = [];
            let currentId = oldestMessageId - 1;

            while (newMessages.length < batchSize && currentId > 0) {
                const msg = await contractToUse.obterMensagem(currentId);

                if (!msg.excluida && msg.remetente !== ethers.ZeroAddress) {
                    let senderProfile = userProfilesCache.get(msg.remetente.toLowerCase());
                    if (!senderProfile && msg.remetente !== CONTRACT_ADDRESS) {
                        try {
                            const [profile, role] = await Promise.all([
                                contractToUse.obterPerfilUsuario(msg.remetente),
                                contractToUse.obterRoleUsuario(msg.remetente)
                            ]);
                            if (profile.exists) {
                                senderProfile = { 
                                    username: profile.username, 
                                    profilePicHash: profile.profilePicHash, 
                                    exists: profile.exists,
                                    role: Number(role)
                                };
                                userProfilesCache.set(msg.remetente.toLowerCase(), senderProfile);
                            }
                        } catch (e) { console.error("Erro ao buscar perfil:", e); }
                    }
                    
                    
                    newMessages.unshift({
                        id: currentId,
                        remetente: msg.remetente,
                        usuario: msg.usuario,
                        conteudo: msg.conteudo,
                        imageHash: msg.imageHash, 
                        timestamp: Number(msg.timestamp),
                        excluida: msg.excluida,
                        respondeA: Number(msg.respondeA),
                        senderProfile
                    });
                }
                
                currentId--;
            }

            if (newMessages.length > 0) {
                setMessages(prevMessages => [...newMessages, ...prevMessages]);
            }
        
            setHasMoreMessages(currentId > 0);

        } catch (error) {
            console.error("Erro ao carregar mais mensagens:", error);
        } finally {
            setIsLoadingMore(false);
        }
    };

    const handleSelectGif = (gifUrl) => {
        setSelectedGifUrl(gifUrl); 
        setSelectedImage(null);
        setShowGifPicker(false);   
    };

    const handleScroll = (e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.target;
        const isAtBottom = Math.abs(scrollHeight - scrollTop - clientHeight) < clientHeight;
        setShowScrollButton(!isAtBottom);

        if (isAtBottom) {
            const scrollButton = document.querySelector('.scroll-to-bottom');
            if (scrollButton) scrollButton.classList.remove('new-message');
            setUnseenMessages(0);
        }
    };

    const handleConnect = async (provider, walletInfo) => {
        setShowWalletConnectModal(false);
        localStorage.setItem('lastConnectedWalletRdns', walletInfo.rdns);

        if (provider) {
            await initiateConnection(provider, walletInfo.name);
            return;
        }

        if (isMobile() && !provider) {
            
            if (walletInfo.rdns === 'io.metamask') {
                const deeplink = generateDeeplink(walletInfo);
                window.location.href = deeplink;
            }
            return;
        }

        showPopup(`${walletInfo.name} não está instalado.`, 'error');
    };

    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.addEventListener('paste', handlePaste);
        }
    
            return () => {
            if (textarea) {
                textarea.removeEventListener('paste', handlePaste);
            }
        };
    }, [userProfile]);

    useEffect(() => {
        if (!popup) return;

        if (popup.isExiting) {
            const removeTimer = setTimeout(() => {
                setPopup(null);
            }, 300);
            return () => clearTimeout(removeTimer);
        } else if (!popup.isLoading) {
            const exitTimer = setTimeout(() => {
                hidePopup();
            }, 3000);
            return () => clearTimeout(exitTimer);
        }
    }, [popup]);

    useEffect(() => {
        
        if (availableWallets.length > 0 && !isConnected && !hasAttemptedAutoConnect.current) {
            const lastRdns = localStorage.getItem('lastConnectedWalletRdns');
            if (lastRdns) {
                
                const walletToReconnect = availableWallets.find(w => w.info.rdns === lastRdns);

                if (walletToReconnect) {
                    console.log(`Tentando reconexão automática com ${walletToReconnect.info.name}...`);
                    
                    hasAttemptedAutoConnect.current = true;
                    
                    handleConnect(walletToReconnect.provider, walletToReconnect.info);
                }
            }
        }
    }, [availableWallets, isConnected]); 

    
    const initiateConnection = async (walletProvider, walletName) => {
        showPopup(`Conectando com ${walletName}...`, 'info', true);
        try {
            
            const accounts = await walletProvider.request({ method: 'eth_requestAccounts' });
            if (accounts.length === 0) {
                hidePopup();
                showPopup('Nenhuma conta selecionada', 'error');
                return;
            }

            
            try {
                await walletProvider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: MONAD_TESTNET.chainId }] });
            } catch (switchError) {
                
                if (switchError.code === 4902) {
                    await walletProvider.request({ method: 'wallet_addEthereumChain', params: [MONAD_TESTNET] });
                } else {
                    
                    hidePopup();
                    showPopup('Por favor, mude para a rede Monad Testnet em sua carteira.', 'warning');
                    return;
                }
            }

            const provider = new ethers.BrowserProvider(walletProvider);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
            const userAddress = accounts[0];

            setIsWrongNetwork(false); 
            setProvider(provider);
            setSigner(signer);
            setContract(contract);
            setAccount(userAddress);
        
            const [profileData, balanceData, ownerAddress, isModeratorResult] = await Promise.all([
                contract.obterPerfilUsuario(userAddress),
                provider.getBalance(userAddress),
                contract.dono(),
                contract.moderadores(userAddress)
            ]);

            const profileExists = profileData.exists;
            setIsConnected(true); 

            if (!profileExists) {
                hidePopup();
                setUserProfile({ exists: false, username: '', profilePicHash: '', role: 0 });
                setIsOwner(false);
                setIsModerator(false);
                setBalance('0'); 
                setIsForcedAboutModal(true);
                setShowAboutModal(true);
            } else {
                const isOwnerResult = ownerAddress.toLowerCase() === userAddress.toLowerCase();
                const finalIsModerator = isOwnerResult || isModeratorResult; 
                const userRole = await contract.obterRoleUsuario(userAddress);
                const userProfile = { username: profileData.username, profilePicHash: profileData.profilePicHash, exists: true, role: Number(userRole) };
                setUserProfile(userProfile);
                userProfilesCache.set(userAddress.toLowerCase(), userProfile);
                setIsOwner(isOwnerResult);
                setIsModerator(finalIsModerator);
                setBalance(ethers.formatEther(balanceData));
                hidePopup();
                showPopup('Carteira conectada!', 'success');
            }

            if (messages.length === 0) {
                await loadMessages(contract);
            }

        } catch (error) {
            console.error(`Erro ao conectar com ${walletName}:`, error);
            hidePopup();
            const friendlyMessage = getFriendlyErrorMessage(error);
            showPopup(`Erro: ${friendlyMessage}`, 'error');
            disconnectWallet();
        }
    };

    const disconnectWallet = () => {
        hidePopup();
        localStorage.removeItem('lastConnectedWalletRdns');
        setIsConnected(false);
        setAccount('');
        setSigner(null);
        setProvider(null);
        setContract(null);
        setUserProfile(null);
        setBalance('0');
        setShowDropdown(false);
        setIsOwner(false);
        setIsModerator(false);
        setIsWrongNetwork(false);
        setIsInitialLoad(true);
        setMessages([]);
        setTimeout(async () => {
            try {
                const publicProvider = new ethers.JsonRpcProvider(MONAD_TESTNET.rpcUrls[0]);
                const readOnlyContract = new ethers.Contract(CONTRACT_ADDRESS, ABI, publicProvider);
                await loadMessages(readOnlyContract);
            } catch (error) {
                console.error("Erro ao recarregar msgs após desconectar:", error);
            } finally {
                setIsInitialLoad(false);
            }
        }, 50); 
    };

    useEffect(() => {
        let discoveredProviders = [];
        const handleAnnounceProvider = (event) => {
            discoveredProviders.push(event.detail);
        };
        window.addEventListener('eip6963:announceProvider', handleAnnounceProvider);
        window.dispatchEvent(new Event('eip6963:requestProvider'));
        const processingTimeout = setTimeout(() => {
            if (window.ethereum) {
                const walletInfo = getWalletInfoFromProvider(window.ethereum);
                const providerDetail = { info: { ...walletInfo, uuid: `window-ethereum-${walletInfo.rdns}` }, provider: window.ethereum };
                discoveredProviders.push(providerDetail);
            }
            const uniqueWalletsMap = new Map();
            for (const providerDetail of discoveredProviders) {
                if (SUPPORTED_WALLETS.some(wallet => wallet.rdns === providerDetail.info.rdns)) {
                    if (!uniqueWalletsMap.has(providerDetail.info.rdns)) {
                        uniqueWalletsMap.set(providerDetail.info.rdns, providerDetail);
                    }
                }
            }
            setAvailableWallets(Array.from(uniqueWalletsMap.values()));
        }, 500);
        return () => {
            clearTimeout(processingTimeout);
            window.removeEventListener('eip6963:announceProvider', handleAnnounceProvider);
        };
    }, []);
    
    const handleAgreeAndProceedToProfile = () => {
        setShowAboutModal(false);       
        setIsForcedAboutModal(false);   
        setShowEditProfileModal(true);  
    };
              
    const handleScrollToReply = (messageId) => {
        const targetElement = document.getElementById(`message-${messageId}`);
        if (targetElement) {
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const bubbleElement = targetElement.querySelector('.message-bubble');
            if (bubbleElement) {
                bubbleElement.classList.add('highlight-message');
                setTimeout(() => {
                    bubbleElement.classList.remove('highlight-message');
                }, 3000); 
            }
        } else {
            showPopup("A mensagem respondida não está carregada no chat.", 'info');
        }
    };
    
    const sendMessage = async () => {
        
        if (!newMessage.trim() && !selectedImage && !selectedGifUrl) return;

        showPopup('Enviando mensagem...', 'info', true);
        

        try {
            const textContent = newMessage.trim();
            let imageHashContent = ''; 
            const replyId = replyingTo ? replyingTo.id : 0;

            if (selectedImage) {
                setUploading(true);
                imageHashContent = await uploadToIPFS(selectedImage, setUploadProgress);
            } else if (selectedGifUrl) {
                
                imageHashContent = selectedGifUrl;
            }

            const tx = await contract.enviarMensagem(textContent, imageHashContent, replyId);
            await tx.wait();

            setNewMessage('');
            setSelectedImage(null);
            setSelectedGifUrl(null);
            setReplyingTo(null);
            setEditingMessage(null);

            hidePopup();
            showPopup('Mensagem enviada!', 'success');
            setTimeout(() => loadNewerMessages(contract), 500);

        } catch (error) {
            hidePopup();
            const friendlyMessage = getFriendlyErrorMessage(error);
            showPopup(friendlyMessage, 'error');
        } finally {
            setUploading(false);
            setUploadProgress(0);
        }
    };

    const editMessage = async (messageId, newContent) => { try { showPopup('Editando mensagem...', 'info', true); const tx = await contract.editarMensagem(messageId, newContent); await tx.wait(); hidePopup(); showPopup('Mensagem editada!', 'success'); setEditingMessage(null); setNewMessage(''); await loadMessages(contract); } catch (error) {
        hidePopup(); 
        const friendlyMessage = getFriendlyErrorMessage(error); 
        showPopup(friendlyMessage, 'error'); 
    } };
    const deleteMessage = async (messageId) => { try { showPopup('Excluindo mensagem...', 'info', true); const tx = await contract.excluirMensagem(messageId); await tx.wait(); hidePopup(); showPopup('Mensagem excluída!', 'success'); await loadMessages(contract); } catch (error) {
        hidePopup(); 
        const friendlyMessage = getFriendlyErrorMessage(error); 
        showPopup(friendlyMessage, 'error'); 
    } };
    const registerUser = async (username, profilePicHash = '') => { 
        try { 
            showPopup('Registrando usuário...', 'info', true); 
            const tx = await contract.registrarUsuario(username, profilePicHash); 
            await tx.wait(); 
            hidePopup(); 
            showPopup('Usuário registrado com sucesso!', 'success'); 
            await loadUserProfile(contract, account); 

            if (provider && account) {
                const newBalance = await provider.getBalance(account);
                setBalance(ethers.formatEther(newBalance));
            }

        } catch (error) {
            hidePopup();
            const friendlyMessage = getFriendlyErrorMessage(error); 
            showPopup(friendlyMessage, 'error'); 
        } 
    };
    const updateProfile = async (username, profilePicHash) => { try { showPopup('Atualizando perfil...', 'info', true); const tx = await contract.atualizarPerfil(username, profilePicHash); await tx.wait(); hidePopup(); showPopup('Perfil atualizado!', 'success'); await loadUserProfile(contract, account); } catch (error) {
        hidePopup();
        const friendlyMessage = getFriendlyErrorMessage(error); 
        showPopup(friendlyMessage, 'error'); 
    } };
    const sendMON = async (recipientAddress, amount) => { try { showPopup('Enviando MON...', 'info', true); const tx = await contract.enviarMon(recipientAddress, amount, { value: amount }); await tx.wait(); hidePopup(); showPopup('MON enviado com sucesso!', 'success'); await provider.getBalance(account).then(b => setBalance(ethers.formatEther(b))); await loadMessages(contract); } catch (error) {
        hidePopup(); 
        const friendlyMessage = getFriendlyErrorMessage(error); 
        showPopup(friendlyMessage, 'error'); 
    } };
    const banUser = async (username) => { try { const userAddress = await contract.usernameToAddress(username); if (userAddress === ethers.ZeroAddress) { showPopup('Usuário não encontrado', 'error'); return; } showPopup('Banindo usuário...', 'info', true); const tx = await contract.banirUsuario(userAddress); await tx.wait(); hidePopup(); showPopup('Usuário banido!', 'success'); await loadMessages(contract); } catch (error) {
        hidePopup(); const friendlyMessage = getFriendlyErrorMessage(error); showPopup(friendlyMessage, 'error');
    } };
    const unbanUser = async (username) => { try { const userAddress = await contract.usernameToAddress(username); if (userAddress === ethers.ZeroAddress) { showPopup('Usuário não encontrado', 'error'); return; } showPopup('Desbanindo usuário...', 'info', true); const tx = await contract.desbanirUsuario(userAddress); await tx.wait(); hidePopup(); showPopup('Usuário desbanido!', 'success'); await loadMessages(contract); } catch (error) {
        hidePopup(); const friendlyMessage = getFriendlyErrorMessage(error); showPopup(friendlyMessage, 'error');
    } };
    const addModerator = async (username) => { try { const userAddress = await contract.usernameToAddress(username); if (userAddress === ethers.ZeroAddress) { showPopup('Usuário não encontrado', 'error'); return; } showPopup('Adicionando moderador...', 'info', true); const tx = await contract.adicionarModerador(userAddress); await tx.wait(); hidePopup(); showPopup('Moderador adicionado!', 'success'); } catch (error) {
        hidePopup(); const friendlyMessage = getFriendlyErrorMessage(error); showPopup(friendlyMessage, 'error');
    } };
    const removeModerator = async (username) => { try { const userAddress = await contract.usernameToAddress(username); if (userAddress === ethers.ZeroAddress) { showPopup('Usuário não encontrado', 'error'); return; } showPopup('Removendo moderador...', 'info', true); const tx = await contract.removerModerador(userAddress); await tx.wait(); hidePopup(); showPopup('Moderador removido!', 'success'); } catch (error) {
        hidePopup(); const friendlyMessage = getFriendlyErrorMessage(error); showPopup(friendlyMessage, 'error');
    } };
    
    const handleProfileClick = async (userAddress) => { try { let profile = userProfilesCache.get(userAddress.toLowerCase()); if (!profile && userAddress !== CONTRACT_ADDRESS) { const profileData = await contract.obterPerfilUsuario(userAddress); if (profileData.exists) { profile = { username: profileData.username, profilePicHash: profileData.profilePicHash, exists: profileData.exists }; userProfilesCache.set(userAddress.toLowerCase(), profile); } } setSelectedUserAddress(userAddress); setSelectedUserProfile(profile); setShowProfileModal(true); } catch (error) { console.error('Erro ao carregar perfil:', error); } };
    const handleReply = (message) => { setEditingMessage(null); setReplyingTo(message); document.querySelector('textarea')?.focus(); };
    const handleEdit = (message) => { setReplyingTo(null); setEditingMessage(message); setNewMessage(message.conteudo); document.querySelector('textarea')?.focus(); };
    const handleImageSelect = (event) => { const file = event.target.files[0]; if (file) { if (file.size > 10 * 1024 * 1024) { showPopup('Arquivo muito grande. Máximo 10MB.', 'error'); return; } setSelectedImage(file); setSelectedGifUrl(null); } };
    const handleEmojiSelect = (emoji) => { setNewMessage(prev => prev + emoji); setShowEmojiPicker(false); };
    const handleKeyPress = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (editingMessage) { editMessage(editingMessage.id, newMessage); } else { sendMessage(); } } };
    const openModerationModal = (action) => { setModerationAction(action); setShowModerationModal(true); setShowDropdown(false); };
    const handleModerationAction = async (username) => { switch (moderationAction) { case 'ban': await banUser(username); break; case 'unban': await unbanUser(username); break; case 'addModerator': await addModerator(username); break; case 'removeModerator': await removeModerator(username); break; } };

    useEffect(() => {
        if (messages.length > 0) {
            const latestId = messages[messages.length - 1].id;
            lastMessageCountRef.current = latestId;
        }
    }, [messages]); 

    useEffect(() => {
        if (!isConnected || !contract || isAppLoading) { 
            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
            return;
        }
        const startPolling = () => {
            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = setInterval(async () => {
                try {
                    const totalMessages = await contract.contadorMensagens();
                    if (Number(totalMessages) > lastMessageCountRef.current) {
                        const newMessagesCount = Number(totalMessages) - lastMessageCountRef.current;
                        const container = messagesContainerRef.current;
                        const isAtBottom = container ? (container.scrollHeight - container.scrollTop - container.clientHeight) < container.clientHeight : true;
                        await loadNewerMessages(contract);
                        if (isAtBottom) {
                            setTimeout(() => scrollToBottom(), 300);
                        } else {
                            setUnseenMessages(prev => prev + newMessagesCount);
                        }
                    }
                } catch (error) {
                    console.error("Erro no polling:", error);
                }
            }, 5000); 
        };
        startPolling();
        return () => {
            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
        };
    }, [isConnected, contract, isAppLoading]); 

    useEffect(() => {

        const initApp = async () => {

            try {
                const publicProvider = new ethers.JsonRpcProvider(MONAD_TESTNET.rpcUrls[0]);
                const readOnlyContract = new ethers.Contract(CONTRACT_ADDRESS, ABI, publicProvider);

                await loadMessages(readOnlyContract);
            } catch (error) {
                console.error("Erro ao inicializar:", error);
                if (error.code === -32007 || (error.error && error.error.code === -32007)) {
                    showPopup('A rede está congestionada. Por favor, recarregue a página em alguns instantes.', 'error', true);
                }
            } finally {

                setIsInitialLoad(false)
                setIsAppLoading(false); 
            }
        };
        initApp();
    }, []);

    useEffect(() => {
        if (!isInitialLoad) {
            setTimeout(() => scrollToBottom(), 300);
        }
    }, [isInitialLoad]);
    
    useLayoutEffect(() => {
        const container = messagesContainerRef.current;
        if (container && scrollAnchorRef.current?.scrollHeight) {
            const newHeight = container.scrollHeight;
            const oldHeight = scrollAnchorRef.current.scrollHeight;
            container.scrollTop = newHeight - oldHeight;
            scrollAnchorRef.current = null;
        }
    }, [messages]);
    
    
useEffect(() => {
   
    if (!isConnected || !provider) {
        return;
    }

    
    const web3Provider = provider.provider;
    const handleAccountsChanged = (accounts) => {
        if (accounts.length === 0) {
            showPopup("Carteira desconectada.", "warning");
            disconnectWallet();
        } else {
            initiateConnection(web3Provider, 'Carteira');
        }
    };
    if (web3Provider && web3Provider.on) {
        web3Provider.on('accountsChanged', handleAccountsChanged);
    }

    const checkNetwork = async () => {
        try {
            const network = await provider.getNetwork();
            const onCorrectNetwork = network.chainId === BigInt(MONAD_TESTNET.chainId);
            
            setIsWrongNetwork(!onCorrectNetwork);
        } catch (error) {
            console.error("Erro ao verificar a rede durante o polling:", error);
            
            setIsWrongNetwork(true);
        }
    };

    checkNetwork(); 

    const networkInterval = setInterval(checkNetwork, 3000);

    return () => {
        clearInterval(networkInterval);
        if (web3Provider && web3Provider.removeListener) {
            web3Provider.removeListener('accountsChanged', handleAccountsChanged);
        }
    };

}, [isConnected, provider]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                showEmojiPicker &&
                emojiPickerRef.current && 
                !emojiPickerRef.current.contains(event.target) &&
                emojiButtonRef.current &&
                !emojiButtonRef.current.contains(event.target)
            ) {
                setShowEmojiPicker(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showEmojiPicker]); 

    return (
        <div className="app-container">
            <header className="header-fixed flex items-center justify-between px-4">
                <div className="flex items-center gap-3">
                    <div className="logo">
                        <img src="/images/logo.png" title="Obrigado por usar!" alt="Logo"></img>
                    </div>
                    <div className="hidden sm:block">
                        <div className={`status-indicator ${isConnected ? 'status-connected' : 'status-disconnected'}`}>
                            <i className="fas fa-circle text-xs"></i>
                            {isConnected ? 'Conectado' : 'Somente Leitura'}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {isConnected ? (
                        <>
                            <div className="balance-display">
                                <div className="balance-amount" title="Seu saldo de MONs"><img src="/images/monad.png" alt="Monad token"></img> {parseFloat(balance).toFixed(2)}</div>
                            </div>
                            <div className="dropdown-container relative">
                                <button onClick={() => setShowDropdown(!showDropdown)}>
                                    {userProfile?.profilePicHash ? (<img src={getIPFSUrl(userProfile.profilePicHash)} alt="Perfil" className="profile-pic" />) : (<img src="/images/nopfp.png" alt="Sem foto" className="profile-pic" />)}
                                </button>
                                {showDropdown && (
                                    <div className="dropdown-menu">
                                        
                                        <div className="dropdown-info-item" title={account}>
                                            <i className="fas fa-wallet text-gray-400"></i>
                                            <span>{truncateAddress(account)}</span>
                                        </div>
                                        <hr className="my-1 border-gray-600" />
                                        

                                        <div className="dropdown-item" onClick={() => { handleProfileClick(account); setShowDropdown(false); }}><i className="fas fa-user"></i>Meu Perfil</div>
                                        <div className="dropdown-item" onClick={() => { setShowEditProfileModal(true); setShowDropdown(false); }}><i className="fas fa-edit"></i>Editar Perfil</div>
                                        <div className="dropdown-item" onClick={() => { setShowAboutModal(true); setShowDropdown(false); }}><i className="fas fa-info-circle"></i>Sobre o Site</div>
                                        
                                        {(isOwner || isModerator) && (
                                            <>
                                                <hr className="my-1 border-gray-600" />
                                                <div className="dropdown-item" onClick={() => openModerationModal('ban')}><i className="fas fa-ban"></i>Banir Usuário</div>
                                                <div className="dropdown-item" onClick={() => openModerationModal('unban')}><i className="fas fa-check"></i>Desbanir Usuário</div>
                                            </>
                                        )}
                                        
                                        {isOwner && (
                                            <>
                                                <div className="dropdown-item" onClick={() => openModerationModal('addModerator')}><i className="fas fa-shield-alt"></i>Adicionar Moderador</div>
                                                <div className="dropdown-item" onClick={() => openModerationModal('removeModerator')}><i className="fas fa-shield-alt"></i>Remover Moderador</div>
                                            </>
                                        )}

                                        <hr className="my-1 border-gray-600" />
                                        <div className="dropdown-item text-red-400 hover:text-red-500" onClick={() => { disconnectWallet(); setShowDropdown(false); }}>
                                            <i className="fas fa-sign-out-alt"></i>Desconectar
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <>
                            <button onClick={() => setShowAboutModal(true)} className="btn btn-secondary btn-sm sobrebtn"><i className="fas fa-info-circle"></i>Sobre</button>
                            <button onClick={() => setShowWalletConnectModal(true)} className="btn btn-primary btn-sm" disabled={isInitialLoad}>
                                {isInitialLoad ? (<div className="loading-spinner" style={{ width: '16px', height: '16px' }}></div>) : (<i className="fas fa-wallet"></i>)}
                                {isInitialLoad ? 'Carregando...' : 'Conectar'}
                            </button>
                        </>
                    )}
                </div>
            </header>
            <div className="chat-container">
                {isInitialLoad ? (
                    <div className="flex flex-1 items-center justify-center">
                        <div className="text-center">
                            <div className="loading-spinner" style={{ width: '48px', height: '48px', margin: '0 auto 20px', borderTopColor: '#8B5CF6' }}></div>
                            <p className="text-lg text-gray-300 animate-pulse">Carregando mensagens...</p>
                        </div>
                    </div>
                ) : (
                    <div className="messages" ref={messagesContainerRef} onScroll={handleScroll}>
                        {hasMoreMessages && !isLoadingMore && (
                            <div className="text-center p-2">
                                <button onClick={loadMoreMessages} className="btn btn-secondary"><i className="fas fa-chevron-up mr-2"></i>Carregar Mais Mensagens</button>
                            </div>
                        )}
                        {isLoadingMore && (
                            <div className="text-center p-4">
                                <div className="loading-spinner" style={{ margin: '0 auto' }}></div>
                            </div>
                        )}

                        {!hasMoreMessages && messages.length > 0 && (
                            <div className="text-center p-4 text-sm text-gray-400 italic">
                                Não há mais mensagens para carregar.
                            </div>
                        )}

                        {messages.filter(message => !message.excluida).map((message) => {
                            const isOwn = message.remetente.toLowerCase() === account.toLowerCase();
                            const isSystem = message.remetente === CONTRACT_ADDRESS;
                            const replyMessage = message.respondeA > 0 ? messages.find(m => m.id === message.respondeA) : null;
                            return (
                                
                                <div key={message.id} id={`message-${message.id}`} className={`message ${isOwn ? 'own' : isSystem ? 'system' : 'other'}`}>
                                    {!isOwn && !isSystem && (
                                        <div className="flex items-center gap-2 mb-2">
                                            <button onClick={() => isConnected ? handleProfileClick(message.remetente) : null} className={` ${!isConnected ? 'cursor-default' : ''}`}>
                                                {message.senderProfile?.profilePicHash ? (<img src={getIPFSUrl(message.senderProfile.profilePicHash)} alt="Perfil" className="profile-pic" />) : (<img src="/images/nopfp.png" alt="Sem foto" className="profile-pic" />)}
                                            </button>
                                            <span className="text-sm font-medium">{message.usuario}</span>
                                            {message.senderProfile?.role === 2 && <span title="0xGus" className="role-tag dev">Dev</span>}
                                            {message.senderProfile?.role === 1 && <span title="Moderador do MonChat" className="role-tag mod">Mod</span>}
                                        </div>
                                    )}
                                    <div className={`message-bubble ${isOwn ? 'own' : isSystem ? 'system' : 'other'}`}>
                                        
                                        {replyMessage && (
                                            !replyMessage.excluida ? (
                                                <div 
                                                    className="reply-preview"
                                                    onClick={() => handleScrollToReply(message.respondeA)}
                                                    title="Clique para ver a mensagem original"
                                                >
                                                    <i className="fas fa-reply mr-1"></i>Respondendo a {replyMessage.usuario}: {(replyMessage.imageHash ? 'IMG: ' : '') + (replyMessage.conteudo ? replyMessage.conteudo.substring(0, 50) : '')}...
                                                </div>
                                            ) : (
                                                <div className="reply-preview-deleted">
                                                    <i className="fas fa-ban mr-2 text-gray-500"></i>
                                                    Respondendo a uma mensagem que foi excluída.
                                                </div>
                                            )
                                        )}
                                        
                                        {message.conteudo && (
                                            <div dangerouslySetInnerHTML={{ __html: linkifyText(message.conteudo) }}></div>
                                        )}

                                        {message.imageHash && (
                                            <img 
                                                src={message.imageHash.startsWith('http') ? message.imageHash : getIPFSUrl(message.imageHash)} 
                                                alt="Anexo" 
                                                className="image-preview mt-2" 
                                                onClick={() => showLinkConfirmation(message.imageHash.startsWith('http') ? message.imageHash : getIPFSUrl(message.imageHash))}
                                            />
                                        )}
                                      
                                        {isOwn && isConnected && (
                                            <div className="flex items-center gap-2 mt-2 text-xs">
                                                <span className="text-gray-400" title={new Date(message.timestamp * 1000).toLocaleDateString() + ' ' + new Date(message.timestamp * 1000).toLocaleTimeString()}>{new Date(message.timestamp * 1000).toLocaleTimeString()}</span>
                                                <button onClick={() => handleReply(message)} className="text-gray-400 hover:text-white"><i className="fas fa-reply" title="Responder"></i></button>
                                                <button onClick={() => handleEdit(message)} className="text-gray-400 hover:text-white"><i className="fas fa-edit" title="Editar"></i></button>
                                                <button onClick={() => deleteMessage(message.id)} className="text-gray-400 hover:text-red-400"><i className="fas fa-trash" title="Excluir"></i></button>
                                            </div>
                                        )}
                                        {!isOwn && !isSystem && isConnected && (
                                            <div className="flex items-center gap-2 mt-2 text-xs">
                                                <span className="text-gray-400" title={new Date(message.timestamp * 1000).toLocaleDateString() + ' ' + new Date(message.timestamp * 1000).toLocaleTimeString()}>{new Date(message.timestamp * 1000).toLocaleTimeString()}</span>
                                                <button onClick={() => handleReply(message)} className="text-gray-400 hover:text-white"><i className="fas fa-reply" title="Responder"></i></button>
                                                {(isOwner || isModerator) && (<button onClick={() => deleteMessage(message.id)} className="text-gray-400 hover:text-red-400"><i className="fas fa-trash" title="Excluir via moderador"></i></button>)}
                                            </div>
                                        )}
                                        {(!isConnected || isSystem) && (<div className="flex items-center gap-2 mt-2 text-xs"><span className="text-gray-400" title={new Date(message.timestamp * 1000).toLocaleDateString() + ' ' + new Date(message.timestamp * 1000).toLocaleTimeString()}>{new Date(message.timestamp * 1000).toLocaleTimeString()}</span></div>)}
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

            <footer className="footer-fixed p-4">
                
                {isWrongNetwork && isConnected ? (
                    <div className="text-center p-4 bg-red-900/50 border-t-2 border-red-500 rounded-t-lg animate-pulse">
                        <h3 className="font-bold text-lg text-red-300"><i className="fas fa-exclamation-triangle mr-2"></i>REDE INCORRETA</h3>
                        <p className="text-red-200 mt-1">Por favor, mude sua carteira de volta para a <strong>MONAD TESTNET</strong> para continuar. NÃO TENTE FAZER INTERAÇÕES ATÉ A REDE SER ALTERADA.</p>
                    </div>
                ) : isConnected ? (
                    
                    <>
                        
                        {replyingTo && (<div className="reply-indicator"><i className="fas fa-reply mr-2"></i>Respondendo a {replyingTo.usuario}: {replyingTo.conteudo.substring(0, 50)}...<button onClick={() => setReplyingTo(null)} className="ml-2 text-red-400 hover:text-red-300"><i className="fas fa-times"></i></button></div>)}
                        {editingMessage && (<div className="reply-indicator"><i className="fas fa-edit mr-2"></i>Editando mensagem<button onClick={() => { setEditingMessage(null); setNewMessage(''); }} className="ml-2 text-red-400 hover:text-red-300"><i className="fas fa-times"></i></button></div>)}

                        
                        <div className="flex items-end gap-2 mb-2">
                            {selectedImage && (
                                <div className="relative">
                                    <img src={URL.createObjectURL(selectedImage)} alt="Prévia" className="max-h-24 rounded-md border border-gray-600"/>
                                    <button onClick={() => setSelectedImage(null)} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs focus:outline-none hover:bg-red-700">&times;</button>
                                </div>
                            )}
                            {selectedGifUrl && (
                                <div className="relative">
                                    <img src={selectedGifUrl} alt="Prévia do GIF" className="max-h-24 rounded-md border border-gray-600"/>
                                    <button onClick={() => setSelectedGifUrl(null)} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs focus:outline-none hover:bg-red-700">&times;</button>
                                </div>
                            )}
                        </div>

                        
                        {uploading && (<div className="upload-progress"><p className="text-sm mb-2">Fazendo upload da imagem...</p><div className="progress-bar"><div className="progress-fill" style={{ width: `${uploadProgress}%` }}></div></div></div>)}

                        
                        {userProfile?.exists ? (
                            <div className="flex items-center gap-2">
                                <div className="emoji-picker-container relative">
                                    <button ref={emojiButtonRef} onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="btn btn-icon btn-secondary"><i className="fas fa-smile"></i></button>
                                    {showEmojiPicker && (
                                        <div className="emoji-picker overflow-y-auto pr-2 styled-scrollbar" ref={emojiPickerRef}>
                                            <div className="emoji-grid">
                                                {EMOJIS.map((emoji, index) => (<div key={index} className="emoji-item" onClick={(e) => { e.stopPropagation(); handleEmojiSelect(emoji); }}>{emoji}</div>))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="gif-picker-container relative">
                                    <button onClick={() => setShowGifPicker(!showGifPicker)} className="btn btn-icon btn-secondary">GIF</button>
                                    <GifPicker isOpen={showGifPicker} onClose={() => setShowGifPicker(false)} onSelectGif={handleSelectGif}/>
                                </div>
                                <button onClick={() => fileInputRef.current?.click()} className="btn btn-icon btn-secondary"><i className="fas fa-image"></i></button>
                                <div className="flex-1">
                                    <textarea ref={textareaRef} value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyPress={handleKeyPress} placeholder={editingMessage ? "Editar mensagem..." : "Digite sua mensagem..."} className="input-field resize-none" rows="2" maxLength={280} disabled={uploading} />
                                </div>
                                <button onClick={editingMessage ? () => editMessage(editingMessage.id, newMessage) : sendMessage} className="btn btn-primary" disabled={(!newMessage.trim() && !selectedImage && !selectedGifUrl) || uploading}>
                                    {uploading ? (<div className="loading-spinner"></div>) : editingMessage ? (<i className="fas fa-save"></i>) : (<i className="fas fa-paper-plane"></i>)}
                                </button>
                                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="file-input" />
                            </div>
                        ) : (
                            <div className="text-center">
                                <p className="text-gray-300 mb-4"><i className="fas fa-user-plus mr-2"></i>Você precisa registrar um perfil para enviar mensagens</p>
                                <button onClick={() => setShowEditProfileModal(true)} className="btn btn-primary"><i className="fas fa-user-plus"></i> Criar Perfil</button>
                            </div>
                        )}
                    </>
                ) : (
                    
                    <div className="text-center">
                        <p className="text-gray-300 mb-4"><i className="fas fa-eye mr-2"></i>Você está no modo somente leitura. Conecte sua carteira para participar do chat.</p>
                        <button onClick={() => setShowWalletConnectModal(true)} className="btn btn-primary" disabled={isInitialLoad}>
                            {isInitialLoad ? (<div className="loading-spinner" style={{ width: '16px', height: '16px' }}></div>) : (<i className="fas fa-wallet"></i>)}
                            {isInitialLoad ? 'Carregando...' : 'Conectar Carteira'}
                        </button>
                    </div>
                )}
            </footer>

            {showScrollButton && (
                <button onClick={scrollToBottom} className={`scroll-to-bottom fixed right-10 bottom-36 z-49 ${unseenMessages > 0 ? 'new-message animate-pulse' : ''}`}>
                    <i className="fas fa-arrow-down"></i>
                    {unseenMessages > 0 && (<span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">{unseenMessages}</span>)}
                </button>
            )}
            {popup && <Popup {...popup} />}
            <ProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} userAddress={selectedUserAddress} userProfile={selectedUserProfile} onSendMON={(address) => { setShowProfileModal(false); setShowSendMONModal(true); }} onEditProfile={() => { setShowProfileModal(false); setShowEditProfileModal(true); }} isConnected={isConnected} isOwnProfile={selectedUserAddress.toLowerCase() === account.toLowerCase()} isOwner={isOwner} isModerator={isModerator} onBanUser={banUser} onUnbanUser={unbanUser} onAddModerator={addModerator} />
            <EditProfileModal isOpen={showEditProfileModal} onClose={() => setShowEditProfileModal(false)} currentProfile={userProfile} onSave={userProfile?.exists ? updateProfile : registerUser} />
            <SendMONModal isOpen={showSendMONModal} onClose={() => setShowSendMONModal(false)} recipientAddress={selectedUserAddress} recipientUsername={selectedUserProfile?.username} onSend={sendMON} userBalance={parseFloat(balance).toFixed(2)} />
            <AboutModal 
                isOpen={showAboutModal} 
                onClose={() => setShowAboutModal(false)}
                onConfirm={isForcedAboutModal ? handleAgreeAndProceedToProfile : null}
                forceConfirm={isForcedAboutModal}
            />
            
            <WalletConnectModal 
                isOpen={showWalletConnectModal} 
                onClose={() => setShowWalletConnectModal(false)}
                availableWallets={availableWallets} 
                onConnect={handleConnect}
            />
            <ModerationModal isOpen={showModerationModal} onClose={() => setShowModerationModal(false)} action={moderationAction} onConfirm={handleModerationAction} />
        </div>
    );
}

