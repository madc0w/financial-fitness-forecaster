var numExpenses = 0;
var numIncomes = 0;
var prevPrincipal = 0;
var didBlur = false;

function didUpdate(field) {
	var didUpdate_ = field.prevValue != field.value;
	field.prevValue = field.value;
	return didUpdate_;
}

function toString(value) {
	if (typeof value == 'string') {
		return value;
	}
	return isNaN(value) || !value || typeof value == 'undefined' ? '' : value;
}

function refreshChart() {
	monthlyExpenses = new ExpenseSeries();
	expenses = new Array();
	var currYear = new Date().getFullYear();
	minStart = 9999;
	maxEnd = 0;
	for (var i = 1; i <= numExpenses; i++) {
		start = this['expenseStart' + i];
		if (start && start < minStart) {
			minStart = start;
		} else if (!start) {
			minStart = currYear;
		}
		end = this['expenseEnd' + i];
		if (end && end > maxEnd) {
			maxEnd = end;
		}
	}
	for (i = 1; i <= numIncomes; i++) {
		start = this['incomeStart' + i];
		if (start && start < minStart) {
			minStart = start;
		} else if (!start) {
			minStart = currYear;
		}
		end = this['incomeEnd' + i];
		if (end && end > maxEnd) {
			maxEnd = end;
		}
	}

	if (maxEnd == 0) {
		alert('At least one of the incomes or expenses must have an ending year.');
		return false;
	}
	if (!minStart || minStart == 9999) {
		minStart = currYear;
	}

	for (i = 1; i <= numExpenses; i++) {
		name = 'expense ' + i;
		amount = this['expenseAmount' + i];
		if (typeof amount == 'undefined') {
			amount = 0;
		}
		start = this['expenseStart' + i];
		if (typeof start == 'undefined' || start == null) {
			start = minStart;
		}
		end = this['expenseEnd' + i];
		if (typeof end == 'undefined' || end == null) {
			end = maxEnd;
		}

		var isFixed = this['expenseFixed' + i];
		var isOneTime = this['expenseOneTime' + i];

		if (isOneTime) {
			expenses[start] = amount / 12;
		} else {
			for (var y = start; y <= end; y++) {
				if (expenses[y] == null) {
					expenses[y] = 0;
				}
				if (isFixed) {
					amount *= Math.pow((1 - (inflation / 100)), y - start);
				}
				expenses[y] += amount;
			}
		}
		monthlyExpenses.values[name] = new Value(amount, start, end, isFixed, isOneTime);
	}
	income = new Array();
	for (var i = 1; i <= numIncomes; i++) {
		name = 'income ' + i;
		amount = this['incomeAmount' + i];
		if (typeof amount == 'undefined') {
			amount = 0;
		}
		start = this['incomeStart' + i];
		if (typeof start == 'undefined' || start == null) {
			start = minStart;
		}
		end = this['incomeEnd' + i];
		if (typeof end == 'undefined' || end == null) {
			end = maxEnd;
		}
		var isFixed = this['incomeFixed' + i];
		var isOneTime = this['incomeOneTime' + i];

		if (isOneTime) {
			income[start] = amount / 12;
		} else {
			for (y = start; y <= end; y++) {
				if (income[y] == null) {
					income[y] = 0;
				}
				if (isFixed) {
					amount *= Math.pow((1 - (inflation / 100)), y - start);
				}

				income[y] += amount;
			}
		}
		monthlyExpenses.values[name] = new Value(-amount, start, end, isFixed, isOneTime);
	}

	series = monthlyExpenses.getSeries();

	isPresentValue = document.getElementById('presentValue').checked;

	url = document.URL;
	if (url.indexOf('?') > 0) {
		url = url.split('?')[0];
	}
	url += '?roi=' + roi + '&inflation=' + inflation + '&principal=' + principal + '&presentValue=' + isPresentValue;
	for (var i = 1; i <= numExpenses; i++) {
		url += '&expenseName' + i + '=' + escape(toString(this['expenseName' + i]));
		url += '&expenseAmount' + i + '=' + toString(this['expenseAmount' + i]);
		url += '&expenseStart' + i + '=' + toString(this['expenseStart' + i]);
		url += '&expenseEnd' + i + '=' + toString(this['expenseEnd' + i]);
		url += '&expenseFixed' + i + '=' + toString(this['expenseFixed' + i]);
		url += '&expenseOneTime' + i + '=' + toString(this['expenseOneTime' + i]);
	}
	for (var i = 1; i <= numIncomes; i++) {
		url += '&incomeName' + i + '=' + escape(toString(this['incomeName' + i]));
		url += '&incomeAmount' + i + '=' + toString(this['incomeAmount' + i]);
		url += '&incomeStart' + i + '=' + toString(this['incomeStart' + i]);
		url += '&incomeEnd' + i + '=' + toString(this['incomeEnd' + i]);
		url += '&incomeFixed' + i + '=' + toString(this['incomeFixed' + i]);
		url += '&incomeOneTime' + i + '=' + toString(this['incomeOneTime' + i]);
	}

	// chrome hack.  seriously, wtf?
	url = url.replace(/\[object [^\]]+\]/g, '');
	url = url.replace(/%5Bobject%20HTMLInputElement%5D/g, '');
	document.getElementById('link').setAttribute('href', url);
	window.history.pushState(null, null, url);

	zeroYear = monthlyExpenses.getMinYear();
	principal_ = this.principal;
	totalInflation = 1;
	principalChartData = new Array();
	for (var year = minStart; year < maxEnd; year++) {
		prevPrincipal = principal_;
		principal_ *= 1 + (roi / 100);
		totalInflation *= 1 + (inflation / 100);
		principal_ -= 12 * series[year] * totalInflation;
		if (principal_ > 0) {
			zeroYear = year;
		}

		var obj = {
			year : year,
			principal : Math.round(isPresentValue ? principal_ / totalInflation : principal_),
		};
		principalChartData.push(obj);
	}

	zeroYear++;
	zeroYearSpan = document.getElementById('zeroYear');
	if (zeroYear >= monthlyExpenses.getMaxYear()) {
		if (prevPrincipal > principal_) {
			zeroYearSpan.innerHTML = 'sometime after ' + monthlyExpenses.getMaxYear();
		} else {
			zeroYearSpan.innerHTML = 'never!';
		}
	} else {
		zeroYearSpan.innerHTML = 'in ' + zeroYear + '.';
	}

	chart = new AmCharts.AmSerialChart();
	chart.pathToImages = 'amCharts/images/';
	chart.dataProvider = principalChartData;
	chart.categoryField = 'year';
	chart.startDuration = 1;
	chart.marginTop = 35;
	chart.marginLeft = 100;
	// chart.rotate = true;

	graph1 = new AmCharts.AmGraph();
	graph1.title = 'Principal';
	graph1.valueField = 'principal';
	graph1.type = 'column';
	graph1.lineAlpha = 0;
	graph1.fillColors = 'green';
	graph1.fillAlphas = 1;
	chart.addGraph(graph1);

	catAxis = chart.categoryAxis;
	catAxis.gridPosition = 'start';
	catAxis.dashLength = 5;

	valAxis = new AmCharts.ValueAxis();
	valAxis.dashLength = 5;
	chart.addValueAxis(valAxis);

	chartDiv = document.getElementById('chart');
	parent = chartDiv.parentNode;
	parent.removeChild(chartDiv);
	parent.innerHTML += '<div id="chart"></div>';

	chart.write('chart');

	incomeExpensesChartData = new Array();
	totalInflation = 1;
	for (year = minStart; year <= maxEnd; year++) {
		totalInflation *= 1 + (inflation / 100);
		var obj = {
			year : year,
			expenses : Math.round(12 * (isPresentValue ? expenses[year] : expenses[year] * totalInflation)),
			income : Math.round(12 * (isPresentValue ? income[year] : income[year] * totalInflation))
		};
		incomeExpensesChartData.push(obj);
	}

	chart = new AmCharts.AmSerialChart();
	chart.dataProvider = incomeExpensesChartData;
	chart.categoryField = 'year';
	chart.startDuration = 1;
	chart.marginTop = 35;
	chart.marginLeft = 100;

	graph1 = new AmCharts.AmGraph();
	graph1.title = 'Income';
	graph1.valueField = 'income';
	graph1.type = 'column';
	graph1.lineAlpha = 0;
	graph1.fillColors = 'green';
	graph1.fillAlphas = 1;
	chart.addGraph(graph1);

	graph2 = new AmCharts.AmGraph();
	graph2.title = 'Expenses';
	graph2.valueField = 'expenses';
	graph2.type = 'column';
	graph2.lineAlpha = 0;
	graph2.fillColors = 'red';
	graph2.fillAlphas = 1;
	chart.addGraph(graph2);

	catAxis = chart.categoryAxis;
	catAxis.gridPosition = 'start';
	catAxis.dashLength = 5;

	valAxis = new AmCharts.ValueAxis();
	valAxis.dashLength = 5;
	chart.addValueAxis(valAxis);

	chartDiv = document.getElementById('incomeAndExpensesChart');
	parent = chartDiv.parentNode;
	parent.removeChild(chartDiv);
	parent.innerHTML += '<div id="incomeAndExpensesChart"></div>';

	chart.write('incomeAndExpensesChart');
}

function addRow(table, baseId, n) {
	row = document.createElement('tr');
	td = document.createElement('td');
	row.appendChild(td);
	input = document.createElement('input');
	td.appendChild(input);
	input.setAttribute('id', baseId + 'Name' + n);
	input.setAttribute('type', 'text');
	input.setAttribute('size', '20');
	input.setAttribute('onBlur', 'blurField(this);');

	td = document.createElement('td');
	row.appendChild(td);
	input = document.createElement('input');
	td.appendChild(input);
	input.setAttribute('id', baseId + 'Amount' + n);
	input.setAttribute('type', 'text');
	input.setAttribute('size', '6');
	input.setAttribute('class', 'float');
	input.setAttribute('onBlur', 'blurField(this);');
	input.setAttribute('onKeyPress', 'if (event.keyCode == 13) blurField(this);');

	td = document.createElement('td');
	row.appendChild(td);
	input = document.createElement('input');
	td.appendChild(input);
	input.setAttribute('id', baseId + 'Start' + n);
	input.setAttribute('type', 'text');
	input.setAttribute('size', '4');
	input.setAttribute('class', 'int');
	input.setAttribute('onBlur', 'blurField(this, true);');
	input.setAttribute('onKeyPress', 'if (event.keyCode == 13) blurField(this, true);');

	td = document.createElement('td');
	row.appendChild(td);
	input = document.createElement('input');
	td.appendChild(input);
	input.setAttribute('id', baseId + 'End' + n);
	input.setAttribute('type', 'text');
	input.setAttribute('size', '4');
	input.setAttribute('class', 'int');
	input.setAttribute('onBlur', 'blurField(this, true);');
	input.setAttribute('onKeyPress', 'if (event.keyCode == 13) blurField(this, true);');

	td = document.createElement('td');
	row.appendChild(td);
	input = document.createElement('input');
	td.appendChild(input);
	input.setAttribute('id', baseId + 'OneTime' + n);
	input.setAttribute('rownum', n);
	input.setAttribute('dataType', baseId);
	input.setAttribute('type', 'checkbox');
	input.setAttribute('onChange', 'checkboxChanged(this);');

	td = document.createElement('td');
	row.appendChild(td);
	input = document.createElement('input');
	td.appendChild(input);
	input.setAttribute('id', baseId + 'Fixed' + n);
	input.setAttribute('rownum', n);
	input.setAttribute('dataType', baseId);
	input.setAttribute('type', 'checkbox');
	input.setAttribute('onChange', 'checkboxChanged(this);');

	table.appendChild(row);

	document.getElementById(baseId + 'Name' + n).focus();
}

function checkboxChanged(element) {
	var rowNum = element.getAttribute('rowNum');
	var dataType = element.getAttribute('dataType');
	if (element.id.endsWith('OneTime' + rowNum)) {
		var endingYearField = document.getElementById(dataType + 'End' + rowNum);
		var isFixedField = document.getElementById(dataType + 'Fixed' + rowNum);
		endingYearField.disabled = element.checked;
		isFixedField.disabled = element.checked;
		if (element.checked) {
			endingYearField.prevValue = endingYearField.value;
			endingYearField.value = null;
			isFixedField.prevValue = isFixedField.checked;
			isFixedField.checked = false;
		} else {
			endingYearField.value = endingYearField.prevValue;
			isFixedField.checked = isFixedField.prevValue;
		}

		if (!this[dataType + 'Start' + rowNum]) {
			alert('You must provide the year of this one-time payment.');
			document.getElementById(dataType + 'Start' + rowNum).focus();
		}
	}
	this[element.id] = element.checked;
	refreshChart();
}

function blurField(field, isYear) {
	if (didBlur) {
		didBlur = false;
		return;
	}
	if (field.value == '' || field.value == null || typeof field.value == 'undefined') {
		value_ = null;
	} else if (field.className == 'float') {
		value_ = parseFloat(field.value);
		if (isNaN(value_)) {
			alert('"' + field.value + '" is not a valid number.');
			didBlur = true;
			field.focus();
			return false;
		}
	} else if (field.className == 'int') {
		value_ = parseInt(field.value);
		if (isNaN(value_)) {
			alert('"' + field.value + '" is not a valid number.');
			didBlur = true;
			field.focus();
			return false;
		}
	} else {
		value_ = field.value;
	}

	if (isYear && value_ && (value_ < 2000 || value_ > 2200)) {
		alert('The year you have entered, ' + field.value + ', must lie between 2000 and 2200.  Let\'s try to keep it real, OK?');
		didBlur = true;
		field.focus();
		return false;
	}

	this[field.id] = value_;

	if (field.id.indexOf('Start') >= 0 || field.id.indexOf('End') >= 0) {
		startId = field.id.replace('End', 'Start');
		endId = field.id.replace('Start', 'End');
		start = this[startId];
		end = this[endId];
		if (start != null && end != null && start > end) {
			alert('The starting year ' + start + ' must be less than or equal to the ending year ' + end + '.');
			field.focus();
			return false;
		}
	}

	if (field.prevValue != value_ && (field.className == 'int' || field.className == 'float')) {
		refreshChart();
	}
	field.prevValue = value_;
}

function addExpenseRow() {
	table = document.getElementById('expenses');
	numExpenses++;
	addRow(table, 'expense', numExpenses);
}

function addIncomeRow() {
	table = document.getElementById('incomes');
	numIncomes++;
	addRow(table, 'income', numIncomes);
}

function putValues(prefix, suffix, name, amount, start, end, isFixed, isOneTime) {
	key = prefix + 'Name' + suffix;
	document.getElementById(key).value = name;
	this[key] = name;

	if (amount == '') {
		amount = null;
	}
	if (name == '') {
		name = null;
	}
	if (start == '') {
		start = null;
	}
	if (end == '') {
		end = null;
	}
	key = prefix + 'Amount' + suffix;
	amountField = document.getElementById(key);
	amountField.value = amount;
	amountField.prevValue = amount;
	this[key] = amount;

	key = prefix + 'Start' + suffix;
	startField = document.getElementById(key);
	startField.value = start;
	startField.prevValue = start;
	this[key] = start;

	key = prefix + 'End' + suffix;
	endField = document.getElementById(key);
	endField.value = end;
	endField.prevValue = end;
	this[key] = end;

	key = prefix + 'Fixed' + suffix;
	isFixedField = document.getElementById(key);
	isFixedField.checked = isFixed;
	isFixedField.prevValue = isFixed;
	this[key] = isFixed;

	key = prefix + 'OneTime' + suffix;
	isOneTimeField = document.getElementById(key);
	isOneTimeField.checked = isOneTime;
	isOneTimeField.prevValue = isOneTime;
	this[key] = isOneTime;
}

function getUrlParams() {
	try {
		numExpenses = 0;
		numIncomes = 0;
		params = document.URL.split('?')[1].split('&');
		for (var i = 0; i < params.length; i++) {
			key = params[i].split('=')[0];
			value = params[i].split('=')[1];
			if (key == 'presentValue') {
				document.getElementById(key).checked = (value == 'true');
			} else {
				if (key.indexOf('expenseName') === 0) {
					addExpenseRow();
				} else if (key.indexOf('incomeName') === 0) {
					addIncomeRow();
				}
				field = document.getElementById(key);
				if (value == '' || value == null || typeof value == 'undefined') {
					field.value = null;
					field.prevValue = null;
				} else {
					if (field.type == "checkbox") {
						field.checked = (value == 'true');
						field.prevValue = (value == 'true');
					} else {
						field.value = unescape(value);
						field.prevValue = unescape(value);
					}
				}

				if (field.value == '' || field.value == null || typeof field.value == 'undefined') {
					value = null;
				} else if (field.className == 'float') {
					value = parseFloat(field.value);
					if (isNaN(value)) {
						alert('"' + field.value + '" is not a valid number.');
						field.focus();
					}
				} else if (field.className == 'int') {
					value = parseInt(field.value);
					if (isNaN(value)) {
						alert('"' + field.value + '" is not a valid number.');
						field.focus();
					}
				} else if (field.type == "checkbox") {
					value = field.checked;
				} else {
					value = field.value;
				}

				this[key] = value;
			}
		}
		return true;
	} catch (e) {
		return false;
	}
}

function onLoad() {
	if (navigator.appName == 'Microsoft Internet Explorer' || !!(navigator.userAgent.match(/Trident/) || navigator.userAgent.match(/rv 11/))) {
		alert('Sorry, Internet Explorer utterly fails to render this page.  Try this instead: http://www.getfirefox.com');
	}

	if (!getUrlParams()) {
		this.roi = 5.5;
		document.getElementById('roi').value = this.roi;
		document.getElementById('roi').prevValue = this.roi;

		this.inflation = 3.5;
		document.getElementById('inflation').value = this.inflation;
		document.getElementById('inflation').prevValue = this.inflation;

		this.principal = 100000;
		document.getElementById('principal').value = this.principal;
		document.getElementById('principal').prevValue = this.principal;

		year = new Date().getFullYear();
		for (var i = 0; i < 8; i++) {
			addExpenseRow();
		}

		var i = 1;
		putValues('expense', i++, 'rent', 2000, year, year + 60, false, false);
		putValues('expense', i++, 'education', 1600, null, year + 18, false, false);
		putValues('expense', i++, 'food', 600, null, null, false, false);
		putValues('expense', i++, 'entertainment, misc.', 900, null, null, false, false);
		putValues('expense', i++, 'travel/vacation', 600, null, null, false, false);
		putValues('expense', i++, 'health care', 800, year + 30, null, false, false);
		putValues('expense', i++, 'transportation', 800, null, year + 50, false, false);

		for (var i = 0; i < 4; i++) {
			addIncomeRow();
		}

		var i = 1;
		putValues('income', i++, 'income 1', 5000, null, year + 29, false, false);
		putValues('income', i++, 'income 2', 4000, null, year + 29, false, false);
		putValues('income', i++, 'pension', 2000, year + 30, null, true, false);
	}
	refreshChart();
}

function clearIncomes() {
	for (var i = 1; i <= numIncomes; i++) {
		putValues('income', i, '', '', '', '');
	}
	refreshChart();
}

function clearExpenses() {
	for (var i = 1; i <= numExpenses; i++) {
		putValues('expense', i, '', '', '', '');
	}
	refreshChart();
}

function downloadIncomes() {
	var csv = 'Name;Amount;Start Year;End Year\n';
	for (var i = 1; i < numIncomes; i++) {
		var name = '"' + this['incomeName' + i] + '"';
		var amount = toString(this['incomeAmount' + i]);
		var startYear = toString(this['incomeStart' + i]);
		var endYear = toString(this['incomeEnd' + i]);
		csv += name + ';' + amount + ';' + startYear + ';' + endYear + '\n';
	}
	download('Financial Fitness Forecaster - Incomes.csv', csv, 4);
}

function downloadExpenses() {
	var csv = 'Name;Amount;Start Year;End Year\n';
	for (var i = 1; i < numExpenses; i++) {
		var name = '"' + this['expenseName' + i] + '"';
		var amount = toString(this['expenseAmount' + i]);
		var startYear = toString(this['expenseStart' + i]);
		var endYear = toString(this['expenseEnd' + i]);
		csv += name + ';' + amount + ';' + startYear + ';' + endYear + '\n';
	}
	download('Financial Fitness Forecaster - Expenses.csv', csv, 4);
}

function downloadPrincipalAmounts() {
	var csv = 'Year;Principal Amount\n';
	for ( var i in principalChartData) {
		var row = principalChartData[i];
		csv += row.year + ';' + row.principal + '\n';
	}
	download('Financial Fitness Forecaster - Principal Amounts.csv', csv, 2);
}

function downloadIncomeAndExpenses() {
	var csv = 'Year;Income;Expenses\n';
	for ( var i in incomeExpensesChartData) {
		var row = incomeExpensesChartData[i];
		csv += row.year + ';' + row.income + ';' + row.expenses + '\n';
	}

	download('Financial Fitness Forecaster - Income and Expenses.csv', csv, 3);
}

function download(filename, text, linkColNum) {
	var emptyCols = '';
	for (var i = 0; i < linkColNum; i++) {
		emptyCols += ';';
	}
	text += '\n';
	text += emptyCols + 'Provided by\n';
	var url = document.getElementById('link').getAttribute('href');
	text += emptyCols + '=HYPERLINK("' + url + '", "Financial Fitness Forecaster")\n';
	text += emptyCols + url + '\n';

	var element = document.createElement('a');

	// the \uFEFF here is supposed to help Excel detect the encoding, somehow
	// see http://stackoverflow.com/questions/21177078/javascript-download-csv-as-file
	element.setAttribute('href', 'data:text/plain;charset=UTF-8,\uFEFF' + encodeURIComponent(text));
	element.setAttribute('download', filename);
	element.style.display = 'none';
	document.body.appendChild(element);
	element.click();
	document.body.removeChild(element);
}

function ExpenseSeries() {
	this.series = null;
	this.values = new Object();
	this.maxYear = 0;
	this.minYear = 0;

	this.getMinYear = function() {
		if (this.minYear == 0) {
			this.minYear = 999999;
			for (key in this.values) {
				value = this.values[key];
				if (value.start != null && value.start < this.minYear) {
					this.minYear = value.start;
				}
			}
		}
		return this.minYear;
	};

	this.getMaxYear = function() {
		if (this.maxYear == 0) {
			this.maxYear = -999999;
			for (key in this.values) {
				value = this.values[key];
				if (value.end != null && value.end > this.maxYear) {
					this.maxYear = value.end;
				}
			}
		}
		return this.maxYear;
	};

	this.getSeries = function() {
		if (this.series == null) {
			this.series = new Array();
			for (var y = this.getMinYear(); y < this.getMaxYear(); y++) {
				sum = 0;
				for (key in this.values) {
					value = this.values[key];
					sum += value.getValue(y);
				}
				this.series[y] = sum;
			}
		}
		return this.series;
	};
}

function Value(value, start, end, isFixed, isOneTime) {
	this.start = start;
	this.end = end;
	this.value = value;
	this.isFixed = isFixed;
	this.isOneTime = isOneTime;

	this.getValue = function(year) {
		if (this.isOneTime) {
			return year == this.start ? this.value / 12 : 0;
		}
		if ((this.end == null || this.end >= year) && (this.start == null || this.start <= year)) {
			if (isFixed) {
				return this.value * Math.pow((1 - (inflation / 100)), year - this.start);
			}
			return this.value;
		}
		return 0;
	};
}
