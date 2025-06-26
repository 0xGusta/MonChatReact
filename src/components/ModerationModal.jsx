import React, { useState } from 'react';

export default function ModerationModal({ isOpen, onClose, action, onConfirm }) {
    const [username, setUsername] = useState('');
    const [processing, setProcessing] = useState(false);

    const handleConfirm = async () => {
        if (!username.trim()) return;
        try {
            setProcessing(true);
            await onConfirm(username.trim());
            onClose();
            setUsername('');
        } catch (error) {
            console.error('Erro na ação de moderação:', error);
        } finally {
            setProcessing(false);
        }
    };

    if (!isOpen) return null;

    const getTitle = () => {
        switch (action) {
            case 'ban': return 'Banir Usuário';
            case 'unban': return 'Desbanir Usuário';
            case 'addModerator': return 'Adicionar Moderador';
            case 'removeModerator': return 'Remover Moderador';
            default: return 'Ação de Moderação';
        }
    };

    const getDescription = () => {
        switch (action) {
            case 'ban': return 'Digite o nome do usuário que deseja banir:';
            case 'unban': return 'Digite o nome do usuário que deseja desbanir:';
            case 'addModerator': return 'Digite o nome do usuário que deseja tornar moderador:';
            case 'removeModerator': return 'Digite o nome do moderador que deseja remover:';
            default: return 'Digite o nome do usuário:';
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <button className="close-button" onClick={onClose}>×</button>
                <h2 className="text-xl font-bold mb-4">{getTitle()}</h2>
                <p className="text-gray-300 mb-4">{getDescription()}</p>
                <div className="input-group">
                    <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="input-field" placeholder="Nome do usuário" maxLength={32} />
                </div>
                <div className="flex gap-2 justify-end">
                    <button onClick={onClose} className="btn btn-secondary" disabled={processing}>Cancelar</button>
                    <button onClick={handleConfirm} className="btn btn-primary" disabled={processing || !username.trim()}>{processing ? 'Processando...' : 'Confirmar'}</button>
                </div>
            </div>
        </div>
    );
}