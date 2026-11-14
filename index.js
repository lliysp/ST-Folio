// @ts-nocheck
/* ==================================================
   ST-Folio — 预设书页
   --------------------------------------------------
   纯前端原生 DOM 扩展，只处理「AI 回复配置」预设面板。
   不替换任何原生 <select>，不改写原生数据流，
   只做：折叠 / 滑动锁。
   ================================================== */

(function () {
    'use strict';

    const LOG = '[ST-Folio]';
    const STORE_KEY = 'st_folio_state_v1';
    const VERSION = '1.0.0';

    /* ==================================================
       1. 状态
       ================================================== */

    function defaultState() {
        return {
            collapsed: { preset: false, params: false, advanced: false, entries: false },
            sliderLocked: false,
        };
    }

    function loadState() {
        const fallback = defaultState();
        try {
            const raw = localStorage.getItem(STORE_KEY);
            if (!raw) return fallback;
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object') return fallback;

            const collapsed = { ...fallback.collapsed };
            if (parsed.collapsed && typeof parsed.collapsed === 'object') {
                Object.keys(collapsed).forEach((key) => {
                    if (typeof parsed.collapsed[key] === 'boolean') {
                        collapsed[key] = parsed.collapsed[key];
                    }
                });
            }

            return {
                collapsed,
                sliderLocked: parsed.sliderLocked === true,
            };
        } catch (error) {
            console.warn(LOG, '读取本地状态失败', error);
            return fallback;
        }
    }

    const state = loadState();

    function saveState() {
        try {
            localStorage.setItem(STORE_KEY, JSON.stringify(state));
        } catch (error) {
            console.warn(LOG, '写入本地状态失败', error);
        }
    }

    /* ==================================================
       2. DOM 工具
       ================================================== */

    const byId = (id) => document.getElementById(id);
    const qs = (selector, root = document) => root.querySelector(selector);
    const qsa = (selector, root = document) => Array.from(root.querySelectorAll(selector));

    const raf = typeof requestAnimationFrame === 'function'
        ? requestAnimationFrame.bind(globalThis)
        : (callback) => setTimeout(callback, 16);

    function getContext() {
        try {
            return globalThis.SillyTavern?.getContext?.() || null;
        } catch (error) {
            return null;
        }
    }

    function observeDebounced(target, callback, options) {
        if (!target) return null;

        let pending = 0;
        const schedule = () => {
            if (pending) return;
            pending = raf(() => {
                pending = 0;
                try {
                    callback();
                } catch (error) {
                    console.warn(LOG, 'DOM 回调失败', error);
                }
            });
        };

        try {
            const observer = new MutationObserver(schedule);
            observer.observe(target, options || { childList: true, subtree: true });
            return observer;
        } catch (error) {
            console.warn(LOG, '监听 DOM 失败', error);
            return null;
        }
    }

    /* ==================================================
       3. 折叠模块
       ================================================== */

    const FOLD_KEYS = ['preset', 'params', 'advanced', 'entries'];

    function foldHeader(key) {
        return qs(`.stf-fold-header[data-stf-fold="${key}"]`);
    }

    function createFoldHeader(key, title, subtitle) {
        const header = document.createElement('div');
        header.className = 'stf-fold-header';
        header.dataset.stfFold = key;
        header.setAttribute('role', 'button');
        header.setAttribute('tabindex', '0');
        header.setAttribute('aria-expanded', 'true');
        header.innerHTML = [
            '<span class="stf-fold-mark" aria-hidden="true">❖</span>',
            '<span class="stf-fold-titles">',
            `<span class="stf-fold-title">${title}</span>`,
            `<span class="stf-fold-sub">${subtitle}</span>`,
            '</span>',
            '<span class="stf-fold-value"></span>',
            '<span class="stf-fold-actions"></span>',
            '<span class="stf-fold-caret" aria-hidden="true"></span>',
        ].join('');

        header.addEventListener('click', (event) => {
            if (event.target.closest('button, a, input, select, label, .stf-fold-actions')) return;
            toggleFold(key);
        });

        header.addEventListener('keydown', (event) => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            if (event.target.closest('button, a, input, select, label')) return;
            event.preventDefault();
            toggleFold(key);
        });

        return header;
    }

    function getFoldTargets(key) {
        switch (key) {
            case 'preset':
                return [byId('respective-presets-block')].filter(Boolean);
            case 'params':
                return [byId('common-gen-settings-block'), byId('respective-ranges-and-temps')].filter(Boolean);
            case 'advanced':
                return [byId('advanced-ai-config-block')].filter(Boolean);
            case 'entries':
                return [byId('completion_prompt_manager')].filter(Boolean);
            default:
                return [];
        }
    }

    function applyFold(key) {
        const collapsed = state.collapsed[key] === true;

        getFoldTargets(key).forEach((node) => {
            node.classList.toggle('stf-folded', collapsed);
        });

        const header = foldHeader(key);
        if (header) {
            header.classList.toggle('is-collapsed', collapsed);
            header.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
        }
    }

    function toggleFold(key) {
        if (!FOLD_KEYS.includes(key)) return;
        state.collapsed[key] = !state.collapsed[key];
        saveState();
        applyFold(key);
    }

    const PRESET_SELECTS = [
        'settings_preset',
        'settings_preset_novel',
        'settings_preset_openai',
        'settings_preset_textgenerationwebui',
    ];

    function getActivePresetName() {
        let fallback = '';

        for (const id of PRESET_SELECTS) {
            const select = byId(id);
            if (!select) continue;
            const text = String(select.selectedOptions?.[0]?.textContent || '').trim();
            if (!text) continue;
            if (select.getClientRects().length > 0) return text;
            if (!fallback) fallback = text;
        }

        return fallback;
    }

    function setupPresetModule() {
        const block = byId('respective-presets-block');
        if (!block) return false;

        if (!foldHeader('preset')) {
            const header = createFoldHeader('preset', '预设', 'PRESET');
            block.parentElement.insertBefore(header, block);

            const value = header.querySelector('.stf-fold-value');
            const refresh = () => {
                const name = getActivePresetName();
                value.textContent = name;
                value.title = name;
            };

            refresh();
            block.addEventListener('change', refresh, true);
            observeDebounced(block, refresh, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['class', 'style'],
            });
        }

        applyFold('preset');
        return true;
    }

    function setupParamsModule() {
        if (foldHeader('params')) {
            applyFold('params');
            return true;
        }

        const anchor = byId('common-gen-settings-block') || byId('respective-ranges-and-temps');
        if (!anchor) return false;

        const header = createFoldHeader('params', '参数调整', 'PARAMETERS');
        anchor.parentElement.insertBefore(header, anchor);

        const actions = header.querySelector('.stf-fold-actions');
        const lockButton = document.createElement('button');
        lockButton.type = 'button';
        lockButton.className = 'stf-lock-btn';
        lockButton.innerHTML = '<i class="fa-solid fa-lock-open" aria-hidden="true"></i><span>锁定</span>';
        lockButton.title = '锁定滑动条：屏蔽滚轮与触摸操作，防止误触';

        lockButton.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            state.sliderLocked = !state.sliderLocked;
            saveState();
            applySliderLock();
        });

        actions.appendChild(lockButton);

        applyFold('params');
        applySliderLock();
        return true;
    }

    function setupAdvancedModule() {
        const block = byId('advanced-ai-config-block');
        if (!block) return false;

        if (!foldHeader('advanced')) {
            const header = createFoldHeader('advanced', '高级选项', 'ADVANCED');
            block.parentElement.insertBefore(header, block);
        }

        applyFold('advanced');
        return true;
    }

    function setupEntriesModule() {
        const promptManager = byId('completion_prompt_manager');
        if (!promptManager) return false;

        if (foldHeader('entries')) {
            applyFold('entries');
            return true;
        }

        const section = promptManager.closest('.range-block') || promptManager.parentElement;
        if (section) section.classList.add('stf-entries-section');

        const header = createFoldHeader('entries', '预设条目', 'PRESET ENTRIES');
        (promptManager.parentElement || section).insertBefore(header, promptManager);

        const value = header.querySelector('.stf-fold-value');
        const refresh = () => {
            const count = promptManager.querySelectorAll(
                '#completion_prompt_manager_list > li.completion_prompt_manager_prompt',
            ).length;
            value.textContent = `${count} 条`;
            value.title = `${count} 个提示词条目`;
        };

        refresh();
        observeDebounced(promptManager, refresh, { childList: true, subtree: true });

        applyFold('entries');
        return true;
    }

    /* ==================================================
       4. 滑动条锁定
       ================================================== */

    function isPresetRange(target) {
        if (!(target instanceof Element)) return null;
        const slider = target.closest('input[type="range"]');
        if (!slider) return null;
        return slider.closest('#left-nav-panel') ? slider : null;
    }

    function blockSliderGesture(event) {
        if (!state.sliderLocked) return;
        if (event.type === 'pointerdown' && event.pointerType === 'mouse') return;
        if (!isPresetRange(event.target)) return;

        if (event.cancelable) event.preventDefault();
        event.stopPropagation();
    }

    function installSliderGuards() {
        if (globalThis.__stFolioSliderGuards) return;
        globalThis.__stFolioSliderGuards = true;

        const options = { capture: true, passive: false };
        document.addEventListener('wheel', blockSliderGesture, options);
        document.addEventListener('touchstart', blockSliderGesture, options);
        document.addEventListener('touchmove', blockSliderGesture, options);
        document.addEventListener('pointerdown', blockSliderGesture, options);
    }

    function applySliderLock() {
        const locked = state.sliderLocked === true;
        const panel = byId('left-nav-panel');
        if (panel) panel.classList.toggle('stf-sliders-locked', locked);

        qsa('.stf-lock-btn').forEach((button) => {
            button.dataset.locked = locked ? 'true' : 'false';
            button.title = locked
                ? '已锁定：屏蔽滚轮与触摸操作。点击解锁'
                : '锁定滑动条：屏蔽滚轮与触摸操作，防止误触';

            const icon = button.querySelector('i');
            if (icon) icon.className = locked ? 'fa-solid fa-lock' : 'fa-solid fa-lock-open';

            const label = button.querySelector('span');
            if (label) label.textContent = locked ? '已锁定' : '锁定';
        });
    }

    /* ==================================================
       5. 启动
       ================================================== */

    function boot() {
        const status = {
            preset: false,
            params: false,
            advanced: false,
            entries: false,
        };

        try {
            status.preset = setupPresetModule();
            status.params = setupParamsModule();
            status.advanced = setupAdvancedModule();
            status.entries = setupEntriesModule();
            applySliderLock();
        } catch (error) {
            console.warn(LOG, '初始化失败', error);
        }

        return status;
    }

    function init() {
        installSliderGuards();

        console.log(`${LOG} v${VERSION} 启动`);

        let attempts = 0;

        const tick = () => {
            attempts += 1;
            const status = boot();

            const settled = status.preset
                && status.params
                && status.advanced;

            if (settled) return;
            if (attempts >= 40) {
                console.warn(LOG, '部分锚点未找到，停止重试', status);
                return;
            }

            setTimeout(tick, 500);
        };

        tick();

        const ctx = getContext();
        const eventSource = ctx?.eventSource;
        const eventTypes = ctx?.eventTypes || ctx?.event_types;

        if (eventSource?.on && eventTypes) {
            const rebind = () => {
                try {
                    boot();
                } catch (error) {
                    console.warn(LOG, '事件回调失败', error);
                }
            };

            if (eventTypes.APP_READY) eventSource.on(eventTypes.APP_READY, rebind);
            if (eventTypes.SETTINGS_LOADED) eventSource.on(eventTypes.SETTINGS_LOADED, rebind);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
