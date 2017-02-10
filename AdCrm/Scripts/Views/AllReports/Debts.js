var koModel = {
    reportType: ko.obs(1),
    filter: {
        dateFrom: ko.obs(""),
        dateTo: ko.obs(""),
        visible: ko.obs(false),
        projects: { ids: ko.obsa([]) },
        contractors: { ids: ko.obsa([]) }
    },
    debt: {
        selectedArray: ko.obsa([])
    },
    projects: ko.obsa([]),
    contractors: ko.obsa([]),
    //debts: ko.obsa([]),
    contractorDebts: ko.obsa([]),
    customerDebts: ko.obsa([]),
    grid: {
        customers: $.fn.koGrid.getSaveSettingsObject("/AllReports/Debts#tblCustomerDebts", "tblCustomerDebts"),
        contractors: $.fn.koGrid.getSaveSettingsObject("/AllReports/Debts#tblContractorDebts", "tblContractorDebts")
    },
    inProgress: ko.obs(false),
    hideThePage: ko.obs(false)
};

$(function () {
    var data = eval("(" + $("#scrData").text() + ")");

    data = toJsObject(data);

    koModel.filter.dateFrom(data.dateFrom);
    koModel.filter.dateTo(data.dateTo);

    koModel.reportType(data.reportType);
    koModel.reportType.subscribe(function (newValue) {
        window.document.title = newValue == 1 ? "Остатки по договорам клиентов" : "Остатки по договорам субподрядчикам";
        koModel.refresh();
    });
    koModel.debts = ko.cmp({
        read: function () {
            return koModel.reportType() == 1 ? koModel.customerDebts() : koModel.contractorDebts();
        }, write: function (value) {
            if (koModel.reportType() == 1) {
                koModel.customerDebts(value);
            } else {
                koModel.contractorDebts(value);
            }
        }
    });

    koModel.refresh = function () {
        top.busy("refresh");
        $.rjson({
            url: ApplicationRootPath + "AllReports/DebtsJson",
            data: { ID: koModel.reportType(), DateFrom: koModel.filter.dateFrom(), DateTo: koModel.filter.dateTo() },
            success: function (result) {
                top.free("refresh");
                koModel.debt.selectedArray([]);
                koModel.filter.contractors.ids([]);
                koModel.filter.projects.ids([]);

                result = result.select("val=>toJsObject(val)");
                koModel.debts(result);
                koModel.projects(result.distinct("val=>val.projectID").select(function (it) { return { id: it.projectID, name: it.projectName, contractorID: it.contractorID }; }));
                koModel.contractors(result.distinct("val=>val.contractorID").select(function (it) { return { id: it.contractorID, name: it.contractorName }; }));
            }
        });
    };

    koModel.filter.contractors.ids.subscribe(function () { koModel.filter.projects.ids([]); });

    koModel.filter.contractors.projects = ko.cmp(function () {
        var result = [];
        if (koModel.filter.contractors.ids().length > 0) {
            result = koModel.filter.contractors.ids().selectMany(function (val) { return koModel.projects().where("val=>val.contractorID=='" + val + "'"); }).distinct().orderBy("val=>val.name");
        } else {
            result = koModel.projects().orderBy("val=>val.name");
        }
        return result;
    });

    koModel.debt.selectedTotal = ko.cmp(function () {
        var debts = koModel.debt.selectedArray().select(function (it) { return koModel.debts().first("val=>val.id==" + it); });
        return debts.sum("val=>val.debt*1");
    });

    koModel.debts.filtered = ko.cmp(function () {
        var result;
        if (koModel.reportType() == 1) {
            result = koModel.grid.customers.sorted ? koModel.grid.customers.sorted() : koModel.debts();
        } else if (koModel.reportType() == 2) {
            result = koModel.grid.contractors.sorted ? koModel.grid.contractors.sorted() : koModel.debts();
        }

        var contractors = koModel.filter.contractors.ids();
        var projects = koModel.filter.projects.ids();
        if (contractors.length > 0) {
            result = result.where(function (it) {
                return contractors.contains(it.contractorID + "");
            });
        }
        if (projects.length > 0) {
            result = result.where(function (it) {
                return projects.contains(it.projectID + "");
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

    koModel.showPayments = function (row) {
        paymentsDialogKoModel.contractorID(row.contractorID);
        paymentsDialogKoModel.projectID(row.projectID);
        paymentsDialogKoModel.show();
    };

    koModel.toExcel = function () {
        var rows = koModel.debts.filtered();
        if (koModel.debt.selectedArray().any()) {
            rows = koModel.debt.selectedArray().select(function (it) { return rows.first("val=>val.id()==" + it); });;
        }
        var headers = [koModel.reportType() == 1 ? "Клиент" : "Субподрядчик", "Проект", "Задолженность"];

        var name = [koModel.reportType() == 1 ? "Остатки_по_договорам_клиентов_" : "Остатки_по_договорам_субподрядчикам_", koModel.filter.dateFrom(), "_", koModel.filter.dateTo()].join("").replace(/\./g, "-");
        var rows = rows.select(function (it) {
            return [it.contractorName, it.projectName, it.debt];
        });
        $.rjson({
            url: ApplicationRootPath + "Data/ToExcel", data: { Name: name, Headers: headers, Rows: rows }, success: function (result) {
                if (result.Success) {
                    window.location = result.Url;
                }
            }
        });
    };

    var gridSettings = data.settings.first("val=>val.name=='" + koModel.grid.customers.name + "'");
    if (gridSettings) {
        gridSettings = eval("(" + gridSettings.value + ")");
    }

    var grid = $("#tblCustomerDebts").koGrid({
        koTemplateID: "trCustomerDebt",
        headerContainer: $("#divCustomerDebtsHeader"),
        styleID: "stlCustomerDebtsGrid",
        tableID: "tblCustomerDebts",
        columns: gridSettings || [],
        sortable: true,
        autoSort: true,
        source: koModel.customerDebts,
        disallowSort: ["Save", "Select", "Number"]
    });
    koModel.grid.customers.sorted = grid.sorted;

    gridSettings = data.settings.first("val=>val.name=='" + koModel.grid.contractors.name + "'");
    if (gridSettings) {
        gridSettings = eval("(" + gridSettings.value + ")");
    }

    var grid = $("#tblContractorDebts").koGrid({
        koTemplateID: "trContractorDebt",
        headerContainer: $("#divContractorDebtsHeader"),
        styleID: "stlContractorDebtsGrid",
        tableID: "tblContractorDebts",
        columns: gridSettings || [],
        sortable: true,
        autoSort: true,
        source: koModel.contractorDebts,
        disallowSort: ["Save", "Select", "Number"]
    });
    koModel.grid.contractors.sorted = grid.sorted;

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

    loadHtml();

    ko.apply(koModel);

    koModel.refresh();
});

function loadHtml() {
    $.ajax({
        url: ApplicationRootPath + "AllReports/PaymentsDialog",
        success: function (result) {
            $("body").append(result);
        }
    });
}