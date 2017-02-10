var koModel = {
    filter: {
        dateFrom: ko.obs(""),
        dateTo: ko.obs("")
    },
    rows: ko.obsa([]),
    grid: $.fn.koGrid.getSaveSettingsObject("/AllReports/MissingDocuments#tblMissingDocuments", "tblMissingDocuments"),
    inProgress: ko.obs(false),
    hideThePage: ko.obs(false)
};

$(function () {
    var data = eval("(" + $("#scrData").text() + ")");

    data = toJsObject(data);

    koModel.filter.dateFrom(data.dateFrom);
    koModel.filter.dateTo(data.dateTo);

    top.busy("refresh");
    koModel.refresh = function () {
        $.rjson({
            url: ApplicationRootPath + "AllReports/MissingDocumentsJson",
            data: { DateFrom: koModel.filter.dateFrom(), DateTo: koModel.filter.dateTo() },
            success: function (result) {
                top.free("refresh");
                result = result.select("val=>toJsObject(val)");
                result.forEach(function (it) {
                    var value = [];
                    if (it.missingContract) {
                        value.push("договор");
                        if (it.missingAct) {
                            value.push(", ");
                        }
                    }
                    if (it.missingAct) {
                        value.push("акт");
                    }
                    it.missingDocuments = value.join("").toUpperCaseFirst();
                });
                koModel.rows(result);
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


    koModel.toExcel = function () {
        var rows = koModel.rows();
        var headers = ["Контрагент", "Проект", "Недостающие документы"];

        var name = ["Недостающие_документы_", koModel.filter.dateFrom(), "_", koModel.filter.dateTo()].join("").replace(/\./g, "-");
        var rows = rows.select(function (it) {
            return [it.contractorName, it.projectName, it.missingDocuments];
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

    var grid = $("#tblMissingDocuments").koGrid({
        koTemplateID: "trMissingDocument",
        headerContainer: $("#divMissingDocumentsHeader"),
        styleID: "stlMissingDocumentsGrid",
        tableID: "tblMissingDocuments",
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
