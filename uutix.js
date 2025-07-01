// ==UserScript==
// @name         UUTIX Helper (v5 - setInterval)
// @namespace    http://tampermonkey.net/
// @version      2025-07-01.5
// @description  Uses setInterval polling (300ms) for reliability. Monitors button change, then executes purchase sequence.
// @author       You & Gemini
// @match        https://www.uutix.com/detail?pId=*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=uutix.com
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    // --- 全域變數 ---
    // 將 'observer' 變數改名為 'monitorIntervalId' 以反映其新用途
    let monitorIntervalId = null;
    let isRunning = false;

    // --- 輔助函數 (不變) ---
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    function waitForElement(selector, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const element = document.querySelector(selector);
            if (element) {
                resolve(element);
                return;
            }
            const obs = new MutationObserver((mutations, me) => {
                const targetElement = document.querySelector(selector);
                if (targetElement) {
                    me.disconnect();
                    resolve(targetElement);
                }
            });
            obs.observe(document.body, { childList: true, subtree: true });
            setTimeout(() => {
                obs.disconnect();
                reject(new Error(`Timeout: Element "${selector}" not found after ${timeout}ms`));
            }, timeout);
        });
    }

    // --- UI 介面創建 (不變) ---
    function createControlPanel() {
        const panelCSS = `
            #uutix-helper-panel {
                all: initial; position: fixed; top: 20px; right: 20px; z-index: 99999;
                background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 12px;
                padding: 18px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); display: flex; flex-direction: column;
                gap: 15px; width: 240px;
            }
            #uutix-helper-panel * { all: initial; font-family: inherit; }
            #uutix-helper-panel h3 {
                font-size: 18px; font-weight: 600; color: #333; text-align: center; margin: 0; padding-bottom: 5px;
            }
            #uutix-helper-panel .form-row { display: flex; align-items: center; justify-content: space-between; }
            #uutix-helper-panel label { font-size: 14px; color: #555; }
            #uutix-helper-panel input {
                font-size: 14px; border: 1px solid #ccc; border-radius: 4px; padding: 5px 8px; width: 80px;
            }
            #uutix-helper-panel .button-group { display: flex; justify-content: space-between; gap: 10px; }
            #uutix-helper-panel button {
                flex-grow: 1; background-color: #f0f0f0; border: 1px solid #ccc; border-radius: 6px;
                padding: 8px; cursor: pointer; font-weight: 500; transition: background-color 0.2s, border-color 0.2s;
            }
            #uutix-helper-panel button:hover { border-color: #999; }
            #uutix-helper-panel #start-button { background-color: #28a745; color: white; border-color: #28a745; }
            #uutix-helper-panel #start-button:hover { background-color: #218838; border-color: #1e7e34; }
            #uutix-helper-panel #stop-button { background-color: #dc3545; color: white; border-color: #dc3545; }
            #uutix-helper-panel #stop-button:hover { background-color: #c82333; border-color: #bd2130; }
            #uutix-helper-panel #status-display {
                font-size: 14px; text-align: center; font-weight: bold; padding: 8px;
                border-radius: 6px; background-color: #f8f9fa;
            }
        `;
        GM_addStyle(panelCSS);

        const panel = document.createElement('div');
        panel.id = 'uutix-helper-panel';
        panel.innerHTML = `
            <h3>UUTIX 小幫手 v5</h3>
            <div class="form-row">
                <label for="price-position">票價位置 (1, 2...):</label>
                <input type="number" id="price-position" value="1" min="1">
            </div>
            <div class="form-row">
                <label for="ticket-quantity">目標數量:</label>
                <input type="number" id="ticket-quantity" value="1" min="1">
            </div>
            <div class="button-group">
                <button id="start-button">開始</button>
                <button id="stop-button">結束</button>
            </div>
            <div id="status-display" style="color: red;">狀態: 已停止</div>
        `;

        document.body.appendChild(panel);
        document.getElementById('start-button').addEventListener('click', startMonitoring);
        document.getElementById('stop-button').addEventListener('click', stopMonitoring);
    }

    // --- 核心購買流程 (不變) ---
    async function executePurchaseSequence() {
        try {
            updateStatus("等待票價介面...", "#ffc107");
            await waitForElement('.select-item-list-pc');
            const pricePosition = parseInt(document.getElementById('price-position').value, 10);
            const quantity = parseInt(document.getElementById('ticket-quantity').value, 10);
            if (isNaN(pricePosition) || pricePosition < 1 || isNaN(quantity) || quantity < 1) throw new Error("輸入無效");
            updateStatus("選擇票價...", "#17a2b8");
            const priceElement = document.querySelector(`.select-item-list-pc > div:nth-child(${pricePosition})`);
            if (!priceElement) throw new Error("找不到票價位置");
            priceElement.click();
            await sleep(200);
            updateStatus("設定數量...", "#17a2b8");
            const increaseButton = document.querySelector('.number-select .increase');
            if (!increaseButton) throw new Error("找不到數量按鈕");
            const clicksNeeded = quantity - 1;
            for (let i = 0; i < clicksNeeded; i++) {
                increaseButton.click();
                await sleep(100);
            }
            await sleep(200);
            updateStatus("點擊購買...", "#007bff");
            const purchaseButton = document.querySelector('.price-wrapper button');
            if (purchaseButton && !purchaseButton.disabled) {
                purchaseButton.click();
                updateStatus("完成: 已點擊購買！", "#28a745");
            } else {
                throw new Error("找不到或購買按鈕無效");
            }
        } catch (error) {
            console.error('UUTIX Helper: 執行過程中發生錯誤', error);
            updateStatus(`錯誤: ${error.message}`, "#dc3545");
        } finally {
            stopMonitoring();
        }
    }

    // --- 監控與啟動 (v5 setInterval 邏輯) ---
    function startMonitoring() {
        if (isRunning) return;

        const targetContainer = document.querySelector('.detail__info-pc');
        if (!targetContainer) {
            alert('錯誤：找不到監控目標 (class="detail__info-pc")，請確認是否在正確的頁面。');
            return;
        }

        isRunning = true;
        updateStatus("輪詢檢查中 (300ms)...", "blue");
        console.log('UUTIX Helper v5: 使用 setInterval 開始輪詢 .detail__info-pc');

        // 使用 setInterval 替換 MutationObserver
        monitorIntervalId = setInterval(() => {
            const normalButton = targetContainer.querySelector('.detail-normal-button');

            // 如果找到了目標按鈕
            if (normalButton) {
                // 1. 立刻停止輪詢，防止重複觸發
                clearInterval(monitorIntervalId);
                monitorIntervalId = null;

                // 2. 執行後續操作
                console.log('UUTIX Helper: 偵測到 detail-normal-button！');
                updateStatus("按鈕已出現，點擊中...", "#28a745");
                normalButton.click();
                executePurchaseSequence();
            }
        }, 300); // 每 300 毫秒檢查一次
    }

    function stopMonitoring() {
        // 修改為清除 setInterval
        if (monitorIntervalId) {
            clearInterval(monitorIntervalId);
            monitorIntervalId = null;
        }
        if (isRunning) {
            const statusDiv = document.getElementById('status-display');
            if (!statusDiv || !statusDiv.textContent.includes("完成")) {
                updateStatus('已停止', '#6c757d');
            }
            isRunning = false;
            console.log('UUTIX Helper: 監控已停止。');
        }
    }

    function updateStatus(message, color) {
        const statusDiv = document.getElementById('status-display');
        if (statusDiv) {
            statusDiv.textContent = `狀態: ${message}`;
            statusDiv.style.color = color;
        }
    }

    // --- 腳本入口 ---
    window.addEventListener('load', createControlPanel, false);

})();