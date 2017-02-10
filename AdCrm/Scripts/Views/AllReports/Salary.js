var koModel = {
    filter: {
        dateFrom: ko.obs(""),
        dateTo: ko.obs(""),
        employee: { id: ko.obs(""), name: ko.obs("") },
        //visible: ko.obs(false),
        //projects: { ids: ko.obsa([]) },
        name: ko.obs("Новый фильтр")
    },
    reportFilter: ko.obs(),
    //total: {
    //    id: "",
    //    caption: "За период:",
    //    incomeSum: ko.obs(0),
    //    outgoingSum: ko.obs(0),
    //    expensesSum: ko.obs(0),
    //    managerFeeSum: ko.obs(0),
    //    gain: ko.obs(0),
    //    totals: true
    //},
    //view: { period: ko.obs(false) },
    //projects: ko.obsa([]),
    selectedArray: ko.obsa([]),
    selectedTotalPayroll: ko.cmp(function () { return 0; }),
    selectedTotalExpense: ko.cmp(function () { return 0; }),
    rows: ko.obsa([]),
    grid: $.fn.koGrid.getSaveSettingsObject("/AllReports/Salary#tblSalary", "tblSalary"),
    inProgress: ko.obs(false),
    hideThePage: ko.obs(false)
};

$(function () {
    var data = eval("(" + $("#scrData").text() + ")");
    data = ejs.toJsObject(data);

    var model = initModel(koModel, data);

    koModel.filter.dateFrom(data.dateFrom);
    koModel.filter.dateTo(data.dateTo);

    koModel.filter.clear = function () {
        koModel.filter.employee.id("");
        koModel.filter.employee.name("");
        koModel.filter.name("Новый фильтр");
        koModel.refresh();
    };

    koModel.refresh = function () {
        top.busy("refresh");
        $.rjson({
            url: host.arp + "AllReports/SalaryJson",
            data: { DateFrom: koModel.filter.dateFrom(), DateTo: koModel.filter.dateTo(), EmployeeID: koModel.filter.employee.id() },
            success: function (result) {
                top.free("refresh");
                result = toJsObject(result);

                //koModel.total.expensesSum(result.totalExpenses);
                //koModel.total.gain(result.totalGain);
                //koModel.total.incomeSum(result.totalIncome);
                //koModel.total.outgoingSum(result.totalOutgoing);
                //koModel.total.managerFeeSum(result.totalManagerFee);

                var rows = result.rows;
                //koModel.filter.projects.ids([]);

                //koModel.projects(rows.select(function (it) { return { id: it.id, name: it.name }; }));
                koModel.rows(rows);
            }
        });
    };

    koModel.loadEmployees = function (request, callback) {
        var name = koModel.filter.employee.name().toLowerCase();

        var filter = request ? request.term : "";
        filter = filter ? filter.toLowerCase() : "";
        filter = filter == name ? "" : filter;

        var where = [ejs.cwp("deleted", false, "=", "bool"), ejs.cwp("archived", false, "=", "bool")];
        if (filter) {
            var w = ejs.cwp("fullName", "%" + filter + "%", "like");
            where.push(w);
        }

        model.select(ejs.cso(model.employees, where, [ejs.cop("fullName")], 20), function (result) {
            model.addData(result.collections);
            callback(result.collections.employees.select(function (it, i) {
                return { label: it.fullName, value: it.fullName, source: it };
            }));
        });
    };

    koModel.toExcel = function () {
        var rows = koModel.rows();
        var headers = ["Сотрудник", "Дата начисления", "Тип начисления", "Автор начисления", "Проект", "Сумма начислено", "Сумма выплачено", "Сумма долг", "Месяц З/П"];

        var name = ["Отчет_по_зарплате_", koModel.filter.dateFrom(), "_", koModel.filter.dateTo()].join("").replace(/\./g, "-");
        var rows = rows.select(function (it) {
            var values = [it.employeeName, it.date, it.type == 'payroll' ? 'Начисление' : 'Выплата', it.creator, it.project, it.type == 'payroll' ? it.amount : '', it.type == 'expense' ? it.amount : '', it.debt, it.month > 0 ? koModel.months()[it.month - 1].name : ''];
            return values;
        });
        $.rjson({
            url: ApplicationRootPath + "Data/ToExcel", data: { Name: name, Headers: headers, Rows: rows }, success: function (result) {
                if (result.Success) {
                    window.location = result.Url;
                }
            }
        });
    };

    var date = new Date();
    var year = date.getFullYear();

    koModel.year = ko.obs("");
    koModel.month = ko.obs("");
    koModel.years = ko.obsa([]);
    koModel.months = ko.obsa($.datepicker.regional['ru'].monthNames.select(function (it, i) {
        var result = {
            id: i + 1,
            name: it
        };

        return result;
    }));
    for (var i = year - 6; i < year + 5; i++) {
        koModel.years.push({
            id: i.toString(),
            name: i.toString()
        });
    }

    koModel.confirmMonth = function () {
        var dateFrom = new Date();
        var dateTo = new Date();

        dateFrom.setYear(koModel.year());
        dateFrom.setMonth(koModel.month() - 1);
        dateFrom.setDate(1);
        dateTo.setYear(koModel.year());
        dateTo.setMonth(koModel.month());
        dateTo.setDate(1);
        dateTo.setDate(0);

        koModel.filter.dateFrom(dateFrom.toSds());
        koModel.filter.dateTo(dateTo.toSds());

        $("#divMonths").dialog("close");
        koModel.refresh();
    };

    koModel.selectMonth = function () {
        $("#divMonths").dialog("open");
    };

    koModel.cancelMonth = function () {
        $("#divMonths").dialog("close");
    };

    initSalary(koModel, data);
    $("#divMonths").dialog({
        autoOpen: false,
        modal: true,
        resizable: false,
        width: 500,
        height: 520,
        open: function () {
            var date = parseDate(koModel.filter.dateFrom());

            koModel.year(date.getFullYear());
            koModel.month(date.getMonth() + 1);
        }
    });

    initFilters(koModel, model, data);

    ko.apply(koModel);

    koModel.refresh();
});


function initSalary(koModel, data) {

    var gridSettings = data.settings.first("val=>val.name=='" + koModel.grid.name + "'");
    if (gridSettings) {
        gridSettings = eval("(" + gridSettings.value + ")");
    }

    var grid = $("#tblSalary").koGrid({
        koTemplateID: "trSalary",
        headerContainer: $("#divSalaryHeader"),
        styleID: "stlSalaryGrid",
        tableID: "tblSalary",
        columns: gridSettings || [],
        sortable: true,
        //sortMethod: koModel.pager.order,
        disallowSort: ["Save", "Select"]
    });
    koModel.grid.sorted = grid.sorted;

    koModel.refresh();
};

function initModel(koModel, data) {
    var model = new ejs.model({
        sets:
        [{
            name: "reportFilters",
            properties: ["name", "comments", "default", "reportID", "userID", "data"]
        }, {
            name: "employees",
            properties: ["deleted", "fullName"]
        }]
    });

    model.events.koCreated.attach(function (e) {
        if (e.className == "emailTemplate") {
        }
    });

    model.refreshData(data);
    model.toKo(koModel);

    koModel.updateAll = function (callback) {
        var valid = true;
        $("#divRightContent form").each(function () {
            valid = valid & $(this).valid();
        });
        if (!valid)
            return false;


        top.busy("Update");
        model.update(function () {
            top.free("Update");
            if (typeof callback == "function") {
                callback();
            }
        });
    };
    return model;
};
