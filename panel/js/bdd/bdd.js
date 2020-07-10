var _const = {
    $gherkinfileView: $('#gherkinfile-view')
}

var reportData = {
    nowReportIdx: 0,
    p1Data: [
        {
            status: false,
            name: '',
            startTime: 0,
            duration: 0,
            show: false
        }
    ],
    rawData: {
        status: false,
        name: '',
        startTime: 0,
        duration: 0,
        show: false
    },
    tmpStartTime: 0,
    passedGherkin: [],
    failedGherkin: [],
};

// report part 2
var p2GherkinHtmlArr = [];

// report part 2.5
var timeUrlGherkinMap = [];
var filterUrlGherkinMap = [];

// 關閉loading
$(function () {
    $('body').loading('stop');
    $(window).on('unload.bddr', function () {
        chrome.runtime.sendMessage("background clear");
    });
});
// window.onload = function () {
//     $('body').loading('stop');
// };

// 讀取BDD檔案
$('#grid-gherkin-addfile-btn').click(function () {
    var s_suite = getSelectedSuite();
    if (!s_suite) {
        alert('Please Select a Test Suite');
        return;
    }
    $('#load-gherkin-file-hidden').click(); // input[file]
});

// 讀取BDD檔案
$('#load-gherkin-file-hidden').change(function loadGherkinFile() {
    event.stopPropagation();
    _const.$gherkinfileView.html('');
    for (var i = 0; i < this.files.length; i++) {
        readGherkin(this.files[i]);
    }
    this.value = null;
});

// 讀取BDD檔案
function readGherkin(f) {
    var reader = new FileReader();
    if (!f.name.includes("feature")) return;
    reader.readAsText(f);

    reader.onload = function saveGherkinFile(event) {
        var gherkin = reader.result;

        // 綁定test suite
        var s_suite = getSelectedSuite();
        sideex_testSuite[s_suite.id].gherkin = gherkin;
        sideex_testSuite[s_suite.id].gherkinAndLine = addFileLine(gherkin);
        sideex_testSuite[s_suite.id].gherkinFileName = f.name;
        genDataTable(gherkin, f.name);
        reloadGherkinSelect();
        return;
        // set up some veraible for recording after loading
    };
    reader.onerror = function (e) {
        console.log("Error", e);
    };
}

// 顯示BDD檔案
$('#grid-view-gherkinfile-btn').click(function () {
    var s_suite = getSelectedSuite();
    var gherkin = s_suite && sideex_testSuite[s_suite.id].gherkin;
    if (!gherkin) {
        alert('No Gherkin Files Uploaded');
        return;
    }
    if ($('#gherkinfile-view').css('display') != 'none') {
        switchDefaultView();
    } else {
        switchGherkinView();
    }
});

// view file模式下，按其他按鈕，返回原本的view
$('#command-toolbar-buttons > button').click(function () {
    $('.smallSection').show();
    _const.$gherkinfileView.hide();
    _const.$gherkinfileView.html('');
});

// 改變 Gherkin Select 時刷新順序
$('#command-gherkin').change(function () {
    // reloadGherkinSelect();
});

// 按下其他地方跳回步驟檢視
$('#toolbar-container, #middle-container').click(function () {
    switchDefaultView();
});

function switchDefaultView() {
    // 關閉
    $('.smallSection').show();
    _const.$gherkinfileView.hide();
    _const.$gherkinfileView.html('');
}

function switchGherkinView() {
    // 打開
    $('.smallSection').hide();
    _const.$gherkinfileView.show();
    reloadGherkinSelect();
}

// 取得目前Test Case Gherkin File (無用)
// function getSelectedGherkinFile() {
//     var s_suite = getSelectedSuite();
//     return sideex_testSuite[s_suite.id].gherkin;
// }

// 將檔案寫入Select
function reloadGherkinSelect() {
    // 選擇、reload時會觸發
    var s_suite = getSelectedSuite();
    var gherkinAndLine = s_suite && sideex_testSuite[s_suite.id].gherkinAndLine;
    if (!gherkinAndLine) {
        $('#command-gherkin').html('');
        _const.$gherkinfileView.html('No Gherkin Files Uploaded');
        return;
    }

    // panel插入資料
    var colorGherkin = markFileKeywords(gherkinAndLine);
    _const.$gherkinfileView.html(`<pre>${colorGherkin}</pre>`);

    // 切檔案
    var splitGherkin = [];
    gherkinAndLine.split('\n').forEach(function (item, index) {
        // 刪除頭尾
        var trim = item.trim();

        if (trim != '') {
            splitGherkin.push(trim);
        }
    });
    // 輸入input select
    $('#command-gherkin').html('<option value=""></option>');
    splitGherkin.forEach(function (item, index) {
        // 非關鍵字disabled
        var disabled = '';
        if (!/(?<=^\d+\|\s*)(WHEN|THEN|GIVEN|AND|BUT).*$/ig.test(item)) {
            disabled = 'disabled';
        }

        // 取代雙引號
        item = item.replace(/\"/gi, "'");

        // 插入select
        var option = `<option value="${item}" ${disabled}>${item}</option>`;
        $('#command-gherkin').append(option);
    });
}

// 將file view 關鍵字螢光
function markFileKeywords(gherkin) {
    var txt = gherkin;
    txt = txt.replace(/(?<=^\d+\|\s*)FEATURE:/igm, '<span class="colorBlue">Feature:</span>');
    txt = txt.replace(/(?<=^\d+\|\s*)Background:/igm, '<span class="colorBlue">Background:</span>');
    txt = txt.replace(/(?<=^\d+\|\s*)Example:/igm, '<span class="colorBlue">Example:</span>');
    txt = txt.replace(/(?<=^\d+\|\s*)SCENARIO:/igm, '<span class="colorBlue">Scenario:</span>');
    txt = txt.replace(/(?<=^\d+\|\s*)SCENARIO OUTLINE:/igm, '<span class="colorBlue">Scenario Outline:</span>');
    txt = txt.replace(/(?<=^\d+\|\s*)Given/igm, '<span class="colorBlue">Given</span>');
    txt = txt.replace(/(?<=^\d+\|\s*)When/igm, '<span class="colorBlue">When</span>');
    txt = txt.replace(/(?<=^\d+\|\s*)Then/igm, '<span class="colorBlue">Then</span>');
    txt = txt.replace(/(?<=^\d+\|\s*)And/igm, '<span class="colorBlue">And</span>');
    txt = txt.replace(/(?<=^\d+\|\s*)But/igm, '<span class="colorBlue">But</span>');
    return txt;
}

// 檢查gherkin對應順序
function checkGherkinOrder() {
    var s_suite = getSelectedSuite();
    var gherkin = sideex_testSuite[s_suite.id].gherkinAndLine;
    if (!gherkin) return true;

    // 切檔案成陣列
    var splitGherkinArr = [];
    var scenarioArr = [];
    gherkin.split('\n').forEach(function (item, index) {
        // 刪除頭尾
        var trim = item.trim();
        // 判斷是否為關鍵字
        if (/(?<=^\d+\|\s*)(WHEN|THEN|GIVEN|AND|BUT).*$/ig.test(trim)) {
            splitGherkinArr.push(trim);
        }
        // 以SCENARIO做區隔
        else if (/(?<=^\d+\|\s*)(SCENARIO|SCENARIO OUTLINE|Example).*$/ig.test(trim)) { // 讀到下段的開頭
            if(splitGherkinArr[0]) {
                scenarioArr.push(splitGherkinArr.splice(0));
            }
        }
    });
    // 結尾
    if(splitGherkinArr[0]) {
        scenarioArr.push(splitGherkinArr.splice(0));
    }

    // 切目前順序成陣列
    var nowGherkinArr = [];
    $('#records-grid tr').find('td:eq(3)').each(function () {
        if ($(this).find('div:eq(0)').text() != '') {
            nowGherkinArr.push($(this).find('div:eq(0)').text());
        }
    });

    // 檢查順序
    var pass = false;
    if (scenarioArr [0]) {
        // var idx = 0;
        scenarioArr.forEach(function (scenarioGherkinArr) {
            var arrPass = true;
            nowGherkinArr.forEach(function(gherkin,idx){
                if(gherkin != scenarioGherkinArr[idx]) {
                    arrPass = false; // 此陣列不符合，下一組繼續比對
                }
            });

            if(arrPass) {
                pass = true;
                return true;
            }
                
            // if (pass) {
            //     if (item.replace(/"/ig, "'") == splitGherkinArr[idx].replace(/"/ig, "'")) { // 引號變單引
            //         // pass
            //         idx++;
            //     } else {
            //         pass = true;
            //     }
            // }
        });
    } else { // 無gherkin
        pass = true;
    }
    return pass;
}

// 產生gherkin data table
function genDataTable(gherkin, gherkinFileName) {
    if (!gherkin || !gherkinFileName) {
        return;
    }
    // 切出各data tables
    var i = 0;
    var splitGherkinArr1 = [];
    splitGherkinArr1[i] = '';
    gherkin.split('\n').forEach(function (item, index) {
        // 刪除頭尾
        var trim = item.trim();
        // 判斷是否為關鍵字
        if (/^\|.*\|$/ig.test(trim)) { // ||頭尾包覆
            // 轉成CSV
            // 濾掉頭尾|之間的空白
            var str = trim.replace(/(?<=\|)\s(?=\w)/ig, '').replace(/(?<=\w)\s+(?=\|)/ig, '');
            // 濾掉頭尾，並替代|為,
            str = str.slice(1, -1).trim().replace(/\|/ig, ',') + '\r\n';
            // 塞入陣列
            splitGherkinArr1[i] = splitGherkinArr1[i] + str;
        } else if (splitGherkinArr1[i] != '') { // 結束，i++
            // 切除最後的換行
            splitGherkinArr1[i] = splitGherkinArr1[i].slice(0, -2);
            // 開始下一個
            i++;
            splitGherkinArr1[i] = '';
        }
    });
    delete splitGherkinArr1[i]; // 刪除最後一個空

    // 增加至data driven
    splitGherkinArr1.forEach(function (item, index) {
        // console.log(item);
        var dataName = gherkinFileName + '.' + (+index + 1);
        dataFiles[dataName] = {
            content: item,
            type: 'csv'
        };
        saveDataFiles();
    });
    if (splitGherkinArr1 && splitGherkinArr1.length - 1 != 0) {
        alert(`Add/Update ${splitGherkinArr1.length - 1} DataTables`);
    }
}
// 先在play的時候將report清0，在play中紀錄情形，最後調用此處的renderReport()
function renderReport() {
    // console.log('renderReport()', reportData);
    // 第一部分
    var p1Tbody = '';
    reportData.p1Data.forEach(function (data, idx) {
        var show = data.show;
        if (!show) return;
        var status = data.status;
        var name = data.name;
        var duration = (data.duration / 1000).toFixed(2) + ' s';
        var startTime = data.startTime;
        if(!startTime) {
            console.error('dont have start time: ' + name + ' , ignore');
            return ;
        }
        var statusStr = (status) ? `<span title="Passed">
            <svg width="12px" height="12px" viewBox="0 0 12 12">
                <desc>Created with sketchtool.</desc>
                <g id="Execution" stroke="none" stroke-width="1" fill="none"
                    fill-rule="evenodd">
                    <g id="KA-New-UI"
                        transform="translate(-332.000000, -790.000000)">
                        <g id="Icon/12px/Status/Passed-Copy"
                            transform="translate(332.000000, 790.000000)">
                            <g id="Group">
                                <circle id="Oval" fill="#14CC8F" cx="6" cy="6"
                                    r="6"></circle>
                                <g id="Group-2"
                                    transform="translate(6.449747, 5.449747) rotate(-45.000000) translate(-6.449747, -5.449747) translate(2.449747, 2.449747)"
                                    fill="#FFFFFF">
                                    <rect id="Rectangle" x="0.171572875"
                                        y="3.17157288" width="7" height="2"
                                        rx="1"></rect>
                                    <rect id="Rectangle"
                                        transform="translate(1.171573, 2.671573) rotate(-90.000000) translate(-1.171573, -2.671573) "
                                        x="-1.32842712" y="1.67157288" width="5"
                                        height="2" rx="1"></rect>
                                </g>
                            </g>
                        </g>
                    </g>
                </g>
            </svg>
        </span>` : `<span title="Failed">
            <svg width="12px" height="12px" viewBox="0 0 12 12">
                <desc>Created with sketchtool.</desc>
                <g id="Execution" stroke="none" stroke-width="1" fill="none"
                    fill-rule="evenodd">
                    <g id="KA-New-UI"
                        transform="translate(-332.000000, -726.000000)">
                        <g id="Icon/12px/Status/Failed"
                            transform="translate(332.000000, 726.000000)">
                            <g id="Group">
                                <circle id="Oval" fill="#E05169" cx="6" cy="6"
                                    r="6"></circle>
                                <g id="Group-2"
                                    transform="translate(6.000000, 6.000000) rotate(-45.000000) translate(-6.000000, -6.000000) translate(2.000000, 2.000000)"
                                    fill="#FFFFFF">
                                    <rect id="Rectangle" x="0" y="3" width="8"
                                        height="2" rx="1"></rect>
                                    <rect id="Rectangle"
                                        transform="translate(4.000000, 4.000000) rotate(-90.000000) translate(-4.000000, -4.000000) "
                                        x="0" y="3" width="8" height="2" rx="1">
                                    </rect>
                                </g>
                            </g>
                        </g>
                    </g>
                </g>
            </svg>
        </span>`;
        var statusStr2 = (status) ? `<span title="Passed" class="bg-success badge-circle-sm badge badge-secondary">Passed</span>` : `<span title="Failed" class="bg-danger badge-circle-sm badge badge-secondary">Failed</span>`;
        p1Tbody += `
            <tr>
                <td class="fit-content-column">
                    ${statusStr}
                </td>
                <td class="">
                    <div>
                        <div class="text-wrap">${name}</div>
                    </div>
                </td>
                <td class="">${startTime}</td>
                <td class="">${duration}</td>
                <td class="">
                    <span title="Test Runs">
                        ${statusStr2}
                    </span>
                </td>
            </tr>
        `;
    });
    $('#p1Tbody').html(p1Tbody);

    // 2.5 url gherkin table
    filterUrlGherkinMap = [];
    if(timeUrlGherkinMap) {
        var newTimeUrlGherkinMap = timeUrlGherkinMap;
        
        // 把 timeUrlGherkinMap 同樣的gherkin留下剩最後一筆
        // 以時間排序陣列 遞減 以篩出最晚的gherkin
        newTimeUrlGherkinMap.sort(function(a,b){ return b.time - a.time; });
        newTimeUrlGherkinMap.forEach(function(item){
            var canPush = true;
            // 找出gherkin是否有了
            if(item.gherkin && filterUrlGherkinMap.findIndex((filterItem) => filterItem.gherkin === item.gherkin) > -1) {
                canPush = false;
            }

            if(canPush) {
                filterUrlGherkinMap.push(item);
            }
        });
        // 以時間排序陣列 遞增
        filterUrlGherkinMap.sort(function(a,b){ return a.time - b.time; });
        // 表格呈現
        $('#gherkinUrlCall_tableContainer').html('');
        var html = `<table class="table-hover table">
            <thead>
                <tr>
                    <th class="fit-content-column">#</th>
                    <th>Name</th>
                    <th>Started</th>
                </tr>
            </thead>
            <tbody>`;
        filterUrlGherkinMap.forEach(function(item,index){
            var name = '';
            var time = new Date(item.time).toLocaleString();
            if(item.gherkin) { // gherkin
                name = markFileKeywords(item.gherkin);
            } else if(item.url) { // url
                var methodString = item.method ? `<span style="color:blue;">(${item.method})</span>`:'';
                name = `<span style="color:blue; text-transform:capitalize;">${item.type}</span>${methodString}|&nbsp;${item.url}`;
            }
            html += `<tr>
                <td class="fit-content-column">${index+1}</td>
                <td>${name}</td>
                <td>${time}</td>
            </tr>`;
        });

        html += `</tbody>
        </table>`;
        $('#gherkinUrlCall_tableContainer').html(html);
    }

    // 第二部分
    var suiteId = getSelectedSuite().id;
    var gherkin_file = sideex_testSuite[suiteId] && sideex_testSuite[suiteId].gherkinAndLine;
    // console.log('gherkin_file', gherkin_file);
    if (gherkin_file) {
        var gherkin_file_array = gherkin_file.split('\n');
        var paddingLine = 1;
        var addClass = '';
        var passedGherkin = reportData.passedGherkin;
        var failedGherkin = reportData.failedGherkin;

        gherkin_file_array.forEach(function (item, index) {
            gherkin_file_array[index] = item.trim();
            if (paddingLine > 1) { // 上一行是SCENARIO等
                if (/(?<=^\d+\|\s*)(WHEN|THEN|GIVEN|AND|BUT).*$/ig.test(item.trim())) {
                    paddingLine = 2;
                }
                else if (/(?<=^\d+\|\s*)(Background|Example|SCENARIO|SCENARIO OUTLINE).*$/ig.test(item.trim())) {
                    paddingLine = 1;
                } else if (item.trim().replace(/^\d+\|\s*/img, '') == '') {
                    paddingLine--;
                }
            }

            // 判斷pass
            addClass = '';
            // 從pass的gherkin array中比對有沒有
            if (passedGherkin.includes(item.trim())) {
                addClass = 'pass';
            } else if (failedGherkin.includes(item.trim())) {
                addClass = 'fail';
            }

            // 上色
            gherkin_file_array[index] = markFileKeywords(gherkin_file_array[index])

            // 調用的url
            var lineUrl = '';
            if(filterUrlGherkinMap) {
                var urlGherkinMapIdx = -1;
                // 整理出gherkin下最新的request
                var tmpUrlGherkinMap = [];
                var nowTmpGherkin = '';
                filterUrlGherkinMap.forEach(function(item2){
                    if(item2.gherkin) {
                        if (/(?<=^\d+\|\s*)(WHEN|THEN|GIVEN|AND|BUT).*$/ig.test(item2.gherkin)) { // 暫存最新gherkin
                            nowTmpGherkin = item2.gherkin;
                        }
                    } else if(item2.type && item2.type.toLowerCase()=='request') { // 抓出最近的request
                        tmpUrlGherkinMap.push({
                            gherkin: nowTmpGherkin,
                            url: item2.url,
                            method: item2.method
                        });
                    }
                });

                urlGherkinMapIdx = tmpUrlGherkinMap.findIndex((item2) => item2.gherkin.trim() == item.trim());
                if (urlGherkinMapIdx != -1) {
                    var methodString = tmpUrlGherkinMap[urlGherkinMapIdx].method ? `(${tmpUrlGherkinMap[urlGherkinMapIdx].method})`: '';
                    lineUrl = `<span class="colorBlue">CALL ${methodString}${tmpUrlGherkinMap[urlGherkinMapIdx].url}</span>`;
                }
            }
            
            // 組HTML
            gherkin_file_array[index] = `<div class="gherkin_line p${paddingLine} ${addClass}">
                                    <div class="color"></div>${gherkin_file_array[index]} ${lineUrl}
                                </div>`;
            if (paddingLine == 1) { // 上一行是SCENARIO等
                paddingLine = 2;
                paddingLine = 2;
            } else {
                // 結束進位
                if (/(?<=^\d+\|\s*)(WHEN|THEN|GIVEN|AND|BUT).*$/ig.test(item.trim())) {
                    paddingLine = 3;
                }
            }
        });

        var findArr = p2GherkinHtmlArr.findIndex(function(item){ return item.suite_id == suiteId });
        var gherkin_file_name_html = `<div class="gherkin_line p1">
            <div class="color"></div>${sideex_testSuite[suiteId].gherkinFileName}
        </div>`;
        if(findArr > -1) { // 已存在
            p2GherkinHtmlArr[findArr].gherkinHtml = gherkin_file_name_html + gherkin_file_array.join('');
        } else { // 不存在，新建
            p2GherkinHtmlArr.push({
                suite_id: suiteId,
                gherkinHtml: gherkin_file_name_html + gherkin_file_array.join('')
            });
        }

        var gherkin_html = '';
        p2GherkinHtmlArr.forEach(function(item2){
            gherkin_html += item2.gherkinHtml;
        });
        $('#gherkin_report').html(gherkin_html);
        
    }

    // 第三部分在promisepopup.js產生
}
function cleanReportP1() {
    $('#p1Tbody').html('');
    reportData = {
        nowReportIdx: 0,
        p1Data: [
            {
                status: false,
                name: '',
                startTime: 0,
                duration: 0,
                show: false
            }
        ],
        rawData: {
            status: false,
            name: '',
            startTime: 0,
            duration: 0,
            show: false
        },
        tmpStartTime: 0,
        passedGherkin: [],
        failedGherkin: [],
    }
}
function cleanReportP2() {
    $('#gherkin_report').html('');
    $('#gherkinUrlCall_tableContainer').html('');
    timeUrlGherkinMap = [];
    p2GherkinHtmlArr = [];
}

function clone(value, isDeep) {
    if (value === null) return null;
    if (typeof value !== 'object') return value
    if (Array.isArray(value)) {
        if (isDeep) {
            return value.map(item => clone(item, true))
        }
        return [].concat(value)
    } else {
        if (isDeep) {
            var obj = {};
            Object.keys(value).forEach(item => {
                obj[item] = clone(value[item], true)
            })
            return obj;
        }
        return { ...value }
    }
}

// 儲存至電腦
$('#saveAs').click(function () {
    var $newReportContainer = $('#reportscontainer').clone();
    var fileName = sideex_testSuite[getSelectedSuite().id].title + '.html';
            // 替換canvas
            if ($newReportContainer.find('#vis > div > canvas').length > 0) {
                var $canvas = $('#vis > div > canvas');
                $newReportContainer.find('#vis > div > canvas').parent().html(convertCanvasToImage($canvas.get(0)).outerHTML);
            }
            // 移除buttons
            $newReportContainer.find('.button-group').remove();
            // 標頭
            var head = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${fileName}</title>
                <link rel="stylesheet"
                    href="https://stackpath.bootstrapcdn.com/bootstrap/4.4.1/css/bootstrap.min.css" />
                <link rel="stylesheet" href="https://orz4.netlify.com/bdd.css" />
                
            </head>
            <body>
            `;
            var foot = `
                <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.4.1/jquery.min.js"></script>
                <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.4.1/js/bootstrap.min.js"></script>
                <script src="https://orz4.netlify.com/apiCallPath.js"></script>
            </body>
            </html>
            `;

            var fileContent = head + $newReportContainer.html() + foot;
            console.log('[bdd.js] genFile:',fileContent);

    var link = makeTextFile(fileContent);
    var downloading = browser.downloads.download({
        filename: fileName,
        url: link,
        saveAs: true,
        conflictAction: 'overwrite'
    });
});

// 儲存至Github
$('#saveToGit').click(function () {
    if (!getSelectedSuite()) {
        alert('Please Select a Test Suite');
    }
    var timeString = (new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString()).replace(/\//ig, '-').replace(/:/ig, '.');
    var defaultTestSuiteName = sideex_testSuite[getSelectedSuite().id].title + '.html';
    var defaultCommand = timeString;
    Swal.mixin({
        input: 'text',
        confirmButtonText: 'Next &rarr;',
        showCancelButton: true,
        progressSteps: ['1', '2', '3']
    }).queue([
        {
            title: 'Git Repository',
            text: 'e.g. https://github.com/yoyo82725/BWR.git',
            inputValue: localStorage['savedGitUrl'] ? localStorage['savedGitUrl']:'https://github.com/yoyo82725/BDDWebRecorderDemoSite.git',
            inputValidator: (value) => {
                return new Promise((resolve) => {
                    if (value.trim() != '') {
                        localStorage['savedGitUrl'] = value;
                        resolve();
                    } else {
                        resolve('Can Not Be Empty')
                    }
                })
            }
        },
        {
            title: 'Name The File',
            text: 'The File Name On Github',
            inputValue: defaultTestSuiteName,
            inputValidator: (value) => {
                return new Promise((resolve) => {
                    if (value.trim() != '') {
                        resolve()
                    } else {
                        resolve('Please Name The File')
                    }
                })
            }
        },
        {
            title: 'Enter The Git Command',
            text: 'Can Not Be Empty',
            inputValue: defaultCommand,
            inputValidator: (value) => {
                return new Promise((resolve) => {
                    if (value.trim() != '') {
                        resolve()
                    } else {
                        resolve('Can Not Be Empty')
                    }
                })
            }
        }
    ]).then((result) => {
        if (result.value) {
            var repo = result.value[0];
            var fileName = result.value[1];
            var gitCommand = result.value[2];
            var $newReportContainer = $('#reportscontainer').clone();
            // 替換canvas
            if ($newReportContainer.find('#vis > div > canvas').length > 0) {
                var $canvas = $('#vis > div > canvas');
                $newReportContainer.find('#vis > div > canvas').parent().html(convertCanvasToImage($canvas.get(0)).outerHTML);
            }
            // 移除buttons
            $newReportContainer.find('.button-group').remove();
            // 標頭
            var head = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${fileName}</title>
                <link rel="stylesheet"
                    href="https://stackpath.bootstrapcdn.com/bootstrap/4.4.1/css/bootstrap.min.css" />
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/vis/4.21.0/vis.min.css" />
                <link rel="stylesheet" href="https://orz4.netlify.com/bdd.css" />
                
            </head>
            <body>
            `;
            var foot = `
                <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.4.1/jquery.min.js"></script>
                <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.4.1/js/bootstrap.min.js"></script>
                <script src="https://cdnjs.cloudflare.com/ajax/libs/vis/4.21.0/vis.min.js"></script>
            </body>
            </html>
            `;

            var fileContent = head + $newReportContainer.html() + foot;
            console.log('[bdd.js] genFile:',fileContent);

            $('body').loading();
            $.ajax({
                url: 'http://127.0.0.1:8000/uploadGit',
                method: 'POST',
                data: {
                    repo: repo,
                    fileName: fileName,
                    fileContent: fileContent,
                    gitCommand: gitCommand,
                },
                success: function (data) {
                    Swal.fire({
                        title: 'All done!',
                        html: `
                        <a href="${repo}" target="_blank">Github</a>
                    `,
                        confirmButtonText: 'Lovely!'
                    });
                    $('body').loading('stop');
                },
                error: function (e) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Oops...',
                        text: 'Something went wrong!'
                    });
                    $('body').loading('stop');
                }
            });
        }
    })
});

// canvas轉img
function convertCanvasToImage(canvas) {
    var image = new Image();
    image.src = canvas.toDataURL("image/png");
    return image;
}

// 我的工具 開始錄製
function apiLogOn() {
    chrome.runtime.sendMessage("background switchOn");
}

// 我的工具 停止錄製
function apiLogOff() {
    chrome.runtime.sendMessage("background switchOff");
}

// background.js 傳遞，timeUrlGherkinMap，對應API與Gherkin
chrome.runtime.onMessage.addListener(function (response, sender, sendResponse) {
    if (/^bdd/.test(response)) { // 開頭是bdd
        let getMessage = response.replace(/^bdd /, ''); // 擷取訊息
        if (/^apicall/.test(getMessage)) { // 開頭是apicall，獲得api url
            let getMessage2 = getMessage.replace(/^apicall /, ''); // 擷取訊息
            console.log('[bdd.js] get call url json:' + getMessage2);
            var json = JSON.parse(getMessage2);

            // 濾掉有附檔名
            if (/\./.test(json.url.substr(-5))) {
                return ;
            }
            if (location.origin + '/' == json.url) {
                return ;
            }
            // 濾掉/後有#
            var newUrl = json.url.split('/')[json.url.split('/').length - 1];
            if (/#/.test(newUrl)) {
                return ;
            }

            // 儲存時間對應
            timeUrlGherkinMap.push({
                url: json.url,
                type: json.type,
                method: json.method,
                gherkin: undefined,
                time: +json.timeStamp
            });
        }
    }
});

// 取得正在撥放的gherkin
function getPlayingGherkin() {
    // var tr = $('#records-grid').find('.executing').prev().get(0);
    // console.log(tr);
    // var gherkin = '';
    // if (tr && getCommandGherkin(tr)) {
    //     gherkin = getCommandGherkin(tr);
    // }
    var tr = $('#records-grid').find('.executing').get(0);
    var gherkin = '';
    if (tr && getCommandGherkin(tr)) {
        gherkin = getCommandGherkin(tr);
    }
    return gherkin;
}

// 檔案加上行數
function addFileLine(fileContent) {
    if (!fileContent) {
        return;
    }
    var result = [];
    fileContent.split('\n').forEach(function (item, index) {
        result.push(index + '| ' + item.trim());
    });
    return result.join('\n');
}

// 陣列查找+刪除
function findAndRemove(arr, target) {
    var idx = arr.findIndex((item) => item === target);
    while (idx !== -1) {
        arr.splice(idx, 1);
        idx = arr.findIndex((item) => item === target);
    }
}