var koModel = {
    selectedArray: ko.obsa([]),
    grid: $.fn.koGrid.getSaveSettingsObject("/Helpers/RepeatIntervals#tblRepeatIntervals", "tblRepeatIntervals"),
    hideThePage: ko.obs(false)
};

$(function () {
    var data = eval("(" + $("#scrData").text() + ")");
    var model = new ejs.model({
        sets:
        [{
            name: "repeatIntervals",
            properties: ["days", "name", "deleted", "orderNumber", "months", "years", "beforeDays", "comments"]
        }]
    });

    data = toJsObject(data);

    model.events.koCreated.attach(function (e) {
        if (e.className == "repeatInterval") {
            if (e.ko.id() < 0) {
                e.ko.orderNumber(0);
                e.ko.days(0);
                e.ko.months(0);
                e.ko.years(0);
                e.ko.beforeDays(0);
            }
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


        top.busy("UpdateRepeatIntervals");
        model.update(function () {
            top.free("UpdateRepeatIntervals");
            if (typeof callback == "function") {
                callback();
            }
        });

    };

    koModel.create = function () {
        var repeatInterval = model.repeatIntervals.create();
    };

    koModel.remove = function (row) {
        var rows = [];
        if (row.entity) {
            koModel.selectedArray([]);
            rows.push(row);
        } else {
            rows = koModel.selectedArray().select(function (it) { return koModel.repeatIntervals().first("val=>val.id()==" + it); });
        }

        var names = ["запись", "записи", "записей"];
        var message = ["Вы действительно хотите удалить ",
                       rows.length == 1 ? names[0] + " " + rows[0].name() : rows.length + " " + i18n.declineCount(rows.length, names[0], names[1], names[2]),
                       "?"].join("");

        if (rows.length == 0 || (rows.any("val=>val.id()>0") && !confirm(message))) {
            return;
        }

        rows.forEach(function (it) {
            if (it.id() > 0) {
                it.name(it.name() ? it.name() : "deleted");

                it.deleted(true);
            } else {
                it.entity.remove();
            }
        });
        koModel.updateAll(function () {
            rows.forEach(function (it) {
                it.entity.detach();
            });
            koModel.selectedArray([]);
        });
    };

    koModel.toExcel = function () {
        var rows = koModel.repeatIntervals();
        if (koModel.selectedArray().any()) {
            rows = koModel.selectedArray().select(function (it) { return rows.first("val=>val.id()==" + it); });;
        }
        var headers = ["Номер", "Название", "Дней", "Месяцев", "Лет", "Создавать за N дней", "Примечание"];

        var name = "Интервалы_повторений";
        rows = rows.select(function (it) {
            return [it.orderNumber(), it.name(), it.days(), it.months(), it.years(), it.beforeDays(), it.comments()];
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

    var grid = $("#tblRepeatIntervals").koGrid({
        koTemplateID: "trRepeatInterval",
        headerContainer: $("#divRepeatIntervalsHeader"),
        styleID: "stlRepeatIntervalsGrid",
        tableID: "tblRepeatIntervals",
        columns: gridSettings || [],
        sortable: true,
        source: koModel.repeatIntervals,
        disallowSort: ["Save", "Select"]
    });
    koModel.grid.sorted = grid.sorted;

    ko.apply(koModel);
});