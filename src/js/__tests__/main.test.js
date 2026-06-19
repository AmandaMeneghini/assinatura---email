/**
 * @jest-environment jsdom
 */

describe('Portal de Assinaturas AI/R', () => {
    let app;
    
    // HTML template for testing
    const createTestDOM = () => {
        document.body.innerHTML = `
            <input type="text" id="inputNome" />
            <input type="text" id="inputCargo" />
            <input type="tel" id="inputTelefone" />
            <input type="checkbox" id="toggleTelefone" />
            <div id="campoTelefone" aria-hidden="true"></div>
            <div id="assinatura-preview"></div>
            <div id="toast"></div>
            <button id="btnCopiar"></button>
            <button id="btnAjuda"></button>
            <div class="modal-backdrop" id="modalBemVindo" aria-hidden="true">
                <div class="modal-conteudo">
                    <button class="btn-fechar-modal" data-modal="modalBemVindo"></button>
                    <button data-close-modal="modalBemVindo"></button>
                </div>
            </div>
            <div class="modal-backdrop" id="modalTutorial" aria-hidden="true">
                <div class="modal-conteudo">
                    <button class="btn-fechar-modal" data-modal="modalTutorial"></button>
                    <button data-close-modal="modalTutorial"></button>
                </div>
            </div>
        `;
    };

    beforeEach(() => {
        // Clear localStorage
        localStorage.clear();
        
        // Reset DOM
        createTestDOM();
        
        // Reset module cache and require fresh
        jest.resetModules();
        app = require('../main.js');
        
        // Initialize elementos cache
        app.elementos.inputNome = document.getElementById('inputNome');
        app.elementos.inputCargo = document.getElementById('inputCargo');
        app.elementos.inputTelefone = document.getElementById('inputTelefone');
        app.elementos.toggleTelefone = document.getElementById('toggleTelefone');
        app.elementos.campoTelefone = document.getElementById('campoTelefone');
        app.elementos.preview = document.getElementById('assinatura-preview');
        app.elementos.toast = document.getElementById('toast');
        app.elementos.btnCopiar = document.getElementById('btnCopiar');
        app.elementos.btnAjuda = document.getElementById('btnAjuda');
    });

    afterEach(() => {
        jest.clearAllMocks();
        document.body.innerHTML = '';
    });

    // ============================================
    // CONSTANTS TESTS
    // ============================================
    describe('Constants', () => {
        test('STORAGE_KEYS should have correct values', () => {
            expect(app.STORAGE_KEYS).toEqual({
                DADOS_ASSINATURA: 'dadosAssinaturaAIR',
                BOAS_VINDAS: 'boasVindasAIR2026'
            });
        });

        test('VALORES_PADRAO should have correct default values', () => {
            expect(app.VALORES_PADRAO).toEqual({
                NOME: 'Seu Nome Maneiro Aqui',
                CARGO: 'Seu Cargo Maneiro Aqui'
            });
        });

        test('CONFETTI_CONFIG should have correct configuration', () => {
            expect(app.CONFETTI_CONFIG).toEqual({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 },
                zIndex: 3000
            });
        });
    });

    // ============================================
    // STORAGE FUNCTIONS TESTS
    // ============================================
    describe('Storage Functions', () => {
        describe('safeGetStorage', () => {
            test('should return null for non-existent key', () => {
                const result = app.safeGetStorage('nonExistentKey');
                expect(result).toBeNull();
            });

            test('should return parsed JSON for existing key', () => {
                const testData = { name: 'Test', value: 123 };
                localStorage.setItem('testKey', JSON.stringify(testData));
                
                const result = app.safeGetStorage('testKey');
                expect(result).toEqual(testData);
            });

            test('should return null and log warning on invalid JSON', () => {
                const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
                localStorage.setItem('invalidKey', 'not valid json {');
                
                const result = app.safeGetStorage('invalidKey');
                
                expect(result).toBeNull();
                expect(warnSpy).toHaveBeenCalledWith(
                    'Failed to read from localStorage:',
                    expect.any(Error)
                );
                warnSpy.mockRestore();
            });

            test('should handle localStorage errors gracefully', () => {
                const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
                const getItemSpy = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
                    throw new Error('QuotaExceeded');
                });
                
                const result = app.safeGetStorage('anyKey');
                
                expect(result).toBeNull();
                expect(warnSpy).toHaveBeenCalled();
                
                getItemSpy.mockRestore();
                warnSpy.mockRestore();
            });
        });

        describe('safeSetStorage', () => {
            test('should store JSON stringified value', () => {
                const testData = { name: 'Test', count: 42 };
                app.safeSetStorage('testKey', testData);
                
                const stored = localStorage.getItem('testKey');
                expect(JSON.parse(stored)).toEqual(testData);
            });

            test('should handle localStorage errors gracefully', () => {
                const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
                const setItemSpy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
                    throw new Error('QuotaExceeded');
                });
                
                // Should not throw
                expect(() => app.safeSetStorage('key', 'value')).not.toThrow();
                expect(warnSpy).toHaveBeenCalledWith(
                    'Failed to write to localStorage:',
                    expect.any(Error)
                );
                
                setItemSpy.mockRestore();
                warnSpy.mockRestore();
            });
        });

        describe('carregarDadosSalvos', () => {
            test('should load saved data into form fields', () => {
                const savedData = {
                    nome: 'João Silva',
                    cargo: 'Developer',
                    telefone: '+55 11 99999-9999',
                    mostrarTelefone: true
                };
                localStorage.setItem(app.STORAGE_KEYS.DADOS_ASSINATURA, JSON.stringify(savedData));
                
                app.carregarDadosSalvos();
                
                expect(app.elementos.inputNome.value).toBe('João Silva');
                expect(app.elementos.inputCargo.value).toBe('Developer');
                expect(app.elementos.inputTelefone.value).toBe('+55 11 99999-9999');
                expect(app.elementos.toggleTelefone.checked).toBe(true);
                expect(app.elementos.campoTelefone.classList.contains('mostrar')).toBe(true);
            });

            test('should handle empty localStorage gracefully', () => {
                expect(() => app.carregarDadosSalvos()).not.toThrow();
            });

            test('should handle partial saved data', () => {
                const savedData = { nome: 'Only Name' };
                localStorage.setItem(app.STORAGE_KEYS.DADOS_ASSINATURA, JSON.stringify(savedData));
                
                app.carregarDadosSalvos();
                
                expect(app.elementos.inputNome.value).toBe('Only Name');
                expect(app.elementos.inputCargo.value).toBe('');
            });
        });

        describe('salvarDadosEmCache', () => {
            test('should save form data to localStorage', () => {
                app.elementos.inputNome.value = 'Maria Santos';
                app.elementos.inputCargo.value = 'Manager';
                app.elementos.inputTelefone.value = '+55 11 88888-8888';
                app.elementos.toggleTelefone.checked = true;
                
                app.salvarDadosEmCache();
                
                const saved = JSON.parse(localStorage.getItem(app.STORAGE_KEYS.DADOS_ASSINATURA));
                expect(saved).toEqual({
                    nome: 'Maria Santos',
                    cargo: 'Manager',
                    telefone: '+55 11 88888-8888',
                    mostrarTelefone: true
                });
            });
        });
    });

    // ============================================
    // UI FUNCTIONS TESTS
    // ============================================
    describe('UI Functions', () => {
        describe('toggleCampoTelefone', () => {
            beforeEach(() => {
                // Need to mock atualizarPreview since it's called
                app.elementos.preview.innerHTML = '';
            });

            test('should show phone field when toggle is checked', () => {
                app.elementos.toggleTelefone.checked = true;
                const focusSpy = jest.spyOn(app.elementos.inputTelefone, 'focus');
                
                app.toggleCampoTelefone();
                
                expect(app.elementos.toggleTelefone.getAttribute('aria-checked')).toBe('true');
                expect(app.elementos.campoTelefone.classList.contains('mostrar')).toBe(true);
                expect(app.elementos.campoTelefone.getAttribute('aria-hidden')).toBe('false');
                expect(focusSpy).toHaveBeenCalled();
            });

            test('should hide phone field when toggle is unchecked', () => {
                app.elementos.toggleTelefone.checked = false;
                
                app.toggleCampoTelefone();
                
                expect(app.elementos.toggleTelefone.getAttribute('aria-checked')).toBe('false');
                expect(app.elementos.campoTelefone.classList.contains('mostrar')).toBe(false);
                expect(app.elementos.campoTelefone.getAttribute('aria-hidden')).toBe('true');
            });
        });

        describe('abrirModal', () => {
            test('should open modal and set aria-hidden to false', () => {
                app.abrirModal('modalBemVindo');
                
                const modal = document.getElementById('modalBemVindo');
                expect(modal.classList.contains('mostrar')).toBe(true);
                expect(modal.getAttribute('aria-hidden')).toBe('false');
            });

            test('should focus first focusable element', () => {
                const modal = document.getElementById('modalBemVindo');
                const firstButton = modal.querySelector('button');
                const focusSpy = jest.spyOn(firstButton, 'focus');
                
                app.abrirModal('modalBemVindo');
                
                expect(focusSpy).toHaveBeenCalled();
            });

            test('should handle modal with no focusable elements', () => {
                // Create a modal without any focusable elements
                const emptyModal = document.createElement('div');
                emptyModal.id = 'modalVazio';
                emptyModal.className = 'modal-backdrop';
                emptyModal.setAttribute('aria-hidden', 'true');
                emptyModal.innerHTML = '<div class="modal-conteudo"><p>No focusable elements</p></div>';
                document.body.appendChild(emptyModal);
                
                expect(() => app.abrirModal('modalVazio')).not.toThrow();
                expect(emptyModal.classList.contains('mostrar')).toBe(true);
                
                document.body.removeChild(emptyModal);
            });

            test('should handle non-existent modal gracefully', () => {
                expect(() => app.abrirModal('nonExistentModal')).not.toThrow();
            });
        });

        describe('fecharModal', () => {
            test('should close modal and set aria-hidden to true', () => {
                const modal = document.getElementById('modalBemVindo');
                modal.classList.add('mostrar');
                
                app.fecharModal('modalBemVindo');
                
                expect(modal.classList.contains('mostrar')).toBe(false);
                expect(modal.getAttribute('aria-hidden')).toBe('true');
            });

            test('should handle non-existent modal gracefully', () => {
                expect(() => app.fecharModal('nonExistentModal')).not.toThrow();
            });
        });

        describe('handleModalKeydown', () => {
            test('should close modal on Escape key', () => {
                const modal = document.getElementById('modalBemVindo');
                modal.classList.add('mostrar');
                
                const event = new KeyboardEvent('keydown', { key: 'Escape' });
                app.handleModalKeydown(event);
                
                expect(modal.classList.contains('mostrar')).toBe(false);
            });

            test('should not close modal on other keys', () => {
                const modal = document.getElementById('modalBemVindo');
                modal.classList.add('mostrar');
                
                const event = new KeyboardEvent('keydown', { key: 'Enter' });
                app.handleModalKeydown(event);
                
                expect(modal.classList.contains('mostrar')).toBe(true);
            });

            test('should handle no open modal gracefully', () => {
                const event = new KeyboardEvent('keydown', { key: 'Escape' });
                expect(() => app.handleModalKeydown(event)).not.toThrow();
            });
        });

        describe('mostrarToast', () => {
            beforeEach(() => {
                jest.useFakeTimers();
            });

            afterEach(() => {
                jest.useRealTimers();
            });

            test('should show toast and hide after 3 seconds', () => {
                app.mostrarToast();
                
                expect(app.elementos.toast.classList.contains('mostrar')).toBe(true);
                
                jest.advanceTimersByTime(3000);
                
                expect(app.elementos.toast.classList.contains('mostrar')).toBe(false);
            });
        });
    });

    // ============================================
    // SIGNATURE FUNCTIONS TESTS
    // ============================================
    describe('Signature Functions', () => {
        describe('sanitizeInput', () => {
            test('should escape HTML entities', () => {
                const malicious = '<script>alert("xss")</script>';
                const result = app.sanitizeInput(malicious);
                
                expect(result).not.toContain('<script>');
                expect(result).toContain('&lt;script&gt;');
            });

            test('should escape special characters', () => {
                const input = '< > & " \'';
                const result = app.sanitizeInput(input);
                
                expect(result).toContain('&lt;');
                expect(result).toContain('&gt;');
                expect(result).toContain('&amp;');
            });

            test('should keep normal text unchanged', () => {
                const input = 'João Silva';
                const result = app.sanitizeInput(input);
                
                expect(result).toBe('João Silva');
            });

            test('should handle empty string', () => {
                expect(app.sanitizeInput('')).toBe('');
            });
        });

        describe('gerarHTMLAssinatura', () => {
            test('should generate signature with user data', () => {
                app.elementos.inputNome.value = 'Test User';
                app.elementos.inputCargo.value = 'Developer';
                app.elementos.inputTelefone.value = '';
                app.elementos.toggleTelefone.checked = false;
                
                const html = app.gerarHTMLAssinatura();
                
                expect(html).toContain('Test User');
                expect(html).toContain('Developer');
                expect(html).toContain('AI/R');
            });

            test('should use default values when fields are empty', () => {
                app.elementos.inputNome.value = '';
                app.elementos.inputCargo.value = '';
                
                const html = app.gerarHTMLAssinatura();
                
                expect(html).toContain(app.VALORES_PADRAO.NOME);
                expect(html).toContain(app.VALORES_PADRAO.CARGO);
            });

            test('should include phone when toggle is checked and phone is provided', () => {
                app.elementos.inputNome.value = 'Test';
                app.elementos.inputCargo.value = 'Role';
                app.elementos.inputTelefone.value = '+55 11 99999-9999';
                app.elementos.toggleTelefone.checked = true;
                
                const html = app.gerarHTMLAssinatura();
                
                expect(html).toContain('+55 11 99999-9999');
            });

            test('should not include phone when toggle is unchecked', () => {
                app.elementos.inputNome.value = 'Test';
                app.elementos.inputCargo.value = 'Role';
                app.elementos.inputTelefone.value = '+55 11 99999-9999';
                app.elementos.toggleTelefone.checked = false;
                
                const html = app.gerarHTMLAssinatura();
                
                expect(html).not.toContain('+55 11 99999-9999');
            });

            test('should not include phone when phone field is empty', () => {
                app.elementos.inputNome.value = 'Test';
                app.elementos.inputCargo.value = 'Role';
                app.elementos.inputTelefone.value = '';
                app.elementos.toggleTelefone.checked = true;
                
                const html = app.gerarHTMLAssinatura();
                
                // HTML should not have the phone row
                expect(html).not.toContain('padding-top: 4px');
            });
        });

        describe('atualizarPreview', () => {
            test('should update preview innerHTML and save to cache', () => {
                app.elementos.inputNome.value = 'Preview Test';
                app.elementos.inputCargo.value = 'Tester';
                
                app.atualizarPreview();
                
                expect(app.elementos.preview.innerHTML).toContain('Preview Test');
                expect(app.elementos.preview.innerHTML).toContain('Tester');
                
                // Verify data was saved
                const saved = JSON.parse(localStorage.getItem(app.STORAGE_KEYS.DADOS_ASSINATURA));
                expect(saved.nome).toBe('Preview Test');
            });
        });
    });

    // ============================================
    // COPY SIGNATURE TESTS
    // ============================================
    describe('copiarAssinatura', () => {
        beforeEach(() => {
            jest.useFakeTimers();
            app.elementos.preview.innerHTML = '<p>Test signature</p>';
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        test('should copy using modern Clipboard API when available', async () => {
            const mockWrite = jest.fn().mockResolvedValue(undefined);
            Object.defineProperty(navigator, 'clipboard', {
                value: { write: mockWrite },
                writable: true,
                configurable: true
            });
            window.ClipboardItem = jest.fn().mockImplementation((obj) => obj);
            global.confetti = jest.fn();
            
            await app.copiarAssinatura();
            
            expect(mockWrite).toHaveBeenCalled();
            expect(global.confetti).toHaveBeenCalledWith(app.CONFETTI_CONFIG);
        });

        test('should fallback to execCommand when Clipboard API not available', async () => {
            delete navigator.clipboard;
            delete window.ClipboardItem;
            
            // Mock execCommand since jsdom doesn't have it
            const execCommandMock = jest.fn().mockReturnValue(true);
            document.execCommand = execCommandMock;
            global.confetti = jest.fn();
            
            await app.copiarAssinatura();
            
            expect(execCommandMock).toHaveBeenCalledWith('copy');
            delete document.execCommand;
        });

        test('should show toast and open tutorial on success', async () => {
            const mockWrite = jest.fn().mockResolvedValue(undefined);
            Object.defineProperty(navigator, 'clipboard', {
                value: { write: mockWrite },
                writable: true,
                configurable: true
            });
            window.ClipboardItem = jest.fn().mockImplementation((obj) => obj);
            global.confetti = jest.fn();
            
            await app.copiarAssinatura();
            
            expect(app.elementos.toast.classList.contains('mostrar')).toBe(true);
            
            jest.advanceTimersByTime(500);
            
            const tutorialModal = document.getElementById('modalTutorial');
            expect(tutorialModal.classList.contains('mostrar')).toBe(true);
        });

        test('should handle copy error with alert', async () => {
            const mockWrite = jest.fn().mockRejectedValue(new Error('Copy failed'));
            Object.defineProperty(navigator, 'clipboard', {
                value: { write: mockWrite },
                writable: true,
                configurable: true
            });
            window.ClipboardItem = jest.fn().mockImplementation((obj) => obj);
            
            const alertSpy = jest.spyOn(window, 'alert').mockImplementation();
            const errorSpy = jest.spyOn(console, 'error').mockImplementation();
            
            await app.copiarAssinatura();
            
            expect(errorSpy).toHaveBeenCalled();
            expect(alertSpy).toHaveBeenCalledWith(
                'Não foi possível copiar a assinatura. Por favor, selecione manualmente e copie com Ctrl+C.'
            );
            
            alertSpy.mockRestore();
            errorSpy.mockRestore();
        });

        test('should work without confetti function', async () => {
            const mockWrite = jest.fn().mockResolvedValue(undefined);
            Object.defineProperty(navigator, 'clipboard', {
                value: { write: mockWrite },
                writable: true,
                configurable: true
            });
            window.ClipboardItem = jest.fn().mockImplementation((obj) => obj);
            delete global.confetti;
            
            await expect(app.copiarAssinatura()).resolves.not.toThrow();
        });
    });

    // ============================================
    // EVENT LISTENERS TESTS
    // ============================================
    describe('setupEventListeners', () => {
        test('should attach input listeners', () => {
            const addEventListenerSpy = jest.spyOn(app.elementos.inputNome, 'addEventListener');
            
            app.setupEventListeners();
            
            expect(addEventListenerSpy).toHaveBeenCalledWith('input', expect.any(Function));
        });

        test('should attach toggle listener', () => {
            const addEventListenerSpy = jest.spyOn(app.elementos.toggleTelefone, 'addEventListener');
            
            app.setupEventListeners();
            
            expect(addEventListenerSpy).toHaveBeenCalledWith('change', expect.any(Function));
        });

        test('should attach copy button listener', () => {
            const addEventListenerSpy = jest.spyOn(app.elementos.btnCopiar, 'addEventListener');
            
            app.setupEventListeners();
            
            expect(addEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function));
        });

        test('should attach help button listener', () => {
            const addEventListenerSpy = jest.spyOn(app.elementos.btnAjuda, 'addEventListener');
            
            app.setupEventListeners();
            
            expect(addEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function));
        });

        test('should attach modal close button listeners', () => {
            app.setupEventListeners();
            
            // Simulate clicking close button
            const closeBtn = document.querySelector('.btn-fechar-modal');
            const modal = document.getElementById('modalBemVindo');
            modal.classList.add('mostrar');
            
            closeBtn.click();
            
            expect(modal.classList.contains('mostrar')).toBe(false);
        });

        test('should close modal using closest when data-modal is not set', () => {
            // Create a modal with close button without data-modal attribute
            const testModal = document.createElement('div');
            testModal.id = 'modalTest';
            testModal.className = 'modal-backdrop mostrar';
            testModal.innerHTML = '<div class="modal-conteudo"><button class="btn-fechar-modal"></button></div>';
            document.body.appendChild(testModal);
            
            app.setupEventListeners();
            
            const closeBtn = testModal.querySelector('.btn-fechar-modal');
            closeBtn.click();
            
            expect(testModal.classList.contains('mostrar')).toBe(false);
            
            document.body.removeChild(testModal);
        });

        test('should attach data-close-modal button listeners', () => {
            app.setupEventListeners();
            
            const closeBtn = document.querySelector('[data-close-modal]');
            const modal = document.getElementById('modalBemVindo');
            modal.classList.add('mostrar');
            
            closeBtn.click();
            
            expect(modal.classList.contains('mostrar')).toBe(false);
        });

        test('should close modal on backdrop click', () => {
            app.setupEventListeners();
            
            const modal = document.getElementById('modalBemVindo');
            modal.classList.add('mostrar');
            
            // Simulate click on backdrop (modal itself)
            const event = new MouseEvent('click', { bubbles: true });
            Object.defineProperty(event, 'target', { value: modal });
            modal.dispatchEvent(event);
            
            expect(modal.classList.contains('mostrar')).toBe(false);
        });

        test('should not close modal when clicking inside modal content', () => {
            app.setupEventListeners();
            
            const modal = document.getElementById('modalBemVindo');
            const content = modal.querySelector('.modal-conteudo');
            modal.classList.add('mostrar');
            
            // Simulate click on content (not backdrop)
            const event = new MouseEvent('click', { bubbles: true });
            Object.defineProperty(event, 'target', { value: content });
            modal.dispatchEvent(event);
            
            expect(modal.classList.contains('mostrar')).toBe(true);
        });
    });

    // ============================================
    // INITIALIZATION TESTS
    // ============================================
    describe('init', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        test('should cache all DOM elements', () => {
            // Reset elementos
            Object.keys(app.elementos).forEach(key => {
                app.elementos[key] = null;
            });
            
            app.init();
            
            expect(app.elementos.inputNome).not.toBeNull();
            expect(app.elementos.inputCargo).not.toBeNull();
            expect(app.elementos.inputTelefone).not.toBeNull();
            expect(app.elementos.toggleTelefone).not.toBeNull();
            expect(app.elementos.campoTelefone).not.toBeNull();
            expect(app.elementos.preview).not.toBeNull();
            expect(app.elementos.toast).not.toBeNull();
            expect(app.elementos.btnCopiar).not.toBeNull();
            expect(app.elementos.btnAjuda).not.toBeNull();
        });

        test('should show welcome modal on first visit', () => {
            // Ensure no boasVindas flag is set
            localStorage.removeItem(app.STORAGE_KEYS.BOAS_VINDAS);
            
            // Reset elementos and re-init
            Object.keys(app.elementos).forEach(key => {
                app.elementos[key] = null;
            });
            
            app.init();
            
            // Advance past the setTimeout(500ms) that opens the modal
            jest.advanceTimersByTime(600);
            
            const welcomeModal = document.getElementById('modalBemVindo');
            expect(welcomeModal.classList.contains('mostrar')).toBe(true);
        });

        test('should not show welcome modal on subsequent visits', () => {
            localStorage.setItem(app.STORAGE_KEYS.BOAS_VINDAS, JSON.stringify(true));
            
            app.init();
            
            jest.advanceTimersByTime(500);
            
            const welcomeModal = document.getElementById('modalBemVindo');
            expect(welcomeModal.classList.contains('mostrar')).toBe(false);
        });

        test('should load saved data on init', () => {
            const savedData = {
                nome: 'Init Test',
                cargo: 'Tester',
                telefone: '',
                mostrarTelefone: false
            };
            localStorage.setItem(app.STORAGE_KEYS.DADOS_ASSINATURA, JSON.stringify(savedData));
            
            app.init();
            
            expect(app.elementos.inputNome.value).toBe('Init Test');
            expect(app.elementos.inputCargo.value).toBe('Tester');
        });

        test('should update preview on init', () => {
            app.init();
            
            expect(app.elementos.preview.innerHTML).toContain('table');
        });
    });

    // ============================================
    // EDGE CASES AND INTEGRATION TESTS
    // ============================================
    describe('Edge Cases', () => {
        test('should handle XSS in all input fields', () => {
            app.elementos.inputNome.value = '<img onerror="alert(1)" src=x>';
            app.elementos.inputCargo.value = '<script>alert(2)</script>';
            app.elementos.inputTelefone.value = '"><script>alert(3)</script>';
            app.elementos.toggleTelefone.checked = true;
            
            const html = app.gerarHTMLAssinatura();
            
            // User input should be sanitized (HTML entities escaped)
            // The < and > are escaped, preventing tag execution
            // Double quotes in text content are safe (not in attributes)
            expect(html).toContain('&lt;script&gt;'); // Escaped script tag from user input
            expect(html).toContain('&lt;img'); // Escaped img tag - no executable tag
            expect(html).toContain('&gt;'); // Closing angle brackets escaped
            
            // Verify no unescaped user script tags exist
            expect(html).not.toMatch(/<script[^>]*>.*alert\(2\)/); // No executable script
        });

        test('should handle very long input values', () => {
            const longString = 'A'.repeat(1000);
            app.elementos.inputNome.value = longString;
            app.elementos.inputCargo.value = longString;
            
            const html = app.gerarHTMLAssinatura();
            
            expect(html).toContain(longString);
        });

        test('should handle special characters in input', () => {
            app.elementos.inputNome.value = 'José María Çağlar';
            app.elementos.inputCargo.value = 'Développeur & Analyste';
            
            const html = app.gerarHTMLAssinatura();
            
            expect(html).toContain('José María Çağlar');
            expect(html).toContain('Développeur &amp; Analyste');
        });
    });

    // ============================================
    // MODULE LOADING TESTS
    // ============================================
    describe('Module Loading', () => {
        test('should add DOMContentLoaded listener when document is loading', () => {
            jest.resetModules();
            
            // Mock document.readyState as 'loading'
            const originalReadyState = Object.getOwnPropertyDescriptor(document, 'readyState');
            Object.defineProperty(document, 'readyState', {
                value: 'loading',
                writable: true,
                configurable: true
            });
            
            const addEventListenerSpy = jest.spyOn(document, 'addEventListener');
            
            // Re-require the module with mocked readyState
            require('../main.js');
            
            expect(addEventListenerSpy).toHaveBeenCalledWith('DOMContentLoaded', expect.any(Function));
            
            // Restore
            addEventListenerSpy.mockRestore();
            if (originalReadyState) {
                Object.defineProperty(document, 'readyState', originalReadyState);
            }
        });
    });
});
