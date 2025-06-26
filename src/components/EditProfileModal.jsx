import React, { useState, useEffect } from 'react';
import { uploadToIPFS, getIPFSUrl } from '../utils/ipfs';

export default function EditProfileModal({ isOpen, onClose, currentProfile, onSave }) {
    const [username, setUsername] = useState('');
    const [profilePic, setProfilePic] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [preview, setPreview] = useState(null);
    const [removeImage, setRemoveImage] = useState(false);

    useEffect(() => {
        if (currentProfile) {
            setUsername(currentProfile.username || '');
            setPreview(currentProfile.profilePicHash ? getIPFSUrl(currentProfile.profilePicHash) : null);
            setProfilePic(null);
            setRemoveImage(false);
        }
    }, [currentProfile, isOpen]);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setPreview(URL.createObjectURL(file));
            setProfilePic(file);
            setRemoveImage(false);
        }
    };

    const handleRemoveImage = () => {
        setPreview(null);
        setProfilePic(null);
        setRemoveImage(true);
    };

    const handleSave = async () => {
        try {
            setUploading(true);
            let profilePicHash = currentProfile?.profilePicHash || '';
            if (removeImage) {
                profilePicHash = '';
            } else if (profilePic) {
                profilePicHash = await uploadToIPFS(profilePic, setUploadProgress);
            }
            await onSave(username, profilePicHash);
            onClose();
        } catch (error) {
            console.error('Erro ao salvar perfil:', error);
        } finally {
            setUploading(false);
            setUploadProgress(0);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="close-button" onClick={onClose}>×</button>
                <h2 className="text-xl font-bold mb-4">Editar Perfil</h2>
                <div className="input-group">
                    <label className="block text-sm font-medium mb-2">Foto de perfil</label>
                    <label htmlFor="fileInput" className="relative w-20 h-20 mx-auto group cursor-pointer block">
                        <img src={preview || "/images/nopfp.png"} alt="Foto de perfil" className="w-20 h-20 rounded-full object-cover border-2 border-monad" />
                        <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                            <span className="text-white text-sm">Editar</span>
                        </div>
                    </label>
                    <input type="file" accept="image/*" id="fileInput" className="hidden" onChange={handleImageChange} />
                    <button type="button" onClick={handleRemoveImage} className="mt-2 text-red-500 text-xs underline">Remover foto</button>
                </div>
                <div className="input-group">
                    <label className="block text-sm font-medium mb-2">Nome de usuário</label>
                    <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="input-field" placeholder="Digite seu nome de usuário" maxLength={32} />
                </div>
                {uploading && (
                    <div className="upload-progress">
                        <p className="text-sm mb-2">Fazendo upload da imagem...</p>
                        <div className="progress-bar">
                            <div className="progress-fill" style={{ width: `${uploadProgress}%` }}></div>
                        </div>
                    </div>
                )}
                <div className="flex gap-2 justify-end">
                    <button onClick={onClose} className="btn btn-secondary" disabled={uploading}>Cancelar</button>
                    <button onClick={handleSave} className="btn btn-primary" disabled={uploading || !username.trim()}>{uploading ? 'Salvando...' : 'Salvar'}</button>
                </div>
            </div>
        </div>
    );
}