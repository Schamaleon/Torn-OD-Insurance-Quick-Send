// ==UserScript==
// @name         Torn OD Insurance & Item Quick-Send (v3.5 Xanax & Ecstasy Only)
// @namespace    https://greasyfork.org/
// @version      3.5
// @description  Quick-send manager tailored specifically for Xanax and Ecstasy insurance buttons with custom colors.
// @author       Schamaleon
// @match        https://www.torn.com/item.php*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const SCRIPT_VERSION = "3.5";

    //Xanax and Ecstasy choosable
    const availableItems = [
        { id: "206", name: "Xanax" },
        { id: "197", name: "Ecstasy" }
    ];

    // Buttons with colorcoding
    const defaultConfig = [
        { id: 1, label: "Xanax Insurance 1", targetID: "", itemID: "206", qty: 1, msg: "OD insurance", color: "#33a752" },
        { id: 2, label: "Xanax Insurance 2", targetID: "", itemID: "206", qty: 1, msg: "OD insurance", color: "#33a752" },
        { id: 3, label: "Ecstasy Insurance 1", targetID: "", itemID: "197", qty: 1, msg: "OD insurance", color: "#d81b60" },
        { id: 4, label: "Ecstasy Insurance 2", targetID: "", itemID: "197", qty: 1, msg: "OD insurance", color: "#d81b60" }
    ];

    function getConfig() {
        const saved = localStorage.getItem('torn_od_insurer_config_v5');
        const savedVer = localStorage.getItem('torn_od_insurer_version_v5');

        if (!saved || savedVer !== SCRIPT_VERSION) {
            localStorage.setItem('torn_od_insurer_version_v5', SCRIPT_VERSION);
            saveConfig(defaultConfig);
            return defaultConfig;
        }
        try {
            const parsed = JSON.parse(saved);
            return Array.isArray(parsed) ? parsed : defaultConfig;
        } catch (e) {
            return defaultConfig;
        }
    }

    function saveConfig(cfg) {
        localStorage.setItem('torn_od_insurer_config_v5', JSON.stringify(cfg));
        localStorage.setItem('torn_od_insurer_version_v5', SCRIPT_VERSION);
    }

    function simulateClick(el) {
        if (!el) return;
        ['mousedown', 'mouseup', 'click'].forEach(eventType => {
            el.dispatchEvent(new MouseEvent(eventType, { bubbles: true, cancelable: true, view: window }));
        });
    }

    function setNativeValue(element, value) {
        if (!element) return;
        element.focus();
        element.value = value;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function waitFor(predicate, maxMs = 3500) {
        return new Promise((resolve) => {
            const start = Date.now();
            const interval = setInterval(() => {
                let res = null;
                try {
                    res = predicate();
                } catch (e) {
                    res = null;
                }
                if (res) {
                    clearInterval(interval);
                    resolve(res);
                } else if (Date.now() - start > maxMs) {
                    clearInterval(interval);
                    resolve(null);
                }
            }, 50);
        });
    }

    function injectUI() {
        if (document.getElementById('od-insurer-bar')) return;

        const container = document.querySelector('.content-wrapper') || document.body;
        if (!container) return;

        const bar = document.createElement('div');
        bar.id = 'od-insurer-bar';
        bar.style.cssText = 'background: #222; border: 1px solid #444; border-radius: 5px; padding: 10px; margin-bottom: 10px; color: #fff; font-family: Arial, sans-serif; font-size: 12px;';

        const title = document.createElement('div');
        title.innerHTML = '<strong>Quick-Send Manager (v3.5)</strong>';
        title.style.marginBottom = '8px';
        bar.appendChild(title);

        const btnGroup = document.createElement('div');
        btnGroup.style.cssText = 'display: flex; gap: 8px; flex-wrap: wrap; align-items: center;';

        const config = getConfig();

        config.forEach(item => {
            const btn = document.createElement('button');
            btn.textContent = item.label || "Send";
            btn.style.cssText = `padding: 4px 10px; cursor: pointer; background: ${item.color || '#33a752'}; color: #fff; border: none; border-radius: 3px; font-weight: bold;`;
            btn.onclick = () => processSend(item);
            btnGroup.appendChild(btn);
        });

        const cfgBtn = document.createElement('button');
        cfgBtn.textContent = '⚙ Settings';
        cfgBtn.style.cssText = 'padding: 4px 10px; cursor: pointer; background: #555; color: #fff; border: none; border-radius: 3px;';
        cfgBtn.onclick = toggleSettingsPanel;
        btnGroup.appendChild(cfgBtn);

        bar.appendChild(btnGroup);

        const settingsPanel = document.createElement('div');
        settingsPanel.id = 'od-settings-panel';
        settingsPanel.style.cssText = 'display: none; margin-top: 10px; padding-top: 10px; border-top: 1px dashed #555;';
        renderSettingsForm(settingsPanel);
        bar.appendChild(settingsPanel);

        container.insertBefore(bar, container.firstChild);
    }

    function toggleSettingsPanel() {
        const panel = document.getElementById('od-settings-panel');
        if (panel) panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    }

    function renderSettingsForm(parent) {
        if (!parent) return;
        parent.innerHTML = '';
        const config = getConfig();

        config.forEach((item, idx) => {
            const row = document.createElement('div');
            row.style.cssText = 'display: flex; gap: 6px; align-items: center; margin-bottom: 6px; flex-wrap: wrap;';

            let optionsHTML = availableItems.map(i =>
                `<option value="${i.id}" ${item.itemID === i.id ? 'selected' : ''}>${i.name} (${i.id})</option>`
            ).join('');

            row.innerHTML = `
                <input type="text" placeholder="Label" value="${item.label || ''}" data-key="label" data-idx="${idx}" style="width: 130px; padding: 2px;">
                <input type="text" placeholder="Target ID" value="${item.targetID || ''}" data-key="targetID" data-idx="${idx}" style="width: 70px; padding: 2px;">
                <select data-key="itemID" data-idx="${idx}" style="width: 110px; padding: 2px;">
                    ${optionsHTML}
                </select>
                <input type="number" placeholder="Qty" value="${item.qty || 1}" data-key="qty" data-idx="${idx}" style="width: 40px; padding: 2px;">
                <input type="text" placeholder="Message" value="${item.msg || ''}" data-key="msg" data-idx="${idx}" style="width: 100px; padding: 2px;">
            `;
            parent.appendChild(row);
        });

        const actionRow = document.createElement('div');
        actionRow.style.cssText = 'margin-top: 8px; display: flex; gap: 10px;';

        const saveBtn = document.createElement('button');
        saveBtn.textContent = 'Save Settings';
        saveBtn.style.cssText = 'padding: 3px 8px; background: #2196F3; color: white; border: none; border-radius: 3px; cursor: pointer;';
        saveBtn.onclick = () => {
            const inputs = parent.querySelectorAll('input, select');
            const newConfig = getConfig();
            inputs.forEach(inp => {
                const idx = parseInt(inp.getAttribute('data-idx'), 10);
                const key = inp.getAttribute('data-key');
                if (!isNaN(idx) && key && newConfig[idx]) {
                    if (key === 'qty') {
                        newConfig[idx][key] = parseInt(inp.value, 10) || 1;
                    } else {
                        newConfig[idx][key] = inp.value;
                    }
                }
            });
            saveConfig(newConfig);
            alert('Settings successfully saved!');
            location.reload();
        };

        const resetBtn = document.createElement('button');
        resetBtn.textContent = 'Reset Defaults';
        resetBtn.style.cssText = 'padding: 3px 8px; background: #f44336; color: white; border: none; border-radius: 3px; cursor: pointer;';
        resetBtn.onclick = () => {
            localStorage.removeItem('torn_od_insurer_config_v5');
            localStorage.removeItem('torn_od_insurer_version_v5');
            alert('Settings reset!');
            location.reload();
        };

        actionRow.appendChild(saveBtn);
        actionRow.appendChild(resetBtn);
        parent.appendChild(actionRow);
    }

    async function processSend(cfg) {
        if (!cfg || !cfg.targetID) {
            alert('Please enter a Target Player ID in the Settings (⚙) first!');
            toggleSettingsPanel();
            return;
        }

        const nodes = document.querySelectorAll(`li[data-item="${cfg.itemID}"], li[data-itemid="${cfg.itemID}"]`);
        let targetItem = null;

        for (const node of nodes) {
            if (!node) continue;
            targetItem = node;
            break;
        }

        if (!targetItem) {
            alert(`Item with ID ${cfg.itemID} was not found on this page. Make sure you are in the correct inventory tab.`);
            return;
        }

        simulateClick(targetItem);

        const sendBtn = await waitFor(() => {
            if (!targetItem) return null;
            const btn = targetItem.querySelector('button.option-send, .option-send, [class*="send"]');
            return (btn && btn.offsetWidth > 0) ? btn : null;
        });

        if (!sendBtn) {
            alert('Could not find the Send option button for this item.');
            return;
        }

        simulateClick(sendBtn);

        const userInp = await waitFor(() => document.querySelector('input.user-id, input[name="userID"], #ac-search-0'));
        const qtyInp = document.querySelector('input.amount, input.input-money');

        if (!userInp) {
            alert('Target Player ID input field not found in modal.');
            return;
        }

        setNativeValue(userInp, cfg.targetID);
        if (qtyInp && cfg.qty) {
            setNativeValue(qtyInp, cfg.qty);
        }

        if (cfg.msg) {
            let msgInp = document.querySelector('input.message, input[name="tag"]');
            if (!msgInp) {
                const addMsgLink = document.querySelector('a.action-message');
                if (addMsgLink) {
                    simulateClick(addMsgLink);
                    msgInp = await waitFor(() => document.querySelector('input.message, input[name="tag"]'), 1000);
                }
            }
            if (msgInp) {
                setNativeValue(msgInp, cfg.msg);
            }
        }

        await new Promise(r => setTimeout(r, 150));

        const confirmBtn = await waitFor(() => {
            const btns = Array.from(document.querySelectorAll('button, input[type="submit"]'));
            return btns.find(b => {
                if (!b || b === sendBtn) return false;
                const txt = (b.textContent || b.value || '').trim().toLowerCase();
                return (txt === 'send' || txt.includes('send')) && b.offsetWidth > 0 && !b.disabled;
            });
        }, 1500);

        if (confirmBtn) {
            simulateClick(confirmBtn);
        } else {
            userInp.dispatchEvent(new KeyboardEvent('keydown', { keyCode: 13, key: 'Enter', bubbles: true }));
        }
    }

    const observer = new MutationObserver(() => injectUI());
    observer.observe(document.body, { childList: true, subtree: true });
    injectUI();
})();
