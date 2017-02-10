var koModel = {
    selectedArray: ko.obsa([]),
    grid: $.fn.koGrid.getSaveSettingsObject("/Helpers/IncidentTypes#tblIncidentTypes", "tblIncidentTypes"),
    hideThePage: ko.obs(false)
};

$(function () {
    var data = eval("(" + $("#scrData").text() + ")");
    var model = new ejs.model({
        sets:
        [{
            name: "incidentTypes",
            properties: ["color", "name", "deleted", "orderNumber", "importance", "backgroundColor"]
        }]
    });

    data = toJsObject(data);

    model.events.koCreated.attach(function (e) {
        if (e.className == "incidentType") {
            if (e.ko.id() < 0) {
                e.ko.orderNumber(0);
                e.ko.importance(0);
                e.ko.color("#000000");
                e.ko.backgroundColor("#FAFAFA");
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


        top.busy("UpdateIncidentTypes");
        model.update(function () {
            top.free("UpdateIncidentTypes");
            if (typeof callback == "function") {
                callback();
            }
        });

    };

    koModel.create = function () {
        var incidentType = model.incidentTypes.create();
    };

    koModel.remove = function (row) {
        var rows = [];
        if (row.entity) {
            koModel.selectedArray([]);
            rows.push(row);
        } else {
            rows = koModel.selectedArray().select(function (it) { return koModel.incidentTypes().first("val=>val.id()==" + it); });
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
        var rows = koModel.incidentTypes();
        if (koModel.selectedArray().any()) {
            rows = koModel.selectedArray().select(function (it) { return rows.first("val=>val.id()==" + it); });;
        }
        var headers = ["Номер", "Уровень важности", "Название", "Цвет текста", "Цвет фона"];

        var name = ["Типы_событий_", (new Date()).toSds()].join("");
        rows = rows.select(function (it) {
            return [it.orderNumber(), it.importance(), it.name(), it.color(), it.backgroundColor()];
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

    var grid = $("#tblIncidentTypes").koGrid({
        koTemplateID: "trIncidentType",
        headerContainer: $("#divIncidentTypesHeader"),
        styleID: "stlIncidentTypesGrid",
        tableID: "tblIncidentTypes",
        columns: gridSettings || [],
        sortable: true,
        source: koModel.incidentTypes,
        disallowSort: ["Save", "Select"]
    });
    koModel.grid.sorted = grid.sorted;

    ko.apply(koModel);
});