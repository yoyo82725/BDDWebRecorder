console.log('load BDD Recorder content.js');

// 移除所有serviceWorker
// navigator.serviceWorker.getRegistrations().then(function (registrations) {
//     for (let registration of registrations) {
//         registration.unregister();
//     }
// });

if ('serviceWorker' in navigator) {
    navigator.serviceWorker
        .register('BDDWebRecorder-sw.js')
        .then(function () { console.log('Service Worker Registered'); });
    // navigator.serviceWorker.getRegistrations().then(function (registrations) {
    //     var oldSwLen = registrations.length;
    //     console.log('初始狀態', registrations);

    //     // 增加serviceWorker
    //     navigator.serviceWorker.register('sw.js').then(function () {
    //         console.log('content.js 註冊sw.js');

    //         // 試著綁定事件
    //         // navigator.serviceWorker.ready.then(function (reg) {
    //         //     $('#get_api_button').click(function () {
    //         //         console.log('click div');
    //         //         // 測試postmessage
    //         //         // navigator.serviceWorker.controller && navigator.serviceWorker.controller.postMessage('sw.updatedone');
    //         //     });
    //         // });
    //     }).then(function () {
    //         // 判斷是否從無到有，刷新
    //         navigator.serviceWorker.getRegistrations().then(function (registrations) {
    //             console.log('安裝後狀態', registrations);
    //             if (registrations.length > oldSwLen) {
    //                 console.log('觸發reload');
    //                 location.reload();
    //             }
    //         });

    // 監聽message
    navigator.serviceWorker.addEventListener('message', function (event) {
        try {
            console.log('[chrome extension content.js] get', event.data);
            console.log('[chrome extension content.js] pass data to background reqres');
            chrome.runtime.sendMessage("background reqres " + encodeURIComponent(event.data));
        } catch (error) {
            console.log(error);
        }
    });
    //     });
    // });

    // window.addEventListener("message", function (e) {
    //     console.log('(window.addEventListener)chrome extension get ', e.data);
    // }, false);
}

// 在background.js處理儲存等
// if (chrome) {
//     chrome.runtime.onMessage.addListener(function (response, sender, sendResponse) {
//         console.log('content.js get', response);
//         if (/^content/.test(response)) { // 開頭是content
//             console.log('content.js newRoute');
//             let getMessage = response.replace(/^content /, '');
//             if (getMessage == 'newRoute') {
//                 route++;
//             } else if (getMessage == 'switchOn') { // 開始接收
//                 console.log('[chrome extension content.js] switchOn');
//                 switchOn = true;
//             } else if (getMessage == 'switchOff') { // 停止接收
//                 console.log('[chrome extension content.js] switchOff');
//                 switchOn = false;
//             }
//         }
//     });
// }