var koModel = {
    filter: {
        dateFrom: ko.obs(""),
        dateTo: ko.obs("")
    },
    data: ko.obs(null),
    details: ko.obsa([]),
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
            url: ApplicationRootPath + "AllReports/ExpensesJson",
            data: { DateFrom: koModel.filter.dateFrom(), DateTo: koModel.filter.dateTo() },
            success: function (result) {
                top.free("refresh");
                result = toJsObject(result);

                koModel.data(result);
            }
        });
    };

    koModel.yearsVisible = ko.cmp(function () {
        var data = koModel.data();
        return data && data.monthes.length > 1 && data.monthes.last().year != data.monthes.first().year;
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

    koModel.showDetails = function (row, month) {
        ejs.busy("Details");
        $.rjson({
            data: { ID: row.id, Year: month.year, Month: month.month },
            url: host.arp + "AllReports/ExpensesDetailsJson",
            success: function (result) {
                ejs.free("Details");
                result = ejs.toJsObject(result);
                if (!result.success) {
                    ejs.alert(result.error || "Непредвиденная ошибка!");
                    return;
                }
                koModel.details(result.rows);
                $("#divDetailsDialog").dialog({ title: row.name + " " + koModel.months()[month.month - 1].name + " " + month.year });
                $("#divDetailsDialog").dialog("open");
            },
            error: function (err) {
                ejs.alert("Непредвиденная ошибка!");
            }
        });
    };

    koModel.toExcel = function () {
        var data = koModel.data();
        var rows = data.rows;
        var headers = ["Расход"];
        headers = headers.concat(data.monthes.select(function (it) { return koModel.months()[it.month - 1].name + (koModel.yearsVisible() ? "  " + it.year : ""); }));
        headers.push("Итого");

        var name = ["Отчет_по_расходам_", koModel.filter.dateFrom(), "_", koModel.filter.dateTo()].join("").replace(/\./g, "-");
        var rows = rows.select(function (it) {
            var values = [it.name];
            values = values.concat(it.values);
            values.push(it.total);
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

    $("#divDetailsDialog").dialog({
        autoOpen: false,
        modal: true,
        resizable: true,
        width: 700,
        height: 520,
        buttons: [{ text: 'Закрыть', click: function () { $("#divDetailsDialog").dialog("close"); } }],
        open: function () {

        }
    });

    ko.apply(koModel);

    koModel.refresh();
});
