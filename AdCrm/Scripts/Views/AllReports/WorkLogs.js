var koModel = {
    filter: {
        dateFrom: ko.obs(""),
        dateTo: ko.obs(""),
        visible: ko.obs(false),
        projects: { ids: ko.obsa([]) },
        departments: { ids: ko.obsa([]) },
        employees: { ids: ko.obsa([]) }
    },
    projects: ko.obsa([]),
    departments: ko.obsa([]),
    employees: ko.obsa([]),
    rows: ko.obsa([]),
    selectedArray: ko.obsa([]),
    grid: $.fn.koGrid.getSaveSettingsObject("/AllReports/WorkLogs#tblWorkLogs", "tblWorkLogs"),
    inProgress: ko.obs(false),
    hideThePage: ko.obs(false)
};

$(function () {
    var data = eval("(" + $("#scrData").text() + ")");
    
    data = toJsObject(data);

    koModel.filter.dateFrom(data.dateFrom);
    koModel.filter.dateTo(data.dateTo);

    koModel.refresh = function () {
        top.busy("refresh");
        $.rjson({
            url: ApplicationRootPath + "AllReports/WorkLogsJson",
            data: { DateFrom: koModel.filter.dateFrom(), DateTo: koModel.filter.dateTo() },
            success: function (result) {
                top.free("refresh");
                koModel.selectedArray([]);
                koModel.filter.projects.ids([]);
                koModel.filter.departments.ids([]);
                koModel.filter.employees.ids([]);

                result = toJsObject(result).workLogs;
                koModel.rows(result);

                koModel.projects(result.distinct("val=>val.projectID").select(function (it) { return { id: it.projectID, name: it.projectName }; }));
                koModel.departments(result.distinct("val=>val.departmentID").select(function (it) { return { id: it.departmentID, name: it.departmentName }; }));
                koModel.employees(result.distinct("val=>val.employeeID").select(function (it) { return { id: it.employeeID, name: it.employeeName }; }));
            }
        });
    };

    koModel.rows.selectedTotal = ko.cmp(function () {
        var rows = koModel.selectedArray().select(function (it) { return koModel.rows().first("val=>val.id==" + it); });
        return { count: rows.sum("val=>val.count*1"), countTotal: rows.sum("val=>val.countTotal*1") };
    });

    koModel.rows.filtered = ko.cmp(function () {
        var result = koModel.grid.sorted ? koModel.grid.sorted() : koModel.rows();
        var projects = koModel.filter.projects.ids();
        var departments = koModel.filter.departments.ids();
        var employees = koModel.filter.employees.ids();

        if (projects.length > 0) {
            result = result.where(function (it) {
                return projects.contains(it.projectID + "");
            });
        }
        if (departments.length > 0) {
            result = result.where(function (it) {
                return departments.contains(it.departmentID + "");
            });
        }
        if (employees.length > 0) {
            result = result.where(function (it) {
                return employees.contains(it.employeeID + "");
            });
        }
        return result;
    });

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

    koModel.toExcel = function () {
        var rows = koModel.rows.filtered();
        if (koModel.selectedArray().any()) {
            rows = koModel.selectedArray().select(function (it) { return rows.first("val=>val.id==" + it); });;
        }
        var headers = ["Отдел", "Проект", "Должность", "Сотрудник", "Ед. Измерения", "По проекту за период", "По проекту всего"];
        var name = ["Учет_рабочего_времени_", koModel.filter.dateFrom(), "_", koModel.filter.dateTo()].join("");
        var rows = rows.select(function (it) {
            return [it.departmentName, it.projectName, it.positionName, it.employeeName, it.unitName, it.count, it.countTotal];
        });
        $.rjson({
            url: ApplicationRootPath + "Data/ToExcel", data: { Name: name, Headers: headers, Rows: rows }, success: function (result) {
                if (result.Success) {
                    window.location = result.Url;
                }
            }
        });
    };

    var gridSettings = data.settings.first("val=>val.name=='" + koModel.grid.name + "'");
    if (gridSettings) {
        gridSettings = eval("(" + gridSettings.value + ")");
    }

    var grid = $("#tblWorkLogs").koGrid({
        koTemplateID: "trWorkLog",
        headerContainer: $("#divWorkLogsHeader"),
        styleID: "stlWorkLogsGrid",
        tableID: "tblWorkLogs",
        columns: gridSettings || [],
        sortable: true,
        autoSort: true,
        source: koModel.rows,
        disallowSort: ["Save", "Select", "Number"]
    });
    koModel.grid.sorted = grid.sorted;

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

    ko.apply(koModel);

    koModel.refresh();
});
