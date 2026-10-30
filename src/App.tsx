import { useEffect, useRef, useState } from 'react';
import { initWizardChess } from './wizardChessEngine.js';

export default function App() {
  const initializedRef = useRef(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    initWizardChess();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileSheetOpen(false);
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
  }, []);

  const handleRestoreUI = () => {
    const win = window as unknown as {
      wizardChess?: { toggleUI?: (force?: boolean) => void };
      kaldirisChess?: { toggleUI?: (force?: boolean) => void };
    };
    if (win.kaldirisChess?.toggleUI) {
      win.kaldirisChess.toggleUI(false);
    } else if (win.wizardChess?.toggleUI) {
      win.wizardChess.toggleUI(false);
    } else {
      document.body.classList.remove('cinematic-ui-hidden');
      const btnHide = document.getElementById('btn-hide-ui');
      if (btnHide) btnHide.textContent = 'Ocultar UI [H]';
    }
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

      <div id="hud-top">
        <div className="hud-group" id="hud-left">
          <div className="brand-pill">
            <span className="brand-title">Kaldiris Chess</span>
          </div>
          <div className="status-pill" id="status-pill">
            <span className="turn-dot" id="turn-dot"></span>
            <span id="turn-text">Vez das Brancas</span>
            <span className="mode-badge" id="mode-badge">Jogando de Brancas</span>
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
          {mobileSheetOpen ? 'Fechar' : 'Controles'}
        </button>

        <div
          className={`mobile-sheet-backdrop ${mobileSheetOpen ? 'open' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            setMobileSheetOpen(false);
          }}
          aria-hidden="true"
        ></div>

        <div
          className={`hud-group ${mobileSheetOpen ? 'mobile-sheet-open' : ''}`}
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
            <span className="mobile-sheet-title">Controles</span>
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

          <div className="mobile-sheet-section-label">Ações da Partida</div>

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
            id="btn-ai-move"
            title="Fazer a IA realizar o próximo movimento imediatamente"
            onClick={() => setMobileSheetOpen(false)}
          >
            Jogada da IA
          </button>
          <button
            className="hud-btn"
            id="btn-reset"
            title="Iniciar uma nova partida no altar"
            onClick={() => setMobileSheetOpen(false)}
          >
            Nova Partida
          </button>

          <div className="hud-divider" aria-hidden="true"></div>
          <div className="mobile-sheet-section-label">
            <span>Visões de Câmera</span>
            <span className="mobile-sheet-section-sub">Toque na visão ativa para inverter</span>
          </div>

          <button
            className="hud-btn active"
            id="btn-cam-player"
            title="Câmera do Jogador (Clique novamente para inverter visão Brancas / Negras)"
          >
            Câmera Jogador
          </button>
          <button
            className="hud-btn"
            id="btn-cam-top"
            title="Visão Superior do Tabuleiro (Clique novamente para inverter orientação)"
          >
            Visão Superior
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

          <div className="hud-divider" aria-hidden="true"></div>
          <div className="mobile-sheet-section-label">Estatísticas da Partida</div>
          <div className="mobile-stats-card">
            <div className="mobile-stat-box" title="Tempo total decorrido da partida">
              <span className="mobile-stat-icon">⏱️</span>
              <span className="mobile-stat-label">Tempo</span>
              <strong className="mobile-stat-val" id="mobile-stats-time">00:00</strong>
            </div>
            <div className="mobile-stat-box" title="Número total de lances realizados">
              <span className="mobile-stat-icon">♟️</span>
              <span className="mobile-stat-label">Lances</span>
              <strong className="mobile-stat-val" id="mobile-stats-moves">0</strong>
            </div>
            <div className="mobile-stat-box" title="Peças capturadas pelas Brancas">
              <span className="mobile-stat-icon">⚔️</span>
              <span className="mobile-stat-label">Brancas</span>
              <strong className="mobile-stat-val" id="mobile-stats-cap-white">0</strong>
            </div>
            <div className="mobile-stat-box" title="Peças capturadas pelas Negras">
              <span className="mobile-stat-icon">⚔️</span>
              <span className="mobile-stat-label">Negras</span>
              <strong className="mobile-stat-val" id="mobile-stats-cap-black">0</strong>
            </div>
          </div>

          <div className="hud-divider" aria-hidden="true"></div>
          <div className="mobile-sheet-section-label">Exibição e Gestos</div>

          <button
            className="hud-btn"
            id="btn-hide-ui"
            title="Alternar visibilidade do HUD (Atalho: H)"
            onClick={() => setMobileSheetOpen(false)}
          >
            Ocultar UI [H]
          </button>

          <div className="mobile-sheet-hint">
            <strong>Toque:</strong> Toque na peça para mover &nbsp;•&nbsp; Arrastar com 1 dedo: Orbitar &nbsp;•&nbsp; Arrastar com 2 dedos: Mover &nbsp;•&nbsp; Pinça: Zoom
          </div>
        </div>
      </div>

      <div id="hud-bottom">
        <div className="hint-pill" id="controls-hint">
          <strong>Controles:</strong> Clique na peça para mover &nbsp;•&nbsp; Botão esquerdo: Orbitar &nbsp;•&nbsp; Botão direito: Mover &nbsp;•&nbsp; Rolar: Zoom &nbsp;•&nbsp; WASD + R/F: Voo livre &nbsp;•&nbsp; H: Ocultar UI
        </div>

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
        </div>
      </div>

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
    </>
  );
}
