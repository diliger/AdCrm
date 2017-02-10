var koModel = {
    filter: {
        dateFrom: ko.obs(""),
        dateTo: ko.obs(""),
        name: ko.obs("Новый фильтр"),
        props: { number: ko.obs(), name: ko.obs(), createDate: ko.obs(), statusID: ko.obs(), responsibleName: ko.obs(), employeeName: ko.obs(), address: ko.obs(), dateSign: ko.obs(), dateEnd: ko.obs(), contractorName: ko.obs(), contractorContacts: ko.obs() }
    },
    total: {
        id: "",
        caption: "За период:",
        paidAmount: ko.obs(0),
        leftAmount: ko.obs(0),
        totals: true,
        project: null
    },
    view: { period: ko.obs(false) },
    projects: ko.obsa([]),
    selectedArray: ko.obsa([]),
    rows: ko.obsa([]),
    grid: $.fn.koGrid.getSaveSettingsObject("/AllReports/Invoices#tblReport", "tblReport"),
    inProgress: ko.obs(false),
    hideThePage: ko.obs(false)
};

$(function () {
    var data = eval("(" + $("#scrData").text() + ")");

    data = toJsObject(data);

    koModel.projectStatuses = data.projectStatuses;
    koModel.filter.dateFrom(data.dateFrom);
    koModel.filter.dateTo(data.dateTo);

    koModel.filter.clear = function () {
        koModel.filter.name("Новый фильтр");
        for (var i in koModel.filter.props) {
            koModel.filter.props[i](null);
        }
    };

    koModel.refresh = function () {
        top.busy("refresh");
        $.rjson({
            url: host.arp + "AllReports/InvoicesJson",
            data: { DateFrom: koModel.filter.dateFrom(), DateTo: koModel.filter.dateTo() },
            success: function (result) {
                top.free("refresh");
                result = toJsObject(result);

                koModel.total.paidAmount(result.paidAmount);
                koModel.total.leftAmount(result.leftAmount);

                var rows = result.rows;

                koModel.projects(rows.select(function (it) { return { id: it.id, name: it.name }; }));
                koModel.rows(rows);
            }
        });
    };

    koModel.selectedRows = ko.cmp(function () {
        var rows = koModel.selectedArray().select(function (it) { return koModel.rows().first("val=>val.id==" + it); });
        return rows;
    });

    koModel.selectedRows.total = {
        id: "",
        caption: "Выделено:",
        paidAmount: ko.cmp(function () { return koModel.selectedRows().sum('val=>val.paidAmount') * 1; }),
        leftAmount: ko.cmp(function () { return koModel.selectedRows().sum('val=>val.leftAmount') * 1; }),
        totals: true,
        project: null
    };

    
    koModel.rows.filtered = ko.cmp(function () {
        var result = koModel.grid.sorted ? koModel.grid.sorted() : koModel.rows();
        //var projects = koModel.filter.projects.ids();
        //if (projects.length > 0) {
        result = result.where(function (it) {
            var pass = true;
            for (var i in koModel.filter.props) {
                var v = koModel.filter.props[i]();
                var p = it.project[i];
                if (v && typeof p != "undefined") {
                    pass = v == p || (p || "").toString().contains((v || "").toString(), 1);
                }
                if (!pass)
                    break;
            }
            return pass;
        });
        //}
        return result;
    });

    koModel.rows.total = {
        id: "",
        caption: "Итого:",
        paidAmount: ko.cmp(function () { return koModel.rows.filtered().sum('val=>val.paidAmount') * 1; }),
        leftAmount: ko.cmp(function () { return koModel.rows.filtered().sum('val=>val.leftAmount') * 1; }),
        totals: true,
        project: null
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

    koModel.toExcel = function () {
        var rows = koModel.rows.filtered();
        if (koModel.selectedArray().any()) {
            rows = koModel.selectedArray().select(function (it) { return rows.first("val=>val.id()==" + it); });;
        }
        var headers = ["№", "Проект", "Дата создания", "Статус", "Ответственный", "Исполнитель", "Клиент", "№ счета", "Дата счета", "Оплачено", "Задолженность"];

        var name = ["ОтчетЗадолженности_", koModel.filter.dateFrom(), "_", koModel.filter.dateTo()].join("").replace(/\./g, "-");
        var exportRows = [];
        for (var i = 0; i < rows.length; i++) {
            var it = rows[i];
            var invoice = it.invoices[0];
            exportRows.push([it.project.number, it.name, it.project.createDate, it.project.statusName, it.project.responsibleName, it.project.employeeName, it.project.contractorName, invoice.number, invoice.drawnDate, invoice.paidAmount, invoice.leftAmount]);
            for (var j = 1; j < it.invoices.length; j++) {
                var invoice = it.invoices[j];
                exportRows.push(["", "", "", "", "", "", "", invoice.number, invoice.drawnDate, invoice.paidAmount, invoice.leftAmount]);
            }
        }
            
        $.rjson({
            url: ApplicationRootPath + "Data/ToExcel", data: { Name: name, Headers: headers, Rows: exportRows }, success: function (result) {
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

    var grid = $("#tblReport").koGrid({
        koTemplateID: "trReport",
        headerContainer: $("#divReportHeader"),
        styleID: "stlReportGrid",
        tableID: "tblReport",
        columns: gridSettings || [],
        sortable: true,
        autoSort: true,
        source: koModel.rows,
        disallowSort: ["Save", "Select", "InvoiceNumber", "InvoiceDate", "PaidAmount", "LeftAmount"]
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

    koModel.toggleFilter = function (a, e) {
        var f = $(e.currentTarget).parents('td').find('div.filter');
        f.toggle();
        f.find("input").focus();
        return false;
    };
    koModel.filterClick = function () {
        return false;
    };

    initFilters(koModel, null, data);

    ko.apply(koModel);

    koModel.refresh();
});
