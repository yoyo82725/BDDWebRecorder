console.log('load BDDWebRecorder-sw.js');
function sendMessage(msg) {
    self.clients.matchAll()
        .then(function (clients) {
            if (clients && clients.length) {
                clients.forEach(function (client) {
                    client.postMessage(msg);
                })
            }
        });
}

self.addEventListener('install', function (e) {
    console.log('[BDDWebRecorder-sw.js] Install');
});

self.addEventListener('activate', function (e) {
    console.log('[BDDWebRecorder-sw.js] Activate');
    return self.clients.claim();
});

this.addEventListener('fetch', function (event) {
    
    console.log('[BDDWebRecorder-sw.js] event.request', event.request);
    console.log('[BDDWebRecorder-sw.js] Get URL:', event.request.url);
    if (/^chrome-extension/.test(event.request.url)) {
        console.log('[BDDWebRecorder-sw.js] Get chrome-extension no pass');
    }
    if (/\./.test(event.request.url.substr(-5))) {
        console.log('[BDDWebRecorder-sw.js] Get file no pass');
    }
    if (location.origin + '/' == event.request.url) {
        console.log('[BDDWebRecorder-sw.js] origin no pass');
    }
    // 濾掉/後有#
    var newUrl = event.request.url.split('/')[event.request.url.split('/').length - 1];
    if (/#/.test(newUrl)) {
        console.log('[BDDWebRecorder-sw.js] hash no pass');
    }
    if (!/^chrome-extension/.test(event.request.url) && !/\./.test(event.request.url.substr(-5)) && location.origin + '/' != event.request.url && !/#/.test(newUrl)) {
        var url = event.request.url,
            method = event.request.method,
            headers = event.request.headers,
            mode = event.request.mode,
            referrer = event.request.referrer,
            referrerPolicy = event.request.referrerPolicy,
            credentials = event.request.credentials,
            destination = event.request.destination,
            integrity = event.request.integrity,
            cache = event.request.cache;

        var headerContent = '';
        for (var pair of headers.entries()) {
            headerContent += (pair[0] + ': ' + pair[1]) + '<br>';
        }

        // 傳JSON，在popupjs組起
        var timeStamp = +new Date();
        var message = ` { "type":"request", "headers":"${headerContent}", "referrer": "${referrer}", "referrerPolicy": "${referrerPolicy}", "credentials": "${credentials}", "destination": "${destination}", "integrity": "${integrity}", "cache": "${cache}", "url": "${url}", "method": "${method}", "timeStamp": "${timeStamp}", "mode": "${mode}" } `;
        console.log('[BDDWebRecorder-sw.js] Send Message', message);
        // 送出request 內容給content
        sendMessage(message);

        event.respondWith(
            caches.match(event.request).then(function (response) {
                if (response) {
                    // 改變response
                    // return new Response('<p>Hello from your friendly neighbourhood service worker!</p>', {
                    //   headers: { 'Content-Type': 'text/html' }
                    // });
                    // console.log('Found response in cache:', response);
                    return response;
                } else {
                    // console.log('No response found in cache. About to fetch from network...');
                }

                return fetch(event.request).then(function (response) {
                    // console.log('Response from network is:', response);
                    if (/^chrome-extension/.test(response.url)) {
                        console.log('[BDDWebRecorder-sw.js] Get chrome-extension no pass');
                        return response;
                    }
                    // 濾掉有附檔名
                    if (/\./.test(response.url.substr(-5))) {
                        console.log('[BDDWebRecorder-sw.js] Get file no pass');
                        return response;
                    }
                    if (location.origin + '/' == response.url) {
                        console.log('[BDDWebRecorder-sw.js] origin no pass');
                        return response;
                    }
                    // 濾掉/後有#
                    var newUrl = response.url.split('/')[response.url.split('/').length - 1];
                    if (/#/.test(newUrl)) {
                        console.log('[BDDWebRecorder-sw.js] hash no pass');
                        return response;
                    }
                    // 送出response內容給content
                    var url = response.url,
                        ok = response.ok,
                        headers = response.headers,
                        redirected = response.redirected,
                        statusText = response.statusText,
                        status = response.status;

                    var headerContent = '';
                    for (var pair of headers.entries()) {
                        headerContent += (pair[0] + ': ' + pair[1]) + '<br>';
                    }

                    var timeStamp = +new Date();
                    var message = ` { "type":"response", "headers":"${headerContent}", "ok": "${ok}", "status": "${status}", "statusText": "${statusText}", "redirected": "${redirected}", "timeStamp": "${timeStamp}", "url": "${url}" } `;
                    console.log('[BDDWebRecorder-sw.js] Send Message', message);
                    sendMessage(message);
                    // 增加快取
                    // return caches.open('v1').then(function(cache) {
                    //   cache.put(event.request, response.clone());
                    //   return response;
                    // });
                    return response;
                }).catch(function (error) {
                    console.error('Fetching failed:', error);

                    throw error;
                });
            })
        );
    }
});

// controlling service worker
this.addEventListener("message", function (e) {
    // e.source is a client object
    //e.source.postMessage("Hello! Your message was: " + e.data, e.origin);
    console.log('[BDDWebRecorder-sw.js] get ' + e.data + ', source=' + e.source);
});

this.onpush = function (event) {
    console.log(event.data);
    // From here we can write the data to IndexedDB, send it to any open
    // windows, display a notification, etc.
}