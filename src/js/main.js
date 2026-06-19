/**
 * Portal de Assinaturas AI/R
 * JavaScript principal da aplicação
 * 
 * @author Amanda Meneghini
 * @version 2.0.0
 */

(function(root, factory) {
    'use strict';
    
    // UMD pattern for browser and test environments
    /* istanbul ignore else */
    if (typeof module === 'object' && module.exports) {
        // Node/CommonJS (Jest)
        module.exports = factory();
    } else {
        // Browser global
        root.AssinaturaApp = factory();
    }
})(/* istanbul ignore next */ typeof self !== 'undefined' ? self : this, function() {
    'use strict';

    // ============================================
    // CONSTANTS
    // ============================================
    const STORAGE_KEYS = {
        DADOS_ASSINATURA: 'dadosAssinaturaAIR',
        BOAS_VINDAS: 'boasVindasAIR2026'
    };

    const VALORES_PADRAO = {
        NOME: 'Seu Nome Maneiro Aqui',
        CARGO: 'Seu Cargo Maneiro Aqui'
    };

    const CONFETTI_CONFIG = {
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        zIndex: 3000
    };

    // ============================================
    // DOM ELEMENT CACHE
    // ============================================
    const elementos = {
        inputNome: null,
        inputCargo: null,
        inputTelefone: null,
        toggleTelefone: null,
        campoTelefone: null,
        preview: null,
        toast: null,
        btnCopiar: null,
        btnAjuda: null
    };

    // ============================================
    // STORAGE FUNCTIONS
    // ============================================

    /**
     * Safely get item from localStorage
     * @param {string} key - Storage key
     * @returns {any} Parsed value or null
     */
    function safeGetStorage(key) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (e) {
            console.warn('Failed to read from localStorage:', e);
            return null;
        }
    }

    /**
     * Safely set item in localStorage
     * @param {string} key - Storage key
     * @param {any} value - Value to store
     */
    function safeSetStorage(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.warn('Failed to write to localStorage:', e);
        }
    }

    /**
     * Load saved data from localStorage and populate fields
     */
    function carregarDadosSalvos() {
        const dados = safeGetStorage(STORAGE_KEYS.DADOS_ASSINATURA);
        if (dados) {
            if (dados.nome) elementos.inputNome.value = dados.nome;
            if (dados.cargo) elementos.inputCargo.value = dados.cargo;
            if (dados.telefone) elementos.inputTelefone.value = dados.telefone;
            if (dados.mostrarTelefone) {
                elementos.toggleTelefone.checked = true;
                elementos.toggleTelefone.setAttribute('aria-checked', 'true');
                elementos.campoTelefone.classList.add('mostrar');
                elementos.campoTelefone.setAttribute('aria-hidden', 'false');
            }
        }
    }

    /**
     * Save current data to localStorage
     */
    function salvarDadosEmCache() {
        const dados = {
            nome: elementos.inputNome.value,
            cargo: elementos.inputCargo.value,
            telefone: elementos.inputTelefone.value,
            mostrarTelefone: elementos.toggleTelefone.checked
        };
        safeSetStorage(STORAGE_KEYS.DADOS_ASSINATURA, dados);
    }

    // ============================================
    // UI FUNCTIONS
    // ============================================

    /**
     * Toggle phone field visibility
     */
    function toggleCampoTelefone() {
        const isChecked = elementos.toggleTelefone.checked;
        elementos.toggleTelefone.setAttribute('aria-checked', String(isChecked));
        elementos.campoTelefone.classList.toggle('mostrar', isChecked);
        elementos.campoTelefone.setAttribute('aria-hidden', String(!isChecked));
        
        if (isChecked) {
            elementos.inputTelefone.focus();
        }
        atualizarPreview();
    }

    // ============================================
    // CLEAR BUTTON FUNCTIONS
    // ============================================

    /**
     * Toggle visibility of clear button based on input value
     * @param {HTMLInputElement} input - The input element
     */
    function toggleClearButton(input) {
        const btn = input.parentElement.querySelector('.btn-limpar');
        if (btn) {
            const hasValue = input.value.length > 0;
            btn.hidden = !hasValue;
        }
    }

    /**
     * Clear input field and hide clear button
     * @param {string} inputId - ID of the input to clear
     */
    function limparInput(inputId) {
        const input = document.getElementById(inputId);
        if (input) {
            input.value = '';
            input.focus();
            toggleClearButton(input);
            atualizarPreview();
        }
    }

    /**
     * Set up clear button listeners for all inputs
     */
    function setupClearButtons() {
        // Add input listeners to toggle clear button visibility
        const inputs = [elementos.inputNome, elementos.inputCargo, elementos.inputTelefone];
        inputs.forEach(input => {
            if (input) {
                input.addEventListener('input', () => toggleClearButton(input));
                // Initialize visibility on load
                toggleClearButton(input);
            }
        });

        // Add click listeners to clear buttons
        document.querySelectorAll('.btn-limpar').forEach(btn => {
            btn.addEventListener('click', () => {
                const inputId = btn.dataset.input;
                limparInput(inputId);
            });
        });
    }

    /**
     * Open a modal by ID
     * @param {string} id - Modal ID
     */
    function abrirModal(id) {
        const modal = document.getElementById(id);
        if (modal) {
            modal.classList.add('mostrar');
            modal.setAttribute('aria-hidden', 'false');
            
            // Focus on first focusable element
            const focusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            if (focusable) focusable.focus();
            
            // Trap focus in modal
            document.addEventListener('keydown', handleModalKeydown);
        }
    }

    /**
     * Close a modal by ID
     * @param {string} id - Modal ID
     */
    function fecharModal(id) {
        const modal = document.getElementById(id);
        if (modal) {
            modal.classList.remove('mostrar');
            modal.setAttribute('aria-hidden', 'true');
            document.removeEventListener('keydown', handleModalKeydown);
        }
    }

    /**
     * Handle keydown events in modals (Escape to close)
     * @param {KeyboardEvent} event
     */
    function handleModalKeydown(event) {
        if (event.key === 'Escape') {
            const openModal = document.querySelector('.modal-backdrop.mostrar');
            if (openModal) {
                fecharModal(openModal.id);
            }
        }
    }

    /**
     * Show success toast
     */
    function mostrarToast() {
        elementos.toast.classList.add('mostrar');
        setTimeout(() => elementos.toast.classList.remove('mostrar'), 3000);
    }

    // ============================================
    // SIGNATURE GENERATION
    // ============================================

    /**
     * Sanitize user input to prevent XSS
     * @param {string} str - Input string
     * @returns {string} Sanitized string
     */
    function sanitizeInput(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    /**
     * Generate email signature HTML
     * @returns {string} HTML signature
     */
    function gerarHTMLAssinatura() {
        const nome = sanitizeInput(elementos.inputNome.value) || VALORES_PADRAO.NOME;
        const cargo = sanitizeInput(elementos.inputCargo.value) || VALORES_PADRAO.CARGO;
        const telefone = sanitizeInput(elementos.inputTelefone.value);
        const mostrarTelefone = elementos.toggleTelefone.checked && telefone;

        const telefoneHTML = mostrarTelefone ? `
            <tr>
                <td style="font-size:14px; color:#000000; font-family: Arial, sans-serif; padding-top: 4px;">${telefone}</td>
            </tr>` : '';

        return `
<table cellpadding="0" cellspacing="0" border="0" width="600" align="left" style="background-color:#ffffff; font-family: Arial, sans-serif;">
    <tr>    
        <td width="133" align="center" valign="middle" style="padding: 20px 33px 20px 20px">
            <a href="https://aircompany.ai" target="_blank" rel="noopener">
                <img src="http://community.avenuecode.biz/wp-content/uploads/2026/04/AIR-LOGO.png" alt="Logo AI/R Company" width="130">
            </a>
        </td>        
        <td valign="middle" style="padding: 20px;">
            <table cellpadding="0" cellspacing="0" border="0">
                <tbody>
                    <tr>
                        <td style="font-size:20px; font-weight:bold; color:#000000; font-family: Arial, sans-serif;">${nome}</td>
                    </tr>
                    <tr>
                        <td style="font-size:14px; color:#000000; font-family: Arial, sans-serif;">${cargo}</td>
                    </tr>
                    ${telefoneHTML}
                </tbody>
            </table>
        </td>
    </tr>   
</table>
<table width="100%" height="60" cellpadding="0" cellspacing="0" border="0">
    <tbody> 
        <tr>
            <td>               
                <img src="http://community.avenuecode.biz/wp-content/uploads/2026/02/LOGOS-POWERHOUSES-ASSINATURA-2.png" alt="AI/R Powerhouses" width="600">              
            </td>
        </tr> 
    </tbody>
</table>`;
    }

    /**
     * Update signature preview and save data
     */
    function atualizarPreview() {
        salvarDadosEmCache();
        elementos.preview.innerHTML = gerarHTMLAssinatura();
    }

    // ============================================
    // COPY SIGNATURE
    // ============================================

    /**
     * Copy signature to clipboard using modern Clipboard API with fallback
     */
    async function copiarAssinatura() {
        try {
            // Try modern Clipboard API first
            if (navigator.clipboard && window.ClipboardItem) {
                const html = elementos.preview.innerHTML;
                const blob = new Blob([html], { type: 'text/html' });
                const clipboardItem = new ClipboardItem({ 'text/html': blob });
                await navigator.clipboard.write([clipboardItem]);
            } else {
                // Fallback for older browsers
                const range = document.createRange();
                range.selectNodeContents(elementos.preview);
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
                document.execCommand('copy');
                selection.removeAllRanges();
            }

            // Success feedback
            if (typeof confetti === 'function') {
                confetti(CONFETTI_CONFIG);
            }
            
            mostrarToast();
            setTimeout(() => abrirModal('modalTutorial'), 500);
            
        } catch (err) {
            console.error('Failed to copy signature:', err);
            // Show error message to user
            alert('Não foi possível copiar a assinatura. Por favor, selecione manualmente e copie com Ctrl+C.');
        }
    }

    // ============================================
    // EVENT LISTENERS
    // ============================================

    /**
     * Set up all event listeners
     */
    function setupEventListeners() {
        // Input listeners for real-time preview
        elementos.inputNome.addEventListener('input', atualizarPreview);
        elementos.inputCargo.addEventListener('input', atualizarPreview);
        elementos.inputTelefone.addEventListener('input', atualizarPreview);

        // Toggle phone field
        elementos.toggleTelefone.addEventListener('change', toggleCampoTelefone);
        
        // Enable Enter key on toggle (accessibility)
        elementos.toggleTelefone.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                elementos.toggleTelefone.checked = !elementos.toggleTelefone.checked;
                toggleCampoTelefone();
            }
        });

        // Copy button
        elementos.btnCopiar.addEventListener('click', copiarAssinatura);

        // Help button
        elementos.btnAjuda.addEventListener('click', () => abrirModal('modalTutorial'));

        // Clear buttons for inputs
        setupClearButtons();

        // Modal close buttons
        document.querySelectorAll('.btn-fechar-modal').forEach(btn => {
            btn.addEventListener('click', () => {
                const modalId = btn.dataset.modal || btn.closest('.modal-backdrop').id;
                fecharModal(modalId);
            });
        });

        // Modal close on data-close-modal buttons
        document.querySelectorAll('[data-close-modal]').forEach(btn => {
            btn.addEventListener('click', () => {
                fecharModal(btn.dataset.closeModal);
            });
        });

        // Close modal on backdrop click
        document.querySelectorAll('.modal-backdrop').forEach(modal => {
            modal.addEventListener('click', (event) => {
                if (event.target === modal) {
                    fecharModal(modal.id);
                }
            });
        });
    }

    // ============================================
    // INITIALIZATION
    // ============================================

    /**
     * Initialize the application
     */
    function init() {
        // Cache DOM elements
        elementos.inputNome = document.getElementById('inputNome');
        elementos.inputCargo = document.getElementById('inputCargo');
        elementos.inputTelefone = document.getElementById('inputTelefone');
        elementos.toggleTelefone = document.getElementById('toggleTelefone');
        elementos.campoTelefone = document.getElementById('campoTelefone');
        elementos.preview = document.getElementById('assinatura-preview');
        elementos.toast = document.getElementById('toast');
        elementos.btnCopiar = document.getElementById('btnCopiar');
        elementos.btnAjuda = document.getElementById('btnAjuda');

        // Set up event listeners
        setupEventListeners();

        // Load saved data and update preview
        carregarDadosSalvos();
        atualizarPreview();

        // Update clear buttons visibility after loading saved data
        [elementos.inputNome, elementos.inputCargo, elementos.inputTelefone].forEach(input => {
            if (input) toggleClearButton(input);
        });

        // Show welcome modal on first visit
        if (!safeGetStorage(STORAGE_KEYS.BOAS_VINDAS)) {
            setTimeout(() => abrirModal('modalBemVindo'), 500);
            safeSetStorage(STORAGE_KEYS.BOAS_VINDAS, true);
        }
    }

    // Run on DOM ready (only in browser environment)
    /* istanbul ignore if */
    if (typeof document !== 'undefined') {
        /* istanbul ignore else */
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }
    }

    // ============================================
    // EXPORT PUBLIC API (for testing)
    // ============================================
    return {
        // Constants
        STORAGE_KEYS,
        VALORES_PADRAO,
        CONFETTI_CONFIG,
        elementos,
        
        // Storage functions
        safeGetStorage,
        safeSetStorage,
        carregarDadosSalvos,
        salvarDadosEmCache,
        
        // UI functions
        toggleCampoTelefone,
        abrirModal,
        fecharModal,
        handleModalKeydown,
        mostrarToast,
        
        // Clear button functions
        toggleClearButton,
        limparInput,
        setupClearButtons,
        
        // Signature functions
        sanitizeInput,
        gerarHTMLAssinatura,
        atualizarPreview,
        copiarAssinatura,
        
        // Setup functions
        setupEventListeners,
        init
    };
});
