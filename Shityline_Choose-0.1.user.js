// ==UserScript==
// @name         Shityline_Choose
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  自动选择价格选项、票数并点击快速购买按钮
// @author       You
// @match        https://venue.cityline.com/utsvInternet/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 创建控制面板
    const panel = document.createElement('div');
    panel.style.position = 'fixed';
    panel.style.top = '10px';
    panel.style.right = '10px';
    panel.style.padding = '10px';
    panel.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    panel.style.color = 'white';
    panel.style.borderRadius = '5px';
    panel.style.zIndex = '9999';
    panel.style.display = 'flex';
    panel.style.flexDirection = 'column';
    panel.style.gap = '10px';

    // 创建选项序号输入框
    const optionInput = document.createElement('input');
    optionInput.type = 'number';
    optionInput.min = '1';
    optionInput.value = '1';
    optionInput.placeholder = '请输入选择第几个选项';
    optionInput.style.padding = '5px';
    optionInput.style.borderRadius = '3px';
    optionInput.style.border = 'none';

    // 创建选项序号标签
    const optionLabel = document.createElement('div');
    optionLabel.textContent = '选项序号:';
    optionLabel.style.fontSize = '12px';

    // 创建票数输入框
    const quantityInput = document.createElement('input');
    quantityInput.type = 'number';
    quantityInput.min = '1';
    quantityInput.max = '10';
    quantityInput.value = '1';
    quantityInput.placeholder = '请输入票数(1-10)';
    quantityInput.style.padding = '5px';
    quantityInput.style.borderRadius = '3px';
    quantityInput.style.border = 'none';

    // 创建票数标签
    const quantityLabel = document.createElement('div');
    quantityLabel.textContent = '票数:';
    quantityLabel.style.fontSize = '12px';

    // 创建开始按钮
    const startBtn = document.createElement('button');
    startBtn.textContent = '开始';
    startBtn.style.padding = '5px 10px';
    startBtn.style.backgroundColor = '#4CAF50';
    startBtn.style.color = 'white';
    startBtn.style.border = 'none';
    startBtn.style.borderRadius = '3px';
    startBtn.style.cursor = 'pointer';

    // 创建停止按钮
    const stopBtn = document.createElement('button');
    stopBtn.textContent = '停止';
    stopBtn.style.padding = '5px 10px';
    stopBtn.style.backgroundColor = '#f44336';
    stopBtn.style.color = 'white';
    stopBtn.style.border = 'none';
    stopBtn.style.borderRadius = '3px';
    stopBtn.style.cursor = 'pointer';

    // 创建状态显示
    const status = document.createElement('div');
    status.textContent = '状态: 未开始';
    status.style.fontSize = '12px';

    // 添加元素到面板
    panel.appendChild(optionLabel);
    panel.appendChild(optionInput);
    panel.appendChild(quantityLabel);
    panel.appendChild(quantityInput);
    panel.appendChild(startBtn);
    panel.appendChild(stopBtn);
    panel.appendChild(status);

    // 添加面板到页面
    document.body.appendChild(panel);

    // 定义计时器变量
    let intervalId = null;

    // 开始按钮点击事件
    startBtn.addEventListener('click', function() {
        if (intervalId) {
            clearInterval(intervalId);
        }

        const optionNumber = parseInt(optionInput.value);
        const ticketQuantity = parseInt(quantityInput.value);

        if (isNaN(optionNumber) || optionNumber < 1) {
            status.textContent = '状态: 请输入有效的选项序号';
            return;
        }

        if (isNaN(ticketQuantity) || ticketQuantity < 1 || ticketQuantity > 10) {
            status.textContent = '状态: 请输入有效的票数(1-10)';
            return;
        }

        status.textContent = `状态: 正在选择第 ${optionNumber} 个选项，票数: ${ticketQuantity}`;

        // 设置定时器，每2秒执行一次
        intervalId = setInterval(function() {
            try {
                // 1. 找到price div并选择对应的radio
                const priceDiv = document.querySelector('div.price');
                if (!priceDiv) {
                    status.textContent = '状态: 未找到price div';
                    return;
                }

                // 找到第n个form-check div
                const formChecks = priceDiv.querySelectorAll('div.form-check');
                if (formChecks.length < optionNumber) {
                    status.textContent = `状态: 只找到 ${formChecks.length} 个选项，无法选择第 ${optionNumber} 个`;
                    return;
                }

                // 找到radio input并点击
                const targetFormCheck = formChecks[optionNumber-1];
                const radioInput = targetFormCheck.querySelector('input[type="radio"]');
                if (radioInput) {
                    radioInput.click();
                    status.textContent = `状态: 已点击第 ${optionNumber} 个选项`;
                } else {
                    status.textContent = `状态: 第 ${optionNumber} 个选项中未找到radio input`;
                    return;
                }

                // 2. 找到ticketType0的select并选择票数
                const ticketSelect = document.getElementById('ticketType0');
                if (!ticketSelect) {
                    status.textContent = '状态: 未找到票数选择框';
                    return;
                }

                // 选择对应的票数
                ticketSelect.value = ticketQuantity.toString();

                // 触发change事件
                const event = new Event('change', { bubbles: true });
                ticketSelect.dispatchEvent(event);

                // 3. 点击快速购买按钮
                const purchaseBtn = document.getElementById('expressPurchaseBtn');
                if (!purchaseBtn) {
                    status.textContent = '状态: 未找到快速购买按钮';
                    return;
                }

                // 点击购买按钮
                purchaseBtn.click();

                status.textContent = `状态: 已选择第 ${optionNumber} 个选项，票数: ${ticketQuantity}，并点击购买按钮 (${new Date().toLocaleTimeString()})`;

            } catch (error) {
                status.textContent = `状态: 出错 - ${error.message}`;
            }
        }, 2000);
    });

    // 停止按钮点击事件
    stopBtn.addEventListener('click', function() {
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
            status.textContent = '状态: 已停止';
        }
    });
})();