// ==UserScript==
// @name         Shityline_Login
// @namespace    http://tampermonkey.net/
// @version      2025-04-01
// @description  try to take over the world!
// @author       You
// @match        https://*.cityline.com/sc/*/*.html
// @icon         https://www.google.com/s2/favicons?sz=64&domain=cityline.com
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 标记是否已经点击过
    let hasClicked = false;

    // 日志函数，方便调试
    function log(message) {
        console.log('[自动购票助手] ' + message);
    }

    // 检查并点击购票按钮的函数
    function checkAndClickBuyButton() {
        // 如果已经点击过，则不再执行
        if (hasClicked) {
            return;
        }

        // 检查是否存在 buyTicketBox 的 div
        const ticketBox = document.querySelector('div.buyTicketBox');

        if (ticketBox) {
            log('找到购票框！');

            // 在购票框内查找购票按钮
            const buyButton = ticketBox.querySelector('#buyTicketBtn');

            if (buyButton) {
                log('找到购票按钮，准备点击...');

                // 点击按钮
                buyButton.click();

                // 标记已点击
                hasClicked = true;

                log('已点击购票按钮！不会再次点击');

                // 停止所有监听和定时器
                observer.disconnect();
                clearInterval(intervalId);
            } else {
                log('未找到购票按钮，将继续监控...');
            }
        } else {
            log('未找到购票框，将继续监控...');
        }
    }

    // 初始检查
    log('脚本已启动，开始监控购票框...');
    checkAndClickBuyButton();

    // 使用 MutationObserver 监听 DOM 变化
    const observer = new MutationObserver(function(mutations) {
        checkAndClickBuyButton();
    });

    // 配置 observer
    observer.observe(document.body, {
        childList: true,  // 监听子节点变化
        subtree: true,    // 监听所有后代节点变化
        attributes: true  // 监听属性变化
    });

    // 额外的定时检查，以防万一
    const intervalId = setInterval(checkAndClickBuyButton, 1000);

})();