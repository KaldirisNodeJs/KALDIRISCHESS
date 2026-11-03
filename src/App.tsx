import { useEffect, useRef, useState } from 'react';
import { initWizardChess } from './wizardChessEngine.js';

interface HistoryTurn {
  moveNumber: number;
  white: { san: string; from: string; to: string; piece: string; capture: boolean; color: string } | null;
  black: { san: string; from: string; to: string; piece: string; capture: boolean; color: string } | null;
}

interface SimulatedMoveItem {
  rank: number;
  move: {
    fromR: number;
    fromC: number;
    toR: number;
    toC: number;
    pieceType: string;
    capture: boolean;
  };
  san: string;
  fromAlg: string;
  toAlg: string;
  pieceType: string;
  score: number;
  tacticalDescription: string;
  reasons: string[];
  causesCheck: boolean;
  predictedOpponentReply: {
    san: string;
    fromAlg: string;
    toAlg: string;
    pieceType: string;
  } | null;
}

interface KaldirisChessApi {
  toggleUI?: (force?: boolean) => boolean;
  configureSinglePlayer?: (name: string, side: 'w' | 'b') => void;
  configureLocalTwoPlayer?: (whiteName: string, blackName: string) => void;
  configureMultiplayerCreate?: (name: string, side: 'w' | 'b') => Promise<{ ok: boolean; code?: string }>;
  configureMultiplayerJoin?: (code: string, name: string) => Promise<{ ok: boolean; error?: string }>;
  resetChessBoard?: (orientCamera?: boolean, preserveScript?: boolean) => void;
  performGameReset?: () => void;
  setAutoFlipToPlayerTurn?: (enabled: boolean) => boolean;
  orientCameraToCurrentTurnPlayer?: () => void;
  getMoveHistoryFormatted?: () => HistoryTurn[];
  getTop3SimulatedMoves?: (color?: string) => SimulatedMoveItem[];
  setSimulationMode?: (active: boolean) => { active: boolean; moves: SimulatedMoveItem[] };
  selectSimulatedMove?: (idx: number) => void;
  executeSimulatedMove?: (idx?: number) => boolean;
  isSimulationMode?: () => boolean;
}

export default function App() {
  const initializedRef = useRef(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  // Pre-game setup modal state
  const [setupModalOpen, setSetupModalOpen] = useState(true);
  const [gameModeTab, setGameModeTab] = useState<'single' | 'local' | 'remote'>('single');

  // Confirmation modal for "Nova Partida"
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  // Single player config
  const [singlePlayerName, setSinglePlayerName] = useState('Jogador');
  const [singlePlayerSide, setSinglePlayerSide] = useState<'w' | 'b'>('w');

  // Local 2-player config
  const [localWhiteName, setLocalWhiteName] = useState('Jogador 1');
  const [localBlackName, setLocalBlackName] = useState('Jogador 2');

  // Remote multiplayer config
  const [remoteSubTab, setRemoteSubTab] = useState<'create' | 'join'>('create');
  const [remoteHostName, setRemoteHostName] = useState('Jogador 1');
  const [remoteHostSide, setRemoteHostSide] = useState<'w' | 'b'>('w');
  const [remoteJoinCode, setRemoteJoinCode] = useState('');
  const [remoteJoinName, setRemoteJoinName] = useState('Jogador 2');
  const [createdRoomCode, setCreatedRoomCode] = useState('');
  const [remoteStatusMsg, setRemoteStatusMsg] = useState('');
  const [isSubmittingRemote, setIsSubmittingRemote] = useState(false);

  // User features state
  const [autoFlip, setAutoFlip] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyTurns, setHistoryTurns] = useState<HistoryTurn[]>([]);
  const [simulatorActive, setSimulatorActive] = useState(false);
  const [simMoves, setSimMoves] = useState<SimulatedMoveItem[]>([]);
  const [selectedSimIdx, setSelectedSimIdx] = useState(0);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    initWizardChess();

    // Check if URL has ?room=CODE to automatically switch to remote join tab
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');
    if (roomParam) {
      setGameModeTab('remote');
      setRemoteSubTab('join');
      setRemoteJoinCode(roomParam.toUpperCase());
    }
  }, []);

  useEffect(() => {
    const win = window as unknown as { kaldirisRequestResetConfirmation?: () => void };
    win.kaldirisRequestResetConfirmation = () => {
      setConfirmResetOpen(true);
    };
    return () => {
      delete win.kaldirisRequestResetConfirmation;
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileSheetOpen(false);
        setHelpOpen(false);
        setHistoryOpen(false);
        setConfirmResetOpen(false);
        if (simulatorActive) {
          handleCloseSimulator();
        }
      }
    };
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setMobileSheetOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
    };
  }, [simulatorActive]);

  const getChessApi = (): KaldirisChessApi | null => {
    const win = window as unknown as {
      kaldirisChess?: KaldirisChessApi;
      wizardChess?: KaldirisChessApi;
    };
    return win.kaldirisChess || win.wizardChess || null;
  };

  const handleRestoreUI = () => {
    const api = getChessApi();
    if (api?.toggleUI) {
      api.toggleUI(false);
    } else {
      document.body.classList.remove('cinematic-ui-hidden');
      const btnHide = document.getElementById('btn-hide-ui');
      if (btnHide) btnHide.textContent = 'Ocultar UI [H]';
    }
  };

  const handleToggleAutoFlip = (checked: boolean) => {
    setAutoFlip(checked);
    const api = getChessApi();
    api?.setAutoFlipToPlayerTurn?.(checked);
  };

  const handleToggleHistory = () => {
    const api = getChessApi();
    if (!historyOpen) {
      const turns = api?.getMoveHistoryFormatted?.() || [];
      setHistoryTurns(turns);
      setHelpOpen(false);
    }
    setHistoryOpen((prev) => !prev);
  };

  const handleToggleSimulator = () => {
    const api = getChessApi();
    if (!simulatorActive) {
      const res = api?.setSimulationMode?.(true);
      setSimulatorActive(true);
      setSimMoves(res?.moves || api?.getTop3SimulatedMoves?.() || []);
      setSelectedSimIdx(0);
      setHelpOpen(false);
      setHistoryOpen(false);
    } else {
      handleCloseSimulator();
    }
  };

  const handleCloseSimulator = () => {
    const api = getChessApi();
    api?.setSimulationMode?.(false);
    setSimulatorActive(false);
    setSimMoves([]);
  };

  const handleSelectSimulatedMove = (idx: number) => {
    setSelectedSimIdx(idx);
    const api = getChessApi();
    api?.selectSimulatedMove?.(idx);
  };

  const handleExecuteSimulatedMove = (idx: number) => {
    const api = getChessApi();
    api?.executeSimulatedMove?.(idx);
    setSimulatorActive(false);
    setSimMoves([]);
  };

  const handleConfirmReset = () => {
    setConfirmResetOpen(false);
    const api = getChessApi();
    if (api?.performGameReset) {
      api.performGameReset();
    } else if (api?.resetChessBoard) {
      api.resetChessBoard(true, false);
    }
  };

  // Setup submit handlers
  const handleStartSinglePlayer = () => {
    const api = getChessApi();
    const cleanName = singlePlayerName.trim() || 'Jogador';
    if (api?.configureSinglePlayer) {
      api.configureSinglePlayer(cleanName, singlePlayerSide);
    }
    setSetupModalOpen(false);
  };

  const handleStartLocalTwoPlayer = () => {
    const api = getChessApi();
    const cleanWhite = localWhiteName.trim() || 'Jogador 1';
    const cleanBlack = localBlackName.trim() || 'Jogador 2';
    if (api?.configureLocalTwoPlayer) {
      api.configureLocalTwoPlayer(cleanWhite, cleanBlack);
    }
    setSetupModalOpen(false);
  };

  const handleCreateRemoteRoom = async () => {
    const api = getChessApi();
    const cleanName = remoteHostName.trim() || 'Jogador 1';
    setIsSubmittingRemote(true);
    setRemoteStatusMsg('Criando sala no santuário...');
    try {
      if (api?.configureMultiplayerCreate) {
        const res = await api.configureMultiplayerCreate(cleanName, remoteHostSide);
        if (res && res.code) {
          setCreatedRoomCode(res.code);
          setRemoteStatusMsg(`Sala ${res.code} criada com sucesso! Compartilhe o código.`);
        } else {
          setRemoteStatusMsg('Erro ao gerar sala. Tente novamente.');
        }
      }
    } catch {
      setRemoteStatusMsg('Erro ao comunicar com o servidor da sala.');
    } finally {
      setIsSubmittingRemote(false);
    }
  };

  const handleJoinRemoteRoom = async () => {
    const api = getChessApi();
    const cleanCode = remoteJoinCode.trim().toUpperCase();
    const cleanName = remoteJoinName.trim() || 'Jogador 2';
    if (!cleanCode) {
      setRemoteStatusMsg('Por favor, informe o código de 4 caracteres da sala.');
      return;
    }
    setIsSubmittingRemote(true);
    setRemoteStatusMsg(`Conectando à sala ${cleanCode}...`);
    try {
      if (api?.configureMultiplayerJoin) {
        const res = await api.configureMultiplayerJoin(cleanCode, cleanName);
        if (res && res.ok) {
          setSetupModalOpen(false);
        } else {
          setRemoteStatusMsg(res?.error || 'Não foi possível entrar na sala informada.');
        }
      }
    } catch {
      setRemoteStatusMsg('Erro ao conectar à sala.');
    } finally {
      setIsSubmittingRemote(false);
    }
  };

  const handleCopyCode = () => {
    if (!createdRoomCode) return;
    navigator.clipboard?.writeText(createdRoomCode);
    setRemoteStatusMsg(`Código ${createdRoomCode} copiado para a área de transferência!`);
  };

  const handleCopyLink = () => {
    if (!createdRoomCode) return;
    const inviteUrl = `${window.location.origin}${window.location.pathname}?room=${createdRoomCode}`;
    navigator.clipboard?.writeText(inviteUrl);
    setRemoteStatusMsg('Link de convite copiado para a área de transferência!');
  };

  return (
    <>
      <div id="loading-overlay">
        <div className="loader-title">Kaldiris Chess</div>
        <div className="loader-bar-wrap">
          <div className="loader-bar" id="loader-bar"></div>
        </div>
        <div id="loader-text">Conjurando a Arquitetura do Santuário e as Peças Esculpidas...</div>
      </div>

      <div id="canvas-container"></div>

      <button
        type="button"
        className="hud-btn mobile-only-restore-ui"
        id="btn-mobile-show-ui"
        onClick={handleRestoreUI}
        title="Exibir Controles do HUD"
      >
        Exibir UI
      </button>

      {/* Top HUD: Aligned to the Left, Players Matchup with Active Turn Highlight always visible */}
      <div id="hud-top">
        <div className="hud-group" id="hud-left">
          <div className="brand-pill">
            <span className="brand-title">Kaldiris Chess</span>
          </div>

          {/* Players matchup bar with active turn highlight */}
          <div className="players-match-pill" id="players-match-pill" title="Jogadores da Partida">
            <div className="player-badge active-turn" id="badge-player-white">
              <span className="player-indicator white">⚪</span>
              <span className="player-name" id="name-player-white">Jogador 1</span>
            </div>
            <span className="match-vs-tag">VS</span>
            <div className="player-badge" id="badge-player-black">
              <span className="player-indicator black">⚫</span>
              <span className="player-name" id="name-player-black">IA Kaldiris</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          className={`hud-btn mobile-controls-trigger ${mobileSheetOpen ? 'active' : ''}`}
          id="btn-mobile-controls"
          aria-expanded={mobileSheetOpen}
          aria-controls="hud-right"
          onClick={() => setMobileSheetOpen((prev) => !prev)}
        >
          {mobileSheetOpen ? 'Fechar' : 'Opções & IA'}
        </button>

        <div
          className={`mobile-sheet-backdrop ${mobileSheetOpen ? 'open' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            setMobileSheetOpen(false);
          }}
          aria-hidden="true"
        ></div>

        {/* Right Side Options & AI Menu */}
        <div
          className={`hud-group right-options-menu ${mobileSheetOpen ? 'mobile-sheet-open' : ''}`}
          id="hud-right"
        >
          <div
            className="mobile-sheet-handle-wrap"
            onClick={(e) => {
              e.stopPropagation();
              setMobileSheetOpen(false);
            }}
            aria-hidden="true"
          >
            <div className="mobile-sheet-handle"></div>
          </div>

          <div className="mobile-sheet-header">
            <span className="mobile-sheet-title">Opções &amp; IA</span>
            <button
              type="button"
              className="mobile-sheet-close"
              id="btn-mobile-sheet-close"
              onClick={(e) => {
                e.stopPropagation();
                setMobileSheetOpen(false);
              }}
              aria-label="Fechar Controles"
            >
              Fechar ✕
            </button>
          </div>

          {/* Auto-Flip Checkbox: "Virar p/ Jogador" */}
          <div className="hud-menu-section">
            <div className="mobile-sheet-section-label">Orientação</div>
            <label className="hud-checkbox-label" htmlFor="chk-auto-flip" title="Rotaciona automaticamente o tabuleiro para o jogador da vez, mantendo seu lado para baixo">
              <input
                type="checkbox"
                id="chk-auto-flip"
                className="hud-checkbox"
                checked={autoFlip}
                onChange={(e) => handleToggleAutoFlip(e.target.checked)}
              />
              <span className="hud-checkbox-custom"></span>
              <span className="hud-checkbox-text">Virar p/ Jogador</span>
            </label>
          </div>

          <div className="hud-divider" aria-hidden="true"></div>

          <div className="hud-menu-section">
            <div className="mobile-sheet-section-label">Ações &amp; IA</div>
            <button
              type="button"
              className="hud-btn highlight-btn"
              id="btn-open-setup"
              title="Abrir configurações de modo de jogo e jogadores"
              onClick={() => {
                setSetupModalOpen(true);
                setMobileSheetOpen(false);
              }}
            >
              ⚙️ Modo de Jogo
            </button>
            <button
              className="hud-btn"
              id="btn-ai-move"
              title="Fazer a IA realizar o próximo movimento imediatamente"
              onClick={() => setMobileSheetOpen(false)}
            >
              Jogada da IA
            </button>
            <button
              className="hud-btn"
              id="btn-side-toggle"
              title="Alternar entre jogar de Brancas e jogar de Negras"
              onClick={() => setMobileSheetOpen(false)}
            >
              Jogar de Negras
            </button>
            <button
              className="hud-btn"
              id="btn-reset"
              title="Iniciar uma nova partida no altar"
              onClick={(e) => {
                e.preventDefault();
                setMobileSheetOpen(false);
                setConfirmResetOpen(true);
              }}
            >
              Nova Partida
            </button>
          </div>

          <div className="hud-divider" aria-hidden="true"></div>

          <div className="hud-menu-section">
            <div className="mobile-sheet-section-label">
              <span>Visões de Câmera</span>
            </div>
            <button
              className="hud-btn active"
              id="btn-cam-top"
              title="Visão Superior do Tabuleiro (Clique novamente para inverter orientação)"
            >
              Visão Superior
            </button>
            <button
              className="hud-btn"
              id="btn-cam-player"
              title="Câmera do Jogador (Clique novamente para inverter visão Brancas / Negras)"
            >
              Câmera Jogador
            </button>
            <button
              className="hud-btn"
              id="btn-cam-side"
              title="Visão de Perfil Lateral (Clique novamente para alternar lado Leste / Oeste)"
            >
              Lateral
            </button>
            <button
              className="hud-btn"
              id="btn-cam-wide"
              title="Visão Panorâmica da Catedral (Clique novamente para alternar Rosácea Norte / Nártex Sul)"
            >
              Catedral
            </button>
          </div>

          <div className="hud-divider" aria-hidden="true"></div>

          <div className="hud-menu-section">
            <div className="mobile-sheet-section-label">Áudio e Exibição</div>
            <button
              type="button"
              className="hud-btn"
              id="btn-sound-toggle"
              title="Alternar efeitos sonoros góticos"
            >
              🔊 Som [Ativo]
            </button>

            <button
              className="hud-btn"
              id="btn-hide-ui"
              title="Alternar visibilidade do HUD (Atalho: H)"
              onClick={() => setMobileSheetOpen(false)}
            >
              Ocultar UI [H]
            </button>
          </div>

          <div className="mobile-sheet-hint">
            <strong>Toque:</strong> Peça para mover &nbsp;•&nbsp; 1 dedo: Orbitar &nbsp;•&nbsp; 2 dedos: Deslocar &nbsp;•&nbsp; Pinça: Zoom
          </div>
        </div>
      </div>

      {/* Bottom HUD: Stats bar, Help Popover, History Modal & Simulator */}
      <div id="hud-bottom">
        {/* Controls Help Popover (Toggled via ? icon in stats panel) */}
        <div
          className={`hint-pill ${helpOpen ? 'popover-open' : 'popover-closed'}`}
          id="controls-hint"
        >
          <div className="controls-hint-header">
            <span className="controls-hint-title">✦ Ajuda de Controles</span>
            <button
              type="button"
              className="controls-hint-close"
              onClick={() => setHelpOpen(false)}
              aria-label="Fechar Ajuda"
            >
              ✕
            </button>
          </div>
          <div className="controls-hint-body">
            <strong>Mouse / Touch:</strong> Clique na peça para mover &nbsp;•&nbsp; Botão esquerdo: Orbitar &nbsp;•&nbsp; Botão direito: Mover &nbsp;•&nbsp; Rolar: Zoom
            <br />
            <strong>Teclado:</strong> WASD + R/F: Voo livre &nbsp;•&nbsp; Setas: Rotacionar Câmera &nbsp;•&nbsp; H: Ocultar UI
          </div>
        </div>

        {/* Normal Bottom Statistics Panel */}
        <div className="stats-pill" id="stats-panel" aria-label="Painel de Estatísticas">
          <div className="stats-badge" title="Estatísticas da Partida">
            <span className="stats-badge-icon">✦</span>
            <span className="stats-badge-title">Estatísticas</span>
          </div>

          <div className="stats-metric" title="Tempo total da partida">
            <span className="stats-icon">⏱️</span>
            <span className="stats-label">Tempo:</span>
            <strong className="stats-value" id="stats-time">00:00</strong>
          </div>

          <div className="stats-divider" aria-hidden="true"></div>

          <div className="stats-metric" title="Total de lances realizados">
            <span className="stats-icon">♟️</span>
            <span className="stats-label">Lances:</span>
            <strong className="stats-value" id="stats-moves">0</strong>
          </div>

          <div className="stats-divider" aria-hidden="true"></div>

          <div className="stats-metric" title="Peças capturadas por cada jogador">
            <span className="stats-icon">⚔️</span>
            <span className="stats-label">Capturas:</span>
            <div className="stats-captures-group">
              <span className="stat-cap-side white" title="Peças capturadas pelas Brancas">
                <span className="cap-side-indicator white"></span>
                <span className="cap-side-name">Brancas:</span>
                <strong id="stats-cap-white">0</strong>
                <span className="captured-icons" id="stats-cap-white-icons"></span>
              </span>
              <span className="stat-cap-divider">vs</span>
              <span className="stat-cap-side black" title="Peças capturadas pelas Negras">
                <span className="cap-side-indicator black"></span>
                <span className="cap-side-name">Negras:</span>
                <strong id="stats-cap-black">0</strong>
                <span className="captured-icons" id="stats-cap-black-icons"></span>
              </span>
            </div>
          </div>

          <div className="captured-pill" id="captured-tray"></div>

          {/* Action icon buttons on stats bar: ?, 📜 History, 🔮 Simulator */}
          <div className="stats-actions-group">
            <button
              type="button"
              className={`stats-action-icon-btn ${helpOpen ? 'active' : ''}`}
              id="btn-stats-help"
              title="Ajuda de Controles (?)"
              aria-label="Ajuda de Controles"
              onClick={() => setHelpOpen((prev) => !prev)}
            >
              ❓
            </button>

            <button
              type="button"
              className={`stats-action-icon-btn ${historyOpen ? 'active' : ''}`}
              id="btn-stats-history"
              title="Histórico de Lances da Partida (📜)"
              aria-label="Histórico de Lances"
              onClick={handleToggleHistory}
            >
              📜
            </button>

            <button
              type="button"
              className={`stats-action-icon-btn ${simulatorActive ? 'active-sim' : ''}`}
              id="btn-stats-simulator"
              title="Simulador Tático da IA — Ver 3 Melhores Lances (🔮)"
              aria-label="Simulador Tático da IA"
              onClick={handleToggleSimulator}
            >
              🔮
            </button>
          </div>
        </div>

        {/* Cinematic Hidden-UI Floating Time Bar (Aligned to the Left, Hamburger Menu Icon to restore) */}
        <div className="cinematic-time-bar" id="cinematic-time-bar" aria-label="Tempo de Jogo (Modo Foco)">
          <div className="cinematic-time-content">
            <span className="cinematic-time-icon">⏱️</span>
            <span className="cinematic-time-label">TEMPO:</span>
            <strong className="cinematic-time-val" id="cinematic-stats-time">00:00</strong>
          </div>
          <button
            type="button"
            className="cinematic-restore-btn"
            id="btn-cinematic-restore"
            onClick={handleRestoreUI}
            title="Exibir Interface [H]"
            aria-label="Exibir Interface"
          >
            <span className="hamburger-icon" aria-hidden="true">☰</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal for "Nova Partida" */}
      {confirmResetOpen && (
        <div className="setup-modal-backdrop" id="reset-confirm-backdrop">
          <div className="confirm-modal-card" role="dialog" aria-modal="true" aria-labelledby="reset-modal-title">
            <div className="confirm-modal-header">
              <span className="confirm-modal-icon">⚠️</span>
              <h3 className="confirm-modal-title" id="reset-modal-title">Reiniciar Partida?</h3>
            </div>
            <p className="confirm-modal-desc">
              Deseja realmente iniciar uma nova partida no altar? Todos os lances, capturas e o tempo da partida atual serão reiniciados.
            </p>
            <div className="confirm-modal-actions">
              <button
                type="button"
                className="confirm-btn-cancel"
                onClick={() => setConfirmResetOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="confirm-btn-danger"
                id="btn-confirm-reset-yes"
                onClick={handleConfirmReset}
              >
                Sim, Reiniciar Partida ⚔️
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move History Modal / Drawer */}
      {historyOpen && (
        <div className="history-modal-card" id="move-history-modal" role="dialog" aria-labelledby="history-modal-title">
          <div className="history-modal-header">
            <div className="history-modal-title-wrap">
              <span className="history-modal-icon">📜</span>
              <h3 className="history-modal-title" id="history-modal-title">Histórico de Lances</h3>
            </div>
            <button
              type="button"
              className="history-modal-close"
              onClick={() => setHistoryOpen(false)}
              aria-label="Fechar Histórico"
            >
              ✕
            </button>
          </div>
          <div className="history-modal-body">
            {historyTurns.length === 0 ? (
              <div className="history-empty">Nenhum lance realizado ainda nesta partida.</div>
            ) : (
              <div className="history-table-wrap">
                <table className="history-table">
                  <thead>
                    <tr>
                      <th className="th-num">#</th>
                      <th className="th-side">⚪ Brancas</th>
                      <th className="th-side">⚫ Negras</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyTurns.map((turn) => (
                      <tr key={turn.moveNumber}>
                        <td className="td-num">{turn.moveNumber}.</td>
                        <td className="td-move">
                          {turn.white ? (
                            <span className={`move-badge ${turn.white.capture ? 'capture' : ''}`}>
                              {turn.white.san}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="td-move">
                          {turn.black ? (
                            <span className={`move-badge ${turn.black.capture ? 'capture' : ''}`}>
                              {turn.black.san}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tactical Move Simulator Panel */}
      {simulatorActive && (
        <div className="simulator-panel-card" id="simulator-panel" role="region" aria-labelledby="sim-panel-title">
          <div className="simulator-header">
            <div className="simulator-title-wrap">
              <span className="simulator-icon">🔮</span>
              <div>
                <h3 className="simulator-title" id="sim-panel-title">Simulador Tático (IA Kaldiris)</h3>
                <span className="simulator-subtitle">Matrix etérea ativada • Sequência calculada em 3D</span>
              </div>
            </div>
            <button
              type="button"
              className="simulator-close-btn"
              onClick={handleCloseSimulator}
              title="Encerrar Simulação e Retornar ao Tabuleiro Real"
            >
              ✕
            </button>
          </div>

          <div className="simulator-body">
            {simMoves.length === 0 ? (
              <div className="sim-empty-msg">Nenhum movimento tático disponível na posição atual.</div>
            ) : (
              <div className="sim-cards-list">
                {simMoves.map((item, idx) => {
                  const isSelected = selectedSimIdx === idx;
                  const rankLabels = ['#1 Recomendado', '#2 Alternativo', '#3 Tático'];
                  return (
                    <div
                      key={idx}
                      className={`sim-move-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleSelectSimulatedMove(idx)}
                    >
                      <div className="sim-card-top">
                        <span className={`sim-rank-tag rank-${idx + 1}`}>{rankLabels[idx] || `#${idx + 1}`}</span>
                        <strong className="sim-san-display">{item.san}</strong>
                        <span className="sim-score-badge">+{Math.max(0, item.score).toFixed(0)} pts</span>
                      </div>

                      <div className="sim-card-desc">{item.tacticalDescription}</div>

                      {item.reasons && item.reasons.length > 0 && (
                        <div className="sim-reasons-list">
                          {item.reasons.map((r, rIdx) => (
                            <span key={rIdx} className="sim-reason-pill">✦ {r}</span>
                          ))}
                        </div>
                      )}

                      {item.predictedOpponentReply && (
                        <div className="sim-opp-reply">
                          <span className="sim-opp-icon">⚡</span>
                          <span className="sim-opp-text">
                            Resposta esperada: <strong>{item.predictedOpponentReply.san}</strong> ({item.predictedOpponentReply.fromAlg} → {item.predictedOpponentReply.toAlg})
                          </span>
                        </div>
                      )}

                      <div className="sim-card-actions">
                        <button
                          type="button"
                          className="sim-action-btn select"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectSimulatedMove(idx);
                          }}
                        >
                          {isSelected ? '✓ Em Visualização 3D' : '👁️ Visualizar no Tabuleiro'}
                        </button>
                        <button
                          type="button"
                          className="sim-action-btn execute"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExecuteSimulatedMove(idx);
                          }}
                        >
                          ⚔️ Executar Lance
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="simulator-footer">
            <span className="sim-footer-note">Cores do altar alteradas para simulação. Peças e arcos traçam a trajetória calculada.</span>
            <button
              type="button"
              className="sim-exit-btn"
              onClick={handleCloseSimulator}
            >
              Sair do Simulador
            </button>
          </div>
        </div>
      )}

      {/* Checkmate Overlay */}
      <div id="checkmate-overlay" role="status" aria-live="polite">
        <div className="checkmate-banner">
          <div className="checkmate-ornament">✦ &nbsp; Julgamento do Santuário &nbsp; ✦</div>
          <div className="checkmate-crown" id="checkmate-crown">♔</div>
          <div className="checkmate-title" id="checkmate-title">Xeque-mate</div>
          <div className="checkmate-rule"></div>
          <div className="checkmate-subtitle" id="checkmate-subtitle">
            Brancas Triunfam • O Rei Negro Caiu
          </div>
          <div className="checkmate-stats-summary" id="checkmate-stats-summary"></div>
          <div className="checkmate-actions">
            <button className="checkmate-btn" id="btn-checkmate-replay">
              Repetir Queda do Rei
            </button>
            <button className="checkmate-btn" id="btn-checkmate-newgame">
              Nova Partida
            </button>
            <button className="checkmate-btn secondary" id="btn-checkmate-dismiss">
              Fechar
            </button>
          </div>
        </div>
      </div>

      {/* Pre-Game Configuration Modal */}
      {setupModalOpen && (
        <div className="setup-modal-backdrop" id="game-setup-modal-backdrop">
          <div
            className="setup-modal-card"
            id="game-setup-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="setup-modal-title"
          >
            <div className="setup-modal-header">
              <div className="setup-modal-ornament">✦ &nbsp; KALDIRIS CHESS &nbsp; ✦</div>
              <h2 className="setup-modal-title" id="setup-modal-title">
                Configuração da Partida
              </h2>
              <p className="setup-modal-desc">
                Escolha o modo de jogo antes de iniciar os combates no santuário gótico.
              </p>
              <button
                type="button"
                className="setup-modal-close"
                onClick={() => setSetupModalOpen(false)}
                title="Fechar e continuar partida atual"
                aria-label="Fechar modal de configuração"
              >
                ✕
              </button>
            </div>

            {/* Mode selection tabs */}
            <div className="setup-mode-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={gameModeTab === 'single'}
                className={`setup-mode-tab ${gameModeTab === 'single' ? 'active' : ''}`}
                onClick={() => setGameModeTab('single')}
              >
                <span className="tab-icon">🤖</span>
                <span className="tab-title">Contra a IA</span>
                <span className="tab-subtitle">Jogador vs Computador</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={gameModeTab === 'local'}
                className={`setup-mode-tab ${gameModeTab === 'local' ? 'active' : ''}`}
                onClick={() => setGameModeTab('local')}
              >
                <span className="tab-icon">👥</span>
                <span className="tab-title">2 Jogadores</span>
                <span className="tab-subtitle">Mesmo Tabuleiro / PC</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={gameModeTab === 'remote'}
                className={`setup-mode-tab ${gameModeTab === 'remote' ? 'active' : ''}`}
                onClick={() => setGameModeTab('remote')}
              >
                <span className="tab-icon">🌐</span>
                <span className="tab-title">Partida Remota</span>
                <span className="tab-subtitle">Mesma Rede / Online</span>
              </button>
            </div>

            <div className="setup-tab-content">
              {/* TAB 1: Contra a IA */}
              {gameModeTab === 'single' && (
                <div className="setup-panel">
                  <div className="setup-field-group">
                    <label htmlFor="input-single-name" className="setup-label">
                      Seu Nome:
                    </label>
                    <input
                      id="input-single-name"
                      type="text"
                      className="setup-input"
                      placeholder="Ex: Alexandre"
                      maxLength={24}
                      value={singlePlayerName}
                      onChange={(e) => setSinglePlayerName(e.target.value)}
                    />
                  </div>

                  <div className="setup-field-group">
                    <label className="setup-label">Escolha seu Lado / Peças:</label>
                    <div className="setup-color-picker">
                      <button
                        type="button"
                        className={`color-choice-btn ${singlePlayerSide === 'w' ? 'selected' : ''}`}
                        onClick={() => setSinglePlayerSide('w')}
                      >
                        <span className="choice-indicator white">⚪</span>
                        <div className="choice-info">
                          <strong>Brancas</strong>
                          <span>Inicia a partida (Primeiro lance)</span>
                        </div>
                      </button>

                      <button
                        type="button"
                        className={`color-choice-btn ${singlePlayerSide === 'b' ? 'selected' : ''}`}
                        onClick={() => setSinglePlayerSide('b')}
                      >
                        <span className="choice-indicator black">⚫</span>
                        <div className="choice-info">
                          <strong>Negras</strong>
                          <span>Responde ao lance da IA</span>
                        </div>
                      </button>
                    </div>
                  </div>

                  <div className="setup-info-box">
                    <span className="info-icon">ℹ️</span>
                    <span>
                      Adversário: <strong>IA Kaldiris</strong>. O jogo sempre se inicia na Visão
                      Superior do tabuleiro e a IA jogará automaticamente em sua vez.
                    </span>
                  </div>

                  <div className="setup-actions">
                    <button
                      type="button"
                      className="setup-primary-btn"
                      onClick={handleStartSinglePlayer}
                    >
                      Iniciar Partida Contra IA ⚔️
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: 2 Jogadores no Mesmo PC */}
              {gameModeTab === 'local' && (
                <div className="setup-panel">
                  <div className="setup-row-two">
                    <div className="setup-field-group">
                      <label htmlFor="input-local-white" className="setup-label">
                        Jogador 1 (⚪ Peças Brancas):
                      </label>
                      <input
                        id="input-local-white"
                        type="text"
                        className="setup-input"
                        placeholder="Nome do Jogador 1"
                        maxLength={24}
                        value={localWhiteName}
                        onChange={(e) => setLocalWhiteName(e.target.value)}
                      />
                    </div>

                    <div className="setup-field-group">
                      <label htmlFor="input-local-black" className="setup-label">
                        Jogador 2 (⚫ Peças Negras):
                      </label>
                      <input
                        id="input-local-black"
                        type="text"
                        className="setup-input"
                        placeholder="Nome do Jogador 2"
                        maxLength={24}
                        value={localBlackName}
                        onChange={(e) => setLocalBlackName(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="setup-info-box">
                    <span className="info-icon">👥</span>
                    <span>
                      Ambos os jogadores jogam no <strong>mesmo computador</strong>. A cada lance, o
                      nome do jogador da vez é destacado no topo com a respectiva cor das peças.
                    </span>
                  </div>

                  <div className="setup-actions">
                    <button
                      type="button"
                      className="setup-primary-btn"
                      onClick={handleStartLocalTwoPlayer}
                    >
                      Iniciar Partida Local (2 Jogadores) ⚔️
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: Partida Remota / Mesma Rede */}
              {gameModeTab === 'remote' && (
                <div className="setup-panel">
                  <div className="setup-sub-nav">
                    <button
                      type="button"
                      className={`sub-nav-btn ${remoteSubTab === 'create' ? 'active' : ''}`}
                      onClick={() => {
                        setRemoteSubTab('create');
                        setRemoteStatusMsg('');
                      }}
                    >
                      Criar Nova Sala
                    </button>
                    <button
                      type="button"
                      className={`sub-nav-btn ${remoteSubTab === 'join' ? 'active' : ''}`}
                      onClick={() => {
                        setRemoteSubTab('join');
                        setRemoteStatusMsg('');
                      }}
                    >
                      Entrar com Código
                    </button>
                  </div>

                  {remoteSubTab === 'create' && (
                    <div className="remote-sub-content">
                      <div className="setup-field-group">
                        <label htmlFor="input-remote-hostname" className="setup-label">
                          Seu Nome (Criador da Sala):
                        </label>
                        <input
                          id="input-remote-hostname"
                          type="text"
                          className="setup-input"
                          placeholder="Ex: Mestre Kaldiris"
                          maxLength={24}
                          value={remoteHostName}
                          onChange={(e) => setRemoteHostName(e.target.value)}
                        />
                      </div>

                      <div className="setup-field-group">
                        <label className="setup-label">Suas Peças:</label>
                        <div className="setup-color-picker">
                          <button
                            type="button"
                            className={`color-choice-btn ${remoteHostSide === 'w' ? 'selected' : ''}`}
                            onClick={() => setRemoteHostSide('w')}
                          >
                            <span className="choice-indicator white">⚪</span>
                            <div className="choice-info">
                              <strong>Brancas</strong>
                              <span>Host joga primeiro</span>
                            </div>
                          </button>

                          <button
                            type="button"
                            className={`color-choice-btn ${remoteHostSide === 'b' ? 'selected' : ''}`}
                            onClick={() => setRemoteHostSide('b')}
                          >
                            <span className="choice-indicator black">⚫</span>
                            <div className="choice-info">
                              <strong>Negras</strong>
                              <span>Oponente joga primeiro</span>
                            </div>
                          </button>
                        </div>
                      </div>

                      {!createdRoomCode ? (
                        <div className="setup-actions">
                          <button
                            type="button"
                            className="setup-primary-btn"
                            disabled={isSubmittingRemote}
                            onClick={handleCreateRemoteRoom}
                          >
                            {isSubmittingRemote ? 'Gerando Sala...' : 'Criar Sala de Jogo 🚪'}
                          </button>
                        </div>
                      ) : (
                        <div className="room-created-card">
                          <span className="room-badge-label">CÓDIGO DA SALA:</span>
                          <strong className="room-code-display">{createdRoomCode}</strong>
                          <div className="room-action-buttons">
                            <button
                              type="button"
                              className="room-copy-btn"
                              onClick={handleCopyCode}
                            >
                              📋 Copiar Código
                            </button>
                            <button
                              type="button"
                              className="room-copy-btn"
                              onClick={handleCopyLink}
                            >
                              🔗 Copiar Link de Convite
                            </button>
                          </div>
                          <div className="setup-actions" style={{ marginTop: '12px' }}>
                            <button
                              type="button"
                              className="setup-primary-btn"
                              onClick={() => setSetupModalOpen(false)}
                            >
                              Entrar no Tabuleiro e Aguardar ⚔️
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {remoteSubTab === 'join' && (
                    <div className="remote-sub-content">
                      <div className="setup-field-group">
                        <label htmlFor="input-remote-code" className="setup-label">
                          Código da Sala (4 Caracteres):
                        </label>
                        <input
                          id="input-remote-code"
                          type="text"
                          className="setup-input code-input"
                          placeholder="Ex: 8KQ2"
                          maxLength={6}
                          value={remoteJoinCode}
                          onChange={(e) => setRemoteJoinCode(e.target.value.toUpperCase())}
                        />
                      </div>

                      <div className="setup-field-group">
                        <label htmlFor="input-remote-joinname" className="setup-label">
                          Seu Nome:
                        </label>
                        <input
                          id="input-remote-joinname"
                          type="text"
                          className="setup-input"
                          placeholder="Ex: Desafiante"
                          maxLength={24}
                          value={remoteJoinName}
                          onChange={(e) => setRemoteJoinName(e.target.value)}
                        />
                      </div>

                      <div className="setup-actions">
                        <button
                          type="button"
                          className="setup-primary-btn"
                          disabled={isSubmittingRemote}
                          onClick={handleJoinRemoteRoom}
                        >
                          {isSubmittingRemote ? 'Conectando...' : 'Entrar na Sala e Jogar ⚔️'}
                        </button>
                      </div>
                    </div>
                  )}

                  {remoteStatusMsg && (
                    <div className="setup-status-msg">{remoteStatusMsg}</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
