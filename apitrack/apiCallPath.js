console.log('load BDD Recorder popup');

var data = []; // reqres data
var vis_network = null;
var nodes = [];
var edges = [];
var apiMap = []; // {name:"API1"}
var databaseName = "callPath"; // indexedDB
var tableName = "callTable"; // indexedDB

// 建立table與DB拿到外面，裡面{id, name, data}

// background 傳遞
chrome.runtime.onMessage.addListener(function (response, sender, sendResponse) {
	if (/^apiCallPath/.test(response)) { // 開頭是apiCallPath
		let getMessage = response.replace(/^apiCallPath /, ''); // 擷取訊息
		if (/^load/.test(getMessage)) { // 開頭是reqres，處理content.js sw.js的onfetch
			chrome.tabs.query({
				active: true
			}, function (val) {
				let tabId = val[0].id;
				chrome.storage.local.get(['data' + tabId], function (result) {
					console.log('background 傳遞', result);
					changeData(result['data' + tabId]);
				});
			});
		}
	}
});

// 首次進入
chrome.tabs.query({
	active: true
}, function (val) {
	let tabId = val[0].id;
	chrome.storage.local.get(['data' + tabId], function (result) {
		console.log('首次進入', result);
		changeData(result['data' + tabId]);
	});
});

// 新路徑
$('#newRoute').click(function () {
	chrome.runtime.sendMessage("background newRoute");
	Swal({
		type: 'success',
		title: '路徑開始',
		showConfirmButton: false,
		timer: 1000
	});
});

// 新紀錄
$('#newStorage').click(function () {
	Swal({
		title: '確定?',
		text: "未儲存資料將會遺失!",
		type: 'warning',
		showCancelButton: true,
		confirmButtonColor: '#3085d6',
		cancelButtonColor: '#d33',
		confirmButtonText: '確定',
		cancelButtonText: '取消'
	}).then((result) => {
		if (result.value) {
			chrome.runtime.sendMessage("background clear");
			if (vis_network !== null) {
				vis_network.destroy();
				vis_network = null;
			}
			Swal({
				type: 'success',
				title: '開新紀錄!',
				text: "已開啟新的紀錄!"
			})
		}
	})
});

// indexedDB
var request = window.indexedDB.open(databaseName);
var db;
var objectStore;
var tableList;
request.onupgradeneeded = function (event) {
	db = event.target.result;

	console.log('request.onupgradeneeded');
	if (!db.objectStoreNames.contains(tableName)) {
		objectStore = db.createObjectStore(tableName, {
			keyPath: 'name'
		}); // keyPath:自訂主鍵 autoIncrement: true 自動主鍵
		// objectStore.createIndex('name', 'name', {
		// 	unique: true
		// }); // 建立索引，搜索用
	}
}

request.onsuccess = function (event) {
	db = request.result;
	console.log('indexedDB打開成功', db);

	// 載入資料
	loadData();
};

request.onerror = function (event) {
	console.log('indexedDB打開報錯', event);
};

// 儲存紀錄
$('#saveStorage').click(function () {
	// 填入名稱
	Swal.fire({
		title: '儲存名稱',
		input: 'text',
		inputAttributes: {
			autocapitalize: 'off'
		},
		showCancelButton: true,
		confirmButtonText: '儲存',
		cancelButtonText: '取消',
		showLoaderOnConfirm: true,
		preConfirm: (tableName) => {
			if (tableName.trim() != '') {
				return tableName;
			} else {
				Swal.showValidationMessage(
					`不可有空格`
				)
			}
		},
		allowOutsideClick: () => !Swal.isLoading()
	}).then((result) => {
		if (result.value) { // tableName
			// 判斷是否重複
			if (tableList.filter(v => v.name == result.value).length > 0) {
				let tmpName = result.value;
				// 詢問是否修改
				Swal({
					title: `${tmpName}已存在`,
					text: "是否覆蓋?",
					type: 'info',
					showCancelButton: true,
					confirmButtonColor: '#3085d6',
					cancelButtonColor: '#d33',
					confirmButtonText: '確定',
					cancelButtonText: '取消'
				}).then((result) => {
					if (result.value) {
						// 修改舊資料
						var id = tableList.find(v => v.name == tmpName).id;
						var store = {
							id: id,
							name: tmpName,
							data: data,
							timeStamp: +new Date()
						};
						var request = db.transaction([tableName], 'readwrite')
							.objectStore(tableName)
							.put(store);
						console.log('put', store);

						// 修改資料成功
						request.onsuccess = function (event) {
							Swal({
								type: 'success',
								title: 'Great!',
								text: `${tableName} 儲存成功!`
							});

							// 刷新資料
							loadData();
						};

						// 修改資料失敗
						request.onerror = function (event) {
							Swal({
								type: 'error',
								title: 'Oops...',
								text: '無法儲存!',
								footer: 'IndexedDB寫入失敗，可能主鍵問題。'
							});
							console.log('IndexedDB寫入失敗，可能主鍵問題。');
							console.log(event);
						}
					} else {
						// 不修改舊資料
						Swal({
							type: 'error',
							title: 'Oops...',
							text: '尚未儲存資料!',
							footer: '請重新操作'
						});
					}
				})

			} else { // 無重複，儲存新的
				// 儲存資料
				var store = {
					name: result.value,
					data: data,
					timeStamp: +new Date()
				};

				// 寫入DB
				var request = db.transaction([tableName], 'readwrite')
					.objectStore(tableName)
					.add(store);

				// 寫入成功
				request.onsuccess = function (event) {
					Swal({
						type: 'success',
						title: 'Great!',
						text: `${tableName} 儲存成功!`
					});

					// 刷新資料
					loadData();
				};

				// 寫入失敗，可能是已經有
				request.onerror = function (event) {
					Swal({
						type: 'error',
						title: 'Oops...',
						text: '無法儲存!',
						footer: 'IndexedDB寫入失敗，可能名稱衝突。'
					});
					console.log('IndexedDB寫入失敗，可能名稱衝突。');
					console.log(event);
				}
			}
		}
	})
});

// 讀取紀錄
$('#loadStorage').click(function () {

	// 名稱選單
	var html = '<select class="form-control" id="exampleFormControlSelect1">';
	tableList.map(v => {
		html += `<option>${v.name}</option>`
	});
	html += '</select>';

	// 讀取選單
	Swal.fire({
		title: '請選擇紀錄!',
		html: html,
		showCancelButton: true,
		confirmButtonText: '確定',
		cancelButtonText: '取消',
		showLoaderOnConfirm: true,
		preConfirm: () => {
			if ($('#exampleFormControlSelect1').val().trim() != '') { // 驗證字串
				return $('#exampleFormControlSelect1').val();
			} else {
				Swal.showValidationMessage(
					`不可有空格`
				)
			}
		}
	}).then((result) => {
		if (result.value) { // selected

			// 尋找該筆資料
			let findItem = tableList.find(v => v.name == result.value);
			if (findItem) {
				changeData(findItem.data);
				Swal({
					type: 'success',
					title: 'Great!',
					text: `${result.value} 讀取成功!`
				});
			} else {
				Swal({
					type: 'error',
					title: 'Oops...',
					text: '無法讀取!',
					footer: 'IndexedDB找不到這筆資料'
				});
			}
		}
	});

});

// 清空紀錄
$('#clearStorage').click(function () {
	// 詢問是否刪除
	Swal({
		title: `Clear Records`, // 清空紀錄
		text: "Emptying will not be able to recover, do you want to continue?", // 清空將無法復原，是否繼續?
		type: 'info',
		showCancelButton: true,
		confirmButtonColor: '#3085d6',
		cancelButtonColor: '#d33',
		confirmButtonText: 'Yes',
		cancelButtonText: 'No'
	}).then((result) => {
		if (result.value) { // tableName
			// 清空p1
			cleanReportP1();
			// 清空p2
			cleanReportP2();

			// 清空p3
			cleanReportP3(true);
		}
	})
});

// 清空p3
function cleanReportP3(popup) {
	var transaction = db.transaction([tableName], "readwrite");
	var objectStore = transaction.objectStore(tableName);

	var objectStoreRequest = objectStore.clear();
	chrome.runtime.sendMessage("background clear");
	if (vis_network !== null) {
		vis_network.destroy();
		vis_network = null;
	}

	if (popup) {
		objectStoreRequest.onsuccess = function (event) {
			// 刷新資料
			loadData();
			changeData();

			Swal({
				type: 'success',
				title: 'Great!',
				text: `Cleared successfully!` // 清除成功!
			});
		};

		objectStoreRequest.onerror = function (event) {
			console.log(event);
			Swal({
				type: 'error',
				title: 'Oops...',
				text: 'Cannot be cleared!', // 無法清除!
				footer: 'IndexedDB cannot find data' // IndexedDB找不到資料
			});
		};
	}
}

// collapse 不重複所用
var rr_item_index = 3;

$(function(){
	// 點外面關閉rr_detail
	$('body').click(function () {
		$('.collapse.show').collapse('hide');
	});
	// 註冊rr_item事件
	regCollapseHide();
});

function regCollapseHide() {
	$('.rr_item > button[data-toggle="collapse"]').off('.collapseHide');
	$('.rr_item > button[data-toggle="collapse"]').on('click.collapseHide', function () {
		$('.collapse.show').collapse('hide');
	});
	$('.rr_detail').off('.prevent');
	$('.rr_detail').on('click.prevent', function (e) {
		e.stopPropagation();
	});
}

// 處理storage json資料
function handleJsonShow() {
	if (!data) {
		$('#graph_data').html('');
		return;
	}
	// 清空
	$('#graph_data').html('');
	// 得知最大路徑數
	var maxRoute = 0;
	for (let i = 0; i < data.length; i++) {
		maxRoute = Math.max(maxRoute, data[i].route);
	}
	// 插入路徑框
	for (let i = 0; i <= maxRoute; i++) {
		let html = `
			<div class="card bg-light block">
				<div class="card-header">
					API Call Path
				</div>
				<div class="card-body route${i}_body"></div>
			</div>
		`;
		$('#graph_data').append(html);
	}

	let apiCount = 1;
	// 畫出請求
	for (let i = 0; i < data.length; i++) {

		// 畫下方資料
		if (data[i].type == 'request') {
			let url = data[i].url,
				method = data[i].method,
				headers = data[i].headers,
				mode = data[i].mode,
				referrer = data[i].referrer,
				referrerPolicy = data[i].referrerPolicy,
				credentials = data[i].credentials,
				destination = data[i].destination,
				integrity = data[i].integrity,
				timeStamp = data[i].timeStamp,
				date = new Date(+data[i].timeStamp),
				tabId = data[i].tabId,
				cache = data[i].cache,
				route = data[i].route;
			// 時間差
			let timeScape = '';
			if (data[i + 1] && data[i + 1].route == data[i].route) { // 有下一筆
				timeScape = data[i + 1].timeStamp - data[i].timeStamp;
				timeScape = '<div class="rr_time">↓<br>' + normalizeTimeDisplay(timeScape) + '<br>↓</div>';
			}

			// 產生API MAP
			let apiName = '';
			if (apiMap.find(api => api.url == data[i].url)) { // 有重複
				apiName = apiMap.find(api => api.url == data[i].url).name;
			} else { // 沒重複，push進apiMap
				apiName = `API${apiCount++}`;
				apiMap.push({
					name: apiName,
					url: data[i].url
				});
			}

			let message = `
				<div class="rr_item">
					<button class="btn btn-block btn-info" type="button" data-toggle="collapse" data-target="#rr_item${rr_item_index}"
						aria-expanded="false" aria-controls="rr_item${rr_item_index}">
						<div>Request (${apiName}) (${method})<br>${url}</div>
					</button>
					<div class="collapse rr_detail" id="rr_item${rr_item_index}">
						<div class="card card-body text-white bg-dark">
							url: ${url}<br>
							Headers<br>
							${headers}<br>
							referrer: ${referrer}<br>
							referrerPolicy: ${referrerPolicy}<br>
							credentials: ${credentials}<br>
							destination: ${destination}<br>
							integrity: ${integrity}<br>
							cache: ${cache}<br>
							method: ${method}<br>
							timeStamp: ${timeStamp}<br>
							date: ${date}<br>
							tabId: ${tabId}<br>
							mode: ${mode}<br>
						</div>
					</div>
				</div>
				${timeScape}
			`;
			rr_item_index++;
			$(`.route${route}_body`).append(message);
			regCollapseHide();
		} else if (data[i].type == 'response') {
			let url = data[i].url,
				ok = data[i].ok,
				headers = data[i].headers,
				redirected = data[i].redirected,
				statusText = data[i].statusText,
				timeStamp = data[i].timeStamp,
				date = new Date(+data[i].timeStamp),
				tabId = data[i].tabId,
				status = data[i].status,
				route = data[i].route;
			let btnStatus = ok == 'true' ? 'btn-success' : 'btn-danger';
			// 寫入上一筆響應時間
			if (data[i - 1] && data[i - 1].type == "request" && data[i - 1].url == data[i].url) {
				let responseTime = data[i].timeStamp - data[i - 1].timeStamp;
				data[i - 1].responseTime = responseTime;
			}

			// 時間差
			let timeScape = '<br>—END—';
			if (data[i + 1] && data[i + 1].route == data[i].route) { // 有下一筆
				timeScape = data[i + 1].timeStamp - data[i].timeStamp;
				timeScape = '<div class="rr_time">↓<br>' + (timeScape / 1000).toFixed(4) + ' s' + '<br>↓</div>';
			}
			let message = `
				<div class="rr_item">
					<button class="btn btn-block ${btnStatus}" type="button" data-toggle="collapse" data-target="#rr_item${rr_item_index}"
						aria-expanded="false" aria-controls="rr_item${rr_item_index}">
						<div>Response<br>${url}</div>
					</button>
					<div class="collapse rr_detail" id="rr_item${rr_item_index}">
						<div class="card card-body text-white bg-dark">
							url: ${url}<br>
							Headers
							${headers}<br>
							ok: ${ok}<br>
							status: ${status}<br>
							statusText: ${statusText}<br>
							redirected: ${redirected}<br>
							timeStamp: ${timeStamp}<br>
							date: ${date}<br>
							tabId: ${tabId}<br>
						</div>
					</div>
				</div>
				${timeScape}
			`;
			rr_item_index++;
			$(`.route${route}_body`).append(message);
			regCollapseHide();
		}
	}

	// $('#data').html(json.stringify(json));
}

function drawNetwork() {
	if (!data) {
		if (vis_network) {
			vis_network.destroy();	
		}
		vis_network = null;
		return;
	};
	let vis_container = document.getElementById('vis');

	// 清空
	if (vis_network !== null) {
		vis_network.destroy();
		vis_network = null;
	}

	// 塞點塞線
	let i = 0; // node 序號
	let lineCount = 1;
	nodes = [{
		id: i++,
		label: 'Start',
		title: 'Start',
		shape: 'image',
		image: '/apitrack/img/start.png',
		// value: 10
	}];
	edges = [];
	let lineLength = 300;
	let lineFont = {
		size: 20,
		align: 'horizontal'
	};
	let alreadyHaveId = -1;
	let prevIdx = 0; // 上一個點的index
	let serviceCount = 0;
	for (let j = 0; j < data.length; j++) {
		if (data[j].type == "request") { // 篩出request
			let callService = data[j].url;
			let method = data[j].method;

			// 搜索是否已有
			let alreadyHave = false;
			for (let k = 0; k < nodes.length; k++) {
				if (nodes[k].title == callService) {
					alreadyHave = true;
					alreadyHaveId = nodes[k].id;
					break;
				}
			}

			if (alreadyHave) {
				// 已經有過的點
				let from = prevIdx;
				let to = alreadyHaveId;
				// nodes[to].value++;
				prevIdx = alreadyHaveId;
				// 判斷是否有同樣的線
				let haveSameLine = false;
				for (let m = 0; m < edges.length; m++) {
					if (from == edges[m].from && to == edges[m].to) {
						// 修改舊的線
						edges[m].label += ', ' + (lineCount++).toString();
						haveSameLine = true;
						break;
					}
				}
				if (!haveSameLine) {
					// 增加新的線
					edges.push({
						from: from,
						to: to,
						label: (lineCount++).toString(),
						length: lineLength,
						font: lineFont
					});
				}
			} else {
				// 還沒有的點，先建點，再建線
				// 新服務記數
				serviceCount++;
				// 建點
				let newNodeIdx = i++;
				nodes.push({
					id: newNodeIdx,
					label: 'API' + serviceCount,
					title: callService,
					shape: 'circle',
					method: method,
					// value: 8
				});
				// 建線
				let from = prevIdx;
				edges.push({
					from: from,
					to: i - 1,
					label: (lineCount++).toString(),
					length: lineLength,
					font: lineFont
				});
				prevIdx = newNodeIdx;
			}
		}
	}
	// 繞回end
	nodes.push({
		id: i++,
		label: 'End',
		title: 'End',
		shape: 'image',
		image: '/apitrack/img/end.png',
		// value: 10
	});
	let from = prevIdx;
	edges.push({
		from: from,
		to: i - 1,
		label: (lineCount++).toString(),
		length: lineLength,
		font: lineFont
	});

	// 塞線
	vis_data = {
		nodes: nodes,
		edges: edges
	}

	// vis_data = {
	// 	nodes: [{
	// 		id: 0,
	// 		label: "http://127.0.0.1:3000/",
	// 		group: 'service',
	// 		value: 8
	// 	}, {
	// 		id: 1001,
	// 		x: vis_container.clientWidth / 2 + 50,
	// 		y: vis_container.clientHeight / 2 + 50,
	// 		label: 'Service',
	// 		group: 'service',
	// 		value: 1,
	// 		fixed: true,
	// 		physics: false
	// 	}],
	// 	edges: [{
	// 		from: 1,
	// 		to: 0,
	// 		label: '0.3 mbps'
	// 	}, {
	// 		from: 0,
	// 		to: 2
	// 	}
	// };
	var vis_option = {
		// layout: {
		// 	hierarchical: {
		// 		sortMethod: "directed",
		// 		direction: "LR"
		// 	}
		// },
		nodes: {
			shape: 'dot',
			scaling: {
				label: {
					// min: 8,
					// max: 20
				}
			}
		},
		edges: {
			smooth: true,
			arrows: {
				to: true
			}
		},
		physics: {
			enabled: false
		},
		interaction: {
			zoomView: false
		}
	};

	console.log('vis_data', vis_data);
	vis_network = new vis.Network(vis_container, vis_data, vis_option);
	vis_network.on('select', function (params) {
		console.log(params);
		if (params.nodes.length > 0) { // 是點
			// 寫console
			let url = nodes[params.nodes[0]].title;
			// consoleWrite(url);

			// 捲動過去
			if (url.toLowerCase() == 'start' || url.toLowerCase() == 'end') {

			} else {
				// _scrollTo($("div.rr_item:contains('" + url + "'):first"), function () {
				// 	$("div.rr_item:contains('" + url + "'):first").children('button').click();
				// });
			}
		} else if (params.edges.length == 1) { // 是線
			// let route = edges.find((edge) => edge.id == params.edges[0]).label;
			// consoleWrite(route);
		}
	});
	vis_network.on('release', function (params) {
		vis_fit();
	});
	vis_network.on('doubleClick', function (params) {
		vis_fit();
	});
	vis_network.on('afterDrawing', function (params) {
		vis_fit();
	});
	vis_network.on('animationFinished', function (params) {
		vis_fit();
	});
	// console.log('nodes', nodes);
	// console.log('edges', edges);
	// 移動上來
	setTimeout(() => {
		vis_fit();
	}, 1000);
	// 怕沒弄到
	setTimeout(() => {
		vis_fit();
	}, 5000);
	setTimeout(() => {
		vis_fit();
	}, 10000);
	vis_fit();
}

function vis_fit() {
	if (vis_network) {
		vis_network.moveTo({
			position: {
				x: 0,
				y: 0
			}
		});
		vis_network.fit();
	}
}

// 平滑移過去
function _scrollTo($el, cb) {
	if ($el && $el.offset) {
		$('#tab4').animate({
			scrollTop: $el.offset().top
		}, 500, cb);
	}
}

// 拓樸圖狀態
function refreshStatus() {
	// 計算每一個nodes調用次數
	let result = [];
	for (let i = 1; i < nodes.length - 1; i++) { // 頭尾start end 不做
		let tempResult = {};
		tempResult.name = nodes[i].label; // API1
		tempResult.url = nodes[i].title;
		tempResult.method = nodes[i].method;

		// 計算調用次數
		let callCount = 0;
		edges.filter(e => e.to == nodes[i].id).map(v => {
			callCount += v.label.split(',').length;
		});

		tempResult.callCount = callCount;

		// 計算平均調用時間
		let url = nodes[i].title;
		let counter = 0;
		let sum = 0;
		data.map(e => {
			if (e.url == url && e.type == "request") {
				sum += e.responseTime;
				counter++;
			}
		});
		tempResult.avgCallTime = normalizeTimeDisplay(sum / counter);
		result.push(tempResult);
	}

	// 繪製表格
	let table = `<table class="table table-striped">
	<thead><tr><th>Request</th><th>Method</th><th>Number of calls</th><th>Average response time</th></tr></thead>
	<tbody>`;
	result.map((v, k) => {
		table += `<tr><td class="statusName" title="${v.url}">${v.name}<br><div class="apiurl">${v.url}</div></td><td>${v.method}</td><td>${v.callCount}</td><td>${v.avgCallTime}</td></tr>`;
	});

	table += `</tbody>
	</table>`;

	// console.log('[refreshStatus] ', result);
	// render result
	$('#status').html(table);
	// $('td.statusName').off('.anchorSmooth');
	// $('td.statusName').on('click.anchorSmooth', function () {
	// 	let url = $(this).attr('title');
	// 	_scrollTo($("div.rr_item:contains('" + url + "'):first"), function () {
	// 		$("div.rr_item:contains('" + url + "'):first").children('button').click();
	// 	});
	// });
}

// 拓樸圖console
function consoleWrite(txt) {
	$('#console').text(txt);
}

function normalizeTimeDisplay(timeStamp) {
	return isNaN(timeStamp / 1000) ? "No Response" : (timeStamp / 1000).toFixed(4) + ' s';
}

// 同步資料
function loadData() {
	var objectStore = db.transaction(tableName).objectStore(tableName);
	console.log('[Load Data]');

	tableList = [];
	objectStore.openCursor().onsuccess = function (event) {
		var cursor = event.target.result;

		if (cursor) {
			var result = {
				id: cursor.key,
				name: cursor.value.name,
				data: cursor.value.data,
				timeStamp: cursor.value.timeStamp
			};
			tableList.push(result);
			console.log(result);
			cursor.continue();
		} else {
			console.log("IndexDB資料讀取完畢");
		}

	};
}

// 更新資料
function changeData(datax) {
	console.log('[API MAP Data Reload]');
	data = datax;
	nodes = [];
	edges = [];
	apiMap = [];

	handleJsonShow();
	drawNetwork();
	// 畫出狀態
	refreshStatus();
}

// anime({
// 	targets: '#test',
// 	translateX: [
// 		{ value: 100, duration: 1200 },
// 		{ value: 0, duration: 800 }
// 	],
// 	rotate: '1turn',
// 	backgroundColor: '#F00',
// 	duration: 2000,
// 	loop: true
// });

// (合併分支的版本)
// 塞點
// let key = 0;
// let uniquePool = [];
// let nodes = [];
// let edges = [];
// let routePool = []; // 存放掃描到的路徑
// let nextCombine = false; // 下一個合併
// let prevRouteFirstIndex = 0; // 上一個route的第一個index
// for (let i = 0; i < data.length; i++) {
// 	// 合併分支
// 	if (i != 0 && !routePool.includes(data[i].route)) {
// 		// 取得上一筆route
// 		let prevRoute = data[i - 1].route;
// 		// 取得route的第一筆資料的index
// 		prevRouteFirstIndex = data.findIndex((k) => k.route == prevRoute);

// 		if (data[i].url == data[prevRouteFirstIndex].url) {
// 			nextCombine = true;
// 			routePool.push(data[i].route); // 輸入路徑
// 			continue;
// 		}

// 	}

// 	nodes.push({
// 		id: i,
// 		label: i.toString()
// 	});
// 	if (routePool.includes(data[i].route)) { // 路徑已有掃到
// 		// 接線
// 		if (nextCombine) {
// 			edges.push({
// 				from: prevRouteFirstIndex,
// 				to: i
// 			});
// 			nextCombine = false;
// 		} else {
// 			edges.push({
// 				from: i - 1,
// 				to: i
// 			});
// 		}
// 	} else {
// 		routePool.push(data[i].route); // 輸入路徑
// 	}
// }