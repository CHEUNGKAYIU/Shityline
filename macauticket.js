// ==UserScript==
// @name         澳門售票網助手 (MacauTicket Helper)
// @namespace    http://tampermonkey.net/
// @version      1.8.1
// @description  【修改版】恢复至v1.8逻辑。助手面板在所有页面显示。支持开售监控、输入记忆、SPA跳转。
// @author       Gemini
// @match        https://www.macauticket.com/TicketWeb2023/programme/*
// @grant        none
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    // =========================================================================
    //  辅助函数区域
    // =========================================================================

    function waitForElement(selector, callback, timeout = 10000) {
        const startTime = Date.now();
        const interval = setInterval(() => {
            const element = document.querySelector(selector);
            if (element) {
                clearInterval(interval);
                callback(element);
            } else if (Date.now() - startTime > timeout) {
                clearInterval(interval);
                console.log(`[抢票助手] 等待超时: 未能找到元素 "${selector}"`);
            }
        }, 200);
    }

    function setInputValue(inputElement, value) {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeInputValueSetter.call(inputElement, value);
        const event = new Event('input', { bubbles: true });
        inputElement.dispatchEvent(event);
    }

    function showNotice(message, color = '#00E676') {
        const notice = document.createElement('div');
        notice.textContent = message;
        Object.assign(notice.style, {
            position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
            backgroundColor: color, color: 'white', padding: '12px 20px',
            borderRadius: '8px', zIndex: '99999', fontSize: '16px',
            boxShadow: '0 4px 10px rgba(0,0,0,0.2)', transition: 'opacity 0.5s', opacity: '1'
        });
        document.body.appendChild(notice);
        setTimeout(() => {
            notice.style.opacity = '0';
            setTimeout(() => notice.remove(), 500);
        }, 4000);
    }

    // =========================================================================
    //  核心逻辑：v1.8 版的 MutationObserver，处理SPA无刷新跳转
    // =========================================================================
    let checkoutActionHasRun = false;

    const observer = new MutationObserver((mutations) => {
        if (checkoutActionHasRun || !document.getElementById('helper-container')) {
            return;
        }

        const autoFillSwitch = document.querySelector('[class^="Switch_container__"]');
        if (autoFillSwitch) {
            console.log('[抢票助手] 检测到结算页面元素，执行后续操作...');
            checkoutActionHasRun = true;
            observer.disconnect(); // v1.8 的逻辑：执行一次后就停止监视

            showNotice('检测到结算页面，开始自动操作...', '#2196F3');

            autoFillSwitch.style.outline = '3px solid #00E676';
            autoFillSwitch.click();
            showNotice('抢票助手：已自动点击“自动填写”！');

            waitForElement('[class^="ShoppingCart_paymentMethodItems__"]', (paymentContainer) => {
                const allGroups = paymentContainer.querySelectorAll('[class^="ShoppingCart_paymentCheckBoxGroup__"]');
                if (allGroups.length === 0) return;
                const lastGroup = allGroups[allGroups.length - 1];
                const paymentCheckbox = lastGroup.querySelector('[class^="ShoppingCart_paymentMethodCheckBox__"]');
                if (paymentCheckbox) {
                    paymentCheckbox.style.outline = '3px solid #FF9800';
                    paymentCheckbox.click();
                    showNotice('抢票助手：已自动选择支付方式！', '#FF9800');
                }
            });
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });


    // =========================================================================
    //  在所有匹配页面注入UI面板
    // =========================================================================
    // 移除 waitForElement 判断，直接执行UI注入
    if (!document.getElementById('helper-container')) {
        const styles = `
            #helper-container { position: fixed; top: 100px; right: 20px; background-color: #ffffff; border: 1px solid #cccccc; border-radius: 8px; padding: 15px; z-index: 9999; box-shadow: 0 4px 8px rgba(0,0,0,0.1); width: 220px; font-family: Arial, sans-serif; }
            #helper-container h3 { margin-top: 0; margin-bottom: 10px; color: #333; text-align: center; font-size: 16px; }
            #helper-container .input-group { margin-bottom: 10px; }
            #helper-container label { display: block; margin-bottom: 5px; font-size: 14px; color: #555; }
            #helper-container input { width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; }
            #helper-container button { width: 100%; padding: 10px; background-color: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; transition: background-color 0.3s; }
            #helper-container button:hover { background-color: #218838; }
            #helper-container button:disabled { background-color: #6c757d; cursor: not-allowed; }
            #helper-container #status-log { margin-top: 10px; font-size: 12px; color: #888; height: 45px; overflow: auto; border-top: 1px solid #eee; padding-top: 5px; }
        `;
        const styleSheet = document.createElement("style");
        styleSheet.innerText = styles;
        document.head.appendChild(styleSheet);

        const container = document.createElement('div');
        container.id = 'helper-container';
        container.innerHTML = `
            <h3>抢票助手 v1.8.1</h3>
            <div class="input-group">
                <label for="price-index">票价序号:</label>
                <input type="number" id="price-index" name="price-index" placeholder="例如: 2 (第二行票价)">
            </div>
            <div class="input-group">
                <label for="ticket-count">票数:</label>
                <input type="number" id="ticket-count" name="ticket-count" placeholder="输入您想要的票数, 如: 2">
            </div>
            <button id="start-monitor-btn">开始监控</button>
            <div id="status-log">请填写信息后开始监控...</div>
        `;
        document.body.appendChild(container);

        const monitorButton = document.getElementById('start-monitor-btn');
        const priceIndexInput = document.getElementById('price-index');
        const ticketCountInput = document.getElementById('ticket-count');
        const logDiv = document.getElementById('status-log');

        priceIndexInput.value = localStorage.getItem('macauTicketPriceIndex') || '';
        ticketCountInput.value = localStorage.getItem('macauTicketCount') || '';
        priceIndexInput.addEventListener('input', (e) => localStorage.setItem('macauTicketPriceIndex', e.target.value));
        ticketCountInput.addEventListener('input', (e) => localStorage.setItem('macauTicketCount', e.target.value));

        monitorButton.addEventListener('click', () => {
            const index = parseInt(priceIndexInput.value, 10);
            const ticketCount = parseInt(ticketCountInput.value, 10);
            if (isNaN(index) || index < 1) { logDiv.textContent = '错误: 请输入有效的票价序号。'; return; }
            if (isNaN(ticketCount) || ticketCount < 1) { logDiv.textContent = '错误: 请输入有效的票数。'; return; }

            monitorButton.disabled = true;
            logDiv.innerHTML = `监控中...<br>等待开售按钮变为可点击状态。`;

            const monitorInterval = setInterval(() => {
                const saleButton = document.querySelector('[class^="PriceBox_container__"] button');
                if (saleButton && !saleButton.disabled) {
                    clearInterval(monitorInterval);
                    logDiv.innerHTML = `<b>开售了！</b><br>正在执行抢票...`;
                    executePurchase(index, ticketCount, logDiv);
                }
            }, 300);
        });
    }

    function executePurchase(index, ticketCount, logDiv) {
        const buyButton = document.querySelector(`[class^="Ticket_table__"] tbody tr:nth-child(${index}) td:last-child button`);
        if (!buyButton) {
            logDiv.innerHTML = `错误: 在当前页面<br>找不到指定的票价行。`;
            // Re-enable the button if the purchase fails at the first step
            const monitorButton = document.getElementById('start-monitor-btn');
            if (monitorButton) monitorButton.disabled = false;
            return;
        }
        buyButton.click();
        logDiv.innerHTML = `已点击票价按钮。<br>等待弹窗...`;

        const selectorForQuantityInput = '[class^="PopUpTicketPurchase_kindItem__"] input';
        waitForElement(selectorForQuantityInput, (quantityInput) => {
            logDiv.innerHTML = `已找到弹窗，正在设置票数...`;
            setInputValue(quantityInput, ticketCount.toString());
            const addToCartButton = document.querySelector('[class^="PopUpTicketPurchase_buttonGroup__"] button:nth-child(2)');
            if (!addToCartButton) { logDiv.innerHTML = '错误: 未找到“加入购物车”按钮。'; return; }
            addToCartButton.click();
            logDiv.innerHTML = `已加入购物车。<br>等待跳转...`;

            waitForElement('[class^="ShoppingCartReminder_buttonGroup__"]', (checkoutButtonGroup) => {
                const checkoutButton = checkoutButtonGroup.querySelector('button:nth-child(2)');
                if (!checkoutButton) { logDiv.innerHTML = '错误: 未找到“去结算”按钮。'; return; }
                logDiv.innerHTML = `即将跳转结算...<br>后续操作将自动执行。`;
                checkoutActionHasRun = false;
                checkoutButton.click();
            });
        });
    }
})();