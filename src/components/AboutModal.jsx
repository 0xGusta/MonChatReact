import React from 'react';

export default function AboutModal({ isOpen, onClose, onConfirm, forceConfirm = false }) {
    if (!isOpen) return null;

    const handleClose = forceConfirm ? () => {} : onClose;

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="text-center">
                    <h2 className="text-xl font-bold mb-4">Sobre o MonChat</h2>
                    <div className="about-modal text-left space-y-3 text-sm max-h-[300px] overflow-y-auto pr-2 styled-scrollbar">
                        <p>
                            Obrigado por usar o MonChat! Este site é um projeto independente e não possui qualquer vínculo oficial com a equipe da Monad.
                        </p>
                        <p>
                            Por favor, não envie informações pessoais sensíveis ou conteúdos inapropriados no chat. Toda atividade realizada aqui é pública na blockchain. Não nos responsabilizamos por eventuais vazamentos, exposição de dados ou qualquer dano causado por uso indevido da plataforma.
                        </p>
                        <p>
                            O site é experimental e pode conter bugs ou instabilidades. Caso algum problema te afete de forma significativa, sinta-se à vontade para entrar em contato com o desenvolvedor.
                        </p>
                        <p>
                            Você pode ser banido ou ter mensagens excluídas do chat caso viole as regras de uso, como enviar spam, conteúdo ilegal ou ofensivo. A equipe do MonChat se reserva o direito de banir usuários que não respeitem as diretrizes da comunidade.
                        </p>
                        <p>
                            O MonChat é um projeto de código aberto. Você pode ver o código fonte no <a href="https://github.com/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">GitHub</a>.
                        </p>

                        <p className="text-gray-400">
                            Lembre-se: Ao interagir aqui, você está ciente de que tudo que for enviado ficará registrado na Blockchain.
                        </p>
                    </div>
                    <a
                        href="https://x.com/0xGustavo"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block mt-4 text-center text-blue-500 hover:underline"
                    >
                        Desenvolvido por 0xGus
                    </a>
                    <button onClick={onConfirm || onClose} className="btn btn-primary mt-4">
                        Concordar e fechar
                    </button>
                </div>
            </div>
        </div>
    );
}