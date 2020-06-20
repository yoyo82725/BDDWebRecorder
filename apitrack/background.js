console.log('load background.js');

var savedFetchData = [];
var route = 0; // 請求路線
var switchOn = false;
var nowKeyName = ''; // 目前頁面的KeyName

chrome.runtime.onMessage.addListener(function (response, sender, sendResponse) {
    console.log('background.js get ' + response);
    if (/^background/.test(response)) { // 開頭是background
        let getMessage = response.replace(/^background /, ''); // 擷取訊息

        if (/^reqres/.test(getMessage)) { // 開頭是reqres，處理content.js sw.js的onfetch
            console.log('handle reqres: '+switchOn);
            if (switchOn) {
                let getMessage2 = getMessage.replace(/^reqres /, '');
                getMessage2 = decodeURIComponent(getMessage2);

                // 第二段內容
                console.log('getMessage2', getMessage2);
                // 替代掉Header中的雙引號
                getMessage2 = getMessage2.replace(/(?<="headers":".*)"(?=.*", "ok":)/g, "'");

                let json = JSON.parse(getMessage2);

                // 寫入路線
                json.route = route;

                // 儲存
                chrome.tabs.query({ active: true }, function (val) {
                    let tabId = val[0].id;
                    let keyName = "data" + tabId;
                    nowKeyName = keyName;

                    // 置入tabId
                    json.tabId = tabId;
                    savedFetchData.push(json);

                    // 儲存
                    chrome.storage.local.set({ [`${keyName}`]: savedFetchData }, function () {
                        // Notify that we saved.
                        console.log(`save data ${keyName}`);
                        // 通知apiCallPath
                        console.log('background.js send apiCallPath load');
                        chrome.runtime.sendMessage("apiCallPath load");
                        // 通知bdd.js
                        console.log('background.js send bdd apicall ' + JSON.stringify(json));
                        chrome.runtime.sendMessage("bdd apicall " + JSON.stringify(json));
                    });
                });
            }
        } else if (/^newRoute/.test(getMessage)) { // 新路徑
            route++;
        } else if (/^clear/.test(getMessage)) { // 清空
            route = 0;
            savedFetchData = [];
            // chrome.storage.local.clear();
            chrome.storage.local.remove(nowKeyName);
            console.log(`[background] ${nowKeyName} remove`);
            // 通知apiCallPath
            chrome.runtime.sendMessage("apiCallPath load");
        } else if (/^switchOn/.test(getMessage)) { // 開始接收
            console.log('[background.js] switchOn');
            switchOn = true;
        } else if (/^switchOff/.test(getMessage)) { // 停止接收
            console.log('[background.js] switchOff');
            setTimeout(() => {
                switchOn = false;
            }, 5000);
        }

    }
});